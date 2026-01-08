-- Migration: Add retreat gallery images table
-- This allows admins to manage multiple images for each retreat

CREATE TABLE IF NOT EXISTS retreat_gallery_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retreat_id UUID NOT NULL REFERENCES retreats(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by retreat
CREATE INDEX IF NOT EXISTS idx_retreat_gallery_retreat_id ON retreat_gallery_images(retreat_id);
CREATE INDEX IF NOT EXISTS idx_retreat_gallery_sort_order ON retreat_gallery_images(retreat_id, sort_order);

-- Enable RLS
ALTER TABLE retreat_gallery_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read gallery images
CREATE POLICY "Gallery images are viewable by everyone"
ON retreat_gallery_images FOR SELECT
USING (true);

-- Policy: Only authenticated admins can manage gallery images
CREATE POLICY "Admins can manage gallery images"
ON retreat_gallery_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_retreat_gallery_images_updated_at
  BEFORE UPDATE ON retreat_gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
