# Feature Specification: Prospect Action Modal

**Feature Branch**: `003-prospect-action-modal`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "I want to have option to add voice memo (as a transcribed multiline text, no recording functionality). There should be a button on the prospect list, that open a modal. In this modal, is multiline text filed to add voice memo. Under this input will be button "Save/Update Memo" that will save voice memo to related prospect. Under this we have "Generate Quote" button (only button component, not doing anything right now). On the bottom of the modal, we have "Delete Prospect" button that will delete prospect entirely and "Services" button, they are moved from the list view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save a Voice Memo for a Prospect (Priority: P1)

A staff member is reviewing the prospect list and wants to record a quick transcribed voice note about a prospect. They click the action button on the prospect row to open the action modal, type their note into the multiline text field, and click "Save/Update Memo". The memo is saved and persists the next time the modal is opened for that prospect.

**Why this priority**: This is the primary new capability. All other modal elements are secondary or relocated.

**Independent Test**: Can be fully tested by opening the modal for any prospect, typing text, clicking Save/Update Memo, closing the modal, reopening it, and verifying the text is still there.

**Acceptance Scenarios**:

1. **Given** the prospect list is shown, **When** the staff member clicks the action button on a prospect row, **Then** a modal opens displaying the prospect's name and a multiline text field for the voice memo.
2. **Given** the modal is open and the text field is empty, **When** the staff member types a memo and clicks "Save/Update Memo", **Then** the memo is saved to that prospect and a confirmation is shown.
3. **Given** the modal is open and the text field already has a previously saved memo, **When** the staff member edits the text and clicks "Save/Update Memo", **Then** the updated memo replaces the previous one.
4. **Given** the modal is open and the text field is empty, **When** the staff member clicks "Save/Update Memo" without typing anything, **Then** any previously saved memo is cleared (saved as blank).
5. **Given** the modal is open, **When** the staff member closes the modal without clicking Save/Update Memo, **Then** unsaved changes are discarded and the stored memo remains unchanged.

---

### User Story 2 - Access Services from the Action Modal (Priority: P2)

A staff member who previously used the "Services" link in the prospect list row now finds it inside the prospect action modal. They open the modal and click "Services" to navigate to the services pricing screen for that prospect.

**Why this priority**: This is a relocation of existing functionality, not a new feature. Must work correctly to avoid regression.

**Independent Test**: Can be tested by opening the modal and clicking "Services", verifying navigation to the correct prospect's services page. Confirm the "Services" link no longer appears in the list row.

**Acceptance Scenarios**:

1. **Given** the prospect action modal is open, **When** the staff member clicks "Services", **Then** they are navigated to the services & pricing screen for that specific prospect.
2. **Given** the prospect list is displayed, **When** the staff member scans each row's action area, **Then** no standalone "Services" link is visible in the row (it has been removed from the list).

---

### User Story 3 - Delete a Prospect from the Action Modal (Priority: P3)

A staff member who previously used the "Remove" button in the prospect list row now finds the delete action inside the prospect action modal. They open the modal and click "Delete Prospect". A confirmation step is shown before the prospect is permanently removed.

**Why this priority**: Relocation of destructive existing functionality. Requires confirmation step because deletion is irreversible.

**Independent Test**: Can be tested by opening the modal, clicking "Delete Prospect", confirming, and verifying the prospect disappears from the list. Confirm the old "Remove" button is gone from the row.

**Acceptance Scenarios**:

1. **Given** the prospect action modal is open, **When** the staff member clicks "Delete Prospect", **Then** a confirmation prompt is displayed before any deletion occurs.
2. **Given** the confirmation prompt is shown, **When** the staff member confirms, **Then** the prospect is permanently deleted and removed from the list; the modal closes.
3. **Given** the confirmation prompt is shown, **When** the staff member cancels, **Then** the prospect is not deleted and the modal remains open.
4. **Given** the prospect list is displayed, **When** the staff member scans each row's action area, **Then** no standalone "Remove" button is visible in the row (it has been removed from the list).

---

### User Story 4 - Generate Quote Placeholder (Priority: P4)

A staff member sees a "Generate Quote" button in the prospect action modal. Clicking it has no effect for now. The button is present to indicate future functionality.

**Why this priority**: Placeholder only — no business value yet, but required to appear in the UI per specification.

**Independent Test**: Can be tested by confirming the button is visible and that clicking it does not produce any navigation, mutation, or error.

**Acceptance Scenarios**:

1. **Given** the prospect action modal is open, **When** the staff member sees the "Generate Quote" button, **Then** it is visible and clearly labeled.
2. **Given** the prospect action modal is open, **When** the staff member clicks "Generate Quote", **Then** nothing happens (no navigation, no request, no error message).

