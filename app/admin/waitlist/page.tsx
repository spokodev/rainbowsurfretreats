'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  Users,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  Mail,
  Trash2,
  RefreshCw,
  AlertCircle,
  Calendar,
  MessageSquare,
  Loader2,
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
import {
  AdminPagination,
  AdminSearchInput,
  AdminStatusFilter,
  AdminFilterBar,
  type StatusOption,
} from '@/components/admin/table'
import type { WaitlistEntry, WaitlistStats } from '@/lib/types/database'

interface WaitlistListResponse {
  entries: WaitlistEntry[]
  stats: WaitlistStats
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'notified', label: 'Notified' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'booked', label: 'Booked' },
]

const getStatusBadge = (status: string) => {
  const config = {
    waiting: { variant: 'secondary' as const, icon: Clock, label: 'Waiting' },
    notified: { variant: 'default' as const, icon: Bell, label: 'Notified' },
    accepted: { variant: 'default' as const, icon: CheckCircle, label: 'Accepted' },
    declined: { variant: 'destructive' as const, icon: XCircle, label: 'Declined' },
    expired: { variant: 'outline' as const, icon: AlertCircle, label: 'Expired' },
    booked: { variant: 'default' as const, icon: CheckCircle, label: 'Booked' },
  }

  const conf = config[status as keyof typeof config] || { variant: 'outline' as const, icon: AlertCircle, label: status }
  const Icon = conf.icon

  return (
    <Badge variant={conf.variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {conf.label}
    </Badge>
  )
}

const PAGE_SIZE = 25

function WaitlistPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL state
  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || ''
  const page = Number(searchParams.get('page')) || 1

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WaitlistListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
      const newSearch = params.toString()
      router.push(newSearch ? `${pathname}?${newSearch}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const fetchWaitlist = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', PAGE_SIZE.toString())
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/waitlist?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch waitlist')
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  const handleNotify = async (entryId: string) => {
    setNotifyingId(entryId)

    try {
      const response = await fetch(`/api/admin/waitlist/${entryId}/notify`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to send notification')
        return
      }

      toast.success(result.message || 'Notification sent successfully')
      fetchWaitlist()
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setNotifyingId(null)
    }
  }

  const handleDelete = async (entryId: string) => {
    setDeletingId(entryId)

    try {
      const response = await fetch(`/api/admin/waitlist/${entryId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to delete entry')
        return
      }

      toast.success(result.message || 'Entry deleted successfully')
      fetchWaitlist()
    } catch {
      toast.error('Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  const hasActiveFilters = search.length > 0 || statusFilter.length > 0
  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Waitlist Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage waitlist entries across all retreats
          </p>
        </div>
        <Button onClick={fetchWaitlist} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{data.stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Waiting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-blue-600">{data.stats.waiting}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-orange-500">{data.stats.notified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-green-600">{data.stats.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Declined
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-red-600">{data.stats.declined}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-gray-500">{data.stats.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
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
          <CardTitle>Waitlist Entries</CardTitle>
          {(data?.pagination?.total || 0) > 0 && (
            <CardDescription>
              {data?.pagination?.total} entries found
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <AdminSearchInput
              value={search}
              onChange={(value) => updateParams({ search: value || null, page: null })}
              placeholder="Search by name or email..."
              className="max-w-sm"
            />

            <AdminFilterBar
              hasActiveFilters={hasActiveFilters}
              onReset={() => updateParams({ search: null, status: null, page: null })}
            >
              <AdminStatusFilter
                value={statusFilter || 'all'}
                onChange={(value) => updateParams({ status: value === 'all' ? null : value, page: null })}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="w-[140px]"
              />
            </AdminFilterBar>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.entries?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-1">No waitlist entries yet</h3>
              <p className="text-sm max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No entries match your filters. Try adjusting or clearing them.'
                  : 'Guests who join the waitlist for sold-out retreats will appear here.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => updateParams({ search: null, status: null, page: null })}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden sm:table-cell">#</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead className="hidden md:table-cell">Retreat</TableHead>
                      <TableHead className="hidden lg:table-cell">Room</TableHead>
                      <TableHead className="hidden xl:table-cell">Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Expires</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">
                          {entry.position}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {entry.first_name} {entry.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {entry.email}
                            </div>
                            {entry.guests_count > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {entry.guests_count} guests
                              </div>
                            )}
                            {/* Mobile-only: show position and retreat */}
                            <div className="text-xs text-muted-foreground sm:hidden mt-1">
                              #{entry.position}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {entry.retreat?.destination || 'Unknown retreat'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {entry.retreat ? (
                            <Link
                              href={`/admin/retreats/${entry.retreat_id}`}
                              className="hover:underline"
                            >
                              {entry.retreat.destination}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {entry.room?.name || (
                            <span className="text-muted-foreground text-sm">Any room</span>
                          )}
                        </TableCell>
                        {/* BUG-021 FIX: Notes column with proper truncation and tooltip */}
                        <TableCell className="hidden xl:table-cell max-w-[200px]">
                          {entry.notes ? (
                            <div
                              className="group relative flex items-start gap-1 cursor-help"
                              title={entry.notes}
                            >
                              <MessageSquare className="w-3 h-3 mt-0.5 text-blue-500 shrink-0" />
                              <span className="text-sm text-muted-foreground truncate block overflow-hidden">
                                {entry.notes.length > 50 ? `${entry.notes.slice(0, 50)}...` : entry.notes}
                              </span>
                              {/* Hover tooltip for full text */}
                              {entry.notes.length > 50 && (
                                <div className="invisible group-hover:visible absolute z-50 bottom-full left-0 mb-2 p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border max-w-xs whitespace-pre-wrap">
                                  {entry.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {entry.status === 'notified' && entry.notification_expires_at ? (
                            <div className="text-sm">
                              <div className="font-medium text-amber-600">
                                {getTimeRemaining(entry.notification_expires_at)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateTime(entry.notification_expires_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(entry.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {entry.status === 'waiting' && (
                              <Button
                                size="sm"
                                onClick={() => handleNotify(entry.id)}
                                disabled={notifyingId === entry.id}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                {notifyingId === entry.id ? 'Sending...' : 'Notify'}
                              </Button>
                            )}

                            {entry.status === 'expired' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleNotify(entry.id)}
                                disabled={notifyingId === entry.id}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Re-notify
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deletingId === entry.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove from Waitlist?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove {entry.first_name} {entry.last_name} from the waitlist
                                    for {entry.retreat?.destination || 'this retreat'}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(entry.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
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

              {totalPages > 1 && (
                <AdminPagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={data.pagination.total}
                  totalPages={totalPages}
                  onPageChange={(newPage) =>
                    updateParams({ page: newPage === 1 ? null : newPage.toString() })
                  }
                  showPageSizeSelector={false}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminWaitlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WaitlistPageContent />
    </Suspense>
  )
}
