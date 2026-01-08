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
  outstandingPayments: number
  outstandingAmount: number
  waitlistJoins: number
  waitlistAccepted: number
  waitlistDeclined: number
  waitlistNotified: number
  feedbackReceived: number
  avgFeedbackRating: number
  npsScore: number | null
  upcomingRetreats: Array<{
    destination: string
    startDate: string
    bookingsCount: number
    spotsRemaining: number
    totalCapacity: number
    occupancyRate: number
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
      outstandingPayments: 0,
      outstandingAmount: 0,
      waitlistJoins: 0,
      waitlistAccepted: 0,
      waitlistDeclined: 0,
      waitlistNotified: 0,
      feedbackReceived: 0,
      avgFeedbackRating: 0,
      npsScore: null,
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

    // Outstanding payments (all pending)
    const { data: outstandingPayments } = await supabase
      .from('payment_schedules')
      .select('amount')
      .eq('status', 'pending')

    if (outstandingPayments) {
      summary.outstandingPayments = outstandingPayments.length
      summary.outstandingAmount = outstandingPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    }

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

    // Count how many were notified this week (for conversion rate)
    const { count: waitlistNotified } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .gte('notified_at', weekAgoStr)

    summary.waitlistNotified = waitlistNotified || 0

    // Feedback received this week with ratings
    const { data: feedbackData } = await supabase
      .from('retreat_feedback')
      .select('overall_rating, recommend_score')
      .gte('created_at', weekAgoStr)

    if (feedbackData && feedbackData.length > 0) {
      summary.feedbackReceived = feedbackData.length

      // Calculate average rating
      const ratingsWithValues = feedbackData.filter(f => f.overall_rating !== null)
      if (ratingsWithValues.length > 0) {
        summary.avgFeedbackRating = ratingsWithValues.reduce((sum, f) => sum + f.overall_rating, 0) / ratingsWithValues.length
      }

      // Calculate NPS score
      const npsResponses = feedbackData.filter(f => f.recommend_score !== null)
      if (npsResponses.length > 0) {
        const promoters = npsResponses.filter(f => f.recommend_score >= 9).length
        const detractors = npsResponses.filter(f => f.recommend_score <= 6).length
        summary.npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100)
      }
    }

    // Upcoming retreats (next 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const { data: retreats } = await supabase
      .from('retreats')
      .select(`
        id, destination, start_date,
        bookings:bookings(count),
        retreat_rooms(available, capacity)
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
        const rooms = Array.isArray(r.retreat_rooms) ? r.retreat_rooms : []
        const spotsRemaining = rooms.reduce((sum: number, room: { available: number }) => sum + (room.available || 0), 0)
        const totalCapacity = rooms.reduce((sum: number, room: { capacity: number }) => sum + (room.capacity || 0), 0)
        const occupancyRate = totalCapacity > 0 ? Math.round(((totalCapacity - spotsRemaining) / totalCapacity) * 100) : 0

        return {
          destination: r.destination,
          startDate: r.start_date,
          bookingsCount: bookingsCountValue,
          spotsRemaining,
          totalCapacity,
          occupancyRate,
        }
      })
    }

    // Calculate waitlist conversion rate
    const waitlistConversionRate = summary.waitlistNotified > 0
      ? Math.round((summary.waitlistAccepted / summary.waitlistNotified) * 100)
      : null

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
        ${summary.outstandingPayments > 0 ? `
          <p style="color: #f59e0b;"><strong>Outstanding Payments:</strong> ${summary.outstandingPayments} (€${summary.outstandingAmount.toFixed(2)} pending)</p>
        ` : ''}
      </div>

      <h3>Waitlist Activity</h3>
      <div class="highlight-box">
        <p><strong>New Waitlist Joins:</strong> ${summary.waitlistJoins}</p>
        <p><strong>Notifications Sent:</strong> ${summary.waitlistNotified}</p>
        <p><strong>Offers Accepted:</strong> ${summary.waitlistAccepted}</p>
        <p><strong>Offers Declined:</strong> ${summary.waitlistDeclined}</p>
        ${waitlistConversionRate !== null ? `
          <p><strong>Conversion Rate:</strong> ${waitlistConversionRate}%</p>
        ` : ''}
      </div>

      ${summary.feedbackReceived > 0 ? `
        <h3>Guest Feedback</h3>
        <div class="highlight-box">
          <p><strong>Responses Received:</strong> ${summary.feedbackReceived}</p>
          ${summary.avgFeedbackRating > 0 ? `
            <p><strong>Average Rating:</strong> ${summary.avgFeedbackRating.toFixed(1)}/5 ⭐</p>
          ` : ''}
          ${summary.npsScore !== null ? `
            <p>
              <strong>NPS Score:</strong>
              <span style="color: ${summary.npsScore >= 50 ? '#22c55e' : summary.npsScore >= 0 ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
                ${summary.npsScore}
              </span>
              <span style="font-size: 12px; color: #64748b;">
                (${summary.npsScore >= 50 ? 'Excellent' : summary.npsScore >= 0 ? 'Good' : 'Needs Improvement'})
              </span>
            </p>
          ` : ''}
        </div>
      ` : ''}

      ${summary.upcomingRetreats.length > 0 ? `
        <h3>Upcoming Retreats (Next 30 Days)</h3>
        <div class="highlight-box">
          ${summary.upcomingRetreats.map(r => `
            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0;">
                <strong>${escapeHtml(r.destination)}</strong> -
                ${new Date(r.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <div style="background: #f1f5f9; border-radius: 4px; height: 8px; overflow: hidden; margin-bottom: 8px;">
                <div style="background: ${r.occupancyRate >= 80 ? '#22c55e' : r.occupancyRate >= 50 ? '#f59e0b' : '#3b82f6'}; height: 100%; width: ${r.occupancyRate}%;"></div>
              </div>
              <span style="color: #64748b; font-size: 14px;">
                ${r.occupancyRate}% booked | ${r.spotsRemaining} of ${r.totalCapacity} spots remaining
              </span>
            </div>
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
