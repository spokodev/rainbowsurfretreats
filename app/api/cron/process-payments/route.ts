import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'

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
  booking: {
    id: string
    email: string
    first_name: string
    last_name: string
    language: string
    stripe_customer_id: string | null
    stripe_payment_method_id: string | null
    retreat: {
      destination: string
      start_date: string
      end_date: string
    }
  }
}

// GET /api/cron/process-payments - Process due scheduled payments
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const stripe = getStripe()
  const today = new Date().toISOString().split('T')[0]

  console.log(`[Cron] Processing payments for ${today}`)

  try {
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
        booking:bookings!inner (
          id,
          email,
          first_name,
          last_name,
          language,
          stripe_customer_id,
          stripe_payment_method_id,
          retreat:retreats!inner (
            destination,
            start_date,
            end_date
          )
        )
      `)
      .eq('status', 'pending')
      .lte('due_date', today)
      .gt('payment_number', 1) // Skip first payment (handled at checkout)
      .order('due_date', { ascending: true })

    if (fetchError) {
      console.error('[Cron] Error fetching payments:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }

    if (!duePayments || duePayments.length === 0) {
      console.log('[Cron] No payments due today')
      return NextResponse.json({ processed: 0, message: 'No payments due' })
    }

    console.log(`[Cron] Found ${duePayments.length} payments to process`)

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const payment of duePayments as unknown as PaymentScheduleRow[]) {
      const booking = payment.booking

      // Skip if no payment method saved
      if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
        console.log(`[Cron] Skipping payment ${payment.id} - no saved payment method`)
        results.skipped++

        // Mark as failed with reason
        await supabase
          .from('payment_schedules')
          .update({
            status: 'failed',
            failure_reason: 'No payment method on file',
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', payment.id)

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
        const retreatDates = `${booking.retreat.start_date} - ${booking.retreat.end_date}`
        const paymentIntent = await stripe.paymentIntents.create({
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
            retreat_dates: retreatDates,
            language: booking.language || 'en',
            off_session: 'true',
          },
        })

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
            })
            .eq('id', payment.id)

          // Create payment record
          await supabase.from('payments').insert({
            booking_id: booking.id,
            stripe_payment_intent_id: paymentIntent.id,
            stripe_customer_id: booking.stripe_customer_id,
            amount: payment.amount,
            currency: 'EUR',
            payment_type: payment.payment_number === 2 ? 'deposit' : 'balance',
            status: 'succeeded',
            payment_method: 'card',
          })

          // Check if all payments are complete
          const { data: pendingPayments } = await supabase
            .from('payment_schedules')
            .select('id')
            .eq('booking_id', booking.id)
            .in('status', ['pending', 'processing'])

          if (!pendingPayments || pendingPayments.length === 0) {
            // All payments complete - update booking
            await supabase
              .from('bookings')
              .update({
                payment_status: 'paid',
                balance_due: 0,
              })
              .eq('id', booking.id)
          }

          results.succeeded++
        } else {
          // Payment requires action or failed
          console.log(`[Cron] Payment ${payment.id} status: ${paymentIntent.status}`)

          await supabase
            .from('payment_schedules')
            .update({
              status: paymentIntent.status === 'requires_action' ? 'pending' : 'failed',
              stripe_payment_intent_id: paymentIntent.id,
              failure_reason: paymentIntent.status === 'requires_action'
                ? 'Requires customer action (3D Secure)'
                : 'Payment not completed',
              attempts: payment.attempts + 1,
              next_retry_at: payment.attempts < payment.max_attempts - 1
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Retry tomorrow
                : null,
            })
            .eq('id', payment.id)

          results.failed++
        }
      } catch (err) {
        const error = err as Error & { code?: string }
        console.error(`[Cron] Error processing payment ${payment.id}:`, error)

        const attempts = payment.attempts + 1
        const shouldRetry = attempts < payment.max_attempts

        await supabase
          .from('payment_schedules')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            failure_reason: error.message || 'Payment processing failed',
            attempts,
            last_attempt_at: new Date().toISOString(),
            next_retry_at: shouldRetry
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : null,
          })
          .eq('id', payment.id)

        results.failed++
        results.errors.push(`Payment ${payment.id}: ${error.message}`)

        // TODO: Send failure notification email to customer
      }
    }

    console.log('[Cron] Processing complete:', results)

    return NextResponse.json({
      ...results,
      message: `Processed ${results.processed} payments: ${results.succeeded} succeeded, ${results.failed} failed, ${results.skipped} skipped`,
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
