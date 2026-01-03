const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('ERROR: DATABASE_URL required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Running B2B VAT migration...\n');

    const migrationPath = path.join(__dirname, '../supabase/migrations/023_b2b_vat_fields.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migration);

    console.log('Migration completed successfully!');

    const { rows } = await client.query(
      "SELECT column_name, data_type, column_default " +
      "FROM information_schema.columns " +
      "WHERE table_name = 'bookings' " +
      "AND column_name IN ('customer_type', 'company_name', 'vat_id', 'vat_id_valid', 'vat_id_validated_at') " +
      "ORDER BY column_name"
    );

    console.log('\nNew columns added:');
    rows.forEach(function(row) {
      console.log('  - ' + row.column_name + ': ' + row.data_type + ' (default: ' + (row.column_default || 'null') + ')');
    });

    client.release();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
