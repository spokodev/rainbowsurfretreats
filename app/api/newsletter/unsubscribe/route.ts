import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// GET /api/newsletter/unsubscribe?email=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=missing_email`)
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('email', email.toLowerCase())

    if (error) {
      console.error('Unsubscribe error:', error)
    }

    return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed`)
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=server_error`)
  }
}
