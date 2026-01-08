import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/settings'
import { sendEmail, wrapInLayout, escapeHtml } from '@/lib/email'
import type { ApiResponse } from '@/lib/types/database'

interface SendEmailRequest {
  to: string
  subject: string
  body: string
  recipientName?: string
  language?: string
  bookingId?: string
  waitlistId?: string
}

// POST /api/admin/email/send - Send custom email from admin panel
export async function POST(request: NextRequest) {
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data: SendEmailRequest = await request.json()

    // Validate required fields
    if (!data.to || !data.subject || !data.body) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.to)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Build HTML content with escaped user input
    const greeting = data.recipientName
      ? `<p>Hi ${escapeHtml(data.recipientName)},</p>`
      : '<p>Hello,</p>'

    // Convert plain text body to HTML (preserve line breaks)
    const bodyHtml = escapeHtml(data.body)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')

    const htmlContent = `
      ${greeting}
      <p>${bodyHtml}</p>
      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `

    const fullHtml = wrapInLayout(htmlContent)

    // Send the email
    await sendEmail({
      to: data.to,
      subject: data.subject,
      html: fullHtml,
      logContext: {
        emailType: 'admin_custom_email',
        recipientType: 'customer',
        bookingId: data.bookingId,
        metadata: {
          sentBy: user.email,
          language: data.language || 'en',
          waitlistId: data.waitlistId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    )
  }
}
