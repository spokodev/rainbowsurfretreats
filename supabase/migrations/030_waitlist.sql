-- Migration: Waitlist System
-- Allows users to join a waitlist when retreat rooms are sold out
-- Admin can notify waitlist members when spots become available

-- Create waitlist_entries table
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  room_id UUID REFERENCES retreat_rooms(id) ON DELETE SET NULL,

  -- Contact info
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  guests_count INTEGER DEFAULT 1,
  notes TEXT,

  -- Status tracking
  -- waiting: in queue waiting for a spot
  -- notified: admin sent notification, waiting for response
  -- accepted: person accepted, redirected to booking
  -- declined: person manually declined
  -- expired: 48h passed without response
  -- booked: successfully completed booking
  status VARCHAR(20) NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'accepted', 'declined', 'expired', 'booked')),

  -- Notification tracking
  notified_at TIMESTAMPTZ,
  notification_expires_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_token UUID, -- Secure token for accept/decline links

  -- Queue position (auto-calculated per retreat)
  position INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one entry per email per retreat
  CONSTRAINT unique_waitlist_email_retreat UNIQUE (retreat_id, email)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_waitlist_retreat ON waitlist_entries(retreat_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist_entries(retreat_id, position);
CREATE INDEX IF NOT EXISTS idx_waitlist_token ON waitlist_entries(response_token) WHERE response_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waitlist_expires ON waitlist_entries(notification_expires_at) WHERE status = 'notified';
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist_entries(email);

-- Function to auto-set position on insert
CREATE OR REPLACE FUNCTION set_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set position if not already provided
  IF NEW.position IS NULL OR NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM waitlist_entries
    WHERE retreat_id = NEW.retreat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set position before insert
DROP TRIGGER IF EXISTS waitlist_position_trigger ON waitlist_entries;
CREATE TRIGGER waitlist_position_trigger
BEFORE INSERT ON waitlist_entries
FOR EACH ROW EXECUTE FUNCTION set_waitlist_position();

-- Trigger to update updated_at on changes
DROP TRIGGER IF EXISTS update_waitlist_updated_at ON waitlist_entries;
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON waitlist_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for waitlist_entries

-- Enable RLS
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (join waitlist)
CREATE POLICY "Anyone can join waitlist"
  ON waitlist_entries
  FOR INSERT
  WITH CHECK (true);

-- Policy: Public can read their own entries by email
CREATE POLICY "Users can view own waitlist entries"
  ON waitlist_entries
  FOR SELECT
  USING (true); -- Allow reading for position checks

-- Policy: Only authenticated admins can update
CREATE POLICY "Admins can update waitlist"
  ON waitlist_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only authenticated admins can delete
CREATE POLICY "Admins can delete waitlist"
  ON waitlist_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add waitlist email templates
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language) VALUES
-- English templates
('waitlist_confirmation', 'Waitlist Confirmation', 'Sent when a user joins the waitlist', 'You''re on the Waitlist - {{retreatName}}',
'<h1>You''re on the Waitlist!</h1>
<p>Hi {{firstName}},</p>
<p>Thank you for your interest in <strong>{{retreatName}}</strong>. We''ve added you to our waitlist.</p>
<div class="highlight-box">
  <p><strong>Your Position:</strong> #{{position}}</p>
  <p><strong>Room Preference:</strong> {{roomName}}</p>
</div>
<h2>What Happens Next?</h2>
<p>If a spot becomes available, we''ll notify you immediately. You''ll have 48 hours to confirm and complete your booking.</p>
<p>We''ll keep you updated on any changes. In the meantime, feel free to browse our other upcoming retreats.</p>
<p>Warm regards,<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "roomName", "position", "retreatDate", "siteUrl"]'::jsonb, 'en'),

('waitlist_spot_available', 'Waitlist Spot Available', 'Sent when admin notifies that a spot is available', 'A Spot is Available! - {{retreatName}}',
'<h1>Great News - A Spot Just Opened Up!</h1>
<p>Hi {{firstName}},</p>
<p>A spot has become available for <strong>{{retreatName}}</strong> and you''re next on our waitlist!</p>
<div class="highlight-box">
  <p><strong>Room:</strong> {{roomName}}</p>
  <p><strong>Price:</strong> €{{roomPrice}}</p>
  <p><strong>Deposit Required:</strong> €{{depositAmount}} ({{depositPercent}}%)</p>
</div>
<div class="warning-box">
  <p><strong>⏰ Act Fast!</strong></p>
  <p>This offer expires on <strong>{{expiresAt}}</strong> (48 hours from now).</p>
  <p>If we don''t hear from you, the spot will be offered to the next person.</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{acceptUrl}}" class="button" style="background-color: #22c55e; margin-right: 10px;">Accept & Book Now</a>
  <a href="{{declineUrl}}" class="button" style="background-color: #6b7280;">Decline Offer</a>
</div>
<p>If you have any questions, don''t hesitate to contact us.</p>
<p>See you soon!<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "roomName", "roomPrice", "depositAmount", "depositPercent", "expiresAt", "acceptUrl", "declineUrl"]'::jsonb, 'en'),

