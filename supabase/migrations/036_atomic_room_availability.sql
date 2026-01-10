-- Migration: Atomic Room Availability Functions
-- Purpose: Prevent race conditions when multiple bookings compete for same room

-- Function to atomically try to decrement room availability
-- Returns true if successful, false if not enough availability
CREATE OR REPLACE FUNCTION try_decrement_room_availability(
  room_uuid UUID,
  decrement_count INT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  rows_updated INT;
BEGIN
  -- Atomically update only if there's enough availability
  -- Uses WHERE clause to ensure atomic check-and-update
  UPDATE retreat_rooms
  SET
    available = available - decrement_count,
    is_sold_out = CASE WHEN available - decrement_count <= 0 THEN true ELSE is_sold_out END,
    updated_at = NOW()
  WHERE id = room_uuid
    AND available >= decrement_count;  -- Only update if enough spots

  -- Check if update was successful
  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  -- Return true if we successfully decremented
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION try_decrement_room_availability(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION try_decrement_room_availability(UUID, INT) TO service_role;

COMMENT ON FUNCTION try_decrement_room_availability IS
'Atomically tries to decrement room availability. Returns true if successful,
false if the room does not have enough available spots. This prevents race
conditions where multiple concurrent bookings could overbook a room.';
