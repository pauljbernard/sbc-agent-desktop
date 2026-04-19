# Core Entity DTOs

## Purpose

This document defines the first normalized DTO set for the core entities the desktop application needs to render the P0 workspaces.

The goal is not to freeze every entity in the system immediately. The goal is to define stable, implementation-ready read models for the highest-value desktop surfaces.

## DTO Design Rules

### Rule 1: Environment Authority Stays In `sbcl-agent`

DTOs are external read models, not the domain authority.

### Rule 2: Stable IDs Everywhere

Every DTO that represents an addressable entity must include a stable `id`.

### Rule 3: Relationship References Must Be Explicit

Important cross-entity relationships should be represented explicitly by id.

### Rule 4: Status Must Be Legible

Statuses should be normalized enough for the desktop app to render them consistently.

## Environment DTOs

### EnvironmentSummaryDto

```ts
interface EnvironmentSummaryDto {
  id: string;
  title?: string | null;
  sourcePosture: TruthPostureDto;
  imagePosture: TruthPostureDto;
  workflowPosture: TruthPostureDto;
  activeThreadId?: string | null;
  activeTurnId?: string | null;
  attentionSummary: AttentionSummaryDto;
}
```

### EnvironmentStatusDto

```ts
interface EnvironmentStatusDto {
  id: string;
  activeContext: ActiveContextDto;
  recentArtifacts: ArtifactSummaryDto[];
  activeTasks: TaskSummaryDto[];
  activeWorkers: WorkerSummaryDto[];
  openIncidents: IncidentSummaryDto[];
  pendingApprovals: ApprovalRequestSummaryDto[];
}
```

## Conversation DTOs

### ThreadSummaryDto

```ts
interface ThreadSummaryDto {
  id: string;
  title: string;
  summary?: string | null;
  state: "idle" | "active" | "waiting" | "blocked" | "incident" | "background";
  latestTurnId?: string | null;
  latestActivityAt?: string | null;
  attentionFlags: string[];
}
```

### ThreadDetailDto

```ts
interface ThreadDetailDto {
  id: string;
  title: string;
  summary?: string | null;
  messages: MessageDto[];
  turns: TurnSummaryDto[];
  artifactIds: string[];
  workItemIds: string[];
  incidentIds: string[];
}
```

### MessageDto

```ts
interface MessageDto {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  finalized: boolean;
  createdAt: string;
}
```

### TurnSummaryDto