---

### Edge Cases

- What happens when saving a memo fails (network error)? An error message is shown and the text field retains the unsaved value.
- What happens when deleting a prospect fails? An error message is shown, the modal stays open, and the prospect remains in the list.
- What happens when the modal is opened for a prospect that has never had a memo? The text field is empty.
- What happens if the memo text is very long? The field must scroll vertically; no arbitrary character limit unless the data store enforces one.
- What happens when the modal is open and the user navigates away (e.g., keyboard shortcut)? The modal closes and unsaved changes are discarded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each prospect row in the list MUST display a button labeled "Actions" that opens the prospect action modal.
- **FR-002**: The action modal MUST display a multiline, resizable text field labeled for voice memo input.
- **FR-003**: The action modal MUST pre-populate the text field with the `voice_memo` value already present in the prospect data loaded by the list query — no additional fetch is required on modal open.
- **FR-004**: The action modal MUST include a "Save/Update Memo" button that persists the current text field value to the associated prospect.
- **FR-005**: System MUST display a success confirmation after a memo is saved successfully.
- **FR-006**: System MUST display an error message and preserve field contents if saving the memo fails.
- **FR-007**: The action modal MUST include a "Generate Quote" button that is visible but performs no action.
- **FR-008**: The action modal MUST include a "Services" button that navigates to the services & pricing screen for that prospect.
- **FR-009**: The action modal MUST include a "Delete Prospect" button that, after user confirmation, permanently deletes the prospect and removes it from the list.
- **FR-010**: System MUST request explicit user confirmation before deleting a prospect using the native browser `confirm()` dialog, consistent with the existing delete pattern.
- **FR-011**: System MUST display an error message if prospect deletion fails, and the prospect MUST remain in the list.
- **FR-012**: The "Services" link and "Remove" / "Delete" button MUST be removed from the prospect list row (relocated into the modal).
- **FR-013**: Closing the modal without saving MUST discard any unsaved changes to the memo field.
- **FR-014**: The voice memo field MUST accept plain multiline text only; no audio recording or playback functionality is included.

### Key Entities

- **Proposal** (displayed as "Prospect" in the UI): An existing entity in the system. All code, database columns, API routes, and TypeScript types use `proposal`; the UI label shown to users is "Prospect". This feature adds a `voice_memo` text column to the proposals table.
- **Voice Memo**: Free-form multiline text attached to a proposal/prospect. Created or overwritten via a single save action; no version history required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff members can open the action modal, type a memo, save it, and verify it persists — all within under 30 seconds.
- **SC-002**: The "Services" and "Delete Prospect" actions are accessible exclusively through the modal; no duplicate controls remain in the list row.
- **SC-003**: Prospect deletion from the modal matches the reliability of the previous list-row deletion (zero regressions in delete success rate).
- **SC-004**: The modal opens and displays correctly for all prospects regardless of memo state (empty, short, or very long memo).
- **SC-005**: No voice memo data is lost due to accidental modal close; unsaved changes are always discarded (never auto-saved without explicit user action).

## Clarifications

### Session 2026-05-04

- Q: How should the voice memo text be loaded when the modal opens? → A: Include `voice_memo` in the existing proposals list query — data is available immediately when the modal opens, no separate fetch required.
- Q: How should the "proposal" vs "prospect" terminology be handled? → A: "Proposal" remains the canonical name in all code, DB, and types; "Prospect" is used only as a user-facing display label in the UI.
- Q: Should the "Delete Prospect" confirmation use a native browser dialog or a custom in-modal UI? → A: Keep the native `confirm()` dialog, consistent with the existing delete implementation.
- Q: What label should appear on the button in each prospect row that opens the action modal? → A: "Actions".

## Assumptions

- The existing "proposals" data model represents prospects; a `voice_memo` column (text, nullable) will be added to the proposals table to persist memo data. All internal code uses the name `proposal`; the UI displays "Prospect" as the human-readable label.
- No rich-text formatting is needed; plain text is sufficient for memos.
- The "Generate Quote" button is a UI placeholder only; no backend wiring is in scope for this feature.
- A single memo per prospect is sufficient; no history, versioning, or timestamps on the memo itself are required.
- The confirmation step for "Delete Prospect" uses the browser's native `confirm()` dialog, consistent with the current `ProposalRow` implementation.
- Mobile/responsive behavior of the modal follows existing modal patterns in the project.
- Audio recording, speech-to-text, or any real-time transcription is explicitly out of scope; the field accepts manually typed transcribed text only.
