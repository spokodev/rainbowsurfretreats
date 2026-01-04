import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/newsletter/campaigns/[id] - Get single campaign with stats
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
    // Get campaign
    const { data: campaign, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get recipients with stats
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('id, email, language, status, sent_at, opened_at, clicked_at')
      .eq('campaign_id', id)
      .order('sent_at', { ascending: false })

    // Calculate stats
    const total = recipients?.length || 0
    const sent = recipients?.filter((r) => r.status !== 'pending').length || 0
    const delivered = recipients?.filter((r) =>
      ['delivered', 'opened', 'clicked'].includes(r.status)
    ).length || 0
    const opened = recipients?.filter((r) =>
      ['opened', 'clicked'].includes(r.status)
    ).length || 0
    const clicked = recipients?.filter((r) => r.status === 'clicked').length || 0
    const bounced = recipients?.filter((r) => r.status === 'bounced').length || 0
    const failed = recipients?.filter((r) => r.status === 'failed').length || 0

    return NextResponse.json({
      data: {
        ...campaign,
        recipients: recipients || [],
        stats: {
          total,
          sent,
          delivered,
          opened,
          clicked,
          bounced,
          failed,
          openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
          clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        },
      },
    })
  } catch (error) {
    console.error('Get campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/newsletter/campaigns/[id] - Update campaign
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
    // Check if campaign exists and is editable
    const { data: existing } = await supabase
      .from('newsletter_campaigns')
      .select('status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (existing.status === 'sent' || existing.status === 'sending') {
      return NextResponse.json({ error: 'Cannot edit a sent campaign' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      subject_en,
      subject_de,
      subject_es,
      subject_fr,
      subject_nl,
      body_en,
      body_de,
      body_es,
      body_fr,
      body_nl,
      target_languages,
      target_tags,
      target_status,
      scheduled_at,
      status,
    } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (subject_en !== undefined) updateData.subject_en = subject_en
    if (subject_de !== undefined) updateData.subject_de = subject_de
    if (subject_es !== undefined) updateData.subject_es = subject_es
    if (subject_fr !== undefined) updateData.subject_fr = subject_fr
    if (subject_nl !== undefined) updateData.subject_nl = subject_nl
    if (body_en !== undefined) updateData.body_en = body_en
    if (body_de !== undefined) updateData.body_de = body_de
    if (body_es !== undefined) updateData.body_es = body_es
    if (body_fr !== undefined) updateData.body_fr = body_fr
    if (body_nl !== undefined) updateData.body_nl = body_nl
    if (target_languages !== undefined) updateData.target_languages = target_languages
    if (target_tags !== undefined) updateData.target_tags = target_tags
    if (target_status !== undefined) updateData.target_status = target_status
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
    if (status !== undefined && ['draft', 'scheduled', 'cancelled'].includes(status)) {
      updateData.status = status
    }

    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Update campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/newsletter/campaigns/[id] - Delete campaign
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
    // Check if campaign is being sent
    const { data: existing } = await supabase
      .from('newsletter_campaigns')
      .select('status')
      .eq('id', id)
      .single()

    if (existing?.status === 'sending') {
      return NextResponse.json({ error: 'Cannot delete a campaign in progress' }, { status: 400 })
    }

    const { error } = await supabase
      .from('newsletter_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
