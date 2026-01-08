-- Migration 033: Email Audit Log
-- Track all sent emails with delivery status from Resend webhooks

CREATE TABLE IF NOT EXISTS email_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was sent
  email_type text NOT NULL, -- 'payment_failed', 'booking_confirmation', 'admin_payment_failed', etc.
  recipient_email text NOT NULL,
  recipient_type text NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  subject text NOT NULL,

  -- Context
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,

  -- Resend tracking
  resend_email_id text, -- ID returned from Resend API for webhook correlation

  -- Status
  status text NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'failed' | 'bounced'
  error_message text,

  -- Delivery tracking from Resend webhooks
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  bounce_reason text,
  complained_at timestamptz, -- spam complaint

  -- Counters
  open_count int NOT NULL DEFAULT 0,
  click_count int NOT NULL DEFAULT 0,

  -- Metadata for additional context
  metadata jsonb DEFAULT '{}', -- failure reason, amount, etc.

  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_audit_booking ON email_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_payment ON email_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_type ON email_audit_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_audit_status ON email_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_email_audit_created ON email_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_audit_resend_id ON email_audit_log(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_email_audit_recipient ON email_audit_log(recipient_email);

-- Comments
COMMENT ON TABLE email_audit_log IS 'Audit log for all sent emails with delivery tracking';
COMMENT ON COLUMN email_audit_log.email_type IS 'Type of email: payment_failed, booking_confirmation, admin_payment_failed, deadline_reminder, etc.';
COMMENT ON COLUMN email_audit_log.resend_email_id IS 'Email ID from Resend API for webhook correlation';
COMMENT ON COLUMN email_audit_log.status IS 'Current status: sent, delivered, failed, bounced';
