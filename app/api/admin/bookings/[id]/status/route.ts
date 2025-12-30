import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

// Valid status transitions
const validTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  cancelled: [], // Terminal state - no transitions allowed
  completed: [], // Terminal state - no transitions allowed
}

interface StatusChangeRequest {
  status: BookingStatus
  reason?: string
}

// PUT /api/admin/bookings/[id]/status - Change booking status (admin only)
export async function PUT(
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
    const body: StatusChangeRequest = await request.json()
    const { status: newStatus, reason } = body

    // Validate new status
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: pending, confirmed, completed, cancelled' },
        { status: 400 }
      )
    }

    // Use cancel endpoint for cancellations
    if (newStatus === 'cancelled') {
      return NextResponse.json(
        { error: 'Use the /cancel endpoint to cancel bookings' },
        { status: 400 }
      )
    }

    // Fetch current booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, booking_number, status, payment_status, internal_notes')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const currentStatus = booking.status as BookingStatus

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
          allowedTransitions: validTransitions[currentStatus],
        },
        { status: 400 }
      )
    }

    // Additional validation for specific transitions
    if (newStatus === 'confirmed' && booking.payment_status === 'unpaid') {
      return NextResponse.json(
        { error: 'Cannot confirm booking without payment. Payment status is "unpaid".' },
        { status: 400 }
      )
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
        internal_notes: booking.internal_notes
          ? `${booking.internal_notes}\n\n[${new Date().toISOString()}] Status changed to ${newStatus}: ${reason || 'No reason provided'}`
          : `[${new Date().toISOString()}] Status changed to ${newStatus}: ${reason || 'No reason provided'}`,
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    // Log the status change action
    await supabase.from('booking_status_changes').insert({
      booking_id: bookingId,
      old_status: currentStatus,
      new_status: newStatus,
      old_payment_status: booking.payment_status,
      new_payment_status: booking.payment_status,
      changed_by_email: user.email,
      action: 'status_change',
      reason: reason || `Status changed from ${currentStatus} to ${newStatus}`,
    }).then(({ error }) => {
      if (error) {
        // Audit log is optional, don't fail if table doesn't exist
        console.log('Audit log not available:', error.message)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${newStatus}`,
      booking: {
        id: bookingId,
        booking_number: booking.booking_number,
        oldStatus: currentStatus,
        newStatus,
        payment_status: booking.payment_status,
      },
    })
  } catch (error) {
    console.error('Status change error:', error)
    return NextResponse.json(
      { error: 'Failed to update booking status' },
      { status: 500 }
    )
  }
}
