import type {
  CommandResultDto,
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  ProviderProfileSummaryDto,
  QueryResultDto,
  RemoveMcpServerInput,
  UpdateProviderRoutingInput,
  UseProviderProfileInput
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface ConfigurationServiceDependencies {
  invokeService: InvokeService;
  camelizeKeys: (value: unknown) => unknown;
  asRecord: (value: unknown) => Record<string, unknown>;
  asRecordArray: (value: unknown) => Record<string, unknown>[];
  firstString: (...values: unknown[]) => string | undefined;
  normalizeCommandStatus: (status: unknown) => CommandResultDto<ProviderProfileSummaryDto>["status"];
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => CommandResultDto<ProviderProfileSummaryDto>["metadata"];
  adaptProviderSummaryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ProviderProfileSummaryDto>;
  adaptPackageManagementSummaryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<PackageManagementSummaryDto>;
  adaptPackageManagementCommandResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<PackageManagementCommandResultDto>;
  adaptDesktopTaskManifestListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<DesktopTaskManifestDto[]>;
  adaptDesktopTaskRecordListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<DesktopTaskRecordDto[]>;
  adaptMcpServerConfigListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<McpServerConfigDto[]>;
  adaptMcpServerConfigDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<McpServerConfigDto>;
}

export class LiveConfigurationService {
  constructor(private readonly dependencies: ConfigurationServiceDependencies) {}

  async providerProfiles(environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.get",
      environmentId
    );
    return this.dependencies.adaptProviderSummaryResponse(response);
  }

  async packageManagementSummary(environmentId?: string): Promise<QueryResultDto<PackageManagementSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.summary",
      environmentId
    );
    return this.dependencies.adaptPackageManagementSummaryResponse(response);
  }

  async desktopTaskManifests(environmentId?: string): Promise<QueryResultDto<DesktopTaskManifestDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "desktop-task.manifests",
      environmentId
    );
    return this.dependencies.adaptDesktopTaskManifestListResponse(response);
  }

  async desktopTaskRecords(environmentId?: string): Promise<QueryResultDto<DesktopTaskRecordDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "desktop-task.records",
      environmentId
    );
    return this.dependencies.adaptDesktopTaskRecordListResponse(response);
  }

  async orchestrationList(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "planning/orchestrations",
      environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "planning",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecordArray(response.data)) as Record<string, unknown>[],
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async orchestrationInbox(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "planning/orchestration-inbox",
      environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "planning",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecordArray(response.data)) as Record<string, unknown>[],
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async orchestrationFocus(input?: {
    environmentId?: string;
    planId?: string;
    workflowRecordId?: string;
    workItemId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "planning/orchestration-focus",
      input?.environmentId,
      {
        planId: input?.planId,
        workflowRecordId: input?.workflowRecordId,
        workItemId: input?.workItemId
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "planning",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async orchestrationSnapshot(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "planning/orchestration-snapshot",
      input?.environmentId,
      {
        planId: input?.planId
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "planning",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async planVerification(input?: {
    environmentId?: string;
    planId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "planning/verification",
      input?.environmentId,
      {
        planId: input?.planId
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "planning",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async desktopTaskPendingApproval(environmentId?: string): Promise<QueryResultDto<Record<string, unknown>>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.pending-approval",
      environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "desktop-task",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
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
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.actor-flow",
      input?.environmentId,
      {
        sessionId: input?.sessionId,
        approvalId: input?.approvalId,
        pendingActionId: input?.pendingActionId,
        actorMessageId: input?.actorMessageId,
        scopeId: input?.scopeId,
        latestOnlyP: input?.latestOnlyP
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "desktop-task",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async desktopTaskActorSystemPanel(input?: {
    environmentId?: string;
    sessionId?: string;
  }): Promise<QueryResultDto<Record<string, unknown>>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.actor-system-panel",
      input?.environmentId,
      { sessionId: input?.sessionId }
    );
    console.info(
      "[actor-system-panel-bridge] %s",
      JSON.stringify({
        status: response.status,
        rootActorId: (response.data as Record<string, unknown> | undefined)?.root_actor_id ?? null,
        actorCount:
          Array.isArray((response.data as Record<string, unknown> | undefined)?.actors)
            ? ((response.data as Record<string, unknown>).actors as unknown[]).length
            : null,
        keys: Object.keys(this.dependencies.asRecord(response.data))
      })
    );
    return {
      contractVersion: response.contractVersion,
      domain: "desktop-task",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(this.dependencies.asRecord(response.data)) as Record<string, unknown>,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async desktopTaskActorTrace(input?: {
    environmentId?: string;
    actorRole?: string;
    actorMessageId?: string;
    phase?: string;
    latestOnlyP?: boolean;
    deadLettersOnlyP?: boolean;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "desktop-task.actor-trace",
      input?.environmentId,
      {
        actorRole: input?.actorRole,
        actorMessageId: input?.actorMessageId,
        phase: input?.phase,
        latestOnlyP: input?.latestOnlyP,
        deadLettersOnlyP: input?.deadLettersOnlyP
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "desktop-task",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.asRecordArray(response.data).map((entry) =>
        this.dependencies.camelizeKeys(this.dependencies.asRecord(entry)) as Record<string, unknown>
      ),
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async desktopTaskDeadLetterQueue(input?: {
    environmentId?: string;
    actorRole?: string;
  }): Promise<QueryResultDto<Record<string, unknown>[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "desktop-task.dlq",
      input?.environmentId,
      { actorRole: input?.actorRole }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "desktop-task",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.asRecordArray(response.data).map((entry) =>
        this.dependencies.camelizeKeys(this.dependencies.asRecord(entry)) as Record<string, unknown>
      ),
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async mcpServerConfigs(environmentId?: string): Promise<QueryResultDto<McpServerConfigDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "desktop-task.mcp-servers",
      environmentId
    );
    return this.dependencies.adaptMcpServerConfigListResponse(response);
  }

  async mcpServerConfig(serverId: string, environmentId?: string): Promise<QueryResultDto<McpServerConfigDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.mcp-server",
      environmentId,
      { serverId }
    );
    return this.dependencies.adaptMcpServerConfigDetailResponse(response);
  }

  async configureProviderProfile(currentEnvironmentId: string | undefined, input: ConfigureProviderProfileInput): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.configure",
      currentEnvironmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = this.dependencies.adaptProviderSummaryResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async useProviderProfile(currentEnvironmentId: string | undefined, input: UseProviderProfileInput): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.use",
      currentEnvironmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = this.dependencies.adaptProviderSummaryResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async updateProviderRouting(currentEnvironmentId: string | undefined, input: UpdateProviderRoutingInput): Promise<CommandResultDto<ProviderProfileSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.provider.routing",
      currentEnvironmentId,
      input as unknown as Record<string, unknown>
    );
    const summary = this.dependencies.adaptProviderSummaryResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: summary.data,
      metadata: summary.metadata
    };
  }

  async configureMcpServer(input: ConfigureMcpServerInput): Promise<CommandResultDto<McpServerConfigDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.configure-mcp-server",
      input.environmentId,
      {
        serverId: input.serverId,
        name: input.name,
        transport: input.transport,
        command: input.command,
        arguments: input.arguments,
        environmentVariables: input.environmentVariables,
        workingDirectory: input.workingDirectory,
        endpoint: input.endpoint,
        capabilities: input.capabilities,
        retryPolicy: input.retryPolicy,
        healthStatus: input.healthStatus,
        enabledP: input.enabledP,
        discoverableP: input.discoverableP
      } as unknown as Record<string, unknown>
    );
    const detail = this.dependencies.adaptMcpServerConfigDetailResponse(response);
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: detail.data,
      metadata: detail.metadata
    };
  }

  async removeMcpServer(input: RemoveMcpServerInput): Promise<CommandResultDto<{ id: string; removedP: boolean }>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.remove-mcp-server",
      input.environmentId,
      { serverId: input.serverId }
    );
    const data = this.dependencies.camelizeKeys(response.data) as Record<string, unknown>;
    return {
      contractVersion: response.contractVersion,
      domain: response.domain,
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: {
        id: this.dependencies.firstString(data.id) ?? input.serverId,
        removedP: Boolean(data.removedP ?? data.removed)
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async installQuicklispPackage(input: { environmentId: string; systemName: string }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.install-quicklisp",
      input.environmentId,
      { systemName: input.systemName }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async runQlotCommand(input: { environmentId: string; args: string[] }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.run-qlot",
      input.environmentId,
      { args: input.args }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async addSourceRegistryEntry(input: { environmentId: string; path: string }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.add-source-registry-entry",
      input.environmentId,
      { path: input.path }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async updateSourceRegistryEntry(input: {
    environmentId: string;
    oldPath: string;
    newPath: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.update-source-registry-entry",
      input.environmentId,
      { oldPath: input.oldPath, newPath: input.newPath }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async removeSourceRegistryEntry(input: { environmentId: string; path: string }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.remove-source-registry-entry",
      input.environmentId,
      { path: input.path }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async addLocalProject(input: {
    environmentId: string;
    path: string;
    name?: string;
  }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.add-local-project",
      input.environmentId,
      { path: input.path, name: input.name }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }

  async removeLocalProject(input: { environmentId: string; name: string }): Promise<CommandResultDto<PackageManagementCommandResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "package-management.remove-local-project",
      input.environmentId,
      { name: input.name }
    );
    return this.dependencies.adaptPackageManagementCommandResponse(response);
  }
}
