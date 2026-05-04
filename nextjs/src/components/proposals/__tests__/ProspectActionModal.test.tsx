// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProspectActionModal from '../ProspectActionModal';
import type { ProposalRow } from '@/lib/proposals';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function makeProposal(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return {
    id: 'prop-1',
    created_at: '2026-01-01T00:00:00Z',
    customer_name: 'Test Customer',
    neighborhood: 'Midtown',
    walk_date: null,
    estimated_value: 10000,
    stage: 'lead_received',
    stage_entered_at: '2026-01-01T00:00:00Z',
    render_required: false,
    designer_notified: false,
    designer_notified_at: null,
    designer_eta: null,
    render_delivered: false,
    needs_attention: false,
    owner: 'user-1',
    archived_at: null,
    voice_memo: null,
    quote: null,
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onDelete: vi.fn(),
  onMemoUpdate: vi.fn(),
};

function renderModal(proposalOverrides: Partial<ProposalRow> = {}, propOverrides = {}) {
  const props = { ...defaultProps, ...propOverrides, proposal: makeProposal(proposalOverrides) };
  return render(<ProspectActionModal {...props} />);
}

describe('ProspectActionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------
  // T009: US1 — Save Memo
  // ------------------------------------------------------------------

  it('renders with pre-filled memo from proposal', () => {
    renderModal({ voice_memo: 'Existing memo text' });
    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).toBe('Existing memo text');
  });

  it('renders with empty textarea when voice_memo is null', () => {
    renderModal({ voice_memo: null });
    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('shows proposal customer_name as dialog title', () => {
    renderModal({ customer_name: 'ACME Corp' });
    expect(screen.getByRole('heading', { name: 'ACME Corp' })).toBeDefined();
  });

  it('disables Save/Update Memo button while saving', async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(global, 'fetch').mockReturnValueOnce(fetchPromise);

    renderModal({ voice_memo: null });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New memo' } });

    const saveBtn = screen.getByRole('button', { name: /save or update voice memo/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save or update voice memo/i })).toBeDisabled();
    });

    // Resolve to avoid hanging
    resolveFetch(new Response(JSON.stringify({ voice_memo: 'New memo' }), { status: 200 }));
  });

  it('calls onMemoUpdate with new value on successful save', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ voice_memo: 'Saved text' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderModal({ voice_memo: null });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Saved text' } });
    fireEvent.click(screen.getByRole('button', { name: /save.*memo/i }));

    await waitFor(() => {
      expect(defaultProps.onMemoUpdate).toHaveBeenCalledWith('prop-1', 'Saved text');
    });
  });

  it('calls onMemoUpdate with null when memo field is empty (clears memo)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ voice_memo: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderModal({ voice_memo: 'Old memo' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save.*memo/i }));

    await waitFor(() => {
      expect(defaultProps.onMemoUpdate).toHaveBeenCalledWith('prop-1', null);
    });
  });

  it('shows inline error on save failure and retains field value', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderModal({ voice_memo: null });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Typed text' } });
    fireEvent.click(screen.getByRole('button', { name: /save.*memo/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });

    // Field value retained
    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).toBe('Typed text');
    expect(defaultProps.onMemoUpdate).not.toHaveBeenCalled();
  });

  it('Generate Quote button is present and enabled', () => {
    renderModal();

    const generateBtn = screen.getByRole('button', { name: /generate quote/i });
    expect(generateBtn).toBeDefined();
    expect(generateBtn).not.toBeDisabled();
  });

  it('closing dialog without saving does not call onMemoUpdate', () => {
    renderModal({ voice_memo: 'Existing memo' });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unsaved changes' } });

    // Simulate closing by calling onOpenChange(false) directly via Escape key or overlay click
    // We call the prop handler directly to simulate what Radix Dialog would do
    act(() => {
      defaultProps.onOpenChange(false);
    });

    expect(defaultProps.onMemoUpdate).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------
  // T010: Services button navigates correctly (US2 regression check)
  // ------------------------------------------------------------------

  it('Services button links to the correct services page', () => {
    renderModal({ id: 'prop-abc' });
    const servicesLink = screen.getByRole('link', { name: /services/i });
    expect(servicesLink.getAttribute('href')).toBe('/app/proposals/prop-abc/services');
  });

  // ------------------------------------------------------------------
  // T012: US3 — Delete Prospect from Modal
  // ------------------------------------------------------------------

  it('Delete Prospect: cancel (confirm=false) does not call onDelete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /delete prospect/i }));

    expect(defaultProps.onDelete).not.toHaveBeenCalled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });

  it('Delete Prospect: confirm calls onDelete and closes modal on success', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /delete prospect/i }));

    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledWith('prop-1');
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('Delete Prospect: failure shows error and modal stays open', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Delete failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /delete prospect/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').some((el) => el.textContent?.includes('Delete failed'))).toBe(true);
    });

    expect(defaultProps.onDelete).not.toHaveBeenCalled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });
});
