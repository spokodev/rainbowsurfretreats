import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Sample data for preview
const sampleData: Record<string, string | number | boolean> = {
  firstName: 'John',
  lastName: 'Doe',
  bookingNumber: 'RSR-2501-0001',
  retreatDestination: 'Bali',
  retreatDates: 'March 15 - March 22, 2025',
  roomName: 'Ocean View Double',
  totalAmount: '1,299.00',
  depositAmount: '129.90',
  balanceDue: '1,169.10',
  isEarlyBird: true,
  earlyBirdDiscount: '129.90',
  amount: '649.50',
  paymentNumber: 2,
  paymentDescription: 'Second Payment (50%)',
  remainingBalance: '519.60',
  nextPaymentDate: 'February 15, 2025',
  nextPaymentAmount: '519.60',
  dueDate: 'January 15, 2025',
  daysUntilRetreat: 42,
  failureReason: 'Card declined',
  refundAmount: '129.90',
  reason: 'Customer request',
  title: 'Payment Reminder',
  message: 'Your payment is due in 7 days.',
  isOverdue: false,
  paymentUrl: 'https://rainbowsurfretreats.com/booking/pay?booking_id=xxx',
  paymentScheduleHtml: `
    <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <div><strong>Payment 1</strong> - Deposit (10%)<br><span style="color: #64748b;">Due: Now</span></div>
        <div><strong>€129.90</strong></div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <div><strong>Payment 2</strong> - Second Payment (50%)<br><span style="color: #64748b;">Due: January 15, 2025</span></div>
        <div><strong>€649.50</strong></div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0;">
        <div><strong>Payment 3</strong> - Balance (40%)<br><span style="color: #64748b;">Due: February 15, 2025</span></div>
        <div><strong>€519.60</strong></div>
      </div>
    </div>
  `,
}

// Replace template variables with sample data
function renderTemplate(template: string, data: Record<string, string | number | boolean>): string {
  let result = template

  // Handle {{#if variable}}...{{/if}} conditionals
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, variable, content) => {
    return data[variable] ? content : ''
  })

  // Handle {{variable}} replacements
  result = result.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
    return String(data[variable] ?? `{{${variable}}}`)
  })

  return result
}

// Wrap content in email layout
function wrapInLayout(content: string): string {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rainbow Surf Retreats</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #0ea5e9; margin-top: 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px; }
    .footer a { color: #0ea5e9; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rainbow Surf Retreats</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Rainbow Surf Retreats</strong></p>
      <p>Catch the perfect wave, find your inner peace</p>
      <p style="font-size: 12px;">
        <a href="${SITE_URL}/privacy-policy">Privacy Policy</a> |
        <a href="${SITE_URL}/policies">Terms & Conditions</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// POST /api/admin/email-templates/preview - Preview or send test email
export async function POST(request: NextRequest) {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { subject, html_content, action, testEmail, customData } = body

    // Merge custom data with sample data
    const data = { ...sampleData, ...customData }

    // Render template with data
    const renderedSubject = renderTemplate(subject, data)
    const renderedContent = renderTemplate(html_content, data)
    const fullHtml = wrapInLayout(renderedContent)

    if (action === 'send_test' && testEmail) {
      // Send test email
      try {
        await sendEmail({
          to: testEmail,
          subject: `[TEST] ${renderedSubject}`,
          html: fullHtml,
        })

        return NextResponse.json({
          success: true,
          message: `Test email sent to ${testEmail}`,
        })
      } catch (emailError) {
        console.error('Failed to send test email:', emailError)
        return NextResponse.json(
          { error: 'Failed to send test email. Check your Resend configuration.' },
          { status: 500 }
        )
      }
    }

    // Return preview HTML
    return NextResponse.json({
      subject: renderedSubject,
      html: fullHtml,
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
