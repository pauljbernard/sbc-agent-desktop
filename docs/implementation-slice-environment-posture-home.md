# Implementation Slice: Environment Posture Home

## Purpose

This slice defines the first real product-facing workspace backed by host-served data.

It proves that the app is environment-first in practice, not just in architecture documents.

## Scope

This slice includes:

- environment summary query
- environment status query
- environment workspace shell
- posture summary rendering
- basic attention summary rendering

This slice does **not** include:

- full live event updates
- thread detail
- runtime inspection detail
- approval or incident detail workspaces

## User-Visible Outcome

A user can open the app after binding an environment and see a real Environment Posture Home populated from `sbcl-agent`.

## `sbcl-agent` Touch Points

### Required Work

- expose `environment.summary`
- expose `environment.status`
- normalize outputs to `EnvironmentSummaryDto` and `EnvironmentStatusDto`
- preserve binding and authority metadata

### Existing Internal Areas Likely Involved

- `src/environment-service.lisp`
- environment summary/status builders
- service response metadata
- DTO normalization layer

### Deliverables

- stable environment query dispatch
- stable environment DTO encoding

## Electron Touch Points

### Main Process

- environment query client integration
- current environment binding handoff

### Preload

- `query.environmentSummary(environmentId?)`
- `query.environmentStatus(environmentId?)`

### Renderer

- Environment workspace
- shell routing into Environment by default
- posture summary regions
- basic attention summary card or strip

## Protocol Operations

### Required Targets

- `environment.summary`
- `environment.status`

### Required Schemas

- control request/response schemas

## DTOs Used

- `EnvironmentSummaryDto`
- `EnvironmentStatusDto`
- `TruthPostureDto`
- `AttentionSummaryDto`
- `ActiveContextDto`
- `ArtifactSummaryDto`
- `TaskSummaryDto`
- `WorkerSummaryDto`
- `IncidentSummaryDto`
- `ApprovalRequestSummaryDto`

## Renderer View Requirements

The Environment workspace should render:

- source posture
- image posture
- workflow posture
- attention summary
- active context summary
- recent artifacts summary
- active tasks/workers summary

At this stage, linked items may open placeholders if their detail slices are not implemented yet, but the ids and entity refs must be present.

## Acceptance Tests

### Backend Acceptance

- environment summary returns a stable DTO envelope
- environment status returns a stable DTO envelope
- responses include binding metadata

### Electron Acceptance

- renderer can load and render environment summary/status
- the app lands in Environment after binding
- posture sections remain distinct for source, image, and workflow

### Thesis Acceptance

- the first real workspace is environment-first rather than chat-first or file-first
- attention is visible without switching workspaces

## Exit Criteria

This slice is complete when:

1. the desktop app renders a real environment home from host-backed data
2. environment posture is visible across the three truth domains
3. the product’s center of gravity is visibly the environment
