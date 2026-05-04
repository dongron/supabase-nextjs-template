# API Contract: Prospect Services & Pricing

Base path: `/api/app/proposals/[id]/services`

All routes require an authenticated session (verified via `supabase.auth.getUser()` server-side). Unauthenticated requests receive `401 Unauthorized`.

---

## PATCH `/api/app/proposals/[id]/services`

Bulk-upserts the price for every service in the owner's catalog for the given prospect. All service rows for the prospect must be included in the request body; omitted services are **not** deleted (the catalog is fixed for the call duration).

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` (UUID) | The proposal (prospect) ID |

### Request Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

### Request Body

```json
{
  "services": [
    { "service_id": "<uuid>", "price": 2500 },
    { "service_id": "<uuid>", "price": 18000 },
    ...
  ]
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `services` | `array` | Required, length ≥ 1 | Full list of service price assignments |
| `services[].service_id` | `string` | Required, non-empty UUID | Must reference a service owned by the authenticated user |
| `services[].price` | `number` | Required, finite, ≥ 0 | Prospect-specific price override |

### Validation Rules

- `services` must be a non-empty array.
- Each `service_id` must be a non-empty string (UUID format not enforced at app layer; DB FK + RLS enforce ownership).
- Each `price` must be a finite number ≥ 0. `NaN`, `Infinity`, negative values are rejected.
- The prospect `id` in the path must belong to the authenticated user (enforced by RLS; the upsert will silently succeed only for rows the user owns).

### Success Response

**Status**: `200 OK`

```json
{
  "updated": 10
}
```

| Field | Type | Description |
|-------|------|-------------|
| `updated` | `number` | Count of rows upserted |

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| `400` | `{ "error": "services must be a non-empty array" }` | `services` is missing, empty, or not an array |
| `400` | `{ "error": "Each service must have a valid service_id and a non-negative price" }` | Any entry fails field validation |
| `401` | `{ "error": "Unauthorized" }` | No authenticated session |
| `500` | `{ "error": "<db error message>" }` | Supabase upsert error |

### Example Request

```bash
curl -X PATCH https://example.com/api/app/proposals/abc123/services \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "services": [
      { "service_id": "11111111-...", "price": 2500 },
      { "service_id": "22222222-...", "price": 18000 }
    ]
  }'
```

### Example Response

```json
{ "updated": 2 }
```

---

## Data Flow

```
Client (ServicesForm)
  │
  │  PATCH /api/app/proposals/[id]/services
  │  body: { services: [...] }
  ▼
Route Handler (route.ts)
  │  1. getUser() → 401 if not authenticated
  │  2. Validate body shape
  │  3. supabase.from('prospect_services').upsert([...], { onConflict: 'prospect_id,service_id' })
  │  4. Return { updated: N }
  ▼
Supabase (prospect_services table)
  │  INSERT ... ON CONFLICT (prospect_id, service_id) DO UPDATE SET price = excluded.price, updated_at = now()
  ▼
Route Handler returns 200
  │
  ▼
Client calls router.refresh() → page re-renders with fresh server data
```
