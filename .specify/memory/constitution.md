<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.0.1 (explicit scope section added; supabase-expo-template excluded)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (5 principles)
  - Security Requirements
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (Constitution Check section already present)
  - .specify/templates/spec-template.md ✅ (user stories + acceptance criteria aligned)
  - .specify/templates/tasks-template.md ✅ (test tasks structure aligned)
Follow-up TODOs: none
-->

# Supabase Next.js SaaS Template Constitution

## Scope

This constitution applies exclusively to the `nextjs/` application and the `supabase/` backend
(migrations, RLS policies, storage config). The `supabase-expo-template/` directory is
**explicitly out of scope** and is governed separately.

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All code MUST be written in TypeScript with strict mode enabled (`strict: true`).
The `any` type is forbidden; use `unknown` with explicit narrowing or define a concrete type.
All functions, components, and modules MUST have a single, clear responsibility.
Linting (ESLint) and formatting (Prettier) MUST pass before any commit. No `// eslint-disable` comments
without a documented justification in the same line. Dead code, commented-out blocks, and console
statements MUST NOT be merged to `main`.

**Rationale**: This is a public SaaS template — the code is the product. Quality directly affects
adoption and trust.

### II. Testing Standards

Every new feature MUST include tests before the implementation is considered complete.
Unit tests are required for all utility functions, hooks, and business logic.
Integration tests are required for all API routes and Supabase RLS policies.
End-to-end tests (Playwright or similar) are required for all critical user flows:
authentication, MFA, file upload, and task CRUD.
Test coverage for new code MUST NOT drop below 80%. Tests MUST be deterministic and must not
depend on network calls or external state unless explicitly marked as integration tests.

**Rationale**: The template is used as a foundation by other teams. Untested code that ships as a
template multiplies technical debt across every project built on it.

### III. User Experience Consistency (NON-NEGOTIABLE)

All UI MUST be built using the existing component library (shadcn/ui + Tailwind CSS).
Dark mode MUST be supported for every new component using the established CSS variable system.
All interactive elements MUST have visible focus states, ARIA labels where required, and meet
WCAG 2.1 AA contrast requirements.
Loading states and error states are MANDATORY for every async operation — no silent failures.
Mobile responsiveness is required for all new pages and components (mobile-first approach).

**Rationale**: Inconsistent UX undermines the "production-ready" promise of the template.

### IV. Performance Requirements

Core Web Vitals targets for the Next.js app:
- LCP (Largest Contentful Paint): MUST be ≤ 2.5s on a simulated mid-tier mobile connection
- CLS (Cumulative Layout Shift): MUST be ≤ 0.1
- INP (Interaction to Next Paint): MUST be ≤ 200ms

API routes MUST respond within 500ms at p95 under typical load.
Bundle size for the initial JS payload MUST NOT exceed 200 kB (gzipped).
Images MUST use Next.js `<Image>` with appropriate `sizes` and `priority` attributes.
Database queries MUST use indexed columns in `WHERE` and `ORDER BY` clauses; N+1 queries are forbidden.

**Rationale**: Performance is a feature. The template sets expectations for projects built on top
of it; slow defaults propagate to end users.

### V. Security by Default (NON-NEGOTIABLE)

Every Supabase table MUST have Row Level Security (RLS) enabled with explicit policies — no
open tables. New storage buckets MUST define access policies before data can be written.
Secrets, API keys, and credentials MUST only exist in environment variables — never hardcoded
or committed to the repository.
Authentication state MUST always be verified server-side using `supabase.auth.getUser()`;
client-side `getSession()` alone is insufficient for access control decisions.
All user inputs MUST be validated at the API boundary before reaching the database.
Dependencies MUST be audited (`pnpm audit`) before release; high or critical vulnerabilities
MUST be resolved before merging.

**Rationale**: Security issues in a template propagate to every downstream project. Secure defaults
are non-optional.

## Security Requirements

- RLS policies MUST be written and reviewed for every migration that creates a table or bucket.
- OAuth/SSO integrations MUST use PKCE flow; implicit flow is forbidden.
- MFA flows MUST be tested end-to-end before any auth-related feature is marked complete.
- Sensitive user data (email, profile fields) MUST NOT be logged in production.
- CORS and CSP headers MUST be configured appropriately in `next.config.ts`.

## Development Workflow

1. **Branch naming**: `###-short-description` (e.g., `001-user-profiles`). Use Speckit feature
   branching via `/speckit.git.feature`.
2. **Spec before code**: Every non-trivial feature MUST have a spec (`spec.md`) and a plan
   (`plan.md`) before implementation begins.
3. **Constitution Check**: Every `plan.md` MUST include a Constitution Check gate that is signed
   off before Phase 0 research proceeds.
4. **Review gates**: All PRs MUST pass lint, type-check, and test CI before merge. No bypassing
   with `--no-verify`.
5. **Migration discipline**: Every schema change MUST be represented as a Supabase migration file.
   Direct schema edits on production are forbidden.
6. **Changelog**: Breaking changes MUST be documented in `README.md` with a migration path before
   the PR is merged.

## Governance

This constitution supersedes all other informal practices and README guidance where conflicts exist.
Amendments require:
1. A written rationale (in the PR description or a linked issue).
2. Version bump following semantic versioning:
   - MAJOR: removal or redefinition of a principle.
   - MINOR: new principle or section added.
   - PATCH: wording clarifications, typo fixes, non-semantic changes.
3. Update of `LAST_AMENDED_DATE` and `CONSTITUTION_VERSION` in this file.
4. Review of all Speckit templates for consistency after any MAJOR or MINOR bump.

All contributors are expected to read and comply with this constitution. Non-compliance identified
in code review MUST be resolved before merge — it is never acceptable to defer a constitution
violation as "future cleanup".

**Version**: 1.0.1 | **Ratified**: 2026-05-04 | **Last Amended**: 2026-05-04

> **Out of scope**: `supabase-expo-template/` is explicitly excluded from this constitution.
