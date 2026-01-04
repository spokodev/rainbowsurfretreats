-- Newsletter Campaigns System
-- Adds tables for email campaigns, recipients tracking, and event logging

-- Campaign table for storing newsletter campaigns
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,

  -- Multi-language subjects
  subject_en TEXT NOT NULL,
  subject_de TEXT,
  subject_es TEXT,
  subject_fr TEXT,
  subject_nl TEXT,

  -- Multi-language body (HTML)
  body_en TEXT NOT NULL,
  body_de TEXT,
  body_es TEXT,
  body_fr TEXT,
  body_nl TEXT,

  -- Campaign status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Targeting
  target_languages VARCHAR(5)[] DEFAULT ARRAY['en'],
  target_tags TEXT[] DEFAULT '{}',
  target_status VARCHAR(20) DEFAULT 'active' CHECK (target_status IN ('active', 'all')), -- 'active' = confirmed only

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign recipients for tracking individual sends
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  language VARCHAR(5) DEFAULT 'en',

  -- Resend tracking
  resend_message_id VARCHAR(100),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Error info
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, email)
);

-- Email event logs from Resend webhooks
CREATE TABLE IF NOT EXISTS email_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_message_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- delivered, opened, clicked, bounced, complained
  recipient_email VARCHAR(255),
  campaign_id UUID REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,

  -- Additional event data
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add booking reference to newsletter_subscribers for "last booking" feature
ALTER TABLE newsletter_subscribers
ADD COLUMN IF NOT EXISTS last_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_booking_date TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status ON newsletter_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created ON newsletter_campaigns(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_resend_id ON campaign_recipients(resend_message_id);

CREATE INDEX IF NOT EXISTS idx_email_event_logs_message ON email_event_logs(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_email_event_logs_campaign ON email_event_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_event_logs_created ON email_event_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_language ON newsletter_subscribers(language);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source ON newsletter_subscribers(source);

-- Enable RLS
ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Service role full access
CREATE POLICY "Service role full access campaigns" ON newsletter_campaigns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access recipients" ON campaign_recipients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access event logs" ON email_event_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Update trigger for campaigns
CREATE TRIGGER newsletter_campaigns_updated_at
  BEFORE UPDATE ON newsletter_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_timestamp();

-- Function to update subscriber's last booking
CREATE OR REPLACE FUNCTION update_subscriber_last_booking()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to auto-update subscriber last booking
CREATE TRIGGER booking_confirmed_update_subscriber
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriber_last_booking();

-- View for campaign statistics
CREATE OR REPLACE VIEW campaign_stats AS
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
