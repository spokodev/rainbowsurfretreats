import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getStripe, calculateVat, isEUCountry, COMPANY_COUNTRY } from '@/lib/stripe'
import { calculatePaymentSchedule, isEligibleForEarlyBird } from '@/lib/payment-schedule'
import { getPaymentSettings } from '@/lib/settings'
import { validatePromoCode, determineBestDiscount, recordPromoCodeRedemption } from '@/lib/promo-codes'
import { checkoutRequestSchema, type CheckoutRequest } from '@/lib/validations/booking'
import { checkRateLimit, getClientIp, rateLimitPresets, rateLimitHeaders } from '@/lib/utils/rate-limit'
import type { ApiResponse, BookingInsert, DiscountSource } from '@/lib/types/database'

// POST /api/stripe/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  // Rate limiting - 10 requests per minute per IP
  const clientIp = getClientIp(request)
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.checkout)

  if (!rateLimitResult.success) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const supabase = await createClient()
    const rawBody = await request.json()

    // Validate request body with Zod schema
    const validation = checkoutRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json<ApiResponse<null>>(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const body = validation.data

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

    // Room is required for booking
    if (!body.roomId) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Please select a room type' },
        { status: 400 }
      )
    }

    // Get room
    let room: {
      id: string
      name?: string
      price: number
      is_sold_out?: boolean
      available?: number
      early_bird_enabled?: boolean
      early_bird_deadline?: string | null
    } | null = null
    let basePrice = 0

    if (retreat.rooms) {
      room = retreat.rooms.find((r: { id: string }) => r.id === body.roomId) || null
      if (!room) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Selected room not found for this retreat' },
          { status: 400 }
        )
      }
      // Check if room is sold out
      if (room.is_sold_out || room.available === 0) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'This room type is no longer available. Please select a different room.' },
          { status: 400 }
        )
      }
      basePrice = room.price
    } else {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'No rooms available for this retreat' },
        { status: 400 }
      )
    }

    // Get dates for payment schedule calculation
    const bookingDate = new Date()
    const retreatStartDate = new Date(retreat.start_date)

    // Check if eligible for early bird (before deadline or 3+ months before retreat)
    const eligibleForTime = isEligibleForEarlyBird(
      bookingDate,
      retreatStartDate,
      room?.early_bird_deadline
    )

    // Check if room has Early Bird enabled
    const roomHasEarlyBird = room?.early_bird_enabled

    // Calculate early bird discount amount (always 10%)
    let earlyBirdDiscountAmount = 0
    if (eligibleForTime && roomHasEarlyBird) {
      earlyBirdDiscountAmount = Math.round(basePrice * 0.1)
    }

    // Validate promo code if provided
    let validatedPromoCode = null
    let promoDiscountAmount = 0

    if (body.promoCode) {
      const promoValidation = await validatePromoCode(
        body.promoCode,
        retreat.id,
        body.roomId,
        basePrice
      )

      if (promoValidation.valid && promoValidation.promoCode) {
        validatedPromoCode = promoValidation.promoCode
        promoDiscountAmount = promoValidation.discountAmount || 0
      } else {
        // Return error if promo code was provided but is invalid
        return NextResponse.json<ApiResponse<null>>(
          { error: promoValidation.error || 'Invalid promo code' },
          { status: 400 }
        )
      }
    }

    // Best Discount Wins logic - if equal, prefer early bird (automatic benefit)
    let bestDiscountAmount = 0
    let discountSource: DiscountSource | null = null
    let eligibleForEarlyBird = false

    if (promoDiscountAmount > 0 || earlyBirdDiscountAmount > 0) {
      if (promoDiscountAmount > earlyBirdDiscountAmount) {
        // Promo code wins only if strictly greater
        bestDiscountAmount = promoDiscountAmount
        discountSource = 'promo_code'
      } else if (earlyBirdDiscountAmount > 0) {
        // Early bird wins when equal or greater
        bestDiscountAmount = earlyBirdDiscountAmount
        discountSource = 'early_bird'
        eligibleForEarlyBird = true
      } else {
        // Only promo discount with zero early bird
        bestDiscountAmount = promoDiscountAmount
        discountSource = 'promo_code'
      }
    }

    // Calculate effective price after best discount
    const effectivePrice = basePrice - bestDiscountAmount

    // Get payment settings from database
    const paymentSettings = await getPaymentSettings()

    // Calculate payment schedule
    // Note: Deposit percentages are handled internally by the function:
    // - Standard (>=2 months): 10% now, 50% at 2 months before, 40% at 1 month before
    // - Late (<2 months): 50% now, 50% at 1 month before
    const paymentSchedule = calculatePaymentSchedule({
      totalPrice: effectivePrice,
      bookingDate,
      retreatStartDate,
      isEarlyBird: eligibleForEarlyBird,
      earlyBirdDiscountPercent: 10,
      paymentType: body.paymentType === 'full' ? 'full' : 'deposit',
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

    // Determine if B2B reverse charge applies
    // B2B from different EU country with valid VAT ID = 0% VAT
    const customerType = body.customerType || 'private'
    const isB2BReverseCharge =
      customerType === 'business' &&
      body.vatIdValid === true &&
      isEUCountry(body.country) &&
      body.country !== COMPANY_COUNTRY

    // Calculate VAT on the charge amount (with B2B logic)
    const { vatRate, vatAmount, total, isReverseCharge } = calculateVat({
      amount: chargeAmount,
      country: body.country,
      customerType,
      vatIdValid: body.vatIdValid,
    })

    // Calculate VAT on full amount for accurate booking records
    const fullAmountVat = calculateVat({
      amount: paymentSchedule.totalAmount,
      country: body.country,
      customerType,
      vatIdValid: body.vatIdValid,
    })

    // Calculate deposit and balance WITH VAT included
    // The deposit amount with VAT is what's actually charged via Stripe (total from calculateVat)
    const depositAmountWithVat = total // 'total' includes VAT from the charge amount calculation
    const balanceDueWithVat = body.paymentType === 'full'
      ? 0
      : fullAmountVat.total - depositAmountWithVat

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
      deposit_amount: depositAmountWithVat,
      balance_due: balanceDueWithVat,
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
      // Promo code / discount tracking
      discount_amount: bestDiscountAmount,
      discount_code: discountSource === 'promo_code' && validatedPromoCode ? validatedPromoCode.code : null,
      discount_source: discountSource,
      promo_code_id: discountSource === 'promo_code' && validatedPromoCode ? validatedPromoCode.id : null,
      // B2B fields
      customer_type: customerType,
      company_name: customerType === 'business' ? body.companyName || null : null,
      vat_id: customerType === 'business' ? body.vatId || null : null,
      vat_id_valid: customerType === 'business' ? body.vatIdValid || false : false,
      vat_id_validated_at: customerType === 'business' && body.vatIdValid ? new Date().toISOString() : null,
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

    // Record promo code redemption if promo code was used
    // This uses atomic increment to prevent race conditions
    if (discountSource === 'promo_code' && validatedPromoCode) {
      try {
        await recordPromoCodeRedemption(
          validatedPromoCode.id,
          booking.id,
          basePrice,
          bestDiscountAmount,
          effectivePrice
        )
      } catch (promoError) {
        // Promo code usage limit reached between validation and redemption (race condition)
        // Clean up the booking and return error
        console.error('Promo code redemption failed:', promoError)
        await supabase.from('bookings').delete().eq('id', booking.id)
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Promo code usage limit reached. Please try again without the promo code.' },
          { status: 400 }
        )
      }
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
      // Each schedule amount should include VAT proportionally
      const scheduleInserts = paymentSchedule.schedules.map((schedule) => {
        const scheduleVat = calculateVat({
          amount: schedule.amount,
          country: body.country,
          customerType,
          vatIdValid: body.vatIdValid,
        })
        return {
          booking_id: booking.id,
          payment_number: schedule.paymentNumber,
          amount: scheduleVat.total, // Store amount WITH VAT
          due_date: schedule.dueDate.toISOString().split('T')[0],
          description: schedule.description,
          status: schedule.paymentNumber === 1 ? 'processing' : 'pending',
        }
      })

      await supabase.from('payment_schedules').insert(scheduleInserts)
    }

    // Format dates for display
    const retreatDates = `${retreat.start_date} - ${retreat.end_date}`

    // Convert relative image URL to absolute URL for Stripe
    // Stripe requires absolute URLs for product images
    let absoluteImageUrl: string | undefined = undefined
    try {
      // Trim to handle any trailing whitespace/newlines in env var
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim()
      if (retreat.image_url) {
        let imageUrl: string
        if (retreat.image_url.startsWith('http')) {
          imageUrl = retreat.image_url
        } else {
          // Convert relative path to absolute URL
          imageUrl = `${siteUrl}${retreat.image_url.startsWith('/') ? '' : '/'}${retreat.image_url}`
        }
        // Validate URL format before using
        new URL(imageUrl)
        absoluteImageUrl = imageUrl
      }
    } catch {
      // If URL construction fails, skip the image
      console.warn('Invalid image URL, skipping:', retreat.image_url)
      absoluteImageUrl = undefined
    }

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
              images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
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
        // VAT/Tax metadata for Stripe reporting
        vat_rate: vatRate.toString(),
        vat_amount: vatAmount.toFixed(2),
        customer_type: customerType,
        is_reverse_charge: isReverseCharge.toString(),
        company_name: customerType === 'business' ? (body.companyName || '') : '',
        vat_id: customerType === 'business' ? (body.vatId || '') : '',
      },
      success_url: `${(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim()}/booking/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url: `${(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').trim()}/booking?slug=${retreat.slug}${body.roomId ? `&room_id=${body.roomId}` : ''}`,
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
    } catch (stripeError: unknown) {
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
