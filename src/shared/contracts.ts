export type HostState = "starting" | "ready" | "degraded" | "unavailable";

export type WorkspaceId =
  | "dashboard"
  | "environment"
  | "projects"
  | "conversations"
  | "editor"
  | "workspace"
  | "transcript"
  | "memory"
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

export interface ProjectProfileDto {
  projectId: string;
  title: string;
  environmentId: string;
  summary?: string;
}

export interface EnvironmentImageRecordDto {
  imageId: string;
  name: string;
  path: string;
  createdAt?: number | null;
  updatedAt?: number | null;
  lastOpenedAt?: number | null;
  basisImageId?: string | null;
  summary?: string | null;
}

export interface EnvironmentImageRegistryDto {
  registryPath: string;
  imagesRoot: string;
  currentImageId?: string | null;
  currentImageName?: string | null;
  images: EnvironmentImageRecordDto[];
  checkpointPolicy?: Record<string, unknown> | null;
  runtimeManifest?: Record<string, unknown> | null;
  recoveryManifest?: Record<string, unknown> | null;
}

export interface ProjectRequirementDto {
  requirementId: string;
  title: string;
  summary: string;
  scope: string;
  kind: string;
  priority: string;
  status: string;
  verificationKind?: string | null;
  linkedArtifactIds: string[];
}

export interface ProjectFeatureSpecificationDto {
  featureSpecId: string;
  title: string;
  summary: string;
  status: string;
  acceptanceCriteria: string[];
  linkedRequirementIds: string[];
  linkedJourneyIds: string[];
}

export interface ProjectUserJourneyDto {
  journeyId: string;
  title: string;
  summary: string;
  actors: string[];
  entrypoints: string[];
  steps: string[];
  outcomes: string[];
  edgeCases: string[];
}

export interface ProjectArchitectureDecisionDto {
  architectureDecisionId: string;
  title: string;
  status: string;
  summary: string;
  drivers: string[];
  consequences: string[];
  stackChoices: string[];
  linkedRequirementIds: string[];
}

export interface ProjectLinkedWorkItemDto {
  workItemId: string;
  title: string;
  status: string;
  workflowRecordId?: string | null;
  pendingValidations: string[];
  sourceMutationCount: number;
}

export interface ProjectLinkedIncidentDto {
  incidentId: string;
  title: string;
  summary: string;
  status: string;
  kind: string;
  workItemId?: string | null;
  workflowRecordId?: string | null;
}

export interface ProjectTestingHarnessDto {
  harnessId: string;
  label: string;
  entrypoint: string;
  kind: string;
  categories: string[];
}

export interface ProjectTestingStrategySuiteExpectationDto {
  harnessId: string;
  purpose?: string | null;
  evidenceKinds: string[];
}

export interface ProjectTestingStrategyThresholdPolicyDto {
  maxFailedTests?: number | null;
  maxSayTurnLatencySeconds?: number | null;
  maxEnvironmentSaveLoadSeconds?: number | null;
  requireCoverage: boolean;
  requireRecoveryReady: boolean;
}

export interface ProjectTestingStrategyDto {
  requiredEvidence: string[];
  suiteExpectations: ProjectTestingStrategySuiteExpectationDto[];
  thresholdPolicy: ProjectTestingStrategyThresholdPolicyDto | null;
}

export interface ProjectReadinessObligationDto {
  obligationId: string;
  title: string;
  summary: string;
  status: string;
  owner?: string | null;
  dueWindow?: string | null;
  blocking: boolean;
  evidenceKinds: string[];
}

export interface ProjectTestingEvidenceStatusDto {
  requiredEvidence: string[];
  availableEvidence: string[];
  missingEvidence: string[];
  status: string;
}

export interface ProjectTestingEvidenceSuiteStatusDto {
  harnessId: string;
  purpose?: string | null;
  linked: boolean;
  evidenceKinds: string[];
  satisfiedEvidenceKinds: string[];
  missingEvidenceKinds: string[];
  status: string;
}

export interface ProjectTestingEvidenceDto {
  latestReport?: {
    generatedAt?: string | null;
    suiteId?: string | null;
    summary?: Record<string, unknown> | null;
  } | null;
  coverage: {
    indexPath?: string | null;
    present: boolean;
  };
  performance?: Record<string, unknown> | null;
  suiteStatuses: ProjectTestingEvidenceSuiteStatusDto[];
  evidenceStatus: ProjectTestingEvidenceStatusDto | null;
}

export interface ProjectQualityGateDto {
  gateId: string;
  title: string;
  summary: string;
  status: string;
  requiredHarnessIds: string[];
  minimumLinkedWorkItems: number;
  minimumLinkedIncidents: number;
  requireSourceRoots: boolean;
  requiredTraceTargetKinds: string[];
  maximumFailedTests?: number | null;
  requireCoverage: boolean;
  maximumSayTurnLatencySeconds?: number | null;
  maximumEnvironmentSaveLoadSeconds?: number | null;
  requireRecoveryReady: boolean;
}

export interface ProjectQualityGateSummaryDto {
  gateCount: number;
  blockedCount: number;
  readyCount: number;
  readiness: string;
}

export interface ProjectQualityGateEvidenceDto {
  qualityGates: ProjectQualityGateDto[];
  qualityGateSummary: ProjectQualityGateSummaryDto | null;
}

export interface ProjectReadinessSummaryDto {
  status: string;
  testingReadiness: string;
  qualityGateReadiness: string;
  recoveryReadiness: string;
  releaseReadinessStatus: string;
  releaseReviewState: string;
  releaseSignoffState: string;
  releaseSignoffReady: boolean;
  releaseSignoffSummary?: string | null;
  releaseRequiredApprovers: string[];
  releaseApprovedApprovers: string[];
  releasePendingApprovers: string[];
  releaseUnassignedApprovers: string[];
  releaseSignoffOwnershipReady: boolean;
  releaseCurrentPhase?: string | null;
  releaseTargetPhase?: string | null;
  releaseTransitionReady: boolean;
  releaseTransitionSummary?: string | null;
  suiteBlockedCount: number;
  suiteReadyCount: number;
  releaseStage?: string | null;
  releaseSignoffStatus?: string | null;
  readinessObligationCount: number;
  blockedReadinessObligationCount: number;
  readyReadinessObligationCount: number;
  releaseNextActions: string[];
  unmetObligations: string[];
}

