'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Users,
  RefreshCw,
  BedDouble,
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  Search,
  Filter,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getPaymentStatusConfig } from '@/lib/utils/payment-status'
import type { RoomOccupancyResponse, RoomWithGuests, UnassignedBooking, WaitlistEntry, PaymentStatus } from '@/lib/types/database'

const getOccupancyColor = (percent: number) => {
  if (percent >= 80) return 'text-red-600'
  if (percent >= 50) return 'text-amber-600'
  return 'text-green-600'
}

const getProgressColor = (percent: number) => {
  if (percent >= 80) return '[&>div]:bg-red-500'
  if (percent >= 50) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-green-500'
}
import { RoomOccupancyCard } from '@/components/admin/room-occupancy-card'
import { AssignRoomDialog } from '@/components/admin/assign-room-dialog'
import { MoveGuestDialog } from '@/components/admin/move-guest-dialog'
import { SelectBookingDialog } from '@/components/admin/select-booking-dialog'
import { AddRoomDialog } from '@/components/admin/add-room-dialog'
import { EditRoomDialog } from '@/components/admin/edit-room-dialog'
import { RoomManagementProvider, ViewToggle, InteractiveRoomView } from '@/components/admin/room-management'
import { useRoomViewPreference } from '@/hooks/use-room-view-preference'

