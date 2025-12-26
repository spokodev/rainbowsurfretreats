-- Seed real blog posts from rainbowsurfretreats.com
-- Migration: 013_seed_blog_data.sql

-- Clear existing blog posts (keep categories)
DELETE FROM blog_posts;

-- ==========================================
-- Blog 1: 10 Things About Surfing in France
-- ==========================================
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  author_name,
  category_id,
  status,
  published_at,
  tags,
  meta_title,
  meta_description,
  views
) VALUES (
  '10 Things You Need to Know Before You Go Surfing in France',
  '10-things-surfing-france',
  'A completely serious, not-at-all biased field report from our Rainbow Surf Retreats reconnaissance mission. We just got back from a scouting trip to the southwest of France — Hossegor, Capbreton, Biarritz — and we''re still a little dizzy.',
  E'We just got back from a scouting trip to the southwest of France — Hossegor, Capbreton, Biarritz — and, frankly, we''re still a little dizzy. Between the croissants, the culture, and the sheer number of attractive men holding surfboards, we don''t know whether we fell in love with France or just temporarily lost our grip on reality.

So here it is: the 10 things you need to know before you go surfing in France. Or at least, the 10 things we wish someone had told us before we were emotionally wrecked by a topless French surfer saying "bonjour."

## 1. All Men Are Hot — Like, Default Setting: HOT!

It''s as if someone coded France with "default = hot." Maybe it''s the tan, maybe it''s the effortless confidence, maybe it''s the saltwater and existentialism combo — but you will look around and question every life choice that didn''t lead you to being born French.

## 2. The French Touch Makes Everything Look Better. EVERYTHING!

France could make a trash can look poetic. The architecture, the colors, even the way they stack bread in a basket — it all looks like it belongs in a museum. Surfboards leaning against stone walls? Art. A baguette tucked under someone''s arm? Art.

## 3. They Complain About Everything (Even Feeling Great)

The French have a unique national sport called le complain. The waves are too clean, the croissants are too buttery, the sunshine is too aggressive. If you hear someone grumbling, don''t worry — it''s not anger, it''s tradition.

## 4. The Beaches Go On Forever

Hossegor, Capbreton, Biarritz — miles and miles of golden sand with peaks everywhere. You could paddle out and barely see another surfer. It''s like someone stretched out paradise just to make sure everyone gets their own wave.

## 5. The Cheese Situation Is So Confusing: Stank vs Taste

How can something smell like old gym socks and taste like heaven? We don''t know either, but once you start, you''ll never go back to supermarket cheddar. Just try not to eat too much before surfing — Brie and duck dive don''t mix.

## 6. Free Water. Yes, Free.

Every restaurant brings a jug of tap water to your table — unasked, free, and cold. We cried a little. After being charged €6 for "still or sparkling" everywhere else in Europe, this felt like socialism done right.

## 7. Bread That Could Heal Nations

You haven''t really lived until you''ve had a real baguette from a real boulangerie. Crispy on the outside, fluffy on the inside, carried like a fashion accessory.

## 8. The World''s Surf Capital Is… Hossegor

Every major surf brand has their HQ here. Quiksilver, Billabong, Rip Curl and local brand (and our favorite) Oxbow — all within arm''s reach. You can literally surf, right after you shop for a wetsuit, and the outlet stores are there too.

## 9. The Dog Poop Thing

We love dogs. We love France. But apparently, "picking up after your dog" didn''t make it into the French constitution. Keep your eyes peeled — or better, on the ground — because you will play hopscotch with dog poop at some point.

## 10. The Menu Copy-Paste Phenomenon

No matter where you go, the menu will offer two sacred dishes — burgers and poke bowls. Surf café bingo: avocado, sesame, and brioche buns. Don''t fight it. You''ll end up loving it.

---

## Why We Fell in Love with Surfing in France

Between the waves, the wine, and the waistlines, surfing in France is dangerously seductive. It''s the perfect mix of world-class surf, beach-bum energy, and unapologetic style. You''ll leave tanned, full, slightly in love, and definitely carrying a baguette under your arm.

**Join us in France soon — the Rainbow Surf Retreats crew is bringing the joie de surf to Hossegor!**',
  '/images/blog/blog-surfing-in-france.jpg',
  'Steven',
  (SELECT id FROM blog_categories WHERE slug = 'destinations'),
  'published',
  '2024-10-23 10:00:00+00',
  ARRAY['France', 'Hossegor', 'Surf Tips', 'Europe', 'LGBTQ+ Travel', 'Surf Culture'],
  '10 Things You Need to Know Before Surfing in France | Rainbow Surf Retreats',
  'A hilarious and honest guide to surfing in France - from hot surfers to free water to the legendary baguettes. Everything you need to know before your surf trip to Hossegor.',
  19
);

