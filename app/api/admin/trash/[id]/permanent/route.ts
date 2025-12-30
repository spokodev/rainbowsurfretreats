import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/trash/[id]/permanent - Permanently delete an item (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const item_type = searchParams.get('type') as 'retreat' | 'blog_post'

    if (!item_type || !['retreat', 'blog_post'].includes(item_type)) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid type parameter. Must be "retreat" or "blog_post"' },
        { status: 400 }
      )
    }

    if (item_type === 'retreat') {
      // retreat_rooms will cascade delete automatically due to ON DELETE CASCADE
      const { error } = await supabase
        .from('retreats')
        .delete()
        .eq('id', id)
        .not('deleted_at', 'is', null) // Only delete if in trash

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id)
        .not('deleted_at', 'is', null)

      if (error) throw error
    }

    return NextResponse.json<ApiResponse<{ success: boolean; message: string }>>({
      data: {
        success: true,
        message: `${item_type === 'retreat' ? 'Retreat' : 'Blog post'} permanently deleted`,
      }
    })
  } catch (error) {
    console.error('Error permanently deleting item:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
