-- Rainbow Surf Retreats Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- RETREATS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS retreats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  image_url TEXT,
  level VARCHAR(50) NOT NULL CHECK (level IN ('Beginners', 'Intermediate', 'Advanced', 'All Levels')),
  duration VARCHAR(50) NOT NULL,
  participants VARCHAR(20) NOT NULL,
  food VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('Budget', 'Standard', 'Premium')),
  gear VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  early_bird_price DECIMAL(10,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  intro_text TEXT,
  check_in_time TIME,
  check_out_time TIME,
  exact_address TEXT,
  address_note TEXT,
  pricing_note TEXT,
  highlights TEXT[] DEFAULT '{}',
  included TEXT[] DEFAULT '{}',
  not_included TEXT[] DEFAULT '{}',
  about_sections JSONB DEFAULT '[]',
  important_info JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- RETREAT ROOMS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS retreat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  deposit_price DECIMAL(10,2) NOT NULL,
  capacity INTEGER DEFAULT 1,
  available INTEGER NOT NULL DEFAULT 0,
  is_sold_out BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BLOG CATEGORIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(50) DEFAULT 'gray',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO blog_categories (name, slug, color) VALUES
  ('Destinations', 'destinations', 'purple'),
  ('Travel Tips', 'travel-tips', 'blue'),
  ('LGBTQ+', 'lgbtq', 'pink'),
  ('Wellness', 'wellness', 'green'),
  ('Environment', 'environment', 'teal')
ON CONFLICT (slug) DO NOTHING;

-- =====================
-- BLOG POSTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name VARCHAR(255) NOT NULL DEFAULT 'Rainbow Surf Team',
  category_id UUID REFERENCES blog_categories(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  meta_title VARCHAR(500),
  meta_description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BOOKINGS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(20) NOT NULL UNIQUE,
  retreat_id UUID NOT NULL REFERENCES retreats(id),
  room_id UUID REFERENCES retreat_rooms(id),

  -- Guest Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),

  -- Billing Address
  billing_address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) NOT NULL DEFAULT 'DE',

  -- Booking Details
  guests_count INTEGER DEFAULT 1,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_code VARCHAR(50),
  vat_rate DECIMAL(5,4) DEFAULT 0,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  balance_due DECIMAL(10,2) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit', 'paid', 'refunded', 'partial_refund')),

  -- Consent
  accept_terms BOOLEAN DEFAULT false,
  newsletter_opt_in BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  internal_notes TEXT,
  source VARCHAR(50) DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PAYMENTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Stripe Data
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('deposit', 'balance', 'full', 'refund')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),

  -- Metadata
  payment_method VARCHAR(50),
  receipt_url TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_retreats_published ON retreats(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_retreats_start_date ON retreats(start_date);
CREATE INDEX IF NOT EXISTS idx_retreat_rooms_retreat_id ON retreat_rooms(retreat_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_retreat_id ON bookings(retreat_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON payments(stripe_payment_intent_id);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_retreats_updated_at ON retreats;
CREATE TRIGGER update_retreats_updated_at BEFORE UPDATE ON retreats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retreat_rooms_updated_at ON retreat_rooms;
CREATE TRIGGER update_retreat_rooms_updated_at BEFORE UPDATE ON retreat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- BOOKING NUMBER GENERATION
-- =====================
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number = 'RSR-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(NEXTVAL('booking_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_number ON bookings;
CREATE TRIGGER set_booking_number BEFORE INSERT ON bookings
  FOR EACH ROW WHEN (NEW.booking_number IS NULL)
  EXECUTE FUNCTION generate_booking_number();

-- =====================
-- HELPER FUNCTION: Increment blog views
-- =====================
CREATE OR REPLACE FUNCTION increment_blog_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts SET views = views + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;
