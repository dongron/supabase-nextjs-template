# Tasks: Claude Quote Generation

**Input**: Design documents from `specs/004-claude-quote-generation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in all descriptions

---

## Phase 1: Setup

**Purpose**: Install the Anthropic SDK, apply the database migration, and patch the TypeScript types so all subsequent tasks compile.

- [ ] T001 Install `@anthropic-ai/sdk` dependency in `nextjs/` (`pnpm add @anthropic-ai/sdk`)
- [ ] T002 Create migration `supabase/migrations/20260504140000_add_quote_to_proposals.sql` — `ALTER TABLE proposals ADD COLUMN IF NOT EXISTS quote text;`
- [ ] T003 [P] Add `quote: string | null` to `proposals.Row` and `quote?: string | null` to `proposals.Update` in `nextjs/src/lib/types.ts`

**Checkpoint**: SDK installed, migration applied, types compile — all subsequent tasks unblocked.

---

## Phase 2: Foundational

**Purpose**: Create the pure utility module (`lib/quote.ts`) that all phases depend on — types, normalization, and JSON helpers.

**⚠️ CRITICAL**: API route (US1) and ReviewQuoteModal (US2) both import from this module. Must be complete first.

- [ ] T004 Create `nextjs/src/lib/quote.ts` with `QuoteService` type, `GenerateQuoteResponse` type, `SaveQuoteRequest` type, `normalizePrice(raw: string | number | null): number | null` function, `parseStoredQuote(json: string | null): QuoteService[]` function
- [ ] T005 [P] Create `nextjs/src/lib/quote.test.ts` with unit tests for `normalizePrice` (strips non-numeric chars, blank → null, valid number → number, NaN → null) and `parseStoredQuote` (valid JSON, null input, malformed JSON → empty array)

**Checkpoint**: `pnpm vitest run src/lib/quote.test.ts` passes.

---

## Phase 3: User Story 1 — Generate Quote from Voice Memo (Priority: P1) 🎯 MVP

**Goal**: Staff can click "Generate Quote" on a prospect with a voice memo and receive an AI-extracted services list via a server-side Claude API call.

**Independent Test**: Prospect with voice memo → click "Generate Quote" → loading spinner appears → `POST /api/app/proposals/[id]/quote` succeeds → 200 response with `{ services: [...] }` containing at least one extracted service.

- [ ] T006 [US1] Create directory `nextjs/src/app/api/app/proposals/[id]/quote/` and create `route.ts` — export `POST` handler: authenticate via `createSSRSassClient()` + `auth.getUser()`, fetch prospect's `voice_memo` + `owner` check (404 if not found), return 400 if `voice_memo` is null/empty
- [ ] T007 [US1] In `nextjs/src/app/api/app/proposals/[id]/quote/route.ts` — fetch all services from Supabase (id, name columns only), instantiate `new Anthropic({ apiKey: process.env.PRIVATE_CALUDE_API_KEY })`, call `client.messages.create` with model `claude-3-5-sonnet-20241022`, hardcoded system prompt, tool-use schema for `extract_services` tool with `tool_choice: { type: 'any' }`
- [ ] T008 [US1] In `nextjs/src/app/api/app/proposals/[id]/quote/route.ts` — parse the `tool_use` block from Claude response, map each service to `QuoteService` shape (match `serviceName` against services catalog for `serviceId`), return 422 if tool_use block is absent, return `NextResponse.json({ services })` on success; catch `Anthropic.APIError` → 500
- [ ] T009 [P] [US1] Create `nextjs/src/app/api/app/proposals/__tests__/quote.test.ts` — unit tests: 401 when no session, 400 when no voice memo, 404 when prospect not found, 200 with mocked Claude response returning two services (one matched, one unmatched), 422 when Claude returns no tool_use block, 500 on `Anthropic.APIError`

**Checkpoint**: `pnpm vitest run src/app/api/app/proposals/__tests__/quote.test.ts` passes. Manual: `POST /api/app/proposals/:id/quote` with a real prospect ID returns a services list.

---

## Phase 4: User Story 2 — Review and Edit AI-Extracted Services (Priority: P2)

**Goal**: A "Review Quote" modal opens after generation showing the extracted services as an editable list with name/price inputs, checkmark for matched services, add-row and delete-row controls.

**Independent Test**: Render `<ReviewQuoteModal>` with mock services data → verify editable inputs, checkmarks on matched services, "Add Row" appends a blank row, delete button removes a row, "Cancel" does not call `onSave`.

- [ ] T010 [US2] Create `nextjs/src/components/proposals/ReviewQuoteModal.tsx` — shadcn `Dialog` with title "Review Quote"; accept props `open: boolean`, `onOpenChange`, `services: QuoteService[]`, `onSave: (services: QuoteService[]) => void`; initialize local state from `services` prop
- [ ] T011 [US2] In `nextjs/src/components/proposals/ReviewQuoteModal.tsx` — render services table/list: each row has a `CheckCircle2` icon (visible only when `serviceId !== null`), an `Input` for `serviceName` (type text), an `Input` for `price` (type text, shows empty string when null), and a trash/X `Button` to delete the row
- [ ] T012 [US2] In `nextjs/src/components/proposals/ReviewQuoteModal.tsx` — add "Add Row" `Button` that appends `{ serviceId: null, serviceName: '', price: null }` to local state; add "Save" `Button` that calls `onSave(localServices)` then calls `onOpenChange(false)`; add "Cancel" `Button` that calls `onOpenChange(false)` without saving
- [ ] T013 [P] [US2] Create `nextjs/src/components/proposals/__tests__/ReviewQuoteModal.test.tsx` — tests: renders with matched/unmatched services (checkmark present/absent), name input is editable, price input is editable, Add Row appends blank row, Delete removes row, Save calls `onSave` with current state, Cancel does not call `onSave`

**Checkpoint**: `pnpm vitest run src/components/proposals/__tests__/ReviewQuoteModal.test.tsx` passes. Manual: Review Quote modal opens, inputs are editable, rows can be added/deleted.

---

## Phase 5: User Story 3 — Save Quote to Prospect (Priority: P3)

**Goal**: Clicking "Save" in the review modal persists the services list to `proposals.quote`. The action modal displays the saved quote as a readable list. Generating a new quote overwrites the previous one.

**Independent Test**: Complete generation flow → click Save → close both modals → reopen action modal → verify quote list is displayed with correct service names and prices.

- [ ] T014 [US3] Add `PATCH` handler to `nextjs/src/app/api/app/proposals/[id]/quote/route.ts` — authenticate, validate request body has `services` array (400 if missing), normalize each price with `normalizePrice()` from `lib/quote.ts`, `JSON.stringify` the normalized array, update `proposals.quote` via Supabase `UPDATE ... SET quote = $1 WHERE id = $2 AND owner = auth.uid()`, return `{ quote: storedString }` on 200
- [ ] T015 [US3] Wire up `ProspectActionModal.tsx`: import `ReviewQuoteModal`, add `isGenerating: boolean`, `quoteError: string | null`, `reviewModalOpen: boolean`, `generatedServices: QuoteService[]` state; replace the `onClick={() => undefined}` on "Generate Quote" button with handler that calls `POST /api/app/proposals/[id]/quote`, sets loading/error state, opens review modal on success (FR-001, FR-005, FR-010, FR-011)
- [ ] T016 [US3] In `ProspectActionModal.tsx` — implement `handleSaveQuote(services: QuoteService[])`: calls `PATCH /api/app/proposals/[id]/quote` with services, on success updates the local `proposal.quote` state and closes the review modal (FR-008)
- [ ] T017 [US3] In `ProspectActionModal.tsx` — add saved quote display section below "Generate Quote" button: if `proposal.quote` is non-null, parse with `parseStoredQuote()` and render a list of `serviceName — price` rows (price shown as `$X` or "—" if null); if quote is null, show nothing (FR-009)
- [ ] T018 [P] [US3] Add test cases to `nextjs/src/app/api/app/proposals/__tests__/quote.test.ts` for `PATCH` handler: 400 on missing services, 200 with normalized prices (strips "$", "€", blank → null), 404 when prospect not found, 500 on Supabase write error

**Checkpoint**: Full flow works end-to-end. Reopen action modal after saving → quote list displayed. Generate again → old quote replaced.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, responsive layout, error state refinement, and final type-check.

- [ ] T019 [P] In `ReviewQuoteModal.tsx` — add `aria-label` to each delete button (`aria-label="Remove {serviceName}"`), ensure "Save" button is disabled while a save is in progress (add `isSaving` state), ensure all inputs have associated labels or `aria-label`
- [ ] T020 [P] In `ProspectActionModal.tsx` — render inline error banner (shadcn `Alert` variant `destructive`) with "Try Again" button when `quoteError` is set; clear error on retry click; show spinner inside "Generate Quote" button when `isGenerating` is true (FR-011)
- [ ] T021 Run `cd nextjs && pnpm tsc --noEmit` and fix all TypeScript errors introduced by this feature

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup)
  └─ Phase 2 (Foundational: lib/quote.ts)
       ├─ Phase 3 (US1: API route — depends on lib/quote.ts types)
       │    └─ Phase 5 (US3: save PATCH + modal wiring — depends on US1 route existing)
       └─ Phase 4 (US2: ReviewQuoteModal — depends on QuoteService type)
            └─ Phase 5 (US3: wire modal into ProspectActionModal — depends on ReviewQuoteModal)
```

