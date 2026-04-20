# Feature Proposal: Incident Workspace

## Title

Incident Workspace

## Summary

Create a dedicated incident workspace for failure, interruption, and governed recovery.

This feature turns runtime and workflow failure into structured recovery work rather than reducing it to logs, banners, or transcript interruptions.

## Problem

Without a serious incident workspace:

- failures become transient and easy to lose
- operators must reconstruct context manually
- recovery turns into ad hoc debugging
- the product regresses below the standard expected from serious Lisp condition handling

## User Outcome

A developer or operator can move from:

- failure
- interruption
- blocked recovery

to a clear governed recovery posture with linked runtime, turn, operation, work, and evidence context.

## Primary Entities

- incident
- runtime
- operation
- turn
- work-item
- artifact

## Truth Domains Affected

- image truth
- workflow truth

## Service Families Affected

- incident service
- runtime service
- workflow service
- artifact service
- conversation service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It keeps failure inside the environment as durable governed work rather than externalizing it into logs or transient notifications.

### 2. How does it treat source, image, and workflow truth?

It centers image and workflow truth while preserving links to source or artifacts where recovery depends on them.

### 3. How does it preserve or improve governed execution?

It makes failure, interruption, and recovery part of the execution model rather than treating them as exceptions outside the product.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It does not require users to reconstruct failure from files, logs, or transcript fragments alone.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It shows that the environment preserves failure context and recovery state as first-class truth.

## Regression Risk

Primary risks:

- incidents collapse into notification banners
- incident detail becomes a log dump
- interrupted work and approval waits are conflated
- recovery remains unclear

Mitigation:

- require incident queue
- require structured incident detail
- require linked entity context
- require explicit recovery posture

## Capability Benchmark Impact

This must match the seriousness of legacy Lisp debugging workflows and exceed them through governed recovery, evidence, and linkage.

## UX Shape

### Entry Points

- global attention strip
- Incidents workspace
- linked navigation from thread, turn, runtime, or work-item

### Primary View

A workspace with:

- incident queue
- selected incident detail
- linked context and evidence inspector

The dominant work surface is the incident queue and selected recovery detail. Evidence and linked context remain coupled to the selected incident but should not compete with the queue as a separate first-row dashboard.

The incident queue or recovery detail body owns scroll as the primary growing object. Navigation and recovery action controls should remain stable while the detail grows.

### Linked Entity Traversal

The user must be able to move from incident detail into:

- runtime scope
- failed operation
- related turn
- work-item
- evidence artifact

### Live Event Behavior

The workspace updates from incident, runtime, workflow, and artifact events.

### Attention Model Implications

Open incidents, interrupted recovery, and unresolved high-risk failures must remain globally visible.

## Command And Query Shape

### Primary Queries

- `list-incidents`
- `get-incident`
- `get-recovery-posture`
- `get-linked-incident-context`

### Primary Commands

- `acknowledge-incident`
- `start-recovery-workflow`
- `attach-incident-evidence`
- `resolve-incident`

### Key Returned State

- incident summary and detail
- recovery posture
- linked entity references
- closure state

### Key Event Emissions Consumed

- incident created
- incident updated
- recovery state changed
- incident resolved
- related runtime and workflow changes

## Acceptance Criteria

- The product provides a dedicated incident workspace rather than relying on notifications or logs.
- Users can inspect linked runtime, operation, turn, and work-item context from incident detail.
- Interrupted work and approval waits are distinguishable from failure-driven recovery.
- The workspace supports evidence-backed recovery and closure tracking.
- A capability review concludes the feature meets the seriousness expected for Lisp-grade failure handling and strengthens the `sbcl-agent` thesis.
- The incident queue remains the primary work surface and selected incident detail stays spatially coupled to it.
- Scroll ownership is explicit: queue and recovery detail bodies scroll independently of outer shell chrome.

## Open Questions

- How should incident severity or urgency be expressed visually without clutter?
- What recovery guidance should be machine-generated versus purely state-derived?
- How should resolved incidents remain accessible for later evidence review?