-- ==========================================
-- Blog 2: 13 Surf Trip Essentials
-- ==========================================
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  author_name,
  category_id,
  status,
  published_at,
  tags,
  meta_title,
  meta_description,
  views
) VALUES (
  'The 13 Absolute Essentials You Need for Every Surf Trip (Don''t Paddle Out Without Them)',
  '13-surf-trip-essentials',
  'If you''re planning a surf trip—whether it''s your first or your fiftieth—there are a few things that can make or break your experience. Forget one of these essentials, and you might end up borrowing a broken board or battling sunstroke.',
  E'If you''re planning a surf trip—whether it''s your first or your fiftieth—there are a few things that can make or break your experience. Forget one of these essentials, and you might end up borrowing a broken board, missing the best tide window, or worst of all—battling sunstroke halfway through your session.

We''ve compiled the ultimate surf trip packing list, complete with real-world tips and eco-conscious reminders to help you get the most out of your next wave-filled escape.

## 1. Passport (and Visa, if needed)

Obvious? Sure. But you''d be surprised how many surfers rock up to the airport with a passport that''s too close to expiring. Most countries require at least 6 months'' validity beyond your travel dates.

**Pro tip:** Some remote surf destinations require a return/onward ticket to enter—don''t let immigration catch you off guard.

## 2. Your Surfboard (or a Solid Plan to Get One)

Bringing your own board means riding what you''re used to, which is a big bonus. That said, surfboard baggage fees can be brutal. For example, Ryanair can charge €75–100 per boardbag.

If you''re not bringing a board, rent from a reputable surf shop. In places like Siargao or Taghazout, you''ll find high-quality rentals starting at around €10–€15 a day.

## 3. Phone Charger + International Adapter

Your phone is your navigation tool, surf forecast reader (we see you, Magicseaweed and Windguru), translator, and booking agent. A dead phone means no tide checks, no surf pics, and no way to reach your new surf crew.

## 4. Surfwear That Matches the Conditions

Surfing in Portugal in October? You''ll want a 3/2mm wetsuit at minimum. Headed to Sri Lanka or Central America? A long-sleeve rash guard will protect your skin.

**Must-haves:**
- Warm water: boardshorts/bikini, rash guard, zinc
- Cooler water: wetsuit (3/2 or 4/3), booties if rocky

## 5. Reef-Safe Sunscreen and Zinc

Every year, thousands of tons of chemical sunscreen wash into our oceans, damaging coral reefs and marine life. Choose reef-safe formulas—brands like Sun Bum Mineral, SurfDurt, or Raw Elements are trusted by surfers worldwide.

## 6. Shorts and T-Shirts (a.k.a. Real Clothes)

Sure, your salty boardshorts feel like home—but if you need to board a plane, grab a smoothie, or hit a sunset bar, you''ll want to look like you''ve showered this decade.

## 7. Flip-Flops or Slides

Even barefoot warriors hit a patch of hot concrete, broken coral, or mystery beach glass. Flip-flops are light, easy to pack, and the footwear of choice for every surfer.

## 8. A Hat (or Two)

Sun protection doesn''t stop at sunscreen. A wide-brim hat for land and a strap-on surf hat for the water can be the difference between a sunburned scalp and a safe, stylish session.

## 9. Local Cash

Card payments may be common in big cities, but many surf towns still run on cash—especially when you''re buying fruit at a roadside stand.

## 10. Reusable Water Bottle

Staying hydrated is non-negotiable. A reusable bottle isn''t just good for the planet—it also saves you money and keeps you session-ready.

## 11. Waterproof Camera or GoPro

Even if you don''t go viral, you''ll want those surf memories captured. A GoPro or waterproof action cam lets you film sessions, share highlights with your crew, or analyze your stance later.

## 12. Electrolytes (Your Secret Weapon)

Salt water, tropical sun, and long sessions = dehydration danger zone. Electrolyte powders or tablets help replenish what you''re sweating out—especially after back-to-back sessions.

## 13. Smiles, Stoke, and an Open Mind

No matter how much gear you bring, the real secret to a perfect surf trip is attitude. Sometimes the waves are flat, the food is weird, or your board arrives late. If you can meet that with humor, curiosity, and good vibes—you''ll always win.

---

## Ready to put this list to use?

At Rainbow Surf Retreats, we''ve designed our surf trips so you don''t have to overthink the details. We welcome LGBTQ+ surfers from around the world—whether you''re just starting or you''re looking to improve your style in world-class waves.

**All you need to do is show up with the essentials (and that smile).**

👉 See our upcoming retreats and start planning your next salty adventure!',
  '/images/blog/blog-surf-trip-essentials.png',
  'Steven',
  (SELECT id FROM blog_categories WHERE slug = 'travel-tips'),
  'published',
  '2024-06-29 10:00:00+00',
  ARRAY['Surf Tips', 'Packing List', 'Travel Essentials', 'Eco-Friendly', 'Beginners Guide'],
  '13 Surf Trip Essentials - Complete Packing List | Rainbow Surf Retreats',
  'The ultimate surf trip packing list with eco-friendly tips. From reef-safe sunscreen to electrolytes - everything you need for your next surf adventure.',
  44
);

