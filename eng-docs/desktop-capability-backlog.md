# Desktop Capability Backlog

## Purpose

This document turns the current spec set into a prioritized product backlog for the `sbcl-agent` macOS desktop application.

It is not a sprint board. It is a strategic capability backlog that keeps implementation aligned with the product thesis.

## Priority Model

### P0

Foundational. Without these, the desktop app either fails the `sbcl-agent` thesis or is not credible as a serious Common Lisp development environment.

### P1

Core. These make the desktop app strong enough to be materially better than a thin frontend over the shell.

### P2

Expansion. These deepen differentiation and multi-actor capability after the foundation is solid.

## Backlog Fields

Each item includes:

- priority
- thesis classification
- primary entities
- truth domains
- capability benchmark intent
- acceptance direction

## P0: Foundational Capabilities

### P0-1 Environment Posture Home

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- environment
- event
- task
- worker
- incident
- approval request

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- exceed classic IDEs by giving one coherent posture view across the full environment

Why it matters:

- this is the strongest defense against source-first collapse and chat-first collapse

Acceptance direction:

- user can open the app and understand active environment posture, risks, waiting work, and current activity quickly

### P0-2 Runtime Workspace

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- runtime
- source asset
- incident
- operation

Truth domains:

- image truth
- source truth

Capability benchmark intent:

- match or exceed LispWorks/SLIME/Allegro-grade runtime introspection

Why it matters:

- if runtime inspection is weak, the product betrays the central thesis

Acceptance direction:

- users can inspect loaded definitions, packages, symbols, and runtime posture without dropping into secondary tooling

### P0-3 Direct Evaluation Surface

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- runtime
- operation
- artifact
- approval request

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- match classic directness while exceeding it in governance and evidence linkage

Why it matters:

- direct eval must remain first-class or the desktop app becomes weaker than serious Lisp environments

Acceptance direction:

- expert users can evaluate quickly, and governed mutation remains explicit when needed

### P0-4 Structured Conversation Workspace

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- thread
- turn
- message
- operation
- artifact

Truth domains:

- workflow truth
- image truth

Capability benchmark intent:

- transform chat into a governed interaction model rather than transcript-first tooling

Why it matters:

- conversation is native, but must not become the universal container

Acceptance direction:

- users can inspect turns as structured lifecycles with operations, approvals, artifacts, and linked governed work

### P0-5 Approval Inbox And Detail

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- approval request
- operation
- work-item
- policy

Truth domains:

- workflow truth

Capability benchmark intent:

- exceed classic IDEs through accountable mutation handling

Why it matters:

- approval is one of the sharpest breaks from conventional SDLC tooling

Acceptance direction:

- the user can understand scope, rationale, risk, and consequence before approving

### P0-6 Incident Workspace

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- incident
- runtime
- turn
- operation
- work-item

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- match debugger seriousness and exceed it in governed recovery

Why it matters:

- if incidents collapse into logs or banners, the thesis is compromised

Acceptance direction:

- the user can move from failure to recovery with precise linked context and visible state

### P0-7 Work And Reconciliation Workspace

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- work-item
- workflow record
- artifact
- incident

Truth domains:

- workflow truth
- source truth
- image truth

Capability benchmark intent:

- exceed classic tooling by making closure, validation, and reconciliation explicit

Why it matters:

- this prevents “operation completed” from becoming the whole engineering story

Acceptance direction:

- the user can see what is executed, validated, reconciled, blocked, quarantined, or closable

### P0-8 Global Attention Model

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- approval request
- incident
- work-item
- turn
- task

Truth domains:

- workflow truth
- image truth

Capability benchmark intent:

- exceed classic tooling by making active waits, risks, and failures continuously legible

Why it matters:

- hidden waiting state is how workflow collapses into decoration

Acceptance direction:

- awaiting approval, interrupted work, failed work, quarantined work, and awaiting-cold-validation are globally visible

### P0-9 Event Observation Surface

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- event
- turn
- operation
- artifact
- task
- incident

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- exceed classic tooling with live service-level event visibility

Why it matters:

- the desktop app must observe canonical change, not infer it from rendered text

Acceptance direction:

- active work is visible through event-backed observation and linked entity navigation

### P0-10 Multi-Thread And Multi-Conversation Supervision

Priority:

- P0

Thesis classification:

- thesis-strengthening

