import React from 'react';
import { redirect } from 'next/navigation';
import { createSSRSassClient } from '@/lib/supabase/server';
import { fetchServiceCatalog } from '@/lib/supabase/services';
import { formatUSDPrice } from '@/lib/services';
import DeleteServiceButton from '@/components/proposals/DeleteServiceButton';

export default async function ServicesPage() {
  const client = await createSSRSassClient();
  const {
    data: { user },
  } = await client.getSupabaseClient().auth.getUser();

  if (!user) redirect('/auth/login');

  const services = await fetchServiceCatalog(client, user.id);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Services Catalog
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your available services and default pricing.
        </p>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No services found. Add services to your catalog to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Service
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Default Price
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {service.name}
                    </div>
                    {service.description && (
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {service.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatUSDPrice(service.default_price)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <DeleteServiceButton serviceId={service.id} serviceName={service.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
