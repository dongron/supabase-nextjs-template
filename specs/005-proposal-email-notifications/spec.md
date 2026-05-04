# Feature Specification: Proposal Email Notifications

**Feature Branch**: `feature/005-proposal-email-notifications`  
**Created**: 2026-05-04  
**Status**: Draft  
**Input**: User description: "Every proposal should have additional field 'email'. If in the actions modal, Quote is generated, then under the 'Edit Quote', show button 'Send to customer'. After clicking it, email will be send to customer. Use Resend for emails server. I want also visible button that will be enabled when Quote will be over $30000 that sends email to designer. His email should be possible to change in settings."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Email Field to Proposal (Priority: P1)

A staff member is creating or editing a proposal (prospect record) and needs to capture the customer's email address so that quotes can be sent to them later. They see a clearly labelled "Email" field on the proposal form, fill it in, and save the proposal.

**Why this priority**: The email field is a prerequisite for all email-sending capabilities. Without it, neither the customer notification nor the designer alert can function. It is also the smallest unit of independent value — it improves data completeness on its own.

**Independent Test**: Can be fully tested by opening the prospect creation or edit form, entering an email address, saving, and verifying the stored email is shown correctly when the prospect is viewed again.

**Acceptance Scenarios**:

1. **Given** the prospect creation form is open, **When** the staff member views the form, **Then** an "Email" input field is visible.
2. **Given** the prospect creation form is open, **When** the staff member enters a valid email address and saves, **Then** the email is persisted against the prospect record.
3. **Given** the prospect creation form is open, **When** the staff member tries to save without entering an email, **Then** validation prevents saving and a required-field message is shown.
4. **Given** the prospect creation form is open, **When** the staff member enters an invalid email format and tries to save, **Then** validation prevents saving and an appropriate format error is shown.
5. **Given** an existing prospect already has an email saved, **When** the staff member opens the proposal in the action modal, **Then** the email field is pre-filled and editable.
6. **Given** an existing prospect has an email saved, **When** the staff member opens the prospect details, **Then** the email is displayed correctly.

---

### User Story 2 - Send Quote to Customer via Email (Priority: P2)

A staff member has generated and reviewed a quote in the prospect action modal. They want to send the quote to the customer by email. They see a "Send to customer" button displayed beneath the "Edit Quote" section. Clicking it dispatches the quote to the customer's email address using the configured email service.

**Why this priority**: This is the primary email notification feature and delivers the most direct business value by automating customer communication.

**Independent Test**: Can be fully tested by generating a quote for a prospect who has an email address on file, clicking "Send to customer", and verifying that an email is received at the prospect's email address containing the quote details.

**Acceptance Scenarios**:

1. **Given** a quote has been generated and saved for a prospect, and the prospect has an email on file, **When** the staff member views the action modal, **Then** a "Send to customer" button is displayed below the "Edit Quote" section.
2. **Given** the "Send to customer" button is visible, **When** the staff member clicks it, **Then** the system sends an email to the prospect's email address containing the quote details.
3. **Given** the email is sent successfully, **When** the staff member receives confirmation, **Then** a success notification is shown in the modal and the quote is marked as sent.
4. **Given** a quote has already been sent to the customer, **When** the staff member clicks "Send to customer" again, **Then** a confirmation prompt is shown (e.g. "Quote already sent — send again?") before the email is dispatched.
5. **Given** the re-send confirmation prompt is shown, **When** the staff member cancels, **Then** no email is sent and the modal remains open.

---

### User Story 3 - Notify Designer When Quote Exceeds Threshold (Priority: P3)

A staff member has generated a quote that totals over $30,000. A "Notify designer" button (or similar label) appears in the action modal. The button is always visible but only becomes clickable when the quote total exceeds the $30,000 threshold. Clicking it sends an alert email to the configured designer email address.

**Why this priority**: High-value quotes require design review. This automation ensures no large quote goes unnoticed by the designer. It is lower priority than customer-sending because it is an internal workflow, not customer-facing.

**Independent Test**: Can be fully tested by generating a quote totalling more than $30,000, verifying the designer notification button is enabled, clicking it, and confirming an email is received at the configured designer email address.

