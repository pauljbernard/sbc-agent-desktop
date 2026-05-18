import type {
  ApprovalDecisionDto,
  ApprovalDecisionInput,
  ApprovalRequestDto,
  ApproveActorMessageInput,
  ApproveApprovalInput,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  CalculatorAppendTokenInput,
  CalculatorEvaluateInput,
  CalculatorResultDto,
  CalculatorSetAngleUnitInput,
  CalculatorSetBaseInput,
  CalculatorSetExpressionInput,
  CalculatorSetModeInput,
  CalculatorSetWordSizeInput,
  CalculatorSummaryDto,
  BindingDto,
  BindProjectTestingHarnessInput,
  CommandResultDto,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
  ConversationLatencySummaryDto,
  ConversationWorkspaceDto,
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  AppendProjectArchitectureDecisionInput,
  AppendProjectFeatureSpecificationInput,
  AppendProjectQualityGateInput,
  AppendProjectRequirementInput,
  AppendProjectSourceRootInput,
  AppendProjectUserJourneyInput,
  CreateProjectInput,
  CreateIntentInput,
  CreateConversationThreadInput,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  FileSystemDirectoryListingDto,
  FileSystemWriteResultDto,
  UpdateConversationThreadInput,
  DesktopActionInput,
  DesktopActionResultDto,
  DesktopModelDto,
  DesktopPreferencesDto,
  DesktopRestoreInput,
  DesktopRestoreResultDto,
  EnvironmentImageRecordDto,
  EnvironmentImageRegistryDto,
  EnvironmentEventDto,
  EnvironmentBootstrapDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  WorkspaceSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IntentDetailDto,
  IncidentSummaryDto,
  MemoryDeleteInput,
  MemoryDeleteResultDto,
  MemoryEntryDto,
  MemoryListDto,
  MemoryUpdateInput,
  PackageBrowserDto,
  RuntimeSymbolBrowserPageDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  ProjectDetailDto,
  ProjectListDto,
  ProjectTestingHarnessDto,
  ProviderProfileSummaryDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetrySnapshotDto,
  RollbackWorkItemInput,
  RemoveMcpServerInput,
  QuarantineWorkItemInput,
  ResumeWorkItemInput,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  SteerWorkItemInput,
  ThreadDetailDto,
  ThreadSummaryDto,
  TranscriptWorkspaceDto,
  TurnDetailDto,
  UpdateProjectConstitutionInput,
  UpdateProjectDesignSystemInput,
  UpdateProjectStyleGuideInput,
  UpdateProjectTestingStrategyInput,
  UpdateProjectReleaseReadinessInput,
  UpdateProjectReadinessObligationsInput,
  UpdateProviderRoutingInput,
  UpdateIncidentRemediationPlanInput,
  UseProviderProfileInput,
  CompleteWorkItemValidationsInput,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../shared/contracts";

export interface SbclAgentHostAdapter {
  getHostStatus(): Promise<HostStatusDto>;
  getCurrentBinding(): Promise<BindingDto | null>;
  setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>>;
  getEnvironmentImageRegistry(): Promise<QueryResultDto<EnvironmentImageRegistryDto>>;
  loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>>;
  saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>>;
  revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>>;
  createIntent(input: CreateIntentInput): Promise<CommandResultDto<IntentDetailDto>>;
  createProject(input: CreateProjectInput): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectConstitution(
    input: UpdateProjectConstitutionInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectDesignSystem(
    input: UpdateProjectDesignSystemInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectStyleGuide(
    input: UpdateProjectStyleGuideInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectTestingStrategy(
    input: UpdateProjectTestingStrategyInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectReleaseReadiness(
    input: UpdateProjectReleaseReadinessInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateProjectReadinessObligations(
    input: UpdateProjectReadinessObligationsInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectRequirement(
    input: AppendProjectRequirementInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectFeatureSpecification(
    input: AppendProjectFeatureSpecificationInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectUserJourney(
    input: AppendProjectUserJourneyInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectArchitectureDecision(
    input: AppendProjectArchitectureDecisionInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectSourceRoot(
    input: AppendProjectSourceRootInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  bindProjectTestingHarness(
    input: BindProjectTestingHarnessInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  appendProjectQualityGate(
    input: AppendProjectQualityGateInput
  ): Promise<CommandResultDto<ProjectDetailDto>>;
  updateIncidentRemediationPlan(
    input: UpdateIncidentRemediationPlanInput
  ): Promise<CommandResultDto<IncidentDetailDto>>;
  resumeWorkItem(input: ResumeWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>>;
  quarantineWorkItem(input: QuarantineWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>>;
  rollbackWorkItem(input: RollbackWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>>;
  completeWorkItemValidations(
    input: CompleteWorkItemValidationsInput
  ): Promise<CommandResultDto<WorkItemDetailDto>>;
  steerWorkItem(input: SteerWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>>;
  projectList(environmentId?: string): Promise<QueryResultDto<ProjectListDto>>;
  projectTestingHarnessInventory(environmentId?: string): Promise<QueryResultDto<ProjectTestingHarnessDto[]>>;
  projectDetail(projectId: string, environmentId?: string): Promise<QueryResultDto<ProjectDetailDto>>;
  environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>>;
  environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>>;
  workspaceSummary(environmentId?: string): Promise<QueryResultDto<WorkspaceSummaryDto>>;
  desktopModel(environmentId?: string): Promise<QueryResultDto<DesktopModelDto>>;
  environmentBootstrap(environmentId?: string): Promise<QueryResultDto<EnvironmentBootstrapDto>>;
  environmentEvents(input: EventSubscriptionInput): Promise<QueryResultDto<EnvironmentEventDto[]>>;
  transcriptWorkspace(input: {
    environmentId?: string;
    families?: string[];
    visibility?: string[];
    eventLimit?: number;
    includeEvents?: boolean;
    includeEnvironmentConsole?: boolean;
    consoleLimit?: number;
  }): Promise<QueryResultDto<TranscriptWorkspaceDto>>;
  consoleLogStream(input: ConsoleLogQueryInput): Promise<QueryResultDto<ConsoleLogStreamDto>>;
  diagnosticReportList(environmentId?: string): Promise<QueryResultDto<DiagnosticReportSummaryDto[]>>;
  diagnosticReportDetail(
    reportId: string,
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportDetailDto>>;
  artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>>;
  artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>>;
  conversationWorkspace(input: {
    environmentId?: string;
    threadId?: string | null;
    turnId?: string | null;
  }): Promise<QueryResultDto<ConversationWorkspaceDto>>;
  threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>>;
  threadDetail(threadId: string, environmentId?: string): Promise<QueryResultDto<ThreadDetailDto>>;
  turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>>;
  conversationLatency(
    turnId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ConversationLatencySummaryDto>>;
  memoryList(environmentId?: string): Promise<QueryResultDto<MemoryListDto>>;
  memoryDetail(memoryId: string, environmentId?: string): Promise<QueryResultDto<MemoryEntryDto>>;
  createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>>;
  updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>>;
  updateMemory(input: MemoryUpdateInput): Promise<CommandResultDto<MemoryEntryDto>>;
  deleteMemory(input: MemoryDeleteInput): Promise<CommandResultDto<MemoryDeleteResultDto>>;
  sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>>;
  approveActorMessage(
    input: ApproveActorMessageInput
  ): Promise<CommandResultDto<SendConversationMessageResultDto>>;
  approveApproval(
    input: ApproveApprovalInput
  ): Promise<CommandResultDto<SendConversationMessageResultDto>>;
  extractConversationAttachmentText(input: {
    name: string;
    mediaType: string;
    dataUrl: string;
  }): Promise<string | null>;
  runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>>;
  calculatorSummary(environmentId?: string): Promise<QueryResultDto<CalculatorSummaryDto>>;
  setCalculatorExpression(input: CalculatorSetExpressionInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  appendCalculatorToken(input: CalculatorAppendTokenInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  backspaceCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>>;
  clearCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorMode(input: CalculatorSetModeInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorBase(input: CalculatorSetBaseInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorWordSize(input: CalculatorSetWordSizeInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorAngleUnit(input: CalculatorSetAngleUnitInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  runtimeTelemetrySnapshot(environmentId?: string): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>>;
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
  runtimeSymbolPage(input: {
    environmentId: string;
    packageScope?: string | null;
    kinds?: Array<"function" | "variable" | "macro" | "class" | "generic-function" | "unknown">;
    visibility?: "external" | "internal" | "all";
    search?: string;
    offset?: number;
    limit?: number;
  }): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto>>;
  fileSystemDirectory(input?: {
    path?: string;
  }): Promise<QueryResultDto<FileSystemDirectoryListingDto>>;
  sourcePreview(input: {
    environmentId: string;
    path: string;
    line?: number;
    contextRadius?: number;
  }): Promise<QueryResultDto<SourcePreviewDto>>;
  writeSourceFile(input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<FileSystemWriteResultDto>>;
  evaluateInContext(input: {
    environmentId: string;
    form: string;
    packageName?: string;
    recoveryLaunch?: {
      source: "incident-restart";
      incidentId: string;
      restartLabel: string;
    } | null;
  }): Promise<CommandResultDto<RuntimeEvalResultDto>>;
  evaluateCalculator(
    input: CalculatorEvaluateInput
  ): Promise<CommandResultDto<CalculatorResultDto>>;
  stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>>;
  reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>>;
  desktopAction(
    input: DesktopActionInput
  ): Promise<CommandResultDto<DesktopActionResultDto>>;
  desktopRestore(
    input: DesktopRestoreInput
  ): Promise<CommandResultDto<DesktopRestoreResultDto>>;
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
  workItemPlan(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemPlanDto>>;
  workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>>;
  orchestrationList(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>>;
  orchestrationInbox(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>>;
  orchestrationFocus(input?: {
    environmentId?: string;
    planId?: string;
    workflowRecordId?: string;
    workItemId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>>;
  orchestrationSnapshot(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>>;
  planVerification(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>>;
  providerProfiles(environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>>;
  packageManagementSummary(environmentId?: string): Promise<QueryResultDto<PackageManagementSummaryDto>>;
  desktopTaskManifests(environmentId?: string): Promise<QueryResultDto<DesktopTaskManifestDto[]>>;
  desktopTaskRecords(environmentId?: string): Promise<QueryResultDto<DesktopTaskRecordDto[]>>;
  desktopTaskPendingApproval(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>>>;
  desktopTaskActorFlow(input?: {
    environmentId?: string;
    sessionId?: string;
    approvalId?: string;
    pendingActionId?: string;
    actorMessageId?: string;
    scopeId?: string;
    latestOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>>>;
  desktopTaskActorSystemPanel(input?: {
    environmentId?: string;
    sessionId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>>;
  desktopTaskActorTrace(input?: {
    environmentId?: string;
    actorRole?: string;
    actorMessageId?: string;
    phase?: string;
    latestOnlyP?: boolean;
    deadLettersOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>[]>>;
  desktopTaskDeadLetterQueue(input?: {
    environmentId?: string;
    actorRole?: string;
  }): Promise<QueryResultDto<Record<string, unknown>[]>>;
  mcpServerConfigs(environmentId?: string): Promise<QueryResultDto<McpServerConfigDto[]>>;
  mcpServerConfig(serverId: string, environmentId?: string): Promise<QueryResultDto<McpServerConfigDto>>;
  focusWorkspace(workspace: WorkspaceId): Promise<void>;
  getDesktopPreferences(): Promise<DesktopPreferencesDto>;
  setDesktopPreferences(patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto>;
  configureProviderProfile(
    input: ConfigureProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>>;
  useProviderProfile(input: UseProviderProfileInput): Promise<CommandResultDto<ProviderProfileSummaryDto>>;
  updateProviderRouting(
    input: UpdateProviderRoutingInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>>;
  configureMcpServer(input: ConfigureMcpServerInput): Promise<CommandResultDto<McpServerConfigDto>>;
  removeMcpServer(
    input: RemoveMcpServerInput
  ): Promise<CommandResultDto<{ id: string; removedP: boolean }>>;
  installQuicklispPackage(input: {
    environmentId: string;
    systemName: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  runQlotCommand(input: {
    environmentId: string;
    args: string[];
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  addSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  updateSourceRegistryEntry(input: {
    environmentId: string;
    oldPath: string;
    newPath: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  removeSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  addLocalProject(input: {
    environmentId: string;
    path: string;
    name?: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  removeLocalProject(input: {
    environmentId: string;
    name: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>>;
  quitApp(): Promise<void>;
  openEntityInNewWindow(ref?: unknown): Promise<void>;
}
