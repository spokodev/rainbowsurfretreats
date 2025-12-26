-- Payment Schedules for Rainbow Surf Retreats
-- Implements: 10% → 50% → balance payment flow

-- =====================
-- PAYMENT SCHEDULES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Payment info
  payment_number INTEGER NOT NULL CHECK (payment_number BETWEEN 1 AND 3),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  description VARCHAR(255),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),

  -- Stripe data
  stripe_payment_intent_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),

  -- Retry tracking
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique payment numbers per booking
  UNIQUE(booking_id, payment_number)
);

-- =====================
-- ADD STRIPE CUSTOMER TO BOOKINGS
-- =====================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

-- =====================
-- ADD EARLY BIRD FLAG TO BOOKINGS
-- =====================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_early_bird BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS early_bird_discount DECIMAL(10,2) DEFAULT 0;

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_payment_schedules_booking
  ON payment_schedules(booking_id);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_status
  ON payment_schedules(status);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date
  ON payment_schedules(due_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_schedules_retry
  ON payment_schedules(next_retry_at)
  WHERE status = 'failed' AND attempts < max_attempts;

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
DROP TRIGGER IF EXISTS update_payment_schedules_updated_at ON payment_schedules;
CREATE TRIGGER update_payment_schedules_updated_at
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment schedules (via booking email)
DROP POLICY IF EXISTS "Users can view own payment schedules" ON payment_schedules;
CREATE POLICY "Users can view own payment schedules" ON payment_schedules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payment_schedules.booking_id
      AND bookings.email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        ''
      )
    )
  );

-- Admins can manage all payment schedules
DROP POLICY IF EXISTS "Admins can manage payment schedules" ON payment_schedules;
CREATE POLICY "Admins can manage payment schedules" ON payment_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- HELPER FUNCTION: Calculate payment due dates
-- =====================
CREATE OR REPLACE FUNCTION calculate_payment_due_dates(
  p_booking_date DATE,
  p_retreat_start_date DATE
)
RETURNS TABLE(
  payment_number INTEGER,
  due_date DATE,
  payment_type VARCHAR(20)
) AS $$
DECLARE
  months_until_retreat INTEGER;
BEGIN
  months_until_retreat := EXTRACT(MONTH FROM AGE(p_retreat_start_date, p_booking_date));

  IF months_until_retreat < 2 THEN
    -- Late booking: 50% now, 50% later
    RETURN QUERY VALUES
      (1, p_booking_date, 'late_first'::VARCHAR(20)),
      (2, p_retreat_start_date - INTERVAL '2 weeks', 'late_second'::VARCHAR(20));
  ELSE
    -- Standard: 10% now, 50% in 1 month, balance 1 month before
    RETURN QUERY VALUES
      (1, p_booking_date, 'deposit'::VARCHAR(20)),
      (2, p_booking_date + INTERVAL '1 month', 'second'::VARCHAR(20)),
      (3, p_retreat_start_date - INTERVAL '1 month', 'balance'::VARCHAR(20));
  END IF;
END;
$$ LANGUAGE plpgsql;
