import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import {
  partialSiteSettingsSchema,
  defaultSettings,
  type SiteSettings,
} from '@/lib/validations/settings'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/settings - Get all settings
export async function GET() {
  // Check authentication and admin status
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
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

    // Transform array of {key, value} into object, merging with defaults
    const settings: SiteSettings = { ...defaultSettings }

    for (const item of data || []) {
      const key = item.key as keyof SiteSettings
      if (key in settings) {
        settings[key] = { ...settings[key], ...item.value }
      }
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('Settings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/settings - Update settings
export async function PUT(request: NextRequest) {
  // Check authentication and admin status
  const { user, isAdmin, error: authError } = await checkAdminAuth()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  const supabase = getSupabase()

  try {
    const body = await request.json()
    const { settings } = body as { settings: unknown }

    if (!settings) {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
    }

    // Validate settings with Zod
    const validationResult = partialSiteSettingsSchema.safeParse(settings)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      )
    }

    const validatedSettings = validationResult.data

    // Upsert each setting category
    const upsertPromises = Object.entries(validatedSettings).map(([key, value]) => {
      if (value === undefined) return Promise.resolve({ error: null })

      return supabase
        .from('site_settings')
        .upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        )
    })

    const results = await Promise.all(upsertPromises)

    // Check for any errors
    const dbErrors = results.filter((r) => r.error)
    if (dbErrors.length > 0) {
      console.error('Error updating settings:', dbErrors)
      return NextResponse.json(
        { error: 'Failed to update some settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
