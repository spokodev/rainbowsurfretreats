-- Migration: Room Availability Increment Function
-- Purpose: Return room availability when booking is refunded or cancelled

-- Function to increment room availability (opposite of decrement_room_availability)
CREATE OR REPLACE FUNCTION increment_room_availability(
  room_uuid UUID,
  increment_count INT DEFAULT 1
) RETURNS void AS $$
DECLARE
  current_available INT;
  room_capacity INT;
BEGIN
  -- Get current availability and capacity
  SELECT available, capacity INTO current_available, room_capacity
  FROM retreat_rooms
  WHERE id = room_uuid;

  -- Don't increment beyond capacity
  IF current_available + increment_count > room_capacity THEN
    increment_count := room_capacity - current_available;
  END IF;

  -- Only update if there's something to increment
  IF increment_count > 0 THEN
    UPDATE retreat_rooms
    SET
      available = available + increment_count,
      is_sold_out = false,
      updated_at = NOW()
    WHERE id = room_uuid;
  END IF;

  -- Note: sync_retreat_availability trigger will automatically update
  -- the retreat's availability_status based on total room availability
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_room_availability(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_room_availability(UUID, INT) TO service_role;

COMMENT ON FUNCTION increment_room_availability IS
'Increments room availability when a booking is refunded or cancelled.
Does not exceed room capacity. Triggers sync_retreat_availability automatically.';
