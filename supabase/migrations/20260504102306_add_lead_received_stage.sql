-- Add 'lead_received' as a valid proposal stage (inserted before 'voice_memo_received')

ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_stage_check;

ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_stage_check
    CHECK (stage IN (
      'lead_received',
      'voice_memo_received',
      'processing',
      'ready_for_review',
      'sent',
      'signed'
    ));
