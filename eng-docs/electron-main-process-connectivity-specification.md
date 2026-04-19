# Electron Main Process Connectivity Specification

## Purpose

This document specifies the Electron main-process connectivity architecture for the `sbcl-agent` desktop application.

It defines how the Electron main process should own:

- service-host connectivity
- control-plane dispatch
- event-plane subscription
- reconnect and replay behavior
- event fan-out into the renderer layer

## Goals

The main-process connectivity layer must:

- be the only Electron process that talks directly to `sbcl-agent`
- preserve the service-boundary model
- support high-concurrency, event-driven supervision
- isolate transport details away from the renderer
- remain portable across macOS and Windows transports

## Core Modules

### 1. Connection Manager

Owns:

- connection lifecycle
- host availability checks
- current binding context
- reconnect policy

### 2. Control Client

Owns:

- request construction
- request ids
- response decoding
- control-plane errors

### 3. Event Client

Owns:

- event subscription lifecycle
- cursor tracking
- replay after reconnect
- filter management

### 4. Event Dispatcher

Owns:

- canonical event intake
- event routing to internal app state
- event forwarding to renderer subscribers

### 5. Host Status Manager

Owns:

- service host readiness
- current connection state
- supported protocol and contract versions

## Connection Lifecycle

Recommended lifecycle:

1. main process starts
2. connection manager attempts to connect to local `sbcl-agent` service host
3. host status is queried
4. environment binding is restored or selected
5. event client subscribes with last-known cursor if available

## Control-Plane Rules

### Rule 1: All Renderer Commands Route Through Main

Renderers may request commands, but only the main process talks to the service host.

### Rule 2: Main Process Owns Retry Logic

Retries, reconnects, and protocol-level error handling belong in the main process.

### Rule 3: Main Process Preserves Correlation

Every control request should maintain:

- request id
- environment binding
- operation target
- result routing

## Event-Plane Rules

### Rule 1: One Canonical Event Intake

The main process should own one canonical event subscription per active environment context unless a stronger reason exists otherwise.

### Rule 2: Cursor Persistence Is Main-Owned

The last processed event cursor should be owned and persisted by the connectivity layer, not by individual renderers.

### Rule 3: Replay Before Live Resume

After reconnect:

1. replay from cursor
2. apply missed events
3. continue live delivery

## Renderer Fan-Out Model

The main process must not forward raw transport behavior into the renderer.

Instead:

1. main process consumes external protocol messages
2. main process normalizes them into app-safe internal events
3. renderers receive only what they need through typed bridge channels

This preserves clean boundaries and avoids transport leakage.

## Internal Event Categories

The main process should maintain internal event categories such as:

- host status changed
- environment binding changed
- domain entity updated
- attention model changed
- desktop preference changed

These are desktop-application concerns distinct from raw environment events, though often derived from them.

## Failure Modes

The connectivity layer must distinguish:

- host unavailable
- transport disconnected
- protocol mismatch
- invalid binding
- service error
- domain wait state such as awaiting approval

Awaiting approval is not a transport failure and must not be surfaced as one.

## Portability Rules

The connectivity layer should hide platform transport differences behind one abstraction:

- Unix domain socket on macOS
- named pipe on Windows

The rest of the application core should not care which primitive is in use.

## Suggested Persistence

The main process should persist:

- last environment binding
- last known event cursor per environment
- recent connection state

This is desktop coordination state, not domain authority.

## Acceptance Criteria

The main-process connectivity architecture is acceptable when:

1. the renderer never speaks directly to `sbcl-agent`
2. reconnect and replay are centrally handled
3. many concurrent events can be ingested and routed without renderer transport logic
4. transport portability is isolated behind one abstraction
5. host, protocol, and domain states are clearly distinguished