**Acceptance Scenarios**:

1. **Given** a quote has been generated for a prospect, **When** the staff member views the action modal, **Then** a "Notify designer" button is always visible in the modal.
2. **Given** the quote total is $30,000 or less, **When** the staff member views the action modal, **Then** the "Notify designer" button is visually disabled and cannot be clicked.
3. **Given** the quote total exceeds $30,000, **When** the staff member views the action modal, **Then** the "Notify designer" button is enabled and clickable.
4. **Given** the "Notify designer" button is enabled, **When** the staff member clicks it, **Then** an email is sent to the configured designer email address containing the quote details and prospect information.
5. **Given** the email is sent successfully, **When** the staff member receives confirmation, **Then** a success notification is shown in the modal.
6. **Given** no designer email is configured in settings, **When** the "Notify designer" button is clicked, **Then** an informative error is shown prompting the staff member to configure the designer email in settings.
7. **Given** the quote total changes after editing (drops below $30,000), **When** the quote is saved, **Then** the "Notify designer" button becomes disabled again.

---

### User Story 4 - Configure Designer Email in Settings (Priority: P4)

An administrator needs to set or update the designer's email address that receives high-value quote notifications. They navigate to the application settings, find a "Designer email" field, and update the address. Future designer notifications use the updated address.

**Why this priority**: This is a configuration step that unblocks the designer notification feature. Without it, the designer notification cannot function; however, it can be configured once and rarely changed, making it a lower-frequency operation.

**Independent Test**: Can be fully tested by navigating to the settings page, entering a new designer email address, saving, then generating a quote over $30,000, clicking "Notify designer", and verifying the email arrives at the newly configured address.

**Acceptance Scenarios**:

1. **Given** the settings page is open, **When** the administrator views it, **Then** a "Designer email" input field is visible.
2. **Given** the "Designer email" field is displayed, **When** the administrator enters a valid email and saves, **Then** the new email is persisted and used for future designer notifications.
3. **Given** the settings page is open, **When** the administrator enters an invalid email format and tries to save, **Then** validation prevents saving and an appropriate error message is shown.
4. **Given** a designer email is already saved, **When** the administrator opens settings, **Then** the current email is pre-filled in the field.

---

### Edge Cases

- What happens when a prospect's email address is changed after a quote has already been sent? (System should always use the current email at the time "Send to customer" is clicked.)
- What if the quote contains services with null prices — should the total be calculated ignoring nulls, or should the send button be disabled?
- What happens if the user clicks "Send to customer" multiple times rapidly? (The button is disabled while the operation is in-flight. A confirmation is required before any re-send once a quote has already been sent.)
- What if the email service (Resend) is unreachable at time of sending? (Error shown; no silent failure.)
- What is the email content/format when the quote is sent? The customer quote email MUST contain: a greeting, a line-item service list (name and price per row), a grand total line, a thank-you closing paragraph, and a signature of "CEO of Greenscape Pro".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `proposals` data record MUST include an `email` field to store the customer's email address.
- **FR-002**: The prospect creation and edit form MUST display an "Email" input field for capturing or updating the customer's email address.
- **FR-003**: The `email` field MUST be required at proposal creation; the form MUST prevent saving if the field is empty or contains an invalid email format.
- **FR-004**: When a quote has been generated and saved for a prospect, the action modal MUST display a "Send to customer" button below the "Edit Quote" section. The proposal MUST track whether a quote email has previously been sent.
- **FR-004a**: If a quote email has already been sent for the current prospect, clicking "Send to customer" MUST show a confirmation prompt before dispatching another email; clicking cancel MUST abort the send with no email dispatched.
- **FR-005**: Because email is required at creation, every prospect will have an email address on file; the "Send to customer" button is therefore disabled only when no quote has been generated yet.
- **FR-006**: Clicking "Send to customer" MUST trigger an email to the prospect's email address via the Resend email service, containing the quote details (list of services with names and prices).
- **FR-007**: The action modal MUST always display a "Notify designer" button when a quote exists for the prospect.
- **FR-008**: The "Notify designer" button MUST be disabled when the quote total is $30,000 or below.
- **FR-009**: The "Notify designer" button MUST be enabled when the quote total exceeds $30,000.
- **FR-010**: Clicking the enabled "Notify designer" button MUST send an email to the configured designer email address via the Resend email service, containing the quote summary and prospect information.
- **FR-011**: The application settings page MUST include a "Designer email" configuration field.
- **FR-012**: The designer email setting MUST be persisted and retrievable across sessions.
- **FR-013**: Both email-send actions (customer and designer) MUST display a visible success or failure notification after the attempt.
- **FR-014**: If no designer email is configured, clicking "Notify designer" MUST show an informative error prompting the user to set the designer email in settings.
- **FR-015**: The quote total used to evaluate the $30,000 threshold MUST be calculated as the sum of all services with non-null prices; null-price services are excluded from the total.
- **FR-016**: The customer quote email body MUST contain: (1) a personalised greeting, (2) a line-item list of services with name and price per row, (3) a grand total line summing all non-null prices, (4) a thank-you closing paragraph, and (5) a signature reading "CEO of Greenscape Pro".

