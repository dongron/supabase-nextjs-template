# Research: Proposal Pipeline Queue

**Phase**: 0 — Pre-design  
**Branch**: `001-proposal-pipeline-queue`  
**Date**: 2026-05-04

---

## 1. Sort Strategy: Server-side vs Client-side

**Decision**: Sort entirely in PostgreSQL via ORDER BY on the proposals query.

**Rationale**: The sort depends on `stage_entered_at` relative to `NOW()` (the 18-hour overdue check). Doing this in SQL means the sort is always accurate at page load, requires no post-fetch computation on the client, and scales naturally as the proposal count grows. PostgreSQL CASE expressions in ORDER BY are idiomatic and well-supported.

**Sort clause design**:
```sql
ORDER BY
  CASE WHEN stage = 'ready_for_review' AND stage_entered_at < NOW() - INTERVAL '18 hours'
       THEN 0 ELSE 1 END,
  CASE stage
    WHEN 'voice_memo_received' THEN 1
    WHEN 'processing'          THEN 2
    WHEN 'ready_for_review'    THEN 3
    WHEN 'sent'                THEN 4
    WHEN 'signed'              THEN 5
  END,
  stage_entered_at ASC
```

**Alternatives considered**:
- Client-side sort after fetch: Rejected — introduces a flash of unsorted content and duplicates sort logic in both SQL and JS.
- Materialized view with pre-computed urgency score: Rejected — overkill for a single-user tool with at most a few dozen active proposals.

---

## 2. Pipeline Stage Representation

**Decision**: PostgreSQL `TEXT` column with a `CHECK` constraint (not a custom ENUM type).

**Rationale**: Supabase's TypeScript codegen handles `TEXT` columns cleanly and produces a `string` type that can be narrowed with a union. Custom ENUM types in PostgreSQL require an `ALTER TYPE` migration to add new values and cannot be removed from values in use, making schema evolution harder. A `CHECK` constraint on a `TEXT` column provides the same validation with simpler migration semantics. A TypeScript union type `ProposalStage` enforces the constraint at the application layer.

**Stage values** (ordered): `voice_memo_received` | `processing` | `ready_for_review` | `sent` | `signed`

**Alternatives considered**:
- PostgreSQL ENUM: Rejected — adding/removing values requires DDL migrations that are difficult to reverse.
- Integer ordinal: Rejected — loses semantic meaning in the database; queries become opaque.

---

## 3. Render Required: Derived Column vs Application Logic

**Decision**: PostgreSQL `GENERATED ALWAYS AS` stored computed column.

```sql
render_required boolean GENERATED ALWAYS AS (estimated_value > 30000) STORED
```

**Rationale**: The $30k threshold is a business rule that should live close to the data. A generated column means RLS policies, queries, and any future integrations can filter on `render_required` directly without repeating the threshold. It is also always consistent — there is no way for `estimated_value` to change without `render_required` updating atomically.

**Alternatives considered**:
- Application-layer derivation only: Rejected — the rule would need to be duplicated in every query, API route, and any future consumer.
- Trigger-maintained boolean: Rejected — generated columns are cleaner and less error-prone than triggers for simple derived values.

---

## 4. Needs Attention Flag Lifecycle

**Decision**: Single `needs_attention boolean` column. The CEO dismissal sets it to `false`. The upstream pipeline re-flagging sets it back to `true`. No separate dismissed-at timestamp needed for v1.

**Rationale**: The spec says the flag should reappear if the upstream re-flags it. A single boolean is the simplest model that supports this: upstream writes `true`, CEO dismissal writes `false`. The upstream can overwrite `false` → `true` at any time. No audit trail is required for v1.

**API implication**: The `PATCH /dismiss-attention` route sets `needs_attention = false`. The upstream pipeline (out of scope for this feature) writes `needs_attention = true` directly via service role key or its own API route.

**Alternatives considered**:
- Separate `needs_attention_dismissed_at` timestamp: Rejected — adds complexity for no benefit; the upstream re-flag behavior is better modelled as simply overwriting the boolean.
- Soft-delete style (dismissed flag + dismissed_at): Rejected — v1 does not need dismissal audit history.

---

## 5. Red Tint: Client-side Calculation

**Decision**: The red tint is computed client-side by comparing the `stage_entered_at` timestamp (returned from the query) against `Date.now()` at render time.

**Rationale**: Since the queue uses manual refresh (no real-time subscription), the tint state is only evaluated on page load. The `stage_entered_at` value is already in the response. Client-side comparison of two timestamps is trivial and avoids any server-side computed field for a purely presentational concern.

