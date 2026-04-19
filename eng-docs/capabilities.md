# Capabilities

## Purpose

This document translates the implemented and intended `sbcl-agent` architecture into capability domains for a world-class macOS desktop UX.

Its job is to answer two questions:

1. What fundamental capabilities must the UX expose?
2. What service-facing product model should those capabilities imply?

## Frontend Position

This capability model assumes the UX is the frontend for `sbcl-agent`.

The frontend does not define the product's core truth. It exposes, navigates, and governs access to the truth already owned by the `sbcl-agent` environment kernel and its service interfaces.

The primary presentation target is a native macOS desktop application.

## Design Rule

The UX must preserve essential engineering capabilities while discarding inherited metaphors from legacy IDEs and transcript-first chat systems.

The target is not:

- browser SLIME
- a terminal wrapped in panels
- a chat client for runtime tools

The target is:

- a governed, image-native engineering environment with multiple coherent control surfaces

## Capability Consequence Of The Shift

Because `sbcl-agent` embodies a shift in how software development is performed, the frontend must expose capabilities that older tool categories usually hide or flatten:

- environment posture instead of only project/file posture
- runtime truth instead of only source truth
- governed execution state instead of only outputs
- evidence and reconciliation instead of only completion messaging
- multi-actor coordination instead of only one-user request/response flow

## Capability Map

The capabilities fall into eight primary domains.

1. Environment orientation
2. Conversation and interaction
3. Runtime inspection and execution
4. Workflow governance
5. Artifact and evidence management
6. Incident and recovery management
7. Task, worker, and agent coordination
8. Policy, approval, and authority control

## Desktop Product Consequences

Because the target is a macOS desktop application, the capability model should assume:

- persistent long-lived sessions
- high information density where it improves comprehension
- keyboard-first expert workflows
- simultaneous views into related environment entities
- desktop-native handling of streaming, background work, and interruption

## Capability Domain 1: Environment Orientation

### Intent

Give the user an accurate picture of the environment as a whole before they drill into specific entities.

### Must Expose

- environment identity and summary
- active posture across source, image, and workflow truth
- active thread and turn
- blocked or waiting work
- recent incidents
- active tasks and workers
- recent evidence and artifacts

### UX Implication

The primary landing experience should be an environment-oriented desktop posture view, not a blank chat pane and not a file tree.

### Service Surface

`environment-service`

Read models should include:

- environment summary
- posture summary
- active context summary
- recent event and evidence summary

Commands should include:

- bind or select environment
- refresh or snapshot posture

## Capability Domain 2: Conversation And Interaction

### Intent

Make conversation durable and inspectable without letting it swallow the rest of the system.

### Must Expose

- threads
- messages
- turns
- operations
- artifacts produced from turns
- turn lifecycle state
- approval waits and resumed turn follow-up

### UX Implication

The UX needs structured thread and turn views where conversation is paired with state, operations, and evidence.

### Service Surface

`conversation-service`

Read models should include:

- thread list and thread summary
- thread detail
- turn detail
- operation list by turn
- conversation artifact list

Commands should include:

- create or select thread
- start turn
- resume turn
- cancel turn where supported

Events should include:

- turn state changed
- assistant message streamed
- operation created
- operation status changed
- turn completed, failed, or interrupted

## Capability Domain 3: Runtime Inspection And Execution

### Intent

Expose the live SBCL runtime as a first-class engineering substrate.

### Must Expose

- loaded definitions and runtime summaries
- package and symbol information
- live execution context
- workers, threads, tasks, and queues
- direct evaluation and governed runtime mutation
- runtime/source divergence signals

### UX Implication

The UX needs runtime-native inspection views and execution affordances rather than treating runtime state as backend implementation detail.

### Service Surface

`runtime-service`

Read models should include:

- runtime summary
- loaded definition summary
- symbol or package summary
- live execution summary
- divergence and reconciliation posture

Commands should include:

- inspect runtime object or scope
- evaluate in context
- propose or execute governed mutation

Events should include:

- runtime mutation started
- runtime mutation succeeded
- runtime mutation awaiting colder validation
- runtime mutation failed

## Capability Domain 4: Workflow Governance

### Intent

Preserve engineering discipline when work becomes mutating, risky, or multi-step.

### Must Expose

- work-items
- workflow records
- phase and status
- waiting reasons
- approvals required
- validation state
- quarantine and reconciliation posture
- closure conditions

### UX Implication

Work should be representable as governed progress, not merely as chat progress or shell side effects.

### Service Surface

`workflow-service`

Read models should include:

- work-item summary and detail
- workflow record summary and detail
- waiting work summary
- validation summary
- reconciliation summary

Commands should include:

- create or attach work-item
- advance workflow state
- record validation outcome
- create reconciliation action
- close workflow when conditions are met

Events should include:

- workflow state changed
- validation completed
- reconciliation created
- workflow quarantined
- workflow resumed
- workflow closed

