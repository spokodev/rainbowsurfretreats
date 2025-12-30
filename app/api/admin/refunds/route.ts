import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { checkAdminAuth } from '@/lib/settings'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RefundRequest {
  paymentId: string
  amount?: number // Optional partial refund amount
  reason?: string
}

interface CancelRequest {
  paymentScheduleId: string
  reason?: string
}

// POST /api/admin/refunds - Create a refund (admin only)
export async function POST(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabase()
  const stripe = getStripe()

  try {
    const body = await request.json()

    // Handle cancellation of scheduled payment
    if (body.action === 'cancel') {
      return handleCancelPayment(body as CancelRequest, supabase)
    }

    // Handle refund
    const { paymentId, amount, reason } = body as RefundRequest

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Fetch the payment with booking details including room_id
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*, booking:bookings(id, email, first_name, last_name, room_id)')
      .eq('id', paymentId)
      .single()

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'No Stripe payment intent associated with this payment' },
        { status: 400 }
      )
    }

    if (payment.status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment has already been refunded' },
        { status: 400 }
      )
    }

    if (payment.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Can only refund succeeded payments' },
        { status: 400 }
      )
    }

    // Calculate refund amount
    const refundAmount = amount
      ? Math.min(amount, payment.amount)
      : payment.amount
    const isPartialRefund = refundAmount < payment.amount

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100), // Stripe uses cents
      reason: 'requested_by_customer',
      metadata: {
        payment_id: paymentId,
        booking_id: payment.booking_id,
        admin_reason: reason || 'Refund requested by admin',
      },
    })

    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return NextResponse.json(
        { error: `Refund failed: ${refund.failure_reason || 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Update original payment status
    await supabase
      .from('payments')
      .update({
        status: isPartialRefund ? 'succeeded' : 'refunded',
      })
      .eq('id', paymentId)

    // Create refund payment record
    await supabase.from('payments').insert({
      booking_id: payment.booking_id,
      stripe_payment_intent_id: payment.stripe_payment_intent_id,
      amount: -refundAmount, // Negative to indicate refund
      currency: payment.currency,
      payment_type: 'refund',
      status: 'refunded',
      metadata: {
        original_payment_id: paymentId,
        refund_id: refund.id,
        reason: reason || 'Refund requested by admin',
      },
    })

    // Update booking status
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('booking_id', payment.booking_id)

    if (allPayments) {
      const totalPaid = allPayments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0)
      const totalRefunded = allPayments
        .filter(p => p.status === 'refunded')
        .reduce((sum, p) => sum + Math.abs(p.amount), 0)

      let paymentStatus: string
      if (totalRefunded >= totalPaid) {
        paymentStatus = 'refunded'
      } else if (totalRefunded > 0) {
        paymentStatus = 'partial_refund'
      } else {
        paymentStatus = totalPaid > 0 ? 'deposit' : 'unpaid'
      }

      await supabase
        .from('bookings')
        .update({ payment_status: paymentStatus })
        .eq('id', payment.booking_id)

      // If FULL refund, return room availability
      if (paymentStatus === 'refunded' && payment.booking?.room_id) {
        await supabase.rpc('increment_room_availability', {
          room_uuid: payment.booking.room_id,
          increment_count: 1
        })
      }
    }

    // TODO: Send refund confirmation email

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundAmount,
      status: refund.status,
      message: isPartialRefund
        ? `Partial refund of €${refundAmount.toFixed(2)} processed`
        : `Full refund of €${refundAmount.toFixed(2)} processed`,
    })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}

// Handle cancellation of a scheduled payment
async function handleCancelPayment(
  body: CancelRequest,
  supabase: ReturnType<typeof getSupabase>
) {
  const { paymentScheduleId, reason } = body

  if (!paymentScheduleId) {
    return NextResponse.json(
      { error: 'Payment schedule ID is required' },
      { status: 400 }
    )
  }

  // Fetch the payment schedule
  const { data: schedule, error: fetchError } = await supabase
    .from('payment_schedules')
    .select('*, booking:bookings(id, email, first_name, last_name)')
    .eq('id', paymentScheduleId)
    .single()

  if (fetchError || !schedule) {
    return NextResponse.json(
      { error: 'Payment schedule not found' },
      { status: 404 }
    )
  }

  if (schedule.status === 'paid') {
    return NextResponse.json(
      { error: 'Cannot cancel a paid payment. Use refund instead.' },
      { status: 400 }
    )
  }

  if (schedule.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Payment is already cancelled' },
      { status: 400 }
    )
  }

  // Cancel the payment schedule
  const { error: updateError } = await supabase
    .from('payment_schedules')
    .update({
      status: 'cancelled',
      failure_reason: reason || 'Cancelled by admin',
    })
    .eq('id', paymentScheduleId)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 }
    )
  }

  // TODO: Send cancellation notification email

  return NextResponse.json({
    success: true,
    message: 'Payment cancelled successfully',
  })
}

// GET /api/admin/refunds - Get refund history for a booking (admin only)
export async function GET(request: NextRequest) {
  // Check admin authentication
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const bookingId = searchParams.get('booking_id')

  if (!bookingId) {
    return NextResponse.json(
      { error: 'Booking ID is required' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  const { data: refunds, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('payment_type', 'refund')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch refunds' },
      { status: 500 }
    )
  }

  return NextResponse.json({ refunds })
}
