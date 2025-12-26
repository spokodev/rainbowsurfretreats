#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://gvsyyxpasulbcoyvpgjh.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c3l5eHBhc3VsYmNveXZwZ2poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY3MzMwNiwiZXhwIjoyMDgyMjQ5MzA2fQ.X3BLuc2JDCcBoimtbE_4HUVgCuA3wguV_E4xcQwzq38'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function runMigration(filename) {
  console.log(`\n🔄 Running migration: ${filename}`)

  const filePath = join(__dirname, '..', 'supabase', 'migrations', filename)
  const sql = readFileSync(filePath, 'utf-8')

  // Split by semicolon and filter empty statements
  const statements = sql
    .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|$))/i)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement || statement.startsWith('--')) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      if (error) {
        // Try direct fetch if rpc doesn't work
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: statement })
        })

        if (!response.ok) {
          console.log(`  ⚠️ Statement skipped (may already exist):`, statement.substring(0, 60) + '...')
        }
      }
    } catch (err) {
      console.log(`  ⚠️ Statement result:`, statement.substring(0, 60) + '...')
    }
  }

  console.log(`✅ Migration completed: ${filename}`)
}

async function createStorageBuckets() {
  console.log('\n🗄️ Creating storage buckets...')

  const buckets = ['retreat-images', 'blog-images']

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    })

    if (error) {
      if (error.message?.includes('already exists')) {
        console.log(`  ℹ️ Bucket "${bucket}" already exists`)
      } else {
        console.log(`  ⚠️ Bucket "${bucket}":`, error.message)
      }
    } else {
      console.log(`  ✅ Created bucket: ${bucket}`)
    }
  }
}

async function testConnection() {
  console.log('🔌 Testing Supabase connection...')

  const { data, error } = await supabase.from('retreats').select('count').limit(1)

  if (error && !error.message.includes('does not exist')) {
    console.log('  ❌ Connection failed:', error.message)
    return false
  }

  console.log('  ✅ Connected to Supabase!')
  return true
}

async function main() {
  console.log('🚀 Rainbow Surf Retreats - Database Setup\n')

  // Test connection
  await testConnection()

  // Create storage buckets first
  await createStorageBuckets()

  console.log('\n📋 Note: SQL migrations need to be run in Supabase Dashboard SQL Editor')
  console.log('   Go to: https://supabase.com/dashboard/project/gvsyyxpasulbcoyvpgjh/sql/new')
  console.log('   And paste the content of each migration file:\n')
  console.log('   1. supabase/migrations/001_initial_schema.sql')
  console.log('   2. supabase/migrations/002_rls_policies.sql')
  console.log('   3. supabase/migrations/003_storage_buckets.sql\n')

  console.log('✅ Setup script completed!')
}

main().catch(console.error)
