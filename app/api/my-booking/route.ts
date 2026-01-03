import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/my-booking?token={accessToken}
 *
 * Fetches booking details using a secure access token.
 * No authentication required - token serves as proof of access.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Access token required' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  // Find booking by access token
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      first_name,
      last_name,
      email,
      phone,
      status,
      payment_status,
      total_amount,
      deposit_amount,
      balance_due,
      discount_amount,
      discount_code,
      discount_source,
      vat_rate,
      vat_amount,
      is_early_bird,
      early_bird_discount,
      guests_count,
      check_in_date,
      check_out_date,
      created_at,
      access_token_expires_at,
      stripe_customer_id,
      retreat:retreats(
        id,
        title,
        destination,
        location,
        start_date,
        end_date,
        image_url,
        slug
      ),
      room:retreat_rooms(
        id,
        name,
        description,
        price
      )
    `)
    .eq('access_token', token)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json(
      { error: 'Invalid access token or booking not found' },
      { status: 404 }
    )
  }

  // Check if token is expired
  if (booking.access_token_expires_at) {
    const expiresAt = new Date(booking.access_token_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Access token has expired. Please contact support.' },
        { status: 401 }
      )
    }
  }

  // Fetch payment schedules
  const { data: paymentSchedules } = await supabase
    .from('payment_schedules')
    .select(`
      id,
      payment_number,
      amount,
      due_date,
      description,
      status,
      paid_at,
      failed_at,
      payment_deadline,
      failure_reason
    `)
    .eq('booking_id', booking.id)
    .order('payment_number', { ascending: true })

  // Fetch payment history
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      currency,
      status,
      payment_type,
      created_at,
      stripe_payment_intent_id
    `)
    .eq('booking_id', booking.id)
    .eq('status', 'succeeded')
    .order('created_at', { ascending: true })

  // Generate Customer Portal URL if customer has Stripe ID
  let customerPortalUrl: string | null = null
  if (booking.stripe_customer_id) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: booking.stripe_customer_id,
        return_url: `${SITE_URL}/my-booking?token=${token}`,
      })
      customerPortalUrl = session.url
    } catch (error) {
      console.error('Error creating customer portal session:', error)
    }
  }

  // Calculate totals
  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
  const pendingPayments = paymentSchedules?.filter((s) => s.status === 'pending') || []
  const failedPayments = paymentSchedules?.filter((s) => s.status === 'failed') || []

  return NextResponse.json({
    booking: {
      id: booking.id,
      bookingNumber: booking.booking_number,
      firstName: booking.first_name,
      lastName: booking.last_name,
      email: booking.email,
      phone: booking.phone,
      status: booking.status,
      paymentStatus: booking.payment_status,
      guestsCount: booking.guests_count,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      createdAt: booking.created_at,

      // Pricing
      totalAmount: booking.total_amount,
      depositAmount: booking.deposit_amount,
      balanceDue: booking.balance_due,
      discountAmount: booking.discount_amount,
      discountCode: booking.discount_code,
      discountSource: booking.discount_source,
      vatRate: booking.vat_rate,
      vatAmount: booking.vat_amount,
      isEarlyBird: booking.is_early_bird,
      earlyBirdDiscount: booking.early_bird_discount,

      // Related
      retreat: booking.retreat,
      room: booking.room,
    },
    paymentSchedule: paymentSchedules?.map((s) => ({
      id: s.id,
      paymentNumber: s.payment_number,
      amount: s.amount,
      dueDate: s.due_date,
      description: s.description,
      status: s.status,
      paidAt: s.paid_at,
      failedAt: s.failed_at,
      paymentDeadline: s.payment_deadline,
      failureReason: s.failure_reason,
    })) || [],
    paymentHistory: payments?.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      type: p.payment_type,
      date: p.created_at,
    })) || [],
    summary: {
      totalPaid,
      balanceDue: booking.balance_due,
      pendingPaymentsCount: pendingPayments.length,
      failedPaymentsCount: failedPayments.length,
      nextPayment: pendingPayments[0] || null,
    },
    customerPortalUrl,
  })
}
