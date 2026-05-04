# Feature Specification: Proposal Pipeline Queue

**Feature Branch**: `001-proposal-pipeline-queue`  
**Created**: 2026-05-04  
**Status**: Draft  
**Input**: User description: "Dashboard for high-end residential outdoor construction company CEO. One row per proposal, sorted by urgency, showing customer name + neighborhood, walk date, estimated project value, pipeline stage, time in current stage with red tint past 18h in Ready for review, render required badge (auto-set at $30k+) with designer notification status, and Needs attention flag for low-confidence line items."

---

## Clarifications

### Session 2026-05-04

- Q: Does this app own proposal data, or is the queue a read-only view over an external system? → A: This app owns proposal data. It includes a data entry / editing area (separate from this queue view) where proposals are created and stages are updated.
- Q: What drives urgency sort order for non-overdue proposals? → A: Stage position — Voice memo received is most urgent, Signed is least. Within the same stage, more time elapsed = higher position.
- Q: Who records designer notification status and ETA, and from where? → A: The CEO marks "Designer notified" and enters the ETA inline on the queue row — no separate screen.
- Q: Can the CEO resolve the "Needs attention" flag from the queue, or is it read-only? → A: The CEO can dismiss the flag directly from the queue row after reviewing it.
- Q: How does the queue stay current — real-time, polling, or manual refresh? → A: Manual refresh only. The CEO reloads the page to get the latest state.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CEO Scans the Pipeline on Arrival (Priority: P1)

The CEO opens the app first thing in the morning and immediately sees all active proposals sorted by urgency. Without clicking anything, he can tell which proposals demand his attention today: who is waiting for a signed proposal, which jobs are stalled in review, and whether any new voice memos came in overnight.

**Why this priority**: This is the core daily-use case. Every other piece of functionality depends on the queue being visible, accurate, and correctly ordered.

**Independent Test**: Display a list of proposals with name, neighborhood, walk date, value, stage, and time-in-stage. Delivers value even before the red tint or badge logic is implemented.

**Acceptance Scenarios**:

1. **Given** there are active proposals, **When** the CEO opens the app, **Then** all proposals are displayed one per row, sorted by urgency, with no interaction required
2. **Given** proposals exist in different stages, **When** the CEO views the queue, **Then** each row shows customer name, neighborhood, walk date, estimated project value, current stage, and the timestamp when that stage began
3. **Given** a proposal was signed, **When** the CEO views the queue, **Then** the signed proposal appears below all unsigned ones

---

### User Story 2 - CEO Spots Stalled "Ready for Review" Proposals (Priority: P1)

The CEO can instantly see which proposals have been sitting in "Ready for review" too long. A subtle red tint on the row communicates urgency without him having to calculate time differences. The timestamp is visible but the color alone carries the message.

**Why this priority**: This is described as the whole point of building the tool. It directly prevents revenue loss from proposals going stale.

**Independent Test**: Can be tested independently by seeding a proposal in "Ready for review" that entered the stage more than 18 hours ago and confirming the row turns red. No other features required.

**Acceptance Scenarios**:

1. **Given** a proposal has been in "Ready for review" for less than 18 hours, **When** the CEO views the queue, **Then** the row has no red tint
2. **Given** a proposal has been in "Ready for review" for more than 18 hours, **When** the CEO views the queue, **Then** the row displays a subtle red tint
3. **Given** a proposal moves out of "Ready for review" (e.g., to "Sent"), **When** the CEO views the queue, **Then** the red tint is immediately removed
4. **Given** the threshold is crossed while the CEO has the app open, **When** he reloads the page, **Then** the red tint appears on any proposals now past the 18-hour mark

---

### User Story 3 - CEO Checks Render Requirement and Designer Status (Priority: P2)

For any proposal over $30,000, the CEO can see at a glance whether a render has been requested and whether The Designer has been notified. If notified, the designer's ETA is visible in the same row so the CEO knows when to expect the render.

**Why this priority**: High-value jobs require renders before sending. Missing this step delays proposals and risks losing contracts.

**Independent Test**: Add a proposal with value above $30k. Confirm the "Render required" badge appears automatically. Confirm designer notification status and ETA display correctly alongside it.

**Acceptance Scenarios**:

1. **Given** a proposal has an estimated value of $30,001 or more, **When** the CEO views the queue, **Then** a "Render required" badge is visible on that row
2. **Given** a proposal has an estimated value of $30,000 or less, **When** the CEO views the queue, **Then** no render badge appears
3. **Given** a render-required proposal exists and The Designer has not been notified, **When** the CEO views the row, **Then** the badge shows "Designer not notified"
4. **Given** The Designer has been notified with an ETA, **When** the CEO views the row, **Then** the badge shows the ETA clearly
5. **Given** The Designer's ETA has passed and the render has not been delivered, **When** the CEO views the row, **Then** the ETA is visually flagged as overdue
6. **Given** a render-required proposal where the designer has not yet been notified, **When** the CEO clicks the notification control on the row, **Then** he can mark the designer as notified and enter an ETA without leaving the queue view

---

### User Story 4 - CEO Identifies Proposals Needing Attention (Priority: P3)

A single "Needs attention" flag marks proposals that contain low-confidence line items. The CEO can quickly identify which proposals may have pricing or scope issues before sending them to clients.

**Why this priority**: Sending a proposal with suspect line items damages client trust. This flag is a quality gate before "Sent" status.

**Independent Test**: Mark a proposal as having low-confidence line items. Confirm the "Needs attention" flag appears on that row only.

**Acceptance Scenarios**:

