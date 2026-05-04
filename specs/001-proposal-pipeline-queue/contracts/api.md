# API Contracts: Proposal Pipeline Queue

**Phase**: 1 — Design  
**Branch**: `001-proposal-pipeline-queue`  
**Date**: 2026-05-04

These are the HTTP contracts exposed by the Next.js API layer for the two inline mutation actions in the queue view. The read path is handled server-side in the Server Component and is not an HTTP endpoint.

---

## PATCH /api/app/proposals/[id]/designer

Mark The Designer as notified and record or update his ETA for a render-required proposal.

### Request

```
PATCH /api/app/proposals/{id}/designer
Content-Type: application/json
Authorization: session cookie (handled by Supabase SSR middleware)
```

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Proposal ID |

**Request body**

```json
{
  "designer_eta": "2026-05-05T14:00:00Z"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `designer_eta` | `string (ISO 8601)` | Yes | Must be a valid future datetime | Designer's estimated render delivery time |

### Response

**200 OK** — Designer notification recorded

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "designer_notified": true,
  "designer_notified_at": "2026-05-04T09:30:00Z",
  "designer_eta": "2026-05-05T14:00:00Z"
}
```

**400 Bad Request** — Missing or invalid `designer_eta`

```json
{ "error": "designer_eta is required and must be a valid ISO 8601 datetime" }
```

**401 Unauthorized** — Not authenticated

```json
{ "error": "Unauthorized" }
```

**403 Forbidden** — Proposal exists but belongs to a different user

```json
{ "error": "Forbidden" }
```

**404 Not Found** — No proposal found with this ID for the authenticated user

```json
{ "error": "Proposal not found" }
```

**422 Unprocessable Entity** — Proposal does not require a render (value ≤ $30,000)

```json
{ "error": "Render is not required for this proposal" }
```

### Behavior

1. Verify auth via `createSSRSassClient()` and `supabase.auth.getUser()`; return 401 if unauthenticated.
2. Parse and validate `designer_eta` from request body; return 400 if missing or unparseable.
3. Fetch the proposal by `id` scoped to the authenticated user's `owner`; return 404 if not found (RLS also enforces this).
4. Verify `render_required = true`; return 422 if false.
5. `UPDATE proposals SET designer_notified = true, designer_notified_at = now(), designer_eta = $1 WHERE id = $2 AND owner = auth.uid()`.
6. Return the updated fields.

---

## PATCH /api/app/proposals/[id]/dismiss-attention

Dismiss the "Needs attention" flag for a proposal after the CEO has reviewed the low-confidence line items.

### Request

```
PATCH /api/app/proposals/{id}/dismiss-attention
Authorization: session cookie (handled by Supabase SSR middleware)
```

**Path parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string (uuid)` | Yes | Proposal ID |

**Request body**: None

### Response

**200 OK** — Flag dismissed

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "needs_attention": false
}
```

**401 Unauthorized**

```json
{ "error": "Unauthorized" }
```

**404 Not Found**

```json
{ "error": "Proposal not found" }
```

### Behavior

1. Verify auth via `createSSRSassClient()` and `supabase.auth.getUser()`; return 401 if unauthenticated.
2. `UPDATE proposals SET needs_attention = false WHERE id = $1 AND owner = auth.uid()`.
3. If no rows were updated, return 404.
4. Return the updated fields.

---

## POST /api/app/proposals

Create a new proposal.

### Request

```
POST /api/app/proposals
Content-Type: application/json
Authorization: session cookie (handled by Supabase SSR middleware)
```

**Request body**

```json
{
  "customer_name": "James Harrington",
  "neighborhood": "River Oaks",
  "walk_date": "2026-05-10",
  "estimated_value": 45000,
  "stage": "voice_memo_received"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `customer_name` | `string` | Yes | Non-empty | Full client name |
| `neighborhood` | `string` | Yes | Non-empty | Area/neighborhood identifier |
| `walk_date` | `string (ISO 8601 date)` | No | YYYY-MM-DD | Scheduled walkthrough date; omit or null if not yet scheduled |
| `estimated_value` | `number` | Yes | ≥ 0 | Estimated project value in USD |
| `stage` | `ProposalStage` | Yes | One of the five valid stage values | Initial pipeline stage |

### Response

**201 Created** — Proposal created

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customer_name": "James Harrington",
  "neighborhood": "River Oaks",
  "walk_date": "2026-05-10",
  "estimated_value": "45000.00",
  "stage": "voice_memo_received",
  "stage_entered_at": "2026-05-04T09:00:00Z",
  "render_required": true,
  "owner": "<user-uuid>"
}
```

**400 Bad Request** — Missing or invalid fields

```json
{ "error": "customer_name, neighborhood, estimated_value, and stage are required" }
```

**401 Unauthorized**

```json
{ "error": "Unauthorized" }
```

### Behavior

1. Verify auth via `createSSRSassClient()` and `supabase.auth.getUser()`; return 401 if unauthenticated.
2. Validate body: `customer_name` non-empty string, `neighborhood` non-empty string, `estimated_value` finite number ≥ 0, `stage` one of the five valid `ProposalStage` values; return 400 if any fail.
3. `INSERT INTO proposals (customer_name, neighborhood, walk_date, estimated_value, stage, owner) VALUES (...)` — `stage_entered_at` and `render_required` are set automatically by DB defaults and generated column.
4. Return 201 with the full inserted row.

---

## Server-Side Data Fetch (Not an HTTP endpoint)

The queue read path is a server-side fetch inside the Server Component at `/app/proposals/page.tsx`. It is not an HTTP API route. It is documented here for completeness.

**Function signature** (`nextjs/src/lib/supabase/proposals.ts`):

```typescript
export async function fetchProposalQueue(
  client: SassClient,
  userId: string
): Promise<ProposalRow[]>
```

**Query**:

```sql
SELECT *
FROM proposals
WHERE owner = $userId
  AND archived_at IS NULL
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

**Auth**: The calling Server Component must have already verified the user via `supabase.auth.getUser()`. RLS on `proposals` provides a second layer of enforcement. Unauthenticated calls are redirected to `/auth/login` at the page level before this function is called.
