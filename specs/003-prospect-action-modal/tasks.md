# Tasks: Prospect Action Modal

**Input**: Design documents from `specs/003-prospect-action-modal/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/patch-memo.md ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Schema migration and type system — must land before any component or API work.

- [X] T001 Create migration `supabase/migrations/20260504130000_add_voice_memo.sql` adding `ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS voice_memo text;`
- [X] T002 Update `nextjs/src/lib/types.ts` — add `voice_memo: string | null` to `proposals.Row` and `voice_memo?: string | null` to `proposals.Update`

**Checkpoint**: DB column exists; TypeScript types compile cleanly with strict mode. All existing tests still pass.

---

## Phase 2: Foundational

**Purpose**: The new PATCH `/memo` API route is required by the `ProspectActionModal` component. It must exist before the modal can be tested end-to-end.

**⚠️ CRITICAL**: US1 modal implementation (Phase 3) depends on this phase being complete.

- [X] T003 Create `nextjs/src/app/api/app/proposals/[id]/memo/route.ts` — PATCH handler: authenticate with `createSSRSassClient` + `auth.getUser()`, validate `voice_memo` is `string | null` (return 400 otherwise), run `UPDATE proposals SET voice_memo = $1 WHERE id = $2 AND owner = $3`, return `200 { voice_memo }` on success or 401/404/500 on failure (see `specs/003-prospect-action-modal/contracts/patch-memo.md`)
- [X] T004 [P] Write API route unit tests in `nextjs/src/app/api/app/proposals/__tests__/memo.test.ts` covering: valid string body → 200, `null` body → 200 clears memo, invalid type → 400, unauthenticated → 401, unknown/wrong-owner id → 404

**Checkpoint**: `pnpm --filter nextjs test` passes including T004 tests; PATCH route returns correct status codes.

---

## Phase 3: User Story 1 — Save a Voice Memo (Priority: P1) 🎯 MVP

**Goal**: Staff can open the action modal, type a memo, save it, and confirm it persists on re-open.

**Independent Test**: Open modal for any prospect → type text → click "Save/Update Memo" → close → reopen → text is pre-filled.

### Implementation

- [X] T005 [US1] Create `nextjs/src/components/proposals/ProspectActionModal.tsx` — `'use client'` component accepting props `{ proposal: ProposalRow; open: boolean; onOpenChange: (open: boolean) => void; onDelete: (id: string) => void; onMemoUpdate: (id: string, memo: string | null) => void }`. Render `Dialog` / `DialogContent` / `DialogHeader` from `@/components/ui/dialog`, showing `proposal.customer_name` as title. Include `Textarea` (from `@/components/ui/textarea`) pre-populated with `proposal.voice_memo ?? ''`. Include "Save/Update Memo" `Button` that calls `PATCH /api/app/proposals/[id]/memo`, shows loading state while saving, shows inline error on failure, calls `onMemoUpdate` on success. Include "Generate Quote" `Button` (variant `outline`, `disabled` or no-op `onClick`). Include "Services" `Button` using `asChild` wrapping `<Link href={\`/app/proposals/${proposal.id}/services\`}>` (variant `secondary`). Include "Delete Prospect" `Button` (variant `destructive`) behind `window.confirm()` that calls `DELETE /api/app/proposals/[id]`, calls `onDelete` + `onOpenChange(false)` on success, shows inline error on failure.
- [X] T006 [US1] Modify `nextjs/src/components/proposals/ProposalRow.tsx` — add `useState<boolean>(false)` for `modalOpen`; add local `useState<string | null>` for `memo` initialised from `proposal.voice_memo ?? null`; replace the Actions `<td>` content (the `Services` link and `Remove` button) with a single `<Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>Actions</Button>`; remove the existing `handleDelete` function; render `<ProspectActionModal proposal={{ ...proposal, voice_memo: memo }} open={modalOpen} onOpenChange={setModalOpen} onDelete={onDelete} onMemoUpdate={(_, m) => setMemo(m)} />` after the closing `</tr>` (outside the `<tr>` element, wrapped in a Fragment)
- [X] T007 [US1] Modify `nextjs/src/components/proposals/ProposalsView.tsx` — add `handleMemoUpdate(id: string, memo: string | null)` that calls `setProposals(prev => prev.map(p => p.id === id ? { ...p, voice_memo: memo } : p))`; pass `onMemoUpdate={handleMemoUpdate}` through `ProposalQueue` → `ProposalRowComponent`
- [X] T008 [P] [US1] Update `nextjs/src/components/proposals/ProposalQueue.tsx` prop types — add `onMemoUpdate: (id: string, memo: string | null) => void` to `ProposalQueueProps` and thread it through to each `ProposalRowComponent`
- [X] T009 [P] [US1] Write component tests in `nextjs/src/components/proposals/__tests__/ProspectActionModal.test.tsx` covering: modal renders with pre-filled memo; "Save/Update Memo" button disabled while saving; success path calls `onMemoUpdate` with new value; error path shows error message and retains field; "Generate Quote" click has no side effects; closing without saving does not call `onMemoUpdate`

**Checkpoint**: US1 fully functional and independently testable. `pnpm --filter nextjs lint && pnpm --filter nextjs type-check && pnpm --filter nextjs test` all pass.

---

## Phase 4: User Story 2 — Services Access from Modal (Priority: P2)

**Goal**: "Services" link relocated from list row into modal; row no longer shows it.

**Independent Test**: Click "Actions" → click "Services" → navigates to correct services page. Confirm no "Services" link in the row itself.

### Implementation

- [X] T010 [US2] Verify `ProspectActionModal` (T005) includes the "Services" `Button asChild` + `Link` and confirm `ProposalRow` (T006) no longer renders a standalone `<Link>` to services — if T005/T006 are complete this phase is satisfied; add a note in the test file confirming the row regression

**Checkpoint**: US2 testable — "Services" is exclusively in the modal. No duplicate controls in the row.

---

## Phase 5: User Story 3 — Delete Prospect from Modal (Priority: P3)

**Goal**: "Delete Prospect" action relocated from list row into modal with `window.confirm()` gate.

**Independent Test**: Open modal → click "Delete Prospect" → cancel → prospect intact. Open modal → click "Delete Prospect" → confirm → prospect removed from list. Confirm no "Remove" button in the row.

### Implementation

- [X] T011 [US3] Verify `ProspectActionModal` (T005) includes the "Delete Prospect" destructive button with `window.confirm()`, calls `DELETE /api/app/proposals/[id]`, then `onDelete` + `onOpenChange(false)` on success; verify `ProposalRow` (T006) no longer renders any standalone delete/remove button
- [X] T012 [P] [US3] Extend component tests in `nextjs/src/components/proposals/__tests__/ProspectActionModal.test.tsx` — add: "Delete Prospect" cancel keeps prospect; "Delete Prospect" confirm calls `onDelete` and closes modal; delete failure shows error and modal stays open

**Checkpoint**: US3 testable — delete is exclusively in the modal; row has no remove button. All tests pass.

---

## Phase 6: User Story 4 — Generate Quote Placeholder (Priority: P4)

**Goal**: "Generate Quote" button visible in modal, does nothing when clicked.

**Independent Test**: Open modal → click "Generate Quote" → no navigation, no request, no error.

### Implementation

- [X] T013 [US4] Verify `ProspectActionModal` (T005) renders "Generate Quote" `Button` with no `onClick` handler (or explicit no-op); button must be visible and not disabled

**Checkpoint**: US4 satisfied — button present, no side effects.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Lint, type-check, accessibility, and final validation.

- [X] T014 [P] Run `pnpm --filter nextjs lint` and resolve any ESLint errors in new/modified files (`ProspectActionModal.tsx`, `ProposalRow.tsx`, `ProposalsView.tsx`, `ProposalQueue.tsx`, `memo/route.ts`)
- [X] T015 [P] Run `pnpm --filter nextjs type-check` (`tsc --noEmit`) and resolve all TypeScript errors; confirm no `any` usage in new code
- [X] T016 Verify ARIA accessibility: `DialogContent` from Radix has correct role; `Textarea` has an associated `<label>` or `aria-label`; all `Button` components have descriptive `aria-label` where the text alone is ambiguous
- [ ] T017 Manual smoke test per `specs/003-prospect-action-modal/quickstart.md` Step 8: open modal, save memo, verify persistence, test Services nav, test Delete with cancel and confirm

---

## Dependencies

```
T001 (migration)
  └── T002 (types) → T003 (API route) → T004 (API tests, parallel)
                   └── T005 (modal component)
                         └── T006 (ProposalRow) → T008 (ProposalQueue, parallel)
                               └── T007 (ProposalsView)
                                     └── T009 (modal tests, parallel)
T010 (US2 verification — depends on T005, T006)
T011 (US3 verification — depends on T005, T006) → T012 (US3 tests, parallel)
T013 (US4 verification — depends on T005)
T014, T015, T016, T017 — depend on all prior tasks
```

### Parallel Execution Opportunities

| Parallel Group | Tasks | Prerequisite |
|----------------|-------|--------------|
| Foundation | T001, T002 | — |
| API + types | T003, T004 | T001, T002 |
| Modal + Queue props | T005, T008 | T003 |
| Row + tests | T006, T009 | T005 |
| Polish | T014, T015 | T005–T013 |

---

## Implementation Strategy

**MVP scope** (US1 only — delivers the primary new capability):

T001 → T002 → T003 → T005 → T006 → T007 → T008

With US1 complete, the "Actions" button opens a modal that saves memos end-to-end.

**Full delivery order**: MVP → T004/T009 (tests) → T010 (US2) → T011/T012 (US3) → T013 (US4) → T014–T017 (polish)

---

## Summary

| Metric | Count |
|--------|-------|
| Total tasks | 17 |
| US1 (Save Memo) | 5 tasks (T005–T009) |
| US2 (Services in modal) | 1 task (T010) |
| US3 (Delete in modal) | 2 tasks (T011–T012) |
| US4 (Generate Quote placeholder) | 1 task (T013) |
| Foundation (migration, types, API) | 4 tasks (T001–T004) |
| Polish | 4 tasks (T014–T017) |
| Parallel opportunities | 7 pairs/groups |

**Format validation**: All 17 tasks follow `- [ ] T### [P?] [Story?] Description with file path` format. ✅
