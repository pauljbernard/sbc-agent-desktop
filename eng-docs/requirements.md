# Requirements

## Purpose

This document defines the requirements for a world-class macOS desktop frontend for `sbcl-agent`.

The frontend must faithfully expose the system that exists and the system it is becoming:

- an environment-first engineering substrate
- grounded in source truth, image truth, and workflow truth
- governed by policy, approvals, evidence, and reconciliation
- usable directly by expert operators while extensible to richer presentation layers

## Platform Requirement

The primary product defined by this repository is a macOS desktop application.

This implies:

- desktop-native interaction quality
- persistent multi-pane or multi-workspace engineering workflows where useful
- strong support for keyboard-driven expert operation
- low-latency event handling for active runtime and workflow state
- local integration patterns appropriate to a developer workstation

The repository is not defining a web frontend as the primary delivery vehicle.

## Framing Requirement

The frontend must explicitly reflect the fundamental shift in software development embodied by `sbcl-agent`:

- from file-first proxies toward environment-native engineering
- from runtime opacity toward runtime legibility
- from transcript-centered assistants toward structured multi-domain interaction
- from post hoc governance toward governance during execution
- from human-only tooling assumptions toward multi-actor environments with humans and agents

Any UX concept that obscures or reverses this shift fails the requirements, even if it is more familiar.

## Product Goals

The UX must enable developers and engineers to:

- understand the current state of an environment quickly
- move fluidly among source state, runtime state, and workflow state
- inspect and act on live runtime conditions with appropriate governance
- understand what the system is doing now, not just what it said
- manage approvals, incidents, validation, and reconciliation as first-class work
- work across direct commands, conversation, and background execution without losing context

## Primary Users

### Expert Operator

A developer or engineer who needs direct access to runtime and mutation capabilities with minimal abstraction overhead.

### Governance-Aware Engineer

A developer, technical lead, or operator who needs confidence that mutations, approvals, and validations are explicit and traceable.

### System Steward

A user responsible for monitoring the posture of the environment, active work, incidents, blocked operations, and evidence quality.

### Future Multi-Actor User

A user coordinating with resident agents, workers, or other operators in a shared environment.

## User Outcomes

The UX succeeds when users can answer the following with low friction:

1. What is this environment, and what is active right now?
2. What thread, turn, operation, task, or incident requires my attention?
3. What changed in source?
4. What changed in the live image?
5. What approvals or validations are pending?
6. What evidence supports closure, rollback, or reconciliation?

## Functional Requirements

### FR-0 Workspace Focus Discipline

Every workspace must make the active work object visually dominant.

This requires:

- a single clear primary surface in the center canvas
- supporting context moved to inspectors, selected-row detail, or collapsible secondary surfaces
- elimination of repeated workspace framing once the user is inside the active task
- strong preference for compact action controls over oversized decorative controls

Dashboard-like first rows, duplicated summary copy, and competing primary panels violate this requirement.

### FR-1 Environment Orientation

The system must provide an environment-level orientation view that shows:

- environment identity and status
- active thread and turn context
- runtime posture
- workflow posture
- incidents and blocked work
- recent artifacts and evidence
- active tasks and workers

### FR-2 Three-Truth Navigation

The UX must provide direct navigation among:

- source-backed entities and artifacts
- live runtime entities and execution state
- workflow records, approvals, validations, incidents, and reconciliation evidence

The user must be able to traverse relationships among these domains without reconstructing context manually.

### FR-3 Durable Conversation Model

The UX must represent conversation through explicit entities:

- threads
- messages
- turns
- operations
- artifacts

The UX must not reduce these to a plain scrolling transcript.

Conversation views must also distinguish between:

- navigation over threads
- the active transcript or turn body
- metadata and linked governed context

These must not collapse into one undifferentiated scrolling page.

### FR-4 Turn Lifecycle Visibility

The system must expose turn lifecycle states, including when a turn is:

