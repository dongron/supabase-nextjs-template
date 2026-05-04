# Quickstart: Proposal Pipeline Queue

**Branch**: `001-proposal-pipeline-queue`  
**Date**: 2026-05-04

This guide covers how to get the feature running locally from scratch and what to implement in what order.

---

## Prerequisites

- Node.js ≥ 20, pnpm
- Supabase CLI (`brew install supabase/tap/supabase`)
- Local Supabase stack running (`supabase start` from repo root)
- `.env.local` populated under `nextjs/` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 1. Apply the Database Migration

```bash
# From repo root
supabase migration new proposals
# Edit the generated file in supabase/migrations/ with the SQL from data-model.md
supabase db reset   # or: supabase migration up
```

After reset, regenerate TypeScript types:

```bash
supabase gen types typescript --local > nextjs/src/lib/types.ts
```

Verify the `proposals` table appears in `types.ts` under `Database['public']['Tables']`.

---

## 2. Add the ProposalStage Types and Utilities

Create `nextjs/src/lib/proposals.ts` using the types from [data-model.md](../data-model.md#typescript-types).

This module exports `ProposalRow`, `ProposalStage`, `STAGE_LABELS`, `isOverdueReview()`, and `isRenderEtaOverdue()`.

---

## 3. Add the Server-Side Fetch Function

Create `nextjs/src/lib/supabase/proposals.ts`:

```typescript
import type { SassClient } from '@/lib/supabase/unified';
import type { ProposalRow } from '@/lib/proposals';

export async function fetchProposalQueue(
  client: SassClient,
  userId: string
): Promise<ProposalRow[]> {
  // Query with urgency sort — see contracts/api.md for the full SQL
  const { data, error } = await client
    .getDatabaseClient()  // exposes the raw SupabaseClient
    .from('proposals')
    .select('*')
    .is('archived_at', null)
    .eq('owner', userId)
    .order(/* ... urgency ORDER BY via rpc or manual sort */);

  if (error) throw error;
  return data ?? [];
}
```

> **Note**: Supabase JS client does not support CASE expressions in `.order()`. Use a PostgreSQL function (RPC) or sort client-side after fetch. Given the small dataset (single CEO, at most a few dozen active proposals), client-side sort after fetch is acceptable here. The SQL reference sort in `contracts/api.md` documents the intended order — implement it as a `sortProposals(proposals: ProposalRow[])` utility function in `proposals.ts`.

---

## 4. Build the Queue Page (Server Component)

Create `nextjs/src/app/app/proposals/page.tsx`:

```typescript
import { createSSRSassClient } from '@/lib/supabase/server';
import { fetchProposalQueue } from '@/lib/supabase/proposals';
import ProposalQueue from '@/components/proposals/ProposalQueue';
import { redirect } from 'next/navigation';

export default async function ProposalsPage() {
  const client = await createSSRSassClient();
  const { data: { user } } = await client.getDatabaseClient().auth.getUser();
  if (!user) redirect('/auth/login');

  const proposals = await fetchProposalQueue(client, user.id);

  return <ProposalQueue proposals={proposals} />;
}
```

---

## 5. Build the Queue Components

Create the following files under `nextjs/src/components/proposals/`:

| File | Purpose |
|------|---------|
| `ProposalQueue.tsx` | `"use client"` — outer table/list container, renders one `ProposalRow` per proposal |
| `ProposalRow.tsx` | `"use client"` — single row with stage badge, tint logic, inline action buttons |
| `DesignerNotifyDialog.tsx` | `"use client"` — Radix Dialog with a datetime input for ETA entry, calls PATCH designer endpoint |

**Row tint logic** (inside `ProposalRow.tsx`):
```typescript
import { isOverdueReview } from '@/lib/proposals';
const overdue = isOverdueReview(proposal);
// Apply to the <tr> or row wrapper:
className={cn('...base styles', overdue && 'bg-red-50 dark:bg-red-950/20')}
```

---

## 6. Build the API Routes

### PATCH designer notification
`nextjs/src/app/api/app/proposals/[id]/designer/route.ts`

See [contracts/api.md](../contracts/api.md#patch-apiappproposalsiddesigner) for full behavior spec.

### PATCH dismiss attention
`nextjs/src/app/api/app/proposals/[id]/dismiss-attention/route.ts`

See [contracts/api.md](../contracts/api.md#patch-apiappproposalsiddismiss-attention) for full behavior spec.

---

## 7. Add Navigation Entry

In `nextjs/src/components/AppLayout.tsx`, add to the `navigation` array:

```typescript
{ name: 'Proposals', href: '/app/proposals', icon: ClipboardList },
```

---

## 8. Seed Data for Local Dev

Use Supabase Studio or a seed SQL file to insert test proposals covering all stages and edge cases:

- One proposal in `ready_for_review` with `stage_entered_at` > 18 hours ago (triggers red tint)
- One proposal with `estimated_value = 35000` + `designer_notified = false` (render badge, unnotified)
- One proposal with `estimated_value = 35000` + `designer_notified = true` + `designer_eta` in past + `render_delivered = false` (overdue render)
- One proposal with `needs_attention = true`
- One proposal with no `walk_date`
- One proposal in `signed` stage

---

## 9. Verify Constitution Gates

Before merging:

- [ ] `pnpm lint` passes in `nextjs/`
- [ ] `tsc --noEmit` passes in `nextjs/`
- [ ] RLS policies tested: unauthenticated SELECT returns 0 rows; authenticated SELECT returns only own proposals
- [ ] All async operations in UI have loading and error states
- [ ] All interactive elements have ARIA labels and visible focus states
- [ ] Dark mode verified for all new components
- [ ] No `console.log` statements left in production code
