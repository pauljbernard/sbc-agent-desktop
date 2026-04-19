export type HostState = "starting" | "ready" | "degraded" | "unavailable";

export type WorkspaceId =
  | "environment"
  | "conversations"
  | "browser"
  | "runtime"
  | "work"
  | "incidents"
  | "artifacts"
  | "activity"
  | "approvals"
  | "documentation"
  | "configuration";

export interface BindingDto {
  sessionId?: string | null;
  environmentId: string;
}

export interface HostStatusDto {
  hostState: HostState;
  supportedProtocolVersion: number;
  supportedContractVersion: number;
  hostLabel: string;
  transport: "mock" | "socket" | "pipe";
}

export interface ServiceMetadataDto {
  authority: "environment";
  binding: BindingDto | null;
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

export interface QueryResultDto<T> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "query";
  status: "ok" | "error";
  data: T;
  metadata: ServiceMetadataDto;
}

export interface CommandResultDto<T> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "command";
  status: "ok" | "awaiting_approval" | "rejected" | "error";
  data: T;
  metadata: ServiceMetadataDto;
}

export interface TruthPostureDto {
  domain: "source" | "image" | "workflow";
  label: string;
  posture: string;
  summary: string;
  state: "steady" | "active" | "warning" | "risk";
  counts?: {
    active?: number;
    blocked?: number;
    pending?: number;
  };
}

export interface AttentionSummaryDto {
  approvalsAwaiting: number;
  openIncidents: number;
  blockedWork: number;
  interruptedTurns: number;
  activeStreams: number;
}

export interface ActiveContextDto {
  environmentLabel: string;
  runtimeLabel: string;
  focusSummary: string;
  environmentRoot?: string;
  runtimePackage?: string;
  currentThreadTitle?: string;
  currentTurnSummary?: string;
}

export interface ArtifactSummaryDto {
  artifactId: string;
  title: string;
  kind: string;
  summary: string;
  updatedAt: string;
}

export interface ArtifactDetailDto {
  artifactId: string;
  title: string;
  kind: string;
  summary: string;
  updatedAt: string;
  provenance: string;
  authority: "source" | "runtime" | "workflow" | "incident";
  state: "draft" | "active" | "superseded" | "evidence";
  linkedEntities: LinkedEntityRefDto[];
  observations: string[];
}

export interface TaskSummaryDto {
  taskId: string;
  title: string;
  state: "active" | "waiting" | "blocked" | "complete";
  summary: string;
}

export interface WorkerSummaryDto {
  workerId: string;
  label: string;
  state: "active" | "waiting" | "idle";
  responsibility: string;
}

export interface IncidentSummaryDto {
  incidentId: string;
  title: string;
  severity: "low" | "moderate" | "high" | "critical";
  state: "open" | "recovering" | "resolved";
}

export interface IncidentDetailDto {
  incidentId: string;
  title: string;
  summary: string;
  severity: IncidentSummaryDto["severity"];
  state: IncidentSummaryDto["state"];
  runtimeId?: string | null;
  recoveryState: "awaiting_acknowledgement" | "active_recovery" | "closure_pending" | "resolved";
  recoverySummary: string;
  nextAction: string;
  blockedReason?: string | null;
  artifactIds: string[];
  linkedEntities: LinkedEntityRefDto[];
  updatedAt: string;
}

export interface ApprovalRequestSummaryDto {
  requestId: string;
  title: string;
  summary: string;
  state: "awaiting" | "approved" | "denied";
}

export interface ApprovalRequestDto {
  requestId: string;
  title: string;
  summary: string;
  state: ApprovalRequestSummaryDto["state"];
  requestedAction: string;
  scopeSummary: string;
  rationale: string;
  policyId?: string | null;
  consequenceSummary: string;
  createdAt: string;
  linkedEntities: LinkedEntityRefDto[];
}

export interface ApprovalDecisionDto {
  requestId: string;
  decision: "approved" | "denied";
  summary: string;
  resumedEntityIds: string[];
}

export interface ApprovalDecisionInput {
  environmentId: string;
  requestId: string;
}

