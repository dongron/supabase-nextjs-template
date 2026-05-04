# Research: Claude Quote Generation

**Feature**: 004-claude-quote-generation
**Phase**: 0 — Pre-Design Research
**Date**: 2026-05-04

---

## 1. Anthropic SDK for Node.js

**Decision**: Use `@anthropic-ai/sdk` (official Anthropic Node.js client)
**Install**: `pnpm add @anthropic-ai/sdk`
**Rationale**: Official SDK handles retries, type-safe request/response shapes, and proper error hierarchies. No custom HTTP fetch needed.
**Alternatives considered**: Raw `fetch` to `https://api.anthropic.com/v1/messages` — rejected because the SDK provides `Anthropic.APIError` subclass hierarchy and response types for free.

---

## 2. Claude Model Selection

**Decision**: `claude-3-5-sonnet-20241022`
**Rationale**: Balances extraction accuracy, response speed (3–8 s typical), and cost. Satisfies SC-001 (≤15 s) comfortably.
**Context window**: 200 000 tokens — far exceeds any expected memo + services catalog payload.
**Max output tokens**: 1024 is sufficient; ~10 services ≈ 150–200 tokens JSON output.
**Alternatives considered**: `claude-haiku-3-5` (faster, cheaper, lower extraction quality), `claude-opus-4` (highest quality, slowest, most expensive) — both rejected in spec clarification.

---

## 3. Structured JSON Output Strategy

**Decision**: Tool use (`tools` + `tool_choice: { type: "any" }`) with an `extract_services` tool definition
**Rationale**: Claude's tool-use mode guarantees the output is a validated JSON object matching the declared input schema. No fragile `JSON.parse` on free-text output. If Claude cannot extract, it returns an empty `services: []` rather than malformed text.
**Schema**:
```json
{
  "type": "object",
  "properties": {
    "services": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "serviceId":   { "type": ["string", "null"] },
          "serviceName": { "type": "string" },
          "price":       { "type": ["number", "null"] }
        },
        "required": ["serviceId", "serviceName", "price"]
      }
    }
  },
  "required": ["services"]
}
```
**Alternatives considered**: Plain text response + `JSON.parse` — rejected because any markdown fence or explanation from Claude would cause a parse failure that is hard to distinguish from an empty result. Tool use makes the failure mode explicit.

---

## 4. Malformed / Empty Response Handling

**Decision**: If `content` block is not `tool_use`, or if `toolUse.input` does not have a `services` array, return a structured error to the client (HTTP 422) with message "Claude did not return a valid services list". The client shows this as the inline "Try Again" error (FR-011).
**Rationale**: Explicit error is better than silently opening a modal with zero rows.

---

## 5. Error Types from SDK

| Scenario | Error Class | HTTP Status |
|---|---|---|
| Invalid API key | `Anthropic.AuthenticationError` | 401 |
| Rate limited | `Anthropic.RateLimitError` | 429 |
| Model overload | `Anthropic.APIError` (status 529) | 529 |
| Network / timeout | `Anthropic.APIConnectionError` | — |
| Bad request | `Anthropic.BadRequestError` | 400 |

All caught under `Anthropic.APIError` base class. Non-API errors (network) caught with generic `catch`.

---

## 6. Prompt Construction

**Decision**: The services catalog is injected into the **user message** (not the system prompt) as a JSON array of `{ id, name }` pairs only — default_price deliberately excluded to avoid anchoring Claude's extraction.
**User message template**:
```
Voice memo:
"""
{voice_memo}
"""

Services catalog (match by name to find serviceId):
{JSON.stringify(services.map(s => ({ id: s.id, name: s.name })))}
```
**Rationale**: Keeping the system prompt stable and moving variable data to the user turn is the recommended Claude pattern for templated extraction. Excluding `default_price` prevents Claude from echoing catalog prices when the memo specifies a different amount.
**Alternatives considered**: Injecting full services catalog with prices into system prompt — rejected because system prompt caching could serve stale catalog data in a multi-user scenario (low risk now, but bad practice).

---

## 7. Database: Adding `quote` Column

**Decision**: Single `text` column named `quote` on the `proposals` table. Nullable. Stores `JSON.stringify({ services: QuoteService[] })`.
**Migration**: New file `supabase/migrations/20260504140000_add_quote_to_proposals.sql`
**RLS**: No new policies needed — `quote` lives on `proposals` which already has `owner = auth.uid()` policies for SELECT, UPDATE, DELETE.
**Alternatives considered**: Separate `quotes` table — rejected because one quote per prospect at a time, no history requirement, and storing as text on the existing row is simpler and avoids a JOIN.

---

## 8. API Route Design

Two operations on the same route segment `POST /api/app/proposals/[id]/quote`:
- **POST**: Calls Claude, returns extracted services list (does NOT save to DB — client reviews first)
- **PATCH**: Saves the reviewed/edited services list to `proposals.quote`

**Rationale**: Separating generation (POST) from persistence (PATCH) lets the client validate the AI output before committing. This matches the spec's "Review Quote" modal flow.

---

## 9. Price Normalization on Save

**Decision**: On PATCH, for each service row:
1. Take the raw `price` string from the request body
2. Strip all non-numeric and non-decimal characters: `price.toString().replace(/[^0-9.]/g, '')`
3. Parse with `parseFloat`; if `NaN` or empty string, store as `null`

**Rationale**: Matches spec FR-008 and clarification answer B (strip silently, blank → null).

---

## 10. `types.ts` Update

The generated `lib/types.ts` (from Supabase CLI) needs to be manually updated to add `quote: string | null` to `proposals.Row` and `proposals.Update`. Running `supabase gen types` after migration will regenerate this automatically. The plan calls for a manual patch of `types.ts` to unblock compilation before the migration is applied locally.

---

## Re-Check: Constitution Check Post-Research

| Principle | Post-Research Status |
|---|---|
| I. Code Quality | PASS — tool-use SDK types are fully typed; no `any` needed |
| II. Testing | PASS — `lib/quote.ts` pure functions (parse, normalize) are 100% unit-testable; route tested with mocked SDK |
| III. UX Consistency | PASS — loading spinner + inline error confirmed; Review Quote modal uses shadcn Dialog |
| IV. Performance (justified exception) | CONFIRMED — Claude tool-use call: 3–8 s typical, 15 s p99; documented in Complexity Tracking |
| V. Security | PASS — `PRIVATE_CALUDE_API_KEY` never serialized into response; server-side only |
