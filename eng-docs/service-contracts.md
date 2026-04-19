# Service Contracts

## Purpose

This document defines the frontend-facing service contract model for the `sbcl-agent` macOS desktop application.

The point is not to finalize transport details. The point is to define stable service responsibilities and contract shapes so the desktop app does not couple itself to shell internals, compatibility-session helpers, or ad hoc struct reads.

## Service Architecture Rule

The service boundary sits between:

1. the `sbcl-agent` environment kernel
2. the desktop presentation layer

The shell and the desktop app should both become clients of the same governed services.

## Contract Rules

### Rule 1: Query And Command Separation

Each service family should separate:

- queries for stable inspection
- commands for governed mutation
- events for live observation

### Rule 2: Commands Carry Governance

Mutation commands must:

- pass through policy
- emit durable operation and workflow evidence
- surface approval requirements explicitly
- preserve linkage to turn, work-item, incident, or runtime context where relevant

### Rule 3: Events Are Canonical

The desktop app should observe system change through canonical service events, not through transcript parsing or private runtime polling tricks.

### Rule 4: Environment Is The Context Root

Every service contract should be environment-scoped unless there is a strong reason otherwise.

## Shared Contract Shape

### Query Contract

Queries should accept:

- `environment-id`
- entity identifiers where relevant
- optional filters
- optional pagination or cursor fields

Queries should return:

- stable DTOs
- relationship references
- posture summaries where useful
- no shell-specific rendering assumptions

### Command Contract

Commands should accept:

- `environment-id`
- actor context
- target identifiers
- command payload
- optional linked thread, turn, work-item, or incident context

Commands should return:

- accepted, rejected, or awaiting-approval result
- created or affected entity references
- operation identifiers
- next-action hints for the desktop app

### Event Contract

Events should expose:

- environment-scoped cursor
- event family
- event kind
- timestamp
- primary entity reference
- related thread, turn, operation, work-item, incident, or artifact references
- visibility
- structured payload

## Service Families

### 1. Environment Service

Purpose:

- orient the user to the environment as a whole

Primary queries:

- `get-environment-summary`
- `get-environment-posture`
- `get-active-context`
- `get-recent-evidence`

Primary commands:

- `select-environment`
- `refresh-environment-posture`

Primary desktop use:

- home workspace
- sidebar posture indicators
- top-level attention views

### 2. Conversation Service

Purpose:

- expose durable thread and turn interaction

Primary queries:

- `list-threads`
- `get-thread`
- `get-turn`
- `list-turn-operations`
- `list-thread-artifacts`

Primary commands:

- `create-thread`
- `start-turn`
- `resume-turn`
- `cancel-turn`

Primary events:

- `turn-state-changed`
- `assistant-message-delta`
- `operation-created`

Primary desktop use:

- conversation workspace
- turn inspector
- operation timeline

### 3. Runtime Service

Purpose:

- expose the live runtime and governed execution

Primary queries:

- `get-runtime-summary`
- `get-loaded-definition`
- `get-package-summary`
- `get-symbol-summary`
- `get-runtime-divergence-posture`

Primary commands:

- `inspect-runtime-scope`
- `evaluate-in-context`
- `propose-runtime-mutation`

Primary events:

- `runtime-mutation-started`
- `runtime-mutation-completed`
- `runtime-mutation-failed`
- `runtime-awaiting-cold-validation`

Primary desktop use:

- runtime workspace
- symbol and package navigation
- live inspection panels

### 4. Workflow Service

Purpose:

- expose governed engineering progress

Primary queries:

- `list-work-items`
- `get-work-item`
- `get-workflow-record`
- `get-waiting-work-summary`
- `get-validation-posture`
- `get-reconciliation-posture`

Primary commands:

- `create-work-item`
- `attach-work-item-context`
- `record-validation-result`
- `advance-workflow`
- `create-reconciliation-record`
- `close-workflow`

Primary events:

- `workflow-state-changed`
- `validation-completed`
- `reconciliation-created`
- `workflow-quarantined`

Primary desktop use:

- work queue
- governed status views
- reconciliation workflows

### 5. Artifact Service

Purpose:

- expose durable outputs and evidence

Primary queries:

- `list-artifacts`
- `get-artifact`
- `get-artifact-lineage`
- `get-evidence-summary`

Primary commands:

- `create-artifact-record`
- `attach-artifact-linkage`
- `publish-evidence-summary`

Primary events:

- `artifact-created`
- `artifact-linked`

Primary desktop use:

- evidence browser
- attached artifact inspectors
- traceability panels

### 6. Incident Service

Purpose:

- expose failure and recovery as governed work

Primary queries:

- `list-incidents`
- `get-incident`
- `get-recovery-posture`
- `get-linked-incident-context`

Primary commands:

- `acknowledge-incident`
- `start-recovery-workflow`
- `attach-incident-evidence`
- `resolve-incident`

Primary events:

- `incident-created`
- `incident-updated`
- `recovery-state-changed`
- `incident-resolved`

Primary desktop use:

- incident workspace
- recovery guidance panels
- urgent attention views

### 7. Task Service

Purpose:

- expose background execution and worker state

Primary queries:

- `list-tasks`
- `get-task`
- `list-workers`
- `get-worker`
- `get-queue-posture`

Primary commands:

- `enqueue-task`
- `cancel-task`
- `start-worker`
- `stop-worker`

Primary events:

- `task-enqueued`
- `task-started`
- `task-progressed`
- `task-completed`
- `worker-state-changed`

Primary desktop use:

- background activity center
- worker inspector
- queue health views

### 8. Approval Service

Purpose:

- expose policy posture and approval workflows

Primary queries:

- `list-approval-requests`
- `get-approval-request`
- `get-policy-summary`
- `get-capability-grants`

Primary commands:

- `approve-request`
- `deny-request`
- `grant-capability-scope`

Primary events:

- `approval-requested`
- `approval-granted`
- `approval-denied`
- `capability-grant-changed`

Primary desktop use:

- approval inbox
- approval detail sheets
- policy explanation panels

## Cross-Service Design Requirements

### Relationship References

DTOs should consistently include references to:

- `environment-id`
- `thread-id`
- `turn-id`
- `operation-id`
- `work-item-id`
- `workflow-record-id`
- `artifact-id`
- `incident-id`
- `task-id`
- `worker-id`

### Attention Semantics

Each query model should make it possible for the desktop app to determine whether an item is:

- active
- waiting
- blocked
- failed
- interrupted
- completed

### Explanation Fields

Where the kernel already has governance reasoning, the service layer should expose concise explanatory fields rather than forcing the desktop app to synthesize them from raw payloads.

Examples:

- why approval is required
- why a work-item is blocked
- why an incident is still open
- why a runtime mutation still awaits colder validation

## Event Subscription Contract

The desktop app should consume a service-level event stream compatible with the current cursor-based environment event contract.

Minimum contract:

- `environment-id`
- optional `after-cursor`
- optional family filter
- optional visibility filter
- bounded result limit
- returned ordered events
- returned `next-cursor`

This contract should support:

- polling now
- push delivery later

without changing desktop domain behavior.

## Out Of Scope

This document intentionally does not yet define:

- HTTP, local socket, or IPC transport
- auth protocol implementation details
- serialization format details
- exact DTO field names

Those should be decided after the desktop architecture and integration strategy are specified.
