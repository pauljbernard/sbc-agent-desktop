import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  BindingDto,
  DesktopPanelId,
  DesktopModelDto,
  EnvironmentBootstrapDto,
  EnvironmentImageRegistryDto,
  McpServerConfigDto,
  PackageManagementSummaryDto,
  ProviderProfileSummaryDto,
  WorkspaceId
} from "../../shared/contracts";

export async function refreshProviderSummaryState(input: {
  environmentId?: string;
  queryProviderSummary: (environmentId?: string) => Promise<ProviderProfileSummaryDto>;
  setProviderSummary: Dispatch<SetStateAction<ProviderProfileSummaryDto | null>>;
  setSelectedProviderProfileName: Dispatch<SetStateAction<string>>;
  setProviderProfileError: Dispatch<SetStateAction<string | null>>;
}): Promise<ProviderProfileSummaryDto | null> {
  try {
    const next = await input.queryProviderSummary(input.environmentId);
    input.setProviderSummary(next);
    input.setSelectedProviderProfileName((current) => {
      if (next.profiles.some((profile) => profile.name === current)) {
        return current;
      }
      return next.activeProfileName ?? next.profiles[0]?.name ?? "default";
    });
    return next;
  } catch (error) {
    input.setProviderProfileError(
      error instanceof Error ? error.message : "Failed to load provider configuration."
    );
    return null;
  }
}

export async function refreshPackageManagementSummaryState(input: {
  environmentId?: string;
  queryPackageManagementSummary: (environmentId?: string) => Promise<PackageManagementSummaryDto>;
  setPackageManagementSummary: Dispatch<SetStateAction<PackageManagementSummaryDto | null>>;
  setPackageManagementError: Dispatch<SetStateAction<string | null>>;
}): Promise<PackageManagementSummaryDto | null> {
  try {
    const next = await input.queryPackageManagementSummary(input.environmentId);
    input.setPackageManagementSummary(next);
    return next;
  } catch (error) {
    input.setPackageManagementError(
      error instanceof Error ? error.message : "Failed to load package-management summary."
    );
    return null;
  }
}

export async function refreshMcpServerConfigsState(input: {
  environmentId?: string;
  queryMcpServerConfigs: (environmentId?: string) => Promise<McpServerConfigDto[]>;
  setMcpServerConfigs: Dispatch<SetStateAction<McpServerConfigDto[]>>;
  setSelectedMcpServerId: Dispatch<SetStateAction<string | null>>;
  setMcpServerError: Dispatch<SetStateAction<string | null>>;
}): Promise<McpServerConfigDto[]> {
  try {
    const next = await input.queryMcpServerConfigs(input.environmentId);
    input.setMcpServerConfigs(next);
    input.setSelectedMcpServerId((current) =>
      next.some((entry) => entry.id === current) ? current : next[0]?.id ?? null
    );
    return next;
  } catch (error) {
    input.setMcpServerError(
      error instanceof Error ? error.message : "Failed to load MCP server configurations."
    );
    input.setMcpServerConfigs([]);
    return [];
  }
}

export async function refreshEnvironmentImageRegistryState(input: {
  queryEnvironmentImageRegistry: () => Promise<EnvironmentImageRegistryDto>;
  setEnvironmentImageRegistry: Dispatch<SetStateAction<EnvironmentImageRegistryDto | null>>;
}): Promise<EnvironmentImageRegistryDto> {
  const next = await input.queryEnvironmentImageRegistry();
  input.setEnvironmentImageRegistry(next);
  return next;
}

export async function loadEnvironmentBindingState(input: {
  environmentId: string;
  desktopModel: DesktopModelDto | null;
  setBinding: Dispatch<SetStateAction<BindingDto | null>>;
  loadEnvironmentBootstrap: (
    environmentId: string,
    restorePanelState?: Record<string, unknown> | null
  ) => Promise<EnvironmentBootstrapDto>;
  setSummary: Dispatch<SetStateAction<EnvironmentBootstrapDto["summary"] | null>>;
  setStatus: Dispatch<SetStateAction<EnvironmentBootstrapDto["status"] | null>>;
  setWorkspaceSummary: Dispatch<SetStateAction<EnvironmentBootstrapDto["workspaceSummary"] | null>>;
  setDesktopModel: Dispatch<SetStateAction<DesktopModelDto | null>>;
  setActiveWorkspace: Dispatch<SetStateAction<WorkspaceId>>;
  desktopPanelToWorkspaceId: (panelId: DesktopPanelId, fallback: WorkspaceId) => WorkspaceId;
}): Promise<void> {
  const bindingResult = await window.sbclAgentDesktop.host.setEnvironmentBinding(input.environmentId);
  const nextBinding = bindingResult.metadata.binding ?? bindingResult.data;
  const restorePanelState = input.desktopModel?.panels?.[input.desktopModel.activePanel] ?? null;
  input.setBinding(nextBinding);
  const bootstrap = await input.loadEnvironmentBootstrap(input.environmentId, restorePanelState);
  input.setSummary(bootstrap.summary);
  input.setStatus(bootstrap.status);
  input.setWorkspaceSummary(bootstrap.workspaceSummary);
  input.setDesktopModel(bootstrap.desktopModel);
  input.setActiveWorkspace((current) =>
    input.desktopPanelToWorkspaceId(bootstrap.desktopModel.activePanel, current)
  );
  input.setBinding(nextBinding);
}

export async function openEnvironmentImageState(input: {
  imageIdOrName: string;
  startupImageSelectionHandledRef: MutableRefObject<boolean>;
  refreshEnvironmentImageRegistry: () => Promise<EnvironmentImageRegistryDto>;
  setIsEnvironmentImageChooserOpen: Dispatch<SetStateAction<boolean>>;
  loadInitialState: () => Promise<void>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}): Promise<void> {
  try {
    input.startupImageSelectionHandledRef.current = true;
    await window.sbclAgentDesktop.host.loadEnvironmentImage(input.imageIdOrName);
    await input.refreshEnvironmentImageRegistry();
    input.setIsEnvironmentImageChooserOpen(false);
    await input.loadInitialState();
  } catch (error) {
    input.setErrorMessage(error instanceof Error ? error.message : "Failed to open environment image.");
  }
}

export async function continueWithCurrentEnvironmentImageState(input: {
  currentImageIdOrName: string | null;
  startupImageSelectionHandledRef: MutableRefObject<boolean>;
  refreshEnvironmentImageRegistry: () => Promise<EnvironmentImageRegistryDto>;
  setIsEnvironmentImageChooserOpen: Dispatch<SetStateAction<boolean>>;
  loadInitialState: () => Promise<void>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}): Promise<void> {
  try {
    input.startupImageSelectionHandledRef.current = true;
    if (input.currentImageIdOrName) {
      await window.sbclAgentDesktop.host.loadEnvironmentImage(input.currentImageIdOrName);
      await input.refreshEnvironmentImageRegistry();
    }
    input.setIsEnvironmentImageChooserOpen(false);
    await input.loadInitialState();
  } catch (error) {
    input.setErrorMessage(
      error instanceof Error ? error.message : "Failed to continue with current image."
    );
  }
}
