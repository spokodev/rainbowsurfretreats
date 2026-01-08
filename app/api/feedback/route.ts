import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

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

// GET /api/feedback - Get feedback for admin (admin only)
export async function GET(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    // Filters
    const retreatId = searchParams.get('retreatId')
    const minRating = searchParams.get('minRating')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validate sortBy field
    const allowedSortFields = ['created_at', 'overall_rating', 'recommend_score']
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at'

    const supabase = getSupabase()

    // Build query
    let query = supabase
      .from('retreat_feedback')
      .select(`
        *,
        booking:bookings(first_name, last_name, email),
        retreat:retreats(destination)
      `, { count: 'exact' })

    // Apply filters
    if (retreatId && retreatId !== 'all') {
      query = query.eq('retreat_id', retreatId)
    }

    if (minRating) {
      const rating = parseInt(minRating)
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        query = query.gte('overall_rating', rating)
      }
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      // Add time to include the entire day
      query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    }

    // Apply sorting and pagination
    query = query
      .order(validSortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Feedback fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    // Apply search filter in-memory (for name/email search across joined tables)
    let filteredData = data || []
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim()
      filteredData = filteredData.filter(entry => {
        const firstName = (entry.booking?.first_name || '').toLowerCase()
        const lastName = (entry.booking?.last_name || '').toLowerCase()
        const email = (entry.booking?.email || entry.email || '').toLowerCase()
        const destination = (entry.retreat?.destination || '').toLowerCase()

        return firstName.includes(searchLower) ||
               lastName.includes(searchLower) ||
               email.includes(searchLower) ||
               destination.includes(searchLower) ||
               `${firstName} ${lastName}`.includes(searchLower)
      })
    }

    const total = count || 0
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: filteredData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
