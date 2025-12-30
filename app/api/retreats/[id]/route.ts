import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import { handleDatabaseError } from '@/lib/utils/api-errors'
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
      const errorResponse = handleDatabaseError(error, 'GET /api/retreats/[id]')
      if (errorResponse) return errorResponse
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

// PUT /api/retreats/[id] - Update a retreat (admin only)
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
    const { id } = await params
    const supabase = await createClient()

    const body: Partial<RetreatInsert> = await request.json()

    // Remove 'rooms' from body as it's a relation, not a column
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { rooms, ...updateData } = body as Partial<RetreatInsert> & { rooms?: unknown }

    // Validate dates if provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date)
      const endDate = new Date(updateData.end_date)
      if (endDate <= startDate) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }
    }

    // Validate early bird price
    if (updateData.early_bird_price && updateData.price && updateData.early_bird_price >= updateData.price) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Early bird price must be less than regular price' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('retreats')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const errorResponse = handleDatabaseError(error, 'PUT /api/retreats/[id]', {
        '23505': 'A retreat with this slug already exists',
      })
      if (errorResponse) return errorResponse
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

// DELETE /api/retreats/[id] - Soft delete a retreat (admin only)
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
    const { id } = await params
    const supabase = await createClient()

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
      const errorResponse = handleDatabaseError(error, 'DELETE /api/retreats/[id]')
      if (errorResponse) return errorResponse
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
