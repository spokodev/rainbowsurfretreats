-- Storage Buckets for Rainbow Surf Retreats
-- Run this in Supabase SQL Editor after creating buckets in Dashboard

-- Note: Buckets should be created via Supabase Dashboard:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket "retreat-images" (public)
-- 3. Create bucket "blog-images" (public)

-- Then run these policies:

-- =====================
-- RETREAT IMAGES BUCKET POLICIES
-- =====================

-- Public can view retreat images
DROP POLICY IF EXISTS "Public can view retreat images" ON storage.objects;
CREATE POLICY "Public can view retreat images" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'retreat-images');

-- Admins can upload retreat images
DROP POLICY IF EXISTS "Admins can upload retreat images" ON storage.objects;
CREATE POLICY "Admins can upload retreat images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'retreat-images');

-- Admins can update retreat images
DROP POLICY IF EXISTS "Admins can update retreat images" ON storage.objects;
CREATE POLICY "Admins can update retreat images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'retreat-images');

-- Admins can delete retreat images
DROP POLICY IF EXISTS "Admins can delete retreat images" ON storage.objects;
CREATE POLICY "Admins can delete retreat images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'retreat-images');

-- =====================
-- BLOG IMAGES BUCKET POLICIES
-- =====================

-- Public can view blog images
DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;
CREATE POLICY "Public can view blog images" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'blog-images');

-- Admins can upload blog images
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

-- Admins can update blog images
DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images');

-- Admins can delete blog images
DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images');
