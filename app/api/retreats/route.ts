import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
        if (error.code === 'PGRST116') {
          return NextResponse.json<ApiResponse<null>>(
            { error: 'Retreat not found' },
            { status: 404 }
          )
        }
        return NextResponse.json<ApiResponse<null>>(
          { error: error.message },
          { status: 500 }
        )
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
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
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

// POST /api/retreats - Create a new retreat
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: RetreatInsert = await request.json()

    // Validate required fields
    if (!body.destination || !body.location || !body.start_date || !body.end_date) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: destination, location, start_date, end_date' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('retreats')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
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
