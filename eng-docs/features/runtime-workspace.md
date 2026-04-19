# Feature Proposal: Runtime Workspace

## Title

Runtime Workspace

## Summary

Create a flagship runtime-native workspace for inspecting and working with the live SBCL image inside the governed `sbcl-agent` environment.

This feature is the most direct expression of the product thesis that runtime truth matters and must not be hidden behind file views, logs, or transcript summaries.

## Problem

If the runtime workspace is weak, secondary, or overly indirect, the desktop app will regress into a conventional SDLC tool where source is primary and the running system is only inferred after the fact.

That would undermine both the Common Lisp development benchmark and the core `sbcl-agent` thesis.

## User Outcome

A developer or engineer can inspect the live runtime with the same seriousness expected from top-tier Lisp tooling, while also seeing its governed relationship to source, incidents, operations, and workflow.

## Primary Entities

- runtime
- source asset
- operation
- incident
- artifact
- event

## Truth Domains Affected

- image truth
- source truth
- workflow truth

## Service Families Affected

- runtime service
- workflow service
- artifact service
- incident service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It makes runtime truth a first-class environment surface rather than an implementation detail beneath source and chat.

### 2. How does it treat source, image, and workflow truth?

It centers image truth while preserving clear linkage to:

- source-backed definitions and divergence
- workflow obligations such as validation and reconciliation

### 3. How does it preserve or improve governed execution?

It keeps runtime inspection and runtime mutation inside the same governed environment model, rather than forcing a choice between power and accountability.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It gives users direct runtime navigation and inspection views. The user does not need to infer runtime state from files, chat text, or shell output alone.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It demonstrates that the running image is part of the engineering substrate, not a hidden backend.

## Regression Risk

Primary risks:

- runtime becomes an advanced-only panel
- runtime inspection is reduced to textual dumps
- source navigation dominates and runtime becomes a linked afterthought
- runtime mutation is made so ceremonial that users avoid it

Mitigation:

- make Runtime a first-tier workspace in primary navigation
- require structured inspection views
- require strong source-image relationship views
- preserve low-friction inspection and direct execution entry points

## Capability Benchmark Impact

This feature must match or exceed the runtime introspection power serious Lisp users expect from LispWorks, SLIME, and Allegro CL.

It should exceed them by connecting runtime truth to:

- incidents
- operations
- artifacts
- workflow and reconciliation posture

## UX Shape

### Entry Points

- primary navigation to Runtime
- linked navigation from turns, incidents, work-items, and artifacts
- direct symbol, package, or definition open actions

### Primary View

A multi-region desktop workspace with:

- runtime posture summary
- package and symbol navigator
- selected runtime scope detail
- linked source, incident, and workflow inspector

### Linked Entity Traversal

The user must be able to move among:

- package to symbol
- symbol to loaded definition
- definition to runtime context
- runtime context to incident, operation, artifact, or work-item
- runtime context to source divergence and reconciliation posture

### Live Event Behavior

The workspace updates through runtime and workflow event streams.

It should react to:

- runtime mutations
- incidents
- validation status changes
- reconciliation state changes

### Attention Model Implications

The runtime workspace must surface:

- active runtime mutation
- failed mutation
- awaiting colder validation
- linked incident state

## Command And Query Shape

### Primary Queries

- `get-runtime-summary`
- `get-package-summary`
- `get-symbol-summary`
- `get-loaded-definition`
- `get-runtime-divergence-posture`
- `get-linked-incident-context`

### Primary Commands

- `inspect-runtime-scope`
- `evaluate-in-context`
- `propose-runtime-mutation`

### Key Returned State

- runtime posture
- selected scope summary
- linked source references
- divergence posture
- related incident or artifact references

### Key Event Emissions Consumed

- runtime mutation started
- runtime mutation completed
- runtime mutation failed
- runtime awaiting cold validation
- incident created or updated
- workflow validation completed

## Acceptance Criteria

- Runtime appears as a first-tier workspace in the application.
- Users can inspect packages, symbols, loaded definitions, and runtime posture without dropping into external tooling.
- Runtime views preserve visible relationships to source divergence, incidents, and workflow posture.
- The workspace supports low-friction inspection and execution entry points.
- Runtime changes and failures update live from canonical events.
- A capability review concludes the feature is competitive with serious Lisp runtime tooling and thesis-strengthening for `sbcl-agent`.

## Open Questions

- What is the right initial scope for object-level inspection versus package and symbol inspection?
- How should runtime state be rendered so it is precise without becoming unreadably dense?
- Which runtime relationships need first-class visual treatment versus inspector detail?
