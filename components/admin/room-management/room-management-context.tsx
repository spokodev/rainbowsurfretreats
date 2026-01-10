'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import type {
  RoomOccupancyResponse,
  RoomWithGuests,
  UnassignedBooking,
  RoomGuest,
} from '@/lib/types/database'

interface RoomManagementContextValue {
  data: RoomOccupancyResponse | null
  loading: boolean
  error: string | null
  retreatId: string
  fetchData: () => Promise<void>
  assignGuest: (bookingId: string, roomId: string) => Promise<boolean>
  moveGuest: (bookingId: string, fromRoomId: string | null, toRoomId: string | null) => Promise<boolean>
  removeGuest: (bookingId: string, roomId: string) => Promise<boolean>
  optimisticMoveGuest: (bookingId: string, fromRoomId: string | null, toRoomId: string | null) => void
  rollbackOptimisticUpdate: () => void
}

const RoomManagementContext = createContext<RoomManagementContextValue | null>(null)

export function useRoomManagement() {
  const context = useContext(RoomManagementContext)
  if (!context) {
    throw new Error('useRoomManagement must be used within RoomManagementProvider')
  }
  return context
}

interface RoomManagementProviderProps {
  children: ReactNode
  retreatId: string
  initialData?: RoomOccupancyResponse | null
}

export function RoomManagementProvider({
  children,
  retreatId,
  initialData = null,
}: RoomManagementProviderProps) {
  const [data, setData] = useState<RoomOccupancyResponse | null>(initialData)
  const [previousData, setPreviousData] = useState<RoomOccupancyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/retreats/${retreatId}/room-occupancy`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch room data')
      }

      setData(result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [retreatId])

  // Optimistic update helper - moves guest in local state
  const optimisticMoveGuest = useCallback((
    bookingId: string,
    fromRoomId: string | null,
    toRoomId: string | null
  ) => {
    if (!data) return

    // Save current state for rollback
    setPreviousData(data)

    setData(prevData => {
      if (!prevData) return prevData

      // Find the guest/booking to move
      let movingGuest: RoomGuest | null = null
      let movingBooking: UnassignedBooking | null = null

      // Check if moving from a room
      if (fromRoomId) {
        const fromRoom = prevData.rooms.find(r => r.id === fromRoomId)
        if (fromRoom) {
          const guestIndex = fromRoom.guests.findIndex(g => g.booking_id === bookingId)
          if (guestIndex !== -1) {
            movingGuest = fromRoom.guests[guestIndex]
          }
        }
      } else {
        // Moving from unassigned
        const unassignedIndex = prevData.unassigned.findIndex(u => u.id === bookingId)
        if (unassignedIndex !== -1) {
          movingBooking = prevData.unassigned[unassignedIndex]
        }
      }

      const guestData = movingGuest || (movingBooking ? {
        booking_id: movingBooking.id,
        booking_number: movingBooking.booking_number,
        first_name: movingBooking.first_name,
        last_name: movingBooking.last_name,
        email: movingBooking.email,
        phone: movingBooking.phone,
        guests_count: movingBooking.guests_count,
        payment_status: movingBooking.payment_status,
        status: movingBooking.status,
        check_in_date: movingBooking.check_in_date,
        check_out_date: movingBooking.check_out_date,
      } as RoomGuest : null)

      if (!guestData) return prevData

      // Create new state
      const newRooms = prevData.rooms.map(room => {
        // Remove from source room
        if (room.id === fromRoomId) {
          const newGuests = room.guests.filter(g => g.booking_id !== bookingId)
          const removedGuestCount = room.guests.find(g => g.booking_id === bookingId)?.guests_count || 0
          return {
            ...room,
            guests: newGuests,
            occupied: room.occupied - removedGuestCount,
            available: room.available + removedGuestCount,
          }
        }
        // Add to target room
        if (room.id === toRoomId) {
          return {
            ...room,
            guests: [...room.guests, guestData],
            occupied: room.occupied + guestData.guests_count,
            available: room.available - guestData.guests_count,
          }
        }
        return room
      })

      // Update unassigned list
      let newUnassigned = prevData.unassigned
      if (!fromRoomId) {
        // Remove from unassigned
        newUnassigned = prevData.unassigned.filter(u => u.id !== bookingId)
      }
      if (!toRoomId && movingGuest) {
        // Add back to unassigned
        const newUnassignedBooking: UnassignedBooking = {
          id: movingGuest.booking_id,
          booking_number: movingGuest.booking_number,
          first_name: movingGuest.first_name,
          last_name: movingGuest.last_name,
          email: movingGuest.email,
          phone: movingGuest.phone,
          guests_count: movingGuest.guests_count,
          payment_status: movingGuest.payment_status,
          status: movingGuest.status,
          check_in_date: movingGuest.check_in_date,
          check_out_date: movingGuest.check_out_date,
          created_at: new Date().toISOString(),
        }
        newUnassigned = [...newUnassigned, newUnassignedBooking]
      }

      // Recalculate summary
      const totalOccupied = newRooms.reduce((sum, r) => sum + r.occupied, 0)

      return {
        ...prevData,
        rooms: newRooms,
        unassigned: newUnassigned,
        summary: {
          ...prevData.summary,
          totalOccupied,
          unassignedCount: newUnassigned.length,
        },
      }
    })
  }, [data])

  const rollbackOptimisticUpdate = useCallback(() => {
    if (previousData) {
      setData(previousData)
      setPreviousData(null)
    }
  }, [previousData])

  const assignGuest = useCallback(async (bookingId: string, roomId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to assign guest')
        return false
      }

      toast.success('Guest assigned successfully')
      setPreviousData(null) // Clear rollback data on success
      return true
    } catch {
      toast.error('Failed to assign guest')
      return false
    }
  }, [])

  const moveGuest = useCallback(async (
    bookingId: string,
    _fromRoomId: string | null,
    toRoomId: string | null
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: toRoomId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to move guest')
        return false
      }

      toast.success(toRoomId ? 'Guest moved successfully' : 'Guest removed from room')
      setPreviousData(null) // Clear rollback data on success
      return true
    } catch {
      toast.error('Failed to move guest')
      return false
    }
  }, [])

  const removeGuest = useCallback(async (bookingId: string, _roomId: string): Promise<boolean> => {
    return moveGuest(bookingId, _roomId, null)
  }, [moveGuest])

  return (
    <RoomManagementContext.Provider
      value={{
        data,
        loading,
        error,
        retreatId,
        fetchData,
        assignGuest,
        moveGuest,
        removeGuest,
        optimisticMoveGuest,
        rollbackOptimisticUpdate,
      }}
    >
      {children}
    </RoomManagementContext.Provider>
  )
}
