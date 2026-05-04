# Tasks: Proposal Email Notifications

**Feature**: 005-proposal-email-notifications  
**Spec**: specs/005-proposal-email-notifications/spec.md  
**Branch**: feature/005-proposal-email-notifications

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install missing dependency and create all database migrations before any code changes.

- [X] T001 Install `resend` npm package: run `pnpm add resend` in `nextjs/`
- [X] T002 Create Supabase migration `supabase/migrations/20260504150000_add_email_to_proposals.sql` — add `email text NOT NULL DEFAULT ''` and `quote_sent boolean NOT NULL DEFAULT false` columns to `public.proposals`; backfill any NULL email rows with empty string
- [X] T003 Create Supabase migration `supabase/migrations/20260504160000_create_app_settings.sql` — create `public.app_settings` table with columns `id uuid PK`, `owner uuid FK auth.users`, `designer_email text NOT NULL DEFAULT ''`; add RLS policies (select/insert/update own row); add unique constraint on `owner`

**Checkpoint**: Migrations ready to apply — no TypeScript or component work can be done before types reflect the new schema.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Update TypeScript types and create shared utilities that every user story depends on.

**⚠️ CRITICAL**: Phases 3–6 all depend on T004, T005, and T006.

- [X] T004 [P] Update `nextjs/src/lib/types.ts` — add `email: string` and `quote_sent: boolean` to `proposals` Row, Insert, and Update; add `app_settings` table with Row `{ id: string; owner: string; designer_email: string }`, Insert `{ id?: string; owner: string; designer_email?: string }`, Update `{ designer_email?: string }`
- [X] T005 [P] Add `calculateQuoteTotal(services: QuoteService[]): number` to `nextjs/src/lib/quote.ts` — returns the sum of all `price` values where `price !== null`; returns `0` for an empty array
- [X] T006 [P] Create `nextjs/src/lib/email.ts` — add `import 'server-only'` guard at top; initialise Resend client from `process.env.PRIVATE_RESEND_API_KEY`; export `sendCustomerQuoteEmail(to: string, customerName: string, services: QuoteService[]): Promise<void>` (greeting + service line-items + grand total + thank-you + "CEO of Greenscape Pro" signature); export `sendDesignerNotificationEmail(to: string, customerName: string, neighborhood: string, services: QuoteService[]): Promise<void>` (proposal overview + service list + total); sender address is `onboarding@resend.dev` for both

**Checkpoint**: Foundation ready — user story phases can now be implemented sequentially.

---

## Phase 3: User Story 1 — Add Email Field to Proposal (Priority: P1) 🎯 MVP

**Goal**: Capture the customer email address on every proposal record so that quote emails can be dispatched.

**Independent Test**: Open the Add Proposal form, enter a valid email, submit — verify the returned `ProposalRow` includes the email. Then submit without an email — verify a 400 error is returned and the form shows a validation error.

- [X] T007 [US1] Update `nextjs/src/app/api/app/proposals/route.ts` POST handler — extract `email` from the request body, validate it is a non-empty string matching a basic email pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), return 400 if missing or malformed, and include `email` in the `ProposalInsert` object passed to Supabase
- [X] T008 [US1] Update `nextjs/src/components/proposals/AddProposalForm.tsx` — add `email: string` to `FormState` and `INITIAL_STATE`; add an `<input type="email" name="email" required />` field labelled "Email" between the `neighborhood` and `walk_date` fields; validate that `email` is non-empty and matches basic email format before `fetch`; pass `email` in the POST body; display a field-level error if validation fails

**Checkpoint**: User Story 1 fully functional — proposals can be created with a customer email address.

---

## Phase 4: User Story 2 — Send Quote to Customer via Email (Priority: P2)

**Goal**: Let staff dispatch the generated quote to the customer's email with a single click; require confirmation on re-send.

