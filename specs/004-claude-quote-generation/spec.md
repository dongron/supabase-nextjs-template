# Feature Specification: Claude Quote Generation

**Feature Branch**: `004-claude-quote-generation`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "I want a Claude API integration (POST message). When I click 'Generate Quote' button, request to API will be sent: single prospect id + system prompt (hardcoded: 'Knowing list of services and memo note, extract list of services from memo note with a pricing list in a JSON format. If you find a service without related price, then response with a null...'). After user receives response, new modal opens with a list of services (name, price, checkmark if the service had id), name and price are always input type. After clicking save, it all saves in the prospects field as a long form text (JSON.stringify, then display in a form of list) name 'quote'."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Quote from Voice Memo (Priority: P1)

A staff member has already saved a voice memo for a prospect describing the work to be done (e.g., "They want a full garden makeover with lighting installation and stone paving"). They open the prospect action modal and click "Generate Quote". The system sends the prospect data to Claude AI, which extracts service names and prices from the memo text, cross-referencing the configured services list. A new modal opens showing the extracted services as an editable list.

**Why this priority**: This is the entire purpose of the feature. Nothing else works without a successful AI extraction.

**Independent Test**: Can be fully tested by having a prospect with a voice memo, clicking "Generate Quote", and verifying that a modal opens with at least one service extracted from the memo content.

**Acceptance Scenarios**:

1. **Given** a prospect has a saved voice memo and a services list is configured, **When** the staff member clicks "Generate Quote" in the action modal, **Then** a loading state is shown while the AI processes the request.
2. **Given** the AI processing completes successfully, **When** the response is received, **Then** a new "Review Quote" modal opens displaying the extracted services list.
3. **Given** the prospect has a voice memo referencing a known service (one in the services list), **When** the quote is generated, **Then** that service appears in the list with its extracted price and a checkmark indicating it matched a known service.
4. **Given** the voice memo mentions a service not in the configured list, **When** the quote is generated, **Then** that service appears in the list without a checkmark and with a null/empty price.
5. **Given** a prospect has no voice memo saved, **When** the staff member clicks "Generate Quote", **Then** an informative message is shown indicating a memo is required before generating a quote.
6. **Given** the Claude API call fails (network error, timeout, or API error), **When** the response is received, **Then** an error message is shown and the modal does not open; the staff member can retry.

---

### User Story 2 - Review and Edit AI-Extracted Services (Priority: P2)

After the AI generates the initial quote, the staff member reviews the list of services. Some entries may be incorrectly priced, named, or missing entirely. They can edit any row, add new blank rows for services Claude missed, and delete rows that are incorrect — all before saving.

**Why this priority**: AI extraction is imperfect. Staff must be able to correct errors before committing the quote to the prospect record.

**Independent Test**: Can be tested by generating a quote, then changing at least one name and one price field in the review modal, verifying the inputs are editable and retain the edited values before saving.

**Acceptance Scenarios**:

1. **Given** the "Review Quote" modal is open, **When** the staff member views the service list, **Then** each row shows: a service name input (pre-filled), a price input (pre-filled or empty), and a visual checkmark indicator if the service matched a known entry.
2. **Given** a service row is displayed, **When** the staff member clicks the name input, **Then** they can freely edit the service name.
3. **Given** a service row is displayed, **When** the staff member clicks the price input, **Then** they can freely edit the price value.
4. **Given** the modal is open, **When** the staff member clicks "Add Row", **Then** a new blank row is appended with empty name and price inputs.
5. **Given** a service row is displayed, **When** the staff member clicks the delete/remove control on that row, **Then** the row is removed from the list immediately.
6. **Given** the staff member has edited, added, or deleted rows, **When** they have not yet clicked Save, **Then** the changes are held in the modal and have not been persisted.
7. **Given** the modal is open, **When** the staff member closes/cancels the modal, **Then** no data is saved and the prospect's existing quote field is unchanged.

---

### User Story 3 - Save Quote to Prospect (Priority: P3)

After reviewing and editing the generated services list, the staff member clicks "Save". The quote is stored on the prospect record. They can view the saved quote as a readable service list on the prospect's profile.

**Why this priority**: Without saving, the quote generation provides no lasting value.

**Independent Test**: Can be tested by completing the generation flow, clicking Save, and then reopening the prospect to verify the quote field shows the saved services as a formatted list.

**Acceptance Scenarios**:

1. **Given** the "Review Quote" modal has a filled-out services list, **When** the staff member clicks "Save", **Then** the quote is stored on the prospect and the modal closes.
2. **Given** a quote has been saved, **When** the staff member opens the prospect action modal, **Then** the quote is displayed inside the modal as a readable list of service names and prices.
3. **Given** a prospect already has a saved quote, **When** the staff member generates and saves a new quote, **Then** the previous quote is replaced by the new one.
4. **Given** the staff member saves an empty service list, **When** Save is clicked, **Then** the quote field is cleared or saved as empty, and the prospect view reflects this.

