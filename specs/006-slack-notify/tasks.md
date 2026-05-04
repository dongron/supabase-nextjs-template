# Tasks: Slack Notification Button

**Input**: Design documents from `specs/006-slack-notify/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Single user story (P1) — all implementation and test tasks belong to US1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US1]**: User Story 1 — Send Slack Notification from Prospect Modal

---

## Phase 1: Setup

**Purpose**: Environment configuration prerequisite before any code can be tested.

- [ ] T001 Add `PRIVATE_SLACK_WEBHOOK_URL=<your-webhook-url>` to `nextjs/.env.local` (follow `specs/006-slack-notify/quickstart.md` to create the Slack app and obtain the URL)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user story implementation.

> No new shared infrastructure is required. The existing `createSSRSassClient`, `parseTextQuote`, and `calculateQuoteTotal` utilities from the `notify-designer-email` route are reused as-is. **Phase 2 is N/A — proceed directly to Phase 3 after T001.**

---

## Phase 3: User Story 1 — Send Slack Notification from Prospect Modal (Priority: P1) 🎯 MVP

**Goal**: A "Notify on Slack" button in `ProspectActionModal` that posts "Urgent! Details on your email." to Slack via Incoming Webhook when the quote total exceeds $30,000, with loading state, brief "Sent!" success feedback, and inline error display.

**Independent Test**: Open any prospect with a quote total > $30,000, click "Notify on Slack", verify "Sent!" label appears briefly and the message arrives in the configured Slack channel. Test error path by setting `PRIVATE_SLACK_WEBHOOK_URL` to an invalid value and confirming the inline error appears.

### Tests for User Story 1

> **Tests MUST be written and FAIL before implementation (constitution requirement)**

- [ ] T002 [P] [US1] Write Vitest tests for the notify-slack route covering: 401 when unauthenticated, 404 when proposal not found, 400 when no quote, 400 when quote total ≤ $30,000, 500 when `PRIVATE_SLACK_WEBHOOK_URL` is absent, 500 when Slack returns non-ok, 200 on success — in `nextjs/src/app/api/app/proposals/__tests__/notify-slack.test.ts` (mirror pattern from `routes.test.ts` and `memo.test.ts`)

### Implementation for User Story 1

- [ ] T003 [P] [US1] Create `POST` handler in `nextjs/src/app/api/app/proposals/[id]/notify-slack/route.ts`: authenticate with `createSSRSassClient` + `auth.getUser()`, fetch proposal `.select('quote, owner').eq('id', id).eq('owner', user.id).single()`, return 404 if not found, 400 if no quote, parse quote with `parseTextQuote` + `calculateQuoteTotal`, return 400 if total ≤ 30000, return 500 if `PRIVATE_SLACK_WEBHOOK_URL` is unset, POST `{"text":"Urgent! Details on your email."}` to webhook URL with `Content-Type: application/json`, return 500 with Slack error body if response not ok, return `{ ok: true }` on success
- [ ] T004 [US1] Update `nextjs/src/components/proposals/ProspectActionModal.tsx`: add `isNotifyingSlack` boolean state, `slackNotifyError` string-or-null state, and `slackNotifySent` boolean state; add `handleNotifySlack` async function that POSTs to `/api/app/proposals/${proposal.id}/notify-slack`, sets `slackNotifySent = true` on success then resets it after 1500ms via `setTimeout`, sets `slackNotifyError` on failure; add the button (variant `outline`, size `sm`, disabled when `quoteTotal <= 30000 || isNotifyingSlack`, title tooltip matching "Notify designer" pattern, `aria-label="Notify on Slack"`) with label `isNotifyingSlack ? 'Notifying…' : slackNotifySent ? 'Sent!' : 'Notify on Slack'`; add inline `<Alert variant="destructive">` for `slackNotifyError` positioned adjacent to the "Notify designer" button group

**Checkpoint**: At this point, User Story 1 is fully functional and independently testable.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and validation before the feature is considered complete.

- [ ] T005 [P] Run `pnpm --filter nextjs lint` and `pnpm --filter nextjs tsc --noEmit` to confirm no lint or type errors introduced by T003 and T004
- [ ] T006 [P] Run Vitest tests to confirm all T002 tests pass after T003 implementation: `pnpm --filter nextjs test src/app/api/app/proposals/__tests__/notify-slack.test.ts`
- [ ] T007 Perform manual end-to-end verification following `specs/006-slack-notify/quickstart.md`: open a prospect with quote total > $30,000, click "Notify on Slack", verify "Sent!" label and Slack message delivery

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately with T001
- **Foundational (Phase 2)**: N/A — no shared infrastructure tasks
- **User Story 1 (Phase 3)**: Requires T001 (env var) to test end-to-end; T002 and T003 can begin in parallel immediately after T001
- **Polish (Phase 4)**: Requires T002, T003, T004 to be complete

### User Story 1 Internal Order

```
T001 (env var)
   ↓
T002 (tests — write first, should fail) ─┐ parallel
T003 (API route)                         ─┘
   ↓
T004 (component update — depends on route path being established by T003)
   ↓
T005, T006 (parallel quality checks)
   ↓
T007 (manual verification)
```

### Parallel Opportunities

```bash
# After T001, these two can run simultaneously:
Task T002: "Write Vitest tests in notify-slack.test.ts"
Task T003: "Create notify-slack/route.ts POST handler"

# After T003 and T004 complete, these can run simultaneously:
Task T005: "pnpm lint + tsc --noEmit"
Task T006: "pnpm test notify-slack.test.ts"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. T001 — Add `PRIVATE_SLACK_WEBHOOK_URL` to `.env.local`
2. T002 — Write failing tests
3. T003 — Implement route (tests should now pass)
4. T004 — Update component
5. T005 + T006 — Quality checks (parallel)
6. T007 — Manual validation
7. **DONE** — Feature complete, ready to merge

### Total Task Count

| Phase | Tasks | Parallel |
|-------|-------|---------|
| Phase 1: Setup | 1 | 0 |
| Phase 2: Foundational | 0 | 0 |
| Phase 3: User Story 1 | 3 | 2 (T002+T003) |
| Phase 4: Polish | 3 | 2 (T005+T006) |
| **Total** | **7** | **4** |

All 7 tasks belong to the single user story (US1). Suggested MVP scope: all tasks (this is already a minimal feature).