export default function RoomOccupancyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [data, setData] = useState<RoomOccupancyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all')

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [selectBookingDialogOpen, setSelectBookingDialogOpen] = useState(false)
  const [addRoomDialogOpen, setAddRoomDialogOpen] = useState(false)
  const [editRoomDialogOpen, setEditRoomDialogOpen] = useState(false)
  const [deleteRoomDialogOpen, setDeleteRoomDialogOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<{
    bookingId: string
    guestName: string
    currentRoomId?: string
    currentRoomName?: string
  } | null>(null)
  const [selectedRoomForAssign, setSelectedRoomForAssign] = useState<RoomWithGuests | null>(null)
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState<RoomWithGuests | null>(null)
  const [selectedRoomForDelete, setSelectedRoomForDelete] = useState<RoomWithGuests | null>(null)

  // View preference (Classic vs Interactive)
  const { view, setView, isInteractive, isLoaded: viewLoaded } = useRoomViewPreference()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/retreats/${id}/room-occupancy`)
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to fetch room occupancy')
        return
      }

      setData(result.data)
    } catch (err) {
      setError('Failed to load room occupancy data')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAssignRoom = (booking: UnassignedBooking) => {
    setSelectedBooking({
      bookingId: booking.id,
      guestName: `${booking.first_name} ${booking.last_name}`,
    })
    setAssignDialogOpen(true)
  }

  const handleAssignGuestToRoom = (room: RoomWithGuests) => {
    if (!data || data.unassigned.length === 0) return

    // If only one unassigned booking, directly open assign dialog
    if (data.unassigned.length === 1) {
      handleAssignRoom(data.unassigned[0])
    } else {
      // Multiple unassigned bookings - show picker first
      setSelectedRoomForAssign(room)
      setSelectBookingDialogOpen(true)
    }
  }

  const handleBookingSelected = (booking: UnassignedBooking) => {
    setSelectBookingDialogOpen(false)
    setSelectedRoomForAssign(null)
    handleAssignRoom(booking)
  }

  const handleMoveGuest = (room: RoomWithGuests, bookingId: string, guestName: string) => {
    setSelectedBooking({
      bookingId,
      guestName,
      currentRoomId: room.id,
      currentRoomName: room.name,
    })
    setMoveDialogOpen(true)
  }

  const handleRemoveFromRoom = (bookingId: string, guestName: string, roomName?: string) => {
    setSelectedBooking({
      bookingId,
      guestName,
      currentRoomName: roomName,
    })
    setRemoveDialogOpen(true)
  }

  const confirmRemoveFromRoom = async () => {
    if (!selectedBooking) return

    setRemoving(true)
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.bookingId}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: null }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to remove from room')
        return
      }

      toast.success(`${selectedBooking.guestName} removed from ${selectedBooking.currentRoomName || 'room'}`)
      setRemoveDialogOpen(false)
      setSelectedBooking(null)
      fetchData()
    } catch {
      toast.error('Failed to remove from room')
    } finally {
      setRemoving(false)
    }
  }

  const handleRoomAssigned = () => {
    setAssignDialogOpen(false)
    setMoveDialogOpen(false)
    setSelectedBooking(null)
    fetchData()
  }

  const handleEditRoom = (room: RoomWithGuests) => {
    setSelectedRoomForEdit(room)
    setEditRoomDialogOpen(true)
  }

  const handleDeleteRoom = (room: RoomWithGuests) => {
    setSelectedRoomForDelete(room)
    setDeleteRoomDialogOpen(true)
  }

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
      setDeleteRoomDialogOpen(false)
      setSelectedRoomForDelete(null)
      fetchData()
    } catch {
      toast.error('Failed to delete room')
    } finally {
      setDeletingRoom(false)
    }
  }

  const handleRoomUpdated = () => {
    setEditRoomDialogOpen(false)
    setSelectedRoomForEdit(null)
    fetchData()
  }

  const handleRoomCreated = () => {
    setAddRoomDialogOpen(false)
    fetchData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Filter rooms and guests based on search and payment filter
  const getFilteredData = () => {
    if (!data) return null

    const searchLower = searchTerm.toLowerCase().trim()

    // Filter function for guests
    const matchesGuest = (firstName: string, lastName: string, email: string, paymentStatus: PaymentStatus) => {
      const matchesSearch = !searchLower ||
        firstName.toLowerCase().includes(searchLower) ||
        lastName.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        `${firstName} ${lastName}`.toLowerCase().includes(searchLower)

      const matchesPayment = paymentFilter === 'all' || paymentStatus === paymentFilter

      return matchesSearch && matchesPayment
    }

    // Filter rooms - keep rooms but filter their guests
    const filteredRooms = data.rooms.map(room => ({
      ...room,
      guests: room.guests.filter(guest =>
        matchesGuest(guest.first_name, guest.last_name, guest.email, guest.payment_status)
      ),
    }))

    // Filter unassigned bookings
    const filteredUnassigned = data.unassigned.filter(booking =>
      matchesGuest(booking.first_name, booking.last_name, booking.email, booking.payment_status)
    )

    return {
      ...data,
      rooms: filteredRooms,
      unassigned: filteredUnassigned,
    }
  }

  const filteredData = getFilteredData()
  const hasActiveFilters = searchTerm.trim() !== '' || paymentFilter !== 'all'

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
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
            <Link href={`/admin/retreats/${id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Retreat
            </Link>
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BedDouble className="w-8 h-8" />
            Room Management
          </h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">{data.retreat.destination}</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(data.retreat.start_date)} - {formatDate(data.retreat.end_date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {viewLoaded && (
            <ViewToggle view={view} onViewChange={setView} />
          )}
          {!isInteractive && (
            <Button onClick={() => setAddRoomDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          )}
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const occupancyPercent = data.summary.totalCapacity > 0
                ? Math.round((data.summary.totalOccupied / data.summary.totalCapacity) * 100)
                : 0
              return (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {data.summary.totalOccupied} / {data.summary.totalCapacity}
                    </span>
                    <span className={`text-sm font-medium ${getOccupancyColor(occupancyPercent)}`}>
                      {occupancyPercent}%
                    </span>
                  </div>
                  <Progress
                    value={occupancyPercent}
                    className={`h-2 mt-2 ${getProgressColor(occupancyPercent)}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">guests in rooms</p>
                </>
              )
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Spots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-green-600">
              {data.summary.totalCapacity - data.summary.totalOccupied}
            </div>
            <p className="text-xs text-muted-foreground">spots remaining</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {data.summary.unassignedCount}
            </div>
            <p className="text-xs text-muted-foreground">bookings without rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Waitlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-blue-600">
              {data.summary.waitlistCount}
            </div>
            <p className="text-xs text-muted-foreground">people waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive View */}
      {isInteractive && viewLoaded && (
        <RoomManagementProvider retreatId={id} initialData={data}>
          <div className="mb-8">
            <InteractiveRoomView
              onAddRoom={() => setAddRoomDialogOpen(true)}
              onEditRoom={handleEditRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          </div>
        </RoomManagementProvider>
      )}

      {/* Classic View - Search and Filter */}
      {!isInteractive && (
      <>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              {paymentFilter === 'all' ? 'All Status' : getPaymentStatusConfig(paymentFilter).label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as 'all' | PaymentStatus)}>
              <DropdownMenuRadioItem value="all">All Status</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="paid">Paid</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="deposit">Deposit</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="unpaid">Unpaid</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setPaymentFilter('all')
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BedDouble className="w-5 h-5" />
          Rooms
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </h2>
        {data.rooms.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BedDouble className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No rooms configured for this retreat</p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/admin/retreats/${id}/edit`}>Add Rooms</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filteredData?.rooms ?? data.rooms).map((room) => (
              <RoomOccupancyCard
                key={room.id}
                room={room}
                onMoveGuest={(bookingId, guestName) => handleMoveGuest(room, bookingId, guestName)}
                onRemoveGuest={(bookingId, guestName) => handleRemoveFromRoom(bookingId, guestName, room.name)}
                onAssignGuest={() => handleAssignGuestToRoom(room)}
                onEditRoom={() => handleEditRoom(room)}
                onDeleteRoom={() => handleDeleteRoom(room)}
                hasUnassigned={data.unassigned.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unassigned Bookings */}
      {data.unassigned.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-600" />
              Unassigned Bookings
              <Badge variant="secondary">
                {hasActiveFilters
                  ? `${filteredData?.unassigned.length ?? 0}/${data.unassigned.length}`
                  : data.unassigned.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Bookings that haven&apos;t been assigned to a room yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(filteredData?.unassigned ?? data.unassigned).length === 0 && hasActiveFilters ? (
                <p className="text-center py-4 text-muted-foreground">
                  No matching unassigned bookings
                </p>
              ) : (filteredData?.unassigned ?? data.unassigned).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div>
                    <div className="font-medium">
                      {booking.first_name} {booking.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {booking.email} &middot; {booking.guests_count} guest{booking.guests_count > 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-2 mt-1">
                      {(() => {
                        const paymentConfig = getPaymentStatusConfig(booking.payment_status)
                        const PaymentIcon = paymentConfig.icon
                        return (
                          <Badge variant="outline" className={paymentConfig.className}>
                            <PaymentIcon className="w-3 h-3 mr-1" />
                            {paymentConfig.label}
                          </Badge>
                        )
                      })()}
                      <span className="text-xs text-muted-foreground">#{booking.booking_number}</span>
                    </div>
                  </div>
                  <Button onClick={() => handleAssignRoom(booking)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign Room
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waitlist Section */}
      {data.waitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Waitlist
              <Badge variant="secondary">{data.waitlist.length}</Badge>
            </CardTitle>
            <CardDescription>
              People waiting for a spot on this retreat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.waitlist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div>
                    <div className="font-medium">
                      {entry.first_name} {entry.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.email} &middot; {entry.guests_count} guest{entry.guests_count > 1 ? 's' : ''}
                    </div>
                    {entry.room && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Interested in: {entry.room.name}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/admin/retreats/${id}`}>Manage Waitlist</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Dialogs */}
      {selectedBooking && data && (
        <>
          <AssignRoomDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            bookingId={selectedBooking.bookingId}
            guestName={selectedBooking.guestName}
            rooms={data.rooms}
            onSuccess={handleRoomAssigned}
          />
          <MoveGuestDialog
            open={moveDialogOpen}
            onOpenChange={setMoveDialogOpen}
            bookingId={selectedBooking.bookingId}
            guestName={selectedBooking.guestName}
            currentRoomId={selectedBooking.currentRoomId}
            currentRoomName={selectedBooking.currentRoomName}
            rooms={data.rooms}
            onSuccess={handleRoomAssigned}
          />
        </>
      )}

      {/* Select Booking Dialog (for picking which booking to assign) */}
      {data && selectedRoomForAssign && (
        <SelectBookingDialog
          open={selectBookingDialogOpen}
          onOpenChange={setSelectBookingDialogOpen}
          roomName={selectedRoomForAssign.name}
          unassignedBookings={data.unassigned}
          onSelect={handleBookingSelected}
        />
      )}

      {/* Remove from Room Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guest from Room?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedBooking?.guestName}</strong> from{' '}
              <strong>{selectedBooking?.currentRoomName}</strong>. The guest will appear in the
              unassigned bookings list and will need to be reassigned to a room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFromRoom}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removing...' : 'Remove from Room'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Room Dialog */}
      <AlertDialog open={deleteRoomDialogOpen} onOpenChange={setDeleteRoomDialogOpen}>
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

      {/* Add Room Dialog */}
      {data && (
        <AddRoomDialog
          open={addRoomDialogOpen}
          onOpenChange={setAddRoomDialogOpen}
          retreatId={id}
          retreatStartDate={data.retreat.start_date}
          onSuccess={handleRoomCreated}
        />
      )}

      {/* Edit Room Dialog */}
      {data && (
        <EditRoomDialog
          open={editRoomDialogOpen}
          onOpenChange={setEditRoomDialogOpen}
          retreatId={id}
          room={selectedRoomForEdit}
          retreatStartDate={data.retreat.start_date}
          onSuccess={handleRoomUpdated}
        />
      )}
    </div>
  )
}
