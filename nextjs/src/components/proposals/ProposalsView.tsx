'use client';

import React, { useState } from 'react';
import type { ProposalRow } from '@/lib/proposals';
import ProposalQueue from './ProposalQueue';
import AddProposalForm from './AddProposalForm';

interface ProposalsViewProps {
  proposals: ProposalRow[];
}

export default function ProposalsView({ proposals: initial }: ProposalsViewProps) {
  const [proposals, setProposals] = useState(initial);

  function handleDelete(id: string) {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  }

  function handleAdd(proposal: ProposalRow) {
    setProposals((prev) => [proposal, ...prev]);
  }

  function handleMemoUpdate(id: string, memo: string | null) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, voice_memo: memo } : p)),
    );
  }

  function handleStageUpdate(id: string, stage: string) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage } : p)),
    );
  }

  return (
    <>
      <ProposalQueue proposals={proposals} onDelete={handleDelete} onMemoUpdate={handleMemoUpdate} onStageUpdate={handleStageUpdate} />
      <AddProposalForm onAdd={handleAdd} />
    </>
  );
}
