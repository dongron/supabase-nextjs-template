/**
 * Integration tests for PATCH /api/app/proposals/[id]/services
 *
 * Tests call the route handler directly (no HTTP server) with a mocked
 * Supabase client. Isolation (RLS-equivalent) is verified by simulating
 * cross-user ownership checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown): Request {
  return new Request(
    'http://localhost/api/app/proposals/prospect-1/services',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
  );
}

const baseProspect = {
  id: 'prospect-1',
  customer_name: 'Acme Corp',
  owner: 'user-1',
};

const validServices = [
  { service_id: 'svc-1', price: 18000 },
  { service_id: 'svc-2', price: 85000 },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PATCH /api/app/proposals/[id]/services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const { PATCH } = await import('../route');

    buildMockClient(null, () => ({}));

    const res = await PATCH(makeRequest(validServices), {
      params: Promise.resolve({ id: 'prospect-1' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 when body is not valid JSON', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', () => ({}));

    const res = await PATCH(
      new Request('http://localhost/api/app/proposals/prospect-1/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }),
      { params: Promise.resolve({ id: 'prospect-1' }) },
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when services is not an array', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: baseProspect, error: null }),
    }));

    const res = await PATCH(makeRequest({ services: 'not-array' }), {
      params: Promise.resolve({ id: 'prospect-1' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/array/i);
  });

  it('returns 400 when a service entry has a negative price', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: baseProspect, error: null }),
    }));

    const res = await PATCH(
      makeRequest({
        services: [{ service_id: 'svc-1', price: -100 }],
      }),
      { params: Promise.resolve({ id: 'prospect-1' }) },
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/price/i);
  });

  it('returns 404 when prospect does not belong to authenticated user', async () => {
    const { PATCH } = await import('../route');

    // Simulate RLS: ownership query returns no row for a different user
    buildMockClient('user-2', (table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await PATCH(makeRequest({ services: validServices }), {
      params: Promise.resolve({ id: 'prospect-1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with { updated } on valid request', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', (table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: baseProspect,
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
              data: [{ service_id: 'svc-1' }, { service_id: 'svc-2' }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    const res = await PATCH(makeRequest({ services: validServices }), {
      params: Promise.resolve({ id: 'prospect-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(2);
  });

  it('returns 200 with { updated: 0 } when services array is empty', async () => {
    const { PATCH } = await import('../route');

    buildMockClient('user-1', (table: string) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: baseProspect,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await PATCH(makeRequest({ services: [] }), {
      params: Promise.resolve({ id: 'prospect-1' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(0);
  });
});