-- ==========================================
-- Blog 3: 10 Reasons for Gay Surf Retreat
-- ==========================================
INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  author_name,
  category_id,
  status,
  published_at,
  tags,
  meta_title,
  meta_description,
  views
) VALUES (
  '10 Reasons to Go on a Gay Surf Retreat',
  '10-reasons-gay-surf-retreat',
  'Looking for your next gay adventure? Dreaming of a vacation that''s more than just a beach tan and a hotel buffet? Welcome to the world of gay surf retreats — where saltwater meets soul.',
  E'…and why it''s way better than a "regular" one

Looking for your next gay adventure? Dreaming of a vacation that''s more than just a beach tan and a hotel buffet? Welcome to the world of gay surf retreats — where saltwater meets soul, and every wave is a chance to connect, grow, and laugh your way through paradise.

Whether you''re a total beginner or a board-toting pro, here are 10 irresistible reasons why a gay surf retreat is better than any regular retreat out there.

## 1. It''s a Queer Surf Community

Imagine arriving at a retreat where the vibe is pure magic. No pressure to fit in. No masks. Just your authentic self, fully embraced. At a gay surf retreat, you don''t just show up to surf — you arrive to be part of something. Whether you''re loud and proud or quietly curious, you''ll find your people here.

## 2. Safe, Seen, and Celebrated

Not all surf spaces are made equal. Traditional retreats might feel chill, but that subtle (or not so subtle) discomfort of being ''the only gay one'' can weigh heavy. At our retreats, you are not only welcome — you''re celebrated. Our community is built on love, respect, and joy.

## 3. Built-In Besties

You might come alone, but you won''t leave that way. These retreats are designed to create connection. Between shared surf sessions, communal meals, late-night talks, and spontaneous adventures, you''ll form bonds that last long after the final wave.

## 4. Tailored Lessons, Zero Ego

Whether you''re a total newbie or have surfed before, our instructors meet you where you''re at. There''s no shouting, no mansplaining, and no intimidation — just patient, encouraging, and fun coaching.

## 5. Queer-Centered Wellness

Start your day with gentle yoga. End it with a massage. In between, we dive into breathwork, meditations, and moments of pause. Our wellness approach isn''t about looking a certain way — it''s about feeling good in your body and mind.

## 6. LGBTQ+-Friendly Destinations

Our retreats take place in locations that are not only stunning, but also culturally rich and LGBTQ+ friendly. From the jungle-lined beaches of Panama to the cliffs of Portugal, each place is chosen for its beauty and vibe.

## 7. Queer-Owned & Operated

When you book with us, your money supports a community. We partner with queer-owned businesses and work with local allies who care about our values. This is ethical travel at its best — fun, fabulous, and empowering.

## 8. Real Vibes, No Small Talk

This isn''t your typical retreat with forced icebreakers and surface-level chitchat. Here, you get to have real conversations about life, love, surfing, and everything in between. Because when you''re with people who understand you, the walls drop fast.

## 9. Unforgettable Memories

You''ll ride waves, explore coastlines, laugh until your cheeks hurt, and maybe even cry happy tears. And yes, you''ll get the photos to remember it all — taken by our pro photographer.

## 10. Surfing = Life Metaphor

Every wave has a lesson: patience, courage, surrender. The ocean doesn''t care who you love — but your retreat family does. Together, you''ll surf through joy, growth, and transformation.

---

## Ready to Ride with Us?

Whether you''re a surf newbie or a saltwater addict, this is your wave. Join Rainbow Surf Retreats in Bali, Morocco, Panama, Portugal, and beyond.

**Book now at rainbowsurfretreats.com**',
  '/images/blog/blog-surf-trip-essentials.png',
  'Steven',
  (SELECT id FROM blog_categories WHERE slug = 'lgbtq'),
  'published',
  '2024-06-29 14:00:00+00',
  ARRAY['LGBTQ+', 'Gay Travel', 'Surf Retreat', 'Community', 'Queer Wellness', 'Inclusive Travel'],
  '10 Reasons to Go on a Gay Surf Retreat | Rainbow Surf Retreats',
  'Why a gay surf retreat is way better than a regular one. Discover queer community, safe spaces, real connections, and unforgettable waves with Rainbow Surf Retreats.',
  51
);
