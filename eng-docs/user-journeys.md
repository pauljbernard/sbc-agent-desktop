# User Journey Specification

## Purpose

This document defines the detailed user journeys for the `sbcl-agent` desktop application.

These journeys describe how developers and engineers should move through the product in ways that reinforce the `sbcl-agent` thesis instead of reverting to older software development assumptions.

## Journey Design Rules

Each journey must:

- begin from a clear environment context
- make relevant truth domains visible
- preserve governed execution where relevant
- expose linked entities instead of requiring manual reconstruction
- produce understandable next steps

## Journey 1: First Orientation Into An Active Environment

### User

Expert operator or governance-aware engineer

### Goal

Understand the current state of the environment before acting.

### Entry Point

App launch or environment switch

### Flow

1. User opens the application.
2. Environment Posture Home appears.
3. User identifies:
   - active thread or turn
   - pending approvals
   - incidents
   - waiting work
   - runtime posture
4. User chooses the next point of investigation.

### Truth Domains In View

- source truth
- image truth
- workflow truth

## Journey 2: Investigate A Running Or Recent Turn

### User

Developer or operator following active conversational work

### Goal

Understand what happened during a turn and what work it created.

### Entry Point

- Environment workspace
- Conversations workspace
- event or attention surface

### Flow

1. User opens the relevant thread or turn.
2. Turn detail shows:
   - user and assistant exchange
   - turn state
   - operations timeline
   - created artifacts
   - linked approvals or incidents
3. User drills into any operation, artifact, or incident.

### Truth Domains In View

- image truth
- workflow truth

## Journey 3: Inspect Runtime And Execute Directly

### User

Expert operator

### Goal

Inspect the live runtime and perform direct evaluation with low friction.

### Entry Point

- Runtime workspace
- direct evaluation command
- linked navigation from incident, work-item, or turn

### Flow

1. User opens Runtime.
2. User navigates to a package, symbol, or runtime scope.
3. User opens the direct evaluation surface.
4. User executes a form.
5. App shows:
   - result
   - operation state if applicable
   - approval wait if applicable
   - artifact or incident linkage if applicable

### Truth Domains In View

- image truth
- workflow truth

## Journey 4: Review And Approve Governed Mutation

### User

Governance-aware engineer or operator

### Goal

Make an informed approval decision for a gated action.

### Entry Point

- global attention strip
- Approvals workspace
- linked navigation from turn or work-item

### Flow

1. User opens the approval request.
2. App shows:
   - requested action
   - affected scope
   - initiating actor
   - policy basis
   - linked work and evidence
3. User approves or denies.
4. App updates linked work state.

### Truth Domains In View

- workflow truth
- image truth where action scope touches runtime

## Journey 5: Recover From Failure

### User

Developer or operator responding to a failed operation or interrupted turn

### Goal

Move from failure to governed recovery.

### Entry Point

- global attention strip
- Incidents workspace
- turn or runtime linked context

### Flow

1. User opens the incident.
2. App shows:
   - failure summary
   - related runtime and operation context
   - linked work-item or turn
   - recovery posture
3. User investigates linked entities.
4. User initiates or continues recovery action.
5. App updates state and evidence.

### Truth Domains In View

- image truth
- workflow truth

## Journey 6: Reconcile Runtime Success Into Governed Closure

### User

Developer or engineer closing out live runtime work

### Goal

Understand whether successful execution is actually ready for closure.

### Entry Point

- Runtime workspace
- Work workspace
- attention indicator for awaiting colder validation

### Flow

1. User sees that runtime work succeeded but is not yet closed.
2. User opens reconciliation or work detail.
3. App shows:
   - image change posture
   - source relationship
   - validation state
   - linked artifacts
4. User reviews next closure requirements.
5. Workflow state updates when reconciliation progresses.

### Truth Domains In View

- source truth
- image truth
- workflow truth

## Journey 7: Supervise Concurrent Background Work

### User

System steward or advanced operator

### Goal

Understand active background tasks, workers, and emerging issues.

### Entry Point

- Environment workspace
- Activity workspace
- global attention strip

### Flow

1. User opens Activity or task detail.
2. App shows:
   - active tasks
   - worker status
   - progress and failure state
   - linked incidents or work-items
3. User drills into any item needing intervention.

### Truth Domains In View

- image truth
- workflow truth

## Journey 8: Supervise Multiple Active Conversations

### User

Expert operator coordinating several parallel streams of work

### Goal

Understand and switch among multiple active threads without losing context or governance visibility.

### Entry Point

- Environment workspace
- Conversations workspace
- global attention strip

### Flow

1. User opens Conversations or pivots from Environment.
2. App shows thread states across the environment.
3. User identifies:
   - active threads
   - waiting threads
   - threads with approvals
   - threads with incidents
4. User opens one thread, investigates, then pivots to another.
5. App preserves environment context and thread-level status throughout.

### Truth Domains In View

- image truth
- workflow truth

## Journey 9: Traverse Cross-Domain Context

### User

Any serious user following a problem through the environment

### Goal

Move from one entity to related entities without losing context.

### Entry Point

Any entity view

### Flow

1. User opens an entity.
2. App shows linked entities and inspector context.
3. User traverses to a related entity.
4. App preserves environment context and local history.

### Truth Domains In View

- any combination of source truth, image truth, workflow truth

## Journey Quality Criteria

Each implemented journey should be reviewed for:

1. clear environment context
2. visible truth-domain posture
3. visible governed state where relevant
4. linked entity traversal
5. clear next action
6. no regression into file-first or transcript-first behavior
