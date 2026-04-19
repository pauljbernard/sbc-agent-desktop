# Implementation Slice: Incident Workspace

## Purpose

This slice defines the first full recovery-oriented failure surface in the desktop app.

It proves that failures and interruptions become governed recovery work rather than transient UI noise.

## Scope

This slice includes:

- incident list query
- incident detail query
- Incidents workspace list/detail rendering
- linked context rendering for runtime, turn, operation, and work-item references
- basic recovery posture rendering
- incident-driven navigation from global attention and event observation surfaces

This slice does **not** include:

- rich machine-authored recovery guidance
- full artifact evidence drill-in
- advanced severity analytics
- full recovery command surface beyond what the first backend path supports

## User-Visible Outcome

A user can open the Incidents workspace, see open incidents, inspect one, and understand:

- what failed
- what it is linked to
- what the current recovery posture is
- whether the incident is awaiting acknowledgement, active recovery, or governed closure

## `sbcl-agent` Touch Points

### Required Work

- expose `incident.list`
- expose `incident.detail`
- expose `incident.recovery_posture` if distinct from detail
- normalize outputs to incident DTOs

### Existing Internal Areas Likely Involved

- `src/incident-service.lisp`
- incident summaries and detail builders
- linked context builders
- DTO normalization layer

### Deliverables

- incident list externalization
- incident detail externalization
- recovery posture representation

## Electron Touch Points

### Main Process

- incident query client integration
- entity-open routing for incidents and linked entities
- event-driven cache invalidation for incident and recovery posture data

### Preload

- `query.incidentList(environmentId?)`
- `query.incidentDetail(incidentId, environmentId?)`

If separate recovery posture query exists:

- `query.incidentRecoveryPosture(incidentId, environmentId?)`

### Renderer

- Incidents workspace shell
- incident queue/list
- incident detail panel
- linked context section
- recovery posture summary block

## Protocol Operations

### Required Targets

- `incident.list`
- `incident.detail`
- `incident.recovery_posture` if separate

## DTOs Used

- `IncidentSummaryDto`
- `IncidentDetailDto`
- `QueryResultDto<IncidentSummaryDto[]>`
- `QueryResultDto<IncidentDetailDto>`

## Renderer View Requirements

### Incident List

Must render:

- title
- state
- severity if available
- linked turn/operation/work-item presence if available
- last updated time if available

### Incident Detail

Must render:

- title
- summary
- state
- severity
- runtime id if present
- linked turn/operation/work-item refs
- recovery summary if present
- artifact ids if present
- acknowledgement or recovery status if present

The first version may use linked chips or lightweight entity refs for related objects rather than fully embedded detail.

### Recovery Posture

Must render:

- current recovery state
- next required operator action if known
- blocked reason if recovery is waiting

The first version should prefer explicit state labels over speculative machine advice.

## Acceptance Tests

### Backend Acceptance

- incident list returns stable summary DTOs
- incident detail returns stable detail DTOs
- linked context fields are present when known
- recovery posture fields are normalized enough for direct UI rendering

### Electron Acceptance

- Incidents workspace renders real host-backed incident data
- selecting an incident loads detail
- linked context is visible and navigable at a basic level
- incident-derived attention items can route into the selected incident when such attention state exists

### Thesis Acceptance

- incidents do not appear only as notifications or logs
- failure is represented as durable governed state
- recovery context is visible without transcript reconstruction
- the workspace does not collapse into an error console or stack-trace viewer

## Exit Criteria

This slice is complete when:

1. the Incidents workspace is backed by real host data
2. users can inspect incidents and linked context meaningfully
3. the app treats failure as first-class recovery work
