# Service Host Implementation Plan

## Purpose

This document defines the implementation plan for the `sbcl-agent` service host required by the Electron desktop application.

It translates the service-host and protocol architecture into a staged execution plan for the `/Volumes/data/development/sbcl-agent` codebase.

## Goal

Deliver a local long-lived `sbcl-agent` service host that:

- exposes the public service interface layer
- supports control-plane request/response interaction
- supports event-plane replay and live delivery
- can be consumed by the Electron desktop application without shell coupling

## Guiding Rules

- environment authority remains inside `sbcl-agent`
- external access happens only through stable service contracts
- event semantics are canonicalized in `sbcl-agent`, not in the desktop app
- compatibility-session internals do not become the external API

## Workstreams

The implementation should be split into five workstreams:

1. host runtime
2. service dispatch
3. DTO normalization
4. event delivery
5. operational hardening

## Workstream 1: Host Runtime

### Objective

Add a long-lived runtime mode, conceptually `sbcl-agent serve`.

### Deliverables

- new CLI command or subcommand for service host mode
- service host lifecycle bootstrap
- host-ready status reporting
- environment boot and binding initialization

### Initial Acceptance

- host process can start cleanly
- host reports health and readiness
- host can remain alive for long-running desktop sessions

## Workstream 2: Service Dispatch

### Objective

Expose existing service families through a stable external dispatcher.

### Deliverables

- domain/operation router
- control-plane handler
- binding-aware request execution
- normalized response envelopes

### First Supported Domains

- host
- environment
- conversation
- runtime
- approval

### Initial Acceptance

- the host can answer health checks
- the host can serve basic environment and conversation queries
- the host can execute a first command path such as runtime eval or approval decision

## Workstream 3: DTO Normalization

### Objective

Ensure external payloads are stable JSON DTOs rather than internal Lisp shapes.

### Deliverables

- DTO encoder layer for first P0 entities
- JSON-safe normalization for service `:data`
- metadata preservation for authority, binding, and policy ids

### First DTO Set

- environment summary
- environment status
- thread summary
- thread detail
- turn detail
- runtime summary
- approval request detail
- incident detail
- work-item detail

### Initial Acceptance

- the Electron app can consume DTOs without implementation-shape leakage
- all DTOs are versioned implicitly through contract metadata and explicitly through docs

## Workstream 4: Event Delivery

### Objective

Make canonical environment events available to the desktop app through replayable and live mechanisms.

### Deliverables

- event subscription endpoint
- cursor replay support
- family and visibility filtering
- live event streaming

### Initial Acceptance

- client can subscribe from cursor
- replay occurs before live streaming
- event delivery remains stable under reconnect

## Workstream 5: Operational Hardening

### Objective

Harden the host for real desktop usage.

### Deliverables

- error normalization
- protocol version checks
- binding validation
- host status reporting
- diagnostic logging for host and transport lifecycle

### Initial Acceptance

- client can distinguish host, transport, protocol, and service failures
- invalid binding and unsupported requests fail predictably

## Suggested Phase Order

### Phase 1: Minimal Host

Deliver:

- host runtime
- health query
- environment summary query
- basic control-plane framing

Purpose:

- prove process model and connectivity path

### Phase 2: First Desktop-Usable Service Surface

Deliver:

- environment queries
- conversation thread list/detail
- runtime summary
- runtime eval command
- approval decision commands
- DTO normalization for the first P0 surfaces

Purpose:

- support the first desktop workspaces

### Phase 3: Evented Desktop Integration

Deliver:

- event subscription
- replay and reconnect support
- event filtering

Purpose:

- support live supervision in the desktop app

### Phase 4: P0 Coverage Expansion

Deliver:

- incident queries
- work-item and workflow queries
- additional artifact coverage

Purpose:

- complete the P0 workspace data surface

## Dependency Notes

The desktop app can begin before every service is complete, but its first useful milestone depends on:

- host runtime
- environment summary/status
- thread list/detail
- runtime summary/eval
- approval query/decision
- basic event subscription

## Risks

### Risk 1: DTO leakage from internal shapes

Mitigation:

- explicit DTO normalization layer

### Risk 2: shell compatibility helpers becoming the easiest external path

Mitigation:

- insist on service-family dispatch only

### Risk 3: event model divergence between host and desktop

Mitigation:

- canonical event contract owned by `sbcl-agent`

## Acceptance Criteria

This plan is acceptable when:

1. it provides a credible path from current services to a real local service host
2. the first desktop milestones can be built on it
3. it preserves environment authority and service-boundary discipline
4. it explicitly sequences DTO and event work rather than leaving them implicit
