-- Add early_bird_deadline column to retreat_rooms table
-- This allows setting a specific date until which early bird pricing is available
-- Default will be calculated as 3 months before retreat start date in the application

ALTER TABLE retreat_rooms
ADD COLUMN IF NOT EXISTS early_bird_deadline DATE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN retreat_rooms.early_bird_deadline IS 'Date until which early bird pricing is available. If NULL, defaults to 3 months before retreat start date.';
