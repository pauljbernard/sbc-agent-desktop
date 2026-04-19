# Feature Proposal: Work And Reconciliation Workspace

## Title

Work And Reconciliation Workspace

## Summary

Create the primary workspace for governed engineering progress, validation posture, reconciliation state, and closure readiness.

This feature is where `sbcl-agent` most clearly diverges from the old SDLC model by refusing to equate execution with durable closure.

## Problem

Without a serious work and reconciliation workspace:

- mutation outcomes are easy to overstate
- warm runtime success gets mistaken for complete engineering success
- waiting and blocked states become opaque
- workflow truth becomes secondary to chat and execution surfaces

## User Outcome

A developer or engineer can understand:

- what work exists
- what phase it is in
- what is blocked
- what still needs validation
- what still requires reconciliation
- what is actually ready to close

## Primary Entities

- work-item
- workflow record
- artifact
- incident
- approval request
- runtime
- source asset

## Truth Domains Affected

- workflow truth
- image truth
- source truth

## Service Families Affected

- workflow service
- artifact service
- incident service
- approval service
- runtime service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It makes governed work progression a first-class environment behavior, not a side effect of chat or command execution.

### 2. How does it treat source, image, and workflow truth?

It explicitly relates all three and keeps them distinguishable.

### 3. How does it preserve or improve governed execution?

It keeps validation, reconciliation, quarantine, and closure visible after execution rather than letting them disappear.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It gives work and closure semantics their own structured surface instead of leaving them implicit in file changes or chat completion.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It visibly teaches that execution, validation, reconciliation, and closure are different states.

## Regression Risk

Primary risks:

- the workspace becomes a generic task board
- workflow gets reduced to badges
- reconciliation is hidden behind advanced detail
- closure is misrepresented as execution success

Mitigation:

- require explicit workflow phase representation
- require waiting and blocked reasons
- require validation and reconciliation posture
- require closure readiness semantics

## Capability Benchmark Impact

This exceeds classic Lisp and IDE tooling by turning runtime and source mutation into governed engineering closure rather than stopping at “it worked.”

## UX Shape

### Entry Points

- primary navigation to Work
- linked navigation from runtime, incident, artifact, or turn
- global attention strip

### Primary View

A workspace with:

- work-item queue
- selected work-item detail
- workflow state and waiting model
- validation and reconciliation inspector

### Linked Entity Traversal

The user must be able to move from work detail into:

- workflow record
- related artifact
- related incident
- related approval
- runtime context
- source relationship

### Live Event Behavior

The workspace updates from workflow, artifact, runtime, approval, and incident events.

### Attention Model Implications

The workspace must surface:

- blocked work
- quarantined work
- awaiting colder validation
- reconciliation required
- approval-required work

## Command And Query Shape

### Primary Queries

- `list-work-items`
- `get-work-item`
- `get-workflow-record`
- `get-waiting-work-summary`
- `get-validation-posture`
- `get-reconciliation-posture`

### Primary Commands

- `create-work-item`
- `advance-workflow`
- `record-validation-result`
- `create-reconciliation-record`
- `close-workflow`

### Key Returned State

- work-item summary and detail
- workflow phase
- waiting reasons
- validation state
- reconciliation state
- linked entity references

### Key Event Emissions Consumed

- workflow state changed
- validation completed
- reconciliation created
- workflow quarantined
- workflow resumed
- workflow closed

## Acceptance Criteria

- The product provides a dedicated workspace for work-items and workflow records.
- Users can distinguish executed, validated, reconciled, blocked, quarantined, and closable work.
- Reconciliation burden is visible when image truth and source truth diverge.
- Linked artifacts, incidents, approvals, and runtime context remain navigable from work detail.
- A thesis review concludes the feature prevents successful execution from being misrepresented as full closure.

## Open Questions

- What is the most legible representation of workflow phases for dense desktop use?
- How much of reconciliation detail belongs inline versus in a secondary inspector?
- Should closure readiness be a dedicated summary block or part of workflow phase detail?
