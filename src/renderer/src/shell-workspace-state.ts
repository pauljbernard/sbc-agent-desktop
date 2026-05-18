import {
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react";
import type { WorkspaceId } from "../../shared/contracts";
import type { BrowserDomain } from "./browser-support";
import {
  createDefaultShellLayoutState,
  shellLayoutReducer,
  type ShellLayoutState
} from "./shell-layout";
import { initialDesktopWindows, type DesktopWindowRecord } from "./desktop-windowing";
import type { EnvironmentFocusState } from "./environment-focus";
import type { HostedAppId } from "./workspace-shell";

export type OperateSection = "orientation" | "journeys" | "evidence";
export type ConversationSection = "threads" | "turns" | "draft" | "repl";
export type ConfigurationSection =
  | "theme"
  | "lisp-code-view"
  | "desktop-surface"
  | "llm"
  | "package-management"
  | "capabilities"
  | "mcp-servers";
export type ExecutionSection = "listener" | "work" | "actor-system";
export type RecoverySection = "incidents";
export type EvidenceSection = "artifacts";
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ShellWorkspaceState {
  activeHostedApp: HostedAppId;
  setActiveHostedApp: Dispatch<SetStateAction<HostedAppId>>;
  desktopSpaces: Record<string, DesktopWindowRecord[]>;
  setDesktopSpaces: Dispatch<SetStateAction<Record<string, DesktopWindowRecord[]>>>;
  desktopLabelsById: Record<string, string>;
  setDesktopLabelsById: Dispatch<SetStateAction<Record<string, string>>>;
  activeDesktopId: string;
  setActiveDesktopId: Dispatch<SetStateAction<string>>;
  desktopFocusById: Record<string, string>;
  setDesktopFocusById: Dispatch<SetStateAction<Record<string, string>>>;
  desktopWindowZCounterById: Record<string, number>;
  setDesktopWindowZCounterById: Dispatch<SetStateAction<Record<string, number>>>;
  desktopZoomById: Record<string, number>;
  setDesktopZoomById: Dispatch<SetStateAction<Record<string, number>>>;
  desktopCompositionInitializedById: Record<string, boolean>;
  setDesktopCompositionInitializedById: Dispatch<SetStateAction<Record<string, boolean>>>;
  suppressedDesktopWindowIdsById: Record<string, string[]>;
  setSuppressedDesktopWindowIdsById: Dispatch<SetStateAction<Record<string, string[]>>>;
  activeWorkspace: WorkspaceId;
  setActiveWorkspace: Dispatch<SetStateAction<WorkspaceId>>;
  selectedOperateSection: OperateSection;
  setSelectedOperateSection: Dispatch<SetStateAction<OperateSection>>;
  selectedConversationSection: ConversationSection;
  setSelectedConversationSection: Dispatch<SetStateAction<ConversationSection>>;
  draftEntryFocusOverride: EnvironmentFocusState | null;
  setDraftEntryFocusOverride: Dispatch<SetStateAction<EnvironmentFocusState | null>>;
  selectedBrowserDomain: BrowserDomain;
  setSelectedBrowserDomain: Dispatch<SetStateAction<BrowserDomain>>;
  selectedConfigurationSection: ConfigurationSection;
  setSelectedConfigurationSection: Dispatch<SetStateAction<ConfigurationSection>>;
  selectedExecutionSection: ExecutionSection;
  setSelectedExecutionSection: Dispatch<SetStateAction<ExecutionSection>>;
  selectedRecoverySection: RecoverySection;
  setSelectedRecoverySection: Dispatch<SetStateAction<RecoverySection>>;
  selectedEvidenceSection: EvidenceSection;
  setSelectedEvidenceSection: Dispatch<SetStateAction<EvidenceSection>>;
  isWorkspaceTransitioning: boolean;
  setIsWorkspaceTransitioning: Dispatch<SetStateAction<boolean>>;
  shellLayout: ShellLayoutState;
  dispatchShellLayout: Dispatch<Parameters<typeof shellLayoutReducer>[1]>;
  shellLayoutRef: MutableRefObject<ShellLayoutState>;
  isSidebarResizing: boolean;
  setIsSidebarResizing: Dispatch<SetStateAction<boolean>>;
  isInspectorResizing: boolean;
  setIsInspectorResizing: Dispatch<SetStateAction<boolean>>;
  viewportWidth: number;
  setViewportWidth: Dispatch<SetStateAction<number>>;
  shellTooltip: { label: string; x: number; y: number } | null;
  setShellTooltip: Dispatch<SetStateAction<{ label: string; x: number; y: number } | null>>;
  themePreference: ThemePreference;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  lispParenColors: string[];
  setLispParenColors: Dispatch<SetStateAction<string[]>>;
  tooltipScalePercent: number;
  setTooltipScalePercent: Dispatch<SetStateAction<number>>;
  controlIconScalePercent: number;
  setControlIconScalePercent: Dispatch<SetStateAction<number>>;
  dockIconScalePercent: number;
  setDockIconScalePercent: Dispatch<SetStateAction<number>>;
  conversationTextScalePercent: number;
  setConversationTextScalePercent: Dispatch<SetStateAction<number>>;
  sourceCodeTextScalePercent: number;
  setSourceCodeTextScalePercent: Dispatch<SetStateAction<number>>;
  systemTheme: ResolvedTheme;
  setSystemTheme: Dispatch<SetStateAction<ResolvedTheme>>;
  expandedWorkspaceMenus: Record<string, boolean>;
  setExpandedWorkspaceMenus: Dispatch<SetStateAction<Record<string, boolean>>>;
  desktopWindows: DesktopWindowRecord[];
  activeDesktopWindowId: string;
  desktopWindowZCounter: number;
  activeDesktopZoom: number;
  suppressedDesktopWindowIds: string[];
}

const DEFAULT_LISP_PAREN_COLORS = ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"];

export function useShellWorkspaceState(): ShellWorkspaceState {
  const [activeHostedApp, setActiveHostedApp] = useState<HostedAppId>("control-panel");
  const [desktopSpaces, setDesktopSpaces] = useState<Record<string, DesktopWindowRecord[]>>({
    "desktop-1": initialDesktopWindows()
  });
  const [desktopLabelsById, setDesktopLabelsById] = useState<Record<string, string>>({
    "desktop-1": "Desktop 1"
  });
  const [activeDesktopId, setActiveDesktopId] = useState("desktop-1");
  const [desktopFocusById, setDesktopFocusById] = useState<Record<string, string>>({
    "desktop-1": "window:control-panel"
  });
  const [desktopWindowZCounterById, setDesktopWindowZCounterById] = useState<Record<string, number>>({
    "desktop-1": 3
  });
  const [desktopZoomById, setDesktopZoomById] = useState<Record<string, number>>({
    "desktop-1": 0.66
  });
  const [desktopCompositionInitializedById, setDesktopCompositionInitializedById] = useState<Record<string, boolean>>({});
  const [suppressedDesktopWindowIdsById, setSuppressedDesktopWindowIdsById] = useState<Record<string, string[]>>({
    "desktop-1": []
  });
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("environment");
  const [selectedOperateSection, setSelectedOperateSection] = useState<OperateSection>("journeys");
  const [selectedConversationSection, setSelectedConversationSection] = useState<ConversationSection>("threads");
  const [draftEntryFocusOverride, setDraftEntryFocusOverride] = useState<EnvironmentFocusState | null>(null);
  const [selectedBrowserDomain, setSelectedBrowserDomain] = useState<BrowserDomain>("symbols");
  const [selectedConfigurationSection, setSelectedConfigurationSection] = useState<ConfigurationSection>("theme");
  const [selectedExecutionSection, setSelectedExecutionSection] = useState<ExecutionSection>("listener");
  const [selectedRecoverySection, setSelectedRecoverySection] = useState<RecoverySection>("incidents");
  const [selectedEvidenceSection, setSelectedEvidenceSection] = useState<EvidenceSection>("artifacts");
  const [isWorkspaceTransitioning, setIsWorkspaceTransitioning] = useState(false);
  const [shellLayout, dispatchShellLayout] = useReducer(shellLayoutReducer, undefined, createDefaultShellLayoutState);
  const shellLayoutRef = useRef(shellLayout);
  shellLayoutRef.current = shellLayout;
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [isInspectorResizing, setIsInspectorResizing] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1600 : window.innerWidth
  );
  const [shellTooltip, setShellTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [lispParenColors, setLispParenColors] = useState<string[]>(DEFAULT_LISP_PAREN_COLORS);
  const [tooltipScalePercent, setTooltipScalePercent] = useState(100);
  const [controlIconScalePercent, setControlIconScalePercent] = useState(100);
  const [dockIconScalePercent, setDockIconScalePercent] = useState(100);
  const [conversationTextScalePercent, setConversationTextScalePercent] = useState(100);
  const [sourceCodeTextScalePercent, setSourceCodeTextScalePercent] = useState(100);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [expandedWorkspaceMenus, setExpandedWorkspaceMenus] = useState<Record<string, boolean>>({
    environment: true,
    conversations: true,
    runtime: true,
    incidents: true,
    artifacts: true,
    browser: true,
    applications: true
  });

  const desktopWindows = desktopSpaces[activeDesktopId] ?? [];
  const activeDesktopWindowId =
    desktopFocusById[activeDesktopId] ?? desktopWindows[0]?.id ?? "window:control-panel";
  const desktopWindowZCounter = desktopWindowZCounterById[activeDesktopId] ?? 3;
  const activeDesktopZoom = desktopZoomById[activeDesktopId] ?? 1;
  const suppressedDesktopWindowIds = suppressedDesktopWindowIdsById[activeDesktopId] ?? [];

  return {
    activeHostedApp,
    setActiveHostedApp,
    desktopSpaces,
    setDesktopSpaces,
    desktopLabelsById,
    setDesktopLabelsById,
    activeDesktopId,
    setActiveDesktopId,
    desktopFocusById,
    setDesktopFocusById,
    desktopWindowZCounterById,
    setDesktopWindowZCounterById,
    desktopZoomById,
    setDesktopZoomById,
    desktopCompositionInitializedById,
    setDesktopCompositionInitializedById,
    suppressedDesktopWindowIdsById,
    setSuppressedDesktopWindowIdsById,
    activeWorkspace,
    setActiveWorkspace,
    selectedOperateSection,
    setSelectedOperateSection,
    selectedConversationSection,
    setSelectedConversationSection,
    draftEntryFocusOverride,
    setDraftEntryFocusOverride,
    selectedBrowserDomain,
    setSelectedBrowserDomain,
    selectedConfigurationSection,
    setSelectedConfigurationSection,
    selectedExecutionSection,
    setSelectedExecutionSection,
    selectedRecoverySection,
    setSelectedRecoverySection,
    selectedEvidenceSection,
    setSelectedEvidenceSection,
    isWorkspaceTransitioning,
    setIsWorkspaceTransitioning,
    shellLayout,
    dispatchShellLayout,
    shellLayoutRef,
    isSidebarResizing,
    setIsSidebarResizing,
    isInspectorResizing,
    setIsInspectorResizing,
    viewportWidth,
    setViewportWidth,
    shellTooltip,
    setShellTooltip,
    themePreference,
    setThemePreference,
    lispParenColors,
    setLispParenColors,
    tooltipScalePercent,
    setTooltipScalePercent,
    controlIconScalePercent,
    setControlIconScalePercent,
    dockIconScalePercent,
    setDockIconScalePercent,
    conversationTextScalePercent,
    setConversationTextScalePercent,
    sourceCodeTextScalePercent,
    setSourceCodeTextScalePercent,
    systemTheme,
    setSystemTheme,
    expandedWorkspaceMenus,
    setExpandedWorkspaceMenus,
    desktopWindows,
    activeDesktopWindowId,
    desktopWindowZCounter,
    activeDesktopZoom,
    suppressedDesktopWindowIds
  };
}
