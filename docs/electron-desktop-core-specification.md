# Electron Desktop Core Specification

## Purpose

This document specifies the Electron application architecture for the `sbcl-agent` desktop application.

It defines how the desktop product should be split across:

- Electron main process
- preload bridge
- renderer application

while keeping `sbcl-agent` as the authority for durable domain truth.

## Goals

The Electron core must:

- support the environment-first product model
- consume stable service contracts from `sbcl-agent`
- support many concurrent active threads, turns, tasks, and actors
- preserve strong security boundaries inside Electron
- remain portable across macOS and future Windows

## Process Model

### Main Process

Owns:

- app lifecycle
- window lifecycle
- transport client to `sbcl-agent`
- event subscription lifecycle
- platform integration
- desktop-level persistence coordination
- fan-out of external events into renderer-safe channels

### Preload Bridge

Owns:

- secure API exposure into renderer
- typed bridge contracts
- request forwarding
- event forwarding

This layer must stay thin and explicit.

### Renderer

Owns:

- workspace rendering
- entity rendering
- inspectors
- design-system implementation
- local UI interaction state

The renderer must not own:

- raw transport sockets
- platform shell logic
- governance authority

## Core Modules

### App Shell Module

Owns:

- top-level desktop bootstrapping
- current environment connection state
- workspace shell composition

### Navigation Module

Owns:

- workspace navigation
- entity-open routing
- navigation history

### Service Client Module

Owns:

- control-plane request construction
- response decoding
- reconnect and retry behavior
- protocol version handling

This should live in the main process.

### Event Client Module

Owns:

- event-plane subscription
- cursor persistence
- replay after reconnect
- event stream lifecycle

This should also live in the main process.

### State Store Module

Owns:

- normalized entity caches
- derived application state
- attention summaries
- workspace-facing projections

### Workspace Orchestration Module

Owns:

- environment workspace model
- conversations workspace model
- runtime workspace model
- work workspace model
- incidents workspace model
- artifacts workspace model
- activity workspace model
- approvals workspace model

### Concurrency And Attention Module

Owns:

- thread supervision summaries
- active turn aggregation
- actor-aware attention
- task and worker summaries
- approval and incident rollups

### Local Persistence Module

Owns:

- recent entities
- pinned inspectors
- local filters
- window and layout preferences

This state is non-authoritative.

## State Boundaries

### Authoritative Domain State

Owned by `sbcl-agent`.

Examples:

- turn status
- approval status
- incident status
- workflow posture

### Derived App State

Owned in Electron and derived from service DTOs and events.

Examples:

- workspace summaries
- thread supervision views
- attention rollups

### Local UI State

Owned in renderer or desktop shell.

Examples:

- selected entity
- open inspector
- split pane width
- temporary filter state

## Security Rules

Electron must be configured with:

- context isolation enabled
- node integration disabled in renderer
- narrow preload bridge
- no direct renderer access to raw system or transport APIs

## Main/Renderer Boundary Rules

### Rule 1: Transport Stays In Main

The renderer must not talk directly to `sbcl-agent` over IPC.

### Rule 2: Event Meaning Is Not Invented In Renderer

The renderer may present event-derived state, but canonical event handling and fan-out should be owned by the app core.

### Rule 3: Renderer Is Not The Product Authority

The renderer is where the UI appears, not where durable domain truth or governance rules live.

## Acceptance Criteria

The Electron core is acceptable when:

1. the main process owns desktop runtime orchestration
2. the preload bridge is narrow and explicit
3. the renderer stays presentation-oriented
4. concurrency supervision works across many active contexts
5. the same architecture can support macOS now and Windows later
