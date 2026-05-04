import type { SassClient } from '@/lib/supabase/unified';
import { sortProposals, type ProposalRow } from '@/lib/proposals';

export async function fetchProposalQueue(
  client: SassClient,
  userId: string,
): Promise<ProposalRow[]> {
  const { data, error } = await client
    .getSupabaseClient()
    .from('proposals')
    .select('*')
    .is('archived_at', null)
    .eq('owner', userId);

  if (error) throw error;
  return sortProposals((data as ProposalRow[]) ?? []);
}
