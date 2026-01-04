import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/newsletter/subscribers/export - Export subscribers as CSV
export async function GET(request: NextRequest) {
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const language = searchParams.get('language')

    let query = supabase
      .from('newsletter_subscribers')
      .select(`
        email,
        first_name,
        language,
        source,
        status,
        confirmed_at,
        unsubscribed_at,
        quiz_completed,
        created_at,
        last_booking_date
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (language) {
      query = query.eq('language', language)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error exporting subscribers:', error)
      return NextResponse.json({ error: 'Failed to export subscribers' }, { status: 500 })
    }

    // Build CSV content
    const headers = [
      'Email',
      'First Name',
      'Language',
      'Source',
      'Status',
      'Confirmed At',
      'Unsubscribed At',
      'Quiz Completed',
      'Subscribed At',
      'Last Booking Date',
    ]

    const rows = data.map((subscriber) => [
      subscriber.email,
      subscriber.first_name || '',
      subscriber.language || 'en',
      subscriber.source || '',
      subscriber.status,
      subscriber.confirmed_at || '',
      subscriber.unsubscribed_at || '',
      subscriber.quiz_completed ? 'Yes' : 'No',
      subscriber.created_at,
      subscriber.last_booking_date || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const str = String(cell)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(',')
      ),
    ].join('\n')

    // Return as downloadable CSV
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `newsletter-subscribers-${timestamp}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Export subscribers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
