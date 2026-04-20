import { execFile, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type {
  ApprovalDecisionDto,
  ApprovalDecisionInput,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  CommandResultDto,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
  DesktopPreferencesDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  LinkedEntityRefDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSystemEntryDto,
  RuntimeScopeSummaryDto,
  RuntimeSummaryDto,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  ServiceMetadataDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  TurnState,
  ThreadDetailDto,
  ThreadSummaryDto,
  TruthPostureDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../shared/contracts";
import type { SbclAgentHostAdapter } from "./adapter-contract";

interface LiveAdapterOptions {
  transport: "socket" | "pipe";
  endpoint: string;
  projectDir: string;
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
          : []
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
      lastUpdatedAt: new Date().toISOString()
    },
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
  const valuePreview =
    rawResult === undefined || rawResult === null
      ? null
      : typeof normalizedResult === "string"
        ? normalizedResult
        : JSON.stringify(normalizedResult, null, 2);

  return {
    contractVersion: response.contractVersion,
    domain: "runtime",
    operation: "runtime.eval",
    kind: "command",
    status: response.status === "error" ? "error" : "ok",
    data: {
      evaluationId:
        String(
          data.workItemId ??
            data.runtimeId ??
            metadata.runtimeId ??
            `${input.packageName ?? "runtime"}:${input.form}`
        ),
      outcome: response.status === "error" ? "failed" : "ok",
      summary: String(
        rawResult === undefined
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
        firstString(primaryRequirement.policy, item.approvalPolicy, item.policyId) ??
        "governed-action";
      const waitReason = normalizeWaitReason(item.waitReason);

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
  const waitReason = normalizeWaitReason(firstString(wait.why, wait.waitReason, workItem.waitReason));
  const policyId = firstString(primaryRequirement.policy, workItem.approvalPolicy, workflowRecord.policyId) ?? null;
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
      artifactIds: [],
      linkedEntities,
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
      const waitingReason = normalizeWaitReason(firstString(item.waitReason, item.waitingOn));
      const incidentCount = 0;
      return {
        workItemId: String(item.id ?? "work-item"),
        title: String(item.goal ?? "Work Item"),
        state: workStateFromStatus(item.status as string | undefined, waitingReason ?? undefined),
        waitingReason,
        approvalCount: approvalRequirements.length,
        incidentCount,
        artifactCount: 0,
        validationBurden: pendingValidations.length > 0 ? "pending" : "complete",
        reconciliationBurden: item.reconciliationResult ? "complete" : item.imageReconciliation ? "required" : "none"
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
  const waitingReason = normalizeWaitReason(firstString(data.waitReason, workflowRecord.waitingOn));
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
      linkedEntities
    },
    metadata: normalizeMetadata(response.metadata)
  };
}

function adaptWorkflowRecordDetailResponse(
  response: RawServiceResponse<Record<string, unknown>>
): QueryResultDto<WorkflowRecordDto> {
  const data = asRecord(response.data);
  const pendingValidations = asStringArray(data.pendingValidations);
  const approvalRequirements = (data.approvalRequirements as Array<Record<string, unknown>> | undefined) ?? [];
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
      updatedAt: universalTimeToIso(item.createdAt)
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
  const messages = asRecordArray(data.messages).map((message) => ({
    messageId: String(message.id ?? "message"),
    role: messageRoleFromRaw(message.role as string | undefined),
    content: String(message.content ?? ""),
    createdAt: universalTimeToIso(message.createdAt)
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

  private preferences: DesktopPreferencesDto = {
    lastWorkspace: "environment",
    sidebarPinned: true,
    canvasPinned: true,
    inspectorPinned: true,
    inspectorWidth: null,
    themePreference: "system",
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
        prompt: input.prompt
      },
      onEvent
    );
    return adaptSendConversationMessageResponse(response);
  }

  async runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>> {
    const response = await this.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.summary",
      environmentId
    );
    return adaptRuntimeSummaryResponse(response);
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

  async focusWorkspace(workspace: WorkspaceId): Promise<void> {
    this.preferences.lastWorkspace = workspace;
  }

  async getDesktopPreferences(): Promise<DesktopPreferencesDto> {
    return this.preferences;
  }

  async setDesktopPreferences(
    patch: Partial<DesktopPreferencesDto>
  ): Promise<DesktopPreferencesDto> {
    this.preferences = {
      ...this.preferences,
      ...patch,
      lispCodeView: {
        ...this.preferences.lispCodeView,
        ...patch.lispCodeView
      }
    };
    return this.preferences;
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

    const bridgePath = resolve(__dirname, "../../scripts/live-service-bridge.lisp");
    const args = [
      bridgePath,
      this.options.projectDir,
      this.options.environmentStatePath,
      operation,
      environmentId ?? ""
    ];

    if (request) {
      args.push(JSON.stringify(request));
    }

    return this.enqueueBridgeCall(async () => {
      const { stdout } = await execFileAsync("sbcl", ["--script", ...args], {
        cwd: this.options.projectDir,
        maxBuffer: 1024 * 1024
      });

      const parsed = camelizeKeys(JSON.parse(stdout)) as RawServiceResponse<unknown>;
      const binding = parsed.metadata?.binding as BindingDto | null | undefined;

      if (binding?.environmentId) {
        this.currentBinding = {
          environmentId: binding.environmentId,
          sessionId: binding.sessionId ?? this.currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
        };
      }

      return parsed as T;
    });
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

    const bridgePath = resolve(__dirname, "../../scripts/live-service-bridge.lisp");
    const args = [
      "--script",
      bridgePath,
      this.options.projectDir,
      this.options.environmentStatePath,
      operation,
      environmentId ?? "",
      JSON.stringify(request)
    ];

    return this.enqueueBridgeCall(
      () =>
        new Promise<T>((resolvePromise, rejectPromise) => {
          const child = spawn("sbcl", args, {
            cwd: this.options.projectDir,
            stdio: ["ignore", "pipe", "pipe"]
          });
          const stdoutLines = createInterface({ input: child.stdout });
          let stderr = "";
          let resolved = false;

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

          child.on("error", (error) => rejectPromise(error));
          child.on("close", (code) => {
            if (resolved) {
              return;
            }
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
  const transport = process.env.SBCL_AGENT_TRANSPORT === "pipe" ? "pipe" : "socket";
  const endpoint =
    transport === "pipe"
      ? process.env.SBCL_AGENT_PIPE_COMMAND ?? "./bin/sbcl-agent"
      : process.env.SBCL_AGENT_SOCKET_ENDPOINT ?? "127.0.0.1:4017";
  const projectDir =
    process.env.SBCL_AGENT_PROJECT_DIR ?? resolve(process.cwd(), "../sbcl-agent");
  const environmentStatePath =
    process.env.SBCL_AGENT_ENVIRONMENT_STATE_PATH ??
    resolve(__dirname, "../../.sbcl-agent-desktop-live-environment.sexp");

  return {
    transport,
    endpoint,
    projectDir,
    environmentStatePath
  };
}
