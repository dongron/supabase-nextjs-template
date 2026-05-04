# API Contract: PATCH /api/app/proposals/[id]/memo

**Feature**: 003-prospect-action-modal
**Date**: 2026-05-04

---

## Overview

Saves (creates or replaces) the voice memo text for a specific proposal/prospect. Idempotent — calling it multiple times with the same value has no side effects.

---

## Endpoint

```
PATCH /api/app/proposals/[id]/memo
```

| Property | Value |
|----------|-------|
| Method | `PATCH` |
| Auth required | Yes — Supabase session cookie (`createSSRSassClient`) |
| Content-Type | `application/json` |
| Route param `[id]` | UUID of the target proposal |

---

## Request

### Headers

| Header | Required | Value |
|--------|----------|-------|
| `Content-Type` | Yes | `application/json` |
| Cookie (session) | Yes | Supabase auth session (handled by SSR client) |

### Body

```json
{
  "voice_memo": "Transcribed note text here. Can be multiline."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `voice_memo` | `string \| null` | Yes | The memo text to save. Pass `null` or `""` to clear. |

**Validation**:
- `voice_memo` must be a `string` or `null`. Any other type (number, array, object) returns `400`.
- The field is accepted as-is; no sanitization beyond type check. Length is unbounded.

---

## Responses

### 200 OK — memo saved

```json
{ "voice_memo": "Transcribed note text here. Can be multiline." }
```

Returns the saved `voice_memo` value so the client can confirm and update local state.

### 400 Bad Request — invalid body

```json
{ "error": "voice_memo must be a string or null" }
```

Returned when `voice_memo` is missing from the body or is a non-string, non-null value.

### 401 Unauthorized — not authenticated

```json
{ "error": "Unauthorized" }
```

Returned when no valid session is present.

### 404 Not Found — proposal does not belong to user

```json
{ "error": "Not found" }
```

Returned when the proposal ID does not exist or belongs to a different user. The server MUST NOT distinguish between "not found" and "access denied" in the response (prevents enumeration).

### 500 Internal Server Error — database error

```json
{ "error": "<supabase error message>" }
```

---

## Authorization

The handler calls `auth.getUser()` server-side. The Supabase UPDATE query includes `.eq('owner', user.id)` to ensure RLS is enforced at both application and database layers. A user can only update proposals they own.

---

## Example

```http
PATCH /api/app/proposals/d3f2e1a0-0001-0002-0003-000000000001/memo
Content-Type: application/json

{
  "voice_memo": "Customer prefers natural stone pavers. Budget flexible.\nWalk scheduled for next Tuesday."
}
```

**Success response**:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "voice_memo": "Customer prefers natural stone pavers. Budget flexible.\nWalk scheduled for next Tuesday."
}
```

---

## Notes

- This endpoint does NOT modify the proposal `stage`. Stage transitions are handled separately.
- An empty string (`""`) is treated the same as `null` by the UI (field cleared), but the API saves whatever is sent. The client normalises empty strings to `null` before sending.
