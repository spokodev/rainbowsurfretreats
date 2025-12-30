import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getStripe, calculateVat } from '@/lib/stripe'
import { calculatePaymentSchedule, isEligibleForEarlyBird } from '@/lib/payment-schedule'
import { getPaymentSettings } from '@/lib/settings'
import type { ApiResponse, BookingInsert } from '@/lib/types/database'

interface CheckoutRequest {
  retreatId?: string // Legacy support (UUID)
  retreatSlug?: string // New: lookup by slug
  roomId?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  billingAddress?: string
  city?: string
  postalCode?: string
  country: string
  guestsCount?: number
  paymentType: 'deposit' | 'full' | 'scheduled' // Added 'scheduled' for multi-stage
  acceptTerms: boolean
  newsletterOptIn?: boolean
  notes?: string
  language?: string // User preferred language for emails (en, de, es, fr, nl)
}

// POST /api/stripe/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: CheckoutRequest = await request.json()

    // Validate required fields
    if ((!body.retreatId && !body.retreatSlug) || !body.firstName || !body.lastName || !body.email || !body.country) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!body.acceptTerms) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'You must accept the terms and conditions' },
        { status: 400 }
      )
    }

    // Fetch retreat data - support both slug (new) and id (legacy)
    let retreatQuery = supabase
      .from('retreats')
      .select(`
        *,
        rooms:retreat_rooms(*)
      `)
      .eq('is_published', true)

    // Use slug if provided, otherwise use id
    if (body.retreatSlug) {
      retreatQuery = retreatQuery.eq('slug', body.retreatSlug)
    } else if (body.retreatId) {
      retreatQuery = retreatQuery.eq('id', body.retreatId)
    }

    const { data: retreat, error: retreatError } = await retreatQuery.single()

    if (retreatError || !retreat) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Retreat not found' },
        { status: 404 }
      )
    }

    // Get room if specified
    let room: {
      id: string
      name?: string
      price: number
      is_sold_out?: boolean
      available?: number
      early_bird_price?: number | null
      early_bird_enabled?: boolean
    } | null = null
    let basePrice = retreat.price as number

    if (body.roomId && retreat.rooms) {
      room = retreat.rooms.find((r: { id: string }) => r.id === body.roomId) || null
      if (room) {
        // Check if room is sold out
        if (room.is_sold_out || room.available === 0) {
          return NextResponse.json<ApiResponse<null>>(
            { error: 'This room type is no longer available. Please select a different room.' },
            { status: 400 }
          )
        }
        basePrice = room.price
      }
    }

    // Get dates for payment schedule calculation
    const bookingDate = new Date()
    const retreatStartDate = new Date(retreat.start_date)

    // Check if eligible for early bird (3+ months before retreat)
    const eligibleForTime = isEligibleForEarlyBird(bookingDate, retreatStartDate)

    // Check if room has Early Bird enabled
    const roomHasEarlyBird = room?.early_bird_enabled && room?.early_bird_price

    // Determine effective price based on room or retreat early bird
    let effectivePrice = basePrice
    let eligibleForEarlyBird = false

    if (eligibleForTime && roomHasEarlyBird) {
      // Use room's early bird price
      effectivePrice = room!.early_bird_price as number
      eligibleForEarlyBird = true
    } else if (eligibleForTime && retreat.early_bird_price) {
      // Fallback to retreat-level early bird (legacy support)
      effectivePrice = retreat.early_bird_price as number
      eligibleForEarlyBird = true
    }

    // Get payment settings from database
    const paymentSettings = await getPaymentSettings()

    // Calculate payment schedule
    const paymentSchedule = calculatePaymentSchedule({
      totalPrice: effectivePrice,
      bookingDate,
      retreatStartDate,
      isEarlyBird: eligibleForEarlyBird,
      earlyBirdDiscountPercent: 10,
      depositPercent: paymentSettings.depositPercentage,
    })

    // Determine charge amount based on payment type
    let chargeAmount: number
    let depositAmount: number

    if (body.paymentType === 'full') {
      // Full payment - charge everything now
      chargeAmount = paymentSchedule.totalAmount
      depositAmount = chargeAmount
    } else {
      // Scheduled or deposit - charge only first payment
      chargeAmount = paymentSchedule.schedules[0].amount
      depositAmount = chargeAmount
    }

    // Calculate VAT on the charge amount
    const { vatRate, vatAmount, total } = calculateVat(chargeAmount, body.country)

    // Calculate balance due
    const balanceDue = body.paymentType === 'full'
      ? 0
      : paymentSchedule.totalAmount - depositAmount

    // Calculate VAT on full amount (not deposit) for accurate booking records
    const fullAmountVat = calculateVat(paymentSchedule.totalAmount, body.country)

    // Create booking record
    const bookingData: BookingInsert = {
      retreat_id: retreat.id,
      room_id: body.roomId || null,
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone || null,
      billing_address: body.billingAddress || null,
      city: body.city || null,
      postal_code: body.postalCode || null,
      country: body.country,
      guests_count: body.guestsCount || 1,
      check_in_date: retreat.start_date,
      check_out_date: retreat.end_date,
      subtotal: paymentSchedule.totalAmount,
      vat_rate: fullAmountVat.vatRate,
      vat_amount: fullAmountVat.vatAmount,
      total_amount: fullAmountVat.total,
      deposit_amount: depositAmount,
      balance_due: balanceDue,
      status: 'pending',
      payment_status: 'unpaid',
      accept_terms: body.acceptTerms,
      newsletter_opt_in: body.newsletterOptIn || false,
      notes: body.notes || null,
      // New fields for payment schedule
      is_early_bird: eligibleForEarlyBird,
      early_bird_discount: paymentSchedule.earlyBirdDiscount,
      // Language for multilingual emails
      language: body.language || 'en',
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError || !booking) {
      console.error('Booking creation error:', bookingError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Create or find Stripe Customer for future payments
    let stripeCustomerId: string | null = null

    if (body.paymentType !== 'full') {
      // We need a customer for scheduled payments
      const stripeClient = getStripe()

      // Check if customer already exists
      const existingCustomers = await stripeClient.customers.list({
        email: body.email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id
      } else {
        // Create new customer
        const customer = await stripeClient.customers.create({
          email: body.email,
          name: `${body.firstName} ${body.lastName}`,
          phone: body.phone || undefined,
          address: body.billingAddress ? {
            line1: body.billingAddress,
            city: body.city || undefined,
            postal_code: body.postalCode || undefined,
            country: body.country,
          } : undefined,
          metadata: {
            booking_id: booking.id,
          },
        })
        stripeCustomerId = customer.id
      }

      // Update booking with Stripe customer ID
      await supabase
        .from('bookings')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', booking.id)

      // Create payment schedule records for future payments
      const scheduleInserts = paymentSchedule.schedules.map((schedule) => ({
        booking_id: booking.id,
        payment_number: schedule.paymentNumber,
        amount: schedule.amount,
        due_date: schedule.dueDate.toISOString().split('T')[0],
        description: schedule.description,
        status: schedule.paymentNumber === 1 ? 'processing' : 'pending',
      }))

      await supabase.from('payment_schedules').insert(scheduleInserts)
    }

    // Format dates for display
    const retreatDates = `${retreat.start_date} - ${retreat.end_date}`

    // Determine payment description
    let paymentDescription: string
    if (body.paymentType === 'full') {
      paymentDescription = 'Full Payment'
    } else if (paymentSchedule.isLateBooking) {
      paymentDescription = 'First Payment (50%)'
    } else {
      paymentDescription = 'Deposit (10%)'
    }

    // Create Stripe checkout session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: any = {
      payment_method_types: ['card'],
      mode: 'payment',
      client_reference_id: booking.id,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${retreat.destination} Surf Retreat`,
              description: `${retreatDates} | ${room?.name || 'Standard'} | ${paymentDescription}`,
              images: retreat.image_url ? [retreat.image_url] : undefined,
            },
            unit_amount: Math.round(total * 100), // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_id: booking.id,
        retreat_id: retreat.id,
        room_id: body.roomId || '',
        payment_type: body.paymentType,
        payment_number: '1',
        is_late_booking: paymentSchedule.isLateBooking.toString(),
        is_early_bird: paymentSchedule.isEarlyBird.toString(),
        language: body.language || 'en',
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/booking?slug=${retreat.slug}${body.roomId ? `&room_id=${body.roomId}` : ''}`,
    }

    // If scheduled payments, we need to save the payment method for future charges
    if (body.paymentType !== 'full' && stripeCustomerId) {
      sessionParams.customer = stripeCustomerId
      sessionParams.payment_intent_data = {
        setup_future_usage: 'off_session',
      }
    } else {
      sessionParams.customer_email = body.email
    }

    let session
    try {
      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (stripeError) {
      // Clean up orphaned booking if Stripe session creation fails
      console.error('Stripe session creation failed:', stripeError)
      await supabase.from('payment_schedules').delete().eq('booking_id', booking.id)
      await supabase.from('bookings').delete().eq('id', booking.id)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to create payment session. Please try again.' },
        { status: 500 }
      )
    }

    // Create payment record
    await supabase.from('payments').insert({
      booking_id: booking.id,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: stripeCustomerId,
      amount: total,
      currency: 'EUR',
      payment_type: body.paymentType === 'full' ? 'full' : 'deposit',
      status: 'pending',
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      paymentSchedule: body.paymentType !== 'full' ? {
        isLateBooking: paymentSchedule.isLateBooking,
        isEarlyBird: paymentSchedule.isEarlyBird,
        totalAmount: paymentSchedule.totalAmount,
        earlyBirdDiscount: paymentSchedule.earlyBirdDiscount,
        payments: paymentSchedule.schedules.map(s => ({
          number: s.paymentNumber,
          amount: s.amount,
          dueDate: s.dueDate.toISOString(),
          description: s.description,
        })),
      } : null,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
