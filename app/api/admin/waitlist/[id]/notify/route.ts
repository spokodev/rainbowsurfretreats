import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { checkAdminAuth } from '@/lib/settings'
import { sendWaitlistSpotAvailable } from '@/lib/email'
import { monthsBetween } from '@/lib/payment-schedule'
import type { ApiResponse } from '@/lib/types/database'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'
const NOTIFICATION_HOURS = 72

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/admin/waitlist/[id]/notify - Send notification email to waitlist member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, isAdmin } = await checkAdminAuth()
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    // Fetch the waitlist entry with related data
    const { data: entry, error: fetchError } = await supabase
      .from('waitlist_entries')
      .select(`
        *,
        retreat:retreats(id, destination, slug, start_date, end_date),
        room:retreat_rooms(id, name, price, deposit_price)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Waitlist entry not found' }, { status: 404 })
    }

    // Check if already notified and not expired
    if (entry.status === 'notified' && entry.notification_expires_at) {
      const expiresAt = new Date(entry.notification_expires_at)
      if (expiresAt > new Date()) {
        return NextResponse.json<ApiResponse<null>>({
          error: 'This entry has already been notified and the offer is still active',
        }, { status: 400 })
      }
    }

    // Check if already accepted/booked
    if (entry.status === 'accepted' || entry.status === 'booked') {
      return NextResponse.json<ApiResponse<null>>({
        error: `This entry is already ${entry.status}`,
      }, { status: 400 })
    }

    // Check if retreat has already started
    const retreatStart = new Date(entry.retreat.start_date)
    if (retreatStart < new Date()) {
      return NextResponse.json<ApiResponse<null>>({
        error: 'Cannot notify - retreat has already started',
      }, { status: 400 })
    }

    // Generate response token
    const responseToken = randomUUID()

    // Calculate expiry time (72 hours from now)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + NOTIFICATION_HOURS * 60 * 60 * 1000)

    // Calculate deposit percentage based on time until retreat
    const monthsUntil = monthsBetween(now, retreatStart)
    const depositPercentage = monthsUntil >= 2 ? 10 : 50

    // Get room price (or first available room price if no specific room)
    let roomPrice = entry.room?.price
    let roomName = entry.room?.name

    if (!roomPrice) {
      // If no specific room, get the first available room from the retreat
      const { data: rooms } = await supabase
        .from('retreat_rooms')
        .select('id, name, price')
        .eq('retreat_id', entry.retreat_id)
        .eq('is_sold_out', false)
        .limit(1)
        .single()

      if (rooms) {
        roomPrice = rooms.price
        roomName = rooms.name
      } else {
        // Get any room for price reference
        const { data: anyRoom } = await supabase
          .from('retreat_rooms')
          .select('price, name')
          .eq('retreat_id', entry.retreat_id)
          .limit(1)
          .single()

        roomPrice = anyRoom?.price || 0
        roomName = anyRoom?.name || 'Standard Room'
      }
    }

    const depositAmount = (roomPrice * depositPercentage) / 100

    // Update waitlist entry
    const { error: updateError } = await supabase
      .from('waitlist_entries')
      .update({
        status: 'notified',
        notified_at: now.toISOString(),
        notification_expires_at: expiresAt.toISOString(),
        response_token: responseToken,
        updated_at: now.toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating waitlist entry:', updateError)
      return NextResponse.json<ApiResponse<null>>({ error: 'Failed to update waitlist entry' }, { status: 500 })
    }

    // Format retreat dates
    const startDate = new Date(entry.retreat.start_date)
    const endDate = new Date(entry.retreat.end_date)
    const retreatDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

    // Build accept/decline URLs
    const acceptUrl = `${SITE_URL}/waitlist/respond?token=${responseToken}&action=accept`
    const declineUrl = `${SITE_URL}/waitlist/respond?token=${responseToken}&action=decline`

    // Send notification email
    try {
      await sendWaitlistSpotAvailable({
        firstName: entry.first_name,
        lastName: entry.last_name,
        email: entry.email,
        retreatDestination: entry.retreat.destination,
        retreatDates,
        roomName,
        roomPrice,
        depositPercentage,
        depositAmount,
        expiresAt: expiresAt.toISOString(),
        acceptUrl,
        declineUrl,
      })

      console.log(`Waitlist notification sent to ${entry.email} for ${entry.retreat.destination}`)
    } catch (emailError) {
      console.error('Error sending waitlist notification email:', emailError)
      // Revert the status update if email fails
      await supabase
        .from('waitlist_entries')
        .update({
          status: 'waiting',
          notified_at: null,
          notification_expires_at: null,
          response_token: null,
        })
        .eq('id', id)

      return NextResponse.json<ApiResponse<null>>({
        error: 'Failed to send notification email',
      }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<{
      notifiedAt: string
      expiresAt: string
      email: string
    }>>({
      data: {
        notifiedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        email: entry.email,
      },
      message: `Notification sent to ${entry.email}. They have 72 hours to respond.`,
    })
  } catch (error) {
    console.error('Notify waitlist error:', error)
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}
