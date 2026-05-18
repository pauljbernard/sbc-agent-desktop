import type {
  BindingDto,
  CommandResultDto,
  DesktopPanelId,
  DesktopPreferencesDto,
  EditorBufferStateDto,
  EnvironmentBootstrapDto,
  EnvironmentImageRegistryDto,
  HostStatusDto,
  ProjectProfileDto,
  ReplSessionHistoryEntryDto,
  ReplSessionProfileDto,
  RuntimeEvalResultDto,
  WorkspaceId
} from "../../shared/contracts";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { BrowserDomain } from "./browser-support";
import type { ConfigurationSection, ThemePreference } from "./shell-workspace-state";
import type { ShellLayoutState } from "./shell-layout";

export async function loadDesktopInitialState(deps: {
  desktopPreferencesHydratedRef: MutableRefObject<boolean>;
  shellPendingHydrationActionsRef: MutableRefObject<unknown[]>;
  loadEnvironmentBootstrap: (environmentId: string) => Promise<EnvironmentBootstrapDto>;
  refreshProviderSummary: (environmentId?: string) => Promise<unknown>;
  ensureDesktopProjects: (
    projects: DesktopPreferencesDto["projects"],
    binding: BindingDto | null,
    summary: EnvironmentBootstrapDto["summary"] | null
  ) => ProjectProfileDto[];
  resolveSelectedBrowserDomain: (value: string | null | undefined) => BrowserDomain;
  resolveSelectedConfigurationSection: (value: string | null | undefined) => ConfigurationSection;
  hydrateShellLayout: (preferences: DesktopPreferencesDto) => ShellLayoutState;
  applyHydratedShellLayout: (nextShellLayout: ShellLayoutState) => void;
  persistResolvedShellLayout: (nextShellLayout: ShellLayoutState) => Promise<void>;
  setHostStatus: (value: HostStatusDto | null) => void;
  setBinding: (value: BindingDto | null) => void;
  setActiveWorkspace: Dispatch<SetStateAction<WorkspaceId>>;
  setSelectedBrowserDomain: (value: BrowserDomain) => void;
  setSelectedConfigurationSection: (value: ConfigurationSection) => void;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  setTooltipScalePercent: (value: number) => void;
  setControlIconScalePercent: (value: number) => void;
  setDockIconScalePercent: (value: number) => void;
  setConversationTextScalePercent: (value: number) => void;
  setSourceCodeTextScalePercent: (value: number) => void;
  setLispParenColors: (value: string[]) => void;
  normalizeDesktopSurfaceScalePercent: (value: number | null | undefined) => number;
  normalizeParenDepthColors: (value: string[] | null | undefined) => string[];
  setProjects: Dispatch<SetStateAction<ProjectProfileDto[]>>;
  setCurrentProjectId: Dispatch<SetStateAction<string | null>>;
  setSelectedConversationThreadByProject: (value: Record<string, string>) => void;
  setConversationDraft: (value: string) => void;
  defaultConversationDraft: string;
  setReplSessionsByProject: Dispatch<SetStateAction<Record<string, ReplSessionProfileDto[]>>>;
  setCurrentReplSessionIdByProject: (value: Record<string, string>) => void;
  setEditorBuffersByProject: Dispatch<SetStateAction<Record<string, EditorBufferStateDto[]>>>;
  setSelectedEditorBufferIdByProject: (value: Record<string, string>) => void;
  setWorkspacePackageByProject: (value: Record<string, string>) => void;
  setWorkspaceDraftByProject: (value: Record<string, string>) => void;
  setWorkspaceResultByProject: Dispatch<
    SetStateAction<Record<string, CommandResultDto<RuntimeEvalResultDto> | null>>
  >;
  setWorkspaceHistoryByProject: Dispatch<SetStateAction<Record<string, ReplSessionHistoryEntryDto[]>>>;
  setSummary: (value: EnvironmentBootstrapDto["summary"] | null) => void;
  setStatus: (value: EnvironmentBootstrapDto["status"] | null) => void;
  setWorkspaceSummary: (value: EnvironmentBootstrapDto["workspaceSummary"] | null) => void;
  setDesktopModel: (value: EnvironmentBootstrapDto["desktopModel"] | null) => void;
  desktopPanelToWorkspaceId: (panelId: DesktopPanelId, current: WorkspaceId) => WorkspaceId;
  setErrorMessage: (value: string | null) => void;
}): Promise<void> {
  try {
    deps.desktopPreferencesHydratedRef.current = false;
    const [nextHostStatus, nextBinding, desktopPreferences] = await Promise.all([
      window.sbclAgentDesktop.host.getHostStatus(),
      window.sbclAgentDesktop.host.getCurrentBinding(),
      window.sbclAgentDesktop.desktop.getDesktopPreferences()
    ]);

    deps.setHostStatus(nextHostStatus);
    deps.setBinding(nextBinding);
    deps.setActiveWorkspace(desktopPreferences.lastWorkspace);
    deps.setSelectedBrowserDomain(
      deps.resolveSelectedBrowserDomain(desktopPreferences.selectedBrowserDomain)
    );
    deps.setSelectedConfigurationSection(
      deps.resolveSelectedConfigurationSection(desktopPreferences.selectedConfigurationSection)
    );

    const nextShellLayout = deps.hydrateShellLayout(desktopPreferences);
    deps.applyHydratedShellLayout(nextShellLayout);

    deps.setThemePreference(desktopPreferences.themePreference);
    deps.setTooltipScalePercent(
      deps.normalizeDesktopSurfaceScalePercent(
        desktopPreferences.desktopSurfaceView?.tooltipScalePercent
      )
    );
    deps.setControlIconScalePercent(
      deps.normalizeDesktopSurfaceScalePercent(
        desktopPreferences.desktopSurfaceView?.controlIconScalePercent
      )
    );
    deps.setDockIconScalePercent(
      deps.normalizeDesktopSurfaceScalePercent(
        desktopPreferences.desktopSurfaceView?.dockIconScalePercent
      )
    );
    deps.setConversationTextScalePercent(
      deps.normalizeDesktopSurfaceScalePercent(
        desktopPreferences.desktopSurfaceView?.conversationTextScalePercent
      )
    );
    deps.setSourceCodeTextScalePercent(
      deps.normalizeDesktopSurfaceScalePercent(
        desktopPreferences.desktopSurfaceView?.sourceCodeTextScalePercent
      )
    );
    deps.setLispParenColors(
      deps.normalizeParenDepthColors(desktopPreferences.lispCodeView?.parenDepthColors)
    );
    deps.setProjects(deps.ensureDesktopProjects(desktopPreferences.projects, nextBinding, null));
    deps.setCurrentProjectId(
      desktopPreferences.currentProjectId ?? desktopPreferences.projects?.[0]?.projectId ?? null
    );
    deps.setSelectedConversationThreadByProject(
      desktopPreferences.selectedConversationThreadByProject ?? {}
    );
    deps.setConversationDraft(
      desktopPreferences.conversationDraft ?? deps.defaultConversationDraft
    );
    deps.setReplSessionsByProject(desktopPreferences.replSessionsByProject ?? {});
    deps.setCurrentReplSessionIdByProject(
      desktopPreferences.currentReplSessionIdByProject ?? {}
    );
    deps.setEditorBuffersByProject(desktopPreferences.editorBuffersByProject ?? {});
    deps.setSelectedEditorBufferIdByProject(
      desktopPreferences.selectedEditorBufferIdByProject ?? {}
    );
    deps.setWorkspacePackageByProject(desktopPreferences.workspacePackageByProject ?? {});
    deps.setWorkspaceDraftByProject(desktopPreferences.workspaceDraftByProject ?? {});
    deps.setWorkspaceResultByProject(desktopPreferences.workspaceResultByProject ?? {});
    deps.setWorkspaceHistoryByProject(desktopPreferences.workspaceHistoryByProject ?? {});

    if (nextBinding?.environmentId) {
      const bootstrap = await deps.loadEnvironmentBootstrap(nextBinding.environmentId);
      deps.setSummary(bootstrap.summary);
      deps.setStatus(bootstrap.status);
      deps.setWorkspaceSummary(bootstrap.workspaceSummary);
      deps.setDesktopModel(bootstrap.desktopModel);
      deps.setActiveWorkspace((current) =>
        deps.desktopPanelToWorkspaceId(bootstrap.desktopModel.activePanel, current)
      );
      const nextProjects = deps.ensureDesktopProjects(
        desktopPreferences.projects,
        nextBinding,
        bootstrap.summary
      );
      deps.setProjects(nextProjects);
      deps.setCurrentProjectId(
        (current) => current ?? desktopPreferences.currentProjectId ?? nextProjects[0]?.projectId ?? null
      );
      await deps.refreshProviderSummary(nextBinding.environmentId);
    } else {
      await deps.refreshProviderSummary();
    }

    deps.desktopPreferencesHydratedRef.current = true;
    deps.shellPendingHydrationActionsRef.current = [];
    void deps.persistResolvedShellLayout(nextShellLayout);
  } catch (error) {
    deps.setErrorMessage(error instanceof Error ? error.message : "Failed to load desktop state.");
  }
}

