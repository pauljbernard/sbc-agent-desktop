import { execFile } from "node:child_process";
import { readdir, stat, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import type {
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
  ApproveActorMessageInput,
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
  ConversationLatencySummaryDto,
  TranscriptWorkspaceDto,
  ConversationWorkspaceDto,
  CreateIntentInput,
  CreateProjectInput,
  CreateConversationThreadInput,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  FileSystemDirectoryListingDto,
  FileSystemEntryDto,
  FileSystemWriteResultDto,
  UpdateConversationThreadInput,
  DesktopActionInput,
  DesktopActionResultDto,
  DesktopModelDto,
  DesktopPanelId,
  DesktopPreferencesDto,
  DesktopRestoreInput,
  DesktopRestoreResultDto,
  EnvironmentBootstrapDto,
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
  IntentDetailDto,
  MemoryDeleteResultDto,
  MemoryEntryDto,
  MemoryListDto,
  ProjectDetailDto,
  ProjectListDto,
  ProjectQualityGateDto,
  ProjectTestingHarnessDto,
  ProviderProfileSummaryDto,
  CompleteWorkItemValidationsInput,
  ThreadSummaryDto,
  QueryResultDto,
  PackageBrowserDto,
  RuntimeSymbolBrowserPageDto,
  RuntimeSymbolBrowserPageInput,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  QuarantineWorkItemInput,
  RemoveMcpServerInput,
  ResumeWorkItemInput,
  RuntimeTelemetrySnapshotDto,
  RollbackWorkItemInput,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SteerWorkItemInput,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  SourcePreviewDto,
  MemoryUpdateInput,
  UpdateProjectConstitutionInput,
  UpdateProjectDesignSystemInput,
  UpdateIncidentRemediationPlanInput,
  UpdateProjectReadinessObligationsInput,
  UpdateProjectStyleGuideInput,
  UpdateProjectTestingStrategyInput,
  UpdateProjectReleaseReadinessInput,
  UpdateProviderRoutingInput,
  UseProviderProfileInput,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../shared/contracts";
import {
  applyMockConversationApprovalCompletion,
  commandApproveRequest,
  commandAddLocalProject,
  commandAddSourceRegistryEntry,
  commandCreateConversationThread,
  commandUpdateConversationThread,
  commandSendConversationMessage,
  commandDenyRequest,
  commandEvaluateInContext,
  commandInstallQuicklispPackage,
  commandRemoveLocalProject,
  commandRemoveSourceRegistryEntry,
  commandReloadSourceFile,
  commandRunQlotCommand,
  commandStageSourceChange,
  commandUpdateSourceRegistryEntry,
  createMockHostStatus,
  defaultEnvironmentId,
  hasEnvironment,
  queryApprovalRequestDetail,
  queryApprovalRequestList,
  queryArtifactDetail,
  queryArtifactList,
  queryConsoleLogStream,
  queryDiagnosticReportDetail,
  queryDiagnosticReportList,
  queryEnvironmentEvents,
  queryEnvironmentStatus,
  queryEnvironmentSummary,
  queryWorkspaceSummary,
  queryIncidentDetail,
  queryIncidentList,
  queryPackageBrowser,
  queryProjectDetail,
  queryProjectList,
  queryProjectTestingHarnessInventory,
  queryPackageManagementSummary,
  queryRuntimeEntityDetail,
  queryRuntimeInspectSymbol,
  queryRuntimeSymbolPage,
  queryRuntimeSummary,
  queryRuntimeTelemetrySnapshot,
  querySourcePreview,
  queryThreadDetail,
  queryThreadList,
  queryTurnDetail,
  queryWorkflowRecordDetail,
  queryWorkItemDetail,
  queryWorkItemList
} from "../shared/mock-environments";
import type { SbclAgentHostAdapter } from "./adapter-contract";

const execFileAsync = promisify(execFile);

function evaluateMockCalculatorExpression(input: CalculatorEvaluateInput): CalculatorResultDto {
  const mode = input.mode;
  const base = input.base ?? 10;
  const wordSize = input.wordSize ?? 64;
  const angleUnit = input.angleUnit ?? "radians";
  const trimmed = input.expression.trim();
  if (trimmed.length === 0) {
    throw new Error("Calculator expression cannot be empty.");
  }

  if (mode === "programmer") {
    const normalized = trimmed
      .replaceAll("xor", "^")
      .replaceAll("<<", "<<")
      .replaceAll(">>", ">>");
    const rawValue = Function(`return (${normalized});`)() as number;
    const mask = wordSize >= 32 ? 0xffffffff : (1 << wordSize) - 1;
    const unsignedValue = rawValue & mask;
    const signBit = wordSize >= 32 ? 0x80000000 : 1 << (wordSize - 1);
    const signedValue = unsignedValue & signBit ? unsignedValue - (wordSize >= 32 ? 0x100000000 : 1 << wordSize) : unsignedValue;
    return {
      mode,
      expression: trimmed,
      displayValue: String(signedValue),
      scientificNotation: Number(signedValue).toExponential(12),
      base,
      wordSize,
      angleUnit,
      integerResultP: true,
      decimalValue: String(signedValue),
      unsignedDecimalValue: String(unsignedValue >>> 0),
      hexadecimalValue: `0x${(unsignedValue >>> 0).toString(16).toUpperCase()}`,
      octalValue: `0o${(unsignedValue >>> 0).toString(8)}`,
      binaryValue: `0b${(unsignedValue >>> 0).toString(2)}`,
      summary: `Mock programmer evaluation produced ${signedValue}.`
    };
  }

  const degreesToRadians = (value: number) => (value * Math.PI) / 180;
  const sin = (value: number) => Math.sin(angleUnit === "degrees" ? degreesToRadians(value) : value);
  const cos = (value: number) => Math.cos(angleUnit === "degrees" ? degreesToRadians(value) : value);
  const tan = (value: number) => Math.tan(angleUnit === "degrees" ? degreesToRadians(value) : value);
  const ln = (value: number) => Math.log(value);
  const log10 = (value: number) => Math.log10(value);
  const normalized = trimmed
    .replaceAll("^", "**")
    .replaceAll("pi", "Math.PI")
    .replaceAll(/\be\b/g, "Math.E");
  const value = Number(
    Function("sin", "cos", "tan", "sqrt", "ln", "log10", "exp", `return (${normalized});`)(
      sin,
      cos,
      tan,
      Math.sqrt,
      ln,
      log10,
      Math.exp
    )
  );
  return {
    mode,
    expression: trimmed,
    displayValue: String(value),
    scientificNotation: value.toExponential(12),
    base,
    wordSize,
    angleUnit,
    integerResultP: Number.isInteger(value),
    decimalValue: String(value),
    summary: `Mock ${mode} evaluation produced ${value}.`
  };
}

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

export class MockSbclAgentHostAdapter implements SbclAgentHostAdapter {
  private currentBinding: BindingDto | null = {
    environmentId: defaultEnvironmentId,
    sessionId: "desktop-session-local"
  };

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
    currentProjectId: "project-local-dev",
    projects: [
      {
        projectId: "project-local-dev",
        title: "Local Dev",
        environmentId: defaultEnvironmentId,
        summary: "Default governed desktop project bound to the local development environment."
      }
    ],
    selectedConversationThreadByProject: {
      "project-local-dev": "thread-transport-contract"
    },
    replSessionsByProject: {
      "project-local-dev": [
        {
          sessionId: "repl-main",
          title: "Main Listener",
          environmentId: defaultEnvironmentId,
          draftForm: '(describe "sbcl-agent")',
          packageName: "SBCL-AGENT-USER",
          lastSummary: "Primary listener session for governed runtime evaluation.",
          history: []
        }
      ]
    },
    currentReplSessionIdByProject: {
      "project-local-dev": "repl-main"
    },
    lispCodeView: {
      parenDepthColors: ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"]
    }
  };

  private imageRegistry: EnvironmentImageRegistryDto = {
    registryPath: "/tmp/mock-environment-registry.sexp",
    imagesRoot: "/tmp/mock-environments/",
    currentImageId: "image-local-dev",
    currentImageName: "local-dev",
    images: [
      {
        imageId: "image-local-dev",
        name: "local-dev",
        path: "/tmp/mock-environments/local-dev.sexp",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        summary: "Default mock SBCL image."
      }
    ],
    checkpointPolicy: {
      exitMode: "prompt",
      preserveShellState: true,
      warmRestart: true
    },
    runtimeManifest: {
      transport: "sbcl-image"
    },
    recoveryManifest: {
      lastRecoveryStatus: "steady"
    }
  };

  private providerSummary: ProviderProfileSummaryDto = {
    activeProfileName: "default",
    profileCount: 2,
    profiles: [
      {
        name: "default",
        provider: "openai-compatible",
        model: "gpt-5",
        fastModel: "gpt-4.1-mini",
        apiBase: "https://api.openai.com/v1",
        apiKeyPresent: false,
        intents: [],
        latencyTier: "balanced",
        reviewBias: "neutral",
        executionBias: "balanced",
        locality: "network"
      },
      {
        name: "local-fast",
        provider: "lm-studio",
        model: "local-model",
        fastModel: "local-model",
        apiBase: "http://localhost:1234/v1",
        apiKeyPresent: true,
        intents: ["quick-turn", "local-development", "code-execution"],
        latencyTier: "fast",
        reviewBias: "neutral",
        executionBias: "high",
        locality: "local"
      }
    ],
    activeProfile: {
      name: "default",
      provider: "openai-compatible",
      model: "gpt-5",
      fastModel: "gpt-4.1-mini",
      apiBase: "https://api.openai.com/v1",
      apiKeyPresent: false,
      intents: [],
      latencyTier: "balanced",
      reviewBias: "neutral",
      executionBias: "balanced",
      locality: "network"
    },
    routingMode: "auto",
    routingPolicy: {
      mode: "auto",
      availableModes: ["auto", "manual"],
      profileCount: 2,
      lastRoutePresent: false
    },
    lastRoute: null
  };

  private desktopTaskManifestCatalog: DesktopTaskManifestDto[] = [
    {
      id: "editor/append-text",
      target: "editor",
      operation: "append-text",
      capability: "workspace-write",
      description: "Append text into the active editor buffer through the governed desktop task protocol.",
      requestSchema: { payload: { text: "string" } },
      resultSchema: { summary: "string" },
      approvalPolicy: "workspace-write",
      executionMode: "synchronous",
      retryPolicy: { retryableP: false, maxAttempts: 1 },
      backendKind: "internal",
      backendRef: null,
      version: 1,
      tags: ["editor", "governed", "write"],
      discoverableP: true,
      metadata: null
    },
    {
      id: "calculator/evaluate-expression",
      target: "calculator",
      operation: "evaluate-expression",
      capability: "calculator-control",
      description: "Evaluate a calculator expression through the governed desktop task protocol.",
      requestSchema: { payload: { expression: "string" } },
      resultSchema: { value: "string" },
      approvalPolicy: "calculator-control",
      executionMode: "synchronous",
      retryPolicy: { retryableP: true, maxAttempts: 2, backoffSeconds: 1 },
      backendKind: "internal",
      backendRef: null,
      version: 1,
      tags: ["calculator", "governed"],
      discoverableP: true,
      metadata: null
    }
  ];

  private mcpServerConfigCatalog: McpServerConfigDto[] = [
    {
      id: "mcp-example-server",
      name: "Example MCP",
      transport: "stdio",
      command: "example-mcp",
      arguments: ["--serve"],
      environmentVariables: { LOG_LEVEL: "info" },
      workingDirectory: "/tmp",
      endpoint: null,
      capabilities: ["editor", "calculator"],
      retryPolicy: { retryableP: true, maxAttempts: 3, backoffSeconds: 5 },
      healthStatus: "healthy",
      enabledP: true,
      discoverableP: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operationCount: 0,
      operations: [],
      metadata: null
    }
  ];

  private desktopTaskRecordCatalog: DesktopTaskRecordDto[] = [
    {
      id: "desktop-task-record-editor-approval",
      protocolVersion: 1,
      requestId: "desktop-task-request-editor-approval",
      requester: "context-chat",
      target: "editor",
      operation: "append-text",
      capability: "workspace-write",
      backendKind: "internal",
      backendRef: null,
      status: "awaiting-approval",
      governanceStatus: "governance-pending",
      approvalStatus: "awaiting-approval",
      retryPolicy: { retryableP: false, maxAttempts: 1 },
      retryCount: 0,
      maxAttempts: 1,
      retryableP: false,
      idempotencyKey: "editor-append-main",
      approvalId: "approval-binding-shift",
      threadId: "thread-default",
      turnId: "turn-editor-approval",
      conversationOperationId: "conversation-op-editor-approval",
      actorMessageId: "actor-message-editor-approval",
      actorSlice: "context-chat-editor-v1",
      actorMessage: {
        id: "actor-message-editor-approval",
        sender: { role: "context-chat" },
        receiver: { role: "editor" },
        state: "awaiting-approval"
      },
      requestMetadata: { text: "(+ 1 1)", bufferId: "editor-buffer-project-live-environment-main" },
      createdAt: new Date().toISOString(),
      approvedAt: null,
      startedAt: null,
      completedAt: null,
      lastError: null,
      resolution: null,
      result: null,
      metadata: { summary: "Append text to the active editor buffer." }
    },
    {
      id: "desktop-task-record-calculator-complete",
      protocolVersion: 1,
      requestId: "desktop-task-request-calculator-complete",
      requester: "context-chat",
      target: "calculator",
      operation: "evaluate-expression",
      capability: "calculator-control",
      backendKind: "internal",
      backendRef: null,
      status: "completed",
      governanceStatus: "governed",
      approvalStatus: "not-required",
      retryPolicy: { retryableP: true, maxAttempts: 2, backoffSeconds: 1 },
      retryCount: 0,
      maxAttempts: 2,
      retryableP: true,
      idempotencyKey: "calculator-2-plus-2",
      threadId: "thread-default",
      turnId: "turn-calculator-complete",
      conversationOperationId: "conversation-op-calculator-complete",
      createdAt: new Date().toISOString(),
      approvedAt: null,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      lastError: null,
      resolution: { manifestId: "calculator/evaluate-expression" },
      result: { summary: "Evaluated expression successfully.", value: "4" },
      metadata: { summary: "Calculate 2 + 2." }
    }
  ];

  private localProjects = new Map<string, ProjectDetailDto>();
  private localWorkspaces = new Map<
    string,
    {
      incidentDetails: Record<string, IncidentDetailDto>;
      workItems: WorkItemSummaryDto[];
      workItemDetails: Record<string, WorkItemDetailDto>;
      workItemPlans: Record<string, WorkItemPlanDto>;
      workflowRecords: Record<string, WorkflowRecordDto>;
    }
  >();
  private localMemories = new Map<string, MemoryEntryDto[]>();

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private syncProviderSummaryState(): void {
    this.providerSummary.profileCount = this.providerSummary.profiles.length;
    this.providerSummary.activeProfile =
      this.providerSummary.profiles.find(
        (profile) => profile.name === this.providerSummary.activeProfileName
      ) ?? null;
    this.providerSummary.routingPolicy = {
      ...this.providerSummary.routingPolicy,
      mode: this.providerSummary.routingMode,
      profileCount: this.providerSummary.profiles.length
    };
  }

  private providerCommandResult(): CommandResultDto<ProviderProfileSummaryDto> {
    this.syncProviderSummaryState();
    return {
      contractVersion: 1,
      domain: "environment",
      operation: "provider-configure",
      kind: "command",
      status: "ok",
      data: this.cloneValue(this.providerSummary),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "environment-provider-command-v1"
      }
    };
  }

  private providerQueryResult(): QueryResultDto<ProviderProfileSummaryDto> {
    this.syncProviderSummaryState();
    return {
      contractVersion: 1,
      domain: "environment",
      operation: "provider",
      kind: "query",
      status: "ok",
      data: this.cloneValue(this.providerSummary),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "environment-provider-v1"
      }
    };
  }

  private buildLocalProjectSummary(project: ProjectDetailDto) {
    return {
      projectId: project.projectId,
      title: project.title,
      environmentId: this.resolveEnvironmentId(this.currentBinding?.environmentId),
      summary: project.summary
    };
  }

  private buildEmptyLocalProject(projectId: string, title: string, summary: string): ProjectDetailDto {
    const timestamp = new Date().toISOString();
    return {
      projectId,
      title,
      summary,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      requirementCount: 0,
      featureSpecCount: 0,
      journeyCount: 0,
      architectureDecisionCount: 0,
      nonFunctionalRequirementCount: 0,
      linkedWorkItemCount: 0,
      linkedIncidentCount: 0,
      linkedTestingHarnessCount: 0,
      sourceRoots: [],
      constitution: null,
      requirements: [],
      featureSpecifications: [],
      designSystem: null,
      styleGuide: null,
      testingStrategy: null,
      releaseReadiness: null,
      readinessObligations: [],
      userJourneys: [],
      nonFunctionalRequirements: [],
      architectureDecisions: [],
      linkedWorkItemIds: [],
      linkedIncidentIds: [],
      linkedTestingHarnessIds: [],
      linkedWorkItems: [],
      linkedIncidents: [],
      linkedTestingHarnesses: [],
      testingEvidence: null,
      qualityGateEvidence: null,
      traceNeighborhood: null,
      metadata: null
    };
  }

  private localProjectResponse(operation: string, project: ProjectDetailDto): CommandResultDto<ProjectDetailDto> {
    this.localProjects.set(project.projectId, project);
    this.preferences = {
      ...this.preferences,
      currentProjectId: project.projectId,
      projects: [
        this.buildLocalProjectSummary(project),
        ...(this.preferences.projects ?? []).filter((entry) => entry.projectId !== project.projectId)
      ]
    };
    return {
      contractVersion: 1,
      domain: "project",
      operation,
      kind: "command",
      status: "ok",
      data: project,
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  private getLocalProject(projectId?: string): ProjectDetailDto {
    const resolvedProjectId = projectId ?? this.preferences.currentProjectId ?? "project-local-dev";
    const existing = this.localProjects.get(resolvedProjectId);
    if (existing) {
      return existing;
    }
    const fallback = queryProjectDetail(
      this.resolveEnvironmentId(this.currentBinding?.environmentId),
      resolvedProjectId
    ).data;
    this.localProjects.set(resolvedProjectId, fallback);
    return fallback;
  }

  private getLocalWorkspace(environmentId?: string) {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const existing = this.localWorkspaces.get(resolvedEnvironmentId);
    if (existing) {
      return existing;
    }
    const incidentDetails = this.cloneValue(
      Object.fromEntries(
        queryIncidentList(resolvedEnvironmentId).data.map((incident) => [
          incident.incidentId,
          queryIncidentDetail(resolvedEnvironmentId, incident.incidentId).data
        ])
      )
    );
    const workItems = this.cloneValue(queryWorkItemList(resolvedEnvironmentId).data);
    const workItemDetails = Object.fromEntries(
      workItems.map((item) => [
        item.workItemId,
        this.cloneValue(queryWorkItemDetail(resolvedEnvironmentId, item.workItemId).data)
      ])
    );
    const workflowRecordIds = Array.from(
      new Set(Object.values(workItemDetails).map((item) => item.workflowRecordId))
    );
    const workflowRecords = Object.fromEntries(
      workflowRecordIds.map((workflowRecordId) => [
        workflowRecordId,
        this.cloneValue(queryWorkflowRecordDetail(resolvedEnvironmentId, workflowRecordId).data)
      ])
    );
    const workItemPlans = Object.fromEntries(
      workItems.map((item, index) => {
        const workflow = workflowRecords[workItemDetails[item.workItemId].workflowRecordId];
        const phaseList = ["inspect", "validate", "reconcile", "close"];
        return [
          item.workItemId,
          {
            workItemId: item.workItemId,
            status: item.state,
            goal: item.title,
            longHorizonPlan: {
              planningPhases: phaseList,
              phaseCount: phaseList.length,
              agendaStepCount: phaseList.length
            },
            planHealth: item.state === "blocked" || item.state === "quarantined" ? "resumable" : "active",
            planSteering: {
              currentPhase: workflow.phase,
              nextStep: item.validationBurden === "pending" ? "run-cold-validation" : "review-closure",
              resumeAnchor: null,
              phaseCount: phaseList.length,
              planningPhases: phaseList,
              remainingPhases: phaseList.slice(Math.min(index, phaseList.length - 1)),
              completedPhaseCount: Math.min(index, phaseList.length - 1),
              decompositionReady: true,
              compacted: false,
              revisionReason: "steady-state",
              operatorDirectedPhase: null,
              operatorDirectedNextStep: null,
              operatorSteeringCount: 0,
              reviewRequired: false,
              planHealth: item.state === "blocked" || item.state === "quarantined" ? "resumable" : "active"
            },
            operatorSteeringHistory: [],
            nextAction: null,
            resumePayload: null,
            pendingValidations: item.validationBurden === "pending" ? ["cold"] : []
          } satisfies WorkItemPlanDto
        ];
      })
    );
    const local = { incidentDetails, workItems, workItemDetails, workItemPlans, workflowRecords };
    this.localWorkspaces.set(resolvedEnvironmentId, local);
    return local;
  }

  private localIncidentResponse(
    operation: string,
    environmentId: string,
    nextDetail: IncidentDetailDto
  ): CommandResultDto<IncidentDetailDto> {
    const workspace = this.getLocalWorkspace(environmentId);
    workspace.incidentDetails[nextDetail.incidentId] = nextDetail;
    return {
      contractVersion: 1,
      domain: "incident",
      operation,
      kind: "command",
      status: "ok",
      data: nextDetail,
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "incident-command-v1",
        incidentId: nextDetail.incidentId
      }
    };
  }

  private updateLocalWorkItemSummary(
    workItems: WorkItemSummaryDto[],
    workItemId: string,
    patch: Partial<WorkItemSummaryDto>
  ): WorkItemSummaryDto[] {
    return workItems.map((item) => (item.workItemId === workItemId ? { ...item, ...patch } : item));
  }

  private localWorkItemResponse(
    operation: string,
    environmentId: string,
    nextDetail: WorkItemDetailDto,
    nextWorkflow: WorkflowRecordDto
  ): CommandResultDto<WorkItemDetailDto> {
    const workspace = this.getLocalWorkspace(environmentId);
    workspace.workItemDetails[nextDetail.workItemId] = nextDetail;
    workspace.workflowRecords[nextWorkflow.workflowRecordId] = nextWorkflow;
    const existingPlan = workspace.workItemPlans[nextDetail.workItemId];
    if (existingPlan) {
      workspace.workItemPlans[nextDetail.workItemId] = {
        ...existingPlan,
        status: nextDetail.state,
        planHealth:
          nextDetail.state === "blocked" || nextDetail.state === "quarantined" ? "resumable" : existingPlan.planHealth,
        pendingValidations:
          workspace.workItems.find((item) => item.workItemId === nextDetail.workItemId)?.validationBurden === "pending"
            ? ["cold"]
            : [],
        planSteering: existingPlan.planSteering
          ? {
              ...existingPlan.planSteering,
              currentPhase: nextWorkflow.phase
            }
          : existingPlan.planSteering
      };
    }
    return {
      contractVersion: 1,
      domain: "workflow",
      operation,
      kind: "command" as const,
      status: "ok" as const,
      data: nextDetail,
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async getHostStatus(): Promise<HostStatusDto> {
    return createMockHostStatus();
  }

  async getCurrentBinding(): Promise<BindingDto | null> {
    return this.currentBinding;
  }

  async setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>> {
    const nextBinding: BindingDto = {
      environmentId,
      sessionId: "desktop-session-local"
    };

    if (!hasEnvironment(environmentId)) {
      return {
        contractVersion: 1,
        domain: "host",
        operation: "host.set_environment_binding",
        kind: "command",
        status: "error",
        data: nextBinding,
        metadata: {
          authority: "environment",
          binding: this.currentBinding
        }
      };
    }

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
    return {
      contractVersion: 1,
      domain: "environment",
      operation: "environment.image-registry",
      kind: "query",
      status: "ok",
      data: this.imageRegistry,
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "environment-image-registry-v1"
      }
    };
  }

  async loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>> {
    const image = this.imageRegistry.images.find(
      (entry) => entry.imageId === imageIdOrName || entry.name === imageIdOrName
    );
    if (!image) {
      return {
        contractVersion: 1,
        domain: "host",
        operation: "host.load_environment_image",
        kind: "command",
        status: "error",
        data: this.currentBinding ?? {
          environmentId: defaultEnvironmentId,
          sessionId: "desktop-session-local"
        },
        metadata: {
          authority: "environment",
          binding: this.currentBinding
        }
      };
    }
    this.imageRegistry.currentImageId = image.imageId;
    this.imageRegistry.currentImageName = image.name;
    return {
      contractVersion: 1,
      domain: "host",
      operation: "host.load_environment_image",
      kind: "command",
      status: "ok",
      data: this.currentBinding ?? {
        environmentId: defaultEnvironmentId,
        sessionId: "desktop-session-local"
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>> {
    let image = this.imageRegistry.images.find((entry) => entry.name === input.name);
    if (!image) {
      image = {
        imageId: `image-${input.name}`,
        name: input.name,
        path: `/tmp/mock-environments/${input.name}.sexp`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        summary: "Mock saved SBCL image."
      };
      this.imageRegistry.images = [...this.imageRegistry.images, image];
    } else {
      image = {
        ...image,
        updatedAt: Date.now(),
        lastOpenedAt: Date.now()
      };
      this.imageRegistry.images = this.imageRegistry.images.map((entry) =>
        entry.imageId === image!.imageId ? image! : entry
      );
    }
    this.imageRegistry.currentImageId = image.imageId;
    this.imageRegistry.currentImageName = image.name;
    return {
      contractVersion: 1,
      domain: "host",
      operation: "host.save_environment_image",
      kind: "command",
      status: "ok",
      data: image,
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>> {
    return {
      contractVersion: 1,
      domain: "host",
      operation: "host.revert_environment_image",
      kind: "command",
      status: "ok",
      data: this.currentBinding ?? {
        environmentId: defaultEnvironmentId,
        sessionId: "desktop-session-local"
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async environmentSummary(
    environmentId?: string
  ): Promise<QueryResultDto<EnvironmentSummaryDto>> {
    return queryEnvironmentSummary(this.resolveEnvironmentId(environmentId));
  }

  async environmentStatus(
    environmentId?: string
  ): Promise<QueryResultDto<EnvironmentStatusDto>> {
    return queryEnvironmentStatus(this.resolveEnvironmentId(environmentId));
  }

  async workspaceSummary(
    environmentId?: string
  ): Promise<QueryResultDto<WorkspaceSummaryDto>> {
    return queryWorkspaceSummary(this.resolveEnvironmentId(environmentId));
  }

  async desktopModel(environmentId?: string): Promise<QueryResultDto<DesktopModelDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const workspace = await this.workspaceSummary(resolvedEnvironmentId);
    const approvals = await this.approvalRequestList(resolvedEnvironmentId);
    const panelId = this.workspaceToPanelId(this.preferences.lastWorkspace);

    return {
      contractVersion: 1,
      domain: "shell",
      operation: "shell.desktop_model",
      kind: "query",
      status: "ok",
      data: this.buildDesktopModel(
        resolvedEnvironmentId,
        workspace.data,
        panelId,
        approvals.data.length
      ),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "shell-desktop-model-v1"
      }
    };
  }

  async environmentBootstrap(environmentId?: string): Promise<QueryResultDto<EnvironmentBootstrapDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const [summary, status, workspaceSummary, desktopModel] = await Promise.all([
      this.environmentSummary(resolvedEnvironmentId),
      this.environmentStatus(resolvedEnvironmentId),
      this.workspaceSummary(resolvedEnvironmentId),
      this.desktopModel(resolvedEnvironmentId)
    ]);
    return {
      contractVersion: 1,
      domain: "environment",
      operation: "environment.bootstrap",
      kind: "query",
      status: "ok",
      data: {
        summary: summary.data,
        status: status.data,
        workspaceSummary: workspaceSummary.data,
        desktopModel: desktopModel.data
      },
      metadata: summary.metadata
    };
  }

  async environmentEvents(
    input: EventSubscriptionInput
  ): Promise<QueryResultDto<EnvironmentEventDto[]>> {
    return queryEnvironmentEvents({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
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
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const eventsResult =
      input.includeEvents === false
        ? null
        : queryEnvironmentEvents({
            environmentId,
            families: input.families,
            visibility: input.visibility,
            limit: input.eventLimit
          });
    const environmentConsoleResult =
      input.includeEnvironmentConsole === false
        ? null
        : queryConsoleLogStream({
            environmentId,
            plane: "environment",
            limit: input.consoleLimit
          });
    return {
      contractVersion: 1,
      domain: "observation",
      operation: "transcript.workspace",
      kind: "query",
      status: "ok",
      data: {
        events: eventsResult?.data ?? [],
        environmentConsole: environmentConsoleResult?.data ?? null
      },
      metadata:
        eventsResult?.metadata ??
        environmentConsoleResult?.metadata ?? {
          authority: "environment",
          binding: { environmentId },
          readModel: "transcript-workspace-v1"
        }
    };
  }

  async consoleLogStream(
    input: ConsoleLogQueryInput
  ): Promise<QueryResultDto<ConsoleLogStreamDto>> {
    return queryConsoleLogStream({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async diagnosticReportList(
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportSummaryDto[]>> {
    return queryDiagnosticReportList(this.resolveEnvironmentId(environmentId));
  }

  async diagnosticReportDetail(
    reportId: string,
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportDetailDto>> {
    return queryDiagnosticReportDetail(this.resolveEnvironmentId(environmentId), reportId);
  }

  async artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>> {
    return queryArtifactList(this.resolveEnvironmentId(environmentId));
  }

  async artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>> {
    return queryArtifactDetail(this.resolveEnvironmentId(environmentId), artifactId);
  }

  async conversationWorkspace(input: {
    environmentId?: string;
    threadId?: string | null;
    turnId?: string | null;
  }): Promise<QueryResultDto<ConversationWorkspaceDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(input.environmentId);
    const threadsResult = queryThreadList(resolvedEnvironmentId);
    const selectedThreadId = input.threadId ?? threadsResult.data[0]?.threadId ?? null;
    const selectedThreadResult = selectedThreadId
      ? queryThreadDetail(resolvedEnvironmentId, selectedThreadId)
      : null;
    const selectedTurnId =
      input.turnId ?? selectedThreadResult?.data.turns[0]?.turnId ?? null;
    const selectedTurnResult = selectedTurnId
      ? queryTurnDetail(resolvedEnvironmentId, selectedTurnId)
      : null;
    return {
      contractVersion: 1,
      domain: "conversation",
      operation: "conversation.workspace",
      kind: "query",
      status: "ok",
      data: {
        threads: threadsResult.data,
        selectedThread: selectedThreadResult?.data ?? null,
        selectedTurn: selectedTurnResult?.data ?? null
      },
      metadata: threadsResult.metadata
    };
  }

  async threadList(environmentId?: string) {
    return queryThreadList(this.resolveEnvironmentId(environmentId));
  }

  async threadDetail(threadId: string, environmentId?: string) {
    return queryThreadDetail(this.resolveEnvironmentId(environmentId), threadId);
  }

  async turnDetail(turnId: string, environmentId?: string) {
    return queryTurnDetail(this.resolveEnvironmentId(environmentId), turnId);
  }

  async conversationLatency(turnId: string, environmentId?: string): Promise<QueryResultDto<ConversationLatencySummaryDto>> {
    return {
      contractVersion: 1,
      domain: "conversation",
      operation: "conversation.latency",
      kind: "query",
      status: "ok",
      data: {
        turnId,
        sampleCount: 0,
        samples: [],
        requestBuilt: null,
        firstStream: null,
        responseComplete: null,
        providerPhases: []
      },
      metadata: {
        authority: "environment",
        binding: {
          environmentId: this.resolveEnvironmentId(environmentId),
          sessionId: this.currentBinding?.sessionId ?? null
        },
        readModel: "conversation-latency-v1"
      }
    };
  }

  async memoryList(environmentId?: string): Promise<QueryResultDto<MemoryListDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const entries = this.getLocalMemories(resolvedEnvironmentId);
    return {
      contractVersion: 1,
      domain: "memory",
      operation: "memory.list",
      kind: "query",
      status: "ok",
      data: {
        entries: this.cloneValue(entries),
        entryCount: entries.length
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "operator-memory-list-v1"
      }
    };
  }

  async memoryDetail(memoryId: string, environmentId?: string): Promise<QueryResultDto<MemoryEntryDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const entry = this.getLocalMemories(resolvedEnvironmentId).find((item) => item.memoryId === memoryId);
    if (!entry) {
      throw new Error(`Unknown memory entry ${memoryId}.`);
    }
    return {
      contractVersion: 1,
      domain: "memory",
      operation: "memory.detail",
      kind: "query",
      status: "ok",
      data: this.cloneValue(entry),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "operator-memory-detail-v1"
      }
    };
  }

  async createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    return commandCreateConversationThread({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    return commandUpdateConversationThread({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async updateMemory(input: MemoryUpdateInput): Promise<CommandResultDto<MemoryEntryDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const memories = this.getLocalMemories(environmentId);
    const index = memories.findIndex((entry) => entry.memoryId === input.memoryId);
    if (index < 0) {
      throw new Error(`Unknown memory entry ${input.memoryId}.`);
    }
    const current = memories[index];
    const nextCategory = (input.category ?? current.category).trim().toLowerCase();
    const nextAttribute = (input.attribute ?? current.attribute).trim().toLowerCase().replace(/\s+/g, "-");
    const nextMemoryId = `operator-memory-${nextCategory}-${nextAttribute}`;
    const updated: MemoryEntryDto = {
      ...current,
      memoryId: nextMemoryId,
      category: nextCategory,
      attribute: nextAttribute,
      value: input.value ?? current.value,
      summary: input.summary ?? current.summary,
      confidence: input.confidence ?? current.confidence ?? null,
      updatedAt: new Date().toISOString()
    };
    memories.splice(index, 1, updated);
    this.localMemories.set(
      environmentId,
      memories.sort((left, right) =>
        String(right.updatedAt ?? right.recordedAt ?? "").localeCompare(
          String(left.updatedAt ?? left.recordedAt ?? "")
        )
      )
    );
    return {
      contractVersion: 1,
      domain: "memory",
      operation: "memory.update",
      kind: "command",
      status: "ok",
      data: this.cloneValue(updated),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "operator-memory-command-v1"
      }
    };
  }

  async deleteMemory(input: {
    environmentId: string;
    memoryId: string;
  }): Promise<CommandResultDto<MemoryDeleteResultDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const memories = this.getLocalMemories(environmentId).filter((entry) => entry.memoryId !== input.memoryId);
    this.localMemories.set(environmentId, memories);
    return {
      contractVersion: 1,
      domain: "memory",
      operation: "memory.delete",
      kind: "command",
      status: "ok",
      data: {
        memoryId: input.memoryId,
        deletedP: true
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "operator-memory-command-v1"
      }
    };
  }

  async sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const normalizedPrompt = input.prompt.trim().toLowerCase();
    const result = commandSendConversationMessage({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
    if (result.status === "awaiting_approval") {
      const record = this.desktopTaskRecordCatalog.find(
        (entry) => entry.actorMessageId === "actor-message-editor-approval"
      );
      if (record) {
        const requestedForm =
          typeof result.data.pendingApproval?.requestedForm === "string"
            ? result.data.pendingApproval.requestedForm
            : this.extractRequestedEditorAppendForm(input.prompt);
        record.threadId = result.data.threadId ?? input.threadId;
        record.turnId = result.data.turnId ?? record.turnId;
        record.status = "awaiting-approval";
        record.governanceStatus = "governance-pending";
        record.approvalStatus = "awaiting-approval";
        record.approvedAt = null;
        record.startedAt = null;
        record.completedAt = null;
        record.lastError = null;
        record.resolution = null;
        record.result = null;
        record.requestMetadata = {
          ...(typeof record.requestMetadata === "object" && record.requestMetadata ? record.requestMetadata : {}),
          text: requestedForm ?? "(+ 1 1)",
          bufferId: "editor-buffer-project-live-environment-main"
        };
      }
    }
    if (
      onEvent &&
      result.status !== "awaiting_approval" &&
      !normalizedPrompt.startsWith("evaluate ")
    ) {
      onEvent({
        cursor: Date.now(),
        kind: "provider-stream",
        timestamp: new Date().toISOString(),
        family: "provider",
        summary: "provider / message-delta",
        entityId: null,
        threadId: input.threadId,
        turnId: null,
        visibility: "user",
        payload: {
          canonicalType: "text-delta",
          payload: "Mock assistant response"
        }
      });
    }
    return result;
  }

  async approveActorMessage(
    _input: ApproveActorMessageInput
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const now = new Date().toISOString();
    const record = this.desktopTaskRecordCatalog.find(
      (entry) => entry.actorMessageId === _input.actorMessageId
    );
    if (!record) {
      return {
        contractVersion: 1,
        domain: "desktop-task",
        operation: "approve-message",
        kind: "command",
        status: "error",
        data: {
          threadId: "thread-default",
          turnId: "turn-default",
          assistantMessage: "Unknown actor message.",
          summary: "Unknown actor message.",
          desktopTaskResults: [],
          taskRecordSummaries: []
        },
        metadata: { authority: "environment", binding: this.currentBinding }
      };
    }
    record.status = "completed";
    record.governanceStatus = "governed";
    record.approvalStatus = "approved";
    record.approvedAt = now;
    record.startedAt = now;
    record.completedAt = now;
    const appendedText =
      typeof record.requestMetadata === "object" &&
      record.requestMetadata != null &&
      typeof (record.requestMetadata as { text?: unknown }).text === "string"
        ? (record.requestMetadata as { text: string }).text
        : "(+ 1 1)";
    record.result = {
      status: "completed",
      summary: "Appended text to the active editor buffer.",
      invocationResult: {
        text: appendedText,
        scopeId: "project-live",
        bufferId: "editor-buffer-project-live-environment-main",
        packageName: "cl-user"
      }
    };
    applyMockConversationApprovalCompletion({
      environmentId: this.resolveEnvironmentId(_input.environmentId),
      threadId: record.threadId ?? "thread-default",
      turnId: record.turnId ?? "turn-default",
      assistantMessage: `Appended ${appendedText} to the editor now.`
    });
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "approve-message",
      kind: "command",
      status: "ok",
      data: {
        threadId: record.threadId ?? "thread-default",
        turnId: record.turnId ?? "turn-default",
        assistantMessage: `Appended ${appendedText} to the editor now.`,
        summary: "Appended text to the active editor buffer.",
        desktopTaskResults: [
          {
            requestId: record.requestId,
            target: record.target,
            operation: record.operation,
            status: record.status,
            result: record.result
          }
        ],
        taskRecordSummaries: [this.cloneValue({ ...record } as Record<string, unknown>)]
      },
      metadata: { authority: "environment", binding: this.currentBinding }
    };
  }

  async approveApproval(
    input: { environmentId: string; approvalId: string; sessionId?: string | null }
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const record = this.desktopTaskRecordCatalog.find(
      (entry) => String(entry.approvalId ?? "") === input.approvalId
    );
    if (!record?.actorMessageId) {
      return {
        contractVersion: 1,
        domain: "desktop-task",
        operation: "approve-approval",
        kind: "command",
        status: "error",
        data: {
          threadId: "thread-default",
          turnId: "turn-default",
          assistantMessage: "Unknown approval id.",
          summary: "Unknown approval id.",
          desktopTaskResults: [],
          taskRecordSummaries: []
        },
        metadata: { authority: "environment", binding: this.currentBinding }
      };
    }
    return this.approveActorMessage({ environmentId: input.environmentId, actorMessageId: record.actorMessageId });
  }

  private extractRequestedEditorAppendForm(prompt: string): string | null {
    const match = prompt.match(
      /append\s+([\s\S]+?)\s+(?:to|into)\s+the\s+(?:editor surface|surface editor)\.?\s*$/i
    );
    return match?.[1]?.trim() ?? null;
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

  async runtimeSummary(environmentId?: string) {
    return queryRuntimeSummary(this.resolveEnvironmentId(environmentId));
  }

  private mockCalculatorSummary(environmentId?: string): CalculatorSummaryDto {
    return {
      availableModes: ["basic", "scientific", "programmer"],
      defaultMode: "basic",
      availableBases: [2, 8, 10, 16],
      defaultBase: 10,
      availableWordSizes: [8, 16, 32, 64],
      defaultWordSize: 64,
      availableAngleUnits: ["radians", "degrees"],
      defaultAngleUnit: "radians",
      currentExpression: "",
      currentMode: "basic",
      currentBase: 10,
      currentWordSize: 64,
      currentAngleUnit: "radians",
      latestResult: null,
      history: [],
      summary: `Mock calculator summary for ${this.resolveEnvironmentId(environmentId)}.`
    };
  }

  async calculatorSummary(
    environmentId?: string
  ): Promise<QueryResultDto<CalculatorSummaryDto>> {
    return {
      contractVersion: 1,
      domain: "calculator",
      operation: "calculator.summary",
      kind: "query",
      status: "ok",
      data: this.mockCalculatorSummary(environmentId),
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async setCalculatorExpression(input: { environmentId: string; expression: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.set-expression", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentExpression: input.expression }, metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async appendCalculatorToken(input: { environmentId: string; token: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.append-token", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentExpression: input.token }, metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async backspaceCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.backspace", kind: "command", status: "ok", data: this.mockCalculatorSummary(environmentId), metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async clearCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.clear", kind: "command", status: "ok", data: this.mockCalculatorSummary(environmentId), metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async setCalculatorMode(input: { environmentId: string; mode: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.set-mode", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentMode: input.mode as any }, metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async setCalculatorBase(input: { environmentId: string; base: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.set-base", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentBase: input.base }, metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async setCalculatorWordSize(input: { environmentId: string; wordSize: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.set-word-size", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentWordSize: input.wordSize }, metadata: { authority: "environment", binding: this.currentBinding } };
  }
  async setCalculatorAngleUnit(input: { environmentId: string; angleUnit: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    return { contractVersion: 1, domain: "calculator", operation: "calculator.set-angle-unit", kind: "command", status: "ok", data: { ...this.mockCalculatorSummary(input.environmentId), currentAngleUnit: input.angleUnit as any }, metadata: { authority: "environment", binding: this.currentBinding } };
  }

  async packageManagementSummary(
    environmentId?: string
  ): Promise<QueryResultDto<PackageManagementSummaryDto>> {
    return queryPackageManagementSummary(this.resolveEnvironmentId(environmentId));
  }

  async runtimeTelemetrySnapshot(
    environmentId?: string
  ): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>> {
    return queryRuntimeTelemetrySnapshot(this.resolveEnvironmentId(environmentId));
  }

  async runtimeInspectSymbol(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }): Promise<QueryResultDto<RuntimeInspectionResultDto>> {
    return queryRuntimeInspectSymbol({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>> {
    return queryRuntimeEntityDetail({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>> {
    return queryPackageBrowser({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async runtimeSymbolPage(input: RuntimeSymbolBrowserPageInput): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto>> {
    return queryRuntimeSymbolPage({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async fileSystemDirectory(input?: {
    path?: string;
  }): Promise<QueryResultDto<FileSystemDirectoryListingDto>> {
    const currentPath = resolve(input?.path && input.path.trim().length > 0 ? input.path : process.cwd());
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
    return querySourcePreview({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async writeSourceFile(input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<FileSystemWriteResultDto>> {
    const absolutePath = resolve(input.path);
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

  async evaluateInContext(input: {
    environmentId: string;
    form: string;
    packageName?: string;
    recoveryLaunch?: {
      source: "incident-restart";
      incidentId: string;
      restartLabel: string;
    } | null;
  }) {
    return commandEvaluateInContext(input);
  }

  async evaluateCalculator(
    input: CalculatorEvaluateInput
  ): Promise<CommandResultDto<CalculatorResultDto>> {
    return {
      contractVersion: 1,
      domain: "calculator",
      operation: "calculator.evaluate",
      kind: "command",
      status: "ok",
      data: evaluateMockCalculatorExpression(input),
      metadata: {
        authority: "environment",
        binding: this.currentBinding
      }
    };
  }

  async stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>> {
    return commandStageSourceChange({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>> {
    return commandReloadSourceFile({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async desktopAction(
    input: DesktopActionInput
  ): Promise<CommandResultDto<DesktopActionResultDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(input.environmentId);
    const panelId = input.panelId ?? "workspace";
    this.preferences.lastWorkspace = this.panelToWorkspaceId(panelId);
    const desktopModel = (await this.desktopModel(resolvedEnvironmentId)).data;

    return {
      contractVersion: 1,
      domain: "shell",
      operation: "shell.desktop_action",
      kind: "command",
      status: "ok",
      data: {
        action: {
          actionId: input.actionId,
          actionKind: input.actionKind ?? "activate-panel",
          panelId,
          command: input.command ?? "",
          index: input.index ?? null,
          executionId: input.executionId ?? null,
          objectKind: input.objectKind ?? null,
          params: input.params
        },
        result: {
          panelId
        },
        desktopModel
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "shell-desktop-action-v1"
      }
    };
  }

  async desktopRestore(
    input: DesktopRestoreInput
  ): Promise<CommandResultDto<DesktopRestoreResultDto>> {
    const panelId = (input.panelId ??
      (typeof input.panelState.panelId === "string" ? input.panelState.panelId : "workspace")) as DesktopPanelId;
    const resolvedEnvironmentId = this.resolveEnvironmentId(input.environmentId);
    this.preferences.lastWorkspace = this.panelToWorkspaceId(panelId);
    const desktopModel = (await this.desktopModel(resolvedEnvironmentId)).data;

    return {
      contractVersion: 1,
      domain: "shell",
      operation: "shell.desktop_restore",
      kind: "command",
      status: "ok",
      data: {
        panelId,
        panelState: input.panelState,
        result: {
          panelId
        },
        desktopModel
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "shell-desktop-restore-v1"
      }
    };
  }

  async approvalRequestList(environmentId?: string) {
    return queryApprovalRequestList(this.resolveEnvironmentId(environmentId));
  }

  async approvalRequestDetail(requestId: string, environmentId?: string) {
    return queryApprovalRequestDetail(this.resolveEnvironmentId(environmentId), requestId);
  }

  async approveRequest(input: { environmentId: string; requestId: string }) {
    return commandApproveRequest(input);
  }

  async denyRequest(input: { environmentId: string; requestId: string }) {
    return commandDenyRequest(input);
  }

  async incidentList(environmentId?: string) {
    return queryIncidentList(this.resolveEnvironmentId(environmentId));
  }

  async incidentDetail(incidentId: string, environmentId?: string) {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const local = this.localWorkspaces.get(resolvedEnvironmentId);
    if (!local) {
      return queryIncidentDetail(resolvedEnvironmentId, incidentId);
    }
    return {
      contractVersion: 1,
      domain: "incident",
      operation: "incident.detail",
      kind: "query" as const,
      status: "ok" as const,
      data: local.incidentDetails[incidentId],
      metadata: {
        authority: "environment" as const,
        binding: this.currentBinding,
        readModel: "incident-detail",
        incidentId
      }
    };
  }

  async updateIncidentRemediationPlan(
    input: UpdateIncidentRemediationPlanInput
  ): Promise<CommandResultDto<IncidentDetailDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(resolvedEnvironmentId);
    const current = workspace.incidentDetails[input.incidentId] ?? queryIncidentDetail(resolvedEnvironmentId, input.incidentId).data;
    const remediationPlan: IncidentRemediationPlanDto = {
      ...input.remediationPlan,
      actions: [...input.remediationPlan.actions],
      validationSteps: [...input.remediationPlan.validationSteps],
      blockers: [...input.remediationPlan.blockers]
    };
    return this.localIncidentResponse("incident.set-remediation-plan", resolvedEnvironmentId, {
      ...current,
      remediationPlan,
      updatedAt: new Date().toISOString()
    });
  }

  async createIntent(input: CreateIntentInput): Promise<CommandResultDto<IntentDetailDto>> {
    const intentId = `intent-${input.description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mock"}`;
    return {
      contractVersion: 1,
      domain: "intent",
      operation: "intent.create",
      kind: "command",
      status: "ok",
      data: {
        id: intentId,
        description: input.description,
        status: input.status ?? "active",
        priority: input.priority ?? null,
        version: input.version ?? 1,
        scopeSummary: {
          symbolCount: input.scope?.symbols?.length ?? 0,
          systemCount: input.scope?.systems?.length ?? 0,
          workflowCount: input.scope?.workflows?.length ?? 0
        },
        linkedRuntimeObjectCount: input.linkedRuntimeObjects?.length ?? 0,
        linkedSourceArtifactCount: input.linkedSourceArtifacts?.length ?? 0,
        linkedEventCount: input.linkedEventIds?.length ?? 0,
        linkedMutationCount: input.linkedMutationIds?.length ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "intent-command-v1"
      }
    };
  }

  async createProject(input: CreateProjectInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const projectId = `project-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mock"}`;
    const title = input.title.trim() || "Mock Project";
    const summary = input.summary ?? "Governed mock project created from the desktop shell.";
    return this.localProjectResponse(
      "project.create",
      this.buildEmptyLocalProject(projectId, title, summary)
    );
  }

  async updateProjectConstitution(input: UpdateProjectConstitutionInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-constitution", {
      ...current,
      constitution: input.constitution,
      updatedAt: new Date().toISOString()
    });
  }

  async updateProjectDesignSystem(input: UpdateProjectDesignSystemInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-design-system", {
      ...current,
      designSystem: input.designSystem,
      updatedAt: new Date().toISOString()
    });
  }

  async updateProjectStyleGuide(input: UpdateProjectStyleGuideInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-style-guide", {
      ...current,
      styleGuide: input.styleGuide,
      updatedAt: new Date().toISOString()
    });
  }

  async updateProjectTestingStrategy(input: UpdateProjectTestingStrategyInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-testing-strategy", {
      ...current,
      testingStrategy: input.testingStrategy,
      updatedAt: new Date().toISOString()
    });
  }

  async updateProjectReleaseReadiness(
    input: UpdateProjectReleaseReadinessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-release-readiness", {
      ...current,
      releaseReadiness: input.releaseReadiness,
      updatedAt: new Date().toISOString()
    });
  }

  async updateProjectReadinessObligations(
    input: UpdateProjectReadinessObligationsInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    return this.localProjectResponse("project.set-readiness-obligations", {
      ...current,
      readinessObligations: input.readinessObligations,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectRequirement(input: AppendProjectRequirementInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const requirement = {
      requirementId: input.id ?? `req-${current.requirements.length + 1}`,
      title: input.title,
      summary: input.summary,
      scope: input.scope ?? "",
      kind: input.kind ?? (input.nonFunctional ? "non-functional" : "functional"),
      priority: input.priority ?? "medium",
      status: input.status ?? "draft",
      verificationKind: input.verificationKind ?? null,
      linkedArtifactIds: input.linkedArtifactIds ?? []
    };
    const requirements = [...current.requirements, requirement];
    const nonFunctionalRequirements = input.nonFunctional
      ? [...current.nonFunctionalRequirements, requirement]
      : current.nonFunctionalRequirements;
    return this.localProjectResponse("project.append-requirement", {
      ...current,
      requirements,
      nonFunctionalRequirements,
      requirementCount: requirements.length,
      nonFunctionalRequirementCount: nonFunctionalRequirements.length,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectFeatureSpecification(
    input: AppendProjectFeatureSpecificationInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const feature = {
      featureSpecId: input.id ?? `spec-${current.featureSpecifications.length + 1}`,
      title: input.title,
      summary: input.summary,
      status: input.status ?? "draft",
      acceptanceCriteria: input.acceptanceCriteria ?? [],
      linkedRequirementIds: input.linkedRequirementIds ?? [],
      linkedJourneyIds: input.linkedJourneyIds ?? []
    };
    const featureSpecifications = [...current.featureSpecifications, feature];
    return this.localProjectResponse("project.append-feature-specification", {
      ...current,
      featureSpecifications,
      featureSpecCount: featureSpecifications.length,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectUserJourney(
    input: AppendProjectUserJourneyInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const journey = {
      journeyId: input.id ?? `journey-${current.userJourneys.length + 1}`,
      title: input.title,
      summary: input.summary,
      actors: input.actors ?? [],
      entrypoints: input.entrypoints ?? [],
      steps: input.steps ?? [],
      outcomes: input.outcomes ?? [],
      edgeCases: input.edgeCases ?? []
    };
    const userJourneys = [...current.userJourneys, journey];
    return this.localProjectResponse("project.append-user-journey", {
      ...current,
      userJourneys,
      journeyCount: userJourneys.length,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectArchitectureDecision(
    input: AppendProjectArchitectureDecisionInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const decision = {
      architectureDecisionId: input.id ?? `adr-${current.architectureDecisions.length + 1}`,
      title: input.title,
      summary: input.summary,
      status: input.status ?? "proposed",
      drivers: input.drivers ?? [],
      consequences: input.consequences ?? [],
      stackChoices: input.stackChoices ?? [],
      linkedRequirementIds: input.linkedRequirementIds ?? []
    };
    const architectureDecisions = [...current.architectureDecisions, decision];
    return this.localProjectResponse("project.append-architecture-decision", {
      ...current,
      architectureDecisions,
      architectureDecisionCount: architectureDecisions.length,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectSourceRoot(input: AppendProjectSourceRootInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const sourceRoots = Array.from(new Set([...current.sourceRoots, input.sourceRoot]));
    return this.localProjectResponse("project.append-source-root", {
      ...current,
      sourceRoots,
      updatedAt: new Date().toISOString()
    });
  }

  async bindProjectTestingHarness(
    input: BindProjectTestingHarnessInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const linkedTestingHarnessIds = Array.from(new Set([...current.linkedTestingHarnessIds, input.harnessId]));
    const linkedTestingHarnesses = linkedTestingHarnessIds.map((harnessId) => ({
      harnessId,
      label: harnessId,
      entrypoint: `./bin/${harnessId}`,
      kind: "mock",
      categories: []
    }));
    return this.localProjectResponse("project.bind-testing-harness", {
      ...current,
      linkedTestingHarnessIds,
      linkedTestingHarnesses,
      linkedTestingHarnessCount: linkedTestingHarnessIds.length,
      updatedAt: new Date().toISOString()
    });
  }

  async appendProjectQualityGate(
    input: AppendProjectQualityGateInput
  ): Promise<CommandResultDto<ProjectDetailDto>> {
    const current = this.getLocalProject(input.projectId);
    const nextGate: ProjectQualityGateDto = {
      gateId: input.id ?? `gate-${(current.qualityGateEvidence?.qualityGates.length ?? 0) + 1}`,
      title: input.title,
      summary: input.summary ?? "",
      status: input.status ?? "draft",
      requiredHarnessIds: input.requiredHarnessIds ?? [],
      minimumLinkedWorkItems: input.minimumLinkedWorkItems ?? 0,
      minimumLinkedIncidents: input.minimumLinkedIncidents ?? 0,
      requireSourceRoots: input.requireSourceRoots ?? false,
      requiredTraceTargetKinds: input.requiredTraceTargetKinds ?? [],
      maximumFailedTests: input.maximumFailedTests ?? null,
      requireCoverage: input.requireCoverage ?? false,
      maximumSayTurnLatencySeconds: input.maximumSayTurnLatencySeconds ?? null,
      maximumEnvironmentSaveLoadSeconds: input.maximumEnvironmentSaveLoadSeconds ?? null,
      requireRecoveryReady: input.requireRecoveryReady ?? false
    };
    const qualityGates = [...(current.qualityGateEvidence?.qualityGates ?? []), nextGate];
    return this.localProjectResponse("project.append-quality-gate", {
      ...current,
      qualityGateEvidence: {
        qualityGates,
        qualityGateSummary: {
          gateCount: qualityGates.length,
          blockedCount: qualityGates.filter((gate) => gate.status === "blocked").length,
          readyCount: qualityGates.filter((gate) => gate.status === "ready").length,
          readiness: qualityGates.some((gate) => gate.status === "blocked") ? "blocked" : "ready"
        }
      },
      updatedAt: new Date().toISOString()
    });
  }

  async resumeWorkItem(input: ResumeWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(environmentId);
    const currentDetail = workspace.workItemDetails[input.workItemId];
    const currentWorkflow = workspace.workflowRecords[currentDetail.workflowRecordId];
    const waitingReason = input.note?.trim() || "Execution resumed under governed supervision.";
    const nextDetail: WorkItemDetailDto = {
      ...currentDetail,
      state: "active",
      waitingReason
    };
    const nextWorkflow: WorkflowRecordDto = {
      ...currentWorkflow,
      phase: currentWorkflow.phase === "reconciliation" ? "execution" : currentWorkflow.phase,
      closureSummary: "Execution resumed. Validation and reconciliation still remain governed obligations.",
      blockingItems: currentWorkflow.blockingItems.filter((item) => item !== input.workItemId)
    };
    workspace.workItems = this.updateLocalWorkItemSummary(workspace.workItems, input.workItemId, {
      state: "active",
      waitingReason
    });
    workspace.workItemPlans[input.workItemId] = {
      ...workspace.workItemPlans[input.workItemId],
      status: "active",
      planHealth: "active"
    };
    return this.localWorkItemResponse("work-item.resume", environmentId, nextDetail, nextWorkflow);
  }

  async quarantineWorkItem(input: QuarantineWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(environmentId);
    const currentDetail = workspace.workItemDetails[input.workItemId];
    const currentWorkflow = workspace.workflowRecords[currentDetail.workflowRecordId];
    const waitingReason = input.reason.trim();
    const nextDetail: WorkItemDetailDto = {
      ...currentDetail,
      state: "quarantined",
      waitingReason
    };
    const nextWorkflow: WorkflowRecordDto = {
      ...currentWorkflow,
      phase: "reconciliation",
      closureReadiness: "not_closable",
      closureSummary: "Execution is quarantined until recovery review and governed direction complete.",
      blockingItems: Array.from(new Set([...currentWorkflow.blockingItems, waitingReason]))
    };
    workspace.workItems = this.updateLocalWorkItemSummary(workspace.workItems, input.workItemId, {
      state: "quarantined",
      waitingReason
    });
    workspace.workItemPlans[input.workItemId] = {
      ...workspace.workItemPlans[input.workItemId],
      status: "quarantined",
      planHealth: "resumable"
    };
    return this.localWorkItemResponse("work-item.quarantine", environmentId, nextDetail, nextWorkflow);
  }

  async rollbackWorkItem(input: RollbackWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(environmentId);
    const currentDetail = workspace.workItemDetails[input.workItemId];
    const currentWorkflow = workspace.workflowRecords[currentDetail.workflowRecordId];
    const waitingReason = input.reason?.trim() || input.note?.trim() || "Rollback requested pending governed review.";
    const nextDetail: WorkItemDetailDto = {
      ...currentDetail,
      state: "blocked",
      waitingReason
    };
    const nextWorkflow: WorkflowRecordDto = {
      ...currentWorkflow,
      phase: "reconciliation",
      validationState: "pending",
      reconciliationState: "required",
      closureReadiness: "not_closable",
      closureSummary: "Rollback is pending governed review before this work item can return to normal execution.",
      blockingItems: Array.from(new Set([...currentWorkflow.blockingItems, "rollback-review"]))
    };
    workspace.workItems = this.updateLocalWorkItemSummary(workspace.workItems, input.workItemId, {
      state: "blocked",
      waitingReason,
      validationBurden: "pending",
      reconciliationBurden: "required"
    });
    workspace.workItemPlans[input.workItemId] = {
      ...workspace.workItemPlans[input.workItemId],
      status: "blocked",
      planHealth: "resumable",
      pendingValidations: ["cold"]
    };
    return this.localWorkItemResponse("work-item.rollback", environmentId, nextDetail, nextWorkflow);
  }

  async completeWorkItemValidations(
    input: CompleteWorkItemValidationsInput
  ): Promise<CommandResultDto<WorkItemDetailDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(environmentId);
    const currentDetail = workspace.workItemDetails[input.workItemId];
    const currentWorkflow = workspace.workflowRecords[currentDetail.workflowRecordId];
    const passed = (input.status ?? "passed").toLowerCase() === "passed";
    const nextDetail: WorkItemDetailDto = {
      ...currentDetail,
      state: passed ? "closable" : currentDetail.state,
      waitingReason: passed
        ? "Validations completed. The work item is ready for closure review."
        : "Validation failed. Further governed execution is required."
    };
    const nextWorkflow: WorkflowRecordDto = {
      ...currentWorkflow,
      validationState: passed ? "complete" : "pending",
      closureReadiness: passed && currentWorkflow.reconciliationState !== "required" ? "closable" : currentWorkflow.closureReadiness,
      closureSummary: passed
        ? "Validations are complete. Reconciliation and closure review can proceed."
        : "Validation failed. Closure remains blocked until governed remediation completes.",
      blockingItems: passed
        ? currentWorkflow.blockingItems.filter((item) => item !== "validation")
        : Array.from(new Set([...currentWorkflow.blockingItems, "validation"]))
    };
    workspace.workItems = this.updateLocalWorkItemSummary(workspace.workItems, input.workItemId, {
      state: nextDetail.state,
      waitingReason: nextDetail.waitingReason,
      validationBurden: passed ? "complete" : "pending"
    });
    workspace.workItemPlans[input.workItemId] = {
      ...workspace.workItemPlans[input.workItemId],
      status: nextDetail.state,
      pendingValidations: passed ? [] : ["cold"]
    };
    return this.localWorkItemResponse("work-item.complete-validations", environmentId, nextDetail, nextWorkflow);
  }

  async steerWorkItem(input: SteerWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const environmentId = this.resolveEnvironmentId(input.environmentId);
    const workspace = this.getLocalWorkspace(environmentId);
    const currentDetail = workspace.workItemDetails[input.workItemId];
    const currentWorkflow = workspace.workflowRecords[currentDetail.workflowRecordId];
    const note = input.note?.trim() || input.nextStep?.trim() || "Execution has been steered through the Work panel.";
    const requestedPhase = input.phase?.trim().toLowerCase() ?? "";
    const phase: WorkflowRecordDto["phase"] =
      requestedPhase === "execution" ||
      requestedPhase === "validation" ||
      requestedPhase === "reconciliation" ||
      requestedPhase === "closure"
        ? requestedPhase
        : currentWorkflow.phase;
    const nextDetail: WorkItemDetailDto = {
      ...currentDetail,
      state: "active",
      waitingReason: note
    };
    const nextWorkflow: WorkflowRecordDto = {
      ...currentWorkflow,
      phase,
      closureSummary: input.nextStep?.trim()
        ? `Next governed step: ${input.nextStep.trim()}`
        : "Execution direction has been updated from the Work panel.",
      blockingItems: currentWorkflow.blockingItems
    };
    workspace.workItems = this.updateLocalWorkItemSummary(workspace.workItems, input.workItemId, {
      state: "active",
      waitingReason: note
    });
    const existingPlan = workspace.workItemPlans[input.workItemId];
    workspace.workItemPlans[input.workItemId] = {
      ...existingPlan,
      status: "active",
      nextAction: {
        type: "operator-steered",
        phase,
        suggestedStep: input.nextStep?.trim() || null,
        note: input.note?.trim() || null
      },
      resumePayload: {
        resumeCommand: "operator-steered",
        phase,
        nextStep: input.nextStep?.trim() || null,
        note: input.note?.trim() || null
      },
      operatorSteeringHistory: [
        ...(existingPlan?.operatorSteeringHistory ?? []),
        {
          phase,
          nextStep: input.nextStep?.trim() || null,
          note: input.note?.trim() || null,
          timestamp: Date.now()
        }
      ],
      planSteering: existingPlan?.planSteering
        ? {
            ...existingPlan.planSteering,
            currentPhase: phase,
            operatorDirectedPhase: phase,
            operatorDirectedNextStep: input.nextStep?.trim() || null,
            nextStep: input.nextStep?.trim() || null,
            operatorSteeringCount: (existingPlan.planSteering.operatorSteeringCount ?? 0) + 1,
            compacted: true,
            revisionReason: "operator-steered"
          }
        : existingPlan?.planSteering
    };
    return this.localWorkItemResponse("work-item.steer", environmentId, nextDetail, nextWorkflow);
  }

  async projectList(environmentId?: string): Promise<QueryResultDto<ProjectListDto>> {
    const base = queryProjectList(this.resolveEnvironmentId(environmentId));
    const localProjects = Array.from(this.localProjects.values());
    if (localProjects.length === 0) {
      return base;
    }
    const staticProjects = base.data.projects.filter(
      (project) => !this.localProjects.has(project.projectId)
    );
    return {
      ...base,
      data: {
        currentProjectId: this.preferences.currentProjectId ?? base.data.currentProjectId,
        projects: [
          ...localProjects.map((project) => ({
            projectId: project.projectId,
            title: project.title,
            summary: project.summary,
            status: project.status,
            createdAt: project.createdAt ?? null,
            updatedAt: project.updatedAt ?? null,
            requirementCount: project.requirementCount,
            featureSpecCount: project.featureSpecCount,
            journeyCount: project.journeyCount,
            architectureDecisionCount: project.architectureDecisionCount,
            nonFunctionalRequirementCount: project.nonFunctionalRequirementCount,
            linkedWorkItemCount: project.linkedWorkItemCount,
            linkedIncidentCount: project.linkedIncidentCount,
            linkedTestingHarnessCount: project.linkedTestingHarnessCount,
            sourceRoots: project.sourceRoots
          })),
          ...staticProjects
        ]
      }
    };
  }

  async projectTestingHarnessInventory(environmentId?: string): Promise<QueryResultDto<ProjectTestingHarnessDto[]>> {
    return queryProjectTestingHarnessInventory(this.resolveEnvironmentId(environmentId));
  }

  async projectDetail(projectId: string, environmentId?: string): Promise<QueryResultDto<ProjectDetailDto>> {
    const local = this.localProjects.get(projectId);
    if (local) {
      return {
        contractVersion: 1,
        domain: "project",
        operation: "project.detail",
        kind: "query",
        status: "ok",
        data: local,
        metadata: {
          authority: "environment",
          binding: this.currentBinding,
          readModel: "project-detail-v1"
        }
      };
    }
    return queryProjectDetail(this.resolveEnvironmentId(environmentId), projectId);
  }

  async workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const local = this.localWorkspaces.get(resolvedEnvironmentId);
    if (!local) {
      return queryWorkItemList(resolvedEnvironmentId);
    }
    return {
      contractVersion: 1,
      domain: "workflow",
      operation: "work_item.list",
      kind: "query" as const,
      status: "ok" as const,
      data: local.workItems,
      metadata: {
        authority: "environment" as const,
        binding: this.currentBinding,
        readModel: "work-item-list"
      }
    };
  }

  async workItemDetail(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemDetailDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const local = this.localWorkspaces.get(resolvedEnvironmentId);
    if (!local) {
      return queryWorkItemDetail(resolvedEnvironmentId, workItemId);
    }
    return {
      contractVersion: 1,
      domain: "workflow",
      operation: "work_item.detail",
      kind: "query" as const,
      status: "ok" as const,
      data: local.workItemDetails[workItemId],
      metadata: {
        authority: "environment" as const,
        binding: this.currentBinding,
        readModel: "work-item-detail"
      }
    };
  }

  async workItemPlan(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemPlanDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const local = this.getLocalWorkspace(resolvedEnvironmentId);
    return {
      contractVersion: 1,
      domain: "workflow",
      operation: "work_item.plan",
      kind: "query",
      status: "ok",
      data: local.workItemPlans[workItemId],
      metadata: {
        authority: "environment" as const,
        binding: this.currentBinding,
        readModel: "work-item-plan"
      }
    };
  }

  async workflowRecordDetail(
    workflowRecordId: string,
    environmentId?: string
  ): Promise<QueryResultDto<WorkflowRecordDto>> {
    const resolvedEnvironmentId = this.resolveEnvironmentId(environmentId);
    const local = this.localWorkspaces.get(resolvedEnvironmentId);
    if (!local) {
      return queryWorkflowRecordDetail(resolvedEnvironmentId, workflowRecordId);
    }
    return {
      contractVersion: 1,
      domain: "workflow",
      operation: "workflow.record_detail",
      kind: "query" as const,
      status: "ok" as const,
      data: local.workflowRecords[workflowRecordId],
      metadata: {
        authority: "environment" as const,
        binding: this.currentBinding,
        readModel: "workflow-record-detail"
      }
    };
  }

  async providerProfiles(_environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>> {
    return this.providerQueryResult();
  }

  async desktopTaskManifests(_environmentId?: string): Promise<QueryResultDto<DesktopTaskManifestDto[]>> {
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "manifest-list",
      kind: "query",
      status: "ok",
      data: this.cloneValue(this.desktopTaskManifestCatalog),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-manifest-list-v1"
      }
    };
  }

  async desktopTaskRecords(_environmentId?: string): Promise<QueryResultDto<DesktopTaskRecordDto[]>> {
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "record-list",
      kind: "query",
      status: "ok",
      data: this.cloneValue(this.desktopTaskRecordCatalog),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-record-list-v1"
      }
    };
  }

  async orchestrationList(_environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return {
      contractVersion: 1,
      domain: "planning",
      operation: "orchestration-list",
      kind: "query",
      status: "ok",
      data: [],
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "orchestration-list-v1"
      }
    };
  }

  async orchestrationInbox(_environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return {
      contractVersion: 1,
      domain: "planning",
      operation: "orchestration-inbox",
      kind: "query",
      status: "ok",
      data: [],
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "orchestration-inbox-v1"
      }
    };
  }

  async orchestrationFocus(input?: {
    environmentId?: string;
    planId?: string;
    workflowRecordId?: string;
    workItemId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return {
      contractVersion: 1,
      domain: "planning",
      operation: "orchestration-focus",
      kind: "query",
      status: "ok",
      data: {
        id: input?.planId ?? null,
        workflowRecordId: input?.workflowRecordId ?? null,
        workItemId: input?.workItemId ?? null,
        resolvedBy: input?.planId
          ? "planId"
          : input?.workflowRecordId
            ? "workflowRecordId"
            : input?.workItemId
              ? "workItemId"
              : "activePlan"
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "orchestration-focus-v1"
      }
    };
  }

  async orchestrationSnapshot(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return {
      contractVersion: 1,
      domain: "planning",
      operation: "orchestration-snapshot",
      kind: "query",
      status: "ok",
      data: {
        id: input?.planId ?? null
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "orchestration-snapshot-v1"
      }
    };
  }

  async planVerification(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    return {
      contractVersion: 1,
      domain: "planning",
      operation: "verification",
      kind: "query",
      status: "ok",
      data: {
        planId: input?.planId ?? null,
        stepCount: 0,
        verifiedStepCount: 0,
        failedStepCount: 0,
        pendingStepCount: 0
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "plan-verification-v1"
      }
    };
  }

  async desktopTaskPendingApproval(_environmentId?: string): Promise<QueryResultDto<Record<string, unknown>>> {
    const pendingRecord = this.desktopTaskRecordCatalog.find(
      (record) => String(record.approvalStatus ?? "").toLowerCase() === "awaiting-approval"
    );
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "pending-approval",
      kind: "query",
      status: "ok",
      data: pendingRecord
        ? {
            turnId: pendingRecord.turnId ?? null,
            recordIds: [pendingRecord.id],
            policyIds: [],
            receiverRoles: [String(pendingRecord.target ?? "unknown").toLowerCase()],
            actorMessageIds: pendingRecord.actorMessageId ? [pendingRecord.actorMessageId] : [],
            actorMessages: pendingRecord.actorMessage ? [pendingRecord.actorMessage] : []
          }
        : {},
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-pending-approval-v1"
      }
    };
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
    const pendingRecord = this.desktopTaskRecordCatalog.find(
      (record) =>
        String(record.approvalStatus ?? "").toLowerCase() === "awaiting-approval" &&
        (input?.sessionId == null || record.requestMetadata?.sessionId === input.sessionId) &&
        (input?.approvalId == null || record.requestMetadata?.approvalId === input.approvalId || record.id === input.approvalId) &&
        (input?.pendingActionId == null || record.requestMetadata?.pendingActionId === input.pendingActionId) &&
        (input?.actorMessageId == null || record.actorMessageId === input.actorMessageId)
    ) ?? this.desktopTaskRecordCatalog.find(
      (record) => String(record.approvalStatus ?? "").toLowerCase() === "awaiting-approval"
    );
    const sessionId =
      pendingRecord?.requestMetadata?.sessionId ??
      input?.sessionId ??
      this.currentBinding?.sessionId ??
      null;
    const approvalId = pendingRecord?.requestMetadata?.approvalId ?? input?.approvalId ?? null;
    const pendingActionId = pendingRecord?.requestMetadata?.pendingActionId ?? input?.pendingActionId ?? null;
    const actorMessageId = pendingRecord?.actorMessageId ?? input?.actorMessageId ?? null;
    const threadId = pendingRecord?.threadId ?? null;
    const pendingRequests =
      pendingRecord == null
        ? []
        : [
            {
              approvalId,
              sessionId,
              pendingActionId,
              actorMessageId,
              threadId,
              target: pendingRecord.target,
              operation: pendingRecord.operation,
              approvalStatus: pendingRecord.approvalStatus,
              status: pendingRecord.status
            }
          ];
    const pendingApproval =
      pendingRecord == null
        ? {}
        : {
            sessionId,
            approvalId,
            approvalIds: approvalId ? [approvalId] : [],
            pendingActionId,
            actorMessageId,
            actorMessageIds: actorMessageId ? [actorMessageId] : [],
            threadId,
            policyIds: [],
            requests: pendingRequests
          };
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "actor-flow",
      kind: "query",
      status: "ok",
      data: {
        sessionId,
        approvalId,
        pendingActionId,
        actorMessageId,
        pendingApproval,
        contextChatMailbox: {
          sessionId,
          messageCount: pendingRecord ? 1 : 0,
          messages: pendingRequests
        },
        contextChatApprovalInbox: {
          sessionId,
          requestCount: pendingRecord ? 1 : 0,
          requests: pendingRequests
        },
        governanceInbox: {
          sessionId,
          requestCount: pendingRecord ? 1 : 0,
          requests: pendingRequests
        },
        governanceDecisions: {
          sessionId,
          decisionCount: 0,
          decisions: []
        },
        editorPendingMutations: {
          sessionId,
          mutationCount: pendingRecord ? 1 : 0,
          mutations: pendingRequests
        },
        editorAuthorizations: {
          sessionId,
          authorizationCount: 0,
          authorizations: []
        }
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-actor-flow-v1"
      }
    };
  }

  async desktopTaskActorSystemPanel(input?: {
    environmentId?: string;
    sessionId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    const sessionId = input?.sessionId ?? this.currentBinding?.sessionId ?? null;
    const pendingRecord = this.desktopTaskRecordCatalog.find(
      (record) =>
        String(record.approvalStatus ?? "").toLowerCase() === "awaiting-approval" &&
        (sessionId == null || record.requestMetadata?.sessionId === sessionId)
    );
    const incidentCount = pendingRecord ? 1 : 0;
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "actor-system-panel",
      kind: "query",
      status: "ok",
      data: {
        rootActorId: "actor/actor-system",
        sessionId,
        actorCount: 4,
        actors: [
          {
            id: "actor/actor-system",
            role: "actor-system",
            parentActorId: null,
            metrics: {
              inboxDepth: 0,
              outboxDepth: 0,
              openSupervisionIncidentCount: 0
            }
          },
          {
            id: `actor/context-chat/${sessionId ?? "mock"}`,
            role: "context-chat",
            parentActorId: "actor/actor-system",
            metrics: {
              inboxDepth: 1,
              outboxDepth: 1,
              openSupervisionIncidentCount: 0
            }
          },
          {
            id: `actor/governance/${sessionId ?? "mock"}`,
            role: "governance",
            parentActorId: "actor/actor-system",
            metrics: {
              inboxDepth: pendingRecord ? 1 : 0,
              outboxDepth: 0,
              openSupervisionIncidentCount: incidentCount
            }
          },
          {
            id: `actor/runtime/${sessionId ?? "mock"}`,
            role: "runtime",
            parentActorId: "actor/actor-system",
            metrics: {
              inboxDepth: 0,
              outboxDepth: 0,
              openSupervisionIncidentCount: 0
            }
          }
        ],
        hierarchyEdgeCount: 3,
        hierarchyEdges: [
          { parentActorId: "actor/actor-system", childActorId: `actor/context-chat/${sessionId ?? "mock"}` },
          { parentActorId: "actor/actor-system", childActorId: `actor/governance/${sessionId ?? "mock"}` },
          { parentActorId: "actor/actor-system", childActorId: `actor/runtime/${sessionId ?? "mock"}` }
        ],
        workflowEdgeCount: pendingRecord ? 2 : 0,
        workflowEdges:
          pendingRecord == null
            ? []
            : [
                {
                  fromActorId: `actor/context-chat/${sessionId ?? "mock"}`,
                  toActorId: `actor/governance/${sessionId ?? "mock"}`,
                  fromRole: "context-chat",
                  toRole: "governance",
                  target: pendingRecord.target,
                  operation: pendingRecord.operation,
                  messageCount: 1,
                  recentCount: 1,
                  failedCount: 0
                },
                {
                  fromActorId: `actor/governance/${sessionId ?? "mock"}`,
                  toActorId: `actor/runtime/${sessionId ?? "mock"}`,
                  fromRole: "governance",
                  toRole: "runtime",
                  target: "runtime",
                  operation: "evaluate-form",
                  messageCount: 1,
                  recentCount: 1,
                  failedCount: 0
                }
              ],
        supervisionIncidents: {
          incidentCount,
          incidents:
            pendingRecord == null
              ? []
              : [
                  {
                    incidentId: "mock-actor-incident-1",
                    actorId: `actor/governance/${sessionId ?? "mock"}`,
                    actorRole: "governance",
                    parentActorId: "actor/actor-system",
                    openP: true
                  }
                ]
        }
      },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-actor-system-panel-v1"
      }
    };
  }

  async desktopTaskActorTrace(_input?: {
    environmentId?: string;
    actorRole?: string;
    actorMessageId?: string;
    phase?: string;
    latestOnlyP?: boolean;
    deadLettersOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "actor-trace",
      kind: "query",
      status: "ok",
      data: [],
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-actor-trace-v1"
      }
    };
  }

  async desktopTaskDeadLetterQueue(_input?: {
    environmentId?: string;
    actorRole?: string;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "dead-letter-queue",
      kind: "query",
      status: "ok",
      data: [],
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-dead-letter-queue-v1"
      }
    };
  }

  async mcpServerConfigs(_environmentId?: string): Promise<QueryResultDto<McpServerConfigDto[]>> {
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "mcp-server-list",
      kind: "query",
      status: "ok",
      data: this.cloneValue(
        this.mcpServerConfigCatalog.map((config) => ({
          ...config,
          operationCount: config.operations.length
        }))
      ),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-mcp-server-list-v1"
      }
    };
  }

  async mcpServerConfig(
    serverId: string,
    _environmentId?: string
  ): Promise<QueryResultDto<McpServerConfigDto>> {
    const config = this.mcpServerConfigCatalog.find((entry) => entry.id === serverId);
    if (!config) {
      throw new Error(`Unknown MCP server ${serverId}.`);
    }
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "mcp-server-detail",
      kind: "query",
      status: "ok",
      data: this.cloneValue({
        ...config,
        operationCount: config.operations.length
      }),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        readModel: "desktop-task-mcp-server-detail-v1"
      }
    };
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

  async configureProviderProfile(
    input: ConfigureProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const existingProfile =
      this.providerSummary.profiles.find((profile) => profile.name === input.profileName) ?? null;
    const nextProfile = {
      name: input.profileName,
      provider: input.provider,
      model: input.model,
      fastModel: input.fastModel ?? input.model,
      apiBase: input.apiBase ?? null,
      apiKeyPresent:
        input.clearApiKey ? false : input.apiKey ? true : (existingProfile?.apiKeyPresent ?? false),
      intents: input.intents ?? [],
      latencyTier: input.latencyTier ?? "balanced",
      reviewBias: input.reviewBias ?? "neutral",
      executionBias: input.executionBias ?? "balanced",
      locality: input.locality ?? (input.provider === "lm-studio" ? "local" : "network")
    };
    this.providerSummary.profiles = [
      ...this.providerSummary.profiles.filter((profile) => profile.name !== input.profileName),
      nextProfile
    ];
    if (input.activate || !this.providerSummary.activeProfileName) {
      this.providerSummary.activeProfileName = input.profileName;
    }
    return this.providerCommandResult();
  }

  async useProviderProfile(
    input: UseProviderProfileInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    this.providerSummary.activeProfileName = input.profileName;
    return this.providerCommandResult();
  }

  async updateProviderRouting(
    input: UpdateProviderRoutingInput
  ): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    this.providerSummary.routingMode = input.mode;
    return this.providerCommandResult();
  }

  async configureMcpServer(
    input: ConfigureMcpServerInput
  ): Promise<CommandResultDto<McpServerConfigDto>> {
    const existing = input.serverId
      ? this.mcpServerConfigCatalog.find((entry) => entry.id === input.serverId) ?? null
      : null;
    const next: McpServerConfigDto = {
      id: existing?.id ?? `mcp-${input.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: input.name,
      transport: input.transport,
      command: input.command ?? null,
      arguments: input.arguments ?? [],
      environmentVariables: input.environmentVariables ?? null,
      workingDirectory: input.workingDirectory ?? null,
      endpoint: input.endpoint ?? null,
      capabilities: input.capabilities ?? [],
      retryPolicy: input.retryPolicy ?? null,
      healthStatus: input.healthStatus ?? "unknown",
      enabledP: input.enabledP ?? true,
      discoverableP: input.discoverableP ?? true,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      operationCount: existing?.operations.length ?? 0,
      operations: existing?.operations ?? [],
      metadata: null
    };
    this.mcpServerConfigCatalog = [
      ...this.mcpServerConfigCatalog.filter((entry) => entry.id !== next.id),
      next
    ];
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "configure-mcp-server",
      kind: "command",
      status: "ok",
      data: this.cloneValue(next),
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "desktop-task-mcp-server-command-v1"
      }
    };
  }

  async removeMcpServer(
    input: RemoveMcpServerInput
  ): Promise<CommandResultDto<{ id: string; removedP: boolean }>> {
    this.mcpServerConfigCatalog = this.mcpServerConfigCatalog.filter((entry) => entry.id !== input.serverId);
    return {
      contractVersion: 1,
      domain: "desktop-task",
      operation: "remove-mcp-server",
      kind: "command",
      status: "ok",
      data: { id: input.serverId, removedP: true },
      metadata: {
        authority: "environment",
        binding: this.currentBinding,
        commandModel: "desktop-task-mcp-server-command-v1"
      }
    };
  }

  async installQuicklispPackage(input: {
    environmentId: string;
    systemName: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandInstallQuicklispPackage({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async runQlotCommand(input: {
    environmentId: string;
    args: string[];
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandRunQlotCommand({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async addSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandAddSourceRegistryEntry({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async updateSourceRegistryEntry(input: {
    environmentId: string;
    oldPath: string;
    newPath: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandUpdateSourceRegistryEntry({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async removeSourceRegistryEntry(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandRemoveSourceRegistryEntry({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async addLocalProject(input: {
    environmentId: string;
    path: string;
    name?: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandAddLocalProject({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async removeLocalProject(input: {
    environmentId: string;
    name: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    return commandRemoveLocalProject({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
  }

  async quitApp(): Promise<void> {
    return;
  }

  async openEntityInNewWindow(_ref?: unknown): Promise<void> {
    return;
  }

  private resolveEnvironmentId(environmentId?: string): string {
    if (environmentId && hasEnvironment(environmentId)) {
      return environmentId;
    }

    return this.currentBinding?.environmentId ?? defaultEnvironmentId;
  }

  private getLocalMemories(environmentId: string): MemoryEntryDto[] {
    const existing = this.localMemories.get(environmentId);
    if (existing) {
      return existing;
    }

    const seed: MemoryEntryDto[] = [
      {
        memoryId: "operator-memory-preference-preferred-language",
        kind: "operator-memory",
        category: "preference",
        attribute: "preferred-language",
        value: "Common Lisp",
        summary: "The operator prefers Common Lisp when discussing implementation details.",
        confidence: 0.92,
        sourceTurnId: "turn-memory-seed-1",
        recordedAt: "2026-05-07T14:22:00Z",
        updatedAt: "2026-05-07T14:22:00Z"
      },
      {
        memoryId: "operator-memory-working-style-progress-updates",
        kind: "operator-memory",
        category: "working-style",
        attribute: "progress-updates",
        value: "Report completion, percentage complete, and what comes next after each iteration.",
        summary: "The operator wants explicit progress reporting on iterative work.",
        confidence: 0.98,
        sourceTurnId: "turn-memory-seed-2",
        recordedAt: "2026-05-07T14:24:00Z",
        updatedAt: "2026-05-07T14:24:00Z"
      }
    ];
    this.localMemories.set(environmentId, seed);
    return seed;
  }

  private workspaceToPanelId(workspace: WorkspaceId): DesktopPanelId {
    switch (workspace) {
      case "browser":
        return "display";
      case "runtime":
      case "incidents":
      case "artifacts":
      case "work":
      case "activity":
      case "approvals":
        return "governance";
      case "configuration":
      case "documentation":
      case "conversations":
      case "dashboard":
      case "environment":
      default:
        return "workspace";
    }
  }

  private panelToWorkspaceId(panelId: DesktopPanelId): WorkspaceId {
    switch (panelId) {
      case "object-browser":
      case "display":
        return "browser";
      case "governance":
        return "runtime";
      case "inspector":
        return "runtime";
      case "workspace":
      default:
        return this.preferences.lastWorkspace ?? "environment";
    }
  }

  private buildDesktopModel(
    environmentId: string,
    workspaceSummary: WorkspaceSummaryDto,
    activePanel: DesktopPanelId,
    approvalCount: number
  ): DesktopModelDto {
    const attentionTop = workspaceSummary.attentionQueue.topItem;

    return {
      workspaceId: "desktop-session-local",
      environmentId,
      plan: "Mock desktop shell model",
      focusObjectId: null,
      activePanel,
      surfaceCount: workspaceSummary.attentionQueue.count,
      governanceCount: approvalCount,
      objectGroupCount: 1,
      displayCount: 1,
      topSurface: attentionTop
        ? {
            title: attentionTop.title,
            status: attentionTop.tone,
            executionId: attentionTop.objectId ?? null
          }
        : null,
      topGovernanceItem: attentionTop
        ? {
            title: attentionTop.title,
            status: attentionTop.tone,
            executionId: attentionTop.objectId ?? null
          }
        : null,
      topObjectGroup: {
        objectKind: "execution",
        count: 1
      },
      topDisplaySurface: {
        appId: "linux.vscode",
        title: "Mock Display Surface",
        status: "running",
        executionId: attentionTop?.objectId ?? null
      },
      entryPoints: [],
      panels: {
        workspace: {
          panelId: "workspace",
          count: workspaceSummary.attentionQueue.count,
          selectedIndex: 0,
          selectedExecutionId: attentionTop?.objectId ?? null,
          actions: {}
        },
        governance: {
          panelId: "governance",
          count: approvalCount,
          selectedIndex: 0,
          selectedTitle: attentionTop?.title ?? null,
          actions: {}
        },
        display: {
          panelId: "display",
          count: 1,
          selectedIndex: 0,
          selectedExecutionId: attentionTop?.objectId ?? null,
          selectedTitle: "Mock Display Surface",
          actions: {}
        },
        "object-browser": {
          panelId: "object-browser",
          count: 1,
          selectedKind: "execution",
          selectedIndex: 0,
          selectedTitle: "Execution Surfaces",
          actions: {}
        },
        inspector: {
          panelId: "inspector",
          focusObjectId: attentionTop?.objectId ?? null,
          actions: {}
        }
      }
    };
  }
}
