import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type {
  AlignmentStateDto,
  ApprovalDecisionDto,
  ApprovalDecisionInput,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  AppendProjectArchitectureDecisionInput,
  AppendProjectFeatureSpecificationInput,
  AppendProjectQualityGateInput,
  AppendProjectRequirementInput,
  AppendProjectSourceRootInput,
  AppendProjectUserJourneyInput,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  BindProjectTestingHarnessInput,
  CalculatorEvaluateInput,
  CalculatorResultDto,
  CalculatorSummaryDto,
  CommandResultDto,
  CompleteWorkItemValidationsInput,
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  ConsoleLogEntryDto,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
  ConversationLatencySummaryDto,
  ConversationWorkspaceDto,
  ConversationAttachmentDto,
  CorrectiveActionDto,
  CorrectiveContextDto,
  CorrectiveTriggerEventDto,
  CreateIntentInput,
  CreateProjectInput,
  CreateConversationThreadInput,
  DiagnosticReportDetailDto,
  DiagnosticReportKind,
  DiagnosticReportSummaryDto,
  FileSystemDirectoryListingDto,
  FileSystemEntryDto,
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
  EnvironmentBootstrapDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  WorkspaceSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentRemediationPlanDto,
  IncidentSummaryDto,
  IntentDetailDto,
  LinkedEntityRefDto,
  MemoryDeleteResultDto,
  MemoryEntryDto,
  MemoryListDto,
  PackageBrowserDto,
  RuntimeSymbolBrowserPageDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  ProjectArchitectureDecisionDto,
  ProjectDetailDto,
  ProjectFeatureSpecificationDto,
  ProjectQualityGateDto,
  ProjectQualityGateEvidenceDto,
  ProjectQualityGateSummaryDto,
  ProjectReleaseReadinessDto,
  ProjectReadinessSummaryDto,
  ProjectLinkedIncidentDto,
  ProjectLinkedWorkItemDto,
  ProjectListDto,
  ProjectProfileDto,
  ProjectRequirementDto,
  ProjectSummaryDto,
  ProjectTestingHarnessDto,
  ProjectTestingStrategyDto,
  ProjectTestingStrategySuiteExpectationDto,
  ProjectTestingStrategyThresholdPolicyDto,
  ProjectTraceLinkDto,
  ProjectTraceNeighborhoodDto,
  ProjectUserJourneyDto,
  ProviderProfileDto,
  ProviderProfileSummaryDto,
  ProviderRoutingMode,
  QuarantineWorkItemInput,
  QueryResultDto,
  ReconciliationDecisionActionDto,
  ReconciliationDecisionTriggerEventDto,
  ReconciliationDecisionDto,
  ResumeWorkItemInput,
  RollbackWorkItemInput,
  RemoveMcpServerInput,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSymbolBrowserPageInput,
  RuntimeSystemEntryDto,
  RuntimeScopeSummaryDto,
  RuntimeSummaryDto,
  RuntimeTelemetryProcessDto,
  RuntimeTelemetrySnapshotDto,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  ServiceMetadataDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  SteerWorkItemInput,
  TurnState,
  ThreadDetailDto,
  ThreadSummaryDto,
  TranscriptWorkspaceDto,
  TruthPostureDto,
  TurnDetailDto,
  UpdateProjectConstitutionInput,
  UpdateProjectDesignSystemInput,
  UpdateProjectReadinessObligationsInput,
  UpdateIncidentRemediationPlanInput,
  UpdateProjectStyleGuideInput,
  UpdateProjectTestingStrategyInput,
  UpdateProjectReleaseReadinessInput,
  UpdateProviderRoutingInput,
  UseProviderProfileInput,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDirectiveDto,
  WorkItemPlanDto,
  WorkItemPlanSteeringDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../shared/contracts";
import type { SbclAgentHostAdapter } from "./adapter-contract";
import { PersistentSbclBridge, type LiveAdapterOptions, type RawServiceResponse } from "./live/bridge";
import {
  asRecord,
  asRecordArray,
  asStringArray,
  camelizeKeys,
  firstString,
  mergeDesktopPreferences,
  normalizeCommandResultLike,
  normalizeDesktopPreferencesPayload,
  normalizeMetadata
} from "./live/adapter-support";
import {
  collectHostConsoleEntries,
  collectHostDiagnosticReports,
  diagnosticKindForPath,
  diagnosticKindFromMetadata,
  diagnosticPreviewMetadata,
  diagnosticSummary,
  processNameFromDiagnosticFile,
  sampleHostDiskThroughputKbps,
  sampleHostNetworkBytes,
  sampleOpenConnectionCount,
  sampleProcessUsage
} from "./live/host-support";
import { LiveConversationService } from "./live/conversation-service";
import { LiveConfigurationService } from "./live/configuration-service";
import { LiveDesktopPreferencesService } from "./live/desktop-preferences-service";
import { LiveEnvironmentService } from "./live/environment-service";
import { LiveHostUtilityService } from "./live/host-utility-service";
import { LiveIncidentService } from "./live/incident-service";
import { LiveRuntimeService } from "./live/runtime-service";
import { LiveSourceService } from "./live/source-service";
import { LiveWorkflowService } from "./live/workflow-service";

interface StreamingBridgeFrame {
  type: "event" | "result";
  payload: unknown;
}

const DEFAULT_SBCL_PATH_CANDIDATES = [
  "/opt/homebrew/bin/sbcl",
  "/usr/local/bin/sbcl",
  "/usr/bin/sbcl"
] as const;

function conversationAttachmentTempExtension(name: string, mediaType: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith(".docx")) {
    return ".docx";
  }
  if (lowerName.endsWith(".doc")) {
    return ".doc";
  }
  if (lowerName.endsWith(".rtf")) {
    return ".rtf";
  }
  if (mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return ".docx";
  }
  if (mediaType === "application/msword") {
    return ".doc";
  }
  if (mediaType === "application/rtf" || mediaType === "text/rtf") {
    return ".rtf";
  }
  return ".bin";
}

function parseAttachmentDataUrl(dataUrl: string): Buffer | null {
  const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return null;
  }
  try {
    return Buffer.from(match[2], "base64");
  } catch {
    return null;
  }
}

function resolveSbclExecutable(): string {
  const configured = process.env.SBCL_AGENT_SBCL_PATH?.trim();
  if (configured && existsSync(configured)) {
    return configured;
  }

  for (const candidate of DEFAULT_SBCL_PATH_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "sbcl";
}

function buildSbclSpawnEnvironment(): NodeJS.ProcessEnv {
  const fallbackPath = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin"
  ].join(":");
  const inheritedPath = process.env.PATH?.trim();

  return {
    ...process.env,
    PATH: inheritedPath ? `${fallbackPath}:${inheritedPath}` : fallbackPath
  };
}

async function appendBridgeLaunchLog(message: string): Promise<void> {
  const logPath =
    process.env.SBCL_AGENT_UX_DEBUG_LOG_PATH?.trim() ||
    resolve(os.homedir(), ".sbcl-agent-ux-launch.log");
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    await appendFile(logPath, line, "utf8");
  } catch {
    // Ignore logging failures to avoid masking the launch failure.
  }
}

function firstExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveUxProjectDir(): string {
  const configured = process.env.SBCL_AGENT_UX_PROJECT_DIR?.trim();
  const candidates = [
    configured ?? "",
    process.cwd(),
    resolve(process.cwd(), "../sbcl-agent-ux"),
    resolve(__dirname, "../../../../../../../../")
  ];
  const resolved = firstExistingPath(
    candidates.filter((candidate) => candidate.length > 0).map((candidate) => resolve(candidate, "package.json"))
  );

  if (!resolved) {
    return process.cwd();
  }

  return dirname(resolved);
}

function resolveSbclAgentProjectDir(): string {
  const configured = process.env.SBCL_AGENT_PROJECT_DIR?.trim();
  const uxProjectDir = resolveUxProjectDir();
  const candidates = [
    configured ?? "",
    resolve(process.cwd(), "../sbcl-agent"),
    resolve(uxProjectDir, "../sbcl-agent"),
    "/Volumes/data/development/sbcl-agent"
  ];
  const resolved = firstExistingPath(
    candidates.filter((candidate) => candidate.length > 0).map((candidate) => resolve(candidate, "sbcl-agent.asd"))
  );

  if (!resolved) {
    return candidates.find((candidate) => candidate.length > 0) ?? resolve(process.cwd(), "../sbcl-agent");
  }

  return dirname(resolved);
}

function resolveBridgePath(uxProjectDir: string): string {
  const configured = process.env.SBCL_AGENT_BRIDGE_PATH?.trim();
  const candidates = [
    configured ?? "",
    resolve(uxProjectDir, "scripts/live-service-bridge.lisp")
  ];
  return firstExistingPath(candidates.filter((candidate) => candidate.length > 0)) ??
    resolve(uxProjectDir, "scripts/live-service-bridge.lisp");
}

const DEFAULT_LIVE_BINDING: BindingDto = {
  environmentId: "live-environment",
  sessionId: "desktop-session-live"
};

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

function bridgeRequestJson(request: Record<string, unknown> | undefined): string | null {
  if (!request) {
    return null;
  }

  return JSON.stringify(request);
}

function universalTimeToIso(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date((value - 2208988800) * 1000).toISOString();
  }

  return new Date().toISOString();
}

function normalizeWaitReason(waitReason: unknown): string | null {
  const raw = typeof waitReason === "string" ? waitReason : null;
  if (!raw) {
    return null;
  }

  switch (raw) {
    case "approvalRequired":
    case "approval_required":
    case "awaitingApproval":
      return "approvalRequired";
    case "pendingValidation":
    case "pending_validation":
      return "pendingValidation";
    case "coldValidationRequired":
    case "cold_validation_required":
      return "coldValidationRequired";
    case "operatorReviewRequired":
    case "operator_review_required":
      return "operatorReviewRequired";
    case "ready":
      return "ready";
    default:
      return raw;
  }
}

function normalizeWorkflowPhase(value: unknown): string | null {
  const phase = typeof value === "string" ? value : null;
  if (!phase) {
    return null;
  }

  switch (phase) {
    case "approval":
    case "awaitingApproval":
      return "approval";
    case "operatorReview":
    case "operator_review":
      return "operatorReview";
    default:
      return phase;
  }
}

function normalizeWorkStatus(status: unknown): string | null {
  const raw = typeof status === "string" ? status : null;
  if (!raw) {
    return null;
  }

  switch (raw) {
    case "awaitingApproval":
    case "awaiting_approval":
      return "awaitingApproval";
    default:
      return raw;
  }
}

function linkedEntity(
  entityType: "artifact" | "approval" | "incident" | "work-item" | "operation",
  entityId: string | null | undefined,
  label: string
) {
  return entityId
    ? {
        entityType,
        entityId,
        label
      }
    : null;
}

function turnStateFromRawStatus(status: string | undefined): TurnState {
  switch (status) {
    case "awaitingApproval":
      return "awaiting_approval";
    case "interrupted":
      return "interrupted";
    case "failed":
      return "failed";
    case "inProgress":
    case "running":
    case "active":
      return "running";
    case "completed":
      return "completed";
    default:
      return "background";
  }
}

function threadStateFromRawStatus(status: string | undefined, latestTurnState: TurnState): ThreadSummaryDto["state"] {
  if (status === "active") {
    if (latestTurnState === "awaiting_approval") {
      return "waiting";
    }
    if (latestTurnState === "interrupted" || latestTurnState === "failed") {
      return "blocked";
    }
    return "active";
  }

  return "background";
}

function messageRoleFromRaw(role: string | undefined): "user" | "assistant" | "system" {
  if (role === "user" || role === "assistant") {
    return role;
  }
  return "system";
}

function countEventKind(
  eventSummary: Record<string, unknown>,
  matcher: (kind: string) => boolean
): number {
  return asRecordArray(eventSummary.kindCounts).reduce((total, entry) => {
    const kind = String(entry.kind ?? "");
    const count = Number(entry.count ?? 0);
    return matcher(kind) ? total + count : total;
  }, 0);
}

function postureStateFromCount(count: number): TruthPostureDto["state"] {
  if (count > 0) {
    return "active";
  }

  return "steady";
}

function toTruthPosture(
  domain: TruthPostureDto["domain"],
  label: string,
  posture: string,
  summary: string,
  countA: number,
  countB = 0
): TruthPostureDto {
  return {
    domain,
    label,
    posture,
    summary,
    state: countA > 0 || countB > 0 ? "active" : "steady",
    counts: {
      active: countA,
      pending: countB,
      blocked: 0
    }
  };
}

function adaptEnvironmentSummaryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<EnvironmentSummaryDto> {
  const data = response.data;
  const runtimeState = (data.runtimeState as Record<string, unknown> | undefined) ?? {};
  const workflowState = (data.workflowState as Record<string, unknown> | undefined) ?? {};
  const agentState = (data.agentState as Record<string, unknown> | undefined) ?? {};
  const operatorStatus = (data.operatorStatus as Record<string, unknown> | undefined) ?? {};
  const incidentSummary = (data.incidentSummary as Record<string, unknown> | undefined) ?? {};

  const environmentId = (data.id as string | undefined) ?? "live-environment";
  const environmentLabel = basename((data.storageRoot as string | undefined) ?? environmentId) || environmentId;
  const workItemCount = Number(data.workItemCount ?? 0);
  const artifactCount = Number(data.artifactCount ?? 0);
  const threadCount = Number(data.threadCount ?? 0);
  const incidentCount = Number(data.incidentCount ?? incidentSummary.count ?? 0);
  const runtimeCount = Number(data.runtimeCount ?? 0);
  const blockedCount = Number(operatorStatus.blockedCount ?? 0);
  const readyCount = Number(operatorStatus.readyCount ?? 0);
  const eventSummary = (data.eventSummary as Record<string, unknown> | undefined) ?? {};
  const interruptedTurns =
    countEventKind(eventSummary, (kind) => kind.includes("interrupted")) +
    countEventKind(eventSummary, (kind) => kind.includes("awaitingApproval"));

  return {
    contractVersion: response.contractVersion,
    domain: "environment",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      environmentId,
      environmentLabel,
      sourcePosture: toTruthPosture(
        "source",
        "Source Truth",
        workItemCount > 0 ? "Governed Work Attached" : "Stable",
        `The environment currently tracks ${workItemCount} governed work items and ${artifactCount} durable artifacts.`,
        workItemCount,
        artifactCount
      ),
      imagePosture: toTruthPosture(
        "image",
        "Image Truth",
        runtimeCount > 0 ? "Live Runtime Bound" : "No Runtime Bound",
        `The environment exposes ${runtimeCount} runtimes with package ${
          (runtimeState.package as string | undefined) ?? "unknown"
        }.`,
        runtimeCount,
        Number(runtimeState.loadedSystemCount ?? 0)
      ),
      workflowPosture: {
        domain: "workflow",
        label: "Workflow Truth",
        posture: blockedCount > 0 ? "Closure Withheld" : "Governed",
        summary: `Workflow posture reports ${readyCount} ready items and ${blockedCount} blocked items.`,
        state: blockedCount > 0 ? "warning" : "steady",
        counts: {
          active: readyCount,
          blocked: blockedCount,
          pending: Number(workflowState.workItemCount ?? workItemCount)
        }
      },
      attention: {
        approvalsAwaiting: Number(operatorStatus.outstandingApprovalCount ?? 0),
        openIncidents: Number(operatorStatus.openIncidentCount ?? incidentCount),
        blockedWork: blockedCount,
        interruptedTurns,
        activeStreams: Number(eventSummary.providerStreamCount ?? 0)
      },
      activeContext: {
        environmentLabel,
        runtimeLabel: ((runtimeState.package as string | undefined) ?? "No Runtime").toString(),
        focusSummary:
          ((data.plan as string | undefined) ??
            `The active environment tracks ${threadCount} threads, ${workItemCount} work items, and ${incidentCount} incidents.`).toString(),
        environmentRoot: (data.storageRoot as string | undefined) ?? undefined,
        runtimePackage: (runtimeState.package as string | undefined) ?? undefined,
        currentThreadTitle: (data.activeThreadId as string | undefined) ?? undefined,
        currentTurnSummary: (data.activeRuntimeId as string | undefined) ?? undefined
      },
      recentArtifacts: [
        {
          artifactId: `artifact-summary-${environmentId}`,
          title: "Artifact Summary",
          kind: "summary",
          summary: `The environment currently exposes ${artifactCount} durable artifacts.`,
          updatedAt: new Date().toISOString()
        }
      ],
      activeTasks: [
        {
          taskId: `task-live-${environmentId}`,
          title: "Live Environment Projection",
          state: blockedCount > 0 ? "blocked" : "active",
          summary: `Projection is derived from the real sbcl-agent environment summary for ${environmentLabel}.`
        }
      ],
      activeWorkers: [
        {
          workerId: "worker-live-adapter",
          label: "Live Service Adapter",
          state: "active",
          responsibility: `Bridging the desktop shell to ${response.metadata.readModel ?? "service contracts"}.`
        },
        {
          workerId: "worker-agent-state",
          label: "Environment Agent State",
          state: postureStateFromCount(Number(agentState.agentCount ?? data.agentCount ?? 0)) === "active" ? "active" : "idle",
          responsibility: `Tracking ${Number(agentState.agentCount ?? data.agentCount ?? 0)} agent actors in the live environment.`
        }
      ],
      incidents:
        incidentCount > 0
          ? [
              {
                incidentId: `incident-summary-${environmentId}`,
                title: "Live Incident Summary",
                severity: Number(operatorStatus.openIncidentCount ?? 0) > 0 ? "high" : "moderate",
                state: Number(operatorStatus.openIncidentCount ?? 0) > 0 ? "open" : "recovering",
                updatedAt: new Date().toISOString()
              }
            ]
          : [],
      approvals:
        Number(operatorStatus.outstandingApprovalCount ?? 0) > 0
          ? [
              {
                requestId: `approval-summary-${environmentId}`,
                title: "Outstanding Approvals",
                summary: `${Number(operatorStatus.outstandingApprovalCount ?? 0)} approval obligations remain open in the live environment.`,
                state: "awaiting",
                createdAt: new Date().toISOString()
              }
            ]
          : [],
      alignmentState: adaptAlignmentState(asRecord(data.alignmentState)),
      reconciliationDecision: adaptReconciliationDecision(asRecord(data.reconciliationDecision))
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptEnvironmentStatusResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<EnvironmentStatusDto> {
  const data = response.data;
  const environment = (data.environment as Record<string, unknown> | undefined) ?? {};
  const operatorPosture = (data.operatorPosture as Record<string, unknown> | undefined) ?? {};
  const activeRuntime = (data.activeRuntime as Record<string, unknown> | undefined) ?? {};
  const openIncidentCount = Number(operatorPosture.openIncidentCount ?? 0);
  const blockedCount = Number(operatorPosture.blockedCount ?? 0);

  return {
    contractVersion: response.contractVersion,
    domain: "environment",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      environmentId: (environment.id as string | undefined) ?? "live-environment",
      environmentLabel:
        basename((environment.storageRoot as string | undefined) ?? "") ||
        ((environment.id as string | undefined) ?? "live-environment"),
      connectionState: environment.hasSessionP ? "bound" : "unbound",
      hostState: "ready",
      runtimeState: openIncidentCount > 0 ? "recovering" : Number(activeRuntime.runtimeCount ?? 0) > 0 ? "warm" : "cooling",
      workflowState: blockedCount > 0 ? "attention_required" : "governed",
      lastUpdatedAt: new Date().toISOString(),
      alignmentState: adaptAlignmentState(asRecord(data.alignmentState)),
      reconciliationDecision: adaptReconciliationDecision(asRecord(data.reconciliationDecision))
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptWorkspaceSummaryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<WorkspaceSummaryDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "rgp",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: camelizeKeys(response.data) as WorkspaceSummaryDto,
    metadata: normalizeMetadata(response.metadata)
  };
}

function normalizeCommandStatus(
  status: RawServiceResponse["status"]
): CommandResultDto<unknown>["status"] {
  switch (status) {
    case "awaiting-approval":
      return "awaiting_approval";
    case "rejected":
      return "rejected";
    case "error":
      return "error";
    default:
      return "ok";
  }
}

function adaptDesktopModelResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<DesktopModelDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "shell",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: camelizeKeys(response.data) as DesktopModelDto,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptDesktopActionResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<DesktopActionResultDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "shell",
    operation: response.operation,
    kind: "command",
    status: normalizeCommandStatus(response.status),
    data: camelizeKeys(response.data) as DesktopActionResultDto,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptDesktopRestoreResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<DesktopRestoreResultDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "shell",
    operation: response.operation,
    kind: "command",
    status: normalizeCommandStatus(response.status),
    data: camelizeKeys(response.data) as DesktopRestoreResultDto,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptRuntimeSummaryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<RuntimeSummaryDto> {
  const data = response.data;
  const runtimeDomain = (data.runtimeDomain as Record<string, unknown> | undefined) ?? {};
  const packageDetails = (data.packageDetails as Record<string, unknown> | undefined) ?? {};
  const currentPackage = ((data.package as string | undefined) ?? "CL-USER").toString();
  const loadedSystems = (data.loadedSystems as string[] | undefined) ?? [];
  const loadedSystemEntries: RuntimeSystemEntryDto[] = loadedSystems.map((systemName) => ({
    name: systemName,
    type: "asdf-system",
    status: "loaded"
  }));

  const scopes: RuntimeScopeSummaryDto[] = [
    {
      scopeId: `scope-package-${currentPackage.toLowerCase()}`,
      packageName: currentPackage,
      kind: "package",
      summary: `Active runtime package projected from the live sbcl-agent runtime summary.`
    }
  ];

  const nicknames = packageDetails.nicknames as string[] | undefined;
  if (nicknames?.length) {
    scopes.push({
      scopeId: `scope-package-nicknames-${currentPackage.toLowerCase()}`,
      packageName: currentPackage,
      symbolName: nicknames.join(", "),
      kind: "definition",
      summary: "Package nicknames projected from the live runtime package details."
    });
  }

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      runtimeId: ((data.runtimeId as string | undefined) ?? "runtime-live").toString(),
      runtimeLabel: "Live sbcl-agent Runtime",
      currentPackage,
      loadedSystemCount: Number(data.loadedSystemCount ?? loadedSystems.length),
      loadedSystems,
      loadedSystemEntries,
      divergencePosture:
        ((runtimeDomain.summary as string | undefined) ??
          `The live runtime is currently focused on package ${currentPackage}.`).toString(),
      sourceRelationship:
        "Live mode is projecting the runtime service contract directly from sbcl-agent rather than a mock image.",
      activeMutations: 0,
      linkedIncidentIds: [],
      scopes
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptPackageManagementSummaryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<PackageManagementSummaryDto> {
  const data = camelizeKeys(response.data) as Record<string, unknown>;
  const normalizedData: PackageManagementSummaryDto = {
    packageManager: typeof data.packageManager === "string" ? data.packageManager : "unknown",
    projectDir: typeof data.projectDir === "string" ? data.projectDir : null,
    workingDirectory: typeof data.workingDirectory === "string" ? data.workingDirectory : null,
    quicklispAvailableP: Boolean(data.quicklispAvailableP),
    qlotAvailableP: Boolean(data.qlotAvailableP),
    qlotExecutablePath: typeof data.qlotExecutablePath === "string" ? data.qlotExecutablePath : null,
    qlotProjectRoot: typeof data.qlotProjectRoot === "string" ? data.qlotProjectRoot : null,
    loadedSetupCount: Number(data.loadedSetupCount ?? 0),
    loadedSetupPaths: Array.isArray(data.loadedSetupPaths) ? (data.loadedSetupPaths as string[]) : [],
    sourceRegistryDirectoryCount: Number(data.sourceRegistryDirectoryCount ?? 0),
    sourceRegistryDirectories: Array.isArray(data.sourceRegistryDirectories)
      ? (data.sourceRegistryDirectories as string[])
      : [],
    managedSourceRegistryPath:
      typeof data.managedSourceRegistryPath === "string" ? data.managedSourceRegistryPath : "",
    managedSourceRegistryEntryCount: Number(data.managedSourceRegistryEntryCount ?? 0),
    managedSourceRegistryEntries: Array.isArray(data.managedSourceRegistryEntries)
      ? (data.managedSourceRegistryEntries as PackageManagementSummaryDto["managedSourceRegistryEntries"])
      : [],
    localProjectsRoot: typeof data.localProjectsRoot === "string" ? data.localProjectsRoot : "",
    localProjectCount: Number(data.localProjectCount ?? 0),
    localProjects: Array.isArray(data.localProjects)
      ? (data.localProjects as PackageManagementSummaryDto["localProjects"])
      : []
  };
  return {
    contractVersion: response.contractVersion,
    domain: "package-management",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: normalizedData,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptPackageManagementCommandResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<PackageManagementCommandResultDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "package-management",
    operation: response.operation,
    kind: "command",
    status: normalizeCommandStatus(response.status),
    data: camelizeKeys(response.data) as PackageManagementCommandResultDto,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptDesktopTaskManifest(item: Record<string, unknown>): DesktopTaskManifestDto {
  const normalized = camelizeKeys(item) as Record<string, unknown>;
  return {
    id: firstString(normalized.id) ?? "unknown/unknown",
    target: firstString(normalized.target) ?? "unknown",
    operation: firstString(normalized.operation) ?? "unknown",
    capability: firstString(normalized.capability),
    description: firstString(normalized.description),
    requestSchema: asRecord(normalized.requestSchema),
    resultSchema: asRecord(normalized.resultSchema),
    approvalPolicy: firstString(normalized.approvalPolicy),
    executionMode: firstString(normalized.executionMode),
    retryPolicy: asRecord(normalized.retryPolicy),
    backendKind: firstString(normalized.backendKind),
    backendRef: firstString(normalized.backendRef),
    version: typeof normalized.version === "number" ? normalized.version : null,
    tags: asStringArray(normalized.tags),
    discoverableP: Boolean(normalized.discoverableP ?? normalized.discoverable),
    metadata: asRecord(normalized.metadata)
  };
}

function adaptDesktopTaskRecord(item: Record<string, unknown>): DesktopTaskRecordDto {
  const normalized = camelizeKeys(item) as Record<string, unknown>;
  return {
    id: firstString(normalized.id) ?? "desktop-task-record-unknown",
    protocolVersion: typeof normalized.protocolVersion === "number" ? normalized.protocolVersion : null,
    requestId: firstString(normalized.requestId),
    requester: firstString(normalized.requester),
    target: firstString(normalized.target) ?? "unknown",
    operation: firstString(normalized.operation) ?? "unknown",
    capability: firstString(normalized.capability),
    backendKind: firstString(normalized.backendKind),
    backendRef: firstString(normalized.backendRef),
    status: firstString(normalized.status) ?? "unknown",
    governanceStatus: firstString(normalized.governanceStatus),
    approvalStatus: firstString(normalized.approvalStatus),
    approvalId: firstString(normalized.approvalId),
    sessionId: firstString(normalized.sessionId),
    retryPolicy: asRecord(normalized.retryPolicy),
    retryCount: typeof normalized.retryCount === "number" ? normalized.retryCount : null,
    maxAttempts: typeof normalized.maxAttempts === "number" ? normalized.maxAttempts : null,
    retryableP:
      typeof normalized.retryableP === "boolean"
        ? normalized.retryableP
        : typeof normalized.retryable === "boolean"
          ? normalized.retryable
          : null,
    idempotencyKey: firstString(normalized.idempotencyKey),
    threadId: firstString(normalized.threadId),
    turnId: firstString(normalized.turnId),
    conversationOperationId: firstString(normalized.conversationOperationId),
    actorMessageId: firstString(normalized.actorMessageId, asRecord(normalized.actorMessage).id),
    actorSlice: firstString(normalized.actorSlice),
    actorMessage: asRecord(normalized.actorMessage),
    requestMetadata: asRecord(normalized.requestMetadata),
    createdAt: firstString(normalized.createdAt),
    approvedAt: firstString(normalized.approvedAt),
    startedAt: firstString(normalized.startedAt),
    completedAt: firstString(normalized.completedAt),
    lastError: asRecord(normalized.lastError),
    resolution: asRecord(normalized.resolution),
    result: asRecord(normalized.result),
    metadata: asRecord(normalized.metadata)
  };
}

function adaptDesktopTaskManifestListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<DesktopTaskManifestDto[]> {
  return {
    contractVersion: response.contractVersion,
    domain: response.domain,
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: asRecordArray(response.data).map(adaptDesktopTaskManifest),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptDesktopTaskRecordListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<DesktopTaskRecordDto[]> {
  return {
    contractVersion: response.contractVersion,
    domain: "desktop-task",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: Array.isArray(response.data) ? response.data.map(adaptDesktopTaskRecord) : [],
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptMcpServerConfig(item: Record<string, unknown>): McpServerConfigDto {
  const normalized = camelizeKeys(item) as Record<string, unknown>;
  return {
    id: firstString(normalized.id) ?? "mcp-server",
    name: firstString(normalized.name) ?? "MCP Server",
    transport: firstString(normalized.transport) ?? "stdio",
    command: firstString(normalized.command),
    arguments: asStringArray(normalized.arguments),
    environmentVariables: asRecord(normalized.environmentVariables) as Record<string, string> | null,
    workingDirectory: firstString(normalized.workingDirectory),
    endpoint: firstString(normalized.endpoint),
    capabilities: asStringArray(normalized.capabilities),
    retryPolicy: asRecord(normalized.retryPolicy),
    healthStatus: firstString(normalized.healthStatus),
    enabledP: Boolean(normalized.enabledP ?? normalized.enabled),
    discoverableP: Boolean(normalized.discoverableP ?? normalized.discoverable),
    createdAt: firstString(normalized.createdAt),
    updatedAt: firstString(normalized.updatedAt),
    operationCount: typeof normalized.operationCount === "number" ? normalized.operationCount : 0,
    operations: asRecordArray(normalized.operations).map(adaptDesktopTaskManifest),
    metadata: asRecord(normalized.metadata)
  };
}

function adaptMcpServerConfigListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<McpServerConfigDto[]> {
  return {
    contractVersion: response.contractVersion,
    domain: response.domain,
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: asRecordArray(response.data).map(adaptMcpServerConfig),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptMcpServerConfigDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<McpServerConfigDto> {
  return {
    contractVersion: response.contractVersion,
    domain: response.domain,
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: adaptMcpServerConfig(asRecord(response.data)),
    metadata: normalizeMetadata(response.metadata)
  };
}


function rawProcessStateToDtoState(value: string | undefined): RuntimeTelemetryProcessDto["state"] {
  switch (value) {
    case "running":
    case "active":
      return "running";
    case "waiting":
    case "queued":
      return "waiting";
    case "idle":
      return "idle";
    case "blocked":
      return "blocked";
    case "complete":
    case "completed":
      return "completed";
    case "failed":
    case "interrupted":
      return "failed";
    case "stopped":
    case "detached":
    case "revoked":
      return "stopped";
    default:
      return "idle";
  }
}

async function adaptRuntimeTelemetryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>> {
  const data = asRecord(response.data);
  const runtimePid = Number(data.runtimePid ?? 0) || null;
  const processEntries = asRecordArray(data.processes);
  const processes: RuntimeTelemetryProcessDto[] = [];

  for (const entry of processEntries) {
    const pid = Number(entry.pid ?? 0) || null;
    const sampled = await sampleProcessUsage(pid);
    processes.push({
      processId: String(entry.processId ?? "process"),
      kind:
        (entry.kind as RuntimeTelemetryProcessDto["kind"] | undefined) ?? "runtime",
      label: String(entry.label ?? entry.processId ?? "Process"),
      state: rawProcessStateToDtoState(entry.state as string | undefined),
      summary: String(entry.summary ?? "Runtime-linked process."),
      pid,
      cpuPercent:
        sampled.cpuPercent ??
        (entry.cpuPercent !== undefined ? Number(entry.cpuPercent) : null),
      memoryMb:
        sampled.memoryMb ??
        (entry.memoryMb !== undefined ? Number(entry.memoryMb) : null),
      elapsed: sampled.elapsed ?? (entry.elapsed ? String(entry.elapsed) : null),
      command: sampled.command ?? (entry.command ? String(entry.command) : null),
      workItemId: entry.workItemId ? String(entry.workItemId) : null,
      threadId: entry.threadId ? String(entry.threadId) : null,
      turnId: entry.turnId ? String(entry.turnId) : null,
      incidentId: entry.incidentId ? String(entry.incidentId) : null,
      workflowRecordId: entry.workflowRecordId ? String(entry.workflowRecordId) : null,
      controlToken: entry.controlToken ? String(entry.controlToken) : null
    });
  }

  const rssMb = processes.find((entry) => entry.pid === runtimePid)?.memoryMb ?? null;
  const cpuPercent = processes.find((entry) => entry.pid === runtimePid)?.cpuPercent ?? null;
  const openConnectionCount = await sampleOpenConnectionCount(runtimePid);
  const hostNetworkBytes = await sampleHostNetworkBytes();
  const diskThroughput = await sampleHostDiskThroughputKbps();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const systemUsedPercent =
    totalMem > 0 ? Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)) : null;

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      runtimeId: String(data.runtimeId ?? "runtime-live"),
      sampledAt: universalTimeToIso(data.sampledAt),
      runtimePid,
      cpu: {
        utilizationPercent: cpuPercent,
        coreCount: os.cpus().length,
        loadAverage1m: os.loadavg()[0] ?? null,
        loadAverage5m: os.loadavg()[1] ?? null,
        loadAverage15m: os.loadavg()[2] ?? null,
        summary:
          cpuPercent !== null
            ? `Runtime process CPU is currently ${cpuPercent.toFixed(1)}%.`
            : "CPU telemetry is available at the host level, but no runtime process sample was captured."
      },
      memory: {
        rssMb,
        heapUsedMb: Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(1)),
        heapTotalMb: Number((process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(1)),
        systemUsedPercent,
        summary:
          rssMb !== null
            ? `Runtime RSS is currently ${rssMb.toFixed(1)} MB.`
            : "Memory telemetry is available at the host level, but no runtime process sample was captured."
      },
      network: {
        openConnectionCount,
        interfaceCount: Object.keys(os.networkInterfaces()).length,
        summary:
          openConnectionCount !== null && hostNetworkBytes
            ? `${openConnectionCount} open runtime connections are visible; host interfaces have moved ${Math.round(
                hostNetworkBytes.inboundBytes / (1024 * 1024)
              )} MB in and ${Math.round(hostNetworkBytes.outboundBytes / (1024 * 1024))} MB out since boot.`
            : openConnectionCount !== null
              ? `${openConnectionCount} open network connections are currently associated with the runtime process.`
              : hostNetworkBytes
                ? `Per-process connections are unavailable, but host interfaces have moved ${Math.round(
                    hostNetworkBytes.inboundBytes / (1024 * 1024)
                  )} MB in and ${Math.round(hostNetworkBytes.outboundBytes / (1024 * 1024))} MB out since boot.`
                : "Interface-level network posture is available, but per-process connection sampling is unavailable on this host."
      },
      disk: {
        readKbps: diskThroughput?.readKbps ?? null,
        writeKbps: diskThroughput?.writeKbps ?? null,
        summary:
          diskThroughput
            ? `Host disk throughput is currently about ${diskThroughput.readKbps.toFixed(0)} KB/s read and ${diskThroughput.writeKbps.toFixed(0)} KB/s write.`
            : "Disk I/O domain is present, but host-level throughput sampling is unavailable on this host."
      },
      processes,
      activitySummary: String(
        data.activitySummary ??
          `${processes.length} runtime-linked processes are visible from the governed environment.`
      )
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptRuntimeEvalResponse(
  response: RawServiceResponse<Record<string, unknown>>,
  input: {
    form: string;
    packageName?: string;
    recoveryLaunch?: {
      source: "incident-restart";
      incidentId: string;
      restartLabel: string;
    } | null;
  }
): CommandResultDto<RuntimeEvalResultDto> {
  const data = asRecord(response.data);
  const metadata = normalizeMetadata(response.metadata);
  const rawResult = data.result;
  const normalizedResult = camelizeKeys(rawResult);
  const normalizedData = camelizeKeys(data) as Record<string, unknown>;
  const recoveryLaunchRecord =
    normalizedData.recoveryLaunch && typeof normalizedData.recoveryLaunch === "object"
      ? (normalizedData.recoveryLaunch as Record<string, unknown>)
      : null;
  const isError = response.status === "error";
  const fallbackFailureSummary = `Evaluation of ${input.form} in ${input.packageName ?? "the active package"} failed.`;
  const valuePreview =
    isError
      ? (typeof data.summary === "string" && data.summary.trim().length > 0
          ? data.summary
          : typeof data.title === "string" && data.title.trim().length > 0
            ? data.title
            : fallbackFailureSummary)
      : rawResult === undefined || rawResult === null
        ? null
        : typeof normalizedResult === "string"
          ? normalizedResult
          : JSON.stringify(normalizedResult, null, 2);

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.eval",
    kind: "command",
    status: isError ? "error" : "ok",
    data: {
      evaluationId:
        String(
          data.workItemId ??
            data.runtimeId ??
            metadata.runtimeId ??
            `${input.packageName ?? "runtime"}:${input.form}`
        ),
      outcome: isError ? "failed" : "ok",
      summary: String(
        isError
          ? data.summary ?? data.title ?? fallbackFailureSummary
          : rawResult === undefined
            ? `Evaluated ${input.form} in ${input.packageName ?? "the active package"}.`
            : `Evaluated ${input.form} in ${String(data.package ?? input.packageName ?? "the active package")}.`
      ),
      valuePreview,
      recoveryLaunch:
        recoveryLaunchRecord &&
        recoveryLaunchRecord.source === "incident-restart" &&
        typeof recoveryLaunchRecord.incidentId === "string" &&
        typeof recoveryLaunchRecord.restartLabel === "string"
          ? {
              source: "incident-restart",
              incidentId: recoveryLaunchRecord.incidentId,
              restartLabel: recoveryLaunchRecord.restartLabel
            }
          : input.recoveryLaunch ?? null,
      operationId: data.workItemId ? String(data.workItemId) : null,
      artifactIds: [],
      approvalId: null,
      incidentId: null
    },
    metadata
  };
}

function adaptRuntimeInspectionResponse(
  response: RawServiceResponse<Record<string, unknown>>,
  input: {
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }
): QueryResultDto<RuntimeInspectionResultDto> {
  const data = asRecord(response.data);
  const packageName = String(data.package ?? input.packageName ?? "CL-USER");
  const runtimePresence = data.runtimePresence
    ? JSON.stringify(camelizeKeys(data.runtimePresence))
    : null;

  const items =
    input.mode === "describe"
      ? [
          { label: "Home Package", detail: String(data.homePackage ?? "Unknown"), emphasis: "package" },
          { label: "Status", detail: String(data.status ?? "unknown"), emphasis: null },
          { label: "Value Binding", detail: String(Boolean(data.boundp)), emphasis: "boundp" },
          { label: "Function Binding", detail: String(Boolean(data.fboundp)), emphasis: "fboundp" },
          { label: "Constant", detail: String(Boolean(data.constantp)), emphasis: "constantp" }
        ]
      : input.mode === "definitions"
        ? asRecordArray(data.definitions).map((entry) => ({
            label: String(entry.kind ?? "definition"),
            detail: String(entry.path ?? entry.location ?? JSON.stringify(entry)),
            emphasis: entry.line ? `line ${String(entry.line)}` : null,
            path: entry.path ? String(entry.path) : null,
            line: entry.line ? Number(entry.line) : null
          }))
        : input.mode === "callers"
          ? asRecordArray(data.callers).map((entry) => ({
              label: String(entry.kind ?? "caller"),
              detail: String(entry.path ?? entry.location ?? JSON.stringify(entry)),
              emphasis: entry.line ? `line ${String(entry.line)}` : null,
              path: entry.path ? String(entry.path) : null,
              line: entry.line ? Number(entry.line) : null
            }))
          : input.mode === "methods"
            ? asRecordArray(data.methods).map((entry) => ({
                label: "Method",
                detail: JSON.stringify(camelizeKeys(entry)),
                emphasis: null
              }))
            : [
                {
                  label: "Divergence",
                  detail: String(data.divergence ?? "unknown"),
                  emphasis: data.openWorkItemId ? String(data.openWorkItemId) : null
                },
                {
                  label: "Runtime Presence",
                  detail: runtimePresence ?? "No runtime presence summary recorded.",
                  emphasis: null
                }
              ];

  const summary =
    input.mode === "describe"
      ? `${input.symbol} is available for live object inspection in ${packageName}.`
      : input.mode === "definitions"
        ? `${input.symbol} source definitions are available for live navigation.`
        : input.mode === "callers"
          ? `${input.symbol} caller relationships are available from the current workspace.`
          : input.mode === "methods"
            ? `${input.symbol} method dispatch information is available from the live image.`
            : `${input.symbol} source/image divergence can be checked from the current runtime.`;

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.inspect_symbol",
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      inspectionId: `${input.mode}:${packageName}:${input.symbol}`,
      mode: input.mode,
      symbol: input.symbol,
      packageName,
      summary,
      runtimePresence,
      divergence: data.divergence ? String(data.divergence) : null,
      items
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptRuntimeEntityDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>,
  input: {
    symbol: string;
    packageName?: string;
  }
): QueryResultDto<RuntimeEntityDetailDto> {
  const data = asRecord(response.data);
  const packageName = String(data.package ?? input.packageName ?? "CL-USER");
  const entityKind = (() => {
    const kind = String(data.entityKind ?? "unknown");
    if (
      kind === "generic-function" ||
      kind === "class" ||
      kind === "macro" ||
      kind === "function" ||
      kind === "variable" ||
      kind === "package" ||
      kind === "object"
    ) {
      return kind as RuntimeEntityDetailDto["entityKind"];
    }
    return "unknown" as const;
  })();

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.entity_detail",
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      entityId: `${packageName}:${input.symbol}`,
      symbol: String(data.symbol ?? input.symbol),
      packageName,
      entityKind,
      signature: data.signature ? String(data.signature) : null,
      summary: String(data.summary ?? `${input.symbol} is available for live browser detail.`),
      facets: asRecordArray(data.facets).map((entry) => ({
        label: String(entry.label ?? "Facet"),
        value: String(entry.value ?? "")
      })),
      relatedItems: asRecordArray(data.relatedItems).map((entry) => ({
        label: String(entry.label ?? "Item"),
        detail: String(entry.detail ?? JSON.stringify(camelizeKeys(entry))),
        emphasis: entry.emphasis ? String(entry.emphasis) : null,
        path: entry.path ? String(entry.path) : null,
        line: entry.line ? Number(entry.line) : null
      }))
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptPackageBrowserResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<PackageBrowserDto> {
  const data = asRecord(response.data);
  const externalSymbols = asRecordArray(
    (data.externalSymbols as Record<string, unknown>[] | undefined) ??
      (data.external_symbols as Record<string, unknown>[] | undefined)
  );
  const internalSymbols = asRecordArray(
    (data.internalSymbols as Record<string, unknown>[] | undefined) ??
      (data.internal_symbols as Record<string, unknown>[] | undefined)
  );
  const useList = asStringArray((data.useList as unknown[] | undefined) ?? (data.use_list as unknown[] | undefined));
  const availablePackages = asStringArray(
    (data.availablePackages as unknown[] | undefined) ?? (data.available_packages as unknown[] | undefined)
  );
  const adaptSymbol = (entry: Record<string, unknown>) => ({
    symbol: String(entry.symbol ?? "UNKNOWN"),
    kind: (() => {
      const kind = String(entry.kind ?? "unknown");
      if (
        kind === "function" ||
        kind === "variable" ||
        kind === "macro" ||
        kind === "class" ||
        kind === "generic-function"
      ) {
        return kind as "function" | "variable" | "macro" | "class" | "generic-function";
      }
      return "unknown" as const;
    })(),
    visibility: (String(entry.visibility ?? "internal") === "external" ? "external" : "internal") as
      | "external"
      | "internal"
  });

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.package_browser",
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      packageName: String(data.package ?? "CL-USER"),
      availablePackages,
      nicknames: asStringArray(data.nicknames),
      useList,
      externalSymbols: externalSymbols.map(adaptSymbol),
      internalSymbols: internalSymbols.map(adaptSymbol),
      summary: String(data.summary ?? "Package browser data projected from the live runtime.")
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptRuntimeSymbolPageResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<RuntimeSymbolBrowserPageDto> {
  const data = asRecord(response.data);
  const items = asRecordArray(data.items).map((entry) => ({
    symbol: String(entry.symbol ?? "UNKNOWN"),
    packageName: String(entry.packageName ?? entry.package_name ?? "CL-USER"),
    kind: (() => {
      const kind = String(entry.kind ?? "unknown");
      if (
        kind === "function" ||
        kind === "variable" ||
        kind === "macro" ||
        kind === "class" ||
        kind === "generic-function"
      ) {
        return kind as "function" | "variable" | "macro" | "class" | "generic-function";
      }
      return "unknown" as const;
    })(),
    visibility: (String(entry.visibility ?? "internal") === "external" ? "external" : "internal") as
      | "external"
      | "internal"
  }));
  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.symbol_page",
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      packageScope: (data.packageScope as string | null | undefined) ?? (data.package_scope as string | null | undefined) ?? null,
      availablePackages: asStringArray(
        (data.availablePackages as unknown[] | undefined) ?? (data.available_packages as unknown[] | undefined)
      ),
      nicknames: asStringArray(data.nicknames),
      useList: asStringArray((data.useList as unknown[] | undefined) ?? (data.use_list as unknown[] | undefined)),
      totalCount: Number(data.totalCount ?? data.total_count ?? items.length),
      offset: Number(data.offset ?? 0),
      limit: Number(data.limit ?? items.length),
      hasMore: Boolean(data.hasMore ?? data.has_more ?? false),
      items,
      summary: String(data.summary ?? "Paged runtime symbol browser response.")
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptEventStreamResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<EnvironmentEventDto[]> {
  const data = response.data;
  const events = asRecordArray(data.events).map((event) => ({
    cursor: Number(event.cursor ?? 0),
    kind: String(event.kind ?? "event"),
    timestamp: String(event.timestamp ?? new Date().toISOString()),
    family: String(event.family ?? "environment"),
    summary: `${String(event.family ?? "environment")} / ${String(event.kind ?? "event")}`,
    entityId: (event.entityId as string | null | undefined) ?? null,
    threadId: (event.threadId as string | null | undefined) ?? null,
    turnId: (event.turnId as string | null | undefined) ?? null,
    visibility: (event.visibility as string | null | undefined) ?? null,
    payload: adaptEnvironmentEventPayload(event.payload)
  }));

  return {
    contractVersion: response.contractVersion,
    domain: "observation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: events,
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptEnvironmentEventPayload(payload: unknown): Record<string, unknown> {
  const rawPayload = asRecord(payload);
  const normalizedPayload = camelizeKeys(rawPayload) as Record<string, unknown>;
  const nestedSummary = asRecord(rawPayload.eventSummary);

  if (Object.keys(nestedSummary).length === 0) {
    return normalizedPayload;
  }

  return {
    ...normalizedPayload,
    ...(camelizeKeys(nestedSummary) as Record<string, unknown>)
  };
}

function adaptConsoleLogStreamResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ConsoleLogStreamDto> {
  const data = response.data;
  const entries = asRecordArray(data.entries).map((entry) => ({
    entryId: String(entry.entryId ?? `${entry.cursor ?? 0}`),
    cursor: typeof entry.cursor === "number" ? entry.cursor : Number(entry.cursor ?? 0),
    plane: (entry.plane as ConsoleLogEntryDto["plane"] | undefined) ?? "environment",
    timestamp: String(entry.timestamp ?? new Date().toISOString()),
    type: (entry.type as ConsoleLogEntryDto["type"] | undefined) ?? "info",
    category: String(entry.category ?? "environment"),
    source: String(entry.source ?? "event"),
    message: String(entry.message ?? "Console entry"),
    processName: (entry.processName as string | null | undefined) ?? null,
    pid: typeof entry.pid === "number" ? entry.pid : null,
    threadId: firstString(entry.threadId) ?? null,
    activityId: firstString(entry.activityId) ?? null,
    environmentId: firstString(entry.environmentId) ?? null,
    runtimeId: firstString(entry.runtimeId) ?? null,
    workItemId: firstString(entry.workItemId) ?? null,
    workflowRecordId: firstString(entry.workflowRecordId) ?? null,
    incidentId: firstString(entry.incidentId) ?? null,
    threadRefId: firstString(entry.threadRefId) ?? null,
    turnRefId: firstString(entry.turnRefId) ?? null,
    visibility: firstString(entry.visibility) ?? null,
    detail:
      typeof entry.detail === "string"
        ? entry.detail
        : entry.detail != null
          ? JSON.stringify(entry.detail, null, 2)
          : null
  }));

  return {
    contractVersion: response.contractVersion,
    domain: "console",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      plane: (data.plane as ConsoleLogStreamDto["plane"] | undefined) ?? "environment",
      entries,
      nextCursor:
        typeof data.nextCursor === "number"
          ? data.nextCursor
          : data.nextCursor != null
            ? Number(data.nextCursor)
            : null,
      summary: String(data.summary ?? "Console stream projected from the live environment.")
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function consoleTypeForEnvironmentEvent(event: EnvironmentEventDto): ConsoleLogEntryDto["type"] {
  if (event.kind.includes("failed") || event.kind.includes("incident")) {
    return "error";
  }
  if (event.kind.includes("approval") || event.kind.includes("blocked") || event.kind.includes("waiting")) {
    return "warning";
  }
  if (event.family === "provider") {
    return "debug";
  }
  return "info";
}

function consoleMessageForEnvironmentEvent(event: EnvironmentEventDto): string {
  const payload = asRecord(event.payload);
  return firstString(
    payload.payload,
    payload.summary,
    payload.message,
    event.summary,
    `${event.family} / ${event.kind}`
  )!;
}

function consoleEntryFromEnvironmentEvent(
  environmentId: string | undefined,
  runtimeId: string | undefined,
  event: EnvironmentEventDto
): ConsoleLogEntryDto {
  return {
    entryId: `${environmentId ?? "live-environment"}:${event.cursor}`,
    cursor: event.cursor,
    plane: "environment",
    timestamp: event.timestamp,
    type: consoleTypeForEnvironmentEvent(event),
    category: event.family,
    source: event.kind,
    message: consoleMessageForEnvironmentEvent(event),
    processName: "sbcl-agent",
    pid: null,
    threadId: null,
    activityId: `${event.family}:${event.kind}`,
    environmentId: environmentId ?? null,
    runtimeId: runtimeId ?? null,
    workItemId: null,
    workflowRecordId: null,
    incidentId: null,
    threadRefId: event.threadId ?? null,
    turnRefId: event.turnId ?? null,
    visibility: event.visibility ?? null,
    detail: JSON.stringify(event.payload, null, 2)
  };
}


function adaptStreamingEnvironmentEvent(payload: unknown): EnvironmentEventDto {
  const event = asRecord(payload);
  return {
    cursor: Number(event.cursor ?? 0),
    kind: String(event.kind ?? "provider-stream"),
    timestamp: String(event.timestamp ?? new Date().toISOString()),
    family: String(event.family ?? "provider"),
    summary: String(event.summary ?? `${String(event.family ?? "provider")} / ${String(event.kind ?? "provider-stream")}`),
    entityId: (event.entityId as string | null | undefined) ?? null,
    threadId: (event.threadId as string | null | undefined) ?? null,
    turnId: (event.turnId as string | null | undefined) ?? null,
    visibility: (event.visibility as string | null | undefined) ?? null,
    payload: asRecord(event.payload)
  };
}

function summarizeWaitReason(waitReason: string | null | undefined): string {
  switch (normalizeWaitReason(waitReason)) {
    case "approvalRequired":
      return "Operator approval is required before the work can continue.";
    case "coldValidationRequired":
      return "Cold validation must complete before this work can close.";
    case "pendingValidation":
      return "Validation remains in progress before closure can proceed.";
    case "operatorReviewRequired":
      return "Operator review is required before this work can resume.";
    case "ready":
      return "This work item is ready to continue.";
    default:
      return "Governed follow-up remains attached to this work item.";
  }
}

function inferApprovalState(waitReason: string | null | undefined): ApprovalRequestSummaryDto["state"] {
  const normalized = normalizeWaitReason(waitReason);
  if (normalized === "approvalRequired") {
    return "awaiting";
  }
  if (normalized === "operatorReviewRequired") {
    return "denied";
  }
  return "approved";
}

function adaptApprovalListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<ApprovalRequestSummaryDto[]> {
  const items = asRecordArray(response.data);
  return {
    contractVersion: response.contractVersion,
    domain: "approval",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: items.map((item) => {
      const requirements = (item.approvalRequirements as Array<Record<string, unknown>> | undefined) ?? [];
      const primaryRequirement = requirements[0] ?? {};
      const policyId =
        firstString(primaryRequirement.policy, item.approvalPolicy, item.approval_policy, item.policyId, item.policy_id) ??
        "governed-action";
      const waitReason = normalizeWaitReason(
        firstString(item.waitReason, item.wait_reason, item.waitingOn, item.waiting_on)
      );

      return {
        requestId: String(item.id ?? "approval-request"),
        title: String(item.goal ?? "Approval Request"),
        summary: `${summarizeWaitReason(waitReason)} Policy: ${policyId}.`,
        state: inferApprovalState(waitReason),
        createdAt: universalTimeToIso(primaryRequirement.requestedAt ?? item.updatedAt ?? item.createdAt)
      };
    }),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptApprovalDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ApprovalRequestDto> {
  const data = asRecord(response.data);
  const wait = asRecord(data.wait);
  const workItem = asRecord(data.workItem);
  const workflowRecord = asRecord(data.workflowRecord);
  const approvalRequirements = (wait.approvalRequirements as Array<Record<string, unknown>> | undefined) ?? [];
  const primaryRequirement = approvalRequirements[0] ?? {};
  const waitReason = normalizeWaitReason(
    firstString(wait.why, wait.waitReason, wait.wait_reason, workItem.waitReason, workItem.wait_reason)
  );
  const policyId =
    firstString(
      primaryRequirement.policy,
      workItem.approvalPolicy,
      workItem.approval_policy,
      workflowRecord.policyId,
      workflowRecord.policy_id
    ) ?? null;
  const requestId = String(data.id ?? workItem.id ?? "approval-request");
  const linkedEntities = [
    linkedEntity("work-item", workItem.id as string | undefined, String(workItem.goal ?? "Work Item")),
    linkedEntity(
      "operation",
      workItem.workflowRecordRef as string | undefined,
      `Workflow ref ${String(workItem.workflowRecordRef ?? "")}`
    ),
    linkedEntity(
      "operation",
      workflowRecord.id as string | undefined,
      `Workflow record ${String(workflowRecord.id ?? "")}`
    )
  ].filter(Boolean) as LinkedEntityRefDto[];

  return {
    contractVersion: response.contractVersion,
    domain: "approval",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      requestId,
      title: String(workItem.goal ?? `Approval ${requestId}`),
      summary: summarizeWaitReason(waitReason),
      state: inferApprovalState(waitReason),
      requestedAction:
        (policyId && `Grant ${policyId} and resume governed work`) || "Resume governed work after approval",
      scopeSummary: wait.waitingOn
        ? `Workflow is currently waiting on ${String(wait.waitingOn)}`
        : "Governed work requires explicit operator action.",
      rationale:
        (primaryRequirement.reason as string | undefined) ??
        "This work item crossed a governed boundary and cannot continue without explicit operator authority.",
      policyId,
      consequenceSummary:
        waitReason === "approvalRequired"
          ? "Approving this request clears the approval gate so the work item can be resumed."
          : "This request no longer appears to be blocked on approval.",
      createdAt: universalTimeToIso(primaryRequirement.requestedAt ?? workItem.updatedAt),
      linkedEntities
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function incidentSeverity(kind: string | undefined): IncidentSummaryDto["severity"] {
  if (!kind) {
    return "moderate";
  }
  if (kind.includes("failure")) {
    return "high";
  }
  return "moderate";
}

function incidentState(status: string | undefined): IncidentSummaryDto["state"] {
  if (status === "resolved") {
    return "resolved";
  }
  if (status === "recovering") {
    return "recovering";
  }
  return "open";
}

function adaptIncidentListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<IncidentSummaryDto[]> {
  const items = asRecordArray(response.data);
  return {
    contractVersion: response.contractVersion,
    domain: "incident",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: items.map((item) => ({
      incidentId: String(item.id ?? "incident"),
      title: String(item.title ?? "Incident"),
      severity: incidentSeverity(item.kind as string | undefined),
      state: incidentState(item.status as string | undefined),
      updatedAt: universalTimeToIso(item.updatedAt ?? item.createdAt)
    })),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptIncidentDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<IncidentDetailDto> {
  const data = asRecord(response.data);
  const runtimeContext = asRecord(data.runtimeContext);
  const conditionDetail = asRecord(runtimeContext.conditionDetail);
  const recoveryPlan = asRecord(data.recoveryPlan);
  const remediationPlan = asRecord(data.remediationPlan);
  const wait = asRecord(data.wait);
  const recoveryNextAction = asRecord(recoveryPlan.nextAction);
  const recommendedAction =
    Array.isArray(data.recommendedActions) && data.recommendedActions.length > 0
      ? asRecord(data.recommendedActions[0])
      : null;
  const linkedEntities = [
    linkedEntity("work-item", data.workItemId as string | undefined, String(data.workItemId ?? "Work Item")),
    linkedEntity("operation", data.operationId as string | undefined, String(data.operationId ?? "Operation")),
    linkedEntity("operation", data.workflowRecordId as string | undefined, String(data.workflowRecordId ?? "Workflow")),
    linkedEntity("incident", data.id as string | undefined, String(data.kind ?? "Incident"))
  ].filter(Boolean) as LinkedEntityRefDto[];

  return {
    contractVersion: response.contractVersion,
    domain: "incident",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      incidentId: String(data.id ?? "incident"),
      title: String(data.title ?? "Incident"),
      summary: String(data.summary ?? data.condition ?? "Runtime incident recorded."),
      severity: incidentSeverity(data.kind as string | undefined),
      state: incidentState(data.status as string | undefined),
      runtimeId: (runtimeContext.package as string | undefined) ?? null,
      linkedThreadId: firstString(asRecord(data.thread).id),
      recoveryState:
        recoveryPlan.status === "resolved"
          ? "resolved"
          : normalizeWaitReason(recoveryPlan.waitReason) === "approvalRequired"
            ? "awaiting_acknowledgement"
            : recoveryPlan.interruptedP
            ? "active_recovery"
            : "closure_pending",
      recoverySummary:
        (typeof recoveryPlan.nextAction === "string"
          ? recoveryPlan.nextAction
          : typeof recoveryNextAction.type === "string"
            ? `Next action: ${String(recoveryNextAction.type)}${
                recoveryNextAction.suggestedStep ? ` (${String(recoveryNextAction.suggestedStep)})` : ""
              }.`
            : "Recovery remains governed and inspectable through the linked work and runtime context."),
      nextAction:
        (typeof recommendedAction?.type === "string"
          ? String(recommendedAction.type)
          : typeof recoveryNextAction.type === "string"
            ? String(recoveryNextAction.type)
            : "inspect-runtime-context"),
      blockedReason: normalizeWaitReason(firstString(wait.why, wait.waitReason)),
      remediationPlan:
        Object.keys(remediationPlan).length > 0
          ? {
              status:
                String(remediationPlan.status ?? "draft") as IncidentRemediationPlanDto["status"],
              owner: firstString(remediationPlan.owner),
              summary: String(remediationPlan.summary ?? ""),
              actions: asStringArray(remediationPlan.actions),
              validationSteps: asStringArray(remediationPlan.validationSteps),
              blockers: asStringArray(remediationPlan.blockers)
            }
          : null,
      conditionDetail:
        Object.keys(conditionDetail).length > 0
          ? {
              type: firstString(conditionDetail.type),
              message: String(conditionDetail.message ?? data.condition ?? data.summary ?? "Runtime incident recorded."),
              printed: firstString(conditionDetail.printed),
              class: firstString(conditionDetail.class),
              restartCount: Number(conditionDetail.restartCount ?? 0),
              slotCount:
                typeof conditionDetail.slotCount === "number" ? Number(conditionDetail.slotCount) : null,
              slots: asRecordArray(conditionDetail.slots).map((slot) => ({
                name: String(slot.name ?? "SLOT"),
                boundp: Boolean(slot.boundp),
                printed: firstString(slot.printed),
                type: firstString(slot.type)
              }))
            }
          : null,
      restartSuggestions: asRecordArray(runtimeContext.restartSuggestions).map((entry) => ({
        name: firstString(entry.name),
        label: String(entry.label ?? entry.name ?? "Restart")
      })),
      artifactIds: [],
      linkedEntities,
      traceNeighborhood:
        Object.keys(asRecord(data.traceNeighborhood)).length > 0
          ? adaptProjectTraceNeighborhood(asRecord(data.traceNeighborhood))
          : null,
      updatedAt: universalTimeToIso(data.createdAt)
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function workStateFromStatus(status: string | undefined, waitingReason: string | undefined): WorkItemSummaryDto["state"] {
  const normalizedStatus = normalizeWorkStatus(status);
  const normalizedWaitReason = normalizeWaitReason(waitingReason);

  if (normalizedStatus === "quarantined") {
    return "quarantined";
  }
  if (
    normalizedWaitReason === "approvalRequired" ||
    normalizedWaitReason === "pendingValidation" ||
    normalizedWaitReason === "coldValidationRequired"
  ) {
    return "waiting";
  }
  if (
    normalizedStatus === "resumed" ||
    normalizedStatus === "open" ||
    normalizedStatus === "mutating" ||
    normalizedStatus === "created" ||
    normalizedStatus === "awaitingApproval"
  ) {
    return "active";
  }
  if (normalizedStatus === "committed" || normalizedStatus === "completed") {
    return "closable";
  }
  return "blocked";
}

function adaptWorkItemListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<WorkItemSummaryDto[]> {
  const items = asRecordArray(response.data);
  return {
    contractVersion: response.contractVersion,
    domain: "work-item",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: items.map((item) => {
      const pendingValidations = asStringArray(item.pendingValidations);
      const approvalRequirements = (item.approvalRequirements as Array<unknown> | undefined) ?? [];
      const waitingReason = normalizeWaitReason(
        firstString(item.waitReason, item.wait_reason, item.waitingOn, item.waiting_on)
      );
      const incidentCount = Number(item.incidentCount ?? 0);
      const artifactCount = Number(item.artifactCount ?? 0);
      return {
        workItemId: String(item.id ?? "work-item"),
        title: String(item.goal ?? "Work Item"),
        state: workStateFromStatus(item.status as string | undefined, waitingReason ?? undefined),
        updatedAt: universalTimeToIso(item.updatedAt ?? item.createdAt),
        waitingReason,
        approvalCount: approvalRequirements.length,
        incidentCount,
        artifactCount,
        validationBurden: pendingValidations.length > 0 ? "pending" : "complete",
        reconciliationBurden: item.reconciliationResult ? "complete" : item.imageReconciliation ? "required" : "none",
        correctiveContext: adaptCorrectiveContext(asRecord(item.correctiveContext))
      };
    }),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptWorkItemDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<WorkItemDetailDto> {
  const data = asRecord(response.data);
  const workflowRecord = asRecord(data.workflowRecord);
  const waitingReason = normalizeWaitReason(
    firstString(data.waitReason, data.wait_reason, workflowRecord.waitingOn, workflowRecord.waiting_on)
  );
  const linkedEntities = [
    linkedEntity("operation", workflowRecord.id as string | undefined, `Workflow ${String(workflowRecord.id ?? "")}`),
    linkedEntity("work-item", data.id as string | undefined, String(data.goal ?? "Work Item"))
  ].filter(Boolean) as LinkedEntityRefDto[];

  return {
    contractVersion: response.contractVersion,
    domain: "work-item",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      workItemId: String(data.id ?? "work-item"),
      title: String(data.goal ?? "Work Item"),
      state: workStateFromStatus(data.status as string | undefined, waitingReason ?? undefined),
      waitingReason,
      workflowRecordId: String(workflowRecord.id ?? data.workflowRecordRef ?? "workflow-record"),
      runtimeSummary:
        (data.latestRuntimeObservation ? "Runtime observations captured for this work item." : "No runtime observation recorded yet."),
      sourceRelationship:
        data.sourceSnapshot
          ? "This work item carries an explicit source snapshot and image snapshot reference."
          : "Source relationship has not been projected yet.",
      linkedEntities,
      traceNeighborhood:
        Object.keys(asRecord(data.traceNeighborhood)).length > 0
          ? adaptProjectTraceNeighborhood(asRecord(data.traceNeighborhood))
          : null,
      correctiveContext: adaptCorrectiveContext(asRecord(data.correctiveContext))
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptWorkItemDetailCommandResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<WorkItemDetailDto> {
  const result = adaptWorkItemDetailResponse(response);
  return {
    ...result,
    kind: "command"
  };
}

function adaptWorkItemPlanDirective(item: Record<string, unknown>): WorkItemPlanDirectiveDto {
  const normalized = asRecord(camelizeKeys(item));
  return {
    phase: firstString(normalized.phase) ?? null,
    nextStep: firstString(normalized.nextStep) ?? null,
    note: firstString(normalized.note) ?? null,
    timestamp: normalized.timestamp == null ? null : Number(normalized.timestamp)
  };
}

function adaptWorkItemPlanSteering(item: Record<string, unknown>): WorkItemPlanSteeringDto | null {
  const normalized = asRecord(camelizeKeys(item));
  if (Object.keys(normalized).length === 0) {
    return null;
  }
  return {
    currentPhase: firstString(normalized.currentPhase) ?? null,
    nextStep: firstString(normalized.nextStep) ?? null,
    resumeAnchor: firstString(normalized.resumeAnchor) ?? null,
    phaseCount: Number(normalized.phaseCount ?? 0),
    planningPhases: asStringArray(normalized.planningPhases),
    remainingPhases: asStringArray(normalized.remainingPhases),
    completedPhaseCount: Number(normalized.completedPhaseCount ?? 0),
    decompositionReady: Boolean(normalized.decompositionReadyP ?? normalized.decompositionReady),
    compacted: Boolean(normalized.compactedP ?? normalized.compacted),
    revisionReason: firstString(normalized.revisionReason) ?? null,
    operatorDirectedPhase: firstString(normalized.operatorDirectedPhase) ?? null,
    operatorDirectedNextStep: firstString(normalized.operatorDirectedNextStep) ?? null,
    operatorSteeringCount: Number(normalized.operatorSteeringCount ?? 0),
    reviewRequired: Boolean(normalized.reviewRequiredP ?? normalized.reviewRequired),
    planHealth: firstString(normalized.planHealth) ?? null
  };
}

function adaptWorkItemPlanResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<WorkItemPlanDto> {
  const data = asRecord(response.data);
  const normalized = asRecord(camelizeKeys(data));
  return {
    contractVersion: response.contractVersion,
    domain: "work-item",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      workItemId: String(normalized.id ?? "work-item"),
      status: String(normalized.status ?? "unknown"),
      goal: String(normalized.goal ?? "Work Item"),
      longHorizonPlan: asRecord(normalized.longHorizonPlan),
      planHealth: firstString(normalized.planHealth) ?? null,
      planSteering: adaptWorkItemPlanSteering(asRecord(normalized.planSteering)),
      operatorSteeringHistory: asRecordArray(normalized.operatorSteeringHistory).map(adaptWorkItemPlanDirective),
      nextAction: asRecord(normalized.nextAction),
      resumePayload: asRecord(normalized.resumePayload),
      pendingValidations: asStringArray(normalized.pendingValidations)
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptWorkflowRecordDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<WorkflowRecordDto> {
  const data = asRecord(response.data);
  const pendingValidations = asStringArray(data.pendingValidations);
  const approvalRequirements = asRecordArray(data.approvalRequirements);
  const workflowPhase = normalizeWorkflowPhase(data.waitingOn);
  const blockingItems = [
    ...(workflowPhase ? [workflowPhase] : []),
    ...approvalRequirements.map((requirement) => String(requirement.policy ?? "approval")),
    ...pendingValidations
  ];

  return {
    contractVersion: response.contractVersion,
    domain: "workflow",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      workflowRecordId: String(data.id ?? "workflow-record"),
      phase:
        workflowPhase === "approval"
          ? "execution"
          : pendingValidations.length > 0
            ? "validation"
            : data.quarantineReason
              ? "reconciliation"
              : "closure",
      validationState: pendingValidations.length > 0 ? "pending" : "complete",
      reconciliationState: data.quarantineReason || workflowPhase === "operatorReview" ? "required" : "complete",
      closureReadiness: blockingItems.length > 0 ? "not_closable" : "closable",
      closureSummary:
        blockingItems.length > 0
          ? `Closure is still withheld by ${blockingItems.join(", ")}.`
          : "The workflow record appears ready for closure.",
      blockingItems
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptProviderProfile(profile: Record<string, unknown>): ProviderProfileDto {
  const normalized = camelizeKeys(profile) as Record<string, unknown>;
  return {
    name: firstString(normalized.name) ?? "default",
    provider: firstString(normalized.provider) ?? "mock",
    model: firstString(normalized.model) ?? "gpt-5",
    fastModel: firstString(normalized.fastModel) ?? "gpt-4.1-mini",
    apiBase: firstString(normalized.apiBase) ?? null,
    apiKeyPresent: Boolean(normalized.apiKeyPresent ?? normalized.apiKeyPresentP),
    intents: asStringArray(normalized.intents),
    latencyTier: firstString(normalized.latencyTier) ?? "balanced",
    reviewBias: firstString(normalized.reviewBias) ?? "neutral",
    executionBias: firstString(normalized.executionBias) ?? "balanced",
    locality: firstString(normalized.locality) ?? "network"
  };
}

function normalizeProviderRoutingMode(value: unknown): ProviderRoutingMode {
  return value === "manual" ? "manual" : "auto";
}

function adaptProviderSummaryResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ProviderProfileSummaryDto> {
  const normalized = camelizeKeys(response.data) as Record<string, unknown>;
  const profiles = asRecordArray(normalized.profiles).map(adaptProviderProfile);
  const activeProfileName = firstString(normalized.activeProfileName) ?? "default";
  const activeProfile =
    asRecord(normalized.activeProfile).name || asRecord(normalized.activeProfile).provider
      ? adaptProviderProfile(asRecord(normalized.activeProfile))
      : profiles.find((profile) => profile.name === activeProfileName) ?? null;
  const routingMode = normalizeProviderRoutingMode(normalized.routingMode);
  const routingPolicyRecord = asRecord(normalized.routingPolicy);

  return {
    contractVersion: response.contractVersion,
    domain: response.domain,
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      activeProfileName,
      profileCount:
        typeof normalized.profileCount === "number" ? normalized.profileCount : profiles.length,
      profiles,
      activeProfile,
      routingMode,
      routingPolicy: {
        mode: normalizeProviderRoutingMode(routingPolicyRecord.mode),
        availableModes: asStringArray(routingPolicyRecord.availableModes).map((mode) =>
          mode === "manual" ? "manual" : "auto"
        ),
        profileCount:
          typeof routingPolicyRecord.profileCount === "number"
            ? routingPolicyRecord.profileCount
            : profiles.length,
        lastRoutePresent: Boolean(routingPolicyRecord.lastRoutePresent ?? routingPolicyRecord.lastRoutePresentP)
      },
      lastRoute: normalized.lastRoute && typeof normalized.lastRoute === "object"
        ? (normalized.lastRoute as Record<string, unknown>)
        : null
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptProjectSummary(item: Record<string, unknown>): ProjectSummaryDto {
  return {
    projectId: String(item.id ?? "project"),
    title: String(item.title ?? "Project"),
    summary: String(item.summary ?? "Governed project record."),
    status: String(item.status ?? "active"),
    createdAt: universalTimeToIso(item.createdAt),
    updatedAt: universalTimeToIso(item.updatedAt),
    requirementCount: Number(item.requirementCount ?? 0),
    featureSpecCount: Number(item.featureSpecCount ?? 0),
    journeyCount: Number(item.journeyCount ?? 0),
    architectureDecisionCount: Number(item.architectureDecisionCount ?? 0),
    nonFunctionalRequirementCount: Number(item.nfrCount ?? 0),
    linkedWorkItemCount: Number(item.linkedWorkItemCount ?? 0),
    linkedIncidentCount: Number(item.linkedIncidentCount ?? 0),
    linkedTestingHarnessCount: Number(item.linkedTestingHarnessCount ?? 0),
    sourceRoots: asStringArray(item.sourceRoots)
  };
}

function adaptProjectRequirement(item: Record<string, unknown>): ProjectRequirementDto {
  return {
    requirementId: String(item.id ?? "requirement"),
    title: String(item.title ?? "Requirement"),
    summary: String(item.summary ?? ""),
    scope: String(item.scope ?? "project"),
    kind: String(item.kind ?? "functional"),
    priority: String(item.priority ?? "unspecified"),
    status: String(item.status ?? "draft"),
    verificationKind: firstString(item.verificationKind) ?? null,
    linkedArtifactIds: asStringArray(item.linkedArtifactIds)
  };
}

function adaptProjectFeatureSpecification(item: Record<string, unknown>): ProjectFeatureSpecificationDto {
  return {
    featureSpecId: String(item.id ?? "feature-spec"),
    title: String(item.title ?? "Feature Specification"),
    summary: String(item.summary ?? ""),
    status: String(item.status ?? "draft"),
    acceptanceCriteria: asStringArray(item.acceptanceCriteria),
    linkedRequirementIds: asStringArray(item.linkedRequirementIds),
    linkedJourneyIds: asStringArray(item.linkedJourneyIds)
  };
}

function adaptProjectUserJourney(item: Record<string, unknown>): ProjectUserJourneyDto {
  return {
    journeyId: String(item.id ?? "journey"),
    title: String(item.title ?? "Journey"),
    summary: String(item.summary ?? ""),
    actors: asStringArray(item.actors),
    entrypoints: asStringArray(item.entrypoints),
    steps: asStringArray(item.steps),
    outcomes: asStringArray(item.outcomes),
    edgeCases: asStringArray(item.edgeCases)
  };
}

function adaptProjectArchitectureDecision(item: Record<string, unknown>): ProjectArchitectureDecisionDto {
  return {
    architectureDecisionId: String(item.id ?? "architecture-decision"),
    title: String(item.title ?? "Architecture Decision"),
    status: String(item.status ?? "proposed"),
    summary: String(item.summary ?? ""),
    drivers: asStringArray(item.drivers),
    consequences: asStringArray(item.consequences),
    stackChoices: asStringArray(item.stackChoices),
    linkedRequirementIds: asStringArray(item.linkedRequirementIds)
  };
}

function adaptProjectLinkedWorkItem(item: Record<string, unknown>): ProjectLinkedWorkItemDto {
  return {
    workItemId: String(item.id ?? "work-item"),
    title: String(item.title ?? "Work Item"),
    status: String(item.status ?? "unknown"),
    workflowRecordId: firstString(item.workflowRecordId) ?? null,
    pendingValidations: asStringArray(item.pendingValidations),
    sourceMutationCount: Number(item.sourceMutationCount ?? 0)
  };
}

function adaptProjectLinkedIncident(item: Record<string, unknown>): ProjectLinkedIncidentDto {
  return {
    incidentId: String(item.id ?? "incident"),
    title: String(item.title ?? "Incident"),
    summary: String(item.summary ?? ""),
    status: String(item.status ?? "unknown"),
    kind: String(item.kind ?? "incident"),
    workItemId: firstString(item.workItemId) ?? null,
    workflowRecordId: firstString(item.workflowRecordId) ?? null
  };
}

function adaptProjectTestingHarness(item: Record<string, unknown>): ProjectTestingHarnessDto {
  const rawHarnessId = String(item.id ?? "harness");
  return {
    harnessId: rawHarnessId.replace(/^:/, "").toLowerCase(),
    label: String(item.label ?? "Harness"),
    entrypoint: String(item.entrypoint ?? ""),
    kind: String(item.kind ?? "unknown").replace(/^:/, "").toLowerCase(),
    categories: asStringArray(item.categories).map((category) => category.replace(/^:/, "").toLowerCase())
  };
}

function adaptProjectTestingStrategyThresholdPolicy(
  item: Record<string, unknown>
): ProjectTestingStrategyThresholdPolicyDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }
  return {
    maxFailedTests: item.maxFailedTests == null ? null : Number(item.maxFailedTests),
    maxSayTurnLatencySeconds: item.maxSayTurnLatencySeconds == null ? null : Number(item.maxSayTurnLatencySeconds),
    maxEnvironmentSaveLoadSeconds:
      item.maxEnvironmentSaveLoadSeconds == null ? null : Number(item.maxEnvironmentSaveLoadSeconds),
    requireCoverage: Boolean(item.requireCoverage),
    requireRecoveryReady: Boolean(item.requireRecoveryReady)
  };
}

function adaptProjectTestingStrategy(item: Record<string, unknown>): ProjectTestingStrategyDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }
  const normalized = asRecord(camelizeKeys(item));
  return {
    requiredEvidence: asStringArray(normalized.requiredEvidence),
    suiteExpectations: asRecordArray(normalized.suiteExpectations)
      .map((entry): ProjectTestingStrategySuiteExpectationDto => ({
        harnessId: String(entry.harnessId ?? "").trim(),
        purpose: firstString(entry.purpose) ?? null,
        evidenceKinds: asStringArray(entry.evidenceKinds)
      }))
      .filter((entry) => entry.harnessId.length > 0 || (entry.purpose ?? '').length > 0 || entry.evidenceKinds.length > 0),
    thresholdPolicy: adaptProjectTestingStrategyThresholdPolicy(asRecord(normalized.thresholdPolicy))
  };
}

function adaptProjectTestingEvidenceStatus(item: Record<string, unknown>) {
  const normalized = asRecord(camelizeKeys(item));
  if (Object.keys(normalized).length === 0) {
    return null;
  }
  return {
    requiredEvidence: asStringArray(normalized.requiredEvidence),
    availableEvidence: asStringArray(normalized.availableEvidence),
    missingEvidence: asStringArray(normalized.missingEvidence),
    status: String(normalized.status ?? "unknown")
  };
}

function adaptProjectTestingEvidenceSuiteStatus(item: Record<string, unknown>) {
  const normalized = asRecord(camelizeKeys(item));
  return {
    harnessId: String(normalized.harnessId ?? "").replace(/^:/, "").replace(/_/g, "-").toLowerCase(),
    purpose: firstString(normalized.purpose) ?? null,
    linked: Boolean(normalized.linkedP ?? normalized.linked),
    evidenceKinds: asStringArray(normalized.evidenceKinds),
    satisfiedEvidenceKinds: asStringArray(normalized.satisfiedEvidenceKinds),
    missingEvidenceKinds: asStringArray(normalized.missingEvidenceKinds),
    status: String(normalized.status ?? "unknown")
  };
}

function adaptProjectQualityGate(item: Record<string, unknown>): ProjectQualityGateDto {
  return {
    gateId: String(item.id ?? "quality-gate"),
    title: String(item.title ?? "Quality Gate"),
    summary: String(item.summary ?? ""),
    status: String(item.status ?? "unknown"),
    requiredHarnessIds: asStringArray(item.requiredHarnessIds),
    minimumLinkedWorkItems: Number(item.minimumLinkedWorkItems ?? 0),
    minimumLinkedIncidents: Number(item.minimumLinkedIncidents ?? 0),
    requireSourceRoots: Boolean(item.requireSourceRootsP ?? item.requireSourceRoots),
    requiredTraceTargetKinds: asStringArray(item.requiredTraceTargetKinds),
    maximumFailedTests: item.maximumFailedTests == null ? null : Number(item.maximumFailedTests),
    requireCoverage: Boolean(item.requireCoverageP ?? item.requireCoverage),
    maximumSayTurnLatencySeconds:
      item.maximumSayTurnLatencySeconds == null ? null : Number(item.maximumSayTurnLatencySeconds),
    maximumEnvironmentSaveLoadSeconds:
      item.maximumEnvironmentSaveLoadSeconds == null ? null : Number(item.maximumEnvironmentSaveLoadSeconds),
    requireRecoveryReady: Boolean(item.requireRecoveryReadyP ?? item.requireRecoveryReady)
  };
}

function adaptProjectQualityGateSummary(item: Record<string, unknown>): ProjectQualityGateSummaryDto {
  return {
    gateCount: Number(item.gateCount ?? 0),
    blockedCount: Number(item.blockedCount ?? 0),
    readyCount: Number(item.readyCount ?? 0),
    readiness: String(item.readiness ?? "unknown")
  };
}

function adaptProjectQualityGateEvidence(item: Record<string, unknown>): ProjectQualityGateEvidenceDto {
  return {
    qualityGates: asRecordArray(item.qualityGates).map(adaptProjectQualityGate),
    qualityGateSummary:
      Object.keys(asRecord(item.qualityGateSummary)).length > 0
        ? adaptProjectQualityGateSummary(asRecord(item.qualityGateSummary))
        : null
  };
}

function adaptProjectReleaseReadiness(item: Record<string, unknown>): ProjectReleaseReadinessDto | null {
  const normalized = asRecord(camelizeKeys(item));
  if (Object.keys(normalized).length === 0) {
    return null;
  }
  return {
    stage: firstString(normalized.stage) ?? null,
    signoffStatus: firstString(normalized.signoffStatus) ?? null,
    targetWindow: firstString(normalized.targetWindow) ?? null,
    requiredApprovers: asStringArray(normalized.requiredApprovers),
    observationPlan: asStringArray(normalized.observationPlan),
    openRisks: asStringArray(normalized.openRisks)
  };
}

function adaptProjectReadinessObligation(item: Record<string, unknown>) {
  const normalized = asRecord(camelizeKeys(item));
  return {
    obligationId: String(normalized.id ?? normalized.obligationId ?? ""),
    title: String(normalized.title ?? ""),
    summary: String(normalized.summary ?? ""),
    status: String(normalized.status ?? "unknown"),
    owner: firstString(normalized.owner) ?? null,
    dueWindow: firstString(normalized.dueWindow) ?? null,
    blocking: Boolean(normalized.blockingP ?? normalized.blocking),
    evidenceKinds: asStringArray(normalized.evidenceKinds)
  };
}

function adaptProjectReadinessSummary(item: Record<string, unknown>): ProjectReadinessSummaryDto | null {
  const normalized = asRecord(camelizeKeys(item));
  if (Object.keys(normalized).length === 0) {
    return null;
  }
  return {
    status: String(normalized.status ?? "unknown"),
    testingReadiness: String(normalized.testingReadiness ?? "unknown"),
    qualityGateReadiness: String(normalized.qualityGateReadiness ?? "unknown"),
    recoveryReadiness: String(normalized.recoveryReadiness ?? "unknown"),
    releaseReadinessStatus: String(normalized.releaseReadinessStatus ?? "unknown"),
    releaseReviewState: String(normalized.releaseReviewState ?? "unknown"),
    releaseSignoffState: String(normalized.releaseSignoffState ?? "unknown"),
    releaseSignoffReady: Boolean(normalized.releaseSignoffReadyP ?? normalized.releaseSignoffReady ?? false),
    releaseSignoffSummary: firstString(normalized.releaseSignoffSummary) ?? null,
    releaseRequiredApprovers: asStringArray(normalized.releaseRequiredApprovers),
    releaseApprovedApprovers: asStringArray(normalized.releaseApprovedApprovers),
    releasePendingApprovers: asStringArray(normalized.releasePendingApprovers),
    releaseUnassignedApprovers: asStringArray(normalized.releaseUnassignedApprovers),
    releaseSignoffOwnershipReady: Boolean(normalized.releaseSignoffOwnershipReadyP ?? normalized.releaseSignoffOwnershipReady ?? false),
    releaseCurrentPhase: normalized.releaseCurrentPhase == null ? null : String(normalized.releaseCurrentPhase),
    releaseTargetPhase: normalized.releaseTargetPhase == null ? null : String(normalized.releaseTargetPhase),
    releaseTransitionReady: Boolean(normalized.releaseTransitionReadyP ?? normalized.releaseTransitionReady ?? false),
    releaseTransitionSummary: firstString(normalized.releaseTransitionSummary) ?? null,
    suiteBlockedCount: Number(normalized.suiteBlockedCount ?? 0),
    suiteReadyCount: Number(normalized.suiteReadyCount ?? 0),
    releaseStage: firstString(normalized.releaseStage) ?? null,
    releaseSignoffStatus: firstString(normalized.releaseSignoffStatus) ?? null,
    readinessObligationCount: Number(normalized.readinessObligationCount ?? 0),
    blockedReadinessObligationCount: Number(normalized.blockedReadinessObligationCount ?? 0),
    readyReadinessObligationCount: Number(normalized.readyReadinessObligationCount ?? 0),
    releaseNextActions: asStringArray(normalized.releaseNextActions),
    unmetObligations: asStringArray(normalized.unmetObligations)
  };
}

function adaptProjectTraceLink(item: Record<string, unknown>): ProjectTraceLinkDto {
  return {
    traceLinkId: String(item.id ?? "trace-link"),
    relation: String(item.relation ?? "related"),
    sourceKind: String(item.sourceKind ?? "unknown"),
    sourceId: String(item.sourceId ?? ""),
    targetKind: String(item.targetKind ?? "unknown"),
    targetId: String(item.targetId ?? ""),
    status: firstString(item.status) ?? null
  };
}

function adaptProjectTraceNeighborhood(item: Record<string, unknown>): ProjectTraceNeighborhoodDto {
  return {
    entityKind: String(item.entityKind ?? "unknown"),
    entityId: String(item.entityId ?? ""),
    count: Number(item.count ?? 0),
    outbound: asRecordArray(item.outbound).map(adaptProjectTraceLink),
    inbound: asRecordArray(item.inbound).map(adaptProjectTraceLink)
  };
}

function adaptAlignmentState(item: Record<string, unknown>): AlignmentStateDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }
  return {
    intentId: firstString(item.intentId) ?? null,
    score: Number(item.score ?? 0),
    divergenceTypes: asStringArray(item.divergenceTypes),
    confidence: Number(item.confidence ?? 0),
    status: String(item.status ?? "unknown"),
    lastEvaluated:
      item.lastEvaluated == null
        ? null
        : typeof item.lastEvaluated === "number"
          ? item.lastEvaluated
          : String(item.lastEvaluated),
    gapCount: Number(item.gapCount ?? 0),
    linkageState: Object.keys(asRecord(item.linkageState)).length > 0 ? asRecord(item.linkageState) : null,
    validationState: Object.keys(asRecord(item.validationState)).length > 0 ? asRecord(item.validationState) : null,
    summary: Object.keys(asRecord(item.summary)).length > 0 ? asRecord(item.summary) : null
  };
}

function adaptReconciliationDecisionAction(item: Record<string, unknown>): ReconciliationDecisionActionDto {
  return {
    kind: String(item.kind ?? "unknown"),
    target: String(item.target ?? "unknown"),
    reason: String(item.reason ?? "")
  };
}

function adaptReconciliationDecisionTriggerEvent(item: Record<string, unknown>): ReconciliationDecisionTriggerEventDto {
  return {
    eventId: String(item.eventId ?? "unknown"),
    kind: String(item.kind ?? "unknown"),
    family: firstString(item.family) ?? null,
    entityId: firstString(item.entityId) ?? null,
    threadId: firstString(item.threadId) ?? null,
    turnId: firstString(item.turnId) ?? null,
    timestamp:
      item.timestamp == null
        ? null
        : typeof item.timestamp === "number"
          ? item.timestamp
          : String(item.timestamp)
  };
}

function adaptReconciliationDecision(item: Record<string, unknown>): ReconciliationDecisionDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }
  const rawDecision = String(item.decision ?? "maintain");
  const decision =
    rawDecision === "runtime" || rawDecision === "intent" || rawDecision === "co-evolve" || rawDecision === "maintain"
      ? rawDecision
      : "maintain";
  return {
    intentId: firstString(item.intentId) ?? null,
    alignmentStatus: String(item.alignmentStatus ?? "unknown"),
    divergenceTypes: asStringArray(item.divergenceTypes),
    decision,
    proposedActions: asRecordArray(item.proposedActions).map(adaptReconciliationDecisionAction),
    triggerEvents: asRecordArray(item.triggerEvents).map(adaptReconciliationDecisionTriggerEvent),
    approvalPosture: String(item.approvalPosture ?? "unknown"),
    confidence: Number(item.confidence ?? 0),
    requiresApproval: Boolean(item.requiresApprovalP ?? item.requiresApproval ?? false),
    rationale: Object.keys(asRecord(item.rationale)).length > 0 ? asRecord(item.rationale) : null,
    lastEvaluated:
      item.lastEvaluated == null
        ? null
        : typeof item.lastEvaluated === "number"
          ? item.lastEvaluated
          : String(item.lastEvaluated)
  };
}

function adaptIntentDetail(item: Record<string, unknown>): IntentDetailDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }

  const scopeSummary = asRecord(item.scopeSummary);
  const scope = asRecord(item.scope);
  return {
    id: firstString(item.id) ?? "",
    description: firstString(item.description) ?? "",
    status: firstString(item.status) ?? "active",
    priority: firstString(item.priority) ?? null,
    version: item.version == null || Number.isNaN(Number(item.version)) ? 1 : Number(item.version),
    scopeSummary: Object.keys(scopeSummary).length > 0
      ? {
          symbolCount: scopeSummary.symbolCount == null || Number.isNaN(Number(scopeSummary.symbolCount)) ? 0 : Number(scopeSummary.symbolCount),
          systemCount: scopeSummary.systemCount == null || Number.isNaN(Number(scopeSummary.systemCount)) ? 0 : Number(scopeSummary.systemCount),
          workflowCount: scopeSummary.workflowCount == null || Number.isNaN(Number(scopeSummary.workflowCount)) ? 0 : Number(scopeSummary.workflowCount)
        }
      : null,
    linkedRuntimeObjectCount: item.linkedRuntimeObjectCount == null || Number.isNaN(Number(item.linkedRuntimeObjectCount)) ? 0 : Number(item.linkedRuntimeObjectCount),
    linkedSourceArtifactCount: item.linkedSourceArtifactCount == null || Number.isNaN(Number(item.linkedSourceArtifactCount)) ? 0 : Number(item.linkedSourceArtifactCount),
    linkedEventCount: item.linkedEventCount == null || Number.isNaN(Number(item.linkedEventCount)) ? 0 : Number(item.linkedEventCount),
    linkedMutationCount: item.linkedMutationCount == null || Number.isNaN(Number(item.linkedMutationCount)) ? 0 : Number(item.linkedMutationCount),
    createdAt: firstString(item.createdAt) ?? (typeof item.createdAt === "number" ? item.createdAt : null),
    updatedAt: firstString(item.updatedAt) ?? (typeof item.updatedAt === "number" ? item.updatedAt : null),
    scope: Object.keys(scope).length > 0
      ? {
          symbols: asStringArray(scope.symbols),
          systems: asStringArray(scope.systems),
          workflows: asStringArray(scope.workflows)
        }
      : null,
    constraints: asRecordArray(item.constraints),
    expectedBehaviors: asStringArray(item.expectedBehaviors),
    nonGoals: asStringArray(item.nonGoals),
    linkedRuntimeObjects: asStringArray(item.linkedRuntimeObjects),
    linkedSourceArtifacts: asStringArray(item.linkedSourceArtifacts),
    linkedEventIds: asStringArray(item.linkedEventIds),
    linkedMutationIds: asStringArray(item.linkedMutationIds),
    metadata: Object.keys(asRecord(item.metadata)).length > 0 ? asRecord(item.metadata) : null,
    current: Boolean(item.currentP ?? item.current),
    diff: asRecordArray(item.diff)
  };
}

function adaptCorrectiveAction(item: Record<string, unknown>): CorrectiveActionDto {
  return {
    kind: firstString(item.kind) ?? null,
    target: firstString(item.target) ?? null,
    reason: firstString(item.reason) ?? null
  };
}

function adaptCorrectiveTriggerEvent(item: Record<string, unknown>): CorrectiveTriggerEventDto {
  return {
    eventId: firstString(item.eventId) ?? null,
    kind: firstString(item.kind) ?? null,
    family: firstString(item.family) ?? null,
    entityId: firstString(item.entityId) ?? null
  };
}

function adaptCorrectiveContext(item: Record<string, unknown>): CorrectiveContextDto | null {
  if (Object.keys(item).length === 0) {
    return null;
  }

  return {
    kind: String(item.kind ?? "unknown"),
    intentId: firstString(item.intentId) ?? null,
    decision: firstString(item.decision) ?? null,
    approvalPosture: firstString(item.approvalPosture) ?? null,
    alignmentStatus: firstString(item.alignmentStatus) ?? null,
    alignmentScore:
      item.alignmentScore == null || Number.isNaN(Number(item.alignmentScore)) ? null : Number(item.alignmentScore),
    proposedActions: asRecordArray(item.proposedActions).map(adaptCorrectiveAction),
    triggerEvents: asRecordArray(item.triggerEvents).map(adaptCorrectiveTriggerEvent)
  };
}

function adaptProjectListResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ProjectListDto> {
  const data = asRecord(response.data);
  return {
    contractVersion: response.contractVersion,
    domain: "project",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      currentProjectId: firstString(data.currentProjectId) ?? null,
      projects: asRecordArray(data.projects).map(adaptProjectSummary)
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptProjectDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ProjectDetailDto> {
  const data = asRecord(response.data);
  const summary = adaptProjectSummary(data);
  const testingEvidence = asRecord(data.testingEvidence);
  const latestReport = asRecord(testingEvidence.latestReport);
  const coverage = asRecord(testingEvidence.coverage);
  const performance = asRecord(testingEvidence.performance);
  const qualityGateEvidence = asRecord(data.qualityGateEvidence);
  const fallbackQualityGateEvidence =
    Object.keys(qualityGateEvidence).length > 0
      ? qualityGateEvidence
      : {
          qualityGates: data.qualityGates,
          qualityGateSummary: data.qualityGateSummary
        };
  return {
    contractVersion: response.contractVersion,
    domain: "project",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      ...summary,
      constitution: Object.keys(asRecord(data.constitution)).length > 0 ? asRecord(data.constitution) : null,
      requirements: asRecordArray(data.requirements).map(adaptProjectRequirement),
      featureSpecifications: asRecordArray(data.featureSpecifications).map(adaptProjectFeatureSpecification),
      designSystem: Object.keys(asRecord(data.designSystem)).length > 0 ? asRecord(data.designSystem) : null,
      styleGuide: Object.keys(asRecord(data.styleGuide)).length > 0 ? asRecord(data.styleGuide) : null,
      testingStrategy: adaptProjectTestingStrategy(asRecord(data.testingStrategy)),
      releaseReadiness: adaptProjectReleaseReadiness(asRecord(data.releaseReadiness)),
      readinessObligations: asRecordArray(data.readinessObligations).map(adaptProjectReadinessObligation),
      userJourneys: asRecordArray(data.userJourneys).map(adaptProjectUserJourney),
      nonFunctionalRequirements: asRecordArray(data.nonFunctionalRequirements).map(adaptProjectRequirement),
      architectureDecisions: asRecordArray(data.architectureDecisions).map(adaptProjectArchitectureDecision),
      linkedWorkItemIds: asStringArray(data.linkedWorkItemIds),
      linkedIncidentIds: asStringArray(data.linkedIncidentIds),
      linkedTestingHarnessIds: asStringArray(data.linkedTestingHarnessIds),
      linkedWorkItems: asRecordArray(data.linkedWorkItems).map(adaptProjectLinkedWorkItem),
      linkedIncidents: asRecordArray(data.linkedIncidents).map(adaptProjectLinkedIncident),
      linkedTestingHarnesses: asRecordArray(data.linkedTestingHarnesses).map(adaptProjectTestingHarness),
      testingEvidence:
        Object.keys(testingEvidence).length > 0
          ? {
              latestReport:
                Object.keys(latestReport).length > 0
                  ? {
                      generatedAt: firstString(latestReport.generatedAt) ?? null,
                      suiteId: firstString(latestReport.suiteId) ?? null,
                      summary: Object.keys(asRecord(latestReport.summary)).length > 0 ? asRecord(latestReport.summary) : null
                    }
                  : null,
              coverage: {
                indexPath: firstString(coverage.indexPath) ?? null,
                present: Boolean(coverage.presentP ?? coverage.present)
              },
              performance: Object.keys(performance).length > 0 ? performance : null,
              suiteStatuses: asRecordArray(testingEvidence.suiteStatuses).map(adaptProjectTestingEvidenceSuiteStatus),
              evidenceStatus: adaptProjectTestingEvidenceStatus(asRecord(testingEvidence.evidenceStatus))
            }
          : null,
      qualityGateEvidence:
        Object.keys(asRecord(fallbackQualityGateEvidence)).length > 0
          ? adaptProjectQualityGateEvidence(asRecord(fallbackQualityGateEvidence))
          : null,
      readinessSummary: adaptProjectReadinessSummary(asRecord(data.readinessSummary)),
      alignmentState: adaptAlignmentState(asRecord(data.alignmentState)),
      reconciliationDecision: adaptReconciliationDecision(asRecord(data.reconciliationDecision)),
      traceNeighborhood:
        Object.keys(asRecord(data.traceNeighborhood)).length > 0
          ? adaptProjectTraceNeighborhood(asRecord(data.traceNeighborhood))
          : null,
      metadata: Object.keys(asRecord(data.metadata)).length > 0 ? asRecord(data.metadata) : null
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function artifactAuthority(
  kind: string | undefined,
  workItemId: string | undefined,
  threadId: string | undefined
): ArtifactDetailDto["authority"] {
  if (kind === "incident") {
    return "incident";
  }
  if (workItemId) {
    return "workflow";
  }
  if (threadId) {
    return "runtime";
  }
  return "source";
}

function artifactState(kind: string | undefined): ArtifactDetailDto["state"] {
  if (kind === "validation" || kind === "reconciliation" || kind === "incident" || kind === "plan") {
    return "evidence";
  }
  return "active";
}

function adaptArtifactListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<ArtifactSummaryDto[]> {
  const items = asRecordArray(response.data);

  return {
    contractVersion: response.contractVersion,
    domain: "artifact",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: items.map((item) => ({
      artifactId: String(item.id ?? "artifact"),
      title: String(item.title ?? item.kind ?? "Artifact"),
      kind: String(item.kind ?? "artifact"),
      summary: String(item.summary ?? "Durable artifact recorded in the live environment."),
      updatedAt: universalTimeToIso(item.createdAt ?? item.created_at)
    })),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptArtifactDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ArtifactDetailDto> {
  const data = asRecord(response.data);
  const lineage = asRecord(data.lineage);
  const linkedEntities = [
    linkedEntity("work-item", data.workItemId as string | undefined, String(data.workItemId ?? "Work Item")),
    linkedEntity("operation", data.operationId as string | undefined, String(data.operationId ?? "Operation")),
    linkedEntity("artifact", data.sourceRef as string | undefined, String(data.sourceRef ?? "Source Ref")),
    linkedEntity("artifact", data.imageRef as string | undefined, String(data.imageRef ?? "Image Ref"))
  ].filter(Boolean) as LinkedEntityRefDto[];

  return {
    contractVersion: response.contractVersion,
    domain: "artifact",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      artifactId: String(data.id ?? "artifact"),
      title: String(data.title ?? data.kind ?? "Artifact"),
      kind: String(data.kind ?? "artifact"),
      summary: String(data.summary ?? "Durable artifact recorded in the live environment."),
      updatedAt: universalTimeToIso(data.createdAt),
      provenance:
        `Lineage source=${String(lineage.sourceRef ?? data.sourceRef ?? "none")}, image=${String(
          lineage.imageRef ?? data.imageRef ?? "none"
        )}, work=${String(lineage.workItemId ?? data.workItemId ?? "none")}.`,
      authority: artifactAuthority(
        data.kind as string | undefined,
        data.workItemId as string | undefined,
        data.threadId as string | undefined
      ),
      state: artifactState(data.kind as string | undefined),
      linkedEntities,
      observations: [
        `Governance scope: ${String(data.governanceScope ?? "environment")}.`,
        data.threadId
          ? `This artifact is attached to thread ${String(data.threadId)}.`
          : "This artifact is environment-scoped.",
        data.workItemId
          ? `This artifact contributes evidence for work item ${String(data.workItemId)}.`
          : "No bound work item was recorded for this artifact."
      ]
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptMemoryEntry(raw: unknown): MemoryEntryDto {
  return camelizeKeys(asRecord(raw)) as MemoryEntryDto;
}

function adaptMemoryListResponse(
  response: RawServiceResponse<Record<string, unknown> | Array<Record<string, unknown>>>
): QueryResultDto<MemoryListDto> {
  const data = camelizeKeys(response.data) as Record<string, unknown> | Array<Record<string, unknown>>;
  const entries = Array.isArray(data)
    ? data.map(adaptMemoryEntry)
    : Array.isArray((data as Record<string, unknown>)?.entries)
      ? ((data as Record<string, unknown>).entries as unknown[]).map(adaptMemoryEntry)
      : Array.isArray((data as Record<string, unknown>)?.memories)
        ? ((data as Record<string, unknown>).memories as unknown[]).map(adaptMemoryEntry)
        : [];
  const entryCountValue = !Array.isArray(data) ? (data as Record<string, unknown>)?.entryCount : null;
  const entryCount =
    typeof entryCountValue === "number" && Number.isFinite(entryCountValue) ? entryCountValue : entries.length;
  return {
    contractVersion: response.contractVersion,
    domain: "memory",
    operation: response.operation,
    kind: "query",
    status: "ok",
    data: {
      entries,
      entryCount
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptThreadListResponse(
  response: RawServiceResponse<Array<Record<string, unknown>>>
): QueryResultDto<ThreadSummaryDto[]> {
  const items = asRecordArray(response.data);

  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: items.map((item) => {
      const turnCount = Number(item.turnCount ?? 0);
      const artifactCount = Number(item.artifactCount ?? 0);
      const latestTurnState: TurnState = turnCount > 0 ? "completed" : "background";
      const attentionFlags = [
        ...(turnCount > 0 ? [`turns ${turnCount}`] : []),
        ...(artifactCount > 0 ? [`artifacts ${artifactCount}`] : []),
        ...((item.metadata && asRecord(item.metadata).defaultP) ? ["default-thread"] : [])
      ];

      return {
        threadId: String(item.id ?? "thread"),
        title: String(item.title ?? "Thread"),
        summary: String(item.summary ?? "Conversation thread in the live environment."),
        state: threadStateFromRawStatus(item.status as string | undefined, latestTurnState),
        latestActivityAt: universalTimeToIso(item.updatedAt ?? item.createdAt),
        latestTurnState,
        attentionFlags
      };
    }),
    metadata: normalizeMetadata(response.metadata)
  };
}

function enrichThreadSummaryFromDetail(
  base: ThreadSummaryDto,
  detailResponse: RawServiceResponse<Record<string, unknown>>
): ThreadSummaryDto {
  const detail = asRecord(detailResponse.data);
  const turns = asRecordArray(detail.turns);
  const detailSummary = asRecord(detail.detailSummary);
  const latestTurn = turns[turns.length - 1];
  const latestTurnState = latestTurn
    ? turnStateFromRawStatus(latestTurn.status as string | undefined)
    : "background";
  const incidentCount = Number(detailSummary.incidentCount ?? 0);
  const artifactCount = Number(detailSummary.artifactCount ?? 0);
  const runtimeArtifactCount = Number(detailSummary.runtimeArtifactCount ?? 0);
  const messageCount = Number(detailSummary.messageCount ?? 0);

  const attentionFlags = [
    ...(messageCount > 0 ? [`messages ${messageCount}`] : []),
    ...(turns.length > 0 ? [`turns ${turns.length}`] : []),
    ...(incidentCount > 0 ? [`incidents ${incidentCount}`] : []),
    ...(artifactCount > 0 ? [`artifacts ${artifactCount}`] : []),
    ...(runtimeArtifactCount > 0 ? [`runtime-artifacts ${runtimeArtifactCount}`] : []),
    ...(latestTurnState === "awaiting_approval" ? ["awaiting-approval"] : []),
    ...(latestTurnState === "interrupted" ? ["interrupted"] : []),
    ...(latestTurnState === "failed" ? ["failed"] : [])
  ];

  return {
    ...base,
    state: threadStateFromRawStatus(String(detail.status ?? ""), latestTurnState),
    latestTurnState,
    attentionFlags
  };
}

function adaptThreadDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ThreadDetailDto> {
  const data = asRecord(response.data);
  const adaptAttachments = (attachmentsValue: unknown): ConversationAttachmentDto[] =>
    asRecordArray(attachmentsValue).map((attachment) => ({
      attachmentId: String(attachment.attachmentId ?? `attachment-${Math.random().toString(36).slice(2)}`),
      name: String(attachment.name ?? "attachment"),
      mediaType: String(attachment.mediaType ?? "application/octet-stream"),
      kind:
        attachment.kind === "text" || attachment.kind === "image" || attachment.kind === "binary"
          ? attachment.kind
          : "binary",
      source: attachment.source === "output" ? "output" : "input",
      summary: String(attachment.summary ?? `${String(attachment.name ?? "attachment")}`),
      sizeBytes: typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : null,
      textContent: attachment.textContent ? String(attachment.textContent) : null,
      dataUrl: attachment.dataUrl ? String(attachment.dataUrl) : null
    }));
  const messages = asRecordArray(data.messages).map((message) => ({
    messageId: String(message.id ?? "message"),
    role: messageRoleFromRaw(message.role as string | undefined),
    content: String(message.content ?? ""),
    createdAt: universalTimeToIso(message.createdAt),
    turnId: message.turnId ? String(message.turnId) : null,
    attachments: adaptAttachments(message.attachments)
  }));
  const turns = asRecordArray(data.turns).map((turn) => {
    const userMessageId = turn.userMessageId ? String(turn.userMessageId) : null;
    return {
      turnId: String(turn.id ?? "turn"),
      title: userMessageId ? `Turn ${String(turn.id ?? "turn")}` : `Background Turn ${String(turn.id ?? "turn")}`,
      state: turnStateFromRawStatus(turn.status as string | undefined),
      createdAt: universalTimeToIso(turn.startedAt)
    };
  });
  const linkedEntities = [
    ...asRecordArray(data.incidents).map((incident) => ({
      entityType: "incident" as const,
      entityId: String(incident.id ?? "incident"),
      label: String(incident.title ?? incident.summary ?? "Incident")
    })),
    ...asRecordArray(data.artifacts).map((artifact) => ({
      entityType: "artifact" as const,
      entityId: String(artifact.id ?? "artifact"),
      label: String(artifact.title ?? artifact.kind ?? "Artifact")
    }))
  ];
  const latestTurnState = turns[turns.length - 1]?.state ?? "background";

  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      threadId: String(data.id ?? "thread"),
      title: String(data.title ?? "Thread"),
      summary: String(data.summary ?? "Conversation thread in the live environment."),
      state: threadStateFromRawStatus(data.status as string | undefined, latestTurnState),
      messages,
      turns,
      linkedEntities
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptConversationWorkspaceResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ConversationWorkspaceDto> {
  const data = asRecord(response.data);
  const threadsResponse = adaptThreadListResponse({
    ...response,
    data: asRecordArray(data.threads)
  });
  const selectedThreadData = asRecord(data.selectedThread);
  const selectedThread =
    Object.keys(selectedThreadData).length > 0
      ? adaptThreadDetailResponse({
          ...response,
          data: selectedThreadData
        }).data
      : null;
  const selectedTurnData = asRecord(data.selectedTurn);
  const selectedTurn =
    Object.keys(selectedTurnData).length > 0
      ? adaptTurnDetailResponse({
          ...response,
          data: selectedTurnData
        }).data
      : null;
  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      threads: threadsResponse.data,
      selectedThread,
      selectedTurn
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptTranscriptWorkspaceResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<TranscriptWorkspaceDto> {
  const data = asRecord(response.data);
  const eventsResponse = adaptEventStreamResponse({
    ...response,
    data: {
      events: asRecordArray(asRecord(data.events).events)
    }
  });
  const environmentConsoleRaw = asRecord(data.environmentConsole);
  const environmentConsole =
    Object.keys(environmentConsoleRaw).length > 0
      ? adaptConsoleLogStreamResponse({
          ...response,
          data: environmentConsoleRaw
        }).data
      : null;
  return {
    contractVersion: response.contractVersion,
    domain: "observation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      events: eventsResponse.data,
      environmentConsole
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptEnvironmentBootstrapResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<EnvironmentBootstrapDto> {
  const data = asRecord(response.data);
  return {
    contractVersion: response.contractVersion,
    domain: "environment",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      summary: adaptEnvironmentSummaryResponse({
        ...response,
        data: asRecord(data.summary)
      }).data,
      status: adaptEnvironmentStatusResponse({
        ...response,
        data: asRecord(data.status)
      }).data,
      workspaceSummary: adaptWorkspaceSummaryResponse({
        ...response,
        data: asRecord(data.workspaceSummary)
      }).data,
      desktopModel: adaptDesktopModelResponse({
        ...response,
        data: asRecord(data.desktopModel)
      }).data
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function previewOperationValue(value: unknown): string | null {
  const maxLength = 2000;
  const truncate = (text: string): string =>
    text.length > maxLength ? `${text.slice(0, maxLength)}\n\n[truncated]` : text;
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return truncate(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const record = asRecord(value);
  if (Object.keys(record).length > 0) {
    const compactRecord = {
      toolId: typeof record.toolId === "string" ? record.toolId : undefined,
      type: typeof record.type === "string" ? record.type : undefined,
      token:
        typeof record.token === "string"
          ? record.token
          : typeof asRecord(record.arguments).token === "string"
            ? String(asRecord(record.arguments).token)
            : undefined,
      expression:
        typeof record.expression === "string"
          ? truncate(record.expression)
          : typeof asRecord(record.arguments).expression === "string"
            ? truncate(String(asRecord(record.arguments).expression))
            : undefined,
      status: typeof record.status === "string" ? record.status : undefined,
      summary: typeof record.summary === "string" ? truncate(record.summary) : undefined,
      result:
        typeof asRecord(record.result).summary === "string"
          ? truncate(String(asRecord(record.result).summary))
          : undefined
    };
    const compactKeys = Object.entries(compactRecord).filter(([, entry]) => entry !== undefined);
    if (compactKeys.length > 0) {
      return truncate(
        JSON.stringify(
          Object.fromEntries(compactKeys),
          null,
          2
        )
      );
    }
  }
  try {
    return truncate(JSON.stringify(value, null, 2));
  } catch {
    return truncate(String(value));
  }
}

function summarizeOperationRecord(operation: Record<string, unknown>): {
  summary: string;
  toolId: string | null;
  inputPreview: string | null;
  outputPreview: string | null;
  policyDecision: string | null;
} {
  const input = asRecord(operation.input);
  const output = asRecord(operation.output);
  const policyDecision = asRecord(operation.policyDecision);
  const outputResult = asRecord(output.result);
  const outputTool = asRecord(output.tool);
  const toolId =
    (typeof input.toolId === "string" && input.toolId) ||
    (typeof outputTool.tool === "string" && outputTool.tool) ||
    (typeof outputResult.tool === "string" && outputResult.tool) ||
    null;
  const name = String(operation.name ?? operation.kind ?? "operation");
  const status = String(operation.status ?? "unknown");
  const decision =
    typeof policyDecision.decision === "string" ? String(policyDecision.decision) : null;
  const inputPreview = previewOperationValue(operation.input);
  const outputPreview = previewOperationValue(operation.output);
  const summaryParts = [
    toolId ? `${name} via ${toolId}` : name,
    `status=${status}`,
    decision ? `policy=${decision}` : null
  ].filter((value): value is string => Boolean(value));

  return {
    summary: summaryParts.join(" · "),
    toolId,
    inputPreview,
    outputPreview,
    policyDecision: decision
  };
}

function adaptCreateConversationThreadResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<ThreadSummaryDto> {
  const data = asRecord(response.data);
  const latestTurnState = turnStateFromRawStatus(data.latestTurnState as string | undefined);

  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "command",
    status: response.status === "error" ? "error" : "ok",
    data: {
      threadId: String(data.id ?? data.threadId ?? "thread"),
      title: String(data.title ?? "Thread"),
      summary: String(data.summary ?? "Conversation thread in the live environment."),
      state: threadStateFromRawStatus(data.status as string | undefined, latestTurnState),
      latestActivityAt: universalTimeToIso(data.updatedAt ?? data.createdAt),
      latestTurnState,
      attentionFlags: asStringArray(data.attentionFlags)
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptCreateProjectResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<ProjectDetailDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "project",
    operation: response.operation,
    kind: "command",
    status: response.status === "error" ? "error" : "ok",
    data: adaptProjectDetailResponse(response).data,
    metadata: normalizeMetadata(response.metadata)
  };
}

function extractAssistantResponseText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  const structMatch = trimmed.match(
    /^#S\(ASSISTANT-RESPONSE\s+:MESSAGE\s+([\s\S]*?)\s+:ACTIONS\b/i
  );
  return structMatch ? structMatch[1].trim() : trimmed;
}

function adaptSendConversationMessageResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<SendConversationMessageResultDto> {
  const data = camelizeKeys(asRecord(response.data)) as Record<string, unknown>;
  const thread = asRecord(data.thread);
  const turn = asRecord(data.turn);
  const assistantMessage = asRecord(data.assistantMessage);
  const responsePayload = camelizeKeys(asRecord(data.response)) as Record<string, unknown>;
  const responseMetadata = camelizeKeys(asRecord(responsePayload.metadata)) as Record<string, unknown>;
  const resolvedAssistantMessage = extractAssistantResponseText(
    assistantMessage.content ??
      data.message ??
      data.summary ??
      data.error ??
      responsePayload.message ??
      data.response
  );
  const resolvedSummary = extractAssistantResponseText(
    data.outcomeSummary ??
      data.reasoningSummary ??
      data.summary ??
      data.error ??
      assistantMessage.content ??
      data.message ??
      responsePayload.message ??
      data.response ??
      "Conversation turn executed."
  );
  const desktopTaskResults = asRecordArray(
    data.desktopTaskResults ?? responseMetadata.desktopTaskResults
  ).map((entry) => camelizeKeys(asRecord(entry)) as Record<string, unknown>);
  const taskRecordSummaries = asRecordArray(
    data.taskRecordSummaries ?? responseMetadata.desktopTaskRecords ?? responseMetadata.taskRecordSummaries
  ).map((entry) => camelizeKeys(asRecord(entry)) as Record<string, unknown>);
  const pendingApproval = (() => {
    const pending = asRecord(data.pendingApproval ?? responseMetadata.pendingApproval);
    return Object.keys(pending).length > 0 ? (camelizeKeys(pending) as Record<string, unknown>) : null;
  })();
  const runtimeReply = (() => {
    const reply = asRecord(data.runtimeReply ?? responseMetadata.runtimeReply);
    return Object.keys(reply).length > 0 ? (camelizeKeys(reply) as Record<string, unknown>) : null;
  })();
  const actorFlow = (() => {
    const flow = asRecord(data.actorFlow ?? responseMetadata.actorFlow);
    return Object.keys(flow).length > 0 ? (camelizeKeys(flow) as Record<string, unknown>) : null;
  })();

  return {
    contractVersion: response.contractVersion,
    domain: "execution",
    operation: response.operation,
    kind: "command",
    status:
      response.status === "awaiting-approval"
        ? "awaiting_approval"
        : response.status === "rejected"
          ? "rejected"
          : response.status === "error"
            ? "error"
            : "ok",
    data: {
      threadId: String(thread.id ?? data.threadId ?? "thread"),
      turnId: String(turn.id ?? data.turnId ?? "turn"),
      assistantMessage: resolvedAssistantMessage,
      summary: resolvedSummary,
      desktopTaskResults,
      taskRecordSummaries,
      pendingApproval,
      runtimeReply,
      actorFlow
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function normalizedReferenceId(value: unknown, fallback: string): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  const record = asRecord(value);
  const nested =
    record.id ??
    record.entityId ??
    record.workItemId ??
    record.operationId ??
    record.approvalId ??
    record.policyId;
  if (typeof nested === "string" || typeof nested === "number") {
    return String(nested);
  }
  return fallback;
}

function adaptTurnDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<TurnDetailDto> {
  const data = asRecord(response.data);
  const detailSummary = asRecord(data.detailSummary);
  const userMessage = asRecord(data.userMessage);
  const assistantMessage = asRecord(data.assistantMessage);
  const approvalSummary = asRecord(data.awaitingApproval);
  const workItemId = detailSummary.workItemId
    ? normalizedReferenceId(detailSummary.workItemId, "work-item")
    : null;
  const approvalIds = asRecordArray(approvalSummary.blockedOperations).map((operation) =>
    normalizedReferenceId(operation.operationId ?? operation.approvalId ?? operation.policyId, "approval")
  );
  const recovery = asRecord(data.recovery);
  const incidents = asRecordArray(data.incidents);
  const artifacts = asRecordArray(data.artifacts);
  const operations = asRecordArray(data.operations);
  const adaptedOperations = operations.map((operation) => {
    const summary = summarizeOperationRecord(operation);
    return {
      operationId: String(operation.id ?? "operation"),
      kind: String(operation.kind ?? "operation"),
      name: String(operation.name ?? operation.kind ?? "operation"),
      status: String(operation.status ?? "unknown"),
      startedAt: universalTimeToIso(operation.startedAt),
      completedAt: operation.completedAt ? universalTimeToIso(operation.completedAt) : null,
      summary: summary.summary,
      toolId: summary.toolId,
      inputPreview: summary.inputPreview,
      outputPreview: summary.outputPreview,
      policyDecision: summary.policyDecision
    };
  });
  const adaptMessage = (message: Record<string, unknown> | null) =>
    message
      ? {
          messageId: String(message.id ?? "message"),
          role: messageRoleFromRaw(message.role as string | undefined),
          content: String(message.content ?? ""),
          createdAt: universalTimeToIso(message.createdAt),
          turnId: message.turnId ? String(message.turnId) : null,
          attachments: []
        }
      : null;

  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      turnId: String(data.id ?? "turn"),
      threadId: String(data.threadId ?? asRecord(data.thread).id ?? "thread"),
      title:
        (typeof userMessage.content === "string" && userMessage.content.length > 0
          ? userMessage.content.slice(0, 72)
          : `Turn ${String(data.id ?? "turn")}`),
      state: turnStateFromRawStatus(data.status as string | undefined),
      summary:
        approvalSummary.awaitingApprovalP
          ? "This turn is waiting on governed approval before it can continue."
          : recovery.interruptedP
            ? "This turn contains interrupted operations and requires supervised recovery."
            : String(
                (recovery.summary as string | undefined) ??
                  "Turn state projected from the live conversation service."
              ),
      createdAt: universalTimeToIso(data.startedAt),
      operationIds: operations.map((operation) => String(operation.id ?? "operation")),
      operations: adaptedOperations,
      artifactIds: artifacts.map((artifact) => String(artifact.id ?? "artifact")),
      incidentIds: incidents.map((incident) => String(incident.id ?? "incident")),
      approvalIds,
      workItemIds: [
        ...(workItemId ? [workItemId] : []),
        ...asRecordArray(recovery.resumableOperations).flatMap((operation) =>
          operation.workItemId ? [normalizedReferenceId(operation.workItemId, "work-item")] : []
        )
      ],
      userMessage: adaptMessage(Object.keys(userMessage).length > 0 ? userMessage : null),
      assistantMessage: adaptMessage(Object.keys(assistantMessage).length > 0 ? assistantMessage : null)
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptConversationLatencyResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<ConversationLatencySummaryDto> {
  const data = asRecord(camelizeKeys(response.data));
  const requestBuilt = asRecord(data.requestBuilt);
  const firstStream = asRecord(data.firstStream);
  const responseComplete = asRecord(data.responseComplete);
  return {
    contractVersion: response.contractVersion,
    domain: "conversation",
    operation: response.operation,
    kind: "query",
    status: response.status === "error" ? "error" : "ok",
    data: {
      turnId: data.turnId ? String(data.turnId) : null,
      sampleCount: typeof data.sampleCount === "number" ? data.sampleCount : 0,
      samples: asRecordArray(data.samples).map((sample) => ({
        kind: String(sample.kind ?? "unknown"),
        timestamp: universalTimeToIso(sample.timestamp),
        payload: Object.keys(asRecord(sample.payload)).length > 0 ? asRecord(sample.payload) : null
      })),
      requestBuilt: Object.keys(requestBuilt).length > 0 ? requestBuilt : null,
      firstStream: Object.keys(firstStream).length > 0 ? firstStream : null,
      responseComplete: Object.keys(responseComplete).length > 0 ? responseComplete : null,
      providerPhases: asRecordArray(data.providerPhases).map((phase) => {
        const phaseRecord = asRecord(phase);
        const { timestamp, phase: phaseName, ...payload } = phaseRecord;
        return {
          timestamp: universalTimeToIso(timestamp),
          phase: phaseName ? String(phaseName) : null,
          payload
        };
      })
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

export class LiveSbclAgentHostAdapter implements SbclAgentHostAdapter {
  private currentBinding: BindingDto | null = DEFAULT_LIVE_BINDING;
  private pendingEnvironmentBootstrapWarmup:
    | {
        environmentId: string;
        startedAt: number;
        promise: Promise<QueryResultDto<EnvironmentBootstrapDto>>;
      }
    | null = null;
  private readonly persistentBridge: PersistentSbclBridge;
  private readonly conversationService: LiveConversationService;
  private readonly configurationService: LiveConfigurationService;
  private readonly desktopPreferencesService: LiveDesktopPreferencesService;
  private readonly environmentService: LiveEnvironmentService;
  private readonly hostUtilityService: LiveHostUtilityService;
  private readonly incidentService: LiveIncidentService;
  private readonly runtimeService: LiveRuntimeService;
  private readonly sourceService: LiveSourceService;
  private readonly workflowService: LiveWorkflowService;

  private readonly initialPreferences: DesktopPreferencesDto = {
    lastWorkspace: "environment",
    sidebarPinned: true,
    sidebarWidth: null,
    sidebarActivePanelId: "shell-navigation",
    sidebarDockedPanelIds: ["shell-navigation", "shell-utilities"],
    canvasPinned: true,
    inspectorPinned: true,
    inspectorWidth: null,
    inspectorActivePanelId: "workspace-inspector",
    inspectorDockedPanelIds: ["workspace-inspector", "editor-symbol"],
    themePreference: "system",
    desktopSurfaceView: {
      tooltipScalePercent: 100,
      controlIconScalePercent: 100,
      dockIconScalePercent: 100,
      conversationTextScalePercent: 100,
      sourceCodeTextScalePercent: 100
    },
    currentProjectId: "project-live-environment",
    projects: [
      {
        projectId: "project-live-environment",
        title: "Live Environment",
        environmentId: DEFAULT_LIVE_BINDING.environmentId,
        summary: "Primary desktop project bound to the active live sbcl-agent environment."
      }
    ],
    selectedConversationThreadByProject: {},
    replSessionsByProject: {
      "project-live-environment": [
        {
          sessionId: "repl-live-main",
          title: "Live Listener",
          environmentId: DEFAULT_LIVE_BINDING.environmentId,
          draftForm: '(describe "sbcl-agent")',
          packageName: "CL-USER",
          lastSummary: "Primary live listener session.",
          history: []
        }
      ]
    },
    currentReplSessionIdByProject: {
      "project-live-environment": "repl-live-main"
    },
    lispCodeView: {
      parenDepthColors: ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"]
    }
  };

  constructor(private readonly options: LiveAdapterOptions) {
    this.persistentBridge = new PersistentSbclBridge({
      options,
      resolveSbclExecutable,
      buildSbclSpawnEnvironment,
      normalizeFrame: (value) => camelizeKeys(value) as { id: number; response: unknown }
    });
    this.environmentService = new LiveEnvironmentService({
      invokeService: this.invokeService.bind(this),
      getCurrentBinding: () => this.currentBinding,
      getPendingEnvironmentBootstrapWarmup: () => this.pendingEnvironmentBootstrapWarmup,
      adaptEnvironmentSummaryResponse,
      adaptEnvironmentStatusResponse,
      adaptWorkspaceSummaryResponse,
      adaptDesktopModelResponse,
      adaptEnvironmentBootstrapResponse,
      adaptEventStreamResponse,
      adaptTranscriptWorkspaceResponse,
      adaptConsoleLogStreamResponse,
      adaptArtifactListResponse,
      adaptArtifactDetailResponse,
      collectHostConsoleEntries
    });
    this.hostUtilityService = new LiveHostUtilityService({
      options: this.options,
      invokeService: this.invokeService.bind(this),
      camelizeKeys: (value) => camelizeKeys(value),
      normalizeMetadata,
      getCurrentBinding: () => this.currentBinding,
      setCurrentBinding: (binding) => {
        this.currentBinding = binding;
      },
      clearPendingEnvironmentBootstrapWarmup: () => {
        this.pendingEnvironmentBootstrapWarmup = null;
      },
      scheduleEnvironmentBootstrapWarmup: this.scheduleEnvironmentBootstrapWarmup.bind(this),
      collectHostDiagnosticReports,
      diagnosticKindForPath,
      processNameFromDiagnosticFile,
      diagnosticPreviewMetadata,
      diagnosticKindFromMetadata,
      diagnosticSummary,
      adaptDesktopActionResponse,
      adaptDesktopRestoreResponse
    });
    this.conversationService = new LiveConversationService({
      invokeService: this.invokeService.bind(this),
      invokeStreamingService: this.invokeStreamingService.bind(this),
      camelizeKeys: (value) => camelizeKeys(value),
      asRecord,
      normalizeCommandStatus: (status) =>
        normalizeCommandStatus(
          status as "ok" | "rejected" | "error" | "awaiting-approval"
        ),
      normalizeMetadata,
      adaptConversationWorkspaceResponse,
      adaptThreadListResponse,
      adaptThreadDetailResponse,
      adaptTurnDetailResponse,
      adaptConversationLatencyResponse,
      adaptMemoryListResponse,
      adaptCreateConversationThreadResponse,
      adaptSendConversationMessageResponse
    });
    this.configurationService = new LiveConfigurationService({
      invokeService: this.invokeService.bind(this),
      camelizeKeys: (value) => camelizeKeys(value),
      asRecord,
      asRecordArray,
      firstString,
      normalizeCommandStatus: (status) =>
        normalizeCommandStatus(
          status as "ok" | "rejected" | "error" | "awaiting-approval"
        ),
      normalizeMetadata,
      adaptProviderSummaryResponse,
      adaptPackageManagementSummaryResponse,
      adaptPackageManagementCommandResponse,
      adaptDesktopTaskManifestListResponse,
      adaptDesktopTaskRecordListResponse,
      adaptMcpServerConfigListResponse,
      adaptMcpServerConfigDetailResponse
    });
    this.desktopPreferencesService = new LiveDesktopPreferencesService({
      invokeService: this.invokeService.bind(this),
      getCurrentEnvironmentId: () => this.currentBinding?.environmentId,
      mergeDesktopPreferences: (base, patch) => mergeDesktopPreferences(base, patch ?? {}),
      normalizeDesktopPreferencesPayload: (value) =>
        normalizeDesktopPreferencesPayload(
          value as Partial<DesktopPreferencesDto> | null | undefined
        ),
      initialPreferences: this.initialPreferences
    });
    this.incidentService = new LiveIncidentService({
      invokeService: this.invokeService.bind(this),
      asStringArray,
      camelizeKeys: (value) => camelizeKeys(value),
      asRecord,
      normalizeMetadata,
      adaptApprovalListResponse,
      adaptApprovalDetailResponse,
      adaptIncidentListResponse,
      adaptIncidentDetailResponse
    });
    this.runtimeService = new LiveRuntimeService({
      invokeService: this.invokeService.bind(this),
      camelizeKeys: (value) => camelizeKeys(value),
      normalizeCommandStatus: (status) =>
        normalizeCommandStatus(
          status as "ok" | "rejected" | "error" | "awaiting-approval"
        ),
      normalizeMetadata,
      adaptRuntimeSummaryResponse,
      adaptRuntimeTelemetryResponse,
      adaptRuntimeInspectionResponse,
      adaptRuntimeEntityDetailResponse,
      adaptPackageBrowserResponse,
      adaptRuntimeSymbolPageResponse
    });
    this.sourceService = new LiveSourceService({
      invokeService: this.invokeService.bind(this),
      projectDir: this.options.projectDir,
      getCurrentBinding: () => this.currentBinding,
      camelizeKeys: (value) => camelizeKeys(value),
      asStringArray,
      normalizeCommandStatus: (status) =>
        normalizeCommandStatus(
          status as "ok" | "rejected" | "error" | "awaiting-approval"
        ),
      normalizeMetadata,
      adaptRuntimeEvalResponse
    });
    this.workflowService = new LiveWorkflowService({
      invokeService: this.invokeService.bind(this),
      asRecord,
      normalizeMetadata,
      adaptIntentDetail,
      adaptCreateProjectResponse,
      adaptWorkItemDetailCommandResponse,
      adaptProjectListResponse,
      adaptProjectTestingHarness,
      adaptProjectDetailResponse,
      adaptWorkItemListResponse,
      adaptWorkItemDetailResponse,
      adaptWorkItemPlanResponse,
      adaptWorkflowRecordDetailResponse
    });
    this.schedulePersistentBridgeWarmup();
  }

  private schedulePersistentBridgeWarmup(): void {
    if (this.options.transport !== "pipe" || this.persistentBridge.warmupRequested) {
      return;
    }
    this.persistentBridge.warmup();
    this.scheduleEnvironmentBootstrapWarmup();
  }

  private scheduleEnvironmentBootstrapWarmup(): void {
    const environmentId = this.currentBinding?.environmentId;
    if (!environmentId || this.pendingEnvironmentBootstrapWarmup) {
      return;
    }
    const startedAt = performance.now();
    const promise = this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.bootstrap",
      environmentId
    ).then((response) => adaptEnvironmentBootstrapResponse(response));
    this.pendingEnvironmentBootstrapWarmup = {
      environmentId,
      startedAt,
      promise
    };
    console.info(
      "[bridge-perf] operation=%s durationMs=%d status=warmup-requested transport=persistent-pipe",
      "environment.bootstrap",
      Math.round(performance.now() - startedAt)
    );
    void promise.finally(() => {
      if (
        this.pendingEnvironmentBootstrapWarmup &&
        this.pendingEnvironmentBootstrapWarmup.environmentId === environmentId
      ) {
        // Keep the resolved promise briefly available for the first explicit bootstrap query.
        setTimeout(() => {
          if (
            this.pendingEnvironmentBootstrapWarmup &&
            this.pendingEnvironmentBootstrapWarmup.environmentId === environmentId &&
            this.pendingEnvironmentBootstrapWarmup.startedAt === startedAt
          ) {
            this.pendingEnvironmentBootstrapWarmup = null;
          }
        }, 5000);
      }
    });
  }

  async getHostStatus(): Promise<HostStatusDto> {
    return {
      hostState: "ready",
      supportedProtocolVersion: 1,
      supportedContractVersion: 1,
      hostLabel: "Live sbcl-agent Contract Adapter",
      transport: this.options.transport
    };
  }

  async getCurrentBinding(): Promise<BindingDto | null> {
    return this.currentBinding;
  }

  async setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>> {
    return this.hostUtilityService.setEnvironmentBinding(environmentId);
  }

  async getEnvironmentImageRegistry(): Promise<QueryResultDto<EnvironmentImageRegistryDto>> {
    return this.hostUtilityService.getEnvironmentImageRegistry();
  }

  async loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>> {
    return this.hostUtilityService.loadEnvironmentImage(imageIdOrName);
  }

  async saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>> {
    return this.hostUtilityService.saveEnvironmentImage(input);
  }

  async revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>> {
    return this.hostUtilityService.revertEnvironmentToImage();
  }

  async environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>> {
    return this.environmentService.environmentSummary(environmentId);
  }

  async environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>> {
    return this.environmentService.environmentStatus(environmentId);
  }

  async workspaceSummary(environmentId?: string): Promise<QueryResultDto<WorkspaceSummaryDto>> {
    return this.environmentService.workspaceSummary(environmentId);
  }

  async desktopModel(environmentId?: string): Promise<QueryResultDto<DesktopModelDto>> {
    return this.environmentService.desktopModel(environmentId);
  }

  async environmentBootstrap(environmentId?: string): Promise<QueryResultDto<EnvironmentBootstrapDto>> {
    return this.environmentService.environmentBootstrap(environmentId);
  }

  async environmentEvents(
    input: EventSubscriptionInput
  ): Promise<QueryResultDto<EnvironmentEventDto[]>> {
    return this.environmentService.environmentEvents(input);
  }

  async transcriptWorkspace(input: {
    environmentId?: string;
    families?: string[];
    visibility?: string[];
    eventLimit?: number;
    includeEvents?: boolean;
    includeEnvironmentConsole?: boolean;
    consoleLimit?: number;
  }): Promise<QueryResultDto<TranscriptWorkspaceDto>> {
    return this.environmentService.transcriptWorkspace(input);
  }

  async consoleLogStream(
    input: ConsoleLogQueryInput
  ): Promise<QueryResultDto<ConsoleLogStreamDto>> {
    return this.environmentService.consoleLogStream(input);
  }

  async diagnosticReportList(
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportSummaryDto[]>> {
    return this.hostUtilityService.diagnosticReportList(environmentId);
  }

  async diagnosticReportDetail(
    reportId: string,
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportDetailDto>> {
    return this.hostUtilityService.diagnosticReportDetail(reportId, environmentId);
  }

  async artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>> {
    return this.environmentService.artifactList(environmentId);
  }

  async artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>> {
    return this.environmentService.artifactDetail(artifactId, environmentId);
  }

  async conversationWorkspace(input: {
    environmentId?: string;
    threadId?: string | null;
    turnId?: string | null;
  }): Promise<QueryResultDto<ConversationWorkspaceDto>> {
    return this.conversationService.conversationWorkspace(input);
  }

  async threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>> {
    return this.conversationService.threadList(environmentId);
  }

  async threadDetail(
    threadId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ThreadDetailDto>> {
    return this.conversationService.threadDetail(threadId, environmentId);
  }

  async turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>> {
    return this.conversationService.turnDetail(turnId, environmentId);
  }

  async conversationLatency(
    turnId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ConversationLatencySummaryDto>> {
    return this.conversationService.conversationLatency(turnId, environmentId);
  }

  async memoryList(environmentId?: string): Promise<QueryResultDto<MemoryListDto>> {
    return this.conversationService.memoryList(environmentId);
  }

  async memoryDetail(memoryId: string, environmentId?: string): Promise<QueryResultDto<MemoryEntryDto>> {
    return this.conversationService.memoryDetail(memoryId, environmentId);
  }

  async createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    return this.conversationService.createConversationThread(input);
  }

  async updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    return this.conversationService.updateConversationThread(input);
  }

  async sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    return this.conversationService.sendConversationMessage(input, onEvent);
  }

  async approveActorMessage(
    input: { environmentId: string; actorMessageId: string }
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    return this.conversationService.approveActorMessage(input);
  }

  async approveApproval(
    input: { environmentId: string; approvalId: string; sessionId?: string | null }
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    return this.conversationService.approveApproval(input);
  }

  async updateMemory(input: {
    environmentId: string;
    memoryId: string;
    category?: string;
    attribute?: string;
    value?: string;
    summary?: string;
    confidence?: number | null;
  }): Promise<CommandResultDto<MemoryEntryDto>> {
    return this.conversationService.updateMemory(input);
  }

  async deleteMemory(input: {
    environmentId: string;
    memoryId: string;
  }): Promise<CommandResultDto<MemoryDeleteResultDto>> {
    return this.conversationService.deleteMemory(input);
  }

  async extractConversationAttachmentText(input: {
    name: string;
    mediaType: string;
    dataUrl: string;
  }): Promise<string | null> {
    const buffer = parseAttachmentDataUrl(input.dataUrl);
    if (!buffer) {
      return null;
    }
    const extension = conversationAttachmentTempExtension(input.name, input.mediaType);
    const tempPath = resolve(
      os.tmpdir(),
      `sbcl-agent-attachment-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`
    );
    try {
      await writeFile(tempPath, buffer);
      const { stdout } = await execFileAsync("textutil", ["-convert", "txt", "-stdout", tempPath]);
      const text = stdout.trim();
      return text.length > 0 ? text : null;
    } catch {
      return null;
    } finally {
      void unlink(tempPath).catch(() => undefined);
    }
  }

  async runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>> {
    return this.runtimeService.runtimeSummary(environmentId);
  }

  async calculatorSummary(environmentId?: string): Promise<QueryResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.calculatorSummary(environmentId);
  }


  async setCalculatorExpression(input: { environmentId: string; expression: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.setCalculatorExpression(input);
  }

  async appendCalculatorToken(input: { environmentId: string; token: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.appendCalculatorToken(input);
  }

  async backspaceCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.backspaceCalculator(environmentId);
  }

  async clearCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.clearCalculator(environmentId);
  }

  async setCalculatorMode(input: { environmentId: string; mode: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.setCalculatorMode(input);
  }

  async setCalculatorBase(input: { environmentId: string; base: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.setCalculatorBase(input);
  }

  async setCalculatorWordSize(input: { environmentId: string; wordSize: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.setCalculatorWordSize(input);
  }

  async setCalculatorAngleUnit(input: { environmentId: string; angleUnit: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return this.runtimeService.setCalculatorAngleUnit(input);
  }

  async runtimeTelemetrySnapshot(
    environmentId?: string
  ): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>> {
    return this.runtimeService.runtimeTelemetrySnapshot(environmentId);
  }

  async runtimeInspectSymbol(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }): Promise<QueryResultDto<RuntimeInspectionResultDto>> {
    return this.runtimeService.runtimeInspectSymbol(input);
  }

  async runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>> {
    return this.runtimeService.runtimeEntityDetail(input);
  }

  async packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>> {
    return this.runtimeService.packageBrowser(input);
  }

  async runtimeSymbolPage(input: RuntimeSymbolBrowserPageInput): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto>> {
    return this.runtimeService.runtimeSymbolPage(input);
  }

  async fileSystemDirectory(input?: {
    path?: string;
  }): Promise<QueryResultDto<FileSystemDirectoryListingDto>> {
    return this.sourceService.fileSystemDirectory(input);
  }

  async sourcePreview(input: {
    environmentId: string;
    path: string;
    line?: number;
    contextRadius?: number;
  }): Promise<QueryResultDto<SourcePreviewDto>> {
    return this.sourceService.sourcePreview(input);
  }

  async writeSourceFile(input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<FileSystemWriteResultDto>> {
    return this.sourceService.writeSourceFile(input);
  }

  async evaluateInContext(
    input: {
      environmentId: string;
      form: string;
      packageName?: string;
      recoveryLaunch?: {
        source: "incident-restart";
        incidentId: string;
        restartLabel: string;
      } | null;
    }
  ): Promise<CommandResultDto<RuntimeEvalResultDto>> {
    return this.sourceService.evaluateInContext(input);
  }

  async evaluateCalculator(
    input: CalculatorEvaluateInput
  ): Promise<CommandResultDto<CalculatorResultDto>> {
    return this.sourceService.evaluateCalculator(input);
  }

  async stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>> {
    return this.sourceService.stageSourceChange(input);
  }

  async reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>> {
    return this.sourceService.reloadSourceFile(input);
  }

  async desktopAction(
    input: DesktopActionInput
  ): Promise<CommandResultDto<DesktopActionResultDto>> {
    return this.hostUtilityService.desktopAction(input);
  }

  async desktopRestore(
    input: DesktopRestoreInput
  ): Promise<CommandResultDto<DesktopRestoreResultDto>> {
    return this.hostUtilityService.desktopRestore(input);
  }

  async approvalRequestList(
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestSummaryDto[]>> {
    return this.incidentService.approvalRequestList(environmentId);
  }

  async approvalRequestDetail(
    requestId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestDto>> {
    return this.incidentService.approvalRequestDetail(requestId, environmentId);
  }

  async approveRequest(
    input: ApprovalDecisionInput
  ): Promise<CommandResultDto<ApprovalDecisionDto>> {
    return this.incidentService.approveRequest(input);
  }

  async denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>> {
    return this.incidentService.denyRequest(input);
  }

  async incidentList(environmentId?: string): Promise<QueryResultDto<IncidentSummaryDto[]>> {
    return this.incidentService.incidentList(environmentId);
  }

  async incidentDetail(
    incidentId: string,
    environmentId?: string
  ): Promise<QueryResultDto<IncidentDetailDto>> {
    return this.incidentService.incidentDetail(incidentId, environmentId);
  }

  async updateIncidentRemediationPlan(
    input: UpdateIncidentRemediationPlanInput
  ): Promise<CommandResultDto<IncidentDetailDto>> {
    return this.incidentService.updateIncidentRemediationPlan(input);
  }

  async createIntent(
    input: CreateIntentInput
  ): Promise<CommandResultDto<IntentDetailDto>> {
    return this.workflowService.createIntent(input);
  }

  async createProject(
    input: CreateProjectInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.createProject(input);
  }

  async updateProjectConstitution(
    input: UpdateProjectConstitutionInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectConstitution(input);
  }

  async updateProjectDesignSystem(
    input: UpdateProjectDesignSystemInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectDesignSystem(input);
  }

  async updateProjectStyleGuide(
    input: UpdateProjectStyleGuideInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectStyleGuide(input);
  }

  async updateProjectTestingStrategy(
    input: UpdateProjectTestingStrategyInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectTestingStrategy(input);
  }

  async updateProjectReleaseReadiness(
    input: UpdateProjectReleaseReadinessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectReleaseReadiness(input);
  }

  async updateProjectReadinessObligations(
    input: UpdateProjectReadinessObligationsInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.updateProjectReadinessObligations(input);
  }

  async appendProjectRequirement(
    input: AppendProjectRequirementInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectRequirement(input);
  }

  async appendProjectFeatureSpecification(
    input: AppendProjectFeatureSpecificationInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectFeatureSpecification(input);
  }

  async appendProjectUserJourney(
    input: AppendProjectUserJourneyInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectUserJourney(input);
  }

  async appendProjectArchitectureDecision(
    input: AppendProjectArchitectureDecisionInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectArchitectureDecision(input);
  }

  async appendProjectSourceRoot(
    input: AppendProjectSourceRootInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectSourceRoot(input);
  }

  async bindProjectTestingHarness(
    input: BindProjectTestingHarnessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.bindProjectTestingHarness(input);
  }

  async appendProjectQualityGate(
    input: AppendProjectQualityGateInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    return this.workflowService.appendProjectQualityGate(input);
  }

  async resumeWorkItem(
    input: ResumeWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    return this.workflowService.resumeWorkItem(input);
  }

  async quarantineWorkItem(
    input: QuarantineWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    return this.workflowService.quarantineWorkItem(input);
  }

  async rollbackWorkItem(
    input: RollbackWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    return this.workflowService.rollbackWorkItem(input);
  }

  async completeWorkItemValidations(
    input: CompleteWorkItemValidationsInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    return this.workflowService.completeWorkItemValidations(input);
  }

  async steerWorkItem(
    input: SteerWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    return this.workflowService.steerWorkItem(input);
  }

  async projectList(environmentId?: string): Promise<QueryResultDto<ProjectListDto>> {
    return this.workflowService.projectList(environmentId);
  }

  async projectTestingHarnessInventory(environmentId?: string): Promise<QueryResultDto<ProjectTestingHarnessDto[]>> {
    return this.workflowService.projectTestingHarnessInventory(environmentId);
  }

  async projectDetail(projectId: string, environmentId?: string): Promise<QueryResultDto<ProjectDetailDto>> {
    return this.workflowService.projectDetail(projectId, environmentId);
  }

  async workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>> {
    return this.workflowService.workItemList(environmentId);
  }

  async workItemDetail(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemDetailDto>> {
    return this.workflowService.workItemDetail(workItemId, environmentId);
  }

  async workItemPlan(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemPlanDto>> {
    return this.workflowService.workItemPlan(workItemId, environmentId);
  }

  async workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>> {
    return this.workflowService.workflowRecordDetail(workflowRecordId, environmentId);
  }

  async orchestrationList(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return this.configurationService.orchestrationList(environmentId);
  }

  async orchestrationInbox(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return this.configurationService.orchestrationInbox(environmentId);
  }

  async orchestrationFocus(input?: {
    environmentId?: string;
    planId?: string;
    workflowRecordId?: string;
    workItemId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.orchestrationFocus(input);
  }

  async orchestrationSnapshot(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.orchestrationSnapshot(input);
  }

  async planVerification(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.planVerification(input);
  }

  async providerProfiles(environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>> {
    return this.configurationService.providerProfiles(environmentId);
  }

  async packageManagementSummary(
    environmentId?: string
  ): Promise<QueryResultDto<PackageManagementSummaryDto>> {
    return this.configurationService.packageManagementSummary(environmentId);
  }

  async desktopTaskManifests(environmentId?: string): Promise<QueryResultDto<DesktopTaskManifestDto[]>> {
    return this.configurationService.desktopTaskManifests(environmentId);
  }

  async desktopTaskRecords(environmentId?: string): Promise<QueryResultDto<DesktopTaskRecordDto[]>> {
    return this.configurationService.desktopTaskRecords(environmentId);
  }

  async desktopTaskPendingApproval(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.desktopTaskPendingApproval(environmentId);
  }

  async desktopTaskActorFlow(input?: {
    environmentId?: string;
    sessionId?: string;
    approvalId?: string;
    pendingActionId?: string;
    actorMessageId?: string;
    scopeId?: string;
    latestOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.desktopTaskActorFlow(input);
  }

  async desktopTaskActorSystemPanel(input?: {
    environmentId?: string;
    sessionId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return this.configurationService.desktopTaskActorSystemPanel(input);
  }

  async desktopTaskActorTrace(input?: {
    environmentId?: string;
    actorRole?: string;
    actorMessageId?: string;
    phase?: string;
    latestOnlyP?: boolean;
    deadLettersOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return this.configurationService.desktopTaskActorTrace(input);
  }

  async desktopTaskDeadLetterQueue(input?: {
    environmentId?: string;
    actorRole?: string;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return this.configurationService.desktopTaskDeadLetterQueue(input);
  }

  async mcpServerConfigs(environmentId?: string): Promise<QueryResultDto<McpServerConfigDto[]>> {
    return this.configurationService.mcpServerConfigs(environmentId);
  }

  async mcpServerConfig(
    serverId: string,
    environmentId?: string
  ): Promise<QueryResultDto<McpServerConfigDto>> {
    return this.configurationService.mcpServerConfig(serverId, environmentId);
  }

  async focusWorkspace(workspace: WorkspaceId): Promise<void> {
    await this.desktopPreferencesService.focusWorkspace(workspace);
  }

  async getDesktopPreferences(): Promise<DesktopPreferencesDto> {
    return this.desktopPreferencesService.getDesktopPreferences();
  }

  async setDesktopPreferences(
    patch: Partial<DesktopPreferencesDto>
  ): Promise<DesktopPreferencesDto> {
    return this.desktopPreferencesService.setDesktopPreferences(patch);
  }

  async configureProviderProfile(
    input: ConfigureProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    if (input.activate) {
      return this.useProviderProfile({ profileName: input.profileName });
    }
    return this.configurationService.configureProviderProfile(this.currentBinding?.environmentId, input);
  }

  async useProviderProfile(
    input: UseProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    return this.configurationService.useProviderProfile(this.currentBinding?.environmentId, input);
  }

  async updateProviderRouting(
    input: UpdateProviderRoutingInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    return this.configurationService.updateProviderRouting(this.currentBinding?.environmentId, input);
  }

  async configureMcpServer(
    input: ConfigureMcpServerInput
  ): Promise<CommandResultDto<McpServerConfigDto>> {
    return this.configurationService.configureMcpServer(input);
  }

  async removeMcpServer(
    input: RemoveMcpServerInput
  ): Promise<CommandResultDto<{ id: string; removedP: boolean }>> {
    return this.configurationService.removeMcpServer(input);
  }

  async installQuicklispPackage(input: {
    environmentId: string;
    systemName: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.installQuicklispPackage(input);
  }

  async runQlotCommand(input: {
    environmentId: string;
    args: string[];
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.runQlotCommand(input);
  }

  async addSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.addSourceRegistryEntry(input);
  }

  async updateSourceRegistryEntry(input: {
    environmentId: string;
    oldPath: string;
    newPath: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.updateSourceRegistryEntry(input);
  }

  async removeSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.removeSourceRegistryEntry(input);
  }

  async addLocalProject(input: {
    environmentId: string;
    path: string;
    name?: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.addLocalProject(input);
  }

  async removeLocalProject(input: {
    environmentId: string;
    name: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return this.configurationService.removeLocalProject(input);
  }

  async quitApp(): Promise<void> {
    return;
  }

  async openEntityInNewWindow(_ref?: unknown): Promise<void> {
    return;
  }

  private shouldIgnoreBindingDriftForOperation(operation: string): boolean {
    return operation === "environment.load-image" || operation === "environment.revert-image";
  }

  private adoptResponseBinding(
    operation: string,
    requestedEnvironmentId: string | undefined,
    binding: BindingDto | null | undefined
  ): void {
    if (!binding?.environmentId) {
      return;
    }

    const requested = requestedEnvironmentId?.trim();
    const meaningfulRequested = Boolean(requested) && requested !== DEFAULT_LIVE_BINDING.environmentId;

    if (
      meaningfulRequested &&
      !this.shouldIgnoreBindingDriftForOperation(operation) &&
      binding.environmentId !== requested
    ) {
      throw new Error(
        `Bridge binding drift for ${operation}: requested ${requested} but received ${binding.environmentId}.`
      );
    }

    this.currentBinding = {
      environmentId: binding.environmentId,
      sessionId: binding.sessionId ?? this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
    };
  }

  private async invokeService<T>(
    operation: string,
    environmentId?: string,
    request?: Record<string, unknown>
  ): Promise<T> {
    const parsed = await this.persistentBridge.invoke<RawServiceResponse<unknown>>(
      operation,
      environmentId,
      request,
      "persistent-pipe"
    );
    const binding = parsed.metadata?.binding as BindingDto | null | undefined;
    this.adoptResponseBinding(operation, environmentId, binding);
    return parsed as T;
  }

  private async invokeStreamingService<T>(
    operation: string,
    environmentId: string | undefined,
    request: Record<string, unknown>,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<T> {
    if (onEvent) {
      console.info(
        "[live-host-adapter] streaming operation=%s is using persistent bridge result mode; provider stream events are not yet forwarded inline",
        operation
      );
    }
    const parsed = await this.persistentBridge.invoke<RawServiceResponse<unknown>>(
      operation,
      environmentId,
      request,
      "persistent-pipe-stream"
    );
    const binding = parsed.metadata?.binding as BindingDto | null | undefined;
    this.adoptResponseBinding(operation, environmentId, binding);
    return parsed as T;
  }
}

export function resolveLiveAdapterOptions(): LiveAdapterOptions {
  const transport = process.env.SBCL_AGENT_TRANSPORT === "socket" ? "socket" : "pipe";
  const endpoint =
    transport === "pipe"
      ? process.env.SBCL_AGENT_PIPE_COMMAND ?? "./bin/sbcl-agent"
      : process.env.SBCL_AGENT_SOCKET_ENDPOINT ?? "127.0.0.1:4017";
  const uxProjectDir = resolveUxProjectDir();
  const projectDir = resolveSbclAgentProjectDir();
  const bridgePath = resolveBridgePath(uxProjectDir);
  const environmentStatePath =
    process.env.SBCL_AGENT_ENVIRONMENT_STATE_PATH ??
    resolve(os.homedir(), ".sbcl-agent-ux-live-environment.sexp");

  return {
    transport,
    endpoint,
    projectDir,
    bridgePath,
    environmentStatePath
  };
}
