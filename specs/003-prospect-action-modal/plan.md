# Implementation Plan: Prospect Action Modal

**Branch**: `003-prospect-action-modal` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-prospect-action-modal/spec.md`

## Summary

Add a per-prospect action modal accessible via an "Actions" button in each prospect (proposal) list row. The modal consolidates: a voice memo text field (save/update to DB), a placeholder "Generate Quote" button, a "Services" navigation button, and a "Delete Prospect" destructive action. The "Services" link and "Remove" button are removed from the list row and exist only in the modal. A new `voice_memo` text column is added to the `proposals` table via migration.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode (`strict: true`)
**Primary Dependencies**: Next.js 15 (App Router), React 19, Radix UI Dialog (`@radix-ui/react-dialog`), shadcn/ui component library, Tailwind CSS, Supabase JS v2
**Storage**: PostgreSQL via Supabase — `proposals` table, new `voice_memo text` column
**Testing**: Vitest (unit), existing API route test pattern in `nextjs/src/app/api/app/proposals/__tests__/`
**Target Platform**: Web (server-rendered Next.js app, SSR + client components)
**Project Type**: Web application (SaaS template)
**Performance Goals**: Modal open must be instant (data pre-loaded in list query); memo save API MUST respond within 500ms p95 (constitution)
**Constraints**: TypeScript strict — no `any`; shadcn/ui components only; dark mode required; WCAG 2.1 AA; RLS on all DB operations; no bundle size regression (initial JS ≤ 200 kB gzipped)
**Scale/Scope**: Single-table change; 2 new files, 3 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| TypeScript strict — no `any` | PASS | New code will use `ProposalRow` type extended with `voice_memo: string \| null` |
| Tests required for new logic | PASS | Unit test for modal component state; API route test for PATCH /memo |
| shadcn/ui + Tailwind only | PASS | Uses existing `Dialog`, `Textarea`, `Button` from `@/components/ui` |
| Dark mode supported | PASS | All shadcn/ui components use CSS variables with dark mode |
| ARIA labels + WCAG 2.1 AA | PASS | `DialogContent` from Radix handles focus trap + ARIA; explicit labels on Textarea |
| Loading + error states mandatory | PASS | Save and delete ops show loading/error states per FR-005/006/011 |
| RLS on all DB ops | PASS | Existing `proposals_update_own` RLS policy covers UPDATE; no new policy needed |
| No hardcoded secrets | PASS | Uses existing Supabase SSR client pattern |
| Migration file for schema change | PASS | New migration for `voice_memo` column required |
| API input validated at boundary | PASS | PATCH handler validates `voice_memo` is string or null before DB write |

**Post-Phase-0 re-check**: All gates still pass — no violations introduced by research findings.
**Post-Phase-1 re-check**: All gates still pass — contracts and data model are consistent with RLS and type constraints.

## Project Structure

### Documentation (this feature)

```text
specs/003-prospect-action-modal/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    └── patch-memo.md    # Phase 1 output — PATCH /api/app/proposals/[id]/memo contract
```

### Source Code (repository root)

```text
nextjs/src/
├── app/
│   └── api/
│       └── app/
│           └── proposals/
│               └── [id]/
│                   ├── route.ts                  # existing — DELETE (unchanged)
│                   └── memo/
│                       └── route.ts              # NEW — PATCH voice_memo
├── components/
│   └── proposals/
│       ├── ProspectActionModal.tsx               # NEW — Dialog with memo, services, delete
│       ├── ProposalRow.tsx                       # MODIFY — add Actions button, remove Services/Remove
│       └── ProposalsView.tsx                     # MODIFY — pass memo-update handler into rows
└── lib/
    └── types.ts                                  # MODIFY — add voice_memo to proposals Row/Update

supabase/migrations/
└── 20260504130000_add_voice_memo.sql             # NEW — ALTER TABLE proposals ADD COLUMN voice_memo
```

## Complexity Tracking

No constitution violations — this section is intentionally blank.
