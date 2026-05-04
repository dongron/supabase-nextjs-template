# Tasks: Proposal Pipeline Queue

**Input**: Design documents from `specs/001-proposal-pipeline-queue/`
**Branch**: `001-proposal-pipeline-queue`
**Date**: 2026-05-04
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md) | **Contracts**: [contracts/api.md](contracts/api.md)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no pending dependencies in phase)
- **[USn]**: User story this task belongs to
- No story label = Setup, Foundational, or Polish phase task
- All descriptions include exact file paths

---

## Phase 1: Setup

**Purpose**: Create the database migration file — the single artifact that gates everything else.

- [ ] T001 Write proposals migration SQL in `supabase/migrations/$(date +%Y%m%d%H%M%S)_proposals.sql` using the full DDL from data-model.md (table, PK, FK, CHECK constraint, generated column, indexes, RLS enable, three RLS policies — no DELETE policy)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Apply schema to local DB, regenerate types, and build the shared library modules that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Apply migration locally by running `supabase db reset` from repo root, then regenerate TypeScript types with `supabase gen types typescript --local > nextjs/src/lib/types.ts` and verify `proposals` appears under `Database['public']['Tables']`
- [ ] T003 Create `nextjs/src/lib/proposals.ts` exporting: `ProposalStage` union type, `ProposalRow` / `ProposalInsert` / `ProposalUpdate` (from `Database` type), `STAGE_LABELS`, `STAGE_ORDER`, `REVIEW_OVERDUE_MS` (18h in ms), `RENDER_THRESHOLD` (30000), `isOverdueReview(proposal)`, `isRenderEtaOverdue(proposal)`, and `sortProposals(proposals)` client-side sort that matches the SQL urgency order from contracts/api.md
- [ ] T004 Create `nextjs/src/lib/supabase/proposals.ts` exporting `fetchProposalQueue(client: SassClient, userId: string): Promise<ProposalRow[]>` — query `proposals` filtering `archived_at IS NULL` and `owner = userId`, select all columns, then return `sortProposals(data)` (client-side sort because Supabase JS `.order()` does not support CASE expressions)

**Checkpoint**: Types are generated, utilities compile, fetch function is ready — user story implementation can begin.

---

## Phase 3: User Story 1 — CEO Scans the Pipeline (Priority: P1) 🎯 MVP

**Goal**: Display all active proposals in urgency order with all required fields visible in a single queue view — zero clicks to see pipeline state.

**Independent Test**: Seed 3 proposals in different stages; open `/app/proposals`; confirm each row shows customer name, neighborhood, walk date ("Not scheduled" if null), formatted dollar value, stage label, and time elapsed since `stage_entered_at`. Confirm sort order matches urgency (voice memo received at top, signed at bottom). Confirm empty state message renders when no proposals exist.

- [ ] T005 [P] [US1] Create `nextjs/src/components/proposals/ProposalRow.tsx` as a `'use client'` component that accepts a `ProposalRow` prop and renders: customer name, neighborhood, walk date (or "Not scheduled"), estimated value formatted as USD, `STAGE_LABELS[stage]`, and a human-readable elapsed time since `stage_entered_at` (e.g., "2h 14m ago") — no tint, badge, or action logic yet
- [ ] T006 [P] [US1] Add a Proposals nav entry `{ name: 'Proposals', href: '/app/proposals', icon: ClipboardList }` to the navigation array in `nextjs/src/components/AppLayout.tsx`, importing `ClipboardList` from `lucide-react`
- [ ] T007 [US1] Create `nextjs/src/components/proposals/ProposalQueue.tsx` as a `'use client'` component that accepts `proposals: ProposalRow[]` and either renders a `<table>` of `ProposalRow` components (one per proposal) or an empty state message ("No active proposals") when the array is empty
- [ ] T008 [US1] Create `nextjs/src/app/app/proposals/page.tsx` as an `async` Server Component: call `createSSRSassClient()`, verify user with `.auth.getUser()` (redirect to `/auth/login` if null), call `fetchProposalQueue(client, user.id)`, and render `<ProposalQueue proposals={proposals} />`
- [ ] T009 [P] [US1] Add a seed SQL file at `supabase/seed.sql` (or append to existing) with 5 INSERT statements covering: one proposal per stage, two with `walk_date` set and two with NULL, one with `estimated_value` above 30000, one with `needs_attention = true`

