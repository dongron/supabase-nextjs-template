# Data Model: Proposal Pipeline Queue

**Phase**: 1 — Design  
**Branch**: `001-proposal-pipeline-queue`  
**Date**: 2026-05-04

---

## Entities

### 1. Proposal

The central entity. One row per client engagement in the pipeline.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Surrogate key |
| `created_at` | `timestamptz` | NOT NULL, `DEFAULT now()` | Record creation time |
| `customer_name` | `text` | NOT NULL | Full client name (e.g., "James Harrington") |
| `neighborhood` | `text` | NOT NULL | Area/neighborhood identifier (e.g., "River Oaks", "Tanglewood") |
| `walk_date` | `date` | NULLABLE | Scheduled on-site walkthrough date; NULL = not yet scheduled |
| `estimated_value` | `numeric(12,2)` | NOT NULL, `DEFAULT 0`, `CHECK >= 0` | Estimated project value in USD |
| `stage` | `text` | NOT NULL, `DEFAULT 'voice_memo_received'`, CHECK constraint | Current pipeline stage |
| `stage_entered_at` | `timestamptz` | NOT NULL, `DEFAULT now()` | Timestamp when the proposal entered the current stage |
| `render_required` | `boolean` | GENERATED ALWAYS AS `(estimated_value > 30000) STORED` | Derived: true when value exceeds $30,000 |
| `designer_notified` | `boolean` | NOT NULL, `DEFAULT false` | Whether The Designer has been notified for this proposal |
| `designer_notified_at` | `timestamptz` | NULLABLE | When The Designer was notified |
| `designer_eta` | `timestamptz` | NULLABLE | Designer's estimated render delivery time |
| `render_delivered` | `boolean` | NOT NULL, `DEFAULT false` | Whether the render has been delivered |
| `needs_attention` | `boolean` | NOT NULL, `DEFAULT false` | Upstream-set flag for low-confidence line items |
| `owner` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Owning user (the CEO) |
| `archived_at` | `timestamptz` | NULLABLE | Set when proposal is archived; NULL = active |

**Stage CHECK constraint**:
```sql
CHECK (stage IN (
  'voice_memo_received',
  'processing',
  'ready_for_review',
  'sent',
  'signed'
))
```

---

## Derived Values (Application Layer)

These are not stored columns — they are computed at query time or render time.

| Value | Derivation | Where computed |
|-------|-----------|----------------|
| `is_overdue_review` | `stage = 'ready_for_review' AND NOW() - stage_entered_at > interval '18 hours'` | SQL ORDER BY + client-side for row tint |
| `is_render_overdue` | `render_required AND designer_notified AND designer_eta IS NOT NULL AND designer_eta < NOW() AND NOT render_delivered` | Client-side at render |
| `show_needs_attention` | `needs_attention = true` | Direct column read |

---

## Indexes

```sql
CREATE INDEX proposals_owner_stage_idx ON proposals (owner, stage);
CREATE INDEX proposals_stage_entered_at_idx ON proposals (stage_entered_at);
```

**Rationale**: The primary query filters by `owner` and sorts by `stage` + `stage_entered_at`. A composite index on `(owner, stage)` covers the filter. A separate index on `stage_entered_at` supports the ORDER BY efficiently.

---

## Row Level Security

```sql
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Read own proposals only
CREATE POLICY "proposals_select_own"
  ON proposals FOR SELECT TO authenticated
  USING (auth.uid() = owner);

-- Insert own proposals only
CREATE POLICY "proposals_insert_own"
  ON proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner);

-- Update own proposals only
CREATE POLICY "proposals_update_own"
  ON proposals FOR UPDATE TO authenticated
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);

-- No DELETE policy — proposals are archived, not deleted
```

---

## Migration File

**Target path**: `supabase/migrations/YYYYMMDDHHMMSS_proposals.sql`