---

### Edge Cases

- What happens when the voice memo is very long (several paragraphs)?
- If Claude returns malformed or unparseable JSON, the system MUST show an inline error message in the action modal with a "Try Again" button; the review modal does NOT open and no data is saved.
- What if the same service name appears multiple times in the memo?
- If a price input contains non-numeric characters at save time, the system MUST strip them silently and store the resulting number; a blank price input MUST be stored as `null`.
- What happens if the prospect is deleted while the review modal is open?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the "Generate Quote" button is clicked, the system MUST send a request to a server-side endpoint with the prospect's ID.
- **FR-002**: The server-side endpoint MUST retrieve the prospect's voice memo and the full configured services list, then forward them to the Claude AI API with the hardcoded system prompt.
- **FR-003**: The hardcoded system prompt MUST instruct Claude to extract services from the memo and return a JSON object with shape `{ services: [{ serviceId: string|null, serviceName: string, price: number|null }] }`.
- **FR-004**: If a service in the extracted list matches a configured service, the entry MUST include the matching service's ID; otherwise `serviceId` MUST be null.
- **FR-005**: After a successful AI response, the system MUST open a "Review Quote" modal displaying the extracted services list.
- **FR-006**: Each row in the review modal MUST contain: an editable text input for the service name, an editable numeric input for the price, a visual checkmark indicator when `serviceId` is not null, and a delete control to remove the row.
- **FR-006b**: The review modal MUST include an "Add Row" control that appends a new blank row (empty name, empty price, no checkmark) to the list.
- **FR-007**: The name and price inputs MUST always be rendered as editable form inputs, even when pre-filled with AI-extracted values.
- **FR-008**: After the staff member clicks "Save" in the review modal, the system MUST normalize each price value (strip non-numeric characters; store blank as `null`), serialize the current services list to JSON, and store it in the `quote` field on the prospect record.
- **FR-009**: The prospect action modal MUST display the saved `quote` field as a formatted, human-readable list of service names and prices, visible whenever the modal is opened.
- **FR-010**: If the prospect has no voice memo, the system MUST prevent the quote generation from proceeding and display an appropriate message.
- **FR-011**: If the API call fails or Claude returns malformed/unparseable JSON, the system MUST display an inline error message in the action modal with a "Try Again" button; the review modal MUST NOT open and no data MUST be saved.
- **FR-012**: The Claude API key and all AI-related credentials MUST be stored and used exclusively server-side and never exposed to the client. The key is read from the `PRIVATE_CALUDE_API_KEY` environment variable.

### Key Entities *(include if feature involves data)*

- **Prospect**: Existing entity. Gains a new `quote` field (long-form text storing a JSON-serialized services list). Already has a `voice_memo` field (added in spec 003).
- **Service**: Existing entity from spec 002. Has `id`, `name`, and `price`. Used for cross-referencing extracted services.
- **QuoteService**: A transient (in-modal) representation of one extracted service row with `serviceId` (nullable), `serviceName` (string), and `price` (nullable number).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can go from clicking "Generate Quote" to seeing an editable services list in under 15 seconds under normal conditions.
- **SC-002**: The review modal correctly marks matched services (with checkmark) for all services that exist in the configured services list.
- **SC-003**: A saved quote persists across page reloads and sessions with no data loss.
- **SC-004**: Staff can edit any generated service name or price before saving, with no restrictions on the number of edits.
- **SC-005**: When an API error occurs, staff receive a clear error message and can retry without losing their place in the workflow.

## Assumptions

- The Claude API integration is handled via a Next.js API route (server-side), not a direct client call.
- The hardcoded system prompt is defined as a constant in the server-side code and is not user-configurable.
- The Claude model used is `claude-3-5-sonnet` (balances extraction accuracy, speed, and cost; supports the SC-001 15-second target).
- The services list used for matching is the same global list defined in spec 002 (prospect-specific prices are not used for matching, only the service ID and name).
- The `quote` field is a new text column on the prospects table; adding it requires a database migration.
- The "Generate Quote" button already exists in the prospect action modal (spec 003) but is currently non-functional; this spec activates it.
- Only one quote can be stored per prospect at a time; generating a new quote overwrites the previous one.
- Mobile support is in scope as the existing UI is responsive.
- The staff member must have an active session to use this feature (standard auth applies).

## Clarifications

### Session 2026-05-04

- Q: Which Claude model should the API integration use? → A: `claude-3-5-sonnet`
- Q: When Claude returns malformed or unparseable JSON, what should the system do? → A: Show inline error in action modal with a "Try Again" button; review modal does not open
- Q: Where is the saved quote displayed after it's been stored on the prospect? → A: Inside the prospect action modal
- Q: Can staff add/remove rows in the Review Quote modal, or only edit AI-extracted rows? → A: Full control — staff can edit, add, and delete individual rows
- Q: When the price input contains non-numeric characters at save time, what should the system do? → A: Strip non-numeric characters silently; treat blank as `null`
