import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
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
  ConfigureProviderProfileInput,
  ConsoleLogEntryDto,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
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
  PackageBrowserDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
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
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
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

interface LiveAdapterOptions {
  transport: "socket" | "pipe";
  endpoint: string;
  projectDir: string;
  bridgePath: string;
  environmentStatePath: string;
}

interface RawServiceResponse<TData = unknown> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "query" | "command";
  status: "ok" | "error" | "awaiting-approval" | "rejected";
  data: TData;
  metadata: Record<string, unknown>;
}

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

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelizeKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        snakeToCamel(key),
        camelizeKeys(nestedValue)
      ])
    );
  }

  return value;
}

function normalizeMetadata(metadata: Record<string, unknown> | undefined): ServiceMetadataDto {
  const bindingValue = metadata?.binding;
  const binding =
    bindingValue && typeof bindingValue === "object"
      ? {
          sessionId: (bindingValue as Record<string, unknown>).sessionId as string | null | undefined,
          environmentId:
            ((bindingValue as Record<string, unknown>).environmentId as string | undefined) ?? "live-environment"
        }
      : null;

  return {
    authority: "environment",
    binding,
    readModel: metadata?.readModel as string | undefined,
    commandModel: metadata?.commandModel as string | undefined,
    policyId: (metadata?.policyId as string | null | undefined) ?? null,
    threadId: (metadata?.threadId as string | null | undefined) ?? null,
    turnId: (metadata?.turnId as string | null | undefined) ?? null,
    workItemId: (metadata?.workItemId as string | null | undefined) ?? null,
    workflowRecordId: (metadata?.workflowRecordId as string | null | undefined) ?? null,
    incidentId: (metadata?.incidentId as string | null | undefined) ?? null,
    runtimeId: (metadata?.runtimeId as string | null | undefined) ?? null,
    eventFamily: (metadata?.eventFamily as string | null | undefined) ?? null,
    visibility: (metadata?.visibility as string | null | undefined) ?? null
  };
}

function mergeDesktopPreferences(
  current: DesktopPreferencesDto,
  patch: Partial<DesktopPreferencesDto>
): DesktopPreferencesDto {
  const currentDesktopSurfaceView = current.desktopSurfaceView ?? {
    tooltipScalePercent: 100,
    controlIconScalePercent: 100,
    dockIconScalePercent: 100,
    conversationTextScalePercent: 100,
    sourceCodeTextScalePercent: 100
  };

  return {
    ...current,
    ...patch,
    desktopSurfaceView: {
      tooltipScalePercent:
        patch.desktopSurfaceView?.tooltipScalePercent ??
        currentDesktopSurfaceView.tooltipScalePercent,
      controlIconScalePercent:
        patch.desktopSurfaceView?.controlIconScalePercent ??
        currentDesktopSurfaceView.controlIconScalePercent,
      dockIconScalePercent:
        patch.desktopSurfaceView?.dockIconScalePercent ??
        currentDesktopSurfaceView.dockIconScalePercent,
      conversationTextScalePercent:
        patch.desktopSurfaceView?.conversationTextScalePercent ??
        currentDesktopSurfaceView.conversationTextScalePercent,
      sourceCodeTextScalePercent:
        patch.desktopSurfaceView?.sourceCodeTextScalePercent ??
        currentDesktopSurfaceView.sourceCodeTextScalePercent
    },
    lispCodeView: {
      ...current.lispCodeView,
      ...patch.lispCodeView
    }
  };
}

function normalizeCommandResultLike<T>(
  value: unknown
): CommandResultDto<T> | null {
  if (value === null || value === false || value === "null" || value === undefined) {
    return null;
  }

  return value as CommandResultDto<T>;
}

function normalizeDesktopPreferencesPayload(
  payload: Partial<DesktopPreferencesDto> | null | undefined
): Partial<DesktopPreferencesDto> {
  if (!payload) {
    return {};
  }

  const normalized: Partial<DesktopPreferencesDto> = {
    ...payload
  };

  if (payload.projects && typeof payload.projects === "object") {
    normalized.projects = Array.isArray(payload.projects)
      ? payload.projects
      : Object.values(payload.projects).filter((project) => Boolean(project && typeof project === "object")) as ProjectProfileDto[];
  }

  if (payload.replSessionsByProject && typeof payload.replSessionsByProject === "object") {
    normalized.replSessionsByProject = Object.fromEntries(
      Object.entries(payload.replSessionsByProject).map(([projectId, sessions]) => [
        projectId,
        Array.isArray(sessions)
          ? sessions.map((session) => ({
              ...session,
              history: Array.isArray(session.history) ? session.history : []
            }))
          : []
      ])
    );
  }

  if (payload.editorBuffersByProject && typeof payload.editorBuffersByProject === "object") {
    normalized.editorBuffersByProject = Object.fromEntries(
      Object.entries(payload.editorBuffersByProject).map(([projectId, buffers]) => [
        projectId,
        Array.isArray(buffers)
          ? buffers.map((buffer) => ({
              ...buffer,
              result: normalizeCommandResultLike<RuntimeEvalResultDto>(buffer.result)
            }))
          : []
      ])
    );
  }

  if (payload.workspaceHistoryByProject && typeof payload.workspaceHistoryByProject === "object") {
    normalized.workspaceHistoryByProject = Object.fromEntries(
      Object.entries(payload.workspaceHistoryByProject).map(([projectId, history]) => [
        projectId,
        Array.isArray(history) ? history : []
      ])
    );
  }

  if (payload.workspaceResultByProject && typeof payload.workspaceResultByProject === "object") {
    normalized.workspaceResultByProject = Object.fromEntries(
      Object.entries(payload.workspaceResultByProject).map(([projectId, result]) => [
        projectId,
        normalizeCommandResultLike<RuntimeEvalResultDto>(result)
      ])
    );
  }

  return normalized;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
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
                state: Number(operatorStatus.openIncidentCount ?? 0) > 0 ? "open" : "recovering"
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
                state: "awaiting"
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

async function sampleProcessUsage(
  pid: number | null | undefined
): Promise<Partial<RuntimeTelemetryProcessDto>> {
  if (!pid || !Number.isFinite(pid)) {
    return {};
  }

  try {
    const { stdout } = await execFileAsync("ps", [
      "-p",
      String(pid),
      "-o",
      "%cpu=,rss=,etime=,state=,command="
    ]);
    const line = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);
    if (!line) {
      return {};
    }

    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!match) {
      return {};
    }

    return {
      cpuPercent: Number.parseFloat(match[1]),
      memoryMb: Number.parseFloat(match[2]) / 1024,
      elapsed: match[3],
      command: match[5]
    };
  } catch {
    return {};
  }
}

async function sampleOpenConnectionCount(
  pid: number | null | undefined
): Promise<number | null> {
  if (!pid || !Number.isFinite(pid)) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", "-a", "-p", String(pid), "-i"]);
    const lines = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return Math.max(0, lines.length - 1);
  } catch {
    return null;
  }
}

