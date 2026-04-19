# Preload Bridge TypeScript Interface

## Purpose

This document defines the first TypeScript interface surface for the Electron preload bridge.

It turns the preload-bridge architecture into concrete application-facing contracts that renderer code can consume safely.

This is a typed interface spec, not an implementation file.

## Design Goals

The preload API surface must:

- be narrow
- be typed
- be product-oriented rather than Electron-oriented
- support the first P0 workspaces
- avoid leaking raw transport or IPC details into the renderer

## Top-Level Shape

The preload bridge should expose one object on `window`:

```ts
interface Window {
  sbclAgentDesktop: SbclAgentDesktopApi;
}
```

## Root API

```ts
interface SbclAgentDesktopApi {
  host: HostApi;
  query: QueryApi;
  command: CommandApi;
  events: EventApi;
  desktop: DesktopApi;
}
```

## Host API

```ts
interface HostApi {
  getHostStatus(): Promise<HostStatusDto>;
  getCurrentBinding(): Promise<BindingDto | null>;
  setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>>;
}
```

Purpose:

- desktop connection health
- current environment binding
- explicit binding changes

## Query API

```ts
interface QueryApi {
  environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>>;
  environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>>;
  threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>>;
  threadDetail(threadId: string, environmentId?: string): Promise<QueryResultDto<ThreadDetailDto>>;
  turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>>;
  runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>>;
  workItemDetail(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemDetailDto>>;
  workflowRecordDetail(workflowRecordId: string, environmentId?: string): Promise<QueryResultDto<WorkflowRecordDto>>;
  incidentDetail(incidentId: string, environmentId?: string): Promise<QueryResultDto<IncidentDetailDto>>;
  approvalRequestDetail(requestId: string, environmentId?: string): Promise<QueryResultDto<ApprovalRequestDto>>;
}
```

Purpose:

- support read models for the first P0 workspaces

## Command API

```ts
interface CommandApi {
  createThread(input: CreateThreadInput): Promise<CommandResultDto<ThreadSummaryDto>>;
  startTurn(input: StartTurnInput): Promise<CommandResultDto<TurnDetailDto>>;
  resumeTurn(input: ResumeTurnInput): Promise<CommandResultDto<TurnDetailDto>>;
  cancelTurn(input: CancelTurnInput): Promise<CommandResultDto<TurnDetailDto>>;
  evaluateInContext(input: EvaluateInContextInput): Promise<CommandResultDto<RuntimeEvalResultDto>>;
  approveRequest(input: ApproveRequestInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
  denyRequest(input: DenyRequestInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
}
```

Purpose:

- first governed commands needed by the desktop product

## Event API

```ts
interface EventApi {
  subscribeEnvironmentEvents(
    input: EventSubscriptionInput,
    handler: (event: EnvironmentEventDto) => void
  ): Promise<EventSubscriptionHandle>;

  unsubscribe(subscriptionId: string): Promise<void>;
}
```

Recommended handle shape:

```ts
interface EventSubscriptionHandle {
  subscriptionId: string;
}
```

Purpose:

- typed event subscriptions without exposing raw IPC or transport semantics

## Desktop API

```ts
interface DesktopApi {
  openEntityInNewWindow(ref: EntityRefDto): Promise<void>;
  focusWorkspace(workspace: WorkspaceId): Promise<void>;
  getDesktopPreferences(): Promise<DesktopPreferencesDto>;
  setDesktopPreferences(patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto>;
}
```

Purpose:

- bounded desktop shell capabilities required by the product

## Shared Envelope DTOs

### Query Result

```ts
interface QueryResultDto<T> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "query";
  status: "ok" | "error";
  data: T;
  metadata: ServiceMetadataDto;
}
```

### Command Result

```ts
interface CommandResultDto<T> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "command";
  status: "ok" | "awaiting_approval" | "rejected" | "error";
  data: T;
  metadata: ServiceMetadataDto;
}
```

### Service Metadata

```ts
interface ServiceMetadataDto {
  authority: "environment";
  binding: BindingDto;
  readModel?: string;
  commandModel?: string;
  policyId?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  workItemId?: string | null;
  workflowRecordId?: string | null;
  incidentId?: string | null;
  runtimeId?: string | null;
  eventFamily?: string | null;
  visibility?: string | null;
}
```

### Binding

```ts
interface BindingDto {
  sessionId?: string | null;
  environmentId: string;
}
```

## Event DTO

```ts
interface EnvironmentEventDto {
  cursor: number;
  kind: string;
  timestamp: string;
  family: string;
  entityId?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  visibility?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  runId?: string | null;
  operationId?: string | null;
  workItemId?: string | null;
  incidentId?: string | null;
  artifactId?: string | null;
  taskId?: string | null;
  workerId?: string | null;
}
```

## Input DTOs

```ts
interface CreateThreadInput {
  environmentId: string;
  title: string;
  summary?: string;
}

interface StartTurnInput {
  environmentId: string;
  threadId: string;
  input: string;
  stream?: boolean;
}

interface ResumeTurnInput {
  environmentId: string;
  turnId: string;
}

interface CancelTurnInput {
  environmentId: string;
  turnId: string;
}

interface EvaluateInContextInput {
  environmentId: string;
  form: string;
  package?: string;
  mutating?: boolean;
}

interface ApproveRequestInput {
  environmentId: string;
  requestId: string;
}

interface DenyRequestInput {
  environmentId: string;
  requestId: string;
}

interface EventSubscriptionInput {
  environmentId: string;
  afterCursor?: number;
  family?: string;
  visibility?: string;
}
```

## Renderer Rules

Renderer code should depend on this interface, not on:

- raw `ipcRenderer`
- ad hoc global methods
- direct transport clients

## Acceptance Criteria

This interface spec is acceptable when:

1. the renderer can build the P0 workspaces against it
2. no raw Electron or transport details leak through it
3. queries, commands, and subscriptions are cleanly separated
4. all interfaces are typed and composable
5. the preload surface remains narrow enough to preserve security boundaries
