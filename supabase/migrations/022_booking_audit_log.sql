-- Migration: Booking Audit Log
-- Purpose: Track all changes to booking status and payment status for accountability

-- Create audit log table
CREATE TABLE IF NOT EXISTS booking_status_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Status tracking
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_payment_status VARCHAR(50),
  new_payment_status VARCHAR(50),

  -- Who and what
  changed_by_email VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'status_change', 'cancellation', 'refund', 'payment_received'
  reason TEXT,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_id
  ON booking_status_changes(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_audit_created_at
  ON booking_status_changes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_audit_action
  ON booking_status_changes(action);

-- Enable RLS
ALTER TABLE booking_status_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only service role and admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON booking_status_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "Service role has full access to audit logs"
  ON booking_status_changes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE booking_status_changes IS
'Audit trail for all booking status changes, cancellations, and refunds.
Used for accountability and debugging customer issues.';
