import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/newsletter/subscribers/[id] - Get single subscriber
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select(`
        *,
        last_booking:bookings(booking_number, retreat:retreats(destination))
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Get subscriber error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/newsletter/subscribers/[id] - Update subscriber
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { first_name, language, status, tags } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (first_name !== undefined) updateData.first_name = first_name
    if (language) updateData.language = language
    if (tags !== undefined) updateData.tags = tags

    // Handle status changes
    if (status) {
      updateData.status = status
      if (status === 'active' && !body.confirmed_at) {
        updateData.confirmed_at = new Date().toISOString()
      }
      if (status === 'unsubscribed') {
        updateData.unsubscribed_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating subscriber:', error)
      return NextResponse.json({ error: 'Failed to update subscriber' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Update subscriber error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/newsletter/subscribers/[id] - Delete subscriber
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting subscriber:', error)
      return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete subscriber error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
