# Implementation Slice: Event Observation Surface

## Purpose

This slice defines the first dedicated live observation workspace for canonical environment events.

It extends the earlier event subscription and attention slice by proving that events are a first-class user-facing observation surface, not merely a backend feed for summary badges.

## Scope

This slice includes:

- event observation workspace shell
- event replay and live streaming into the workspace
- family and visibility filtering
- selection and linked entity navigation
- event-driven pivot into threads, turns, incidents, approvals, work-items, and artifacts

This slice does **not** include:

- advanced saved filters
- timeline analytics
- full actor graph views
- raw log viewer behavior as the default product posture

## User-Visible Outcome

A user can open the Event Observation surface, see canonical environment events arrive live, filter them, and pivot into the entities they affect.

## `sbcl-agent` Touch Points

### Required Work

- ensure event subscription endpoint supports replay and live streaming
- ensure family and visibility filtering are externally available
- ensure canonical event payloads are stable and normalized

### Existing Internal Areas Likely Involved

- event service
- environment event log
- service host event publisher
- event DTO normalization

### Deliverables

- stable external event subscription
- stable event payload normalization
- replay + live semantics proven under desktop usage

## Electron Touch Points

### Main Process

- event client
- event dispatcher
- workspace event-store projection
- cursor persistence for replay-resume continuity

### Preload

- `events.subscribeEnvironmentEvents(input, handler)`
- `events.unsubscribe(subscriptionId)`
- `query.environmentEvents(input)` if the product needs explicit replay bootstrap separate from subscription

### Renderer

- Activity or Event Observation workspace shell
- event list
- event filter controls
- selected event detail
- linked entity pivot actions

## Protocol Operations

### Required Messages

- subscribe
- subscription ack
- event
- error

## DTOs Used

- `EnvironmentEventDto`
- `EventSubscriptionHandle`
- `EntityRefDto`

## Renderer View Requirements

### Event List

Must render:

- cursor
- kind
- family
- timestamp
- entity references where present
- actor or origin summary if present

### Filters

Must support:

- family filter
- visibility filter

### Event Detail

Must render:

- event payload summary
- metadata summary
- linked entity refs

The first version does not need to expose every payload field richly, but it must do more than show a raw text dump.

### Observation Guardrail

The workspace must present events as structured environment changes with navigable meaning.

It must not default to:

- raw JSON rows
- terminal-style streaming text
- a log-console mental model

## Acceptance Tests

### Backend Acceptance

- event subscription supports replay and live streaming
- filtered subscriptions return appropriately scoped events
- event payloads remain stable enough for UI rendering
- cursor values are stable enough for resume semantics across app restarts

### Electron Acceptance

- Event Observation workspace renders replayed and live events
- users can apply at least family and visibility filters
- selecting an event reveals usable detail and linked entity refs
- event rows can open relevant entity workspaces without raw transport access from the renderer

### Thesis Acceptance

- the app exposes event-native observation as a first-class surface
- supervision does not depend on transcript parsing or shell output
- the workspace complements structured entity views instead of replacing them

## Exit Criteria

This slice is complete when:

1. the Event Observation workspace is backed by real event subscription data
2. users can replay, observe, and filter live environment events
3. the app visibly treats canonical events as a first-class observation boundary
