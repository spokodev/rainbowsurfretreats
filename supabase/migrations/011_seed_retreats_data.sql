-- Seed real retreat data from rainbowsurfretreats.com
-- Migration: 011_seed_retreats_data.sql

-- Clear existing mock/test data (careful in production!)
DELETE FROM retreat_rooms;
DELETE FROM retreats;

-- Insert all 7 retreats with real data from Wix site

-- 1. Siargao, Philippines (SOLD OUT)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Siargao, Philippines',
  'General Luna',
  'siargao-philippines-jan-2026',
  '/images/retreats/retreats-siargao-philippines.jpg',
  'All Levels',
  '7 days',
  '12',
  'Breakfast included',
  'Standard',
  'Board rental included',
  995.00,
  NULL,
  '2026-01-25',
  '2026-02-01',
  E'Join us for an unforgettable surf getaway on the dreamy island of Siargao, the surfing capital of the Philippines. From 25 Jan – 1 Feb 2026, we''ll be staying in a private Rainbow Surf villa just a short walk from the island''s most playful and beginner-friendly surf breaks.\n\nExpect warm turquoise water, white sand, and mellow island vibes, all yours for a week of barefoot luxury and tropical joy.\n\nThis retreat is hosted by Rainbow Surf Retreats in partnership with the queer-owned local surf school: Surf Plus Friends, led by our island friend Raffy, with a team of all-gay instructors who know these waves like the back of their hands.',
  'The surfing capital of the Philippines with warm turquoise water, white sand, and mellow island vibes.',
  'Barangay, Tourism Rd, General Luna, 8419 Surigao del Norte, Philippines',
  9.8567,
  126.1016,
  'PH',
  13,
  'sold_out',
  '15:00',
  '11:00',
  ARRAY['Private Rainbow Surf villa', 'Queer surf instructors from Surf Plus Friends', 'Daily breakfast', 'Scooter rental included', 'Warm turquoise water', 'White sand beaches'],
  ARRAY['7 nights accommodation in private villa', 'Daily surf lessons with queer instructors (2:1 max)', 'Surf board rental', 'Daily breakfast', 'Scooter rental', 'Morning Mobility', 'Surf Theory & Philosophy', 'Yoga', 'Video analysis', 'Community, connection, and queer joy'],
  ARRAY['Lunch & dinner (local food spots together)', 'Flights', 'Travel insurance'],
  '[]'::jsonb,
  true
);

-- 2. Morocco (Available)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Morocco',
  'Imsouane',
  'morocco-march-2026',
  '/images/retreats/retreats-morocco.jpg',
  'All Levels',
  '7 days',
  '12',
  'Breakfast & Dinner',
  'Standard',
  'Board & Wetsuit rental',
  1195.00,
  NULL,
  '2026-03-21',
  '2026-03-28',
  E'Imsouane is a tiny, quiet fishing town off the coast of Morocco that boasts the longest wave in Africa. On one side you have The Bay which is perfect for learning and cruising on longboards. On the other side you have La Cathédrale which gets heavier, faster surf if you prefer shortboards.\n\nThe accommodation is at Olo Surf Nature''s Dar Zitoun in Imsouane which is, hands down, the nicest place in town. It''s a private villa with hotel services, a peaceful garden and a big pool with views of the surf. Some rooms are in the main house, others are scattered around through the garden. The staff is amazing and they welcome us like friends.\n\nThe surf retreat package includes board rentals, daily breakfasts and dinner, up to 2 hours of surf instruction per day, plus video analysis, and a photo and video package of your surfing to take home with you.',
  'Hosted at Olo Surf Nature''s Dar Zitoun in Imsouane with private rooms, ocean views, and the longest wave in Africa.',
  '551 Lot Amadel, Imsouane 80043, Morocco',
  30.8422,
  -9.8214,
  'MA',
  14,
  'available',
  '12:00',
  '12:00',
  ARRAY['The longest wave in Africa', 'Private villa with pool', 'Ocean views from rooms', 'Authentic Moroccan fishing town', 'Fresh fish of the day', 'Peaceful garden setting'],
  ARRAY['7 days at Dar Zitoun', 'Surf Lessons (up to 2 hours/day)', 'Board and Wetsuit Rental', 'Daily Breakfasts', 'Dinners', 'Surf theory classes', 'Video analysis', 'Daily Morning Mobility', 'Yoga and Meditation', 'Breath work', 'Surfboard workshop', 'Unlimited hugs and high fives', 'New friends and surf buddies'],
  ARRAY['Lunch', 'Family dinners (€175 optional)', 'Flights', 'Travel Insurance', 'Airport Transfer (€60 optional)'],
  '[]'::jsonb,
  true
);

