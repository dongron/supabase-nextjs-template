'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ServicesPricingRow } from '@/lib/services';
import { calcTotal, formatUSDPrice } from '@/lib/services';
import ServiceRow from './ServiceRow';

type Props = {
  prospectId: string;
  initialServices: ServicesPricingRow[];
};

export default function ServicesForm({ prospectId, initialServices }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Initialise price state from the fetched data.
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialServices.map((s) => [s.service_id, String(s.price)]),
    ),
  );

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleChange(serviceId: string, value: string) {
    setPrices((prev) => ({ ...prev, [serviceId]: value }));
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMessage(null);

    const services = Object.entries(prices).map(([service_id, value]) => ({
      service_id,
      price: parseFloat(value) || 0,
    }));

    try {
      const res = await fetch(
        `/api/app/proposals/${prospectId}/services`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }

      setStatus('saved');
      startTransition(() => {
        router.refresh();
      });

      // Reset status after 3 s
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  }

  const total = calcTotal(prices);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          aria-label="Services and pricing table"
        >
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Service
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Default Price
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
              >
                Prospect Price
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {initialServices.map((service) => (
              <ServiceRow
                key={service.service_id}
                service={service}
                price={prices[service.service_id] ?? String(service.price)}
                onChange={handleChange}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <td
                colSpan={2}
                className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                Running Total
              </td>
              <td
                className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100"
                aria-live="polite"
                aria-label={`Running total: ${formatUSDPrice(total)}`}
              >
                {formatUSDPrice(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Save action + status feedback */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === 'saving' || isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          aria-label="Save service pricing for this prospect"
        >
          {status === 'saving' ? 'Saving\u2026' : 'Save Prices'}
        </button>

        {status === 'saved' && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-green-600 dark:text-green-400"
          >
            Prices saved successfully.
          </p>
        )}

        {status === 'error' && errorMessage && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
