# Implementation Slice: Approval Inbox And Detail

## Purpose

This slice defines the first concrete governed-authorization implementation in the desktop app.

It proves that approvals are first-class workflow state rather than renderer prompts or modal confirmations.

## Scope

This slice includes:

- approval request list query
- approval request detail query
- approve command
- deny command
- Approvals workspace shell and detail rendering

This slice does **not** include:

- advanced capability grant management
- deep policy explanation tooling beyond the first detail model
- approval supersession management beyond simple rendering if present

## User-Visible Outcome

A user can open the Approvals workspace, inspect a request with linked context, and approve or deny it through the governed desktop flow.

## `sbcl-agent` Touch Points

### Required Work

- expose approval request list query
- expose approval request detail query
- expose approve command
- expose deny command
- normalize outputs to approval DTOs

### Existing Internal Areas Likely Involved

- `src/approval-service.lisp`
- policy and approval helpers
- command response shaping
- DTO normalization layer

### Deliverables

- approval list externalization
- approval detail externalization
- stable approve/deny command responses

## Electron Touch Points

### Main Process

- approval query/command client integration
- command result routing into updated workspace state

### Preload

- `query.approvalRequestDetail(requestId, environmentId?)`
- `command.approveRequest(input)`
- `command.denyRequest(input)`

If approval list is not yet part of the preload query surface, add:

- `query.approvalRequestList(environmentId?)`

### Renderer

- Approvals workspace shell
- approval inbox list
- approval detail pane
- decision controls

## Protocol Operations

### Required Targets

- `approval.request_list`
- `approval.request_detail`
- `approval.approve`
- `approval.deny`

If internal naming differs, the external target names should still reflect these concepts clearly.

## DTOs Used

- `ApprovalRequestSummaryDto`
- `ApprovalRequestDto`
- `ApprovalDecisionDto`
- `CommandResultDto<ApprovalDecisionDto>`

## Renderer View Requirements

### Approval List

Must render:

- requested action
- scope summary
- current state
- created time

### Approval Detail

Must render:

- requested action
- scope summary
- rationale
- policy id if present
- consequence summary
- linked turn/operation/work-item/incident refs when present

### Decision Flow

Must render visible result after approval or denial, not just dismiss the request silently.

## Acceptance Tests

### Backend Acceptance

- approval request list returns stable summary DTOs
- approval request detail returns stable detail DTOs
- approve and deny commands return stable decision results

### Electron Acceptance

- Approvals workspace renders real request data
- selecting an approval loads detail
- approve and deny actions execute through main/preload path only
- decision results update the visible UI state

### Thesis Acceptance

- approvals are not reduced to generic dialogs
- consequence and linkage are visible before decision
- governance appears as operational product behavior, not admin chrome

## Exit Criteria

This slice is complete when:

1. the Approvals workspace is backed by real host data
2. users can inspect and decide on approval requests through governed desktop flows
3. the product visibly treats approvals as first-class workflow entities
