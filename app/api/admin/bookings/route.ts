import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse } from '@/lib/types/database'

interface BookingListItem {
  id: string
  booking_number: string
  first_name: string
  last_name: string
  email: string
  guests_count: number
  total_amount: number
  deposit_amount: number
  balance_due: number
  status: string
  payment_status: string
  check_in_date: string
  check_out_date: string
  created_at: string
  language?: string
  retreat: {
    id: string
    destination: string
  } | null
  room: {
    name: string
  } | null
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  stats: {
    confirmed: number
    pending: number
    cancelled: number
    total: number
  }
}

// GET /api/admin/bookings - Get paginated bookings with filters
export async function GET(request: NextRequest) {
  const { isAdmin } = await checkAdminAuth()
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 25))
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const paymentStatus = searchParams.get('paymentStatus')
  const retreatId = searchParams.get('retreatId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const sortBy = searchParams.get('sort') || 'created_at'
  const sortOrder = searchParams.get('order') === 'asc' ? true : false

  const supabase = await createClient()

  try {
    // Build base query for data
    let query = supabase
      .from('bookings')
      .select(
        `
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
        check_in_date,
        check_out_date,
        created_at,
        language,
        retreat:retreats(id, destination),
        room:retreat_rooms(name)
      `,
        { count: 'exact' }
      )

    // Apply filters
    if (search) {
      query = query.or(
        `booking_number.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus)
    }

    if (retreatId && retreatId !== 'all') {
      query = query.eq('retreat_id', retreatId)
    }

    if (dateFrom) {
      query = query.gte('check_in_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('check_in_date', dateTo)
    }

    // Apply sorting
    const validSortColumns = [
      'created_at',
      'check_in_date',
      'total_amount',
      'first_name',
      'booking_number',
    ]
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortColumn, { ascending: sortOrder })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: bookings, error, count } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Transform Supabase response (joined tables come as arrays)
    const transformedBookings = (bookings || []).map((b) => ({
      ...b,
      retreat: Array.isArray(b.retreat) ? b.retreat[0] : b.retreat,
      room: Array.isArray(b.room) ? b.room[0] : b.room,
    })) as BookingListItem[]

    // Get stats (total counts by status) - separate query without filters for accurate totals
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('status')

    const stats = {
      confirmed: (allBookings || []).filter((b) => b.status === 'confirmed').length,
      pending: (allBookings || []).filter((b) => b.status === 'pending').length,
      cancelled: (allBookings || []).filter((b) => b.status === 'cancelled').length,
      total: allBookings?.length || 0,
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    const response: PaginatedResponse<BookingListItem> = {
      data: transformedBookings,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      stats,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in bookings API:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
