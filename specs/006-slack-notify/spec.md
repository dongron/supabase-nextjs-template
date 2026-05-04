# Feature Specification: Slack Notification Button

**Feature Branch**: `006-slack-notify`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "I want to add Slack implementation to send message. In the prospect modal, should be a button 'Notify on Slack' that will send text 'Urgent! Details on your email.'. It will be shown in the same way a 'Notify designer'. You can use variable from .env file"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send Slack Notification from Prospect Modal (Priority: P1)

A staff member is reviewing a prospect in the action modal and wants to quickly alert the team on Slack. They click "Notify on Slack" and the system immediately delivers the fixed message "Urgent! Details on your email." to the configured Slack channel. The button shows a loading indicator while the message is being sent, then returns to its default state.

**Why this priority**: This is the sole new capability introduced by this feature. All acceptance criteria depend on it.

**Independent Test**: Can be fully tested by opening any prospect modal, clicking "Notify on Slack", and verifying the message "Urgent! Details on your email." appears in the configured Slack channel. The test delivers standalone value: the team receives an alert.

**Acceptance Scenarios**:

1. **Given** the prospect action modal is open and the quote total is above $30,000, **When** the staff member clicks "Notify on Slack", **Then** the button enters a loading/disabled state and the message "Urgent! Details on your email." is sent to the configured Slack channel.
1a. **Given** the prospect action modal is open and the quote total is $30,000 or less, **When** the staff member views the button, **Then** the button is visually disabled and cannot be clicked.
2. **Given** the Slack notification is successfully sent, **When** the request completes, **Then** the button label briefly changes to "Sent!" for approximately 1–2 seconds before returning to its default "Notify on Slack" label and active state.
3. **Given** the Slack credentials are misconfigured or the Slack service is unavailable, **When** the staff member clicks "Notify on Slack", **Then** an inline error message is displayed below the button explaining that the notification could not be sent.
4. **Given** a Slack notification is in progress, **When** the button is in its loading state, **Then** it is disabled and cannot be clicked again until the request completes.

---

### Edge Cases

- What happens when the Slack channel does not exist or the bot lacks permission to post? The system returns a clear error message to the user.
- What happens if the network request times out? An error state is shown and the button becomes interactive again.
- What if the Slack webhook/token environment variable is not set? The API endpoint returns an error; the button displays an error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The prospect action modal MUST include a "Notify on Slack" button displayed in the same visual style and location as the existing "Notify designer" button. The button MUST be disabled when the current quote total is $30,000 or less, and MUST show a descriptive `title` tooltip explaining the requirement (matching the behaviour of the "Notify designer" button).
- **FR-002**: Clicking "Notify on Slack" MUST trigger an API call that sends the fixed text "Urgent! Details on your email." to a pre-configured Slack channel.
- **FR-003**: The "Notify on Slack" button MUST display a loading/disabled state while the notification request is in progress.
- **FR-004**: The system MUST use an Incoming Webhook URL stored in the `PRIVATE_SLACK_WEBHOOK_URL` environment variable (not hardcoded) to deliver the message to Slack.
- **FR-005**: If the Slack notification fails for any reason, the system MUST display an inline error message near the button without closing the modal.
- **FR-006**: On success, the button label MUST briefly display "Sent!" (for approximately 1–2 seconds) before returning to its default label and active, clickable state. On failure, it MUST return to its default label immediately.

### Key Entities

- **Slack Notification**: A one-way outbound message with the fixed body "Urgent! Details on your email." sent to a designated Slack channel. No data is persisted in the application database.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff members can send a Slack notification from any prospect modal in under 3 seconds under normal network conditions.
- **SC-002**: 100% of successful notification attempts deliver the message to the configured Slack channel with the correct text.
- **SC-003**: Notification failures surface a visible error message to the user within 10 seconds of the failed attempt.
- **SC-004**: The button correctly prevents double-submission: clicking while a request is in-flight has no effect.

## Clarifications

### Session 2026-05-04

- Q: Which Slack integration mechanism should be used to send the message? → A: Incoming Webhook URL — add `PRIVATE_SLACK_WEBHOOK_URL` to `.env.local`; POST the fixed message as JSON
- Q: Should "Notify on Slack" have a visibility or enable condition? → A: Same threshold as "Notify designer" — only enabled when `quoteTotal > $30,000`
- Q: After success, should the button show persistent feedback or silently reset? → A: Brief "Sent!" label then reset

## Assumptions

- Slack messages are sent via an **Incoming Webhook URL** stored in `PRIVATE_SLACK_WEBHOOK_URL`. The target channel is determined by the webhook configuration; no separate `PRIVATE_SLACK_CHANNEL` variable is required.
- The existing OAuth app credentials in `.env.local` (`PRIVATE_SLACK_CLIENT_ID`, etc.) are unrelated to this feature and are not used.
- The message text "Urgent! Details on your email." is fixed and not customisable by the user at runtime.
- The feature follows the same server-side API route pattern used by the existing "Notify designer" functionality (a dedicated POST endpoint per proposal).
- No audit trail or database record of Slack notifications is required for v1.
- The button is always visible in the modal but is disabled when the quote total is $30,000 or less, matching the threshold behaviour of the existing "Notify designer" button.
