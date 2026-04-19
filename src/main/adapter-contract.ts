import type {
  ApprovalDecisionDto,
  ApprovalDecisionInput,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  CommandResultDto,
  DesktopPreferencesDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../shared/contracts";

export interface SbclAgentHostAdapter {
  getHostStatus(): Promise<HostStatusDto>;
  getCurrentBinding(): Promise<BindingDto | null>;
  setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>>;
  environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>>;
  environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>>;
  environmentEvents(input: EventSubscriptionInput): Promise<QueryResultDto<EnvironmentEventDto[]>>;
  artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>>;
  artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>>;
  threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>>;
  threadDetail(threadId: string, environmentId?: string): Promise<QueryResultDto<ThreadDetailDto>>;
  turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>>;
  runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>>;
  runtimeInspectSymbol(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }): Promise<QueryResultDto<RuntimeInspectionResultDto>>;
  runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>>;
  packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>>;
  sourcePreview(input: {
    environmentId: string;
    path: string;
    line?: number;
    contextRadius?: number;
  }): Promise<QueryResultDto<SourcePreviewDto>>;
  evaluateInContext(input: {
    environmentId: string;
    form: string;
    packageName?: string;
  }): Promise<CommandResultDto<RuntimeEvalResultDto>>;
  stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>>;
  reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>>;
  approvalRequestList(environmentId?: string): Promise<QueryResultDto<ApprovalRequestSummaryDto[]>>;
  approvalRequestDetail(
    requestId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestDto>>;
  approveRequest(
    input: ApprovalDecisionInput
  ): Promise<CommandResultDto<ApprovalDecisionDto>>;
  denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
  incidentList(environmentId?: string): Promise<QueryResultDto<IncidentSummaryDto[]>>;
  incidentDetail(
    incidentId: string,
    environmentId?: string
  ): Promise<QueryResultDto<IncidentDetailDto>>;
  workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>>;
  workItemDetail(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemDetailDto>>;
  workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>>;
  focusWorkspace(workspace: WorkspaceId): Promise<void>;
  getDesktopPreferences(): Promise<DesktopPreferencesDto>;
  setDesktopPreferences(patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto>;
  openEntityInNewWindow(ref?: unknown): Promise<void>;
}
