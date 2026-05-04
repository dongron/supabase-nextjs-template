# Implementation Plan: Slack Notification Button

**Branch**: `006-slack-notify` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-slack-notify/spec.md`

## Summary

Add a "Notify on Slack" button to the `ProspectActionModal` that sends the fixed message "Urgent! Details on your email." to a pre-configured Slack channel via an Incoming Webhook URL. The button mirrors the existing "Notify designer" button: same visual style, same $30,000 quote-total threshold, brief "Sent!" feedback on success, and inline error display on failure. Implementation follows the established server-side API route pattern: a new `POST /api/app/proposals/[id]/notify-slack` route that reads `PRIVATE_SLACK_WEBHOOK_URL` from the environment and calls the Slack Incoming Webhook endpoint using `fetch`.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Next.js 15 (App Router)
**Primary Dependencies**: shadcn/ui (Button, Alert, AlertDescription), Tailwind CSS, Supabase SSR client (`createSSRSassClient`), native `fetch` (no Slack SDK)
**Storage**: PostgreSQL via Supabase — read-only access to `proposals` table; no new migrations
**Testing**: Vitest (unit + integration), following `nextjs/src/app/api/app/proposals/__tests__/` pattern
**Target Platform**: Vercel (server-side Next.js API route)
**Project Type**: Web application (Next.js SaaS)
**Performance Goals**: API route response ≤ 500ms p95 (constitution); Slack webhook typical < 200ms
**Constraints**: `PRIVATE_SLACK_WEBHOOK_URL` must never be exposed to the client; button disabled when `quoteTotal ≤ 30000`
**Scale/Scope**: 1 new API route file + 1 component update; no DB changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict mode, no `any` | ✅ PASS | Route and component follow existing patterns |
| shadcn/ui + Tailwind CSS for all UI | ✅ PASS | Button/Alert components reused from existing modal code |
| Dark mode supported | ✅ PASS | Uses existing Tailwind dark variant CSS variables |
| Loading + error states mandatory | ✅ PASS | Spec requires both; implementation mirrors `handleNotifyDesigner` |
| ARIA labels on interactive elements | ✅ PASS | Button gets `aria-label`; error gets `role="alert"` |
| Secrets in env vars only | ✅ PASS | `PRIVATE_SLACK_WEBHOOK_URL` — server-only, never in client bundle |
| RLS on all DB access | ✅ PASS | Existing `proposals` table read uses `.eq('owner', user.id)` |
| Auth verified server-side via `getUser()` | ✅ PASS | `createSSRSassClient` + `auth.getUser()` pattern reused |
| Unit + integration tests for new code | ✅ PASS | Vitest test file required alongside route |
| No N+1 queries | ✅ PASS | Single `.select().eq().single()` query |
| No new migrations | ✅ PASS | No schema changes |
| ESLint + Prettier must pass | ✅ PASS | No new lint rules introduced |

**Constitution Check Post-Design**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-slack-notify/
├── plan.md              # This file
├── research.md          # Phase 0 — Slack Incoming Webhooks research
├── data-model.md        # Phase 1 — No DB changes; existing entities documented
├── quickstart.md        # Phase 1 — Setup guide for PRIVATE_SLACK_WEBHOOK_URL
├── contracts/
│   └── notify-slack-endpoint.md   # Phase 1 — API contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (affected files)

```text
nextjs/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── app/
│   │           └── proposals/
│   │               └── [id]/
│   │                   └── notify-slack/
│   │                       └── route.ts           # NEW — POST handler
│   └── components/
│       └── proposals/
│           └── ProspectActionModal.tsx             # MODIFIED — add button + state
└── src/app/api/app/proposals/
    └── __tests__/
        └── notify-slack.test.ts                    # NEW — Vitest tests for route
```

**Structure Decision**: Web application, single Next.js project under `nextjs/`. All changes are additive (one new file, one modified file, one new test file). No new packages or project roots.

## Complexity Tracking

> No Constitution violations — this section is not applicable.
