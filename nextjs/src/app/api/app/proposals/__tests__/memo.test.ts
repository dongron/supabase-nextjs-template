/**
 * Unit tests for PATCH /api/app/proposals/[id]/memo
 *
 * Tests call the route handler directly with a mocked Supabase client.
 * No HTTP server is started. RLS enforcement is simulated by having
 * `.eq('owner', user.id)` produce 0 rows when user IDs don't match.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

function makePatchRequest(body?: unknown): Request {
  return new Request('http://localhost/api/app/proposals/prop-1/memo', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const baseProposal = {
  id: 'prop-1',
  owner: 'user-1',
  voice_memo: null,
};

vi.mock('@/lib/supabase/server', () => ({
  createSSRSassClient: vi.fn(),
}));

import { createSSRSassClient } from '@/lib/supabase/server';
const mockCreateSSRSassClient = createSSRSassClient as Mock;

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

const params = Promise.resolve({ id: 'prop-1' });

describe('PATCH /api/app/proposals/[id]/memo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 200 with saved memo on valid string body', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { voice_memo: 'My memo text' },
            error: null,
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({ voice_memo: 'My memo text' }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.voice_memo).toBe('My memo text');
  });

  it('returns 200 with null when voice_memo is null (clears memo)', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { voice_memo: null },
            error: null,
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({ voice_memo: null }), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.voice_memo).toBeNull();
  });

  it('returns 400 when voice_memo is an invalid type (number)', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient('user-1', () => ({}));

    const res = await PATCH(makePatchRequest({ voice_memo: 42 }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when voice_memo field is missing from body', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient('user-1', () => ({}));

    const res = await PATCH(makePatchRequest({ other: 'field' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not authenticated', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient(null, () => ({}));

    const res = await PATCH(makePatchRequest({ voice_memo: 'text' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 404 when proposal does not exist or belongs to another user (RLS simulation)', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    buildMockClient('user-2', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({ voice_memo: 'text' }), { params });
    expect(res.status).toBe(404);
  });

  it('RLS: always filters by authenticated user.id as owner', async () => {
    const { PATCH } = await import('../[id]/memo/route');

    const eqMock = vi.fn().mockReturnThis();
    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: eqMock,
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...baseProposal, voice_memo: 'memo' },
            error: null,
          }),
        }),
      }),
    }));

    await PATCH(makePatchRequest({ voice_memo: 'memo' }), { params });

    // Second .eq() call must scope to the authenticated user
    const calls = eqMock.mock.calls as [string, string][];
    const ownerCall = calls.find(([col]) => col === 'owner');
    expect(ownerCall).toBeDefined();
    expect(ownerCall![1]).toBe('user-1');
  });
});
