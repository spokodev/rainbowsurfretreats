import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse, WaitlistEntry } from '@/lib/types/database'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/waitlist/[id] - Get single waitlist entry details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .select(`
      *,
      retreat:retreats(id, destination, slug, start_date, end_date),
      room:retreat_rooms(id, name, price, deposit_price)
    `)
    .eq('id', id)
    .single()

  if (error || !entry) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Waitlist entry not found' }, { status: 404 })
  }

  return NextResponse.json<ApiResponse<WaitlistEntry>>({ data: entry })
}

// DELETE /api/admin/waitlist/[id] - Remove entry from waitlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  // Check if entry exists
  const { data: entry, error: fetchError } = await supabase
    .from('waitlist_entries')
    .select('id, email, first_name, last_name, retreat_id')
    .eq('id', id)
    .single()

  if (fetchError || !entry) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Waitlist entry not found' }, { status: 404 })
  }

  // Delete the entry
  const { error: deleteError } = await supabase
    .from('waitlist_entries')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Error deleting waitlist entry:', deleteError)
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to delete waitlist entry' }, { status: 500 })
  }

  return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
    data: { deleted: true },
    message: `Removed ${entry.first_name} ${entry.last_name} from waitlist`,
  })
}
