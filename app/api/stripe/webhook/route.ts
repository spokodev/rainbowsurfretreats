import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { getBookingSettings } from '@/lib/settings'
import {
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendPaymentFailed,
  sendRefundConfirmation,
  sendAdminPaymentFailedNotification,
  sendAdminNewBookingNotification,
  sendAdminPaymentReceivedNotification,
  isNotificationEnabled,
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
  const earlyPaymentType = session.metadata?.type // 'early_payment' for customer-initiated payments
  const paymentScheduleId = session.metadata?.payment_schedule_id

  // Handle early_payment from reminder emails (customer-initiated)
  if (earlyPaymentType === 'early_payment' && paymentScheduleId) {
    await handleEarlyPayment(session, eventId, paymentScheduleId)
    return
  }

  if (!bookingId) {
    console.error('No booking_id in session metadata')
    return
  }

  const supabase = getSupabase()
  const stripe = getStripe()

  // Atomic idempotency check: try to claim this event by updating only if not already processed
  // This prevents race conditions where two webhook deliveries both read null and proceed
  const { data: updatedPayment, error: paymentError } = await supabase
    .from('payments')
    .update({
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_customer_id: session.customer as string,
      stripe_webhook_event_id: eventId,
      status: 'succeeded',
      payment_method: 'card',
    })
    .eq('stripe_checkout_session_id', session.id)
    .is('stripe_webhook_event_id', null) // Only update if not already processed
    .select('id')
    .maybeSingle()

  if (paymentError) {
    console.error('Error updating payment:', paymentError)
    return
  }

  // If no row was updated, it means another webhook already processed this event
  if (!updatedPayment) {
    console.log(`Event ${eventId} already processed or payment not found for session ${session.id}`)
    return
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

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'
  const myBookingUrl = booking.access_token
    ? `${SITE_URL}/my-booking?token=${booking.access_token}`
    : `${SITE_URL}/booking?booking_id=${booking.booking_number}`

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
        myBookingUrl,
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

      // Send admin notification for payment received (after first payment)
      try {
        const paidSchedule = paymentSchedules?.find((ps) => ps.payment_number === parseInt(paymentNumber, 10))
        const totalPayments = paymentSchedules?.length || 3
        await sendAdminPaymentReceivedNotification({
          bookingNumber: booking.booking_number,
          customerName: `${booking.first_name} ${booking.last_name}`,
          customerEmail: booking.email,
          retreatName: booking.retreat.destination,
          amount: paidSchedule?.amount || session.amount_total! / 100,
          paymentNumber: parseInt(paymentNumber, 10),
          totalPayments,
          remainingBalance: booking.balance_due,
          isFullyPaid: booking.balance_due === 0,
          bookingId: booking.id,
        })
      } catch (adminError) {
        console.error('Error sending admin payment notification:', adminError)
      }
    }
  } catch (emailError) {
    console.error('Error sending confirmation email:', emailError)
  }

  // Send admin notification for new booking (first payment only)
  if (isFirstPayment) {
    try {
      await sendAdminNewBookingNotification({
        bookingNumber: booking.booking_number,
        customerName: `${booking.first_name} ${booking.last_name}`,
        customerEmail: booking.email,
        phone: booking.phone,
        retreatName: booking.retreat.destination,
        retreatDates,
        roomName: booking.room?.name,
        totalAmount: booking.total_amount,
        depositAmount: booking.deposit_amount,
        guestsCount: booking.guests_count || 1,
        paymentType: paymentType as 'deposit' | 'full',
        isEarlyBird: booking.is_early_bird,
        earlyBirdDiscount: booking.early_bird_discount,
        bookingId: booking.id,
      })
    } catch (adminError) {
      console.error('Error sending admin booking notification:', adminError)
    }
  }

  // Subscribe to newsletter if opted in (only on first payment)
  if (isFirstPayment && booking.newsletter_opt_in) {
    try {
      const { error: newsletterError } = await supabase
        .from('newsletter_subscribers')
        .upsert(
          {
            email: booking.email,
            first_name: booking.first_name,
            language: bookingLanguage,
            source: 'checkout',
            status: 'active',
            confirmed_at: new Date().toISOString(),
          },
          {
            onConflict: 'email',
            ignoreDuplicates: false,
          }
        )

      if (newsletterError) {
        console.error('Error subscribing to newsletter:', newsletterError)
      } else {
        console.log(`Newsletter subscription added for ${booking.email}`)
      }
    } catch (newsletterErr) {
      console.error('Newsletter subscription failed:', newsletterErr)
    }
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

        // Get payment record for proper audit logging
        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('id')
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

        // Send immediate admin notification
        if (await isNotificationEnabled('notifyOnPaymentFailed')) {
          const failureReason = intent.last_payment_error?.message || 'Unknown error'
          const paymentAmount = paidSchedule?.amount || intent.amount / 100

          await sendAdminPaymentFailedNotification({
            bookingNumber: booking.booking_number,
            customerName: `${booking.first_name} ${booking.last_name}`,
            customerEmail: booking.email,
            retreatName: booking.retreat.destination,
            amount: paymentAmount,
            paymentNumber: parseInt(paymentNumber || '1', 10),
            failureReason,
            bookingId: booking.id,
            paymentId: paymentRecord?.id,
          })

          console.log(`Admin payment failed notification sent for booking ${booking.booking_number}`)
        }
      }
    } catch (emailError) {
      console.error('Error sending payment failed email:', emailError)
    }
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const supabase = getSupabase()
  const paymentIntentId = charge.payment_intent as string

  // Find the original payment with booking room_id
  const { data: originalPayment, error: findError } = await supabase
    .from('payments')
    .select('booking_id, booking:bookings(room_id)')
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

  // If FULL refund, return room availability
  // Supabase returns nested join as array, extract first element
  const bookingArray = originalPayment.booking as Array<{ room_id: string | null }> | null
  const bookingData = Array.isArray(bookingArray) ? bookingArray[0] : bookingArray
  if (charge.refunded && bookingData?.room_id) {
    const { error: incrementError } = await supabase.rpc('increment_room_availability', {
      room_uuid: bookingData.room_id,
      increment_count: 1
    })

    if (incrementError) {
      console.error('Error incrementing room availability on refund:', incrementError)
    } else {
      console.log(`Room ${bookingData.room_id} availability incremented due to refund`)
    }
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

/**
 * Handle early payment from reminder emails (customer-initiated payment before due date)
 * This is triggered when a customer clicks "Pay Now" in a payment reminder email
 */
async function handleEarlyPayment(
  session: Stripe.Checkout.Session,
  eventId: string,
  paymentScheduleId: string
) {
  const supabase = getSupabase()
  const stripe = getStripe()
  const bookingId = session.metadata?.booking_id

  console.log(`[EarlyPayment] Processing early payment for schedule ${paymentScheduleId}`)

  // Find the payment schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('id', paymentScheduleId)
    .single()

  if (scheduleError || !schedule) {
    console.error('[EarlyPayment] Payment schedule not found:', scheduleError)
    return
  }

  // Check if already paid (idempotency)
  if (schedule.status === 'paid') {
    console.log(`[EarlyPayment] Schedule ${paymentScheduleId} already paid, skipping`)
    return
  }

  // Update payment schedule to paid
  const { error: updateError } = await supabase
    .from('payment_schedules')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent as string,
      // Clear any failed payment fields
      failed_at: null,
      payment_deadline: null,
      failure_reason: null,
      reminder_stage: null,
    })
    .eq('id', paymentScheduleId)
    .in('status', ['pending', 'processing', 'failed']) // Only update if not already paid

  if (updateError) {
    console.error('[EarlyPayment] Error updating payment schedule:', updateError)
    return
  }

  // Create payment record
  // Use 'deposit' for first payment, 'balance' for subsequent payments
  const paymentType = schedule.payment_number === 1 ? 'deposit' : 'balance'
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      booking_id: schedule.booking_id,
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: session.customer as string,
      stripe_webhook_event_id: eventId,
      amount: schedule.amount,
      currency: 'EUR',
      payment_type: paymentType,
      status: 'succeeded',
      payment_method: 'card',
    })

  if (paymentError) {
    console.error('[EarlyPayment] Error creating payment record:', paymentError)
  }

  // Update booking with payment method if available
  if (session.customer && session.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
      if (paymentIntent.payment_method) {
        await supabase
          .from('bookings')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_payment_method_id: paymentIntent.payment_method as string,
          })
          .eq('id', schedule.booking_id)
      }
    } catch (err) {
      console.error('[EarlyPayment] Error saving payment method:', err)
    }
  }

  // Fetch booking for email and balance update
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      *,
      retreat:retreats(destination, start_date, end_date),
      room:retreat_rooms(name),
      access_token
    `)
    .eq('id', schedule.booking_id)
    .single()

  if (bookingError || !booking) {
    console.error('[EarlyPayment] Error fetching booking:', bookingError)
    return
  }

  // Calculate new balance
  const newBalance = booking.balance_due - schedule.amount

  // Check if all payments are complete
  const { data: pendingPayments } = await supabase
    .from('payment_schedules')
    .select('id')
    .eq('booking_id', schedule.booking_id)
    .in('status', ['pending', 'processing', 'failed'])

  const allPaid = !pendingPayments || pendingPayments.length === 0
  const paymentStatus = allPaid ? 'paid' : 'deposit'

  // Update booking balance
  const { error: balanceError } = await supabase
    .from('bookings')
    .update({
      balance_due: Math.max(0, newBalance),
      payment_status: paymentStatus,
    })
    .eq('id', schedule.booking_id)

  if (balanceError) {
    console.error('[EarlyPayment] Error updating booking balance:', balanceError)
  }

  // Get all payment schedules for next payment info
  const { data: allSchedules } = await supabase
    .from('payment_schedules')
    .select('*')
    .eq('booking_id', schedule.booking_id)
    .order('payment_number', { ascending: true })

  const nextSchedule = allSchedules?.find(s => s.status === 'pending')
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

  // Send payment confirmation email
  try {
    const bookingLanguage = booking.language || 'en'
    const dateLocale = bookingLanguage === 'de' ? 'de-DE' :
                       bookingLanguage === 'es' ? 'es-ES' :
                       bookingLanguage === 'fr' ? 'fr-FR' :
                       bookingLanguage === 'nl' ? 'nl-NL' : 'en-US'
    const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

    // Import sendPaymentSuccessWithNextInfo
    const { sendPaymentSuccessWithNextInfo } = await import('@/lib/email')

    await sendPaymentSuccessWithNextInfo({
      bookingNumber: booking.booking_number,
      firstName: booking.first_name,
      lastName: booking.last_name,
      email: booking.email,
      retreatDestination: booking.retreat.destination,
      retreatDates,
      checkInDate: booking.check_in_date || booking.retreat.start_date,
      checkOutDate: booking.check_out_date || booking.retreat.end_date,
      roomName: booking.room?.name,
      paidAmount: schedule.amount,
      paymentNumber: schedule.payment_number,
      totalPayments: allSchedules?.length || 3,
      nextPaymentAmount: nextSchedule?.amount,
      nextPaymentDate: nextSchedule?.due_date,
      totalPaid: booking.total_amount - Math.max(0, newBalance),
      balanceDue: Math.max(0, newBalance),
      myBookingUrl: booking.access_token
        ? `${SITE_URL}/my-booking?token=${booking.access_token}`
        : `${SITE_URL}/booking?booking_id=${booking.booking_number}`,
      language: bookingLanguage,
    })

    console.log(`[EarlyPayment] Payment confirmation sent to ${booking.email}`)
  } catch (emailError) {
    console.error('[EarlyPayment] Error sending confirmation email:', emailError)
  }

  console.log(`[EarlyPayment] Early payment processed for booking ${booking.booking_number}, schedule ${schedule.payment_number}`)
}
