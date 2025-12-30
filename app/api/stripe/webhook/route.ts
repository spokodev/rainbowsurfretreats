import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getBookingSettings } from '@/lib/settings'
import {
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailed,
  sendRefundConfirmation,
} from '@/lib/email'
import type Stripe from 'stripe'

// Use service role client to bypass RLS (lazy initialization)
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

// POST /api/stripe/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, event.id)
        break
      }

      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSucceeded(intent)
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(intent)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(charge)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const bookingId = session.metadata?.booking_id
  const paymentType = session.metadata?.payment_type as 'deposit' | 'full' | 'scheduled'
  const paymentNumber = session.metadata?.payment_number
  const language = session.metadata?.language || 'en'

  if (!bookingId) {
    console.error('No booking_id in session metadata')
    return
  }

  const supabase = getSupabase()
  const stripe = getStripe()

  // Idempotency check: check if this event was already processed
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, status, stripe_webhook_event_id')
    .eq('stripe_checkout_session_id', session.id)
    .single()

  if (existingPayment?.stripe_webhook_event_id) {
    console.log(`Event already processed: ${existingPayment.stripe_webhook_event_id}`)
    return // Already processed, skip
  }

  // Update payment record with idempotency marker
  const { error: paymentError } = await supabase
    .from('payments')
    .update({
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_customer_id: session.customer as string,
      stripe_webhook_event_id: eventId,
      status: 'succeeded',
      payment_method: 'card',
    })
    .eq('stripe_checkout_session_id', session.id)

  if (paymentError) {
    console.error('Error updating payment:', paymentError)
  }

  // Save payment method to customer for future charges
  if (session.customer && session.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
      if (paymentIntent.payment_method) {
        // Update booking with the saved payment method
        await supabase
          .from('bookings')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_payment_method_id: paymentIntent.payment_method as string,
          })
          .eq('id', bookingId)
      }
    } catch (err) {
      console.error('Error saving payment method:', err)
    }
  }

  // Update payment schedule if this is a scheduled payment
  if (paymentNumber) {
    const { error: scheduleError } = await supabase
      .from('payment_schedules')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('booking_id', bookingId)
      .eq('payment_number', parseInt(paymentNumber, 10))

    if (scheduleError) {
      console.error('Error updating payment schedule:', scheduleError)
    }
  }

  // Fetch booking data for email
  const { data: booking, error: bookingFetchError } = await supabase
    .from('bookings')
    .select(`
      *,
      retreat:retreats(destination, start_date, end_date),
      room:retreat_rooms(name)
    `)
    .eq('id', bookingId)
    .single()

  if (bookingFetchError || !booking) {
    console.error('Error fetching booking for email:', bookingFetchError)
    return
  }

  // Fetch payment schedule
  const { data: paymentSchedules } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('booking_id', bookingId)
    .order('payment_number', { ascending: true })

  // Check if all scheduled payments are complete
  const { data: pendingPayments } = await supabase
    .from('payment_schedules')
    .select('id')
    .eq('booking_id', bookingId)
    .in('status', ['pending', 'processing'])

  // Determine payment status
  let paymentStatus: 'deposit' | 'paid'
  if (paymentType === 'full') {
    paymentStatus = 'paid'
  } else if (pendingPayments && pendingPayments.length === 0) {
    // All scheduled payments complete
    paymentStatus = 'paid'
  } else {
    paymentStatus = 'deposit'
  }

  // Get booking settings to check autoConfirm
  const bookingSettings = await getBookingSettings()

  // Determine booking status based on autoConfirm setting
  // If autoConfirm is true, booking is confirmed on payment
  // If autoConfirm is false, booking stays pending until manually confirmed
  const newBookingStatus = bookingSettings.autoConfirm ? 'confirmed' : 'pending'

  // Update booking status
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({
      status: newBookingStatus,
      payment_status: paymentStatus,
      balance_due: paymentStatus === 'paid' ? 0 : undefined,
    })
    .eq('id', bookingId)

  if (bookingError) {
    console.error('Error updating booking:', bookingError)
  }

  // Send confirmation email using multilingual email functions
  const isFirstPayment = !paymentNumber || paymentNumber === '1'

  // Decrement room availability (only on first payment / initial booking confirmation)
  if (isFirstPayment && booking.room_id) {
    const { error: decrementError } = await supabase.rpc('decrement_room_availability', {
      room_uuid: booking.room_id,
      decrement_count: 1
    })

    if (decrementError) {
      console.error('Error decrementing room availability:', decrementError)
    } else {
      console.log(`Room ${booking.room_id} availability decremented`)
    }
  }
  const bookingLanguage = booking.language || language || 'en'

  // Format dates based on language
  const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                     bookingLanguage === 'es' ? 'es-ES' :
                     bookingLanguage === 'fr' ? 'fr-FR' :
                     bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
  const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

  try {
    if (isFirstPayment) {
      // Send booking confirmation email with language support
      await sendBookingConfirmation({
        bookingNumber: booking.booking_number,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        retreatDestination: booking.retreat.destination,
        retreatDates,
        roomName: booking.room?.name,
        totalAmount: booking.total_amount,
        depositAmount: booking.deposit_amount,
        balanceDue: booking.balance_due,
        isEarlyBird: booking.is_early_bird,
        earlyBirdDiscount: booking.early_bird_discount,
        language: bookingLanguage,
        paymentSchedule: paymentSchedules?.map((ps) => ({
          number: ps.payment_number,
          amount: ps.amount,
          dueDate: ps.due_date,
          description: ps.description || `Payment ${ps.payment_number}`,
        })),
      })

      console.log(`Booking confirmation email sent to ${booking.email} in ${bookingLanguage}`)
    } else {
      // Send payment confirmation email with language support
      const paidSchedule = paymentSchedules?.find((ps) => ps.payment_number === parseInt(paymentNumber, 10))
      const nextSchedule = paymentSchedules?.find((ps) => ps.status === 'pending')

      await sendPaymentConfirmation({
        bookingNumber: booking.booking_number,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        retreatDestination: booking.retreat.destination,
        amount: paidSchedule?.amount || session.amount_total! / 100,
        paymentNumber: parseInt(paymentNumber, 10),
        paymentDescription: paidSchedule?.description || `Payment ${paymentNumber}`,
        remainingBalance: booking.balance_due,
        nextPaymentDate: nextSchedule?.due_date,
        nextPaymentAmount: nextSchedule?.amount,
        language: bookingLanguage,
      })

      console.log(`Payment confirmation email sent to ${booking.email} in ${bookingLanguage}`)
    }
  } catch (emailError) {
    console.error('Error sending confirmation email:', emailError)
  }

  console.log(`Booking ${bookingId} confirmed with ${paymentType} payment (payment #${paymentNumber || 1})`)
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const supabase = getSupabase()
  const bookingId = intent.metadata?.booking_id
  const paymentNumber = intent.metadata?.payment_number

  // Update payment record if not already done via checkout.session.completed
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'succeeded',
    })
    .eq('stripe_payment_intent_id', intent.id)

  if (error) {
    console.error('Error updating payment on success:', error)
  }

  // Also update payment_schedules if this was a scheduled payment
  const { error: scheduleError } = await supabase
    .from('payment_schedules')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', intent.id)

  if (scheduleError) {
    console.error('Error updating payment schedule on success:', scheduleError)
  }

  // Send email for off-session payments (cron job triggered)
  if (bookingId && paymentNumber && intent.metadata?.off_session === 'true') {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          *,
          retreat:retreats(destination, start_date, end_date)
        `)
        .eq('id', bookingId)
        .single()

      if (booking) {
        const { data: paymentSchedules } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('booking_id', bookingId)
          .order('payment_number', { ascending: true })

        const paidSchedule = paymentSchedules?.find((ps) => ps.payment_number === parseInt(paymentNumber, 10))
        const nextSchedule = paymentSchedules?.find((ps) => ps.status === 'pending')
        const bookingLanguage = booking.language || intent.metadata?.language || 'en'

        await sendPaymentConfirmation({
          bookingNumber: booking.booking_number,
          firstName: booking.first_name,
          lastName: booking.last_name,
          email: booking.email,
          retreatDestination: booking.retreat.destination,
          amount: paidSchedule?.amount || intent.amount / 100,
          paymentNumber: parseInt(paymentNumber, 10),
          paymentDescription: paidSchedule?.description || `Payment ${paymentNumber}`,
          remainingBalance: booking.balance_due - (paidSchedule?.amount || 0),
          nextPaymentDate: nextSchedule?.due_date,
          nextPaymentAmount: nextSchedule?.amount,
          language: bookingLanguage,
        })
      }
    } catch (emailError) {
      console.error('Error sending payment confirmation email:', emailError)
    }
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const supabase = getSupabase()
  const bookingId = intent.metadata?.booking_id
  const paymentNumber = intent.metadata?.payment_number

  // Update payment record
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: intent.last_payment_error?.message || 'Payment failed',
    })
    .eq('stripe_payment_intent_id', intent.id)

  if (error) {
    console.error('Error updating payment on failure:', error)
  }

  // Update payment_schedules if this was a scheduled payment
  const { error: scheduleError } = await supabase
    .from('payment_schedules')
    .update({
      status: 'failed',
      failure_reason: intent.last_payment_error?.message || 'Payment failed',
      last_attempt_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', intent.id)

  if (scheduleError) {
    console.error('Error updating payment schedule on failure:', scheduleError)
  }

  // Send failure notification email
  if (bookingId) {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          *,
          retreat:retreats(destination, start_date, end_date)
        `)
        .eq('id', bookingId)
        .single()

      if (booking) {
        const { data: paidSchedule } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('stripe_payment_intent_id', intent.id)
          .single()

        const bookingLanguage = booking.language || intent.metadata?.language || 'en'
        const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                           bookingLanguage === 'es' ? 'es-ES' :
                           bookingLanguage === 'fr' ? 'fr-FR' :
                           bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
        const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`
        const daysUntilRetreat = Math.ceil((new Date(booking.retreat.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

        await sendPaymentFailed({
          bookingNumber: booking.booking_number,
          firstName: booking.first_name,
          lastName: booking.last_name,
          email: booking.email,
          retreatDestination: booking.retreat.destination,
          retreatDates,
          retreatStartDate: booking.retreat.start_date,
          daysUntilRetreat,
          amount: paidSchedule?.amount || intent.amount / 100,
          dueDate: paidSchedule?.due_date || new Date().toISOString(),
          paymentNumber: parseInt(paymentNumber || '1', 10),
          language: bookingLanguage,
          failureReason: intent.last_payment_error?.message,
        })

        console.log(`Payment failed email sent to ${booking.email} in ${bookingLanguage}`)
      }
    } catch (emailError) {
      console.error('Error sending payment failed email:', emailError)
    }
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const supabase = getSupabase()
  const paymentIntentId = charge.payment_intent as string

  // Find the original payment
  const { data: originalPayment, error: findError } = await supabase
    .from('payments')
    .select('booking_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (findError || !originalPayment) {
    console.error('Original payment not found for refund:', paymentIntentId)
    return
  }

  const refundAmount = charge.amount_refunded / 100

  // Create refund payment record
  const { error: refundError } = await supabase
    .from('payments')
    .insert({
      booking_id: originalPayment.booking_id,
      stripe_payment_intent_id: paymentIntentId,
      amount: -refundAmount,
      currency: charge.currency.toUpperCase(),
      payment_type: 'refund',
      status: 'refunded',
    })

  if (refundError) {
    console.error('Error creating refund record:', refundError)
  }

  // Update booking payment status
  const refundStatus = charge.refunded ? 'refunded' : 'partial_refund'
  const { error: bookingError } = await supabase
    .from('bookings')
    .update({ payment_status: refundStatus })
    .eq('id', originalPayment.booking_id)

  if (bookingError) {
    console.error('Error updating booking on refund:', bookingError)
  }

  // Send refund confirmation email
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        *,
        retreat:retreats(destination)
      `)
      .eq('id', originalPayment.booking_id)
      .single()

    if (booking) {
      const bookingLanguage = booking.language || 'en'

      await sendRefundConfirmation({
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        bookingNumber: booking.booking_number,
        retreatDestination: booking.retreat.destination,
        refundAmount,
        language: bookingLanguage,
      })

      console.log(`Refund confirmation email sent to ${booking.email} in ${bookingLanguage}`)
    }
  } catch (emailError) {
    console.error('Error sending refund confirmation email:', emailError)
  }

  console.log(`Refund processed for booking ${originalPayment.booking_id}`)
}
