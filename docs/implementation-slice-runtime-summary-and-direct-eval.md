# Implementation Slice: Runtime Summary And Direct Eval

## Purpose

This slice defines the first runtime-native implementation path in the desktop app.

It proves that the product preserves direct operator power while keeping execution inside the `sbcl-agent` governed service model.

## Scope

This slice includes:

- runtime summary query
- Runtime workspace initial detail rendering
- direct evaluation command path
- result rendering for success, approval wait, and failure

This slice does **not** include:

- full package/symbol browser depth
- full source-image divergence inspector
- full runtime incident workspace linkage

## User-Visible Outcome

A user can open the Runtime workspace, see real runtime summary information, execute a form, and understand whether the result:

- succeeded normally
- awaits approval
- failed

## `sbcl-agent` Touch Points

### Required Work

- expose `runtime.summary`
- expose `runtime.eval`
- normalize outputs to `RuntimeSummaryDto` and `RuntimeEvalResultDto`
- preserve policy and binding metadata on command responses

### Existing Internal Areas Likely Involved

- `src/runtime-service.lisp`
- runtime summary builders
- runtime eval service response shaping
- policy id propagation
- DTO normalization layer

### Deliverables

- runtime summary externalization
- runtime eval externalization
- stable runtime command metadata

## Electron Touch Points

### Main Process

- runtime query/command client integration
- command result routing
- host error vs service error distinction

### Preload

- `query.runtimeSummary(environmentId?)`
- `command.evaluateInContext(input)`

### Renderer

- Runtime workspace shell
- runtime summary region
- direct evaluation surface
- result and command-state region

## Protocol Operations

### Required Targets

- `runtime.summary`
- `runtime.eval`

## DTOs Used

- `RuntimeSummaryDto`
- `RuntimeEvalResultDto`
- `CommandResultDto<RuntimeEvalResultDto>`
- `ServiceMetadataDto`

## Renderer View Requirements

### Runtime Summary

Must render:

- runtime id
- current package
- loaded system count
- loaded systems summary
- divergence posture if available

### Direct Evaluation Surface

Must render:

- input form area
- execution context indicator
- result summary
- state chip or banner for:
  - `ok`
  - `awaiting_approval`
  - `failed`

If operation, artifact, or incident ids are present, they should be displayed as linked references or lightweight chips even before deeper slices are implemented.

## Acceptance Tests

### Backend Acceptance

- runtime summary returns a stable DTO envelope
- runtime eval returns stable command envelopes for normal success
- runtime eval returns stable command envelopes for approval-required paths
- runtime eval returns stable command envelopes or error envelopes for failures

### Electron Acceptance

- Runtime workspace renders real host-backed summary data
- direct evaluation command executes through main/preload path only
- renderer distinguishes normal success, approval wait, and failure

### Thesis Acceptance

- direct eval remains first-class rather than being buried in chat
- governed consequences remain explicit rather than being hidden behind generic completion text
- runtime truth is visible as a first-class workspace, not as a backend detail

## Exit Criteria

This slice is complete when:

1. the Runtime workspace is backed by real host queries
2. a user can run direct eval through the desktop app
3. approval-required and failed outcomes are visibly distinct from normal success
