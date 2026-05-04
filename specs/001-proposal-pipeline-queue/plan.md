# Implementation Plan: Proposal Pipeline Queue

**Branch**: `001-proposal-pipeline-queue` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/001-proposal-pipeline-queue/spec.md`

## Summary

A CEO-facing read-mostly queue page that displays all active proposals sorted by urgency, with real-time tinting for stalled "Ready for review" rows, an inline action to notify The Designer and record an ETA, and a dismissible "Needs attention" flag for low-confidence line items.

**Technical approach**: New `proposals` PostgreSQL table with RLS + a generated `render_required` column; a Next.js Server Component page that fetches and renders the sorted queue; two PATCH API routes for the inline mutations; three new React client components (queue, row, designer dialog).

## Technical Context

**Language/Version**: TypeScript 5, Next.js 15 (App Router), React 19  
**Primary Dependencies**: `@supabase/ssr` 0.5, `@supabase/supabase-js` 2.47, shadcn/ui + Tailwind CSS 3, Radix UI Dialog, lucide-react  
**Storage**: PostgreSQL via Supabase (new `proposals` table)  
**Testing**: ESLint + TypeScript strict mode (existing tooling); manual integration testing via Supabase Studio + seed data  
**Target Platform**: Desktop/laptop browser; Next.js deployed on Vercel  
**Project Type**: Web application (SaaS template, App Router)  
**Performance Goals**: API routes ≤ 500ms p95; page LCP ≤ 2.5s; bundle delta ≤ 10 kB gzipped  
**Constraints**: No real-time subscription (manual refresh); single authenticated user (CEO); archive not delete; mobile out of scope for v1  
**Scale/Scope**: Single user; at most a few dozen active proposals at any time; 1 new page, 3 components, 2 API routes, 1 migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality — TypeScript strict, no `any`, single responsibility | ✅ PASS | All new files use strict TypeScript; `any` forbidden; each file has one clear responsibility |
| I. Code Quality — ESLint + Prettier must pass | ✅ PASS | No new exceptions; existing tooling applies |
| II. Testing — unit tests for utilities, integration tests for RLS and API routes | ✅ PASS | `isOverdueReview()`, `isRenderEtaOverdue()`, `sortProposals()` require unit tests; RLS policies and API routes require integration tests |
| III. UX — shadcn/ui + Tailwind, dark mode, ARIA, WCAG AA, loading + error states | ✅ PASS | Row uses existing Tailwind CSS variables for tint; Radix Dialog from existing stack; loading/error states mandatory on all async ops |
| III. UX — mobile responsiveness | ⚠️ SCOPED | Spec explicitly defers mobile to v1; desktop layout acceptable; no constitution violation as scope is documented |
| IV. Performance — LCP ≤ 2.5s, INP ≤ 200ms, bundle ≤ 200 kB, indexed queries | ✅ PASS | Server Component fetch avoids client bundle cost; `(owner, stage)` and `stage_entered_at` indexes defined; N+1 not possible (single query) |
| V. Security — RLS on all tables, server-side auth via `getUser()`, input validation at API boundary | ✅ PASS | RLS with 3 policies (SELECT/INSERT/UPDATE); Server Component uses `getUser()`; API routes validate inputs before DB write |
| V. Security — no hardcoded secrets | ✅ PASS | All credentials via environment variables |
| Dev Workflow — migration file for schema change | ✅ PASS | Migration SQL documented in data-model.md; file to be created under `supabase/migrations/` |

**Constitution Check: PASS — No violations. Cleared to proceed.**

## Project Structure

### Documentation (this feature)

```text
specs/001-proposal-pipeline-queue/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/
│   └── api.md           # Phase 1 output ✅
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code

```text
nextjs/src/
├── app/
│   ├── app/
│   │   └── proposals/
│   │       └── page.tsx                    # NEW — Server Component queue page
│   └── api/
│       └── app/
│           └── proposals/
│               └── [id]/
│                   ├── designer/
│                   │   └── route.ts        # NEW — PATCH designer notification + ETA
│                   └── dismiss-attention/
│                       └── route.ts        # NEW — PATCH dismiss needs_attention flag
├── components/
│   └── proposals/
│       ├── ProposalQueue.tsx               # NEW — client component, table container
│       ├── ProposalRow.tsx                 # NEW — client component, single row with actions
│       └── DesignerNotifyDialog.tsx        # NEW — Radix Dialog for inline ETA entry
└── lib/
    ├── proposals.ts                        # NEW — types, constants, utility functions
    └── supabase/
        └── proposals.ts                    # NEW — fetchProposalQueue server function

supabase/migrations/
└── YYYYMMDDHHMMSS_proposals.sql            # NEW — proposals table + RLS + indexes
```

**Modified files**:
- `nextjs/src/components/AppLayout.tsx` — add Proposals nav entry
- `nextjs/src/lib/types.ts` — regenerated after migration (supabase gen types)

**Structure Decision**: Web application layout. New feature lives entirely within the existing `nextjs/src/` tree using the established patterns: App Router pages in `app/`, reusable components in `components/`, shared logic in `lib/`.
