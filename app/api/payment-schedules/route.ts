import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/payment-schedules - Get all payment schedules (admin)
export async function GET() {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select(`
        *,
        booking:bookings(
          id,
          booking_number,
          first_name,
          last_name,
          email,
          retreat:retreats(
            destination
          )
        )
      `)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching payment schedules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch payment schedules' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Payment schedules API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
