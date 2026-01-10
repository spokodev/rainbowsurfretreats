import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitlistJoinSchema } from '@/lib/validations/booking'
import { checkRateLimit, getClientIp, rateLimitPresets, rateLimitHeaders } from '@/lib/utils/rate-limit'
import { sendWaitlistConfirmation, sendAdminWaitlistJoinNotification } from '@/lib/email'
import type { ApiResponse, WaitlistEntry } from '@/lib/types/database'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/waitlist - Join waitlist
export async function POST(request: NextRequest) {
  // Rate limiting - 5 requests per hour per IP (bypassed for load tests in dev)
  const clientIp = getClientIp(request)
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.waitlist, request)

  if (!rateLimitResult.success) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()

    // Validate input
    const validation = waitlistJoinSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json<ApiResponse<null>>(
        { error: firstError.message },
        { status: 400 }
      )
    }

    const { retreatId, roomId, firstName, lastName, email, phone, guestsCount, notes } = validation.data
    const supabase = getSupabase()

    // Check if retreat exists and is published
    const { data: retreat, error: retreatError } = await supabase
      .from('retreats')
      .select('id, destination, is_published, start_date, end_date')
      .eq('id', retreatId)
      .single()

    if (retreatError || !retreat) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Retreat not found' },
        { status: 404 }
      )
    }

    if (!retreat.is_published) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'This retreat is not available' },
        { status: 400 }
      )
    }

    // Check if retreat has already started
    const retreatStart = new Date(retreat.start_date)
    if (retreatStart < new Date()) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'This retreat has already started' },
        { status: 400 }
      )
    }

    // If room specified, verify it exists and is sold out
    let roomName = 'Any available room'
    if (roomId) {
      const { data: room, error: roomError } = await supabase
        .from('retreat_rooms')
        .select('id, name, is_sold_out, available')
        .eq('id', roomId)
        .eq('retreat_id', retreatId)
        .single()

      if (roomError || !room) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Room not found' },
          { status: 404 }
        )
      }

      // Only allow waitlist if room is actually sold out
      if (!room.is_sold_out && room.available > 0) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'This room is still available. Please proceed with booking.' },
          { status: 400 }
        )
      }

      roomName = room.name
    }

    // Check if already on waitlist for this retreat
    const { data: existing } = await supabase
      .from('waitlist_entries')
      .select('id, position, status')
      .eq('retreat_id', retreatId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      // If already on waitlist, return current position
      if (existing.status === 'waiting' || existing.status === 'notified') {
        return NextResponse.json<ApiResponse<{ position: number; status: string }>>({
          data: {
            position: existing.position,
            status: existing.status
          },
          message: 'You are already on the waitlist for this retreat'
        })
      }

      // If expired/declined, allow rejoining
      if (existing.status === 'expired' || existing.status === 'declined') {
        // Update existing entry to waiting status
        const { data: updated, error: updateError } = await supabase
          .from('waitlist_entries')
          .update({
            status: 'waiting',
            room_id: roomId || null,
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            guests_count: guestsCount,
            notes: notes || null,
            notified_at: null,
            notification_expires_at: null,
            responded_at: null,
            response_token: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('position')
          .single()

        if (updateError) {
          console.error('Failed to update waitlist entry:', updateError)
          return NextResponse.json<ApiResponse<null>>(
            { error: 'Failed to rejoin waitlist' },
            { status: 500 }
          )
        }

        // Format retreat dates for emails
        const startDate = new Date(retreat.start_date)
        const endDate = new Date(retreat.end_date)
        const retreatDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

        // Send confirmation email for rejoin
        try {
          await sendWaitlistConfirmation({
            email,
            firstName,
            lastName,
            retreatDestination: retreat.destination,
            retreatDates,
            roomName: roomId ? roomName : undefined,
            position: updated.position,
          })
        } catch (emailError) {
          console.error('Failed to send waitlist confirmation email:', emailError)
        }

        // Send admin notification for rejoin
        try {
          await sendAdminWaitlistJoinNotification({
            firstName,
            lastName,
            email,
            phone: phone || undefined,
            retreatDestination: retreat.destination,
            retreatDates,
            roomName: roomId ? roomName : undefined,
            guestsCount,
            notes: notes || undefined,
            position: updated.position,
          })
        } catch (adminEmailError) {
          console.error('Failed to send admin notification email:', adminEmailError)
        }

        return NextResponse.json<ApiResponse<{ position: number }>>({
          data: { position: updated.position },
          message: `You have rejoined the waitlist at position #${updated.position}`
        })
      }

      // If booked or accepted, don't allow
      return NextResponse.json<ApiResponse<null>>(
        { error: 'You have already booked or accepted an offer for this retreat' },
        { status: 400 }
      )
    }

    // Create new waitlist entry (position is set by trigger)
    const { data: entry, error: insertError } = await supabase
      .from('waitlist_entries')
      .insert({
        retreat_id: retreatId,
        room_id: roomId || null,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        guests_count: guestsCount,
        notes: notes || null,
        status: 'waiting',
        position: 0, // Will be set by trigger
      })
      .select('id, position')
      .single()

    if (insertError) {
      console.error('Failed to create waitlist entry:', insertError)

      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'You are already on the waitlist for this retreat' },
          { status: 409 }
        )
      }

      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    // Send confirmation email
    const startDate = new Date(retreat.start_date)
    const endDate = new Date(retreat.end_date)
    const retreatDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    try {
      await sendWaitlistConfirmation({
        email,
        firstName,
        lastName,
        retreatDestination: retreat.destination,
        retreatDates,
        roomName: roomId ? roomName : undefined,
        position: entry.position,
      })
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error('Failed to send waitlist confirmation email:', emailError)
    }

    // Send admin notification
    try {
      await sendAdminWaitlistJoinNotification({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        retreatDestination: retreat.destination,
        retreatDates,
        roomName: roomId ? roomName : undefined,
        guestsCount,
        notes: notes || undefined,
        position: entry.position,
      })
    } catch (adminEmailError) {
      // Log but don't fail the request if admin email fails
      console.error('Failed to send admin notification email:', adminEmailError)
    }

    return NextResponse.json<ApiResponse<{ position: number }>>({
      data: { position: entry.position },
      message: `You have been added to the waitlist at position #${entry.position}`
    }, { status: 201 })

  } catch (error) {
    console.error('Waitlist join error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/waitlist?retreatId=xxx&email=xxx - Check position
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const retreatId = searchParams.get('retreatId')
  const email = searchParams.get('email')

  if (!retreatId || !email) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'retreatId and email are required' },
      { status: 400 }
    )
  }

  const supabase = getSupabase()

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .select('id, status, created_at')
    .eq('retreat_id', retreatId)
    .eq('email', email.toLowerCase())
    .single()

  if (error || !entry) {
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Not on waitlist' },
      { status: 404 }
    )
  }

  // BUG-008 FIX: Use dynamic position calculation instead of stored value
  let position = 0
  if (entry.status === 'waiting' || entry.status === 'notified') {
    const { data: positionData } = await supabase.rpc('get_waitlist_position', {
      entry_id: entry.id
    })
    position = positionData || 0
  }

  return NextResponse.json<ApiResponse<{ position: number; status: string }>>({
    data: {
      position,
      status: entry.status
    }
  })
}
