# Federated Workspace Service Boundary

## Purpose

This document locks the role of `sbcl-agent-ux` in the federated employee/contractor operating model.

The desktop is an operator-facing surface over the local `sbcl-agent` node.

It is not the global orchestration client.

## Boundary Rule

The desktop remains a pure host/client of `sbcl-agent` service DTOs and the shell desktop contract.

The desktop does not call `RGP` directly in the first federated implementation pass.

This rule is intentionally strict because it preserves:

- a coherent local node model
- a single local service boundary
- clear ownership of local publication and replay state
- the ability to operate even when central connectivity is degraded

## What The Desktop Must Expose

The desktop must make the local node legible in either employee or contractor mode.

That includes:

- node operating mode
- trust profile
- visibility profile
- assignment terms
- acceptance state
- local evidence posture
- publication backlog
- local usage telemetry summaries

## What The Desktop Must Not Own

The desktop must not become the place where:

- global assignment orchestration is recomposed
- commercial state is independently interpreted from raw `RGP` events
- lease arbitration is decided
- cross-node coordination is modeled outside `sbcl-agent`

Those responsibilities belong to `RGP` and `sbcl-agent`, not the desktop.

## UI Consequences

The federated desktop should expose:

- local assignment inbox and assignment detail
- explicit accept, reject, and clarification flows where allowed
- evidence profile posture
- publication status and replay/backlog state
- usage summaries appropriate to the local operator

It should not assume full compensation or payment administration in the first pass.

First-pass commercial visibility should remain operator-relevant rather than finance-complete.

## DTO Consequences

If the desktop needs new federated state, that state should first be added to `sbcl-agent` service DTOs or the shell desktop contract surfaced by `sbcl-agent`.

The desktop should not work around missing local contracts by reaching into `RGP` directly.

## Phase 1 Lock

The desktop is locked to this role for the federated architecture:

- local node surface
- pure client of `sbcl-agent`
- no direct `RGP` dependency in the first pass
