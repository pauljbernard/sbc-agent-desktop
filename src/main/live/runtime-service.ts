import type {
  CalculatorSummaryDto,
  CommandResultDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeSymbolBrowserPageDto,
  RuntimeSymbolBrowserPageInput,
  RuntimeTelemetrySnapshotDto,
  ServiceMetadataDto
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface RuntimeServiceDependencies {
  invokeService: InvokeService;
  camelizeKeys: (value: unknown) => unknown;
  normalizeCommandStatus: (status: unknown) => CommandResultDto<CalculatorSummaryDto>["status"];
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => ServiceMetadataDto;
  adaptRuntimeSummaryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<RuntimeSummaryDto>;
  adaptRuntimeTelemetryResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>>;
  adaptRuntimeInspectionResponse: (
    response: RawServiceResponse<Record<string, unknown>>,
    input: {
      symbol: string;
      packageName?: string;
      mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
    }
  ) => QueryResultDto<RuntimeInspectionResultDto>;
  adaptRuntimeEntityDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>,
    input: {
      symbol: string;
      packageName?: string;
    }
  ) => QueryResultDto<RuntimeEntityDetailDto>;
  adaptPackageBrowserResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<PackageBrowserDto>;
  adaptRuntimeSymbolPageResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<RuntimeSymbolBrowserPageDto>;
}

function adaptCalculatorCommandResponse(
  response: RawServiceResponse<Record<string, unknown>>,
  dependencies: RuntimeServiceDependencies
): CommandResultDto<CalculatorSummaryDto> {
  return {
    contractVersion: response.contractVersion,
    domain: "calculator",
    operation: response.operation,
    kind: "command",
    status: dependencies.normalizeCommandStatus(response.status),
    data: dependencies.camelizeKeys(response.data) as CalculatorSummaryDto,
    metadata: dependencies.normalizeMetadata(response.metadata)
  };
}

export class LiveRuntimeService {
  constructor(private readonly dependencies: RuntimeServiceDependencies) {}

  async runtimeSummary(environmentId?: string): Promise<QueryResultDto<RuntimeSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.summary",
      environmentId
    );
    return this.dependencies.adaptRuntimeSummaryResponse(response);
  }

  async calculatorSummary(environmentId?: string): Promise<QueryResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.summary",
      environmentId
    );
    return {
      contractVersion: response.contractVersion,
      domain: "calculator",
      operation: response.operation,
      kind: "query",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.camelizeKeys(response.data) as CalculatorSummaryDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async setCalculatorExpression(input: { environmentId: string; expression: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.set-expression",
      input.environmentId,
      { expression: input.expression }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async appendCalculatorToken(input: { environmentId: string; token: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.append-token",
      input.environmentId,
      { token: input.token }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async backspaceCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.backspace",
      environmentId
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async clearCalculator(environmentId: string): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.clear",
      environmentId
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async setCalculatorMode(input: { environmentId: string; mode: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.set-mode",
      input.environmentId,
      { mode: input.mode }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async setCalculatorBase(input: { environmentId: string; base: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.set-base",
      input.environmentId,
      { base: input.base }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async setCalculatorWordSize(input: { environmentId: string; wordSize: number }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.set-word-size",
      input.environmentId,
      { wordSize: input.wordSize }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async setCalculatorAngleUnit(input: { environmentId: string; angleUnit: string }): Promise<CommandResultDto<CalculatorSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.set-angle-unit",
      input.environmentId,
      { angleUnit: input.angleUnit }
    );
    return adaptCalculatorCommandResponse(response, this.dependencies);
  }

  async runtimeTelemetrySnapshot(environmentId?: string): Promise<QueryResultDto<RuntimeTelemetrySnapshotDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.telemetry",
      environmentId
    );
    return this.dependencies.adaptRuntimeTelemetryResponse(response);
  }

  async runtimeInspectSymbol(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
    mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
  }): Promise<QueryResultDto<RuntimeInspectionResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.inspect-symbol",
      input.environmentId,
      {
        symbol: input.symbol,
        packageName: input.packageName,
        mode: input.mode
      }
    );
    return this.dependencies.adaptRuntimeInspectionResponse(response, input);
  }

  async runtimeEntityDetail(input: {
    environmentId: string;
    symbol: string;
    packageName?: string;
  }): Promise<QueryResultDto<RuntimeEntityDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.entity-detail",
      input.environmentId,
      {
        symbol: input.symbol,
        packageName: input.packageName
      }
    );
    return this.dependencies.adaptRuntimeEntityDetailResponse(response, input);
  }

  async packageBrowser(input: {
    environmentId: string;
    packageName?: string;
  }): Promise<QueryResultDto<PackageBrowserDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.package-browser",
      input.environmentId,
      { packageName: input.packageName }
    );
    return this.dependencies.adaptPackageBrowserResponse(response);
  }

  async runtimeSymbolPage(input: RuntimeSymbolBrowserPageInput): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto>> {
    const request: Record<string, unknown> = {
      kinds: input.kinds,
      visibility: input.visibility,
      search: input.search,
      offset: input.offset,
      limit: input.limit
    };
    if (input.packageScope != null && input.packageScope.trim().length > 0) {
      request.packageScope = input.packageScope;
    }
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.symbol-page",
      input.environmentId,
      request
    );
    const adapted = this.dependencies.adaptRuntimeSymbolPageResponse(response);
    console.info(
      "[runtime-symbol-page] env=%s scope=%s kinds=%s visibility=%s search=%s offset=%d limit=%d total=%d items=%d",
      input.environmentId,
      input.packageScope ?? "all",
      (input.kinds ?? []).join(","),
      input.visibility ?? "all",
      input.search ?? "",
      input.offset ?? 0,
      input.limit ?? 0,
      adapted.data.totalCount,
      adapted.data.items.length
    );
    return adapted;
  }
}
