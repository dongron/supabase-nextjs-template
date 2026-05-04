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

  return (
    <>
      <ProposalQueue proposals={proposals} onDelete={handleDelete} />
      <AddProposalForm onAdd={handleAdd} />
    </>
  );
}
