# Electron Preload Bridge Specification

## Purpose

This document specifies the preload bridge for the `sbcl-agent` Electron desktop application.

The preload bridge is the only allowed direct interface between:

- the Electron renderer
- the Electron main process desktop runtime

Its job is to expose a narrow, typed, secure application API to the renderer without granting the renderer raw access to Node, Electron internals, or direct `sbcl-agent` transport.

## Goals

The preload bridge must:

- expose only product-safe desktop APIs
- remain small and explicit
- preserve renderer security boundaries
- support request/response control operations
- support event subscription forwarding
- remain stable enough for renderer development without leaking implementation detail

## Security Model

The preload bridge assumes:

- `contextIsolation: true`
- `nodeIntegration: false`
- no unrestricted `ipcRenderer` exposure

The bridge must not export raw Electron primitives directly into the renderer.

## Design Rules

### Rule 1: Application API, Not Electron API

The preload layer should expose product-oriented methods such as:

- `getEnvironmentSummary`
- `startTurn`
- `subscribeEvents`

It should not expose:

- raw IPC channels
- arbitrary Node APIs
- arbitrary shell access

### Rule 2: Typed And Explicit

Every exported preload method should have:

- explicit input shape
- explicit output shape
- explicit error behavior

### Rule 3: No Hidden Authority

The preload bridge is only a secure pass-through layer. It does not become a place where product logic, policy logic, or state ownership quietly accumulates.

## Exposed API Families

The preload bridge should expose five high-level API families.

### 1. Host API

Purpose:

- desktop app lifecycle and health

Examples:

- `getHostStatus()`
- `getCurrentBinding()`
- `setEnvironmentBinding(environmentId)`

### 2. Query API

Purpose:

- read-model access to `sbcl-agent` services

Examples:

- `queryEnvironmentSummary()`
- `queryThreadDetail(threadId)`
- `queryRuntimeSummary()`
- `queryWorkItem(workItemId)`

### 3. Command API

Purpose:

- governed commands routed through the main process

Examples:

- `startTurn(input)`
- `resumeTurn(turnId)`
- `evaluateInContext(input)`
- `approveRequest(requestId)`
- `denyRequest(requestId)`

### 4. Event API

Purpose:

- subscribe to application-safe event streams

Examples:

- `subscribeEnvironmentEvents(filter, handler)`
- `unsubscribe(subscriptionId)`

### 5. Window And Desktop API

Purpose:

- windowing and desktop interactions required by the product

Examples:

- `openEntityInNewWindow(entityRef)`
- `focusWorkspace(workspaceId)`
- `getDesktopPreferences()`
- `setDesktopPreferences(patch)`

This family must remain tightly bounded.

## Suggested Renderer-Facing Shape

The preload bridge should expose one structured object on `window`, conceptually:

```ts
window.sbclAgentDesktop = {
  host: { ... },
  query: { ... },
  command: { ... },
  events: { ... },
  desktop: { ... }
}
```

This is preferable to scattering unrelated globals across the renderer environment.

## Request Model

Preload query and command methods should map onto explicit main-process handlers that then map onto the external protocol to `sbcl-agent`.

Renderer -> preload -> main -> `sbcl-agent`

The preload bridge must not:

- implement retry logic
- own protocol semantics
- normalize domain state

Those belong in the main-process application core.

## Event Subscription Model

The preload bridge should support renderer subscriptions to main-process event fan-out.

Recommended behavior:

1. renderer subscribes through preload API
2. preload registers against a main-process event channel
3. main process forwards only safe event payloads
4. preload returns an unsubscribe capability or subscription id

## Typed Contract Recommendation

The preload API should be defined in a shared TypeScript contract package or module used by:

- preload implementation
- main-process handlers
- renderer consumers

This reduces drift across the Electron boundary.

## Disallowed Patterns

The preload bridge must not:

- expose `ipcRenderer` directly
- expose filesystem or process APIs generically
- expose raw transport sockets or named pipes
- expose arbitrary command execution
- let the renderer invent hidden side channels around the product architecture

## Acceptance Criteria

The preload bridge is acceptable when:

1. the renderer has everything it needs for product behavior
2. the renderer does not gain raw system or transport power
3. all APIs are typed and explicit
4. the preload layer remains thin and does not accumulate product authority
5. the bridge supports both control-plane calls and event subscriptions cleanly