async function sampleHostNetworkBytes(): Promise<{ inboundBytes: number; outboundBytes: number } | null> {
  try {
    const { stdout } = await execFileAsync("netstat", ["-ib"]);
    const totals = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && !entry.startsWith("Name"))
      .reduce(
        (accumulator, line) => {
          const columns = line.split(/\s+/);
          if (columns.length < 10) {
            return accumulator;
          }

          const name = columns[0];
          if (!name || name.startsWith("lo")) {
            return accumulator;
          }

          const inboundBytes = Number(columns[6]);
          const outboundBytes = Number(columns[9]);
          if (Number.isFinite(inboundBytes)) {
            accumulator.inboundBytes += inboundBytes;
          }
          if (Number.isFinite(outboundBytes)) {
            accumulator.outboundBytes += outboundBytes;
          }
          return accumulator;
        },
        { inboundBytes: 0, outboundBytes: 0 }
      );

    return totals.inboundBytes > 0 || totals.outboundBytes > 0 ? totals : null;
  } catch {
    return null;
  }
}

async function sampleHostDiskThroughputKbps(): Promise<{ readKbps: number; writeKbps: number } | null> {
  try {
    const { stdout } = await execFileAsync("iostat", ["-d", "-K", "-w", "1", "-c", "2"]);
    const lines = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const dataLines = lines.filter((line) => !line.startsWith("disk") && !line.startsWith("cpu"));
    if (dataLines.length === 0) {
      return null;
    }

    const sampleLine = dataLines[dataLines.length - 1];
    const columns = sampleLine.split(/\s+/);
    if (columns.length < 3) {
      return null;
    }

    let readKbps = 0;
    let writeKbps = 0;
    for (let index = 0; index + 2 < columns.length; index += 3) {
      const kbPerTransfer = Number(columns[index]);
      const transfersPerSecond = Number(columns[index + 1]);
      const mbPerSecond = Number(columns[index + 2]);
      if (!Number.isFinite(kbPerTransfer) || !Number.isFinite(transfersPerSecond)) {
        continue;
      }

      const aggregateKbps =
        Number.isFinite(mbPerSecond) && mbPerSecond > 0
          ? mbPerSecond * 1024
          : kbPerTransfer * transfersPerSecond;
      readKbps += aggregateKbps / 2;
      writeKbps += aggregateKbps / 2;
    }

    if (readKbps <= 0 && writeKbps <= 0) {
      return null;
    }

    return {
      readKbps: Number(readKbps.toFixed(1)),
      writeKbps: Number(writeKbps.toFixed(1))
    };
  } catch {
    return null;
  }
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
  }
): CommandResultDto<RuntimeEvalResultDto> {
  const data = asRecord(response.data);
  const metadata = normalizeMetadata(response.metadata);
  const rawResult = data.result;
  const normalizedResult = camelizeKeys(rawResult);
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
      kind === "variable"
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
      nicknames: asStringArray(data.nicknames),
      useList,
      externalSymbols: externalSymbols.map(adaptSymbol),
      internalSymbols: internalSymbols.map(adaptSymbol),
      summary: String(data.summary ?? "Package browser data projected from the live runtime.")
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
    payload: (event.payload as Record<string, unknown> | undefined) ?? {}
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

function diagnosticKindForPath(path: string): DiagnosticReportKind {
  if (path.endsWith(".crash")) {
    return "crash";
  }
  if (path.endsWith(".spin")) {
    return "spin";
  }
  if (path.endsWith(".log")) {
    return "log";
  }
  return "diagnostic";
}

interface DiagnosticPreviewMetadata {
  appName: string | null;
  processName: string | null;
  pid: number | null;
  timestamp: string | null;
  incidentId: string | null;
  parentProc: string | null;
  responsibleProc: string | null;
  bugType: string | null;
}

function processNameFromDiagnosticFile(fileName: string): string | null {
  const [processName] = fileName.split("_");
  return processName && processName.length > 0 ? processName : null;
}

function diagnosticPreviewMetadata(content: string): DiagnosticPreviewMetadata {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

  let header: Record<string, unknown> = {};
  try {
    header = firstLine.startsWith("{") ? asRecord(JSON.parse(firstLine)) : {};
  } catch {
    header = {};
  }

  const matchString = (pattern: RegExp): string | null => {
    const match = pattern.exec(content);
    return match?.[1] ?? null;
  };

  const matchNumber = (pattern: RegExp): number | null => {
    const raw = matchString(pattern);
    if (!raw) {
      return null;
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  };

  return {
    appName: firstString(header.app_name, header.name) ?? null,
    processName: firstString(matchString(/"procName"\s*:\s*"([^"]+)"/), header.app_name, header.name) ?? null,
    pid: matchNumber(/"pid"\s*:\s*(\d+)/),
    timestamp: firstString(header.timestamp, matchString(/"captureTime"\s*:\s*"([^"]+)"/)) ?? null,
    incidentId: firstString(header.incident_id, matchString(/"incident"\s*:\s*"([^"]+)"/)) ?? null,
    parentProc: matchString(/"parentProc"\s*:\s*"([^"]+)"/),
    responsibleProc: matchString(/"responsibleProc"\s*:\s*"([^"]+)"/),
    bugType: firstString(header.bug_type, matchString(/"bug_type"\s*:\s*"([^"]+)"/)) ?? null
  };
}

function diagnosticKindFromMetadata(path: string, preview: DiagnosticPreviewMetadata): DiagnosticReportKind {
  if (path.endsWith(".ips")) {
    return preview.incidentId || preview.bugType ? "crash" : "analytics";
  }

  return diagnosticKindForPath(path);
}

function diagnosticSummary(
  kind: DiagnosticReportKind,
  processName: string | null,
  source: string,
  preview?: DiagnosticPreviewMetadata | null
): string {
  const provenance =
    preview?.parentProc || preview?.responsibleProc
      ? ` Parent: ${preview?.parentProc ?? "unknown"}, responsible: ${preview?.responsibleProc ?? "unknown"}.`
      : "";
  switch (kind) {
    case "crash":
      return `${processName ?? "Process"} crash report retained from ${source}.${provenance}`;
    case "spin":
      return `${processName ?? "Process"} spin report retained from ${source}.${provenance}`;
    case "analytics":
      return `${processName ?? "Process"} analytics report retained from ${source}.${provenance}`;
    case "log":
      return `${processName ?? "Process"} log report retained from ${source}.${provenance}`;
    default:
      return `Retained host diagnostic report from ${source}.${provenance}`;
  }
}

