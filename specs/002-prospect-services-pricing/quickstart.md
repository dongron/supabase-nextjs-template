# Quickstart: Prospect Services & Pricing

## Prerequisites

- Supabase CLI installed and local Supabase running (`supabase start`)
- Node.js ≥ 18 with pnpm installed
- `.env.local` configured with Supabase URL and anon key

## 1. Run Migrations

```bash
cd /Users/dominik/projects/supabase-nextjs-template
supabase db reset   # or: supabase migration up
```

This creates:
- `public.services` table with RLS policies
- `public.prospect_services` table with RLS policies and composite unique constraint
- Seeds 10 example services into `services` (for the dev user defined in `seed.sql`)

## 2. Verify Tables

```bash
supabase db diff --schema public
# Expect: services, prospect_services tables listed
```

Or in the Supabase Studio (http://localhost:54323):
- Table Editor → `services` → confirm 10 rows seeded
- Table Editor → `prospect_services` → confirm empty (populated via the UI)

## 3. Start the Dev Server

```bash
cd nextjs
pnpm dev
```

## 4. Navigate to a Prospect's Services Screen

1. Log in at `http://localhost:3000/auth/login`
2. Go to **Proposals** in the sidebar
3. Click any proposal row → opens `/app/proposals/[id]/services`
4. You should see the services form with 10 rows and default prices
5. Edit one or more prices → click **Save** → observe the list reloads with updated values

## 5. Run Tests

```bash
cd nextjs
pnpm test                    # unit tests (lib/services.ts helpers)
pnpm test src/app/api/app/proposals  # route handler integration tests
```

## Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/*_services.sql` | `services` table DDL + RLS + seed |
| `supabase/migrations/*_prospect_services.sql` | `prospect_services` table DDL + RLS |
| `nextjs/src/lib/services.ts` | TypeScript types + `calcTotal()` helper |
| `nextjs/src/lib/supabase/services.ts` | `fetchProspectServices()` data access |
| `nextjs/src/app/app/proposals/[id]/services/page.tsx` | Server component — auth + data fetch |
| `nextjs/src/app/api/app/proposals/[id]/services/route.ts` | PATCH handler |
| `nextjs/src/components/proposals/ServicesForm.tsx` | Client form component |
| `nextjs/src/components/proposals/ServiceRow.tsx` | Single service input row |

## Troubleshooting

**No services appear in the form**
→ Check that `seed.sql` ran and that your dev user's `id` matches the `owner` in the `services` table. Run `supabase db reset` to re-seed.

**PATCH returns 401**
→ Your session cookie expired. Log out and back in.

**PATCH returns 500**
→ Check that both migration files ran and the `prospect_services` unique constraint exists:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'prospect_services';
```

**Total shows NaN**
→ A price field has an invalid non-numeric value. The client-side guard should prevent this; if seen, check `calcTotal()` in `lib/services.ts`.