**Checkpoint**: The queue page loads with real data, all fields display correctly, empty state works, nav entry appears in sidebar.

---

## Phase 3b: FR-011 — Inline Proposal Creation Form

**Goal**: Allow the CEO to create proposals directly from the queue page via a form below the list — so the queue is useful in production without manually seeding data.

**Independent Test**: Submit the creation form with a customer name, neighborhood, and value above $30k. Confirm the page reloads and the new proposal appears in the queue with the correct `render_required` badge. Submit with an empty customer name and confirm a validation error appears without navigating away.

- [ ] T020 [P] [FR-011] Create `nextjs/src/app/api/app/proposals/route.ts` POST handler: authenticate with `createSSRSassClient()` + `getUser()` (return 401 if unauthenticated); validate required body fields — `customer_name` (non-empty string), `neighborhood` (non-empty string), `estimated_value` (finite number ≥ 0), `stage` (one of the five valid `ProposalStage` values) — return 400 with an error message if any fail; insert into `proposals` with `owner = user.id`; return 201 with the created row
- [ ] T021 [FR-011] Create `nextjs/src/components/proposals/AddProposalForm.tsx` as a `'use client'` component: text input for `customer_name`, text input for `neighborhood`, date input for `walk_date` (optional), number input for `estimated_value`, select for `stage` populated from `STAGE_LABELS`; on submit POST to `/api/app/proposals`; on 201 call `router.refresh()` to reload Server Component data and reset the form; show a loading state (disabled submit button) during the request and an inline error message on failure (400 or network error)
- [ ] T022 [FR-011] In `nextjs/src/app/app/proposals/page.tsx`, render `<AddProposalForm />` below `<ProposalQueue proposals={proposals} />`

**Checkpoint**: CEO can create a proposal from the queue page; the queue immediately refreshes to show the new row.

---

## Phase 4: User Story 2 — CEO Spots Stalled "Ready for Review" Proposals (Priority: P1)

**Goal**: Rows in "Ready for review" past 18 hours display a subtle red background tint computed from `stage_entered_at` at render time — no server changes required.

**Independent Test**: Seed a proposal with `stage = 'ready_for_review'` and `stage_entered_at` set to 19 hours ago. Open the queue; confirm that row has a red tint. Seed another with `stage_entered_at` 2 hours ago; confirm it has no tint.

- [ ] T010 [US2] In `nextjs/src/components/proposals/ProposalRow.tsx`, import `isOverdueReview` from `@/lib/proposals` and apply a conditional Tailwind class to the row's root element (e.g., `bg-red-950/40 dark:bg-red-950/50`) when `isOverdueReview(proposal)` returns true; the class must not appear for non-overdue or non-"ready_for_review" rows

**Checkpoint**: Overdue rows are visually distinct from non-overdue rows; tint is evaluated client-side from the existing `stage_entered_at` value.

---

## Phase 5: User Story 3 — CEO Checks Render Requirement and Designer Status (Priority: P2)

**Goal**: Proposals above $30k show a render badge with designer notification status and ETA; the CEO can mark the designer as notified and enter an ETA inline without leaving the queue.

**Independent Test**: Seed a proposal with `estimated_value = 35000`, `designer_notified = false`. Confirm the "Render required" badge appears and shows "Designer not notified". Seed another with `designer_notified = true`, `designer_eta` set to a past timestamp, `render_delivered = false`. Confirm badge shows ETA as overdue. Click the notification control on the first proposal, enter a future ETA, submit — confirm designer fields update in the row without a page reload.