async function collectHostDiagnosticReports(limit = 40): Promise<DiagnosticReportSummaryDto[]> {
  const roots = [
    resolve(os.homedir(), "Library/Logs/DiagnosticReports"),
    "/Library/Logs/DiagnosticReports"
  ];
  const entries: DiagnosticReportSummaryDto[] = [];

  for (const root of roots) {
    try {
      const names = await readdir(root);
      for (const name of names) {
        const fullPath = resolve(root, name);
        try {
          const info = await stat(fullPath);
          if (!info.isFile()) {
            continue;
          }
          let preview: DiagnosticPreviewMetadata | null = null;
          try {
            preview = diagnosticPreviewMetadata((await readFile(fullPath, "utf8")).slice(0, 8192));
          } catch {
            preview = null;
          }
          const processName = preview?.processName ?? processNameFromDiagnosticFile(name);
          const kind = diagnosticKindFromMetadata(name, preview ?? diagnosticPreviewMetadata(""));
          entries.push({
            reportId: fullPath,
            kind,
            title: name,
            summary: diagnosticSummary(kind, processName, basename(root), preview),
            source: basename(root),
            processName,
            pid: preview?.pid ?? null,
            createdAt: preview?.timestamp ?? info.mtime.toISOString(),
            path: fullPath
          });
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return entries
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function consoleTypeFromHostLogLevel(level: string | undefined): ConsoleLogEntryDto["type"] {
  switch ((level ?? "").toLowerCase()) {
    case "debug":
      return "debug";
    case "notice":
      return "notice";
    case "error":
      return "error";
    case "fault":
      return "fault";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

function parseHostLogJsonLines(stdout: string): Array<Record<string, unknown>> {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((entry) => asRecord(entry)) : [];
    } catch {
      return [];
    }
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        return [asRecord(JSON.parse(line))];
      } catch {
        return [];
      }
    });
}

async function collectHostConsoleEntries(limit = 80): Promise<ConsoleLogEntryDto[]> {
  try {
    const predicate =
      'process == "sbcl" OR process == "Electron" OR process CONTAINS "sbcl-agent" OR subsystem CONTAINS "electron"';
    const { stdout } = await execFileAsync("log", [
      "show",
      "--style",
      "json",
      "--last",
      "10m",
      "--predicate",
      predicate
    ]);
    const records = parseHostLogJsonLines(stdout);
    return records
      .map((record, index) => {
        const processName =
          firstString(record.process, record.processImagePath && basename(String(record.processImagePath))) ?? "host";
        const source = firstString(record.subsystem, record.category, processName) ?? "host";
        const message = firstString(record.eventMessage, record.message) ?? "Host console entry";
        const timestamp = firstString(record.timestamp, record.date) ?? new Date().toISOString();
        return {
          entryId: `host:${index}:${timestamp}`,
          cursor: index,
          plane: "host" as const,
          timestamp,
          type: consoleTypeFromHostLogLevel(firstString(record.messageType, record.level)),
          category: firstString(record.category, record.subsystem) ?? "host",
          source,
          message,
          processName,
          pid:
            typeof record.processID === "number"
              ? record.processID
              : typeof record.pid === "number"
                ? record.pid
                : null,
          threadId: firstString(record.threadID, record.threadIdentifier) ?? null,
          activityId: firstString(record.activityIdentifier) ?? null,
          environmentId: null,
          runtimeId: null,
          workItemId: null,
          workflowRecordId: null,
          incidentId: null,
          threadRefId: null,
          turnRefId: null,
          visibility: "operator",
          detail: JSON.stringify(record, null, 2)
        };
      })
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
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
        state: inferApprovalState(waitReason)
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
      state: incidentState(item.status as string | undefined)
    })),
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptIncidentDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<IncidentDetailDto> {
  const data = asRecord(response.data);
  const runtimeContext = asRecord(data.runtimeContext);
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

function adaptSendConversationMessageResponse(
  response: RawServiceResponse<Record<string, unknown>>
): CommandResultDto<SendConversationMessageResultDto> {
  const data = asRecord(response.data);
  const thread = asRecord(data.thread);
  const turn = asRecord(data.turn);
  const assistantMessage = asRecord(data.assistantMessage);

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
      assistantMessage: String(assistantMessage.content ?? data.message ?? ""),
      summary: String(
        data.outcomeSummary ??
          data.reasoningSummary ??
          assistantMessage.content ??
          "Conversation turn executed."
      )
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptTurnDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<TurnDetailDto> {
  const data = asRecord(response.data);
  const detailSummary = asRecord(data.detailSummary);
  const userMessage = asRecord(data.userMessage);
  const approvalSummary = asRecord(data.awaitingApproval);
  const workItemId = detailSummary.workItemId ? String(detailSummary.workItemId) : null;
  const approvalIds = [
    ...(workItemId && approvalSummary.awaitingApprovalP ? [workItemId] : []),
    ...asRecordArray(approvalSummary.blockedOperations).map((operation) =>
      String(operation.operationId ?? operation.policyId ?? "approval")
    )
  ];
  const recovery = asRecord(data.recovery);
  const incidents = asRecordArray(data.incidents);
  const artifacts = asRecordArray(data.artifacts);
  const operations = asRecordArray(data.operations);

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
      artifactIds: artifacts.map((artifact) => String(artifact.id ?? "artifact")),
      incidentIds: incidents.map((incident) => String(incident.id ?? "incident")),
      approvalIds,
      workItemIds: [
        ...(workItemId ? [workItemId] : []),
        ...asRecordArray(recovery.resumableOperations).flatMap((operation) =>
          operation.workItemId ? [String(operation.workItemId)] : []
        )
      ]
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

export class LiveSbclAgentHostAdapter implements SbclAgentHostAdapter {
  private currentBinding: BindingDto | null = DEFAULT_LIVE_BINDING;
  private bridgeQueue: Promise<void> = Promise.resolve();
  private focusedWorkspaceOverride: WorkspaceId | null = null;

  private preferences: DesktopPreferencesDto = {
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
  private desktopPreferencesWriteQueue: Promise<DesktopPreferencesDto> = Promise.resolve(this.preferences);

  constructor(private readonly options: LiveAdapterOptions) {}

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
    const nextBinding: BindingDto = {
      environmentId,
      sessionId: "desktop-session-live"
    };

    this.currentBinding = nextBinding;

    return {
      contractVersion: 1,
      domain: "host",
      operation: "host.set_environment_binding",
      kind: "command",
      status: "ok",
      data: nextBinding,
      metadata: {
        authority: "environment",
        binding: nextBinding
      }
    };
  }

  async getEnvironmentImageRegistry(): Promise<QueryResultDto<EnvironmentImageRegistryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.image-registry",
      this.currentBinding?.environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "environment",
      operation: "environment.image-registry",
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: response.data as unknown as EnvironmentImageRegistryDto,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.load-image",
      this.currentBinding?.environmentId,
      { imageIdOrName }
    );
    const summary = response.data.summary as Record<string, unknown> | undefined;
    const environmentId =
      (summary?.id as string | undefined) ??
      (response.metadata?.environmentId as string | undefined) ??
      this.currentBinding?.environmentId ??
      DEFAULT_LIVE_BINDING.environmentId;
    const binding: BindingDto = {
      environmentId,
      sessionId: this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
    };
    this.currentBinding = binding;
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.load_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: binding,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.save-image",
      this.currentBinding?.environmentId,
      { imageName: input.name, overwrite: Boolean(input.overwrite) }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.save_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: response.data.image as EnvironmentImageRecordDto,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.revert-image",
      this.currentBinding?.environmentId
    );
    const summary = response.data.summary as Record<string, unknown> | undefined;
    const binding: BindingDto = {
      environmentId:
        (summary?.id as string | undefined) ??
        this.currentBinding?.environmentId ??
        DEFAULT_LIVE_BINDING.environmentId,
      sessionId: this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
    };
    this.currentBinding = binding;
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.revert_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: binding,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.summary",
      environmentId
    );
    return adaptEnvironmentSummaryResponse(response);
  }

  async environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.status",
      environmentId
    );
    return adaptEnvironmentStatusResponse(response);
  }

  async workspaceSummary(environmentId?: string): Promise<QueryResultDto<WorkspaceSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "workspace.summary",
      environmentId
    );
    return adaptWorkspaceSummaryResponse(response);
  }

  async desktopModel(environmentId?: string): Promise<QueryResultDto<DesktopModelDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.show",
      environmentId
    );
    return adaptDesktopModelResponse(response);
  }

  async environmentEvents(
    input: EventSubscriptionInput
  ): Promise<QueryResultDto<EnvironmentEventDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "events.stream",
      input.environmentId,
      {
        afterCursor: input.fromCursor,
        family: input.families?.[0],
        visibility: input.visibility?.[0],
        limit: 50
      }
    );
    return adaptEventStreamResponse(response);
  }

  async consoleLogStream(
    input: ConsoleLogQueryInput
  ): Promise<QueryResultDto<ConsoleLogStreamDto>> {
    if ((input.plane ?? "environment") === "host") {
      const entries = await collectHostConsoleEntries(input.limit ?? 80);
      const typeFilter = input.types?.length ? new Set(input.types) : null;
      const sourceFilter = input.sources?.length ? new Set(input.sources) : null;
      const filtered = entries.filter((entry) => {
        if (typeFilter && !typeFilter.has(entry.type)) {
          return false;
        }
        if (sourceFilter && !sourceFilter.has(entry.source)) {
          return false;
        }
        return true;
      });
      return {
        contractVersion: 1,
        domain: "console",
        operation: "console.stream",
        kind: "query",
        status: "ok",
        data: {
          plane: "host",
          entries: filtered,
          nextCursor: filtered[filtered.length - 1]?.cursor ?? null,
          summary:
            filtered.length > 0
              ? `Projected ${filtered.length} host console entries from recent macOS log history.`
              : "No recent host console entries matched the current host-console filter."
        },
        metadata: {
          authority: "environment",
          binding: this.currentBinding,
          readModel: "host-console-stream-v1"
        }
      };
    }
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "console.stream",
      input.environmentId,
      {
        afterCursor: input.fromCursor,
        limit: input.limit ?? 50,
        type: input.types?.[0],
        source: input.sources?.[0]
      }
    );
    return adaptConsoleLogStreamResponse(response);
  }

  async diagnosticReportList(
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportSummaryDto[]>> {
    const reports = await collectHostDiagnosticReports();
    return {
      contractVersion: 1,
      domain: "diagnostic",
      operation: "diagnostic.report_list",
      kind: "query",
      status: "ok",
      data: reports,
      metadata: {
        authority: "environment",
        binding: {
          environmentId: environmentId ?? this.currentBinding?.environmentId ?? "live-environment",
          sessionId: this.currentBinding?.sessionId ?? null
        },
        readModel: "host-diagnostic-report-list-v1"
      }
    };
  }

  async diagnosticReportDetail(
    reportId: string,
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportDetailDto>> {
    let contentPreview: string | null = null;
    let byteSize: number | null = null;
    try {
      const info = await stat(reportId);
      byteSize = info.size;
      contentPreview = (await readFile(reportId, "utf8")).slice(0, 12000);
    } catch {
      contentPreview = null;
    }
    const summary =
      (await this.diagnosticReportList(environmentId)).data.find((report) => report.reportId === reportId) ?? {
        reportId,
        kind: diagnosticKindForPath(reportId),
        title: basename(reportId),
        summary: diagnosticSummary(diagnosticKindForPath(reportId), processNameFromDiagnosticFile(basename(reportId)), basename(dirname(reportId))),
        source: basename(dirname(reportId)),
        processName: processNameFromDiagnosticFile(basename(reportId)),
        pid: null,
        createdAt: new Date().toISOString(),
        path: reportId
      };
    const preview = contentPreview ? diagnosticPreviewMetadata(contentPreview) : null;
    const resolvedKind = diagnosticKindFromMetadata(reportId, preview ?? diagnosticPreviewMetadata(""));
    return {
      contractVersion: 1,
      domain: "diagnostic",
      operation: "diagnostic.report_detail",
      kind: "query",
      status: "ok",
      data: {
        ...summary,
        kind: resolvedKind,
        processName: preview?.processName ?? summary.processName ?? null,
        pid: preview?.pid ?? summary.pid ?? null,
        createdAt: preview?.timestamp ?? summary.createdAt,
        summary: diagnosticSummary(
          resolvedKind,
          preview?.processName ?? summary.processName ?? null,
          summary.source,
          preview
        ),
        contentPreview,
        metadata: {
          authority: "host",
          bytesPreviewed: contentPreview?.length ?? 0,
          byteSize,
          extension: reportId.split(".").pop() ?? null,
          rootCategory: basename(dirname(reportId)),
          incidentId: preview?.incidentId ?? null,
          parentProc: preview?.parentProc ?? null,
          responsibleProc: preview?.responsibleProc ?? null,
          bugType: preview?.bugType ?? null,
          appName: preview?.appName ?? null
        }
      },
      metadata: {
        authority: "environment",
        binding: {
          environmentId: environmentId ?? this.currentBinding?.environmentId ?? "live-environment",
          sessionId: this.currentBinding?.sessionId ?? null
        },
        readModel: "host-diagnostic-report-detail-v1"
      }
    };
  }

  async artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "artifact.list",
      environmentId
    );
    return adaptArtifactListResponse(response);
  }

  async artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "artifact.detail",
      environmentId,
      { artifactId }
    );
    return adaptArtifactDetailResponse(response);
  }

  async threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "conversation.thread-list",
      environmentId
    );
    const adapted = adaptThreadListResponse(response);
    const enrichedData: ThreadSummaryDto[] = [];

    for (const thread of adapted.data) {
      try {
        const detailResponse = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
          "conversation.thread-detail",
          environmentId,
          { threadId: thread.threadId }
        );
        enrichedData.push(enrichThreadSummaryFromDetail(thread, detailResponse));
      } catch {
        enrichedData.push(thread);
      }
    }

    return {
      ...adapted,
      data: enrichedData
    };
  }

  async threadDetail(
    threadId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ThreadDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.thread-detail",
      environmentId,
      { threadId }
    );
    return adaptThreadDetailResponse(response);
  }

  async turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.turn-detail",
      environmentId,
      { turnId }
    );
    return adaptTurnDetailResponse(response);
  }

  async createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.create-thread",
      input.environmentId,
      {
        title: input.title,
        summary: input.summary
      }
    );
    return adaptCreateConversationThreadResponse(response);
  }

  async updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.update-thread",
      input.environmentId,
      {
        threadId: input.threadId,
        title: input.title,
        summary: input.summary
      }
    );
    return adaptCreateConversationThreadResponse(response);
  }

  async sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const response = await this.invokeStreamingService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.send-message-stream",
      input.environmentId,
      {
        threadId: input.threadId,
        prompt: input.prompt,
        attachments: input.attachments ?? []
      },
      onEvent
    );
    return adaptSendConversationMessageResponse(response);
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
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.summary",
      environmentId
    );
    return adaptRuntimeSummaryResponse(response);
  }

  async calculatorSummary(environmentId?: string): Promise<QueryResultDto<CalculatorSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.summary",
      environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "calculator",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: camelizeKeys(response.data) as CalculatorSummaryDto,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async runtimeTelemetrySnapshot(
    environmentId?: string
  ): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.telemetry",
      environmentId
    );
    return adaptRuntimeTelemetryResponse(response);
  }

  async runtimeInspectSymbol(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }): Promise<QueryResultDto<RuntimeInspectionResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.inspect-symbol",
      input.environmentId,
      {
        symbol: input.symbol,
        packageName: input.packageName,
        mode: input.mode
      }
    );
    return adaptRuntimeInspectionResponse(response, input);
  }

  async runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.entity-detail",
      input.environmentId,
      {
        symbol: input.symbol,
        packageName: input.packageName
      }
    );
    return adaptRuntimeEntityDetailResponse(response, input);
  }

  async packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.package-browser",
      input.environmentId,
      { packageName: input.packageName }
    );
    return adaptPackageBrowserResponse(response);
  }

  async fileSystemDirectory(input?: {
    path?: string;
  }): Promise<QueryResultDto<FileSystemDirectoryListingDto>> {
    const currentPath = resolve(input?.path && input.path.trim().length > 0 ? input.path : this.options.projectDir);
    const entries = await readdir(currentPath, { withFileTypes: true }).catch((error) => {
      if (error && typeof error === "object" && "code" in error && (error.code === "EPERM" || error.code === "EACCES")) {
        return [];
      }
      throw error;
    });
    const directories: FileSystemEntryDto[] = [];
    const files: FileSystemEntryDto[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = resolve(currentPath, entry.name);
      if (entry.isDirectory()) {
        directories.push({ name: entry.name, path: entryPath, kind: "directory" });
        continue;
      }
      if (entry.isFile()) {
        files.push({ name: entry.name, path: entryPath, kind: "file" });
        continue;
      }
      const entryStat = await stat(entryPath).catch(() => null);
      if (entryStat?.isDirectory()) {
        directories.push({ name: entry.name, path: entryPath, kind: "directory" });
      } else if (entryStat?.isFile()) {
        files.push({ name: entry.name, path: entryPath, kind: "file" });
      }
    }

    directories.sort((left, right) => left.name.localeCompare(right.name));
    files.sort((left, right) => left.name.localeCompare(right.name));

    return {
      contractVersion: 1,
      domain: "filesystem",
      operation: "filesystem.directory",
      kind: "query",
      status: "ok",
      data: {
        currentPath,
        parentPath: dirname(currentPath) === currentPath ? null : dirname(currentPath),
        directories,
        files
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async sourcePreview(input: {
    environmentId: string;
    path: string;
    line?: number;
    contextRadius?: number;
  }): Promise<QueryResultDto<SourcePreviewDto>> {
    const absolutePath = input.path.startsWith("/")
      ? input.path
      : resolve(this.options.projectDir, input.path);
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split("\n");
    const focusLine = input.line ?? 1;
    const radius = input.contextRadius ?? 8;
    const startLine = Math.max(1, focusLine - radius);
    const endLine = Math.min(lines.length, focusLine + radius);
    const snippet = lines.slice(startLine - 1, endLine).join("\n");

    return {
      contractVersion: 1,
      domain: "source",
      operation: "source.preview",
      kind: "query",
      status: "ok",
      data: {
        path: absolutePath,
        language: absolutePath.endsWith(".lisp") || absolutePath.endsWith(".lsp") || absolutePath.endsWith(".asd")
          ? "lisp"
          : "text",
        focusLine,
        startLine,
        endLine,
        summary: `Source preview for ${absolutePath}.`,
        content: snippet,
        editableContent: content
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async writeSourceFile(input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<FileSystemWriteResultDto>> {
    const absolutePath = input.path.startsWith("/")
      ? input.path
      : resolve(this.options.projectDir, input.path);
    const existingStat = await stat(absolutePath).catch(() => null);
    if (existingStat?.isDirectory()) {
      throw new Error(`Cannot save source into directory path: ${absolutePath}`);
    }
    if (existingStat && !input.overwrite) {
      throw new Error(`File already exists and overwrite was not confirmed: ${absolutePath}`);
    }
    await writeFile(absolutePath, input.content, "utf8");
    const overwritten = Boolean(existingStat);

    return {
      contractVersion: 1,
      domain: "filesystem",
      operation: "filesystem.write-source-file",
      kind: "command",
      status: "ok",
      data: {
        path: absolutePath,
        overwritten,
        summary: overwritten
          ? `Overwrote source file ${absolutePath}.`
          : `Saved new source file ${absolutePath}.`
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async evaluateInContext(
    input: {
      environmentId: string;
      form: string;
      packageName?: string;
    }
  ): Promise<CommandResultDto<RuntimeEvalResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.eval",
      input.environmentId,
      {
        form: input.form,
        packageName: input.packageName
      }
    );

    return adaptRuntimeEvalResponse(response, input);
  }

  async evaluateCalculator(
    input: CalculatorEvaluateInput
  ): Promise<CommandResultDto<CalculatorResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.evaluate",
      input.environmentId,
      input as unknown as Record<string, unknown>
    );

    return {
      contractVersion: response.contractVersion,
      domain: "calculator",
      operation: response.operation,
      kind: "command",
      status: normalizeCommandStatus(response.status),
      data: camelizeKeys(response.data) as CalculatorResultDto,
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "source.stage-change",
      input.environmentId,
      {
        path: input.path,
        content: input.content
      }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "source",
      operation: "source.stage_change",
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
        path: String(response.data.path ?? input.path),
        summary: String(response.data.summary ?? "Source change staged through governed workspace mutation."),
        bytesWritten: response.data.bytesWritten ? Number(response.data.bytesWritten) : input.content.length,
        artifactIds: asStringArray(response.data.artifactIds),
        approvalId: response.data.approvalId ? String(response.data.approvalId) : null,
        workItemId: response.data.workItemId ? String(response.data.workItemId) : null
      },
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.reload-file",
      input.environmentId,
      { path: input.path }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "runtime",
      operation: "runtime.reload_file",
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
        path: String(response.data.path ?? input.path),
        summary: String(response.data.summary ?? "Runtime reload executed for the selected source file."),
        artifactIds: asStringArray(response.data.artifactIds),
        approvalId: response.data.approvalId ? String(response.data.approvalId) : null,
        incidentId: response.data.incidentId ? String(response.data.incidentId) : null,
        workItemId: response.data.workItemId ? String(response.data.workItemId) : null
      },
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async desktopAction(
    input: DesktopActionInput
  ): Promise<CommandResultDto<DesktopActionResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.action",
      input.environmentId,
      camelizeKeys({
        actionId: input.actionId,
        actionKind: input.actionKind,
        panelId: input.panelId,
        command: input.command,
        index: input.index,
        executionId: input.executionId,
        objectKind: input.objectKind,
        params: input.params
      }) as Record<string, unknown>
    );
    return adaptDesktopActionResponse(response);
  }

  async desktopRestore(
    input: DesktopRestoreInput
  ): Promise<CommandResultDto<DesktopRestoreResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.restore",
      input.environmentId,
      camelizeKeys({
        panelId: input.panelId,
        panelState: input.panelState
      }) as Record<string, unknown>
    );
    return adaptDesktopRestoreResponse(response);
  }

  async approvalRequestList(
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestSummaryDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "approval.list",
      environmentId
    );
    return adaptApprovalListResponse(response);
  }

  async approvalRequestDetail(
    requestId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "approval.detail",
      environmentId,
      { requestId }
    );
    return adaptApprovalDetailResponse(response);
  }

  async approveRequest(
    input: ApprovalDecisionInput
  ): Promise<CommandResultDto<ApprovalDecisionDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "approval.approve",
      input.environmentId,
      { requestId: input.requestId }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "approval",
      operation: "approval.approve",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: {
        requestId: String(response.data.requestId ?? input.requestId),
        decision: "approved",
        summary: String(
          response.data.summary ?? "Approval granted. Governed work resumed in the live environment."
        ),
        resumedEntityIds: asStringArray(response.data.resumedEntityIds)
      },
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "approval.deny",
      input.environmentId,
      { requestId: input.requestId }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "approval",
      operation: "approval.deny",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: {
        requestId: String(response.data.requestId ?? input.requestId),
        decision: "denied",
        summary: String(
          response.data.summary ??
            "Approval denied. The governed work item has been moved into operator review."
        ),
        resumedEntityIds: asStringArray(response.data.resumedEntityIds)
      },
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async incidentList(environmentId?: string): Promise<QueryResultDto<IncidentSummaryDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "incident.list",
      environmentId
    );
    return adaptIncidentListResponse(response);
  }

  async incidentDetail(
    incidentId: string,
    environmentId?: string
  ): Promise<QueryResultDto<IncidentDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "incident.detail",
      environmentId,
      { incidentId }
    );
    return adaptIncidentDetailResponse(response);
  }

  async updateIncidentRemediationPlan(
    input: UpdateIncidentRemediationPlanInput
  ): Promise<CommandResultDto<IncidentDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "incident.set-remediation-plan",
      input.environmentId,
      {
        incidentId: input.incidentId,
        remediationPlan: input.remediationPlan
      }
    );
    const adapted = adaptIncidentDetailResponse(response);
    return {
      ...adapted,
      kind: "command",
      status: response.status === "error" ? "error" : "ok"
    };
  }

  async createIntent(
    input: CreateIntentInput
  ): Promise<CommandResultDto<IntentDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "intent.create",
      input.environmentId,
      {
        description: input.description,
        scope: input.scope,
        constraints: input.constraints,
        expectedBehaviors: input.expectedBehaviors,
        nonGoals: input.nonGoals,
        priority: input.priority,
        version: input.version,
        status: input.status,
        linkedRuntimeObjects: input.linkedRuntimeObjects,
        linkedSourceArtifacts: input.linkedSourceArtifacts,
        linkedEventIds: input.linkedEventIds,
        linkedMutationIds: input.linkedMutationIds,
        metadata: input.metadata
      }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "intent",
      operation: "intent.create",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: adaptIntentDetail(asRecord(response.data)) ?? {
        id: "",
        description: input.description,
        status: input.status ?? "active",
        priority: input.priority ?? null,
        version: input.version ?? 1,
        scopeSummary: null,
        linkedRuntimeObjectCount: 0,
        linkedSourceArtifactCount: 0,
        linkedEventCount: 0,
        linkedMutationCount: 0,
        createdAt: null,
        updatedAt: null,
        scope: input.scope ?? null,
        constraints: input.constraints ?? [],
        expectedBehaviors: input.expectedBehaviors ?? [],
        nonGoals: input.nonGoals ?? [],
        linkedRuntimeObjects: input.linkedRuntimeObjects ?? [],
        linkedSourceArtifacts: input.linkedSourceArtifacts ?? [],
        linkedEventIds: input.linkedEventIds ?? [],
        linkedMutationIds: input.linkedMutationIds ?? [],
        metadata: input.metadata ?? null,
        current: true,
        diff: null
      },
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async createProject(
    input: CreateProjectInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.create",
      input.environmentId,
      {
        title: input.title,
        summary: input.summary
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectConstitution(
    input: UpdateProjectConstitutionInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-constitution",
      input.environmentId,
      {
        projectId: input.projectId,
        constitution: input.constitution
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectDesignSystem(
    input: UpdateProjectDesignSystemInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-design-system",
      input.environmentId,
      {
        projectId: input.projectId,
        designSystem: input.designSystem
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectStyleGuide(
    input: UpdateProjectStyleGuideInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-style-guide",
      input.environmentId,
      {
        projectId: input.projectId,
        styleGuide: input.styleGuide
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectTestingStrategy(
    input: UpdateProjectTestingStrategyInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-testing-strategy",
      input.environmentId,
      {
        projectId: input.projectId,
        testingStrategy: input.testingStrategy
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectReleaseReadiness(
    input: UpdateProjectReleaseReadinessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-release-readiness",
      input.environmentId,
      {
        projectId: input.projectId,
        releaseReadiness: input.releaseReadiness
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async updateProjectReadinessObligations(
    input: UpdateProjectReadinessObligationsInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-readiness-obligations",
      input.environmentId,
      {
        projectId: input.projectId,
        readinessObligations: input.readinessObligations
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectRequirement(
    input: AppendProjectRequirementInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-requirement",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        scope: input.scope,
        kind: input.kind,
        priority: input.priority,
        status: input.status,
        verificationKind: input.verificationKind,
        linkedArtifactIds: input.linkedArtifactIds,
        nonFunctional: input.nonFunctional
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectFeatureSpecification(
    input: AppendProjectFeatureSpecificationInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-feature-specification",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        acceptanceCriteria: input.acceptanceCriteria,
        linkedRequirementIds: input.linkedRequirementIds,
        linkedJourneyIds: input.linkedJourneyIds
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectUserJourney(
    input: AppendProjectUserJourneyInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-user-journey",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        actors: input.actors,
        entrypoints: input.entrypoints,
        steps: input.steps,
        outcomes: input.outcomes,
        edgeCases: input.edgeCases
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectArchitectureDecision(
    input: AppendProjectArchitectureDecisionInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-architecture-decision",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        drivers: input.drivers,
        consequences: input.consequences,
        stackChoices: input.stackChoices,
        linkedRequirementIds: input.linkedRequirementIds
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectSourceRoot(
    input: AppendProjectSourceRootInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-source-root",
      input.environmentId,
      {
        projectId: input.projectId,
        sourceRoot: input.sourceRoot
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async bindProjectTestingHarness(
    input: BindProjectTestingHarnessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.bind-testing-harness",
      input.environmentId,
      {
        projectId: input.projectId,
        harnessId: input.harnessId
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async appendProjectQualityGate(
    input: AppendProjectQualityGateInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-quality-gate",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        requiredHarnessIds: input.requiredHarnessIds,
        minimumLinkedWorkItems: input.minimumLinkedWorkItems,
        minimumLinkedIncidents: input.minimumLinkedIncidents,
        requireSourceRoots: input.requireSourceRoots,
        requiredTraceTargetKinds: input.requiredTraceTargetKinds,
        maximumFailedTests: input.maximumFailedTests,
        requireCoverage: input.requireCoverage,
        maximumSayTurnLatencySeconds: input.maximumSayTurnLatencySeconds,
        maximumEnvironmentSaveLoadSeconds: input.maximumEnvironmentSaveLoadSeconds,
        requireRecoveryReady: input.requireRecoveryReady
      }
    );
    return adaptCreateProjectResponse(response);
  }

  async resumeWorkItem(
    input: ResumeWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.resume",
      input.environmentId,
      {
        workItemId: input.workItemId,
        note: input.note
      }
    );
    return adaptWorkItemDetailCommandResponse(response);
  }

  async quarantineWorkItem(
    input: QuarantineWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.quarantine",
      input.environmentId,
      {
        workItemId: input.workItemId,
        reason: input.reason
      }
    );
    return adaptWorkItemDetailCommandResponse(response);
  }

  async rollbackWorkItem(
    input: RollbackWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.rollback",
      input.environmentId,
      {
        workItemId: input.workItemId,
        reason: input.reason,
        note: input.note
      }
    );
    return adaptWorkItemDetailCommandResponse(response);
  }

  async completeWorkItemValidations(
    input: CompleteWorkItemValidationsInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.complete-validations",
      input.environmentId,
      {
        workItemId: input.workItemId,
        status: input.status
      }
    );
    return adaptWorkItemDetailCommandResponse(response);
  }

  async steerWorkItem(
    input: SteerWorkItemInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.steer",
      input.environmentId,
      {
        workItemId: input.workItemId,
        phase: input.phase,
        nextStep: input.nextStep,
        note: input.note
      }
    );
    return adaptWorkItemDetailCommandResponse(response);
  }

  async projectList(environmentId?: string): Promise<QueryResultDto<ProjectListDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.list",
      environmentId
    );
    return adaptProjectListResponse(response);
  }

  async projectTestingHarnessInventory(environmentId?: string): Promise<QueryResultDto<ProjectTestingHarnessDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>[]>>(
      "project.testing-harness-inventory",
      environmentId
    );
    return {
      contractVersion: response.contractVersion ?? 1,
      domain: String(response.domain ?? "project"),
      operation: String(response.operation ?? "testing-harness-inventory"),
      kind: "query",
      status: String(response.status ?? "ok") as "ok" | "error",
      data: Array.isArray(response.data) ? response.data.map(adaptProjectTestingHarness) : [],
      metadata: normalizeMetadata(response.metadata)
    };
  }

  async projectDetail(projectId: string, environmentId?: string): Promise<QueryResultDto<ProjectDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.detail",
      environmentId,
      { projectId }
    );
    return adaptProjectDetailResponse(response);
  }

  async workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>> {
    const response = await this.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "work-item.list",
      environmentId
    );
    return adaptWorkItemListResponse(response);
  }

  async workItemDetail(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemDetailDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.detail",
      environmentId,
      { workItemId }
    );
    return adaptWorkItemDetailResponse(response);
  }

  async workItemPlan(
    workItemId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkItemPlanDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.plan",
      environmentId,
      { workItemId }
    );
    return adaptWorkItemPlanResponse(response);
  }

  async workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "workflow.record-detail",
      environmentId,
      { workflowRecordId }
    );
    return adaptWorkflowRecordDetailResponse(response);
  }

  async providerProfiles(environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.get",
      environmentId
    );
    return adaptProviderSummaryResponse(response);
  }

  async packageManagementSummary(
    environmentId?: string
  ): Promise<QueryResultDto<PackageManagementSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.summary",
      environmentId
    );
    return adaptPackageManagementSummaryResponse(response);
  }

  async focusWorkspace(workspace: WorkspaceId): Promise<void> {
    this.focusedWorkspaceOverride = workspace;
    this.preferences.lastWorkspace = workspace;
    await this.setDesktopPreferences({ lastWorkspace: workspace });
  }

  async getDesktopPreferences(): Promise<DesktopPreferencesDto> {
    const response = await this.invokeService<RawServiceResponse<Partial<DesktopPreferencesDto>>>(
      "desktop.preferences.get",
      this.currentBinding?.environmentId
    );
    this.preferences = mergeDesktopPreferences(
      this.preferences,
      normalizeDesktopPreferencesPayload(response.data)
    );
    if (this.focusedWorkspaceOverride) {
      this.preferences.lastWorkspace = this.focusedWorkspaceOverride;
    }
    return this.preferences;
  }

  async setDesktopPreferences(
    patch: Partial<DesktopPreferencesDto>
  ): Promise<DesktopPreferencesDto> {
    const write = async (): Promise<DesktopPreferencesDto> => {
      const currentResponse = await this.invokeService<RawServiceResponse<Partial<DesktopPreferencesDto>>>(
        "desktop.preferences.get",
        this.currentBinding?.environmentId
      );
      const currentPreferences = mergeDesktopPreferences(
        this.preferences,
        normalizeDesktopPreferencesPayload(currentResponse.data)
      );
      const nextPreferences = mergeDesktopPreferences(currentPreferences, patch);
      const response = await this.invokeService<RawServiceResponse<Partial<DesktopPreferencesDto>>>(
        "desktop.preferences.set",
        this.currentBinding?.environmentId,
        { desktopPreferences: nextPreferences }
      );
      if (patch.lastWorkspace) {
        this.focusedWorkspaceOverride = patch.lastWorkspace;
      }
      this.preferences = mergeDesktopPreferences(
        nextPreferences,
        normalizeDesktopPreferencesPayload(response.data)
      );
      return this.preferences;
    };

    const queued = this.desktopPreferencesWriteQueue.catch(() => this.preferences).then(write);
    this.desktopPreferencesWriteQueue = queued.catch(() => this.preferences);
    return queued;
  }

  async configureProviderProfile(
    input: ConfigureProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.configure",
      this.currentBinding?.environmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = adaptProviderSummaryResponse(response);
    if (input.activate) {
      return this.useProviderProfile({ profileName: input.profileName });
    }
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async useProviderProfile(
    input: UseProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.use",
      this.currentBinding?.environmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = adaptProviderSummaryResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async updateProviderRouting(
    input: UpdateProviderRoutingInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.routing",
      this.currentBinding?.environmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = adaptProviderSummaryResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async installQuicklispPackage(input: {
    environmentId: string;
    systemName: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.install-quicklisp",
      input.environmentId,
      { systemName: input.systemName }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async runQlotCommand(input: {
    environmentId: string;
    args: string[];
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.run-qlot",
      input.environmentId,
      { args: input.args }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async addSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.add-source-registry-entry",
      input.environmentId,
      { path: input.path }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async updateSourceRegistryEntry(input: {
    environmentId: string;
    oldPath: string;
    newPath: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.update-source-registry-entry",
      input.environmentId,
      { oldPath: input.oldPath, newPath: input.newPath }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async removeSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.remove-source-registry-entry",
      input.environmentId,
      { path: input.path }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async addLocalProject(input: {
    environmentId: string;
    path: string;
    name?: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.add-local-project",
      input.environmentId,
      { path: input.path, name: input.name }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async removeLocalProject(input: {
    environmentId: string;
    name: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.remove-local-project",
      input.environmentId,
      { name: input.name }
    );
    return adaptPackageManagementCommandResponse(response);
  }

  async quitApp(): Promise<void> {
    return;
  }

  async openEntityInNewWindow(_ref?: unknown): Promise<void> {
    return;
  }

  private async invokeService<T>(
    operation: string,
    environmentId?: string,
    request?: Record<string, unknown>
  ): Promise<T> {
    if (this.options.transport !== "pipe") {
      throw new Error(
        `Live adapter transport '${this.options.transport}' is configured, but only the initial pipe bridge is implemented.`
      );
    }

    const args = [
      "--script",
      this.options.bridgePath,
      this.options.projectDir,
      this.options.environmentStatePath,
      operation,
      environmentId ?? ""
    ];

    if (request) {
      args.push("-");
    }

    return this.enqueueBridgeCall(
      async () =>
        new Promise<T>((resolvePromise, rejectPromise) => {
          const executable = resolveSbclExecutable();
          const cwd = existsSync(this.options.projectDir) ? this.options.projectDir : os.homedir();
          const env = buildSbclSpawnEnvironment();
          void appendBridgeLaunchLog(
            `invokeService operation=${operation} executable=${executable} executableExists=${existsSync(executable)} cwd=${cwd} cwdExists=${existsSync(cwd)} projectDir=${this.options.projectDir} projectDirExists=${existsSync(this.options.projectDir)} bridgePath=${this.options.bridgePath} bridgeExists=${existsSync(this.options.bridgePath)} environmentStatePath=${this.options.environmentStatePath}`
          );
          const child = spawn(executable, args, {
            cwd,
            env,
            stdio: [request ? "pipe" : "ignore", "pipe", "pipe"]
          });
          let stdout = "";
          let stderr = "";

          if (request && child.stdin) {
            child.stdin.end(JSON.stringify(request));
          }

          if (!child.stdout || !child.stderr) {
            rejectPromise(new Error("Service bridge did not expose stdout/stderr pipes."));
            return;
          }

          child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
          });

          child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          child.on("error", (error) => {
            void appendBridgeLaunchLog(
              `invokeService error operation=${operation} message=${error.message}`
            );
            rejectPromise(error);
          });
          child.on("close", (code) => {
            if (code !== 0) {
              void appendBridgeLaunchLog(
                `invokeService close operation=${operation} code=${String(code)} stderr=${JSON.stringify(stderr)}`
              );
              rejectPromise(new Error(stderr || `Service bridge exited with code ${code ?? "unknown"}.`));
              return;
            }

            try {
              const parsed = camelizeKeys(JSON.parse(stdout)) as RawServiceResponse<unknown>;
              const binding = parsed.metadata?.binding as BindingDto | null | undefined;

              if (binding?.environmentId) {
                this.currentBinding = {
                  environmentId: binding.environmentId,
                  sessionId:
                    binding.sessionId ?? this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
                };
              }

              resolvePromise(parsed as T);
            } catch (error) {
              rejectPromise(error);
            }
          });
        })
    );
  }

  private async invokeStreamingService<T>(
    operation: string,
    environmentId: string | undefined,
    request: Record<string, unknown>,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<T> {
    if (this.options.transport !== "pipe") {
      throw new Error(
        `Live adapter transport '${this.options.transport}' is configured, but only the initial pipe bridge is implemented.`
      );
    }

    const args = [
      "--script",
      this.options.bridgePath,
      this.options.projectDir,
      this.options.environmentStatePath,
      operation,
      environmentId ?? "",
      "-"
    ];

    return this.enqueueBridgeCall(
      async () =>
        new Promise<T>((resolvePromise, rejectPromise) => {
          const executable = resolveSbclExecutable();
          const cwd = existsSync(this.options.projectDir) ? this.options.projectDir : os.homedir();
          const env = buildSbclSpawnEnvironment();
          void appendBridgeLaunchLog(
            `invokeStreamingService operation=${operation} executable=${executable} executableExists=${existsSync(executable)} cwd=${cwd} cwdExists=${existsSync(cwd)} projectDir=${this.options.projectDir} projectDirExists=${existsSync(this.options.projectDir)} bridgePath=${this.options.bridgePath} bridgeExists=${existsSync(this.options.bridgePath)} environmentStatePath=${this.options.environmentStatePath}`
          );
          const child = spawn(executable, args, {
            cwd,
            env,
            stdio: ["pipe", "pipe", "pipe"]
          });
          if (!child.stdout || !child.stderr) {
            rejectPromise(new Error("Streaming bridge did not expose stdout/stderr pipes."));
            return;
          }
          const stdoutLines = createInterface({ input: child.stdout });
          let stderr = "";
          let resolved = false;

          if (child.stdin) {
            child.stdin.end(JSON.stringify(request));
          }

          stdoutLines.on("line", (line) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return;
            }

            let frame: StreamingBridgeFrame;
            try {
              frame = camelizeKeys(JSON.parse(trimmed)) as StreamingBridgeFrame;
            } catch (error) {
              rejectPromise(error);
              child.kill();
              return;
            }

            if (frame.type === "event") {
              if (onEvent) {
                onEvent(adaptStreamingEnvironmentEvent(frame.payload));
              }
              return;
            }

            if (frame.type === "result") {
              const parsed = camelizeKeys(frame.payload) as RawServiceResponse<unknown>;
              const binding = parsed.metadata?.binding as BindingDto | null | undefined;
              if (binding?.environmentId) {
                this.currentBinding = {
                  environmentId: binding.environmentId,
                  sessionId:
                    binding.sessionId ?? this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
                };
              }
              resolved = true;
              resolvePromise(parsed as T);
            }
          });

          child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });

          child.on("error", (error) => {
            void appendBridgeLaunchLog(
              `invokeStreamingService error operation=${operation} message=${error.message}`
            );
            rejectPromise(error);
          });
          child.on("close", (code) => {
            if (resolved) {
              return;
            }
            void appendBridgeLaunchLog(
              `invokeStreamingService close operation=${operation} code=${String(code)} stderr=${JSON.stringify(stderr)}`
            );
            rejectPromise(
              new Error(
                stderr.trim() || `Streaming bridge exited before returning a result (exit code ${code ?? "unknown"}).`
              )
            );
          });
        })
    );
  }

  private enqueueBridgeCall<T>(task: () => Promise<T>): Promise<T> {
    const run = this.bridgeQueue.then(task, task);
    this.bridgeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
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
