import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import type { BlogCategory, BlogCategoryInsert, ApiResponse } from '@/lib/types/database'

// GET /api/blog/categories - List all categories
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<BlogCategory[]>>({ data: data as BlogCategory[] })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/blog/categories - Create a new category (admin only)
export async function POST(request: NextRequest) {
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
    const supabase = await createClient()

    const body: BlogCategoryInsert = await request.json()

    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json<ApiResponse<null>>(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('blog_categories')
      .insert(body)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json<ApiResponse<null>>(
          { error: 'A category with this name or slug already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json<ApiResponse<null>>(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<BlogCategory>>(
      { data: data as BlogCategory, message: 'Category created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json<ApiResponse<null>>(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
