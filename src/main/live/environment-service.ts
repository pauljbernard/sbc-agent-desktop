import type {
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  ConsoleLogEntryDto,
  ConsoleLogQueryInput,
  ConsoleLogStreamDto,
  DesktopModelDto,
  EnvironmentBootstrapDto,
  EnvironmentEventDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  EventSubscriptionInput,
  QueryResultDto,
  TranscriptWorkspaceDto,
  WorkspaceSummaryDto
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type PendingEnvironmentBootstrapWarmup =
  | {
      environmentId: string;
      startedAt: number;
      promise: Promise<QueryResultDto<EnvironmentBootstrapDto>>;
    }
  | null;

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface EnvironmentServiceDependencies {
  invokeService: InvokeService;
  getCurrentBinding: () => BindingDto | null;
  getPendingEnvironmentBootstrapWarmup: () => PendingEnvironmentBootstrapWarmup;
  adaptEnvironmentSummaryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<EnvironmentSummaryDto>;
  adaptEnvironmentStatusResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<EnvironmentStatusDto>;
  adaptWorkspaceSummaryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<WorkspaceSummaryDto>;
  adaptDesktopModelResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<DesktopModelDto>;
  adaptEnvironmentBootstrapResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<EnvironmentBootstrapDto>;
  adaptEventStreamResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<EnvironmentEventDto[]>;
  adaptTranscriptWorkspaceResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<TranscriptWorkspaceDto>;
  adaptConsoleLogStreamResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ConsoleLogStreamDto>;
  adaptArtifactListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<ArtifactSummaryDto[]>;
  adaptArtifactDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ArtifactDetailDto>;
  collectHostConsoleEntries: (limit?: number) => Promise<ConsoleLogEntryDto[]>;
}

export class LiveEnvironmentService {
  constructor(private readonly dependencies: EnvironmentServiceDependencies) {}

  async environmentSummary(environmentId?: string): Promise<QueryResultDto<EnvironmentSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.summary",
      environmentId
    );
    return this.dependencies.adaptEnvironmentSummaryResponse(response);
  }

  async environmentStatus(environmentId?: string): Promise<QueryResultDto<EnvironmentStatusDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.status",
      environmentId
    );
    return this.dependencies.adaptEnvironmentStatusResponse(response);
  }

  async workspaceSummary(environmentId?: string): Promise<QueryResultDto<WorkspaceSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "workspace.summary",
      environmentId
    );
    return this.dependencies.adaptWorkspaceSummaryResponse(response);
  }

  async desktopModel(environmentId?: string): Promise<QueryResultDto<DesktopModelDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.show",
      environmentId
    );
    return this.dependencies.adaptDesktopModelResponse(response);
  }

  async environmentBootstrap(environmentId?: string): Promise<QueryResultDto<EnvironmentBootstrapDto>> {
    const requestedEnvironmentId = environmentId ?? this.dependencies.getCurrentBinding()?.environmentId;
    const pendingEnvironmentBootstrapWarmup = this.dependencies.getPendingEnvironmentBootstrapWarmup();
    if (
      requestedEnvironmentId &&
      pendingEnvironmentBootstrapWarmup &&
      pendingEnvironmentBootstrapWarmup.environmentId === requestedEnvironmentId &&
      performance.now() - pendingEnvironmentBootstrapWarmup.startedAt <= 5000
    ) {
      return pendingEnvironmentBootstrapWarmup.promise;
    }
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.bootstrap",
      environmentId
    );
    return this.dependencies.adaptEnvironmentBootstrapResponse(response);
  }

  async environmentEvents(
    input: EventSubscriptionInput
  ): Promise<QueryResultDto<EnvironmentEventDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "events.stream",
      input.environmentId,
      {
        afterCursor: input.fromCursor,
        family: input.families?.[0],
        visibility: input.visibility?.[0],
        limit: input.limit ?? 50
      }
    );
    return this.dependencies.adaptEventStreamResponse(response);
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
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "transcript.workspace",
      input.environmentId,
      {
        family: input.families?.[0],
        visibility: input.visibility?.[0],
        eventLimit: input.eventLimit,
        includeEvents: input.includeEvents !== false,
        includeEnvironmentConsole: input.includeEnvironmentConsole !== false,
        consoleLimit: input.consoleLimit
      }
    );
    return this.dependencies.adaptTranscriptWorkspaceResponse(response);
  }

  async consoleLogStream(input: ConsoleLogQueryInput): Promise<QueryResultDto<ConsoleLogStreamDto>> {
    if ((input.plane ?? "environment") === "host") {
      const entries = await this.dependencies.collectHostConsoleEntries(input.limit ?? 80);
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
          binding: this.dependencies.getCurrentBinding(),
          readModel: "host-console-stream-v1"
        }
      };
    }
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "console.stream",
      input.environmentId,
      {
        afterCursor: input.fromCursor,
        limit: input.limit ?? 50,
        type: input.types?.[0],
        source: input.sources?.[0]
      }
    );
    return this.dependencies.adaptConsoleLogStreamResponse(response);
  }

  async artifactList(environmentId?: string): Promise<QueryResultDto<ArtifactSummaryDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "artifact.list",
      environmentId
    );
    return this.dependencies.adaptArtifactListResponse(response);
  }

  async artifactDetail(
    artifactId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ArtifactDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "artifact.detail",
      environmentId,
      { artifactId }
    );
    return this.dependencies.adaptArtifactDetailResponse(response);
  }
}
