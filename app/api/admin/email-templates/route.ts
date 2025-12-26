import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  subject: string
  html_content: string
  text_content: string | null
  category: string
  is_active: boolean
  available_variables: string[]
  created_at: string
  updated_at: string
}

// GET /api/admin/email-templates - Get all email templates
export async function GET() {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching email templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Email templates API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/email-templates - Create new template
export async function POST(request: NextRequest) {
  const supabase = getSupabase()

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        slug: body.slug,
        name: body.name,
        description: body.description,
        subject: body.subject,
        html_content: body.html_content,
        text_content: body.text_content,
        category: body.category || 'custom',
        is_active: body.is_active ?? true,
        available_variables: body.available_variables || [],
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Template with this slug already exists' }, { status: 400 })
      }
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
