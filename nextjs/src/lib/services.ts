/** Types and pure utility functions for the Prospect Services & Pricing feature. */

export type ServiceCatalogRow = {
  id: string;
  name: string;
  description: string;
  default_price: number;
  sort_order: number;
};

export type ProspectServiceRow = {
  prospect_id: string;
  service_id: string;
  price: number;
};

/** The merged shape rendered per row in the ServicesForm. */
export type ServicesPricingRow = {
  service_id: string;
  name: string;
  description: string;
  default_price: number;
  /** Prospect-specific price override, falling back to default_price when no row exists. */
  price: number;
};

/**
 * Sums all price values from the form's price state map.
 * Non-numeric or negative strings are treated as zero (client-side guard).
 */
export function calcTotal(prices: Record<string, string>): number {
  return Object.values(prices).reduce((sum, v) => {
    const n = parseFloat(v);
    if (!isFinite(n) || n < 0) return sum;
    return sum + n;
  }, 0);
}

/**
 * Formats a numeric value as USD currency string.
 * e.g. 193000 → "$193,000.00"
 */
export function formatUSDPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
