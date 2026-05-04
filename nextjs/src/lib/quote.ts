export type QuoteService = {
  serviceId: string | null;
  serviceName: string;
  price: number | null;
};

export type GenerateQuoteResponse = {
  services: QuoteService[];
};

export type SaveQuoteRequest = {
  services: Array<{
    serviceId: string | null;
    serviceName: string;
    price: string | number | null;
  }>;
};

/**
 * Normalizes a raw price value to a number or null.
 * Strips non-numeric characters (e.g. "$", "€", whitespace).
 * Returns null for blank, null, or NaN values.
 */
export function normalizePrice(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }
  const stripped = raw.replace(/[^0-9.]/g, '').trim();
  if (stripped === '') return null;
  const parsed = parseFloat(stripped);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parses the stored JSON quote string into an array of QuoteService.
 * Returns an empty array if input is null, empty, or malformed JSON.
 */
export function parseStoredQuote(json: string | null): QuoteService[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed as QuoteService[];
  } catch {
    return [];
  }
}

/**
 * Parses a plain-text quote (stored format) into an array of QuoteService.
 * Handles lines like "- Service Name - 150" and skips "Total:" and blank lines.
 * serviceId is always null since plain text does not preserve catalog references.
 */
export function parseTextQuote(text: string | null): QuoteService[] {
  if (!text) return [];
  const lines = text.split('\n');
  const services: QuoteService[] = [];
  for (const line of lines) {
    if (!line.startsWith('- ')) continue;
    const content = line.slice(2); // strip leading "- "
    const lastDash = content.lastIndexOf(' - ');
    if (lastDash === -1) {
      services.push({ serviceId: null, serviceName: content.trim(), price: null });
      continue;
    }
    const name = content.slice(0, lastDash).trim();
    const rawPrice = content.slice(lastDash + 3).trim();
    const price = rawPrice === '—' || rawPrice === '' ? null : parseFloat(rawPrice);
    services.push({
      serviceId: null,
      serviceName: name,
      price: price !== null && !isNaN(price) ? price : null,
    });
  }
  return services;
}
