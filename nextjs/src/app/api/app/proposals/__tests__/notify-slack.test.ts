/**
 * Unit tests for POST /api/app/proposals/[id]/notify-slack
 *
 * Tests call the route handler directly with a mocked Supabase client
 * and a mocked global fetch. No HTTP server is started.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(): Request {
  return new Request('http://localhost/api/app/proposals/prop-1/notify-slack', {
    method: 'POST',
  });
}

const baseProposal = {
  id: 'prop-1',
  owner: 'user-1',
  quote: 'Landscaping $35,000',
};

const params = Promise.resolve({ id: 'prop-1' });

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createSSRSassClient: vi.fn(),
}));

vi.mock('@/lib/quote', () => ({
  parseTextQuote: vi.fn(),
  calculateQuoteTotal: vi.fn(),
}));

import { createSSRSassClient } from '@/lib/supabase/server';
import { parseTextQuote, calculateQuoteTotal } from '@/lib/quote';

const mockCreateSSRSassClient = createSSRSassClient as Mock;
const mockParseTextQuote = parseTextQuote as Mock;
const mockCalculateQuoteTotal = calculateQuoteTotal as Mock;

function buildMockClient(
  userId: string | null,
  fromImpl: (table: string) => unknown,
) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockImplementation(fromImpl),
  };
  mockCreateSSRSassClient.mockResolvedValue({
    getSupabaseClient: () => supabase,
  });
  return supabase;
}

function buildProposalFromImpl(proposal: typeof baseProposal | null, error?: unknown) {
  return () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: proposal,
        error: error ?? (proposal ? null : { code: 'PGRST116', message: 'Not found' }),
      }),
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/app/proposals/[id]/notify-slack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('PRIVATE_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/TEST');
    // Default: parseTextQuote returns services, calculateQuoteTotal returns high value
    mockParseTextQuote.mockReturnValue([{ name: 'Landscaping', price: 35000 }]);
    mockCalculateQuoteTotal.mockReturnValue(35000);
  });

  it('returns 401 when user is not authenticated', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient(null, () => ({}));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when proposal is not found', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl(null));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Proposal not found');
  });

  it('returns 400 when proposal has no quote', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl({ ...baseProposal, quote: null as unknown as string }));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No quote to notify about');
  });

  it('returns 400 when quote total is at or below $30,000', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl(baseProposal));
    mockCalculateQuoteTotal.mockReturnValue(30000);

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Quote total does not exceed threshold');
  });

  it('returns 500 when PRIVATE_SLACK_WEBHOOK_URL is not set', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    vi.stubEnv('PRIVATE_SLACK_WEBHOOK_URL', '');
    buildMockClient('user-1', buildProposalFromImpl(baseProposal));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Slack webhook URL not configured.');
  });

  it('returns 500 when Slack returns a non-ok response', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl(baseProposal));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue('no_service'),
    }));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Slack notification failed: no_service');
  });

  it('returns 200 with { ok: true } on success', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl(baseProposal));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
    }));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('posts the correct payload to the Slack webhook URL', async () => {
    const { POST } = await import('../[id]/notify-slack/route');

    buildMockClient('user-1', buildProposalFromImpl(baseProposal));
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await POST(makePostRequest(), { params });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/TEST',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Urgent! Details on your email.' }),
      }),
    );
  });
});
