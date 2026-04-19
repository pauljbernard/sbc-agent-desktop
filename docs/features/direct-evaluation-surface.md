# Feature Proposal: Direct Evaluation Surface

## Title

Direct Evaluation Surface

## Summary

Create a first-class expert execution surface in the macOS desktop application for evaluating Lisp forms and invoking governed runtime actions with minimal friction.

This feature preserves one of the deepest strengths of serious Common Lisp environments while keeping the result aligned with `sbcl-agent`’s governed, evidence-aware, environment-first model.

## Problem

If direct evaluation is hidden behind conversation, buried in the runtime workspace, or made overly ceremonial, the desktop app will fall below the usability bar set by mature Lisp environments.

If direct evaluation is completely unconstrained, the product loses one of its most important architectural strengths: governed execution with visible policy, evidence, and workflow consequences.

## User Outcome

An expert operator can execute quickly and directly in the live environment, while still seeing when an action becomes risky, policy-sensitive, or workflow-bearing.

## Primary Entities

- runtime
- operation
- artifact
- approval request
- event
- incident

## Truth Domains Affected

- image truth
- workflow truth

## Service Families Affected

- runtime service
- approval service
- artifact service
- incident service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It preserves direct interaction with the live environment as a central operating mode.

### 2. How does it treat source, image, and workflow truth?

It centers image truth while ensuring that governed consequences enter workflow truth when needed. It does not pretend that execution alone is full engineering closure.

### 3. How does it preserve or improve governed execution?

It distinguishes between low-risk direct evaluation and actions that require:

- policy checks
- approval
- artifact emission
- validation or reconciliation follow-up

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It gives expert users a direct execution path independent of file editing and independent of chat-first interaction.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It demonstrates that direct runtime work and governance are compatible rather than mutually exclusive.

## Regression Risk

Primary risks:

- the feature becomes just a desktop wrapper around the shell prompt
- governed actions feel indistinguishable from low-risk direct evaluation
- execution becomes so slowed by UI ceremony that users avoid the desktop app
- result presentation collapses into raw transcript-style output

Mitigation:

- separate execution input from result, operation, and evidence views
- visibly distinguish normal completion, approval wait, failure, and workflow-bearing consequences
- optimize for keyboard-first speed

## Capability Benchmark Impact

This feature must match the immediacy and expert utility of direct evaluation in mature Lisp environments.

It should exceed them by making policy, approvals, artifacts, and workflow consequences explicit only when they are actually relevant.

## UX Shape

### Entry Points

- dedicated execution panel or command surface
- runtime workspace
- keyboard shortcut from anywhere appropriate

### Primary View

A focused execution surface with:

- input editor for forms
- execution context indicator
- result region
- linked operation and evidence region
- approval or incident state when relevant

### Linked Entity Traversal

The user must be able to move from an execution result into:

- created operation
- related artifact
- approval request
- incident
- runtime context

### Live Event Behavior

The surface updates from operation, approval, incident, and workflow events.

### Attention Model Implications

The surface must clearly distinguish:

- executed successfully
- awaiting approval
- failed
- interrupted
- awaiting colder validation

## Command And Query Shape

### Primary Queries

- `get-runtime-summary`
- `get-policy-summary`
- `get-capability-grants`

### Primary Commands

- `evaluate-in-context`
- `propose-runtime-mutation`

### Key Returned State

- execution result
- created operation id
- policy result
- approval requirement if any
- artifact references if any
- incident references if any

### Key Event Emissions Consumed

- operation started
- operation completed
- operation failed
- approval requested
- approval granted or denied
- artifact created
- incident created

## Acceptance Criteria

- The desktop app provides a first-class, keyboard-efficient direct evaluation surface.
- Users can evaluate forms without routing through conversation-first UI.
- Governed consequences are surfaced explicitly when relevant and do not masquerade as ordinary completion.
- Results are linked to operations, approvals, artifacts, or incidents when those entities exist.
- The surface remains fast enough to satisfy expert live-development expectations.
- A thesis review concludes the feature preserves direct operator power without regressing into unguided or invisible mutation.

## Open Questions

- Should the direct evaluation surface be globally summonable or primarily anchored in the Runtime workspace?
- How much multiline editing capability is needed in the first version?
- How should past evaluations be retained without turning the surface into a transcript-first shell?
