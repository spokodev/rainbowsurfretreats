import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/newsletter/quiz
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriberId, responses } = body

    if (!subscriberId || !responses) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = getSupabase()

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

    // Update subscriber
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        quiz_completed: true,
        quiz_responses: responses,
        tags,
      })
      .eq('id', subscriberId)

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
