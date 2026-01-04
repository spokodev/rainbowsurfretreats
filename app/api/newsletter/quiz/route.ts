import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/newsletter/quiz
// Requires token for authentication - prevents unauthorized quiz submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, responses } = body

    // Token is required for security (prevents unauthorized submissions)
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid or missing token' }, { status: 401 })
    }

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'Missing quiz responses' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Find subscriber by their unsubscribe_token (used for all subscriber actions)
    const { data: subscriber, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('unsubscribe_token', token)
      .single()

    if (findError || !subscriber) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Generate tags based on responses
    const tags: string[] = []

    if (responses.experience) {
      tags.push(`experience:${responses.experience}`)
    }
    if (responses.interest) {
      tags.push(`interest:${responses.interest}`)
    }
    if (responses.travel_style) {
      tags.push(`style:${responses.travel_style}`)
    }
    if (responses.destination) {
      tags.push(`destination:${responses.destination}`)
    }

    // Update subscriber (use token-verified subscriber.id for safety)
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        quiz_completed: true,
        quiz_responses: responses,
        tags,
      })
      .eq('id', subscriber.id)

    if (error) {
      console.error('Quiz save error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Quiz error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
