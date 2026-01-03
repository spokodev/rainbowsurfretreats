-- Fix Admin RLS Policies
-- CRITICAL: Previous policies allowed ANY authenticated user to manage data
-- This migration adds proper admin role checking

-- =====================
-- HELPER FUNCTION: Check if current user is admin
-- =====================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- RETREATS POLICIES (FIX)
-- =====================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Admins can manage retreats" ON retreats;

-- Create proper admin-only policy
CREATE POLICY "Admins can manage retreats" ON retreats
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- RETREAT ROOMS POLICIES (FIX)
-- =====================

DROP POLICY IF EXISTS "Admins can manage retreat rooms" ON retreat_rooms;

CREATE POLICY "Admins can manage retreat rooms" ON retreat_rooms
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- BLOG CATEGORIES POLICIES (FIX)
-- =====================

DROP POLICY IF EXISTS "Admins can manage categories" ON blog_categories;

CREATE POLICY "Admins can manage categories" ON blog_categories
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- BLOG POSTS POLICIES (FIX)
-- =====================

DROP POLICY IF EXISTS "Admins can view all posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;

-- Admins can view all posts (including drafts)
CREATE POLICY "Admins can view all posts" ON blog_posts
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can manage posts
CREATE POLICY "Admins can manage posts" ON blog_posts
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- BOOKINGS POLICIES (FIX)
-- =====================

DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;

-- Admins can manage all bookings
CREATE POLICY "Admins can manage bookings" ON bookings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add policy for customer access via token
DROP POLICY IF EXISTS "Customers can view booking by token" ON bookings;
CREATE POLICY "Customers can view booking by access token" ON bookings
  FOR SELECT
  TO anon, authenticated
  USING (
    access_token IS NOT NULL
    AND access_token_expires_at > NOW()
  );

-- =====================
-- PAYMENTS POLICIES (FIX)
-- =====================

DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- PAYMENT SCHEDULES POLICIES
-- =====================

-- Enable RLS if not already enabled
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Public/anon cannot access payment schedules directly
-- (they access via API with service role)

-- Admins can manage payment schedules
DROP POLICY IF EXISTS "Admins can manage payment schedules" ON payment_schedules;
CREATE POLICY "Admins can manage payment schedules" ON payment_schedules
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view their own payment schedules
DROP POLICY IF EXISTS "Users can view own payment schedules" ON payment_schedules;
CREATE POLICY "Users can view own payment schedules" ON payment_schedules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payment_schedules.booking_id
      AND (
        -- Via email match
        bookings.email = COALESCE(
          current_setting('request.jwt.claims', true)::json->>'email',
          ''
        )
        -- Or via access token (token is passed through a separate lookup)
      )
    )
  );

-- =====================
-- PROMO CODES POLICIES
-- =====================

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
    EXECUTE 'ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Public can validate promo codes (read-only, limited fields via API)
DROP POLICY IF EXISTS "Public can validate promo codes" ON promo_codes;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
    EXECUTE 'CREATE POLICY "Public can validate promo codes" ON promo_codes
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true)';
  END IF;
END $$;

-- Admins can manage promo codes
DROP POLICY IF EXISTS "Admins can manage promo codes" ON promo_codes;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
    EXECUTE 'CREATE POLICY "Admins can manage promo codes" ON promo_codes
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================
-- EMAIL TEMPLATES POLICIES
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    EXECUTE 'ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Admins can manage email templates
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    EXECUTE 'CREATE POLICY "Admins can manage email templates" ON email_templates
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================
-- SITE SETTINGS POLICIES
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    EXECUTE 'ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Public can read site settings
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    EXECUTE 'CREATE POLICY "Public can read site settings" ON site_settings
      FOR SELECT
      TO anon, authenticated
      USING (true)';
  END IF;
END $$;

-- Admins can manage site settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_settings') THEN
    EXECUTE 'CREATE POLICY "Admins can manage site settings" ON site_settings
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================
-- NEWSLETTER SUBSCRIBERS POLICIES
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    EXECUTE 'ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Anyone can subscribe (insert)
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    EXECUTE 'CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true)';
  END IF;
END $$;

-- Admins can manage subscribers
DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON newsletter_subscribers;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'newsletter_subscribers') THEN
    EXECUTE 'CREATE POLICY "Admins can manage newsletter subscribers" ON newsletter_subscribers
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================
-- BOOKING STATUS CHANGES (AUDIT LOG) POLICIES
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_status_changes') THEN
    EXECUTE 'ALTER TABLE booking_status_changes ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Admins can manage audit log
DROP POLICY IF EXISTS "Admins can manage booking audit log" ON booking_status_changes;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'booking_status_changes') THEN
    EXECUTE 'CREATE POLICY "Admins can manage booking audit log" ON booking_status_changes
      FOR ALL
      TO authenticated
      USING (is_admin())
      WITH CHECK (is_admin())';
  END IF;
END $$;

-- =====================
-- PROMO CODE REDEMPTIONS POLICIES
-- =====================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_code_redemptions') THEN
    EXECUTE 'ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Admins can view redemptions
DROP POLICY IF EXISTS "Admins can view promo code redemptions" ON promo_code_redemptions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_code_redemptions') THEN
    EXECUTE 'CREATE POLICY "Admins can view promo code redemptions" ON promo_code_redemptions
      FOR SELECT
      TO authenticated
      USING (is_admin())';
  END IF;
END $$;

-- =====================
-- PROFILES POLICIES
-- =====================

-- Ensure profiles table has RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (but not role)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can manage all profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles" ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================
-- GRANT EXECUTE ON is_admin FUNCTION
-- =====================
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- =====================
-- COMMENT ON SECURITY
-- =====================
COMMENT ON FUNCTION is_admin() IS 'Returns true if the current authenticated user has admin role. Used in RLS policies.';
