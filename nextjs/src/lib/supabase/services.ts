import type { SassClient } from '@/lib/supabase/unified';
import type { ServiceCatalogRow, ServicesPricingRow } from '@/lib/services';

/**
 * Fetches all catalog services owned by the authenticated user, ordered by sort_order.
 */
export async function fetchServiceCatalog(
  client: SassClient,
  userId: string,
): Promise<ServiceCatalogRow[]> {
  const supabase = client.getSupabaseClient();
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, default_price, sort_order')
    .eq('owner', userId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    default_price: Number(row.default_price),
    sort_order: row.sort_order,
  }));
}

/**
 * Fetches all catalog services for the authenticated owner, then merges
 * any prospect-specific price overrides for the given prospectId.
 *
 * Isolation guarantee: the second query filters strictly by prospectId, so
 * rows belonging to any other prospect are never returned or merged.
 *
 * Returns one ServicesPricingRow per catalog service, ordered by sort_order.
 * When no prospect_services row exists for a service, price falls back to
 * the catalog default_price.
 */
export async function fetchProspectServices(
  client: SassClient,
  userId: string,
  prospectId: string,
): Promise<ServicesPricingRow[]> {
  const supabase = client.getSupabaseClient();

  // 1. Fetch all catalog services for this owner, ordered for display.
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, description, default_price, sort_order')
    .eq('owner', userId)
    .order('sort_order', { ascending: true });

  if (servicesError) throw servicesError;
  if (!services || services.length === 0) return [];

  // 2. Fetch all prospect-specific price overrides for this prospect only.
  //    Strictly scoped to prospectId — no cross-prospect data leakage.
  const { data: overrides, error: overridesError } = await supabase
    .from('prospect_services')
    .select('service_id, price')
    .eq('prospect_id', prospectId);

  if (overridesError) throw overridesError;

  // Build a lookup map for O(1) merge.
  const overrideMap = new Map<string, number>();
  for (const row of overrides ?? []) {
    overrideMap.set(row.service_id, Number(row.price));
  }

  // 3. Merge: use prospect override if present, otherwise fall back to default_price.
  return services.map((svc) => ({
    service_id: svc.id,
    name: svc.name,
    description: svc.description,
    default_price: Number(svc.default_price),
    price: overrideMap.has(svc.id)
      ? (overrideMap.get(svc.id) as number)
      : Number(svc.default_price),
  }));
}
