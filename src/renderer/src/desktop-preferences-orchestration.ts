import { useCallback, useRef, type Dispatch, type MutableRefObject } from "react";
import type {
  DesktopPreferencesDto,
  EditorBufferStateDto,
  ReplSessionHistoryEntryDto,
  RuntimeEvalResultDto,
  WorkspaceId,
  CommandResultDto
} from "../../shared/contracts";
import {
  shellLayoutReducer,
  shellLayoutToDesktopPreferencesPatch,
  type ShellLayoutAction,
  type ShellLayoutState
} from "./shell-layout";
import type { BrowserDomain } from "./browser-support";
import type { ConfigurationSection } from "./shell-workspace-state";

export interface DesktopPreferencesOrchestration {
  desktopPreferencesHydratedRef: MutableRefObject<boolean>;
  desktopPreferencesPersistTimeoutRef: MutableRefObject<number | null>;
  shellPendingHydrationActionsRef: MutableRefObject<ShellLayoutAction[]>;
  suppressExitDesktopPreferencesFlushRef: MutableRefObject<boolean>;
  activeWorkspaceRef: MutableRefObject<WorkspaceId>;
  richDesktopPreferencesRef: MutableRefObject<Partial<DesktopPreferencesDto>>;
  persistRichDesktopPreferences: () => Promise<void>;
  flushRichDesktopPreferences: () => Promise<void>;
  persistResolvedShellLayout: (nextShellLayout: ShellLayoutState) => Promise<void>;
  persistShellDesktopPreferences: () => Promise<void>;
  applyShellLayoutAction: (action: ShellLayoutAction) => ShellLayoutState;
}

export function useDesktopPreferencesOrchestration(deps: {
  activeWorkspace: WorkspaceId;
  selectedBrowserDomain: BrowserDomain;
  selectedConfigurationSection: ConfigurationSection;
  conversationDraft: string;
  editorBuffersByProject: Record<string, EditorBufferStateDto[]>;
  selectedEditorBufferIdByProject: Record<string, string>;
  workspacePackageByProject: Record<string, string>;
  workspaceDraftByProject: Record<string, string>;
  workspaceResultByProject: Record<string, CommandResultDto<RuntimeEvalResultDto> | null>;
  workspaceHistoryByProject: Record<string, ReplSessionHistoryEntryDto[]>;
  shellLayoutRef: MutableRefObject<ShellLayoutState>;
  dispatchShellLayout: Dispatch<ShellLayoutAction>;
}): DesktopPreferencesOrchestration {
  const desktopPreferencesHydratedRef = useRef(false);
  const desktopPreferencesPersistTimeoutRef = useRef<number | null>(null);
  const shellPendingHydrationActionsRef = useRef<ShellLayoutAction[]>([]);
  const suppressExitDesktopPreferencesFlushRef = useRef(false);
  const activeWorkspaceRef = useRef<WorkspaceId>(deps.activeWorkspace);
  activeWorkspaceRef.current = deps.activeWorkspace;
  const richDesktopPreferencesRef = useRef<Partial<DesktopPreferencesDto>>({});
  richDesktopPreferencesRef.current = {
    selectedBrowserDomain: deps.selectedBrowserDomain,
    selectedConfigurationSection: deps.selectedConfigurationSection,
    conversationDraft: deps.conversationDraft,
    editorBuffersByProject: deps.editorBuffersByProject,
    selectedEditorBufferIdByProject: deps.selectedEditorBufferIdByProject,
    workspacePackageByProject: deps.workspacePackageByProject,
    workspaceDraftByProject: deps.workspaceDraftByProject,
    workspaceResultByProject: deps.workspaceResultByProject,
    workspaceHistoryByProject: deps.workspaceHistoryByProject
  };

  const persistRichDesktopPreferences = useCallback(async () => {
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      ...richDesktopPreferencesRef.current
    });
  }, []);

  const flushRichDesktopPreferences = useCallback(async () => {
    if (desktopPreferencesPersistTimeoutRef.current !== null) {
      window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
      desktopPreferencesPersistTimeoutRef.current = null;
    }
    await persistRichDesktopPreferences();
  }, [persistRichDesktopPreferences]);

  const persistResolvedShellLayout = useCallback(async (nextShellLayout: ShellLayoutState) => {
    deps.shellLayoutRef.current = nextShellLayout;
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      ...shellLayoutToDesktopPreferencesPatch(nextShellLayout)
    });
  }, [deps.shellLayoutRef]);

  const persistShellDesktopPreferences = useCallback(async () => {
    await persistResolvedShellLayout(deps.shellLayoutRef.current);
  }, [deps.shellLayoutRef, persistResolvedShellLayout]);

  const applyShellLayoutAction = useCallback((action: ShellLayoutAction): ShellLayoutState => {
    if (!desktopPreferencesHydratedRef.current) {
      shellPendingHydrationActionsRef.current.push(action);
    }
    const nextShellLayout = shellLayoutReducer(deps.shellLayoutRef.current, action);
    deps.shellLayoutRef.current = nextShellLayout;
    deps.dispatchShellLayout(action);
    return nextShellLayout;
  }, [deps.dispatchShellLayout, deps.shellLayoutRef]);

  return {
    desktopPreferencesHydratedRef,
    desktopPreferencesPersistTimeoutRef,
    shellPendingHydrationActionsRef,
    suppressExitDesktopPreferencesFlushRef,
    activeWorkspaceRef,
    richDesktopPreferencesRef,
    persistRichDesktopPreferences,
    flushRichDesktopPreferences,
    persistResolvedShellLayout,
    persistShellDesktopPreferences,
    applyShellLayoutAction
  };
}
