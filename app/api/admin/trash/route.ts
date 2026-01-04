import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse, TrashItem } from '@/lib/types/database'

// GET /api/admin/trash - Get all deleted items (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin authentication
    const { user, isAdmin } = await checkAdminAuth()
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    if (!isAdmin) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'retreat', 'blog_post', or null for all

    // Fetch deleted retreats
    let retreats: TrashItem[] = []
    if (!type || type === 'retreat') {
      const { data: deletedRetreats } = await supabase
        .from('retreats')
        .select('id, destination, deleted_at, deleted_by')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (deletedRetreats) {
        retreats = deletedRetreats.map(r => ({
          id: r.id,
          item_type: 'retreat' as const,
          title: r.destination,
          slug: null,
          deleted_at: r.deleted_at!,
          deleted_by: r.deleted_by,
          days_remaining: Math.max(0, 30 - Math.floor(
            (Date.now() - new Date(r.deleted_at!).getTime()) / (1000 * 60 * 60 * 24)
          ))
        }))
      }
    }

    // Fetch deleted blog posts
    let posts: TrashItem[] = []
    if (!type || type === 'blog_post') {
      const { data: deletedPosts } = await supabase
        .from('blog_posts')
        .select('id, title, slug, deleted_at, deleted_by')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (deletedPosts) {
        posts = deletedPosts.map(p => ({
          id: p.id,
          item_type: 'blog_post' as const,
          title: p.title,
          slug: p.slug,
          deleted_at: p.deleted_at!,
          deleted_by: p.deleted_by,
          days_remaining: Math.max(0, 30 - Math.floor(
            (Date.now() - new Date(p.deleted_at!).getTime()) / (1000 * 60 * 60 * 24)
          ))
        }))
      }
    }

    // Combine and sort by deleted_at
    const items = [...retreats, ...posts].sort(
      (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    )

    return NextResponse.json<ApiResponse<TrashItem[]>>({ data: items })
  } catch (error) {
    console.error('Error fetching trash:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
