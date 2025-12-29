import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Retreat, RetreatInsert, ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/retreats/[id] - Get a single retreat
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .eq('id', id)
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
  } catch (error) {
    console.error('Error fetching retreat:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/retreats/[id] - Update a retreat
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body: Partial<RetreatInsert> = await request.json()

    // Remove 'rooms' from body as it's a relation, not a column
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rooms, ...updateData } = body as Partial<RetreatInsert> & { rooms?: unknown }

    const { data, error } = await supabase
      .from('retreats')
      .update(updateData)
      .eq('id', id)
      .select()
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

    return NextResponse.json<ApiResponse<Retreat>>({
      data: data as Retreat,
      message: 'Retreat updated successfully'
    })
  } catch (error) {
    console.error('Error updating retreat:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/retreats/[id] - Soft delete a retreat (move to trash)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Soft delete: set deleted_at timestamp instead of actual deletion
    const { error } = await supabase
      .from('retreats')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        is_published: false, // Unpublish when moving to trash
      })
      .eq('id', id)
      .is('deleted_at', null) // Only delete if not already deleted

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Retreat moved to trash. It will be permanently deleted after 30 days.'
    })
  } catch (error) {
    console.error('Error deleting retreat:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
