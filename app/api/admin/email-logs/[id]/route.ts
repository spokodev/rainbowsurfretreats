import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/admin/email-logs/[id]
 * Fetch a single email log entry with full HTML content
 */
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

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid email log ID' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('email_audit_log')
      .select(`
        id,
        email_type,
        recipient_email,
        recipient_type,
        subject,
        booking_id,
        payment_id,
        resend_email_id,
        status,
        error_message,
        delivered_at,
        opened_at,
        clicked_at,
        bounced_at,
        bounce_reason,
        complained_at,
        open_count,
        click_count,
        metadata,
        html_content,
        created_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Email log not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching email log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email log' },
      { status: 500 }
    )
  }
}