export interface MessageDto {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ThreadSummaryDto {
  threadId: string;
  title: string;
  summary: string;
  state: "active" | "waiting" | "blocked" | "background";
  latestActivityAt: string;
  latestTurnState: TurnState;
  attentionFlags: string[];
}

export interface TurnSummaryDto {
  turnId: string;
  title: string;
  state: TurnState;
  createdAt: string;
}

export type TurnState =
  | "running"
  | "awaiting_approval"
  | "interrupted"
  | "failed"
  | "completed"
  | "background";

export interface LinkedEntityRefDto {
  entityType: "artifact" | "approval" | "incident" | "work-item" | "operation";
  entityId: string;
  label: string;
}

export interface RuntimeScopeSummaryDto {
  scopeId: string;
  packageName: string;
  symbolName?: string;
  kind: "package" | "symbol" | "definition";
  summary: string;
}

export interface RuntimeSystemEntryDto {
  name: string;
  type: "asdf-system" | "unknown";
  status: "loaded";
}

export interface RuntimeSummaryDto {
  runtimeId: string;
  runtimeLabel: string;
  currentPackage: string;
  loadedSystemCount: number;
  loadedSystems: string[];
  loadedSystemEntries: RuntimeSystemEntryDto[];
  divergencePosture: string;
  sourceRelationship: string;
  activeMutations: number;
  linkedIncidentIds: string[];
  scopes: RuntimeScopeSummaryDto[];
}

export interface RuntimeEvalResultDto {
  evaluationId: string;
  outcome: "ok" | "awaiting_approval" | "failed";
  summary: string;
  valuePreview?: string | null;
  operationId?: string | null;
  artifactIds: string[];
  approvalId?: string | null;
  incidentId?: string | null;
}

export type RuntimeInspectionMode =
  | "describe"
  | "definitions"
  | "callers"
  | "methods"
  | "divergence";

export interface RuntimeInspectorInput {
  environmentId: string;
  symbol: string;
  packageName?: string;
  mode: RuntimeInspectionMode;
}

export interface RuntimeInspectorItemDto {
  label: string;
  detail: string;
  emphasis?: string | null;
  path?: string | null;
  line?: number | null;
}

export interface RuntimeInspectionResultDto {
  inspectionId: string;
  mode: RuntimeInspectionMode;
  symbol: string;
  packageName: string;
  summary: string;
  runtimePresence?: string | null;
  divergence?: string | null;
  items: RuntimeInspectorItemDto[];
}

export interface RuntimeEntityFacetDto {
  label: string;
  value: string;
}

export interface RuntimeEntityRelatedItemDto {
  label: string;
  detail: string;
  emphasis?: string | null;
  path?: string | null;
  line?: number | null;
}

export interface RuntimeEntityDetailDto {
  entityId: string;
  symbol: string;
  packageName: string;
  entityKind:
    | "generic-function"
    | "class"
    | "macro"
    | "function"
    | "variable"
    | "unknown";
  signature?: string | null;
  summary: string;
  facets: RuntimeEntityFacetDto[];
  relatedItems: RuntimeEntityRelatedItemDto[];
}

export interface PackageBrowserSymbolDto {
  symbol: string;
  kind: "function" | "variable" | "macro" | "class" | "generic-function" | "unknown";
  visibility: "external" | "internal";
}

export interface PackageBrowserDto {
  packageName: string;
  nicknames: string[];
  useList: string[];
  externalSymbols: PackageBrowserSymbolDto[];
  internalSymbols: PackageBrowserSymbolDto[];
  summary: string;
}

export interface SourcePreviewInput {
  environmentId: string;
  path: string;
  line?: number;
  contextRadius?: number;
}

export interface SourcePreviewDto {
  path: string;
  language: string;
  focusLine?: number | null;
  startLine: number;
  endLine: number;
  summary: string;
  content: string;
  editableContent: string;
}

export interface SourceMutationInput {
  environmentId: string;
  path: string;
  content: string;
}

export interface SourceMutationResultDto {
  path: string;
  summary: string;
  bytesWritten?: number | null;
  artifactIds: string[];
  approvalId?: string | null;
  workItemId?: string | null;
}

export interface SourceReloadInput {
  environmentId: string;
  path: string;
}

export interface SourceReloadResultDto {
  path: string;
  summary: string;
  artifactIds: string[];
  approvalId?: string | null;
  incidentId?: string | null;
  workItemId?: string | null;
}

export interface WorkItemSummaryDto {
  workItemId: string;
  title: string;
  state: "active" | "waiting" | "blocked" | "quarantined" | "closable";
  waitingReason?: string | null;
  approvalCount: number;
  incidentCount: number;
  artifactCount: number;
  validationBurden: "none" | "pending" | "complete";
  reconciliationBurden: "none" | "required" | "complete";
}

export interface WorkItemDetailDto {
  workItemId: string;
  title: string;
  state: WorkItemSummaryDto["state"];
  waitingReason?: string | null;
  workflowRecordId: string;
  runtimeSummary: string;
  sourceRelationship: string;
  linkedEntities: LinkedEntityRefDto[];
}

export interface WorkflowRecordDto {
  workflowRecordId: string;
  phase: "execution" | "validation" | "reconciliation" | "closure";
  validationState: "pending" | "complete";
  reconciliationState: "required" | "complete";
  closureReadiness: "not_closable" | "closable";
  closureSummary: string;
  blockingItems: string[];
}

export interface EvaluateInContextInput {
  environmentId: string;
  form: string;
  packageName?: string;
}

export interface ThreadDetailDto {
  threadId: string;
  title: string;
  summary: string;
  state: ThreadSummaryDto["state"];
  messages: MessageDto[];
  turns: TurnSummaryDto[];
  linkedEntities: LinkedEntityRefDto[];
}

export interface TurnDetailDto {
  turnId: string;
  threadId: string;
  title: string;
  state: TurnState;
  summary: string;
  createdAt: string;
  operationIds: string[];
  artifactIds: string[];
  incidentIds: string[];
  approvalIds: string[];
  workItemIds: string[];
}

export interface EnvironmentSummaryDto {
  environmentId: string;
  environmentLabel: string;
  sourcePosture: TruthPostureDto;
  imagePosture: TruthPostureDto;
  workflowPosture: TruthPostureDto;
  attention: AttentionSummaryDto;
  activeContext: ActiveContextDto;
  recentArtifacts: ArtifactSummaryDto[];
  activeTasks: TaskSummaryDto[];
  activeWorkers: WorkerSummaryDto[];
  incidents: IncidentSummaryDto[];
  approvals: ApprovalRequestSummaryDto[];
}

export interface EnvironmentStatusDto {
  environmentId: string;
  environmentLabel: string;
  connectionState: "bound" | "unbound";
  hostState: HostState;
  runtimeState: "warm" | "cooling" | "recovering";
  workflowState: "governed" | "attention_required";
  lastUpdatedAt: string;
}

export interface DesktopPreferencesDto {
  lastWorkspace: WorkspaceId;
  inspectorPinned: boolean;
  themePreference: "system" | "light" | "dark";
  lispCodeView: {
    parenDepthColors: string[];
  };
}

export interface DocumentationPageSummaryDto {
  slug: string;
  title: string;
  category: string;
  summary: string;
}

export interface DocumentationPageDto extends DocumentationPageSummaryDto {
  sourcePath: string;
  markdown: string;
}

export interface EntityRefDto {
  entityType: string;
  entityId: string;
}

export interface EventSubscriptionInput {
  environmentId?: string;
  fromCursor?: number;
  families?: string[];
  visibility?: string[];
}

export interface EnvironmentEventDto {
  cursor: number;
  kind: string;
  timestamp: string;
  family: string;
  summary: string;
  entityId?: string | null;
  visibility?: string | null;
  payload: Record<string, unknown>;
}

export interface EventSubscriptionHandle {
  subscriptionId: string;
}

export interface HostApi {
  getHostStatus(): Promise<HostStatusDto>;
  getCurrentBinding(): Promise<BindingDto | null>;
  setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>>;
}

export interface QueryApi {
  environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>>;
  environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>>;
  environmentEvents(input: EventSubscriptionInput): Promise<QueryResultDto<EnvironmentEventDto[]>>;
  artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>>;
  artifactDetail(artifactId: string, environmentId?: string): Promise<QueryResultDto<ArtifactDetailDto>>;
  threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>>;
  threadDetail(threadId: string, environmentId?: string): Promise<QueryResultDto<ThreadDetailDto>>;
  turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>>;
  runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>>;
  runtimeInspectSymbol(
    input: RuntimeInspectorInput
  ): Promise<QueryResultDto<RuntimeInspectionResultDto>>;
  runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>>;
  packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>>;
  sourcePreview(input: SourcePreviewInput): Promise<QueryResultDto<SourcePreviewDto>>;
  approvalRequestList(environmentId?: string): Promise<QueryResultDto<ApprovalRequestSummaryDto[]>>;
  approvalRequestDetail(
    requestId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestDto>>;
  incidentList(environmentId?: string): Promise<QueryResultDto<IncidentSummaryDto[]>>;
  incidentDetail(incidentId: string, environmentId?: string): Promise<QueryResultDto<IncidentDetailDto>>;
  workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>>;
  workItemDetail(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemDetailDto>>;
  workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>>;
}

export interface CommandApi {
  evaluateInContext(
    input: EvaluateInContextInput
  ): Promise<CommandResultDto<RuntimeEvalResultDto>>;
  stageSourceChange(
    input: SourceMutationInput
  ): Promise<CommandResultDto<SourceMutationResultDto>>;
  reloadSourceFile(
    input: SourceReloadInput
  ): Promise<CommandResultDto<SourceReloadResultDto>>;
  approveRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
  denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
}

export interface EventApi {
  subscribeEnvironmentEvents(
    input: EventSubscriptionInput,
    handler: (event: EnvironmentEventDto) => void
  ): Promise<EventSubscriptionHandle>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

export interface DesktopApi {
  focusWorkspace(workspace: WorkspaceId): Promise<void>;
  getDesktopPreferences(): Promise<DesktopPreferencesDto>;
  setDesktopPreferences(patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto>;
  openEntityInNewWindow(ref: EntityRefDto): Promise<void>;
  listDocumentationPages(): Promise<DocumentationPageSummaryDto[]>;
  readDocumentationPage(slug: string): Promise<DocumentationPageDto>;
  openExternalLink(url: string): Promise<void>;
}

export interface SbclAgentDesktopApi {
  host: HostApi;
  query: QueryApi;
  command: CommandApi;
  events: EventApi;
  desktop: DesktopApi;
}