- [ ] T011 [P] [US3] Create `nextjs/src/components/proposals/DesignerNotifyDialog.tsx` as a `'use client'` component using Radix `Dialog` (already in shadcn/ui): accepts `proposalId: string`, `currentEta: string | null`, `onSuccess: (updated: Partial<ProposalRow>) => void`; renders a `<dialog>` trigger button, a `<input type="datetime-local">` for ETA, and a submit handler that calls `PATCH /api/app/proposals/{id}/designer` with `{ designer_eta: isoString }` and calls `onSuccess` on 200
- [ ] T012 [P] [US3] Create `nextjs/src/app/api/app/proposals/[id]/designer/route.ts` implementing the `PATCH` handler per contracts/api.md: authenticate with `createSSRSassClient()` + `getUser()` (return 401 if unauthenticated); parse and validate `designer_eta` from body (return 400 if missing/invalid); fetch proposal by id scoped to `owner = user.id` (return 404 if not found); return 422 if `render_required = false`; update `designer_notified = true`, `designer_notified_at = new Date().toISOString()`, `designer_eta`; return 200 with updated fields
- [ ] T013 [US3] In `nextjs/src/components/proposals/ProposalRow.tsx`, add a render badge section: when `render_required` is true, display a badge showing (a) "Designer not notified" with an action trigger for `DesignerNotifyDialog` when `designer_notified = false`, (b) the formatted ETA with a normal style when `designer_notified = true` and ETA is in the future or `render_delivered = true`, or (c) the ETA with an overdue indicator style when `isRenderEtaOverdue(proposal)` returns true; when `render_required` is false, render nothing in this section
- [ ] T014 [US3] In `nextjs/src/components/proposals/ProposalRow.tsx`, add local `useState` for `designerState` (mirroring `designer_notified`, `designer_notified_at`, `designer_eta`, `render_delivered`) initialized from props; pass `onSuccess` to `DesignerNotifyDialog` that merges the API response into `designerState` for an optimistic update without a page reload

**Checkpoint**: Render badge appears only on proposals above $30k; notification dialog opens inline; submitting the dialog updates the row immediately; overdue ETA is visually flagged.

---

## Phase 6: User Story 4 — CEO Identifies Proposals Needing Attention (Priority: P3)

**Goal**: Proposals with `needs_attention = true` display a flag; the CEO can dismiss it inline from the queue row.

**Independent Test**: Seed a proposal with `needs_attention = true`. Confirm the flag badge appears on that row only. Click dismiss; confirm the badge disappears immediately (optimistic update) and that a subsequent page reload confirms `needs_attention = false` in the DB.

- [ ] T015 [P] [US4] Create `nextjs/src/app/api/app/proposals/[id]/dismiss-attention/route.ts` implementing the `PATCH` handler per contracts/api.md: authenticate with `createSSRSassClient()` + `getUser()` (return 401 if unauthenticated); `UPDATE proposals SET needs_attention = false WHERE id = $1 AND owner = auth.uid()`; if 0 rows updated, return 404; return 200 with `{ id, needs_attention: false }`
- [ ] T016 [US4] In `nextjs/src/components/proposals/ProposalRow.tsx`, add a "Needs attention" badge visible only when `needs_attention` is true; add a dismiss button next to the badge that calls `PATCH /api/app/proposals/{id}/dismiss-attention`, applies an optimistic update (hide badge immediately via local state), and handles errors (restore badge if the call fails)

**Checkpoint**: Attention flag appears only on flagged proposals; dismiss button removes the flag immediately; page reload confirms the DB state.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify quality gates, run the full manual scenario, confirm constitution compliance.

