import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Lazy initialization of Supabase client
let supabaseInstance: SupabaseClient | null = null
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseInstance
}

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'

interface ResendWebhookEvent {
  type: ResendEventType
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    // Additional fields for specific events
    click?: {
      link: string
      timestamp: string
    }
    bounce?: {
      message: string
    }
  }
}

// Verify Resend webhook signature
// SECURITY: No fallback to simple HMAC - timestamp validation is required to prevent replay attacks
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.error('[Resend Webhook] Missing signature or secret')
    return false
  }

  try {
    // Resend uses svix for webhooks
    // The signature format is: t=timestamp,v1=signature
    const parts = signature.split(',')
    const timestampPart = parts.find((p) => p.startsWith('t='))
    const signaturePart = parts.find((p) => p.startsWith('v1='))

    if (!timestampPart || !signaturePart) {
      // SECURITY: Reject requests without proper svix signature format
      // No fallback to prevent replay attacks
      console.error('[Resend Webhook] Invalid signature format - missing timestamp or signature part')
      return false
    }

    const timestamp = timestampPart.replace('t=', '')
    const providedSignature = signaturePart.replace('v1=', '')

    // SECURITY: Check timestamp is not too old (5 minutes) to prevent replay attacks
    const timestampMs = parseInt(timestamp) * 1000
    if (isNaN(timestampMs)) {
      console.error('[Resend Webhook] Invalid timestamp format')
      return false
    }

    const now = Date.now()
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      console.warn('[Resend Webhook] Timestamp too old - possible replay attack')
      return false
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64')

    return providedSignature === expectedSignature
  } catch (error) {
    console.error('[Resend Webhook] Signature verification error:', error)
    return false
  }
}

// Map Resend event type to our status
function mapEventToStatus(eventType: ResendEventType): string {
  switch (eventType) {
    case 'email.sent':
      return 'sent'
    case 'email.delivered':
      return 'delivered'
    case 'email.opened':
      return 'opened'
    case 'email.clicked':
      return 'clicked'
    case 'email.bounced':
      return 'bounced'
    case 'email.complained':
      return 'bounced' // Treat complaints as bounces
    default:
      return 'sent'
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('svix-signature') || request.headers.get('webhook-signature')

  // SECURITY: Always require webhook secret - no open webhooks allowed
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Resend Webhook] RESEND_WEBHOOK_SECRET not configured')
    // In production, this should fail. In development, allow for testing.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }
    console.warn('[Resend Webhook] Running without signature verification (development only)')
  } else {
    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('[Resend Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: ResendWebhookEvent

  try {
    event = JSON.parse(body)
  } catch {
    console.error('[Resend Webhook] Invalid JSON')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log(`[Resend Webhook] Received event: ${event.type}`, {
    email_id: event.data.email_id,
    to: event.data.to,
  })

  const supabase = getSupabase()

  try {
    // Log the event
    await supabase.from('email_event_logs').insert({
      resend_message_id: event.data.email_id,
      event_type: event.type,
      recipient_email: event.data.to?.[0],
      metadata: {
        subject: event.data.subject,
        from: event.data.from,
        created_at: event.created_at,
        click: event.data.click,
        bounce: event.data.bounce,
      },
    })

    // Update campaign_recipient status if this is a campaign email
    const status = mapEventToStatus(event.type)
    const timestampField = getTimestampField(event.type)

    const updateData: Record<string, unknown> = { status }
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString()
    }

    // Find and update the recipient
    const { data: recipient } = await supabase
      .from('campaign_recipients')
      .select('id, campaign_id, status')
      .eq('resend_message_id', event.data.email_id)
      .single()

    if (recipient) {
      // Only update if the new status is "more advanced" than the current one
      const statusOrder = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']
      const currentIndex = statusOrder.indexOf(recipient.status)
      const newIndex = statusOrder.indexOf(status)

      // Allow update if new status is more advanced, or if it's a bounce/fail
      if (newIndex > currentIndex || status === 'bounced' || status === 'failed') {
        await supabase
          .from('campaign_recipients')
          .update(updateData)
          .eq('id', recipient.id)

        // Also update campaign_id in event log
        await supabase
          .from('email_event_logs')
          .update({ campaign_id: recipient.campaign_id })
          .eq('resend_message_id', event.data.email_id)
          .is('campaign_id', null)
      }
    }

    // Handle bounces - update subscriber status
    if (event.type === 'email.bounced' || event.type === 'email.complained') {
      const recipientEmail = event.data.to?.[0]?.toLowerCase()
      if (recipientEmail) {
        await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'bounced',
            updated_at: new Date().toISOString(),
          })
          .eq('email', recipientEmail)

        console.log(`[Resend Webhook] Marked ${recipientEmail} as bounced`)
      }
    }

    // Update email_audit_log for transactional emails
    await updateEmailAuditLog(supabase, event)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Resend Webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}

function getTimestampField(eventType: ResendEventType): string | null {
  switch (eventType) {
    case 'email.sent':
      return 'sent_at'
    case 'email.delivered':
      return 'delivered_at'
    case 'email.opened':
      return 'opened_at'
    case 'email.clicked':
      return 'clicked_at'
    case 'email.bounced':
    case 'email.complained':
      return 'bounced_at'
    default:
      return null
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'resend-webhook' })
}

/**
 * Update email_audit_log table for transactional email tracking
 * This handles delivery status updates for emails sent via sendEmail()
 */
async function updateEmailAuditLog(supabase: SupabaseClient, event: ResendWebhookEvent) {
  const emailId = event.data.email_id

  try {
    switch (event.type) {
      case 'email.delivered':
        await supabase
          .from('email_audit_log')
          .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          })
          .eq('resend_email_id', emailId)
        break

      case 'email.bounced':
        await supabase
          .from('email_audit_log')
          .update({
            status: 'bounced',
            bounced_at: new Date().toISOString(),
            bounce_reason: event.data.bounce?.message || 'Unknown bounce reason',
          })
          .eq('resend_email_id', emailId)
        break

      case 'email.complained':
        await supabase
          .from('email_audit_log')
          .update({
            complained_at: new Date().toISOString(),
          })
          .eq('resend_email_id', emailId)
        break

      case 'email.opened':
        // Get current record to update counts properly
        const { data: openedRecord } = await supabase
          .from('email_audit_log')
          .select('open_count, opened_at')
          .eq('resend_email_id', emailId)
          .single()

        if (openedRecord) {
          await supabase
            .from('email_audit_log')
            .update({
              opened_at: openedRecord.opened_at || new Date().toISOString(),
              open_count: (openedRecord.open_count || 0) + 1,
            })
            .eq('resend_email_id', emailId)
        }
        break

      case 'email.clicked':
        // Get current record to update counts properly
        const { data: clickedRecord } = await supabase
          .from('email_audit_log')
          .select('click_count, clicked_at')
          .eq('resend_email_id', emailId)
          .single()

        if (clickedRecord) {
          await supabase
            .from('email_audit_log')
            .update({
              clicked_at: clickedRecord.clicked_at || new Date().toISOString(),
              click_count: (clickedRecord.click_count || 0) + 1,
            })
            .eq('resend_email_id', emailId)
        }
        break

      default:
        // Other events don't need audit log updates
        break
    }
  } catch (error) {
    // Don't fail the webhook if audit log update fails
    console.error('[Resend Webhook] Error updating email_audit_log:', error)
  }
}
