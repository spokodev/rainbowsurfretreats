import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Create a Stripe Customer Portal session
 *
 * Allows customers to:
 * - Update their payment method
 * - View payment history
 * - Download invoices
 *
 * Access methods:
 * 1. Via booking access token (from email link)
 * 2. Via booking ID with email verification
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookingId, accessToken, email } = body

    if (!bookingId && !accessToken) {
      return NextResponse.json(
        { error: 'Booking ID or access token required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Find booking by access token or by ID with email verification
    let booking
    if (accessToken) {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, stripe_customer_id, email, access_token_expires_at')
        .eq('access_token', accessToken)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Invalid access token' },
          { status: 401 }
        )
      }

      // Check if token is expired
      if (data.access_token_expires_at && new Date(data.access_token_expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Access token expired' },
          { status: 401 }
        )
      }

      booking = data
    } else {
      // Verify email matches booking
      if (!email) {
        return NextResponse.json(
          { error: 'Email required for booking ID access' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('id, stripe_customer_id, email')
        .eq('id', bookingId)
        .eq('email', email.toLowerCase())
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Booking not found or email mismatch' },
          { status: 404 }
        )
      }

      booking = data
    }

    if (!booking.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No payment information found for this booking' },
        { status: 400 }
      )
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: booking.stripe_customer_id,
      return_url: `${SITE_URL}/my-booking?token=${accessToken || ''}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}

/**
 * Generate a Customer Portal URL without creating a session
 * Useful for generating links to include in emails
 */
export async function generateCustomerPortalUrl(
  stripeCustomerId: string,
  bookingAccessToken?: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${SITE_URL}/my-booking${bookingAccessToken ? `?token=${bookingAccessToken}` : ''}`,
  })
  return session.url
}
