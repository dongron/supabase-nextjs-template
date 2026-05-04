'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ProposalRow } from '@/lib/proposals';

interface ProspectActionModalProps {
  proposal: ProposalRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onMemoUpdate: (id: string, memo: string | null) => void;
}

export default function ProspectActionModal({
  proposal,
  open,
  onOpenChange,
  onDelete,
  onMemoUpdate,
}: ProspectActionModalProps) {
  const [memoText, setMemoText] = useState(proposal.voice_memo ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset local state whenever the modal opens (or proposal changes)
  useEffect(() => {
    if (open) {
      setMemoText(proposal.voice_memo ?? '');
      setSaveError(null);
      setSaveSuccess(false);
      setDeleteError(null);
    }
  }, [open, proposal.voice_memo]);

  async function handleSaveMemo() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/memo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_memo: memoText || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError((body as { error?: string }).error ?? 'Failed to save memo');
        return;
      }
      const saved = await res.json() as { voice_memo: string | null };
      onMemoUpdate(proposal.id, saved.voice_memo);
      setSaveSuccess(true);
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete prospect "${proposal.customer_name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDeleteError((body as { error?: string }).error ?? 'Failed to delete prospect');
        return;
      }
      onDelete(proposal.id);
      onOpenChange(false);
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal.customer_name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Voice memo section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`voice-memo-${proposal.id}`}>Voice Memo</Label>
            <Textarea
              id={`voice-memo-${proposal.id}`}
              value={memoText}
              onChange={(e) => {
                setMemoText(e.target.value);
                setSaveSuccess(false);
              }}
              placeholder="Transcribe your voice note here…"
              className="min-h-[120px] max-h-[300px] resize-y"
              aria-label="Voice memo text"
            />
            {saveError && (
              <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-600 dark:text-green-400" role="status">
                Saved
              </p>
            )}
            <Button
              onClick={handleSaveMemo}
              disabled={saving}
              aria-label="Save or update voice memo"
            >
              {saving ? 'Saving…' : 'Save/Update Memo'}
            </Button>
          </div>

          {/* Generate Quote placeholder */}
          <Button
            variant="outline"
            onClick={() => undefined}
            aria-label="Generate quote (coming soon)"
          >
            Generate Quote
          </Button>

          {/* Bottom actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" asChild className="w-full">
              <Link href={`/app/proposals/${proposal.id}/services`}>
                Services
              </Link>
            </Button>
            {deleteError && (
              <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                {deleteError}
              </p>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              aria-label={`Delete prospect ${proposal.customer_name}`}
              className="w-full"
            >
              {deleting ? 'Deleting…' : 'Delete Prospect'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
