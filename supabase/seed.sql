-- Seed data for proposal pipeline queue feature
-- These INSERTs use a placeholder owner UUID; replace with a real user ID when seeding locally.
-- To use: copy the UUID of your test user from Supabase Auth dashboard and replace 'YOUR_USER_ID_HERE'.

-- Usage:
--   Replace 'YOUR_USER_ID_HERE' with your actual auth.users UUID, then run in Supabase SQL editor.

DO $$
DECLARE
  owner_id uuid := 'YOUR_USER_ID_HERE'::uuid;
BEGIN

-- 1. Voice memo received — walk date set, high value (render required), needs attention
INSERT INTO public.proposals (
  customer_name, neighborhood, walk_date, estimated_value, stage, stage_entered_at,
  needs_attention, owner
) VALUES (
  'James Harrington', 'River Oaks', '2026-05-10', 45000,
  'voice_memo_received', now() - interval '3 hours',
  true, owner_id
);

-- 2. Processing — no walk date, standard value
INSERT INTO public.proposals (
  customer_name, neighborhood, walk_date, estimated_value, stage, stage_entered_at,
  owner
) VALUES (
  'Susan Chambers', 'Tanglewood', NULL, 22000,
  'processing', now() - interval '6 hours',
  owner_id
);

-- 3. Ready for review — overdue (>18h), triggers red tint
INSERT INTO public.proposals (
  customer_name, neighborhood, walk_date, estimated_value, stage, stage_entered_at,
  owner
) VALUES (
  'Marcus Webb', 'Memorial', '2026-05-08', 18500,
  'ready_for_review', now() - interval '20 hours',
  owner_id
);

-- 4. Sent — walk date set, high value (render required, designer notified with future ETA)
INSERT INTO public.proposals (
  customer_name, neighborhood, walk_date, estimated_value, stage, stage_entered_at,
  render_delivered, designer_notified, designer_notified_at, designer_eta,
  owner
) VALUES (
  'Patricia Lang', 'Bellaire', '2026-05-06', 67000,
  'sent', now() - interval '2 days',
  false, true, now() - interval '1 day', now() + interval '2 days',
  owner_id
);

-- 5. Signed — no walk date, value above threshold (render delivered)
INSERT INTO public.proposals (
  customer_name, neighborhood, walk_date, estimated_value, stage, stage_entered_at,
  render_delivered, designer_notified, designer_notified_at, designer_eta,
  owner
) VALUES (
  'Robert Finley', 'West University', NULL, 52000,
  'signed', now() - interval '5 days',
  true, true, now() - interval '4 days', now() - interval '3 days',
  owner_id
);

-- ---------------------------------------------------------------------------
-- Service catalog seed — Prospect Services & Pricing feature
-- 10 example services for a high-end residential outdoor construction company.
-- Seeded under the same owner_id as the proposals above.
-- ---------------------------------------------------------------------------

INSERT INTO public.services (owner, name, description, default_price, sort_order) VALUES
  (owner_id, 'Landscape Design Consultation',       'Custom site assessment and detailed design plan prepared by a certified landscape architect', 2500.00,  1),
  (owner_id, 'Custom Stone Patio Installation',     'Design and installation of natural or engineered stone patio with premium jointing',          18000.00, 2),
  (owner_id, 'Swimming Pool Construction',          'Full excavation, structural build, tiling, and equipment fit-out for an in-ground pool',      85000.00, 3),
  (owner_id, 'Outdoor Kitchen & BBQ Area',          'Built-in grill station, countertops, cabinetry, and utility connections',                     22000.00, 4),
  (owner_id, 'Pergola / Gazebo Construction',       'Custom timber or steel structure with optional roofing and finishing',                         14000.00, 5),
  (owner_id, 'Irrigation System Installation',      'Design and installation of a zoned automatic drip or spray irrigation system',                 6500.00,  6),
  (owner_id, 'Outdoor Lighting Design & Install',   'Low-voltage landscape lighting scheme with fixtures, wiring, and smart controls',              8000.00,  7),
  (owner_id, 'Retaining Wall Construction',         'Engineered retaining wall using natural stone, block, or timber for sloped sites',             12000.00, 8),
  (owner_id, 'Driveway & Pathways Paving',          'Premium paving using natural stone, exposed aggregate, or stamped concrete',                   16000.00, 9),
  (owner_id, 'Garden Planting & Landscaping',       'Supply and installation of trees, shrubs, ground cover, and mulching per approved plan',       9500.00,  10);

END $$;
