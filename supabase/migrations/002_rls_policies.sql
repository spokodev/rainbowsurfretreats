-- Row Level Security Policies for Rainbow Surf Retreats
-- Run this after 001_initial_schema.sql

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================
ALTER TABLE retreats ENABLE ROW LEVEL SECURITY;
ALTER TABLE retreat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =====================
-- RETREATS POLICIES
-- =====================

-- Public can view published retreats
DROP POLICY IF EXISTS "Public can view published retreats" ON retreats;
CREATE POLICY "Public can view published retreats" ON retreats
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Authenticated users (admins) can do everything
DROP POLICY IF EXISTS "Admins can manage retreats" ON retreats;
CREATE POLICY "Admins can manage retreats" ON retreats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- RETREAT ROOMS POLICIES
-- =====================

-- Public can view rooms for published retreats
DROP POLICY IF EXISTS "Public can view retreat rooms" ON retreat_rooms;
CREATE POLICY "Public can view retreat rooms" ON retreat_rooms
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM retreats
      WHERE retreats.id = retreat_rooms.retreat_id
      AND retreats.is_published = true
    )
  );

-- Admins can manage rooms
DROP POLICY IF EXISTS "Admins can manage retreat rooms" ON retreat_rooms;
CREATE POLICY "Admins can manage retreat rooms" ON retreat_rooms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- BLOG CATEGORIES POLICIES
-- =====================

-- Everyone can view categories
DROP POLICY IF EXISTS "Public can view categories" ON blog_categories;
CREATE POLICY "Public can view categories" ON blog_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON blog_categories;
CREATE POLICY "Admins can manage categories" ON blog_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- BLOG POSTS POLICIES
-- =====================

-- Public can view published posts
DROP POLICY IF EXISTS "Public can view published posts" ON blog_posts;
CREATE POLICY "Public can view published posts" ON blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND published_at <= NOW());

-- Admins can view all posts
DROP POLICY IF EXISTS "Admins can view all posts" ON blog_posts;
CREATE POLICY "Admins can view all posts" ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage posts
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
CREATE POLICY "Admins can manage posts" ON blog_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- BOOKINGS POLICIES
-- =====================

-- Users can view their own bookings by email
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT
  TO anon, authenticated
  USING (
    email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      ''
    )
  );

-- Anyone can create a booking (for checkout)
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can manage all bookings
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;
CREATE POLICY "Admins can manage bookings" ON bookings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- PAYMENTS POLICIES
-- =====================

-- Users can view their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND bookings.email = COALESCE(
        current_setting('request.jwt.claims', true)::json->>'email',
        ''
      )
    )
  );

-- Admins can manage all payments
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- SERVICE ROLE BYPASS (for webhooks)
-- =====================
-- Note: Service role automatically bypasses RLS
-- Use SUPABASE_SERVICE_ROLE_KEY for webhook handlers
