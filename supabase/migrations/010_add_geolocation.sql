-- Add geolocation fields to retreats for map integration
-- Migration: 010_add_geolocation.sql

-- Add latitude and longitude for map coordinates
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Add map zoom level (default 12 for city-level zoom)
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS map_zoom INTEGER DEFAULT 12;

-- Add country code for filtering/grouping
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Add slug for URL-friendly paths
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Add unique constraint on slug (separate statement for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'retreats_slug_key'
  ) THEN
    ALTER TABLE retreats ADD CONSTRAINT retreats_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add status field for availability tracking (sold_out, few_spots, available)
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'available'
CHECK (availability_status IN ('available', 'few_spots', 'sold_out'));

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_retreats_slug ON retreats(slug);

-- Create index on start_date for date-based queries
CREATE INDEX IF NOT EXISTS idx_retreats_start_date ON retreats(start_date);

-- Create index on country_code for filtering
CREATE INDEX IF NOT EXISTS idx_retreats_country_code ON retreats(country_code);
