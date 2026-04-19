# Thesis Guardrails

## Purpose

This document exists to prevent the `sbcl-agent` macOS desktop application from regressing into the older style of software development lifecycle that `sbcl-agent` was created to move beyond.

The risk is real.

A desktop app can accidentally preserve the language of the new model while reintroducing the mechanics of the old one:

- source files become the real truth again
- runtime becomes secondary or hidden
- workflow governance becomes after-the-fact paperwork
- conversation becomes a cosmetic shell over conventional tooling
- agents become assistants attached to an unchanged human-only toolchain

If that happens, the product fails its thesis even if the UI looks polished.

## The Thesis To Protect

The desktop app must protect the core `sbcl-agent` thesis:

- software development should not be modeled only as file editing plus delayed reconstruction
- the running environment is part of the truth of the system
- mutation should be governed during execution, not only documented later
- source truth, image truth, and workflow truth must remain explicit and related
- humans, tools, workers, and agents operate in one environment rather than across disconnected systems

## Core Regression Risk

The most dangerous failure mode is not obvious imitation of older IDEs.

The most dangerous failure mode is subtle reinterpretation:

- environment gets renamed to workspace but behaves like a project
- runtime gets reduced to logs, consoles, and transient outputs
- workflow gets reduced to status labels and completion messages
- approvals get hidden behind modal confirmations
- incidents get flattened into errors
- artifacts become attachments instead of evidence
- event streams become cosmetic activity feeds instead of state observation boundaries

This is the regression we must actively block.

## Regression Patterns To Reject

### Pattern 1: Source-First Collapse

Symptom:

- the interface makes source navigation primary and runtime/workflow secondary

Why it is wrong:

- it reasserts files as the real center of development

Required response:

- environment posture must remain the starting point
- source must remain one truth domain among three

### Pattern 2: Runtime As Hidden Backend

Symptom:

- runtime state is only visible through logs, chat summaries, or shell outputs

Why it is wrong:

- `sbcl-agent` exists precisely because runtime truth matters directly

Required response:

- runtime must have first-class inspection and navigation surfaces

### Pattern 3: Workflow As Decoration

Symptom:

- work-items, approvals, validation, incidents, and reconciliation appear only as metadata badges

Why it is wrong:

- it turns governance into commentary instead of execution structure

Required response:

- workflow state must remain operational and actionable

### Pattern 4: Chat As Universal Container

Symptom:

- everything becomes a conversation transcript with embedded controls

Why it is wrong:

- conversation is native, but not total
- turns, operations, artifacts, incidents, and work-items are structured entities

Required response:

- preserve entity views and cross-domain navigation

### Pattern 5: Agent As Fancy Autocomplete

Symptom:

- agents appear as suggestion engines attached to ordinary human workflows

Why it is wrong:

- `sbcl-agent` is built for multi-actor environments with explicit actors and governed execution

Required response:

- agent, worker, tool, and human action must remain legible as environment activity

### Pattern 6: Approval As Confirmation Dialog

Symptom:

- approval is rendered as a generic yes/no prompt with little context

Why it is wrong:

- approvals are governance records, not UI confirmations

Required response:

- approval surfaces must show scope, policy basis, consequence, and linked work

### Pattern 7: Success As Completion Messaging

Symptom:

- the app treats “operation completed” as the end of the engineering story

Why it is wrong:

- `sbcl-agent` distinguishes warm success from validation, reconciliation, and governed closure

Required response:

- awaiting-cold-validation, blocked closure, quarantine, and reconciliation posture must remain visible

## Positive Design Rules

### Rule 1: Start From Environment Posture

Users should begin from:

- current environment state
- current active work
- current risks and waits
- current truth-domain posture

not from:

- empty chat
- file tree
- generic editor shell

### Rule 2: Preserve The Three Truths In Navigation

Users must be able to move deliberately among:

- source truth
- image truth
- workflow truth

The app should not hide which truth domain is currently being shown.

### Rule 3: Make Runtime Legible Without Ceremony

Runtime inspection should be:

- fast
- central
- navigable
- connected to other entities

not:

- buried
- gated behind advanced menus
- represented only indirectly

### Rule 4: Keep Governance In The Main Flow

Governance must appear where work actually happens:

- in mutation paths
- in approvals
- in incident handling
- in validation and reconciliation

not only:

- after completion
- in audit screens
- in secondary administration areas

### Rule 5: Separate Text, Action, And Evidence

The app must continue to distinguish:

- assistant-visible text
- governed operations
- artifacts and evidence
- workflow progression

Transcript convenience must not erase these boundaries.

### Rule 6: Treat Closure As A Governed Outcome

The app must visually distinguish:

- executed
- validated
- reconciled
- closed
- quarantined

This is one of the clearest breaks from old SDLC assumptions.

### Rule 7: Design For Multi-Actor Reality

The app must assume:

- concurrent work
- background tasks
- visible worker activity
- future resident agents
- explicit action ownership

It must not assume one operator and one foreground thread.

## Product Review Questions

Every major feature, workflow, or layout proposal should be tested against these questions:

1. Does this make the environment more legible, or does it quietly restore file-first thinking?
2. Does this strengthen runtime truth visibility, or hide it behind secondary UI?
3. Does this preserve workflow governance as an execution model, or reduce it to labels and admin chrome?
4. Does this preserve structured entities, or collapse them into transcript-first interaction?
5. Does this distinguish execution from closure?
6. Does this keep multi-actor activity explicit?
7. Does this make the `sbcl-agent` thesis more understandable to the user?

If the answer to any of these is no, the design should be reworked.

## Feature Classification Rule

New feature proposals should be classified into one of four categories:

- thesis-strengthening
- thesis-compatible
- thesis-risking
- thesis-breaking

### Thesis-Strengthening

The proposal makes environment-first, runtime-aware, workflow-governed engineering more legible or more powerful.

### Thesis-Compatible

The proposal does not materially strengthen the thesis, but it does not undermine it either.

### Thesis-Risking

The proposal introduces a familiar pattern that could quietly re-center the old SDLC model.

These proposals require redesign or stronger guardrails.

### Thesis-Breaking

The proposal directly restores old assumptions as the product default.

These proposals should be rejected.

## Acceptance Test

The desktop application is respecting the `sbcl-agent` thesis when:

1. the environment remains the visible root object
2. runtime truth is easier to inspect, not easier to ignore
3. workflow truth shapes execution rather than trailing behind it
4. approvals, incidents, validation, and reconciliation are first-class operational surfaces
5. agentic and multi-actor work is explicit rather than decorative
6. the user experiences a genuinely new engineering model rather than a classic IDE with agent features attached
