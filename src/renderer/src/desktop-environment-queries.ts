import type {
  DesktopModelDto,
  EnvironmentBootstrapDto,
  EnvironmentImageRegistryDto,
  McpServerConfigDto,
  PackageManagementSummaryDto,
  ProviderProfileSummaryDto
} from "../../shared/contracts";

export async function loadDesktopShellModelQuery(
  environmentId: string,
  restorePanelState?: Record<string, unknown> | null
): Promise<DesktopModelDto> {
  if (restorePanelState) {
    const restoreResult = await window.sbclAgentDesktop.command.desktopRestore({
      environmentId,
      panelState: restorePanelState
    });
    return restoreResult.data.desktopModel;
  }

  const desktopModelResult = await window.sbclAgentDesktop.query.desktopModel(environmentId);
  return desktopModelResult.data;
}

export async function loadEnvironmentBootstrapQuery(input: {
  environmentId: string;
  restorePanelState?: Record<string, unknown> | null;
  logSurfacePerf: (name: string, startedAt: number, metadata?: Record<string, unknown>) => void;
}): Promise<EnvironmentBootstrapDto> {
  const startedAt = performance.now();
  if (
    !input.restorePanelState &&
    typeof window.sbclAgentDesktop.query.environmentBootstrap === "function"
  ) {
    const bootstrapResult = await window.sbclAgentDesktop.query.environmentBootstrap(input.environmentId);
    input.logSurfacePerf("environment.bootstrap", startedAt, { environmentId: input.environmentId });
    return bootstrapResult.data;
  }

  const [summaryResult, statusResult, workspaceSummaryResult, desktopModel] = await Promise.all([
    window.sbclAgentDesktop.query.environmentSummary(input.environmentId),
    window.sbclAgentDesktop.query.environmentStatus(input.environmentId),
    window.sbclAgentDesktop.query.workspaceSummary(input.environmentId),
    loadDesktopShellModelQuery(input.environmentId, input.restorePanelState)
  ]);
  input.logSurfacePerf("environment.bootstrap", startedAt, {
    environmentId: input.environmentId,
    fallback: true,
    restorePanelState: Boolean(input.restorePanelState)
  });
  return {
    summary: summaryResult.data,
    status: statusResult.data,
    workspaceSummary: workspaceSummaryResult.data,
    desktopModel
  };
}

export async function queryProviderSummary(
  environmentId?: string
): Promise<ProviderProfileSummaryDto> {
  const providerResult = await window.sbclAgentDesktop.query.providerProfiles(environmentId);
  return providerResult.data;
}

export async function queryPackageManagementSummary(
  environmentId?: string
): Promise<PackageManagementSummaryDto> {
  const result = await window.sbclAgentDesktop.query.packageManagementSummary(environmentId);
  return result.data;
}

export async function queryMcpServerConfigs(
  environmentId?: string
): Promise<McpServerConfigDto[]> {
  const result = await window.sbclAgentDesktop.query.mcpServerConfigs(environmentId);
  return result.data;
}

export async function queryEnvironmentImageRegistry(): Promise<EnvironmentImageRegistryDto> {
  const registryResult = await window.sbclAgentDesktop.host.getEnvironmentImageRegistry();
  return registryResult.data;
}
