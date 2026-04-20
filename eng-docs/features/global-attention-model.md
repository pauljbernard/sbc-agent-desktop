# Feature Proposal: Global Attention Model

## Title

Global Attention Model

## Summary

Create a global attention system that continuously surfaces the most important active, waiting, risky, and unresolved states across the environment.

This feature is essential for supervised concurrent development. It keeps governance, failure, and waiting state visible across many threads, turns, tasks, and actors.

## Problem

Without a global attention model:

- waiting work gets lost
- operators must manually hunt through workspaces
- concurrent development becomes harder to supervise
- workflow truth collapses into local widget state

## User Outcome

A user can tell at a glance:

- what requires approval
- what failed
- what is interrupted
- what is quarantined
- what is awaiting colder validation
- what active work most needs attention

## Primary Entities

- approval request
- incident
- work-item
- turn
- task
- worker
- agent

## Truth Domains Affected

- workflow truth
- image truth

## Service Families Affected

- environment service
- approval service
- incident service
- workflow service
- task service
- conversation service

## Thesis Classification

- thesis-strengthening

## Thesis Review

### 1. How does this feature strengthen or preserve the environment-first model?

It gives the environment a global operational posture rather than forcing users into isolated screen-by-screen supervision.

### 2. How does it treat source, image, and workflow truth?

It primarily exposes image and workflow urgency while preserving environment-wide visibility across active work.

### 3. How does it preserve or improve governed execution?

It prevents governed states from disappearing after the local action that created them.

### 4. How does it avoid regressing into file-centric or transcript-centric interaction?

It does not rely on reading transcripts or file diffs to discover urgent work. It uses explicit environment state.

### 5. Does it make the `sbcl-agent` thesis more legible to the user?

Yes. It shows that the environment continuously tracks what matters operationally.

## Regression Risk

Primary risks:

- attention becomes notification spam
- all states are treated as equal urgency
- the model is too local and loses environment meaning
- the app reverts to one-workspace-at-a-time supervision

Mitigation:

- require semantic attention categories
- require environment-wide aggregation
- require deep link from attention item to governed context

## Capability Benchmark Impact

This exceeds classic tooling by providing continuous environment-wide supervision across governed, concurrent work.

## UX Shape

### Entry Points

- persistent global attention strip or rail
- workspace-local attention summaries
- environment home

### Primary View

This feature is cross-cutting. It should appear as:

- global attention rail or strip
- categorized attention lists
- deep-linkable attention items

The dominant work surface is the categorized attention list itself, with the persistent rail or strip acting as an entry signal rather than a substitute for detailed supervision.

Attention lists own scroll when they overflow. Global chrome and category headers should remain stable so urgent states can be scanned quickly without page drift.

### Linked Entity Traversal

Each attention item must open relevant detail in:

- approval
- incident
- thread or turn
- work-item
- task or worker

### Live Event Behavior

The model updates continuously from environment, workflow, approval, incident, task, and conversation events.

### Attention Model Implications

Core categories:

- awaiting approval
- interrupted
- failed
- quarantined
- awaiting colder validation
- active high-importance work

## Command And Query Shape

### Primary Queries

- `get-environment-posture`
- `get-active-context`
- `get-waiting-work-summary`
- `list-approval-requests`
- `list-incidents`
- `get-queue-posture`

### Primary Commands

- none as a primary capability; this is primarily derived supervision state

### Key Returned State

- categorized attention summaries
- affected entity references
- severity or urgency context

### Key Event Emissions Consumed

- approval requested
- incident created or updated
- workflow state changed
- task state changed
- turn state changed

## Acceptance Criteria

- The application exposes an environment-wide attention model that persists across workspaces.
- Attention categories distinguish meaningful operational differences rather than flattening everything into notifications.
- Users can move directly from attention items into relevant governed detail.
- Concurrent work becomes easier to supervise without manual hunting through multiple workspaces.
- A thesis review concludes the feature keeps workflow and risk visible in the main flow of the product.
- Attention lists remain the primary work surface and are not displaced by decorative summary dashboards.
- Scroll ownership is explicit wherever attention queues or categorized lists grow beyond the viewport.

## Open Questions

- What is the best default ordering for attention categories?
- How much detail should appear inline versus on click?
- Should active-but-healthy work be part of the same surface or a separate operational status view?
