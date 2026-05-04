# Quickstart: Claude Quote Generation

**Feature**: 004-claude-quote-generation
**Date**: 2026-05-04

This guide explains how to set up the development environment and verify the feature end-to-end.

---

## Prerequisites

- Node.js 20+, pnpm installed
- Supabase local stack running (`supabase start`)
- Valid `PRIVATE_CALUDE_API_KEY` in `nextjs/.env.local`

---

## 1. Install the Anthropic SDK

```bash
cd nextjs
pnpm add @anthropic-ai/sdk
```

---

## 2. Apply the Database Migration

```bash
# From the repo root
supabase migration up
# or, if running local Supabase:
supabase db reset   # includes all migrations including the new quote column
```

The migration `20260504140000_add_quote_to_proposals.sql` adds `quote text` to the `proposals` table.

---

## 3. Regenerate TypeScript Types (optional)

After applying the migration, regenerate `nextjs/src/lib/types.ts` to pick up the new column:

```bash
cd nextjs
supabase gen types typescript --local > src/lib/types.ts
```

If you cannot run Supabase locally, manually add the following lines to `src/lib/types.ts`:

**In `proposals.Row`:**
```typescript
quote: string | null
```

**In `proposals.Update`:**
```typescript
quote?: string | null
```

---

## 4. Verify Environment Variable

Ensure `nextjs/.env.local` contains:

```dotenv
PRIVATE_CALUDE_API_KEY=sk-ant-api03-...
```

The key is **only** read server-side. It must NOT be prefixed with `NEXT_PUBLIC_`.

---

## 5. Run the Dev Server

```bash
cd nextjs
pnpm dev
```

Navigate to the Proposals page, open the action modal for a prospect that has a voice memo saved, and click **Generate Quote**.

---

## 6. Run Tests

```bash
cd nextjs
pnpm vitest run
```

New test files:
- `src/lib/quote.test.ts` — pure utility unit tests
- `src/app/api/app/proposals/__tests__/quote.test.ts` — API route tests (mocked SDK + Supabase)
- `src/components/proposals/__tests__/ReviewQuoteModal.test.tsx` — component tests

---

## 7. Feature Flow (Manual Verification Checklist)

1. Open the prospect action modal for a prospect **without** a voice memo → verify "Generate Quote" shows an error/disabled state.
2. Save a voice memo for a prospect (e.g., "Client wants garden lighting and stone paving").
3. Click "Generate Quote" → verify loading spinner appears.
4. Wait for the Review Quote modal to open → verify extracted services list is displayed with editable name and price inputs.
5. Verify matched services (those in the catalog) have a checkmark.
6. Edit a service name and price, add a new blank row, delete another row.
7. Click "Save" → verify modal closes.
8. Reopen the prospect action modal → verify the saved quote is displayed as a formatted list.
9. Generate a new quote and save → verify the previous quote is replaced.
10. Disconnect from the internet and click "Generate Quote" → verify inline error with "Try Again" button appears.

---

## 8. Key Files Reference

| File | Purpose |
|---|---|
| `supabase/migrations/20260504140000_add_quote_to_proposals.sql` | Adds `quote` column |
| `nextjs/src/lib/quote.ts` | `QuoteService` type + parse/normalize utilities |
| `nextjs/src/app/api/app/proposals/[id]/quote/route.ts` | POST (generate) + PATCH (save) handlers |
| `nextjs/src/components/proposals/ReviewQuoteModal.tsx` | Review + edit modal component |
| `nextjs/src/components/proposals/ProspectActionModal.tsx` | Modified to wire Generate Quote button + display saved quote |
