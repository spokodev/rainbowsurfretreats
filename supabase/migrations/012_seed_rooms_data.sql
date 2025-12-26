-- Seed room data for all retreats
-- Migration: 012_seed_rooms_data.sql

-- ==========================================
-- Siargao, Philippines Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Room',
  'Shared twin room in our private Rainbow Surf villa with daily breakfast included.',
  795.00,
  397.50, -- 50% deposit
  2,
  0,
  true,
  1
FROM retreats WHERE slug = 'siargao-philippines-jan-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Standard Room',
  'Private standard room in the villa with all amenities.',
  995.00,
  497.50,
  1,
  0,
  true,
  2
FROM retreats WHERE slug = 'siargao-philippines-jan-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Room with Balcony',
  'Private room with balcony and premium views.',
  1295.00,
  647.50,
  1,
  0,
  true,
  3
FROM retreats WHERE slug = 'siargao-philippines-jan-2026';

-- ==========================================
-- Morocco Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Triple Room',
  'Shared room for 3 guests at Dar Zitoun with garden views.',
  995.00,
  99.50, -- 10% deposit
  3,
  0,
  true,
  1
FROM retreats WHERE slug = 'morocco-march-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Room',
  'Shared twin room at Dar Zitoun with breakfast and dinner included.',
  1195.00,
  597.50, -- 50% deposit
  2,
  0,
  true,
  2
FROM retreats WHERE slug = 'morocco-march-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Suite',
  'Shared suite with premium amenities and ocean views.',
  1495.00,
  747.50,
  2,
  2,
  false,
  3
FROM retreats WHERE slug = 'morocco-march-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Suite',
  'Private suite with pool view and premium amenities.',
  1995.00,
  997.50,
  1,
  1,
  false,
  4
FROM retreats WHERE slug = 'morocco-march-2026';

-- ==========================================
-- Indonesia / Sumbawa Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Room',
  'Shared twin luxury bungalow at Mocean Resort with 3 meals/day.',
  1780.00,
  178.00, -- 10% deposit
  2,
  0,
  true,
  1
FROM retreats WHERE slug = 'indonesia-may-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Room',
  'Private luxury bungalow with A/C, big comfy bed, and dream bathroom.',
  2460.00,
  246.00,
  1,
  0,
  true,
  2
FROM retreats WHERE slug = 'indonesia-may-2026';

-- ==========================================
-- France / Hossegor Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Dorm',
  'Dorm bed in our chic surf villa. Perfect for solo travelers on a budget.',
  1195.00,
  119.50, -- 10% deposit
  4,
  4,
  false,
  1
FROM retreats WHERE slug = 'france-june-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Room',
  'Shared twin room in the stylish surf villa with private bathroom.',
  1795.00,
  179.50,
  2,
  2,
  false,
  2
FROM retreats WHERE slug = 'france-june-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Room',
  'Private room with own bathroom, jacuzzi access, and BBQ area.',
  2495.00,
  249.50,
  1,
  0,
  true,
  3
FROM retreats WHERE slug = 'france-june-2026';

-- ==========================================
-- Bali / Medewi Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Twin Room Garden View',
  'Shared twin room with garden view at Umadewi Surf & Retreat.',
  1080.00,
  108.00, -- 10% deposit
  2,
  4,
  false,
  1
FROM retreats WHERE slug = 'bali-september-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Twin Room Pool View',
  'Shared twin room with pool view and gorgeous sea views.',
  1460.00,
  146.00,
  2,
  2,
  false,
  2
FROM retreats WHERE slug = 'bali-september-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Ocean Suite',
  'Private suite with sea view, beautifully decorated cabin.',
  2450.00,
  245.00,
  1,
  1,
  false,
  3
FROM retreats WHERE slug = 'bali-september-2026';

-- ==========================================
-- Portugal / Baleal Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Dorm (4 pax)',
  'Dorm bed in our cozy surf house. Budget-friendly option.',
  995.00,
  99.50, -- 10% deposit
  4,
  8,
  false,
  1
FROM retreats WHERE slug = 'portugal-october-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin Room',
  'Shared twin room in decorated surf house with independent bathroom.',
  1495.00,
  149.50,
  2,
  4,
  false,
  2
FROM retreats WHERE slug = 'portugal-october-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Room',
  'Private room with own bathroom in our cute surf house.',
  1995.00,
  199.50,
  1,
  2,
  false,
  3
FROM retreats WHERE slug = 'portugal-october-2026';

-- ==========================================
-- Panama Rooms
-- ==========================================
INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  '4-way Dorm',
  'Dorm at Beach Break Surf Camp. Includes first night in Panama City.',
  995.00,
  99.50, -- 10% deposit
  4,
  8,
  false,
  1
FROM retreats WHERE slug = 'panama-december-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Shared Twin/Double Room',
  'Shared room at Beach Break with beachfront pool access.',
  1395.00,
  139.50,
  2,
  4,
  false,
  2
FROM retreats WHERE slug = 'panama-december-2026';

INSERT INTO retreat_rooms (retreat_id, name, description, price, deposit_price, capacity, available, is_sold_out, sort_order)
SELECT
  id,
  'Private Ocean Suite',
  'Private room with king bed and premium ocean views.',
  1895.00,
  189.50,
  1,
  2,
  false,
  3
FROM retreats WHERE slug = 'panama-december-2026';
