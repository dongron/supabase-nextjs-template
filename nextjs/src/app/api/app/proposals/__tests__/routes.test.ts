/**
 * Integration tests for the three proposal API routes.
 *
 * These tests call the route handlers directly (as functions) with a mocked
 * Supabase client. No HTTP server is started. The Supabase client is replaced
 * by a vi.mock so the tests are fast and deterministic.
 *
 * RLS enforcement is verified by simulating a different `user.id` on the
 * returned `auth.getUser()` call, which means `.eq('owner', user.id)` will
 * produce 0 rows — the same result RLS would produce in production.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock Request with a JSON body */
function makeRequest(body?: unknown, method = 'POST'): Request {
  return new Request('http://localhost/api/app/proposals', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makePatchRequest(body?: unknown): Request {
  return makeRequest(body, 'PATCH');
}

/** Minimal proposal row returned by the DB */
const baseProposal = {
  id: 'prop-1',
  customer_name: 'Acme Corp',
  neighborhood: 'Midtown',
  walk_date: null,
  estimated_value: 15000,
  stage: 'voice_memo_received',
  stage_entered_at: new Date().toISOString(),
  render_required: false,
  designer_notified: false,
  designer_notified_at: null,
  designer_eta: null,
  render_delivered: false,
  needs_attention: false,
  owner: 'user-1',
  archived_at: null,
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Mocks — set up before module imports so vi.mock hoisting works
// ---------------------------------------------------------------------------



vi.mock('@/lib/supabase/server', () => ({
  createSSRSassClient: vi.fn(),
}));

import { createSSRSassClient } from '@/lib/supabase/server';
const mockCreateSSRSassClient = createSSRSassClient as Mock;

/** Build the mock SassClient shape the route handlers use */
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

// ---------------------------------------------------------------------------
// POST /api/app/proposals
// ---------------------------------------------------------------------------

describe('POST /api/app/proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with created row on valid body', async () => {
    const { POST } = await import('../route');

    buildMockClient('user-1', () => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: baseProposal, error: null }),
        }),
      }),
    }));

    const req = makeRequest({
      customer_name: 'Acme Corp',
      neighborhood: 'Midtown',
      estimated_value: 15000,
      stage: 'voice_memo_received',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('prop-1');
  });

  it('returns 400 when customer_name is missing', async () => {
    const { POST } = await import('../route');

    buildMockClient('user-1', () => ({}));

    const req = makeRequest({
      neighborhood: 'Midtown',
      estimated_value: 15000,
      stage: 'voice_memo_received',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when customer_name is an empty string', async () => {
    const { POST } = await import('../route');

    buildMockClient('user-1', () => ({}));

    const req = makeRequest({
      customer_name: '   ',
      neighborhood: 'Midtown',
      estimated_value: 15000,
      stage: 'voice_memo_received',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not authenticated', async () => {
    const { POST } = await import('../route');

    buildMockClient(null, () => ({}));

    const req = makeRequest({
      customer_name: 'Acme Corp',
      neighborhood: 'Midtown',
      estimated_value: 15000,
      stage: 'voice_memo_received',
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  /**
   * RLS verification: even if an attacker forges a request with a different
   * owner in the body, the route always sets `owner = user.id` from the
   * authenticated session — so a user can never insert a row for another user.
   */
  it('RLS: always uses authenticated user.id as owner (cannot spoof owner)', async () => {
    const { POST } = await import('../route');

    let capturedInsertPayload: unknown;
    buildMockClient('user-1', () => ({
      insert: vi.fn().mockImplementation((payload: unknown) => {
        capturedInsertPayload = payload;
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: baseProposal, error: null }),
          }),
        };
      }),
    }));

    const req = makeRequest({
      customer_name: 'Acme Corp',
      neighborhood: 'Midtown',
      estimated_value: 15000,
      stage: 'voice_memo_received',
      owner: 'attacker-id', // attempt to spoof
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect((capturedInsertPayload as Record<string, unknown>).owner).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/app/proposals/[id]/designer
// ---------------------------------------------------------------------------

describe('PATCH /api/app/proposals/[id]/designer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with updated fields on valid request', async () => {
    const { PATCH } = await import('../[id]/designer/route');

    const updatedProposal = {
      id: 'prop-1',
      designer_notified: true,
      designer_notified_at: new Date().toISOString(),
      designer_eta: new Date(Date.now() + 3_600_000).toISOString(),
    };

    buildMockClient('user-1', (table) => {
      if (table === 'proposals') {
        const updateChain = {
          eq: vi.fn(),
          select: vi.fn(),
          single: vi.fn().mockResolvedValue({ data: updatedProposal, error: null }),
          update: vi.fn(),
        };
        updateChain.eq.mockReturnValue(updateChain);
        updateChain.select.mockReturnValue(updateChain);
        updateChain.update.mockReturnValue(updateChain);

        const selectChain = {
          eq: vi.fn(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'prop-1', render_required: true, owner: 'user-1' },
            error: null,
          }),
        };
        selectChain.eq.mockReturnValue(selectChain);

        return {
          select: vi.fn().mockReturnValue(selectChain),
          update: vi.fn().mockReturnValue(updateChain),
        };
      }
      return {};
    });

    const futureEta = new Date(Date.now() + 3_600_000).toISOString();
    const req = makePatchRequest({ designer_eta: futureEta });
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.designer_notified).toBe(true);
  });

  it('returns 422 when render_required is false', async () => {
    const { PATCH } = await import('../[id]/designer/route');

    buildMockClient('user-1', () => {
      const selectChain = {
        eq: vi.fn(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'prop-1', render_required: false, owner: 'user-1' },
          error: null,
        }),
      };
      selectChain.eq.mockReturnValue(selectChain);
      return {
        select: vi.fn().mockReturnValue(selectChain),
      };
    });

    const futureEta = new Date(Date.now() + 3_600_000).toISOString();
    const req = makePatchRequest({ designer_eta: futureEta });
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(422);
  });

  it('returns 404 when proposal belongs to a different owner (RLS simulation)', async () => {
    const { PATCH } = await import('../[id]/designer/route');

    // User is 'user-2' but proposal owner is 'user-1'
    // The .eq('owner', user.id) filter returns no rows
    buildMockClient('user-2', () => {
      const selectChain = {
        eq: vi.fn(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      };
      selectChain.eq.mockReturnValue(selectChain);
      return {
        select: vi.fn().mockReturnValue(selectChain),
      };
    });

    const futureEta = new Date(Date.now() + 3_600_000).toISOString();
    const req = makePatchRequest({ designer_eta: futureEta });
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
  });

  it('returns 401 when user is not authenticated', async () => {
    const { PATCH } = await import('../[id]/designer/route');

    buildMockClient(null, () => ({}));

    const futureEta = new Date(Date.now() + 3_600_000).toISOString();
    const req = makePatchRequest({ designer_eta: futureEta });
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/app/proposals/[id]/dismiss-attention
// ---------------------------------------------------------------------------

describe('PATCH /api/app/proposals/[id]/dismiss-attention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with { id, needs_attention: false } on valid request', async () => {
    const { PATCH } = await import('../[id]/dismiss-attention/route');

    buildMockClient('user-1', () => {
      const chain = {
        eq: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.select.mockReturnValue(
        Promise.resolve({
          data: [{ id: 'prop-1', needs_attention: false }],
          error: null,
          count: 1,
        }),
      );
      chain.update.mockReturnValue(chain);
      return chain;
    });

    const req = makePatchRequest();
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.needs_attention).toBe(false);
    expect(body.id).toBe('prop-1');
  });

  it('returns 404 when proposal belongs to a different owner (RLS simulation)', async () => {
    const { PATCH } = await import('../[id]/dismiss-attention/route');

    // user-2 tries to dismiss a proposal owned by user-1
    // .eq('owner', user.id) returns 0 rows
    buildMockClient('user-2', () => {
      const chain = {
        eq: vi.fn(),
        select: vi.fn(),
        update: vi.fn(),
      };
      chain.eq.mockReturnValue(chain);
      chain.select.mockReturnValue(
        Promise.resolve({ data: [], error: null, count: 0 }),
      );
      chain.update.mockReturnValue(chain);
      return chain;
    });

    const req = makePatchRequest();
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(404);
  });

  it('returns 401 when user is not authenticated', async () => {
    const { PATCH } = await import('../[id]/dismiss-attention/route');

    buildMockClient(null, () => ({}));

    const req = makePatchRequest();
    const params = Promise.resolve({ id: 'prop-1' });

    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });
});
