import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role client to bypass RLS
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Reject if no secret is configured (security requirement)
  if (!cronSecret) {
    console.error('CRON_SECRET not configured - rejecting request')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

// GET /api/cron/publish-scheduled - Publish scheduled blog posts
export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date().toISOString()

  console.log(`[Cron] Publishing scheduled posts at ${now}`)

  try {
    // Find all scheduled posts that are due for publishing
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, scheduled_at')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('[Cron] Error fetching scheduled posts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    if (!scheduledPosts || scheduledPosts.length === 0) {
      console.log('[Cron] No posts to publish')
      return NextResponse.json({ published: 0, message: 'No posts to publish' })
    }

    console.log(`[Cron] Found ${scheduledPosts.length} posts to publish`)

    const results = {
      published: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const post of scheduledPosts) {
      try {
        // Update post status to published
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            status: 'published',
            published_at: now,
          })
          .eq('id', post.id)

        if (updateError) {
          console.error(`[Cron] Error publishing post ${post.id}:`, updateError)
          results.failed++
          results.errors.push(`Post ${post.id} (${post.title}): ${updateError.message}`)
        } else {
          console.log(`[Cron] Published post: ${post.title} (${post.slug})`)
          results.published++
        }
      } catch (err) {
        const error = err as Error
        console.error(`[Cron] Error publishing post ${post.id}:`, error)
        results.failed++
        results.errors.push(`Post ${post.id} (${post.title}): ${error.message}`)
      }
    }

    console.log('[Cron] Publishing complete:', results)

    return NextResponse.json({
      ...results,
      message: `Published ${results.published} posts, ${results.failed} failed`,
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
