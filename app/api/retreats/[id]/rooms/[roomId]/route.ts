import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RetreatRoom, RetreatRoomInsert, ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string; roomId: string }>
}

// PUT /api/retreats/[id]/rooms/[roomId] - Update a room
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, roomId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: Partial<Omit<RetreatRoomInsert, 'retreat_id'>> = await request.json()

    const { data, error } = await supabase
      .from('retreat_rooms')
      .update(body)
      .eq('id', roomId)
      .eq('retreat_id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Room not found' },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<RetreatRoom>>({
      data: data as RetreatRoom,
      message: 'Room updated successfully'
    })
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/retreats/[id]/rooms/[roomId] - Delete a room
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, roomId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('retreat_rooms')
      .delete()
      .eq('id', roomId)
      .eq('retreat_id', id)

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Room deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
