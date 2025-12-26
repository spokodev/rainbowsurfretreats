-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  language VARCHAR(5) DEFAULT 'en',
  source VARCHAR(50) DEFAULT 'website', -- website, checkout, popup
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, unsubscribed
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  welcome_email_sent BOOLEAN DEFAULT false,
  quiz_completed BOOLEAN DEFAULT false,
  quiz_responses JSONB,
  tags JSONB DEFAULT '[]', -- for segmentation
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Confirmation tokens for double opt-in
CREATE TABLE IF NOT EXISTS newsletter_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL, -- confirm, unsubscribe
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post-retreat feedback
CREATE TABLE IF NOT EXISTS retreat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  retreat_id UUID REFERENCES retreats(id),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  surfing_rating INTEGER CHECK (surfing_rating >= 1 AND surfing_rating <= 5),
  accommodation_rating INTEGER CHECK (accommodation_rating >= 1 AND accommodation_rating <= 5),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
  recommend_score INTEGER CHECK (recommend_score >= 0 AND recommend_score <= 10), -- NPS score
  highlights TEXT,
  improvements TEXT,
  testimonial TEXT,
  allow_testimonial_use BOOLEAN DEFAULT false,
  google_review_clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_tokens_token ON newsletter_tokens(token);
CREATE INDEX IF NOT EXISTS idx_feedback_booking ON retreat_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_retreat ON retreat_feedback(retreat_id);

-- RLS policies
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE retreat_feedback ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access newsletter" ON newsletter_subscribers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access tokens" ON newsletter_tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access feedback" ON retreat_feedback
  FOR ALL USING (true) WITH CHECK (true);

-- Update trigger
CREATE OR REPLACE FUNCTION update_newsletter_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_newsletter_timestamp();
