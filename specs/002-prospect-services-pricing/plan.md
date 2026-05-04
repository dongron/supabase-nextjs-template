# Implementation Plan: Prospect Services & Pricing

**Branch**: `002-prospect-services-pricing` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-prospect-services-pricing/spec.md`

## Summary

Add a Services & Pricing sub-screen to each prospect (proposal) that displays a single editable form listing all catalog services with per-prospect price overrides. A single PATCH operation saves the full price set; the list reloads automatically on success. A running total updates in real-time as the user edits prices. Two new Supabase tables are introduced: `services` (catalog, owner-scoped) and `prospect_services` (per-prospect price assignments). The API exposes a bulk-upsert PATCH route at `PATCH /api/app/proposals/[id]/services`.

## Technical Context

**Language/Version**: TypeScript 5 with `strict: true` — Next.js 15 (App Router)
**Primary Dependencies**: React 18, shadcn/ui, Tailwind CSS, Supabase JS (`@supabase/ssr`)
**Storage**: PostgreSQL (Supabase) — two new tables: `services`, `prospect_services`
**Testing**: Vitest + React Testing Library (unit); Vitest route handler tests (integration)
**Target Platform**: Web (Next.js on Node.js / Vercel)
**Project Type**: Web application — feature addition to existing SaaS template
**Performance Goals**: Core Web Vitals (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms); PATCH API ≤ 500 ms p95
**Constraints**: DB queries on indexed columns; no N+1 patterns; single PATCH per save interaction
**Scale/Scope**: Per-owner service catalog (≈10–50 services); per-prospect pricing rows; single-tenant RLS pattern

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — TypeScript strict, no `any`, single responsibility, ESLint/Prettier | PASS | All new code follows strict TS patterns established in the codebase |
| I. Code Quality — No dead code / console statements | PASS | Enforced by existing ESLint config |
| II. Testing Standards — Unit tests for utility functions, hooks, business logic | PASS | `lib/services.ts` helpers will have Vitest unit tests |
| II. Testing Standards — Integration tests for API routes and RLS policies | PASS | Route handler tests + Supabase RLS policy tests required |
| II. Testing Standards — E2E for critical flows | PASS | Services pricing form is not in the constitution's named critical flows (auth, MFA, file upload, task CRUD); unit + integration coverage sufficient |
| II. Testing Standards — Coverage ≥ 80% for new code | PASS | Targeted via Vitest coverage config |
| III. UX Consistency — shadcn/ui + Tailwind CSS | PASS | ServicesForm uses existing component primitives |
| III. UX Consistency — Dark mode support | PASS | CSS variable system used throughout; no hardcoded colours |
| III. UX Consistency — Focus states, ARIA labels, WCAG 2.1 AA | PASS | Price inputs labelled with service name; form has accessible structure |
| III. UX Consistency — Loading and error states mandatory | PASS | Save button shows loading state; toast for success/error |
| III. UX Consistency — Mobile responsiveness (NON-NEGOTIABLE) | JUSTIFIED DEVIATION | See Complexity Tracking |
| IV. Performance — Core Web Vitals targets | PASS | Server-rendered initial load; minimal client JS delta |
| IV. Performance — API ≤ 500 ms p95 | PASS | Bulk upsert of ≤50 rows is well within budget |
| IV. Performance — Bundle ≤ 200 kB gzipped | PASS | No new heavy dependencies |
| IV. Performance — Indexed WHERE/ORDER BY columns | PASS | Indexes defined in migration (see data-model.md) |
| V. Security — RLS on every new table | PASS | Both `services` and `prospect_services` have RLS with explicit policies |
| V. Security — `getUser()` server-side for access control | PASS | Route handler pattern mirrors existing proposals route |
| V. Security — Input validated at API boundary | PASS | Manual validation in the PATCH route handler mirrors existing `proposals/route.ts` pattern; no Zod installed |
| V. Security — No hardcoded secrets | PASS | No credentials in code |
| Dev Workflow — Supabase migration file per schema change | PASS | Two migration files will be created |

**Pre-design gate**: PASS with one justified deviation (mobile layout).

## Project Structure

### Documentation (this feature)

```text
specs/002-prospect-services-pricing/
├── plan.md          # This file
├── research.md      # Phase 0 output
├── data-model.md    # Phase 1 output
├── quickstart.md    # Phase 1 output
├── contracts/
│   └── api.md       # Phase 1 output
└── tasks.md         # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
nextjs/src/
├── app/
│   ├── app/proposals/[id]/
│   │   └── services/
│   │       └── page.tsx                       # Server component: auth check, data fetch, render
│   └── api/app/proposals/[id]/services/
│       ├── route.ts                           # PATCH handler (bulk upsert via Supabase upsert)
│       └── __tests__/
│           └── route.test.ts                  # Integration tests for PATCH handler
├── components/proposals/
│   ├── ServicesForm.tsx                       # 'use client' controlled form; all service rows + total
│   └── ServiceRow.tsx                         # Single row: service name, description, price input
└── lib/
    ├── services.ts                            # Types (ServiceCatalogRow, ProspectServiceRow) + calcTotal()
    └── supabase/
        └── services.ts                        # fetchProspectServices(), pure Supabase queries

supabase/migrations/
├── 20260504120000_services.sql                # services table + RLS + seed (10 example services)
└── 20260504120001_prospect_services.sql       # prospect_services table + RLS + composite index
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Principle III: Mobile responsiveness — the spec explicitly scopes this form to desktop/tablet only | The Services & Pricing form is a back-office staff tool with a tabular layout (service name, description, price input across 10+ rows). A cramped mobile layout produces worse UX than a clear desktop-only message. | A card-stack mobile layout would require significant extra design work outside the feature scope; the product owner explicitly excluded it from v1. Deviation is scoped to this screen only and can be addressed in v2. |
