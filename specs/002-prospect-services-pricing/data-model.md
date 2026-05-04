# Data Model: Prospect Services & Pricing

## Entities

### 1. `services` (catalog table)

Represents a type of billable work offered by the company. Shared across all prospects for a given owner account.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation timestamp |
| `owner` | `uuid` | NOT NULL, FK → auth.users(id) ON DELETE CASCADE | Account owner (RLS scope) |
| `name` | `text` | NOT NULL | Service display name |
| `description` | `text` | NOT NULL DEFAULT '' | Short description shown in the form row |
| `default_price` | `numeric(12,2)` | NOT NULL DEFAULT 0, CHECK ≥ 0 | Catalog default price used when no prospect override exists |
| `sort_order` | `integer` | NOT NULL DEFAULT 0 | Display order in the form |

**Indexes**:
- PK on `id`
- `services_owner_sort_idx` on `(owner, sort_order)` — supports `ORDER BY sort_order` filtered by owner

**RLS policies**:
```sql
-- SELECT: owner can read their own services
CREATE POLICY "services_select_own" ON public.services
  FOR SELECT TO authenticated USING (auth.uid() = owner);

-- INSERT/UPDATE/DELETE: owner manages their own catalog
CREATE POLICY "services_insert_own" ON public.services
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner);

CREATE POLICY "services_update_own" ON public.services
  FOR UPDATE TO authenticated USING (auth.uid() = owner);

CREATE POLICY "services_delete_own" ON public.services
  FOR DELETE TO authenticated USING (auth.uid() = owner);
```

---

### 2. `prospect_services` (assignment table)

Stores the per-prospect price override for each service. One row per (prospect, service) pair.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `prospect_id` | `uuid` | NOT NULL, FK → proposals(id) ON DELETE CASCADE | The prospect this price is for |
| `service_id` | `uuid` | NOT NULL, FK → services(id) ON DELETE CASCADE | The service being priced |
| `price` | `numeric(12,2)` | NOT NULL DEFAULT 0, CHECK ≥ 0 | Prospect-specific price override |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | First assignment timestamp |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last update timestamp |

**Unique constraint**: `UNIQUE(prospect_id, service_id)` — ensures one price row per pair, enables `ON CONFLICT DO UPDATE` upsert.

**Indexes**:
- PK on `id`
- `prospect_services_prospect_idx` on `(prospect_id)` — fast lookup for all services of a prospect
- Implicit unique index from the UNIQUE constraint covers `(prospect_id, service_id)`

**RLS policies**:
```sql
-- SELECT: authenticated user can read their own prospect_services
CREATE POLICY "prospect_services_select_own" ON public.prospect_services
  FOR SELECT TO authenticated
  USING (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );

-- INSERT: same scope check
CREATE POLICY "prospect_services_insert_own" ON public.prospect_services
  FOR INSERT TO authenticated
  WITH CHECK (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );

-- UPDATE: same scope check
CREATE POLICY "prospect_services_update_own" ON public.prospect_services
  FOR UPDATE TO authenticated
  USING (
    prospect_id IN (SELECT id FROM public.proposals WHERE owner = auth.uid())
  );
```

---

## Relationships

```
auth.users (1) ──< proposals (N) ──< prospect_services (N) >── services (1) >── auth.users
                                                                 (owner = proposals.owner)
```

- Each `auth.users` row owns N `proposals` (existing).
- Each `auth.users` row owns N `services` (new catalog).
- Each `proposals` row has N `prospect_services` rows.
- Each `services` row can appear in N `prospect_services` rows (across different prospects).

---

## Derived View (application layer, not DB view)

`ServicesPricingRow` — the shape rendered per row in the form:

```typescript
type ServicesPricingRow = {
  service_id: string;       // from services.id
  name: string;             // from services.name
  description: string;      // from services.description
  default_price: number;    // from services.default_price
  price: number;            // from prospect_services.price (or default_price if no row exists)
};
```

This is assembled in `lib/supabase/services.ts` by fetching all services for the owner, then LEFT JOINing with `prospect_services` for the given `prospect_id`.

---

## State Transitions

`prospect_services.price` is updated in place on every PATCH. There are no stage-based transitions; the value is always the latest saved price.

`prospect_services.updated_at` is updated via a Postgres trigger (`moddatetime` extension) or inline in the upsert: `updated_at = now()`.

---

## Seed Data (development environment)

10 example services seeded in `supabase/seed.sql` (owner bound to the default dev user, or using a sentinel):

| sort_order | name | default_price |
|-----------|------|---------------|
| 1 | Landscape Design Consultation | 2500.00 |
| 2 | Custom Stone Patio Installation | 18000.00 |
| 3 | Swimming Pool Construction | 85000.00 |
| 4 | Outdoor Kitchen & BBQ Area | 22000.00 |
| 5 | Pergola / Gazebo Construction | 14000.00 |
| 6 | Irrigation System Installation | 6500.00 |
| 7 | Outdoor Lighting Design & Installation | 8000.00 |
| 8 | Retaining Wall Construction | 12000.00 |
| 9 | Driveway & Pathways Paving | 16000.00 |
| 10 | Garden Planting & Landscaping | 9500.00 |

---

## Constitution Check (post-design)

| Concern | Status |
|---------|--------|
| RLS enabled on both new tables | PASS |
| All FK columns indexed | PASS — `prospect_id` has explicit index; `service_id` covered by unique constraint index |
| `WHERE` / `ORDER BY` use indexed columns | PASS — `owner`, `sort_order`, `prospect_id` all indexed |
| No N+1: prospect services fetched in one query | PASS — single `select` with embedded LEFT JOIN via Supabase |
| `numeric(12,2)` matches existing `estimated_value` type | PASS |
