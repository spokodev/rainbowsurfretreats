import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import { z } from 'zod'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Validation schema for campaign
const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  subject_en: z.string().min(1, 'English subject is required'),
  subject_de: z.string().optional().nullable(),
  subject_es: z.string().optional().nullable(),
  subject_fr: z.string().optional().nullable(),
  subject_nl: z.string().optional().nullable(),
  body_en: z.string().min(1, 'English body is required'),
  body_de: z.string().optional().nullable(),
  body_es: z.string().optional().nullable(),
  body_fr: z.string().optional().nullable(),
  body_nl: z.string().optional().nullable(),
  target_languages: z.array(z.string()).default(['en']),
  target_tags: z.array(z.string()).optional().default([]),
  target_status: z.enum(['active', 'all']).default('active'),
  scheduled_at: z.string().optional().nullable(),
})

// GET /api/admin/newsletter/campaigns - List all campaigns
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
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('newsletter_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: campaigns, error, count } = await query

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    // Get stats in a single query (fix N+1 problem)
    // Use aggregation instead of fetching per campaign
    const campaignIds = campaigns.map((c) => c.id)

    let statsMap: Record<string, { total: number; sent: number; delivered: number; opened: number; clicked: number; bounced: number; failed: number }> = {}

    if (campaignIds.length > 0) {
      // Single aggregated query for all campaign stats
      const { data: statsData } = await supabase
        .from('campaign_recipients')
        .select('campaign_id, status')
        .in('campaign_id', campaignIds)

      if (statsData) {
        // Group and aggregate stats
        for (const recipient of statsData) {
          if (!statsMap[recipient.campaign_id]) {
            statsMap[recipient.campaign_id] = { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }
          }
          const stat = statsMap[recipient.campaign_id]
          stat.total++
          if (recipient.status !== 'pending') stat.sent++
          if (['delivered', 'opened', 'clicked'].includes(recipient.status)) stat.delivered++
          if (['opened', 'clicked'].includes(recipient.status)) stat.opened++
          if (recipient.status === 'clicked') stat.clicked++
          if (recipient.status === 'bounced') stat.bounced++
          if (recipient.status === 'failed') stat.failed++
        }
      }
    }

    // Combine campaigns with their stats
    const campaignsWithStats = campaigns.map((campaign) => {
      const stat = statsMap[campaign.id] || { total: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }
      return {
        ...campaign,
        stats: {
          ...stat,
          openRate: stat.delivered > 0 ? Math.round((stat.opened / stat.delivered) * 100) : 0,
          clickRate: stat.opened > 0 ? Math.round((stat.clicked / stat.opened) * 100) : 0,
        },
      }
    })

    return NextResponse.json({
      data: campaignsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Campaigns API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/newsletter/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()

    const validationResult = campaignSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    const campaignData = validationResult.data

    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .insert({
        ...campaignData,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Create campaign error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
