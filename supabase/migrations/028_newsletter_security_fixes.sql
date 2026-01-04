-- Newsletter Security Fixes
-- SECURITY-1: Add permanent unsubscribe tokens
-- SECURITY-3: Fix SECURITY DEFINER view
-- BUG-4: Add search_path to SQL functions

-- 1. Add unsubscribe_token to newsletter_subscribers
ALTER TABLE newsletter_subscribers
ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64) UNIQUE;

-- 2. Generate tokens for existing subscribers
UPDATE newsletter_subscribers
SET unsubscribe_token = encode(gen_random_bytes(32), 'hex')
WHERE unsubscribe_token IS NULL;

-- 3. Make unsubscribe_token NOT NULL for new records (after populating existing)
ALTER TABLE newsletter_subscribers
ALTER COLUMN unsubscribe_token SET DEFAULT encode(gen_random_bytes(32), 'hex');

-- 4. Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token
ON newsletter_subscribers(unsubscribe_token);

-- 5. Fix SECURITY DEFINER view - recreate with SECURITY INVOKER
DROP VIEW IF EXISTS campaign_stats;

CREATE VIEW campaign_stats
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.status,
  c.sent_at,
  COUNT(cr.id) as total_recipients,
  COUNT(CASE WHEN cr.status = 'sent' THEN 1 END) as sent_count,
  COUNT(CASE WHEN cr.status = 'delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN cr.status = 'opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN cr.status = 'clicked' THEN 1 END) as clicked_count,
  COUNT(CASE WHEN cr.status = 'bounced' THEN 1 END) as bounced_count,
  COUNT(CASE WHEN cr.status = 'failed' THEN 1 END) as failed_count,
  CASE
    WHEN COUNT(CASE WHEN cr.status IN ('delivered', 'opened', 'clicked') THEN 1 END) > 0
    THEN ROUND(COUNT(CASE WHEN cr.status IN ('opened', 'clicked') THEN 1 END)::numeric /
         COUNT(CASE WHEN cr.status IN ('delivered', 'opened', 'clicked') THEN 1 END) * 100, 1)
    ELSE 0
  END as open_rate,
  CASE
    WHEN COUNT(CASE WHEN cr.status IN ('opened', 'clicked') THEN 1 END) > 0
    THEN ROUND(COUNT(CASE WHEN cr.status = 'clicked' THEN 1 END)::numeric /
         COUNT(CASE WHEN cr.status IN ('opened', 'clicked') THEN 1 END) * 100, 1)
    ELSE 0
  END as click_rate
FROM newsletter_campaigns c
LEFT JOIN campaign_recipients cr ON cr.campaign_id = c.id
GROUP BY c.id, c.name, c.status, c.sent_at;

-- 6. Fix functions with proper search_path
CREATE OR REPLACE FUNCTION update_newsletter_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_subscriber_last_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- When a booking is confirmed, update the subscriber's last booking info
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE newsletter_subscribers
    SET
      last_booking_id = NEW.id,
      last_booking_date = NOW(),
      updated_at = NOW()
    WHERE email = LOWER(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;
