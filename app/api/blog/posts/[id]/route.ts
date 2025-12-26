import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

// PUT /api/blog/posts/[id] - Update a blog post
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

// DELETE /api/blog/posts/[id] - Delete a blog post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({
      message: 'Blog post deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
