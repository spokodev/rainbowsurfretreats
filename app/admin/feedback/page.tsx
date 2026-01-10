'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  MessageSquare,
  Star,
  RefreshCw,
  Search,
  AlertCircle,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminDateRangeFilter } from '@/components/admin/table/admin-date-filter'
import { AdminSortHeader } from '@/components/admin/table/admin-sort-header'
import { AdminPagination } from '@/components/admin/table/admin-pagination'
import type { SortOrder } from '@/hooks/use-admin-table-state'

interface FeedbackEntry {
  id: string
  booking_id: string
  email: string
  retreat_id: string
  overall_rating: number | null
  surfing_rating: number | null
  accommodation_rating: number | null
  food_rating: number | null
  staff_rating: number | null
  recommend_score: number | null
  highlights: string | null
  improvements: string | null
  testimonial: string | null
  allow_testimonial_use: boolean
  google_review_clicked: boolean
  created_at: string
  booking?: {
    first_name: string
    last_name: string
  }
  retreat?: {
    destination: string
  }
}

interface FeedbackStats {
  total: number
  avgOverall: number
  avgSurfing: number
  avgAccommodation: number
  avgFood: number
  avgStaff: number
  npsScore: number
  promoters: number
  passives: number
  detractors: number
  withTestimonials: number
}

const StarRating = ({ rating }: { rating: number | null }) => {
  if (rating === null) return <span className="text-muted-foreground text-sm">-</span>

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      <span className="text-sm font-medium ml-1">{rating}</span>
    </div>
  )
}

const NpsIndicator = ({ score }: { score: number | null }) => {
  if (score === null) return <span className="text-muted-foreground text-sm">-</span>

  let color = 'text-gray-500'
  let label = 'Passive'

  if (score >= 9) {
    color = 'text-green-600'
    label = 'Promoter'
  } else if (score <= 6) {
    color = 'text-red-600'
    label = 'Detractor'
  }

  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span className="text-lg font-bold">{score}</span>
      <span className="text-xs">{label}</span>
    </div>
  )
}

const RatingBar = ({ label, value, max = 5 }: { label: string; value: number; max?: number }) => {
  const percentage = (value / max) * 100

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8">{value.toFixed(1)}</span>
    </div>
  )
}

function FeedbackPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse state from URL
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 20
  const search = searchParams.get('search') || ''
  const retreatFilter = searchParams.get('retreat') || 'all'
  const ratingFilter = searchParams.get('rating') || 'all'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const sortBy = searchParams.get('sort') || 'created_at'
  const sortOrder = (searchParams.get('order') || 'desc') as SortOrder

  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [retreats, setRetreats] = useState<Array<{ id: string; destination: string }>>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(search)

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const hasActiveFilters = search || retreatFilter !== 'all' || ratingFilter !== 'all' || dateFrom || dateTo

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc', page: null })
      } else {
        updateParams({ sort: column, order: 'desc', page: null })
      }
    },
    [sortBy, sortOrder, updateParams]
  )

  const clearFilters = useCallback(() => {
    setSearchInput('')
    updateParams({
      search: null,
      retreat: null,
      rating: null,
      dateFrom: null,
      dateTo: null,
      page: null,
    })
  }, [updateParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput || null, page: null })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search, updateParams])

  // Sync search input with URL
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const calculateStats = (data: FeedbackEntry[]): FeedbackStats => {
    if (!data.length) {
      return {
        total: 0,
        avgOverall: 0,
        avgSurfing: 0,
        avgAccommodation: 0,
        avgFood: 0,
        avgStaff: 0,
        npsScore: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        withTestimonials: 0,
      }
    }

    const withOverall = data.filter(f => f.overall_rating !== null)
    const withSurfing = data.filter(f => f.surfing_rating !== null)
    const withAccommodation = data.filter(f => f.accommodation_rating !== null)
    const withFood = data.filter(f => f.food_rating !== null)
    const withStaff = data.filter(f => f.staff_rating !== null)
    const withNps = data.filter(f => f.recommend_score !== null)

    const promoters = withNps.filter(f => f.recommend_score! >= 9).length
    const detractors = withNps.filter(f => f.recommend_score! <= 6).length
    const passives = withNps.length - promoters - detractors

    return {
      total: data.length,
      avgOverall: withOverall.length ? withOverall.reduce((sum, f) => sum + f.overall_rating!, 0) / withOverall.length : 0,
      avgSurfing: withSurfing.length ? withSurfing.reduce((sum, f) => sum + f.surfing_rating!, 0) / withSurfing.length : 0,
      avgAccommodation: withAccommodation.length ? withAccommodation.reduce((sum, f) => sum + f.accommodation_rating!, 0) / withAccommodation.length : 0,
      avgFood: withFood.length ? withFood.reduce((sum, f) => sum + f.food_rating!, 0) / withFood.length : 0,
      avgStaff: withStaff.length ? withStaff.reduce((sum, f) => sum + f.staff_rating!, 0) / withStaff.length : 0,
      npsScore: withNps.length ? Math.round(((promoters - detractors) / withNps.length) * 100) : 0,
      promoters,
      passives,
      detractors,
      withTestimonials: data.filter(f => f.testimonial && f.allow_testimonial_use).length,
    }
  }

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      if (search) params.set('search', search)
      if (retreatFilter !== 'all') params.set('retreatId', retreatFilter)
      if (ratingFilter !== 'all') {
        // BUG-FIX: Use both minRating and maxRating for proper range filtering
        if (ratingFilter === 'high') {
          params.set('minRating', '4')
          params.set('maxRating', '5')
        } else if (ratingFilter === 'medium') {
          params.set('minRating', '3')
          params.set('maxRating', '3')
        } else if (ratingFilter === 'low') {
          params.set('minRating', '1')
          params.set('maxRating', '2')
        }
      }
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const response = await fetch(`/api/feedback?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch feedback')
      }

      const data = result.data || []
      setFeedback(data)
      setStats(calculateStats(data))

      if (result.pagination) {
        setTotal(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
      }

      if (retreats.length === 0) {
        const uniqueRetreats = new Map<string, string>()
        data.forEach((f: FeedbackEntry) => {
          if (f.retreat_id && f.retreat?.destination) {
            uniqueRetreats.set(f.retreat_id, f.retreat.destination)
          }
        })
        setRetreats(Array.from(uniqueRetreats, ([id, destination]) => ({ id, destination })))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sortBy, sortOrder, search, retreatFilter, ratingFilter, dateFrom, dateTo, retreats.length])

  useEffect(() => {
    fetchFeedback()
  }, [fetchFeedback])

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const displayedFeedback = feedback

  const exportToCsv = () => {
    const headers = [
      'Date',
      'Guest Name',
      'Email',
      'Retreat',
      'Overall',
      'Surfing',
      'Accommodation',
      'Food',
      'Staff',
      'NPS Score',
      'Highlights',
      'Improvements',
      'Testimonial',
      'Allow Testimonial',
    ]

    const rows = displayedFeedback.map(f => [
      new Date(f.created_at).toLocaleDateString(),
      `${f.booking?.first_name || ''} ${f.booking?.last_name || ''}`,
      f.email,
      f.retreat?.destination || '',
      f.overall_rating || '',
      f.surfing_rating || '',
      f.accommodation_rating || '',
      f.food_rating || '',
      f.staff_rating || '',
      f.recommend_score || '',
      (f.highlights || '').replace(/"/g, '""'),
      (f.improvements || '').replace(/"/g, '""'),
      (f.testimonial || '').replace(/"/g, '""'),
      f.allow_testimonial_use ? 'Yes' : 'No',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Feedback exported to CSV')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guest Feedback</h1>
          <p className="text-muted-foreground">
            View and analyze feedback from retreat guests
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCsv} variant="outline" disabled={!displayedFeedback.length}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={fetchFeedback} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">NPS Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${
                  stats.npsScore >= 50 ? 'text-green-600' :
                  stats.npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.npsScore}
                </div>
                <div className="flex-1">
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600">{stats.promoters} promoters</span>
                    <span className="text-gray-500">{stats.passives} passive</span>
                    <span className="text-red-600">{stats.detractors} detractors</span>
                  </div>
                  {(stats.promoters + stats.passives + stats.detractors) > 0 && (
                    <div className="flex h-2 mt-2 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500"
                        style={{ width: `${(stats.promoters / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }}
                      />
                      <div
                        className="bg-gray-400"
                        style={{ width: `${(stats.passives / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${(stats.detractors / (stats.promoters + stats.passives + stats.detractors)) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Ratings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingBar label="Overall" value={stats.avgOverall} />
              <RatingBar label="Surfing" value={stats.avgSurfing} />
              <RatingBar label="Accommodation" value={stats.avgAccommodation} />
              <RatingBar label="Food" value={stats.avgFood} />
              <RatingBar label="Staff" value={stats.avgStaff} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Total Responses
                  </span>
                  <span className="font-bold text-lg">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Star className="w-4 h-4" /> Avg Overall Rating
                  </span>
                  <span className="font-bold text-lg">{stats.avgOverall.toFixed(1)}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> With Testimonials
                  </span>
                  <span className="font-bold text-lg">{stats.withTestimonials}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" /> Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={retreatFilter}
                onValueChange={(value) => updateParams({ retreat: value, page: null })}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by retreat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Retreats</SelectItem>
                  {retreats.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.destination}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={ratingFilter}
                onValueChange={(value) => updateParams({ rating: value, page: null })}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="high">High (4-5 stars)</SelectItem>
                  <SelectItem value="medium">Medium (3 stars)</SelectItem>
                  <SelectItem value="low">Low (1-2 stars)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <span className="text-sm text-muted-foreground">Date range:</span>
              <AdminDateRangeFilter
                fromValue={dateFrom || null}
                toValue={dateTo || null}
                onFromChange={(value) => updateParams({ dateFrom: value, page: null })}
                onToChange={(value) => updateParams({ dateTo: value, page: null })}
                fromPlaceholder="From date"
                toPlaceholder="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Responses</CardTitle>
          {total > 0 && (
            <CardDescription>
              Showing {displayedFeedback.length} of {total} responses
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !displayedFeedback.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-1">No feedback yet</h3>
              <p className="text-sm max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No feedback matches your filters. Try adjusting or clearing them.'
                  : 'Feedback from guests will appear here after they complete their retreat experience.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <AdminSortHeader
                    column=""
                    label=""
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={() => {}}
                    className="w-8"
                  />
                  <AdminSortHeader
                    column="guest"
                    label="Guest"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={() => {}}
                  />
                  <AdminSortHeader
                    column="retreat"
                    label="Retreat"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={() => {}}
                    className="hidden md:table-cell"
                  />
                  <AdminSortHeader
                    column="overall_rating"
                    label="Overall"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <AdminSortHeader
                    column="recommend_score"
                    label="NPS"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    className="hidden lg:table-cell"
                  />
                  <AdminSortHeader
                    column="created_at"
                    label="Date"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  />
                  <AdminSortHeader
                    column="testimonial"
                    label="Testimonial"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={() => {}}
                    className="hidden lg:table-cell"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedFeedback.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpanded(entry.id)}
                    >
                      <TableCell>
                        {expandedRows.has(entry.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {entry.booking?.first_name} {entry.booking?.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.email}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden mt-1">
                            {entry.retreat?.destination || 'Unknown retreat'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {entry.retreat ? (
                          <Link
                            href={`/admin/retreats/${entry.retreat_id}`}
                            className="hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entry.retreat.destination}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StarRating rating={entry.overall_rating} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <NpsIndicator score={entry.recommend_score} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {entry.testimonial ? (
                          <Badge variant={entry.allow_testimonial_use ? 'default' : 'secondary'}>
                            {entry.allow_testimonial_use ? 'Available' : 'Private'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(entry.id) && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7}>
                          <div className="py-4 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              <div>
                                <span className="text-sm text-muted-foreground">Surfing</span>
                                <StarRating rating={entry.surfing_rating} />
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Accommodation</span>
                                <StarRating rating={entry.accommodation_rating} />
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Food</span>
                                <StarRating rating={entry.food_rating} />
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Staff</span>
                                <StarRating rating={entry.staff_rating} />
                              </div>
                              <div>
                                <span className="text-sm text-muted-foreground">Would Recommend</span>
                                <NpsIndicator score={entry.recommend_score} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {entry.highlights && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    Highlights
                                  </div>
                                  <p className="text-sm text-green-900">{entry.highlights}</p>
                                </div>
                              )}
                              {entry.improvements && (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                  <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                                    <TrendingDown className="w-4 h-4" />
                                    Improvements
                                  </div>
                                  <p className="text-sm text-amber-900">{entry.improvements}</p>
                                </div>
                              )}
                            </div>

                            {entry.testimonial && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                                  <MessageSquare className="w-4 h-4" />
                                  Testimonial
                                  {entry.allow_testimonial_use && (
                                    <Badge variant="outline" className="text-xs">Can use publicly</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-blue-900 italic">&ldquo;{entry.testimonial}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && total > 0 && (
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={(newPage) => updateParams({ page: newPage.toString() })}
              onPageSizeChange={(size) => updateParams({ pageSize: size.toString(), page: null })}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FeedbackPageContent />
    </Suspense>
  )
}
