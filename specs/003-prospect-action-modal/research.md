# Research: Prospect Action Modal

**Feature**: 003-prospect-action-modal
**Date**: 2026-05-04

---

## 1. Memo PATCH API — route placement

**Decision**: Add `PATCH /api/app/proposals/[id]/memo` as a new sub-route file at `nextjs/src/app/api/app/proposals/[id]/memo/route.ts`.

**Rationale**: The existing `[id]/route.ts` only handles `DELETE`. Sub-route files (`dismiss-attention/route.ts`, `services/route.ts`) are the established pattern in this codebase for per-resource operations that are logically distinct from the base resource CRUD. A dedicated `/memo` sub-route keeps the handler small, focused, and consistent.

**Alternatives considered**:
- Adding PATCH to `[id]/route.ts`: Rejected — conflates deletion and partial updates in one file; harder to test independently.
- Using the `services` PATCH endpoint: Rejected — wrong domain; services handles prospect-service pricing, not the memo field.

---

## 2. Memo column — DB migration timestamp

**Decision**: Use timestamp `20260504130000` for the migration filename: `20260504130000_add_voice_memo.sql`.

**Rationale**: All existing migrations use the `YYYYMMDDHHMMSS` format and are dated `20260504`. Using `130000` (13:00:00) places this migration after the existing `120001` migration and avoids any ordering conflict.

**Alternatives considered**: Using a future timestamp — unnecessary; sequential ordering within the same date is sufficient.

---

## 3. Dialog open/close state management

**Decision**: Manage `open` state for the modal in `ProposalRowComponent` (local state). Pass `onDelete` and `onMemoUpdate` callbacks down from `ProposalsView`.

**Rationale**: The modal is tightly coupled to each row. Using local state in the row component avoids lifting state to `ProposalsView` and keeps the modal self-contained. `ProposalsView` already passes `onDelete` — the same pattern extends naturally to `onMemoUpdate` to sync the in-memory list without a full page reload.

**Alternatives considered**:
- Global modal state in `ProposalsView`: Rejected — more complex, requires storing "selected proposal" in parent state.
- Separate `ProspectActionModal` trigger component: Considered but the row already owns all the needed proposal data and callbacks.

---

## 4. Voice memo field — optimistic update vs. server-confirmed

**Decision**: No optimistic update. Show a saving spinner on the button; only update the in-memory `voice_memo` value after a successful server response.

**Rationale**: Voice memos are low-frequency writes. The complexity of rolling back an optimistic update on failure outweighs the marginal UX improvement. The constitution mandates visible loading states, which covers this case.

**Alternatives considered**: Optimistic update with rollback on error — rejected as over-engineering for a low-frequency operation.

---

## 5. `ProposalRow` type extension — `voice_memo`

**Decision**: Update `nextjs/src/lib/types.ts` manually to add `voice_memo: string | null` to `proposals.Row` and `voice_memo?: string | null` to `proposals.Update`. Do NOT regenerate types from Supabase CLI (Supabase is not running locally during planning).

**Rationale**: The project's `types.ts` is a manually maintained file (not a generated output that would be overwritten). Updating it manually keeps types in sync with the migration without requiring a running Supabase instance.

**Alternatives considered**: Running `supabase gen types` — requires the local Supabase stack to be running with the migration applied; deferred to the implementer.

---

## 6. Confirmation dialog for "Delete Prospect"

**Decision**: Use `window.confirm()` (native browser dialog) — explicitly confirmed in clarification Q3.

**Rationale**: Consistent with the existing `ProposalRow` delete implementation. Avoids adding a new AlertDialog component or an additional UI state layer.

---

## 7. "Services" button navigation pattern

**Decision**: Render a Next.js `<Link>` styled as a button (using the `Button` component's `asChild` prop with Radix `Slot`) pointing to `/app/proposals/[id]/services`.

**Rationale**: The existing "Services" link in `ProposalRow` uses `<Link>` from `next/link`. Moving it into the modal should preserve the same navigation semantics (client-side navigation). Using `Button asChild` with `Link` is the established shadcn/ui pattern for styled link buttons.

---

## Summary of Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Memo API route | `PATCH /api/app/proposals/[id]/memo/route.ts` — new sub-route |
| 2 | Migration timestamp | `20260504130000_add_voice_memo.sql` |
| 3 | Modal state | Local `useState` in `ProposalRowComponent`; callbacks from `ProposalsView` |
| 4 | Memo save UX | No optimistic update; server-confirmed with loading spinner |
| 5 | Type update | Manual edit to `types.ts`; no CLI regeneration required |
| 6 | Delete confirm | Native `window.confirm()` |
| 7 | Services button | `Button asChild` + `next/link` `Link` |
