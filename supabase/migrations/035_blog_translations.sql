-- Migration: Add multilingual support to blog_posts
-- This adds primary_language and translations JSONB column for storing
-- translated versions of blog posts (title, slug, excerpt, content, meta)

-- Add primary_language column (default 'en' for existing posts)
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS primary_language VARCHAR(5) DEFAULT 'en';

-- Add translations JSONB column
-- Structure:
-- {
--   "de": { "title": "...", "slug": "...", "excerpt": "...", "content": "...", "meta_title": "...", "meta_description": "..." },
--   "es": { "title": "...", "slug": "...", "excerpt": "...", "content": "...", "meta_title": "...", "meta_description": "..." },
--   "fr": { ... },
--   "nl": { ... }
-- }
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

-- Index for faster language queries using GIN index
CREATE INDEX IF NOT EXISTS idx_blog_posts_translations ON blog_posts USING gin(translations);

-- Index for primary_language queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_primary_language ON blog_posts(primary_language);

-- Add constraint to validate primary_language values
ALTER TABLE blog_posts
ADD CONSTRAINT valid_primary_language
CHECK (primary_language IN ('en', 'de', 'es', 'fr', 'nl'));

-- Function to get blog post content in a specific language
-- Falls back to primary language if translation doesn't exist
CREATE OR REPLACE FUNCTION get_blog_post_localized(
  post_row blog_posts,
  target_lang VARCHAR(5)
)
RETURNS TABLE (
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  content TEXT,
  meta_title TEXT,
  meta_description TEXT
) AS $$
BEGIN
  -- If target language is the primary language, return primary fields
  IF target_lang = post_row.primary_language THEN
    RETURN QUERY SELECT
      post_row.title::TEXT,
      post_row.slug::TEXT,
      post_row.excerpt::TEXT,
      post_row.content::TEXT,
      post_row.meta_title::TEXT,
      post_row.meta_description::TEXT;
  -- If translation exists for target language
  ELSIF post_row.translations ? target_lang THEN
    RETURN QUERY SELECT
      COALESCE((post_row.translations->target_lang->>'title')::TEXT, post_row.title::TEXT),
      COALESCE((post_row.translations->target_lang->>'slug')::TEXT, post_row.slug::TEXT),
      COALESCE((post_row.translations->target_lang->>'excerpt')::TEXT, post_row.excerpt::TEXT),
      COALESCE((post_row.translations->target_lang->>'content')::TEXT, post_row.content::TEXT),
      COALESCE((post_row.translations->target_lang->>'meta_title')::TEXT, post_row.meta_title::TEXT),
      COALESCE((post_row.translations->target_lang->>'meta_description')::TEXT, post_row.meta_description::TEXT);
  -- Fallback to primary language
  ELSE
    RETURN QUERY SELECT
      post_row.title::TEXT,
      post_row.slug::TEXT,
      post_row.excerpt::TEXT,
      post_row.content::TEXT,
      post_row.meta_title::TEXT,
      post_row.meta_description::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comment on columns for documentation
COMMENT ON COLUMN blog_posts.primary_language IS 'Primary language of the blog post (en, de, es, fr, nl)';
COMMENT ON COLUMN blog_posts.translations IS 'JSONB object containing translations for each language. Keys are language codes, values are objects with title, slug, excerpt, content, meta_title, meta_description';
