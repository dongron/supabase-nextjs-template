# Research: Prospect Services & Pricing

## 1. Bulk Upsert Strategy (PostgreSQL / Supabase)

**Decision**: Use Supabase JS `upsert()` with `onConflict: 'prospect_id,service_id'`  
**Rationale**: The `prospect_services` table has a UNIQUE constraint on `(prospect_id, service_id)`. Supabase's `upsert()` compiles to `INSERT ... ON CONFLICT DO UPDATE`, which handles both create and update in one round-trip. No manual delete required because we always send the full catalog (all service rows are always present in the payload).  
**Alternatives considered**:
- DELETE + INSERT: Two round-trips, risks momentary data gap, more complex error handling.
- Individual per-row PATCH: N round-trips (one per service), violates the spec's "single PATCH" requirement and the constitution's "no N+1" rule.
- PostgreSQL function/RPC: Would work but adds complexity without benefit at this scale (≤50 rows).

## 2. Form State Management

**Decision**: Plain React `useState` with a `Record<serviceId, string>` prices map  
**Rationale**: React Hook Form is not installed and not needed for a fixed-length form. The form has at most ~50 rows (one per service). A simple `{ [serviceId]: priceString }` state object is easy to control, validate, and diff. Consistent with `AddProposalForm.tsx` pattern in the codebase.  
**Alternatives considered**:
- React Hook Form: Not installed. Adding it for a single fixed-form feature would be over-engineering.
- Zod: Not installed. Manual validation at the API boundary (matching existing proposals route pattern) is sufficient.

## 3. Input Validation

**Decision**: Manual validation in the API route handler (mirrors existing proposals route)  
**Rationale**: The body shape is simple: `{ services: Array<{ service_id: string; price: number }> }`. Validate that `service_id` is a non-empty UUID string and `price` is a finite non-negative number. This is the established pattern in the codebase.  
**Client-side**: Price fields accept only numeric input; invalid values (empty, negative) show inline error before submission. The total shows `$0.00` for empty fields rather than `NaN`.

## 4. Data Ownership / RLS Architecture

**Decision**: `services` table is owner-scoped (each authenticated user owns their own catalog); `prospect_services` is indirectly scoped via the `proposals` table foreign key  
**Rationale**: All existing tables in this template use `owner = auth.uid()` scoping. This keeps data fully isolated per account. The initial 10 example services are seeded per-user via a trigger OR via seed.sql (seeded once as "system" rows owned by a sentinel UUID, or alternatively each new user gets a seeded catalog via an on-signup trigger). Simpler approach: seed them as part of `seed.sql` for the development environment; production users use the Admin API or a future "catalog management" feature to populate their services.  
**RLS for `services`**: SELECT/INSERT/UPDATE/DELETE where `owner = auth.uid()`  
**RLS for `prospect_services`**: SELECT/INSERT/UPDATE/DELETE where `prospect_id IN (SELECT id FROM proposals WHERE owner = auth.uid())`  
**Alternatives considered**:
- Global shared catalog: Would require a service role to seed and a separate auth bypass. Inconsistent with existing RLS patterns.
- Per-prospect catalog: Creates data duplication; harder to update catalog globally.

## 5. URL / Routing Decision

**Decision**: `/app/proposals/[id]/services` as a separate Next.js page (nested under the proposal detail segment)  
**Rationale**: The spec describes a "screen" (full page), not a modal or tab. A dedicated route fits naturally under the existing `/app/proposals/` segment. Navigation from the proposals list row is via a link/button on `ProposalRow.tsx`.  
**Alternatives considered**:
- Modal/Dialog overlay on the proposals list: Doesn't fit the "screen" description; hard to bookmark or link to.
- Tab within a proposal detail page: Proposal detail page doesn't exist yet; adding tabs would be a larger refactor.

## 6. Price Data Type

**Decision**: `numeric(12,2)` in PostgreSQL; transferred as `number` in JSON; displayed/edited as string in the input field  
**Rationale**: Matches the existing `estimated_value` column type in `proposals`. `numeric(12,2)` prevents floating-point precision issues. The API layer parses the string to a JS `number` (via `parseFloat`) and Supabase handles the DB coercion. Max storable price: $9,999,999,999.99 — adequate for outdoor construction contracts.

## 7. Running Total Calculation

**Decision**: Pure client-side computation: `sum of parseFloat(priceString) || 0` across all price state values  
**Rationale**: No server call needed. The total is derived from the current form state on every render. Memoization (useMemo) is not needed for ≤50 inputs on modern hardware.  
**Alternatives considered**:
- Server-computed total stored in DB: Over-engineering; total can go stale and adds a derived-data problem.
- `useMemo` for total: Acceptable but unnecessary at this scale.

## 8. Post-Save Reload Strategy

**Decision**: After a successful PATCH response, re-fetch the services list from the server using the Next.js `router.refresh()` pattern (or a local state reset from the API response)  
**Rationale**: `router.refresh()` triggers a server component re-render for the page, which re-fetches from Supabase server-side. This keeps data canonical. The client component receives updated props. Consistent with the "server-authoritative" App Router pattern.  
**Alternatives considered**:
- Optimistic update (skip reload): Violates FR-005 ("reload from server after successful PATCH").
- Full page navigation: Causes flash and loses scroll position unnecessarily.
