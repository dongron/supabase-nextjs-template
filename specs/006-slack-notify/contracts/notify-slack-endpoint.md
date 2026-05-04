# API Contract: POST /api/app/proposals/{id}/notify-slack

**Feature**: 006-slack-notify
**Date**: 2026-05-04

---

## Endpoint

```
POST /api/app/proposals/{id}/notify-slack
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `uuid` | Yes | The proposal ID |

### Request Body

None. The message text is fixed server-side.

### Request Headers

| Header | Value | Notes |
|--------|-------|-------|
| (cookie) | Session cookie | Required — endpoint is authenticated via Supabase session |

---

## Responses

### 200 OK — Notification Sent

```json
{ "ok": true }
```

### 400 Bad Request — Quote Total Below Threshold

```json
{ "error": "Quote total does not exceed threshold" }
```

Returned when the proposal's `quote` parses to a total ≤ $30,000.

### 400 Bad Request — No Quote

```json
{ "error": "No quote to notify about" }
```

Returned when `proposal.quote` is null.

### 401 Unauthorized — Not Authenticated

```json
{ "error": "Unauthorized" }
```

### 404 Not Found — Proposal Not Found or Not Owned

```json
{ "error": "Proposal not found" }
```

### 500 Internal Server Error — Webhook URL Not Configured

```json
{ "error": "Slack webhook URL not configured." }
```

### 500 Internal Server Error — Slack Delivery Failure

```json
{ "error": "Slack notification failed: <slack-error-body>" }
```

Where `<slack-error-body>` is the plain-text error returned by Slack (e.g., `no_service`, `invalid_payload`).

---

## Authentication & Authorization

- Requires an authenticated Supabase session (cookie-based SSR session via `createSSRSassClient`).
- Ownership enforced: proposal fetched with `.eq('owner', user.id)`. RLS also enforces this at the database layer.

---

## Side Effects

- Sends a POST request to `process.env.PRIVATE_SLACK_WEBHOOK_URL` with body `{"text": "Urgent! Details on your email."}`.
- No database writes.

---

## Implementation File

```
nextjs/src/app/api/app/proposals/[id]/notify-slack/route.ts
```

Mirrors the structure of:
```
nextjs/src/app/api/app/proposals/[id]/notify-designer-email/route.ts
```
