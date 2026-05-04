# Implementation Plan: Claude Quote Generation

**Branch**: `004-claude-quote-generation` | **Date**: 2026-05-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-claude-quote-generation/spec.md`

## Summary

Add AI-powered quote generation to the Prospect Action Modal. When staff click "Generate Quote", the system sends the prospect's voice memo and services catalog to Claude (`claude-3-5-sonnet`) via a server-side Next.js API route. Claude extracts service names and prices from the memo and returns a structured JSON list. A "Review Quote" modal opens for staff to edit, add, or delete rows before saving. The final quote is stored as JSON-serialized text in a new `quote` column on the `proposals` table and displayed back inside the action modal as a readable list.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode)
**Primary Dependencies**: Next.js 15, React 19, `@anthropic-ai/sdk` (Claude API client), shadcn/ui, Tailwind CSS, Supabase JS v2
**Storage**: PostgreSQL via Supabase — new `quote text` column on `proposals` table; no new tables
**Testing**: Vitest + React Testing Library + `@testing-library/user-event`
**Target Platform**: Web (Next.js App Router, SSR + client components)
**Project Type**: Web application feature addition
**Performance Goals**: Claude API call completes within 15 s (SC-001); save PATCH responds within 500 ms
**Constraints**: API key (`PRIVATE_CALUDE_API_KEY`) server-side only; Claude model fixed to `claude-3-5-sonnet`; quote field is plain `text`, stored as `JSON.stringify`
**Scale/Scope**: Single-user SaaS; no concurrency concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality (TypeScript strict, no `any`, single responsibility) | PASS | All new code will use TypeScript strict; `unknown` with narrowing for Claude response |
| II. Testing Standards (unit tests for logic, integration for routes, 80% coverage) | PASS | Tests planned for `lib/quote.ts`, API route handlers, and ReviewQuoteModal component |
| III. UX Consistency (shadcn/ui, dark mode, loading states, WCAG AA) | PASS | Using existing Dialog + Input + Button components; loading/error states required by FR-010/FR-011 |
| IV. Performance (<500ms p95 for API routes) | **JUSTIFIED EXCEPTION** | AI generation route will take 3–15 s — see Complexity Tracking |
| V. Security (RLS, env vars, server-side auth) | PASS | `PRIVATE_CALUDE_API_KEY` read server-side only; auth guard on all new routes; `quote` field protected by existing RLS `owner = auth.uid()` |

## Project Structure

### Documentation (this feature)

```text
specs/004-claude-quote-generation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created by /speckit.plan)
```

### Source Code (repository root)

```text
nextjs/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── app/
│   │           └── proposals/
│   │               └── [id]/
│   │                   ├── quote/
│   │                   │   └── route.ts          # NEW — POST (generate via Claude) + PATCH (save)
│   │                   └── __tests__/
│   │                       └── quote.test.ts     # NEW — unit tests for quote route
│   ├── components/
│   │   └── proposals/
│   │       ├── ProspectActionModal.tsx           # MODIFIED — wire Generate Quote + quote display
│   │       ├── ReviewQuoteModal.tsx              # NEW — editable services list modal
│   │       └── __tests__/
│   │           └── ReviewQuoteModal.test.tsx     # NEW — component unit tests
│   └── lib/
│       ├── quote.ts                              # NEW — QuoteService type + parse/normalize utils
│       ├── quote.test.ts                         # NEW — unit tests for lib/quote.ts
│       └── types.ts                             # MODIFIED — add `quote` field to proposals Row/Update
└── supabase/
    └── migrations/
        └── 20260504140000_add_quote_to_proposals.sql   # NEW — adds quote text column + updates types
```

**Structure Decision**: Single Next.js project. New API route under the existing `[id]` segment. New `ReviewQuoteModal` component alongside `ProspectActionModal`. New `lib/quote.ts` for pure utility functions (type definitions, JSON parsing, price normalization). Existing `lib/types.ts` updated to add `quote` to the database Row type.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Performance Principle IV: AI route exceeds 500ms p95 | Claude `claude-3-5-sonnet` inference takes 3–15 s; this is inherent to LLM API calls | Cannot batch or cache the call — it processes unique memo content per request. Loading state + SC-001 (15 s target) is the appropriate SLA for this operation |
