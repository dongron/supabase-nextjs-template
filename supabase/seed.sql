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

END $$;
