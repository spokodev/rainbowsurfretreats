-- Migration: Automatic retreat availability_status sync
-- This trigger automatically updates retreat.availability_status based on room availability

-- Function to calculate and update retreat availability status
CREATE OR REPLACE FUNCTION update_retreat_availability_status()
RETURNS TRIGGER AS $$
DECLARE
  retreat_uuid UUID;
  total_available INTEGER;
  all_sold_out BOOLEAN;
  room_count INTEGER;
BEGIN
  -- Get retreat_id from the affected row
  IF TG_TABLE_NAME = 'retreat_rooms' THEN
    retreat_uuid := COALESCE(NEW.retreat_id, OLD.retreat_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Exit if no retreat_id
  IF retreat_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate room availability statistics
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN NOT is_sold_out THEN available ELSE 0 END), 0),
    COALESCE(BOOL_AND(is_sold_out OR available = 0), true)
  INTO room_count, total_available, all_sold_out
  FROM retreat_rooms
  WHERE retreat_id = retreat_uuid;

  -- Update retreat availability_status
  -- If no rooms exist, keep as 'available'
  IF room_count = 0 THEN
    UPDATE retreats
    SET availability_status = 'available'
    WHERE id = retreat_uuid;
  ELSE
    UPDATE retreats
    SET availability_status = CASE
      WHEN all_sold_out THEN 'sold_out'
      WHEN total_available <= 3 THEN 'few_spots'
      ELSE 'available'
    END
    WHERE id = retreat_uuid;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS sync_retreat_availability ON retreat_rooms;

-- Create trigger on retreat_rooms table
CREATE TRIGGER sync_retreat_availability
AFTER INSERT OR UPDATE OR DELETE ON retreat_rooms
FOR EACH ROW
EXECUTE FUNCTION update_retreat_availability_status();

-- Function to decrement room availability (called from API when booking is confirmed)
CREATE OR REPLACE FUNCTION decrement_room_availability(room_uuid UUID, decrement_count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE retreat_rooms
  SET
    available = GREATEST(0, available - decrement_count),
    is_sold_out = CASE WHEN available - decrement_count <= 0 THEN true ELSE is_sold_out END,
    updated_at = NOW()
  WHERE id = room_uuid;
  -- Note: The sync_retreat_availability trigger will automatically update the retreat status
END;
$$ LANGUAGE plpgsql;

-- One-time fix: Update all existing retreat statuses based on current room availability
UPDATE retreats r
SET availability_status = (
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'available'  -- No rooms = available
    WHEN COALESCE(BOOL_AND(rm.is_sold_out OR rm.available = 0), true) THEN 'sold_out'
    WHEN COALESCE(SUM(CASE WHEN NOT rm.is_sold_out THEN rm.available ELSE 0 END), 0) <= 3 THEN 'few_spots'
    ELSE 'available'
  END
  FROM retreat_rooms rm
  WHERE rm.retreat_id = r.id
);

-- Add comment explaining the sync logic
COMMENT ON FUNCTION update_retreat_availability_status() IS
'Automatically updates retreat.availability_status based on room availability:
- sold_out: all rooms are sold out or have 0 available spots
- few_spots: total available spots across all rooms <= 3
- available: otherwise';

COMMENT ON FUNCTION decrement_room_availability(UUID, INTEGER) IS
'Decrements room availability count when a booking is confirmed.
Automatically marks room as sold_out when available reaches 0.
The sync_retreat_availability trigger will update retreat status.';
