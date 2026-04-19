# Integration And Event Transport Recommendation

## Recommendation

Use a **local long-lived `sbcl-agent` service process** with a **cross-platform local IPC transport** and a **split control-plane / event-plane protocol**.

In practical terms:

- `sbcl-agent` runs as a local service process or daemon for the desktop app
- control plane uses framed request/response messages over local IPC
- event plane uses a long-lived event subscription stream over local IPC
- messages are JSON-encoded service envelopes derived from the existing service response model
- event replay and resume use the existing cursor-based event contract

## Why This Is The Best Fit

This approach best serves the existing `sbcl-agent` architecture because:

- the service boundary is already the intended UX-facing abstraction
- the event model already assumes canonical environment events and cursor-based replay
- the desktop app is local-first and should not depend on shell parsing
- the app needs low-latency, high-concurrency supervision of many active threads and actors
- future Windows support requires a transport that is not Unix-only or macOS-only

## Transport Recommendation

### Primary Transport

Use **local IPC**:

- Unix domain socket on macOS
- named pipe on Windows

This should be hidden behind one transport abstraction in the desktop app and one listener abstraction in `sbcl-agent`.

### Why Local IPC Instead Of Localhost HTTP As The Primary Path

Local IPC is the better primary path because it offers:

- better locality semantics
- no port management issues
- clearer local security boundaries
- better fit for desktop-to-local-service communication

HTTP can remain a secondary or diagnostic option later if needed, but it should not be the architectural center of the desktop integration.

## Protocol Recommendation

### Control Plane

Use framed JSON request/response messages for:

- queries
- commands
- environment binding
- health checks

Each message should include:

- protocol version
- request id
- service domain
- operation name
- payload
- binding context

### Event Plane

Use a long-lived subscription stream carrying canonical event envelopes.

The client should connect with:

- `environment_id`
- optional `after_cursor`
- optional family filter
- optional visibility filter

The server should:

1. replay missed events after the provided cursor
2. continue streaming new events
3. preserve cursor monotonicity

This directly extends the existing `sbcl-agent` event contract instead of inventing a parallel model.

## Message Model Recommendation

The external protocol should be derived from the existing service response shape already present in `sbcl-agent`:

- `contract_version`
- `domain`
- `operation`
- `kind`
- `status`
- `data`
- `metadata`

That existing model is the right starting point because it already carries:

- authority
- environment and session binding
- read model or command model identity
- policy identifiers

What must change is not the conceptual model. What must change is externalization and dispatch.

## What `sbcl-agent` Should Implement

### 1. Service Host Mode

Add a long-lived service host mode, conceptually:

- `sbcl-agent serve`

This host should:

- initialize the environment and service boundary
- accept local IPC connections
- dispatch queries and commands
- publish event streams

### 2. Service Dispatcher

Add a dispatcher that maps external requests onto the existing service families:

- environment
- conversation
- runtime
- workflow
- artifact
- incident
- task
- approval
- events

### 3. Stable JSON DTO Boundary

The existing service layer already produces response envelopes and the repo already has JSON support.

The next step is to guarantee that service `:data` payloads are normalized into stable JSON DTOs rather than leaking implementation-shaped Lisp structures.

### 4. Event Subscription Endpoint

Add a subscription endpoint for canonical events with:

- cursor resume
- optional filtering
- bounded replay on reconnect

### 5. Error Normalization

All externally visible failures should be normalized into stable error payloads instead of raw Lisp condition text alone.

## Why Split Control Plane And Event Plane

This split is the right choice because:

- control requests are synchronous and bounded
- event delivery is long-lived and streaming
- desktop supervision requires many event updates without blocking command traffic
- reconnect and replay logic are cleaner on a dedicated event channel

## Why Not Polling As The Primary Desktop Mode

The current event contract is polling-friendly and should remain as a fallback.

But polling alone is not the best primary desktop mode because:

- the app needs low-latency visibility into many concurrent states
- multi-thread and multi-actor supervision should feel live
- heavy polling creates avoidable churn in a long-lived desktop process

Recommended position:

- keep cursor-based polling semantics in the contract
- use them for replay and fallback
- make push-style event streaming the primary desktop behavior

## Client Architecture Recommendation

The desktop app should have:

### Service Client Module

Owns:

- request construction
- response decoding
- binding context
- retry and reconnect logic

### Event Client Module

Owns:

- subscription lifecycle
- cursor persistence
- replay after reconnect
- event fan-out into view models and attention summaries

### Binding Model

The client should treat environment binding as explicit session context rather than hidden global state.

## Security Recommendation

Because this is local IPC, the security model should still remain explicit.

The service boundary should enforce:

- operator identity or local-session identity
- environment binding
- command authorization
- policy and approval behavior

The desktop app must not be trusted to enforce the real rules.

## Portability Recommendation

This transport strategy supports the macOS-first / Windows-later requirement cleanly:

- macOS uses Unix domain sockets
- Windows uses named pipes
- the message protocol stays unchanged
- the desktop service client stays largely unchanged

This is the right kind of portability:

- platform-specific transport primitive
- shared protocol and product behavior

## Alternatives Considered

### Localhost HTTP + SSE or WebSocket

Pros:

- familiar tooling
- easy debugging

Cons:

- pushes the architecture toward web-service assumptions
- introduces port and host concerns unnecessarily
- weaker fit for a local-first desktop app

Recommendation:

- acceptable fallback or debug mode
- not the primary architecture

### Shell Or REPL Embedding

Pros:

- minimal initial implementation effort

Cons:

- violates the service-boundary rule
- couples the desktop app to shell internals
- makes structured events and concurrency supervision brittle

Recommendation:

- reject

## Decision

Recommended integration model:

- **local long-lived `sbcl-agent` service host**
- **local IPC transport**
- **JSON service envelopes**
- **split control plane and event plane**
- **cursor-resumable push event stream with polling fallback**

This is the model that best fits both the current `sbcl-agent` architecture and the desktop product requirements.

## Acceptance Criteria

This recommendation should be considered accepted when:

1. the desktop app can communicate with `sbcl-agent` without shell coupling
2. queries and commands map cleanly to service families
3. event streaming supports replay and reconnect through cursors
4. the transport works on macOS now and can be adapted to Windows without protocol redesign
5. the model supports live supervision of many concurrent threads, turns, tasks, and actors
