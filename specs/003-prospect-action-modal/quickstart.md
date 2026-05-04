# Quickstart: Prospect Action Modal

**Feature**: 003-prospect-action-modal
**Date**: 2026-05-04

This guide describes how to implement the feature end-to-end. Follow the steps in order; each step references the relevant design artifact.

---

## Prerequisites

- Local Supabase stack running (`supabase start`)
- `nextjs/` dependencies installed (`pnpm install`)
- Tests passing on `main` (`pnpm --filter nextjs test`)

---

## Step 1 — Apply the database migration

Create and apply the migration that adds the `voice_memo` column.

**File**: `supabase/migrations/20260504130000_add_voice_memo.sql`

```sql
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS voice_memo text;
```

Apply locally:

```bash
supabase db reset   # or: supabase migration up
```

See [data-model.md](data-model.md) for the full schema change description.

---

## Step 2 — Update TypeScript types

In `nextjs/src/lib/types.ts`, add `voice_memo` to the `proposals` table definition:

- **`proposals.Row`**: add `voice_memo: string | null`
- **`proposals.Update`**: add `voice_memo?: string | null`

> Alternatively, run `supabase gen types typescript --local > nextjs/src/lib/types.ts` after applying the migration (requires the local stack to be running with the migration applied).

---

## Step 3 — Add the PATCH /memo API route

Create `nextjs/src/app/api/app/proposals/[id]/memo/route.ts`.

The handler must:
1. Authenticate the user with `createSSRSassClient` + `auth.getUser()`.
2. Parse the JSON body and validate `voice_memo` is `string | null`.
3. Run `UPDATE proposals SET voice_memo = ? WHERE id = ? AND owner = ?`.
4. Return `200 { voice_memo }` on success; `400`, `401`, `404`, or `500` on failure.

See [contracts/patch-memo.md](contracts/patch-memo.md) for the full API contract.

---

## Step 4 — Build the ProspectActionModal component

Create `nextjs/src/components/proposals/ProspectActionModal.tsx`.

The component must:
- Accept props: `proposal: ProposalRow`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onDelete: (id: string) => void`, `onMemoUpdate: (id: string, memo: string | null) => void`
- Use `Dialog` / `DialogContent` / `DialogHeader` from `@/components/ui/dialog`
- Render a `Textarea` (from `@/components/ui/textarea`) pre-populated with `proposal.voice_memo ?? ''`
- Render a "Save/Update Memo" `Button` that calls `PATCH /api/app/proposals/[id]/memo`
- Render a "Generate Quote" `Button` (variant `outline`, `onClick` is a no-op)
- Render a "Services" navigation control: `Button asChild` wrapping a Next.js `<Link href={/app/proposals/[id]/services}>` (variant `secondary`)
- Render a "Delete Prospect" `Button` (variant `destructive`) that:
  1. Calls `window.confirm()`
  2. On confirm: calls `DELETE /api/app/proposals/[id]` then `onDelete(proposal.id)` and `onOpenChange(false)`
- Show loading/error states for async actions (per constitution Principle III)

---

## Step 5 — Modify ProposalRow

In `nextjs/src/components/proposals/ProposalRow.tsx`:

1. Add local state: `const [modalOpen, setModalOpen] = useState(false)`
2. Add local state: `const [memo, setMemo] = useState<string | null>(proposal.voice_memo ?? null)`
3. Replace the existing `Services` link and `Remove` button in the Actions `<td>` with a single `<Button>` labeled "Actions" that sets `modalOpen = true`
4. Render `<ProspectActionModal>` below the `<tr>`, passing the required props. On `onMemoUpdate`, update the local `memo` state so re-opening the modal shows the latest value.
5. Remove the existing inline `handleDelete` function from the row — delete logic moves to the modal. The `onDelete` callback from `ProposalsView` is passed through to the modal unchanged.

---

## Step 6 — Update ProposalsView (if needed)

In `nextjs/src/components/proposals/ProposalsView.tsx`, add an `onMemoUpdate` handler that updates the `proposals` list state:

```typescript
function handleMemoUpdate(id: string, memo: string | null) {
  setProposals((prev) =>
    prev.map((p) => (p.id === id ? { ...p, voice_memo: memo } : p))
  );
}
```

Pass `onMemoUpdate={handleMemoUpdate}` to `ProposalQueue` → `ProposalRowComponent` → `ProspectActionModal`.

---

## Step 7 — Write tests

**Unit tests** (`nextjs/src/components/proposals/__tests__/ProspectActionModal.test.tsx`):
- Modal opens with pre-populated memo text
- "Save/Update Memo" button is disabled while saving
- Success: `onMemoUpdate` called with new memo value
- Error: error message shown, field retains value
- "Generate Quote" click: no side effects
- "Delete Prospect" with confirm = cancel: no deletion
- "Delete Prospect" with confirm = accept: `onDelete` called

**API route tests** (`nextjs/src/app/api/app/proposals/__tests__/memo.test.ts`):
- Valid body: 200 with saved memo
- `voice_memo: null`: 200, clears memo
- Invalid type: 400
- Unauthenticated: 401
- Unknown id / wrong owner: 404

---

## Step 8 — Verify

```bash
cd nextjs
pnpm lint          # must pass (no eslint errors)
pnpm type-check    # must pass (tsc --noEmit)
pnpm test          # all tests must pass
```

Manual smoke test:
1. Open the proposals list.
2. Click "Actions" on any row → modal opens.
3. Type a memo and click "Save/Update Memo" → success toast/confirmation shown.
4. Close and reopen modal → memo is pre-filled.
5. Click "Services" → navigates to correct services page.
6. Click "Delete Prospect" → confirm dialog appears; cancel leaves prospect intact; confirm removes from list.
7. Confirm no "Services" or "Remove" buttons remain in the list row.
