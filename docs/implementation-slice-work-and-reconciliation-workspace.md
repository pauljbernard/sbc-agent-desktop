# Implementation Slice: Work And Reconciliation Workspace

## Purpose

This slice defines the first full workflow and closure-oriented surface in the desktop app.

It proves that the product distinguishes:

- execution
- validation
- reconciliation
- closure

instead of collapsing them into one completion notion.

## Scope

This slice includes:

- work-item list query
- work-item detail query
- workflow-record detail query
- Work workspace list/detail rendering
- validation and reconciliation posture rendering
- closure readiness rendering
- linked navigation to approvals, incidents, artifacts, and runtime context

This slice does **not** include:

- advanced reconciliation editing UI
- full artifact evidence workspace integration beyond linked refs
- bulk work management flows
- board-style planning features unrelated to governed workflow truth

## User-Visible Outcome

A user can open the Work workspace and understand:

- what work exists
- what phase it is in
- what is blocked
- what still needs validation
- what still needs reconciliation
- what is actually closable
- why work that appears successful is not yet ready for closure

## `sbcl-agent` Touch Points

### Required Work

- expose work-item list or equivalent queue query
- expose work-item detail
- expose workflow-record detail
- expose validation posture and reconciliation posture if separate
- normalize outputs to workflow DTOs

### Existing Internal Areas Likely Involved

- `src/work-item-service.lisp`
- `src/workflow-service.lisp`
- workflow summary/detail builders
- DTO normalization layer

### Deliverables

- work-item list or queue externalization
- work-item detail externalization
- workflow detail externalization
- closure posture representation

## Electron Touch Points

### Main Process

- workflow query client integration
- entity-open routing for work-items and workflow records
- event-driven projection refresh for workflow, validation, reconciliation, and closure state

### Preload

- `query.workItemList(environmentId?)`
- `query.workItemDetail(workItemId, environmentId?)`
- `query.workflowRecordDetail(workflowRecordId, environmentId?)`

If separate posture queries exist:

- `query.validationPosture(environmentId?)`
- `query.reconciliationPosture(environmentId?)`

### Renderer

- Work workspace shell
- work-item list
- work-item detail
- workflow detail pane
- validation/reconciliation summary region
- closure readiness summary region

## Protocol Operations

### Required Targets

- `work_item.list`
- `work_item.detail`
- `workflow.record_detail`
- `workflow.validation_posture` if separate
- `workflow.reconciliation_posture` if separate
- `workflow.closure_posture` if separate

## DTOs Used

- `WorkItemSummaryDto`
- `WorkItemDetailDto`
- `WorkflowRecordDto`
- `ArtifactSummaryDto`
- `QueryResultDto<WorkItemSummaryDto[]>`
- `QueryResultDto<WorkflowRecordDto>`

## Renderer View Requirements

### Work List

Must render:

- title
- state
- waiting reason if present
- approval, incident, or artifact presence indicators where available
- validation or reconciliation burden indicators where available

### Work Detail

Must render:

- title
- state
- waiting reason
- linked approval, incident, and artifact refs
- workflow-record ref
- runtime and source relationship summaries if available

### Workflow Detail

Must render:

- phase
- validation state
- reconciliation state
- closure readiness

This is the first slice where the app must visibly distinguish closure-related concepts from ordinary execution.

### Closure Readiness

Must render:

- closable or not closable state
- unmet validation obligations
- unmet reconciliation obligations
- blocking approvals or incidents if present

This region must read like governed engineering state, not a generic task completion checklist.

## Acceptance Tests

### Backend Acceptance

- work-item list returns stable summary DTOs
- work-item detail returns stable DTOs
- workflow-record detail returns stable DTOs
- validation and reconciliation states are represented in a normalized way
- closure readiness is represented in a normalized way

### Electron Acceptance

- Work workspace renders real work-item data
- selecting a work-item loads detail
- workflow detail is visible and understandable
- the renderer can show why a work-item is not closable without requiring transcript inspection

### Thesis Acceptance

- the app does not equate execution with closure
- validation and reconciliation remain visible as explicit obligations
- workflow truth is first-class in the product surface
- the workspace does not devolve into a generic backlog, kanban board, or ticket tracker

## Exit Criteria

This slice is complete when:

1. the Work workspace is backed by real host data
2. users can inspect work-item and workflow detail clearly
3. the product visibly distinguishes execution, validation, reconciliation, and closure
