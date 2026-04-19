# Feature Proposal: Event Observation Surface

## Title

Event Observation Surface

## Summary

Create a first-class live observation workspace for canonical environment events.

This feature gives operators and engineers a way to observe active work as coordinated state changes rather than inferring system behavior from transcript output, log fragments, or shell rendering.

## Problem

Without a real event observation surface:

- live system behavior is harder to supervise
- concurrent work becomes harder to understand
- event evidence stays too abstract
- the desktop app risks reconstructing state indirectly instead of observing it directly

## User Outcome

A user can observe:

- what just changed
- what subsystem changed
- which entity changed
- which work or actor the change belongs to

and then pivot directly into the relevant entity.

## Primary Entities

- event
- turn
- operation
- artifact
- incident
- task
- worker
- work-item

## Truth Domains Affected

- image truth
- workflow truth

## Service Families Affected

- environment service
- conversation service
- workflow service
- artifact service
- incident service
- task service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It makes environment state changes directly observable through the canonical event spine.

### 2. How does it treat source, image, and workflow truth?

It primarily surfaces image and workflow change activity while maintaining links into the entities affected.

### 3. How does it preserve or improve governed execution?

It gives operators and engineers a live, event-backed observation surface for governed actions and state transitions.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It explicitly rejects transcript parsing and log scraping as the primary way to understand active work.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It shows that operations, approvals, incidents, and workflow changes are sibling environment events rather than hidden internal machinery.

## Regression Risk

Primary risks:

- the surface turns into an unreadable event dump
- it becomes a log screen with no entity linkage
- users are forced to supervise via feed-scrolling instead of structured views

Mitigation:

- require family and visibility filtering
- require entity linkage
- require the workspace to complement, not replace, entity views

## Capability Benchmark Impact

This exceeds classic tooling by making environment event evidence first-class and supervision-ready.

## UX Shape

### Entry Points

- primary navigation to Activity
- linked navigation from Environment posture
- deep links from attention items

### Primary View

A workspace with:

- canonical event stream
- filter controls
- actor and thread pivots
- linked entity inspector

### Linked Entity Traversal

The user must be able to move from an event into:

- thread
- turn
- operation
- artifact
- incident
- task
- work-item

### Live Event Behavior

The surface is itself live and event-driven, with replay and resume semantics.

### Attention Model Implications

The surface should support rapid understanding of urgent changes but should not replace the global attention model.

## Command And Query Shape

### Primary Queries

- `get-environment-events`
- event-stream subscription with cursor, family, and visibility filters

### Primary Commands

- none as a primary feature; this is an observation and pivot surface

### Key Returned State

- ordered event entries
- cursor
- family and visibility metadata
- linked entity references

### Key Event Emissions Consumed

- this workspace is driven by the canonical event stream itself

## Acceptance Criteria

- The product provides a dedicated event observation surface rather than relying on transcript or shell output.
- Users can filter events by subsystem and pivot directly into affected entities.
- The workspace supports replay-resume semantics through cursors.
- The surface complements structured entity views rather than replacing them.
- A thesis review concludes the feature strengthens event-native supervision and does not devolve into a generic log monitor.

## Open Questions

- What default filters should be applied for usability?
- How much event payload detail should be visible inline?
- Should actor identity always be shown in the default event row?
