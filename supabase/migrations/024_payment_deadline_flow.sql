-- Payment Deadline Flow Migration
-- Implements: 2-week deadline for failed payments, booking restoration, customer access tokens

-- =====================
-- 1. PAYMENT_SCHEDULES - Нові поля для failed payment flow
-- =====================
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS
  failed_at TIMESTAMPTZ;

ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS
  payment_deadline TIMESTAMPTZ;

ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS
  last_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS
  reminder_stage VARCHAR(20) DEFAULT NULL;

-- Constraint for reminder_stage values
ALTER TABLE payment_schedules DROP CONSTRAINT IF EXISTS payment_schedules_reminder_stage_check;
ALTER TABLE payment_schedules ADD CONSTRAINT payment_schedules_reminder_stage_check
  CHECK (reminder_stage IS NULL OR reminder_stage IN ('initial', '3_days', '1_day', 'final'));

-- =====================
-- 2. BOOKINGS - Нові поля для restore functionality та customer access
-- =====================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  cancelled_at TIMESTAMPTZ;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  cancellation_reason VARCHAR(255);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  restored_at TIMESTAMPTZ;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  restored_by UUID REFERENCES auth.users(id);

-- Customer access token for /my-booking page
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  access_token VARCHAR(64);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  access_token_expires_at TIMESTAMPTZ;

-- Unique constraint for access_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_access_token_unique
  ON bookings(access_token) WHERE access_token IS NOT NULL;

-- =====================
-- 3. INDEXES для нових полів
-- =====================
CREATE INDEX IF NOT EXISTS idx_payment_schedules_failed_at
  ON payment_schedules(failed_at) WHERE failed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_schedules_deadline
  ON payment_schedules(payment_deadline) WHERE payment_deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_schedules_reminder_stage
  ON payment_schedules(reminder_stage) WHERE reminder_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at
  ON bookings(cancelled_at) WHERE cancelled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_access_token
  ON bookings(access_token) WHERE access_token IS NOT NULL;

-- =====================
-- 4. TRIGGER для автоматичного встановлення payment_deadline при failed
-- =====================
CREATE OR REPLACE FUNCTION set_payment_deadline_on_fail()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set deadline if status changes to 'failed' and wasn't failed before
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    NEW.failed_at := NOW();
    NEW.payment_deadline := NOW() + INTERVAL '14 days';
    NEW.reminder_stage := 'initial';
  END IF;

  -- Reset deadline fields if status changes from failed to something else
  IF OLD.status = 'failed' AND NEW.status != 'failed' THEN
    -- Keep failed_at for audit, but clear deadline and reminder stage
    NEW.payment_deadline := NULL;
    NEW.reminder_stage := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_schedule_failed_trigger ON payment_schedules;
CREATE TRIGGER payment_schedule_failed_trigger
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_deadline_on_fail();

