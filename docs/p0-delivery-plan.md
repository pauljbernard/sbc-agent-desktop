# P0 Delivery Plan

## Purpose

This document maps the P0 desktop feature set to:

- required APIs
- required DTOs
- required event support
- recommended milestone order

Its purpose is to turn the P0 feature specifications into a staged build plan.

## P0 Features In Scope

- Environment Posture Home
- Runtime Workspace
- Direct Evaluation Surface
- Structured Conversation Workspace
- Approval Inbox And Detail
- Incident Workspace
- Work And Reconciliation Workspace
- Global Attention Model
- Event Observation Surface
- Multi-Thread And Multi-Conversation Supervision

## Delivery Principles

- start with environment root and host connectivity
- prove the service boundary early
- prove eventing early
- build governance and recovery as first-class surfaces, not as later polish

## Milestone 1: Environment Foundation

### Features Supported

- Environment Posture Home
- partial Global Attention Model

### Required Queries

- environment summary
- environment status
- host status
- current binding

### Required DTOs

- `EnvironmentSummaryDto`
- `EnvironmentStatusDto`
- `AttentionSummaryDto`
- `BindingDto`

### Required Events

- host status changed
- environment posture changed

### Outcome

The app can boot, bind an environment, and show real posture.

## Milestone 2: Conversation And Runtime Core

### Features Supported

- Structured Conversation Workspace
- Runtime Workspace
- Direct Evaluation Surface
- partial Multi-Thread And Multi-Conversation Supervision

### Required Queries

- thread list
- thread detail
- turn detail
- runtime summary

### Required Commands

- create thread
- start turn
- resume turn
- runtime eval

### Required DTOs

- `ThreadSummaryDto`
- `ThreadDetailDto`
- `TurnDetailDto`
- `RuntimeSummaryDto`
- `RuntimeEvalResultDto`

### Required Events

- turn state changed
- operation created
- operation status changed
- runtime mutation started/completed/failed

### Outcome

The app supports live interaction and runtime work against real host data.

## Milestone 3: Approval And Attention

### Features Supported

- Approval Inbox And Detail
- stronger Global Attention Model

### Required Queries

- approval request detail
- approval request list
- policy summary

### Required Commands

- approve request
- deny request

### Required DTOs

- `ApprovalRequestSummaryDto`
- `ApprovalRequestDto`
- `ApprovalDecisionDto`

### Required Events

- approval requested
- approval granted
- approval denied

### Outcome

Governed authorization becomes visible and actionable.

## Milestone 4: Incident And Recovery

### Features Supported

- Incident Workspace

### Required Queries

- incident list
- incident detail
- recovery posture

### Required Commands

- acknowledge incident
- start recovery workflow

### Required DTOs

- `IncidentSummaryDto`
- `IncidentDetailDto`

### Required Events

- incident created
- incident updated
- recovery state changed

### Outcome

Failure and interruption become first-class recovery work.

## Milestone 5: Work, Validation, And Reconciliation

### Features Supported

- Work And Reconciliation Workspace

### Required Queries

- work-item list
- work-item detail
- workflow record detail
- validation posture
- reconciliation posture
- closure posture

### Required Commands

- advance workflow
- record validation result
- create reconciliation record
- close workflow

### Required DTOs

- `WorkItemSummaryDto`
- `WorkItemDetailDto`
- `WorkflowRecordDto`
- `ArtifactSummaryDto`

### Required Events

- workflow state changed
- validation completed
- reconciliation created
- workflow quarantined
- workflow resumed
- workflow closed

### Outcome

The app can distinguish execution from closure in real product behavior.

## Milestone 6: Event-Native Supervision

### Features Supported

- Event Observation Surface
- full Multi-Thread And Multi-Conversation Supervision
- mature Global Attention Model

### Required Queries

- environment event stream replay query or subscription bootstrap

### Required Event Support

- cursor replay
- cursor persistence for resume
- family filtering
- visibility filtering
- continuous streaming

### Additional Derived State

- thread supervision summaries
- actor supervision summaries
- attention aggregation by category

### Outcome

The app becomes a supervised concurrency environment rather than a set of static entity screens.

## Dependency Order Summary

The recommended dependency order is:

1. host and environment posture
2. conversation and runtime
3. approvals
4. incidents
5. work and reconciliation
6. full event-native supervision

## Risk Notes

### Risk 1: Building renderer screens before host-backed contracts

Mitigation:

- require each milestone to anchor on real queries and DTOs

### Risk 2: Delaying eventing too long

Mitigation:

- bring replay and event flow in by Milestone 2 or 3 for early validation

### Risk 3: Treating approvals and incidents as later polish

Mitigation:

- keep them in the P0 milestone chain rather than in post-foundation backlog

## Acceptance Criteria

The P0 delivery plan is acceptable when:

1. every P0 feature is tied to explicit API and DTO dependencies
2. milestone order reinforces the thesis rather than weakening it
3. eventing is treated as foundational, not optional
4. governance and recovery are delivered before “nice-to-have” expansion work
