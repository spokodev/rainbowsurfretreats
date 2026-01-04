import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/newsletter/subscribers - List all subscribers with filters
export async function GET(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // pending, active, unsubscribed, bounced
    const language = searchParams.get('language')
    const source = searchParams.get('source')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('newsletter_subscribers')
      .select(`
        id,
        email,
        first_name,
        language,
        source,
        status,
        confirmed_at,
        unsubscribed_at,
        quiz_completed,
        tags,
        created_at,
        updated_at,
        last_booking_id,
        last_booking_date,
        last_booking:bookings(booking_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (language) {
      query = query.eq('language', language)
    }
    if (source) {
      query = query.eq('source', source)
    }
    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching subscribers:', error)
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    // Get summary stats using aggregate counts instead of fetching all rows
    // This is much more efficient than fetching all subscribers and filtering in JS
    const [
      { count: totalCount },
      { count: activeCount },
      { count: pendingCount },
      { count: unsubscribedCount },
      { count: bouncedCount },
    ] = await Promise.all([
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
      supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'bounced'),
    ])

    const summary = {
      total: totalCount || 0,
      active: activeCount || 0,
      pending: pendingCount || 0,
      unsubscribed: unsubscribedCount || 0,
      bounced: bouncedCount || 0,
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      summary,
    })
  } catch (error) {
    console.error('Subscribers API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/newsletter/subscribers - Add a subscriber manually
export async function POST(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { email, first_name, language, source, status } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Subscriber already exists' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        first_name: first_name || null,
        language: language || 'en',
        source: source || 'admin',
        status: status || 'active',
        confirmed_at: status === 'active' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subscriber:', error)
      return NextResponse.json({ error: 'Failed to create subscriber' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Create subscriber error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
