import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/policies - Get active policy sections for public display
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const requestedLanguage = searchParams.get('language') || 'en'

    // BUG-017 FIX: Try requested language first, fallback to English if no results
    let { data, error } = await supabase
      .from('policy_sections')
      .select('section_key, title, content, sort_order')
      .eq('language', requestedLanguage)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching policies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch policies' },
        { status: 500 }
      )
    }

    // BUG-017 FIX: Fallback to English if no policies found for requested language
    if ((!data || data.length === 0) && requestedLanguage !== 'en') {
      console.log(`No policies found for language '${requestedLanguage}', falling back to English`)
      const fallbackResult = await supabase
        .from('policy_sections')
        .select('section_key, title, content, sort_order')
        .eq('language', 'en')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!fallbackResult.error) {
        data = fallbackResult.data
      }
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error in GET /api/policies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
