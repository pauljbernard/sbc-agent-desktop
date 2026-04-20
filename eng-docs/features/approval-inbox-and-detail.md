# Feature Proposal: Approval Inbox And Detail

## Title

Approval Inbox And Detail

## Summary

Create a first-class approval workspace and detail model for governed authorization of sensitive actions.

This feature ensures approvals are treated as explicit governance records with scope, consequence, and linkage, rather than as generic confirmation dialogs.

## Problem

Without a serious approval surface:

- governed execution becomes opaque
- risky actions become harder to evaluate responsibly
- workflow truth collapses into UI prompts
- the product drifts back toward convenience-first mutation

## User Outcome

A developer, engineer, or operator can understand:

- what action is being requested
- why approval is required
- what scope is affected
- what work will resume or proceed if approval is granted

## Primary Entities

- approval request
- policy
- operation
- work-item
- thread
- turn
- incident

## Truth Domains Affected

- workflow truth
- image truth when runtime-affecting scope is involved

## Service Families Affected

- approval service
- workflow service
- conversation service
- incident service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It keeps authorization in the environment model as explicit governed state rather than scattering it across local UI prompts.

### 2. How does it treat source, image, and workflow truth?

It centers workflow truth while showing runtime and turn scope when the proposed action affects them.

### 3. How does it preserve or improve governed execution?

It makes approval context legible before execution continues and keeps the result linked to the underlying work.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It does not bury approval inside message text or file operations. Approval becomes its own structured review surface.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It makes governance visibly intrinsic rather than administrative overhead.

## Regression Risk

Primary risks:

- approval becomes a modal yes/no prompt
- users cannot tell consequence or scope
- policy basis is hidden
- post-decision state is not visible

Mitigation:

- require approval inbox
- require linked entity context
- require visible consequence explanation
- require post-decision workflow visibility

## Capability Benchmark Impact

This exceeds classic Lisp tooling by making accountable mutation and approval an integrated engineering capability.

## UX Shape

### Entry Points

- global attention strip
- Approvals workspace
- linked navigation from turn, operation, or work-item

### Primary View

A workspace with:

- approval inbox list
- selected approval detail
- linked entity and policy inspector

The dominant work surface is the approval inbox list, with selected approval detail directly coupled to that list and policy or linked-entity context moved into inspector space.

The approval inbox owns scroll as the growing operational record set. Approval decision controls and linked policy context should remain spatially stable while the inbox grows.

### Linked Entity Traversal

The user must be able to move from approval detail into:

- operation
- turn
- work-item
- incident
- policy context

### Live Event Behavior

The workspace updates from approval, workflow, operation, and incident events.

### Attention Model Implications

Awaiting approval must remain globally visible and also deeply inspectable here.

## Command And Query Shape

### Primary Queries

- `list-approval-requests`
- `get-approval-request`
- `get-policy-summary`
- `get-capability-grants`

### Primary Commands

- `approve-request`
- `deny-request`
- `grant-capability-scope`

### Key Returned State

- approval detail
- policy basis
- affected scope
- linked entity references
- decision outcome

### Key Event Emissions Consumed

- approval requested
- approval granted
- approval denied
- workflow state changed
- operation resumed or blocked

## Acceptance Criteria

- Approval requests are visible in a dedicated inbox and not only as inline prompts.
- Approval detail exposes scope, rationale, consequence, and linked work.
- Users can approve or deny with clear understanding of what happens next.
- Decision results are reflected in linked thread, turn, operation, and workflow state.
- A thesis review concludes the feature prevents approval from collapsing into generic UI confirmation.
- The approval inbox remains the primary work surface rather than being preceded by dashboard-like summary rows.
- Scroll ownership is explicit: the inbox or selected detail body scrolls, not the whole page chrome.

## Open Questions

- Should approvals be grouped primarily by urgency, actor, or work context?
- What is the right amount of policy explanation for fast operator decision-making?
- How should stale or superseded approvals be represented?
