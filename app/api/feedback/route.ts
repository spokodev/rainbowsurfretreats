import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/feedback - Submit retreat feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      bookingId,
      ratings,
      npsScore,
      highlights,
      improvements,
      testimonial,
      allowTestimonial,
    } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get booking info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, email, retreat_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('retreat_feedback')
      .select('id')
      .eq('booking_id', bookingId)
      .single()

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 400 })
    }

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('retreat_feedback')
      .insert({
        booking_id: bookingId,
        email: booking.email,
        retreat_id: booking.retreat_id,
        overall_rating: ratings?.overall || null,
        surfing_rating: ratings?.surfing || null,
        accommodation_rating: ratings?.accommodation || null,
        food_rating: ratings?.food || null,
        staff_rating: ratings?.staff || null,
        recommend_score: npsScore,
        highlights,
        improvements,
        testimonial,
        allow_testimonial_use: allowTestimonial || false,
      })

    if (feedbackError) {
      console.error('Feedback insert error:', feedbackError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/feedback - Get feedback for admin
export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('retreat_feedback')
      .select(`
        *,
        booking:bookings(first_name, last_name),
        retreat:retreats(destination)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Feedback fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
