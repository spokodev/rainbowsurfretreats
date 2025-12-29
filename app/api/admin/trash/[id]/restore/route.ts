import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/trash/[id]/restore - Restore a deleted item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { item_type } = body as { item_type: 'retreat' | 'blog_post' }

    if (!item_type || !['retreat', 'blog_post'].includes(item_type)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid item_type. Must be "retreat" or "blog_post"' },
        { status: 400 }
      )
    }

    if (item_type === 'retreat') {
      const { error } = await supabase
        .from('retreats')
        .update({
          deleted_at: null,
          deleted_by: null,
          // is_published remains false - admin can publish manually
        })
        .eq('id', id)
        .not('deleted_at', 'is', null)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          deleted_at: null,
          deleted_by: null,
          status: 'draft', // Restore as draft
        })
        .eq('id', id)
        .not('deleted_at', 'is', null)

      if (error) throw error
    }

    return NextResponse.json<ApiResponse<{ success: boolean; message: string }>>({
      data: {
        success: true,
        message: `${item_type === 'retreat' ? 'Retreat' : 'Blog post'} restored successfully`,
      }
    })
  } catch (error) {
    console.error('Error restoring item:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