('waitlist_accepted', 'Waitlist Offer Accepted', 'Sent after user accepts the waitlist offer', 'Complete Your Booking - {{retreatName}}',
'<h1>You''re Almost There!</h1>
<p>Hi {{firstName}},</p>
<p>Thank you for accepting your spot at <strong>{{retreatName}}</strong>!</p>
<p>Please complete your booking by clicking the button below:</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{bookingUrl}}" class="button">Complete Booking & Pay Deposit</a>
</div>
<div class="highlight-box">
  <p><strong>Room:</strong> {{roomName}}</p>
  <p><strong>Deposit Due:</strong> €{{depositAmount}}</p>
</div>
<p>If you need any assistance, we''re here to help.</p>
<p>Can''t wait to see you!<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "roomName", "depositAmount", "bookingUrl"]'::jsonb, 'en'),

('waitlist_declined', 'Waitlist Offer Declined', 'Sent after user declines the waitlist offer', 'We''ll Miss You - {{retreatName}}',
'<h1>Maybe Next Time!</h1>
<p>Hi {{firstName}},</p>
<p>We understand that the timing wasn''t right for the <strong>{{retreatName}}</strong> retreat.</p>
<p>We''d love to see you at one of our future retreats. Check out what''s coming up:</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{siteUrl}}/retreats" class="button">Browse Upcoming Retreats</a>
</div>
<p>If you change your mind about this retreat and spots are still available, you''re always welcome to join the waitlist again.</p>
<p>Wishing you sunny waves wherever you are!<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "siteUrl"]'::jsonb, 'en'),

('waitlist_expired', 'Waitlist Offer Expired', 'Sent when 48h passes without response', 'Waitlist Offer Expired - {{retreatName}}',
'<h1>Your Waitlist Offer Has Expired</h1>
<p>Hi {{firstName}},</p>
<p>Unfortunately, the 48-hour window for accepting your spot at <strong>{{retreatName}}</strong> has passed.</p>
<p>The spot has been offered to the next person on the waitlist.</p>
<p>If you''re still interested in this retreat, you can rejoin the waitlist (you may need to wait for another spot to open).</p>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{siteUrl}}/retreats" class="button">View Other Retreats</a>
</div>
<p>We hope to see you at a future retreat!<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "siteUrl"]'::jsonb, 'en')

ON CONFLICT (slug, language) DO NOTHING;

-- German translations
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language) VALUES
('waitlist_confirmation', 'Warteliste Bestätigung', 'Gesendet wenn jemand der Warteliste beitritt', 'Du bist auf der Warteliste - {{retreatName}}',
'<h1>Du bist auf der Warteliste!</h1>
<p>Hallo {{firstName}},</p>
<p>Vielen Dank für dein Interesse an <strong>{{retreatName}}</strong>. Wir haben dich zur Warteliste hinzugefügt.</p>
<div class="highlight-box">
  <p><strong>Deine Position:</strong> #{{position}}</p>
  <p><strong>Zimmerpräferenz:</strong> {{roomName}}</p>
</div>
<h2>Was passiert als Nächstes?</h2>
<p>Sobald ein Platz frei wird, benachrichtigen wir dich sofort. Du hast dann 48 Stunden Zeit, um deine Buchung zu bestätigen.</p>
<p>Liebe Grüße,<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "roomName", "position", "retreatDate", "siteUrl"]'::jsonb, 'de'),

('waitlist_spot_available', 'Warteliste Platz Verfügbar', 'Gesendet wenn ein Platz frei wird', 'Ein Platz ist frei! - {{retreatName}}',
'<h1>Tolle Neuigkeiten - Ein Platz ist frei geworden!</h1>
<p>Hallo {{firstName}},</p>
<p>Ein Platz für <strong>{{retreatName}}</strong> ist frei geworden und du bist als Nächster auf unserer Warteliste!</p>
<div class="highlight-box">
  <p><strong>Zimmer:</strong> {{roomName}}</p>
  <p><strong>Preis:</strong> €{{roomPrice}}</p>
  <p><strong>Anzahlung:</strong> €{{depositAmount}} ({{depositPercent}}%)</p>
</div>
<div class="warning-box">
  <p><strong>⏰ Schnell sein!</strong></p>
  <p>Dieses Angebot läuft am <strong>{{expiresAt}}</strong> ab (in 48 Stunden).</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{{acceptUrl}}" class="button" style="background-color: #22c55e; margin-right: 10px;">Annehmen & Jetzt Buchen</a>
  <a href="{{declineUrl}}" class="button" style="background-color: #6b7280;">Angebot Ablehnen</a>
</div>
<p>Bis bald!<br>Rainbow Surf Retreats Team</p>',
'transactional', true,
'["firstName", "lastName", "retreatName", "roomName", "roomPrice", "depositAmount", "depositPercent", "expiresAt", "acceptUrl", "declineUrl"]'::jsonb, 'de')

ON CONFLICT (slug, language) DO NOTHING;

-- Comments
COMMENT ON TABLE waitlist_entries IS 'Stores waitlist entries for sold-out retreats. Users can join waitlist and admin notifies when spots open.';
COMMENT ON COLUMN waitlist_entries.status IS 'waiting: in queue, notified: admin sent notification, accepted/declined: user response, expired: 48h timeout, booked: completed booking';
COMMENT ON COLUMN waitlist_entries.response_token IS 'UUID token for secure accept/decline links in notification emails';
COMMENT ON COLUMN waitlist_entries.notification_expires_at IS '48 hours after notified_at - when the offer expires';
