import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BlogPost, BlogPostInsert, ApiResponse } from '@/lib/types/database'

// GET /api/blog/posts - List all blog posts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const search = searchParams.get('search')
    const slug = searchParams.get('slug')

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*)
      `, { count: 'exact' })
      .order('published_at', { ascending: false, nullsFirst: false })

    // Filter by slug (for single post lookup)
    if (slug) {
      query = query.eq('slug', slug)
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Filter by category
    if (category && category !== 'all') {
      // Get category ID from slug
      const { data: categoryData } = await supabase
        .from('blog_categories')
        .select('id')
        .eq('slug', category)
        .single()

      if (categoryData) {
        query = query.eq('category_id', categoryData.id)
      }
    }

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    // Pagination
    if (limit) {
      query = query.limit(parseInt(limit))
    }
    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit || '10') - 1))
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data as BlogPost[],
      count: count || 0
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/blog/posts - Create a new blog post
export async function POST(request: NextRequest) {
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

    const body: BlogPostInsert = await request.json()

    // Validate required fields
    if (!body.title || !body.slug || !body.content) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: title, slug, content' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (existingPost) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'A post with this slug already exists' },
        { status: 400 }
      )
    }

    // Set author_id and published_at if publishing
    const insertData: BlogPostInsert = {
      ...body,
      author_id: user.id,
    }

    if (body.status === 'published' && !body.published_at) {
      insertData.published_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(insertData)
      .select(`
        *,
        category:blog_categories(*)
      `)
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<BlogPost>>(
      { data: data as BlogPost, message: 'Blog post created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
