'use client';

import React from 'react';
import type { ProposalRow } from '@/lib/proposals';
import ProposalRowComponent from './ProposalRow';

interface ProposalQueueProps {
  proposals: ProposalRow[];
  onDelete: (id: string) => void;
  onMemoUpdate: (id: string, memo: string | null) => void;
}

export default function ProposalQueue({ proposals, onDelete, onMemoUpdate }: ProposalQueueProps) {

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">No active proposals</p>
        <p className="mt-1 text-sm">
          Use the form below to add your first proposal to the pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Customer
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Neighborhood
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Walk Date
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Value
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Stage
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              In Stage
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Render
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
              Flags
            </th>
            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {proposals.map((proposal) => (
            <ProposalRowComponent key={proposal.id} proposal={proposal} onDelete={onDelete} onMemoUpdate={onMemoUpdate} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
