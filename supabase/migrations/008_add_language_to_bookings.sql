-- Migration: Add language field to bookings table
-- This enables multilingual email support

-- Add language column to bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Add stripe_webhook_event_id for idempotency tracking
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS stripe_webhook_event_id VARCHAR(255) UNIQUE;

-- Create index for faster language lookups
CREATE INDEX IF NOT EXISTS idx_bookings_language ON bookings(language);

-- Create index for webhook event id (for idempotency checks)
CREATE INDEX IF NOT EXISTS idx_payments_webhook_event_id ON payments(stripe_webhook_event_id);

-- Add comment for documentation
COMMENT ON COLUMN bookings.language IS 'User preferred language for emails (en, de, es, fr, nl)';
COMMENT ON COLUMN payments.stripe_webhook_event_id IS 'Stripe event ID for idempotency tracking';
