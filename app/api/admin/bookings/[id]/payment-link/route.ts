import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { stripe } from '@/lib/stripe'
import { Resend } from 'resend'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface PaymentLinkRequest {
  paymentScheduleId?: string // If provided, create link for this specific schedule
  amount?: number // Custom amount (optional, uses schedule amount by default)
  description?: string // Custom description
  sendEmail?: boolean // Whether to send email to customer
  expiresInHours?: number // Link expiration (default 24 hours)
}

/**
 * POST /api/admin/bookings/[id]/payment-link - Generate a manual payment link (admin only)
 *
 * This endpoint creates a Stripe Payment Link for a specific booking
 * and optionally sends it to the customer via email.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: bookingId } = await params
  const supabase = getSupabase()

  try {
    const body: PaymentLinkRequest = await request.json()
    const {
      paymentScheduleId,
      amount: customAmount,
      description: customDescription,
      sendEmail = true,
      expiresInHours = 24,
    } = body

    // Fetch the booking with related data
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        retreat:retreats(id, title, destination, start_date, end_date, slug),
        room:retreat_rooms(id, name)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if booking is active
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return NextResponse.json(
        { error: `Cannot create payment link for ${booking.status} booking` },
        { status: 400 }
      )
    }

    // Get payment schedule if ID provided
    let paymentSchedule = null
    if (paymentScheduleId) {
      const { data: schedule, error: scheduleError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('id', paymentScheduleId)
        .eq('booking_id', bookingId)
        .single()

      if (scheduleError || !schedule) {
        return NextResponse.json(
          { error: 'Payment schedule not found' },
          { status: 404 }
        )
      }

      if (schedule.status === 'paid') {
        return NextResponse.json(
          { error: 'This payment has already been paid' },
          { status: 400 }
        )
      }

      paymentSchedule = schedule
    } else {
      // Find the next pending payment schedule
      const { data: pendingSchedule } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('booking_id', bookingId)
        .in('status', ['pending', 'failed'])
        .order('payment_number', { ascending: true })
        .limit(1)
        .single()

      if (!pendingSchedule) {
        return NextResponse.json(
          { error: 'No pending payments found for this booking' },
          { status: 400 }
        )
      }

      paymentSchedule = pendingSchedule
    }

    // Calculate amount
    const amount = customAmount ?? paymentSchedule.amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    // Build description
    const description =
      customDescription ||
      paymentSchedule.description ||
      `Payment ${paymentSchedule.payment_number} for ${booking.retreat?.title || 'Retreat'}`

    // Create Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${booking.retreat?.title || 'Retreat'} - ${booking.booking_number}`,
              description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: bookingId,
        payment_schedule_id: paymentSchedule.id,
        type: 'manual_payment_link',
        created_by: user.email || user.id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${SITE_URL}/my-booking?token=${booking.access_token || ''}&payment=success`,
        },
      },
      // Payment link expiration
      ...(expiresInHours > 0 && {
        restrictions: {
          completed_sessions: {
            limit: 1, // Can only be used once
          },
        },
      }),
    })

    // Update payment schedule with link info
    await supabase
      .from('payment_schedules')
      .update({
        // Store the payment link ID for tracking
        failure_reason: null, // Clear previous failure
        last_reminder_sent_at: new Date().toISOString(),
      })
      .eq('id', paymentSchedule.id)

    // Send email if requested
    let emailSent = false
    if (sendEmail) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
          from: 'Rainbow Surf Retreats <noreply@rainbowsurfretreats.com>',
          replyTo: 'info@rainbowsurfretreats.com',
          to: booking.email,
          subject: `Payment Link for Your ${booking.retreat?.title || 'Retreat'} Booking`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Link for Your Booking</h2>
              <p>Hi ${booking.first_name},</p>
              <p>Here is your payment link for <strong>${booking.retreat?.title || 'your retreat'}</strong>:</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Booking:</strong> ${booking.booking_number}</p>
                <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ${amount.toFixed(2)} EUR</p>
                <p style="margin: 0;"><strong>Description:</strong> ${description}</p>
              </div>

              <p style="text-align: center; margin: 30px 0;">
                <a href="${paymentLink.url}"
                   style="background: #0070f3; color: white; padding: 15px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Pay Now
                </a>
              </p>

              ${
                expiresInHours > 0
                  ? `<p style="color: #666; font-size: 14px; text-align: center;">
                     This link expires in ${expiresInHours} hours.
                    </p>`
                  : ''
              }

              <p style="margin-top: 30px;">If you have any questions, please reply to this email.</p>

              <p>Best regards,<br>Rainbow Surf Retreats Team</p>
            </div>
          `,
        })

        emailSent = true
        console.log(`Payment link email sent to ${booking.email}`)
      } catch (emailError) {
        console.error('Error sending payment link email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Log the action
    await supabase.from('booking_status_changes').insert({
      booking_id: bookingId,
      old_status: booking.status,
      new_status: booking.status,
      old_payment_status: booking.payment_status,
      new_payment_status: booking.payment_status,
      changed_by_email: user.email,
      action: 'payment_link_created',
      reason: `Manual payment link created for ${amount.toFixed(2)} EUR`,
      metadata: {
        payment_schedule_id: paymentSchedule.id,
        payment_link_id: paymentLink.id,
        amount,
        email_sent: emailSent,
      },
    }).then(({ error }) => {
      if (error) {
        console.log('Audit log not available:', error.message)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment link created successfully',
      paymentLink: {
        id: paymentLink.id,
        url: paymentLink.url,
        amount,
        description,
        expiresInHours: expiresInHours > 0 ? expiresInHours : null,
      },
      emailSent,
      booking: {
        id: bookingId,
        booking_number: booking.booking_number,
        customer_email: booking.email,
      },
    })
  } catch (error) {
    console.error('Create payment link error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    )
  }
}
