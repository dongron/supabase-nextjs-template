# Data Model: Slack Notification Button

**Feature**: 006-slack-notify
**Date**: 2026-05-04

---

## No Database Changes Required

This feature sends a one-way Slack message via an Incoming Webhook URL. No new tables, columns, or migrations are needed.

The notification is **fire-and-forget**: the result is not persisted. This was a deliberate decision documented in the spec assumptions ("No audit trail or database record of Slack notifications is required for v1").

---

## Existing Entities Used (Read-Only)

### `proposals` table (read)

| Column | Type | Used For |
|--------|------|----------|
| `id` | `uuid` | Route param — identifies which proposal triggered the notify action |
| `quote` | `text \| null` | Used to calculate `quoteTotal` for the threshold check (> $30,000) |
| `owner` | `uuid` | RLS: `eq('owner', user.id)` to scope access to the authenticated user |

No columns are written. No migration file is needed.

---

## State Transitions

None. The feature has no persistent state machine.

---

## Validation Rules

- `quoteTotal` (derived from `proposal.quote` via `parseTextQuote`) MUST be > 30000 before the API route proceeds (enforced server-side, matching the existing designer email threshold pattern).
- `PRIVATE_SLACK_WEBHOOK_URL` environment variable MUST be set; otherwise the route returns HTTP 500.
