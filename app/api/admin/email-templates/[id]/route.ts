import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function checkAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/email-templates/[id] - Get single template
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error fetching template:', error)
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/email-templates/[id] - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from('email_templates')
      .update({
        name: body.name,
        description: body.description,
        subject: body.subject,
        html_content: body.html_content,
        text_content: body.text_content,
        category: body.category,
        is_active: body.is_active,
        available_variables: body.available_variables,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/email-templates/[id] - Delete template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = getSupabase()

  try {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
