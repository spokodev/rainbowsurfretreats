import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/admin/email-logs
 * Fetch email audit logs with filtering and pagination
 *
 * Query params:
 * - type: Filter by email type (payment_failed, booking_confirmation, etc.)
 * - status: Filter by status (sent, delivered, failed, bounced)
 * - recipientType: Filter by recipient type (customer, admin)
 * - search: Search by recipient email
 * - dateFrom: Filter logs from this date
 * - dateTo: Filter logs until this date
 * - bookingId: Filter by booking ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */
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

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    // Filters
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const recipientType = searchParams.get('recipientType')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const bookingId = searchParams.get('bookingId')

    // Build query
    let query = supabase
      .from('email_audit_log')
      .select(`
        *,
        booking:bookings(id, booking_number, first_name, last_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (type) {
      query = query.eq('email_type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (recipientType) {
      query = query.eq('recipient_type', recipientType)
    }

    if (search) {
      query = query.ilike('recipient_email', `%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    }

    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
    }

    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching email logs:', error)
      return NextResponse.json({ error: 'Failed to fetch email logs' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Email logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/email-logs
 * Get statistics about email logs using efficient SQL aggregation
 */
export async function POST(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { action } = body

  if (action !== 'stats') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    // Use efficient count queries with head: true to avoid fetching data
    const statuses = ['sent', 'delivered', 'failed', 'bounced']
    const statusPromises = statuses.map(async (status) => {
      const { count } = await supabase
        .from('email_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
      return { status, count: count || 0 }
    })

    // Get counts for common email types
    const emailTypes = [
      'booking_confirmation',
      'payment_confirmation',
      'payment_reminder',
      'payment_failed',
      'payment_failed_simple',
      'payment_success',
      'booking_cancellation',
      'admin_payment_failed',
      'admin_new_booking',
      'waitlist_confirmation',
      'waitlist_spot_available',
    ]
    const typePromises = emailTypes.map(async (type) => {
      const { count } = await supabase
        .from('email_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('email_type', type)
      return { type, count: count || 0 }
    })

    // Get total count
    const { count: total } = await supabase
      .from('email_audit_log')
      .select('*', { count: 'exact', head: true })

    // Get opened count
    const { count: opened } = await supabase
      .from('email_audit_log')
      .select('*', { count: 'exact', head: true })
      .not('opened_at', 'is', null)

    // Execute all counts in parallel
    const [statusResults, typeResults] = await Promise.all([
      Promise.all(statusPromises),
      Promise.all(typePromises),
    ])

    // Build response
    const byStatus: Record<string, number> = {}
    statusResults.forEach(({ status, count }) => {
      if (count > 0) byStatus[status] = count
    })

    const byType: Record<string, number> = {}
    typeResults.forEach(({ type, count }) => {
      if (count > 0) byType[type] = count
    })

    const stats = {
      byStatus,
      byType,
      total: total || 0,
      opened: opened || 0,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('Email stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
