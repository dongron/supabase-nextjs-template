# API Contracts: Claude Quote Generation

**Feature**: 004-claude-quote-generation
**Phase**: 1 — Design
**Date**: 2026-05-04

---

## Base URL

All routes are relative to the Next.js application root. Auth is enforced via Supabase session cookie on every request.

---

## POST `/api/app/proposals/[id]/quote`

Triggers Claude AI to extract a services list from the prospect's voice memo. Does **not** persist anything to the database — the response is displayed in the Review Quote modal for staff to review and edit before saving.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The prospect's `proposals.id` |

### Request Body

None. The server fetches the voice memo and services catalog internally using the authenticated user's session.

### Success Response — `200 OK`

```json
{
  "services": [
    {
      "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "serviceName": "Garden Lighting Installation",
      "price": 4500
    },
    {
      "serviceId": null,
      "serviceName": "Custom Stone Arch",
      "price": null
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `services` | `QuoteService[]` | Zero or more extracted services |
| `services[].serviceId` | `string \| null` | Matched catalog service ID, or null |
| `services[].serviceName` | `string` | Extracted service name |
| `services[].price` | `number \| null` | Extracted price in USD, or null |

### Error Responses

| Status | Body | Scenario |
|---|---|---|
| `401` | `{ "error": "Unauthorized" }` | No valid session |
| `400` | `{ "error": "No voice memo saved for this prospect" }` | Prospect has null/empty `voice_memo` |
| `404` | `{ "error": "Not found" }` | No prospect with given ID owned by current user |
| `422` | `{ "error": "Claude did not return a valid services list" }` | Tool-use block missing or schema mismatch |
| `500` | `{ "error": "Failed to generate quote" }` | Claude API error, network error |

---

## PATCH `/api/app/proposals/[id]/quote`

Saves the reviewed (and optionally edited) services list to the `proposals.quote` column as a JSON string. Overwrites any previously saved quote.

### Path Parameters

| Param | Type | Description |
|---|---|---|
| `id` | `string` (UUID) | The prospect's `proposals.id` |

### Request Body

```json
{
  "services": [
    {
      "serviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "serviceName": "Garden Lighting Installation",
      "price": "4500"
    },
    {
      "serviceId": null,
      "serviceName": "Custom Stone Arch",
      "price": ""
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `services` | `array` | May be empty. Server normalizes before saving |
| `services[].serviceId` | `string \| null` | Passed through as-is |
| `services[].serviceName` | `string` | Passed through as-is |
| `services[].price` | `string \| number \| null` | Non-numeric chars stripped; blank/NaN → `null` |

### Success Response — `200 OK`

```json
{
  "quote": "{\"services\":[{\"serviceId\":\"3fa85f64...\",\"serviceName\":\"Garden Lighting Installation\",\"price\":4500},{\"serviceId\":null,\"serviceName\":\"Custom Stone Arch\",\"price\":null}]}"
}
```

Returns the stored `quote` string as saved in the database, so the client can update local state without refetching.

### Error Responses

| Status | Body | Scenario |
|---|---|---|
| `401` | `{ "error": "Unauthorized" }` | No valid session |
| `400` | `{ "error": "Invalid request body" }` | Missing or non-array `services` field |
| `404` | `{ "error": "Not found" }` | No prospect with given ID owned by current user |
| `500` | `{ "error": "Failed to save quote" }` | Supabase write error |