**Independent Test**: Create a proposal with a valid email, generate and save a quote, open the action modal — verify "Send to customer" button appears. Click it, confirm an email is received. Click it again — verify a confirmation dialog appears. Cancel — verify no second email is sent.

- [X] T009 [US2] Create `nextjs/src/app/api/app/proposals/[id]/send-quote/route.ts` — export `POST` handler: authenticate user, fetch proposal by `id` and `owner` (select `email`, `quote`, `customer_name`, `quote_sent`); return 404 if not found; return 400 if `quote` is null or `email` is empty; call `sendCustomerQuoteEmail` from `nextjs/src/lib/email.ts` with parsed services from `parseStoredQuote(quote)`; on success, update `quote_sent = true` on the proposal row; return `{ ok: true }` or a structured error response
- [X] T010 [US2] Update `nextjs/src/components/proposals/ProspectActionModal.tsx` — add `localQuoteSent` state initialised from `proposal.quote_sent`; add `isSendingQuote` boolean state; add `showResendConfirm` boolean state; render a "Send to customer" button visible only when `localQuote` is non-null, placed below the "Edit Quote" button; clicking the button checks `localQuoteSent`: if true, set `showResendConfirm = true` (shows a confirmation `<AlertDialog>` — "Quote already sent — send again?"); on confirm (or first send), POST to `/api/app/proposals/${proposal.id}/send-quote`, disable button during in-flight, show success toast on `ok: true`, show error `<Alert>` on failure, set `localQuoteSent = true` on success

**Checkpoint**: User Story 2 fully functional — quotes can be emailed to customers with re-send protection.

---

## Phase 5: User Story 3 — Notify Designer When Quote Exceeds Threshold (Priority: P3)

**Goal**: Let staff alert the designer when a quote total exceeds $30,000; the button is always visible but disabled below the threshold.

**Independent Test**: Generate a quote below $30,000 — "Notify designer" button is visible but disabled. Edit quote total above $30,000 — button becomes enabled. Click it — verify designer email is received. Click when no designer email is configured — verify an informative inline error is shown.

