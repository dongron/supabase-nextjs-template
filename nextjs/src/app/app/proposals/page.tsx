import React from 'react';
import { redirect } from 'next/navigation';
import { createSSRSassClient } from '@/lib/supabase/server';
import { fetchProposalQueue } from '@/lib/supabase/proposals';
import ProposalQueue from '@/components/proposals/ProposalQueue';
import AddProposalForm from '@/components/proposals/AddProposalForm';

export default async function ProposalsPage() {
  const client = await createSSRSassClient();
  const {
    data: { user },
  } = await client.getSupabaseClient().auth.getUser();

  if (!user) redirect('/auth/login');

  const proposals = await fetchProposalQueue(client, user.id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Proposal Pipeline
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All active proposals sorted by urgency.
        </p>
      </div>

      <ProposalQueue proposals={proposals} />
      <AddProposalForm />
    </div>
  );
}