-- 3. Indonesia / Sumbawa (SOLD OUT)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Indonesia',
  'Sumbawa',
  'indonesia-may-2026',
  '/images/retreats/retreats-indonesia.jpg',
  'All Levels',
  '7 days',
  '12',
  '3 meals/day',
  'Premium',
  'Local rental network',
  1780.00,
  1602.00,
  '2026-05-16',
  '2026-05-23',
  E'We loved it so much, we''re doing it again. Sumbawa gave us empty peaks, warm waters, and good vibes all around—so we''re setting up camp for another unforgettable gay surf retreat in May 2026.\n\nThis time, we''ve locked in something extra special: Mocean Resort — a stunning beachfront hotel sitting right in front of one of the area''s most consistent breaks. It''s in the same dreamy bay with private beach access, a gorgeous pool, and 6 pure luxury bungalows featuring A/C, BIG comfy beds, dream bathrooms and drinkable tap water.\n\nFrom our doorstep, you can grab your board and paddle straight out—or hop on a scooter and chase the other breaks around town. There are mellow waves for beginners, punchy waves for the bold, and world-class options just an hour away like Scar Reef, Yoyo''s, and Tropicals.',
  'Rainbow Surf coaching at Mocean Resort, right on the beach in front of the peak. Luxury bungalows with 3 meals/day.',
  'Mocean Resort, Sumbawa, Indonesia',
  -8.4955,
  117.4225,
  'ID',
  12,
  'sold_out',
  '15:00',
  '11:00',
  ARRAY['Luxury beachfront bungalows', 'Empty peaks and warm waters', 'Private beach access', 'Gorgeous pool', 'World-class breaks nearby (Scar Reef, Yoyo''s, Tropicals)', 'Drinkable tap water'],
  ARRAY['7 days of pure surf bliss', 'Luxury accommodation at Mocean Resort', '3 meals/day (we eat very well)', 'Water, Tea & Coffee', 'Santosha Progression Program: video analysis, dry-land technique sessions, focused surf coaching', 'Surf philosophy & theory', 'Daily Morning Mobility', 'Daily Sunset Stretch Out', 'Transport to other spots', 'Optional scuba diving', 'Video package', 'Queer community vibes'],
  ARRAY['Surfboard rental (~€150/week)', 'Flights', 'Travel insurance'],
  '[]'::jsonb,
  true
);

-- 4. France / Hossegor (Available)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'France',
  'Hossegor',
  'france-june-2026',
  '/images/retreats/retreats-france.jpg',
  'All Levels',
  '7 days',
  '12',
  'Breakfast included',
  'Premium',
  'Board & Wetsuit included',
  1795.00,
  NULL,
  '2026-06-06',
  '2026-06-13',
  E'Discover the ultimate surf experience at our gay surf retreat in the iconic surf capital of Hossegor, France, from 6–13 June 2026.\n\nFamed for its golden beaches, pine forests, and effortlessly cool surf vibe, Hossegor offers the perfect mix of world-class waves, delicious French food, and summer energy you won''t find anywhere else.\n\nThis year we''ll stay in a chic, stylish surf villa tucked between the ocean and the forest — private, peaceful, and pure surf paradise. Our home features beautiful rooms, each with its own bathroom, and a private chef to keep you fuelled with fresh, healthy meals. Expect cozy common areas, jacuzzi, barbecue, and sunsets that hit just right with a glass of rosé in hand.\n\nHostegor is the undisputed surf capital of Europe. Every surfer dreams of riding these waves — from mellow beach breaks to famous barrels like La Gravière and La Nord.',
  'The iconic surf capital of Europe. Golden beaches, pine forests, and effortlessly cool surf vibe with world-class waves.',
  '40150 Hossegor, France',
  43.6667,
  -1.4000,
  'FR',
  13,
  'available',
  '16:00',
  '10:00',
  ARRAY['Surf capital of Europe', 'Chic stylish surf villa', 'Private chef', 'Jacuzzi & BBQ', 'Golden beaches', 'Pine forests', 'World-class waves (La Gravière, La Nord)'],
  ARRAY['Accommodation in surf villa', 'Daily breakfast', 'Daily surf lessons', 'Surfboard rental', 'Wetsuit use', 'Video analysis', 'Surf theory & philosophy', 'Dry-land surf training', 'Daily morning mobility & yoga', '3 evening yin yoga sessions', 'Professional surf photos & videos', 'A million hugs, laughs, and lifelong friends'],
  ARRAY['Dinners (€200/week optional)', 'Airport/Train transfer', 'Excursions (San Sebastián, Biarritz)'],
  '[]'::jsonb,
  true
);