- initializing
- streaming
- dispatching or running operations
- awaiting approval
- awaiting provider follow-up
- finalizing
- completed
- failed
- interrupted

### FR-5 Operation Visibility

Each operation must expose:

- action kind
- initiating actor
- target scope
- policy result
- execution status
- outputs or resulting artifacts
- links to associated turn, work-item, incident, and evidence where applicable

### FR-6 Approval Workflows

The UX must make approval-gated work explicit before execution proceeds.

Approval surfaces must show:

- what action is proposed
- why approval is required
- what scope is affected
- what evidence or context supports the request
- what will happen after approval

### FR-7 Runtime Inspection

The UX must support inspection of runtime-native concerns, including:

- loaded definitions
- package and symbol state
- active threads and workers
- tasks and queues
- live objects or runtime summaries
- current incidents and recovery state

### FR-8 Source/Image Reconciliation

The UX must support workflows that reveal and manage divergence between:

- durable source state
- loaded image state

This includes visibility into:

- what was changed live
- what has not yet been reconciled to durable source
- what still requires validation

### FR-9 Workflow Governance

The UX must represent work-items and workflow records as first-class governed entities.

Users must be able to inspect:

- current phase
- waiting reason
- required approvals
- validation status
- incident linkage
- reconciliation status
- closure conditions

### FR-10 Incident-Centric Recovery

The UX must expose incidents as durable workflow objects rather than transient error banners.

Incident views must show:

- triggering context
- related runtime, turn, and operation
- current recovery posture
- recommended next actions
- linked evidence and work-items

### FR-11 Artifact-Centric Evidence

The UX must surface artifacts as durable outcomes, not just downloadable attachments.

Artifacts must be identifiable by:

- kind
- title or summary
- source
- producing turn or operation
- associated work-item or incident
- evidence role

### FR-12 Event-Driven Freshness

The UX must be designed for event-driven updates rather than manual refresh assumptions.

At minimum, the system must support live updates for:

- turn and operation state
- approvals
- incidents
- tasks and workers
- artifacts
- workflow posture

### FR-12a Scroll Ownership

Each workspace must define one primary scroll owner for its central task.

The UX must avoid outer-page scrolling when the real growing object is a transcript, table, feed, or result body.

Acceptance for this requirement includes:

- short histories or short result sets should anchor naturally against the active control surface
- fixed navigation and action regions must remain visually stable while the growing work body scrolls
- nested scroll behavior must be deliberate and predictable

### FR-13 Frontend As Presentation Layer

The frontend must operate as a presentation layer over `sbcl-agent`, not as an independent product model.

This means:

- domain truth must come from environment-owned services
- frontend state must remain subordinate to kernel state
- shell behavior and future UI behavior must converge on the same service contracts
- no critical workflow rule may exist only in frontend code

### FR-14 Multiple Control Surfaces

The product must support multiple coherent interaction modes over the same underlying truth:

- direct command or REPL interaction
- durable conversation
- governed workflow operations
- background execution

Future UI surfaces must extend, not fragment, these modes.

### FR-15 macOS Desktop Quality

The application must support a desktop-grade engineering workflow, including:

- persistent window and workspace state where appropriate
- keyboard-first navigation and command execution
- simultaneous visibility into related entities when beneficial
- live status updates without browser-style page transitions
- interaction patterns suitable for long-running engineering sessions

### FR-16 Progressive Metadata Disclosure

The product must favor on-demand metadata over always-visible metadata.

This means:

- timestamps, actor labels, provenance, and similar secondary facts should appear in inspectors or selected detail by default
- inline lists and transcripts should privilege readability and actionability over exhaustive annotation
- dense metadata may be revealed on selection, focus, or explicit expansion

The UX should optimize for fast comprehension first and completeness on demand second.

### FR-17 Collapsible Secondary Surfaces

Secondary navigation and supervision surfaces must support collapse when the user is engaged in focused work.

When collapsed, these surfaces must still preserve:

- orientation
- restore affordance
- critical attention signal

