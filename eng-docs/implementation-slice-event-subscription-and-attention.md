# Implementation Slice: Event Subscription And Attention

## Purpose

This slice defines the first live supervision path in the desktop app.

It proves that the application can:

- subscribe to canonical environment events
- replay from cursor
- update visible desktop state from those events
- populate the first global attention model

This is the slice that turns the desktop product from a sequence of queries into a live environment.

## Scope

This slice includes:

- event subscription from main process
- cursor replay support
- forwarding of app-safe event updates through preload
- minimal global attention aggregation in the desktop app
- visible attention updates in the desktop frame

This slice does **not** include:

- the full Event Observation workspace
- deep actor-level supervision views
- every event family perfectly handled

## User-Visible Outcome

A user can keep the desktop app open and see attention state update live when:

- approval is requested
- incident is created
- a turn changes into a waiting or failed state
- a workflow changes into a blocked or quarantined state

## `sbcl-agent` Touch Points

### Required Work

- expose event subscription endpoint
- support replay from cursor
- support family and visibility filtering
- emit canonical event payloads through the external host

### Existing Internal Areas Likely Involved

- environment event log
- event-service layer
- service host event publisher
- event DTO normalization

### Deliverables

- event-plane host support
- replay and live delivery behavior
- stable event payload envelopes

## Electron Touch Points

### Main Process

- event client
- cursor persistence
- event dispatcher
- attention aggregation
- renderer-safe event forwarding

### Preload

- `events.subscribeEnvironmentEvents(input, handler)`
- `events.unsubscribe(subscriptionId)`

### Renderer

- shell attention strip or rail
- minimal live host/attention status

## Protocol Operations

### Required Messages

- subscribe message
- subscription ack message
- event message
- error message

## DTOs Used

- `EnvironmentEventDto`
- `AttentionSummaryDto`
- `EventSubscriptionHandle`

## Event Families In Initial Scope

The first implementation should at least handle:

- approval-related events
- incident-related events
- conversation turn state events
- workflow state events

These are enough to prove meaningful live attention behavior.

## Renderer View Requirements

The shell should render:

- awaiting approval count
- incident count
- blocked/quarantined work count
- interrupted or failed turn count

It does not need the full Activity workspace yet, but the shell must visibly react to live event changes.

## Acceptance Tests

### Backend Acceptance

- client can subscribe from cursor
- replay occurs before live delivery
- event filtering works for at least one family or visibility path

### Electron Acceptance

- main process owns event connection and cursor
- preload exposes typed event subscription
- renderer receives safe forwarded events without raw transport access
- shell attention updates live from incoming events

### Thesis Acceptance

- the app begins to function as a live supervised environment rather than a static query client
- event-native observation is proven without relying on transcript parsing or shell rendering
- attention is environment-wide rather than workspace-local only

## Exit Criteria

This slice is complete when:

1. the main process can subscribe and replay environment events
2. the renderer receives live event-derived updates through the preload bridge
3. the desktop shell visibly reflects real-time attention changes