-- 5. Bali / Medewi (Available)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Bali',
  'Medewi',
  'bali-september-2026',
  '/images/retreats/retreats-bali.jpg',
  'All Levels',
  '10 days',
  '12',
  'Breakfast included',
  'Standard',
  'Board rental included',
  1080.00,
  NULL,
  '2026-09-11',
  '2026-09-21',
  E'For 11 days and 10 nights, we''ll be at the beautiful Umadewi Surf & Retreat in Medewi in Bali. September 11-21, 2026.\n\nMedewi is situated in the West of the island, far away from the hustle and bustle of the touristy parts of the island, surrounded by palm tree forests and rice patties. It is known for being the longest left hand wave on the island on one side of the bay, and a sandy beach with white water breaks for the beginners in the middle.\n\nThe hotel is hands down the nicest hotel there, beautifully decorated with nice cabins and a gorgeous sea view. There is a huge garden with a big swimming pool to lounge around and a restaurant with views out to the surf break and sunsets. Surf lessons are 1 coach for every 1 or two surfers. For the more adventurous and advanced surfers, there are all kinds of breaks just a moped''s ride away.',
  'Far away from the hustle and bustle, surrounded by palm tree forests and rice patties. Home to the longest left wave of Bali.',
  'Jl. Pantai Medewi, Jl. Raya Denpasar - Gilimanuk No.KM 73, Medewi, Kec. Pekutatan, Kabupaten Jembrana, Bali 82262, Indonesia',
  -8.3922,
  114.8044,
  'ID',
  13,
  'available',
  '15:00',
  '11:00',
  ARRAY['Longest left wave of Bali', 'Beautifully decorated cabins', 'Gorgeous sea view', 'Big swimming pool', 'Palm tree forests', 'Rice patties surroundings', 'Restaurant with sunset views'],
  ARRAY['10 days at Umadewi Surf & Retreat', 'Welcome massage', 'Daily Surf Lessons (2:1 instructor)', 'Breakfast', 'Surf theory classes', '3x Video analysis', '10x Morning Mobility', '3x Yoga and Meditation', 'The longest left wave of Bali', 'Smiles for miles, bear hugs, high fives, laughs, love and sunshine'],
  ARRAY['Lunch', 'Family dinners (€200 optional)', 'Flights', 'Travel Insurance', 'Local trips and expeditions', 'Airport Transfer (€90 optional)'],
  '[]'::jsonb,
  true
);