- [ ] T017 [P] Run TypeScript strict-mode check across all new files: `pnpm --filter nextjs tsc --noEmit` — fix any `any` usage, missing return types, or type errors
- [ ] T018 [P] Run ESLint across all new files: `pnpm --filter nextjs lint` — fix all reported issues
- [ ] T019 Run the full quickstart.md validation: apply migration, seed data, open `/app/proposals`, verify all four user story acceptance scenarios manually (empty state, base fields + sort order, red tint, render badge + designer dialog, needs-attention badge + dismiss)
- [ ] T023 [P] Write unit tests for the three utility functions in `nextjs/src/lib/proposals.test.ts` (Vitest): (a) `isOverdueReview` — assert `true` when `stage = 'ready_for_review'` and `stage_entered_at` is > 18h ago; assert `false` for other stages and for < 18h elapsed; assert `false` at exactly 18h; (b) `isRenderEtaOverdue` — assert `true` when ETA is in the past, `designer_notified = true`, and `render_delivered = false`; assert `false` for each variation; (c) `sortProposals` — assert overdue review rows sort first, then by `STAGE_ORDER`, then by `stage_entered_at` ascending
- [ ] T024 Write integration tests for the three API routes in `nextjs/src/app/api/app/proposals/__tests__/`: `POST /api/app/proposals` (201 with valid body; 400 on missing `customer_name`; 401 without auth); `PATCH /api/app/proposals/[id]/designer` (200 on valid; 422 when `render_required = false`; 404 when proposal belongs to a different owner); `PATCH /api/app/proposals/[id]/dismiss-attention` (200 on valid; 404 when proposal belongs to a different owner); include one RLS verification per route confirming the authenticated user cannot access another user's rows

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational)  ← BLOCKS all user stories
        ├─→ Phase 3 (US1 — P1)  ← MVP
        │     └─→ Phase 4 (US2 — P1)  ← extends ProposalRow from US1
        │           └─→ Phase 5 (US3 — P2)  ← extends ProposalRow from US2
        │                 └─→ Phase 6 (US4 — P3)  ← extends ProposalRow from US3
        └─→ Phase 7 (Polish)  ← after all desired stories complete
```

### User Story Dependencies

| Story | Depends On | Reason |
|-------|-----------|--------|
| US1 (P1) | Phase 2 complete | Needs types, fetch function |
| US2 (P1) | US1 complete | Extends `ProposalRow.tsx` from US1 |
| US3 (P2) | US1 complete | Extends `ProposalRow.tsx`; dialog and route are independent of US2 |
| US4 (P3) | US1 complete | Extends `ProposalRow.tsx`; route is independent |

> US2, US3, US4 all modify `ProposalRow.tsx` — they are sequential when done by one person, but their route handlers and sub-components (T011, T012, T015) can be developed in parallel.

### Within Each User Story

- Shared library tasks (T003, T004) before page/component tasks
- Route handler before wiring it into the component
- Core component before optimistic-update layer

### Parallel Opportunities Per Phase

**Phase 2**: T003 and T004 are sequential; no parallelism in this phase.

**Phase 3 (US1)**:
```
T005 (ProposalRow base) ──┐
T006 (Nav entry)          ├─→ T007 (ProposalQueue) → T008 (Page)
T009 (Seed data)  ────────┘ (independent, anytime)
```

**Phase 5 (US3)**:
```
T011 (DesignerNotifyDialog) ──┐
T012 (designer route)         ├─→ T013 (badge in ProposalRow) → T014 (wire dialog)
```

**Phase 7 (Polish)**:
```
T017 (TypeScript check) ──┐
T018 (ESLint check)       ├─→ T019 (manual validation)
```

---

## Implementation Strategy

**Suggested MVP scope**: Complete Phase 1 + Phase 2 + Phase 3 (US1) — the queue page with sorted data and all base fields. This delivers the daily-use core value immediately and is independently testable.

**Incremental delivery order**:
1. MVP: T001 → T002 → T003 → T004 → T005/T006 → T007 → T008 (US1 queue visible)
2. Add T010 (red tint — US2, still P1 priority)
3. Add T011/T012 → T013 → T014 (render badge + designer dialog — US3)
4. Add T015 → T016 (needs attention dismiss — US4)
5. Polish: T017/T018 → T019

**Total tasks**: 24
**Tasks per user story**: US1 = 5, US2 = 1, US3 = 4, US4 = 2, FR-011 = 3
**Setup + Foundational**: 4 tasks | **Tests (constitution)**: 2 tasks | **Polish**: 3 tasks