**Implementation**: A utility function `isOverdueReview(proposal)` returns `true` when `stage === 'ready_for_review' && Date.now() - new Date(stage_entered_at).getTime() > 18 * 60 * 60 * 1000`. Applied as a Tailwind class on the row element.

**Alternatives considered**:
- SQL computed column for tint flag: Rejected — it's a presentational concern, and the threshold crossing time changes continuously; a stored column would be stale unless recomputed on every query, which is equivalent to doing it client-side.

---

## 6. Data Fetching Pattern: Server Component

**Decision**: The queue page (`/app/proposals/page.tsx`) is a Next.js Server Component. It fetches proposals server-side using `createSSRSassClient()` with `supabase.auth.getUser()` for auth verification. The result is passed as props to client components for interactivity.

**Rationale**: The constitution requires server-side auth verification via `getUser()`. Server Components satisfy this natively. The manual-refresh model means there is no need for client-side reactivity on the data fetch itself. Mutations (designer notification, flag dismissal) are handled by dedicated API routes with optimistic client-side updates.

**Pattern**:
```
page.tsx (Server Component)
  → createSSRSassClient() + getUser() → redirect if not authenticated
  → fetchProposals(userId) → sorted proposal list
  → <ProposalQueue proposals={proposals} /> (Client Component, "use client")
    → <ProposalRow /> per proposal
      → <DesignerNotifyDialog /> inline action
      → dismiss button → PATCH /api/app/proposals/[id]/dismiss-attention
```

**Alternatives considered**:
- Full SPA client (matching existing table page): Rejected — violates constitution's server-side auth requirement; the existing table page's approach is a known gap.
- React Query / SWR: Rejected — adds a dependency for a manual-refresh feature that doesn't need cache invalidation or background refetching.

---

## 7. Inline Mutation: API Routes

**Decision**: Two Next.js API route handlers under `src/app/api/app/proposals/[id]/`:
- `PATCH designer/route.ts` — sets `designer_notified = true`, `designer_notified_at = now()`, `designer_eta = <input>`
- `PATCH dismiss-attention/route.ts` — sets `needs_attention = false`

Both routes verify auth server-side via `createSSRSassClient()` and `getUser()`. RLS ensures users can only update their own proposals.

**Rationale**: API routes keep mutations out of Server Actions (which are less explicit about HTTP semantics) and provide a clear, testable boundary. They follow the constitution's input validation requirement at the API boundary.

**Alternatives considered**:
- Server Actions: Considered — would reduce boilerplate, but the explicit `PATCH` semantics and testability of API routes are preferable for a business-logic mutation.
- Client direct Supabase mutation: Rejected — bypasses the API boundary validation gate required by the constitution.

---

## 8. RLS Policy Design

**Decision**: Owner-scoped RLS on the `proposals` table. Three policies: SELECT (owner = auth.uid()), INSERT (owner must equal auth.uid()), UPDATE (owner = auth.uid()). No DELETE policy — proposals are archived via `archived_at` timestamp, not deleted.

**Rationale**: The CEO is the sole user in v1; owner-scoped RLS is both sufficient and correct. No DELETE is intentional — it prevents accidental permanent data loss and aligns with the "archive not delete" pattern.

**Alternatives considered**:
- Role-based policy (e.g., a `ceo` role): Rejected — unnecessary complexity for a single-user tool in v1.
- No RLS (open table): Rejected — constitution explicitly forbids this.

---

## 9. TypeScript Type Strategy

**Decision**: Extend `src/lib/types.ts` with the Supabase-generated types for `proposals` when the migration runs. Define a `ProposalStage` union type and a `ProposalRow` convenience type in a new `src/lib/proposals.ts` module.

**Rationale**: The existing `Database` type in `types.ts` is the source of truth for DB shapes. Derived types (e.g., `ProposalRow = Database['public']['Tables']['proposals']['Row']`) keep components type-safe without duplication.

---

## Summary of All Decisions

| Topic | Decision |
|-------|----------|
| Sort | PostgreSQL ORDER BY with CASE expressions |
| Stage storage | TEXT + CHECK constraint + TypeScript union |
| Render required | Generated column `estimated_value > 30000` |
| Needs attention lifecycle | Single boolean; upstream writes true, CEO dismissal writes false |
| Red tint | Client-side timestamp comparison at render |
| Data fetching | Server Component + createSSRSassClient + getUser |
| Mutations | API routes (PATCH) with server-side auth |
| RLS | Owner-scoped SELECT/INSERT/UPDATE; no DELETE |
| Types | Supabase-generated + narrow convenience types |
