-- Create site_settings table for admin settings persistence
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(key);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read/write settings (admin only)
CREATE POLICY "Authenticated users can read site_settings"
  ON site_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert site_settings"
  ON site_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update site_settings"
  ON site_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_site_settings_updated_at ON site_settings;
CREATE TRIGGER trigger_update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- Insert default settings
INSERT INTO site_settings (key, value) VALUES
  ('general', '{"siteName": "Rainbow Surf Retreats", "siteDescription": "LGBTQ+ surf retreats around the world. Join our inclusive community and catch the perfect wave.", "phoneNumber": "+1 (555) 123-4567"}'),
  ('email', '{"contactEmail": "hello@rainbowsurfretreats.com", "supportEmail": "support@rainbowsurfretreats.com"}'),
  ('notifications', '{"emailNotifications": true, "bookingAlerts": true, "paymentAlerts": true, "marketingEmails": false, "weeklyReports": true}'),
  ('payment', '{"currency": "EUR", "depositPercentage": 30, "stripeEnabled": true, "paypalEnabled": false}'),
  ('booking', '{"autoConfirm": false, "requireDeposit": true, "cancellationDays": 30, "maxParticipants": 14}')
ON CONFLICT (key) DO NOTHING;
