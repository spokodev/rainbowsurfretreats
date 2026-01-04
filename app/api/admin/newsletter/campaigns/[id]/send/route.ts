import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils/html-escape'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'
const FROM_EMAIL = process.env.FROM_EMAIL || 'Rainbow Surf Retreats <noreply@rainbowsurfretreats.com>'
const BATCH_SIZE = 10 // Send in batches to avoid rate limits
const BATCH_DELAY = 1000 // 1 second between batches

// POST /api/admin/newsletter/campaigns/[id]/send - Send campaign to all subscribers
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
    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status === 'sent') {
      return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
    }

    if (campaign.status === 'sending') {
      return NextResponse.json({ error: 'Campaign is already being sent' }, { status: 400 })
    }

    // Atomically update campaign status to 'sending' only if still 'draft' or 'scheduled'
    // This prevents race conditions where two concurrent requests both try to send
    const { data: updateResult, error: updateError } = await supabase
      .from('newsletter_campaigns')
      .update({ status: 'sending' })
      .eq('id', id)
      .in('status', ['draft', 'scheduled'])
      .select('id')

    if (updateError) {
      console.error('Error updating campaign status:', updateError)
      return NextResponse.json({ error: 'Failed to start campaign' }, { status: 500 })
    }

    // If no rows were updated, another request already started sending
    if (!updateResult || updateResult.length === 0) {
      // Re-fetch to check current status
      const { data: currentCampaign } = await supabase
        .from('newsletter_campaigns')
        .select('status')
        .eq('id', id)
        .single()

      if (currentCampaign?.status === 'sending') {
        return NextResponse.json({ error: 'Campaign is already being sent' }, { status: 400 })
      }
      if (currentCampaign?.status === 'sent') {
        return NextResponse.json({ error: 'Campaign already sent' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Campaign cannot be sent in its current state' }, { status: 400 })
    }

    // Get subscribers based on targeting (include unsubscribe_token for secure links)
    let subscribersQuery = supabase
      .from('newsletter_subscribers')
      .select('id, email, first_name, language, unsubscribe_token')

    // Filter by status
    if (campaign.target_status === 'active') {
      subscribersQuery = subscribersQuery.eq('status', 'active')
    } else {
      subscribersQuery = subscribersQuery.in('status', ['active', 'pending'])
    }

    // Filter by languages if specified
    if (campaign.target_languages && campaign.target_languages.length > 0) {
      subscribersQuery = subscribersQuery.in('language', campaign.target_languages)
    }

    const { data: subscribers, error: subsError } = await subscribersQuery

    if (subsError) {
      console.error('Error fetching subscribers:', subsError)
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', id)
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      await supabase
        .from('newsletter_campaigns')
        .update({ status: 'draft' })
        .eq('id', id)
      return NextResponse.json({ error: 'No subscribers match the targeting criteria' }, { status: 400 })
    }

    // Create recipient records (use upsert for idempotency - allows retry on failure)
    const recipientRecords = subscribers.map((sub) => ({
      campaign_id: id,
      subscriber_id: sub.id,
      email: sub.email,
      language: sub.language || 'en',
      status: 'pending',
    }))

    // Upsert to handle retries - only insert if not already exists
    await supabase
      .from('campaign_recipients')
      .upsert(recipientRecords, {
        onConflict: 'campaign_id,email',
        ignoreDuplicates: true, // Don't update existing records
      })

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Send emails in batches
    let sentCount = 0
    let errorCount = 0

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (subscriber) => {
          try {
            const language = subscriber.language || 'en'
            const subject = getSubjectForLanguage(campaign, language)
            const body = getBodyForLanguage(campaign, language)

            // Replace template variables (escape user input to prevent XSS)
            const htmlContent = renderTemplate(body, {
              firstName: escapeHtml(subscriber.first_name || 'Friend'),
              email: escapeHtml(subscriber.email),
              unsubscribeLink: `${SITE_URL}/api/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`,
              currentYear: new Date().getFullYear().toString(),
            })

            const { data: emailData, error: emailError } = await resend.emails.send({
              from: FROM_EMAIL,
              to: subscriber.email,
              subject,
              html: htmlContent,
            })

            if (emailError) {
              console.error(`Failed to send to ${subscriber.email}:`, emailError)
              await supabase
                .from('campaign_recipients')
                .update({
                  status: 'failed',
                  error_message: emailError.message,
                })
                .eq('campaign_id', id)
                .eq('email', subscriber.email)
              errorCount++
            } else {
              await supabase
                .from('campaign_recipients')
                .update({
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                  resend_message_id: emailData?.id,
                })
                .eq('campaign_id', id)
                .eq('email', subscriber.email)
              sentCount++
            }
          } catch (err) {
            console.error(`Error sending to ${subscriber.email}:`, err)
            errorCount++
          }
        })
      )

      // Delay between batches
      if (i + BATCH_SIZE < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
      }
    }

    // Update campaign status to sent
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      stats: {
        total: subscribers.length,
        sent: sentCount,
        failed: errorCount,
      },
    })
  } catch (error) {
    console.error('Send campaign error:', error)

    // Reset status on error
    await supabase
      .from('newsletter_campaigns')
      .update({ status: 'draft' })
      .eq('id', id)

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
