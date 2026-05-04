# Tasks: Prospect Services & Pricing

**Input**: Design documents from `specs/002-prospect-services-pricing/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅
**Branch**: `002-prospect-services-pricing`
**Tests**: Unit tests for `lib/services.ts` helpers; integration tests for PATCH route handler.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All paths are relative to the repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, type foundations, and navigation entry point that every user story depends on.

**⚠️ CRITICAL**: No user story implementation can begin until T001–T006 are complete.

- [ ] T001 Create Supabase migration `supabase/migrations/20260504120000_services.sql` — `services` table (id, created_at, owner, name, description, default_price, sort_order), CHECK constraint, `services_owner_sort_idx` index, RLS enabled, four RLS policies (SELECT/INSERT/UPDATE/DELETE by `auth.uid() = owner`)
- [ ] T002 Create Supabase migration `supabase/migrations/20260504120001_prospect_services.sql` — `prospect_services` table (id, prospect_id, service_id, price, created_at, updated_at), UNIQUE(prospect_id, service_id), `prospect_services_prospect_idx` index, RLS enabled, three RLS policies (SELECT/INSERT/UPDATE scoped via `prospect_id IN (SELECT id FROM proposals WHERE owner = auth.uid())`)
- [ ] T003 Add 10 example services to `supabase/seed.sql` (Landscape Design Consultation $2500, Custom Stone Patio Installation $18000, Swimming Pool Construction $85000, Outdoor Kitchen & BBQ Area $22000, Pergola / Gazebo Construction $14000, Irrigation System Installation $6500, Outdoor Lighting Design & Installation $8000, Retaining Wall Construction $12000, Driveway & Pathways Paving $16000, Garden Planting & Landscaping $9500) — seeded with `owner = auth.uid()` using Supabase's seed pattern
- [ ] T004 [P] Create `nextjs/src/lib/services.ts` — export types `ServiceCatalogRow`, `ProspectServiceRow`, `ServicesPricingRow`; export pure function `calcTotal(prices: Record<string, string>): number` summing `parseFloat(v) || 0` for all values
- [ ] T005 [P] Create `nextjs/src/lib/supabase/services.ts` — export `fetchProspectServices(client: SassClient, userId: string, prospectId: string): Promise<ServicesPricingRow[]>` that queries all services for owner ordered by sort_order, then LEFT JOINs with prospect_services for the given prospectId, merging price (fallback to default_price)
- [ ] T006 [P] Add "Services" link to `ProposalRow.tsx` (or equivalent navigation point in `nextjs/src/components/proposals/ProposalRow.tsx`) pointing to `/app/proposals/[id]/services`

**Checkpoint**: Migrations written, types defined, data access function ready, navigation entry point wired.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API route and server page that underpin all three user stories. Must be complete before story-specific UI work.

**⚠️ CRITICAL**: All user story UI tasks depend on T007 and T008.

- [ ] T007 Create `nextjs/src/app/api/app/proposals/[id]/services/route.ts` — `PATCH` handler: call `getUser()` → 401 if unauthenticated; parse JSON body; validate `services` is a non-empty array and each entry has a non-empty string `service_id` and a finite non-negative number `price` (return 400 on failure); call `supabase.from('prospect_services').upsert(rows, { onConflict: 'prospect_id,service_id' })` where each row includes `prospect_id`, `service_id`, `price`, `updated_at: new Date().toISOString()`; return `{ updated: data.length }` on success or `{ error }` with status 500
- [ ] T008 Create `nextjs/src/app/app/proposals/[id]/services/page.tsx` — async Server Component: call `createSSRSassClient()`, call `getUser()` → redirect to `/auth/login` if not authenticated; call `fetchProspectServices(client, user.id, params.id)`; render page heading with prospect id context and pass services data to `<ServicesForm>`

**Checkpoint**: PATCH route and page skeleton exist; can be tested with curl and direct URL navigation.

---

## Phase 3: User Story 1 - View and Edit Prospect Service Prices (Priority: P1) 🎯 MVP

**Goal**: Staff member opens a prospect's services screen, sees all catalog services with their per-prospect prices, edits one or more, clicks Save — a single PATCH is sent and the list reloads with the saved values.

**Independent Test**: Open `/app/proposals/[id]/services`, change a price, click Save, observe the list reloads with the new value and a success toast appears. Verify no other prospect's prices changed.

### Tests for User Story 1

- [ ] T009 [P] [US1] Create `nextjs/src/lib/services.test.ts` — unit tests for `calcTotal()`: empty record returns 0; all zero strings return 0; valid numeric strings sum correctly; non-numeric strings treated as 0; negative values treated as 0 (client-side guard)
- [ ] T010 [P] [US1] Create `nextjs/src/app/api/app/proposals/[id]/services/__tests__/route.test.ts` — integration tests for PATCH handler: unauthenticated request returns 401; body with non-array services returns 400; entry with negative price returns 400; entry with NaN price returns 400; valid body calls upsert and returns 200 with `{ updated: N }`

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create `nextjs/src/components/proposals/ServiceRow.tsx` — presentational 'use client' row component accepting `{ service: ServicesPricingRow; value: string; onChange: (serviceId: string, value: string) => void }` props; renders service name, description, and a numeric input with `aria-label` set to the service name; validates input is non-negative on blur; displays inline error for invalid values
- [ ] T012 [US1] Create `nextjs/src/components/proposals/ServicesForm.tsx` — 'use client' component accepting `{ prospectId: string; initialServices: ServicesPricingRow[] }` props; initialises `prices` state as `Record<serviceId, string>` from `initialServices`; renders one `<ServiceRow>` per service; on Save click: validate all prices, set loading state, call `PATCH /api/app/proposals/[id]/services` with full payload, call `router.refresh()` on success to reload server data, show success toast; show error toast and preserve form values on failure; disable Save button during loading (depends on T011)
- [ ] T013 [US1] Update `nextjs/src/app/app/proposals/[id]/services/page.tsx` to pass correct props to `<ServicesForm prospectId={params.id} initialServices={services} />` and add empty-state message when services array is empty (depends on T008, T012)

**Checkpoint**: US1 fully functional — open a prospect's services screen, edit prices, save, list reloads.

---

## Phase 4: User Story 2 - View Prospect Service Total (Priority: P2)

**Goal**: A running total of all service prices is displayed at the bottom of the form and updates immediately whenever any price field changes, before saving.

**Independent Test**: Open the services form, note the displayed total, change any price field, verify the total updates instantly without clicking Save. Verify total = arithmetic sum of all visible price inputs.

### Tests for User Story 2

- [ ] T014 [P] [US2] Extend `nextjs/src/lib/services.test.ts` — add `calcTotal` test cases: mixed valid/invalid inputs; all services with default prices produce correct sum; updating one field changes total correctly

### Implementation for User Story 2

- [ ] T015 [US2] Update `nextjs/src/components/proposals/ServicesForm.tsx` — add a total line below the service rows using `calcTotal(prices)` derived on each render; format as currency (e.g. `$193,000.00`); apply `font-semibold` styling and dark-mode safe colour; total must update on every `prices` state change without an extra effect (depends on T012)

**Checkpoint**: US2 functional — total visible on page load and updates in real time with price edits.

---

## Phase 5: User Story 3 - Per-Prospect Service Assignment (Priority: P3)

**Goal**: Confirm data isolation — saving prices for one prospect has zero effect on another prospect's prices. New prospects open with all services listed at default prices.

**Independent Test**: Save prices for Prospect A, then open Prospect B's services screen and verify prices are unchanged (default values if never saved). Save different prices for Prospect B, then re-open Prospect A and verify its prices are still the values saved in the previous step.

### Tests for User Story 3

- [ ] T016 [P] [US3] Extend `nextjs/src/app/api/app/proposals/[id]/services/__tests__/route.test.ts` — add isolation test: mock two distinct prospect IDs, upsert prices for prospect A, verify prospect B's rows are untouched (distinct prospect_id in upsert rows); verify RLS policy scoping in integration test

### Implementation for User Story 3

- [ ] T017 [US3] Verify `fetchProspectServices` in `nextjs/src/lib/supabase/services.ts` correctly scopes the LEFT JOIN to the specific `prospectId` parameter and that rows for other prospects are never returned — add a code comment documenting the isolation guarantee; no UI changes required (isolation is enforced by the data model and RLS) (depends on T005)

**Checkpoint**: US3 verified — data isolation confirmed at both the API and DB levels.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, loading states, error states, navigation, and constitution compliance finalisation.

- [ ] T018 [P] Add a mobile viewport notice to `nextjs/src/app/app/proposals/[id]/services/page.tsx` — render a dismissible banner or overlay (using a shadcn/ui `Alert`) visible only on screens narrower than `md` breakpoint (Tailwind `md:hidden`) informing users the form is optimised for desktop/tablet; this fulfils the constitution's mobile responsiveness requirement at minimum viable level
- [ ] T019a [P] Add `aria-label` to the services form (`aria-label="Prospect services pricing"`) and ensure the Save button has `aria-busy={loading}` in `nextjs/src/components/proposals/ServicesForm.tsx`
- [ ] T019b [P] Add a back-navigation link in `nextjs/src/app/app/proposals/[id]/services/page.tsx` pointing to `/app/proposals` so staff can return to the proposal list without using the browser back button
- [ ] T020 [P] Update `nextjs/src/components/AppLayout.tsx` navigation array — confirm "Proposals" link exists and add no new top-level nav entry (services is a sub-screen, not a primary nav item)
- [ ] T021 Manually verify dark mode rendering of `ServicesForm.tsx` and `ServiceRow.tsx` — confirm all text, border, input, and total colours use CSS variables or Tailwind dark: utilities; fix any hardcoded colour values found
- [ ] T022 Run `pnpm lint` and `pnpm tsc --noEmit` in `nextjs/` — fix all reported errors before marking this task complete

---

## Dependencies

```
T001 → T007 (migration must exist before route upsert targets the table)
T002 → T007 (prospect_services table needed by route)
T003 → (seed only; no code dependency)
T004 → T009, T014 (calcTotal type needed for unit tests)
T004 → T011, T012 (ServicesPricingRow type used in components)
T005 → T008 (fetchProspectServices used in page)
T005 → T017 (isolation verification)
T006 (independent — navigation link)
T007 → T010 (route must exist for integration tests)
T008 → T013 (page needs ServicesForm component)
T011 → T012 (ServiceRow used inside ServicesForm)
T012 → T013, T015 (ServicesForm extended by both stories)
T015 → T021 (total display must exist before dark mode check)
T022 (final gate — runs after all implementation tasks)
```

## Parallel Execution Examples

**Phase 1** (T001, T002, T003 sequential — migrations must apply in order; T004, T005, T006 can run in parallel after T001–T002 are written):
```
T001 → T002 → T003
T004 ─────────────── (parallel, different file)
T005 ─────────────── (parallel, different file)
T006 ─────────────── (parallel, different file)
```

**Phase 2** (T007, T008 can be written in parallel — different files):
```
T007 ──────────────── (route handler)
T008 ──────────────── (page component)
```

**Within US1** (T009, T010, T011 are parallel; T012 waits for T011; T013 waits for T012):
```
T009 ──── (unit tests)
T010 ──── (route integration tests)
T011 ──── (ServiceRow component)
       └→ T012 → T013
