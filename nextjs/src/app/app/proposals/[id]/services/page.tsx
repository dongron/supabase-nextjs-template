import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSSRSassClient } from '@/lib/supabase/server';
import { fetchProspectServices } from '@/lib/supabase/services';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ServicesForm from '@/components/proposals/ServicesForm';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProspectServicesPage({ params }: Props) {
  const { id: prospectId } = await params;

  const client = await createSSRSassClient();
  const {
    data: { user },
  } = await client.getSupabaseClient().auth.getUser();

  if (!user) redirect('/auth/login');

  // Verify the prospect exists and belongs to this user.
  const { data: proposal } = await client
    .getSupabaseClient()
    .from('proposals')
    .select('id, customer_name')
    .eq('id', prospectId)
    .eq('owner', user.id)
    .single();

  if (!proposal) notFound();

  const services = await fetchProspectServices(client, user.id, prospectId);

  return (
    <div className="space-y-6 p-6">
      {/* Mobile notice — visible only on small screens */}
      <Alert className="md:hidden border-amber-400 bg-amber-50 dark:bg-amber-950 dark:border-amber-600">
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
          This page is best viewed on a desktop or larger screen for the full pricing table.
        </AlertDescription>
      </Alert>

      {/* Back navigation */}
      <div>
        <Link
          href="/app/proposals"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          aria-label="Back to proposals"
        >
          &larr; Back to Proposals
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Services &amp; Pricing
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {proposal.customer_name}
        </p>
      </div>

      {services.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No services found. Add services to your catalog to begin pricing proposals.
          </p>
        </div>
      ) : (
        <ServicesForm prospectId={prospectId} initialServices={services} />
      )}
    </div>
  );
}
