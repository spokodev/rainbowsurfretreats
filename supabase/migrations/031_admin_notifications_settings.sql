-- Add admin notifications settings for configurable email alerts
INSERT INTO site_settings (key, value) VALUES
  ('admin_notifications', '{
    "generalEmail": "",
    "bookingsEmail": "",
    "paymentsEmail": "",
    "waitlistEmail": "",
    "supportEmail": "",
    "notifyOnNewBooking": true,
    "notifyOnPaymentReceived": true,
    "notifyOnPaymentFailed": true,
    "notifyOnWaitlistJoin": true,
    "notifyOnWaitlistResponse": true,
    "notifyOnSupportRequest": true
  }')
ON CONFLICT (key) DO NOTHING;
