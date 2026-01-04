import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import { handleDatabaseError } from '@/lib/utils/api-errors'
import type { Retreat, RetreatInsert, ApiResponse } from '@/lib/types/database'

// GET /api/retreats - List all retreats or get single by slug
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const slug = searchParams.get('slug')
    const published = searchParams.get('published')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // If slug is provided, return single retreat
    if (slug) {
      const { data, error } = await supabase
        .from('retreats')
        .select(`
          *,
          rooms:retreat_rooms(*)
        `)
        .eq('slug', slug)
        .is('deleted_at', null)
        .single()

      if (error) {
        const errorResponse = handleDatabaseError(error, 'GET /api/retreats (slug)')
        if (errorResponse) return errorResponse
      }

      return NextResponse.json<ApiResponse<Retreat>>({ data: data as Retreat })
    }

    // Otherwise, list all retreats
    let query = supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .is('deleted_at', null)
      .order('start_date', { ascending: true })

    // Filter by published status
    if (published === 'true') {
      query = query.eq('is_published', true)
    } else if (published === 'false') {
      query = query.eq('is_published', false)
    }

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit || '10') - 1))
    }

    const { data, error } = await query

    if (error) {
      const errorResponse = handleDatabaseError(error, 'GET /api/retreats (list)')
      if (errorResponse) return errorResponse
    }

    return NextResponse.json<ApiResponse<Retreat[]>>({ data: data as Retreat[] })
  } catch (error) {
    console.error('Error fetching retreats:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/retreats - Create a new retreat (admin only)
export async function POST(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  try {
    const supabase = await createClient()
    const body = await request.json()

    // Remove 'rooms' from body as it's a relation, not a column
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rooms, ...retreatData } = body as RetreatInsert & { rooms?: unknown }

    // Validate required fields
    if (!retreatData.destination || !retreatData.location || !retreatData.start_date || !retreatData.end_date) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: destination, location, start_date, end_date' },
        { status: 400 }
      )
    }

    // Auto-generate slug if not provided
    if (!retreatData.slug) {
      const baseSlug = retreatData.destination
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      // Add start date for uniqueness (e.g., "bali-2026-04")
      const dateStr = retreatData.start_date.slice(0, 7) // YYYY-MM
      retreatData.slug = `${baseSlug}-${dateStr}`
    }

    // Validate dates
    const startDate = new Date(retreatData.start_date)
    const endDate = new Date(retreatData.end_date)

    if (endDate <= startDate) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Validate early bird price (if provided at retreat level)
    if (retreatData.early_bird_price && retreatData.price && retreatData.early_bird_price >= retreatData.price) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Early bird price must be less than regular price' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('retreats')
      .insert(retreatData)
      .select()
      .single()

    if (error) {
      const errorResponse = handleDatabaseError(error, 'POST /api/retreats', {
        '23505': 'A retreat with this slug already exists',
      })
      if (errorResponse) return errorResponse
    }

    return NextResponse.json<ApiResponse<Retreat>>(
      { data: data as Retreat, message: 'Retreat created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating retreat:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
