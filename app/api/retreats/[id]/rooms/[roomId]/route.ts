import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { RetreatRoom, RetreatRoomInsert, ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string; roomId: string }>
}

// PUT /api/retreats/[id]/rooms/[roomId] - Update a room (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { id, roomId } = await params
    const supabase = await createClient()

    const body: Partial<Omit<RetreatRoomInsert, 'retreat_id'>> = await request.json()

    // Validate price values if provided
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price <= 0) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Price must be a positive number' },
          { status: 400 }
        )
      }
    }
    if (body.deposit_price !== undefined) {
      if (typeof body.deposit_price !== 'number' || body.deposit_price < 0) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Deposit price must be a non-negative number' },
          { status: 400 }
        )
      }
    }

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
      console.error('Error updating room:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to update room' },
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

// DELETE /api/retreats/[id]/rooms/[roomId] - Delete a room (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { id, roomId } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('retreat_rooms')
      .delete()
      .eq('id', roomId)
      .eq('retreat_id', id)

    if (error) {
      console.error('Error deleting room:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to delete room' },
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