### Key Entities *(include if feature involves data)*

- **Proposal (Prospect)**: Existing entity, extended with a new `email` field (customer's email address). Linked to a quote (JSON-serialised service list with prices).
- **Quote**: Existing JSON value stored on the proposal, containing a list of services (name, price). The sum of prices determines designer notification eligibility.
- **Designer Settings**: A persisted configuration record holding the designer's notification email address, stored in the existing general settings table in the database and accessible from the settings page.
- **Email Notification**: A transient outbound message sent via the Resend email service. Triggered by user action, not automatically. Two variants: customer quote email and designer high-value alert.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff members can capture and update a customer email address on every proposal without additional steps beyond the existing form.
- **SC-002**: A quote email reaches the customer's inbox within 30 seconds of the staff member clicking "Send to customer" under normal network conditions.
- **SC-003**: A designer notification email reaches the configured address within 30 seconds of clicking "Notify designer" for quotes exceeding $30,000.
- **SC-004**: 100% of email send attempts result in either a visible success confirmation or a clear error message; no silent failures occur.
- **SC-005**: Staff members can update the designer email address in settings and the change takes effect on the next notification without any restart.
- **SC-006**: The "Notify designer" button is never enabled for quotes totalling $30,000 or less, preventing false alerts to the designer.

## Clarifications

### Session 2026-05-04

- Q: What sender address should be used for outgoing emails via Resend? → A: `onboarding@resend.dev` (Resend's shared sandbox sender)
- Q: Where should the designer email address be stored? → A: In the database, within the existing general settings section
- Q: Should the customer email field be required or optional at proposal creation? → A: Required — must be filled before a proposal can be saved
- Q: What happens when a staff member clicks "Send to customer" a second time? → A: Show a confirmation prompt before re-sending
- Q: What should the customer quote email contain? → A: Greeting, service list with per-item prices, grand total, thank-you closing, signed "CEO of Greenscape Pro"

## Assumptions

- The existing `proposals` table and TypeScript types can be extended with a new `email` column (NOT NULL) via a database migration. Existing rows with a NULL email must be handled in the migration (e.g., backfilled with a placeholder or left nullable until cleaned up manually).
- The Resend email service will be used for all outbound notifications (both customer and designer emails). The sender address for all outgoing emails is `onboarding@resend.dev`. The Resend API key is already present in the environment variable `PRIVATE_RESEND_API_KEY`.
- The customer quote email uses a minimal HTML template containing: greeting, service line-items with prices, grand total, thank-you closing, and a "CEO of Greenscape Pro" signature. No complex branded design is required for v1.
- The designer email setting will be stored in the existing general settings table in the database, making it editable at runtime via the settings UI without any redeployment.
- The quote total is calculated client-side at the time the action modal is open, based on the saved quote data.
- Null-priced services are excluded from the $30,000 threshold calculation.
- Only one designer email address is needed (a single recipient, not a list).
- The "Send to customer" and "Notify designer" actions are manual, not automatic; no automatic sending occurs when a quote is saved.
- The existing authentication and access control for the proposal/prospect workflow is unchanged.
- Mobile support is not in scope for this feature.