export async function initializeEnvironmentLifecycle(deps: {
  startupImageSelectionHandledRef: MutableRefObject<boolean>;
  setEnvironmentImageRegistry: (value: EnvironmentImageRegistryDto | null) => void;
  setEnvironmentSaveAsNameDraft: (value: string) => void;
  setIsEnvironmentImageChooserOpen: (value: boolean) => void;
  refreshEnvironmentImageRegistry: () => Promise<EnvironmentImageRegistryDto>;
  loadInitialState: () => Promise<void>;
  setErrorMessage: (value: string | null) => void;
}): Promise<void> {
  try {
    const registry = await deps.refreshEnvironmentImageRegistry();
    if (registry.images.length > 0 && !deps.startupImageSelectionHandledRef.current) {
      deps.setEnvironmentSaveAsNameDraft(registry.currentImageName ?? "");
      const currentImageIdOrName = registry.currentImageId ?? registry.currentImageName ?? null;
      if (currentImageIdOrName) {
        deps.startupImageSelectionHandledRef.current = true;
        await window.sbclAgentDesktop.host.loadEnvironmentImage(currentImageIdOrName);
        const binding = await window.sbclAgentDesktop.host.getCurrentBinding();
        if (!binding?.environmentId) {
          throw new Error("Environment image loaded without establishing an active binding.");
        }
        await deps.refreshEnvironmentImageRegistry();
      } else {
        deps.setIsEnvironmentImageChooserOpen(true);
        return;
      }
    }
    await deps.loadInitialState();
  } catch (error) {
    deps.setErrorMessage(
      error instanceof Error ? error.message : "Failed to initialize environment images."
    );
  }
}
