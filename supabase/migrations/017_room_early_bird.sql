-- Migration: Add Early Bird pricing to retreat rooms
-- Allows each room to have its own Early Bird price that can be toggled on/off

-- Add Early Bird fields to retreat_rooms table
ALTER TABLE retreat_rooms
ADD COLUMN early_bird_price DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN early_bird_enabled BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN retreat_rooms.early_bird_price IS 'Special Early Bird price for this room (null means no Early Bird available)';
COMMENT ON COLUMN retreat_rooms.early_bird_enabled IS 'Manual toggle to enable/disable Early Bird pricing for this specific room';
