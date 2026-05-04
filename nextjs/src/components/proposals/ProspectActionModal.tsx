'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ProposalRow, ProposalStage } from '@/lib/proposals';
import { STAGE_LABELS } from '@/lib/proposals';
import ReviewQuoteModal from './ReviewQuoteModal';
import { parseTextQuote, calculateQuoteTotal, type QuoteService } from '@/lib/quote';

interface ProspectActionModalProps {
  proposal: ProposalRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onMemoUpdate: (id: string, memo: string | null) => void;
  onStageUpdate: (id: string, stage: string) => void;
}

export default function ProspectActionModal({
  proposal,
  open,
  onOpenChange,
  onDelete,
  onMemoUpdate,
  onStageUpdate,
}: ProspectActionModalProps) {
  const [memoText, setMemoText] = useState(proposal.voice_memo ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [generatedServices, setGeneratedServices] = useState<QuoteService[]>([]);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [localQuote, setLocalQuote] = useState<string | null>(proposal.quote ?? null);
  const [editQuoteServices, setEditQuoteServices] = useState<QuoteService[]>([]);
  const [localStage, setLocalStage] = useState<string>(proposal.stage);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [localQuoteSent, setLocalQuoteSent] = useState<boolean>(proposal.quote_sent ?? false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [sendQuoteError, setSendQuoteError] = useState<string | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [isNotifyingDesigner, setIsNotifyingDesigner] = useState(false);
  const [designerNotifyError, setDesignerNotifyError] = useState<string | null>(null);
  const [isNotifyingSlack, setIsNotifyingSlack] = useState(false);
  const [slackNotifyError, setSlackNotifyError] = useState<string | null>(null);
  const [slackNotifySent, setSlackNotifySent] = useState(false);

  const quoteTotal = localQuote ? calculateQuoteTotal(parseTextQuote(localQuote)) : 0;

  // Reset local state whenever the modal opens (or proposal changes)
  useEffect(() => {
    if (open) {
      setMemoText(proposal.voice_memo ?? '');
      setSaveError(null);
      setSaveSuccess(false);
      setDeleteError(null);
      setQuoteError(null);
      setLocalQuote(proposal.quote ?? null);
      setLocalStage(proposal.stage);
      setStageError(null);
      setLocalQuoteSent(proposal.quote_sent ?? false);
      setSendQuoteError(null);
      setShowResendConfirm(false);
      setDesignerNotifyError(null);
      setSlackNotifyError(null);
      setSlackNotifySent(false);
    }
  }, [open, proposal.voice_memo, proposal.quote, proposal.stage, proposal.quote_sent]);

  async function handleStageChange(newStage: ProposalStage) {
    const prev = localStage;
    setLocalStage(newStage);
    setStageSaving(true);
    setStageError(null);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStageError((body as { error?: string }).error ?? 'Failed to update stage');
        setLocalStage(prev);
        return;
      }
      onStageUpdate(proposal.id, newStage);
    } catch {
      setStageError('Network error. Please try again.');
      setLocalStage(prev);
    } finally {
      setStageSaving(false);
    }
  }

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

  async function handleGenerateQuote() {
    setIsGenerating(true);
    setQuoteError(null);
    setEditQuoteServices([]);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/quote`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setQuoteError((body as { error?: string }).error ?? 'Failed to generate quote');
        return;
      }
      const data = await res.json() as { services: QuoteService[] };
      setGeneratedServices(data.services);
      setReviewModalOpen(true);
    } catch {
      setQuoteError('Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveQuote(services: QuoteService[]) {
    setIsSavingQuote(true);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setQuoteError((body as { error?: string }).error ?? 'Failed to save quote');
        return;
      }
      const saved = await res.json() as { quote: string };
      setLocalQuote(saved.quote);
      setReviewModalOpen(false);

      // Also persist matched services to prospect_services (non-blocking)
      const matchedServices = services
        .filter((s) => s.serviceId !== null && s.price !== null)
        .map((s) => ({ service_id: s.serviceId as string, price: s.price as number }));
      if (matchedServices.length > 0) {
        fetch(`/api/app/proposals/${proposal.id}/services`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services: matchedServices }),
        }).catch(() => {
          // Non-blocking: quote is already saved
        });
      }
    } catch {
      setQuoteError('Network error. Please try again.');
    } finally {
      setIsSavingQuote(false);
    }
  }

  async function handleSendQuote() {
    setIsSendingQuote(true);
    setSendQuoteError(null);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/send-quote`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendQuoteError((body as { error?: string }).error ?? 'Failed to send email');
        return;
      }
      setLocalQuoteSent(true);
    } catch {
      setSendQuoteError('Network error. Please try again.');
    } finally {
      setIsSendingQuote(false);
      setShowResendConfirm(false);
    }
  }

  async function handleNotifyDesigner() {
    setIsNotifyingDesigner(true);
    setDesignerNotifyError(null);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/notify-designer-email`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDesignerNotifyError((body as { error?: string }).error ?? 'Failed to send notification');
        return;
      }
    } catch {
      setDesignerNotifyError('Network error. Please try again.');
    } finally {
      setIsNotifyingDesigner(false);
    }
  }

  async function handleNotifySlack() {
    setIsNotifyingSlack(true);
    setSlackNotifyError(null);
    setSlackNotifySent(false);
    try {
      const res = await fetch(`/api/app/proposals/${proposal.id}/notify-slack`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSlackNotifyError((body as { error?: string }).error ?? 'Failed to send Slack notification');
        return;
      }
      setSlackNotifySent(true);
      setTimeout(() => setSlackNotifySent(false), 1500);
    } catch {
      setSlackNotifyError('Network error. Please try again.');
    } finally {
      setIsNotifyingSlack(false);
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal.customer_name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Stage section */}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`stage-${proposal.id}`}>Stage</Label>
            <select
              id={`stage-${proposal.id}`}
              value={localStage}
              disabled={stageSaving}
              onChange={(e) => handleStageChange(e.target.value as ProposalStage)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              aria-label="Proposal stage"
            >
              {(Object.entries(STAGE_LABELS) as [ProposalStage, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {stageError && (
              <p className="text-sm text-red-500 dark:text-red-400" role="alert">{stageError}</p>
            )}
          </div>

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

          {/* Generate Quote section */}
          <div className="flex flex-col gap-2">
            {quoteError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>{quoteError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setQuoteError(null); handleGenerateQuote(); }}
                  >
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="outline"
              onClick={handleGenerateQuote}
              disabled={isGenerating}
              aria-label="Generate quote from voice memo"
            >
              {isGenerating ? 'Generating…' : 'Generate Quote'}
            </Button>

            {localQuote && !localQuote.trimStart().startsWith('[') && (
              <div className="flex flex-col gap-1 mt-1">
                <pre className="text-sm whitespace-pre-wrap font-sans" aria-label="Saved quote">{localQuote}</pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditQuoteServices(parseTextQuote(localQuote));
                    setReviewModalOpen(true);
                  }}
                >
                  Edit Quote
                </Button>
                {sendQuoteError && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{sendQuoteError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSendingQuote}
                  onClick={() => {
                    if (localQuoteSent) {
                      setShowResendConfirm(true);
                    } else {
                      void handleSendQuote();
                    }
                  }}
                  aria-label="Send quote to customer"
                >
                  {isSendingQuote ? 'Sending…' : localQuoteSent ? 'Resend to customer' : 'Send to customer'}
                </Button>
                {designerNotifyError && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{designerNotifyError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={quoteTotal <= 30000 || isNotifyingDesigner}
                  title={quoteTotal <= 30000 ? 'Requires quote total > $30,000' : undefined}
                  onClick={() => void handleNotifyDesigner()}
                  aria-label="Notify designer about high-value quote"
                >
                  {isNotifyingDesigner ? 'Notifying…' : 'Notify designer'}
                </Button>
                {slackNotifyError && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{slackNotifyError}</AlertDescription>
                  </Alert>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={quoteTotal <= 30000 || isNotifyingSlack}
                  title={quoteTotal <= 30000 ? 'Requires quote total > $30,000' : undefined}
                  onClick={() => void handleNotifySlack()}
                  aria-label="Notify on Slack"
                >
                  {isNotifyingSlack ? 'Notifying…' : slackNotifySent ? 'Sent!' : 'Notify on Slack'}
                </Button>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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

    <ReviewQuoteModal
      open={reviewModalOpen}
      onOpenChange={setReviewModalOpen}
      services={editQuoteServices.length > 0 ? editQuoteServices : generatedServices}
      onSave={handleSaveQuote}
      isSaving={isSavingQuote}
    />

    <AlertDialog open={showResendConfirm} onOpenChange={setShowResendConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Quote already sent</AlertDialogTitle>
          <AlertDialogDescription>
            A quote email has already been sent to this customer. Send again?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleSendQuote()}>
            Send again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
