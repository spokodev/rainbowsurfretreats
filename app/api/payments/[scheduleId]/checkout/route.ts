import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com').trim()

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/payments/{scheduleId}/checkout?token={bookingAccessToken}
 *
 * Creates a Stripe Checkout Session for a specific pending payment schedule.
 * Allows customers to pay early from reminder emails instead of waiting for auto-charge.
 *
 * Security: Uses booking.access_token for authentication (no login required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  // Store token early for use in error handling
  const token = request.nextUrl.searchParams.get('token')

  try {
    const { scheduleId } = await params

    if (!token) {
      return NextResponse.redirect(
        new URL('/my-booking?error=missing_token', SITE_URL)
      )
    }

    if (!scheduleId) {
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=missing_schedule`, SITE_URL)
      )
    }

    const supabase = getSupabase()

    // 1. Find booking by access_token
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        first_name,
        last_name,
        email,
        status,
        access_token_expires_at,
        stripe_customer_id,
        retreat:retreats!inner(
          id,
          destination,
          slug
        ),
        room:retreat_rooms(
          id,
          name
        )
      `)
      .eq('access_token', token)
      .single()

    if (bookingError || !booking) {
      console.error('[EarlyPayment] Invalid token:', bookingError)
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=invalid_token`, SITE_URL)
      )
    }

    // 2. Check if token is expired
    if (booking.access_token_expires_at) {
      const expiresAt = new Date(booking.access_token_expires_at)
      if (expiresAt < new Date()) {
        return NextResponse.redirect(
          new URL(`/my-booking?token=${token}&error=token_expired`, SITE_URL)
        )
      }
    }

    // 3. Check booking status
    if (booking.status === 'cancelled') {
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=booking_cancelled`, SITE_URL)
      )
    }

    // 4. Find the payment schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('id', scheduleId)
      .eq('booking_id', booking.id) // Ensure schedule belongs to this booking
      .single()

    if (scheduleError || !schedule) {
      console.error('[EarlyPayment] Schedule not found:', scheduleError)
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=schedule_not_found`, SITE_URL)
      )
    }

    // 5. Check if already paid
    if (schedule.status === 'paid') {
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&info=already_paid`, SITE_URL)
      )
    }

    // 6. Check if schedule is pending, processing, or failed (all can be paid)
    // 'processing' allows retry if customer didn't complete Stripe checkout
    if (!['pending', 'processing', 'failed'].includes(schedule.status)) {
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=invalid_status`, SITE_URL)
      )
    }

    // 7. Create Stripe Checkout Session
    const stripe = getStripe()
    const retreat = Array.isArray(booking.retreat) ? booking.retreat[0] : booking.retreat
    const room = Array.isArray(booking.room) ? booking.room[0] : booking.room

    // Validate retreat data
    if (!retreat || !retreat.destination) {
      console.error('[EarlyPayment] Missing retreat data for booking:', booking.booking_number)
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=invalid_booking_data`, SITE_URL)
      )
    }

    // Parse amount (Supabase may return decimal as string)
    const amount = parseFloat(String(schedule.amount))
    if (isNaN(amount) || amount <= 0) {
      console.error('[EarlyPayment] Invalid payment amount:', schedule.amount)
      return NextResponse.redirect(
        new URL(`/my-booking?token=${token}&error=invalid_amount`, SITE_URL)
      )
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${retreat.destination} Retreat - Payment ${schedule.payment_number}`,
              description: room ? `${room.name} | ${booking.booking_number}` : booking.booking_number,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        payment_schedule_id: schedule.id,
        type: 'early_payment',
        payment_number: schedule.payment_number.toString(),
      },
      success_url: `${SITE_URL}/my-booking?token=${token}&payment=success`,
      cancel_url: `${SITE_URL}/my-booking?token=${token}`,
    }

    // Use existing Stripe customer or customer email
    // If customer ID exists, validate it first to avoid Stripe errors
    if (booking.stripe_customer_id) {
      try {
        // Verify customer exists in Stripe
        await stripe.customers.retrieve(booking.stripe_customer_id)
        sessionParams.customer = booking.stripe_customer_id
      } catch (customerError) {
        // Customer doesn't exist in Stripe, fall back to email
        console.warn(`[EarlyPayment] Stripe customer ${booking.stripe_customer_id} not found, using email instead`)
        sessionParams.customer_email = booking.email
      }
    } else {
      sessionParams.customer_email = booking.email
    }

    console.log(`[EarlyPayment] Creating checkout session for ${booking.booking_number}:`, {
      scheduleId: schedule.id,
      amount,
      customer: sessionParams.customer || sessionParams.customer_email,
      siteUrl: SITE_URL,
    })

    const session = await stripe.checkout.sessions.create(sessionParams)

    // 8. Update schedule status to processing
    await supabase
      .from('payment_schedules')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', schedule.id)

    console.log(`[EarlyPayment] Checkout session created for booking ${booking.booking_number}, schedule ${schedule.payment_number}`)

    // 9. Redirect to Stripe
    return NextResponse.redirect(session.url!)
  } catch (error) {
    // Log detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[EarlyPayment] Error creating checkout session:', {
      error: errorMessage,
      stack: errorStack,
    })

    // Redirect with token if available for better UX
    const redirectUrl = token
      ? `/my-booking?token=${token}&error=checkout_failed`
      : '/my-booking?error=checkout_failed'

    return NextResponse.redirect(new URL(redirectUrl, SITE_URL))
  }
}
