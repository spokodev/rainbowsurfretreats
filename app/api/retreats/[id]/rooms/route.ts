import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RetreatRoom, RetreatRoomInsert, ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/retreats/[id]/rooms - Get all rooms for a retreat
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('retreat_rooms')
      .select('*')
      .eq('retreat_id', id)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<RetreatRoom[]>>({ data: data as RetreatRoom[] })
  } catch (error) {
    console.error('Error fetching rooms:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/retreats/[id]/rooms - Create a new room
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: Omit<RetreatRoomInsert, 'retreat_id'> = await request.json()

    // Validate required fields
    if (!body.name || body.price === undefined || body.deposit_price === undefined) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: name, price, deposit_price' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('retreat_rooms')
      .insert({ ...body, retreat_id: id })
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<RetreatRoom>>(
      { data: data as RetreatRoom, message: 'Room created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
