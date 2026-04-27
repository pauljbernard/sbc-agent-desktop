import type {
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  CommandResultDto,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
  DesktopActionInput,
  DesktopActionResultDto,
  DesktopModelDto,
  DesktopPanelId,
  DesktopPreferencesDto,
  DesktopRestoreInput,
  DesktopRestoreResultDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  WorkspaceSummaryDto,
  HostStatusDto,
  ThreadSummaryDto,
  QueryResultDto,
  PackageBrowserDto,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  SourcePreviewDto,
  WorkspaceId
} from "../shared/contracts";
import {
  commandApproveRequest,
  commandCreateConversationThread,
  commandUpdateConversationThread,
  commandSendConversationMessage,
  commandDenyRequest,
  commandEvaluateInContext,
  commandReloadSourceFile,
  commandStageSourceChange,
  createMockHostStatus,
  defaultEnvironmentId,
  hasEnvironment,
  queryApprovalRequestDetail,
  queryApprovalRequestList,
  queryArtifactDetail,
  queryArtifactList,
  queryEnvironmentEvents,
  queryEnvironmentStatus,
  queryEnvironmentSummary,
  queryWorkspaceSummary,
  queryIncidentDetail,
  queryIncidentList,
  queryPackageBrowser,
  queryRuntimeEntityDetail,
  queryRuntimeInspectSymbol,
  queryRuntimeSummary,
  querySourcePreview,
  queryThreadDetail,
  queryThreadList,
  queryTurnDetail,
  queryWorkflowRecordDetail,
  queryWorkItemDetail,
  queryWorkItemList
} from "../shared/mock-environments";
import type { SbclAgentHostAdapter } from "./adapter-contract";

export class MockSbclAgentHostAdapter implements SbclAgentHostAdapter {
  private currentBinding: BindingDto | null = {
    environmentId: defaultEnvironmentId,
    sessionId: "desktop-session-local"
  };

  private preferences: DesktopPreferencesDto = {
    lastWorkspace: "environment",
    sidebarPinned: true,
    canvasPinned: true,
    inspectorPinned: true,
    inspectorWidth: null,
    themePreference: "system",
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

  async runtimeSummary(environmentId?: string) {
    return queryRuntimeSummary(this.resolveEnvironmentId(environmentId));
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
    return queryIncidentDetail(this.resolveEnvironmentId(environmentId), incidentId);
  }

  async workItemList(environmentId?: string) {
    return queryWorkItemList(this.resolveEnvironmentId(environmentId));
  }

  async workItemDetail(workItemId: string, environmentId?: string) {
    return queryWorkItemDetail(this.resolveEnvironmentId(environmentId), workItemId);
  }

  async workflowRecordDetail(workflowRecordId: string, environmentId?: string) {
    return queryWorkflowRecordDetail(this.resolveEnvironmentId(environmentId), workflowRecordId);
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

  private resolveEnvironmentId(environmentId?: string): string {
    if (environmentId && hasEnvironment(environmentId)) {
      return environmentId;
    }

    return this.currentBinding?.environmentId ?? defaultEnvironmentId;
  }

  private workspaceToPanelId(workspace: WorkspaceId): DesktopPanelId {
    switch (workspace) {
      case "browser":
        return "object-browser";
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
