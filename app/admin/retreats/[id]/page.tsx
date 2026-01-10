'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Users,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  Mail,
  Trash2,
  RefreshCw,
  AlertCircle,
  MapPin,
  ExternalLink,
  BedDouble,
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
import type { Retreat, WaitlistEntry, WaitlistStats, RoomOccupancyResponse, RoomWithGuests } from '@/lib/types/database'
import { RoomManagementProvider, InteractiveRoomView } from '@/components/admin/room-management'
import { AddRoomDialog } from '@/components/admin/add-room-dialog'
import { EditRoomDialog } from '@/components/admin/edit-room-dialog'

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

export default function AdminRetreatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [retreat, setRetreat] = useState<Retreat | null>(null)
  const [waitlistData, setWaitlistData] = useState<WaitlistListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [waitlistLoading, setWaitlistLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Room management state
  const [roomData, setRoomData] = useState<RoomOccupancyResponse | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false)
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<RoomWithGuests | null>(null)
  const [selectedRoomForDelete, setSelectedRoomForDelete] = useState<RoomWithGuests | null>(null)
  const [deletingRoom, setDeletingRoom] = useState(false)

  // Fetch retreat details
  useEffect(() => {
    async function fetchRetreat() {
      try {
        const response = await fetch(`/api/retreats/${id}`)
        const result = await response.json()

        if (!response.ok) {
          setError(result.error || 'Failed to fetch retreat')
          return
        }

        setRetreat(result.data)
      } catch (err) {
        setError('Failed to load retreat')
      } finally {
        setLoading(false)
      }
    }

    fetchRetreat()
  }, [id])

  // Fetch waitlist
  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true)

    try {
      const response = await fetch(`/api/admin/waitlist?retreatId=${id}`)
      const result = await response.json()

      if (response.ok) {
        setWaitlistData(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch waitlist:', err)
    } finally {
      setWaitlistLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchWaitlist()
  }, [fetchWaitlist])

  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    setRoomLoading(true)
    try {
      const response = await fetch(`/api/admin/retreats/${id}/room-occupancy`)
      const result = await response.json()
      if (response.ok) {
        setRoomData(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch room data:', err)
    } finally {
      setRoomLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchRoomData()
  }, [fetchRoomData])

  const confirmDeleteRoom = async () => {
    if (!selectedRoomForDelete) return

    setDeletingRoom(true)
    try {
      const response = await fetch(`/api/retreats/${id}/rooms/${selectedRoomForDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to delete room')
        return
      }

      toast.success(`Room "${selectedRoomForDelete.name}" deleted successfully`)
      setSelectedRoomForDelete(null)
      fetchRoomData()
    } catch {
      toast.error('Failed to delete room')
    } finally {
      setDeletingRoom(false)
    }
  }

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

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !retreat) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Error Loading Retreat</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/retreats')}>
              Back to Retreats
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link href="/admin/retreats">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Retreats
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{retreat.destination}</h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(retreat.start_date)} - {formatDate(retreat.end_date)}
            </span>
            {retreat.exact_address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {retreat.exact_address}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href={`/retreats/${retreat.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Page
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/retreats/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Retreat
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={retreat.is_published ? 'default' : 'secondary'}>
              {retreat.is_published ? 'Published' : 'Draft'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                retreat.availability_status === 'available'
                  ? 'default'
                  : retreat.availability_status === 'few_spots'
                  ? 'secondary'
                  : 'destructive'
              }
            >
              {retreat.availability_status === 'available'
                ? 'Available'
                : retreat.availability_status === 'few_spots'
                ? 'Few Spots'
                : 'Sold Out'}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{retreat.level}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{retreat.duration}</div>
          </CardContent>
        </Card>
      </div>

      {/* Room Management Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="w-5 h-5" />
                Room Management
              </CardTitle>
              <CardDescription>
                Drag guests between rooms or click + to assign
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchRoomData} disabled={roomLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${roomLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roomLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : roomData ? (
            <RoomManagementProvider retreatId={id} initialData={roomData}>
              <InteractiveRoomView
                onAddRoom={() => setAddRoomDialogOpen(true)}
                onEditRoom={(room) => setSelectedRoomForEdit(room)}
                onDeleteRoom={(room) => setSelectedRoomForDelete(room)}
              />
            </RoomManagementProvider>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BedDouble className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load room data</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waitlist Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Waitlist
                {waitlistData?.stats.total ? (
                  <Badge variant="secondary">{waitlistData.stats.total}</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                People waiting for a spot on this retreat
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchWaitlist} disabled={waitlistLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${waitlistLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          {waitlistData?.stats && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-blue-600">{waitlistData.stats.waiting}</div>
                <div className="text-xs text-muted-foreground">Waiting</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-orange-500">{waitlistData.stats.notified}</div>
                <div className="text-xs text-muted-foreground">Notified</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-green-600">{waitlistData.stats.accepted}</div>
                <div className="text-xs text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-red-600">{waitlistData.stats.declined}</div>
                <div className="text-xs text-muted-foreground">Declined</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-gray-600">{waitlistData.stats.expired}</div>
                <div className="text-xs text-muted-foreground">Expired</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-2xl font-bold tabular-nums text-green-600">{waitlistData.stats.booked}</div>
                <div className="text-xs text-muted-foreground">Booked</div>
              </div>
            </div>
          )}

          {waitlistLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !waitlistData?.entries?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No one on the waitlist yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistData.entries.map((entry) => (
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
                      {entry.room?.name || (
                        <span className="text-muted-foreground text-sm">Any room</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      {entry.status === 'notified' && entry.notification_expires_at ? (
                        <div className="text-sm font-medium text-amber-600">
                          {getTimeRemaining(entry.notification_expires_at)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(entry.status === 'waiting' || entry.status === 'expired') && (
                          <Button
                            size="sm"
                            onClick={() => handleNotify(entry.id)}
                            disabled={notifyingId === entry.id}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            {notifyingId === entry.id ? '...' : 'Notify'}
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
                                This will remove {entry.first_name} {entry.last_name} from the waitlist.
                                This action cannot be undone.
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

      {/* Room Dialogs */}
      {retreat && (
        <>
          <AddRoomDialog
            open={addRoomDialogOpen}
            onOpenChange={setAddRoomDialogOpen}
            retreatId={id}
            retreatStartDate={retreat.start_date}
            onSuccess={() => {
              setAddRoomDialogOpen(false)
              fetchRoomData()
            }}
          />

          {selectedRoomForEdit && (
            <EditRoomDialog
              open={!!selectedRoomForEdit}
              onOpenChange={(open) => !open && setSelectedRoomForEdit(null)}
              retreatId={id}
              room={selectedRoomForEdit}
              retreatStartDate={retreat.start_date}
              onSuccess={() => {
                setSelectedRoomForEdit(null)
                fetchRoomData()
              }}
            />
          )}

          {/* Delete Room Dialog */}
          <AlertDialog open={!!selectedRoomForDelete} onOpenChange={(open) => !open && setSelectedRoomForDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  Delete Room?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the room <strong>{selectedRoomForDelete?.name}</strong>.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingRoom}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDeleteRoom}
                  disabled={deletingRoom}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deletingRoom ? 'Deleting...' : 'Delete Room'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
