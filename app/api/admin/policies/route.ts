import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface PolicySection {
  id: string
  section_key: string
  language: string
  title: string
  content: Record<string, unknown>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// GET /api/admin/policies - Get all policy sections
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language') || 'en'

    const { data, error } = await supabase
      .from('policy_sections')
      .select('*')
      .eq('language', language)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching policies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch policies' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/admin/policies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/policies - Update a policy section
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, title, content, is_active } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Policy ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('policy_sections')
      .update({
        title,
        content,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating policy:', error)
      return NextResponse.json(
        { error: 'Failed to update policy' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PUT /api/admin/policies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/policies - Create a new policy section
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { section_key, language, title, content, sort_order } = body

    if (!section_key || !language || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('policy_sections')
      .insert({
        section_key,
        language,
        title,
        content: content || {},
        sort_order: sort_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating policy:', error)
      return NextResponse.json(
        { error: 'Failed to create policy' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/admin/policies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