export interface ProjectReleaseReadinessDto {
  stage?: string | null;
  signoffStatus?: string | null;
  targetWindow?: string | null;
  requiredApprovers: string[];
  observationPlan: string[];
  openRisks: string[];
}

export interface ProjectTraceLinkDto {
  traceLinkId: string;
  relation: string;
  sourceKind: string;
  sourceId: string;
  targetKind: string;
  targetId: string;
  status?: string | null;
}

export interface ProjectTraceNeighborhoodDto {
  entityKind: string;
  entityId: string;
  count: number;
  outbound: ProjectTraceLinkDto[];
  inbound: ProjectTraceLinkDto[];
}

export interface AlignmentStateDto {
  intentId?: string | null;
  score: number;
  divergenceTypes: string[];
  confidence: number;
  status: string;
  lastEvaluated?: string | number | null;
  gapCount: number;
  linkageState?: Record<string, unknown> | null;
  validationState?: Record<string, unknown> | null;
  summary?: Record<string, unknown> | null;
}

export interface ReconciliationDecisionActionDto {
  kind: string;
  target: string;
  reason: string;
}

export interface ReconciliationDecisionTriggerEventDto {
  eventId: string;
  kind: string;
  family?: string | null;
  entityId?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  timestamp?: string | number | null;
}

export interface ReconciliationDecisionDto {
  intentId?: string | null;
  alignmentStatus: string;
  divergenceTypes: string[];
  decision: "maintain" | "runtime" | "intent" | "co-evolve";
  proposedActions: ReconciliationDecisionActionDto[];
  triggerEvents: ReconciliationDecisionTriggerEventDto[];
  approvalPosture: string;
  confidence: number;
  requiresApproval: boolean;
  rationale?: Record<string, unknown> | null;
  lastEvaluated?: string | number | null;
}

export interface IntentScopeDto {
  symbols?: string[];
  systems?: string[];
  workflows?: string[];
}

export interface IntentSummaryDto {
  id: string;
  description: string;
  status: string;
  priority?: string | null;
  version: number;
  scopeSummary?: {
    symbolCount: number;
    systemCount: number;
    workflowCount: number;
  } | null;
  linkedRuntimeObjectCount: number;
  linkedSourceArtifactCount: number;
  linkedEventCount: number;
  linkedMutationCount: number;
  createdAt?: string | number | null;
  updatedAt?: string | number | null;
}

export interface IntentDetailDto extends IntentSummaryDto {
  scope?: IntentScopeDto | null;
  constraints: Record<string, unknown>[];
  expectedBehaviors: string[];
  nonGoals: string[];
  linkedRuntimeObjects: string[];
  linkedSourceArtifacts: string[];
  linkedEventIds: string[];
  linkedMutationIds: string[];
  metadata?: Record<string, unknown> | null;
  current: boolean;
  diff?: Array<Record<string, unknown>> | null;
}

export interface ProjectSummaryDto {
  projectId: string;
  title: string;
  summary: string;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  requirementCount: number;
  featureSpecCount: number;
  journeyCount: number;
  architectureDecisionCount: number;
  nonFunctionalRequirementCount: number;
  linkedWorkItemCount: number;
  linkedIncidentCount: number;
  linkedTestingHarnessCount: number;
  sourceRoots: string[];
}

export interface ProjectListDto {
  currentProjectId?: string | null;
  projects: ProjectSummaryDto[];
}

export interface ProjectDetailDto extends ProjectSummaryDto {
  constitution: Record<string, unknown> | null;
  requirements: ProjectRequirementDto[];
  featureSpecifications: ProjectFeatureSpecificationDto[];
  designSystem: Record<string, unknown> | null;
  styleGuide: Record<string, unknown> | null;
  testingStrategy: ProjectTestingStrategyDto | null;
  releaseReadiness: ProjectReleaseReadinessDto | null;
  readinessObligations: ProjectReadinessObligationDto[];
  userJourneys: ProjectUserJourneyDto[];
  nonFunctionalRequirements: ProjectRequirementDto[];
  architectureDecisions: ProjectArchitectureDecisionDto[];
  linkedWorkItemIds: string[];
  linkedIncidentIds: string[];
  linkedTestingHarnessIds: string[];
  linkedWorkItems: ProjectLinkedWorkItemDto[];
  linkedIncidents: ProjectLinkedIncidentDto[];
  linkedTestingHarnesses: ProjectTestingHarnessDto[];
  testingEvidence?: ProjectTestingEvidenceDto | null;
  qualityGateEvidence?: ProjectQualityGateEvidenceDto | null;
  readinessSummary?: ProjectReadinessSummaryDto | null;
  alignmentState?: AlignmentStateDto | null;
  reconciliationDecision?: ReconciliationDecisionDto | null;
  traceNeighborhood?: ProjectTraceNeighborhoodDto | null;
  metadata: Record<string, unknown> | null;
}

export interface ReplSessionProfileDto {
  sessionId: string;
  title: string;
  environmentId: string;
  draftForm: string;
  packageName?: string;
  lastSummary?: string;
  history?: ReplSessionHistoryEntryDto[];
}

export interface ReplSessionHistoryEntryDto {
  entryId: string;
  timestamp: string;
  form: string;
  status: CommandResultDto<RuntimeEvalResultDto>["status"];
  summary: string;
  valuePreview?: string | null;
  recoveryLaunch?: RuntimeEvalResultDto["recoveryLaunch"];
}

export interface EditorBufferStateDto {
  bufferId: string;
  title: string;
  draft: string;
  baselineDraft: string;
  packageName: string;
  dirty: boolean;
  result: CommandResultDto<RuntimeEvalResultDto> | null;
  sourceFilePath?: string | null;
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
  updatedAt: string | null;
}

