import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time migration endpoint protected by secret
const MIGRATION_SECRET = 'promo-codes-migrate-2024-rainbow'

export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json()

    if (secret !== MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    )

    // Check if migration already ran
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .limit(1)

    if (existing !== null) {
      return NextResponse.json({
        message: 'Migration already completed - promo_codes table exists',
        alreadyExists: true
      })
    }

    // If we get here, table doesn't exist - need to run SQL
    // Unfortunately supabase-js can't run raw DDL, so we'll return instructions
    return NextResponse.json({
      message: 'Table does not exist. Please run migration SQL manually in Supabase Dashboard.',
      dashboardUrl: `https://supabase.com/dashboard/project/gvsyyxpasulbcoyvpgjh/sql/new`,
      migrationFile: 'supabase/migrations/019_promo_codes.sql'
    })

  } catch (error) {
    // If error is about table not existing, that's expected
    const errorMessage = String(error)
    if (errorMessage.includes('promo_codes')) {
      return NextResponse.json({
        message: 'Table does not exist yet. Run migration in Supabase Dashboard.',
        dashboardUrl: `https://supabase.com/dashboard/project/gvsyyxpasulbcoyvpgjh/sql/new`,
        migrationFile: 'supabase/migrations/019_promo_codes.sql'
      })
    }

    console.error('Migration check error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
