'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  Search,
  AlertCircle,
  Calendar,
  MessageSquare,
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
  TableHead,
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

export default function AdminWaitlistPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WaitlistListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchWaitlist = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)

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
  }, [search, statusFilter])

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
    } catch (err) {
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
    } catch (err) {
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

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Waiting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{data.stats.waiting}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{data.stats.notified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Accepted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.stats.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Declined
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{data.stats.declined}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{data.stats.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="notified">Notified</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
              </SelectContent>
            </Select>
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
          <CardTitle>Waitlist Entries</CardTitle>
          <CardDescription>
            {data?.pagination.total || 0} entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.entries?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No waitlist entries found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Retreat</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">
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
                      </div>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      {entry.room?.name || (
                        <span className="text-muted-foreground text-sm">Any room</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.notes ? (
                        <div className="max-w-[200px]">
                          <div className="flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 mt-1 text-blue-500 shrink-0" />
                            <span className="text-sm text-muted-foreground line-clamp-2" title={entry.notes}>
                              {entry.notes}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
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
                    <TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
