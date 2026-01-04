import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/newsletter/stats - Get overall newsletter statistics
export async function GET(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    // Subscriber stats
    const { data: subscribers } = await supabase
      .from('newsletter_subscribers')
      .select('status, language, source, created_at')

    const subscriberStats = {
      total: subscribers?.length || 0,
      active: subscribers?.filter((s) => s.status === 'active').length || 0,
      pending: subscribers?.filter((s) => s.status === 'pending').length || 0,
      unsubscribed: subscribers?.filter((s) => s.status === 'unsubscribed').length || 0,
      bounced: subscribers?.filter((s) => s.status === 'bounced').length || 0,
      byLanguage: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    }

    // Group by language
    subscribers?.forEach((s) => {
      const lang = s.language || 'en'
      subscriberStats.byLanguage[lang] = (subscriberStats.byLanguage[lang] || 0) + 1
    })

    // Group by source
    subscribers?.forEach((s) => {
      const source = s.source || 'unknown'
      subscriberStats.bySource[source] = (subscriberStats.bySource[source] || 0) + 1
    })

    // Campaign stats
    const { data: campaigns } = await supabase
      .from('newsletter_campaigns')
      .select('id, status')

    const campaignStats = {
      total: campaigns?.length || 0,
      draft: campaigns?.filter((c) => c.status === 'draft').length || 0,
      sent: campaigns?.filter((c) => c.status === 'sent').length || 0,
      scheduled: campaigns?.filter((c) => c.status === 'scheduled').length || 0,
    }

    // Overall email performance (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('status, sent_at')
      .gte('sent_at', thirtyDaysAgo.toISOString())

    const emailStats = {
      sent: recipients?.filter((r) => r.status !== 'pending').length || 0,
      delivered: recipients?.filter((r) =>
        ['delivered', 'opened', 'clicked'].includes(r.status)
      ).length || 0,
      opened: recipients?.filter((r) =>
        ['opened', 'clicked'].includes(r.status)
      ).length || 0,
      clicked: recipients?.filter((r) => r.status === 'clicked').length || 0,
      bounced: recipients?.filter((r) => r.status === 'bounced').length || 0,
    }

    const deliveryRate = emailStats.sent > 0
      ? Math.round((emailStats.delivered / emailStats.sent) * 100)
      : 0
    const openRate = emailStats.delivered > 0
      ? Math.round((emailStats.opened / emailStats.delivered) * 100)
      : 0
    const clickRate = emailStats.opened > 0
      ? Math.round((emailStats.clicked / emailStats.opened) * 100)
      : 0

    // Growth stats (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const newSubscribers = subscribers?.filter(
      (s) => new Date(s.created_at) >= sevenDaysAgo
    ).length || 0

    return NextResponse.json({
      subscribers: subscriberStats,
      campaigns: campaignStats,
      emailPerformance: {
        ...emailStats,
        deliveryRate,
        openRate,
        clickRate,
        period: '30 days',
      },
      growth: {
        newSubscribersLast7Days: newSubscribers,
        growthRate: subscriberStats.total > 0
          ? Math.round((newSubscribers / subscriberStats.total) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('Newsletter stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
