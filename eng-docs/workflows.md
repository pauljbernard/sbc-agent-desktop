# Critical Workflows

## Purpose

This document defines the critical governed workflows the macOS desktop application must support clearly from the start.

These workflows are important because they are where `sbcl-agent` most clearly differs from transcript-first assistants, ordinary shells, and conventional IDEs.

## Workflow Rule

Every critical workflow must preserve:

- visibility of current state
- visibility of affected truth domains
- policy and approval context
- evidence creation
- resumability where supported

## Workflow 1: Approval-Gated Mutation

### Goal

Help the user understand, evaluate, and decide on a requested governed action before execution continues.

### Entry Points

- a conversation turn proposes a sensitive action
- a runtime mutation request requires approval
- a work-item reaches an approval checkpoint

### Desktop Flow

1. The app surfaces a global waiting indicator and an approval inbox item.
2. The user opens the approval detail.
3. The app shows:
   - requested action
   - affected scope
   - initiating actor
   - linked thread, turn, operation, or work-item
   - policy basis
   - risk and consequence summary
   - supporting evidence
4. The user approves or denies.
5. The app reflects the resulting state:
   - execution resumed
   - request denied
   - workflow remains blocked

### Non-Negotiable UX Requirements

- the user must not have to infer what approving means
- approval state must remain visible after decision
- linked work must be one click away

## Workflow 2: Incident Recovery

### Goal

Turn failure into governed, inspectable recovery work.

### Entry Points

- operation failure
- interrupted turn
- runtime condition requiring intervention
- quarantined workflow

### Desktop Flow

1. The app surfaces an incident in the global attention model.
2. The user opens the incident workspace.
3. The app shows:
   - incident summary
   - trigger and timing
   - related turn, operation, runtime, and work-item context
   - current recovery posture
   - recommended next actions
   - linked evidence
4. The user chooses recovery action or investigation path.
5. The app records recovery progression and resolution posture.

### Non-Negotiable UX Requirements

- incidents must not be reduced to ephemeral banners
- interrupted work and approval waits must be distinguishable
- recovery context must include linked governed entities

## Workflow 3: Runtime Inspection And Governed Execution

### Goal

Let expert operators inspect the live image and act on it without leaving the governed environment model.

### Entry Points

- runtime workspace exploration
- linked navigation from a turn, incident, or work-item
- direct inspection or execution request

### Desktop Flow

1. The user opens runtime context from environment posture or linked entity detail.
2. The app shows:
   - runtime summary
   - relevant package, symbol, or execution scope
   - current divergence posture
   - available governed actions
3. The user requests inspection or execution.
4. The app shows:
   - operation creation
   - policy result
   - approval requirement if any
   - result, incident, or evidence output
5. The app updates linked entities and attention indicators.

### Non-Negotiable UX Requirements

- runtime truth must feel direct, not hidden behind transcript summaries
- governed mutation must remain explicit
- source/image divergence must be visible where relevant

## Workflow 4: Source/Image Reconciliation

### Goal

Help the user understand and resolve divergence between the live image and durable source.

### Entry Points

- successful runtime mutation awaiting colder validation
- explicit divergence signal from runtime posture
- workflow record requiring reconciliation

### Desktop Flow

1. The app surfaces a divergence or awaiting-cold-validation indicator.
2. The user opens reconciliation detail.
3. The app shows:
   - what changed in the image
   - what is or is not reflected in source
   - current validation state
   - linked work-item and artifacts
   - possible next actions
4. The user initiates or reviews reconciliation.
5. The app updates workflow and evidence posture.

### Non-Negotiable UX Requirements

- warm runtime success must not be presented as final closure by default
- the workflow burden for reconciliation must be visible
- evidence must remain attached to the governed record

## Workflow 5: Turn Investigation

### Goal

Let the user understand exactly what happened during a complex turn.

### Entry Points

- active streaming turn
- completed but suspicious turn
- failed or interrupted turn

### Desktop Flow

1. The user opens a selected turn.
2. The app shows:
   - turn status and lifecycle
   - assistant-visible content
   - operations timeline
   - artifacts
   - approvals
   - linked incidents
3. The user follows linked context as needed.

### Non-Negotiable UX Requirements

- the turn view must not collapse into plain transcript replay
- operation and artifact timelines must be visible and structured
- the user must be able to distinguish text generation from governed action

## Workflow 6: Background Work Supervision

### Goal

Make concurrent tasks, workers, and future agents manageable without losing causality.

### Entry Points

- environment posture indicates active background work
- user opens activity or task views
- linked navigation from incidents, turns, or work-items

### Desktop Flow

1. The user opens activity or task detail.
2. The app shows:
   - active tasks
   - workers or actors
   - progress and ownership
   - failures or waits
   - linked entities
3. The user drills into any task or actor requiring attention.

### Non-Negotiable UX Requirements

- one-user, one-stream assumptions must be avoided
- ownership and actor identity must be visible
- blocked or failed background work must feed the global attention model

## Acceptance Criteria

These workflows are acceptably specified when the desktop design can demonstrate:

1. clear entry points
2. clear state transitions
3. linked entity traversal
4. explicit policy and evidence handling
5. globally visible attention signals

If a proposed desktop design cannot support these cleanly, the design is not yet aligned with the `sbcl-agent` model.
