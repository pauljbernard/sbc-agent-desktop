import type {
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
  QueryResultDto,
  PackageBrowserDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  SourcePreviewDto,
  WorkspaceId
} from "../shared/contracts";
import {
  commandApproveRequest,
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
    inspectorPinned: true,
    themePreference: "system",
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
}
