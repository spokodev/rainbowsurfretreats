-- =====================
-- SOFT DELETE MIGRATION
-- Adds deleted_at columns for retreats and blog_posts
-- =====================

-- Add deleted_at column to retreats
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_by column for audit
ALTER TABLE retreats
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add deleted_at column to blog_posts
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_by column for audit
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- =====================
-- INDEXES FOR SOFT DELETE
-- =====================

-- Partial index for active retreats (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_retreats_not_deleted
ON retreats(id) WHERE deleted_at IS NULL;

-- Partial index for deleted retreats (for trash view)
CREATE INDEX IF NOT EXISTS idx_retreats_deleted
ON retreats(deleted_at) WHERE deleted_at IS NOT NULL;

-- Same for blog_posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_not_deleted
ON blog_posts(id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted
ON blog_posts(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================
-- CLEANUP FUNCTION
-- =====================

-- Function to clean up items deleted more than N days ago
CREATE OR REPLACE FUNCTION cleanup_soft_deleted_items(days_old INTEGER DEFAULT 30)
RETURNS TABLE(
  deleted_retreats INTEGER,
  deleted_blog_posts INTEGER
) AS $$
DECLARE
  retreats_count INTEGER;
  posts_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::INTERVAL;

  -- Delete old retreats (rooms cascade automatically due to ON DELETE CASCADE)
  WITH deleted AS (
    DELETE FROM retreats
    WHERE deleted_at IS NOT NULL
      AND deleted_at < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO retreats_count FROM deleted;

  -- Delete old blog posts
  WITH deleted AS (
    DELETE FROM blog_posts
    WHERE deleted_at IS NOT NULL
      AND deleted_at < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO posts_count FROM deleted;

  deleted_retreats := retreats_count;
  deleted_blog_posts := posts_count;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