Primary entities:

- environment
- thread
- turn
- task
- worker
- agent

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- exceed classic Lisp tooling and align with modern supervised parallel development models

Why it matters:

- if the app assumes one foreground conversation, it regresses below both the `sbcl-agent` thesis and current agentic development reality

Acceptance direction:

- users can understand many active threads, many turn states, background execution, and actor ownership from one environment-scoped product model

## P1: Core Capabilities

### P1-1 Cross-Domain Symbolic Navigation

Priority:

- P1

Thesis classification:

- thesis-strengthening

Primary entities:

- runtime
- source asset
- turn
- artifact
- work-item

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- exceed classic caller/definition navigation by spanning all truth domains

Acceptance direction:

- users can move from symbols and definitions into runtime, artifacts, incidents, and work context without manual reconstruction

### P1-2 Artifact And Evidence Browser

Priority:

- P1

Thesis classification:

- thesis-strengthening

Primary entities:

- artifact
- work-item
- incident
- turn

Truth domains:

- workflow truth
- source truth

Capability benchmark intent:

- exceed notes panels and output panes with durable evidence navigation

Acceptance direction:

- users can browse artifacts by origin, role, lineage, and governed significance

### P1-3 Background Task And Worker Supervision

Priority:

- P1

Thesis classification:

- thesis-strengthening

Primary entities:

- task
- worker
- agent
- operation

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- exceed human-only Lisp tooling with real concurrent execution visibility

Acceptance direction:

- users can inspect ownership, progress, failures, and linked work across background execution

### P1-6 Thread State And Queue Management

Priority:

- P1

Thesis classification:

- thesis-strengthening

Primary entities:

- thread
- turn
- approval request
- incident

Truth domains:

- workflow truth
- image truth

Capability benchmark intent:

- support serious multi-conversation development rather than chat tab sprawl

Acceptance direction:

- users can filter, sort, and review threads by active, waiting, blocked, incident-bearing, or approval-bearing state

### P1-4 Source/Image Divergence Inspector

Priority:

- P1

Thesis classification:

- thesis-strengthening

Primary entities:

- runtime
- source asset
- workflow record
- artifact

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- exceed classic live development loops by making reconciliation explicit and navigable

Acceptance direction:

- users can understand what is true only in the image, only in source, and what remains to reconcile

### P1-5 Keyboard-First Command Layer

Priority:

- P1

Thesis classification:

- thesis-compatible

Primary entities:

- environment
- runtime
- thread
- turn

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- match expert efficiency expectations from serious desktop Lisp tooling

Acceptance direction:

- expert users can navigate, inspect, and invoke governed actions with minimal UI friction

## P2: Expansion Capabilities

### P2-1 Multi-Window Entity Workflows

Priority:

- P2

Thesis classification:

- thesis-compatible

Primary entities:

- environment
- incident
- runtime
- work-item

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- exploit desktop strengths for sustained engineering work

Acceptance direction:

- users can pin or separate key entities into focused long-lived work windows without losing context

### P2-2 Explicit Agent Presence And Activity

Priority:

- P2

Thesis classification:

- thesis-strengthening

Primary entities:

- agent
- task
- operation
- approval request

Truth domains:

- image truth
- workflow truth

Capability benchmark intent:

- exceed classic IDEs by making multi-actor engineering native and legible

Acceptance direction:

- users can see what agents are active, what authority they have, and what work they are performing

### P2-3 Semantic Relationship Graph

Priority:

- P2

Thesis classification:

- thesis-strengthening

Primary entities:

- all major domain entities

Truth domains:

- source truth
- image truth
- workflow truth

Capability benchmark intent:

- transform navigation from file-oriented browsing into environment graph traversal

Acceptance direction:

- users can explore meaningful cross-domain relationships visually and structurally

## Anti-Backlog

The following are intentionally not valid primary goals for the desktop app:

- recreating a classic file-and-buffer IDE shell
- making chat the default container for all engineering state
- hiding governance to make the app feel lighter
- treating runtime as an advanced-only subsystem
- reducing approvals to confirmation prompts
- equating successful execution with durable closure

## Sequencing Rule

P0 items should be implemented before expansion work that adds surface sophistication without strengthening the thesis.

If there is tension between:

- richer visual presentation
- or stronger environment, runtime, workflow, and governance capability

the latter wins.
