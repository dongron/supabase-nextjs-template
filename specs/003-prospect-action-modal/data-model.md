# Data Model: Prospect Action Modal

**Feature**: 003-prospect-action-modal
**Date**: 2026-05-04

---

## Schema Change: `proposals` table

### New Column

| Column | Type | Nullable | Default | Constraint |
|--------|------|----------|---------|------------|
| `voice_memo` | `text` | YES | `NULL` | none |

**Rationale**: Free-form text, unbounded length (Postgres `text`). Nullable because a prospect may have no memo. No version history required per spec.

### Migration

**File**: `supabase/migrations/20260504130000_add_voice_memo.sql`

```sql
-- Add voice memo field to proposals
-- Stores transcribed voice notes entered manually by staff.
-- Nullable: a prospect may have no memo.

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS voice_memo text;
```

No new RLS policy is required. The existing `proposals_update_own` policy (`FOR UPDATE ... USING (owner = auth.uid())`) covers the `PATCH` operation that saves the memo.

---

## TypeScript Type Updates

**File**: `nextjs/src/lib/types.ts`

Add `voice_memo` to the `proposals` table type definition:

### `proposals.Row` (append)

```typescript
voice_memo: string | null
```

### `proposals.Update` (append)

```typescript
voice_memo?: string | null
```

`proposals.Insert` does not need `voice_memo` — new prospects are created without a memo; the field defaults to `NULL`.

---

## State Transitions

No new stage transitions. `voice_memo` is independent of the `stage` state machine.

---

## Entity Relationships

No new relationships. `voice_memo` is a scalar field on the existing `proposals` table.

```
proposals (existing)
  ├── id             uuid PK
  ├── owner          uuid FK → auth.users
  ├── customer_name  text
  ├── stage          text
  ├── ...            (existing fields)
  └── voice_memo     text NULL  ← NEW
```

---

## Validation Rules

| Layer | Rule |
|-------|------|
| API (PATCH handler) | `voice_memo` must be `string` or `null`; any other type returns 400 |
| DB | No constraint — `text` accepts any length; no `NOT NULL` |
| UI | No max-length enforced in the textarea (backend is the limit) |
