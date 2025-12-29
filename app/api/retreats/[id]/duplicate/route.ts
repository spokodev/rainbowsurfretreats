import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, Retreat } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/retreats/[id]/duplicate - Duplicate a retreat with all its rooms
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params

    // Fetch the original retreat with rooms
    const { data: originalRetreat, error: fetchError } = await supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Retreat not found' },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    // Generate unique slug by appending -copy and checking for uniqueness
    let newSlug = `${originalRetreat.slug}-copy`
    let slugSuffix = 1

    // Check if slug already exists and increment suffix if needed
    while (true) {
      const { data: existingRetreat } = await supabase
        .from('retreats')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle()

      if (!existingRetreat) break

      slugSuffix++
      newSlug = `${originalRetreat.slug}-copy-${slugSuffix}`
    }

    // Extract rooms before creating the retreat
    const originalRooms = originalRetreat.rooms || []

    // Remove fields that shouldn't be copied
    const {
      id: _id,
      rooms: _rooms,
      created_at: _created_at,
      updated_at: _updated_at,
      ...retreatFields
    } = originalRetreat

    // Create duplicated retreat
    const { data: newRetreat, error: insertError } = await supabase
      .from('retreats')
      .insert({
        ...retreatFields,
        destination: `${originalRetreat.destination} (Copy)`,
        slug: newSlug,
        is_published: false, // Always create as unpublished draft
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error duplicating retreat:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to duplicate retreat' },
        { status: 500 }
      )
    }

    // Duplicate all rooms for the new retreat
    if (originalRooms.length > 0) {
      const roomsToInsert = originalRooms.map((room: {
        id: string;
        retreat_id: string;
        created_at: string;
        updated_at: string;
        name: string;
        price: number;
        deposit_price: number;
        capacity: number;
        available: number;
        is_sold_out: boolean;
        description: string;
        sort_order: number;
      }) => {
        const {
          id: _roomId,
          retreat_id: _retreatId,
          created_at: _roomCreatedAt,
          updated_at: _roomUpdatedAt,
          ...roomFields
        } = room
        return {
          ...roomFields,
          retreat_id: newRetreat.id,
        }
      })

      const { error: roomsError } = await supabase
        .from('retreat_rooms')
        .insert(roomsToInsert)

      if (roomsError) {
        console.error('Error duplicating rooms:', roomsError)
        // Don't fail the whole operation, just log the error
        // The retreat was created successfully
      }
    }

    // Fetch the complete retreat with rooms
    const { data: completeRetreat, error: fetchCompleteError } = await supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .eq('id', newRetreat.id)
      .single()

    if (fetchCompleteError) {
      // Return the retreat without rooms if there's an error
      return NextResponse.json<ApiResponse<Retreat>>(
        { data: newRetreat as Retreat, message: 'Retreat duplicated successfully (rooms may need manual check)' },
        { status: 201 }
      )
    }

    return NextResponse.json<ApiResponse<Retreat>>(
      { data: completeRetreat as Retreat, message: 'Retreat duplicated successfully with all rooms' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Duplicate retreat error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
