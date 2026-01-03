-- B2B VAT Support: Add fields for business customers and VAT ID validation
-- This migration adds support for:
-- 1. EU private customers (standard VAT)
-- 2. EU business customers with VAT ID (reverse charge - 0% VAT)
-- 3. Non-EU customers (0% VAT)

-- Add customer type field (private or business)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'private';

-- Add constraint for customer_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_customer_type_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_customer_type_check
      CHECK (customer_type IN ('private', 'business'));
  END IF;
END $$;

-- Add company name for business customers
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Add VAT ID field
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);

-- Add VAT ID validation status
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_id_valid BOOLEAN DEFAULT FALSE;

-- Add timestamp when VAT ID was validated
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_id_validated_at TIMESTAMPTZ;

-- Add index for quick lookup of business bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_type ON bookings(customer_type) WHERE customer_type = 'business';

-- Add index for VAT reporting queries
CREATE INDEX IF NOT EXISTS idx_bookings_vat_reporting ON bookings(created_at, country, customer_type, vat_rate);

-- Comment for documentation
COMMENT ON COLUMN bookings.customer_type IS 'Type of customer: private (individual) or business (company with VAT ID)';
COMMENT ON COLUMN bookings.company_name IS 'Company name for business customers';
COMMENT ON COLUMN bookings.vat_id IS 'EU VAT identification number for business customers';
COMMENT ON COLUMN bookings.vat_id_valid IS 'Whether the VAT ID was validated against EU VIES API';
COMMENT ON COLUMN bookings.vat_id_validated_at IS 'Timestamp when the VAT ID was last validated';
