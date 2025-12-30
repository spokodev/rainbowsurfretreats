import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { BlogPost, BlogPostInsert, ApiResponse } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/blog/posts/[id] - Get a single blog post
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const incrementViews = searchParams.get('view') === 'true'

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Blog post not found' },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    // Increment views if requested
    if (incrementViews && data) {
      await supabase.rpc('increment_blog_views', { post_id: id })
    }

    return NextResponse.json<ApiResponse<BlogPost>>({ data: data as BlogPost })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/blog/posts/[id] - Update a blog post (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body: Partial<BlogPostInsert> = await request.json()

    // Check slug uniqueness if updating slug
    if (body.slug) {
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', body.slug)
        .neq('id', id)
        .single()

      if (existingPost) {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'A post with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Set published_at if publishing for the first time
    if (body.status === 'published') {
      const { data: currentPost } = await supabase
        .from('blog_posts')
        .select('published_at')
        .eq('id', id)
        .single()

      if (currentPost && !currentPost.published_at) {
        body.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(body)
      .eq('id', id)
      .select(`
        *,
        category:blog_categories(*)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Blog post not found' },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<BlogPost>>({
      data: data as BlogPost,
      message: 'Blog post updated successfully'
    })
  } catch (error) {
    console.error('Error updating blog post:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/blog/posts/[id] - Soft delete a blog post (admin only)
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

    // Soft delete: set deleted_at timestamp instead of actual deletion
    const { error } = await supabase
      .from('blog_posts')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        status: 'archived', // Change status to archived when deleted
      })
      .eq('id', id)
      .is('deleted_at', null) // Only delete if not already deleted

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Post moved to trash. It will be permanently deleted after 30 days.'
    })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
