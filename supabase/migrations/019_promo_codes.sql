-- Promo Codes Feature
-- Migration 019: Adds promo_codes and promo_code_redemptions tables
-- Rule: "Best Discount Wins" - only one discount applied (promo OR early bird, whichever is higher)

-- =====================
-- PROMO CODES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code details
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,

  -- Discount configuration
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),

  -- Scope: can be global, retreat-specific, or room-specific
  scope VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'retreat', 'room')),
  retreat_id UUID REFERENCES retreats(id) ON DELETE CASCADE,
  room_id UUID REFERENCES retreat_rooms(id) ON DELETE CASCADE,

  -- Validity period
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,

  -- Usage limits
  max_uses INTEGER, -- NULL means unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,

  -- Min order amount (optional)
  min_order_amount DECIMAL(10,2),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_retreat_scope CHECK (
    (scope = 'retreat' AND retreat_id IS NOT NULL) OR
    (scope = 'room' AND room_id IS NOT NULL) OR
    (scope = 'global' AND retreat_id IS NULL AND room_id IS NULL)
  ),
  CONSTRAINT check_percentage_value CHECK (
    (discount_type = 'percentage' AND discount_value <= 100) OR
    (discount_type = 'fixed_amount')
  )
);

-- =====================
-- PROMO CODE REDEMPTIONS TABLE (Audit Trail)
-- =====================
CREATE TABLE IF NOT EXISTS promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Discount applied
  original_amount DECIMAL(10,2) NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,

  -- Timestamps
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate redemptions
  CONSTRAINT unique_redemption UNIQUE (promo_code_id, booking_id)
);

-- =====================
-- ADD DISCOUNT TRACKING TO BOOKINGS
-- =====================
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS discount_source VARCHAR(20)
CHECK (discount_source IN ('early_bird', 'promo_code'));

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_retreat ON promo_codes(retreat_id) WHERE retreat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_codes_room ON promo_codes(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid ON promo_codes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_redemptions_promo ON promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_booking ON promo_code_redemptions(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_promo_code ON bookings(promo_code_id) WHERE promo_code_id IS NOT NULL;

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
DROP TRIGGER IF EXISTS update_promo_codes_updated_at ON promo_codes;
CREATE TRIGGER update_promo_codes_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- INCREMENT USAGE FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes: anyone can read active codes, only admins can modify
CREATE POLICY "Anyone can read active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" ON promo_codes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Redemptions: only admins can view
CREATE POLICY "Admins can view redemptions" ON promo_code_redemptions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "System can insert redemptions" ON promo_code_redemptions
  FOR INSERT WITH CHECK (true);

-- =====================
-- COMMENTS
-- =====================
COMMENT ON TABLE promo_codes IS 'Promotional discount codes for retreats and rooms';
COMMENT ON TABLE promo_code_redemptions IS 'Audit trail of promo code usage per booking';
COMMENT ON COLUMN promo_codes.scope IS 'global = all retreats, retreat = specific retreat, room = specific room';
COMMENT ON COLUMN promo_codes.discount_type IS 'percentage = % off, fixed_amount = flat € discount';
COMMENT ON COLUMN bookings.discount_source IS 'Which discount was applied: early_bird or promo_code (Best Discount Wins rule)';
