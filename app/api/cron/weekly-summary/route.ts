import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendEmail,
  getAdminNotificationEmail,
  escapeHtml,
  wrapInLayout,
} from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no CRON_SECRET is set, allow requests (for development)
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not configured - allowing request')
    return true
  }

  return authHeader === `Bearer ${cronSecret}`
}

interface WeeklySummary {
  newBookings: number
  totalRevenue: number
  paymentsReceived: number
  paymentsFailed: number
  waitlistJoins: number
  waitlistAccepted: number
  waitlistDeclined: number
  feedbackReceived: number
  upcomingRetreats: Array<{
    destination: string
    startDate: string
    bookingsCount: number
    spotsRemaining: number
  }>
}

// GET /api/cron/weekly-summary - Send weekly summary email to admin
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoStr = weekAgo.toISOString()

  console.log(`[Cron] Generating weekly summary from ${weekAgoStr}`)

  try {
    // Get admin email (use general email for weekly reports)
    const adminEmail = await getAdminNotificationEmail('general')
    if (!adminEmail) {
      console.log('[Cron] No admin email configured for weekly summary')
      return NextResponse.json({ message: 'No admin email configured' })
    }

    // Gather statistics
    const summary: WeeklySummary = {
      newBookings: 0,
      totalRevenue: 0,
      paymentsReceived: 0,
      paymentsFailed: 0,
      waitlistJoins: 0,
      waitlistAccepted: 0,
      waitlistDeclined: 0,
      feedbackReceived: 0,
      upcomingRetreats: [],
    }

    // New bookings this week
    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoStr)
      .neq('status', 'cancelled')

    summary.newBookings = bookingsCount || 0

    // Payments received this week
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, status')
      .gte('created_at', weekAgoStr)
      .eq('status', 'succeeded')

    if (payments) {
      summary.paymentsReceived = payments.length
      summary.totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
    }

    // Failed payments this week
    const { count: failedCount } = await supabase
      .from('payment_schedules')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', weekAgoStr)
      .eq('status', 'failed')

    summary.paymentsFailed = failedCount || 0

    // Waitlist activity
    const { count: waitlistJoins } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoStr)

    summary.waitlistJoins = waitlistJoins || 0

    const { count: waitlistAccepted } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .gte('responded_at', weekAgoStr)
      .eq('status', 'accepted')

    summary.waitlistAccepted = waitlistAccepted || 0

    const { count: waitlistDeclined } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .gte('responded_at', weekAgoStr)
      .eq('status', 'declined')

    summary.waitlistDeclined = waitlistDeclined || 0

    // Feedback received
    const { count: feedbackCount } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoStr)

    summary.feedbackReceived = feedbackCount || 0

    // Upcoming retreats (next 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const { data: retreats } = await supabase
      .from('retreats')
      .select(`
        id, destination, start_date,
        bookings:bookings(count),
        retreat_rooms(available)
      `)
      .gte('start_date', now.toISOString())
      .lte('start_date', thirtyDaysFromNow.toISOString())
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('start_date', { ascending: true })

    if (retreats) {
      summary.upcomingRetreats = retreats.map(r => {
        const bookingsCountValue = Array.isArray(r.bookings) && r.bookings[0]
          ? (r.bookings[0] as { count: number }).count
          : 0
        const spotsRemaining = Array.isArray(r.retreat_rooms)
          ? r.retreat_rooms.reduce((sum: number, room: { available: number }) => sum + (room.available || 0), 0)
          : 0

        return {
          destination: r.destination,
          startDate: r.start_date,
          bookingsCount: bookingsCountValue,
          spotsRemaining,
        }
      })
    }

    // Build email HTML
    const htmlContent = `
      <h2>Weekly Summary Report</h2>
      <p>Here's what happened at Rainbow Surf Retreats this week (${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}):</p>

      <h3>Bookings & Revenue</h3>
      <div class="highlight-box">
        <p><strong>New Bookings:</strong> ${summary.newBookings}</p>
        <p><strong>Payments Received:</strong> ${summary.paymentsReceived}</p>
        <p><strong>Total Revenue:</strong> €${summary.totalRevenue.toFixed(2)}</p>
        ${summary.paymentsFailed > 0 ? `
          <p style="color: #ef4444;"><strong>Failed Payments:</strong> ${summary.paymentsFailed}</p>
        ` : ''}
      </div>

      <h3>Waitlist Activity</h3>
      <div class="highlight-box">
        <p><strong>New Waitlist Joins:</strong> ${summary.waitlistJoins}</p>
        <p><strong>Offers Accepted:</strong> ${summary.waitlistAccepted}</p>
        <p><strong>Offers Declined:</strong> ${summary.waitlistDeclined}</p>
      </div>

      ${summary.feedbackReceived > 0 ? `
        <h3>Feedback</h3>
        <div class="highlight-box">
          <p><strong>Feedback Received:</strong> ${summary.feedbackReceived}</p>
        </div>
      ` : ''}

      ${summary.upcomingRetreats.length > 0 ? `
        <h3>Upcoming Retreats (Next 30 Days)</h3>
        <div class="highlight-box">
          ${summary.upcomingRetreats.map(r => `
            <p>
              <strong>${escapeHtml(r.destination)}</strong> -
              ${new Date(r.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<br>
              <span style="color: #64748b; font-size: 14px;">
                ${r.bookingsCount} bookings | ${r.spotsRemaining} spots remaining
              </span>
            </p>
          `).join('')}
        </div>
      ` : `
        <h3>Upcoming Retreats</h3>
        <div class="highlight-box">
          <p style="color: #64748b;">No retreats scheduled in the next 30 days.</p>
        </div>
      `}

      <p style="text-align: center; margin: 30px 0;">
        <a href="${SITE_URL}/admin" class="button">View Admin Dashboard</a>
      </p>

      <p style="font-size: 14px; color: #64748b;">
        This is an automated weekly summary. You can disable this in
        <a href="${SITE_URL}/admin/settings">Admin Settings</a>.
      </p>
    `

    const fullHtml = wrapInLayout(htmlContent)

    await sendEmail({
      to: adminEmail,
      subject: `Weekly Summary - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      html: fullHtml,
      logContext: {
        emailType: 'weekly_summary',
        recipientType: 'admin',
        metadata: {
          newBookings: summary.newBookings,
          totalRevenue: summary.totalRevenue,
          paymentsReceived: summary.paymentsReceived,
          paymentsFailed: summary.paymentsFailed,
        },
      },
    })

    console.log(`[Cron] Weekly summary sent to ${adminEmail}`)

    return NextResponse.json({
      success: true,
      summary,
      message: 'Weekly summary sent successfully',
    })
  } catch (error) {
    console.error('[Cron] Weekly summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}

// Also support POST for Vercel cron
export async function POST(request: NextRequest) {
  return GET(request)
}
