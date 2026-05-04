import { describe, it, expect } from 'vitest';
import {
  isOverdueReview,
  isRenderEtaOverdue,
  sortProposals,
  REVIEW_OVERDUE_MS,
  type ProposalRow,
} from './proposals';

/** Build a minimal ProposalRow with sane defaults */
function makeProposal(overrides: Partial<ProposalRow> = {}): ProposalRow {
  const now = new Date().toISOString();
  return {
    id: 'test-id',
    created_at: now,
    customer_name: 'Acme Corp',
    neighborhood: 'Midtown',
    walk_date: null,
    estimated_value: 10000,
    stage: 'voice_memo_received',
    stage_entered_at: now,
    render_required: false,
    designer_notified: false,
    designer_notified_at: null,
    designer_eta: null,
    render_delivered: false,
    needs_attention: false,
    owner: 'user-1',
    archived_at: null,
    voice_memo: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isOverdueReview
// ---------------------------------------------------------------------------

describe('isOverdueReview', () => {
  it('returns true when stage is ready_for_review and elapsed > 18h', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS - 60_000,
    ).toISOString();
    const proposal = makeProposal({
      stage: 'ready_for_review',
      stage_entered_at: stageEnteredAt,
    });
    expect(isOverdueReview(proposal)).toBe(true);
  });

  it('returns false when stage is ready_for_review but elapsed < 18h', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS + 60_000,
    ).toISOString();
    const proposal = makeProposal({
      stage: 'ready_for_review',
      stage_entered_at: stageEnteredAt,
    });
    expect(isOverdueReview(proposal)).toBe(false);
  });

  it('returns false at exactly 18h (not strictly greater)', () => {
    const stageEnteredAt = new Date(Date.now() - REVIEW_OVERDUE_MS).toISOString();
    const proposal = makeProposal({
      stage: 'ready_for_review',
      stage_entered_at: stageEnteredAt,
    });
    // elapsed === REVIEW_OVERDUE_MS → not overdue (strict >)
    expect(isOverdueReview(proposal)).toBe(false);
  });

  it('returns false for voice_memo_received stage even if old', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS - 3_600_000,
    ).toISOString();
    expect(
      isOverdueReview(makeProposal({ stage: 'voice_memo_received', stage_entered_at: stageEnteredAt })),
    ).toBe(false);
  });

  it('returns false for processing stage even if old', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS - 3_600_000,
    ).toISOString();
    expect(
      isOverdueReview(makeProposal({ stage: 'processing', stage_entered_at: stageEnteredAt })),
    ).toBe(false);
  });

  it('returns false for sent stage even if old', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS - 3_600_000,
    ).toISOString();
    expect(
      isOverdueReview(makeProposal({ stage: 'sent', stage_entered_at: stageEnteredAt })),
    ).toBe(false);
  });

  it('returns false for signed stage even if old', () => {
    const stageEnteredAt = new Date(
      Date.now() - REVIEW_OVERDUE_MS - 3_600_000,
    ).toISOString();
    expect(
      isOverdueReview(makeProposal({ stage: 'signed', stage_entered_at: stageEnteredAt })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRenderEtaOverdue
// ---------------------------------------------------------------------------

describe('isRenderEtaOverdue', () => {
  it('returns true when ETA is in the past, designer_notified=true, render_delivered=false', () => {
    const pastEta = new Date(Date.now() - 60_000).toISOString();
    const proposal = makeProposal({
      render_required: true,
      designer_notified: true,
      designer_eta: pastEta,
      render_delivered: false,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(true);
  });

  it('returns false when render_required is false', () => {
    const pastEta = new Date(Date.now() - 60_000).toISOString();
    const proposal = makeProposal({
      render_required: false,
      designer_notified: true,
      designer_eta: pastEta,
      render_delivered: false,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(false);
  });

  it('returns false when designer_notified is false', () => {
    const pastEta = new Date(Date.now() - 60_000).toISOString();
    const proposal = makeProposal({
      render_required: true,
      designer_notified: false,
      designer_eta: pastEta,
      render_delivered: false,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(false);
  });

  it('returns false when designer_eta is null', () => {
    const proposal = makeProposal({
      render_required: true,
      designer_notified: true,
      designer_eta: null,
      render_delivered: false,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(false);
  });

  it('returns false when render_delivered is true', () => {
    const pastEta = new Date(Date.now() - 60_000).toISOString();
    const proposal = makeProposal({
      render_required: true,
      designer_notified: true,
      designer_eta: pastEta,
      render_delivered: true,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(false);
  });

  it('returns false when ETA is in the future', () => {
    const futureEta = new Date(Date.now() + 3_600_000).toISOString();
    const proposal = makeProposal({
      render_required: true,
      designer_notified: true,
      designer_eta: futureEta,
      render_delivered: false,
    });
    expect(isRenderEtaOverdue(proposal)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sortProposals
// ---------------------------------------------------------------------------

describe('sortProposals', () => {
  it('places overdue ready_for_review rows first', () => {
    const overdueAt = new Date(Date.now() - REVIEW_OVERDUE_MS - 60_000).toISOString();
    const recentAt = new Date(Date.now() - 60_000).toISOString();

    const overdue = makeProposal({
      id: 'overdue',
      stage: 'ready_for_review',
      stage_entered_at: overdueAt,
    });
    const normal = makeProposal({
      id: 'normal',
      stage: 'voice_memo_received',
      stage_entered_at: recentAt,
    });

    const sorted = sortProposals([normal, overdue]);
    expect(sorted[0].id).toBe('overdue');
    expect(sorted[1].id).toBe('normal');
  });

  it('sorts by STAGE_ORDER within the same urgency group', () => {
    const at = new Date().toISOString();
    const signed = makeProposal({ id: 'signed', stage: 'signed', stage_entered_at: at });
    const processing = makeProposal({ id: 'processing', stage: 'processing', stage_entered_at: at });
    const voiceMemo = makeProposal({ id: 'voice', stage: 'voice_memo_received', stage_entered_at: at });

    const sorted = sortProposals([signed, voiceMemo, processing]);
    expect(sorted.map((p) => p.id)).toEqual(['voice', 'processing', 'signed']);
  });

  it('sorts by stage_entered_at ascending within the same stage', () => {
    const older = new Date(Date.now() - 7_200_000).toISOString(); // 2h ago
    const newer = new Date(Date.now() - 3_600_000).toISOString(); // 1h ago

    const first = makeProposal({ id: 'older', stage: 'processing', stage_entered_at: older });
    const second = makeProposal({ id: 'newer', stage: 'processing', stage_entered_at: newer });

    const sorted = sortProposals([second, first]);
    expect(sorted[0].id).toBe('older');
    expect(sorted[1].id).toBe('newer');
  });

  it('does not mutate the original array', () => {
    const proposals = [
      makeProposal({ id: 'a', stage: 'signed' }),
      makeProposal({ id: 'b', stage: 'voice_memo_received' }),
    ];
    const original = [...proposals];
    sortProposals(proposals);
    expect(proposals.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });

  it('returns empty array when input is empty', () => {
    expect(sortProposals([])).toEqual([]);
  });
});
