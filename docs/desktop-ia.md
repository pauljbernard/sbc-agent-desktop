# Desktop Information Architecture

## Purpose

This document defines the information architecture for the `sbcl-agent` macOS desktop application.

It is intentionally not a pixel spec. It defines the major workspaces, navigation model, and desktop structure required to make the environment legible to developers and engineers.

## IA Principles

### Principle 1: Start With The Environment

The application should open into environment posture, not into a blank chat pane, not into a file browser, and not into a generic home dashboard.

### Principle 2: Organize Around Entities And Work

Navigation should be driven by governed entities and their relationships:

- environment
- thread
- turn
- operation
- runtime
- work-item
- incident
- artifact
- approval request

### Principle 3: Use Desktop Concurrency

The application should use desktop strengths to show related context simultaneously when helpful.

Examples:

- list plus detail
- detail plus inspector
- active stream plus governed sidebar
- incident detail plus related turn and evidence

### Principle 4: Keep Attention Visible

The app must make waiting work, blocked work, risky work, and active work obvious without forcing users to hunt through multiple screens.

## Primary Navigation Model

The application should use a three-level navigation structure:

1. Environment-level navigation
2. Workspace-level views
3. Contextual inspectors and linked detail

## App Structure

### Global Shell

The macOS application should have a persistent desktop shell containing:

- environment selector
- primary navigation sidebar
- central workspace area
- contextual inspector or utility sidebar
- global attention rail or status strip

### Primary Navigation Sections

The primary navigation should include:

- Environment
- Conversations
- Runtime
- Work
- Incidents
- Artifacts
- Activity
- Approvals

The order may evolve, but those domains must remain quickly reachable.

## Workspaces

### 1. Environment Workspace

Purpose:

- orient the user to the current environment

Must show:

- environment summary
- source, image, and workflow posture
- active thread and turn
- pending approvals
- waiting or blocked work
- recent incidents
- recent artifacts and evidence
- active tasks and workers

This is the default landing workspace.

### 2. Conversations Workspace

Purpose:

- manage durable interaction as structured work

Main regions:

- thread list
- thread detail
- selected turn timeline
- operation and artifact side inspector

Must emphasize:

- turn lifecycle
- operation progression
- approvals
- artifacts
- interruptions

### 3. Runtime Workspace

Purpose:

- inspect and work with live image truth

Main regions:

- runtime posture summary
- package and symbol browser
- loaded definition or scope detail
- live execution inspector
- divergence and validation posture

Must support expert inspection without hiding governed mutation semantics.

### 4. Work Workspace

Purpose:

- manage governed engineering units

Main regions:

- work-item list
- workflow detail
- waiting and blocked state summary
- validation and reconciliation panel
- related artifacts and incidents

Must make the mutation lifecycle explicit:

- inspect
- plan
- checkpoint
- mutate
- observe
- validate
- reconcile
- close or quarantine

### 5. Incidents Workspace

Purpose:

- provide a dedicated recovery environment

Main regions:

- incident queue
- incident detail
- linked turn, operation, runtime, and work-item context
- recovery guidance
- evidence and closure state

This workspace should feel operational, not merely informational.

### 6. Artifacts Workspace

Purpose:

- browse and inspect durable outputs and evidence chains

Main regions:

- artifact list
- artifact detail
- lineage and linkage graph
- evidence context

### 7. Activity Workspace

Purpose:

- observe live environment activity and background execution

Main regions:

- canonical event stream
- task and worker activity
- currently active operations
- filtered family views

This is not a replacement for entity views. It is a live observation surface.

### 8. Approvals Workspace

Purpose:

- manage policy-gated actions quickly and safely

Main regions:

- approval inbox
- approval detail
- scope and risk explanation
- linked entities
- decision controls

## Cross-Cutting Inspectors

The desktop app should use contextual inspectors that can appear from any workspace.

Core inspectors:

- entity inspector
- relationship inspector
- policy and approval inspector
- artifact and evidence inspector
- event detail inspector

This allows users to retain place while examining linked context.

## Attention Model

The app should include a persistent attention model across workspaces.

Attention categories:

- awaiting approval
- interrupted
- failed
- awaiting colder validation
- quarantined
- active streaming
- background work requiring review

The attention model should be visible globally and filterable into local views.

## Windowing And Workspace Behavior

The macOS app should support long-lived engineering sessions.

Recommended behavior:

- persist last-selected environment and workspace
- persist open inspectors or pinned detail views where sensible
- allow opening certain entities in separate windows when useful
- support keyboard-driven workspace switching
- preserve context when navigating linked entities

## Entity Opening Rules

When a user opens an entity, the app should generally:

1. open the relevant workspace if needed
2. select the target entity in context
3. reveal linked inspectors or related panes
4. preserve the user’s broader environment context

The app should avoid disorienting full-screen mode switches for routine navigation.

## What The IA Must Avoid

The application should avoid:

- chat as the universal container
- file trees as the primary truth model
- browser-like page navigation metaphors
- hiding blocked or risky state inside secondary tabs
- flattening incidents, approvals, and workflow state into notifications only

## Initial Acceptance Criteria

The information architecture is acceptable when:

1. A user can orient themselves from the Environment workspace in under a minute.
2. A user can move from a turn to its operations, artifacts, work-item, and incident context without manual searching.
3. A user can inspect runtime truth without leaving the desktop app’s governed context.
4. A user can find all pending approvals, incidents, and blocked work from globally visible surfaces.
5. The structure feels like a desktop engineering environment rather than a website or chat client.
