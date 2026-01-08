import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAdminAuth } from '@/lib/settings'
import {
  partialSiteSettingsSchema,
  defaultSettings,
  adminNotificationsSettingsSchema,
  type SiteSettings,
  type AdminNotificationsSettings,
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
    let adminNotifications: AdminNotificationsSettings | null = null

    for (const item of data || []) {
      if (item.key === 'admin_notifications') {
        adminNotifications = item.value as AdminNotificationsSettings
      } else {
        const key = item.key as keyof SiteSettings
        if (key in settings) {
          settings[key] = { ...settings[key], ...item.value }
        }
      }
    }

    return NextResponse.json({ data: settings, adminNotifications })
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
    const { settings, adminNotifications } = body as { settings: unknown; adminNotifications?: unknown }

    if (!settings && !adminNotifications) {
      return NextResponse.json({ error: 'Settings or adminNotifications object is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertPromises: PromiseLike<{ error: unknown }>[] = []

    // Validate and save main settings
    if (settings) {
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
      for (const [key, value] of Object.entries(validatedSettings)) {
        if (value === undefined) continue

        upsertPromises.push(
          supabase
            .from('site_settings')
            .upsert(
              {
                key,
                value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'key' }
            )
            .select()
        )
      }
    }

    // Validate and save admin notifications
    if (adminNotifications) {
      const adminValidationResult = adminNotificationsSettingsSchema.safeParse(adminNotifications)

      if (!adminValidationResult.success) {
        const errors = adminValidationResult.error.issues.map((issue) => ({
          path: `adminNotifications.${issue.path.join('.')}`,
          message: issue.message,
        }))

        return NextResponse.json(
          {
            error: 'Admin notifications validation failed',
            details: errors,
          },
          { status: 400 }
        )
      }

      upsertPromises.push(
        supabase
          .from('site_settings')
          .upsert(
            {
              key: 'admin_notifications',
              value: adminValidationResult.data,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          )
          .select()
      )
    }

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
