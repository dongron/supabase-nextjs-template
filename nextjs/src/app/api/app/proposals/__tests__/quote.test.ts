/**
 * Unit tests for POST and PATCH /api/app/proposals/[id]/quote
 *
 * Tests call the route handlers directly with mocked Supabase client and Anthropic SDK.
 * No HTTP server is started.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const { mockMessagesCreate, MockAPIError } = vi.hoisted(() => {
  const mockMessagesCreate = vi.fn();
  class MockAPIError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.name = 'APIError';
      this.status = status;
    }
  }
  return { mockMessagesCreate, MockAPIError };
});

vi.mock('@/lib/supabase/server', () => ({
  createSSRSassClient: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => {
  function MockAnthropic(this: unknown) {
    return { messages: { create: mockMessagesCreate } };
  }
  (MockAnthropic as unknown as Record<string, unknown>).APIError = MockAPIError;
  return { default: MockAnthropic };
});

import { createSSRSassClient } from '@/lib/supabase/server';
import { POST, PATCH } from '../[id]/quote/route';

const mockCreateSSRSassClient = createSSRSassClient as Mock;

const params = Promise.resolve({ id: 'prop-1' });

function makePostRequest(): Request {
  return new Request('http://localhost/api/app/proposals/prop-1/quote', {
    method: 'POST',
  });
}

function makePatchRequest(body?: unknown): Request {
  return new Request('http://localhost/api/app/proposals/prop-1/quote', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

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

// ===== POST /api/app/proposals/[id]/quote =====

describe('POST /api/app/proposals/[id]/quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    buildMockClient(null, () => ({}));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when prospect not found', async () => {
    buildMockClient('user-1', () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }));

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(404);
  });

  it('returns 400 when prospect has no voice memo', async () => {
    buildMockClient('user-1', (table) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'prop-1', voice_memo: null },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('voice memo');
  });

  it('returns 200 with matched and unmatched services from Claude response', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'extract_services',
          input: {
            services: [
              { serviceId: 'svc-1', serviceName: 'Garden Lighting Installation', price: 4500 },
              { serviceId: null, serviceName: 'Custom Stone Arch', price: null },
            ],
          },
        },
      ],
    });

    buildMockClient('user-1', (table) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'prop-1', voice_memo: 'Install garden lighting for 4500 and custom stone arch' },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'svc-1', name: 'Garden Lighting Installation' }],
          error: null,
        }),
      };
    });

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.services).toHaveLength(2);
    expect(body.services[0].serviceId).toBe('svc-1');
    expect(body.services[0].price).toBe(4500);
    expect(body.services[1].serviceId).toBeNull();
  });

  it('returns 422 when Claude returns no tool_use block', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'I cannot extract services.' }],
    });

    buildMockClient('user-1', (table) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'prop-1', voice_memo: 'Some memo' },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('valid services list');
  });

  it('returns 500 on Anthropic.APIError', async () => {
    mockMessagesCreate.mockRejectedValue(new MockAPIError('Service unavailable'));

    buildMockClient('user-1', (table) => {
      if (table === 'proposals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'prop-1', voice_memo: 'Some memo' },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to generate quote');
  });
});

// ===== PATCH /api/app/proposals/[id]/quote =====

describe('PATCH /api/app/proposals/[id]/quote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    buildMockClient(null, () => ({}));

    const res = await PATCH(makePatchRequest({ services: [] }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when services field is missing', async () => {
    buildMockClient('user-1', () => ({}));

    const res = await PATCH(makePatchRequest({ other: 'value' }), { params });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 when services is not an array', async () => {
    buildMockClient('user-1', () => ({}));

    const res = await PATCH(makePatchRequest({ services: 'not-array' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 with normalized prices (strips currency symbols, blank -> null)', async () => {
    const storedQuote = JSON.stringify([
      { serviceId: 'svc-1', serviceName: 'Garden Lighting', price: 4500 },
      { serviceId: null, serviceName: 'Custom Work', price: null },
    ]);

    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { quote: storedQuote },
            error: null,
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({
      services: [
        { serviceId: 'svc-1', serviceName: 'Garden Lighting', price: '$4500' },
        { serviceId: null, serviceName: 'Custom Work', price: '' },
      ],
    }), { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote).toBeTruthy();
    const saved = JSON.parse(body.quote);
    expect(saved[0].price).toBe(4500);
    expect(saved[1].price).toBeNull();
  });

  it('returns 404 when prospect not found', async () => {
    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({ services: [] }), { params });
    expect(res.status).toBe(404);
  });

  it('returns 500 on Supabase write error', async () => {
    buildMockClient('user-1', () => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'OTHER_ERROR', message: 'DB error' },
          }),
        }),
      }),
    }));

    const res = await PATCH(makePatchRequest({ services: [] }), { params });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Failed to save quote');
  });
});
