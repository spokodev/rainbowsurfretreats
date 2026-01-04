import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { stripe } from '@/lib/stripe'
import { sendPaymentSuccessWithNextInfo } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RetryPaymentRequest {
  paymentScheduleId: string
  force?: boolean // Ignore max_attempts limit
}

/**
 * POST /api/admin/bookings/[id]/retry-payment - Manually retry a failed payment (admin only)
 *
 * This endpoint allows admin to immediately retry a failed payment
 * instead of waiting for the cron job.
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
    const body: RetryPaymentRequest = await request.json()
    const { paymentScheduleId, force = false } = body

    if (!paymentScheduleId) {
      return NextResponse.json(
        { error: 'Payment schedule ID is required' },
        { status: 400 }
      )
    }

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

    // Fetch payment schedule
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

    // Check status
    if (schedule.status === 'paid') {
      return NextResponse.json(
        { error: 'This payment has already been paid' },
        { status: 400 }
      )
    }

    if (schedule.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot retry cancelled payment. Restore the booking first.' },
        { status: 400 }
      )
    }

    // Check max attempts unless forced
    if (!force && schedule.attempts >= (schedule.max_attempts || 3)) {
      return NextResponse.json(
        {
          error: 'Maximum retry attempts reached',
          attempts: schedule.attempts,
          maxAttempts: schedule.max_attempts || 3,
          hint: 'Use force=true to override or create a manual payment link',
        },
        { status: 400 }
      )
    }

    // Check if customer has payment method
    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return NextResponse.json(
        {
          error: 'No payment method on file',
          hint: 'Create a manual payment link instead',
        },
        { status: 400 }
      )
    }

    // Update schedule to processing
    await supabase
      .from('payment_schedules')
      .update({
        status: 'processing',
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', paymentScheduleId)

    try {
      // Create PaymentIntent with idempotency key to prevent double charging
      // Key includes timestamp to allow retry after failures while preventing rapid double-clicks
      const retryTimestamp = Math.floor(Date.now() / 60000) // Changes every minute
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(schedule.amount * 100),
          currency: 'eur',
          customer: booking.stripe_customer_id,
          payment_method: booking.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          metadata: {
            booking_id: bookingId,
            payment_schedule_id: paymentScheduleId,
            booking_number: booking.booking_number,
            triggered_by: 'admin_manual_retry',
            admin_email: user.email || user.id,
          },
          description: `Payment for ${booking.booking_number} - ${schedule.description || 'Scheduled payment'}`,
        },
        {
          // Unique key based on schedule ID, attempts count, and minute timestamp
          // This prevents double-click issues while allowing legitimate retries
          idempotencyKey: `admin-retry-${paymentScheduleId}-${schedule.attempts}-${retryTimestamp}`,
        }
      )

      if (paymentIntent.status === 'succeeded') {
        // Payment successful
        await supabase
          .from('payment_schedules')
          .update({
            status: 'paid',
            stripe_payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            failure_reason: null,
          })
          .eq('id', paymentScheduleId)

        // Create payment record
        await supabase.from('payments').insert({
          booking_id: bookingId,
          amount: schedule.amount,
          currency: 'eur',
          status: 'succeeded',
          payment_type: schedule.description?.includes('Deposit') ? 'deposit' : 'scheduled',
          stripe_payment_intent_id: paymentIntent.id,
          stripe_customer_id: booking.stripe_customer_id,
          stripe_payment_method_id: booking.stripe_payment_method_id,
        })

        // Update booking payment status
        const { data: allSchedules } = await supabase
          .from('payment_schedules')
          .select('status')
          .eq('booking_id', bookingId)

        const allPaid = allSchedules?.every((s) => s.status === 'paid')
        const newPaymentStatus = allPaid ? 'paid' : 'partial'

        await supabase
          .from('bookings')
          .update({
            payment_status: newPaymentStatus,
            balance_due: allPaid ? 0 : booking.balance_due - schedule.amount,
          })
          .eq('id', bookingId)

        // Get next payment schedule for email
        const { data: nextSchedule } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('status', 'pending')
          .order('payment_number', { ascending: true })
          .limit(1)
          .single()

        // Send success email with next payment info
        try {
          const retreatDates = booking.retreat
            ? `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
            : 'TBD'

          // Calculate total paid
          const { data: paidSchedules } = await supabase
            .from('payment_schedules')
            .select('amount')
            .eq('booking_id', bookingId)
            .eq('status', 'paid')

          const totalPaid = paidSchedules?.reduce((sum, s) => sum + s.amount, 0) || schedule.amount

          await sendPaymentSuccessWithNextInfo({
            bookingNumber: booking.booking_number,
            firstName: booking.first_name,
            lastName: booking.last_name,
            email: booking.email,
            retreatDestination: booking.retreat?.destination || 'Unknown',
            retreatDates,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            roomName: booking.room?.name,
            paidAmount: schedule.amount,
            paymentNumber: schedule.payment_number,
            totalPayments: allSchedules?.length || 3,
            nextPaymentAmount: nextSchedule?.amount,
            nextPaymentDate: nextSchedule?.due_date,
            totalPaid,
            balanceDue: allPaid ? 0 : booking.balance_due - schedule.amount,
            myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
            language: booking.language || 'en',
          })
        } catch (emailError) {
          console.error('Error sending payment success email:', emailError)
        }

        return NextResponse.json({
          success: true,
          message: 'Payment successful',
          payment: {
            amount: schedule.amount,
            status: 'succeeded',
            paymentIntentId: paymentIntent.id,
          },
          booking: {
            id: bookingId,
            payment_status: newPaymentStatus,
            balance_due: allPaid ? 0 : booking.balance_due - schedule.amount,
          },
        })
      } else if (paymentIntent.status === 'requires_action') {
        // 3D Secure required - can't handle in off-session
        await supabase
          .from('payment_schedules')
          .update({
            status: 'pending',
            attempts: schedule.attempts + 1,
            failure_reason: '3D Secure required - customer action needed',
          })
          .eq('id', paymentScheduleId)

        return NextResponse.json(
          {
            error: '3D Secure authentication required',
            hint: 'Customer must complete payment manually. Send a payment link instead.',
            paymentIntentStatus: paymentIntent.status,
          },
          { status: 400 }
        )
      } else {
        // Other status
        await supabase
          .from('payment_schedules')
          .update({
            status: 'failed',
            attempts: schedule.attempts + 1,
            failure_reason: `Payment intent status: ${paymentIntent.status}`,
          })
          .eq('id', paymentScheduleId)

        return NextResponse.json(
          {
            error: 'Payment not completed',
            paymentIntentStatus: paymentIntent.status,
          },
          { status: 400 }
        )
      }
    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'

      // Update schedule with failure
      await supabase
        .from('payment_schedules')
        .update({
          status: 'failed',
          attempts: schedule.attempts + 1,
          failure_reason: errorMessage,
          failed_at: schedule.failed_at || new Date().toISOString(),
          payment_deadline: schedule.payment_deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', paymentScheduleId)

      console.error('Stripe payment error:', stripeError)

      return NextResponse.json(
        {
          error: 'Payment failed',
          stripeError: errorMessage,
          attempts: schedule.attempts + 1,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Retry payment error:', error)
    return NextResponse.json(
      { error: 'Failed to retry payment' },
      { status: 500 }
    )
  }
}