export interface IncidentRemediationPlanDto {
  status: "draft" | "active" | "blocked" | "completed";
  owner?: string | null;
  summary: string;
  actions: string[];
  validationSteps: string[];
  blockers: string[];
}

export interface RuntimeConditionSlotDto {
  name: string;
  boundp: boolean;
  printed?: string | null;
  type?: string | null;
}

export interface RuntimeConditionDetailDto {
  type?: string | null;
  message: string;
  printed?: string | null;
  class?: string | null;
  restartCount: number;
  slotCount?: number | null;
  slots: RuntimeConditionSlotDto[];
}

export interface RuntimeRestartSuggestionDto {
  name?: string | null;
  label: string;
}

export interface IncidentDetailDto {
  incidentId: string;
  title: string;
  summary: string;
  severity: IncidentSummaryDto["severity"];
  state: IncidentSummaryDto["state"];
  runtimeId?: string | null;
  linkedThreadId?: string | null;
  recoveryState: "awaiting_acknowledgement" | "active_recovery" | "closure_pending" | "resolved";
  recoverySummary: string;
  nextAction: string;
  blockedReason?: string | null;
  remediationPlan: IncidentRemediationPlanDto | null;
  conditionDetail: RuntimeConditionDetailDto | null;
  restartSuggestions: RuntimeRestartSuggestionDto[];
  artifactIds: string[];
  linkedEntities: LinkedEntityRefDto[];
  traceNeighborhood?: ProjectTraceNeighborhoodDto | null;
  updatedAt: string;
}