```ts
interface TurnSummaryDto {
  id: string;
  threadId: string;
  state:
    | "initialized"
    | "streaming"
    | "running_operations"
    | "awaiting_approval"
    | "awaiting_provider_resume"
    | "finalizing"
    | "completed"
    | "failed"
    | "interrupted"
    | "cancelled";
  operationIds: string[];
  artifactIds: string[];
  incidentIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### TurnDetailDto

```ts
interface TurnDetailDto extends TurnSummaryDto {
  userMessageId?: string | null;
  assistantMessageId?: string | null;
  approvalRequestIds: string[];
  workItemIds: string[];
}
```

## Runtime DTOs

### RuntimeSummaryDto

```ts
interface RuntimeSummaryDto {
  id: string;
  currentPackage?: string | null;
  loadedSystemCount: number;
  loadedSystems: string[];
  divergencePosture?: RuntimeDivergenceDto | null;
}
```

### RuntimeEvalResultDto

```ts
interface RuntimeEvalResultDto {
  operationId?: string | null;
  resultSummary?: string | null;
  status: "ok" | "awaiting_approval" | "failed";
  artifactIds: string[];
  incidentIds: string[];
}
```

## Operation DTOs

### OperationSummaryDto

```ts
interface OperationSummaryDto {
  id: string;
  kind: string;
  state: "queued" | "started" | "completed" | "failed" | "awaiting_approval";
  actor?: string | null;
  turnId?: string | null;
  workItemId?: string | null;
  artifactIds: string[];
  incidentIds: string[];
}
```

## Approval DTOs

### ApprovalRequestSummaryDto

```ts
interface ApprovalRequestSummaryDto {
  id: string;
  state: "pending" | "approved" | "denied" | "superseded";
  requestedAction: string;
  scopeSummary: string;
  turnId?: string | null;
  operationId?: string | null;
  workItemId?: string | null;
  createdAt: string;
}
```

### ApprovalRequestDto

```ts
interface ApprovalRequestDto extends ApprovalRequestSummaryDto {
  policyId?: string | null;
  rationale?: string | null;
  consequenceSummary?: string | null;
  incidentId?: string | null;
}
```

### ApprovalDecisionDto

```ts
interface ApprovalDecisionDto {
  requestId: string;
  decision: "approved" | "denied";
  decidedAt: string;
}
```

## Incident DTOs

### IncidentSummaryDto

```ts
interface IncidentSummaryDto {
  id: string;
  title: string;
  state: "open" | "investigating" | "recovering" | "resolved" | "closed";
  severity?: "low" | "medium" | "high" | "critical" | null;
  turnId?: string | null;
  operationId?: string | null;
  workItemId?: string | null;
}
```

### IncidentDetailDto

```ts
interface IncidentDetailDto extends IncidentSummaryDto {
  summary?: string | null;
  runtimeId?: string | null;
  artifactIds: string[];
  recoverySummary?: string | null;
}
```

## Workflow DTOs

### WorkItemDetailDto

```ts
interface WorkItemDetailDto {
  id: string;
  title: string;
  state: "active" | "waiting" | "blocked" | "quarantined" | "closed";
  workflowRecordId?: string | null;
  waitingReason?: string | null;
  artifactIds: string[];
  incidentIds: string[];
  approvalRequestIds: string[];
}
```

### WorkflowRecordDto

```ts
interface WorkflowRecordDto {
  id: string;
  workItemId: string;
  phase: string;
  validationState?: string | null;
  reconciliationState?: string | null;
  closureReadiness?: string | null;
}
```

## Artifact DTOs

### ArtifactSummaryDto

```ts
interface ArtifactSummaryDto {
  id: string;
  kind: string;
  title: string;
  sourceEntityId?: string | null;
  sourceEntityType?: string | null;
}
```

## Task And Worker DTOs

### TaskSummaryDto

```ts
interface TaskSummaryDto {
  id: string;
  kind: string;
  state: "queued" | "running" | "completed" | "failed" | "cancelled";
  owner?: string | null;
}
```

### WorkerSummaryDto

```ts
interface WorkerSummaryDto {
  id: string;
  state: "idle" | "running" | "stopped" | "failed";
  currentTaskId?: string | null;
}
```

## Shared Supporting DTOs

### TruthPostureDto

```ts
interface TruthPostureDto {
  state: "healthy" | "active" | "waiting" | "divergent" | "risk" | "unknown";
  summary: string;
}
```

### RuntimeDivergenceDto

```ts
interface RuntimeDivergenceDto {
  state: "none" | "present" | "awaiting_reconciliation";
  summary: string;
}
```

### AttentionSummaryDto

```ts
interface AttentionSummaryDto {
  awaitingApprovalCount: number;
  incidentCount: number;
  blockedWorkCount: number;
  interruptedTurnCount: number;
  awaitingColdValidationCount: number;
}
```

### ActiveContextDto

```ts
interface ActiveContextDto {
  activeThreadId?: string | null;
  activeTurnId?: string | null;
  activeTaskIds: string[];
  activeIncidentIds: string[];
}
```

### EntityRefDto

```ts
interface EntityRefDto {
  entityType: string;
  id: string;
}
```

## Acceptance Criteria

The DTO set is acceptable when:

1. the first P0 workspaces can render from these models
2. stable ids and relationship references are always present where needed
3. statuses are normalized enough for consistent rendering
4. the models remain read-oriented rather than leaking implementation internals
5. they preserve the distinction among source, image, and workflow truth where relevant