- [X] T011 [US3] Create `nextjs/src/app/api/app/proposals/[id]/notify-designer-email/route.ts` — export `POST` handler: authenticate user, fetch proposal by `id` and `owner` (select `quote`, `customer_name`, `neighborhood`); return 404 if not found; return 400 if `quote` is null; parse services with `parseStoredQuote(quote)`, calculate total with `calculateQuoteTotal(services)`; return 400 with `{ error: 'Quote total does not exceed threshold' }` if total ≤ 30000; fetch designer email from `app_settings` where `owner = user.id`; return 400 with `{ error: 'No designer email configured. Please set it in Settings.' }` if empty or not found; call `sendDesignerNotificationEmail` from `nextjs/src/lib/email.ts`; return `{ ok: true }` or structured error
- [X] T012 [US3] Update `nextjs/src/components/proposals/ProspectActionModal.tsx` — add `isNotifyingDesigner` boolean state; add `designerNotifyError` string-or-null state; calculate `quoteTotal` using `calculateQuoteTotal(parseStoredQuote(localQuote))` when `localQuote` changes; render a "Notify designer" button visible only when `localQuote` is non-null, placed below "Send to customer"; disable the button when `quoteTotal <= 30000` or `isNotifyingDesigner` is true; add a tooltip/title `"Requires quote total > $30,000"` when disabled due to threshold; on click, POST to `/api/app/proposals/${proposal.id}/notify-designer-email`, set `isNotifyingDesigner = true` while in-flight, show success toast on `ok: true`, show `designerNotifyError` alert on failure (use the server's `error` message verbatim so the "configure in Settings" hint is shown)

**Checkpoint**: User Story 3 fully functional — designers receive alerts for high-value quotes.

---

## Phase 6: User Story 4 — Configure Designer Email in Settings (Priority: P4)

**Goal**: Let an administrator set or update the designer's notification email from the settings page.

**Independent Test**: Open user settings — "Designer email" field is visible. Enter a valid email and save — verify the value persists after page reload. Enter an invalid email — verify form prevents saving and shows an error.

- [X] T013 [US4] Update `nextjs/src/app/app/user-settings/page.tsx` — add `designerEmail` and `designerEmailLoading` / `designerEmailSaving` / `designerEmailError` / `designerEmailSuccess` state; on mount (useEffect), query `app_settings` via Supabase client `select('designer_email').eq('owner', user.id).maybeSingle()` and pre-fill the field; render a "Designer email" section inside the existing `<Card>` layout with an `<input type="email">` field; on save, validate the email format; upsert into `app_settings` `{ owner: user.id, designer_email }` using `.upsert({ owner: user.id, designer_email }, { onConflict: 'owner' })`; show success or error feedback using the existing alert pattern in the file

**Checkpoint**: User Story 4 fully functional — designer email can be managed without code changes.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [X] T014 [P] Review `nextjs/src/lib/email.ts` to confirm `import 'server-only'` is present and the file has no `'use client'` directive; verify `process.env.PRIVATE_RESEND_API_KEY` is read directly (not passed through props or context)
- [X] T015 [P] Verify that `nextjs/src/lib/types.ts` `proposals.Insert` does NOT mark `email` as optional (it should be required at the type level to match `NOT NULL` in DB); if it was added as `email?: string`, change to `email: string`

---

## Dependencies

```
T001 (install resend)
  └── T006 (email.ts) depends on resend being installed

T002 (proposals migration)
  └── T004 (types.ts) must reflect new columns

T003 (app_settings migration)
  └── T004 (types.ts) must reflect new table
  └── T013 (settings page) must query this table

T004 (types.ts update)
  └── T007, T008 (US1) — proposals now have email + quote_sent in types
  └── T009, T010 (US2) — quote_sent available on ProposalRow
  └── T011, T012 (US3) — calculateQuoteTotal and notify route
  └── T013 (US4) — app_settings type available

T005 (calculateQuoteTotal)
  └── T011 (notify-designer-email route) calls calculateQuoteTotal
  └── T012 (ProspectActionModal) computes quoteTotal for button state

T006 (email.ts)
  └── T009 (send-quote route) calls sendCustomerQuoteEmail
  └── T011 (notify-designer-email route) calls sendDesignerNotificationEmail

T007 (POST /proposals route) is independent of T008 but both are US1
T009 (send-quote route) is independent of T010 but both are US2
T011 (notify-designer-email route) is independent of T012 but both are US3
T010 (ProspectActionModal US2 changes) must be done before T012 (US3 changes to same file)
```

## Parallel Execution Opportunities

- **Phase 2**: T004, T005, T006 can all proceed in parallel (different files)
- **Phase 3**: T007 (API route) and T008 (form component) can proceed in parallel
- **Phase 4**: T009 (API route) and the initial modal UI scaffolding of T010 can proceed in parallel
- **Phase 5**: T011 (API route) and T012 (modal additions) can proceed in parallel
- **Phase 6**: T013 is independent of all Phase 4–5 work

## Implementation Strategy

**MVP scope** (minimum to demonstrate value): Complete Phases 1–3 (T001–T008). This delivers a properly structured proposal with customer email captured, which is a prerequisite for all email-sending.

**Incremental delivery order**:
1. T001–T006 (infrastructure) → verifiable by running migrations and unit-testing `calculateQuoteTotal` and `email.ts`
2. T007–T008 (US1) → verifiable via form and API
3. T009–T010 (US2) → verifiable end-to-end with a real email to Resend sandbox
4. T011–T012 (US3) → verifiable with a quote over $30,000
5. T013 (US4) → verifiable by changing the designer email in settings and re-running US3

**Total tasks**: 15  
**By user story**: US1 × 2, US2 × 2, US3 × 2, US4 × 1, Setup × 3, Foundational × 3, Polish × 2
