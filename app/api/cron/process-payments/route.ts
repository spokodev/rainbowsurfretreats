import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import {
  sendPaymentConfirmation,
  sendPaymentFailedWithDeadline,
  sendPaymentSuccessWithNextInfo,
  sendBookingCancelledDueToNonPayment,
  sendAdminPaymentFailedNotification,
} from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Reject if no secret is configured (security requirement)
  if (!cronSecret) {
    console.error('CRON_SECRET not configured - rejecting request')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

interface PaymentScheduleRow {
  id: string
  booking_id: string
  payment_number: number
  amount: number
  due_date: string
  status: string
  attempts: number
  max_attempts: number
  failed_at: string | null
  payment_deadline: string | null
  description: string | null
  booking: {
    id: string
    booking_number: string
    email: string
    first_name: string
    last_name: string
    language: string
    total_amount: number
    balance_due: number
    guests_count: number
    room_id: string | null
    access_token: string | null
    stripe_customer_id: string | null
    stripe_payment_method_id: string | null
    check_in_date: string
    check_out_date: string
    retreat: {
      id: string
      title: string
      destination: string
      start_date: string
      end_date: string
    }
    room: {
      id: string
      name: string
    } | null
  }
}

// GET /api/cron/process-payments - Process due scheduled payments and auto-cancel expired
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const stripe = getStripe()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  console.log(`[Cron] Processing payments for ${todayStr}`)

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    errors: [] as string[],
  }

  try {
    // =====================
    // STEP 1: Auto-cancel bookings with expired payment deadlines
    // =====================
    console.log('[Cron] Checking for expired payment deadlines...')

    const { data: expiredPayments, error: expiredError } = await supabase
      .from('payment_schedules')
      .select(`
        id,
        booking_id,
        payment_number,
        amount,
        payment_deadline,
        booking:bookings!inner (
          id,
          booking_number,
          email,
          first_name,
          last_name,
          language,
          total_amount,
          balance_due,
          guests_count,
          room_id,
          access_token,
          stripe_customer_id,
          check_in_date,
          check_out_date,
          retreat:retreats!inner (
            id,
            title,
            destination,
            start_date,
            end_date
          ),
          room:retreat_rooms (
            id,
            name
          )
        )
      `)
      .eq('status', 'failed')
      .not('payment_deadline', 'is', null)
      .lte('payment_deadline', today.toISOString())

    if (expiredError) {
      console.error('[Cron] Error fetching expired payments:', expiredError)
    } else if (expiredPayments && expiredPayments.length > 0) {
      console.log(`[Cron] Found ${expiredPayments.length} expired payment deadlines`)

      for (const payment of expiredPayments as unknown as PaymentScheduleRow[]) {
        const booking = payment.booking

        try {
          // Cancel the booking
          await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'Payment deadline exceeded - auto-cancelled',
            })
            .eq('id', booking.id)

          // Cancel all pending/failed payment schedules
          await supabase
            .from('payment_schedules')
            .update({
              status: 'cancelled',
              failure_reason: 'Booking cancelled due to non-payment',
            })
            .eq('booking_id', booking.id)
            .in('status', ['pending', 'failed'])

          // Return room availability - properly awaited to catch errors
          if (booking.room_id) {
            const { error: rpcError } = await supabase.rpc('increment_room_availability', {
              room_id: booking.room_id,
              amount: booking.guests_count || 1,
            })

            if (rpcError) {
              console.error(`[Cron] RPC error incrementing room availability:`, rpcError)
              // Fallback to direct update - also properly awaited
              const { data: room } = await supabase
                .from('retreat_rooms')
                .select('available')
                .eq('id', booking.room_id)
                .single()

              if (room) {
                const { error: updateError } = await supabase
                  .from('retreat_rooms')
                  .update({ available: room.available + (booking.guests_count || 1) })
                  .eq('id', booking.room_id)

                if (updateError) {
                  console.error(`[Cron] Error updating room availability:`, updateError)
                  results.errors.push(`Room availability update failed for ${booking.room_id}`)
                }
              }
            }
          }

          // Send cancellation email to customer
          try {
            const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

            await sendBookingCancelledDueToNonPayment({
              bookingNumber: booking.booking_number,
              firstName: booking.first_name,
              lastName: booking.last_name,
              email: booking.email,
              retreatDestination: booking.retreat.destination,
              retreatDates,
              unpaidAmount: payment.amount,
              language: booking.language || 'en',
            })
            console.log(`[Cron] Cancellation email sent to ${booking.email}`)
          } catch (emailError) {
            console.error(`[Cron] Failed to send cancellation email:`, emailError)
          }

          results.cancelled++
          console.log(`[Cron] Cancelled booking ${booking.booking_number} due to expired payment deadline`)
        } catch (cancelError) {
          console.error(`[Cron] Error cancelling booking ${booking.id}:`, cancelError)
          results.errors.push(`Cancel ${booking.booking_number}: ${(cancelError as Error).message}`)
        }
      }
    }

    // =====================
    // STEP 2: Process due payments
    // =====================
    console.log('[Cron] Processing due payments...')

    // Find all pending payments that are due today or earlier
    const { data: duePayments, error: fetchError } = await supabase
      .from('payment_schedules')
      .select(`
        id,
        booking_id,
        payment_number,
        amount,
        due_date,
        status,
        attempts,
        max_attempts,
        failed_at,
        payment_deadline,
        description,
        booking:bookings!inner (
          id,
          booking_number,
          email,
          first_name,
          last_name,
          language,
          total_amount,
          balance_due,
          guests_count,
          room_id,
          access_token,
          stripe_customer_id,
          stripe_payment_method_id,
          check_in_date,
          check_out_date,
          retreat:retreats!inner (
            id,
            title,
            destination,
            start_date,
            end_date
          ),
          room:retreat_rooms (
            id,
            name
          )
        )
      `)
      .eq('status', 'pending')
      .lte('due_date', todayStr)
      .gt('payment_number', 1) // Skip first payment (handled at checkout)
      .order('due_date', { ascending: true })

    if (fetchError) {
      console.error('[Cron] Error fetching payments:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    if (!duePayments || duePayments.length === 0) {
      console.log('[Cron] No pending payments due today')
    } else {
      console.log(`[Cron] Found ${duePayments.length} payments to process`)

      for (const payment of duePayments as unknown as PaymentScheduleRow[]) {
        const booking = payment.booking

        // Skip cancelled bookings
        if (!booking) continue

        // Skip if no payment method saved
        if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
          console.log(`[Cron] Skipping payment ${payment.id} - no saved payment method`)
          results.skipped++

          // Mark as failed with reason and set 14-day deadline
          const paymentDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

          await supabase
            .from('payment_schedules')
            .update({
              status: 'failed',
              failure_reason: 'No payment method on file',
              failed_at: new Date().toISOString(),
              payment_deadline: paymentDeadline.toISOString(),
              reminder_stage: 'initial',
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', payment.id)

          // Send failed payment email with deadline
          try {
            const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

            // Generate Customer Portal URL for updating payment method
            let updatePaymentUrl = `${SITE_URL}/my-booking?token=${booking.access_token || ''}`
            if (booking.stripe_customer_id) {
              try {
                const portalSession = await stripe.billingPortal.sessions.create({
                  customer: booking.stripe_customer_id,
                  return_url: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
                })
                updatePaymentUrl = portalSession.url
              } catch {
                console.log('[Cron] Could not create portal session, using fallback URL')
              }
            }

            // Get total payment count
            const { data: allSchedules } = await supabase
              .from('payment_schedules')
              .select('id')
              .eq('booking_id', booking.id)
            const totalPayments = allSchedules?.length || 3

            await sendPaymentFailedWithDeadline({
              bookingNumber: booking.booking_number,
              firstName: booking.first_name,
              lastName: booking.last_name,
              email: booking.email,
              retreatDestination: booking.retreat.destination,
              retreatDates,
              amount: payment.amount,
              paymentNumber: payment.payment_number,
              totalPayments,
              failureReason: 'No payment method on file',
              paymentDeadline: paymentDeadline.toISOString(),
              daysRemaining: 14,
              updatePaymentUrl,
              myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
              language: booking.language || 'en',
            })

            // Also notify admin
            await sendAdminPaymentFailedNotification({
              bookingNumber: booking.booking_number,
              customerName: `${booking.first_name} ${booking.last_name}`,
              customerEmail: booking.email,
              retreatName: booking.retreat.title,
              amount: payment.amount,
              paymentNumber: payment.payment_number,
              failureReason: 'No payment method on file',
              adminDashboardUrl: `${SITE_URL}/admin/bookings/${booking.id}`,
            })
          } catch (emailError) {
            console.error(`[Cron] Failed to send failure email:`, emailError)
          }

          continue
        }

        results.processed++

        try {
          // Mark as processing
          await supabase
            .from('payment_schedules')
            .update({
              status: 'processing',
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', payment.id)

          // Create payment intent with saved payment method
          // CRITICAL: idempotencyKey prevents double charging if cron runs twice
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: Math.round(payment.amount * 100), // Stripe uses cents
              currency: 'eur',
              customer: booking.stripe_customer_id,
              payment_method: booking.stripe_payment_method_id,
              off_session: true,
              confirm: true,
              description: `${booking.retreat.destination} Retreat - Payment ${payment.payment_number}`,
              metadata: {
                booking_id: booking.id,
                payment_schedule_id: payment.id,
                payment_number: payment.payment_number.toString(),
                booking_number: booking.booking_number,
                language: booking.language || 'en',
                off_session: 'true',
              },
            },
            {
              // Unique key based on schedule ID and due date - prevents double charging
              idempotencyKey: `cron-payment-${payment.id}-${payment.due_date}`,
            }
          )

          // Check if payment succeeded
          if (paymentIntent.status === 'succeeded') {
            console.log(`[Cron] Payment ${payment.id} succeeded`)

            // Update payment schedule
            await supabase
              .from('payment_schedules')
              .update({
                status: 'paid',
                stripe_payment_intent_id: paymentIntent.id,
                paid_at: new Date().toISOString(),
                failed_at: null,
                payment_deadline: null,
                reminder_stage: null,
              })
              .eq('id', payment.id)

            // Create payment record
            await supabase.from('payments').insert({
              booking_id: booking.id,
              stripe_payment_intent_id: paymentIntent.id,
              stripe_customer_id: booking.stripe_customer_id,
              amount: payment.amount,
              currency: 'EUR',
              payment_type: 'scheduled',
              status: 'succeeded',
              payment_method: 'card',
            })

            // Get all payment schedules to check completion and find next
            const { data: allSchedules } = await supabase
              .from('payment_schedules')
              .select('*')
              .eq('booking_id', booking.id)
              .order('payment_number', { ascending: true })

            const pendingSchedules = allSchedules?.filter(s => s.status === 'pending') || []
            const paidSchedules = allSchedules?.filter(s => s.status === 'paid') || []
            const allPaid = pendingSchedules.length === 0

            // Update booking
            const totalPaid = paidSchedules.reduce((sum, s) => sum + s.amount, 0)
            await supabase
              .from('bookings')
              .update({
                payment_status: allPaid ? 'paid' : 'partial',
                balance_due: allPaid ? 0 : booking.total_amount - totalPaid,
              })
              .eq('id', booking.id)

            // Find next pending payment
            const nextSchedule = pendingSchedules[0] || null

            // Send payment success email with next payment info
            try {
              const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

              await sendPaymentSuccessWithNextInfo({
                bookingNumber: booking.booking_number,
                firstName: booking.first_name,
                lastName: booking.last_name,
                email: booking.email,
                retreatDestination: booking.retreat.destination,
                retreatDates,
                checkInDate: booking.check_in_date,
                checkOutDate: booking.check_out_date,
                roomName: booking.room?.name,
                paidAmount: payment.amount,
                paymentNumber: payment.payment_number,
                totalPayments: allSchedules?.length || 3,
                nextPaymentAmount: nextSchedule?.amount,
                nextPaymentDate: nextSchedule?.due_date,
                totalPaid,
                balanceDue: allPaid ? 0 : booking.total_amount - totalPaid,
                myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
                language: booking.language || 'en',
              })
              console.log(`[Cron] Payment success email sent for ${payment.id}`)
            } catch (emailError) {
              console.error(`[Cron] Failed to send success email for ${payment.id}:`, emailError)
            }

            results.succeeded++
          } else {
            // Payment requires action or failed
            console.log(`[Cron] Payment ${payment.id} status: ${paymentIntent.status}`)
            await handlePaymentFailure(
              supabase,
              payment,
              booking,
              paymentIntent.status === 'requires_action'
                ? 'Requires customer action (3D Secure)'
                : 'Payment not completed',
              paymentIntent.id
            )
            results.failed++
          }
        } catch (err) {
          const error = err as Error & { code?: string }
          console.error(`[Cron] Error processing payment ${payment.id}:`, error)

          await handlePaymentFailure(
            supabase,
            payment,
            booking,
            error.message || 'Payment processing failed'
          )

          results.failed++
          results.errors.push(`Payment ${payment.id}: ${error.message}`)
        }
      }
    }

    console.log('[Cron] Processing complete:', results)

    return NextResponse.json({
      ...results,
      message: `Processed ${results.processed} payments: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped, ${results.cancelled} cancelled`,
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to handle payment failures
async function handlePaymentFailure(
  supabase: ReturnType<typeof getSupabase>,
  payment: PaymentScheduleRow,
  booking: PaymentScheduleRow['booking'],
  failureReason: string,
  stripePaymentIntentId?: string
) {
  const attempts = payment.attempts + 1
  const shouldRetry = attempts < payment.max_attempts

  // Set payment deadline if this is the first failure
  const isFirstFailure = !payment.failed_at
  const paymentDeadline = isFirstFailure
    ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    : payment.payment_deadline ? new Date(payment.payment_deadline) : null

  await supabase
    .from('payment_schedules')
    .update({
      status: shouldRetry ? 'pending' : 'failed',
      stripe_payment_intent_id: stripePaymentIntentId || null,
      failure_reason: failureReason,
      attempts,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: shouldRetry
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null,
      // Set deadline fields only on first failure
      ...(isFirstFailure && {
        failed_at: new Date().toISOString(),
        payment_deadline: paymentDeadline?.toISOString(),
        reminder_stage: 'initial',
      }),
    })
    .eq('id', payment.id)

  // Send failure notification on first failure or when max attempts reached
  if (isFirstFailure || !shouldRetry) {
    try {
      const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

      // Generate Customer Portal URL for updating payment method
      let updatePaymentUrl = `${SITE_URL}/my-booking?token=${booking.access_token || ''}`
      if (booking.stripe_customer_id) {
        try {
          const stripe = getStripe()
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: booking.stripe_customer_id,
            return_url: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
          })
          updatePaymentUrl = portalSession.url
        } catch {
          console.log('[Cron] Could not create portal session, using fallback URL')
        }
      }

      // Get total payment count
      const { data: allSchedules } = await supabase
        .from('payment_schedules')
        .select('id')
        .eq('booking_id', booking.id)
      const totalPayments = allSchedules?.length || 3

      const deadlineDate = paymentDeadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

      await sendPaymentFailedWithDeadline({
        bookingNumber: booking.booking_number,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        retreatDestination: booking.retreat.destination,
        retreatDates,
        amount: payment.amount,
        paymentNumber: payment.payment_number,
        totalPayments,
        failureReason,
        paymentDeadline: deadlineDate.toISOString(),
        daysRemaining: 14,
        updatePaymentUrl,
        myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
        language: booking.language || 'en',
      })

      // Notify admin
      await sendAdminPaymentFailedNotification({
        bookingNumber: booking.booking_number,
        customerName: `${booking.first_name} ${booking.last_name}`,
        customerEmail: booking.email,
        retreatName: booking.retreat.title,
        amount: payment.amount,
        paymentNumber: payment.payment_number,
        failureReason,
        adminDashboardUrl: `${SITE_URL}/admin/bookings/${booking.id}`,
      })

      console.log(`[Cron] Payment failed email sent for ${payment.id}`)
    } catch (emailError) {
      console.error(`[Cron] Failed to send failure email for ${payment.id}:`, emailError)
    }
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
