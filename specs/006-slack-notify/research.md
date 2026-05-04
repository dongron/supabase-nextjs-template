# Research: Slack Notification Button

**Feature**: 006-slack-notify
**Date**: 2026-05-04
**Phase**: 0

---

## Decision 1: Slack Integration Mechanism

- **Decision**: Incoming Webhook URL (stored in `PRIVATE_SLACK_WEBHOOK_URL`)
- **Rationale**: Chosen by the product owner (clarification session). A webhook URL encodes the target channel and requires a single `POST` with a JSON body — no OAuth flow, no token scopes, no SDK dependency.
- **Alternatives considered**: Bot token + `chat.postMessage` Web API (more powerful but over-engineered for a fixed single-message use case).

---

## Decision 2: HTTP Request Format

- **Decision**: `POST https://hooks.slack.com/services/…` with `Content-Type: application/json` and body `{"text": "Urgent! Details on your email."}`
- **Rationale**: Official Slack Incoming Webhook spec. The channel is fixed in the URL; no additional parameters are needed.
- **Alternatives considered**: Slack Block Kit payloads — out of scope, the message text is fixed.

---

## Decision 3: Error Handling Strategy

- **Decision**: Surface the raw error status to the caller as a user-readable message. No retry logic.
- **Rationale**: Slack error responses are plain-text strings (e.g., `no_service`, `channel_not_found`) or HTTP status codes (400, 403, 404). The fix for each is an operator action (fix the webhook URL / re-enable the channel), not a retry. The API route returns HTTP 500 to the frontend, which shows an inline error.
- **Alternatives considered**: Retry with exponential backoff — inappropriate for 400/403/404 class errors; no rate limits documented by Slack that would justify retry on 200-level failures.

---

## Decision 4: No Slack SDK

- **Decision**: Use native `fetch` inside the API route, not `@slack/webhook` or `@slack/web-api`.
- **Rationale**: The only operation is a single outbound POST. Adding a package dependency for a one-line `fetch` call violates the project's simplicity preference. The `fetch` format for Incoming Webhooks is trivially simple (one header, one JSON field).
- **Alternatives considered**: `@slack/webhook` package — valid but unnecessary dependency for this scope.

---

## Decision 5: Missing Env Variable Handling

- **Decision**: If `PRIVATE_SLACK_WEBHOOK_URL` is absent, the API route returns HTTP 500 with `{"error": "Slack webhook URL not configured."}`.
- **Rationale**: Matches the pattern used by the designer email route (which checks for `designer_email` being empty and returns 400). Failing fast with a clear message is better than a confusing network error.
- **Alternatives considered**: Disable the button client-side when variable is absent — not feasible since env vars with `PRIVATE_` prefix are server-only and not exposed to the client.

---

## Key Reference: Slack Incoming Webhooks Response Codes

| HTTP Code | Body | Meaning |
|-----------|------|---------|
| 200 | `ok` | Success |
| 400 | `invalid_payload` | Malformed JSON |
| 403 | `action_prohibited` | Admin restriction |
| 404 | `no_service` | Webhook disabled/removed/invalid |
| 404 | `invalid_token` | Token invalid |

---

## All NEEDS CLARIFICATION Resolved

None were outstanding after the clarification session.
