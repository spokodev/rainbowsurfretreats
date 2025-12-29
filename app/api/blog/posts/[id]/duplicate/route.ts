import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, BlogPost } from '@/lib/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/blog/posts/[id]/duplicate - Duplicate a blog post
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Fetch the original post
    const { data: originalPost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'Post not found' },
          { status: 404 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    // Generate unique slug by appending -copy and checking for uniqueness
    let newSlug = `${originalPost.slug}-copy`
    let slugSuffix = 1

    // Check if slug already exists and increment suffix if needed
    while (true) {
      const { data: existingPost } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle()

      if (!existingPost) break

      slugSuffix++
      newSlug = `${originalPost.slug}-copy-${slugSuffix}`
    }

    // Create duplicated post
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        title: `${originalPost.title} (Copy)`,
        slug: newSlug,
        content: originalPost.content,
        excerpt: originalPost.excerpt,
        featured_image: originalPost.featured_image,
        author_name: originalPost.author_name,
        author_id: user.id, // Set current user as author
        category_id: originalPost.category_id,
        meta_title: originalPost.meta_title,
        meta_description: originalPost.meta_description,
        tags: originalPost.tags,
        status: 'draft', // Always create as draft
        views: 0, // Reset views
        published_at: null, // Clear publish date
        scheduled_at: null, // Clear scheduled date
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error duplicating post:', insertError)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to duplicate post' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<BlogPost>>(
      { data: newPost as BlogPost, message: 'Post duplicated successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Duplicate post error:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
