# Electron App Skeleton Plan

## Purpose

This document defines the first implementation skeleton for the Electron desktop application.

Its purpose is to establish a disciplined project structure that matches the architecture already specified:

- main process owns desktop runtime orchestration
- preload is narrow and typed
- renderer is presentation-focused

## Goal

Create the minimum Electron application skeleton that can:

- launch
- connect to a local `sbcl-agent` service host
- expose a typed preload bridge
- render the environment shell
- support the first P0 workspace milestones

## Recommended Top-Level Structure

Conceptual directory shape:

```text
desktop/
├── package.json
├── electron-builder config
├── tsconfig files
├── src/
│   ├── main/
│   ├── preload/
│   ├── renderer/
│   ├── shared/
│   └── platform/
└── tests/
```

## Main Process Skeleton

### Initial Modules

- `app-shell`
- `window-manager`
- `service-client`
- `event-client`
- `connection-manager`
- `binding-manager`
- `desktop-preferences`

### First Deliverables

- app startup
- create main window
- connect to host
- expose host status to renderer
- expose environment binding support

## Preload Skeleton

### Initial Modules

- `bridge-root`
- `host-api`
- `query-api`
- `command-api`
- `event-api`
- `desktop-api`

### First Deliverables

- `window.sbclAgentDesktop`
- typed host methods
- typed query and command wrappers
- typed event subscription bridge

## Renderer Skeleton

### Initial Modules

- `app-root`
- `shell`
- `navigation`
- `workspaces`
- `entity-views`
- `inspectors`
- `design-system`
- `state`

### First Deliverables

- render shell frame
- render environment binding state
- render workspace navigation
- render placeholder Environment workspace backed by real query data

## Shared Module Skeleton

### Initial Modules

- protocol types
- DTO types
- preload interface types
- entity refs
- workspace ids

Purpose:

- keep contracts shared across main, preload, and renderer

## Platform Module Skeleton

### Initial Modules

- keyboard mapping
- menu mapping
- window integration
- packaging hooks

Purpose:

- isolate macOS-specific and future Windows-specific behavior

## First Functional Milestones

### Milestone 1: Bootable Shell

Deliver:

- Electron app boots
- main window opens
- renderer shows shell and host connection state

### Milestone 2: Host Connectivity

Deliver:

- main process connects to `sbcl-agent`
- preload exposes host status and binding methods
- renderer can bind environment

### Milestone 3: First Real Query Path

Deliver:

- renderer loads environment summary through preload
- environment shell shows real posture data

### Milestone 4: Event Subscription Path

Deliver:

- main process subscribes to environment events
- preload forwards event stream safely
- renderer updates a visible status region

## Guardrails

### Guardrail 1: No Raw IPC In Renderer

Renderer code must not import or use raw Electron IPC primitives directly.

### Guardrail 2: No Transport In Renderer

Renderer code must not know about Unix sockets, named pipes, or connection lifecycle details.

### Guardrail 3: No Platform Logic In Renderer

Platform-specific keyboard, menu, and shell behavior stays out of renderer product logic.

## Acceptance Criteria

The skeleton plan is acceptable when:

1. it creates a project structure consistent with the Electron architecture docs
2. it supports a fast start toward real host-backed workspaces
3. it prevents renderer drift into transport or platform authority
4. it provides a clean shared-types foundation for the DTO and protocol contracts
