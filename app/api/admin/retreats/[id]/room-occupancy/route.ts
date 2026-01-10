import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type {
  ApiResponse,
  RoomOccupancyResponse,
  RoomWithGuests,
  RoomGuest,
  UnassignedBooking,
  WaitlistEntry
} from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/retreats/[id]/room-occupancy
// Returns room occupancy data for a retreat
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { isAdmin } = await checkAdminAuth()
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id: retreatId } = await params
    const supabase = await createClient()

    // Get retreat info
    const { data: retreat, error: retreatError } = await supabase
      .from('retreats')
      .select('id, destination, start_date, end_date, slug')
      .eq('id', retreatId)
      .is('deleted_at', null)
      .single()

    if (retreatError) {
      if (retreatError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Retreat not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching retreat:', retreatError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch retreat' },
        { status: 500 }
      )
    }

    // Get all rooms for this retreat
    const { data: rooms, error: roomsError } = await supabase
      .from('retreat_rooms')
      .select('*')
      .eq('retreat_id', retreatId)
      .order('sort_order', { ascending: true })

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch rooms' },
        { status: 500 }
      )
    }

    // Get all active bookings for this retreat (not cancelled)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        room_id,
        first_name,
        last_name,
        email,
        phone,
        guests_count,
        payment_status,
        status,
        check_in_date,
        check_out_date,
        created_at
      `)
      .eq('retreat_id', retreatId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Get waitlist entries for this retreat
    const { data: waitlist, error: waitlistError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        room:retreat_rooms(id, name)
      `)
      .eq('retreat_id', retreatId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })

    if (waitlistError) {
      console.error('Error fetching waitlist:', waitlistError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch waitlist' },
        { status: 500 }
      )
    }

    // Organize data
    const roomsWithGuests: RoomWithGuests[] = (rooms || []).map(room => {
      const roomBookings = (bookings || []).filter(b => b.room_id === room.id)
      const guests: RoomGuest[] = roomBookings.map(b => ({
        booking_id: b.id,
        booking_number: b.booking_number,
        first_name: b.first_name,
        last_name: b.last_name,
        email: b.email,
        phone: b.phone,
        guests_count: b.guests_count,
        payment_status: b.payment_status,
        status: b.status,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
      }))

      const occupied = guests.reduce((sum, g) => sum + g.guests_count, 0)

      return {
        ...room,
        guests,
        occupied,
      }
    })

    // Get unassigned bookings (room_id is null)
    const unassigned: UnassignedBooking[] = (bookings || [])
      .filter(b => !b.room_id)
      .map(b => ({
        id: b.id,
        booking_number: b.booking_number,
        first_name: b.first_name,
        last_name: b.last_name,
        email: b.email,
        phone: b.phone,
        guests_count: b.guests_count,
        payment_status: b.payment_status,
        status: b.status,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        created_at: b.created_at,
      }))

    // Transform waitlist (handle joined room data)
    const waitlistEntries: WaitlistEntry[] = (waitlist || []).map(w => ({
      ...w,
      room: Array.isArray(w.room) ? w.room[0] : w.room,
    }))

    // Calculate summary
    const totalCapacity = roomsWithGuests.reduce((sum, r) => sum + r.capacity, 0)
    const totalOccupied = roomsWithGuests.reduce((sum, r) => sum + r.occupied, 0)

    const response: RoomOccupancyResponse = {
      retreat: {
        id: retreat.id,
        destination: retreat.destination,
        start_date: retreat.start_date,
        end_date: retreat.end_date,
        slug: retreat.slug,
      },
      rooms: roomsWithGuests,
      unassigned,
      waitlist: waitlistEntries,
      summary: {
        totalCapacity,
        totalOccupied,
        unassignedCount: unassigned.length,
        waitlistCount: waitlistEntries.length,
      },
    }

    return NextResponse.json<ApiResponse<RoomOccupancyResponse>>({ data: response })
  } catch (error) {
    console.error('Error in room occupancy API:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
