import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse, WaitlistEntry, WaitlistStats } from '@/lib/types/database'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface WaitlistListResponse {
  entries: WaitlistEntry[]
  stats: WaitlistStats
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// GET /api/admin/waitlist - List all waitlist entries with filters
export async function GET(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const retreatId = searchParams.get('retreatId')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const supabase = getSupabase()

  try {
    // Build query
    let query = supabase
      .from('waitlist_entries')
      .select(`
        *,
        retreat:retreats(id, destination, slug, start_date, end_date),
        room:retreat_rooms(id, name, price)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (retreatId) {
      query = query.eq('retreat_id', retreatId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: entries, error, count } = await query

    if (error) {
      console.error('Error fetching waitlist:', error)
      return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch waitlist' }, { status: 500 })
    }

    // Get stats
    let statsQuery = supabase
      .from('waitlist_entries')
      .select('status')

    if (retreatId) {
      statsQuery = statsQuery.eq('retreat_id', retreatId)
    }

    const { data: statusData } = await statsQuery

    const stats: WaitlistStats = {
      waiting: 0,
      notified: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
      booked: 0,
      total: 0,
    }

    if (statusData) {
      statusData.forEach(entry => {
        const s = entry.status as keyof WaitlistStats
        if (s in stats && s !== 'total') {
          stats[s]++
        }
        stats.total++
      })
    }

    const response: WaitlistListResponse = {
      entries: entries || [],
      stats,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    }

    return NextResponse.json<ApiResponse<WaitlistListResponse>>({ data: response })
  } catch (error) {
    console.error('Waitlist list error:', error)
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}
