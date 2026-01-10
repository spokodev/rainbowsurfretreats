import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface RoomAssignmentBody {
  room_id: string | null
}

// PUT /api/admin/bookings/[id]/room
// Assign or move a booking to a different room
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { isAdmin } = await checkAdminAuth()
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id: bookingId } = await params
    const body: RoomAssignmentBody = await request.json()
    const { room_id: newRoomId } = body

    const supabase = await createClient()

    // Get current booking with room info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, room_id, retreat_id, guests_count, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Cannot assign room to cancelled booking' },
        { status: 400 }
      )
    }

    const oldRoomId = booking.room_id

    // If assigning to same room, no changes needed
    if (oldRoomId === newRoomId) {
      return NextResponse.json<ApiResponse<null>>({
        message: 'Booking is already in this room'
      })
    }

    // If assigning to a new room, validate it
    if (newRoomId) {
      const { data: newRoom, error: newRoomError } = await supabase
        .from('retreat_rooms')
        .select('id, retreat_id, available, capacity')
        .eq('id', newRoomId)
        .single()

      if (newRoomError || !newRoom) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Target room not found' },
          { status: 404 }
        )
      }

      // Verify room belongs to same retreat
      if (newRoom.retreat_id !== booking.retreat_id) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Room does not belong to this retreat' },
          { status: 400 }
        )
      }

      // Quick sanity check (non-authoritative, atomic check happens below)
      const effectiveAvailable = oldRoomId
        ? newRoom.available + booking.guests_count
        : newRoom.available
      if (effectiveAvailable < booking.guests_count) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Room does not have enough capacity' },
          { status: 400 }
        )
      }
    }

    // ATOMIC OPERATION ORDER:
    // 1. First try to decrement new room (can fail if no space - uses atomic RPC)
    // 2. Only if successful, update booking
    // 3. Then increment old room (always succeeds since we're adding back)
    // This prevents race conditions and data inconsistency

    // Step 1: Atomically try to decrement new room availability
    if (newRoomId) {
      const { data: decrementSuccess, error: decrementError } = await supabase.rpc(
        'try_decrement_room_availability',
        {
          room_uuid: newRoomId,
          decrement_count: booking.guests_count
        }
      )

      if (decrementError) {
        console.error('Error decrementing new room availability:', decrementError)
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Failed to reserve room - please try again' },
          { status: 500 }
        )
      }

      if (!decrementSuccess) {
        // Another concurrent request took the spots
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Room no longer has enough capacity - it may have been booked by someone else' },
          { status: 409 } // Conflict
        )
      }
    }

    // Step 2: Update the booking's room assignment
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ room_id: newRoomId, updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking room:', updateError)
      // Rollback: increment back the new room we just decremented
      if (newRoomId) {
        await supabase.rpc('increment_room_availability', {
          room_uuid: newRoomId,
          increment_count: booking.guests_count
        })
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to update booking' },
        { status: 500 }
      )
    }

    // Step 3: Increment old room availability (guest is leaving)
    let availabilityWarning = false
    if (oldRoomId) {
      const { error: oldRoomError } = await supabase.rpc('increment_room_availability', {
        room_uuid: oldRoomId,
        increment_count: booking.guests_count
      })

      if (oldRoomError) {
        console.error('Error incrementing old room availability:', oldRoomError)
        availabilityWarning = true
      }
    }

    // Build response message
    let message = 'Room assignment updated successfully'
    if (!newRoomId && oldRoomId) {
      message = 'Guest removed from room'
    } else if (newRoomId && !oldRoomId) {
      message = 'Guest assigned to room'
    } else if (newRoomId && oldRoomId) {
      message = 'Guest moved to new room'
    }

    // Add warning if availability update had issues
    if (availabilityWarning) {
      message += ' (Note: Room availability counts may need manual refresh)'
    }

    return NextResponse.json<ApiResponse<null>>({ message })
  } catch (error) {
    console.error('Error in room assignment API:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
