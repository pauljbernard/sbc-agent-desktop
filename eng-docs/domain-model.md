# Domain Model

## Purpose

This document defines the core domain language for the `sbcl-agent` macOS desktop application.

Its goal is to prevent frontend drift. The desktop app must use the same conceptual objects that the `sbcl-agent` kernel uses and intends to strengthen over time.

This is a product and architecture document, not a persistence schema.

## Modeling Rules

### Rule 1: Environment Is The Root

The top-level object is the `Environment`.

The desktop app should not treat project, window, workspace, or thread as the primary root object. Those are important views or subdomains, but the environment is the durable world the user is operating inside.

### Rule 2: Truth Domains Stay Distinct

The domain model must preserve explicit relationships among:

- source truth
- image truth
- workflow truth

No entity should blur those domains by default.

### Rule 3: Entities Beat Screens

The application should be designed around domain entities and their relationships rather than around isolated screens or UI components.

### Rule 4: Durable State Beats UI State

If a concept matters to engineering outcomes, it should exist in the domain and service model, not only in local desktop UI state.

## Core Entities

### Environment

The top-level persistent engineering world.

Owns or aggregates:

- runtime state
- conversation state
- workflow state
- artifact state
- incident state
- task and worker state
- policy posture
- event evidence

Primary user questions:

- What environment am I in?
- What is active right now?
- What requires attention?

### Runtime

The live SBCL execution substrate.

Includes:

- loaded code
- packages and symbols
- object identity and heap state
- active threads and workers
- runtime resources
- mutation and validation posture

Primary user questions:

- What is true in the running image?
- What can I inspect or execute right now?

### Source Asset

A durable source-backed object relevant to engineering work.

Examples:

- source files
- patches
- diffs
- test artifacts
- git-backed state

Primary user questions:

- What changed in durable source?
- How does this relate to runtime and workflow?

### Thread

A durable conversation container.

Organizes:

- messages
- turns
- attached artifacts
- linked work-items or incidents where relevant

Primary user questions:

- What problem space is this conversation tracking?
- What turns and outputs belong together?

### Message

A durable conversational utterance or narration record.

Includes:

- role
- structured or textual content
- streaming state where applicable
- finalization state

Primary user questions:

- What was said?
- Was it finalized, partial, or interrupted?

### Turn

One governed interaction lifecycle inside a thread.

Links:

- initiating request
- assistant response
- operations
- approvals
- artifacts
- failures or incidents
- terminal outcome

Primary user questions:

- What happened during this interaction?
- Is it still running, blocked, or complete?

### Operation

A concrete action taken in response to a turn or governed workflow.

Includes:

- action kind
- actor
- target scope
- status
- policy result
- outputs
- evidence linkage

Primary user questions:

- What action was proposed or executed?
- What was affected?
- What is the result?

### Artifact

A durable output or evidence object.

Examples:

- diff summaries
- validation reports
- reconciliation records
- recovery plans
- environment evidence summaries

Primary user questions:

- What evidence exists?
- Which turn, operation, incident, or workflow produced it?

### Work-Item

A governed engineering unit of intent and execution.

Includes:

- objective
- status
- wait conditions
- approval burden
- validation burden
- closure conditions

Primary user questions:

- What unit of work is in progress?
- What is blocking closure?

### Workflow Record

The durable record of how a work-item progresses through governed states.

Includes:

- phase
- waiting reason
- validation results
- reconciliation posture
- interventions
- completion or quarantine status

Primary user questions:

- Where is this work in the mutation lifecycle?
- What still needs to happen?

### Incident

A durable record of failure or risk that requires governed attention.

Includes:

- trigger context
- severity or posture
- linked entities
- recovery state
- closure status

Primary user questions:

- What failed?
- What should happen next?

### Task

A queued or running unit of background execution.

Includes:

- type
- owner
- current status
- progress
- result or failure state

Primary user questions:

- What is the system doing in the background?

### Worker

A long-lived or semi-long-lived execution actor that processes tasks.

Includes:

- identity
- status
- assigned work
- recent activity

Primary user questions:

- Which worker is doing what right now?

### Agent

A present or future explicit non-human actor inside the environment.

Includes:

- identity
- capabilities
- scope
- activity
- ownership boundaries

Primary user questions:

- Which agent is active?
- What authority does it have?

### Policy

The rules that govern what actions are allowed, blocked, or approval-gated.

Includes:

- capability rules
- approval requirements
- safety posture
- authority constraints

Primary user questions:

- Why is this action allowed, blocked, or gated?

### Approval Request

A concrete request for operator authorization of governed action.

Includes:

- requested action
- scope
- rationale
- policy basis
- linked turn, operation, or workflow
- resulting decision

Primary user questions:

- What am I being asked to approve?
- What will happen if I approve it?

### Event

A canonical record of meaningful state change for live observation and durable evidence.

Includes:

- kind
- family
- timestamp
- entity references
- visibility
- payload

Primary user questions:

- What just changed?
- Which entity should I inspect next?

## Relationship Model

The desktop app must make these relationships navigable:

- environment contains runtime, conversation, workflow, artifact, incident, task, and policy posture
- thread contains messages and turns
- turn links messages, operations, artifacts, approvals, incidents, and work-items
- operation links to policy decisions, artifacts, incidents, and workflow records
- work-item links to workflow records, artifacts, approvals, and reconciliation state
- incident links to turn, operation, runtime context, work-item, and evidence
- task and worker state link to actor identity and environment posture

## Truth Mapping

### Source Truth Entities

- source asset
- patch
- diff
- test output as durable artifact

### Image Truth Entities

- runtime
- loaded definitions
- object and symbol state
- active worker and task execution

### Workflow Truth Entities

- work-item
- workflow record
- approval request
- incident
- validation artifact
- reconciliation artifact

### Cross-Truth Bridging Entities

- turn
- operation
- artifact
- event

## Desktop Modeling Implication

The macOS application should model entity views and workspace navigation around these domain objects.

It should not start from:

- tabs with arbitrary labels
- chat as the default root
- file browser as the primary truth surface

It should start from:

- environment posture
- explicit governed entities
- traversable relationships among truth domains
