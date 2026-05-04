-- Add voice memo field to proposals
-- Stores transcribed voice notes entered manually by staff.
-- Nullable: a prospect may have no memo.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS voice_memo text;
