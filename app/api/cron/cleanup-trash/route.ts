import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS
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

// GET /api/cron/cleanup-trash - Clean up items deleted > 30 days ago
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 30)
  const cutoffISO = cutoffDate.toISOString()

  console.log(`[Cron] Cleaning up trash items deleted before ${cutoffISO}`)

  try {
    // Delete old retreats (rooms cascade automatically due to ON DELETE CASCADE)
    const { data: deletedRetreats, error: retreatError } = await supabase
      .from('retreats')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffISO)
      .select('id')

    if (retreatError) {
      console.error('[Cron] Error deleting retreats:', retreatError)
    }

    // Delete old blog posts
    const { data: deletedPosts, error: postError } = await supabase
      .from('blog_posts')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffISO)
      .select('id')

    if (postError) {
      console.error('[Cron] Error deleting blog posts:', postError)
    }

    const retreatsCount = deletedRetreats?.length || 0
    const postsCount = deletedPosts?.length || 0

    console.log(`[Cron] Cleanup complete: ${retreatsCount} retreats, ${postsCount} posts`)

    return NextResponse.json({
      success: true,
      deleted_retreats: retreatsCount,
      deleted_blog_posts: postsCount,
      message: `Permanently deleted ${retreatsCount} retreats and ${postsCount} blog posts`
    })
  } catch (error) {
    console.error('[Cron] Cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for Vercel cron
export async function POST(request: NextRequest) {
  return GET(request)
}
