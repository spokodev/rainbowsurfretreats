import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/trash/[id]/permanent - Permanently delete an item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
