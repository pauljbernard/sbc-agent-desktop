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
  CommandResultDto,
  ConfigureProviderProfileInput,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
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
  ProjectDetailDto,
  ProjectListDto,
  ProjectQualityGateDto,
  ProjectTestingHarnessDto,
  ProviderProfileSummaryDto,
  CompleteWorkItemValidationsInput,
  ThreadSummaryDto,
  QueryResultDto,
  PackageBrowserDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  QuarantineWorkItemInput,
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

  async environmentEvents(
    input: EventSubscriptionInput
  ): Promise<QueryResultDto<EnvironmentEventDto[]>> {
    return queryEnvironmentEvents({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
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

  async threadList(environmentId?: string) {
    return queryThreadList(this.resolveEnvironmentId(environmentId));
  }

  async threadDetail(threadId: string, environmentId?: string) {
    return queryThreadDetail(this.resolveEnvironmentId(environmentId), threadId);
  }

  async turnDetail(turnId: string, environmentId?: string) {
    return queryTurnDetail(this.resolveEnvironmentId(environmentId), turnId);
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

  async sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    if (onEvent) {
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
    return commandSendConversationMessage({
      ...input,
      environmentId: this.resolveEnvironmentId(input.environmentId)
    });
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
  }) {
    return commandEvaluateInContext(input);
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
