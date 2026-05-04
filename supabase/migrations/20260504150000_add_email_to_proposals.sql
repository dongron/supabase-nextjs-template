-- Add email and quote_sent columns to proposals table
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quote_sent boolean NOT NULL DEFAULT false;

-- Backfill: ensure no NULLs exist (DEFAULT handles inserts, this handles pre-existing rows)
UPDATE public.proposals SET email = '' WHERE email IS NULL;