```

**US2 and US3 tests** (T014, T016 parallel):
```
T014 ──── (calcTotal test extension)
T016 ──── (isolation test)
```

**Phase 6** (T018, T019, T020 parallel; T021 after T015; T022 last):
```
T018 ─────── (aria)
T019 ─────── (back link)
T020 ─────── (nav audit)
T015 → T021 (dark mode check after total renders)
T022 ─────── (final lint/type gate)
```

## Implementation Strategy

**Suggested MVP scope**: Complete Phases 1–3 (T001–T013) = User Story 1 fully functional with a working form, PATCH API, server page, and basic unit/integration tests.

**Increment 2**: Phase 4 (T014–T015) = add the running total (User Story 2).

**Increment 3**: Phase 5 (T016–T017) = verify per-prospect isolation (User Story 3).

**Increment 4**: Phase 6 (T018–T022) = polish, accessibility, mobile notice, lint gate.

## Summary

| Phase | Tasks | Stories Covered | Parallelisable |
|-------|-------|-----------------|----------------|
| 1: Setup | T001–T006 | Foundational | T004, T005, T006 |
| 2: Foundational | T007–T008 | All | T007, T008 |
| 3: US1 MVP | T009–T013 | US1 (P1) | T009, T010, T011 |
| 4: US2 Total | T014–T015 | US2 (P2) | T014 |
| 5: US3 Isolation | T016–T017 | US3 (P3) | T016 |
| 6: Polish | T018–T022 | All | T018, T019a, T019b, T020 |
| **Total** | **22 tasks** | **3 user stories** | **12 parallel opportunities** |
