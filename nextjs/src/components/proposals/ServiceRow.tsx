'use client';

import React from 'react';
import type { ServicesPricingRow } from '@/lib/services';

type Props = {
  service: ServicesPricingRow;
  price: string;
  onChange: (serviceId: string, value: string) => void;
};

export default function ServiceRow({ service, price, onChange }: Props) {
  return (
    <tr className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <td className="py-3 pr-4 align-top">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {service.name}
        </p>
        {service.description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {service.description}
          </p>
        )}
      </td>
      <td className="py-3 pr-4 text-right align-middle text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        ${service.default_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 align-middle">
        <div className="flex items-center">
          <span className="mr-1 text-sm text-gray-500 dark:text-gray-400">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={price}
            onChange={(e) => onChange(service.service_id, e.target.value)}
            className="w-32 rounded-md border border-gray-300 bg-white px-2 py-1 text-right text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            aria-label={`Price for ${service.name}`}
          />
        </div>
      </td>
    </tr>
  );
}