-- 6. Portugal / Baleal (Available)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Portugal',
  'Baleal',
  'portugal-october-2026',
  '/images/retreats/retreats-portugal.jpg',
  'All Levels',
  '7 days',
  '12',
  'Breakfast included',
  'Standard',
  'Board & Wetsuit included',
  1495.00,
  NULL,
  '2026-10-10',
  '2026-10-17',
  E'Discover the ultimate surf experience at our gay surf retreat in the beautiful coastal town of Baleal, Portugal from 10-17 October 2026. Nestled within this picturesque surf haven, you''ll find the perfect blend of vibrant culture, stunning beaches, and world-class waves for every level.\n\nOur home this year will be 2 perfectly decorated super cozy surf houses, stuck to each other, with an in-house cook for extra healthy meals. 9 rooms in total, all with independent bathrooms. It''s close to the surf, far from any noise and just cute AF.\n\nBaleal is a gem on Portugal''s Silver Coast, renowned for its exceptional surfing conditions. This charming town conquered our hearts last year with its authentic laid-back surfer''s vibe.\n\nClose to Nazaré: Just a short drive away is Nazaré, home to the biggest waves in the world. On days with a big swell, we''ll take a trip to this legendary spot to witness waves up to 100 feet high.',
  'Portugal''s Silver Coast gem. The perfect blend of vibrant culture, stunning beaches, and world-class waves.',
  'Baleal 2501, 2520 Ferrel, Portugal',
  39.3747,
  -9.3414,
  'PT',
  14,
  'available',
  '15:00',
  '11:00',
  ARRAY['World-class waves on Silver Coast', 'Cozy decorated surf houses', 'In-house cook', 'Close to Nazaré (biggest waves in the world)', 'Berlinga Grande Island nearby', 'Laid-back surfer''s vibe'],
  ARRAY['Room accommodation', 'Daily Breakfast', 'Daily surf lessons', 'Surfboard rental', 'Wetsuits', '2 Video analysis sessions', '3 Surf theory classes', 'Surf philosophy', 'Dry-land training', 'Daily morning mobility yoga', '3 yin yoga classes', 'Photos and videos for your socials', 'A million hugs, cheers, surfer smiles, friends and games'],
  ARRAY['Dinners (€140/week optional)', 'Airport transfer (€100 optional)', 'Trip to Nazaré (weather dependent)', 'Trip to Berlinga Grande (weather dependent)'],
  '[]'::jsonb,
  true
);

-- 7. Panama (Available with 10% early bird discount)
INSERT INTO retreats (
  destination, location, slug, image_url, level, duration, participants, food, type, gear,
  price, early_bird_price, start_date, end_date, description, intro_text,
  exact_address, latitude, longitude, country_code, map_zoom, availability_status,
  check_in_time, check_out_time,
  highlights, included, not_included, about_sections, is_published
) VALUES (
  'Panama',
  'Playa Venao',
  'panama-december-2026',
  '/images/retreats/retreats-panama.jpg',
  'All Levels',
  '8 days',
  '12',
  'Breakfast included',
  'Standard',
  'Board rental included',
  1395.00,
  1255.50,
  '2026-11-29',
  '2026-12-07',
  E'Eight nights and days in Panama, hosted at Beach Break Surf Camp. We take over the whole hotel. It''s the perfect place for us to get to know each other and surf as much as we want.\n\nPlaya Venao is an awesome destination for the ultimate surf vacation, with year-round swell, waves suitable for all skill levels, and an uncrowded lineup.\n\nThe surf camp package includes things like board rentals, daily breakfasts, up to 2 hours of surf instruction per day, plus video analysis, open board rentals, and a photo and video package of your surfing to take home with you. There will also be lots of time to relax in the beachfront pool, go on nature walks, and lounge in the hammocks. For more experienced surfers, there will also be opportunities to catch waves at nearby, more challenging breaks.',
  'Year-round swell, waves suitable for all skill levels, and an uncrowded lineup. We take over the whole hotel.',
  'Beach Break Surf Camp, Playa Venao, Los Santos Province, Panama',
  7.4394,
  -80.1667,
  'PA',
  13,
  'available',
  '15:00',
  '11:00',
  ARRAY['Take over the whole hotel', 'Year-round swell', 'Uncrowded lineup', 'Beachfront pool', 'Hammocks', 'Nature walks', 'First night in Panama City'],
  ARRAY['1st Night at Executive Hotel in Panama City', '7 nights at Beach Break Surf Camp', 'All Ground Transportation', 'All Breakfasts', 'Daily Yoga and Meditation Classes', 'Morning Mobility', 'Daily surf lessons and coaching', 'Daily video analysis', 'Surf theory', 'Complete photo and video package', 'Smiles for miles, bear hugs, high fives, new friends, love and sunshine'],
  ARRAY['Airfare', 'Lunches', 'Family dinners (opt-in day to day)', 'Optional last night in Panama City', 'Extra Activities (fishing, zip lining, horseback riding)'],
  '[]'::jsonb,
  true
);
