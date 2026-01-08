'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Retreat } from '@/lib/types/database'
import {
  AdminPagination,
  AdminSearchInput,
  AdminStatusFilter,
  AdminFilterBar,
  AdminSortHeader,
  type StatusOption,
} from '@/components/admin/table'
import type { SortOrder } from '@/hooks/use-admin-table-state'

interface RetreatsResponse {
  data: Retreat[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
]

const LEVEL_OPTIONS: StatusOption[] = [
  { value: 'Beginners', label: 'Beginners' },
  { value: 'All Levels', label: 'All Levels' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
]

function RetreatsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse state from URL
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 25
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const level = searchParams.get('level') || ''
  const sortBy = searchParams.get('sort') || 'start_date'
  const sortOrder = (searchParams.get('order') || 'asc') as SortOrder

  const [retreats, setRetreats] = useState<Retreat[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)

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

  const hasActiveFilters = !!status || !!level || !!search

  const resetFilters = useCallback(() => {
    updateParams({
      search: null,
      status: null,
      level: null,
      page: null,
    })
  }, [updateParams])

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        updateParams({ order: sortOrder === 'asc' ? 'desc' : 'asc', page: null })
      } else {
        updateParams({ sort: column, order: 'asc', page: null })
      }
    },
    [sortBy, sortOrder, updateParams]
  )

  const fetchRetreats = useCallback(async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (level) params.set('level', level)
      if (sortBy) params.set('sort', sortBy)
      if (sortOrder) params.set('order', sortOrder)

      const response = await fetch(`/api/retreats?${params.toString()}`)
      const result: RetreatsResponse = await response.json()

      if (!response.ok) {
        throw new Error('Failed to fetch retreats')
      }

      setRetreats(result.data || [])
      setPagination(result.pagination)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load retreats')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, search, status, level, sortBy, sortOrder])

  useEffect(() => {
    fetchRetreats()
  }, [fetchRetreats])

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/retreats/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete retreat')
      }

      toast.success('Retreat deleted successfully')
      setRetreats(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete retreat')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id)
    try {
      const response = await fetch(`/api/retreats/${id}/duplicate`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to duplicate retreat')
      }

      toast.success('Retreat duplicated successfully')
      fetchRetreats()
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate retreat')
    } finally {
      setIsDuplicating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const publishedCount = retreats.filter(r => r.is_published).length
  const draftCount = retreats.filter(r => !r.is_published).length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retreats</h1>
          <p className="text-muted-foreground">
            Manage your surf retreat experiences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRetreats} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button asChild>
            <Link href="/admin/retreats/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add New Retreat</span>
              <span className="sm:hidden">New</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{publishedCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-gray-600" />
              <div className="text-2xl font-bold">{draftCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">{pagination.total}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Retreats</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retreats</CardTitle>
          <CardDescription>
            A list of all retreats including destination, dates, and pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <AdminSearchInput
              value={search}
              onChange={(value) => updateParams({ search: value || null, page: null })}
              placeholder="Search by destination..."
              className="max-w-sm"
            />

            <AdminFilterBar hasActiveFilters={hasActiveFilters} onReset={resetFilters}>
              <AdminStatusFilter
                value={status || 'all'}
                onChange={(value) => updateParams({ status: value, page: null })}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="w-[140px]"
              />
              <AdminStatusFilter
                value={level || 'all'}
                onChange={(value) => updateParams({ level: value, page: null })}
                options={LEVEL_OPTIONS}
                placeholder="Level"
                className="w-[140px]"
              />
            </AdminFilterBar>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : retreats.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters ? 'No retreats match your filters' : 'No retreats found'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/admin/retreats/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first retreat
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <AdminSortHeader
                        column="destination"
                        label="Destination"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                      />
                      <AdminSortHeader
                        column="start_date"
                        label="Dates"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                        className="hidden sm:table-cell"
                      />
                      <TableHead className="hidden md:table-cell">Duration</TableHead>
                      <AdminSortHeader
                        column="level"
                        label="Level"
                        currentSort={sortBy}
                        currentOrder={sortOrder}
                        onSort={handleSort}
                        className="hidden lg:table-cell"
                      />
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retreats.map((retreat) => (
                      <TableRow key={retreat.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{retreat.destination}</span>
                            </div>
                            {/* Mobile-only: show dates */}
                            <span className="text-xs text-muted-foreground sm:hidden mt-1">
                              {formatDate(retreat.start_date)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(retreat.start_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{retreat.duration}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge
                            variant={
                              retreat.level === 'Beginners' ? 'secondary' : 'default'
                            }
                          >
                            {retreat.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              {retreat.rooms && retreat.rooms.length > 0
                                ? `from €${Math.min(...retreat.rooms.map(r => r.price))}`
                                : 'No rooms'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={retreat.is_published ? 'default' : 'outline'}>
                            {retreat.is_published ? (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Published</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="mr-1 h-3 w-3" />
                                <span className="hidden sm:inline">Draft</span>
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/admin/retreats/${retreat.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(retreat.id)}
                            disabled={isDuplicating === retreat.id}
                            title="Duplicate retreat"
                          >
                            {isDuplicating === retreat.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                disabled={isDeleting === retreat.id}
                              >
                                {isDeleting === retreat.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will move &quot;{retreat.destination}&quot; to trash.
                                  You can restore it within 30 days or delete it permanently from the Trash page.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(retreat.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Move to Trash
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              <AdminPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => updateParams({ page: newPage.toString() })}
                onPageSizeChange={(size) =>
                  updateParams({ pageSize: size.toString(), page: null })
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminRetreatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <RetreatsPageContent />
    </Suspense>
  )
}
