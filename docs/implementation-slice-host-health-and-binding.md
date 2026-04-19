# Implementation Slice: Host Health And Binding

## Purpose

This slice defines the first end-to-end implementation step connecting the Electron app to a local `sbcl-agent` service host.

Its purpose is to prove:

- the service host process model
- the external protocol control plane
- the Electron main/preload/renderer boundary
- explicit environment binding

This is the minimum viable vertical slice for the desktop architecture.

## Scope

This slice includes:

- host startup and health query
- current binding query
- set environment binding command
- Electron shell connection state

This slice does **not** include:

- event stream delivery
- environment posture queries
- conversation data
- runtime data

## User-Visible Outcome

A user can launch the Electron app, see whether the local `sbcl-agent` host is reachable, and bind the desktop session to an environment.

## `sbcl-agent` Touch Points

### Required Work

- add `serve` or equivalent host mode
- implement `host.health`
- implement `host.current_binding`
- implement environment binding command endpoint
- return stable JSON envelopes

### Existing Internal Areas Likely Involved

- `src/service-core.lisp`
- `src/environment-service.lisp`
- session/environment binding helpers
- JSON emission layer
- new host runtime entrypoint

### Deliverables

- service host bootstrap
- control-plane handler
- minimal host query and command dispatch

## Electron Touch Points

### Main Process

- connection manager
- control client
- host status manager
- binding manager

### Preload

- `host.getHostStatus()`
- `host.getCurrentBinding()`
- `host.setEnvironmentBinding(environmentId)`

### Renderer

- shell startup status region
- environment binding selector or placeholder binding UI

## Protocol Operations

### Required Targets

- `host.health`
- `host.current_binding`
- `host.set_environment_binding`

### Required Schemas

- request envelope
- response envelope
- error envelope

## DTOs Used

- `HostStatusDto`
- `BindingDto`
- `CommandResultDto<BindingDto>`

If `HostStatusDto` is not yet defined elsewhere, define the first version as:

```ts
interface HostStatusDto {
  hostState: "starting" | "ready" | "degraded" | "unavailable";
  supportedProtocolVersion: number;
  supportedContractVersion: number;
}
```

## Renderer States

The renderer should support at least:

- host unavailable
- host starting
- host ready, no environment bound
- host ready, environment bound

## Acceptance Tests

### Backend Acceptance

- host starts cleanly and responds to health query
- host reports current binding accurately
- binding command changes current binding state

### Electron Acceptance

- main process can connect and query host status
- preload exposes typed host methods
- renderer can render host state and reflect binding changes

### Architecture Acceptance

- renderer does not use raw IPC or transport directly
- host interaction occurs only through typed preload methods
- environment binding remains explicit

## Exit Criteria

This slice is complete when:

1. Electron boots and can talk to a real `sbcl-agent` host
2. health and binding state are visible in the desktop shell
3. the control-plane path is proven end to end
