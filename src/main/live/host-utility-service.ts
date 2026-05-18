import { basename, dirname } from "node:path";
import { readFile, stat } from "node:fs/promises";
import type {
  BindingDto,
  CommandResultDto,
  DesktopActionInput,
  DesktopActionResultDto,
  DesktopRestoreInput,
  DesktopRestoreResultDto,
  DiagnosticReportDetailDto,
  DiagnosticReportKind,
  DiagnosticReportSummaryDto,
  EnvironmentImageRecordDto,
  EnvironmentImageRegistryDto,
  QueryResultDto
} from "../../shared/contracts";
import type { LiveAdapterOptions, RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface PendingEnvironmentBootstrapWarmup {
  environmentId: string;
  startedAt: number;
  promise: Promise<unknown>;
}

interface HostUtilityServiceDependencies {
  options: LiveAdapterOptions;
  invokeService: InvokeService;
  camelizeKeys: (value: unknown) => unknown;
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => CommandResultDto<BindingDto>["metadata"];
  getCurrentBinding: () => BindingDto | null;
  setCurrentBinding: (binding: BindingDto) => void;
  clearPendingEnvironmentBootstrapWarmup: () => void;
  scheduleEnvironmentBootstrapWarmup: () => void;
  collectHostDiagnosticReports: (limit?: number) => Promise<DiagnosticReportSummaryDto[]>;
  diagnosticKindForPath: (path: string) => DiagnosticReportKind;
  processNameFromDiagnosticFile: (fileName: string) => string | null;
  diagnosticPreviewMetadata: (content: string) => {
    timestamp: string | null;
    processName: string | null;
    pid: number | null;
    incidentId: string | null;
    parentProc: string | null;
    responsibleProc: string | null;
    bugType: string | null;
    appName: string | null;
  };
  diagnosticKindFromMetadata: (
    path: string,
    preview: {
      timestamp: string | null;
      processName: string | null;
      pid: number | null;
      incidentId: string | null;
      parentProc: string | null;
      responsibleProc: string | null;
      bugType: string | null;
      appName: string | null;
    }
  ) => DiagnosticReportKind;
  diagnosticSummary: (
    kind: DiagnosticReportKind,
    processName: string | null,
    source: string,
    preview?: {
      timestamp: string | null;
      processName: string | null;
      pid: number | null;
      incidentId: string | null;
      parentProc: string | null;
      responsibleProc: string | null;
      bugType: string | null;
      appName: string | null;
    } | null
  ) => string;
  adaptDesktopActionResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<DesktopActionResultDto>;
  adaptDesktopRestoreResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<DesktopRestoreResultDto>;
}

const DEFAULT_LIVE_BINDING = {
  environmentId: "live-environment",
  sessionId: "desktop-session-live"
} as const;

export class LiveHostUtilityService {
  constructor(private readonly dependencies: HostUtilityServiceDependencies) {}

  private errorSummary(response: RawServiceResponse<Record<string, unknown>>): string {
    const data = response.data;
    if (data && typeof data.summary === "string" && data.summary.trim().length > 0) {
      return data.summary;
    }
    if (data && typeof data.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
    return `Live host operation failed: ${response.operation}`;
  }

  async setEnvironmentBinding(environmentId: string): Promise<CommandResultDto<BindingDto>> {
    const nextBinding: BindingDto = {
      environmentId,
      sessionId: "desktop-session-live"
    };

    this.dependencies.setCurrentBinding(nextBinding);
    this.dependencies.clearPendingEnvironmentBootstrapWarmup();
    this.dependencies.scheduleEnvironmentBootstrapWarmup();

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
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.image-registry",
      undefined
    );
    return {
      contractVersion: response.contractVersion,
      domain: "environment",
      operation: "environment.image-registry",
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: response.data as unknown as EnvironmentImageRegistryDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async loadEnvironmentImage(imageIdOrName: string): Promise<CommandResultDto<BindingDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.load-image",
      this.dependencies.getCurrentBinding()?.environmentId,
      { imageIdOrName }
    );
    const loadStatus = String(response.status);
    if (loadStatus === "error" || loadStatus === "rejected") {
      throw new Error(this.errorSummary(response));
    }
    const summary = response.data.summary as Record<string, unknown> | undefined;
    const currentBinding = this.dependencies.getCurrentBinding();
    const environmentId =
      (summary?.id as string | undefined) ??
      (response.metadata?.environmentId as string | undefined) ??
      currentBinding?.environmentId ??
      DEFAULT_LIVE_BINDING.environmentId;
    const binding: BindingDto = {
      environmentId,
      sessionId: currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
    };
    this.dependencies.setCurrentBinding(binding);
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.load_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: binding,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async saveEnvironmentImage(input: {
    name: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<EnvironmentImageRecordDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.save-image",
      this.dependencies.getCurrentBinding()?.environmentId,
      { imageName: input.name, overwrite: Boolean(input.overwrite) }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.save_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: response.data.image as EnvironmentImageRecordDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async revertEnvironmentToImage(): Promise<CommandResultDto<BindingDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "environment.revert-image",
      this.dependencies.getCurrentBinding()?.environmentId
    );
    const revertStatus = String(response.status);
    if (revertStatus === "error" || revertStatus === "rejected") {
      throw new Error(this.errorSummary(response));
    }
    const summary = response.data.summary as Record<string, unknown> | undefined;
    const currentBinding = this.dependencies.getCurrentBinding();
    const binding: BindingDto = {
      environmentId:
        (summary?.id as string | undefined) ??
        currentBinding?.environmentId ??
        DEFAULT_LIVE_BINDING.environmentId,
      sessionId: currentBinding?.sessionId ?? DEFAULT_LIVE_BINDING.sessionId
    };
    this.dependencies.setCurrentBinding(binding);
    return {
      contractVersion: response.contractVersion,
      domain: "host",
      operation: "host.revert_environment_image",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: binding,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async diagnosticReportList(
    environmentId?: string
  ): Promise<QueryResultDto<DiagnosticReportSummaryDto[]>> {
    const reports = await this.dependencies.collectHostDiagnosticReports();
    const binding = this.dependencies.getCurrentBinding();
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
          environmentId: environmentId ?? binding?.environmentId ?? "live-environment",
          sessionId: binding?.sessionId ?? null
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
        kind: this.dependencies.diagnosticKindForPath(reportId),
        title: basename(reportId),
        summary: this.dependencies.diagnosticSummary(
          this.dependencies.diagnosticKindForPath(reportId),
          this.dependencies.processNameFromDiagnosticFile(basename(reportId)),
          basename(dirname(reportId))
        ),
        source: basename(dirname(reportId)),
        processName: this.dependencies.processNameFromDiagnosticFile(basename(reportId)),
        pid: null,
        createdAt: new Date().toISOString(),
        path: reportId
      };
    const preview = contentPreview ? this.dependencies.diagnosticPreviewMetadata(contentPreview) : null;
    const resolvedKind = this.dependencies.diagnosticKindFromMetadata(
      reportId,
      preview ?? this.dependencies.diagnosticPreviewMetadata("")
    );
    const binding = this.dependencies.getCurrentBinding();
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
        summary: this.dependencies.diagnosticSummary(
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
          environmentId: environmentId ?? binding?.environmentId ?? "live-environment",
          sessionId: binding?.sessionId ?? null
        },
        readModel: "host-diagnostic-report-detail-v1"
      }
    };
  }

  async desktopAction(
    input: DesktopActionInput
  ): Promise<CommandResultDto<DesktopActionResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.action",
      input.environmentId,
      this.dependencies.camelizeKeys({
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
    return this.dependencies.adaptDesktopActionResponse(response);
  }

  async desktopRestore(
    input: DesktopRestoreInput
  ): Promise<CommandResultDto<DesktopRestoreResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop.restore",
      input.environmentId,
      this.dependencies.camelizeKeys({
        panelId: input.panelId,
        panelState: input.panelState
      }) as Record<string, unknown>
    );
    return this.dependencies.adaptDesktopRestoreResponse(response);
  }
}
