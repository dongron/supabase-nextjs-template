import type { Database } from '@/lib/types';

export type ProposalStage =
  | 'lead_received'
  | 'voice_memo_received'
  | 'processing'
  | 'ready_for_review'
  | 'sent'
  | 'signed';

export type ProposalRow = Database['public']['Tables']['proposals']['Row'];
export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];

export const STAGE_LABELS: Record<ProposalStage, string> = {
  lead_received: 'Lead Received',
  voice_memo_received: 'Voice Memo Received',
  processing: 'Processing',
  ready_for_review: 'Ready for Review',
  sent: 'Sent',
  signed: 'Signed',
};

export const STAGE_ORDER: Record<ProposalStage, number> = {
  lead_received: 0,
  voice_memo_received: 1,
  processing: 2,
  ready_for_review: 3,
  sent: 4,
  signed: 5,
};

/** 18 hours in milliseconds */
export const REVIEW_OVERDUE_MS = 18 * 60 * 60 * 1000;

/** Minimum estimated value (USD) that requires a render */
export const RENDER_THRESHOLD = 30000;

/**
 * Returns true when a proposal is in the 'ready_for_review' stage and has
 * been there for more than 18 hours.
 */
export function isOverdueReview(proposal: ProposalRow): boolean {
  if (proposal.stage !== 'ready_for_review') return false;
  const elapsed = Date.now() - new Date(proposal.stage_entered_at).getTime();
  return elapsed > REVIEW_OVERDUE_MS;
}

/**
 * Returns true when the designer ETA has passed but the render has not been
 * delivered yet.
 */
export function isRenderEtaOverdue(proposal: ProposalRow): boolean {
  if (!proposal.render_required) return false;
  if (!proposal.designer_notified) return false;
  if (!proposal.designer_eta) return false;
  if (proposal.render_delivered) return false;
  return new Date(proposal.designer_eta).getTime() < Date.now();
}

/**
 * Sorts proposals by urgency, matching the SQL ORDER BY clause:
 * 1. Overdue 'ready_for_review' rows first
 * 2. Then by stage order (voice_memo_received → signed)
 * 3. Then by stage_entered_at ascending (longest-waiting first)
 */
export function sortProposals(proposals: ProposalRow[]): ProposalRow[] {
  return [...proposals].sort((a, b) => {
    const urgencyA = isOverdueReview(a) ? 0 : 1;
    const urgencyB = isOverdueReview(b) ? 0 : 1;
    if (urgencyA !== urgencyB) return urgencyA - urgencyB;

    const stageA = STAGE_ORDER[a.stage as ProposalStage] ?? 99;
    const stageB = STAGE_ORDER[b.stage as ProposalStage] ?? 99;
    if (stageA !== stageB) return stageA - stageB;

    return (
      new Date(a.stage_entered_at).getTime() -
      new Date(b.stage_entered_at).getTime()
    );
  });
}
