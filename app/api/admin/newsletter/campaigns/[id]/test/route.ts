import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils/html-escape'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'
const FROM_EMAIL = process.env.FROM_EMAIL || 'Rainbow Surf Retreats <noreply@rainbowsurfretreats.com>'

// POST /api/admin/newsletter/campaigns/[id]/test - Send a test email
export async function POST(
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
    const { email, language = 'en' } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Get subject and body for the requested language
    const subject = getSubjectForLanguage(campaign, language)
    const emailBody = getBodyForLanguage(campaign, language)

    // Generate a test token for the unsubscribe link
    const testToken = crypto.randomBytes(32).toString('hex')

    // Render template with test data (escape user input)
    const htmlContent = renderTemplate(emailBody, {
      firstName: escapeHtml('Test User'),
      email: escapeHtml(email),
      unsubscribeLink: `${SITE_URL}/api/newsletter/unsubscribe?token=${testToken}`,
      currentYear: new Date().getFullYear().toString(),
    })

    // Send test email
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[TEST] ${subject}`,
      html: htmlContent,
    })

    if (emailError) {
      console.error('Failed to send test email:', emailError)
      return NextResponse.json({ error: 'Failed to send test email', details: emailError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: emailData?.id,
      sentTo: email,
      language,
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getSubjectForLanguage(campaign: Record<string, unknown>, language: string): string {
  const key = `subject_${language}` as keyof typeof campaign
  return (campaign[key] as string) || (campaign.subject_en as string)
}

function getBodyForLanguage(campaign: Record<string, unknown>, language: string): string {
  const key = `body_${language}` as keyof typeof campaign
  return (campaign[key] as string) || (campaign.body_en as string)
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}
