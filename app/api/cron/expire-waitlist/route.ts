import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWaitlistExpired } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/cron/expire-waitlist - Expire waitlist notifications that have passed 72 hours
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date().toISOString()

  try {
    // Find all notified entries that have expired
    const { data: expiredEntries, error: fetchError } = await supabase
      .from('waitlist_entries')
      .select(`
        id, email, first_name, last_name,
        retreat:retreats(id, destination, slug, start_date, end_date)
      `)
      .eq('status', 'notified')
      .lt('notification_expires_at', now)

    if (fetchError) {
      console.error('Error fetching expired waitlist entries:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch expired entries' }, { status: 500 })
    }

    if (!expiredEntries || expiredEntries.length === 0) {
      return NextResponse.json({
        message: 'No expired waitlist notifications found',
        expired: 0,
      })
    }

    let expiredCount = 0
    let emailErrors = 0

    for (const entry of expiredEntries) {
      // Update status to expired
      const { error: updateError } = await supabase
        .from('waitlist_entries')
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('id', entry.id)

      if (updateError) {
        console.error(`Failed to expire waitlist entry ${entry.id}:`, updateError)
        continue
      }

      expiredCount++

      // Send expired notification email
      try {
        // Format retreat dates
        // The retreat relation returns as an array from Supabase, get first element
        const retreat = Array.isArray(entry.retreat) ? entry.retreat[0] : entry.retreat
        if (!retreat) {
          console.error(`No retreat found for entry ${entry.id}`)
          continue
        }

        const startDate = new Date(retreat.start_date)
        const endDate = new Date(retreat.end_date)
        const retreatDates = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

        await sendWaitlistExpired({
          firstName: entry.first_name,
          lastName: entry.last_name,
          email: entry.email,
          retreatDestination: retreat.destination,
          retreatDates,
          waitlistUrl: `${SITE_URL}/retreats/${retreat.slug}`,
        })

        console.log(`Sent expiry email to ${entry.email}`)
      } catch (emailError) {
        console.error(`Failed to send expiry email to ${entry.email}:`, emailError)
        emailErrors++
      }
    }

    return NextResponse.json({
      message: `Expired ${expiredCount} waitlist notifications`,
      expired: expiredCount,
      emailErrors,
      total: expiredEntries.length,
    })
  } catch (error) {
    console.error('Expire waitlist cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
