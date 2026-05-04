'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, type ProposalStage } from '@/lib/proposals';

const STAGES = Object.keys(STAGE_LABELS) as ProposalStage[];

type FormState = {
  customer_name: string;
  neighborhood: string;
  walk_date: string;
  estimated_value: string;
  stage: ProposalStage;
};

const INITIAL_STATE: FormState = {
  customer_name: '',
  neighborhood: '',
  walk_date: '',
  estimated_value: '',
  stage: 'voice_memo_received',
};

export default function AddProposalForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const estimatedValue = parseFloat(form.estimated_value);
    if (isNaN(estimatedValue) || estimatedValue < 0) {
      setError('Please enter a valid estimated value (≥ 0).');
      setLoading(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        customer_name: form.customer_name.trim(),
        neighborhood: form.neighborhood.trim(),
        estimated_value: estimatedValue,
        stage: form.stage,
      };
      if (form.walk_date) {
        body.walk_date = form.walk_date;
      }

      const res = await fetch('/api/app/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create proposal');
        return;
      }

      setForm(INITIAL_STATE);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Add New Proposal
      </h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Customer name */}
          <div>
            <label
              htmlFor="customer_name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Customer Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              required
              value={form.customer_name}
              onChange={handleChange}
              placeholder="James Harrington"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label
              htmlFor="neighborhood"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Neighborhood <span aria-hidden="true">*</span>
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              required
              value={form.neighborhood}
              onChange={handleChange}
              placeholder="River Oaks"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Walk date */}
          <div>
            <label
              htmlFor="walk_date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Walk Date
            </label>
            <input
              id="walk_date"
              name="walk_date"
              type="date"
              value={form.walk_date}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estimated value */}
          <div>
            <label
              htmlFor="estimated_value"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Estimated Value (USD) <span aria-hidden="true">*</span>
            </label>
            <input
              id="estimated_value"
              name="estimated_value"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.estimated_value}
              onChange={handleChange}
              placeholder="45000"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Stage */}
          <div className="sm:col-span-2">
            <label
              htmlFor="stage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Stage <span aria-hidden="true">*</span>
            </label>
            <select
              id="stage"
              name="stage"
              required
              value={form.stage}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {loading ? 'Adding…' : 'Add Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}
