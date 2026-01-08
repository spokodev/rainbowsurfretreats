import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp, rateLimitPresets, rateLimitHeaders } from '@/lib/utils/rate-limit'
import {
  sendAdminSupportRequestNotification,
  sendContactFormConfirmation,
} from '@/lib/email'

// Validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
})

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(request)
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.contact)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = contactSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = validation.data

    // Send confirmation email to customer
    try {
      await sendContactFormConfirmation({ name, email, subject })
    } catch (error) {
      console.error('Error sending contact form confirmation:', error)
      // Don't fail the request if confirmation fails
    }

    // Send notification to admin
    try {
      await sendAdminSupportRequestNotification({ name, email, subject, message })
    } catch (error) {
      console.error('Error sending admin support notification:', error)
      // Don't fail the request if admin notification fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      },
      { headers: rateLimitHeaders(rateLimitResult) }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
