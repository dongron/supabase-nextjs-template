'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  STAGE_LABELS,
  isOverdueReview,
  type ProposalRow,
  type ProposalStage,
} from '@/lib/proposals';

type DesignerState = {
  designer_notified: boolean;
  designer_notified_at: string | null;
  designer_eta: string | null;
  render_delivered: boolean;
};

function formatElapsed(isoString: string): string {
  const ms = Date.now() - new Date(isoString).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ProposalRowProps {
  proposal: ProposalRow;
  onDelete: (id: string) => void;
}

export default function ProposalRowComponent({ proposal, onDelete }: ProposalRowProps) {
  const overdue = isOverdueReview(proposal);

  const [designerState, setDesignerState] = useState<DesignerState>({
    designer_notified: proposal.designer_notified,
    designer_notified_at: proposal.designer_notified_at,
    designer_eta: proposal.designer_eta,
    render_delivered: proposal.render_delivered,
  });

  const [needsAttention, setNeedsAttention] = useState(proposal.needs_attention);
  const [dismissing, setDismissing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Remove proposal for "${proposal.customer_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(proposal.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  const isRenderEtaOverdueLocal =
    !!proposal.render_required &&
    designerState.designer_notified &&
    !!designerState.designer_eta &&
    !designerState.render_delivered &&
    new Date(designerState.designer_eta).getTime() < Date.now();

  async function handleDismissAttention() {
    setDismissing(true);
    const prev = needsAttention;
    setNeedsAttention(false);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/dismiss-attention`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        setNeedsAttention(prev);
      }
    } catch {
      setNeedsAttention(prev);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <tr
      className={`border-b transition-colors ${
        overdue
          ? 'bg-red-950/40 dark:bg-red-950/50'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {/* Customer name */}
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {proposal.customer_name}
      </td>

      {/* Neighborhood */}
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {proposal.neighborhood}
      </td>

      {/* Walk date */}
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {proposal.walk_date ? formatDate(proposal.walk_date) : 'Not scheduled'}
      </td>

      {/* Estimated value */}
      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap tabular-nums">
        {formatUSD(proposal.estimated_value)}
      </td>

      {/* Stage */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
          {STAGE_LABELS[proposal.stage as ProposalStage] ?? proposal.stage}
        </span>
      </td>

      {/* Time elapsed */}
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatElapsed(proposal.stage_entered_at)}
      </td>

      {/* Render / designer status */}
      <td className="px-4 py-3 whitespace-nowrap">
        {proposal.render_required && (
          <RenderBadge
            proposal={proposal}
            designerState={designerState}
            isEtaOverdue={isRenderEtaOverdueLocal}
            onSuccess={(updated) =>
              setDesignerState((prev) => ({ ...prev, ...updated }))
            }
          />
        )}
      </td>

      {/* Needs attention */}
      <td className="px-4 py-3 whitespace-nowrap">
        {needsAttention && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-yellow-50 dark:bg-yellow-900/30 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300">
              Needs attention
            </span>
            <button
              onClick={handleDismissAttention}
              disabled={dismissing}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
              aria-label="Dismiss attention flag"
            >
              Dismiss
            </button>
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/app/proposals/${proposal.id}/services`}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            aria-label={`View services for ${proposal.customer_name}`}
          >
            Services
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
            aria-label="Remove proposal"
          >
            {deleting ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </td>
    </tr>
  );
}

// --- Render badge sub-component ---

interface RenderBadgeProps {
  proposal: ProposalRow;
  designerState: DesignerState;
  isEtaOverdue: boolean;
  onSuccess: (updated: Partial<DesignerState>) => void;
}

function RenderBadge({
  proposal,
  designerState,
  isEtaOverdue,
  onSuccess,
}: RenderBadgeProps) {
  if (!designerState.designer_notified) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
          Render required
        </span>
        <DesignerNotifyTrigger
          proposalId={proposal.id}
          currentEta={designerState.designer_eta}
          onSuccess={onSuccess}
        />
      </div>
    );
  }

  if (designerState.render_delivered) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300">
        Render delivered
      </span>
    );
  }

  if (isEtaOverdue) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300">
        ETA overdue:{' '}
        {designerState.designer_eta
          ? formatDateTime(designerState.designer_eta)
          : '—'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
      ETA:{' '}
      {designerState.designer_eta
        ? formatDateTime(designerState.designer_eta)
        : '—'}
    </span>
  );
}

// --- Designer notify inline trigger ---

interface DesignerNotifyTriggerProps {
  proposalId: string;
  currentEta: string | null;
  onSuccess: (updated: Partial<DesignerState>) => void;
}

function DesignerNotifyTrigger({
  proposalId,
  currentEta,
  onSuccess,
}: DesignerNotifyTriggerProps) {
  const [open, setOpen] = useState(false);
  const [eta, setEta] = useState(
    currentEta
      ? new Date(currentEta).toISOString().slice(0, 16)
      : '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!eta) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/app/proposals/${proposalId}/designer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designer_eta: new Date(eta).toISOString() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? 'Failed to save');
        return;
      }
      const data = (await res.json()) as Partial<DesignerState>;
      onSuccess(data);
      setOpen(false);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-purple-600 hover:underline dark:text-purple-400"
      >
        Designer not notified
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notify designer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
              Notify Designer
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="designer-eta"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Designer ETA
                </label>
                <input
                  id="designer-eta"
                  type="datetime-local"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Notify & save ETA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
