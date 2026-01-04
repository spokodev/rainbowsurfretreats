-- Make retreat-level price fields optional (prices are set per room)
-- This is a backwards-compatible change - existing data is preserved

ALTER TABLE retreats ALTER COLUMN price DROP NOT NULL;
ALTER TABLE retreats ALTER COLUMN price SET DEFAULT NULL;
