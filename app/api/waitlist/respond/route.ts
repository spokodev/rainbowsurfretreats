import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWaitlistAccepted, sendWaitlistDeclined, sendAdminWaitlistResponseNotification } from '@/lib/email'
import type { ApiResponse } from '@/lib/types/database'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface RespondRequest {
  token: string
  action: 'accept' | 'decline'
}

// POST /api/waitlist/respond - Respond to a waitlist notification
export async function POST(request: NextRequest) {
  try {
    const body: RespondRequest = await request.json()
    const { token, action } = body

    if (!token || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Invalid request. Token and action (accept/decline) are required.',
      }, { status: 400 })
    }

    const supabase = getSupabase()

    // Find the waitlist entry by response token
    const { data: entry, error: fetchError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        retreat:retreats(id, destination, slug, start_date, end_date),
        room:retreat_rooms(id, name, price)
      `)
      .eq('response_token', token)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Invalid or expired response link. Please contact us for assistance.',
      }, { status: 404 })
    }

    // Check if already responded
    if (entry.status !== 'notified') {
      const statusMessages: Record<string, string> = {
        waiting: 'You have not been notified about an available spot yet.',
        accepted: 'You have already accepted this offer.',
        declined: 'You have already declined this offer.',
        expired: 'This offer has expired.',
        booked: 'You have already completed your booking.',
      }

      return NextResponse.json<ApiResponse<null>>({
        error: statusMessages[entry.status] || 'Invalid entry status.',
      }, { status: 400 })
    }

    // Check if notification has expired
    if (entry.notification_expires_at) {
      const expiresAt = new Date(entry.notification_expires_at)
      if (expiresAt < new Date()) {
        // Update status to expired
        await supabase
          .from('waitlist_entries')
          .update({ status: 'expired' })
          .eq('id', entry.id)

        return NextResponse.json<ApiResponse<null>>({
          error: 'This offer has expired. Please contact us if you are still interested.',
        }, { status: 410 })
      }
    }

    // Format retreat dates for emails
    const startDate = new Date(entry.retreat.start_date)
    const endDate = new Date(entry.retreat.end_date)
    const retreatDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    if (action === 'accept') {
      // Update status to accepted
      const { error: updateError } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', entry.id)

      if (updateError) {
        console.error('Error updating waitlist entry:', updateError)
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to process your response. Please try again.',
        }, { status: 500 })
      }

      // Build booking URL with prefilled data
      const bookingUrl = new URL(`${SITE_URL}/booking`)
      bookingUrl.searchParams.set('slug', entry.retreat.slug)
      if (entry.room_id) {
        bookingUrl.searchParams.set('room', entry.room_id)
      }
      bookingUrl.searchParams.set('waitlist', entry.id)
      bookingUrl.searchParams.set('email', entry.email)

      // Send acceptance confirmation email
      try {
        await sendWaitlistAccepted({
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          retreatDestination: entry.retreat.destination,
          retreatDates,
          bookingUrl: bookingUrl.toString(),
        })
      } catch (emailError) {
        console.error('Error sending waitlist accepted email:', emailError)
        // Don't fail the response if email fails
      }

      // Send admin notification
      try {
        await sendAdminWaitlistResponseNotification({
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          retreatDestination: entry.retreat.destination,
          retreatDates,
          roomName: entry.room?.name,
          action: 'accepted',
        })
      } catch (adminError) {
        console.error('Error sending admin waitlist response notification:', adminError)
      }

      return NextResponse.json<ApiResponse<{ bookingUrl: string }>>({
        data: { bookingUrl: bookingUrl.toString() },
        message: 'You have accepted the offer! Please complete your booking.',
      })
    } else {
      // action === 'decline'
      // Update status to declined
      const { error: updateError } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', entry.id)

      if (updateError) {
        console.error('Error updating waitlist entry:', updateError)
        return NextResponse.json<ApiResponse<null>>({
          error: 'Failed to process your response. Please try again.',
        }, { status: 500 })
      }

      // Send decline confirmation email
      try {
        await sendWaitlistDeclined({
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          retreatDestination: entry.retreat.destination,
        })
      } catch (emailError) {
        console.error('Error sending waitlist declined email:', emailError)
      }

      // Send admin notification
      try {
        await sendAdminWaitlistResponseNotification({
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          retreatDestination: entry.retreat.destination,
          retreatDates,
          roomName: entry.room?.name,
          action: 'declined',
        })
      } catch (adminError) {
        console.error('Error sending admin waitlist response notification:', adminError)
      }

      return NextResponse.json<ApiResponse<{ declined: boolean }>>({
        data: { declined: true },
        message: 'You have declined the offer. We hope to see you on a future retreat!',
      })
    }
  } catch (error) {
    console.error('Waitlist respond error:', error)
    return NextResponse.json<ApiResponse<null>>({
      error: 'Internal server error',
    }, { status: 500 })
  }
}

// GET /api/waitlist/respond?token=xxx - Check token status (for the page to validate before showing buttons)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json<ApiResponse<null>>({
      error: 'Token is required',
    }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .select(`
      id, status, notification_expires_at, first_name,
      retreat:retreats(destination, start_date, end_date),
      room:retreat_rooms(name, price)
    `)
    .eq('response_token', token)
    .single()

  if (error || !entry) {
    return NextResponse.json<ApiResponse<null>>({
      error: 'Invalid response link',
    }, { status: 404 })
  }

  // Check expiry
  let isExpired = false
  if (entry.notification_expires_at) {
    isExpired = new Date(entry.notification_expires_at) < new Date()
  }

  // Handle Supabase returning relations as arrays
  const retreat = Array.isArray(entry.retreat) ? entry.retreat[0] : entry.retreat
  const room = Array.isArray(entry.room) ? entry.room[0] : entry.room

  return NextResponse.json<ApiResponse<{
    status: string
    isExpired: boolean
    firstName: string
    retreatDestination: string
    expiresAt: string | null
    roomName?: string
    roomPrice?: number
  }>>({
    data: {
      status: isExpired && entry.status === 'notified' ? 'expired' : entry.status,
      isExpired,
      firstName: entry.first_name,
      retreatDestination: retreat?.destination || 'Unknown Retreat',
      expiresAt: entry.notification_expires_at,
      roomName: room?.name,
      roomPrice: room?.price,
    },
  })
}
