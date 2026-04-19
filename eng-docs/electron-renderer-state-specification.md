# Electron Renderer State Specification

## Purpose

This document specifies the renderer-state architecture for the `sbcl-agent` Electron desktop application.

The renderer is responsible for presenting workspaces, entity views, and inspectors. It must do this without becoming the hidden authority for domain truth or the hidden owner of desktop transport behavior.

## Goals

The renderer state architecture must:

- stay presentation-focused
- consume typed data from the preload bridge
- support many active concurrent contexts
- keep local UI state separate from authoritative domain state
- make workspace composition predictable and maintainable

## State Categories

### 1. Remote-Derived Domain View State

This is renderer state derived from:

- query results
- main-process forwarded event updates
- workspace projections

Examples:

- current thread detail projection
- current runtime scope projection
- current work-item projection

### 2. Workspace State

This is renderer-local state for workspace composition.

Examples:

- current workspace tab or section
- selected list item
- active local filters
- visible subpanes

### 3. Ephemeral Interaction State

This is very local UI state.

Examples:

- hover
- temporary input
- inline expansion
- focus state

## Renderer Rules

### Rule 1: No Hidden Domain Authority

The renderer may cache projections and local selections, but it must not become the silent source of truth for durable domain state.

### Rule 2: No Raw Transport State

The renderer should not track sockets, named pipes, protocol handshakes, or event cursors directly.

### Rule 3: Workspace State Is Real But Local

Workspace composition state matters, but it is desktop-local and non-authoritative.

### Rule 4: Concurrent Contexts Must Be First-Class

The renderer must be able to display:

- many threads
- many turn states
- active tasks and workers
- attention categories

without assuming a single foreground object.

## Suggested Store Shape

The renderer should keep state in explicitly separated stores or slices such as:

- `workspaceStore`
- `selectionStore`
- `filterStore`
- `inspectorStore`
- `uiPreferenceStore`

Remote-derived domain projections may either be:

- provided from main in pre-aggregated form
- or assembled in renderer from typed entity payloads

but the renderer should still treat them as derived, not authoritative.

## Workspace State Responsibilities

### Environment Workspace

Owns:

- visible posture sections
- selected attention item
- selected recent entity

### Conversations Workspace

Owns:

- selected thread
- selected turn
- thread-state filter
- operation and artifact panel visibility

### Runtime Workspace

Owns:

- selected package
- selected symbol or scope
- open direct-evaluation state
- active inspector selection

### Work Workspace

Owns:

- selected work-item
- workflow detail panel state
- validation/reconciliation inspector state

### Incidents Workspace

Owns:

- selected incident
- recovery detail visibility
- linked entity panel state

### Activity Workspace

Owns:

- event-family filter
- visibility filter
- selected event

### Approvals Workspace

Owns:

- selected approval request
- policy inspector visibility

## Entity Opening Model

When the renderer is asked to open an entity:

1. route to the relevant workspace if needed
2. select the target entity in local state
3. request or consume detail data through the bridge
4. update inspectors and related panes

The renderer should preserve context rather than resetting surrounding workspace state whenever possible.

## Attention Model Consumption

The renderer should treat attention as:

- environment-wide input from app core
- workspace-local filtered view
- deep-linkable entity entry point

The renderer should not independently invent attention semantics from partial local cues.

## Event Handling Model

The renderer should consume:

- app-safe forwarded events
- app-safe derived state updates

It should update local projections and visible UI accordingly, but it should not own canonical event interpretation.

## Acceptance Criteria

The renderer-state architecture is acceptable when:

1. the renderer remains presentation-focused
2. local UI state is clearly separated from derived domain state
3. many active contexts can be displayed without a single-thread assumption
4. event-driven updates can re-render workspaces cleanly without transport leakage
5. the renderer does not become a second hidden authority beside `sbcl-agent`