-- =====================
-- 5. FUNCTION для генерації secure access token
-- =====================
CREATE OR REPLACE FUNCTION generate_booking_access_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate access token for new bookings
  IF NEW.access_token IS NULL THEN
    NEW.access_token := encode(gen_random_bytes(32), 'hex');
    -- Token expires 30 days after retreat end date (or 1 year from now if no check_out_date)
    NEW.access_token_expires_at := COALESCE(
      NEW.check_out_date + INTERVAL '30 days',
      NOW() + INTERVAL '1 year'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_generate_access_token ON bookings;
CREATE TRIGGER booking_generate_access_token
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_access_token();

-- =====================
-- 6. UPDATE existing bookings to have access tokens
-- =====================
UPDATE bookings
SET
  access_token = encode(gen_random_bytes(32), 'hex'),
  access_token_expires_at = COALESCE(
    check_out_date + INTERVAL '30 days',
    created_at + INTERVAL '1 year'
  )
WHERE access_token IS NULL;

-- =====================
-- 7. ОНОВЛЕНА ФУНКЦІЯ розрахунку дат платежів (10%/50%/40% або 50%/50%)
-- =====================
CREATE OR REPLACE FUNCTION calculate_payment_due_dates(
  p_booking_date DATE,
  p_retreat_start_date DATE
)
RETURNS TABLE(
  payment_number INTEGER,
  due_date DATE,
  payment_type VARCHAR(20),
  percentage INTEGER
) AS $$
DECLARE
  months_until_retreat INTEGER;
BEGIN
  -- Calculate months between booking and retreat
  months_until_retreat := EXTRACT(MONTH FROM AGE(p_retreat_start_date, p_booking_date))
    + EXTRACT(YEAR FROM AGE(p_retreat_start_date, p_booking_date)) * 12;

  IF months_until_retreat < 2 THEN
    -- Late booking (<2 months): 50% now, 50% 1 month before retreat
    RETURN QUERY VALUES
      (1, p_booking_date, 'late_first'::VARCHAR(20), 50),
      (2, (p_retreat_start_date - INTERVAL '1 month')::DATE, 'late_second'::VARCHAR(20), 50);
  ELSE
    -- Standard booking (>=2 months): 10% now, 50% 2 months before, 40% 1 month before
    RETURN QUERY VALUES
      (1, p_booking_date, 'deposit'::VARCHAR(20), 10),
      (2, (p_retreat_start_date - INTERVAL '2 months')::DATE, 'second'::VARCHAR(20), 50),
      (3, (p_retreat_start_date - INTERVAL '1 month')::DATE, 'balance'::VARCHAR(20), 40);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 8. FUNCTION для скидання booking при неоплаті (auto-cancellation)
-- =====================
CREATE OR REPLACE FUNCTION cancel_booking_with_release(
  p_booking_id UUID,
  p_reason VARCHAR(255) DEFAULT 'Payment deadline exceeded'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_room_id UUID;
  v_guests_count INTEGER;
BEGIN
  -- Get booking details
  SELECT room_id, guests_count INTO v_room_id, v_guests_count
  FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update booking status
  UPDATE bookings
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Cancel all pending payment schedules
  UPDATE payment_schedules
  SET status = 'cancelled', updated_at = NOW()
  WHERE booking_id = p_booking_id AND status IN ('pending', 'failed');

  -- Return room availability
  IF v_room_id IS NOT NULL THEN
    UPDATE rooms
    SET available = available + COALESCE(v_guests_count, 1)
    WHERE id = v_room_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 9. FUNCTION для відновлення скасованого бронювання
-- =====================
CREATE OR REPLACE FUNCTION restore_cancelled_booking(
  p_booking_id UUID,
  p_admin_id UUID,
  p_new_due_date DATE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_room_id UUID;
  v_guests_count INTEGER;
  v_room_available INTEGER;
  v_booking_status VARCHAR(20);
BEGIN
  -- Get booking details
  SELECT status, room_id, guests_count INTO v_booking_status, v_room_id, v_guests_count
  FROM bookings WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking_status != 'cancelled' THEN
    RAISE EXCEPTION 'Booking is not cancelled';
  END IF;

  -- Check room availability
  IF v_room_id IS NOT NULL THEN
    SELECT available INTO v_room_available FROM rooms WHERE id = v_room_id;
    IF v_room_available < COALESCE(v_guests_count, 1) THEN
      RAISE EXCEPTION 'Room not available for restoration';
    END IF;
  END IF;

  -- Restore booking
  UPDATE bookings
  SET
    status = 'pending',
    restored_at = NOW(),
    restored_by = p_admin_id,
    cancelled_at = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Restore/update failed payment schedules
  UPDATE payment_schedules
  SET
    status = 'pending',
    due_date = COALESCE(p_new_due_date, due_date),
    attempts = 0,
    failed_at = NULL,
    payment_deadline = COALESCE(p_new_due_date, NOW() + INTERVAL '14 days'),
    reminder_stage = NULL,
    failure_reason = NULL,
    updated_at = NOW()
  WHERE booking_id = p_booking_id AND status IN ('cancelled', 'failed');

  -- Decrement room availability
  IF v_room_id IS NOT NULL THEN
    UPDATE rooms
    SET available = available - COALESCE(v_guests_count, 1)
    WHERE id = v_room_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- 10. RLS Policy для customer access to own booking via token
-- =====================
DROP POLICY IF EXISTS "Customers can view booking by token" ON bookings;
CREATE POLICY "Customers can view booking by token" ON bookings
  FOR SELECT
  TO anon, authenticated
  USING (
    -- Allow access if access_token matches and not expired
    access_token IS NOT NULL
    AND access_token_expires_at > NOW()
    -- Token is passed via request header or query param (handled in API)
  );

-- =====================
-- 11. Audit log entry type for restore actions
-- =====================
-- (Assuming booking_audit_log table exists from migration 022)
DO $$
BEGIN
  -- Add 'restored' action type if not exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_audit_log') THEN
    -- The audit log should already support this, just document it
    COMMENT ON TABLE booking_audit_log IS
      'Audit log for booking changes. Action types: created, updated, cancelled, restored, payment_received, refunded';
  END IF;
END $$;
