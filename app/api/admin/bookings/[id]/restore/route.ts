import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { sendBookingRestored } from '@/lib/email'
import { stripe } from '@/lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RestoreBookingRequest {
  newDueDate?: string // ISO date string for new payment deadline
  sendPaymentLink?: boolean
  sendEmail?: boolean
  notes?: string
}

/**
 * POST /api/admin/bookings/[id]/restore - Restore a cancelled booking (admin only)
 *
 * This endpoint:
 * 1. Validates the booking is cancelled
 * 2. Checks room availability
 * 3. Restores booking status to 'pending'
 * 4. Resets failed payment schedules
 * 5. Decrements room availability
 * 6. Optionally generates a payment link
 * 7. Sends restoration email to customer
 */
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
    const body: RestoreBookingRequest = await request.json()
    const { newDueDate, sendPaymentLink = true, sendEmail = true, notes } = body

    // Fetch the booking with related data
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        retreat:retreats(id, title, destination, start_date, end_date, slug),
        room:retreat_rooms(id, name, available)
      `)
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if booking is cancelled
    if (booking.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only cancelled bookings can be restored' },
        { status: 400 }
      )
    }

    // Check if retreat hasn't started yet
    if (booking.retreat?.start_date) {
      const retreatStart = new Date(booking.retreat.start_date)
      if (retreatStart <= new Date()) {
        return NextResponse.json(
          { error: 'Cannot restore booking for a retreat that has already started' },
          { status: 400 }
        )
      }
    }

    // Check room availability
    if (booking.room) {
      const guestsNeeded = booking.guests_count || 1
      if (booking.room.available < guestsNeeded) {
        return NextResponse.json(
          {
            error: 'Room not available',
            details: `Room "${booking.room.name}" has ${booking.room.available} spots available, but ${guestsNeeded} needed.`,
            canForceRestore: true,
          },
          { status: 409 }
        )
      }
    }

    // Calculate new payment deadline
    const paymentDeadline = newDueDate
      ? new Date(newDueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

    // Restore booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'pending',
        restored_at: new Date().toISOString(),
        restored_by: user.id,
        cancelled_at: null,
        internal_notes: booking.internal_notes
          ? `${booking.internal_notes}\n\n[${new Date().toISOString()}] Restored by admin: ${notes || 'No notes'}`
          : `[${new Date().toISOString()}] Restored by admin: ${notes || 'No notes'}`,
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error restoring booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to restore booking' },
        { status: 500 }
      )
    }

    // Reset failed/cancelled payment schedules
    const { error: scheduleError } = await supabase
      .from('payment_schedules')
      .update({
        status: 'pending',
        due_date: paymentDeadline.toISOString().split('T')[0],
        attempts: 0,
        failed_at: null,
        payment_deadline: paymentDeadline.toISOString(),
        reminder_stage: null,
        failure_reason: null,
        last_reminder_sent_at: null,
      })
      .eq('booking_id', bookingId)
      .in('status', ['cancelled', 'failed'])

    if (scheduleError) {
      console.error('Error resetting payment schedules:', scheduleError)
    }

    // Decrement room availability
    if (booking.room_id) {
      const { error: roomError } = await supabase.rpc('decrement_room_availability', {
        room_id: booking.room_id,
        amount: booking.guests_count || 1,
      })

      if (roomError) {
        // Try direct update if RPC doesn't exist
        await supabase
          .from('retreat_rooms')
          .update({
            available: (booking.room?.available || 1) - (booking.guests_count || 1),
          })
          .eq('id', booking.room_id)
      }
    }

    // Generate payment link if requested
    let paymentLinkUrl: string | null = null
    if (sendPaymentLink && booking.stripe_customer_id) {
      try {
        // Get the pending payment schedule
        const { data: pendingSchedule } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('booking_id', bookingId)
          .eq('status', 'pending')
          .order('payment_number', { ascending: true })
          .limit(1)
          .single()

        if (pendingSchedule) {
          // Create Stripe Payment Link
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [
              {
                price_data: {
                  currency: 'eur',
                  product_data: {
                    name: `Payment for ${booking.retreat?.title || 'Retreat'} - ${booking.booking_number}`,
                    description: pendingSchedule.description || `Payment ${pendingSchedule.payment_number}`,
                  },
                  unit_amount: Math.round(pendingSchedule.amount * 100),
                },
                quantity: 1,
              },
            ],
            metadata: {
              booking_id: bookingId,
              payment_schedule_id: pendingSchedule.id,
              type: 'restored_booking_payment',
            },
            after_completion: {
              type: 'redirect',
              redirect: {
                url: `${SITE_URL}/my-booking?token=${booking.access_token || ''}&payment=success`,
              },
            },
          })

          paymentLinkUrl = paymentLink.url
        }
      } catch (linkError) {
        console.error('Error creating payment link:', linkError)
        // Don't fail the restore if payment link creation fails
      }
    }

    // Send restoration email if requested
    if (sendEmail) {
      try {
        const retreatDates = booking.retreat
          ? `${new Date(booking.retreat.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
          : 'TBD'

        await sendBookingRestored({
          bookingNumber: booking.booking_number,
          firstName: booking.first_name,
          lastName: booking.last_name,
          email: booking.email,
          retreatDestination: booking.retreat?.destination || 'Unknown',
          retreatDates,
          newDueDate: paymentDeadline.toISOString(),
          amountDue: booking.balance_due,
          paymentLinkUrl: paymentLinkUrl || undefined,
          myBookingUrl: `${SITE_URL}/my-booking?token=${booking.access_token || ''}`,
          language: booking.language || 'en',
        })
        console.log(`Restoration email sent to ${booking.email}`)
      } catch (emailError) {
        console.error('Error sending restoration email:', emailError)
        // Don't fail the request if email fails
      }
    }

    // Log the restoration action
    await supabase.from('booking_status_changes').insert({
      booking_id: bookingId,
      old_status: 'cancelled',
      new_status: 'pending',
      old_payment_status: booking.payment_status,
      new_payment_status: booking.payment_status,
      changed_by_email: user.email,
      action: 'restoration',
      reason: notes || 'Restored by admin',
      metadata: {
        new_due_date: paymentDeadline.toISOString(),
        send_email: sendEmail,
        send_payment_link: sendPaymentLink,
        payment_link_url: paymentLinkUrl,
      },
    }).then(({ error }) => {
      if (error) {
        console.log('Audit log not available:', error.message)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Booking restored successfully',
      booking: {
        id: bookingId,
        booking_number: booking.booking_number,
        status: 'pending',
        payment_status: booking.payment_status,
      },
      paymentDeadline: paymentDeadline.toISOString(),
      paymentLinkUrl,
      emailSent: sendEmail,
    })
  } catch (error) {
    console.error('Restore booking error:', error)
    return NextResponse.json(
      { error: 'Failed to restore booking' },
      { status: 500 }
    )
  }
}