US1 (Phase 3) and US2 (Phase 4) can be developed in parallel after Phase 2. US3 (Phase 5) requires both.

---

## Parallel Execution Within Stories

| Story | Parallel Pairs |
|---|---|
| US1 | T006+T007+T008 are sequential (same file); T009 test can be written alongside T006-T008 |
| US2 | T010+T011+T012 are sequential (same file); T013 test can be written alongside T010-T012 |
| US3 | T014 (route) and T015+T016+T017 (component) can be written in parallel |
| Polish | T019, T020, T021 are all independent and fully parallel |

---

## Implementation Strategy

**MVP Scope**: Complete Phases 1–3 (T001–T009). This delivers the core AI generation and surfaces the extracted services in the console/network tab even without the review modal.

**Incremental Delivery**:
1. Phases 1–3: Server-side AI route working, services list returned
2. Phase 4: Review modal visible and fully editable (no save yet)
3. Phase 5: Save + quote display — feature complete
4. Final Phase: Polish + accessibility

**Total Tasks**: 21
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 2 tasks
- Phase 3 — US1: 4 tasks
- Phase 4 — US2: 4 tasks
- Phase 5 — US3: 5 tasks
- Final (Polish): 3 tasks

**Task count by story**:
- US1: 4 tasks (T006–T009)
- US2: 4 tasks (T010–T013)
- US3: 5 tasks (T014–T018)

**Parallel opportunities**: T003, T005, T009, T013, T018, T019, T020, T021 (8 tasks flagged [P])
