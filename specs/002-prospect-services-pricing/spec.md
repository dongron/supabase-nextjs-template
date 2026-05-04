# Feature Specification: Prospect Services & Pricing

**Feature Branch**: `002-prospect-services-pricing`
**Created**: 2026-05-04
**Status**: Draft
**Input**: User description: "I want to have a screen with a list of services and prices for each service. It will be a single form with a many inputs, only PATCH operation when a save is clicked. List reloads after PATCH operation is completed. Generate example list of 10 services for a high-end residential outdoor construction company. It must be designed in a way, where every prospect can have assigned it's list of services and sum of prices."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Edit Prospect Service Prices (Priority: P1)

A staff member opens a prospect's profile and navigates to the Services & Pricing screen. They see a list of all available services with the price currently assigned to that prospect for each service. They update one or more prices and click Save. The form submits a single PATCH request and the list refreshes to reflect the saved values.

**Why this priority**: This is the core interaction. Without it the feature has no value.

**Independent Test**: Can be fully tested by opening a prospect, editing at least one price field, clicking Save, and verifying the displayed price matches what was saved.

**Acceptance Scenarios**:

1. **Given** a prospect exists and services are defined, **When** a staff member opens the Services screen for that prospect, **Then** a form is shown with one row per service displaying the service name, description, and the price assigned to that prospect (or a default price if none is assigned yet).
2. **Given** the Services form is open, **When** the staff member changes one or more price fields and clicks Save, **Then** a single PATCH request is sent with all changed values and a success confirmation is shown.
3. **Given** a successful PATCH response, **When** the save completes, **Then** the list reloads automatically and displays the newly saved values.
4. **Given** the Services form is open, **When** the staff member clicks Save without changing any values, **Then** a PATCH is still sent (or a no-op confirmation shown) and the list reloads without error.

---

### User Story 2 - View Prospect Service Total (Priority: P2)

A staff member views the Services & Pricing screen and sees a running total (sum) of all assigned service prices for that prospect at the bottom of the form, updating in real time as prices are edited before saving.

**Why this priority**: The sum is a key business output that enables quick quotation decisions.

**Independent Test**: Can be tested by verifying the displayed total matches the arithmetic sum of all visible price fields and that it updates immediately when a price is changed without requiring a save.

**Acceptance Scenarios**:

1. **Given** the Services form is loaded, **When** the page renders, **Then** a total line shows the sum of all service prices for the prospect.
2. **Given** the staff member edits a price field, **When** the value changes, **Then** the total updates immediately without a page reload.

---

### User Story 3 - Per-Prospect Service Assignment (Priority: P3)

Each prospect maintains an independent set of service prices. Changing the prices for one prospect does not affect any other prospect's service prices.

**Why this priority**: Data isolation between prospects is a correctness requirement but doesn't add new UI surface area.

**Independent Test**: Can be verified by saving different prices for two different prospects and confirming each retains its own values.

**Acceptance Scenarios**:

1. **Given** two prospects exist, **When** a staff member changes service prices for Prospect A and saves, **Then** Prospect B's service prices remain unchanged.
2. **Given** a new prospect is created, **When** their Services screen is opened for the first time, **Then** all services are listed with default prices (e.g., zero or catalog default).

---

### Edge Cases

- What happens when a price field is left empty or cleared? The system should treat blank as zero or reject with a validation message before saving.
- What happens if the PATCH request fails (network error, server error)? An error message is shown and the form retains the unsaved values so no data is lost.
- What happens when no services exist in the catalog? An empty state message is shown with guidance to add services.
- What happens if a service is added to the catalog after some prospects already have assignments? The new service appears on all existing prospect service screens with a default price of zero.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a single-page form listing all services in the catalog, one row per service, scoped to a specific prospect.
- **FR-002**: Each row MUST show at minimum: service name, a brief description, and an editable price field.
- **FR-003**: System MUST calculate and display a running total of all service prices in the form, updating immediately when any price field changes.
- **FR-004**: System MUST submit all form values via a single PATCH operation when the user clicks Save, regardless of how many fields were changed.
- **FR-005**: System MUST reload the service list from the server after a successful PATCH operation.
- **FR-006**: System MUST display a success notification after a successful save.
- **FR-007**: System MUST display an error notification and preserve unsaved values if the PATCH operation fails.
- **FR-008**: Each prospect MUST have an independent set of service prices; changes to one prospect do not affect others.
- **FR-009**: Price fields MUST accept only valid non-negative numeric values; invalid input MUST be rejected before submission.
- **FR-010**: System MUST provide an empty-state message when no services exist in the catalog.
- **FR-011**: When a prospect has no previously saved price for a service, the default value MUST be zero (or a catalog-defined default if provided).

### Key Entities

- **Service** (catalog item): Represents a type of work offered. Has a name, a short description, and an optional catalog default price. Shared across all prospects.
- **ProspectService** (assignment): Links a prospect to a service with a prospect-specific price override. One record per prospect-service pair.
- **Prospect**: An existing entity in the system. Has many ProspectService assignments.
- **ServicesPricingSummary**: A derived view per prospect showing all services with their assigned prices and the aggregate total.

### Service Catalog — Example Data (High-End Residential Outdoor Construction)

| # | Service Name | Description | Default Price |
|---|---|---|---|
| 1 | Landscape Design Consultation | Custom site assessment and detailed design plan prepared by a certified landscape architect | $2,500 |
| 2 | Custom Stone Patio Installation | Design and installation of natural or engineered stone patio with premium jointing | $18,000 |
| 3 | Swimming Pool Construction | Full excavation, structural build, tiling, and equipment fit-out for an in-ground pool | $85,000 |
| 4 | Outdoor Kitchen & BBQ Area | Built-in grill station, countertops, cabinetry, and utility connections | $22,000 |
| 5 | Pergola / Gazebo Construction | Custom timber or steel structure with optional roofing and finishing | $14,000 |
| 6 | Irrigation System Installation | Design and installation of a zoned automatic drip or spray irrigation system | $6,500 |
| 7 | Outdoor Lighting Design & Installation | Low-voltage landscape lighting scheme with fixtures, wiring, and smart controls | $8,000 |
| 8 | Retaining Wall Construction | Engineered retaining wall using natural stone, block, or timber for sloped sites | $12,000 |
| 9 | Driveway & Pathways Paving | Premium paving using natural stone, exposed aggregate, or stamped concrete | $16,000 |
| 10 | Garden Planting & Landscaping | Supply and installation of trees, shrubs, ground cover, and mulching per approved plan | $9,500 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff members can open, edit, and save a prospect's service pricing in under 60 seconds.
- **SC-002**: The form total updates in real time with no perceptible delay after any price field change.
- **SC-003**: After saving, the list reloads and reflects the saved state within 2 seconds under normal network conditions.
- **SC-004**: Incorrect price input (non-numeric, negative) is rejected before submission 100% of the time, with a clear validation message.
- **SC-005**: Service prices for different prospects remain independently stored; cross-prospect data contamination is zero.

## Assumptions

- The Prospect entity already exists in the system; this feature adds a service pricing sub-screen to the existing prospect detail view.
- The services catalog (list of available services) is managed separately; this screen does not add, remove, or rename catalog services.
- Prices are stored as currency values in the project's default currency (no multi-currency support in scope).
- All users with access to a prospect's profile may view and edit that prospect's service pricing; role-based restrictions on this screen are out of scope for v1.
- Mobile-specific layouts are out of scope; the form is optimized for desktop/tablet use.
- The PATCH endpoint accepts the full list of service-price pairs for a prospect in a single call (bulk update, not per-row).
