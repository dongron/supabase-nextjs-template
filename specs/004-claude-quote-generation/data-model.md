# Data Model: Claude Quote Generation

**Feature**: 004-claude-quote-generation
**Phase**: 1 — Design
**Date**: 2026-05-04

---

## 1. Database Changes

### 1.1 New Column: `proposals.quote`

| Attribute | Value |
|---|---|
| Table | `proposals` |
| Column | `quote` |
| Type | `text` |
| Nullable | `YES` |
| Default | `NULL` |
| Storage format | `JSON.stringify({ services: QuoteService[] })` |

No new tables. No new RLS policies (existing `proposals` policies cover the new column).

**Migration file**: `supabase/migrations/20260504140000_add_quote_to_proposals.sql`

```sql
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS quote text;
```

---

### 1.2 Updated TypeScript Types (`nextjs/src/lib/types.ts`)

Add `quote: string | null` to the `proposals` Row and Update types:

```typescript
// proposals.Row — add:
quote: string | null

// proposals.Update — add:
quote?: string | null
```

*(Insert is not updated — quote is never set at prospect creation time.)*

---

## 2. Application-Level Types (`nextjs/src/lib/quote.ts`)

### 2.1 `QuoteService`

The canonical shape for a single service entry inside a quote — used in the review modal, API request/response bodies, and stored JSON.

```typescript
export type QuoteService = {
  /** Matched service catalog ID, or null if the service was not in the catalog */
  serviceId: string | null;
  /** Human-readable service name (editable by staff) */
  serviceName: string;
  /** Price in USD (editable by staff), or null if no price was extracted */
  price: number | null;
};
```

### 2.2 `GenerateQuoteResponse`

Shape returned by `POST /api/app/proposals/[id]/quote` to the client:

```typescript
export type GenerateQuoteResponse = {
  services: QuoteService[];
};
```

### 2.3 `SaveQuoteRequest`

Shape of the body sent by the client to `PATCH /api/app/proposals/[id]/quote`:

```typescript
export type SaveQuoteRequest = {
  /** Raw services list from the review modal — price fields may contain strings */
  services: Array<{
    serviceId: string | null;
    serviceName: string;
    price: string | number | null;   // normalized server-side
  }>;
};
```

### 2.4 `StoredQuote`

Shape stored in `proposals.quote` after normalization:

```typescript
export type StoredQuote = {
  services: QuoteService[];   // price is always number | null after normalization
};
```

---

## 3. State Transitions

The `quote` field state machine per prospect:

```
NULL (no quote)
  └─ [staff clicks "Generate Quote" + saves] → JSON string (quote present)
       └─ [staff generates + saves again]     → JSON string (overwritten)
       └─ [staff saves empty list]            → JSON string ('{"services":[]}')
```

No deletion of the `quote` field is explicitly required by the spec; saving an empty list is the equivalent.

---

## 4. Relationships

```
proposals (existing table)
  └── quote (new text column)
        └── parsed as StoredQuote { services: QuoteService[] }
              └── QuoteService.serviceId → references services.id (logical FK, not enforced at DB level)
```

The `serviceId` reference to `services.id` is intentionally a soft reference. Services can be renamed or deleted without corrupting saved quotes (the quote stores a snapshot, not a live reference).

---

## 5. Validation Rules

| Field | Rule |
|---|---|
| `quote` (DB column) | Any text or NULL — validation happens at application layer |
| `QuoteService.serviceName` | Non-empty string; if blank on save, passed through as-is (UI should warn) |
| `QuoteService.price` | Strip non-numeric/non-decimal characters; `parseFloat` result; `NaN` or blank → `null` |
| `QuoteService.serviceId` | String UUID or `null` — set by server during generation, not editable by user |