```sql
-- Create proposals table for the CEO proposal pipeline queue

CREATE TABLE "public"."proposals" (
    "id"                    uuid            NOT NULL DEFAULT gen_random_uuid(),
    "created_at"            timestamptz     NOT NULL DEFAULT now(),
    "customer_name"         text            NOT NULL,
    "neighborhood"          text            NOT NULL,
    "walk_date"             date,
    "estimated_value"       numeric(12,2)   NOT NULL DEFAULT 0
                                            CHECK (estimated_value >= 0),
    "stage"                 text            NOT NULL DEFAULT 'voice_memo_received'
                                            CHECK (stage IN (
                                              'voice_memo_received',
                                              'processing',
                                              'ready_for_review',
                                              'sent',
                                              'signed'
                                            )),
    "stage_entered_at"      timestamptz     NOT NULL DEFAULT now(),
    "render_required"       boolean         GENERATED ALWAYS AS (estimated_value > 30000) STORED,
    "designer_notified"     boolean         NOT NULL DEFAULT false,
    "designer_notified_at"  timestamptz,
    "designer_eta"          timestamptz,
    "render_delivered"      boolean         NOT NULL DEFAULT false,
    "needs_attention"       boolean         NOT NULL DEFAULT false,
    "owner"                 uuid            NOT NULL,
    "archived_at"           timestamptz
);

ALTER TABLE "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."proposals"
    ADD CONSTRAINT "proposals_owner_fkey"
    FOREIGN KEY ("owner") REFERENCES auth.users(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX proposals_owner_stage_idx ON public.proposals (owner, stage);
CREATE INDEX proposals_stage_entered_at_idx ON public.proposals (stage_entered_at);

ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_own"
    ON public.proposals FOR SELECT TO authenticated
    USING (auth.uid() = owner);

CREATE POLICY "proposals_insert_own"
    ON public.proposals FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner);

CREATE POLICY "proposals_update_own"
    ON public.proposals FOR UPDATE TO authenticated
    USING (auth.uid() = owner)
    WITH CHECK (auth.uid() = owner);
```

---

## TypeScript Types

**Location**: `nextjs/src/lib/proposals.ts` (new module)

```typescript
import type { Database } from '@/lib/types';

export type ProposalStage =
  | 'voice_memo_received'
  | 'processing'
  | 'ready_for_review'
  | 'sent'
  | 'signed';

export type ProposalRow =
  Database['public']['Tables']['proposals']['Row'];

export type ProposalInsert =
  Database['public']['Tables']['proposals']['Insert'];

export type ProposalUpdate =
  Database['public']['Tables']['proposals']['Update'];

/** Stage display labels for rendering */
export const STAGE_LABELS: Record<ProposalStage, string> = {
  voice_memo_received: 'Voice memo received',
  processing: 'Processing',
  ready_for_review: 'Ready for review',
  sent: 'Sent',
  signed: 'Signed',
};

/** Stage sort order (lower = more urgent) */
export const STAGE_ORDER: Record<ProposalStage, number> = {
  voice_memo_received: 1,
  processing: 2,
  ready_for_review: 3,
  sent: 4,
  signed: 5,
};

export const REVIEW_OVERDUE_MS = 18 * 60 * 60 * 1000; // 18 hours
export const RENDER_THRESHOLD = 30_000; // $30,000 (exclusive)

export function isOverdueReview(proposal: ProposalRow): boolean {
  if (proposal.stage !== 'ready_for_review') return false;
  return Date.now() - new Date(proposal.stage_entered_at).getTime() > REVIEW_OVERDUE_MS;
}

export function isRenderEtaOverdue(proposal: ProposalRow): boolean {
  if (!proposal.render_required) return false;
  if (!proposal.designer_notified) return false;
  if (!proposal.designer_eta) return false;
  if (proposal.render_delivered) return false;
  return new Date(proposal.designer_eta).getTime() < Date.now();
}
```

---

## Relationships

```
auth.users (Supabase managed)
    │
    │ 1 : many (owner FK)
    ▼
proposals
    - Each proposal belongs to one owner (CEO user)
    - No foreign keys to other application tables in v1
    - archived_at NULL = active; archived_at NOT NULL = archived (soft delete)
```

---

## State Transitions

```
voice_memo_received → processing → ready_for_review → sent → signed
        ↑                                                        │
        └──────────────── (no backwards transitions in v1) ─────┘
```

Stage transitions are performed in the proposal management area (separate from the queue view). The queue view only reads `stage` and `stage_entered_at`. When a stage changes, `stage_entered_at` MUST be updated to `now()` at the same time to reset the time-in-stage clock.
