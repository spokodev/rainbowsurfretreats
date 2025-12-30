import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
  SiteSettings,
  PaymentSettings,
  BookingSettings,
  NotificationsSettings,
  GeneralSettings,
  EmailSettings,
  defaultSettings,
} from '@/lib/validations/settings'

// Service role client for server-side operations
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Get all site settings from database
 * Uses service role to bypass RLS for reading
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')

  if (error) {
    console.error('Error fetching site settings:', error)
    return defaultSettings
  }

  // Merge fetched settings with defaults
  const settings: SiteSettings = { ...defaultSettings }

  for (const item of data || []) {
    const key = item.key as keyof SiteSettings
    if (key in settings) {
      settings[key] = { ...settings[key], ...item.value }
    }
  }

  return settings
}

/**
 * Get a specific setting category
 */
export async function getSettingValue<K extends keyof SiteSettings>(
  key: K
): Promise<SiteSettings[K]> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return defaultSettings[key]
  }

  // Merge with defaults to ensure all fields exist
  return { ...defaultSettings[key], ...data.value }
}

/**
 * Get payment settings
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  return getSettingValue('payment')
}

/**
 * Get booking settings
 */
export async function getBookingSettings(): Promise<BookingSettings> {
  return getSettingValue('booking')
}

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationsSettings> {
  return getSettingValue('notifications')
}

/**
 * Get general settings
 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  return getSettingValue('general')
}

/**
 * Get email settings
 */
export async function getEmailSettings(): Promise<EmailSettings> {
  return getSettingValue('email')
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.role === 'admin'
}

/**
 * Check authentication and admin status
 * Returns user and isAdmin status
 */
export async function checkAdminAuth(): Promise<{
  user: { id: string; email?: string } | null
  isAdmin: boolean
  error?: string
}> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, isAdmin: false, error: 'Unauthorized' }
  }

  const isAdmin = await isUserAdmin(user.id)

  return { user, isAdmin }
}
