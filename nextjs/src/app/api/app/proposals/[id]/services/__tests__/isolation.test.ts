/**
 * Data-isolation tests for the services feature.
 *
 * Verifies that a user can never read or write prospect_services rows
 * belonging to a prospect owned by another user — the equivalent of what
 * RLS enforces in production.
 *
 * The tests work by simulating the ownership `.eq('owner', user.id)` filter
 * returning zero rows when the requesting user's id does not match the
 * prospect owner, which is exactly what Supabase RLS produces in production.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

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

function makeRequest(userId: string, prospectId: string, services: unknown) {
  return new Request(
    `http://localhost/api/app/proposals/${prospectId}/services`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services }),
    },
  );
}

describe('Cross-user isolation: PATCH /api/app/proposals/[id]/services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('US3: user-2 cannot overwrite prospect owned by user-1 — returns 404', async () => {
    const { PATCH } = await import('../route');

    // user-2 is making the request, but the prospect belongs to user-1.
    // The ownership query (.eq('owner', 'user-2')) returns null — no row found.
    buildMockClient('user-2', (table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        };
      }
      // prospect_services should never be touched for an unauthorized request.
      return {
        upsert: vi
          .fn()
          .mockRejectedValue(new Error('Should not reach upsert for unauthorized user')),
      };
    });

    const res = await PATCH(
      makeRequest('user-2', 'prospect-owned-by-user-1', [
        { service_id: 'svc-1', price: 999 },
      ]),
      { params: Promise.resolve({ id: 'prospect-owned-by-user-1' }) },
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('US3: authenticated user can update their own prospect — returns 200', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', (table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'prospect-1', owner: 'user-1' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'prospect_services') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ service_id: 'svc-1' }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const res = await PATCH(
      makeRequest('user-1', 'prospect-1', [{ service_id: 'svc-1', price: 18000 }]),
      { params: Promise.resolve({ id: 'prospect-1' }) },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
  });
});
