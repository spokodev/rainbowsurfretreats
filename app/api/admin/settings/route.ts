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

export interface SiteSettings {
  general: {
    siteName: string
    siteDescription: string
    phoneNumber: string
  }
  email: {
    contactEmail: string
    supportEmail: string
  }
  notifications: {
    emailNotifications: boolean
    bookingAlerts: boolean
    paymentAlerts: boolean
    marketingEmails: boolean
    weeklyReports: boolean
  }
  payment: {
    currency: string
    depositPercentage: number
    stripeEnabled: boolean
    paypalEnabled: boolean
  }
  booking: {
    autoConfirm: boolean
    requireDeposit: boolean
    cancellationDays: number
    maxParticipants: number
  }
}

// GET /api/admin/settings - Get all settings
export async function GET() {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform array of {key, value} into object
    const settings: Partial<SiteSettings> = {}
    for (const item of data || []) {
      settings[item.key as keyof SiteSettings] = item.value
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  // Check authentication
  const { user, error: authError } = await checkAuth()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { settings } = body as { settings: Partial<SiteSettings> }

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    // Upsert each setting category
    const upsertPromises = Object.entries(settings).map(([key, value]) => {
      return supabase
        .from('site_settings')
        .upsert(
          { key, value },
          { onConflict: 'key' }
        )
    })

    const results = await Promise.all(upsertPromises)

    // Check for any errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Error updating settings:', errors)
      return NextResponse.json({ error: 'Failed to update some settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
