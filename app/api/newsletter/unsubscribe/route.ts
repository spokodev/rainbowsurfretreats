import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// GET /api/newsletter/unsubscribe?token=xxx
// Token-based unsubscribe for security (prevents unauthorized unsubscribes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    // Token is required for security
    if (!token || token.length !== 64) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=invalid_token`)
    }

    const supabase = getSupabase()

    // Find subscriber by unsubscribe token
    const { data: subscriber, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('unsubscribe_token', token)
      .single()

    if (findError || !subscriber) {
      console.error('Unsubscribe token not found:', token.substring(0, 8) + '...')
      return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=invalid_token`)
    }

    // Already unsubscribed
    if (subscriber.status === 'unsubscribed') {
      return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?status=already`)
    }

    // Update subscriber status
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('Unsubscribe update error:', updateError)
      return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=server_error`)
    }

    return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?status=success`)
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.redirect(`${SITE_URL}/newsletter/unsubscribed?error=server_error`)
  }
}