They must not simply disappear without a recoverable path or hide urgent state entirely.

## Non-Functional Requirements

### NFR-1 Truth Clarity

The UX must clearly distinguish source, image, and workflow truth in language, layout, and interaction design.

### NFR-2 Governance Legibility

Policy, approvals, evidence, and validation state must be easy to locate and understand during active work.

### NFR-3 Low Cognitive Reconstruction

The product must minimize the amount of manual reconstruction users perform to understand causality, ownership, or current state.

### NFR-4 Expert Efficiency

The UX must preserve fast interaction paths for expert users and avoid burying high-value capabilities behind excessive ceremony.

### NFR-5 Stable Service Dependence

UX implementation must depend on stable service contracts rather than private shell or session internals.

### NFR-6 Concurrent Comprehension

The product must remain legible when multiple turns, tasks, workers, agents, or incidents are active at once.

### NFR-7 Honest State Representation

The UX must distinguish:

- implemented behavior
- transitional behavior
- unavailable behavior

It must not imply stronger guarantees than the underlying services actually provide.

### NFR-8 Evidence Preservation

The product must present durable evidence and not depend on transient UI state as the only record of meaningful work.

### NFR-9 Desktop-Grade Responsiveness

The macOS application must remain responsive during streaming, active operations, live event updates, and concurrent background work.

## UX Requirements

### UXR-1 Orientation First

A user entering the environment must be able to establish current posture before taking action.

### UXR-2 Relationship Navigation

Every major entity view must reveal its important relationships to adjacent domains.

Examples include:

- thread to turn
- turn to operation
- operation to policy decision
- operation to artifact
- artifact to work-item
- work-item to workflow record
- incident to recovery workflow

### UXR-3 State Over Transcript

Stateful entity views must take precedence over transcript-only views when both are available.

### UXR-4 Pending Work Must Be Obvious

Users must be able to identify blocked, risky, or waiting work quickly.

### UXR-5 Evidence Must Be Actionable

Evidence should not only exist. It must help the user decide what to approve, validate, repair, reconcile, or close.

### UXR-6 Progressive Disclosure For Complexity

The UX must support both:

- fast high-level posture assessment
- deep inspection into runtime, workflow, and evidence detail

### UXR-7 No False Simplicity

The interface should simplify navigation and comprehension, but it must not hide core engineering realities in pursuit of superficial ease.

### UXR-8 The Shift Must Be Visible

The frontend must make the new development model legible.

Users should be able to understand that they are operating in:

- a persistent environment
- against live runtime truth
- with governed mutation and evidence
- across human and agent participation

### UXR-9 Desktop-Native Interaction

The macOS application must feel native to serious desktop engineering work rather than like a web app translated onto the desktop.

## Service Requirements

The UX must be implementable against stable service families rather than private runtime internals.

Required service families:

- environment service
- conversation service
- runtime service
- workflow service
- artifact service
- incident service
- task service
- approval service

Each service family should expose:

- stable read models for queries
- governed commands for mutations
- canonical event outputs for live updates

The desktop application should consume these services directly through a dedicated application architecture rather than assuming browser-first API design constraints.

## Acceptance Criteria

The foundation is acceptable when a proposed UX architecture can demonstrate:

1. An environment home that orients the user across all three truth domains.
2. Explicit entity views for thread, turn, operation, artifact, work-item, and incident.
3. Approval and incident flows that preserve policy and evidence context.
4. A service-driven implementation plan that does not depend on shell internals as the UI contract.
5. Clear handling of live runtime state and source/image reconciliation.
6. Event-driven updates for active work rather than passive static pages.
7. A frontend architecture that is explicitly subordinate to `sbcl-agent` service authority.
8. A desktop application interaction model appropriate for sustained engineering work on macOS.

## Out Of Scope For This Phase

This requirements set does not yet define:

- specific visual designs
- component libraries
- transport protocols
- authentication implementation details
- final deployment topology

Those should be specified after the capability and service model is accepted.
