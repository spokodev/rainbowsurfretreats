const pg = require('pg');
const fs = require('fs');
const path = require('path');

// Read the .env.local file manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
console.log('Project ref:', projectRef);

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/019_promo_codes.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// We need the database password. Check if it's available.
// For now, just output instructions
console.log(`
To run the migration, you need to execute this SQL in Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new
2. Paste the content of: supabase/migrations/019_promo_codes.sql
3. Click "Run"

Or set DATABASE_URL in .env.local with your database password.
`);
