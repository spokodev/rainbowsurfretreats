import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch booking with related data
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        first_name,
        last_name,
        email,
        guests_count,
        total_amount,
        deposit_amount,
        balance_due,
        status,
        payment_status,
        retreat:retreats(
          destination,
          start_date,
          end_date
        ),
        room:retreat_rooms(
          name
        ),
        payment_schedules(
          payment_number,
          amount,
          due_date,
          status
        )
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Transform the response
    const transformedBooking = {
      ...booking,
      retreat: Array.isArray(booking.retreat) ? booking.retreat[0] : booking.retreat,
      room: Array.isArray(booking.room) ? booking.room[0] : booking.room,
      payment_schedules: (booking.payment_schedules || []).sort(
        (a: { payment_number: number }, b: { payment_number: number }) => a.payment_number - b.payment_number
      ),
    }

    return NextResponse.json(transformedBooking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