1. **Given** a proposal has one or more low-confidence line items, **When** the CEO views the queue, **Then** a "Needs attention" flag is displayed on that row
2. **Given** a proposal has no low-confidence line items, **When** the CEO views the queue, **Then** no flag appears on that row
3. **Given** low-confidence items are resolved upstream, **When** the CEO refreshes or opens the app, **Then** the flag is no longer shown
4. **Given** a proposal has the "Needs attention" flag active, **When** the CEO dismisses it from the queue row, **Then** the flag is removed immediately without navigating away
5. **Given** the upstream process re-flags low-confidence items on a previously dismissed proposal, **When** the CEO views the queue, **Then** the flag reappears

---

### Edge Cases

- What happens when there are no proposals? The queue shows an empty state with a clear message (no data, no errors).
- What if a proposal has no walk date set yet? The walk date field shows "Not scheduled" rather than blank.
- What if two proposals have identical urgency scores? They are ordered alphabetically by customer name as a tiebreaker.
- What if The Designer's ETA field is empty after notification? The badge shows "Awaiting ETA" rather than blank.
- What if the $30k threshold is exactly met ($30,000.00)? No render badge — the badge triggers only above $30,000.
- What happens to proposals in "Signed" stage? They remain visible at the bottom of the queue until archived.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all non-archived proposals in a single full-page queue view with one row per proposal
- **FR-002**: Each row MUST display: customer name, neighborhood, walk date, estimated project value, current pipeline stage, and the timestamp when the current stage began
- **FR-003**: Proposals MUST be sorted by urgency: (1) "Ready for review" proposals past the 18-hour threshold appear first, (2) remaining proposals ordered by pipeline stage from earliest to latest, (3) within the same stage, proposals with more time elapsed appear higher
- **FR-004**: The system MUST support exactly five sequential pipeline stages: Voice memo received → Processing → Ready for review → Sent → Signed
- **FR-005**: Any proposal in "Ready for review" stage for more than 18 consecutive hours MUST display a subtle red background tint on its row
- **FR-006**: The red tint MUST be calculated from the stored stage start timestamp on each page load; it MUST appear or disappear correctly whenever the queue is loaded or refreshed
- **FR-007**: Any proposal with an estimated project value strictly greater than $30,000 MUST automatically display a "Render required" badge; no badge for proposals at or below $30,000
- **FR-008**: For render-required proposals, the row MUST display whether The Designer has been notified; if notified, it MUST show his ETA; if the ETA has passed without delivery, the ETA display MUST be visually marked as overdue
- **FR-008a**: The CEO MUST be able to mark The Designer as notified and enter or update the ETA directly from the queue row via an inline action, without navigating to a separate screen
- **FR-009**: Any proposal flagged as having low-confidence line items MUST display a single "Needs attention" indicator on its row
- **FR-009a**: The CEO MUST be able to dismiss the "Needs attention" flag directly from the queue row; the flag MUST reappear if the upstream process re-flags the proposal
- **FR-010**: The queue view MUST NOT include sales pipeline controls, revenue summaries, lead tracking, or any CRM-style functionality
- **FR-011**: The queue page MUST include an inline proposal creation form rendered below the queue list, allowing the CEO to create new proposals with: customer name, neighborhood, walk date (optional), estimated project value, and initial pipeline stage. Editing, stage transitions, and archiving are out of scope for this version and deferred to a follow-up feature.

### Key Entities

- **Proposal**: Represents a single client engagement. Key attributes: customer name, neighborhood, walk date, estimated project value, current stage, stage start timestamp, render required (derived), designer notified flag, designer ETA, low-confidence flag
- **Pipeline Stage**: An ordered status value from the fixed set {Voice memo received, Processing, Ready for review, Sent, Signed}
- **Render Request**: Associated with high-value proposals. Tracks whether The Designer has been notified and his ETA for delivery
- **Attention Flag**: A boolean marker applied upstream (by the proposal processing system) to proposals that contain line items with low confidence scores

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The CEO can identify all proposals requiring immediate attention within 5 seconds of opening the app, with zero clicks
- **SC-002**: Any proposal stalled in "Ready for review" for more than 18 hours is visually distinguishable from non-stalled proposals without reading any numbers
- **SC-003**: The CEO can verify render requirements and designer status for all high-value proposals in a single view, without navigating to any sub-page
- **SC-004**: All proposals with low-confidence line items are visually flagged and identifiable within the main queue view
- **SC-005**: The queue accurately reflects the state of all proposals at the time of page load; the CEO can reload at any time to fetch the latest data

---

## Assumptions

- The CEO is the sole intended user of this queue view; no role-based access differentiation is required for this feature
- "Urgency" sort order is defined as: overdue "Ready for review" proposals first, then by stage position (Voice memo received is most urgent, Signed is least), then by time elapsed in current stage (longer = higher)
- Walk date refers to the scheduled on-site walkthrough date, entered when the proposal is created or updated
- "The Designer" is a single named person; the system tracks one designer per proposal, not a team
- Low-confidence line items are flagged by an upstream process (e.g., the voice-memo-to-estimate pipeline) and surfaced here as a read-only boolean flag
- This app owns all proposal data. A separate area of the same app (outside the queue view) handles proposal creation, editing, and stage transitions. The queue view has two inline actions: (1) marking The Designer as notified and entering/updating his ETA, and (2) dismissing the "Needs attention" flag after the CEO has reviewed it.
- Proposals remain in the queue after reaching "Signed" until they are explicitly archived
- The 18-hour threshold for red tint is fixed and not user-configurable in this version
- Data freshness is manual-refresh-only; the queue reflects state at page load time, not in real time
- The render threshold of $30,000 is fixed and not user-configurable in this version
- The app is used primarily on desktop/laptop; mobile optimization is out of scope for this version