export interface ApprovalRequestSummaryDto {
  requestId: string;
  title: string;
  summary: string;
  state: "awaiting" | "approved" | "denied";
  createdAt: string | null;
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

export interface CreateConversationThreadInput {
  environmentId: string;
  title: string;
  summary?: string;
}

export interface CreateProjectInput {
  environmentId: string;
  title: string;
  summary?: string;
}

export interface CreateIntentInput {
  environmentId: string;
  description: string;
  scope?: IntentScopeDto;
  constraints?: Record<string, unknown>[];
  expectedBehaviors?: string[];
  nonGoals?: string[];
  priority?: string;
  version?: number;
  status?: string;
  linkedRuntimeObjects?: string[];
  linkedSourceArtifacts?: string[];
  linkedEventIds?: string[];
  linkedMutationIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateProjectConstitutionInput {
  environmentId: string;
  projectId?: string;
  constitution: Record<string, unknown>;
}

export interface UpdateProjectDesignSystemInput {
  environmentId: string;
  projectId?: string;
  designSystem: Record<string, unknown>;
}

export interface UpdateProjectStyleGuideInput {
  environmentId: string;
  projectId?: string;
  styleGuide: Record<string, unknown>;
}

export interface UpdateProjectTestingStrategyInput {
  environmentId: string;
  projectId?: string;
  testingStrategy: ProjectTestingStrategyDto;
}

export interface UpdateProjectReleaseReadinessInput {
  environmentId: string;
  projectId?: string;
  releaseReadiness: ProjectReleaseReadinessDto;
}

export interface UpdateProjectReadinessObligationsInput {
  environmentId: string;
  projectId?: string;
  readinessObligations: ProjectReadinessObligationDto[];
}

export interface AppendProjectRequirementInput {
  environmentId: string;
  projectId?: string;
  id?: string;
  title: string;
  summary: string;
  scope?: string;
  kind?: string;
  priority?: string;
  status?: string;
  verificationKind?: string;
  linkedArtifactIds?: string[];
  nonFunctional?: boolean;
}

export interface AppendProjectFeatureSpecificationInput {
  environmentId: string;
  projectId?: string;
  id?: string;
  title: string;
  summary: string;
  status?: string;
  acceptanceCriteria?: string[];
  linkedRequirementIds?: string[];
  linkedJourneyIds?: string[];
}

export interface AppendProjectUserJourneyInput {
  environmentId: string;
  projectId?: string;
  id?: string;
  title: string;
  summary: string;
  actors?: string[];
  entrypoints?: string[];
  steps?: string[];
  outcomes?: string[];
  edgeCases?: string[];
}

export interface AppendProjectArchitectureDecisionInput {
  environmentId: string;
  projectId?: string;
  id?: string;
  title: string;
  summary: string;
  status?: string;
  drivers?: string[];
  consequences?: string[];
  stackChoices?: string[];
  linkedRequirementIds?: string[];
}

export interface AppendProjectSourceRootInput {
  environmentId: string;
  projectId?: string;
  sourceRoot: string;
}

export interface BindProjectTestingHarnessInput {
  environmentId: string;
  projectId?: string;
  harnessId: string;
}

export interface AppendProjectQualityGateInput {
  environmentId: string;
  projectId?: string;
  id?: string;
  title: string;
  summary?: string;
  status?: string;
  requiredHarnessIds?: string[];
  minimumLinkedWorkItems?: number;
  minimumLinkedIncidents?: number;
  requireSourceRoots?: boolean;
  requiredTraceTargetKinds?: string[];
  maximumFailedTests?: number;
  requireCoverage?: boolean;
  maximumSayTurnLatencySeconds?: number;
  maximumEnvironmentSaveLoadSeconds?: number;
  requireRecoveryReady?: boolean;
}

export interface UpdateConversationThreadInput {
  environmentId: string;
  threadId: string;
  title: string;
  summary?: string;
}

export interface ResumeWorkItemInput {
  environmentId?: string;
  workItemId: string;
  note?: string | null;
}

export interface QuarantineWorkItemInput {
  environmentId?: string;
  workItemId: string;
  reason: string;
}

export interface RollbackWorkItemInput {
  environmentId?: string;
  workItemId: string;
  reason?: string | null;
  note?: string | null;
}

export interface CompleteWorkItemValidationsInput {
  environmentId?: string;
  workItemId: string;
  status?: string | null;
}

export interface SteerWorkItemInput {
  environmentId?: string;
  workItemId: string;
  phase?: string | null;
  nextStep?: string | null;
  note?: string | null;
}

export interface UpdateIncidentRemediationPlanInput {
  environmentId?: string;
  incidentId: string;
  remediationPlan: IncidentRemediationPlanDto;
}

export interface SendConversationMessageInput {
  environmentId: string;
  threadId: string;
  prompt: string;
  attachments?: ConversationAttachmentDto[];
  surfaceContext?: Record<string, unknown>;
  surfaceActions?: Array<Record<string, unknown>>;
}

export interface ApproveActorMessageInput {
  environmentId: string;
  actorMessageId: string;
}

export interface ApproveApprovalInput {
  environmentId: string;
  approvalId: string;
  sessionId?: string | null;
}

export interface SendConversationMessageResultDto {
  threadId: string;
  turnId: string;
  assistantMessage: string;
  summary: string;
  desktopTaskResults?: Array<Record<string, unknown>>;
  taskRecordSummaries?: Array<Record<string, unknown>>;
  pendingApproval?: Record<string, unknown> | null;
  runtimeReply?: Record<string, unknown> | null;
  actorFlow?: Record<string, unknown> | null;
}

export interface ConversationStreamEventDto {
  phase: "started" | "delta" | "completed" | "error";
  threadId?: string | null;
  turnId?: string | null;
  content?: string | null;
  summary?: string | null;
}

export interface MessageDto {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  turnId?: string | null;
  attachments?: ConversationAttachmentDto[];
}

export interface ConversationOperationDto {
  operationId: string;
  kind: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  summary: string;
  toolId?: string | null;
  inputPreview?: string | null;
  outputPreview?: string | null;
  policyDecision?: string | null;
}

export interface ConversationAttachmentDto {
  attachmentId: string;
  name: string;
  mediaType: string;
  kind: "text" | "image" | "binary";
  source: "input" | "output";
  summary: string;
  sizeBytes?: number | null;
  textContent?: string | null;
  dataUrl?: string | null;
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

export interface PackageManagementSourceRegistryEntryDto {
  entryId: string;
  path: string;
  existsP: boolean;
  managedP: boolean;
}

export interface PackageManagementLocalProjectDto {
  projectId: string;
  name: string;
  path: string;
  linkPath: string;
  existsP: boolean;
  managedP: boolean;
}

export interface PackageManagementSummaryDto {
  packageManager: string;
  projectDir?: string | null;
  workingDirectory?: string | null;
  quicklispAvailableP: boolean;
  qlotAvailableP: boolean;
  qlotExecutablePath?: string | null;
  qlotProjectRoot?: string | null;
  loadedSetupCount: number;
  loadedSetupPaths: string[];
  sourceRegistryDirectoryCount: number;
  sourceRegistryDirectories: string[];
  managedSourceRegistryPath: string;
  managedSourceRegistryEntryCount: number;
  managedSourceRegistryEntries: PackageManagementSourceRegistryEntryDto[];
  localProjectsRoot: string;
  localProjectCount: number;
  localProjects: PackageManagementLocalProjectDto[];
}

export interface PackageManagementCommandResultDto {
  summary: string;
  packageManagement: PackageManagementSummaryDto;
  systemName?: string | null;
  path?: string | null;
  name?: string | null;
  oldPath?: string | null;
  newPath?: string | null;
  argv?: string[] | null;
  stdout?: string | null;
  stderr?: string | null;
  exitCode?: number | null;
}

export interface DesktopTaskManifestDto {
  id: string;
  target: string;
  operation: string;
  capability?: string | null;
  description?: string | null;
  requestSchema?: Record<string, unknown> | null;
  resultSchema?: Record<string, unknown> | null;
  approvalPolicy?: string | null;
  executionMode?: string | null;
  retryPolicy?: Record<string, unknown> | null;
  backendKind?: string | null;
  backendRef?: string | null;
  version?: number | null;
  tags: string[];
  discoverableP: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface McpServerConfigDto {
  id: string;
  name: string;
  transport: string;
  command?: string | null;
  arguments: string[];
  environmentVariables?: Record<string, string> | null;
  workingDirectory?: string | null;
  endpoint?: string | null;
  capabilities: string[];
  retryPolicy?: Record<string, unknown> | null;
  healthStatus?: string | null;
  enabledP: boolean;
  discoverableP: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  operationCount: number;
  operations: DesktopTaskManifestDto[];
  metadata?: Record<string, unknown> | null;
}

export interface DesktopTaskRecordDto {
  id: string;
  protocolVersion?: number | null;
  requestId?: string | null;
  requester?: string | null;
  target: string;
  operation: string;
  capability?: string | null;
  backendKind?: string | null;
  backendRef?: string | null;
  status: string;
  governanceStatus?: string | null;
  approvalStatus?: string | null;
  approvalId?: string | null;
  sessionId?: string | null;
  retryPolicy?: Record<string, unknown> | null;
  retryCount?: number | null;
  maxAttempts?: number | null;
  retryableP?: boolean | null;
  idempotencyKey?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  conversationOperationId?: string | null;
  actorMessageId?: string | null;
  actorSlice?: string | null;
  actorMessage?: Record<string, unknown> | null;
  requestMetadata?: Record<string, unknown> | null;
  createdAt?: string | null;
  approvedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastError?: Record<string, unknown> | null;
  resolution?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface RuntimeTelemetryProcessDto {
  processId: string;
  kind: "runtime" | "task" | "worker" | "compatibility-process";
  label: string;
  state: "running" | "waiting" | "idle" | "blocked" | "completed" | "failed" | "stopped";
  summary: string;
  pid?: number | null;
  cpuPercent?: number | null;
  memoryMb?: number | null;
  elapsed?: string | null;
  command?: string | null;
  workItemId?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  incidentId?: string | null;
  workflowRecordId?: string | null;
  controlToken?: string | null;
}

export interface RuntimeCpuSummaryDto {
  utilizationPercent?: number | null;
  coreCount: number;
  loadAverage1m?: number | null;
  loadAverage5m?: number | null;
  loadAverage15m?: number | null;
  summary: string;
}

export interface RuntimeMemorySummaryDto {
  rssMb?: number | null;
  heapUsedMb?: number | null;
  heapTotalMb?: number | null;
  systemUsedPercent?: number | null;
  summary: string;
}

export interface RuntimeNetworkSummaryDto {
  openConnectionCount?: number | null;
  interfaceCount: number;
  summary: string;
}

export interface RuntimeDiskSummaryDto {
  readKbps?: number | null;
  writeKbps?: number | null;
  summary: string;
}

export interface RuntimeTelemetrySnapshotDto {
  runtimeId: string;
  sampledAt: string;
  runtimePid?: number | null;
  cpu: RuntimeCpuSummaryDto;
  memory: RuntimeMemorySummaryDto;
  network: RuntimeNetworkSummaryDto;
  disk: RuntimeDiskSummaryDto;
  processes: RuntimeTelemetryProcessDto[];
  activitySummary: string;
}

export type ConsolePlane = "environment" | "host";

export type ConsoleLogType = "debug" | "info" | "notice" | "warning" | "error" | "fault";

export interface ConsoleLogEntryDto {
  entryId: string;
  cursor?: number | null;
  plane: ConsolePlane;
  timestamp: string;
  type: ConsoleLogType;
  category: string;
  source: string;
  message: string;
  processName?: string | null;
  pid?: number | null;
  threadId?: string | null;
  activityId?: string | null;
  environmentId?: string | null;
  runtimeId?: string | null;
  workItemId?: string | null;
  workflowRecordId?: string | null;
  incidentId?: string | null;
  threadRefId?: string | null;
  turnRefId?: string | null;
  visibility?: string | null;
  detail?: string | null;
}

export interface ConsoleLogQueryInput {
  environmentId?: string;
  plane?: ConsolePlane;
  fromCursor?: number;
  limit?: number;
  types?: ConsoleLogType[];
  sources?: string[];
}

export interface ConsoleLogStreamDto {
  plane: ConsolePlane;
  entries: ConsoleLogEntryDto[];
  nextCursor?: number | null;
  summary: string;
}

export type DiagnosticReportKind =
  | "crash"
  | "spin"
  | "log"
  | "diagnostic"
  | "analytics"
  | "system";

export interface DiagnosticReportSummaryDto {
  reportId: string;
  kind: DiagnosticReportKind;
  title: string;
  summary: string;
  source: string;
  processName?: string | null;
  pid?: number | null;
  createdAt: string;
  path?: string | null;
}

export interface DiagnosticReportDetailDto extends DiagnosticReportSummaryDto {
  contentPreview?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RuntimeEvalResultDto {
  evaluationId: string;
  outcome: "ok" | "awaiting_approval" | "failed";
  summary: string;
  valuePreview?: string | null;
  recoveryLaunch?: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
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
    | "package"
    | "object"
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
  availablePackages: string[];
  nicknames: string[];
  useList: string[];
  externalSymbols: PackageBrowserSymbolDto[];
  internalSymbols: PackageBrowserSymbolDto[];
  summary: string;
}

export interface RuntimeSymbolBrowserPageInput {
  environmentId: string;
  packageScope?: string | null;
  kinds?: Array<PackageBrowserSymbolDto["kind"]>;
  visibility?: PackageBrowserSymbolDto["visibility"] | "all";
  search?: string;
  offset?: number;
  limit?: number;
}

export interface RuntimeSymbolBrowserEntryDto extends PackageBrowserSymbolDto {
  packageName: string;
}

export interface RuntimeSymbolBrowserPageDto {
  packageScope: string | null;
  availablePackages: string[];
  nicknames: string[];
  useList: string[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  items: RuntimeSymbolBrowserEntryDto[];
  summary: string;
}

export interface SourcePreviewInput {
  environmentId: string;
  path: string;
  line?: number;
  contextRadius?: number;
}

export interface FileSystemDirectoryInput {
  path?: string;
}

export interface FileSystemWriteInput {
  path: string;
  content: string;
  overwrite?: boolean;
}

export interface FileSystemWriteResultDto {
  path: string;
  overwritten: boolean;
  summary: string;
}

export interface FileSystemEntryDto {
  name: string;
  path: string;
  kind: "directory" | "file";
}

export interface FileSystemDirectoryListingDto {
  currentPath: string;
  parentPath?: string | null;
  directories: FileSystemEntryDto[];
  files: FileSystemEntryDto[];
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

export interface CorrectiveTriggerEventDto {
  eventId?: string | null;
  kind?: string | null;
  family?: string | null;
  entityId?: string | null;
}

export interface CorrectiveActionDto {
  kind?: string | null;
  target?: string | null;
  reason?: string | null;
}

export interface CorrectiveContextDto {
  kind: string;
  intentId?: string | null;
  decision?: string | null;
  approvalPosture?: string | null;
  alignmentStatus?: string | null;
  alignmentScore?: number | null;
  proposedActions: CorrectiveActionDto[];
  triggerEvents: CorrectiveTriggerEventDto[];
}

export interface WorkItemSummaryDto {
  workItemId: string;
  title: string;
  state: "active" | "waiting" | "blocked" | "quarantined" | "closable";
  updatedAt: string | null;
  waitingReason?: string | null;
  approvalCount: number;
  incidentCount: number;
  artifactCount: number;
  validationBurden: "none" | "pending" | "complete";
  reconciliationBurden: "none" | "required" | "complete";
  correctiveContext?: CorrectiveContextDto | null;
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
  traceNeighborhood?: ProjectTraceNeighborhoodDto | null;
  correctiveContext?: CorrectiveContextDto | null;
}

export interface WorkItemPlanSteeringDto {
  currentPhase?: string | null;
  nextStep?: string | null;
  resumeAnchor?: string | null;
  phaseCount: number;
  planningPhases: string[];
  remainingPhases: string[];
  completedPhaseCount: number;
  decompositionReady: boolean;
  compacted: boolean;
  revisionReason?: string | null;
  operatorDirectedPhase?: string | null;
  operatorDirectedNextStep?: string | null;
  operatorSteeringCount: number;
  reviewRequired: boolean;
  planHealth?: string | null;
}

export interface WorkItemPlanDirectiveDto {
  phase?: string | null;
  nextStep?: string | null;
  note?: string | null;
  timestamp?: number | null;
}

export interface WorkItemPlanDto {
  workItemId: string;
  status: string;
  goal: string;
  longHorizonPlan: Record<string, unknown> | null;
  planHealth?: string | null;
  planSteering?: WorkItemPlanSteeringDto | null;
  operatorSteeringHistory: WorkItemPlanDirectiveDto[];
  nextAction: Record<string, unknown> | null;
  resumePayload: Record<string, unknown> | null;
  pendingValidations: string[];
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
  recoveryLaunch?: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
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

export interface ConversationWorkspaceDto {
  threads: ThreadSummaryDto[];
  selectedThread: ThreadDetailDto | null;
  selectedTurn: TurnDetailDto | null;
}

export interface ConversationLatencySampleDto {
  kind: string;
  timestamp: string;
  payload: Record<string, unknown> | null;
}

export interface ConversationProviderPhaseTimingDto {
  timestamp: string;
  phase?: string | null;
  payload: Record<string, unknown>;
}

export interface ConversationLatencySummaryDto {
  turnId?: string | null;
  sampleCount: number;
  samples: ConversationLatencySampleDto[];
  requestBuilt: Record<string, unknown> | null;
  firstStream: Record<string, unknown> | null;
  responseComplete: Record<string, unknown> | null;
  providerPhases: ConversationProviderPhaseTimingDto[];
}

export interface TranscriptWorkspaceDto {
  events: EnvironmentEventDto[];
  environmentConsole: ConsoleLogStreamDto | null;
}

export interface EnvironmentBootstrapDto {
  summary: EnvironmentSummaryDto;
  status: EnvironmentStatusDto;
  workspaceSummary: WorkspaceSummaryDto;
  desktopModel: DesktopModelDto;
}

export interface TurnDetailDto {
  turnId: string;
  threadId: string;
  title: string;
  state: TurnState;
  summary: string;
  createdAt: string;
  operationIds: string[];
  operations: ConversationOperationDto[];
  artifactIds: string[];
  incidentIds: string[];
  approvalIds: string[];
  workItemIds: string[];
  userMessage?: MessageDto | null;
  assistantMessage?: MessageDto | null;
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
  alignmentState?: AlignmentStateDto | null;
  reconciliationDecision?: ReconciliationDecisionDto | null;
}

export interface EnvironmentStatusDto {
  environmentId: string;
  environmentLabel: string;
  connectionState: "bound" | "unbound";
  hostState: HostState;
  runtimeState: "warm" | "cooling" | "recovering";
  workflowState: "governed" | "attention_required";
  lastUpdatedAt: string;
  alignmentState?: AlignmentStateDto | null;
  reconciliationDecision?: ReconciliationDecisionDto | null;
}

export interface WorkspaceAttentionItemDto {
  kind: string;
  title: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
  actionLabel?: string | null;
  destinationWorkspace?: WorkspaceId | null;
  objectType?: string | null;
  objectId?: string | null;
  count?: number | null;
  priority?: number | null;
}

export interface WorkspaceAttentionQueueDto {
  count: number;
  topItem: WorkspaceAttentionItemDto | null;
  items: WorkspaceAttentionItemDto[];
}

export interface WorkspaceNodeModeDto {
  employmentModel: string;
  trustProfile: string;
  visibilityProfile: string;
  billingProfile: string;
  acceptedPolicyProfileCount: number;
  [key: string]: unknown;
}

export interface WorkspaceSummaryDto {
  nodeMode: WorkspaceNodeModeDto;
  runtimeContext: Record<string, unknown>;
  assignmentTerms: Record<string, unknown>;
  evidencePosture: Record<string, unknown>;
  usageSummary: Record<string, unknown>;
  attentionQueue: WorkspaceAttentionQueueDto;
  publicationSummary: Record<string, unknown>;
  businessSummary: Record<string, unknown>;
}

export type DesktopPanelId = "workspace" | "governance" | "object-browser" | "display" | "inspector";

export type DesktopActionKind =
  | "activate-panel"
  | "select-panel"
  | "open-panel"
  | "restore-panel"
  | "show-panel"
  | "control-panel"
  | "step-panel";

export interface DesktopActionDto {
  actionId?: string;
  actionKind: DesktopActionKind;
  panelId: DesktopPanelId;
  command: string;
  index?: number | null;
  executionId?: string | null;
  objectKind?: string | null;
  params?: Record<string, unknown>;
}

export interface DesktopPanelActionsDto {
  activateCommand?: string;
  selectCommand?: string;
  openCommand?: string;
  restoreCommand?: string;
  activate?: DesktopActionDto | null;
  select?: DesktopActionDto | null;
  open?: DesktopActionDto | null;
  restore?: DesktopActionDto | null;
}

export interface DesktopPanelStateDto {
  panelId: DesktopPanelId;
  count?: number;
  focusObjectId?: string | null;
  selectedIndex?: number | null;
  selectedExecutionId?: string | null;
  selectedTitle?: string | null;
  selectedQueueKind?: string | null;
  selectedKind?: string | null;
  objectKind?: string | null;
  resolvedVia?: string | null;
  topSurface?: Record<string, unknown> | null;
  topItem?: Record<string, unknown> | null;
  topGroup?: Record<string, unknown> | null;
  actions: DesktopPanelActionsDto;
  [key: string]: unknown;
}

export interface DesktopRecommendedActionDto {
  label: string;
  actionKind: DesktopActionKind;
  command: string;
  actionId?: string;
}

export interface DesktopEntryPointDto {
  entryKind: string;
  label: string;
  command: string;
  focusObjectId?: string | null;
  objectKind?: string | null;
  action?: DesktopActionDto | null;
  actions?: Record<string, DesktopActionDto | null> | null;
}

export interface DesktopModelDto {
  workspaceId: string;
  environmentId: string;
  plan?: string | null;
  focusObjectId?: string | null;
  activePanel: DesktopPanelId;
  surfaceCount: number;
  governanceCount: number;
  objectGroupCount: number;
  displayCount?: number;
  topSurface?: Record<string, unknown> | null;
  topGovernanceItem?: Record<string, unknown> | null;
  topObjectGroup?: Record<string, unknown> | null;
  topDisplaySurface?: Record<string, unknown> | null;
  entryPoints: DesktopEntryPointDto[];
  panels: Record<DesktopPanelId, DesktopPanelStateDto>;
  activePanelSummary?: Record<string, unknown> | null;
  recommendedAction?: DesktopRecommendedActionDto | null;
  workspace?: Record<string, unknown>;
  surfaceList?: Record<string, unknown>;
  inspector?: Record<string, unknown>;
}

export interface DesktopActionInput {
  environmentId?: string;
  actionId?: string;
  actionKind?: DesktopActionKind;
  panelId?: DesktopPanelId;
  command?: string;
  index?: number;
  executionId?: string;
  objectKind?: string;
  params?: Record<string, unknown>;
}

export interface DesktopActionResultDto {
  action?: DesktopActionDto | null;
  result?: Record<string, unknown> | null;
  desktopModel: DesktopModelDto;
  [key: string]: unknown;
}

export interface DesktopRestoreInput {
  environmentId?: string;
  panelId?: DesktopPanelId;
  panelState: Record<string, unknown>;
}

export interface DesktopRestoreResultDto {
  panelId: DesktopPanelId;
  panelState: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  desktopModel: DesktopModelDto;
  [key: string]: unknown;
}

export type ProviderRoutingMode = "auto" | "manual";

export interface ProviderProfileDto {
  name: string;
  provider: string;
  model: string;
  fastModel: string;
  apiBase?: string | null;
  apiKeyPresent: boolean;
  intents: string[];
  latencyTier: string;
  reviewBias: string;
  executionBias: string;
  locality: string;
}

export interface ProviderRoutingPolicyDto {
  mode: ProviderRoutingMode;
  availableModes: ProviderRoutingMode[];
  profileCount: number;
  lastRoutePresent: boolean;
}

export interface ProviderProfileSummaryDto {
  activeProfileName: string;
  profileCount: number;
  profiles: ProviderProfileDto[];
  activeProfile?: ProviderProfileDto | null;
  routingMode: ProviderRoutingMode;
  routingPolicy: ProviderRoutingPolicyDto;
  lastRoute?: Record<string, unknown> | null;
}

export interface ConfigureProviderProfileInput {
  profileName: string;
  provider: string;
  model: string;
  fastModel?: string | null;
  apiBase?: string | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
  intents?: string[];
  latencyTier?: string | null;
  reviewBias?: string | null;
  executionBias?: string | null;
  locality?: string | null;
  activate?: boolean;
}

export interface UseProviderProfileInput {
  profileName: string;
}

export interface UpdateProviderRoutingInput {
  mode: ProviderRoutingMode;
}

export interface ConfigureMcpServerInput {
  environmentId: string;
  serverId?: string | null;
  name: string;
  transport: "stdio" | "http";
  command?: string | null;
  arguments?: string[] | null;
  environmentVariables?: Record<string, string> | null;
  workingDirectory?: string | null;
  endpoint?: string | null;
  capabilities?: string[] | null;
  retryPolicy?: Record<string, unknown> | null;
  healthStatus?: string | null;
  enabledP?: boolean | null;
  discoverableP?: boolean | null;
}

export interface RemoveMcpServerInput {
  environmentId: string;
  serverId: string;
}

export interface DesktopPreferencesDto {
  lastWorkspace: WorkspaceId;
  selectedBrowserDomain?: string;
  selectedConfigurationSection?: string;
  sidebarPinned: boolean;
  sidebarWidth?: number | null;
  sidebarActivePanelId?: string | null;
  sidebarDockedPanelIds?: string[];
  canvasPinned: boolean;
  inspectorPinned: boolean;
  inspectorWidth?: number | null;
  inspectorActivePanelId?: string | null;
  inspectorDockedPanelIds?: string[];
  themePreference: "system" | "light" | "dark";
  desktopSurfaceView?: {
    tooltipScalePercent: number;
    controlIconScalePercent: number;
    dockIconScalePercent: number;
    conversationTextScalePercent: number;
    sourceCodeTextScalePercent: number;
  };
  currentProjectId?: string | null;
  projects?: ProjectProfileDto[];
  selectedConversationThreadByProject?: Record<string, string>;
  conversationDraft?: string;
  replSessionsByProject?: Record<string, ReplSessionProfileDto[]>;
  currentReplSessionIdByProject?: Record<string, string>;
  editorBuffersByProject?: Record<string, EditorBufferStateDto[]>;
  selectedEditorBufferIdByProject?: Record<string, string>;
  workspacePackageByProject?: Record<string, string>;
  workspaceDraftByProject?: Record<string, string>;
  workspaceResultByProject?: Record<string, CommandResultDto<RuntimeEvalResultDto> | null>;
  workspaceHistoryByProject?: Record<string, ReplSessionHistoryEntryDto[]>;
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

export interface MemoryEntryDto {
  memoryId: string;
  kind: string;
  category: string;
  attribute: string;
  value: string;
  summary: string;
  confidence?: number | null;
  sourceTurnId?: string | null;
  recordedAt?: string | null;
  updatedAt?: string | null;
}

export interface MemoryListDto {
  entries: MemoryEntryDto[];
  entryCount: number;
}

export interface MemoryUpdateInput {
  environmentId: string;
  memoryId: string;
  category?: string;
  attribute?: string;
  value?: string;
  summary?: string;
  confidence?: number | null;
}

export interface MemoryDeleteInput {
  environmentId: string;
  memoryId: string;
}

export interface MemoryDeleteResultDto {
  memoryId: string;
  deletedP: boolean;
}

export type CalculatorMode = "basic" | "scientific" | "programmer";
export type CalculatorAngleUnit = "radians" | "degrees";

export interface CalculatorHistoryEntryDto {
  expression: string;
  mode: CalculatorMode;
  result: string;
}

export interface CalculatorSummaryDto {
  availableModes: CalculatorMode[];
  defaultMode: CalculatorMode;
  availableBases: number[];
  defaultBase: number;
  availableWordSizes: number[];
  defaultWordSize: number;
  availableAngleUnits: CalculatorAngleUnit[];
  defaultAngleUnit: CalculatorAngleUnit;
  currentExpression?: string;
  currentMode?: CalculatorMode;
  currentBase?: number;
  currentWordSize?: number;
  currentAngleUnit?: CalculatorAngleUnit;
  latestResult?: CalculatorResultDto | null;
  history?: CalculatorHistoryEntryDto[];
  summary: string;
}

export interface CalculatorResultDto {
  mode: CalculatorMode;
  expression: string;
  displayValue: string;
  scientificNotation: string;
  base: number;
  wordSize: number;
  angleUnit: CalculatorAngleUnit;
  integerResultP: boolean;
  decimalValue: string;
  unsignedDecimalValue?: string | null;
  hexadecimalValue?: string | null;
  octalValue?: string | null;
  binaryValue?: string | null;
  summary: string;
}

export interface CalculatorEvaluateInput {
  environmentId: string;
  expression: string;
  mode: CalculatorMode;
  base?: number;
  wordSize?: number;
  angleUnit?: CalculatorAngleUnit;
}

export interface CalculatorSetExpressionInput {
  environmentId: string;
  expression: string;
}

export interface CalculatorAppendTokenInput {
  environmentId: string;
  token: string;
}

export interface CalculatorSetModeInput {
  environmentId: string;
  mode: CalculatorMode;
}

export interface CalculatorSetBaseInput {
  environmentId: string;
  base: number;
}

export interface CalculatorSetWordSizeInput {
  environmentId: string;
  wordSize: number;
}

export interface CalculatorSetAngleUnitInput {
  environmentId: string;
  angleUnit: CalculatorAngleUnit;
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
  limit?: number;
}

export interface EnvironmentEventDto {
  cursor: number;
  kind: string;
  timestamp: string;
  family: string;
  summary: string;
  entityId?: string | null;
  threadId?: string | null;
  turnId?: string | null;
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
  getEnvironmentImageRegistry(): Promise<QueryResultDto<EnvironmentImageRegistryDto>>;
  loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>>;
  saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>>;
  revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>>;
}

export interface QueryApi {
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
  artifactDetail(artifactId: string, environmentId?: string): Promise<QueryResultDto<ArtifactDetailDto>>;
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
  runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>>;
  runtimeTelemetrySnapshot(environmentId?: string): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>>;
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
  runtimeSymbolPage(input: RuntimeSymbolBrowserPageInput): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto>>;
  fileSystemDirectory(input?: FileSystemDirectoryInput): Promise<QueryResultDto<FileSystemDirectoryListingDto>>;
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
  workItemPlan(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemPlanDto>>;
  workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>>;
  memoryList(environmentId?: string): Promise<QueryResultDto<MemoryListDto>>;
  memoryDetail(memoryId: string, environmentId?: string): Promise<QueryResultDto<MemoryEntryDto>>;
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
  calculatorSummary(environmentId?: string): Promise<QueryResultDto<CalculatorSummaryDto>>;
}

export interface CommandApi {
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
  createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>>;
  updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>>;
  updateMemory(input: MemoryUpdateInput): Promise<CommandResultDto<MemoryEntryDto>>;
  deleteMemory(input: MemoryDeleteInput): Promise<CommandResultDto<MemoryDeleteResultDto>>;
  sendConversationMessage(
    input: SendConversationMessageInput
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
  evaluateInContext(
    input: EvaluateInContextInput
  ): Promise<CommandResultDto<RuntimeEvalResultDto>>;
  setCalculatorExpression(input: CalculatorSetExpressionInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  appendCalculatorToken(input: CalculatorAppendTokenInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  backspaceCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>>;
  clearCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorMode(input: CalculatorSetModeInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorBase(input: CalculatorSetBaseInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorWordSize(input: CalculatorSetWordSizeInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  setCalculatorAngleUnit(input: CalculatorSetAngleUnitInput): Promise<CommandResultDto<CalculatorSummaryDto>>;
  stageSourceChange(
    input: SourceMutationInput
  ): Promise<CommandResultDto<SourceMutationResultDto>>;
  writeSourceFile(
    input: FileSystemWriteInput
  ): Promise<CommandResultDto<FileSystemWriteResultDto>>;
  reloadSourceFile(
    input: SourceReloadInput
  ): Promise<CommandResultDto<SourceReloadResultDto>>;
  desktopAction(input: DesktopActionInput): Promise<CommandResultDto<DesktopActionResultDto>>;
  desktopRestore(input: DesktopRestoreInput): Promise<CommandResultDto<DesktopRestoreResultDto>>;
  approveRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
  denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>>;
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
  evaluateCalculator(input: CalculatorEvaluateInput): Promise<CommandResultDto<CalculatorResultDto>>;
}

export interface EventApi {
  subscribeEnvironmentEvents(
    input: EventSubscriptionInput,
    handler: (event: EnvironmentEventDto) => void
  ): Promise<EventSubscriptionHandle>;
  subscribeConversationStream(
    handler: (event: EnvironmentEventDto) => void
  ): Promise<EventSubscriptionHandle>;
  unsubscribe(subscriptionId: string): Promise<void>;
}

export interface DesktopApi {
  focusWorkspace(workspace: WorkspaceId): Promise<void>;
  getDesktopPreferences(): Promise<DesktopPreferencesDto>;
  setDesktopPreferences(patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto>;
  quitApp(): Promise<void>;
  setWindowTitle(title: string): Promise<void>;
  openEntityInNewWindow(ref: EntityRefDto): Promise<void>;
  listDocumentationPages(): Promise<DocumentationPageSummaryDto[]>;
  readDocumentationPage(slug: string): Promise<DocumentationPageDto>;
  openExternalLink(url: string): Promise<void>;
  subscribeMenuActions(handler: (action: string) => void): Promise<EventSubscriptionHandle>;
}

export interface SbclAgentDesktopApi {
  host: HostApi;
  query: QueryApi;
  command: CommandApi;
  events: EventApi;
  desktop: DesktopApi;
}
