import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { sendBookingCancellation } from '@/lib/email'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface CancelBookingRequest {
  reason?: string
  sendEmail?: boolean
}

// POST /api/admin/bookings/[id]/cancel - Cancel a booking (admin only)
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
    const body: CancelBookingRequest = await request.json()
    const { reason, sendEmail = true } = body

    // Fetch the booking with related data
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        retreat:retreats(id, destination, start_date, end_date),
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

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // Cancel all pending payment schedules
    const { error: scheduleError } = await supabase
      .from('payment_schedules')
      .update({
        status: 'cancelled',
        failure_reason: reason || 'Booking cancelled by admin',
      })
      .eq('booking_id', bookingId)
      .in('status', ['pending', 'processing'])

    if (scheduleError) {
      console.error('Error cancelling payment schedules:', scheduleError)
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        internal_notes: booking.internal_notes
          ? `${booking.internal_notes}\n\n[${new Date().toISOString()}] Cancelled by admin: ${reason || 'No reason provided'}`
          : `[${new Date().toISOString()}] Cancelled by admin: ${reason || 'No reason provided'}`,
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      )
    }

    // Return room availability on cancellation (using actual guests_count)
    if (booking.room_id) {
      const { error: incrementError } = await supabase.rpc('increment_room_availability', {
        room_uuid: booking.room_id,
        increment_count: booking.guests_count || 1
      })

      if (incrementError) {
        console.error('Error returning room availability:', incrementError)
      } else {
        console.log(`Room ${booking.room_id} availability restored after cancellation`)
      }
    }

    // BUG-006 FIX: Clean up promo code redemption on cancellation
    if (booking.promo_code_id) {
      // Delete the redemption record
      const { error: redemptionError } = await supabase
        .from('promo_code_redemptions')
        .delete()
        .eq('booking_id', bookingId)

      if (redemptionError) {
        console.error('Error deleting promo redemption:', redemptionError)
      }

      // Decrement the usage counter
      const { error: decrementError } = await supabase.rpc('decrement_promo_code_usage', {
        code_id: booking.promo_code_id
      })

      if (decrementError) {
        console.error('Error decrementing promo code usage:', decrementError)
      } else {
        console.log(`Promo code ${booking.promo_code_id} usage decremented after cancellation`)
      }
    }

    // Send cancellation email if requested
    if (sendEmail) {
      try {
        await sendBookingCancellation({
          booking: {
            id: booking.id,
            booking_number: booking.booking_number,
            first_name: booking.first_name,
            last_name: booking.last_name,
            email: booking.email,
            total_amount: booking.total_amount,
            deposit_amount: booking.deposit_amount,
            payment_status: booking.payment_status,
            language: booking.language || 'en',
            retreat: booking.retreat,
          },
          reason,
        })
        console.log(`Cancellation email sent to ${booking.email}`)
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Log the cancellation action
    await supabase.from('booking_status_changes').insert({
      booking_id: bookingId,
      old_status: booking.status,
      new_status: 'cancelled',
      old_payment_status: booking.payment_status,
      new_payment_status: booking.payment_status, // payment_status doesn't change on cancel
      changed_by_email: user.email,
      action: 'cancellation',
      reason: reason || 'Cancelled by admin',
      metadata: {
        send_email: sendEmail,
        cancelled_schedules: scheduleError ? 0 : 'all pending',
      },
    }).then(({ error }) => {
      if (error) {
        // Audit log is optional, don't fail if table doesn't exist
        console.log('Audit log not available:', error.message)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: bookingId,
        booking_number: booking.booking_number,
        status: 'cancelled',
        payment_status: booking.payment_status,
      },
      emailSent: sendEmail,
      note: booking.payment_status !== 'unpaid'
        ? 'Note: If a refund is needed, please process it separately from the Payments page.'
        : undefined,
    })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}
