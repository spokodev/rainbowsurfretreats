-- Migration 020: Fix promo code race condition
-- Problem: Two concurrent checkouts can both validate the same promo code
-- when current_uses = max_uses - 1, leading to exceeded usage limits
-- Solution: Atomic increment that checks limit before incrementing

-- Drop old function
DROP FUNCTION IF EXISTS increment_promo_code_usage(UUID);

-- Create atomic increment function that returns success/failure
-- Returns TRUE if increment succeeded, FALSE if limit reached
CREATE OR REPLACE FUNCTION try_increment_promo_code_usage(code_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Atomically check and increment in one UPDATE
  -- Only updates if max_uses is NULL (unlimited) OR current_uses < max_uses
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE id = code_id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Keep backward compatibility by creating wrapper with old name
CREATE OR REPLACE FUNCTION increment_promo_code_usage(code_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Just call the new function, ignore result for backward compatibility
  PERFORM try_increment_promo_code_usage(code_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION try_increment_promo_code_usage IS 'Atomically increment promo code usage, returns FALSE if limit reached';
