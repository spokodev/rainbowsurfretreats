import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { BlogPost, BlogPostInsert, ApiResponse } from '@/lib/types/database'
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '@/lib/deepseek'

// Helper to get localized post content
function getLocalizedPost(post: BlogPost, lang: SupportedLanguageCode): BlogPost {
  // If requesting primary language or no translations, return as-is
  if (!lang || lang === post.primary_language || !post.translations || Object.keys(post.translations).length === 0) {
    return post
  }

  // Get translation for requested language
  const translation = post.translations[lang]
  if (!translation) {
    return post // Fallback to primary language
  }

  // Merge translation with post data
  return {
    ...post,
    title: translation.title || post.title,
    slug: translation.slug || post.slug,
    excerpt: translation.excerpt || post.excerpt,
    content: translation.content || post.content,
    meta_title: translation.meta_title || post.meta_title,
    meta_description: translation.meta_description || post.meta_description,
  }
}

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
    const lang = (searchParams.get('lang') || 'en') as SupportedLanguageCode

    // New pagination params
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const sort = searchParams.get('sort') || 'published_at'
    const order = searchParams.get('order') || 'desc'

    let query = supabase
      .from('blog_posts')
      .select(`
        *,
        category:blog_categories(*)
      `, { count: 'exact' })
      .is('deleted_at', null)

    // Sorting
    const validSortColumns = ['published_at', 'created_at', 'title', 'views']
    const sortColumn = validSortColumns.includes(sort) ? sort : 'published_at'
    const ascending = order === 'asc'
    query = query.order(sortColumn, { ascending, nullsFirst: false })

    // Filter by slug (for single post lookup)
    // Also search in translations if language is specified
    if (slug) {
      if (lang && lang !== 'en') {
        // Search in translations.{lang}.slug or primary slug
        query = query.or(`slug.eq.${slug},translations->>${lang}->>slug.eq.${slug}`)
      } else {
        query = query.eq('slug', slug)
      }
    }

    // Filter by status
    if (status && status !== 'all') {
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

    // Pagination - prefer new page/pageSize params
    if (searchParams.has('page')) {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    } else if (limit) {
      // Legacy pagination support
      query = query.limit(parseInt(limit))
      if (offset) {
        query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit || '10') - 1))
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      )
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    // Apply localization if language is specified
    const localizedData = lang && SUPPORTED_LANGUAGES[lang]
      ? (data as BlogPost[]).map(post => getLocalizedPost(post, lang))
      : data as BlogPost[]

    return NextResponse.json({
      data: localizedData,
      count: total,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      }
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/blog/posts - Create a new blog post (admin only)
export async function POST(request: NextRequest) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      primary_language: (body as any).primary_language || 'en',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      translations: (body as any).translations || {},
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
      console.error('Error creating blog post:', error)
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Failed to create blog post' },
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