## Capability Domain 5: Artifact And Evidence Management

### Intent

Treat output and proof as durable, navigable entities.

### Must Expose

- artifacts by type, origin, and linkage
- evidence summaries
- relationships to turns, operations, work-items, and incidents
- validation and reconciliation artifacts

### UX Implication

Artifacts should appear as a native evidence layer, not as hidden attachments or isolated logs.

### Service Surface

`artifact-service`

Read models should include:

- artifact list
- artifact detail
- evidence summary
- lineage summary

Commands should include:

- create artifact record
- attach artifact to related entities
- publish evidence summary

Events should include:

- artifact created
- artifact linked
- evidence summary updated

## Capability Domain 6: Incident And Recovery Management

### Intent

Turn runtime and workflow failure into governed recovery work instead of transient console noise.

### Must Expose

- incident list and severity or posture
- triggering context
- linked runtime, turn, operation, and workflow context
- recovery guidance
- interruption versus approval wait distinction
- current repair and closure status

### UX Implication

Incident handling needs its own workspace model. A toast notification is not enough.

### Service Surface

`incident-service`

Read models should include:

- incident summary
- incident detail
- recovery posture
- linked entity graph

Commands should include:

- acknowledge incident
- start recovery workflow
- attach evidence
- resolve or close incident when allowed

Events should include:

- incident created
- incident updated
- recovery state changed
- incident resolved

## Capability Domain 7: Task, Worker, And Agent Coordination

### Intent

Support background work and multiple active actors as normal operating conditions.

### Must Expose

- task queue and status
- worker identity and status
- active background execution
- future agent identity, scope, and activity
- ownership of active work

### UX Implication

The interface must show concurrent work clearly and avoid assuming one active request at a time.

### Service Surface

`task-service`

Read models should include:

- task list and task detail
- worker list and worker detail
- queue posture
- actor activity summary

Commands should include:

- enqueue task
- cancel task where supported
- start or stop worker
- inspect actor activity

Events should include:

- task enqueued
- task started
- task progressed
- task completed or failed
- worker started or stopped

## Capability Domain 8: Policy, Approval, And Authority Control

### Intent

Ensure the environment remains governed even when interaction becomes conversational and fast-moving.

### Must Expose

- policy posture
- capability grants
- approval requests
- approval scope
- authorization outcome
- operator identity and authority context

### UX Implication

Safety-critical decisions must be surfaced at the moment they matter, with enough context to support informed action.

### Service Surface

`approval-service`

Read models should include:

- approval queue
- approval request detail
- capability and policy summary
- authorization posture

Commands should include:

- approve request
- deny request
- grant scoped capability where allowed
- inspect policy basis

Events should include:

- approval requested
- approval granted
- approval denied
- capability grant changed

## Cross-Domain Entity Model

The UX must be built around explicit relationships among these entities:

- environment
- runtime
- thread
- message
- turn
- operation
- artifact
- work-item
- workflow record
- incident
- task
- worker
- agent
- policy and approval record

The key design obligation is not only to render each entity, but to make adjacent relationships traversable.

## Presentation Rules

### Rule 1: Start From Posture

Users should begin from environment posture, then move into focused workflows.

### Rule 2: Prefer Entity Views Over Flat Feeds

Activity feeds are useful, but they cannot be the only way to understand the environment.

### Rule 3: Preserve Truth Labels

Views should consistently indicate whether information belongs to source truth, image truth, workflow truth, or a linked combination.

### Rule 4: Keep Commands Governed

Mutation affordances must route through governed command surfaces, never through implicit UI-side shortcuts.

### Rule 5: Make Waiting State Actionable

Awaiting approval, awaiting colder validation, interrupted work, and quarantined workflow must each be distinguishable and actionable.

### Rule 6: Use Desktop Strengths Deliberately

The macOS application should use desktop strengths such as persistent workspaces, richer concurrent visibility, and keyboard-driven control without turning those strengths into old IDE mimicry.

## Capability Phasing

### Phase 1: Foundational UX

Must deliver:

- environment home
- thread and turn views
- operation visibility
- approval queue and approval detail
- work-item and incident views
- artifact and evidence listing

### Phase 2: Runtime-Native UX

Must deepen:

- runtime inspection
- source/image divergence visibility
- live mutation and validation posture
- semantic relationship navigation

### Phase 3: Multi-Actor Environment UX

Must add:

- richer task and worker coordination
- explicit agent presence and identity
- shared activity and ownership views
- stronger concurrent work orchestration

## Delivery Implications

A credible implementation plan should now produce:

1. service contract definitions for each service family
2. domain DTOs and event schemas
3. information architecture and navigation model
4. critical user flows for approval, incident, and reconciliation work
5. phased acceptance tests aligned to these capability domains

Without those artifacts, implementation will drift back toward presentation-led design.
