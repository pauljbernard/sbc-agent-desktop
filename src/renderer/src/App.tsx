import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode, type Ref } from "react";
import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  ApprovalDecisionInput,
  BindingDto,
  CalculatorResultDto,
  CommandResultDto,
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  ConsoleLogEntryDto,
  ConversationAttachmentDto,
  ConsoleLogStreamDto,
  DesktopPreferencesDto,
  DesktopActionDto,
  DesktopModelDto,
  DesktopPanelStateDto,
  DesktopPanelId,
  EnvironmentBootstrapDto,
  EnvironmentImageRegistryDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EditorBufferStateDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  FileSystemDirectoryListingDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  WorkspaceSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentRemediationPlanDto,
  IncidentSummaryDto,
  LinkedEntityRefDto,
  MessageDto,
  MemoryEntryDto,
  MemoryDeleteResultDto,
  MemoryListDto,
  MemoryUpdateInput,
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  RuntimeSymbolBrowserPageDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetryProcessDto,
  RuntimeTelemetrySnapshotDto,
  ConversationStreamEventDto,
  ProjectProfileDto,
  ProjectListDto,
  ProjectDetailDto,
  ProjectReadinessObligationDto,
  ProjectReleaseReadinessDto,
  ProjectSummaryDto,
  ProjectTestingHarnessDto,
  ProjectTestingStrategyDto,
  ProviderProfileSummaryDto,
  ProviderRoutingMode,
  ReplSessionHistoryEntryDto,
  ReplSessionProfileDto,
  SendConversationMessageResultDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import {
  canonicalWorkspace,
  desktopPanelToWorkspaceId,
  hostedApps,
  keyboardWorkspaceOrder,
  labelForWorkspace,
  topLevelJourneyWorkspace,
  type HostedAppDescriptor,
  type HostedAppId,
  workspaceOrder,
  workspaceToDesktopPanelId
} from "./workspace-shell";
import {
  createDefaultShellLayoutState,
  deriveShellRenderLayout,
  SHELL_DOCK_PANEL_DEFINITIONS,
  SHELL_STACK_BREAKPOINT,
  shellRailPanelDefinitions,
  shellCanvasMinWidthForViewport,
  shellGapForViewport,
  shellHorizontalPaddingForViewport,
  shellInspectorDefaultWidthForViewport,
  shellInspectorMinWidthForViewport,
  shellLayoutReducer,
  shellLayoutToDesktopPreferencesPatch,
  shellSidebarDefaultWidthForViewport,
  shellSidebarMinWidthForViewport,
  shellSidebarRailWidthForViewport,
  type ShellDockPanelId,
  type ShellLayoutAction,
  type ShellLayoutState
} from "./shell-layout";
import { ShellCollapsedRail, ShellColumnSplitter, ShellRailHost } from "./shell-rail-components";
import {
  createShellRailPanelEntries,
  resolveActiveShellRailPanel
} from "./shell-panel-registry";
import { EditorSymbolRailPanel, ShellNavigationPanel, ShellUtilitiesPanel } from "./shell-panel-content";
import {
  createDefaultEnvironmentFocusState,
  createEnvironmentFocusFromBrowserContext,
  createEnvironmentFocusFromConversationContext,
  createEnvironmentFocusFromEvidenceContext,
  createEnvironmentFocusFromGovernanceContext,
  formatEnvironmentFocusLabel,
  mergeEnvironmentFocus,
  type EnvironmentFocusState
} from "./environment-focus";
import {
  bringWindowToFront,
  cascadeDesktopWindows,
  DEFAULT_DESKTOP_WINDOW_FRAMES,
  initialDesktopWindows,
  moveDesktopWindow,
  positionDesktopWindow,
  resetDesktopWindowLayout,
  resizeDesktopWindow,
  resizeDesktopWindowToDimensions,
  setDesktopWindowFrame,
  tileDesktopWindows,
  type DesktopWindowMoveDirection,
  type DesktopWindowResizeEdge,
  updateWindowState,
  upsertDesktopWindow,
  type DesktopWindowSizePreset,
  type DesktopWindowRecord
} from "./desktop-windowing";
import { BrowserDataTable, type BrowserTableFilterOption } from "./browser-data-table";
import { CalculatorSurface } from "./calculator-surface";
import {
  browserDomains,
  buildBrowserSurfaceEntries,
  selectBrowserDomainDescriptor,
  type BrowserDomain,
  type BrowserSurfaceEntry
} from "./browser-support";
import {
  buildConversationPrompt,
  buildEntityQuickForms,
  buildListenerForm,
  buildSourceOperationForms
} from "./browser-action-forms";
import { BrowserWorkspace } from "./browser-workspace";
import {
  buildDefaultReplSession,
  buildEnvironmentFocusPresentation,
  ensureDesktopProjects,
  makeUniqueProjectIdentity,
  slugifyProjectLabel
} from "./environment-project-support";
import {
  buildMcpServerDraft,
  buildProviderProfileDraft,
  configurationSections,
  llmProviderPresetForProfile,
  normalizeDesktopSurfaceScalePercent,
  normalizeParenDepthColors
} from "./configuration-support";
import {
  asRecord,
  buildDesktopTaskRecordFromSummary,
  buildRuntimeAssistantMessageFromReply,
  canonicalDesktopTaskCoordinate,
  extractCompletedEditorAppendFromActorFlow,
  extractCompletedEditorAppendFromDesktopTaskResult,
  extractPendingConversationApprovalFromActorFlow,
  firstStringValue
} from "./desktop-task-support";
import {
  queryDesktopTaskActorFlow,
  queryDesktopTaskActorSystemPanel,
  queryDesktopTaskActorTrace,
  queryDesktopTaskDeadLetters,
  queryDesktopTaskManifests,
  queryDesktopTaskRecords
} from "./desktop-task-queries";
import { refreshPendingConversationApprovalState } from "./desktop-task-orchestration";
import {
  loadDesktopShellModelQuery,
  loadEnvironmentBootstrapQuery,
  queryEnvironmentImageRegistry,
  queryMcpServerConfigs,
  queryPackageManagementSummary,
  queryProviderSummary
} from "./desktop-environment-queries";
import {
  continueWithCurrentEnvironmentImageState,
  loadEnvironmentBindingState,
  openEnvironmentImageState,
  refreshEnvironmentImageRegistryState,
  refreshMcpServerConfigsState,
  refreshPackageManagementSummaryState,
  refreshProviderSummaryState
} from "./environment-host-orchestration";
import {
  queryOrchestrationFocus,
  queryOrchestrationInbox,
  queryOrchestrationSnapshot,
  queryPlanVerification
} from "./orchestration-queries";
import { useEnvironmentRefreshEffects } from "./environment-refresh-effects";
import { useWorkspaceLoadEffects } from "./workspace-load-effects";
import { useBrowserTranscriptEffects } from "./browser-transcript-effects";
import { useDetailLoadEffects } from "./detail-load-effects";
import { DesktopWindowStage } from "./desktop-window-stage";
import { WorkspaceInspector } from "./workspace-inspector";
import {
  useShellWorkspaceState,
  type ConfigurationSection,
  type ConversationSection,
  type EvidenceSection,
  type ExecutionSection,
  type OperateSection,
  type RecoverySection,
  type ResolvedTheme,
  type ThemePreference
} from "./shell-workspace-state";
import {
  useConfigurationWorkspaceState,
  type McpServerDraft
} from "./configuration-workspace-state";
import { useConversationWorkspaceState } from "./conversation-workspace-state";
import { useDesktopPreferencesOrchestration } from "./desktop-preferences-orchestration";
import {
  initializeEnvironmentLifecycle,
  loadDesktopInitialState
} from "./desktop-bootstrap";
import { useEnvironmentHostState } from "./environment-host-state";
import { useProjectWorkspaceState } from "./project-workspace-state";
import { useRuntimeBrowserState } from "./runtime-browser-state";
import {
  type ConversationSurfacePacketInput,
  buildConversationSurfaceActions,
  buildConversationSurfaceContext
} from "./conversation-surface-packet";
import { Badge, PanelHeader, toneForCommandStatus, transcriptRecencyLabel } from "./surface-support";
import {
  LinkedEntityList,
  MessageBubble,
  PrioritySignalCluster,
  PriorityStateChip,
  RefBlock,
  type SignalCounts,
  type SignalPriority
} from "./interaction-support";
import {
  approvalRecommendationScore,
  artifactRecommendationScore,
  attentionToneWeight,
  compressActionQueue,
  incidentRecommendationScore,
  primaryApprovalRecommendationReason,
  primaryIncidentRecommendationReason,
  primaryThreadRecommendationReason,
  primaryWorkRecommendationReason,
  priorityLabelForTone,
  signalCountsFromItems,
  signalCountsForWorkspace,
  signalPriorityForTone,
  threadRecommendationScore,
  toneForApprovalDecision,
  toneForApprovalState,
  toneForIncidentSeverity,
  toneForThreadState,
  toneForTurnState,
  toneForWorkState,
  workItemRecommendationScore,
  type ActionQueueItem,
  type GlobalAttentionItem
} from "./shell-attention";
import { TranscriptSurface, type TranscriptSurfaceEntry } from "./transcript-surface";
import { MemoryWorkspace } from "./memory-workspace";
import { EditorSurface } from "./editor-surface";
import { ConfigurationWorkspace } from "./configuration-workspace";
import { ConversationsWorkspace } from "./conversations-workspace";
import {
  buildDashboardActionQueue,
  buildEvidenceSectionSignals,
  buildExecutionSectionSignals,
  buildGlobalAttentionItems,
  buildOperateSectionSignals,
  buildPageSignalCounts,
  buildRecoverySectionSignals,
  buildWorkspaceAttentionMap
} from "./shell-dashboard";
import {
  conversationAttachmentFromFile,
  extractConversationStreamText,
  mergeConversationStreamCompletion,
  normalizeConversationStreamType
} from "./conversation-support";
import {
  appendEditorTextToDraft,
  basenameForPath,
  countChangedEditorBufferForms,
  createEditorBufferState,
  joinDirectoryAndFileName,
  parentDirectoryForPath
} from "./editor-support";
import { ProjectsWorkspace } from "./projects-workspace";
import { RuntimeWorkspace } from "./runtime-workspace";
import { ListenerWorkbenchApp } from "./listener-workbench-app";
import { ContextBlock, DetailRow, JourneyStageStrip, type JourneyStep } from "./journey-support";
import { EvidenceWorkspace } from "./evidence-workspace";
import { ExecutionWorkspace } from "./execution-workspace";
import { IncidentsWorkspace, WorkWorkspace } from "./journey-workspaces";
import { OperateWorkspace } from "./operate-workspace";
import {
  ConversationSessionCreateDialog,
  ConversationThreadRenameDialog,
  EditorSourceFileLoadDialog,
  EditorSourceFileSaveDialog,
  EnvironmentExitDialog,
  EnvironmentImageChooserDialog,
  ProjectConstitutionEditDialog,
  ProjectArchitectureDecisionCreateDialog,
  ProjectCreateDialog,
  ProjectFeatureSpecificationCreateDialog,
  ProjectOpenDialog,
  ProjectQualityGateCreateDialog,
  ProjectReadinessObligationsEditDialog,
  ProjectReleaseReadinessEditDialog,
  ProjectRecordEditDialog,
  ProjectRequirementCreateDialog,
  ProjectTestingStrategyEditDialog,
  ProjectSourceRootCreateDialog,
  ProjectTestingHarnessBindDialog,
  ProjectUserJourneyCreateDialog,
  IncidentRemediationPlanDialog,
  WorkItemQuarantineDialog,
  WorkItemResumeDialog,
  WorkItemRollbackDialog,
  WorkItemSteerDialog,
  WorkItemValidationDialog
} from "./shell-dialogs";
import { LispCodeBlock, renderDocumentationMarkdown } from "./rendering-support";
import {
  ActorSystemPanel,
  BrowserModePicker,
  DocumentationWorkspace,
  FilterSelect,
  MetricTile,
  PlannedWorkspace,
  SupervisionBoard
} from "./workspace-support-components";

interface ProjectTestingStrategySuiteExpectationDraft {
  harnessId: string;
  purpose: string;
  evidenceKindsDraft: string;
}

function blankProjectTestingStrategySuiteExpectationDraft(): ProjectTestingStrategySuiteExpectationDraft {
  return {
    harnessId: "",
    purpose: "",
    evidenceKindsDraft: ""
  };
}

interface ProjectReadinessObligationDraft {
  obligationId: string;
  title: string;
  summary: string;
  status: string;
  owner: string;
  dueWindow: string;
  blocking: boolean;
  evidenceKindsDraft: string;
}

function blankProjectReadinessObligationDraft(): ProjectReadinessObligationDraft {
  return {
    obligationId: "",
    title: "",
    summary: "",
    status: "blocked",
    owner: "",
    dueWindow: "",
    blocking: true,
    evidenceKindsDraft: ""
  };
}

function draftLines(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function desktopWindowRecordsEqual(
  left: DesktopWindowRecord[],
  right: DesktopWindowRecord[]
): boolean {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftWindow = left[index];
    const rightWindow = right[index];
    if (
      leftWindow.id !== rightWindow.id ||
      leftWindow.kind !== rightWindow.kind ||
      leftWindow.title !== rightWindow.title ||
      leftWindow.summary !== rightWindow.summary ||
      leftWindow.state !== rightWindow.state ||
      leftWindow.zIndex !== rightWindow.zIndex ||
      leftWindow.x !== rightWindow.x ||
      leftWindow.y !== rightWindow.y ||
      leftWindow.width !== rightWindow.width ||
      leftWindow.height !== rightWindow.height ||
      leftWindow.closable !== rightWindow.closable ||
      leftWindow.hostedAppId !== rightWindow.hostedAppId ||
      leftWindow.panelId !== rightWindow.panelId
    ) {
      return false;
    }
  }
  return true;
}

interface WorkspaceAttentionDigestItem {
  key: string;
  kind: string;
  title: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

interface WorkspaceDescriptor {
  eyebrow: string;
  title: string;
  summary: string;
}

interface WorkspaceResolutionState {
  label: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

interface DockJumpTarget {
  id: string;
  label: string;
  title: string;
  stateLabel: string;
  shortcutKey: string;
  recommendationReason: string;
  score: number;
  recommended?: boolean;
  tone: "active" | "warning" | "danger" | "steady";
  onJump: () => void;
}

interface DesktopAttentionSignal {
  id: string;
  label: string;
  tooltip: string;
  glyphClassName: string;
  priority: "red" | "yellow" | "green";
  onOpen: () => void;
}

const DEFAULT_EDITOR_BUFFER_TITLE = "Main";
const DEFAULT_EDITOR_BOUND_DRAFT = `;; Editor
;; Sustain source and form editing here without collapsing into scratch workspace posture.

(in-package :cl-user)

`;
const DEFAULT_EDITOR_UNBOUND_DRAFT = `;; Editor
;; Bind a project and environment to retain editor buffers.
`;
const UNBOUND_EDITOR_SCOPE_ID = "__unbound__";

const LISP_CONFIGURATION_SAMPLE = `(defun reconcile-runtime-state (work-item env)
  (let ((result (evaluate-in-context env '(describe work-item))))
    (when (awaiting-approval-p result)
      (queue-approval work-item :policy :runtime-change))
    result))`;

const PUBLISHED_DOCUMENTATION_URL = "https://pauljbernard.github.io/sbcl-agent/";
const UNDOCKED_SHELL_WINDOW_PREFIX = "window:undocked:";
const SHELL_PANEL_DRAG_MIME = "application/x-sbcl-agent-shell-panel-id";

function undockedShellWindowId(panelId: ShellDockPanelId): string {
  return `${UNDOCKED_SHELL_WINDOW_PREFIX}${panelId}`;
}

function shellDockPanelIdFromUndockedWindowId(windowId: string): ShellDockPanelId | null {
  if (!windowId.startsWith(UNDOCKED_SHELL_WINDOW_PREFIX)) {
    return null;
  }
  const panelId = windowId.slice(UNDOCKED_SHELL_WINDOW_PREFIX.length);
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

function readDraggedShellPanelId(dataTransfer: DataTransfer | null): ShellDockPanelId | null {
  const panelId = dataTransfer?.getData(SHELL_PANEL_DRAG_MIME) ?? "";
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

const operateSections: Array<{
  id: OperateSection;
  label: string;
  summary: string;
}> = [
  {
    id: "journeys",
    label: "Actions",
    summary: "One triage board for approvals, incidents, blocked work, and queued actions."
  }
];

const conversationSections: Array<{
  id: ConversationSection;
  label: string;
  summary: string;
}> = [
  {
    id: "threads",
    label: "Threads",
    summary: "Supervise multiple structured conversations as durable work."
  },
  {
    id: "turns",
    label: "Turns",
    summary: "Inspect turn lifecycle, governed references, and selected turn state."
  },
  {
    id: "draft",
    label: "Draft",
    summary: "Compose the next supervised continuation without dropping linked context."
  },
  {
    id: "repl",
    label: "REPL",
    summary: "Use direct evaluation against the live image when agentic orchestration is not required."
  }
];

const executionSections: Array<{
  id: ExecutionSection;
  label: string;
  summary: string;
}> = [
  {
    id: "actor-system",
    label: "Actor System",
    summary: "Dedicated actor-system topology, workflow, pressure, and supervision inspection."
  },
  {
    id: "listener",
    label: "Listener",
    summary: "Live runtime listener sessions, evaluation, and retained REPL history."
  },
  {
    id: "work",
    label: "Work",
    summary: "Reconciliation, workflow closure, and execution obligations."
  }
];

const recoverySections: Array<{
  id: RecoverySection;
  label: string;
  summary: string;
}> = [
  {
    id: "incidents",
    label: "Incidents",
    summary: "Durable failure, restoration, and recovery context."
  }
];

const evidenceSections: Array<{
  id: EvidenceSection;
  label: string;
  summary: string;
}> = [
  {
    id: "artifacts",
    label: "Artifacts",
    summary: "Durable outputs, provenance, and linked producing context."
  }
];


export function App() {
  const {
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
    activeDesktopWindowId: focusedDesktopWindowId,
    desktopWindowZCounter,
    activeDesktopZoom,
    suppressedDesktopWindowIds
  } = useShellWorkspaceState();
  const sidebarPinned = shellLayout.leftRail.mode === "expanded";
  const canvasPinned = shellLayout.canvas.mode === "expanded";
  const inspectorPinned = shellLayout.rightRail.mode === "expanded";
  const sidebarWidth = shellLayout.leftRail.expandedWidth;
  const inspectorWidth = shellLayout.rightRail.expandedWidth;
  const leftRailPanels = shellRailPanelDefinitions(shellLayout, "left");
  const rightRailPanels = shellRailPanelDefinitions(shellLayout, "right");
  const {
    providerSummary,
    setProviderSummary,
    packageManagementSummary,
    setPackageManagementSummary,
    desktopTaskManifests,
    setDesktopTaskManifests,
    desktopTaskRecords,
    setDesktopTaskRecords,
    desktopTaskActorFlow,
    setDesktopTaskActorFlow,
    desktopTaskActorSystemPanel,
    setDesktopTaskActorSystemPanel,
    desktopTaskActorTrace,
    setDesktopTaskActorTrace,
    desktopTaskDeadLetters,
    setDesktopTaskDeadLetters,
    orchestrationInbox,
    setOrchestrationInbox,
    orchestrationFocus,
    setOrchestrationFocus,
    orchestrationSnapshot,
    setOrchestrationSnapshot,
    planVerification,
    setPlanVerification,
    appliedActorFlowEditorMutationKeysRef,
    mcpServerConfigs,
    setMcpServerConfigs,
    selectedProviderProfileName,
    setSelectedProviderProfileName,
    providerProfileDraft,
    setProviderProfileDraft,
    selectedMcpServerId,
    setSelectedMcpServerId,
    mcpServerDraft,
    setMcpServerDraft,
    providerProfileStatusMessage,
    setProviderProfileStatusMessage,
    providerProfileError,
    setProviderProfileError,
    packageManagementStatusMessage,
    setPackageManagementStatusMessage,
    packageManagementError,
    setPackageManagementError,
    mcpServerStatusMessage,
    setMcpServerStatusMessage,
    mcpServerError,
    setMcpServerError,
    isSavingMcpServer,
    setIsSavingMcpServer,
    packageManagementCommandResult,
    setPackageManagementCommandResult,
    quicklispSystemDraft,
    setQuicklispSystemDraft,
    qlotCommandDraft,
    setQlotCommandDraft,
    sourceRegistryDraftPath,
    setSourceRegistryDraftPath,
    sourceRegistryEditOriginalPath,
    setSourceRegistryEditOriginalPath,
    localProjectPathDraft,
    setLocalProjectPathDraft,
    localProjectNameDraft,
    setLocalProjectNameDraft,
    isPackageManagementBusy,
    setIsPackageManagementBusy,
    isSavingProviderProfile,
    setIsSavingProviderProfile,
    isUpdatingProviderRouting,
    setIsUpdatingProviderRouting
  } = useConfigurationWorkspaceState({
    buildProviderProfileDraft,
    buildMcpServerDraft
  });
  const [, setIsCommandCenterOpen] = useState(false);
  const {
    hostStatus,
    setHostStatus,
    binding,
    setBinding,
    environmentImageRegistry,
    setEnvironmentImageRegistry,
    isEnvironmentImageChooserOpen,
    setIsEnvironmentImageChooserOpen,
    isEnvironmentExitDialogOpen,
    setIsEnvironmentExitDialogOpen,
    environmentSaveAsNameDraft,
    setEnvironmentSaveAsNameDraft,
    replSessionTitleDraft,
    setReplSessionTitleDraft,
    summary,
    setSummary,
    status,
    setStatus,
    workspaceSummary,
    setWorkspaceSummary,
    desktopModel,
    setDesktopModel,
    errorMessage,
    setErrorMessage
  } = useEnvironmentHostState();
  const {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    projectListResult,
    setProjectListResult,
    memoryListResult,
    setMemoryListResult,
    selectedMemoryId,
    setSelectedMemoryId,
    pendingUpdateMemoryId,
    setPendingUpdateMemoryId,
    pendingDeleteMemoryId,
    setPendingDeleteMemoryId,
    selectedGovernedProjectId,
    setSelectedGovernedProjectId,
    selectedProjectDetail,
    setSelectedProjectDetail,
    selectedConversationThreadByProject,
    setSelectedConversationThreadByProject,
    replSessionsByProject,
    setReplSessionsByProject,
    currentReplSessionIdByProject,
    setCurrentReplSessionIdByProject,
    isProjectOpenDialogOpen,
    setIsProjectOpenDialogOpen,
    isProjectCreateDialogOpen,
    setIsProjectCreateDialogOpen,
    isEditorSourceFileDialogOpen,
    setIsEditorSourceFileDialogOpen,
    isEditorSourceFileSaveDialogOpen,
    setIsEditorSourceFileSaveDialogOpen,
    isProjectConstitutionDialogOpen,
    setIsProjectConstitutionDialogOpen,
    isProjectRequirementDialogOpen,
    setIsProjectRequirementDialogOpen,
    isProjectFeatureSpecificationDialogOpen,
    setIsProjectFeatureSpecificationDialogOpen,
    isProjectUserJourneyDialogOpen,
    setIsProjectUserJourneyDialogOpen,
    isProjectArchitectureDecisionDialogOpen,
    setIsProjectArchitectureDecisionDialogOpen,
    isProjectDesignSystemDialogOpen,
    setIsProjectDesignSystemDialogOpen,
    isProjectStyleGuideDialogOpen,
    setIsProjectStyleGuideDialogOpen,
    isProjectTestingStrategyDialogOpen,
    setIsProjectTestingStrategyDialogOpen,
    isProjectReleaseReadinessDialogOpen,
    setIsProjectReleaseReadinessDialogOpen,
    isProjectReadinessObligationsDialogOpen,
    setIsProjectReadinessObligationsDialogOpen,
    isProjectSourceRootDialogOpen,
    setIsProjectSourceRootDialogOpen,
    isProjectTestingHarnessDialogOpen,
    setIsProjectTestingHarnessDialogOpen,
    isProjectQualityGateDialogOpen,
    setIsProjectQualityGateDialogOpen,
    isWorkItemSteerDialogOpen,
    setIsWorkItemSteerDialogOpen,
    isWorkItemResumeDialogOpen,
    setIsWorkItemResumeDialogOpen,
    isWorkItemQuarantineDialogOpen,
    setIsWorkItemQuarantineDialogOpen,
    isWorkItemRollbackDialogOpen,
    setIsWorkItemRollbackDialogOpen,
    isWorkItemValidationDialogOpen,
    setIsWorkItemValidationDialogOpen,
    isIncidentRemediationPlanDialogOpen,
    setIsIncidentRemediationPlanDialogOpen,
    newProjectTitleDraft,
    setNewProjectTitleDraft,
    editorSourceFilePathDraft,
    setEditorSourceFilePathDraft,
    editorSourceDirectoryPathDraft,
    setEditorSourceDirectoryPathDraft,
    editorSourceDirectoryListing,
    setEditorSourceDirectoryListing,
    editorSourceSaveFileNameDraft,
    setEditorSourceSaveFileNameDraft,
    editorSourceSaveDirectoryPathDraft,
    setEditorSourceSaveDirectoryPathDraft,
    editorSourceSaveDirectoryListing,
    setEditorSourceSaveDirectoryListing,
    projectConstitutionDraft,
    setProjectConstitutionDraft,
    projectReleaseReadinessStageDraft,
    setProjectReleaseReadinessStageDraft,
    projectReleaseReadinessSignoffStatusDraft,
    setProjectReleaseReadinessSignoffStatusDraft,
    projectReleaseReadinessTargetWindowDraft,
    setProjectReleaseReadinessTargetWindowDraft,
    projectReleaseReadinessRequiredApproversDraft,
    setProjectReleaseReadinessRequiredApproversDraft,
    projectReleaseReadinessObservationPlanDraft,
    setProjectReleaseReadinessObservationPlanDraft,
    projectReleaseReadinessOpenRisksDraft,
    setProjectReleaseReadinessOpenRisksDraft,
    projectReadinessObligationsDraft,
    setProjectReadinessObligationsDraft,
    projectRequirementTitleDraft,
    setProjectRequirementTitleDraft,
    projectRequirementSummaryDraft,
    setProjectRequirementSummaryDraft,
    projectRequirementPriorityDraft,
    setProjectRequirementPriorityDraft,
    projectRequirementStatusDraft,
    setProjectRequirementStatusDraft,
    projectFeatureSpecificationTitleDraft,
    setProjectFeatureSpecificationTitleDraft,
    projectFeatureSpecificationSummaryDraft,
    setProjectFeatureSpecificationSummaryDraft,
    projectFeatureSpecificationAcceptanceCriteriaDraft,
    setProjectFeatureSpecificationAcceptanceCriteriaDraft,
    projectFeatureSpecificationStatusDraft,
    setProjectFeatureSpecificationStatusDraft,
    projectUserJourneyTitleDraft,
    setProjectUserJourneyTitleDraft,
    projectUserJourneySummaryDraft,
    setProjectUserJourneySummaryDraft,
    projectUserJourneyActorsDraft,
    setProjectUserJourneyActorsDraft,
    projectUserJourneyEntrypointsDraft,
    setProjectUserJourneyEntrypointsDraft,
    projectUserJourneyStepsDraft,
    setProjectUserJourneyStepsDraft,
    projectUserJourneyOutcomesDraft,
    setProjectUserJourneyOutcomesDraft,
    projectUserJourneyEdgeCasesDraft,
    setProjectUserJourneyEdgeCasesDraft,
    projectArchitectureDecisionTitleDraft,
    setProjectArchitectureDecisionTitleDraft,
    projectArchitectureDecisionSummaryDraft,
    setProjectArchitectureDecisionSummaryDraft,
    projectArchitectureDecisionStatusDraft,
    setProjectArchitectureDecisionStatusDraft,
    projectArchitectureDecisionDriversDraft,
    setProjectArchitectureDecisionDriversDraft,
    projectArchitectureDecisionConsequencesDraft,
    setProjectArchitectureDecisionConsequencesDraft,
    projectArchitectureDecisionStackChoicesDraft,
    setProjectArchitectureDecisionStackChoicesDraft,
    projectDesignSystemDraft,
    setProjectDesignSystemDraft,
    projectStyleGuideDraft,
    setProjectStyleGuideDraft,
    projectTestingStrategyRequiredEvidenceDraft,
    setProjectTestingStrategyRequiredEvidenceDraft,
    projectTestingStrategySuiteExpectationsDraft,
    setProjectTestingStrategySuiteExpectationsDraft,
    projectTestingStrategyMaximumFailedTestsDraft,
    setProjectTestingStrategyMaximumFailedTestsDraft,
    projectTestingStrategyMaximumSayTurnLatencySecondsDraft,
    setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft,
    projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
    setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
    projectTestingStrategyRequireCoverageDraft,
    setProjectTestingStrategyRequireCoverageDraft,
    projectTestingStrategyRequireRecoveryReadyDraft,
    setProjectTestingStrategyRequireRecoveryReadyDraft,
    projectSourceRootDraft,
    setProjectSourceRootDraft,
    projectTestingHarnessIdDraft,
    setProjectTestingHarnessIdDraft,
    projectTestingHarnessInventory,
    setProjectTestingHarnessInventory,
    projectQualityGateTitleDraft,
    setProjectQualityGateTitleDraft,
    projectQualityGateSummaryDraft,
    setProjectQualityGateSummaryDraft,
    projectQualityGateStatusDraft,
    setProjectQualityGateStatusDraft,
    projectQualityGateRequiredHarnessIdsDraft,
    setProjectQualityGateRequiredHarnessIdsDraft,
    projectQualityGateMinimumLinkedWorkItemsDraft,
    setProjectQualityGateMinimumLinkedWorkItemsDraft,
    projectQualityGateMinimumLinkedIncidentsDraft,
    setProjectQualityGateMinimumLinkedIncidentsDraft,
    projectQualityGateMaximumFailedTestsDraft,
    setProjectQualityGateMaximumFailedTestsDraft,
    projectQualityGateMaximumSayTurnLatencySecondsDraft,
    setProjectQualityGateMaximumSayTurnLatencySecondsDraft,
    projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft,
    setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft,
    projectQualityGateRequireSourceRootsDraft,
    setProjectQualityGateRequireSourceRootsDraft,
    projectQualityGateRequireCoverageDraft,
    setProjectQualityGateRequireCoverageDraft,
    projectQualityGateRequireRecoveryReadyDraft,
    setProjectQualityGateRequireRecoveryReadyDraft,
    workItemSteerPhaseDraft,
    setWorkItemSteerPhaseDraft,
    workItemSteerNextStepDraft,
    setWorkItemSteerNextStepDraft,
    workItemSteerNoteDraft,
    setWorkItemSteerNoteDraft,
    workItemResumeNoteDraft,
    setWorkItemResumeNoteDraft,
    workItemQuarantineReasonDraft,
    setWorkItemQuarantineReasonDraft,
    workItemRollbackReasonDraft,
    setWorkItemRollbackReasonDraft,
    workItemRollbackNoteDraft,
    setWorkItemRollbackNoteDraft,
    workItemValidationStatusDraft,
    setWorkItemValidationStatusDraft,
    incidentRemediationStatusDraft,
    setIncidentRemediationStatusDraft,
    incidentRemediationOwnerDraft,
    setIncidentRemediationOwnerDraft,
    incidentRemediationSummaryDraft,
    setIncidentRemediationSummaryDraft,
    incidentRemediationActionsDraft,
    setIncidentRemediationActionsDraft,
    incidentRemediationValidationDraft,
    setIncidentRemediationValidationDraft,
    incidentRemediationBlockersDraft,
    setIncidentRemediationBlockersDraft
  } = useProjectWorkspaceState();
  const {
    threads,
    setThreads,
    selectedThreadId,
    setSelectedThreadId,
    selectedThread,
    setSelectedThread,
    selectedConversationMessageId,
    setSelectedConversationMessageId,
    selectedTurnId,
    setSelectedTurnId,
    selectedTurn,
    setSelectedTurn,
    conversationSessionTitleDraft,
    setConversationSessionTitleDraft,
    isConversationSessionCreateDialogOpen,
    setIsConversationSessionCreateDialogOpen,
    isConversationThreadRenameDialogOpen,
    setIsConversationThreadRenameDialogOpen,
    conversationThreadRenameDraft,
    setConversationThreadRenameDraft,
    conversationThreadRenameTargetId,
    setConversationThreadRenameTargetId,
    conversationDraft,
    setConversationDraft,
    conversationRecoveryHandoff,
    setConversationRecoveryHandoff,
    pendingCalculatorExpressionRequest,
    setPendingCalculatorExpressionRequest,
    latestCalculatorResult,
    setLatestCalculatorResult,
    conversationAttachments,
    setConversationAttachments,
    conversationSendError,
    setConversationSendError,
    isSendingConversation,
    setIsSendingConversation,
    conversationStream,
    setConversationStream,
    pendingConversationApproval,
    setPendingConversationApproval,
    pendingConversationComposerFocusThreadId,
    setPendingConversationComposerFocusThreadId,
    editorBuffersByProject,
    setEditorBuffersByProject,
    selectedEditorBufferIdByProject,
    setSelectedEditorBufferIdByProject,
    currentEditorCursorSymbol,
    setCurrentEditorCursorSymbol,
    currentEditorCursorSymbolPackage,
    setCurrentEditorCursorSymbolPackage,
    currentEditorCursorSymbolHelp,
    setCurrentEditorCursorSymbolHelp,
    workspacePackageByProject,
    setWorkspacePackageByProject,
    workspaceDraftByProject,
    setWorkspaceDraftByProject,
    workspaceResultByProject,
    setWorkspaceResultByProject,
    workspaceHistoryByProject,
    setWorkspaceHistoryByProject,
    selectedThreadIdRef,
    stickyConversationThreadIdRef,
    pendingConversationApprovalRef,
    currentEditorScopeIdRef,
    currentEditorBufferIdRef,
    currentEditorPackageRef,
    pendingConversationRefreshTimerRef,
    pendingTranscriptRefreshTimerRef
  } = useConversationWorkspaceState(UNBOUND_EDITOR_SCOPE_ID);
  const {
    runtimeSummary,
    setRuntimeSummary,
    runtimeTelemetry,
    setRuntimeTelemetry,
    selectedTelemetryProcessId,
    setSelectedTelemetryProcessId,
    consoleLogStream,
    setConsoleLogStream,
    environmentConsoleLogStream,
    setEnvironmentConsoleLogStream,
    hostConsoleLogStream,
    setHostConsoleLogStream,
    selectedConsolePlane,
    setSelectedConsolePlane,
    selectedConsoleSourceFilter,
    setSelectedConsoleSourceFilter,
    selectedConsoleEntryId,
    setSelectedConsoleEntryId,
    diagnosticReports,
    setDiagnosticReports,
    selectedDiagnosticSourceFilter,
    setSelectedDiagnosticSourceFilter,
    selectedDiagnosticReportId,
    setSelectedDiagnosticReportId,
    selectedDiagnosticReport,
    setSelectedDiagnosticReport,
    runtimeForm,
    setRuntimeForm,
    runtimeResult,
    setRuntimeResult,
    runtimeRecoveryLaunch,
    setRuntimeRecoveryLaunch,
    runtimeInspectorSymbol,
    setRuntimeInspectorSymbol,
    runtimeInspectorPackage,
    setRuntimeInspectorPackage,
    runtimeInspectionMode,
    setRuntimeInspectionMode,
    runtimeInspection,
    setRuntimeInspection,
    runtimeEntityDetail,
    setRuntimeEntityDetail,
    packageBrowser,
    setPackageBrowser,
    selectedPackageName,
    setSelectedPackageName,
    isEvaluating,
    setIsEvaluating,
    isInspectingRuntime,
    setIsInspectingRuntime,
    sourcePreview,
    setSourcePreview,
    sourceDraft,
    setSourceDraft,
    isEditingSource,
    setIsEditingSource,
    isStagingSource,
    setIsStagingSource,
    isReloadingSource,
    setIsReloadingSource,
    sourceMutationResult,
    setSourceMutationResult,
    sourceReloadResult,
    setSourceReloadResult,
    approvalRequests,
    setApprovalRequests,
    selectedApprovalId,
    setSelectedApprovalId,
    selectedApproval,
    setSelectedApproval,
    approvalDecision,
    setApprovalDecision,
    isDecidingApproval,
    setIsDecidingApproval,
    incidents,
    setIncidents,
    selectedIncidentId,
    setSelectedIncidentId,
    selectedIncident,
    setSelectedIncident,
    pendingIncidentFocusId,
    setPendingIncidentFocusId,
    workItems,
    setWorkItems,
    selectedWorkItemId,
    setSelectedWorkItemId,
    selectedWorkItem,
    setSelectedWorkItem,
    selectedWorkItemPlan,
    setSelectedWorkItemPlan,
    selectedWorkflowRecord,
    setSelectedWorkflowRecord,
    pendingWorkItemFocusId,
    setPendingWorkItemFocusId,
    environmentEvents,
    setEnvironmentEvents,
    selectedEventCursor,
    setSelectedEventCursor,
    eventFamilyFilter,
    setEventFamilyFilter,
    eventVisibilityFilter,
    setEventVisibilityFilter,
    selectedTranscriptSourceFilter,
    setSelectedTranscriptSourceFilter,
    selectedTranscriptEntryKey,
    setSelectedTranscriptEntryKey,
    isTranscriptEventRefreshActive,
    setIsTranscriptEventRefreshActive,
    documentationPages,
    setDocumentationPages,
    selectedDocumentationSlug,
    setSelectedDocumentationSlug,
    selectedDocumentationPage,
    setSelectedDocumentationPage,
    artifacts,
    setArtifacts,
    selectedArtifactId,
    setSelectedArtifactId,
    selectedArtifact,
    setSelectedArtifact
  } = useRuntimeBrowserState();
  const runtimeInspectorSymbolRef = useRef(runtimeInspectorSymbol);
  const runtimeInspectorPackageRef = useRef(runtimeInspectorPackage);
  const runtimeInspectionModeRef = useRef<RuntimeInspectionMode>(runtimeInspectionMode);
  const projectWorkspaceLoadRef = useRef(new Map<string, Promise<void>>());
  const projectDetailLoadRef = useRef(new Map<string, Promise<void>>());
  const approvalWorkspaceLoadRef = useRef(new Map<string, Promise<void>>());
  const approvalDetailLoadRef = useRef(new Map<string, Promise<void>>());
  const workWorkspaceLoadRef = useRef(new Map<string, Promise<void>>());
  const workItemDetailLoadRef = useRef(new Map<string, Promise<void>>());
  const environmentFocusRef = useRef<EnvironmentFocusState>(createDefaultEnvironmentFocusState());
  const startupImageSelectionHandledRef = useRef(false);
  const {
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
  } = useDesktopPreferencesOrchestration({
    activeWorkspace,
    selectedBrowserDomain,
    conversationDraft,
    editorBuffersByProject,
    selectedEditorBufferIdByProject,
    selectedConfigurationSection,
    workspacePackageByProject,
    workspaceDraftByProject,
    workspaceResultByProject,
    workspaceHistoryByProject,
    shellLayoutRef,
    dispatchShellLayout
  });
  const effectiveEnvironmentId = summary?.environmentId ?? binding?.environmentId ?? null;
  const desktopDescriptors = Object.entries(desktopLabelsById).map(([id, label]) => ({
    id,
    label,
    active: id === activeDesktopId
  }));
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<HTMLElement | null>(null);
  const canvasPanelRef = useRef<HTMLElement | null>(null);
  const inspectorPanelRef = useRef<HTMLElement | null>(null);
  const leftRailListRef = useRef<HTMLDivElement | null>(null);
  const rightRailListRef = useRef<HTMLDivElement | null>(null);
  const desktopWindowStageDropTargetRef = useRef<HTMLDivElement | null>(null);
  const activeTooltipTargetRef = useRef<HTMLElement | null>(null);
  const activeTooltipTitleRef = useRef<string | null>(null);
  const shellPanelDragSessionRef = useRef<{
    panelId: ShellDockPanelId;
    panelLabel: string;
    origin: "left" | "right" | "undocked";
    startX: number;
    startY: number;
    dragStarted: boolean;
  } | null>(null);
  const shellPanelDragCleanupRef = useRef<(() => void) | null>(null);
  const inspectorResizeSessionRef = useRef<{
    contentRight: number;
    minWidth: number;
    maxWidth: number;
    gap: number;
  } | null>(null);
  const sidebarResizeSessionRef = useRef<{
    contentLeft: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);
  const sidebarResizeCleanupRef = useRef<(() => void) | null>(null);
  const railSectionResizeSessionRef = useRef<{
    side: "left" | "right";
    startClientY: number;
    startHeight: number;
    minHeight: number;
    maxHeight: number;
  } | null>(null);
  const railSectionResizeCleanupRef = useRef<(() => void) | null>(null);
  const [leftRailDockSectionHeight, setLeftRailDockSectionHeight] = useState<number | null>(null);
  const [rightRailDockSectionHeight, setRightRailDockSectionHeight] = useState<number | null>(null);
  const [activeRailSectionResizeSide, setActiveRailSectionResizeSide] = useState<"left" | "right" | null>(null);
  const [splitterLayout, setSplitterLayout] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);
  const inspectorResizeCleanupRef = useRef<(() => void) | null>(null);
  const [shellPanelDragState, setShellPanelDragState] = useState<{
    panelId: ShellDockPanelId;
    panelLabel: string;
    origin: "left" | "right" | "undocked";
    x: number;
    y: number;
    target: "left" | "right" | "undocked" | null;
  } | null>(null);
  function updateActiveDesktopWindows(updater: (windows: DesktopWindowRecord[]) => DesktopWindowRecord[]): void {
    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const nextWindows = updater(currentWindows);
      if (nextWindows === currentWindows) {
        return current;
      }
      return {
        ...current,
        [activeDesktopId]: nextWindows
      };
    });
  }

  function updateRuntimeInspectorSymbol(value: string): void {
    runtimeInspectorSymbolRef.current = value;
    setRuntimeInspectorSymbol(value);
  }

  function updateRuntimeInspectorPackage(value: string): void {
    runtimeInspectorPackageRef.current = value;
    setRuntimeInspectorPackage(value);
  }

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    pendingConversationApprovalRef.current = pendingConversationApproval;
  }, [pendingConversationApproval]);

  useEffect(() => {
    const actorFlowPendingApproval = extractPendingConversationApprovalFromActorFlow(
      desktopTaskActorFlow
    );
    if (actorFlowPendingApproval) {
      setPendingConversationApproval((current) => {
        if (
          current?.actorMessageId === actorFlowPendingApproval.actorMessageId &&
          current?.approvalId === actorFlowPendingApproval.approvalId &&
          current?.sessionId === actorFlowPendingApproval.sessionId &&
          current?.threadId === actorFlowPendingApproval.threadId
        ) {
          return current;
        }
        return actorFlowPendingApproval;
      });
      return;
    }

    const orchestrationPendingApproval = resolveOrchestrationApprovalContext(selectedThreadId);
    if (orchestrationPendingApproval?.actorMessageId || orchestrationPendingApproval?.approvalId) {
      setPendingConversationApproval((current) => {
        if (
          current?.actorMessageId === orchestrationPendingApproval.actorMessageId &&
          current?.approvalId === orchestrationPendingApproval.approvalId &&
          current?.sessionId === orchestrationPendingApproval.sessionId &&
          current?.threadId === orchestrationPendingApproval.threadId
        ) {
          return current;
        }
        return {
          actorMessageId: orchestrationPendingApproval.actorMessageId,
          approvalId: orchestrationPendingApproval.approvalId,
          sessionId: orchestrationPendingApproval.sessionId,
          threadId: orchestrationPendingApproval.threadId,
          policyIds: []
        };
      });
      return;
    }

    const awaitingApprovalRecords = [...desktopTaskRecords]
      .filter((record) => String(record.approvalStatus ?? "").toLowerCase() === "awaiting-approval")
      .sort((left, right) =>
        String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
      );
    const selectedPendingRecord = selectedThreadId
      ? awaitingApprovalRecords.find((record) => record.threadId === selectedThreadId) ?? null
      : null;
    const pendingRecord = selectedPendingRecord ?? awaitingApprovalRecords[0] ?? null;
    const actorMessageId =
      pendingRecord?.actorMessageId ?? firstStringValue(asRecord(pendingRecord?.actorMessage).id) ?? null;
    if (pendingRecord && actorMessageId) {
      setPendingConversationApproval((current) =>
        current?.actorMessageId === actorMessageId
          ? current
          : {
              actorMessageId,
              threadId: pendingRecord.threadId ?? null,
              policyIds: []
            }
      );
      return;
    }

    const currentPendingApproval = pendingConversationApprovalRef.current;
    if (currentPendingApproval?.actorMessageId) {
      const matchingRecord = desktopTaskRecords.find((record) => {
        const recordActorMessageId =
          record.actorMessageId ?? firstStringValue(asRecord(record.actorMessage).id) ?? null;
        return recordActorMessageId === currentPendingApproval.actorMessageId;
      }) ?? null;
      const matchingApprovalStatus = String(matchingRecord?.approvalStatus ?? "").toLowerCase();
      const matchingRecordStatus = String(matchingRecord?.status ?? "").toLowerCase();
      if (
        matchingRecord &&
        (matchingApprovalStatus === "approved" ||
          matchingRecordStatus === "completed" ||
          matchingRecordStatus === "failed" ||
          matchingRecordStatus === "canceled")
      ) {
        setPendingConversationApproval(null);
        return;
      }
      return;
    }

    setPendingConversationApproval(null);
  }, [desktopTaskActorFlow, desktopTaskRecords, selectedThreadId]);

  useEffect(() => {
    const completedEditorAppend = extractCompletedEditorAppendFromActorFlow(desktopTaskActorFlow);
    if (!completedEditorAppend) {
      return;
    }
    if (appliedActorFlowEditorMutationKeysRef.current.has(completedEditorAppend.dedupeKey)) {
      return;
    }
    applyEditorBufferMutation(
      "append",
      completedEditorAppend.text,
      completedEditorAppend.scopeId,
      completedEditorAppend.bufferId,
      completedEditorAppend.packageName
    );
    appliedActorFlowEditorMutationKeysRef.current.add(completedEditorAppend.dedupeKey);
  }, [desktopTaskActorFlow]);

  function applyConversationStreamEvent(event: EnvironmentEventDto): void {
    const payload = event.payload as Record<string, unknown>;
    const streamEvent = payload as unknown as ConversationStreamEventDto & {
      canonicalType?: string;
      payload?: unknown;
    };
    const threadId =
      event.threadId ??
      (typeof payload.threadId === "string" ? payload.threadId : null) ??
      selectedThreadIdRef.current;
    const turnId = event.turnId ?? (typeof payload.turnId === "string" ? payload.turnId : null) ?? null;
    const delta = extractConversationStreamText(streamEvent.payload) || extractConversationStreamText(streamEvent);
    const canonicalType =
      normalizeConversationStreamType(streamEvent.canonicalType) ??
      normalizeConversationStreamType((streamEvent as unknown as Record<string, unknown>).legacyType) ??
      normalizeConversationStreamType(event.kind);
    const phase =
      normalizeConversationStreamType(streamEvent.phase) ??
      normalizeConversationStreamType((streamEvent.payload as Record<string, unknown> | null | undefined)?.phase) ??
      null;

    if (!threadId) {
      return;
    }

    if (
      canonicalType === "text-delta" ||
      canonicalType === "message-delta" ||
      (canonicalType === "provider-stream" && phase === "delta" && delta.length > 0)
    ) {
      setConversationStream((current) => {
        if (current && current.threadId !== threadId) {
          return current;
        }
        return {
          threadId,
          turnId: turnId ?? current?.turnId ?? null,
          content: `${current?.content ?? ""}${delta}`
        };
      });
      return;
    }

    if (
      (canonicalType === "text-complete" || canonicalType === "message-complete") ||
      (canonicalType === "provider-stream" && phase === "completed")
    ) {
      setConversationStream((current) => {
        if (current && current.threadId !== threadId) {
          return current;
        }
        return {
          threadId,
          turnId: turnId ?? current?.turnId ?? null,
          content: mergeConversationStreamCompletion(current?.content ?? "", delta)
        };
      });
    }
  }

  function shouldRefreshConversationThreadListFromEvent(event: EnvironmentEventDto): boolean {
    return event.kind === "thread-created";
  }

  function shouldRefreshSelectedConversationThreadFromEvent(event: EnvironmentEventDto): boolean {
    return (
      event.kind === "turn-completed" ||
      event.kind === "artifact-created" ||
      event.kind === "artifact-linked" ||
      event.kind === "assistant-response" ||
      event.kind === "assistant-actions-executed"
    );
  }

  function applyEditorBufferUpdateEvent(event: EnvironmentEventDto): boolean {
    if (event.kind !== "editor-buffer-updated") {
      return false;
    }
    const mode = typeof event.payload.mode === "string" ? event.payload.mode : "";
    const text = typeof event.payload.text === "string" ? event.payload.text : "";
    const eventScopeId =
      typeof event.payload.scopeId === "string"
        ? event.payload.scopeId
        : typeof event.payload.scope_id === "string"
          ? event.payload.scope_id
          : currentEditorScopeIdRef.current;
    const eventBufferId =
      typeof event.payload.bufferId === "string"
        ? event.payload.bufferId
        : typeof event.payload.buffer_id === "string"
          ? event.payload.buffer_id
          : currentEditorBufferIdRef.current;
    const eventPackageName =
      typeof event.payload.packageName === "string"
        ? event.payload.packageName
        : typeof event.payload.package_name === "string"
          ? event.payload.package_name
          : currentEditorPackageRef.current;
    return applyEditorBufferMutation(mode, text, eventScopeId, eventBufferId, eventPackageName);
  }

  function applyEditorBufferMutation(
    mode: string,
    text: string,
    eventScopeId: string | null,
    eventBufferId: string | null,
    eventPackageName: string | null
  ): boolean {
    if (mode !== "append" || text.trim().length === 0 || !eventScopeId) {
      return true;
    }
    const normalizedPackageName = eventPackageName ?? currentEditorPackageRef.current ?? "cl-user";
    setEditorBuffersByProject((current) => {
      const next = { ...current };
      const targetScopeIds = Array.from(
        new Set(
          [eventScopeId, currentEditorScopeIdRef.current].filter(
            (value): value is string => typeof value === "string" && value.length > 0
          )
        )
      );

      for (const targetScopeId of targetScopeIds) {
        const existingBuffers =
          next[targetScopeId] ?? [
            createEditorBufferState({
              bufferId:
                eventBufferId ??
                (targetScopeId === UNBOUND_EDITOR_SCOPE_ID
                  ? "editor-buffer-unbound-main"
                  : `editor-buffer-${targetScopeId}-main`),
              title: DEFAULT_EDITOR_BUFFER_TITLE,
              draft:
                targetScopeId === UNBOUND_EDITOR_SCOPE_ID
                  ? DEFAULT_EDITOR_UNBOUND_DRAFT
                  : DEFAULT_EDITOR_BOUND_DRAFT,
              packageName: normalizedPackageName
            })
          ];
        const requestedBufferId = eventBufferId ?? existingBuffers[0]?.bufferId ?? null;
        if (!requestedBufferId) {
          continue;
        }
        const targetBufferId = existingBuffers.some(
          (buffer) => buffer.bufferId === requestedBufferId
        )
          ? requestedBufferId
          : (existingBuffers[0]?.bufferId ?? requestedBufferId);
        next[targetScopeId] = existingBuffers.map((buffer) =>
          buffer.bufferId === targetBufferId
            ? {
                ...buffer,
                draft: appendEditorTextToDraft(buffer.draft, text),
                packageName: buffer.packageName || normalizedPackageName,
                dirty: true
              }
            : buffer
        );
      }

      return next;
    });
    return true;
  }

  function applyDesktopTaskCommandResults(results: Array<Record<string, unknown>> | undefined): void {
    if (!results?.length) {
      return;
    }

    for (const entry of results) {
      const completedAppend = extractCompletedEditorAppendFromDesktopTaskResult({
        entry,
        fallbackScopeId: currentEditorScopeIdRef.current,
        fallbackBufferId: currentEditorBufferIdRef.current,
        fallbackPackageName: currentEditorPackageRef.current
      });
      if (!completedAppend?.text) {
        continue;
      }
      applyEditorBufferMutation(
        "append",
        completedAppend.text,
        completedAppend.scopeId,
        completedAppend.bufferId,
        completedAppend.packageName
      );
      if (completedAppend.dedupeKey) {
        appliedActorFlowEditorMutationKeysRef.current.add(completedAppend.dedupeKey);
      }
    }
  }

  function mergeDesktopTaskRecordSummaries(summaries: Array<Record<string, unknown>> | undefined): void {
    if (!summaries?.length) {
      return;
    }

    setDesktopTaskRecords((current) => {
      const byId = new Map(current.map((record) => [record.id, record] as const));

      for (const summary of summaries) {
        const nextRecord = buildDesktopTaskRecordFromSummary(summary);
        if (!nextRecord) {
          continue;
        }
        byId.set(nextRecord.id, nextRecord);
      }

      return Array.from(byId.values()).sort((left, right) =>
        String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
      );
    });
  }

  function scheduleConversationEventRefresh(environmentId: string, event: EnvironmentEventDto): void {
    const threadId = event.threadId ?? null;
    const selectedThreadId = selectedThreadIdRef.current;
    const shouldRefreshSelectedThread =
      threadId != null &&
      selectedThreadId != null &&
      threadId === selectedThreadId &&
      shouldRefreshSelectedConversationThreadFromEvent(event);
    const shouldRefreshThreadList =
      shouldRefreshConversationThreadListFromEvent(event) || shouldRefreshSelectedThread;

    if (!shouldRefreshThreadList) {
      return;
    }

    if (pendingConversationRefreshTimerRef.current != null) {
      window.clearTimeout(pendingConversationRefreshTimerRef.current);
    }

    pendingConversationRefreshTimerRef.current = window.setTimeout(() => {
      pendingConversationRefreshTimerRef.current = null;
      void (async () => {
        try {
          const preferredThreadId = shouldRefreshSelectedThread ? selectedThreadIdRef.current : null;
          const { nextThreadId } = await refreshConversationThreadList(environmentId, preferredThreadId);
          if (shouldRefreshSelectedThread && nextThreadId) {
            const detailResult = await loadThreadDetailWithExpectation(nextThreadId, environmentId);
            applyLoadedThreadDetail(detailResult.data);
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to refresh conversation state from environment events."
          );
        }
      })();
    }, 180);
  }

  function scheduleTranscriptEventRefresh(environmentId: string): void {
    if (pendingTranscriptRefreshTimerRef.current != null) {
      window.clearTimeout(pendingTranscriptRefreshTimerRef.current);
    }

    pendingTranscriptRefreshTimerRef.current = window.setTimeout(() => {
      pendingTranscriptRefreshTimerRef.current = null;
      void (async () => {
        try {
          await loadTranscriptWorkspace(environmentId);
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to refresh transcript state from environment events."
          );
        }
      })();
    }, 180);
  }

  function shouldRefreshTranscriptFromEvent(event: EnvironmentEventDto): boolean {
    if (event.family === "provider" || event.kind === "provider-stream") {
      return false;
    }
    return true;
  }

  function shouldLoadTranscriptActivityEntries(): boolean {
    return selectedTranscriptSourceFilter === "all" || selectedTranscriptSourceFilter === "event";
  }

  function shouldLoadTranscriptConsoleEntries(): boolean {
    return (
      selectedTranscriptSourceFilter === "all" ||
      selectedTranscriptSourceFilter === "environment-console" ||
      selectedTranscriptSourceFilter === "host-console"
    );
  }

  function shouldSubscribeTranscriptEnvironmentEvents(): boolean {
    return shouldLoadTranscriptActivityEntries() || shouldLoadTranscriptConsoleEntries();
  }

  useEffect(() => {
    const selectedProfile =
      providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName) ??
      providerSummary?.activeProfile ??
      null;
    if (!selectedProfile) {
      return;
    }
    setProviderProfileDraft(
      buildProviderProfileDraft({
        profileName: selectedProfile.name,
        provider: selectedProfile.provider,
        model: selectedProfile.model,
        fastModel: selectedProfile.fastModel,
        apiBase: selectedProfile.apiBase ?? "",
        intents: selectedProfile.intents,
        latencyTier: selectedProfile.latencyTier,
        reviewBias: selectedProfile.reviewBias,
        executionBias: selectedProfile.executionBias,
        locality: selectedProfile.locality
      })
    );
  }, [providerSummary, selectedProviderProfileName]);

  useEffect(() => {
    if (!effectiveEnvironmentId) {
      setConversationStream(null);
      return;
    }

    let active = true;
    let environmentSubscriptionId: string | null = null;
    let conversationStreamSubscriptionId: string | null = null;

    const handleEnvironmentEvent = (event: EnvironmentEventDto) => {
      if (!active) {
        return;
      }
      if (applyEditorBufferUpdateEvent(event)) {
        return;
      }
      scheduleConversationEventRefresh(effectiveEnvironmentId, event);
    };

    const handleConversationStreamEvent = (event: EnvironmentEventDto) => {
      if (!active) {
        return;
      }
      applyConversationStreamEvent(event);
    };

    void window.sbclAgentDesktop.events
      .subscribeEnvironmentEvents(
        {
          environmentId: effectiveEnvironmentId,
          families: ["conversation", "assistant", "workspace"]
        },
        handleEnvironmentEvent
      )
      .then((handle) => {
        environmentSubscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    void window.sbclAgentDesktop.events
      .subscribeConversationStream(handleConversationStreamEvent)
      .then((handle) => {
        conversationStreamSubscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (pendingConversationRefreshTimerRef.current != null) {
        window.clearTimeout(pendingConversationRefreshTimerRef.current);
        pendingConversationRefreshTimerRef.current = null;
      }
      if (environmentSubscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(environmentSubscriptionId);
      }
      if (conversationStreamSubscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(conversationStreamSubscriptionId);
      }
    };
  }, [effectiveEnvironmentId]);

  function updateRuntimeInspectionMode(value: RuntimeInspectionMode): void {
    runtimeInspectionModeRef.current = value;
    setRuntimeInspectionMode(value);
  }
  const currentProjectReplSessions = currentProjectId ? replSessionsByProject[currentProjectId] ?? [] : [];
  const currentReplSessionId = currentProjectId ? currentReplSessionIdByProject[currentProjectId] ?? currentProjectReplSessions[0]?.sessionId ?? null : null;
  const currentProject = projects.find((project) => project.projectId === currentProjectId) ?? null;
  const selectedProjectSummary =
    projectListResult?.data.projects.find((project) => project.projectId === selectedGovernedProjectId) ?? null;
  const currentProjectConversationSessionCount = currentProjectId
    ? threads.length
    : 0;
  const currentProjectConversationFocus =
    (currentProjectId ? threads.find((thread) => thread.threadId === selectedConversationThreadByProject[currentProjectId]) : null) ??
    threads[0] ??
    null;
  const calculatorRefreshToken = [
    effectiveEnvironmentId ?? "no-environment",
    selectedThreadId ?? "no-thread",
    selectedTurnId ?? "no-turn",
    String(threads.length),
    currentProjectConversationFocus?.threadId ?? "no-focus-thread",
    currentProjectConversationFocus?.latestActivityAt ?? "no-latest-activity",
    currentProjectConversationFocus?.latestTurnState ?? "no-turn-state"
  ].join(":");
  const environmentFocus = useMemo<EnvironmentFocusState>(() => {
    const browserFocus = createEnvironmentFocusFromBrowserContext({
      sourceWorkspace: activeWorkspace,
      runtimeSymbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null,
      runtimePackage:
        runtimeInspection?.data.packageName ??
        runtimeEntityDetail?.data.packageName ??
        runtimeInspectorPackage ??
        null,
      runtimeInspectionMode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
      sourcePath: sourcePreview?.data.path ?? null,
      sourceLine: sourcePreview?.data.focusLine ?? null,
      linkedThreadId: selectedThreadId
    });
    const conversationFocus = createEnvironmentFocusFromConversationContext({
      sourceWorkspace: activeWorkspace,
      threadId: selectedThreadId,
      turnId: selectedTurnId
    });
    const governanceFocus = createEnvironmentFocusFromGovernanceContext({
      sourceWorkspace: activeWorkspace,
      approvalId: selectedApprovalId,
      workItemId: selectedWorkItemId,
      incidentId: selectedIncidentId
    });
    const evidenceFocus = createEnvironmentFocusFromEvidenceContext({
      sourceWorkspace: activeWorkspace,
      artifactId: selectedArtifactId,
      eventCursor: selectedEventCursor
    });
    const focusCandidates = [browserFocus, conversationFocus, governanceFocus, evidenceFocus];
    const crossSurfaceDraftFocus =
      canonicalWorkspace(activeWorkspace) === "conversations" && selectedConversationSection === "draft"
        ? draftEntryFocusOverride
        : null;
    const preferredFocus =
      crossSurfaceDraftFocus
        ? crossSurfaceDraftFocus
        : canonicalWorkspace(activeWorkspace) === "browser" || canonicalWorkspace(activeWorkspace) === "runtime"
        ? browserFocus
        : canonicalWorkspace(activeWorkspace) === "conversations"
          ? conversationFocus
          : canonicalWorkspace(activeWorkspace) === "approvals" ||
              canonicalWorkspace(activeWorkspace) === "incidents" ||
              canonicalWorkspace(activeWorkspace) === "work" ||
              canonicalWorkspace(activeWorkspace) === "environment"
            ? governanceFocus
            : canonicalWorkspace(activeWorkspace) === "artifacts" || canonicalWorkspace(activeWorkspace) === "activity"
              ? evidenceFocus
              : createDefaultEnvironmentFocusState();
    const baseFocus =
      preferredFocus.kind !== "none"
        ? preferredFocus
        : focusCandidates.find((focus) => focus.kind !== "none") ?? createDefaultEnvironmentFocusState();

    return focusCandidates.reduce((combined, focus) => {
      if (focus === baseFocus || focus.kind === "none") {
        return combined;
      }
      return mergeEnvironmentFocus(combined, focus);
    }, baseFocus);
  }, [
    activeWorkspace,
    draftEntryFocusOverride,
    selectedConversationSection,
    selectedApprovalId,
    selectedArtifactId,
    selectedEventCursor,
    selectedIncidentId,
    runtimeEntityDetail?.data.packageName,
    runtimeEntityDetail?.data.symbol,
    runtimeInspection?.data.mode,
    runtimeInspection?.data.packageName,
    runtimeInspection?.data.symbol,
    runtimeInspectionMode,
    runtimeInspectorPackage,
    selectedThreadId,
    selectedTurnId,
    selectedWorkItemId,
    sourcePreview?.data.focusLine,
    sourcePreview?.data.path
  ]);
  environmentFocusRef.current = environmentFocus;
  const environmentFocusLabel = useMemo(() => formatEnvironmentFocusLabel(environmentFocus), [environmentFocus]);
  const environmentFocusPresentation = useMemo(
    () =>
      buildEnvironmentFocusPresentation({
        focus: environmentFocus,
        focusLabel: environmentFocusLabel,
        selectedThread,
        selectedTurn,
        selectedApproval,
        selectedWorkItem,
        selectedIncident,
        selectedArtifact,
        selectedEvent: environmentEvents.find((event) => event.cursor === selectedEventCursor) ?? null
      }),
    [
      environmentEvents,
      environmentFocus,
      environmentFocusLabel,
      selectedApproval,
      selectedArtifact,
      selectedIncident,
      selectedEventCursor,
      selectedThread,
      selectedTurn,
      selectedWorkItem
    ]
  );
  const conversationDraftFocusActions = useMemo(() => {
    const baseActions = (() => {
      switch (environmentFocus.kind) {
      case "governance-approval":
        return [
          ...(environmentFocus.approvalId ?? selectedApproval?.requestId
            ? [{
                label: "Review Approval",
                onSelect: () => openApprovalRequest(environmentFocus.approvalId ?? selectedApproval?.requestId ?? "")
              }]
            : []),
          {
            label: "Open Actions",
            onSelect: () => navigateToWorkspace("environment")
          }
        ];
      case "governance-work-item":
        return [
          ...(environmentFocus.workItemId ?? selectedWorkItem?.workItemId
            ? [{
                label: "Open Work Item",
                onSelect: () => continueWorkItem(environmentFocus.workItemId ?? selectedWorkItem?.workItemId ?? "")
              }]
            : []),
          {
            label: "Open Governance",
            onSelect: () => navigateToExecutionSection("work")
          }
        ];
      case "governance-incident":
        return [
          ...(environmentFocus.incidentId ?? selectedIncident?.incidentId
            ? [{
                label: "Open Recovery",
                onSelect: () => continueRecovery(environmentFocus.incidentId ?? selectedIncident?.incidentId ?? "")
              }]
            : []),
          {
            label: "Inspect Evidence",
            onSelect: () => navigateToEvidenceSection("artifacts")
          }
        ];
      case "evidence-artifact":
        return [
          {
            label: "Open Evidence",
            onSelect: async () => {
              const artifactId = environmentFocus.artifactId ?? selectedArtifact?.artifactId ?? null;
              if (artifactId) {
                setSelectedArtifactId(artifactId);
              }
              await navigateToEvidenceSection("artifacts");
            }
          },
          {
            label: "Replay Events",
            onSelect: () => navigateToEvidenceSection("artifacts")
          }
        ];
      case "evidence-event":
        return [
          {
            label: "Replay Event",
            onSelect: () => navigateToEvidenceSection("artifacts")
          },
          {
            label: "Inspect Evidence",
            onSelect: () => navigateToEvidenceSection("artifacts")
          }
        ];
      case "runtime-symbol":
      case "source-artifact":
      case "runtime-scope":
        return [
          {
            label: "Open Browser Focus",
            onSelect: () => navigateToBrowserDomain(environmentFocus.sourcePath ? "source" : "symbols")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "conversation-turn":
        return [
          {
            label: "View Turn",
            onSelect: () => navigateToConversationSection("turns")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "conversation-thread":
      case "linked-conversation":
        return [
          {
            label: "View Thread",
            onSelect: () => navigateToConversationSection("threads")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "none":
      default:
        return [
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      }
    })();

    return [
      ...baseActions,
      ...(conversationDraft.trim().length > 0
        ? [{
            label: "Evaluate In Calculator",
            onSelect: () => openCalculatorWithExpression(conversationDraft, true)
          }]
        : []),
      {
        label: "Open Calculator",
        onSelect: () => {
          openCalculatorApplication();
        }
      },
      ...(latestCalculatorResult
        ? [{
            label: "Insert Calculator Result",
            onSelect: () => insertCalculatorResultIntoConversationDraft(latestCalculatorResult)
          }]
        : [])
    ];
  }, [
    conversationDraft,
    environmentFocus,
    latestCalculatorResult,
    navigateToBrowserDomain,
    navigateToConversationSection,
    navigateToDesktopPanel,
    navigateToEvidenceSection,
    navigateToExecutionSection,
    openCalculatorApplication,
    openCalculatorWithExpression,
    insertCalculatorResultIntoConversationDraft,
    continueRecovery,
    continueWorkItem,
    openApprovalRequest,
    selectedApproval?.requestId,
    selectedArtifact?.artifactId,
    selectedIncident?.incidentId,
    selectedWorkItem?.workItemId
  ]);
  const selectedConversationMessage =
    selectedThread?.messages.find((message) => message.messageId === selectedConversationMessageId) ??
    (selectedThread &&
    conversationStream &&
    conversationStream.threadId === selectedThread.threadId &&
    selectedConversationMessageId === `streaming-${conversationStream.turnId ?? selectedThread.threadId}` &&
    conversationStream.content.length > 0
      ? {
          messageId: `streaming-${conversationStream.turnId ?? selectedThread.threadId}`,
          role: "assistant" as const,
          content: conversationStream.content,
          createdAt: new Date().toISOString()
        }
      : null);
  const currentProjectReplFocus =
    currentProjectReplSessions.find((session) => session.sessionId === currentReplSessionId) ??
    currentProjectReplSessions[0] ??
    null;
  const currentWorkspaceDraft = currentProjectId
    ? workspaceDraftByProject[currentProjectId] ??
      ";; Workspace\n;; Draft forms here, evaluate them deliberately, and keep useful results for later promotion.\n\n(in-package :cl-user)\n\n(values)\n"
    : ";; Workspace\n;; Bind a project and environment to retain workspace state.\n";
  const currentWorkspacePackage = currentProjectId
    ? workspacePackageByProject[currentProjectId] ?? runtimeSummary?.currentPackage ?? "cl-user"
    : runtimeSummary?.currentPackage ?? "cl-user";
  const currentWorkspaceResult = currentProjectId ? workspaceResultByProject[currentProjectId] ?? null : null;
  const currentEditorScopeId = currentProjectId ?? UNBOUND_EDITOR_SCOPE_ID;
  const currentEditorBuffers = useMemo<EditorBufferStateDto[]>(() => {
    if (!currentProjectId) {
      return (
        editorBuffersByProject[UNBOUND_EDITOR_SCOPE_ID] ?? [
          createEditorBufferState({
            bufferId: "editor-buffer-unbound-main",
            title: DEFAULT_EDITOR_BUFFER_TITLE,
            draft: DEFAULT_EDITOR_UNBOUND_DRAFT,
            packageName: runtimeSummary?.currentPackage ?? "cl-user"
          })
        ]
      );
    }
    return (
      editorBuffersByProject[currentProjectId] ?? [
        createEditorBufferState({
          bufferId: `editor-buffer-${currentProjectId}-main`,
          title: DEFAULT_EDITOR_BUFFER_TITLE,
          draft: DEFAULT_EDITOR_BOUND_DRAFT,
          packageName: runtimeSummary?.currentPackage ?? "cl-user"
        })
      ]
    );
  }, [currentProjectId, editorBuffersByProject, runtimeSummary?.currentPackage]);
  const currentEditorBufferId =
    selectedEditorBufferIdByProject[currentEditorScopeId] ?? currentEditorBuffers[0]?.bufferId ?? null;
  const currentEditorBuffer =
    currentEditorBuffers.find((buffer) => buffer.bufferId === currentEditorBufferId) ?? currentEditorBuffers[0] ?? null;
  const currentEditorDraft = currentEditorBuffer?.draft ?? DEFAULT_EDITOR_UNBOUND_DRAFT;
  const currentEditorPackage = currentEditorBuffer?.packageName ?? runtimeSummary?.currentPackage ?? "cl-user";
  useEffect(() => {
    currentEditorScopeIdRef.current = currentEditorScopeId;
    currentEditorBufferIdRef.current = currentEditorBufferId;
    currentEditorPackageRef.current = currentEditorPackage;
  }, [currentEditorBufferId, currentEditorPackage, currentEditorScopeId]);
  const currentEditorResult = currentEditorBuffer?.result ?? null;
  const currentEditorBufferTitle = currentEditorBuffer?.title ?? DEFAULT_EDITOR_BUFFER_TITLE;
  const currentEditorBufferDirty = currentEditorBuffer?.dirty ?? false;
  const currentEditorSourceFilePath = currentEditorBuffer?.sourceFilePath ?? sourcePreview?.data.path ?? null;
  const currentEditorChangedFormCount = currentEditorBuffer
    ? countChangedEditorBufferForms(currentEditorBuffer.baselineDraft, currentEditorBuffer.draft)
    : 0;
  const currentWorkspaceHistory = currentProjectId ? workspaceHistoryByProject[currentProjectId] ?? [] : [];
  const transcriptEntries = useMemo<TranscriptSurfaceEntry[]>(
    () => {
      const conversationTranscriptEntries: TranscriptSurfaceEntry[] = [];
      if (selectedTurn) {
        conversationTranscriptEntries.push({
          key: `conversation-turn:${selectedTurn.turnId}`,
          timestamp: selectedTurn.createdAt,
          source: "conversation",
          title: "Conversation Turn",
          summary: `${selectedTurn.state} · ${selectedTurn.operations.length} action${selectedTurn.operations.length === 1 ? "" : "s"} · ${selectedTurn.artifactIds.length} artifact${selectedTurn.artifactIds.length === 1 ? "" : "s"}`,
          preview: selectedTurn.summary,
          status:
            selectedTurn.state === "awaiting_approval"
              ? "awaiting_approval"
              : selectedTurn.state === "failed"
                ? "error"
                : "ok",
          family: "conversation-turn",
          threadId: selectedTurn.threadId,
          turnId: selectedTurn.turnId
        });
        if (selectedTurn.userMessage) {
          conversationTranscriptEntries.push({
            key: `conversation-message:${selectedTurn.userMessage.messageId}`,
            timestamp: selectedTurn.userMessage.createdAt,
            source: "conversation",
            title: "User Prompt",
            summary: selectedTurn.userMessage.content.slice(0, 160) || "User prompt",
            preview: selectedTurn.userMessage.content,
            family: "conversation-user",
            threadId: selectedTurn.threadId,
            turnId: selectedTurn.turnId
          });
        }
        if (selectedTurn.assistantMessage) {
          conversationTranscriptEntries.push({
            key: `conversation-message:${selectedTurn.assistantMessage.messageId}`,
            timestamp: selectedTurn.assistantMessage.createdAt,
            source: "conversation",
            title: "Assistant Reply",
            summary: selectedTurn.assistantMessage.content.slice(0, 160) || "Assistant reply",
            preview: selectedTurn.assistantMessage.content,
            family: "conversation-assistant",
            threadId: selectedTurn.threadId,
            turnId: selectedTurn.turnId
          });
        }
        for (const operation of selectedTurn.operations) {
          conversationTranscriptEntries.push({
            key: `conversation-operation:${operation.operationId}`,
            timestamp: operation.completedAt ?? operation.startedAt,
            source: "conversation",
            title: operation.toolId ? `Action ${operation.toolId}` : operation.name,
            summary: operation.summary,
            preview: [operation.inputPreview, operation.outputPreview].filter(Boolean).join("\n\n"),
            status:
              operation.status === "awaiting-approval" || operation.status === "blocked"
                ? "awaiting_approval"
                : operation.status === "failed" || operation.status === "interrupted"
                  ? "error"
                  : "ok",
            family: operation.kind,
            threadId: selectedTurn.threadId,
            turnId: selectedTurn.turnId
          });
        }
      }
      return [
        ...conversationTranscriptEntries,
        ...currentWorkspaceHistory.map((entry) => ({
          key: `workspace:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "workspace" as const,
          title: "Workspace Evaluation",
          summary: entry.summary,
          preview: entry.valuePreview ?? null,
          form: entry.form,
          status: entry.status,
          family: "workspace"
        })),
        ...(currentProjectReplFocus?.history ?? []).map((entry) => ({
          key: `listener:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "listener" as const,
          title: currentProjectReplFocus?.title ?? "Listener Session",
          summary: entry.summary,
          preview: entry.valuePreview ?? null,
          form: entry.form,
          status: entry.status,
          family: currentProjectReplFocus?.packageName ?? "listener"
        })),
        ...environmentEvents.slice(0, 12).map((event) => ({
          key: `event:${event.cursor}`,
          timestamp: event.timestamp,
          source: "event" as const,
          title: event.kind,
          summary: event.summary,
          preview: event.entityId ?? event.turnId ?? event.threadId ?? null,
          family: event.family,
          threadId: event.threadId ?? null,
          turnId: event.turnId ?? null,
          eventCursor: event.cursor
        })),
        ...(environmentConsoleLogStream?.data.entries ?? []).slice(0, 40).map((entry) => ({
          key: `environment-console:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "environment-console" as const,
          title: entry.source,
          summary: entry.message,
          preview: [
            `${entry.type.toUpperCase()} · ${entry.category}`,
            entry.detail ?? null,
            entry.turnRefId ? `turn ${entry.turnRefId}` : null,
            entry.threadRefId ? `thread ${entry.threadRefId}` : null,
            entry.incidentId ? `incident ${entry.incidentId}` : null
          ]
            .filter((value): value is string => Boolean(value))
            .join("\n"),
          family: entry.category,
          threadId: entry.threadRefId ?? null,
          turnId: entry.turnRefId ?? null
        })),
        ...(hostConsoleLogStream?.data.entries ?? []).slice(0, 40).map((entry) => ({
          key: `host-console:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "host-console" as const,
          title: entry.source,
          summary: entry.message,
          preview: [
            `${entry.type.toUpperCase()} · ${entry.category}`,
            entry.processName ? `${entry.processName}${entry.pid ? ` (${entry.pid})` : ""}` : null,
            entry.detail ?? null
          ]
            .filter((value): value is string => Boolean(value))
            .join("\n"),
          family: entry.category
        })),
        ...(conversationStream?.content
          ? [
              {
                key: `stream:${conversationStream.turnId ?? conversationStream.threadId}`,
                timestamp: new Date().toISOString(),
                source: "listener" as const,
                title: "Conversation Stream",
                summary: "An assistant response is currently streaming into the active conversational runtime.",
                preview: conversationStream.content,
                family: "conversation-stream",
                threadId: conversationStream.threadId,
                turnId: conversationStream.turnId
              }
            ]
          : [])
      ].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    },
    [
      conversationStream?.content,
      conversationStream?.threadId,
      conversationStream?.turnId,
      currentProjectReplFocus,
      currentWorkspaceHistory,
      environmentConsoleLogStream?.data.entries,
      environmentEvents,
      hostConsoleLogStream?.data.entries,
      selectedTurn
    ]
  );
  const filteredTranscriptEntries = useMemo(
    () =>
      selectedTranscriptSourceFilter === "all"
        ? transcriptEntries
        : transcriptEntries.filter((entry) => entry.source === selectedTranscriptSourceFilter),
    [selectedTranscriptSourceFilter, transcriptEntries]
  );
  const selectedTranscriptEntry =
    filteredTranscriptEntries.find((entry) => entry.key === selectedTranscriptEntryKey) ??
    filteredTranscriptEntries[0] ??
    null;
  const memoryEntries = Array.isArray(memoryListResult?.data.entries) ? memoryListResult.data.entries : [];
  const selectedMemory =
    memoryEntries.find((entry) => entry.memoryId === selectedMemoryId) ?? memoryEntries[0] ?? null;
  useEffect(() => {
    const nextEntryKey = filteredTranscriptEntries[0]?.key ?? null;
    if (
      !filteredTranscriptEntries.some((entry) => entry.key === selectedTranscriptEntryKey) &&
      selectedTranscriptEntryKey !== nextEntryKey
    ) {
      setSelectedTranscriptEntryKey(nextEntryKey);
    }
  }, [filteredTranscriptEntries, selectedTranscriptEntryKey]);
  const queueThreads = threads;
  const queueApprovals = approvalRequests;
  const queueIncidents = incidents;
  const queueWorkItems = workItems;
  const queueArtifacts = artifacts;
  const prioritizedThreads = useMemo(
    () =>
      [...queueThreads].sort(
        (left, right) =>
          threadRecommendationScore(right) - threadRecommendationScore(left) ||
          right.latestActivityAt.localeCompare(left.latestActivityAt)
      ),
    [queueThreads]
  );
  const prioritizedWorkItems = useMemo(
    () =>
      [...queueWorkItems].sort(
        (left, right) => workItemRecommendationScore(right) - workItemRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueWorkItems]
  );
  const prioritizedApprovalRequests = useMemo(
    () =>
      [...queueApprovals].sort(
        (left, right) =>
          approvalRecommendationScore(right) - approvalRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueApprovals]
  );
  const prioritizedIncidents = useMemo(
    () =>
      [...queueIncidents].sort(
        (left, right) =>
          incidentRecommendationScore(right) - incidentRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueIncidents]
  );
  const primaryThreadTarget =
    prioritizedThreads[0] ?? (selectedThreadId ? queueThreads.find((thread) => thread.threadId === selectedThreadId) ?? null : null);
  const primaryWorkItemTarget =
    prioritizedWorkItems[0] ?? (selectedWorkItemId ? queueWorkItems.find((item) => item.workItemId === selectedWorkItemId) ?? null : null);
  const primaryApprovalTarget =
    prioritizedApprovalRequests[0] ??
    (selectedApprovalId ? queueApprovals.find((request) => request.requestId === selectedApprovalId) ?? null : null);
  const primaryIncidentTarget =
    prioritizedIncidents[0] ?? (selectedIncidentId ? queueIncidents.find((incident) => incident.incidentId === selectedIncidentId) ?? null : null);
  const primaryArtifactTarget =
    (selectedArtifactId ? queueArtifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? null : null) ?? queueArtifacts[0] ?? null;
  const dockJumpTargets = [
    runtimeSummary
      ? {
          id: `listener:${runtimeSummary.runtimeId}`,
          label: "Listener",
          title: currentProjectReplFocus?.title ?? "Live Listener Workbench",
          stateLabel: status?.runtimeState ?? "warm",
          shortcutKey: "L",
          recommendationReason:
            status?.runtimeState === "recovering"
              ? "The runtime itself is unstable. Open the listener workbench first so recovery happens at the native image boundary."
              : "The live image is available. The listener workbench is the most direct path into governed runtime execution.",
          score: status?.runtimeState === "recovering" ? 150 : 42 + currentProjectReplSessions.length * 4,
          tone: status?.runtimeState === "recovering" ? "danger" : ("active" as const),
          onJump: () => {
            void openListenerWorkbench();
          }
        }
      : null,
    primaryThreadTarget
      ? {
          id: `thread:${primaryThreadTarget.threadId}`,
          label: "Thread",
          title: primaryThreadTarget.title,
          stateLabel: primaryThreadTarget.state,
          shortcutKey: "T",
          recommendationReason: primaryThreadRecommendationReason(primaryThreadTarget),
          score: threadRecommendationScore(primaryThreadTarget),
          tone: toneForThreadState(primaryThreadTarget.state),
          onJump: () => {
            setSelectedThreadId(primaryThreadTarget.threadId);
            void navigateToConversationSection("threads");
          }
        }
      : null,
    primaryWorkItemTarget
      ? {
          id: `work:${primaryWorkItemTarget.workItemId}`,
          label: "Work",
          title: primaryWorkItemTarget.title,
          stateLabel: primaryWorkItemTarget.state,
          shortcutKey: "W",
          recommendationReason: primaryWorkRecommendationReason(primaryWorkItemTarget),
          score: workItemRecommendationScore(primaryWorkItemTarget),
          tone: toneForWorkState(primaryWorkItemTarget.state),
          onJump: () => {
            setSelectedWorkItemId(primaryWorkItemTarget.workItemId);
            void navigateToExecutionSection("work");
          }
        }
      : null,
    primaryApprovalTarget
      ? {
          id: `approval:${primaryApprovalTarget.requestId}`,
          label: "Approval",
          title: primaryApprovalTarget.title,
          stateLabel: primaryApprovalTarget.state,
          shortcutKey: "A",
          recommendationReason: primaryApprovalRecommendationReason(primaryApprovalTarget),
          score: approvalRecommendationScore(primaryApprovalTarget),
          tone: toneForApprovalState(primaryApprovalTarget.state),
          onJump: () => {
            setSelectedApprovalId(primaryApprovalTarget.requestId);
            void navigateToWorkspace("environment");
          }
        }
      : null,
    primaryIncidentTarget
      ? {
          id: `incident:${primaryIncidentTarget.incidentId}`,
          label: "Recovery",
          title: primaryIncidentTarget.title,
          stateLabel: primaryIncidentTarget.state,
          shortcutKey: "R",
          recommendationReason: primaryIncidentRecommendationReason(primaryIncidentTarget),
          score: incidentRecommendationScore(primaryIncidentTarget),
          tone: toneForIncidentSeverity(primaryIncidentTarget.severity),
          onJump: () => {
            setSelectedIncidentId(primaryIncidentTarget.incidentId);
            void navigateToRecoverySection("incidents");
          }
        }
      : null,
    primaryArtifactTarget
      ? {
          id: `artifact:${primaryArtifactTarget.artifactId}`,
          label: "Artifact",
          title: primaryArtifactTarget.title,
          stateLabel: "ready",
          shortcutKey: "E",
          recommendationReason: "Recent evidence remains available for direct inspection.",
          score: artifactRecommendationScore(primaryArtifactTarget),
          tone: "steady",
          onJump: () => {
            setSelectedArtifactId(primaryArtifactTarget.artifactId);
            void navigateToEvidenceSection("artifacts");
          }
        }
      : null
  ].filter((target): target is DockJumpTarget => Boolean(target));
  const dockRecommendedTargetId = dockJumpTargets.reduce<string | null>(
    (bestId, target) => {
      if (!bestId) {
        return target.id;
      }
      const bestTarget = dockJumpTargets.find((item) => item.id === bestId);
      if (!bestTarget) {
        return target.id;
      }
      return target.score > bestTarget.score ? target.id : bestId;
    },
    null
  );
  const rankedDockJumpTargets = dockJumpTargets
    .map((target) => ({ ...target, recommended: target.id === dockRecommendedTargetId }))
    .sort((left, right) => Number(Boolean(right.recommended)) - Number(Boolean(left.recommended)) || right.score - left.score);
  const recommendedDockJumpTarget = rankedDockJumpTargets.find((target) => target.recommended) ?? null;
  const dashboardActionQueue = useMemo<ActionQueueItem[]>(() => {
    return buildDashboardActionQueue({
      desktopTaskRecords,
      orchestrationInbox,
      prioritizedApprovalRequests,
      prioritizedIncidents,
      prioritizedThreads,
      prioritizedWorkItems,
      queueArtifacts,
      runtimeSummary,
      status
    });
  }, [desktopTaskRecords, orchestrationInbox, prioritizedApprovalRequests, prioritizedIncidents, prioritizedThreads, prioritizedWorkItems, queueArtifacts, runtimeSummary?.currentPackage, runtimeSummary?.runtimeId, status?.runtimeState, status?.workflowState]);
  const browserWorkspaceProps = useMemo(
    () => ({
      approvalRequests,
      orchestrationInbox,
      artifacts,
      browseRuntimeEntity,
      conversationDraft,
      environmentId: effectiveEnvironmentId,
      environmentFocus,
      incidents,
      inspectRuntimeSymbol,
      isDecidingApproval,
      isEditingSource,
      isInspectingRuntime,
      isReloadingSource,
      isStagingSource,
      loadSourcePreview,
      consoleLogStream,
      desktopTaskRecords,
      diagnosticReports,
      navigateToWorkspace: (workspaceId: WorkspaceId) => {
        void navigateToWorkspace(workspaceId);
      },
      packageBrowser,
      parenDepthColors: lispParenColors,
      reloadSourceFile,
      runtimeEntityDetail,
      runtimeForm,
      runtimeInspection,
      runtimeInspectionMode,
      runtimeInspectorPackage,
      runtimeInspectorSymbol,
      runtimeSummary,
      runtimeTelemetry,
      selectedDomain: selectedBrowserDomain,
      selectedTelemetryProcessId,
      selectedPackageName,
      selectedThread,
      selectedThreadId,
      setConversationDraft,
      setIsEditingSource,
      setRuntimeForm,
      setRuntimeInspectionMode: updateRuntimeInspectionMode,
      setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
      setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
      setSelectedConsolePlane,
      setSelectedConsoleSourceFilter,
      setSelectedConsoleEntryId,
      setSelectedDiagnosticSourceFilter,
      setSelectedDiagnosticReportId,
      setSelectedPackageName,
      setSelectedTelemetryProcessId,
      setSelectedThreadId: selectConversationThread,
      setSourceDraft,
      sourceDraft,
      sourceMutationResult,
      sourcePreview,
      sourceReloadResult,
      stageSourceChange,
      selectedConsolePlane,
      selectedConsoleSourceFilter,
      documentationPages,
      selectedDocumentationSlug,
      selectedConsoleEntryId,
      selectedDiagnosticSourceFilter,
      selectedDiagnosticReport,
      selectedDiagnosticReportId,
      onOpenApprovalRequest: openApprovalRequest,
      onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => {
        void submitApprovalDecisionForRequest(requestId, decision);
      },
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      loadDocumentationPage,
      threads,
      workItems
    }),
    [approvalRequests, orchestrationInbox, artifacts, browseRuntimeEntity, conversationDraft, effectiveEnvironmentId, environmentFocus, incidents, inspectRuntimeSymbol, isDecidingApproval, isEditingSource, isInspectingRuntime, isReloadingSource, isStagingSource, loadSourcePreview, consoleLogStream, desktopTaskRecords, diagnosticReports, navigateToWorkspace, packageBrowser, lispParenColors, reloadSourceFile, runtimeEntityDetail, runtimeForm, runtimeInspection, runtimeInspectionMode, runtimeInspectorPackage, runtimeInspectorSymbol, runtimeSummary, runtimeTelemetry, selectedBrowserDomain, selectedTelemetryProcessId, selectedPackageName, selectedThread, selectedThreadId, setConversationDraft, setIsEditingSource, setRuntimeForm, updateRuntimeInspectionMode, updateRuntimeInspectorPackage, updateRuntimeInspectorSymbol, setSelectedConsolePlane, setSelectedConsoleSourceFilter, setSelectedConsoleEntryId, setSelectedDiagnosticSourceFilter, setSelectedDiagnosticReportId, setSelectedPackageName, setSelectedTelemetryProcessId, setSelectedThreadId, setSourceDraft, sourceDraft, sourceMutationResult, sourcePreview, sourceReloadResult, stageSourceChange, selectedConsolePlane, selectedConsoleSourceFilter, documentationPages, selectedDocumentationSlug, selectedConsoleEntryId, selectedDiagnosticSourceFilter, selectedDiagnosticReport, selectedDiagnosticReportId, openApprovalRequest, submitApprovalDecisionForRequest, loadDocumentationPage, threads, workItems]
  );
  const projectsWorkspaceProps = useMemo(
    () => ({
      approvalRequests,
      orchestrationInbox,
      currentProjectId,
      isDecidingApproval,
      onAddArchitectureDecision: openProjectArchitectureDecisionDialog,
      onAddFeatureSpecification: openProjectFeatureSpecificationDialog,
      onAddQualityGate: openProjectQualityGateDialog,
      onAddRequirement: openProjectRequirementDialog,
      onAddSourceRoot: openProjectSourceRootDialog,
      onAddUserJourney: openProjectUserJourneyDialog,
      onBindTestingHarness: () => void openProjectTestingHarnessDialog(),
      onEditDesignSystem: openProjectDesignSystemDialog,
      onEditStyleGuide: openProjectStyleGuideDialog,
      onEditTestingStrategy: () => void openProjectTestingStrategyDialog(),
      onEditReleaseReadiness: openProjectReleaseReadinessDialog,
      onEditReadinessObligations: openProjectReadinessObligationsDialog,
      onCreateProjectDialog: () => setIsProjectCreateDialogOpen(true),
      onEditConstitution: openProjectConstitutionDialog,
      onOpenProjectDialog: () => setIsProjectOpenDialogOpen(true),
      onOpenApprovalRequest: openApprovalRequest,
      onSelectProject: setSelectedGovernedProjectId,
      onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => {
        void submitApprovalDecisionForRequest(requestId, decision);
      },
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      projectSummaries: projectListResult?.data.projects ?? [],
      selectedProjectDetail,
      selectedProjectId: selectedGovernedProjectId,
      workItems
    }),
    [approvalRequests, orchestrationInbox, currentProjectId, isDecidingApproval, openProjectArchitectureDecisionDialog, openProjectFeatureSpecificationDialog, openProjectQualityGateDialog, openProjectRequirementDialog, openProjectSourceRootDialog, openProjectUserJourneyDialog, openProjectTestingHarnessDialog, openProjectDesignSystemDialog, openProjectStyleGuideDialog, openProjectTestingStrategyDialog, openProjectReleaseReadinessDialog, openProjectReadinessObligationsDialog, setIsProjectCreateDialogOpen, openProjectConstitutionDialog, setIsProjectOpenDialogOpen, openApprovalRequest, setSelectedGovernedProjectId, submitApprovalDecisionForRequest, projectListResult?.data.projects, selectedProjectDetail, selectedGovernedProjectId, workItems]
  );
  useEffect(() => {
    void initializeEnvironmentLifecycle({
      startupImageSelectionHandledRef,
      setEnvironmentImageRegistry,
      setEnvironmentSaveAsNameDraft,
      setIsEnvironmentImageChooserOpen,
      refreshEnvironmentImageRegistry,
      loadInitialState,
      setErrorMessage
    });
  }, []);

  useEffect(() => {
    if (!desktopPreferencesHydratedRef.current) {
      return;
    }

    if (desktopPreferencesPersistTimeoutRef.current !== null) {
      window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
    }

    desktopPreferencesPersistTimeoutRef.current = window.setTimeout(() => {
      void persistRichDesktopPreferences();
    }, 250);

    return () => {
      if (desktopPreferencesPersistTimeoutRef.current !== null) {
        window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
        desktopPreferencesPersistTimeoutRef.current = null;
      }
    };
  }, [
    conversationDraft,
    editorBuffersByProject,
    persistRichDesktopPreferences,
    selectedBrowserDomain,
    selectedConfigurationSection,
    selectedEditorBufferIdByProject,
    workspaceDraftByProject,
    workspaceHistoryByProject,
    workspacePackageByProject,
    workspaceResultByProject
  ]);

  useEffect(() => {
    if (!desktopPreferencesHydratedRef.current) {
      return;
    }

    const flushRichDesktopPreferencesOnExit = () => {
      if (suppressExitDesktopPreferencesFlushRef.current) {
        return;
      }
      void flushRichDesktopPreferences();
      void persistShellDesktopPreferences();
    };

    window.addEventListener("pagehide", flushRichDesktopPreferencesOnExit);
    window.addEventListener("beforeunload", flushRichDesktopPreferencesOnExit);

    return () => {
      window.removeEventListener("pagehide", flushRichDesktopPreferencesOnExit);
      window.removeEventListener("beforeunload", flushRichDesktopPreferencesOnExit);
    };
  }, [flushRichDesktopPreferences, persistShellDesktopPreferences]);

  useEffect(() => {
    const title = currentProject?.title ?? summary?.environmentLabel ?? "Surface";
    void window.sbclAgentDesktop.desktop.setWindowTitle(title);
  }, [currentProject?.title, summary?.environmentLabel]);

  useEffect(() => {
    let active = true;
    let subscriptionId: string | null = null;

    void window.sbclAgentDesktop.desktop
      .subscribeMenuActions((action) => {
        if (!active) {
          return;
        }

        if (action === "project:new") {
          setNewProjectTitleDraft(summary?.environmentLabel ?? summary?.environmentId ?? binding?.environmentId ?? "");
          setIsProjectCreateDialogOpen(true);
          return;
        }

        if (action === "project:save") {
          void handleSaveCurrentProject();
          return;
        }

        if (action === "project:open") {
          setIsProjectOpenDialogOpen(true);
          return;
        }

        if (action === "application:calculator") {
          openCalculatorApplication();
          return;
        }

        if (action === "app:request-quit") {
          openEnvironmentExitDialog();
        }
      })
      .then((handle) => {
        subscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (subscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(subscriptionId);
      }
    };
  }, [
    binding?.environmentId,
    environmentImageRegistry?.currentImageName,
    handleSaveCurrentProject,
    summary?.environmentId,
    summary?.environmentLabel
  ]);

  useEffect(() => {
    setSelectedConversationMessageId(null);
  }, [selectedThreadId]);

  useEffect(() => {
    void loadDocumentationPages();
  }, []);

  useEffect(() => {
    setIsWorkspaceTransitioning(true);
    const timeout = window.setTimeout(() => {
      setIsWorkspaceTransitioning(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [activeWorkspace]);

  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const shortcutIndex = Number(event.key) - 1;
      if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex >= keyboardWorkspaceOrder.length) {
        return;
      }

      const workspace = keyboardWorkspaceOrder[shortcutIndex];
      if (!workspace) {
        return;
      }

      event.preventDefault();
      void navigateToWorkspace(workspace);
    }

    window.addEventListener("keydown", handleWorkspaceShortcut);

    return () => {
      window.removeEventListener("keydown", handleWorkspaceShortcut);
    };
  }, []);

  useEffect(() => {
    function handleCommandCenterShortcut(event: KeyboardEvent): void {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setIsCommandCenterOpen((current) => !current);
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsCommandCenterOpen(false);
      }
    }

    window.addEventListener("keydown", handleCommandCenterShortcut);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleCommandCenterShortcut);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    function handleDockShortcut(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toUpperCase();
      if (key === "N" && recommendedDockJumpTarget) {
        event.preventDefault();
        recommendedDockJumpTarget.onJump();
        return;
      }

      const dockTarget = rankedDockJumpTargets.find((candidate) => candidate.shortcutKey === key);
      if (!dockTarget) {
        return;
      }

      event.preventDefault();
      dockTarget.onJump();
    }

    window.addEventListener("keydown", handleDockShortcut);

    return () => {
      window.removeEventListener("keydown", handleDockShortcut);
    };
  }, [rankedDockJumpTargets, recommendedDockJumpTarget]);

  useEffect(() => {
    function handleViewportResize(): void {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    function clearActiveTooltipTarget(): void {
      if (activeTooltipTargetRef.current && activeTooltipTitleRef.current !== null) {
        activeTooltipTargetRef.current.setAttribute("title", activeTooltipTitleRef.current);
      }
      activeTooltipTargetRef.current = null;
      activeTooltipTitleRef.current = null;
    }

    function tooltipTargetFromNode(node: EventTarget | null): HTMLElement | null {
      if (!(node instanceof HTMLElement)) {
        return null;
      }
      const candidate = node.closest<HTMLElement>("[data-tooltip],[title]");
      if (!candidate || !shellRef.current?.contains(candidate)) {
        return null;
      }
      return candidate;
    }

    function tooltipLabelForTarget(target: HTMLElement): string | null {
      return target.getAttribute("data-tooltip") ?? activeTooltipTitleRef.current ?? target.getAttribute("title");
    }

    function updateTooltipPosition(clientX: number, clientY: number, label: string): void {
      const left = Math.max(12, Math.min(clientX + 14, viewportWidth - 240));
      const top = Math.max(12, clientY - 42);
      setShellTooltip({ label, x: left, y: top });
    }

    function activateTooltip(target: HTMLElement, clientX: number, clientY: number): void {
      if (activeTooltipTargetRef.current !== target) {
        clearActiveTooltipTarget();
        activeTooltipTargetRef.current = target;
        activeTooltipTitleRef.current = target.getAttribute("title");
        if (activeTooltipTitleRef.current !== null) {
          target.removeAttribute("title");
        }
      }
      const label = tooltipLabelForTarget(target);
      if (!label) {
        setShellTooltip(null);
        return;
      }
      updateTooltipPosition(clientX, clientY, label);
    }

    function handlePointerOver(event: PointerEvent): void {
      const target = tooltipTargetFromNode(event.target);
      if (!target) {
        return;
      }
      activateTooltip(target, event.clientX, event.clientY);
    }

    function handlePointerMove(event: PointerEvent): void {
      if (!activeTooltipTargetRef.current) {
        return;
      }
      const label = tooltipLabelForTarget(activeTooltipTargetRef.current);
      if (!label) {
        setShellTooltip(null);
        return;
      }
      updateTooltipPosition(event.clientX, event.clientY, label);
    }

    function handlePointerOut(event: PointerEvent): void {
      const currentTarget = activeTooltipTargetRef.current;
      if (!currentTarget) {
        return;
      }
      if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) {
        return;
      }
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    function handleFocusIn(event: FocusEvent): void {
      const target = tooltipTargetFromNode(event.target);
      if (!target) {
        return;
      }
      const rect = target.getBoundingClientRect();
      activateTooltip(target, rect.left + rect.width / 2, rect.top);
    }

    function handleFocusOut(): void {
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    function handleWindowBlur(): void {
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("blur", handleWindowBlur);
      clearActiveTooltipTarget();
    };
  }, [viewportWidth]);

  useEffect(() => {
    function updateSplitterLayout(): void {
      if (!shellRef.current || !canvasPanelRef.current) {
        return;
      }

      const shellRect = shellRef.current.getBoundingClientRect();
      const panelElements = [
        sidebarPanelRef.current,
        canvasPanelRef.current,
        inspectorPanelRef.current
      ].filter((element): element is HTMLElement => Boolean(element));
      const panelRects = panelElements
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.height > 0 && rect.width > 0);

      if (panelRects.length === 0) {
        const gap = shellGapForViewport(viewportWidth);
        const titleStripHeight = 34;
        setSplitterLayout({
          top: titleStripHeight + gap,
          bottom: gap,
          left: 0,
          right: 0
        });
        return;
      }

      const top = Math.min(...panelRects.map((rect) => rect.top)) - shellRect.top;
      const bottom = shellRect.bottom - Math.max(...panelRects.map((rect) => rect.bottom));
      const canvasRect = canvasPanelRef.current.getBoundingClientRect();
      const sidebarRect = sidebarPanelRef.current?.getBoundingClientRect() ?? canvasRect;
      const inspectorRect = inspectorPanelRef.current?.getBoundingClientRect() ?? canvasRect;
      const leftGapCenter = sidebarRect.right + (canvasRect.left - sidebarRect.right) / 2;
      const rightGapCenter = canvasRect.right + (inspectorRect.left - canvasRect.right) / 2;

      const leftSplitterHalfWidth = 8;
      const rightSplitterHalfWidth = 24;
      setSplitterLayout({
        top: Math.max(0, top),
        bottom: Math.max(0, bottom),
        left: leftGapCenter - shellRect.left - leftSplitterHalfWidth,
        right: shellRect.right - rightGapCenter - rightSplitterHalfWidth
      });
    }

    updateSplitterLayout();
    window.addEventListener("resize", updateSplitterLayout);
    const resizeObserver = new ResizeObserver(() => updateSplitterLayout());
    if (shellRef.current) {
      resizeObserver.observe(shellRef.current);
    }
    if (sidebarPanelRef.current) {
      resizeObserver.observe(sidebarPanelRef.current);
    }
    if (canvasPanelRef.current) {
      resizeObserver.observe(canvasPanelRef.current);
    }
    if (inspectorPanelRef.current) {
      resizeObserver.observe(inspectorPanelRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateSplitterLayout);
      resizeObserver.disconnect();
    };
  }, [viewportWidth, sidebarPinned, canvasPinned, inspectorPinned, sidebarWidth, inspectorWidth, activeWorkspace]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? "dark" : "light");
    };

    updateSystemTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = themePreference === "system" ? systemTheme : themePreference;
  const configurationWorkspaceProps = useMemo(
    () => ({
      configurationSections,
      lispParenColors,
      normalizeParenDepthColors,
      resolvedTheme,
      selectedSection: selectedConfigurationSection,
      setSelectedSection: setSelectedConfigurationSection,
      systemTheme,
      themePreference,
      tooltipScalePercent,
      controlIconScalePercent,
      dockIconScalePercent,
      conversationTextScalePercent,
      sourceCodeTextScalePercent,
      providerSummary,
      packageManagementSummary,
      desktopTaskManifests,
      desktopTaskRecords,
      desktopTaskActorTrace,
      desktopTaskDeadLetters,
      mcpServerConfigs
    }),
    [configurationSections, lispParenColors, normalizeParenDepthColors, resolvedTheme, selectedConfigurationSection, setSelectedConfigurationSection, systemTheme, themePreference, tooltipScalePercent, controlIconScalePercent, dockIconScalePercent, conversationTextScalePercent, sourceCodeTextScalePercent, providerSummary, packageManagementSummary, desktopTaskManifests, desktopTaskRecords, desktopTaskActorTrace, desktopTaskDeadLetters, mcpServerConfigs]
  );
  const operateWorkspaceProps = useMemo(
    () => ({
      actionQueue: dashboardActionQueue,
      approvalRequests,
      artifacts,
      incidents,
      isDecidingApproval,
      navigateToConversationSection,
      navigateToEvidenceSection,
      navigateToExecutionSection,
      navigateToRecoverySection,
      openApprovalRequest,
      orchestrationInbox,
      selectedApproval,
      selectedApprovalId,
      selectedArtifactId,
      selectedIncidentId,
      status,
      summary,
      selectedWorkItemId,
      submitApprovalDecisionForRequest: (requestId: string, decision: "approve" | "deny") => {
        void submitApprovalDecisionForRequest(requestId, decision);
      },
      workItems
    }),
    [dashboardActionQueue, approvalRequests, artifacts, incidents, isDecidingApproval, navigateToConversationSection, navigateToEvidenceSection, navigateToExecutionSection, navigateToRecoverySection, openApprovalRequest, orchestrationInbox, selectedApproval, selectedApprovalId, selectedArtifactId, selectedIncidentId, status, summary, selectedWorkItemId, submitApprovalDecisionForRequest, workItems]
  );
  const executionWorkspaceProps = useMemo(
    () => ({
      actorSystemPanel: desktopTaskActorSystemPanel,
      approvalRequests,
      createReplSession: handleCreateReplSession,
      currentReplSessionId,
      evaluateRuntimeForm,
      isEvaluating,
      inspectRuntimeSymbol,
      isInspectingRuntime,
      replSessionTitleDraft,
      replSessions: currentProjectReplSessions,
      runtimeForm,
      runtimeInspection,
      runtimeInspectionMode,
      runtimeInspectorPackage,
      runtimeInspectorSymbol,
      runtimeResult,
      runtimeSummary,
      orchestrationFocus,
      orchestrationSnapshot,
      planVerification,
      selectedWorkflowRecord,
      selectedWorkItem,
      selectedWorkItemId,
      setReplSessionTitleDraft,
      setRuntimeForm,
      setRuntimeInspectionMode: updateRuntimeInspectionMode,
      setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
      setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
      switchReplSession: handleSwitchReplSession,
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      workItems
    }),
    [desktopTaskActorSystemPanel, approvalRequests, handleCreateReplSession, currentReplSessionId, evaluateRuntimeForm, isEvaluating, inspectRuntimeSymbol, isInspectingRuntime, replSessionTitleDraft, currentProjectReplSessions, runtimeForm, runtimeInspection, runtimeInspectionMode, runtimeInspectorPackage, runtimeInspectorSymbol, runtimeResult, runtimeSummary, orchestrationFocus, orchestrationSnapshot, planVerification, selectedWorkflowRecord, selectedWorkItem, selectedWorkItemId, setReplSessionTitleDraft, setRuntimeForm, updateRuntimeInspectionMode, updateRuntimeInspectorPackage, updateRuntimeInspectorSymbol, handleSwitchReplSession, workItems]
  );
  const incidentsWorkspaceProps = useMemo(
    () => ({
      clearPendingIncidentFocusId: () => setPendingIncidentFocusId(null),
      environmentFocusLabel,
      incidents,
      navigateToLinkedEntity,
      openIncidentRemediationPlanDialog,
      openConversationDraft: () =>
        openConversationDraftWithFocusOverride({
          ...createDefaultEnvironmentFocusState(),
          kind: "governance-incident",
          sourceWorkspace: "incidents",
          sourceSurface: "incidents",
          incidentId: selectedIncidentId
        }),
      openConversationDraftForRestartSuggestion: (restartLabel: string) =>
        openConversationDraftForIncidentRestartSuggestion(restartLabel),
      openListenerWorkbenchForRestartSuggestion: (restartLabel: string) =>
        openListenerWorkbenchForIncidentRestartSuggestion(restartLabel),
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      pendingIncidentFocusId,
      selectedIncident,
      selectedIncidentId,
      setSelectedIncidentId
    }),
    [setPendingIncidentFocusId, environmentFocusLabel, incidents, navigateToLinkedEntity, openIncidentRemediationPlanDialog, openConversationDraftWithFocusOverride, selectedIncidentId, openConversationDraftForIncidentRestartSuggestion, openListenerWorkbenchForIncidentRestartSuggestion, pendingIncidentFocusId, selectedIncident, setSelectedIncidentId]
  );
  const workWorkspaceProps = useMemo(
    () => ({
      approvalRequests,
      clearPendingWorkItemFocusId: () => setPendingWorkItemFocusId(null),
      environmentFocusLabel,
      isDecidingApproval,
      navigateToLinkedEntity,
      openApprovalRequest,
      openCompleteWorkItemValidationsDialog: openWorkItemValidationDialog,
      openConversationDraft: () =>
        openConversationDraftWithFocusOverride({
          ...createDefaultEnvironmentFocusState(),
          kind: "governance-work-item",
          sourceWorkspace: "runtime",
          sourceSurface: "operate",
          workItemId: selectedWorkItemId
        }),
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      openQuarantineWorkItemDialog: openWorkItemQuarantineDialog,
      openResumeWorkItemDialog: openWorkItemResumeDialog,
      openRollbackWorkItemDialog: openWorkItemRollbackDialog,
      openSteerWorkItemDialog: openWorkItemSteerDialog,
      pendingWorkItemFocusId,
      orchestrationFocus,
      orchestrationSnapshot,
      planVerification,
      selectedWorkflowRecord,
      selectedWorkItem,
      selectedWorkItemPlan,
      selectedWorkItemId,
      setSelectedWorkItemId,
      submitApprovalDecisionForRequest,
      workItems
    }),
    [approvalRequests, setPendingWorkItemFocusId, environmentFocusLabel, isDecidingApproval, navigateToLinkedEntity, openApprovalRequest, openWorkItemValidationDialog, openConversationDraftWithFocusOverride, selectedWorkItemId, openWorkItemQuarantineDialog, openWorkItemResumeDialog, openWorkItemRollbackDialog, openWorkItemSteerDialog, pendingWorkItemFocusId, orchestrationFocus, orchestrationSnapshot, planVerification, selectedWorkflowRecord, selectedWorkItem, selectedWorkItemPlan, setSelectedWorkItemId, submitApprovalDecisionForRequest, workItems]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    normalizeParenDepthColors(lispParenColors).forEach((color, index) => {
      document.documentElement.style.setProperty(`--lisp-paren-depth-${index + 1}`, color);
    });
  }, [lispParenColors]);

  useWorkspaceLoadEffects({
    activeWorkspace,
    effectiveEnvironmentId,
    selectedGovernedProjectId,
    loadProjectWorkspace,
    refreshDesktopTaskActorSystemPanel,
    loadMemoryWorkspace,
    loadProjectDetail,
    loadConversationWorkspace,
    loadRuntimeWorkspace,
    loadRuntimeTelemetry,
    loadWorkWorkspace,
    loadApprovalWorkspace,
    loadArtifactsWorkspace,
    loadIncidentWorkspace
  });


  useEffect(() => {
    if (selectedTurnId && effectiveEnvironmentId) {
      if (selectedTurn?.turnId === selectedTurnId) {
        return;
      }
      void loadTurnDetail(selectedTurnId, effectiveEnvironmentId);
    }
  }, [selectedTurnId, effectiveEnvironmentId, selectedTurn?.turnId]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    const selectedBufferId = selectedEditorBufferIdByProject[currentProjectId];
    const firstBufferId = currentEditorBuffers[0]?.bufferId ?? null;
    if (!firstBufferId) {
      return;
    }
    if (selectedBufferId && currentEditorBuffers.some((buffer) => buffer.bufferId === selectedBufferId)) {
      return;
    }
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: firstBufferId
    }));
  }, [currentEditorBuffers, currentProjectId, selectedEditorBufferIdByProject]);

  useEnvironmentRefreshEffects({
    activeWorkspace,
    effectiveEnvironmentId,
    selectedBrowserDomain,
    refreshProviderSummary,
    refreshPackageManagementSummary,
    refreshDesktopTaskManifests,
    refreshDesktopTaskRecords,
    refreshDesktopTaskActorTrace,
    refreshDesktopTaskDeadLetters,
    refreshPendingConversationApproval,
    refreshMcpServerConfigs
  });

  useEffect(() => {
    if (selectedConfigurationSection !== "mcp-servers") {
      return;
    }
    const selected =
      mcpServerConfigs.find((entry) => entry.id === selectedMcpServerId) ?? mcpServerConfigs[0] ?? null;
    if (selected) {
      setMcpServerDraft(buildMcpServerDraft(selected));
      if (!selectedMcpServerId) {
        setSelectedMcpServerId(selected.id);
      }
    }
  }, [selectedConfigurationSection, selectedMcpServerId, mcpServerConfigs]);

  useBrowserTranscriptEffects({
    activeWorkspace,
    effectiveEnvironmentId,
    selectedBrowserDomain,
    selectedConsolePlane,
    eventFamilyFilter,
    eventVisibilityFilter,
    selectedTranscriptSourceFilter,
    isTranscriptEventRefreshActive,
    setIsTranscriptEventRefreshActive,
    pendingTranscriptRefreshTimerRef,
    loadRuntimeTelemetry,
    loadConsoleLogStream,
    loadTranscriptWorkspace,
    shouldLoadTranscriptActivityEntries,
    shouldLoadTranscriptConsoleEntries,
    shouldSubscribeTranscriptEnvironmentEvents,
    shouldRefreshTranscriptFromEvent,
    scheduleTranscriptEventRefresh
  });

  useDetailLoadEffects({
    activeWorkspace,
    effectiveEnvironmentId,
    selectedBrowserDomain,
    runtimeSummary,
    selectedPackageName,
    runtimeInspection,
    sourcePreview,
    selectedApprovalId,
    selectedIncidentId,
    incidentCount: incidents.length,
    openIncidentCount: summary?.attention.openIncidents ?? 0,
    selectedWorkItemId,
    workItemCount: workItems.length,
    blockedWorkCount: summary?.attention.blockedWork ?? 0,
    selectedArtifactId,
    documentationPages,
    selectedDocumentationPage,
    selectedDocumentationSlug,
    eventFamilyFilter,
    eventVisibilityFilter,
    loadDiagnosticReports,
    selectedDiagnosticReportId,
    loadDiagnosticReportDetail,
    loadPackageBrowser,
    loadSourcePreview,
    loadRuntimeEntityDetail,
    loadApprovalDetail,
    loadIncidentWorkspace,
    loadIncidentDetail,
    loadWorkWorkspace,
    loadWorkItemDetail,
    loadActivityWorkspace,
    loadArtifactsWorkspace,
    loadDocumentationPages,
    loadDocumentationPage,
    loadArtifactDetail
  });

  useEffect(() => {
    setSourceDraft(sourcePreview?.data.editableContent ?? "");
    setIsEditingSource(false);
    setSourceMutationResult(null);
    setSourceReloadResult(null);
  }, [sourcePreview?.data.path, sourcePreview?.data.editableContent]);

  useEffect(() => {
    if (!currentProjectId || !selectedThreadId) {
      return;
    }

    void persistConversationThreadSelection(currentProjectId, selectedThreadId);
  }, [currentProjectId, selectedThreadId]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    const sessions = replSessionsByProject[currentProjectId];
    if (!sessions || sessions.length === 0) {
      return;
    }

    const currentSessionId = currentReplSessionIdByProject[currentProjectId] ?? sessions[0]?.sessionId;
    let changed = false;
    const nextSessions = sessions.map((session) => {
      if (session.sessionId !== currentSessionId) {
        return session;
      }

      const nextPackageName = runtimeSummary?.currentPackage ?? session.packageName;
      const nextLastSummary = runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? session.lastSummary;
      if (
        session.draftForm === runtimeForm &&
        session.packageName === nextPackageName &&
        session.lastSummary === nextLastSummary
      ) {
        return session;
      }

      changed = true;
      return {
        ...session,
        draftForm: runtimeForm,
        packageName: nextPackageName,
        lastSummary: nextLastSummary
      };
    });
    if (!changed) {
      return;
    }
    setReplSessionsByProject((current) => ({
      ...current,
      [currentProjectId]: nextSessions
    }));
  }, [currentProjectId, currentReplSessionIdByProject, replSessionsByProject, runtimeForm, runtimeResult, runtimeSummary?.currentPackage, runtimeSummary?.divergencePosture]);

  async function loadDesktopShellModel(
    environmentId: string,
    restorePanelState?: Record<string, unknown> | null
  ): Promise<DesktopModelDto> {
    return loadDesktopShellModelQuery(environmentId, restorePanelState);
  }

  async function loadEnvironmentBootstrap(
    environmentId: string,
    restorePanelState?: Record<string, unknown> | null
  ): Promise<EnvironmentBootstrapDto> {
    return loadEnvironmentBootstrapQuery({
      environmentId,
      restorePanelState,
      logSurfacePerf
    });
  }

  async function refreshProviderSummary(environmentId?: string): Promise<ProviderProfileSummaryDto | null> {
    return refreshProviderSummaryState({
      environmentId,
      queryProviderSummary,
      setProviderSummary,
      setSelectedProviderProfileName,
      setProviderProfileError
    });
  }

  async function refreshPackageManagementSummary(
    environmentId?: string
  ): Promise<PackageManagementSummaryDto | null> {
    return refreshPackageManagementSummaryState({
      environmentId,
      queryPackageManagementSummary,
      setPackageManagementSummary,
      setPackageManagementError
    });
  }

  async function refreshDesktopTaskManifests(
    environmentId?: string
  ): Promise<DesktopTaskManifestDto[]> {
    try {
      const next = await queryDesktopTaskManifests(environmentId);
      setDesktopTaskManifests(next);
      return next;
    } catch {
      setDesktopTaskManifests([]);
      return [];
    }
  }

  async function refreshDesktopTaskRecords(
    environmentId?: string
  ): Promise<DesktopTaskRecordDto[]> {
    try {
      const next = await queryDesktopTaskRecords(environmentId);
      setDesktopTaskRecords(next);
      void refreshOrchestrationInbox(environmentId);
      return next;
    } catch {
      setDesktopTaskRecords([]);
      return [];
    }
  }

  async function refreshDesktopTaskActorTrace(
    environmentId?: string
  ): Promise<Record<string, unknown>[]> {
    try {
      const next = await queryDesktopTaskActorTrace(environmentId);
      setDesktopTaskActorTrace(next);
      return next;
    } catch {
      setDesktopTaskActorTrace([]);
      return [];
    }
  }

  async function refreshDesktopTaskDeadLetters(
    environmentId?: string
  ): Promise<Record<string, unknown>[]> {
    try {
      const next = await queryDesktopTaskDeadLetters(environmentId);
      setDesktopTaskDeadLetters(next);
      return next;
    } catch {
      setDesktopTaskDeadLetters([]);
      return [];
    }
  }

  async function refreshDesktopTaskActorFlow(
    environmentId?: string,
    input?: {
      sessionId?: string | null;
      approvalId?: string | null;
      pendingActionId?: string | null;
      actorMessageId?: string | null;
      scopeId?: string | null;
    }
  ): Promise<Record<string, unknown> | null> {
    try {
      const nextFlow = await queryDesktopTaskActorFlow(environmentId, input);
      setDesktopTaskActorFlow(nextFlow);
      void refreshDesktopTaskActorSystemPanel(environmentId, {
        sessionId: input?.sessionId ?? null
      });
      return nextFlow;
    } catch {
      setDesktopTaskActorFlow(null);
      return null;
    }
  }

  async function refreshDesktopTaskActorSystemPanel(
    environmentId?: string,
    input?: {
      sessionId?: string | null;
    }
  ): Promise<Record<string, unknown> | null> {
    try {
      const nextPanel = await queryDesktopTaskActorSystemPanel(environmentId, input);
      setDesktopTaskActorSystemPanel(nextPanel);
      return nextPanel;
    } catch {
      setDesktopTaskActorSystemPanel(null);
      return null;
    }
  }

  async function refreshOrchestrationInbox(
    environmentId?: string
  ): Promise<Record<string, unknown>[]> {
    try {
      const next = await queryOrchestrationInbox(environmentId);
      setOrchestrationInbox(next);
      return next;
    } catch {
      setOrchestrationInbox([]);
      return [];
    }
  }

  async function refreshOrchestrationFocus(input?: {
    environmentId?: string;
    planId?: string | null;
    workflowRecordId?: string | null;
    workItemId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    try {
      const next = await queryOrchestrationFocus(input);
      setOrchestrationFocus(next);
      return next;
    } catch {
      setOrchestrationFocus(null);
      return null;
    }
  }

  async function refreshOrchestrationSnapshot(input?: {
    environmentId?: string;
    planId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    try {
      const next = await queryOrchestrationSnapshot(input);
      setOrchestrationSnapshot(next);
      return next;
    } catch {
      setOrchestrationSnapshot(null);
      return null;
    }
  }

  async function refreshPlanVerification(input?: {
    environmentId?: string;
    planId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    try {
      const next = await queryPlanVerification(input);
      setPlanVerification(next);
      return next;
    } catch {
      setPlanVerification(null);
      return null;
    }
  }

  async function refreshPendingConversationApproval(
    environmentId?: string
  ): Promise<{
    actorMessageId: string | null;
    approvalId: string | null;
    sessionId: string | null;
    threadId: string | null;
    policyIds: string[];
  } | null> {
    const pendingApproval = await refreshPendingConversationApprovalState({
      environmentId,
      pendingConversationApprovalRef,
      selectedThreadIdRef,
      refreshDesktopTaskActorFlow,
      setDesktopTaskActorFlow,
      setPendingConversationApproval
    });
    void refreshOrchestrationInbox(environmentId);
    return pendingApproval;
  }

  async function refreshMcpServerConfigs(
    environmentId?: string
  ): Promise<McpServerConfigDto[]> {
    return refreshMcpServerConfigsState({
      environmentId,
      queryMcpServerConfigs,
      setMcpServerConfigs,
      setSelectedMcpServerId,
      setMcpServerError
    });
  }

  async function loadInitialState(): Promise<void> {
    await loadDesktopInitialState({
      desktopPreferencesHydratedRef,
      shellPendingHydrationActionsRef,
      loadEnvironmentBootstrap,
      refreshProviderSummary,
      ensureDesktopProjects,
      resolveSelectedBrowserDomain: (value) =>
        browserDomains.some((domain) => domain.id === value)
          ? (value as BrowserDomain)
          : "symbols",
      resolveSelectedConfigurationSection: (value) =>
        configurationSections.some((section) => section.id === value)
          ? (value as ConfigurationSection)
          : "theme",
      hydrateShellLayout: (desktopPreferences) => {
        const hydratedShellLayout = shellLayoutReducer(createDefaultShellLayoutState(), {
          type: "hydrate",
          preferences: {
            sidebarPinned: desktopPreferences.sidebarPinned ?? true,
            sidebarWidth: desktopPreferences.sidebarWidth ?? null,
            sidebarActivePanelId: desktopPreferences.sidebarActivePanelId ?? null,
            sidebarDockedPanelIds: desktopPreferences.sidebarDockedPanelIds,
            canvasPinned: desktopPreferences.canvasPinned ?? true,
            inspectorPinned: desktopPreferences.inspectorPinned ?? true,
            inspectorWidth: desktopPreferences.inspectorWidth ?? null,
            inspectorActivePanelId: desktopPreferences.inspectorActivePanelId ?? null,
            inspectorDockedPanelIds: desktopPreferences.inspectorDockedPanelIds
          }
        });
        return shellPendingHydrationActionsRef.current.reduce(
          (currentState, action) => shellLayoutReducer(currentState, action as ShellLayoutAction),
          hydratedShellLayout
        );
      },
      applyHydratedShellLayout: (nextShellLayout) => {
        shellLayoutRef.current = nextShellLayout;
        dispatchShellLayout({ type: "replace_state", state: nextShellLayout });
      },
      persistResolvedShellLayout,
      setHostStatus,
      setBinding,
      setActiveWorkspace,
      setSelectedBrowserDomain,
      setSelectedConfigurationSection,
      setThemePreference,
      setTooltipScalePercent,
      setControlIconScalePercent,
      setDockIconScalePercent,
      setConversationTextScalePercent,
      setSourceCodeTextScalePercent,
      setLispParenColors,
      normalizeDesktopSurfaceScalePercent,
      normalizeParenDepthColors,
      setProjects,
      setCurrentProjectId,
      setSelectedConversationThreadByProject,
      setConversationDraft,
      defaultConversationDraft:
        "Start from the live environment focus and keep runtime, source, and governance context attached.",
      setReplSessionsByProject,
      setCurrentReplSessionIdByProject,
      setEditorBuffersByProject,
      setSelectedEditorBufferIdByProject,
      setWorkspacePackageByProject,
      setWorkspaceDraftByProject,
      setWorkspaceResultByProject,
      setWorkspaceHistoryByProject,
      setSummary,
      setStatus,
      setWorkspaceSummary,
      setDesktopModel,
      desktopPanelToWorkspaceId,
      setErrorMessage
    });
  }

  async function refreshEnvironmentImageRegistry(): Promise<EnvironmentImageRegistryDto> {
    return refreshEnvironmentImageRegistryState({
      queryEnvironmentImageRegistry,
      setEnvironmentImageRegistry
    });
  }

  async function handleOpenEnvironmentImage(imageIdOrName: string): Promise<void> {
    await openEnvironmentImageState({
      imageIdOrName,
      startupImageSelectionHandledRef,
      refreshEnvironmentImageRegistry,
      setIsEnvironmentImageChooserOpen,
      loadInitialState,
      setErrorMessage
    });
  }

  async function handleContinueWithCurrentEnvironmentImage(): Promise<void> {
    await continueWithCurrentEnvironmentImageState({
      currentImageIdOrName:
        environmentImageRegistry?.currentImageId ?? environmentImageRegistry?.currentImageName ?? null,
      startupImageSelectionHandledRef,
      refreshEnvironmentImageRegistry,
      setIsEnvironmentImageChooserOpen,
      loadInitialState,
      setErrorMessage
    });
  }

  function openEnvironmentExitDialog(): void {
    setEnvironmentSaveAsNameDraft(
      environmentImageRegistry?.currentImageName ?? summary?.environmentLabel ?? "work-image"
    );
    setIsEnvironmentExitDialogOpen(true);
  }

  async function handleDiscardAndQuit(): Promise<void> {
    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      if (desktopPreferencesPersistTimeoutRef.current !== null) {
        window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
        desktopPreferencesPersistTimeoutRef.current = null;
      }
      await window.sbclAgentDesktop.host.revertEnvironmentToImage();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to discard work image state.");
    }
  }

  async function handleSaveCurrentImageAndQuit(): Promise<void> {
    const imageName = environmentImageRegistry?.currentImageName ?? null;
    if (!imageName) {
      return;
    }

    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      await flushRichDesktopPreferences();
      await window.sbclAgentDesktop.host.saveEnvironmentImage({
        name: imageName,
        overwrite: true
      });
      await refreshEnvironmentImageRegistry();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to save current image.");
    }
  }

  async function handleSaveAsNewImageAndQuit(): Promise<void> {
    const imageName = environmentSaveAsNameDraft.trim();
    if (imageName.length === 0) {
      return;
    }

    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      await flushRichDesktopPreferences();
      await window.sbclAgentDesktop.host.saveEnvironmentImage({
        name: imageName,
        overwrite: false
      });
      await refreshEnvironmentImageRegistry();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to save image.");
    }
  }

  async function loadDocumentationPages(): Promise<void> {
    try {
      const pages = await window.sbclAgentDesktop.desktop.listDocumentationPages();
      setDocumentationPages(pages);
      setSelectedDocumentationSlug((current) => {
        if (pages.some((page) => page.slug === current)) {
          return current;
        }

        return pages[0]?.slug ?? "index";
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation pages.");
    }
  }

  async function persistProjectRegistry(
    nextProjects: ProjectProfileDto[],
    nextCurrentProjectId: string | null
  ): Promise<void> {
    setProjects(nextProjects);
    setCurrentProjectId(nextCurrentProjectId);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      projects: nextProjects,
      currentProjectId: nextCurrentProjectId
    });
  }

  async function persistConversationThreadSelection(projectId: string, threadId: string): Promise<void> {
    const nextSelections = {
      ...selectedConversationThreadByProject,
      [projectId]: threadId
    };
    setSelectedConversationThreadByProject(nextSelections);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      selectedConversationThreadByProject: nextSelections
    });
  }

  async function persistReplSessions(
    nextSessionsByProject: Record<string, ReplSessionProfileDto[]>,
    nextCurrentSessionIds: Record<string, string>
  ): Promise<void> {
    setReplSessionsByProject(nextSessionsByProject);
    setCurrentReplSessionIdByProject(nextCurrentSessionIds);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      replSessionsByProject: nextSessionsByProject,
      currentReplSessionIdByProject: nextCurrentSessionIds
    });
  }

  async function appendReplSessionHistoryEntry(
    projectId: string,
    sessionId: string,
    form: string,
    result: CommandResultDto<RuntimeEvalResultDto>
  ): Promise<void> {
    const sessions = replSessionsByProject[projectId] ?? [];
    const entry: ReplSessionHistoryEntryDto = {
      entryId: `${sessionId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      form,
      status: result.status,
      summary: result.data.summary,
      valuePreview: result.data.valuePreview ?? null,
      recoveryLaunch: result.data.recoveryLaunch ?? null
    };
    const nextSessions = sessions.map((session) =>
      session.sessionId === sessionId
        ? {
            ...session,
            lastSummary: result.data.summary,
            packageName: runtimeSummary?.currentPackage ?? session.packageName,
            history: [entry, ...(session.history ?? [])].slice(0, 8)
          }
        : session
    );
    await persistReplSessions(
      {
        ...replSessionsByProject,
        [projectId]: nextSessions
      },
      currentReplSessionIdByProject
    );
  }

  async function loadEnvironmentBinding(environmentId: string): Promise<void> {
    await loadEnvironmentBindingState({
      environmentId,
      desktopModel,
      setBinding,
      loadEnvironmentBootstrap,
      setSummary,
      setStatus,
      setWorkspaceSummary,
      setDesktopModel,
      setActiveWorkspace,
      desktopPanelToWorkspaceId
    });
  }

  async function handleProjectSwitch(projectId: string): Promise<void> {
    const project = projects.find((entry) => entry.projectId === projectId);
    if (!project) {
      return;
    }

    try {
      await persistProjectRegistry(projects, project.projectId);
      await loadEnvironmentBinding(project.environmentId);
      setIsProjectOpenDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to switch projects.");
    }
  }

  async function handleSaveCurrentProject(): Promise<void> {
    const environmentId = summary?.environmentId ?? binding?.environmentId;
    if (!environmentId) {
      setErrorMessage("Bind an environment before saving a project.");
      return;
    }

    const title = currentProject?.title || summary?.environmentLabel || environmentId;
    if (!title) {
      return;
    }

    const existingCurrentProject = projects.find((project) => project.projectId === currentProjectId) ?? null;
    const projectId = existingCurrentProject?.projectId ?? `project-${slugifyProjectLabel(title)}`;
    const nextProject: ProjectProfileDto = {
      projectId,
      title,
      environmentId,
      summary: summary?.activeContext.focusSummary ?? "Desktop project bound to a governed environment."
    };
    const nextProjects = [nextProject, ...projects.filter((project) => project.projectId !== projectId)];

    try {
      await persistProjectRegistry(nextProjects, projectId);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the current project.");
    }
  }

  function openProjectConstitutionDialog(): void {
    setProjectConstitutionDraft(JSON.stringify(selectedProjectDetail?.constitution ?? {}, null, 2));
    setIsProjectConstitutionDialogOpen(true);
  }

  async function handleSaveProjectConstitution(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its constitution.");
      return;
    }

    let constitution: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectConstitutionDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project constitutions must be stored as a JSON object.");
      }
      constitution = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project constitution draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectConstitution({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        constitution
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectConstitutionDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project constitution.");
    }
  }

  function openProjectRequirementDialog(): void {
    setProjectRequirementTitleDraft("");
    setProjectRequirementSummaryDraft("");
    setProjectRequirementPriorityDraft("high");
    setProjectRequirementStatusDraft("proposed");
    setIsProjectRequirementDialogOpen(true);
  }

  async function handleCreateProjectRequirement(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a requirement.");
      return;
    }

    const title = projectRequirementTitleDraft.trim();
    const summary = projectRequirementSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Requirement title and summary are required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectRequirement({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        priority: projectRequirementPriorityDraft,
        status: projectRequirementStatusDraft,
        kind: "functional",
        scope: "panel-authored",
        verificationKind: "review"
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectRequirementDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the project requirement.");
    }
  }

  function openProjectFeatureSpecificationDialog(): void {
    setProjectFeatureSpecificationTitleDraft("");
    setProjectFeatureSpecificationSummaryDraft("");
    setProjectFeatureSpecificationAcceptanceCriteriaDraft("");
    setProjectFeatureSpecificationStatusDraft("proposed");
    setIsProjectFeatureSpecificationDialogOpen(true);
  }

  async function handleCreateProjectFeatureSpecification(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a feature specification.");
      return;
    }

    const title = projectFeatureSpecificationTitleDraft.trim();
    const summary = projectFeatureSpecificationSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Feature specification title and summary are required.");
      return;
    }

    const acceptanceCriteria = projectFeatureSpecificationAcceptanceCriteriaDraft
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectFeatureSpecification({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        status: projectFeatureSpecificationStatusDraft,
        acceptanceCriteria
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectFeatureSpecificationDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the feature specification.");
    }
  }

  function openProjectUserJourneyDialog(): void {
    setProjectUserJourneyTitleDraft("");
    setProjectUserJourneySummaryDraft("");
    setProjectUserJourneyActorsDraft("");
    setProjectUserJourneyEntrypointsDraft("");
    setProjectUserJourneyStepsDraft("");
    setProjectUserJourneyOutcomesDraft("");
    setProjectUserJourneyEdgeCasesDraft("");
    setIsProjectUserJourneyDialogOpen(true);
  }

  async function handleCreateProjectUserJourney(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a user journey.");
      return;
    }

    const title = projectUserJourneyTitleDraft.trim();
    const summary = projectUserJourneySummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("User journey title and summary are required.");
      return;
    }

    const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectUserJourney({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        actors: toLines(projectUserJourneyActorsDraft),
        entrypoints: toLines(projectUserJourneyEntrypointsDraft),
        steps: toLines(projectUserJourneyStepsDraft),
        outcomes: toLines(projectUserJourneyOutcomesDraft),
        edgeCases: toLines(projectUserJourneyEdgeCasesDraft)
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectUserJourneyDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the user journey.");
    }
  }

  function openProjectArchitectureDecisionDialog(): void {
    setProjectArchitectureDecisionTitleDraft("");
    setProjectArchitectureDecisionSummaryDraft("");
    setProjectArchitectureDecisionStatusDraft("proposed");
    setProjectArchitectureDecisionDriversDraft("");
    setProjectArchitectureDecisionConsequencesDraft("");
    setProjectArchitectureDecisionStackChoicesDraft("");
    setIsProjectArchitectureDecisionDialogOpen(true);
  }

  async function handleCreateProjectArchitectureDecision(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding an architecture decision.");
      return;
    }

    const title = projectArchitectureDecisionTitleDraft.trim();
    const summary = projectArchitectureDecisionSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Architecture decision title and summary are required.");
      return;
    }

    const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectArchitectureDecision({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        status: projectArchitectureDecisionStatusDraft,
        drivers: toLines(projectArchitectureDecisionDriversDraft),
        consequences: toLines(projectArchitectureDecisionConsequencesDraft),
        stackChoices: toLines(projectArchitectureDecisionStackChoicesDraft)
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectArchitectureDecisionDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the architecture decision.");
    }
  }

  function openProjectDesignSystemDialog(): void {
    setProjectDesignSystemDraft(JSON.stringify(selectedProjectDetail?.designSystem ?? {}, null, 2));
    setIsProjectDesignSystemDialogOpen(true);
  }

  async function handleSaveProjectDesignSystem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its design system.");
      return;
    }

    let designSystem: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectDesignSystemDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project design systems must be stored as a JSON object.");
      }
      designSystem = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project design system draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectDesignSystem({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        designSystem
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectDesignSystemDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project design system.");
    }
  }

  function openProjectStyleGuideDialog(): void {
    setProjectStyleGuideDraft(JSON.stringify(selectedProjectDetail?.styleGuide ?? {}, null, 2));
    setIsProjectStyleGuideDialogOpen(true);
  }

  function openProjectReleaseReadinessDialog(): void {
    const releaseReadiness = selectedProjectDetail?.releaseReadiness;
    setProjectReleaseReadinessStageDraft(releaseReadiness?.stage ?? "");
    setProjectReleaseReadinessSignoffStatusDraft(releaseReadiness?.signoffStatus ?? "");
    setProjectReleaseReadinessTargetWindowDraft(releaseReadiness?.targetWindow ?? "");
    setProjectReleaseReadinessRequiredApproversDraft((releaseReadiness?.requiredApprovers ?? []).join("\n"));
    setProjectReleaseReadinessObservationPlanDraft((releaseReadiness?.observationPlan ?? []).join("\n"));
    setProjectReleaseReadinessOpenRisksDraft((releaseReadiness?.openRisks ?? []).join("\n"));
    setIsProjectReleaseReadinessDialogOpen(true);
  }

  function openProjectReadinessObligationsDialog(): void {
    const obligations = (selectedProjectDetail?.readinessObligations ?? []).map((item) => ({
      obligationId: item.obligationId,
      title: item.title,
      summary: item.summary,
      status: item.status,
      owner: item.owner ?? "",
      dueWindow: item.dueWindow ?? "",
      blocking: item.blocking,
      evidenceKindsDraft: item.evidenceKinds.join(", ")
    }));
    setProjectReadinessObligationsDraft(
      obligations.length > 0 ? obligations : [blankProjectReadinessObligationDraft()]
    );
    setIsProjectReadinessObligationsDialogOpen(true);
  }

  async function handleSaveProjectReleaseReadiness(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its release readiness.");
      return;
    }

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    const releaseReadiness: ProjectReleaseReadinessDto = {
      stage: projectReleaseReadinessStageDraft.trim() || null,
      signoffStatus: projectReleaseReadinessSignoffStatusDraft.trim() || null,
      targetWindow: projectReleaseReadinessTargetWindowDraft.trim() || null,
      requiredApprovers: splitDraftValues(projectReleaseReadinessRequiredApproversDraft),
      observationPlan: splitDraftValues(projectReleaseReadinessObservationPlanDraft),
      openRisks: splitDraftValues(projectReleaseReadinessOpenRisksDraft)
    };

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectReleaseReadiness({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        releaseReadiness
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectReleaseReadinessDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project release readiness.");
    }
  }

  function updateProjectReadinessObligationDraft(
    index: number,
    patch: Partial<ProjectReadinessObligationDraft>
  ): void {
    setProjectReadinessObligationsDraft((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
    );
  }

  function addProjectReadinessObligationDraft(): void {
    setProjectReadinessObligationsDraft((current) => [...current, blankProjectReadinessObligationDraft()]);
  }

  function removeProjectReadinessObligationDraft(index: number): void {
    setProjectReadinessObligationsDraft((current) => {
      const next = current.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [blankProjectReadinessObligationDraft()];
    });
  }

  async function handleSaveProjectReadinessObligations(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its readiness obligations.");
      return;
    }

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    let readinessObligations: ProjectReadinessObligationDto[];
    try {
      readinessObligations = projectReadinessObligationsDraft
        .map((entry, index) => ({
          obligationId: entry.obligationId.trim() || `readiness-obligation-${index + 1}`,
          title: entry.title.trim(),
          summary: entry.summary.trim(),
          status: entry.status.trim() || "blocked",
          owner: entry.owner.trim() || null,
          dueWindow: entry.dueWindow.trim() || null,
          blocking: entry.blocking,
          evidenceKinds: splitDraftValues(entry.evidenceKindsDraft)
        }))
        .filter((entry) => entry.title.length > 0 || entry.summary.length > 0 || entry.evidenceKinds.length > 0);

      readinessObligations.forEach((entry) => {
        if (!entry.title) {
          throw new Error("Each readiness obligation must include a title.");
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse project readiness obligations.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectReadinessObligations({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        readinessObligations
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectReadinessObligationsDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project readiness obligations.");
    }
  }

  async function openProjectTestingStrategyDialog(): Promise<void> {
    const testingStrategy = selectedProjectDetail?.testingStrategy;
    const requiredEvidence = testingStrategy?.requiredEvidence ?? [];
    const suiteExpectations = (testingStrategy?.suiteExpectations ?? []).map((item) => ({
      harnessId: item.harnessId,
      purpose: item.purpose ?? "",
      evidenceKindsDraft: item.evidenceKinds.join(", ")
    }));
    const thresholdPolicy = testingStrategy?.thresholdPolicy ?? null;

    setProjectTestingStrategyRequiredEvidenceDraft(requiredEvidence.join("\n"));
    setProjectTestingStrategySuiteExpectationsDraft(
      suiteExpectations.length > 0 ? suiteExpectations : [blankProjectTestingStrategySuiteExpectationDraft()]
    );
    setProjectTestingStrategyMaximumFailedTestsDraft(thresholdPolicy?.maxFailedTests != null ? String(thresholdPolicy.maxFailedTests) : "");
    setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft(
      thresholdPolicy?.maxSayTurnLatencySeconds != null ? String(thresholdPolicy.maxSayTurnLatencySeconds) : ""
    );
    setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft(
      thresholdPolicy?.maxEnvironmentSaveLoadSeconds != null ? String(thresholdPolicy.maxEnvironmentSaveLoadSeconds) : ""
    );
    setProjectTestingStrategyRequireCoverageDraft(Boolean(thresholdPolicy?.requireCoverage));
    setProjectTestingStrategyRequireRecoveryReadyDraft(Boolean(thresholdPolicy?.requireRecoveryReady));

    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectTestingStrategyDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectTestingStrategyDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleSaveProjectStyleGuide(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its style guide.");
      return;
    }

    let styleGuide: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectStyleGuideDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project style guides must be stored as a JSON object.");
      }
      styleGuide = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project style guide draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectStyleGuide({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        styleGuide
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectStyleGuideDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project style guide.");
    }
  }

  function updateProjectTestingStrategySuiteExpectation(
    index: number,
    patch: Partial<ProjectTestingStrategySuiteExpectationDraft>
  ): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
    );
  }

  function addProjectTestingStrategySuiteExpectation(): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) => [...current, blankProjectTestingStrategySuiteExpectationDraft()]);
  }

  function removeProjectTestingStrategySuiteExpectation(index: number): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) => {
      const next = current.filter((_, entryIndex) => entryIndex != index);
      return next.length > 0 ? next : [blankProjectTestingStrategySuiteExpectationDraft()];
    });
  }

  async function handleSaveProjectTestingStrategy(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its testing strategy.");
      return;
    }

    const parseOptionalNumber = (value: string, label: string): number | null => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        throw new Error(`${label} must be a number.`);
      }
      return parsed;
    };

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    let testingStrategy: ProjectTestingStrategyDto;
    try {
      const requiredEvidence = splitDraftValues(projectTestingStrategyRequiredEvidenceDraft);
      const suiteExpectations = projectTestingStrategySuiteExpectationsDraft
        .map((entry) => ({
          harnessId: entry.harnessId.trim(),
          purpose: entry.purpose.trim(),
          evidenceKinds: splitDraftValues(entry.evidenceKindsDraft)
        }))
        .filter((entry) => entry.harnessId.length > 0 || entry.purpose.length > 0 || entry.evidenceKinds.length > 0)
        .map((entry) => {
          if (!entry.harnessId) {
            throw new Error("Each suite expectation must include a harness id.");
          }
          return {
            harnessId: entry.harnessId,
            purpose: entry.purpose || null,
            evidenceKinds: entry.evidenceKinds
          };
        });

      const maxFailedTests = parseOptionalNumber(projectTestingStrategyMaximumFailedTestsDraft, "Max failed tests");
      const maxSayTurnLatencySeconds = parseOptionalNumber(
        projectTestingStrategyMaximumSayTurnLatencySecondsDraft,
        "Max say turn latency"
      );
      const maxEnvironmentSaveLoadSeconds = parseOptionalNumber(
        projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
        "Max save/load latency"
      );

      testingStrategy = {
        requiredEvidence,
        suiteExpectations,
        thresholdPolicy:
          maxFailedTests != null ||
          maxSayTurnLatencySeconds != null ||
          maxEnvironmentSaveLoadSeconds != null ||
          projectTestingStrategyRequireCoverageDraft ||
          projectTestingStrategyRequireRecoveryReadyDraft
            ? {
                maxFailedTests,
                maxSayTurnLatencySeconds,
                maxEnvironmentSaveLoadSeconds,
                requireCoverage: projectTestingStrategyRequireCoverageDraft,
                requireRecoveryReady: projectTestingStrategyRequireRecoveryReadyDraft
              }
            : null
      };
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project testing strategy draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectTestingStrategy({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        testingStrategy
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectTestingStrategyDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project testing strategy.");
    }
  }

  function openProjectSourceRootDialog(): void {
    setProjectSourceRootDraft("");
    setIsProjectSourceRootDialogOpen(true);
  }

  async function handleCreateProjectSourceRoot(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a source root.");
      return;
    }
    const sourceRoot = projectSourceRootDraft.trim();
    if (!sourceRoot) {
      setErrorMessage("Source root path is required.");
      return;
    }
    try {
      const result = await window.sbclAgentDesktop.command.appendProjectSourceRoot({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        sourceRoot
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectSourceRootDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the source root.");
    }
  }

  async function ensureProjectTestingHarnessInventory(): Promise<ProjectTestingHarnessDto[]> {
    if (!effectiveEnvironmentId) {
      setProjectTestingHarnessInventory([]);
      return [];
    }
    const result = await window.sbclAgentDesktop.query.projectTestingHarnessInventory(effectiveEnvironmentId);
    setProjectTestingHarnessInventory(result.data);
    return result.data;
  }

  async function openProjectTestingHarnessDialog(): Promise<void> {
    setProjectTestingHarnessIdDraft("");
    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectTestingHarnessDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectTestingHarnessDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleBindProjectTestingHarness(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before binding a testing harness.");
      return;
    }
    const harnessId = projectTestingHarnessIdDraft.trim();
    if (!harnessId) {
      setErrorMessage("Testing harness id is required.");
      return;
    }
    try {
      const result = await window.sbclAgentDesktop.command.bindProjectTestingHarness({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        harnessId
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectTestingHarnessDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to bind the testing harness.");
    }
  }

  async function openProjectQualityGateDialog(): Promise<void> {
    setProjectQualityGateTitleDraft("");
    setProjectQualityGateSummaryDraft("");
    setProjectQualityGateStatusDraft("proposed");
    setProjectQualityGateRequiredHarnessIdsDraft("");
    setProjectQualityGateMinimumLinkedWorkItemsDraft("");
    setProjectQualityGateMinimumLinkedIncidentsDraft("");
    setProjectQualityGateMaximumFailedTestsDraft("");
    setProjectQualityGateMaximumSayTurnLatencySecondsDraft("");
    setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft("");
    setProjectQualityGateRequireSourceRootsDraft(true);
    setProjectQualityGateRequireCoverageDraft(false);
    setProjectQualityGateRequireRecoveryReadyDraft(false);
    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectQualityGateDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectQualityGateDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleCreateProjectQualityGate(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a quality gate.");
      return;
    }
    const title = projectQualityGateTitleDraft.trim();
    if (!title) {
      setErrorMessage("Quality gate title is required.");
      return;
    }
    const maximumFailedTestsValue = projectQualityGateMaximumFailedTestsDraft.trim();
    const maximumFailedTests = maximumFailedTestsValue ? Number.parseInt(maximumFailedTestsValue, 10) : undefined;
    if (maximumFailedTestsValue && Number.isNaN(maximumFailedTests)) {
      setErrorMessage("Max failed tests must be a valid integer.");
      return;
    }
    const minimumLinkedWorkItemsValue = projectQualityGateMinimumLinkedWorkItemsDraft.trim();
    const minimumLinkedWorkItems = minimumLinkedWorkItemsValue ? Number.parseInt(minimumLinkedWorkItemsValue, 10) : undefined;
    if (minimumLinkedWorkItemsValue && Number.isNaN(minimumLinkedWorkItems)) {
      setErrorMessage("Minimum linked work items must be a valid integer.");
      return;
    }
    const minimumLinkedIncidentsValue = projectQualityGateMinimumLinkedIncidentsDraft.trim();
    const minimumLinkedIncidents = minimumLinkedIncidentsValue ? Number.parseInt(minimumLinkedIncidentsValue, 10) : undefined;
    if (minimumLinkedIncidentsValue && Number.isNaN(minimumLinkedIncidents)) {
      setErrorMessage("Minimum linked incidents must be a valid integer.");
      return;
    }
    const maximumSayTurnLatencySecondsValue = projectQualityGateMaximumSayTurnLatencySecondsDraft.trim();
    const maximumSayTurnLatencySeconds = maximumSayTurnLatencySecondsValue ? Number.parseFloat(maximumSayTurnLatencySecondsValue) : undefined;
    if (maximumSayTurnLatencySecondsValue && Number.isNaN(maximumSayTurnLatencySeconds)) {
      setErrorMessage("Max say turn latency must be a valid number.");
      return;
    }
    const maximumEnvironmentSaveLoadSecondsValue = projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft.trim();
    const maximumEnvironmentSaveLoadSeconds = maximumEnvironmentSaveLoadSecondsValue
      ? Number.parseFloat(maximumEnvironmentSaveLoadSecondsValue)
      : undefined;
    if (maximumEnvironmentSaveLoadSecondsValue && Number.isNaN(maximumEnvironmentSaveLoadSeconds)) {
      setErrorMessage("Max save/load latency must be a valid number.");
      return;
    }
    const requiredHarnessIds = projectQualityGateRequiredHarnessIdsDraft
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    try {
      const result = await window.sbclAgentDesktop.command.appendProjectQualityGate({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary: projectQualityGateSummaryDraft.trim() || undefined,
        status: projectQualityGateStatusDraft,
        requiredHarnessIds: requiredHarnessIds.length > 0 ? requiredHarnessIds : undefined,
        minimumLinkedWorkItems,
        minimumLinkedIncidents,
        requireSourceRoots: projectQualityGateRequireSourceRootsDraft,
        requireCoverage: projectQualityGateRequireCoverageDraft,
        requireRecoveryReady: projectQualityGateRequireRecoveryReadyDraft,
        maximumFailedTests,
        maximumSayTurnLatencySeconds,
        maximumEnvironmentSaveLoadSeconds
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectQualityGateDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the quality gate.");
    }
  }

  function openWorkItemSteerDialog(): void {
    setWorkItemSteerPhaseDraft(selectedWorkflowRecord?.phase ?? "");
    setWorkItemSteerNextStepDraft("");
    setWorkItemSteerNoteDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemSteerDialogOpen(true);
  }

  function openWorkItemResumeDialog(): void {
    setWorkItemResumeNoteDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemResumeDialogOpen(true);
  }

  function openWorkItemQuarantineDialog(): void {
    setWorkItemQuarantineReasonDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemQuarantineDialogOpen(true);
  }

  function openWorkItemRollbackDialog(): void {
    setWorkItemRollbackReasonDraft(selectedWorkItem?.waitingReason ?? "");
    setWorkItemRollbackNoteDraft("");
    setIsWorkItemRollbackDialogOpen(true);
  }

  function openWorkItemValidationDialog(): void {
    setWorkItemValidationStatusDraft("passed");
    setIsWorkItemValidationDialogOpen(true);
  }

  function openIncidentRemediationPlanDialog(): void {
    const plan = selectedIncident?.remediationPlan;
    setIncidentRemediationStatusDraft(plan?.status ?? "draft");
    setIncidentRemediationOwnerDraft(plan?.owner ?? "");
    setIncidentRemediationSummaryDraft(plan?.summary ?? "");
    setIncidentRemediationActionsDraft((plan?.actions ?? []).join("\n"));
    setIncidentRemediationValidationDraft((plan?.validationSteps ?? []).join("\n"));
    setIncidentRemediationBlockersDraft((plan?.blockers ?? []).join("\n"));
    setIsIncidentRemediationPlanDialogOpen(true);
  }

  async function handleSteerWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before steering execution.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.steerWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        phase: workItemSteerPhaseDraft.trim() || null,
        nextStep: workItemSteerNextStepDraft.trim() || null,
        note: workItemSteerNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemSteerDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to steer the work item.");
    }
  }

  async function handleResumeWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before resuming execution.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.resumeWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        note: workItemResumeNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemResumeDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to resume the work item.");
    }
  }

  async function handleQuarantineWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before quarantining execution.");
      return;
    }

    const reason = workItemQuarantineReasonDraft.trim();
    if (!reason) {
      setErrorMessage("A quarantine reason is required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.quarantineWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        reason
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemQuarantineDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to quarantine the work item.");
    }
  }

  async function handleRollbackWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before requesting rollback.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.rollbackWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        reason: workItemRollbackReasonDraft.trim() || null,
        note: workItemRollbackNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemRollbackDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to roll back the work item.");
    }
  }

  async function handleCompleteWorkItemValidations(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before updating validation status.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.completeWorkItemValidations({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        status: workItemValidationStatusDraft
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemValidationDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update work item validations.");
    }
  }

  async function handleUpdateIncidentRemediationPlan(): Promise<void> {
    const incidentId = selectedIncident?.incidentId ?? selectedIncidentId;
    if (!effectiveEnvironmentId || !incidentId) {
      setErrorMessage("Select an incident before updating remediation.");
      return;
    }

    const summaryDraft = incidentRemediationSummaryDraft.trim();
    if (!summaryDraft) {
      setErrorMessage("A remediation summary is required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateIncidentRemediationPlan({
        environmentId: effectiveEnvironmentId,
        incidentId,
        remediationPlan: {
          status: incidentRemediationStatusDraft,
          owner: incidentRemediationOwnerDraft.trim() || null,
          summary: summaryDraft,
          actions: draftLines(incidentRemediationActionsDraft),
          validationSteps: draftLines(incidentRemediationValidationDraft),
          blockers: draftLines(incidentRemediationBlockersDraft)
        }
      });
      setSelectedIncident(result.data);
      await loadIncidentWorkspace(effectiveEnvironmentId);
      await loadIncidentDetail(result.data.incidentId, effectiveEnvironmentId);
      setIsIncidentRemediationPlanDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update the incident remediation plan."
      );
    }
  }

  async function handleCreateProjectFromEnvironment(requestedTitleOverride?: string): Promise<void> {
    const environmentId = summary?.environmentId || binding?.environmentId || "";
    if (!environmentId) {
      setErrorMessage("Bind an environment before creating a project.");
      return;
    }

    const requestedTitle = requestedTitleOverride?.trim() || summary?.environmentLabel || environmentId;
    const { projectId, title } = makeUniqueProjectIdentity(projects, requestedTitle);
    if (!title) {
      return;
    }

    try {
      const createProject = window.sbclAgentDesktop.command.createProject;
      if (typeof createProject !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose createProject yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      const result = await createProject({
        environmentId,
        title,
        summary: "Governed project created from the desktop shell."
      });
      const createdProject: ProjectProfileDto = {
        projectId: result.data.projectId,
        title: result.data.title,
        environmentId,
        summary: result.data.summary
      };
      const nextProjects = [
        createdProject,
        ...projects.filter((project) => project.projectId !== createdProject.projectId)
      ];
      await persistProjectRegistry(nextProjects, createdProject.projectId);
      setSelectedGovernedProjectId(result.data.projectId);
      setSelectedProjectDetail(result.data);
      await loadEnvironmentBinding(environmentId);
      await loadProjectWorkspace(environmentId);
      await loadProjectDetail(result.data.projectId, environmentId);
      setIsProjectCreateDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the project.");
    }
  }

  async function handleSwitchReplSession(sessionId: string): Promise<void> {
    if (!currentProjectId) {
      return;
    }

    const sessions = replSessionsByProject[currentProjectId] ?? [];
    const selectedSession = sessions.find((session) => session.sessionId === sessionId);
    if (!selectedSession) {
      return;
    }

    setRuntimeForm(selectedSession.draftForm);
    setRuntimeResult(null);
    await persistReplSessions(replSessionsByProject, {
      ...currentReplSessionIdByProject,
      [currentProjectId]: sessionId
    });
  }

  async function handleCreateReplSession(): Promise<void> {
    if (!currentProjectId || !effectiveEnvironmentId) {
      return;
    }

    const title = replSessionTitleDraft.trim();
    if (!title) {
      return;
    }

    const nextSession: ReplSessionProfileDto = {
      sessionId: `repl-${slugifyProjectLabel(title)}-${Date.now()}`,
      title,
      environmentId: effectiveEnvironmentId,
      draftForm: runtimeForm,
      packageName: runtimeSummary?.currentPackage,
      lastSummary: runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? "New project-scoped listener session."
    };
    const nextSessionsByProject = {
      ...replSessionsByProject,
      [currentProjectId]: [nextSession, ...(replSessionsByProject[currentProjectId] ?? [])]
    };

    await persistReplSessions(nextSessionsByProject, {
      ...currentReplSessionIdByProject,
      [currentProjectId]: nextSession.sessionId
    });
    setRuntimeForm(nextSession.draftForm);
    setRuntimeResult(null);
    setReplSessionTitleDraft("New Listener Session");
  }

  async function handleCreateConversationSession(): Promise<void> {
    if (!currentProjectId || !effectiveEnvironmentId) {
      return;
    }

    const title = conversationSessionTitleDraft.trim() || "New Conversation Session";
    if (!title) {
      return;
    }

    try {
      setErrorMessage(null);
      const createConversationThread = window.sbclAgentDesktop.command.createConversationThread;
      if (typeof createConversationThread !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose createConversationThread yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      const result = await createConversationThread({
        environmentId: effectiveEnvironmentId,
        title,
        summary: "Project-scoped conversation session created from the desktop shell."
      });
      await loadConversationWorkspace(effectiveEnvironmentId);
      setSelectedThreadId(result.data.threadId);
      setSelectedThread(null);
      setSelectedTurnId(null);
      setSelectedTurn(null);
      setConversationSessionTitleDraft("");
      setIsConversationSessionCreateDialogOpen(false);
      await persistConversationThreadSelection(currentProjectId, result.data.threadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the conversation session.");
    }
  }

  async function handleRenameConversationThread(): Promise<void> {
    if (!effectiveEnvironmentId || !conversationThreadRenameTargetId) {
      return;
    }

    const title = conversationThreadRenameDraft.trim();
    if (!title) {
      return;
    }

    try {
      setErrorMessage(null);
      const updateConversationThread = window.sbclAgentDesktop.command.updateConversationThread;
      if (typeof updateConversationThread !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose updateConversationThread yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      await updateConversationThread({
        environmentId: effectiveEnvironmentId,
        threadId: conversationThreadRenameTargetId,
        title
      });
      await loadConversationWorkspace(effectiveEnvironmentId);
      await loadThreadDetail(conversationThreadRenameTargetId, effectiveEnvironmentId);
      setConversationThreadRenameDraft("");
      setConversationThreadRenameTargetId(null);
      setIsConversationThreadRenameDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to rename the conversation session.");
    }
  }

  async function handleConversationAttachmentSelection(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setConversationSendError(null);
      const nextAttachments = await Promise.all(
        Array.from(files).map((file, index) => conversationAttachmentFromFile(file, index))
      );
      setConversationAttachments((current) => [...current, ...nextAttachments]);
    } catch (error) {
      setConversationSendError(
        error instanceof Error ? error.message : "Failed to prepare the selected conversation attachments."
      );
    }
  }

  function removeConversationAttachment(attachmentId: string): void {
    setConversationAttachments((current) =>
      current.filter((attachment) => attachment.attachmentId !== attachmentId)
    );
  }

  const conversationSurfacePacketInput: ConversationSurfacePacketInput = useMemo(
    () => ({
      activeWorkspace,
      selectedConversationSection,
      selectedBrowserDomain,
      environmentFocus,
      orchestrationFocus,
      orchestrationSnapshot,
      planVerification,
      selectedThread,
      selectedThreadId,
      conversationDraft,
      conversationAttachments,
      desktopModel,
      desktopWindows,
      focusedDesktopWindowId,
      calculator: {
        latestCalculatorResult,
        pendingCalculatorExpressionRequest
      },
      transcript: {
        selectedTranscriptEntry,
        selectedTranscriptSourceFilter,
        filteredTranscriptEntries
      },
      memory: {
        selectedMemory,
        memoryEntries
      },
      editor: {
        focused: focusedDesktopWindowId === "window:editor-surface",
        visible: desktopWindows.some(
          (window) => window.id === "window:editor-surface" && window.state !== "minimized"
        ),
        scopeId: currentEditorScopeId,
        bufferId: currentEditorBufferId,
        title: currentEditorBufferTitle,
        packageName: currentEditorPackage,
        dirty: currentEditorBufferDirty,
        changedFormCount: currentEditorChangedFormCount,
        draft: currentEditorDraft
      }
    }),
    [
      activeWorkspace,
      selectedConversationSection,
      selectedBrowserDomain,
      environmentFocus,
      orchestrationFocus,
      orchestrationSnapshot,
      planVerification,
      selectedThread,
      selectedThreadId,
      conversationDraft,
      conversationAttachments,
      desktopModel,
      desktopWindows,
      focusedDesktopWindowId,
      latestCalculatorResult,
      pendingCalculatorExpressionRequest,
      selectedTranscriptEntry,
      selectedTranscriptSourceFilter,
      filteredTranscriptEntries,
      selectedMemory,
      memoryEntries,
      currentEditorBufferId,
      currentEditorBufferTitle,
      currentEditorPackage,
      currentEditorScopeId,
      currentEditorBufferDirty,
      currentEditorChangedFormCount,
      currentEditorDraft
    ]
  );

  async function reconcileConversationSendResult(
    result: CommandResultDto<SendConversationMessageResultDto>,
    environmentId: string,
    currentThreadId: string,
    priorMessageCount: number
  ): Promise<{
    nextThreadId: string;
    nextTurnId: string | null;
    failureSummary: string | null;
  }> {
    const nextThreadId =
      result.data.threadId && result.data.threadId !== "thread" ? result.data.threadId : currentThreadId;
    const nextTurnId = result.data.turnId && result.data.turnId !== "turn" ? result.data.turnId : null;
    const expectedAssistantMessage = (result.data.assistantMessage ?? "").trim().length > 0;
    const expectedAdditionalMessages = expectedAssistantMessage ? 2 : 1;

    setSelectedThreadId(nextThreadId);
    if (nextThreadId !== currentThreadId) {
      await refreshConversationThreadList(environmentId, nextThreadId);
    }
    const detailResult = await loadThreadDetailWithExpectation(nextThreadId, environmentId, {
      expectedTurnId: nextTurnId,
      minimumMessageCount: priorMessageCount + expectedAdditionalMessages,
      requireAssistantMessageForTurn: expectedAssistantMessage
    });
    const persistedAssistantPresent = threadDetailHasAssistantMessageForTurn(
      detailResult.data,
      nextTurnId
    );
    const persistedThreadIncomplete =
      expectedAssistantMessage &&
      (!persistedAssistantPresent ||
        detailResult.data.messages.length < priorMessageCount + expectedAdditionalMessages);

    if (persistedThreadIncomplete) {
      console.info(
        "[conversation-send] preserving-current-thread-during-incomplete-reconcile threadId=%s turnId=%s messageCount=%d expectedMinimum=%d persistedAssistantPresent=%o",
        nextThreadId,
        nextTurnId,
        detailResult.data.messages.length,
        priorMessageCount + expectedAdditionalMessages,
        persistedAssistantPresent
      );
      setSelectedThreadId(nextThreadId);
      if (!selectedThread || selectedThread.threadId !== nextThreadId) {
        setSelectedTurn(null);
        applyLoadedThreadDetail(detailResult.data, {
          expectedTurnId: nextTurnId,
          minimumMessageCount: 0
        });
      } else if (nextTurnId) {
        setSelectedTurnId(nextTurnId);
      }
    } else {
      applyLoadedThreadDetail(detailResult.data, {
        expectedTurnId: nextTurnId,
        minimumMessageCount: priorMessageCount + expectedAdditionalMessages
      });
    }

    return {
      nextThreadId,
      nextTurnId,
      failureSummary:
        result.status === "error" || result.status === "rejected"
          ? result.data.summary || "The live provider could not complete this conversation turn."
          : null
    };
  }

  function beginConversationSendSession(threadId: string): void {
    setIsSendingConversation(true);
    setErrorMessage(null);
    setConversationSendError(null);
    setConversationStream({
      threadId,
      turnId: null,
      content: ""
    });
  }

  function completeConversationSendSuccess(): void {
    setConversationDraft("");
    setConversationAttachments([]);
    setConversationSendError(null);
  }

  function applyOptimisticConversationUserMessage(threadId: string, prompt: string): void {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    const optimisticMessage: MessageDto = {
      messageId: `optimistic-user-${threadId}-${Date.now()}`,
      role: "user",
      content: trimmedPrompt,
      createdAt: new Date().toISOString(),
      turnId: null
    };

    setSelectedThread((current) => {
      if (!current || current.threadId !== threadId) {
        return {
          threadId,
          title: current?.title ?? "Default Thread",
          summary: current?.summary ?? "",
          state: current?.state ?? "active",
          messages: [optimisticMessage],
          turns: current?.turns ?? [],
          linkedEntities: current?.linkedEntities ?? []
        };
      }
      return {
        ...current,
        messages: [...current.messages, optimisticMessage]
      };
    });
  }

  function applyOptimisticConversationSendSuccess(
    threadId: string,
    turnId: string | null,
    assistantMessage: string,
    options?: {
      replaceExistingTurnMessages?: boolean;
    }
  ): void {
    if (!assistantMessage.trim()) {
      setConversationStream(null);
      return;
    }

    const replaceExistingTurnMessages = options?.replaceExistingTurnMessages ?? true;

    const optimisticMessage: MessageDto = {
      messageId: `optimistic-assistant-${turnId ?? threadId}`,
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date().toISOString(),
      turnId
    };

    setSelectedThread((current) => {
      if (!current || current.threadId !== threadId) {
        return current;
      }
      return {
        ...current,
        messages: replaceExistingTurnMessages && turnId
          ? [
              ...current.messages.filter((message) => message.turnId !== turnId),
              optimisticMessage
            ]
          : [...current.messages, optimisticMessage]
      };
    });
    setConversationStream(null);
  }

  function failConversationSend(message: string): void {
    setConversationStream(null);
    setConversationSendError(message);
    setErrorMessage(message);
  }

  function extractApprovalPolicyIdsFromMessage(message: string): string[] {
    const match = message.match(/Approval required for\s+(.+?)\.\s+Run\s+\(approve/i);
    if (!match) {
      return [];
    }
    return match[1]
      .split(",")
      .map((policyId) => policyId.trim())
      .filter((policyId) => policyId.length > 0);
  }

  function buildConversationApprovalPrompt(policyIds: string[]): string {
    if (policyIds.length === 0) {
      return 'This action requires approval before I can continue. Reply "yes" to approve and continue.';
    }
    return `This action requires approval before I can continue. Reply "yes" to approve ${policyIds.join(", ")} and I will continue.`;
  }

  function affirmativeConversationApprovalPrompt(prompt: string): boolean {
    const normalized = prompt.trim().toLowerCase();
    return normalized === "yes" || normalized === "y" || normalized === "approve";
  }

  function applyApprovalRequiredConversationState(
    threadId: string,
    message: string,
    pendingApprovalState?: {
      actorMessageId?: string | null;
      approvalId?: string | null;
      sessionId?: string | null;
      policyIds?: string[];
    } | null
  ): boolean {
    const policyIds =
      pendingApprovalState?.policyIds?.filter((policyId) => policyId.length > 0) ??
      extractApprovalPolicyIdsFromMessage(message);
    if (!pendingApprovalState?.actorMessageId && !pendingApprovalState?.approvalId) {
      return false;
    }

    const approvalPrompt = buildConversationApprovalPrompt(policyIds);
    completeConversationSendSuccess();
    setConversationStream(null);
    setIsSendingConversation(false);
    setConversationSendError(null);
    setErrorMessage(null);
    setPendingConversationApproval({
      actorMessageId: pendingApprovalState?.actorMessageId ?? null,
      approvalId: pendingApprovalState?.approvalId ?? null,
      sessionId: pendingApprovalState?.sessionId ?? null,
      threadId,
      policyIds
    });
    if (threadId) {
      stickyConversationThreadIdRef.current = threadId;
    }
    setSelectedThreadId(threadId);

    const approvalMessage: MessageDto = {
      messageId: `approval-required-${threadId}-${policyIds.join("-")}`,
      role: "assistant",
      content: approvalPrompt,
      createdAt: new Date().toISOString(),
      turnId: null
    };

    setSelectedThread((current) => {
      if (!current || current.threadId !== threadId) {
        return current;
      }
      const lastMessage = current.messages[current.messages.length - 1];
      if (
        lastMessage?.role === "assistant" &&
        lastMessage.content.trim() === approvalPrompt.trim()
      ) {
        return current;
      }
      return {
        ...current,
        messages: [...current.messages, approvalMessage]
      };
    });
    return true;
  }

  async function handleSendConversationMessage(): Promise<void> {
    const trimmedPrompt = conversationDraft.trim();
    const pendingApproval = pendingConversationApprovalRef.current;
    const isAffirmativeApprovalPrompt = affirmativeConversationApprovalPrompt(trimmedPrompt);
    const activeThreadId = selectedThreadId ?? selectedThreadIdRef.current ?? null;
    console.info(
      "[conversation-send] entry promptLength=%d selectedThreadId=%s selectedThread.threadId=%s selectedMessageCount=%d attachmentCount=%d pendingApproval=%o",
      trimmedPrompt.length,
      selectedThreadId,
      selectedThread?.threadId ?? null,
      selectedThread?.messages.length ?? 0,
      conversationAttachments.length,
      pendingApproval
    );
    const orchestrationApprovalContext =
      isAffirmativeApprovalPrompt
        ? resolveOrchestrationApprovalContext(activeThreadId)
        : null;
    const fallbackPendingApproval =
      effectiveEnvironmentId && isAffirmativeApprovalPrompt && pendingApproval == null && orchestrationApprovalContext == null
        ? await refreshPendingConversationApproval(effectiveEnvironmentId)
        : null;
    const threadScopedPendingApproval =
      pendingApproval == null ||
      activeThreadId == null ||
      pendingApproval.threadId == null ||
      pendingApproval.threadId === activeThreadId
        ? pendingApproval
        : null;
    const threadScopedFallbackPendingApproval =
      fallbackPendingApproval == null ||
      activeThreadId == null ||
      fallbackPendingApproval.threadId == null ||
      fallbackPendingApproval.threadId === activeThreadId
        ? fallbackPendingApproval
        : null;
    const approvalActorMessageId =
      threadScopedPendingApproval?.actorMessageId ??
      orchestrationApprovalContext?.actorMessageId ??
      threadScopedFallbackPendingApproval?.actorMessageId ??
      null;
    const approvalId =
      threadScopedPendingApproval?.approvalId ??
      orchestrationApprovalContext?.approvalId ??
      threadScopedFallbackPendingApproval?.approvalId ??
      null;
    const approvalSessionId =
      threadScopedPendingApproval?.sessionId ??
      orchestrationApprovalContext?.sessionId ??
      threadScopedFallbackPendingApproval?.sessionId ??
      null;
    const isApprovalConfirmation =
      isAffirmativeApprovalPrompt &&
      (approvalId != null || approvalActorMessageId != null);
    const routedThreadId =
      isApprovalConfirmation
        ? pendingApproval?.threadId ??
          orchestrationApprovalContext?.threadId ??
          threadScopedFallbackPendingApproval?.threadId ??
          selectedThreadId ??
          selectedThreadIdRef.current
        : selectedThreadId;
    console.info(
      "[conversation-send] approval-check prompt=%s affirmative=%o approvalId=%s sessionId=%s pendingActorMessageId=%s fallbackActorMessageId=%s routedThreadId=%s",
      trimmedPrompt,
      isAffirmativeApprovalPrompt,
      approvalId,
      approvalSessionId,
      threadScopedPendingApproval?.actorMessageId ?? null,
      threadScopedFallbackPendingApproval?.actorMessageId ?? null,
      routedThreadId
    );
    if (isAffirmativeApprovalPrompt && !approvalId && !approvalActorMessageId) {
      console.info(
        "[conversation-send] no-governed-approval-context prompt=%s; treating as ordinary conversational follow-up",
        trimmedPrompt
      );
    }
    if (
      !effectiveEnvironmentId ||
      !routedThreadId ||
      (trimmedPrompt.length === 0 && conversationAttachments.length === 0)
    ) {
      console.info(
        "[conversation-send] precondition-blocked environmentId=%s routedThreadId=%s promptLength=%d attachmentCount=%d",
        effectiveEnvironmentId ?? null,
        routedThreadId ?? null,
        trimmedPrompt.length,
        conversationAttachments.length
      );
      if (trimmedPrompt.length > 0 && !routedThreadId) {
        failConversationSend(
          "No active conversation session is currently selected for Context Chat."
        );
      }
      return;
    }

      const currentThreadId = routedThreadId;
      const priorMessageCount = selectedThread?.messages.length ?? 0;

    try {
      beginConversationSendSession(currentThreadId);
      applyOptimisticConversationUserMessage(currentThreadId, trimmedPrompt);
      console.info(
        "[conversation-send] optimistic-user-message-applied threadId=%s prompt=%s",
        currentThreadId,
        trimmedPrompt
      );
      const sendConversationMessage = window.sbclAgentDesktop.command.sendConversationMessage;
      const approveActorMessage = window.sbclAgentDesktop.command.approveActorMessage;
      const approveApproval = window.sbclAgentDesktop.command.approveApproval;
      if (!isApprovalConfirmation && typeof sendConversationMessage !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose sendConversationMessage yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      if (isApprovalConfirmation && approvalId && typeof approveApproval !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose approveApproval yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      if (isApprovalConfirmation && !approvalId && typeof approveActorMessage !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose approveActorMessage yet. Restart Surface so the updated preload bundle is loaded."
        );
      }

      const result = isApprovalConfirmation
        ? approvalId
          ? await approveApproval({
              environmentId: effectiveEnvironmentId,
              approvalId,
              sessionId: approvalSessionId
            })
          : await approveActorMessage({
              environmentId: effectiveEnvironmentId,
              actorMessageId: approvalActorMessageId!
            })
        : await sendConversationMessage({
            environmentId: effectiveEnvironmentId,
            threadId: currentThreadId,
            prompt: trimmedPrompt,
            attachments: conversationAttachments,
            surfaceContext: buildConversationSurfaceContext(conversationSurfacePacketInput),
            surfaceActions: buildConversationSurfaceActions(conversationSurfacePacketInput)
          });
      const shouldRetryApprovalByActorMessage =
        isApprovalConfirmation &&
        approvalId &&
        approvalActorMessageId &&
        result.status === "error" &&
        typeof result.data.summary === "string" &&
        result.data.summary.includes("Unknown awaiting approval");
      const effectiveResult = shouldRetryApprovalByActorMessage
        ? await approveActorMessage({
            environmentId: effectiveEnvironmentId,
            actorMessageId: approvalActorMessageId
          })
        : result;
      if (shouldRetryApprovalByActorMessage) {
        console.info(
          "[conversation-send] retrying-approval-via-actor-message approvalId=%s actorMessageId=%s",
          approvalId,
          approvalActorMessageId
        );
      }
      void refreshDesktopTaskRecords(effectiveEnvironmentId);
      void refreshOrchestrationInbox(effectiveEnvironmentId);
      void refreshDesktopTaskActorFlow(effectiveEnvironmentId, {
        sessionId: approvalSessionId ?? pendingConversationApprovalRef.current?.sessionId ?? null,
        approvalId: approvalId ?? pendingConversationApprovalRef.current?.approvalId ?? null,
        actorMessageId:
          approvalActorMessageId ?? pendingConversationApprovalRef.current?.actorMessageId ?? null
      });
      void refreshDesktopTaskActorTrace(effectiveEnvironmentId);
      void refreshDesktopTaskDeadLetters(effectiveEnvironmentId);
      const inlineActorFlow = asRecord(effectiveResult.data.actorFlow);
      if (Object.keys(inlineActorFlow).length > 0) {
        setDesktopTaskActorFlow(inlineActorFlow);
      }
      const assistantMessage =
        effectiveResult.data.assistantMessage ??
        buildRuntimeAssistantMessageFromReply(
          asRecord(effectiveResult.data.runtimeReply)
        ) ??
        "";
      const pendingApproval = asRecord(effectiveResult.data.pendingApproval);
      const pendingActorMessageId =
        firstStringValue(
          Array.isArray(pendingApproval.actorMessageIds) ? pendingApproval.actorMessageIds[0] : null,
          pendingApproval.actorMessageId
        ) ??
        effectiveResult.data.taskRecordSummaries
          ?.map((record) => asRecord(record))
          .map((record) =>
            firstStringValue(record.actorMessageId, asRecord(record.actorMessage).id)
          )
          .find((value) => Boolean(value)) ?? null;
      const pendingApprovalId = firstStringValue(
        Array.isArray(pendingApproval.approvalIds) ? pendingApproval.approvalIds[0] : null,
        pendingApproval.approvalId
      );
      const pendingApprovalSessionId = firstStringValue(pendingApproval.sessionId);
      const pendingApprovalThreadId = firstStringValue(pendingApproval.threadId) ?? currentThreadId;
      const pendingPolicyIds = Array.isArray(pendingApproval.policyIds)
        ? pendingApproval.policyIds.map((value) => String(value))
        : [];
      console.info(
        "[conversation-send] status=%s threadId=%s turnId=%s attachmentCount=%d summaryLength=%d summary=%s assistantMessage=%s runtimeReply=%o taskResultCount=%d taskRecordCount=%d pendingApproval=%o",
        effectiveResult.status,
        effectiveResult.data.threadId,
        effectiveResult.data.turnId,
        conversationAttachments.length,
        effectiveResult.data.summary?.length ?? 0,
        effectiveResult.data.summary ?? "",
        assistantMessage,
        effectiveResult.data.runtimeReply ?? null,
        effectiveResult.data.desktopTaskResults?.length ?? 0,
        effectiveResult.data.taskRecordSummaries?.length ?? 0,
        effectiveResult.data.pendingApproval ?? null
      );

      if (
        effectiveResult.status === "error" ||
        effectiveResult.status === "rejected" ||
        effectiveResult.status === "awaiting_approval"
      ) {
        const nextThreadId =
          effectiveResult.data.threadId && effectiveResult.data.threadId !== "thread"
            ? effectiveResult.data.threadId
            : currentThreadId;
        const failureSummary =
          effectiveResult.status === "error" || effectiveResult.status === "rejected"
            ? effectiveResult.data.summary || "The live provider could not complete this conversation turn."
            : null;
        if (effectiveResult.status !== "awaiting_approval") {
          await reconcileConversationSendResult(
            effectiveResult,
            effectiveEnvironmentId,
            currentThreadId,
            priorMessageCount
          );
        } else {
          setSelectedThreadId(nextThreadId);
          await loadThreadDetail(nextThreadId, effectiveEnvironmentId, {
            preserveEmptyThread: true
          });
        }
        applyDesktopTaskCommandResults(effectiveResult.data.desktopTaskResults);
        mergeDesktopTaskRecordSummaries(effectiveResult.data.taskRecordSummaries);
        const resolvedPendingApprovalThreadId = pendingApprovalThreadId ?? nextThreadId;
        if (failureSummary) {
          void refreshDesktopTaskRecords(effectiveEnvironmentId);
          const resolvedPendingApproval =
            pendingApprovalId || pendingActorMessageId
              ? {
                  actorMessageId: pendingActorMessageId ?? null,
                  approvalId: pendingApprovalId ?? null,
                  sessionId: pendingApprovalSessionId ?? null,
                  threadId: resolvedPendingApprovalThreadId ?? null,
                  policyIds: pendingPolicyIds
                }
              : await refreshPendingConversationApproval(effectiveEnvironmentId);
          if (applyApprovalRequiredConversationState(resolvedPendingApprovalThreadId, failureSummary, resolvedPendingApproval)) {
            return;
          }
          failConversationSend(failureSummary);
          return;
        }
      }

      if (
        effectiveResult.status === "awaiting_approval" &&
        (pendingApprovalId || pendingActorMessageId)
      ) {
        const approvalSummary =
          effectiveResult.data.summary ||
          "This action requires approval before I can continue.";
        if (
          applyApprovalRequiredConversationState(currentThreadId, approvalSummary, {
            actorMessageId: pendingActorMessageId ?? null,
            approvalId: pendingApprovalId ?? null,
            sessionId: pendingApprovalSessionId ?? null,
            policyIds: pendingPolicyIds
          })
        ) {
          void refreshDesktopTaskRecords(effectiveEnvironmentId);
          void refreshDesktopTaskActorFlow(effectiveEnvironmentId, {
            sessionId: pendingApprovalSessionId ?? null,
            approvalId: pendingApprovalId ?? null,
            actorMessageId: pendingActorMessageId ?? null
          });
          return;
        }
      }

      completeConversationSendSuccess();
      applyDesktopTaskCommandResults(effectiveResult.data.desktopTaskResults);
      mergeDesktopTaskRecordSummaries(effectiveResult.data.taskRecordSummaries);
      if (isApprovalConfirmation) {
        setPendingConversationApproval(null);
        void refreshDesktopTaskActorFlow(effectiveEnvironmentId, {
          sessionId: approvalSessionId ?? null,
          approvalId: approvalId ?? null,
          actorMessageId: approvalActorMessageId ?? null
        });
      } else {
        const actorMessageId =
          firstStringValue(
            Array.isArray(pendingApproval.actorMessageIds) ? pendingApproval.actorMessageIds[0] : null,
            pendingApproval.actorMessageId
          ) ?? null;
        const approvalId = firstStringValue(
          Array.isArray(pendingApproval.approvalIds) ? pendingApproval.approvalIds[0] : null,
          pendingApproval.approvalId
        );
        const sessionId = firstStringValue(pendingApproval.sessionId);
        const pendingThreadId = firstStringValue(pendingApproval.threadId) ?? result.data.threadId ?? currentThreadId;
        const policyIds = Array.isArray(pendingApproval.policyIds)
          ? pendingApproval.policyIds.map((value) => String(value))
          : [];
        if ((approvalId || actorMessageId) && policyIds.length > 0) {
          setPendingConversationApproval({
            actorMessageId,
            approvalId: approvalId ?? null,
            sessionId: sessionId ?? null,
            threadId: pendingThreadId,
            policyIds
          });
          void refreshDesktopTaskActorFlow(effectiveEnvironmentId, {
            sessionId: sessionId ?? null,
            approvalId: approvalId ?? null,
            actorMessageId
          });
          if (pendingThreadId) {
            stickyConversationThreadIdRef.current = pendingThreadId;
          }
        } else {
          void refreshPendingConversationApproval(effectiveEnvironmentId);
        }
      }
      applyOptimisticConversationSendSuccess(
        effectiveResult.data.threadId && effectiveResult.data.threadId !== "thread" ? effectiveResult.data.threadId : currentThreadId,
        effectiveResult.data.turnId && effectiveResult.data.turnId !== "turn" ? effectiveResult.data.turnId : null,
        assistantMessage,
        {
          replaceExistingTurnMessages: !isApprovalConfirmation
        }
      );
      setIsSendingConversation(false);

      void reconcileConversationSendResult(
        effectiveResult,
        effectiveEnvironmentId,
        currentThreadId,
        priorMessageCount
      )
        .then(({ failureSummary }) => {
          void refreshDesktopTaskRecords(effectiveEnvironmentId);
          if (failureSummary) {
            failConversationSend(failureSummary);
            return;
          }
        })
        .catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to reconcile the completed conversation turn."
          );
        });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send the conversation message.";
      if (applyApprovalRequiredConversationState(currentThreadId, message, pendingApproval ?? null)) {
        return;
      }
      failConversationSend(message);
    } finally {
      setIsSendingConversation(false);
    }
  }

  async function loadDocumentationPage(slug: string): Promise<void> {
    try {
      const page = await window.sbclAgentDesktop.desktop.readDocumentationPage(slug);
      setSelectedDocumentationPage(page);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation page.");
    }
  }

  async function loadProjectWorkspace(environmentId: string): Promise<void> {
    const inFlightKey = environmentId;
    const existingLoad = projectWorkspaceLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.projectList(environmentId);
        setProjectListResult(result);
        setSelectedGovernedProjectId((current) => {
          if (current && result.data.projects.some((project) => project.projectId === current)) {
            return current;
          }
          if (currentProjectId && result.data.projects.some((project) => project.projectId === currentProjectId)) {
            return currentProjectId;
          }
          return result.data.currentProjectId ?? result.data.projects[0]?.projectId ?? null;
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load project workspace.");
      } finally {
        if (projectWorkspaceLoadRef.current.get(inFlightKey) === loadPromise) {
          projectWorkspaceLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    projectWorkspaceLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  async function loadMemoryWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.memoryList(environmentId);
      setMemoryListResult(result);
      const entries = Array.isArray(result.data.entries) ? result.data.entries : [];
      setSelectedMemoryId((current) => {
        if (current && entries.some((entry) => entry.memoryId === current)) {
          return current;
        }
        return entries[0]?.memoryId ?? null;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load retained memories.");
    }
  }

  async function handleUpdateMemory(input: Omit<MemoryUpdateInput, "environmentId">): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    try {
      setPendingUpdateMemoryId(input.memoryId);
      const result = await window.sbclAgentDesktop.command.updateMemory({
        environmentId: effectiveEnvironmentId,
        ...input
      });
      setMemoryListResult((current) => {
        if (!current) {
          return current;
        }
        const nextEntries = current.data.entries.map((entry) =>
          entry.memoryId === result.data.memoryId ? result.data : entry
        );
        return {
          ...current,
          data: {
            ...current.data,
            entries: nextEntries,
            entryCount: nextEntries.length
          }
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update retained memory.");
    } finally {
      setPendingUpdateMemoryId(null);
    }
  }

  async function handleDeleteMemory(memoryId: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    try {
      setPendingDeleteMemoryId(memoryId);
      const result: CommandResultDto<MemoryDeleteResultDto> =
        await window.sbclAgentDesktop.command.deleteMemory({
          environmentId: effectiveEnvironmentId,
          memoryId
        });
      if (result.data.deletedP) {
        setMemoryListResult((current) => {
          if (!current) {
            return current;
          }
          const nextEntries = current.data.entries.filter((entry) => entry.memoryId !== memoryId);
          return {
            ...current,
            data: {
              ...current.data,
              entries: nextEntries,
              entryCount: nextEntries.length
            }
          };
        });
        setSelectedMemoryId((current) => (current === memoryId ? null : current));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete retained memory.");
    } finally {
      setPendingDeleteMemoryId(null);
    }
  }

  async function loadProjectDetail(projectId: string, environmentId: string): Promise<void> {
    const inFlightKey = `${environmentId}:${projectId}`;
    const existingLoad = projectDetailLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
        setSelectedProjectDetail(result.data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load project detail.");
      } finally {
        if (projectDetailLoadRef.current.get(inFlightKey) === loadPromise) {
          projectDetailLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    projectDetailLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  function applyConversationThreadList(
    threadEntries: ThreadSummaryDto[],
    preferredThreadIdOverride?: string | null
  ): string | null {
    const preferredThreadId =
      preferredThreadIdOverride ??
      stickyConversationThreadIdRef.current ??
      selectedThreadIdRef.current ??
      (currentProjectId ? selectedConversationThreadByProject[currentProjectId] : null);
    const preferredThreadExists =
      preferredThreadId != null && threadEntries.some((thread) => thread.threadId === preferredThreadId);
    const optimisticPreferredThread =
      preferredThreadId && !preferredThreadExists
        ? threads.find((thread) => thread.threadId === preferredThreadId) ??
          (selectedThread && selectedThread.threadId === preferredThreadId
            ? {
                threadId: selectedThread.threadId,
                title: selectedThread.title,
                summary: selectedThread.summary,
                state: selectedThread.state,
                latestActivityAt: selectedThread.turns.at(-1)?.createdAt ?? new Date().toISOString(),
                latestTurnState: selectedThread.turns.at(-1)?.state ?? "background",
                attentionFlags: []
              }
            : null)
        : null;
    const nextThreads =
      optimisticPreferredThread && !threadEntries.some((thread) => thread.threadId === optimisticPreferredThread.threadId)
        ? [optimisticPreferredThread, ...threadEntries]
        : threadEntries;
    setThreads(nextThreads);

    const nextThreadId =
      preferredThreadIdOverride && preferredThreadId
        ? preferredThreadId
        : preferredThreadId && nextThreads.some((thread) => thread.threadId === preferredThreadId)
          ? preferredThreadId
          : stickyConversationThreadIdRef.current
            ? stickyConversationThreadIdRef.current
            : nextThreads[0]?.threadId ?? null;
    console.info(
      "[conversation-workspace] count=%d preferredThreadId=%s nextThreadId=%s",
      nextThreads.length,
      preferredThreadId,
      nextThreadId
    );
    if (preferredThreadId && nextThreadId === preferredThreadId && stickyConversationThreadIdRef.current == null) {
      stickyConversationThreadIdRef.current = preferredThreadId;
    }
    setSelectedThreadId(nextThreadId);
    return nextThreadId;
  }

  function logSurfacePerf(label: string, startedAt: number, details?: Record<string, unknown>): void {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    if (details) {
      console.info("[surface-perf] %s durationMs=%d details=%o", label, durationMs, details);
      return;
    }
    console.info("[surface-perf] %s durationMs=%d", label, durationMs);
  }

  async function refreshConversationThreadList(
    environmentId: string,
    preferredThreadIdOverride?: string | null
  ): Promise<{
    threadResult: QueryResultDto<ThreadSummaryDto[]>;
    nextThreadId: string | null;
  }> {
    const startedAt = performance.now();
    const threadResult = await window.sbclAgentDesktop.query.threadList(environmentId);
    const nextThreadId = applyConversationThreadList(threadResult.data, preferredThreadIdOverride);
    logSurfacePerf("conversation.thread-list", startedAt, {
      environmentId,
      preferredThreadIdOverride,
      count: threadResult.data.length,
      nextThreadId
    });
    return { threadResult, nextThreadId };
  }

  async function loadConversationWorkspace(
    environmentId: string,
    preferredThreadIdOverride?: string | null,
    allowSeedFallback = true
  ): Promise<void> {
    try {
      const conversationWorkspace = window.sbclAgentDesktop.query.conversationWorkspace;
      if (typeof conversationWorkspace !== "function") {
        await refreshConversationThreadList(environmentId, preferredThreadIdOverride);
        return;
      }
      const startedAt = performance.now();
      const preferredThreadId =
        preferredThreadIdOverride ??
        stickyConversationThreadIdRef.current ??
        selectedThreadIdRef.current ??
        (currentProjectId ? selectedConversationThreadByProject[currentProjectId] : null);
      const createConversationThread = window.sbclAgentDesktop.command.createConversationThread;
      const workspaceResult = await conversationWorkspace({
        environmentId,
        threadId: preferredThreadId,
        turnId: selectedTurnId
      });
      if (
        workspaceResult.data.threads.length > 0 &&
        !preferredThreadId
      ) {
        const existingThreadId = applyConversationThreadList(workspaceResult.data.threads, preferredThreadIdOverride);
        if (existingThreadId) {
          await loadThreadDetail(existingThreadId, environmentId, {
            preserveEmptyThread: true
          });
          return;
        }
      }
      if (workspaceResult.data.threads.length === 0) {
        const { threadResult, nextThreadId } = await refreshConversationThreadList(
          environmentId,
          preferredThreadIdOverride
        );
        if (threadResult.data.length > 0) {
          if (nextThreadId) {
            await loadThreadDetail(nextThreadId, environmentId);
          } else {
            setSelectedThread(null);
            setSelectedTurnId(null);
            setSelectedTurn(null);
          }
          return;
        }
        if (threadResult.data.length === 0 && allowSeedFallback) {
          if (typeof createConversationThread === "function") {
            const result = await createConversationThread({
              environmentId,
              title: "Environment Orientation",
              summary: "A completed planning conversation anchors the desktop shell."
            });
            await refreshConversationThreadList(environmentId, result.data.threadId);
            stickyConversationThreadIdRef.current = result.data.threadId;
        setSelectedThreadId(result.data.threadId);
            await loadThreadDetail(result.data.threadId, environmentId, {
              preserveEmptyThread: true
            });
            return;
          }
        }
        return;
      }
      const nextThreadId = applyConversationThreadList(workspaceResult.data.threads, preferredThreadIdOverride);
      const workspaceSelectedThread =
        workspaceResult.data.selectedThread &&
        nextThreadId &&
        workspaceResult.data.selectedThread.threadId === nextThreadId
          ? workspaceResult.data.selectedThread
          : null;
      const preservedCurrentThread = incomingThreadDetailIsStale(
        selectedThread,
        workspaceSelectedThread
      );
      if (workspaceSelectedThread && !preservedCurrentThread) {
        applyLoadedThreadDetail(workspaceSelectedThread);
        if (workspaceResult.data.selectedTurn) {
          setSelectedTurn(workspaceResult.data.selectedTurn);
        }
      } else if (workspaceSelectedThread && preservedCurrentThread) {
        console.info(
          "[conversation-workspace] preserving-current-thread threadId=%s currentMessages=%d incomingMessages=%d currentTurns=%d incomingTurns=%d",
          workspaceSelectedThread.threadId,
          selectedThread?.messages.length ?? 0,
          workspaceSelectedThread.messages.length,
          selectedThread?.turns.length ?? 0,
          workspaceSelectedThread.turns.length
        );
      } else if (nextThreadId) {
        if (selectedThread?.threadId !== nextThreadId) {
          await loadThreadDetail(nextThreadId, environmentId, {
            preserveEmptyThread: true
          });
        }
      } else if (!nextThreadId) {
        setSelectedThread(null);
        setSelectedTurnId(null);
        setSelectedTurn(null);
      }
      logSurfacePerf("conversation.workspace", startedAt, {
        environmentId,
        preferredThreadIdOverride,
        count: workspaceResult.data.threads.length,
        nextThreadId,
        hasSelectedThread: workspaceSelectedThread != null,
        preservedCurrentThread,
        hasSelectedTurn: workspaceResult.data.selectedTurn != null
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load conversation workspace.");
    }
  }

  async function loadThreadDetailWithExpectation(
    threadId: string,
    environmentId: string,
    expectation?: {
      expectedTurnId?: string | null;
      minimumMessageCount?: number;
      requireAssistantMessageForTurn?: boolean;
    }
  ): Promise<QueryResultDto<ThreadDetailDto>> {
    const startedAt = performance.now();
    const expectedTurnId = expectation?.expectedTurnId ?? null;
    const minimumMessageCount = expectation?.minimumMessageCount ?? 0;
    const requireAssistantMessageForTurn = expectation?.requireAssistantMessageForTurn ?? false;
    let detailResult = await window.sbclAgentDesktop.query.threadDetail(threadId, environmentId);
    let retryCount = 0;

    if (expectedTurnId || minimumMessageCount > 0 || requireAssistantMessageForTurn) {
      let attemptsRemaining = 4;
      while (attemptsRemaining > 0) {
        const hasExpectedTurn =
          !expectedTurnId || detailResult.data.turns.some((turn) => turn.turnId === expectedTurnId);
        const hasExpectedMessageCount = detailResult.data.messages.length >= minimumMessageCount;
        const hasAssistantMessageForTurn =
          !requireAssistantMessageForTurn ||
          !expectedTurnId ||
          detailResult.data.messages.some(
            (message) => message.turnId === expectedTurnId && message.role === "assistant"
          );
        if (hasExpectedTurn && hasExpectedMessageCount && hasAssistantMessageForTurn) {
          break;
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
        detailResult = await window.sbclAgentDesktop.query.threadDetail(threadId, environmentId);
        retryCount += 1;
        attemptsRemaining -= 1;
      }
    }

    logSurfacePerf("conversation.thread-detail", startedAt, {
      threadId,
      expectedTurnId,
      minimumMessageCount,
      requireAssistantMessageForTurn,
      messageCount: detailResult.data.messages.length,
      turnCount: detailResult.data.turns.length,
      retryCount
    });
    return detailResult;
  }

  function applyLoadedThreadDetail(
    threadDetail: ThreadDetailDto,
    expectation?: {
      expectedTurnId?: string | null;
      minimumMessageCount?: number;
    }
  ): void {
    const expectedTurnId = expectation?.expectedTurnId ?? null;
    const minimumMessageCount = expectation?.minimumMessageCount ?? 0;
    console.info(
      "[conversation-thread] threadId=%s messageCount=%d turnCount=%d expectedTurnId=%s minimumMessageCount=%d",
      threadDetail.threadId,
      threadDetail.messages.length,
      threadDetail.turns.length,
      expectedTurnId,
      minimumMessageCount
    );
    const isPlaceholderThreadId = threadDetail.threadId.trim().toLowerCase() === "thread";
    setSelectedThread((current) => {
      if (isPlaceholderThreadId) {
        console.info("[conversation-thread] dropping-placeholder-detail threadId=%s", threadDetail.threadId);
        return current;
      }
      if (
        current &&
        current.threadId === threadDetail.threadId &&
        current.messages.length > threadDetail.messages.length &&
        (threadDetailIsEmpty(threadDetail) || incomingThreadDetailIsStale(current, threadDetail))
      ) {
        console.info(
          "[conversation-thread] preserving-richer-local-detail threadId=%s currentMessages=%d incomingMessages=%d",
          threadDetail.threadId,
          current.messages.length,
          threadDetail.messages.length
        );
        return current;
      }
      return threadDetail;
    });
    if (isPlaceholderThreadId) {
      return;
    }
    if (!threadDetailIsEmpty(threadDetail) && stickyConversationThreadIdRef.current === threadDetail.threadId) {
      stickyConversationThreadIdRef.current = null;
    }

    const nextTurnId = expectedTurnId ?? selectedTurnId ?? threadDetail.turns[0]?.turnId ?? null;
    setSelectedTurnId(nextTurnId);
  }

  function incomingThreadDetailIsStale(
    currentThreadDetail: ThreadDetailDto | null,
    incomingThreadDetail: ThreadDetailDto | null
  ): boolean {
    if (!currentThreadDetail || !incomingThreadDetail) {
      return false;
    }
    if (currentThreadDetail.threadId !== incomingThreadDetail.threadId) {
      return false;
    }
    return (
      incomingThreadDetail.messages.length < currentThreadDetail.messages.length ||
      incomingThreadDetail.turns.length < currentThreadDetail.turns.length
    );
  }

  function threadDetailHasAssistantMessageForTurn(
    threadDetail: ThreadDetailDto | null,
    turnId: string | null
  ): boolean {
    if (!threadDetail || !turnId) {
      return false;
    }
    return threadDetail.messages.some(
      (message) => message.turnId === turnId && message.role === "assistant"
    );
  }

  function threadDetailIsEmpty(threadDetail: ThreadDetailDto | null): boolean {
    if (!threadDetail) {
      return true;
    }
    return threadDetail.messages.length === 0 && threadDetail.turns.length === 0;
  }

  async function loadThreadDetail(
    threadId: string,
    environmentId: string,
    expectation?: {
      expectedTurnId?: string | null;
      minimumMessageCount?: number;
      preserveEmptyThread?: boolean;
    }
  ): Promise<void> {
    try {
      const detailResult = await loadThreadDetailWithExpectation(threadId, environmentId, expectation);
      const activeThreadId =
        stickyConversationThreadIdRef.current ??
        selectedThreadIdRef.current ??
        (currentProjectId ? selectedConversationThreadByProject[currentProjectId] : null);
      const pinnedThreadId =
        selectedThreadIdRef.current ??
        (currentProjectId ? selectedConversationThreadByProject[currentProjectId] : null);
      if (
        activeThreadId &&
        activeThreadId !== threadId &&
        !expectation?.expectedTurnId &&
        !expectation?.minimumMessageCount
      ) {
        console.info(
          "[conversation-thread] dropping-stale-detail-load requested=%s active=%s",
          threadId,
          activeThreadId
        );
        return;
      }
      const preserveSelectedEmptyThread =
        pinnedThreadId === threadId || stickyConversationThreadIdRef.current === threadId;
      if (
        threadDetailIsEmpty(detailResult.data) &&
        !expectation?.expectedTurnId &&
        !expectation?.minimumMessageCount &&
        !expectation?.preserveEmptyThread &&
        !preserveSelectedEmptyThread
      ) {
        const alternativeThreads = threads.filter((entry) => entry.threadId !== threadId);
        for (const alternativeThread of alternativeThreads) {
          const alternativeResult = await loadThreadDetailWithExpectation(
            alternativeThread.threadId,
            environmentId,
            expectation
          );
          if (!threadDetailIsEmpty(alternativeResult.data)) {
            setSelectedThreadId(alternativeThread.threadId);
            applyLoadedThreadDetail(alternativeResult.data, expectation);
            return;
          }
        }
      }
      applyLoadedThreadDetail(detailResult.data, expectation);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load thread detail.");
    }
  }

  async function loadTurnDetail(turnId: string, environmentId: string): Promise<void> {
    try {
      const detailResult = await window.sbclAgentDesktop.query.turnDetail(turnId, environmentId);
      setSelectedTurn(detailResult.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load turn detail.");
    }
  }

  function selectConversationThread(threadId: string): void {
    stickyConversationThreadIdRef.current = threadId;
    setSelectedThreadId(threadId);
    if (
      effectiveEnvironmentId &&
      (selectedThreadIdRef.current !== threadId || !selectedThread || selectedThread.threadId !== threadId)
    ) {
      void loadThreadDetail(threadId, effectiveEnvironmentId, {
        preserveEmptyThread: true
      });
    }
  }

  async function loadRuntimeWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.runtimeSummary(environmentId);
      setRuntimeSummary(result.data);
      setSelectedPackageName((current) => current || result.data.currentPackage);
      if (currentProjectId) {
        const existingSessions = replSessionsByProject[currentProjectId] ?? [];
        if (existingSessions.length === 0) {
          const defaultSession = buildDefaultReplSession(environmentId, result.data);
          setReplSessionsByProject((current) => ({ ...current, [currentProjectId]: [defaultSession] }));
          setCurrentReplSessionIdByProject((current) => ({ ...current, [currentProjectId]: defaultSession.sessionId }));
          setRuntimeForm(defaultSession.draftForm);
        } else {
          const currentSessionId = currentReplSessionIdByProject[currentProjectId] ?? existingSessions[0]?.sessionId ?? null;
          const selectedSession = existingSessions.find((session) => session.sessionId === currentSessionId) ?? existingSessions[0] ?? null;
          if (selectedSession) {
            setRuntimeForm(selectedSession.draftForm);
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load runtime workspace.");
    }
  }

  async function loadRuntimeTelemetry(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.runtimeTelemetrySnapshot(environmentId);
      setRuntimeTelemetry(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load runtime telemetry.");
    }
  }

  async function loadConsoleLogStream(
    environmentId: string,
    plane: "environment" | "host" = selectedConsolePlane
  ): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.consoleLogStream({
        environmentId,
        plane,
        limit: 100
      });
      setConsoleLogStream(result);
      setSelectedConsoleEntryId((current) => current ?? result.data.entries[0]?.entryId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load console stream.");
    }
  }

  async function loadTranscriptConsoleStreams(environmentId: string): Promise<void> {
    try {
      const startedAt = performance.now();
      const includeEnvironmentConsole =
        selectedTranscriptSourceFilter === "all" ||
        selectedTranscriptSourceFilter === "environment-console";
      const includeHostConsole =
        selectedTranscriptSourceFilter === "all" ||
        selectedTranscriptSourceFilter === "host-console";
      const [environmentResult, hostResult] = await Promise.all([
        includeEnvironmentConsole
          ? window.sbclAgentDesktop.query.consoleLogStream({
              environmentId,
              plane: "environment",
              limit: 40
            })
          : Promise.resolve(null),
        includeHostConsole
          ? window.sbclAgentDesktop.query.consoleLogStream({
              environmentId,
              plane: "host",
              limit: 40
            })
          : Promise.resolve(null)
      ]);
      setEnvironmentConsoleLogStream(environmentResult);
      setHostConsoleLogStream(hostResult);
      logSurfacePerf("transcript.console-streams", startedAt, {
        environmentEntries: environmentResult?.data.entries.length ?? 0,
        hostEntries: hostResult?.data.entries.length ?? 0,
        selectedSourceFilter: selectedTranscriptSourceFilter
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load transcript console streams.");
    }
  }

  async function loadTranscriptWorkspace(environmentId: string): Promise<void> {
    try {
      const transcriptWorkspace = window.sbclAgentDesktop.query.transcriptWorkspace;
      if (typeof transcriptWorkspace !== "function") {
        await Promise.all([
          shouldLoadTranscriptActivityEntries()
            ? loadActivityWorkspace(environmentId)
            : Promise.resolve(),
          shouldLoadTranscriptConsoleEntries()
            ? loadTranscriptConsoleStreams(environmentId)
            : Promise.resolve()
        ]);
        return;
      }
      const startedAt = performance.now();
      const includeEvents = shouldLoadTranscriptActivityEntries();
      const includeEnvironmentConsole =
        selectedTranscriptSourceFilter === "all" ||
        selectedTranscriptSourceFilter === "environment-console";
      const includeHostConsole =
        selectedTranscriptSourceFilter === "all" ||
        selectedTranscriptSourceFilter === "host-console";
      const [workspaceResult, hostResult] = await Promise.all([
        includeEvents || includeEnvironmentConsole
          ? transcriptWorkspace({
              environmentId,
              families: eventFamilyFilter === "all" ? undefined : [eventFamilyFilter],
              visibility: eventVisibilityFilter === "all" ? undefined : [eventVisibilityFilter],
              eventLimit: 12,
              includeEvents,
              includeEnvironmentConsole,
              consoleLimit: 40
            })
          : Promise.resolve(null),
        includeHostConsole
          ? window.sbclAgentDesktop.query.consoleLogStream({
              environmentId,
              plane: "host",
              limit: 40
            })
          : Promise.resolve(null)
      ]);
      if (includeEvents) {
        setEnvironmentEvents(workspaceResult?.data.events ?? []);
        setSelectedEventCursor((current) => current ?? workspaceResult?.data.events[0]?.cursor ?? null);
      }
      if (includeEnvironmentConsole) {
        setEnvironmentConsoleLogStream(
          workspaceResult?.data.environmentConsole
            ? {
                contractVersion: workspaceResult.contractVersion,
                domain: "console",
                operation: "console.stream",
                kind: "query",
                status: "ok",
                data: workspaceResult.data.environmentConsole,
                metadata: workspaceResult.metadata
              }
            : null
        );
      } else {
        setEnvironmentConsoleLogStream(null);
      }
      if (includeHostConsole) {
        setHostConsoleLogStream(hostResult);
      } else {
        setHostConsoleLogStream(null);
      }
      logSurfacePerf("transcript.workspace", startedAt, {
        selectedSourceFilter: selectedTranscriptSourceFilter,
        eventCount: workspaceResult?.data.events.length ?? 0,
        environmentEntries: workspaceResult?.data.environmentConsole?.entries.length ?? 0,
        hostEntries: hostResult?.data.entries.length ?? 0
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load transcript workspace.");
    }
  }

  async function loadDiagnosticReports(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.diagnosticReportList(environmentId);
      setDiagnosticReports(result.data);
      setSelectedDiagnosticReportId((current) => current ?? result.data[0]?.reportId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load diagnostic reports.");
    }
  }

  async function loadDiagnosticReportDetail(reportId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.diagnosticReportDetail(reportId, environmentId);
      setSelectedDiagnosticReport(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load diagnostic report detail.");
    }
  }

  async function loadPackageBrowser(packageName?: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.packageBrowser({
        environmentId: effectiveEnvironmentId,
        packageName
      });
      setPackageBrowser(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Package browser load failed.");
    }
  }

  async function loadRuntimeEntityDetail(
    symbol: string,
    packageName?: string,
    environmentIdOverride?: string | null
  ): Promise<void> {
    const detailEnvironmentId = environmentIdOverride ?? effectiveEnvironmentId;
    if (!detailEnvironmentId || symbol.trim().length === 0) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.runtimeEntityDetail({
        environmentId: detailEnvironmentId,
        symbol: symbol.trim(),
        packageName
      });
      setRuntimeEntityDetail(result);
    } catch (error) {
      console.error(
        "[browser-runtime-entity-detail] symbol=%s package=%s environmentId=%s error=%s",
        symbol,
        packageName ?? "",
        detailEnvironmentId,
        error instanceof Error ? error.message : String(error)
      );
      setRuntimeEntityDetail(null);
    }
  }

  async function evaluateRuntimeForm(): Promise<void> {
    if (!effectiveEnvironmentId || runtimeForm.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form: runtimeForm,
        packageName: runtimeSummary?.currentPackage,
        recoveryLaunch: runtimeRecoveryLaunch
      });
      setRuntimeResult(result);
      setRuntimeRecoveryLaunch(null);
      if (currentProjectId && currentReplSessionId) {
        await appendReplSessionHistoryEntry(currentProjectId, currentReplSessionId, runtimeForm, result);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  function setCurrentWorkspaceDraft(value: string): void {
    if (!currentProjectId) {
      return;
    }
    setWorkspaceDraftByProject((current) => ({
      ...current,
      [currentProjectId]: value
    }));
  }

  function setCurrentWorkspacePackage(value: string): void {
    if (!currentProjectId) {
      return;
    }
    setWorkspacePackageByProject((current) => ({
      ...current,
      [currentProjectId]: value
    }));
  }

  function updateCurrentEditorBuffers(
    updater: (buffers: EditorBufferStateDto[]) => EditorBufferStateDto[]
  ): void {
    const editorScopeId = currentProjectId ?? UNBOUND_EDITOR_SCOPE_ID;
    setEditorBuffersByProject((current) => {
      const existingBuffers =
        current[editorScopeId] ?? [
          createEditorBufferState({
            bufferId: currentProjectId ? `editor-buffer-${currentProjectId}-main` : "editor-buffer-unbound-main",
            title: DEFAULT_EDITOR_BUFFER_TITLE,
            draft: currentProjectId ? DEFAULT_EDITOR_BOUND_DRAFT : DEFAULT_EDITOR_UNBOUND_DRAFT,
            packageName: runtimeSummary?.currentPackage ?? "cl-user"
          })
        ];
      const nextBuffers = updater(existingBuffers);
      if (nextBuffers === existingBuffers) {
        return current;
      }
      return {
        ...current,
        [editorScopeId]: nextBuffers
      };
    });
  }

  function setCurrentEditorBufferId(bufferId: string): void {
    const editorScopeId = currentProjectId ?? UNBOUND_EDITOR_SCOPE_ID;
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [editorScopeId]: bufferId
    }));
  }

  function setCurrentEditorDraft(value: string): void {
    if (!currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              draft: value,
              dirty: true
            }
          : buffer
      )
    );
  }

  function appendToCurrentEditorDraft(insertedText: string): void {
    if (!currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              draft: appendEditorTextToDraft(buffer.draft, insertedText),
              dirty: true
            }
          : buffer
      )
    );
  }

  function setCurrentEditorPackage(value: string): void {
    if (!currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              packageName: value,
              dirty: true
            }
          : buffer
      )
    );
  }

  function createEditorBuffer(): void {
    if (!currentProjectId) {
      return;
    }
    const nextBuffer = createEditorBufferState({
      title: `Buffer ${currentEditorBuffers.length + 1}`,
      draft: DEFAULT_EDITOR_BOUND_DRAFT,
      packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage || "cl-user"
    });
    updateCurrentEditorBuffers((buffers) => [...buffers, nextBuffer]);
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: nextBuffer.bufferId
    }));
  }

  function cloneCurrentEditorBuffer(): void {
    if (!currentProjectId || !currentEditorBuffer) {
      return;
    }
    const nextBuffer = createEditorBufferState({
      title: `${currentEditorBuffer.title} Copy`,
      draft: currentEditorBuffer.draft,
      packageName: currentEditorBuffer.packageName,
      dirty: true,
      result: currentEditorBuffer.result,
      sourceFilePath: null
    });
    updateCurrentEditorBuffers((buffers) => [...buffers, nextBuffer]);
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: nextBuffer.bufferId
    }));
  }

  function deleteCurrentEditorBuffers(bufferIds: string[]): void {
    if (!currentProjectId || bufferIds.length === 0) {
      return;
    }
    const deleteIds = new Set(bufferIds);
    const remainingBuffers = currentEditorBuffers.filter((buffer) => !deleteIds.has(buffer.bufferId));
    const fallbackBuffer =
      remainingBuffers.length > 0
        ? null
        : createEditorBufferState({
            title: DEFAULT_EDITOR_BUFFER_TITLE,
            draft: DEFAULT_EDITOR_BOUND_DRAFT,
            packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage || "cl-user"
          });
    const nextBuffers = fallbackBuffer ? [fallbackBuffer] : remainingBuffers;
    const nextSelectedBufferId =
      nextBuffers.some((buffer) => buffer.bufferId === currentEditorBufferId)
        ? currentEditorBufferId
        : nextBuffers[0]?.bufferId ?? null;

    updateCurrentEditorBuffers(() => nextBuffers);
    if (nextSelectedBufferId) {
      setSelectedEditorBufferIdByProject((current) => ({
        ...current,
        [currentProjectId]: nextSelectedBufferId
      }));
    }
  }

  function acceptCurrentEditorBufferBaseline(): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              baselineDraft: buffer.draft,
              dirty: false
            }
          : buffer
      )
    );
  }

  function revertCurrentEditorBufferToBaseline(): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              draft: buffer.baselineDraft,
              dirty: false
            }
          : buffer
      )
    );
  }

  function openEditorSourceFileDialog(): void {
    const initialPath = sourcePreview?.data.path ?? "";
    setEditorSourceFilePathDraft(initialPath);
    setEditorSourceDirectoryPathDraft(parentDirectoryForPath(initialPath));
    setEditorSourceDirectoryListing(null);
    setIsEditorSourceFileDialogOpen(true);
    void loadEditorSourceDirectory(parentDirectoryForPath(initialPath));
  }

  function openEditorSourceFileSaveDialog(): void {
    const initialPath = currentEditorSourceFilePath ?? "";
    setEditorSourceSaveFileNameDraft(
      initialPath.trim().length > 0
        ? basenameForPath(initialPath)
        : currentEditorBufferTitle.toLowerCase().endsWith(".lisp")
          ? currentEditorBufferTitle
          : `${currentEditorBufferTitle.replace(/\s+/g, "-").toLowerCase()}.lisp`
    );
    setEditorSourceSaveDirectoryPathDraft(parentDirectoryForPath(initialPath));
    setEditorSourceSaveDirectoryListing(null);
    setIsEditorSourceFileSaveDialogOpen(true);
    void loadEditorSourceSaveDirectory(parentDirectoryForPath(initialPath));
  }

  async function loadEditorSourceDirectory(path?: string): Promise<void> {
    try {
      const fileSystemDirectory = window.sbclAgentDesktop.query.fileSystemDirectory;
      if (typeof fileSystemDirectory !== "function") {
        setErrorMessage("The running desktop host does not yet expose file browsing. Restart the desktop app so the updated preload bridge is active.");
        return;
      }
      const result = await fileSystemDirectory({
        path: path && path.trim().length > 0 ? path.trim() : undefined
      });
      setEditorSourceDirectoryListing(result.data);
      setEditorSourceDirectoryPathDraft(result.data.currentPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the source directory.");
    }
  }

  async function loadEditorSourceSaveDirectory(path?: string): Promise<void> {
    try {
      const fileSystemDirectory = window.sbclAgentDesktop.query.fileSystemDirectory;
      if (typeof fileSystemDirectory !== "function") {
        setErrorMessage("The running desktop host does not yet expose file browsing. Restart the desktop app so the updated preload bridge is active.");
        return;
      }
      const result = await fileSystemDirectory({
        path: path && path.trim().length > 0 ? path.trim() : undefined
      });
      setEditorSourceSaveDirectoryListing(result.data);
      setEditorSourceSaveDirectoryPathDraft(result.data.currentPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the target directory.");
    }
  }

  function navigateEditorSourceDirectory(path: string): void {
    void loadEditorSourceDirectory(path);
  }

  function navigateEditorSourceParentDirectory(): void {
    if (!editorSourceDirectoryListing?.parentPath) {
      return;
    }
    void loadEditorSourceDirectory(editorSourceDirectoryListing.parentPath);
  }

  function navigateEditorSourceSaveDirectory(path: string): void {
    void loadEditorSourceSaveDirectory(path);
  }

  function navigateEditorSourceSaveParentDirectory(): void {
    if (!editorSourceSaveDirectoryListing?.parentPath) {
      return;
    }
    void loadEditorSourceSaveDirectory(editorSourceSaveDirectoryListing.parentPath);
  }

  async function handleLoadEditorSourceFile(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || !currentEditorBufferId || editorSourceFilePathDraft.trim().length === 0) {
      return;
    }

    try {
      const path = editorSourceFilePathDraft.trim();
      const result = await window.sbclAgentDesktop.query.sourcePreview({
        environmentId: effectiveEnvironmentId,
        path,
        contextRadius: 8
      });
      setSourcePreview(result);
      updateCurrentEditorBuffers((buffers) =>
        buffers.map((buffer) =>
          buffer.bufferId === currentEditorBufferId
            ? {
                ...buffer,
              title: basenameForPath(result.data.path),
              draft: result.data.editableContent,
              baselineDraft: result.data.editableContent,
              packageName: buffer.packageName || runtimeSummary?.currentPackage || "cl-user",
              dirty: false,
              result: null,
              sourceFilePath: result.data.path
            }
          : buffer
      )
    );
    setIsEditorSourceFileDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the source file into the editor.");
    }
  }

  async function persistCurrentEditorBufferToPath(path: string, overwrite: boolean): Promise<void> {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }

    const result = await window.sbclAgentDesktop.command.writeSourceFile({
      path,
      content: currentEditorDraft,
      overwrite
    });
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              title: basenameForPath(result.data.path),
              baselineDraft: buffer.draft,
              dirty: false,
              sourceFilePath: result.data.path
            }
          : buffer
      )
    );

    if (effectiveEnvironmentId) {
      try {
        const preview = await window.sbclAgentDesktop.query.sourcePreview({
          environmentId: effectiveEnvironmentId,
          path: result.data.path,
          contextRadius: 8
        });
        setSourcePreview(preview);
      } catch {
        setSourcePreview((current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  path: result.data.path,
                  editableContent: currentEditorDraft,
                  content: currentEditorDraft,
                  summary: `Source preview for ${result.data.path}.`
                }
              }
            : current
        );
      }
    }
  }

  async function handleSaveCurrentEditorBuffer(): Promise<void> {
    if (!currentEditorSourceFilePath) {
      openEditorSourceFileSaveDialog();
      return;
    }

    try {
      const confirmed = window.confirm(`Overwrite existing source file?\n\n${currentEditorSourceFilePath}`);
      if (!confirmed) {
        return;
      }
      await persistCurrentEditorBufferToPath(currentEditorSourceFilePath, true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the editor buffer.");
    }
  }

  async function handleSaveCurrentEditorBufferAs(): Promise<void> {
    const targetPath = joinDirectoryAndFileName(editorSourceSaveDirectoryPathDraft, editorSourceSaveFileNameDraft);
    if (targetPath.trim().length === 0) {
      return;
    }

    try {
      const fileAlreadyExists = editorSourceSaveDirectoryListing?.files.some((entry) => entry.path === targetPath) ?? false;
      if (fileAlreadyExists) {
        const confirmed = window.confirm(`Overwrite existing source file?\n\n${targetPath}`);
        if (!confirmed) {
          return;
        }
      }
      await persistCurrentEditorBufferToPath(targetPath, fileAlreadyExists);
      setIsEditorSourceFileSaveDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the editor buffer.");
    }
  }

  async function evaluateEditorBuffer(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || !currentEditorBufferId || currentEditorDraft.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form: currentEditorDraft,
        packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage
      });
      updateCurrentEditorBuffers((buffers) =>
        buffers.map((buffer) =>
          buffer.bufferId === currentEditorBufferId
            ? {
                ...buffer,
                result
              }
            : buffer
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Editor evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function evaluateWorkspaceForm(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || currentWorkspaceDraft.trim().length === 0) {
      return;
    }

    await evaluateWorkspaceSource(currentWorkspaceDraft);
  }

  async function evaluateWorkspaceSource(form: string): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || form.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form,
        packageName: currentWorkspacePackage.trim() || runtimeSummary?.currentPackage
      });
      setWorkspaceResultByProject((current) => ({
        ...current,
        [currentProjectId]: result
      }));
      setWorkspaceHistoryByProject((current) => ({
        ...current,
        [currentProjectId]: [
          {
            entryId: `workspace:${Date.now()}`,
            timestamp: new Date().toISOString(),
            form,
            status: result.status,
            summary: result.data.summary,
            valuePreview: result.data.valuePreview ?? null
          },
          ...(current[currentProjectId] ?? [])
        ].slice(0, 12)
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Workspace evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function performRuntimeInspection(input: {
    symbol: string;
    packageName?: string;
    mode: RuntimeInspectionMode;
  }): Promise<QueryResultDto<RuntimeInspectionResultDto> | null> {
    if (!effectiveEnvironmentId || input.symbol.trim().length === 0) {
      return null;
    }

    setIsInspectingRuntime(true);
    setErrorMessage(null);
    if (input.packageName && input.packageName.trim().length > 0) {
      setSelectedPackageName(input.packageName.trim());
    }

    try {
      const result = await window.sbclAgentDesktop.query.runtimeInspectSymbol({
        environmentId: effectiveEnvironmentId,
        symbol: input.symbol.trim(),
        packageName:
          input.packageName && input.packageName.trim().length > 0
            ? input.packageName.trim()
            : runtimeSummary?.currentPackage,
        mode: input.mode
      });
      setRuntimeInspection(result);
      if (result.data.packageName && result.data.packageName.trim().length > 0) {
        setSelectedPackageName(result.data.packageName);
      }
      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime inspection failed.");
      return null;
    } finally {
      setIsInspectingRuntime(false);
    }
  }

  async function inspectRuntimeSymbol(): Promise<void> {
    await performRuntimeInspection({
      symbol: runtimeInspectorSymbolRef.current,
      packageName: runtimeInspectorPackageRef.current,
      mode: runtimeInspectionModeRef.current
    });
  }

  async function browseRuntimeEntity(
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ): Promise<void> {
    updateRuntimeInspectorSymbol(symbol);
    updateRuntimeInspectorPackage(packageName ?? "");
    updateRuntimeInspectionMode(mode);
    if (packageName && packageName.trim().length > 0) {
      setSelectedPackageName(packageName);
    }
    setRuntimeForm(
      buildListenerForm({
        symbol,
        packageName,
        mode
      })
    );
    const inspectionResult = await performRuntimeInspection({ symbol, packageName, mode });
    if (inspectionResult?.data.symbol) {
      await loadRuntimeEntityDetail(
        inspectionResult.data.symbol,
        inspectionResult.data.packageName,
        inspectionResult.metadata.binding?.environmentId ?? effectiveEnvironmentId
      );
    }
  }

  async function loadSourcePreview(path: string, line?: number): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.sourcePreview({
        environmentId: effectiveEnvironmentId,
        path,
        line,
        contextRadius: 8
      });
      setSourcePreview(result);
      setRuntimeForm(
        buildListenerForm({
          symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbolRef.current,
          packageName:
            runtimeInspection?.data.packageName ??
            runtimeEntityDetail?.data.packageName ??
            runtimeInspectorPackageRef.current,
          mode: runtimeInspectionModeRef.current,
          sourcePath: path,
          line
        })
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source preview failed.");
    }
  }

  async function stageSourceChange(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsStagingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.stageSourceChange({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path,
        content: sourceDraft
      });
      setSourceMutationResult(result);
      setIsEditingSource(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source stage change failed.");
    } finally {
      setIsStagingSource(false);
    }
  }

  async function reloadSourceFile(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsReloadingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.reloadSourceFile({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path
      });
      setSourceReloadResult(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime reload failed.");
    } finally {
      setIsReloadingSource(false);
    }
  }

  async function loadApprovalWorkspace(environmentId: string): Promise<void> {
    const inFlightKey = environmentId;
    const existingLoad = approvalWorkspaceLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
        setApprovalRequests(result.data);
        setSelectedApprovalId((current) => current ?? result.data[0]?.requestId ?? null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load approvals workspace.");
      } finally {
        if (approvalWorkspaceLoadRef.current.get(inFlightKey) === loadPromise) {
          approvalWorkspaceLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    approvalWorkspaceLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  async function loadApprovalDetail(requestId: string, environmentId: string): Promise<void> {
    const inFlightKey = `${environmentId}:${requestId}`;
    const existingLoad = approvalDetailLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.approvalRequestDetail(requestId, environmentId);
        setSelectedApproval(result.data);
        const linkedWorkItemId =
          result.data.linkedEntities.find((entity) => entity.entityType === "work-item")?.entityId ?? null;
        if (linkedWorkItemId) {
          const focus = await refreshOrchestrationFocus({
            environmentId,
            workItemId: linkedWorkItemId
          });
          const resolvedPlanId = firstStringValue(
            asRecord(focus).planId,
            asRecord(asRecord(focus).plan).id
          );
          if (resolvedPlanId) {
            await Promise.all([
              refreshOrchestrationSnapshot({
                environmentId,
                planId: resolvedPlanId
              }),
              refreshPlanVerification({
                environmentId,
                planId: resolvedPlanId
              })
            ]);
          } else {
            setOrchestrationSnapshot(null);
            setPlanVerification(null);
          }
        } else {
          setOrchestrationFocus(null);
          setOrchestrationSnapshot(null);
          setPlanVerification(null);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load approval detail.");
      } finally {
        if (approvalDetailLoadRef.current.get(inFlightKey) === loadPromise) {
          approvalDetailLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    approvalDetailLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  async function submitApprovalDecisionForRequest(
    requestId: string,
    decision: "approve" | "deny"
  ): Promise<void> {
    if (!effectiveEnvironmentId || !requestId) {
      return;
    }

    setIsDecidingApproval(true);
    setErrorMessage(null);

    const input: ApprovalDecisionInput = {
      environmentId: effectiveEnvironmentId,
      requestId
    };

    try {
      const result =
        decision === "approve"
          ? await window.sbclAgentDesktop.command.approveRequest(input)
          : await window.sbclAgentDesktop.command.denyRequest(input);
      setApprovalDecision(result);
      await loadApprovalWorkspace(effectiveEnvironmentId);
      await loadApprovalDetail(requestId, effectiveEnvironmentId);
      await loadWorkWorkspace(effectiveEnvironmentId);
      await refreshOrchestrationInbox(effectiveEnvironmentId);
      if (decision === "approve") {
        await loadProjectWorkspace(effectiveEnvironmentId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Approval decision failed.");
    } finally {
      setIsDecidingApproval(false);
    }
  }

  async function submitApprovalDecision(decision: "approve" | "deny"): Promise<void> {
    if (!selectedApprovalId) {
      return;
    }

    await submitApprovalDecisionForRequest(selectedApprovalId, decision);
  }
  async function loadIncidentWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentList(environmentId);
      setIncidents(result.data);
      setSelectedIncidentId((current) => current ?? result.data[0]?.incidentId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incidents workspace.");
    }
  }

  async function loadIncidentDetail(incidentId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentDetail(incidentId, environmentId);
      setSelectedIncident(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incident detail.");
    }
  }

  async function loadWorkWorkspace(environmentId: string): Promise<void> {
    const inFlightKey = environmentId;
    const existingLoad = workWorkspaceLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.workItemList(environmentId);
        setWorkItems(result.data);
        setSelectedWorkItemId((current) => current ?? result.data[0]?.workItemId ?? null);
        void refreshOrchestrationInbox(environmentId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load work workspace.");
      } finally {
        if (workWorkspaceLoadRef.current.get(inFlightKey) === loadPromise) {
          workWorkspaceLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    workWorkspaceLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  async function loadWorkItemDetail(workItemId: string, environmentId: string): Promise<void> {
    const inFlightKey = `${environmentId}:${workItemId}`;
    const existingLoad = workItemDetailLoadRef.current.get(inFlightKey);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
        setSelectedWorkItem(result.data);
        const plan = await window.sbclAgentDesktop.query.workItemPlan(workItemId, environmentId);
        setSelectedWorkItemPlan(plan.data);
        const workflow = await window.sbclAgentDesktop.query.workflowRecordDetail(result.data.workflowRecordId, environmentId);
        setSelectedWorkflowRecord(workflow.data);
        const focus = await refreshOrchestrationFocus({
          environmentId,
          workflowRecordId: result.data.workflowRecordId,
          workItemId
        });
        const resolvedPlanId = firstStringValue(
          asRecord(focus).planId,
          asRecord(asRecord(focus).plan).id
        );
        if (resolvedPlanId) {
          await Promise.all([
            refreshOrchestrationSnapshot({
              environmentId,
              planId: resolvedPlanId
            }),
            refreshPlanVerification({
              environmentId,
              planId: resolvedPlanId
            })
          ]);
        } else {
          setOrchestrationSnapshot(null);
          setPlanVerification(null);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load work item detail.");
      } finally {
        if (workItemDetailLoadRef.current.get(inFlightKey) === loadPromise) {
          workItemDetailLoadRef.current.delete(inFlightKey);
        }
      }
    })();
    workItemDetailLoadRef.current.set(inFlightKey, loadPromise);
    return loadPromise;
  }

  async function refreshWorkWorkspaceSelection(workItemId: string | null): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await loadWorkWorkspace(effectiveEnvironmentId);
    if (workItemId) {
      await loadWorkItemDetail(workItemId, effectiveEnvironmentId);
      return;
    }
    setOrchestrationFocus(null);
    setOrchestrationSnapshot(null);
    setPlanVerification(null);
  }

  async function loadActivityWorkspace(environmentId: string): Promise<void> {
    try {
      const startedAt = performance.now();
      const input: EventSubscriptionInput = {
        environmentId,
        families: eventFamilyFilter === "all" ? undefined : [eventFamilyFilter],
        visibility: eventVisibilityFilter === "all" ? undefined : [eventVisibilityFilter],
        limit: 12
      };
      const result = await window.sbclAgentDesktop.query.environmentEvents(input);
      setEnvironmentEvents(result.data);
      setSelectedEventCursor((current) => current ?? result.data[0]?.cursor ?? null);
      logSurfacePerf("transcript.activity-events", startedAt, {
        familyFilter: eventFamilyFilter,
        visibilityFilter: eventVisibilityFilter,
        count: result.data.length
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load activity workspace.");
    }
  }

  async function loadArtifactsWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactList(environmentId);
      setArtifacts(result.data);
      setSelectedArtifactId((current) => current ?? result.data[0]?.artifactId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifacts workspace.");
    }
  }

  async function loadArtifactDetail(artifactId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactDetail(artifactId, environmentId);
      setSelectedArtifact(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifact detail.");
    }
  }

  const selectedEvent = useMemo(
    () => environmentEvents.find((event) => event.cursor === selectedEventCursor) ?? null,
    [environmentEvents, selectedEventCursor]
  );
  const workspaceInspectorProps = useMemo(
    () => ({
      activeWorkspace,
      artifacts,
      binding,
      onToggleInspector: () => void toggleInspectorPinned(),
      panelRef: undefined,
      renderChrome: false,
      conversationDraft,
      selectedBrowserDomain,
      conversationRecoveryHandoff,
      runtimeRecoveryLaunch,
      environmentEvents,
      lispParenColors,
      resolvedTheme,
      runtimeForm,
      runtimeEntityDetail,
      runtimeInspection,
      runtimeSummary,
      runtimeTelemetry,
      consoleLogStream,
      diagnosticReports,
      selectedConsolePlane,
      selectedConsoleSourceFilter,
      visibleConsoleEntryCount: (consoleLogStream?.data.entries ?? []).filter(
        (entry) => selectedConsoleSourceFilter === "All Sources" || entry.source === selectedConsoleSourceFilter
      ).length,
      selectedDiagnosticSourceFilter,
      visibleDiagnosticReportCount: diagnosticReports.filter(
        (report) =>
          selectedDiagnosticSourceFilter === "All Sources" || report.source === selectedDiagnosticSourceFilter
      ).length,
      transcriptEntries,
      currentWorkspaceHistoryCount: currentWorkspaceHistory.length,
      currentReplHistoryCount: currentProjectReplFocus?.history?.length ?? 0,
      memoryEntries,
      currentProject,
      selectedProjectDetail,
      selectedProjectSummary,
      workspaceDraft: currentWorkspaceDraft,
      workspaceResult: currentWorkspaceResult,
      workspaceTitle: currentProject?.title ?? "Workspace",
      selectedApproval,
      selectedArtifact,
      selectedConfigurationSection,
      selectedConsoleEntry:
        consoleLogStream?.data.entries.find((entry) => entry.entryId === selectedConsoleEntryId) ??
        consoleLogStream?.data.entries[0] ??
        null,
      selectedConversationMessage,
      selectedConversationSection,
      selectedDiagnosticReport,
      selectedDiagnosticReportSummary:
        diagnosticReports.find((report) => report.reportId === selectedDiagnosticReportId) ??
        diagnosticReports[0] ??
        null,
      currentEditorChangedFormCount,
      currentEditorBufferDirty,
      currentEditorBufferTitle,
      currentEditorBuffers,
      editorDraft: currentEditorDraft,
      editorResult: currentEditorResult,
      editorPackage: currentEditorPackage,
      currentEditorCursorSymbol,
      currentEditorCursorSymbolPackage,
      currentEditorCursorSymbolHelp,
      selectedDocumentationPage,
      selectedEvidenceSection,
      selectedEvent,
      selectedIncident,
      selectedMemory,
      selectedOperateSection,
      selectedTelemetryProcess:
        runtimeTelemetry?.processes.find((process) => process.processId === selectedTelemetryProcessId) ??
        runtimeTelemetry?.processes[0] ??
        null,
      selectedThread,
      selectedTurn,
      selectedWorkItem,
      selectedWorkItemPlan,
      selectedWorkflowRecord,
      navigateToLinkedEntity,
      setSelectedConversationMessageId,
      sourcePreview,
      status,
      summary,
      systemTheme,
      themePreference,
      providerSummary,
      packageManagementSummary,
      desktopTaskManifests,
      desktopTaskRecords,
      desktopTaskActorTrace,
      desktopTaskDeadLetters,
      orchestrationInbox,
      orchestrationFocus,
      orchestrationSnapshot,
      planVerification,
      mcpServerConfigs,
      packageManagementStatusMessage,
      packageManagementError,
      packageManagementCommandResult,
      quicklispSystemDraft,
      qlotCommandDraft,
      sourceRegistryDraftPath,
      sourceRegistryEditOriginalPath,
      localProjectPathDraft,
      localProjectNameDraft,
      providerProfileDraft,
      selectedMcpServerId,
      mcpServerDraft,
      selectedProviderProfileName,
      providerProfileStatusMessage,
      providerProfileError,
      mcpServerStatusMessage,
      mcpServerError,
      isSavingProviderProfile,
      isUpdatingProviderRouting,
      isSavingMcpServer,
      isPackageManagementBusy,
      tooltipScalePercent,
      controlIconScalePercent,
      dockIconScalePercent,
      conversationTextScalePercent,
      sourceCodeTextScalePercent,
      openPublishedDocumentation: () =>
        window.sbclAgentDesktop.desktop.openExternalLink(PUBLISHED_DOCUMENTATION_URL),
      updateLispParenColor,
      updateThemePreference: applyThemePreference,
      updateDesktopSurfaceScalePreference,
      setProviderProfileDraft,
      setSelectedProviderProfileName,
      setQuicklispSystemDraft,
      setQlotCommandDraft,
      setSourceRegistryDraftPath,
      setSourceRegistryEditOriginalPath,
      setLocalProjectPathDraft,
      setLocalProjectNameDraft,
      setSelectedMcpServerId,
      setMcpServerDraft,
      applyProviderRoutingMode,
      activateProviderProfile,
      saveProviderProfile,
      installQuicklispPackage,
      executeQlotCommand,
      saveSourceRegistryEntry,
      removeSourceRegistryPath,
      saveLocalProject,
      removeLocalProjectByName,
      saveMcpServer,
      removeMcpServer,
      workItems
    }),
    [activeWorkspace, artifacts, binding, toggleInspectorPinned, conversationDraft, selectedBrowserDomain, conversationRecoveryHandoff, runtimeRecoveryLaunch, environmentEvents, lispParenColors, resolvedTheme, runtimeForm, runtimeEntityDetail, runtimeInspection, runtimeSummary, runtimeTelemetry, consoleLogStream, diagnosticReports, selectedConsolePlane, selectedConsoleSourceFilter, selectedDiagnosticSourceFilter, transcriptEntries, currentWorkspaceHistory.length, currentProjectReplFocus?.history?.length, memoryEntries, currentProject, selectedProjectDetail, selectedProjectSummary, currentWorkspaceDraft, currentWorkspaceResult, selectedApproval, selectedArtifact, selectedConfigurationSection, selectedConsoleEntryId, selectedConversationMessage, selectedConversationSection, selectedDiagnosticReport, selectedDiagnosticReportId, currentEditorChangedFormCount, currentEditorBufferDirty, currentEditorBufferTitle, currentEditorBuffers, currentEditorDraft, currentEditorResult, currentEditorPackage, currentEditorCursorSymbol, currentEditorCursorSymbolPackage, currentEditorCursorSymbolHelp, selectedDocumentationPage, selectedEvidenceSection, selectedEvent, selectedIncident, selectedMemory, selectedOperateSection, selectedTelemetryProcessId, selectedThread, selectedTurn, selectedWorkItem, selectedWorkItemPlan, selectedWorkflowRecord, navigateToLinkedEntity, setSelectedConversationMessageId, sourcePreview, status, summary, systemTheme, themePreference, providerSummary, packageManagementSummary, desktopTaskManifests, desktopTaskRecords, desktopTaskActorTrace, desktopTaskDeadLetters, orchestrationInbox, orchestrationFocus, orchestrationSnapshot, planVerification, mcpServerConfigs, packageManagementStatusMessage, packageManagementError, packageManagementCommandResult, quicklispSystemDraft, qlotCommandDraft, sourceRegistryDraftPath, sourceRegistryEditOriginalPath, localProjectPathDraft, localProjectNameDraft, providerProfileDraft, selectedMcpServerId, mcpServerDraft, selectedProviderProfileName, providerProfileStatusMessage, providerProfileError, mcpServerStatusMessage, mcpServerError, isSavingProviderProfile, isUpdatingProviderRouting, isSavingMcpServer, isPackageManagementBusy, tooltipScalePercent, controlIconScalePercent, dockIconScalePercent, conversationTextScalePercent, sourceCodeTextScalePercent, updateLispParenColor, applyThemePreference, updateDesktopSurfaceScalePreference, setProviderProfileDraft, setSelectedProviderProfileName, setQuicklispSystemDraft, setQlotCommandDraft, setSourceRegistryDraftPath, setSourceRegistryEditOriginalPath, setLocalProjectPathDraft, setLocalProjectNameDraft, setSelectedMcpServerId, setMcpServerDraft, applyProviderRoutingMode, activateProviderProfile, saveProviderProfile, installQuicklispPackage, executeQlotCommand, saveSourceRegistryEntry, removeSourceRegistryPath, saveLocalProject, removeLocalProjectByName, saveMcpServer, removeMcpServer, workItems]
  );
  const evidenceWorkspaceProps = useMemo(
    () => ({
      artifacts,
      environmentFocusLabel,
      eventFamilyFilter,
      eventVisibilityFilter,
      events: environmentEvents,
      navigateToLinkedEntity,
      openConversationDraft: () =>
        openConversationDraftWithFocusOverride(
          selectedArtifactId
            ? {
                ...createDefaultEnvironmentFocusState(),
                kind: "evidence-artifact",
                sourceWorkspace: "artifacts",
                sourceSurface: "artifacts",
                artifactId: selectedArtifactId
              }
            : {
                ...createDefaultEnvironmentFocusState(),
                kind: "evidence-event",
                sourceWorkspace: "artifacts",
                sourceSurface: "artifacts",
                eventCursor: selectedEventCursor
              }
        ),
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      selectedArtifact,
      selectedArtifactId,
      selectedEvent,
      selectedEventCursor,
      setEventFamilyFilter,
      setEventVisibilityFilter,
      setSelectedArtifactId,
      setSelectedEventCursor
    }),
    [artifacts, environmentFocusLabel, eventFamilyFilter, eventVisibilityFilter, environmentEvents, navigateToLinkedEntity, openConversationDraftWithFocusOverride, selectedArtifactId, selectedEventCursor, selectedArtifact, selectedEvent, setEventFamilyFilter, setEventVisibilityFilter, setSelectedArtifactId, setSelectedEventCursor]
  );
  const editorSurfaceProps = useMemo(
    () => ({
      acceptCurrentBufferBaseline: acceptCurrentEditorBufferBaseline,
      cloneEditorBuffer: cloneCurrentEditorBuffer,
      createEditorBuffer,
      currentBufferDirty: currentEditorBufferDirty,
      currentBufferTitle: currentEditorBufferTitle,
      deleteEditorBuffers: deleteCurrentEditorBuffers,
      editorBuffers: currentEditorBuffers,
      editorPackage: currentEditorPackage,
      editorDraft: currentEditorDraft,
      setEditorDraft: setCurrentEditorDraft,
      editorResult: currentEditorResult,
      packageBrowser,
      runtimeEntityDetail,
      runtimeInspection,
      selectedBufferId: currentEditorBufferId,
      setSelectedBufferId: setCurrentEditorBufferId,
      sourcePreview,
      runtimeSummary,
      isEvaluating,
      parenDepthColors: lispParenColors,
      sourceCodeTextScalePercent,
      inspectDefinitionSymbol: async (symbol: string, packageName?: string, mode?: RuntimeInspectionMode) => {
        await browseRuntimeEntity(symbol, packageName, mode ?? "definitions");
      },
      fetchRuntimeSymbolHelp: async (symbol: string, packageName?: string) => {
        if (!effectiveEnvironmentId || symbol.trim().length === 0) {
          return null;
        }
        try {
          const result = await window.sbclAgentDesktop.query.runtimeEntityDetail({
            environmentId: effectiveEnvironmentId,
            symbol: symbol.trim(),
            packageName
          });
          return {
            detail: result.data.signature
              ? `${result.data.entityKind} • ${result.data.signature}`
              : result.data.entityKind,
            info: result.data.summary,
            signature: result.data.signature ?? null,
            type:
              result.data.entityKind === "macro"
                ? "keyword"
                : result.data.entityKind === "function" || result.data.entityKind === "generic-function"
                  ? "function"
                  : result.data.entityKind === "variable"
                    ? "variable"
                    : result.data.entityKind === "class"
                      ? "class"
                      : "text",
            packageName: result.data.packageName
          };
        } catch (_error) {
          return null;
        }
      },
      reportEditorCursorContext: ({
        symbol,
        packageName,
        help
      }: {
        symbol: string | null;
        packageName: string;
        help: typeof currentEditorCursorSymbolHelp;
      }) => {
        setCurrentEditorCursorSymbol(symbol);
        setCurrentEditorCursorSymbolPackage(packageName);
        setCurrentEditorCursorSymbolHelp(help);
      },
      evaluateEditorBuffer,
      openEditorSourceFileDialog,
      openEditorSourceFileSaveDialog,
      saveCurrentEditorBuffer: handleSaveCurrentEditorBuffer,
      revertCurrentBufferToBaseline: revertCurrentEditorBufferToBaseline,
      openSourcePreview: loadSourcePreview,
      openConversationRepl: async (form: string) => {
        setRuntimeForm(form);
        updateRuntimeInspectorPackage(currentEditorPackage);
        await navigateToConversationSection("repl");
      },
      setRuntimeForm,
      openInspectorSurface: () => navigateToDesktopPanel("inspector")
    }),
    [acceptCurrentEditorBufferBaseline, cloneCurrentEditorBuffer, createEditorBuffer, currentEditorBufferDirty, currentEditorBufferTitle, deleteCurrentEditorBuffers, currentEditorBuffers, currentEditorPackage, currentEditorDraft, setCurrentEditorDraft, currentEditorResult, packageBrowser, runtimeEntityDetail, runtimeInspection, currentEditorBufferId, setCurrentEditorBufferId, sourcePreview, runtimeSummary, isEvaluating, lispParenColors, sourceCodeTextScalePercent, browseRuntimeEntity, effectiveEnvironmentId, currentEditorCursorSymbolHelp, evaluateEditorBuffer, openEditorSourceFileDialog, openEditorSourceFileSaveDialog, handleSaveCurrentEditorBuffer, revertCurrentEditorBufferToBaseline, loadSourcePreview, setRuntimeForm, updateRuntimeInspectorPackage, navigateToConversationSection]
  );
  const transcriptSurfaceProps = useMemo(
    () => ({
      openConversationRepl: async (form: string) => {
        setRuntimeForm(form);
        updateRuntimeInspectorPackage(currentWorkspacePackage);
        await navigateToConversationSection("repl");
      },
      openConversationContext: async (threadId: string, turnId?: string | null) => {
        setSelectedThreadId(threadId);
        if (turnId) {
          setSelectedTurnId(turnId);
          await navigateToConversationSection("turns");
          return;
        }
        await navigateToConversationSection("threads");
      },
      openEvidenceObservation: () => navigateToEvidenceSection("artifacts"),
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      openListener: async (form: string) => {
        setRuntimeForm(form);
        await navigateToExecutionSection("listener");
      },
      selectedEntryKey: selectedTranscriptEntryKey,
      selectedSourceFilter: selectedTranscriptSourceFilter,
      setWorkspaceDraft: setCurrentWorkspaceDraft,
      setSelectedEntryKey: setSelectedTranscriptEntryKey,
      setSelectedSourceFilter: setSelectedTranscriptSourceFilter,
      transcriptEntries
    }),
    [setRuntimeForm, updateRuntimeInspectorPackage, currentWorkspacePackage, navigateToConversationSection, setSelectedThreadId, setSelectedTurnId, navigateToEvidenceSection, navigateToExecutionSection, selectedTranscriptEntryKey, selectedTranscriptSourceFilter, setCurrentWorkspaceDraft, setSelectedTranscriptEntryKey, setSelectedTranscriptSourceFilter, transcriptEntries]
  );
  const memoryWorkspaceProps = useMemo(
    () => ({
      memories: memoryEntries,
      selectedMemoryId,
      setSelectedMemoryId,
      onUpdateMemory: handleUpdateMemory,
      onDeleteMemory: handleDeleteMemory,
      pendingDeleteMemoryId,
      pendingUpdateMemoryId
    }),
    [memoryEntries, selectedMemoryId, setSelectedMemoryId, handleUpdateMemory, handleDeleteMemory, pendingDeleteMemoryId, pendingUpdateMemoryId]
  );

  const globalAttentionItems = useMemo<GlobalAttentionItem[]>(() => {
    return buildGlobalAttentionItems({
      desktopTaskActorSystemPanel,
      status,
      summary
    });
  }, [desktopTaskActorSystemPanel, status, summary]);

  const workspaceAttention = useMemo(() => {
    return buildWorkspaceAttentionMap(globalAttentionItems);
  }, [globalAttentionItems]);

  const pageSignalCounts = useMemo<SignalCounts>(
    () => buildPageSignalCounts(activeWorkspace, globalAttentionItems),
    [activeWorkspace, globalAttentionItems]
  );
  const conversationsWorkspaceProps = useMemo(
    () => ({
      activateConversationInspectorSection,
      actorSystemPanel: desktopTaskActorSystemPanel,
      conversationDraft,
      conversationRecoveryHandoff,
      draftFocusActions: conversationDraftFocusActions,
      environmentFocusLabel,
      environmentFocusSummary: environmentFocusPresentation.summary,
      environmentFocusTitle: environmentFocusPresentation.title,
      conversationSections,
      currentReplSessionId,
      createReplSession: handleCreateReplSession,
      evaluateRuntimeForm,
      inspectRuntimeSymbol,
      isEvaluating,
      isInspectingRuntime,
      navigateToLinkedEntity,
      onOpenCreateConversationSession: () => {
        setIsConversationSessionCreateDialogOpen(true);
      },
      onOpenRenameConversationSession: (threadId: string, title: string) => {
        setConversationThreadRenameTargetId(threadId);
        setConversationThreadRenameDraft(title);
        setIsConversationThreadRenameDialogOpen(true);
      },
      pageSignalCounts,
      replSessionTitleDraft,
      replSessions: currentProjectReplSessions,
      runtimeForm,
      runtimeInspection,
      runtimeInspectionMode,
      runtimeInspectorPackage,
      runtimeInspectorSymbol,
      runtimeResult,
      runtimeSummary,
      switchReplSession: handleSwitchReplSession,
      selectedSection: selectedConversationSection,
      selectedConversationMessageId,
      selectedThread,
      selectedThreadId,
      selectedTurn,
      selectedTurnId,
      setReplSessionTitleDraft,
      setConversationDraft,
      setSelectedConversationMessageId,
      setRuntimeForm,
      setRuntimeInspectionMode: updateRuntimeInspectionMode,
      setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
      setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
      setSelectedThreadId: selectConversationThread,
      setSelectedTurnId,
      openInspectorSurface: () => navigateToDesktopPanel("inspector"),
      threads
    }),
    [activateConversationInspectorSection, desktopTaskActorSystemPanel, conversationDraft, conversationRecoveryHandoff, conversationDraftFocusActions, environmentFocusLabel, environmentFocusPresentation.summary, environmentFocusPresentation.title, conversationSections, currentReplSessionId, handleCreateReplSession, evaluateRuntimeForm, inspectRuntimeSymbol, isEvaluating, isInspectingRuntime, navigateToLinkedEntity, pageSignalCounts, replSessionTitleDraft, currentProjectReplSessions, runtimeForm, runtimeInspection, runtimeInspectionMode, runtimeInspectorPackage, runtimeInspectorSymbol, runtimeResult, runtimeSummary, handleSwitchReplSession, selectedConversationSection, selectedConversationMessageId, selectedThread, selectedThreadId, selectedTurn, selectedTurnId, setReplSessionTitleDraft, setConversationDraft, setSelectedConversationMessageId, setRuntimeForm, updateRuntimeInspectionMode, updateRuntimeInspectorPackage, updateRuntimeInspectorSymbol, selectConversationThread, setSelectedTurnId, threads]
  );
  const operateSectionSignals = useMemo(
    () => buildOperateSectionSignals(globalAttentionItems) as Map<OperateSection, SignalCounts>,
    [globalAttentionItems]
  );
  const executionSectionSignals = useMemo(
    () => buildExecutionSectionSignals(globalAttentionItems) as Map<ExecutionSection, SignalCounts>,
    [globalAttentionItems]
  );
  const recoverySectionSignals = useMemo(
    () => buildRecoverySectionSignals(globalAttentionItems) as Map<RecoverySection, SignalCounts>,
    [globalAttentionItems]
  );
  const evidenceSectionSignals = useMemo(
    () => buildEvidenceSectionSignals(globalAttentionItems) as Map<EvidenceSection, SignalCounts>,
    [globalAttentionItems]
  );
  const centerAttentionSignals = useMemo<DesktopAttentionSignal[]>(() => {
    const items: DesktopAttentionSignal[] = [];

    const appendSignal = (
      id: string,
      label: string,
      summary: string,
      counts: SignalCounts | undefined,
      glyphClassName: string,
      onOpen: () => void
    ): void => {
      const signal = counts ?? { red: 0, yellow: 0, blue: 0 };
      const total = signal.red + signal.yellow + signal.blue;
      if (total <= 0) {
        return;
      }

      const priority = signal.red > 0 ? "red" : signal.yellow > 0 ? "yellow" : "green";
      const priorityLabel =
        priority === "red" ? "High priority" : priority === "yellow" ? "Medium priority" : "Low priority";

      items.push({
        id,
        label,
        tooltip: `${label}: ${priorityLabel} attention (${total} active). ${summary}`,
        glyphClassName,
        priority,
        onOpen
      });
    };

    appendSignal(
      "orientation",
      "Orientation",
      "Open the current environment binding and runtime context.",
      operateSectionSignals.get("orientation"),
      "desktop-window-notification-glyph-orientation",
      () => {
        void navigateToBrowserDomain("systems");
      }
    );
    appendSignal(
      "journeys",
      "Triage",
      "Open the triage board for approvals, incidents, blocked work, and queued actions.",
      operateSectionSignals.get("journeys"),
      "desktop-window-notification-glyph-journeys",
      () => {
        void navigateToWorkspace("environment");
      }
    );
    appendSignal(
      "evidence",
      "Evidence",
      "Open the artifacts surface that currently requires attention.",
      operateSectionSignals.get("evidence"),
      "desktop-window-notification-glyph-evidence",
      () => {
        void navigateToEvidenceSection("artifacts");
      }
    );
    appendSignal(
      "conversations",
      "Conversations",
      "Open the structured conversation surface that currently needs direct continuity work.",
      workspaceAttention.get("conversations"),
      "desktop-window-notification-glyph-conversations",
      () => {
        void navigateToConversationSection("threads");
      }
    );

    return items;
  }, [operateSectionSignals, workspaceAttention]);

  const workspaceDescriptor = useMemo<WorkspaceDescriptor>(() => {
    switch (activeWorkspace) {
      case "environment":
        return {
          eyebrow: "Notifications",
          title: "Notifications Surface",
          summary: "One triage surface for approvals, incidents, blocked work, and queued actions."
        };
      case "projects":
        return {
          eyebrow: "Projects",
          title: "Governed SDLC Context",
          summary: "Projects bind constitutions, requirements, journeys, design rules, architecture, and execution evidence into one governed product context."
        };
      case "conversations":
        return {
          eyebrow: "Conversations",
          title: "Thread Continuity",
          summary: "Conversations are durable work objects. Turns, approvals, incidents, and evidence stay attached to the active thread instead of being split into separate operational silos."
        };
      case "editor":
        return {
          eyebrow: "Editor",
          title: "Sustained Editing Surface",
          summary: "Editor is the sustained Lisp editing instrument for longer-lived source and form work, distinct from scratch workspace evaluation and from Browser-local inspection."
        };
      case "workspace":
        return {
          eyebrow: "Workspace",
          title: "Scratch Lisp Surface",
          summary: "Workspace is the deliberate scratch surface for drafting forms, evaluating them under governance, and retaining useful results without forcing that work into either thread supervision or execution-journey posture."
        };
      case "transcript":
        return {
          eyebrow: "Transcript",
          title: "Durable Output Stream",
          summary: "Transcript is the durable cross-surface output lane for runtime evaluations, workspace results, and environment events so feedback stays ambient and inspectable instead of buried inside individual instruments."
        };
      case "memory":
        return {
          eyebrow: "Memory",
          title: "Deliberate Operator Memory",
          summary: "Memory keeps durable operator facts editable and inspectable so identity, preferences, and working style become persistent environment state instead of accidental prompt residue."
        };
      case "browser":
        return {
          eyebrow: "Browser",
          title: "Live System Browser",
          summary: "Browse the living Lisp environment through systems, packages, symbols, source, and governed artifacts instead of collapsing back into a file-first IDE."
        };
      case "configuration":
        return {
          eyebrow: "Configuration",
          title: "Desktop Preferences",
          summary: "Configuration should shape the desktop shell itself without turning into a buried afterthought beneath the operational journeys."
        };
      case "documentation":
        return {
          eyebrow: "Documentation",
          title: "User Documentation",
          summary: "Documentation belongs in its own workspace so the user can deliberately enter guidance when needed, while the rest of the desktop stays focused on operating surfaces."
        };
      case "runtime":
        return {
          eyebrow: "Execution",
          title: "Runtime And Governed Work",
          summary: "Execution brings runtime state, governed work, and approval consequences together so the user can act through one journey instead of hopping between adjacent queues."
        };
      case "incidents":
        return {
          eyebrow: "Recovery",
          title: "Incident And Restoration",
          summary: "Recovery is a journey: inspect failure, understand blocked work, review evidence, and drive the environment back toward trustworthy continuation."
        };
      case "artifacts":
        return {
          eyebrow: "Evidence",
          title: "Evidence Surface",
          summary: "Evidence combines durable artifacts with replayable event history so the user can inspect provenance and operational truth without leaving the current method."
        };
      default:
        return {
          eyebrow: "Workspace",
          title: labelForWorkspace(canonicalWorkspace(activeWorkspace)),
          summary: "This workspace remains aligned to the environment-first operating model."
        };
    }
  }, [activeWorkspace]);

  const activeHostedAppDescriptor = useMemo<HostedAppDescriptor>(
    () => hostedApps.find((app) => app.id === activeHostedApp) ?? hostedApps[0],
    [activeHostedApp]
  );

  const shellCurrentSurfaceSummary = useMemo(() => {
    const panelLabel =
      desktopModel?.activePanel === "display"
            ? "Display Surface"
            : desktopModel?.activePanel === "inspector"
              ? "Inspector"
              : desktopModel?.activePanel === "governance"
              ? "Notifications Surface"
            : desktopModel?.activePanel === "object-browser"
              ? "Object Browser"
              : activeHostedApp === "control-panel"
                ? "Control Panel Surface"
                : `${activeHostedAppDescriptor.label} Surface`;
    return {
      panelLabel,
      summary:
        activeHostedApp === "control-panel"
          ? `${panelLabel} is currently anchored to the Control Panel with governed attention routed through the desktop shell.`
          : `${panelLabel} is currently anchored to ${activeHostedAppDescriptor.label} while the shell routes governed attention through the desktop.`
    };
  }, [activeHostedApp, activeHostedAppDescriptor.label, desktopModel?.activePanel]);

  const selectedBrowserDomainDescriptor = useMemo(
    () => selectBrowserDomainDescriptor(selectedBrowserDomain),
    [selectedBrowserDomain]
  );

  const selectedOperateSurfaceDescriptor = useMemo(() => {
    if (activeWorkspace === "runtime") {
      return executionSections.find((section) => section.id === selectedExecutionSection) ?? executionSections[0];
    }

    if (activeWorkspace === "incidents") {
      return recoverySections.find((section) => section.id === selectedRecoverySection) ?? recoverySections[0];
    }

    if (activeWorkspace === "artifacts") {
      return evidenceSections.find((section) => section.id === selectedEvidenceSection) ?? evidenceSections[0];
    }

    return operateSections[0];
  }, [
    activeWorkspace,
    selectedEvidenceSection,
    selectedExecutionSection,
    selectedRecoverySection
  ]);


  const browserSurfaceEntries = useMemo<BrowserSurfaceEntry[]>(() => {
    return buildBrowserSurfaceEntries({
      approvalRequests,
      orchestrationInbox,
      consoleLogStream,
      diagnosticReports,
      incidents,
      packageBrowser,
      runtimeEntityDetail,
      runtimeInspection,
      runtimeSummary,
      runtimeTelemetry,
      selectedBrowserDomain,
      sourcePreview,
      threads,
      workItems
    });
  }, [approvalRequests, orchestrationInbox, consoleLogStream, diagnosticReports, incidents, packageBrowser, runtimeEntityDetail, runtimeInspection, runtimeSummary, runtimeTelemetry, selectedBrowserDomain, sourcePreview, threads, workItems]);
  const shellProactiveLead = useMemo(
    () => globalAttentionItems.find((item) => item.value > 0) ?? globalAttentionItems[0] ?? null,
    [globalAttentionItems]
  );

  const shellRecommendedTargets = useMemo(() => rankedDockJumpTargets.slice(0, 4), [rankedDockJumpTargets]);
  const shellMonitorItems = useMemo(
    () => globalAttentionItems.filter((item) => item.value > 0).slice(0, 5),
    [globalAttentionItems]
  );
  const governedAttentionSignalCount = useMemo(
    () => shellRecommendedTargets.length + shellMonitorItems.length + dashboardActionQueue.length,
    [dashboardActionQueue.length, shellMonitorItems.length, shellRecommendedTargets.length]
  );

  const workspaceResolution = useMemo<WorkspaceResolutionState | null>(() => {
    switch (canonicalWorkspace(activeWorkspace)) {
      case "projects":
        if (!(projectListResult?.data.projects.length ?? 0)) {
          return {
            label: "Resolving governed projects",
            summary: "The desktop is loading project constitutions, requirements, journeys, and linked SDLC evidence.",
            tone: "warning"
          };
        }
        if (selectedGovernedProjectId && !selectedProjectDetail) {
          return {
            label: "Resolving project detail",
            summary: "The selected project record is still attaching constitution, requirements, architecture, and linked evidence.",
            tone: "warning"
          };
        }
        return null;
      case "conversations":
        if (!selectedThread) {
          return {
            label: "Resolving thread continuity",
            summary: "The desktop is selecting the active thread and turn so conversation continuity stays explicit.",
            tone: "warning"
          };
        }
        if (!selectedTurn) {
          return {
            label: "Resolving turn context",
            summary: "Turn detail is still being attached to the current thread continuation.",
            tone: "warning"
          };
        }
        return null;
      case "memory":
        if (!memoryListResult) {
          return {
            label: "Resolving retained memory",
            summary: "The desktop is loading deliberate operator memories so they can be inspected and maintained directly.",
            tone: "warning"
          };
        }
        return null;
      case "browser":
        if (!runtimeSummary) {
          return {
            label: "Resolving browser runtime",
            summary: "The browser is attaching to the current live image before source and symbols can be browsed.",
            tone: "warning"
          };
        }
        return null;
      case "runtime":
        if (!runtimeSummary) {
          return {
            label: "Resolving runtime posture",
            summary: "Execution is still attaching the live image, work state, and approval posture to the current objective.",
            tone: "warning"
          };
        }
        if (workItems.length > 0 && !selectedWorkItem) {
          return {
            label: "Resolving governed work",
            summary: "The current execution item is still being attached to workflow closure posture.",
            tone: "warning"
          };
        }
        return null;
      case "incidents":
        if (incidents.length > 0 && !selectedIncident) {
          return {
            label: "Resolving recovery context",
            summary: "Recovery is still attaching the selected incident to linked runtime and evidence context.",
            tone: "danger"
          };
        }
        return null;
      case "artifacts":
        if (artifacts.length > 0 && !selectedArtifact) {
          return {
            label: "Resolving evidence context",
            summary: "Durable evidence is still being attached to its producing context.",
            tone: "active"
          };
        }
        if (environmentEvents.length > 0 && !selectedEvent) {
          return {
            label: "Resolving event replay",
            summary: "Event replay is still selecting the current payload for inspection.",
            tone: "active"
          };
        }
        return null;
      default:
        return null;
    }
  }, [
    activeWorkspace,
    artifacts.length,
    environmentEvents.length,
    incidents.length,
    memoryListResult,
    projectListResult?.data.projects.length,
    runtimeSummary,
    selectedArtifact,
    selectedEvent,
    selectedGovernedProjectId,
    selectedIncident,
    selectedProjectDetail,
    selectedThread,
    selectedTurn,
    selectedWorkItem,
    workItems.length
  ]);

  const desktopWindowCompositionSignature = useMemo(
    () =>
      JSON.stringify({
        activeDesktopId,
        activeHostedAppLabel: activeHostedAppDescriptor.label,
        currentWorkspaceSummary: currentWorkspaceResult?.data.summary ?? null,
        desktopActivePanel: desktopModel?.activePanel ?? null,
        desktopDisplayCount: desktopModel?.displayCount ?? null,
        inspectorPinned,
        runtimeId: runtimeSummary?.runtimeId ?? null,
        runtimeLoadedSystems: runtimeSummary?.loadedSystems.length ?? null,
        browserDomainLabel: selectedBrowserDomainDescriptor.label,
        browserDomainSummary: selectedBrowserDomainDescriptor.summary,
        selectedConfigurationSection,
        selectedConversationSection,
        selectedMemorySummary: selectedMemory?.summary ?? null,
        selectedOperateSurfaceLabel: selectedOperateSurfaceDescriptor.label,
        selectedOperateSurfaceSummary: selectedOperateSurfaceDescriptor.summary,
        selectedProjectDetailSummary: selectedProjectDetail?.summary ?? null,
        selectedProjectSummarySummary: selectedProjectSummary?.summary ?? null,
        shellCurrentSurfaceSummary: shellCurrentSurfaceSummary.summary,
        shellProactiveLeadSummary: shellProactiveLead?.summary ?? null,
        undockedPanelIds: shellLayout.undockedPanelIds,
        suppressedDesktopWindowIds,
        focusSummary: summary?.activeContext.focusSummary ?? null,
        transcriptLeadSummary: transcriptEntries[0]?.summary ?? null,
        workspaceSummary: workspaceDescriptor.summary
      }),
    [
      activeDesktopId,
      activeHostedAppDescriptor.label,
      currentWorkspaceResult?.data.summary,
      desktopModel?.activePanel,
      desktopModel?.displayCount,
      inspectorPinned,
      runtimeSummary?.runtimeId,
      runtimeSummary?.loadedSystems.length,
      selectedBrowserDomainDescriptor.label,
      selectedBrowserDomainDescriptor.summary,
      selectedConfigurationSection,
      selectedConversationSection,
      selectedMemory?.summary,
      selectedOperateSurfaceDescriptor.label,
      selectedOperateSurfaceDescriptor.summary,
      selectedProjectDetail?.summary,
      selectedProjectSummary?.summary,
      shellCurrentSurfaceSummary.summary,
      shellProactiveLead?.summary,
      shellLayout.undockedPanelIds,
      suppressedDesktopWindowIds,
      summary?.activeContext.focusSummary,
      transcriptEntries,
      workspaceDescriptor.summary
    ]
  );

  async function navigateToWorkspace(workspace: WorkspaceId): Promise<void> {
    const nextWorkspace = canonicalWorkspace(workspace);
    setActiveHostedApp("control-panel");
    setActiveWorkspace(nextWorkspace);
    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    const nextPanelId = workspaceToDesktopPanelId(nextWorkspace);

    const actionPromise = environmentId
      ? window.sbclAgentDesktop.command.desktopAction({
          environmentId,
          actionKind: "activate-panel",
          panelId: nextPanelId
        })
      : Promise.resolve(null);

    const [desktopActionResult] = await Promise.all([
      actionPromise,
      window.sbclAgentDesktop.desktop.focusWorkspace(nextWorkspace),
      window.sbclAgentDesktop.desktop.setDesktopPreferences({ lastWorkspace: nextWorkspace })
    ]);

    if (desktopActionResult?.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
      setActiveWorkspace(
        nextPanelId === "workspace" || nextPanelId === "display"
          ? nextWorkspace
          : desktopPanelToWorkspaceId(desktopActionResult.data.desktopModel.activePanel, nextWorkspace)
      );
    }
  }

  async function navigateToHostedApp(appId: HostedAppId): Promise<void> {
    focusDesktopWindow(appId === "listener-workbench" ? "window:listener-workbench" : "window:control-panel");
    updateActiveDesktopWindows((current) =>
      updateWindowState(current, appId === "listener-workbench" ? "window:listener-workbench" : "window:control-panel", "open")
    );
    setActiveHostedApp(appId);
    if (appId === "control-panel") {
      await navigateToWorkspace(activeWorkspace);
    }
  }

  function workspaceForDesktopWindow(window: DesktopWindowRecord): WorkspaceId | null {
    switch (window.id) {
      case "window:browser-surface":
        return "browser";
      case "window:actor-system-surface":
        return "runtime";
      case "window:projects-surface":
        return "projects";
      case "window:editor-surface":
        return "editor";
      case "window:workspace-surface":
        return "workspace";
      case "window:transcript-surface":
        return "transcript";
      case "window:memory-surface":
        return "memory";
      case "window:configuration-surface":
        return "configuration";
      case "window:conversations-surface":
        return "conversations";
      default:
        return null;
    }
  }

  async function toggleInspectorPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "toggle_right_rail" }));
  }

  async function toggleCanvasPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "toggle_canvas" }));
  }

  async function toggleSidebarPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({
      type: "toggle_left_rail",
      defaultExpandedWidth: shellSidebarDefaultWidthForViewport(viewportWidth)
    }));
  }

  function activateShellRailPanel(rail: "left" | "right", panelId: ShellDockPanelId): void {
    applyShellLayoutAction({ type: "activate_rail_panel", rail, panelId });
  }

  async function undockShellPanel(panelId: ShellDockPanelId): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "undock_panel", panelId }));
  }

  async function dockShellPanel(panelId: ShellDockPanelId, rail: "left" | "right"): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "dock_panel", panelId, rail }));
  }

  async function reorderShellRailPanel(
    rail: "left" | "right",
    panelId: ShellDockPanelId,
    direction: "backward" | "forward"
  ): Promise<void> {
    const currentRailState = rail === "left" ? shellLayoutRef.current.leftRail : shellLayoutRef.current.rightRail;
    const currentIndex = currentRailState.dockedPanelIds.indexOf(panelId);
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = direction === "backward" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= currentRailState.dockedPanelIds.length) {
      return;
    }
    const nextPanelIds = [...currentRailState.dockedPanelIds];
    [nextPanelIds[currentIndex], nextPanelIds[nextIndex]] = [nextPanelIds[nextIndex], nextPanelIds[currentIndex]];
    await persistResolvedShellLayout(
      applyShellLayoutAction({ type: "reorder_rail_panels", rail, panelIds: nextPanelIds })
    );
  }

  function shellDropTargetForPoint(clientX: number, clientY: number): "left" | "right" | "undocked" | null {
    const targets: Array<["left" | "right" | "undocked", HTMLElement | null]> = [
      ["left", leftRailListRef.current],
      ["right", rightRailListRef.current],
      ["undocked", desktopWindowStageDropTargetRef.current]
    ];

    for (const [target, element] of targets) {
      if (!element) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return target;
      }
    }

    return null;
  }

  async function applyShellPanelDrop(
    panelId: ShellDockPanelId,
    origin: "left" | "right" | "undocked",
    target: "left" | "right" | "undocked" | null
  ): Promise<void> {
    if (!target) {
      return;
    }

    if (target === "undocked") {
      if (origin !== "undocked") {
        await undockShellPanel(panelId);
      }
      return;
    }

    if (origin === "undocked") {
      await dockShellPanel(panelId, target);
    } else {
      activateShellRailPanel(target, panelId);
    }
  }

  function beginNativeShellPanelDrag(
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "left" | "right" | "undocked"
  ): void {
    setShellPanelDragState({
      panelId,
      panelLabel,
      origin,
      x: 0,
      y: 0,
      target: null
    });
  }

  function endNativeShellPanelDrag(): void {
    setShellPanelDragState(null);
  }

  function beginShellPanelPointerDrag(
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "left" | "right" | "undocked",
    clientX: number,
    clientY: number
  ): void {
    shellPanelDragCleanupRef.current?.();
    shellPanelDragSessionRef.current = {
      panelId,
      panelLabel,
      origin,
      startX: clientX,
      startY: clientY,
      dragStarted: false
    };
    setShellPanelDragState({
      panelId,
      panelLabel,
      origin,
      x: clientX,
      y: clientY,
      target: shellDropTargetForPoint(clientX, clientY)
    });

    function handleMouseMove(event: MouseEvent): void {
      const session = shellPanelDragSessionRef.current;
      if (!session) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;
      const distance = Math.hypot(deltaX, deltaY);
      if (!session.dragStarted && distance < 8) {
        return;
      }

      if (!session.dragStarted) {
        session.dragStarted = true;
        document.body.classList.add("shell-panel-dragging");
      }

      setShellPanelDragState({
        panelId: session.panelId,
        panelLabel: session.panelLabel,
        origin: session.origin,
        x: event.clientX,
        y: event.clientY,
        target: shellDropTargetForPoint(event.clientX, event.clientY)
      });
    }

    function handleMouseUp(event: MouseEvent): void {
      const session = shellPanelDragSessionRef.current;
      if (!session) {
        return;
      }

      const dropTarget = session.dragStarted ? shellDropTargetForPoint(event.clientX, event.clientY) : null;
      document.body.classList.remove("shell-panel-dragging");
      shellPanelDragSessionRef.current = null;
      setShellPanelDragState(null);
      shellPanelDragCleanupRef.current?.();
      shellPanelDragCleanupRef.current = null;

      if (!session.dragStarted) {
        return;
      }

      void applyShellPanelDrop(session.panelId, session.origin, dropTarget);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    shellPanelDragCleanupRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("shell-panel-dragging");
    };
  }

  useEffect(
    () => () => {
      shellPanelDragCleanupRef.current?.();
    },
    []
  );

  useEffect(
    () => () => {
      sidebarResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current?.();
      railSectionResizeCleanupRef.current?.();
    },
    []
  );

  function startSidebarResize(event: React.MouseEvent<HTMLButtonElement>): void {
    if (!sidebarPinned || !canvasPinned || viewportWidth <= SHELL_STACK_BREAKPOINT || !shellRef.current) {
      return;
    }

    const shellRect = shellRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(shellRef.current);
    const paddingLeft =
      Number.parseFloat(computedStyle.paddingLeft) || shellHorizontalPaddingForViewport(viewportWidth);
    const paddingRight =
      Number.parseFloat(computedStyle.paddingRight) || shellHorizontalPaddingForViewport(viewportWidth);
    const contentWidth = shellRect.width - paddingLeft - paddingRight;
    const contentLeft = shellRect.left + paddingLeft;
    const gap = shellGapForViewport(viewportWidth);
    const minSidebarWidth = shellSidebarMinWidthForViewport(viewportWidth);
    const minCanvasWidth = shellCanvasMinWidthForViewport(viewportWidth);
    const inspectorCurrentWidth =
      inspectorPinned && viewportWidth > SHELL_STACK_BREAKPOINT
        ? Math.min(
            Math.max(inspectorWidth ?? shellInspectorDefaultWidthForViewport(viewportWidth), shellInspectorMinWidthForViewport(viewportWidth)),
            Math.max(
              shellInspectorMinWidthForViewport(viewportWidth),
              contentWidth - minSidebarWidth - minCanvasWidth - gap * 2
            )
          )
        : 0;
    const maxSidebarWidth = Math.max(
      minSidebarWidth,
      contentWidth - minCanvasWidth - (inspectorPinned ? inspectorCurrentWidth : 0) - gap * (inspectorPinned ? 2 : 1)
    );

    sidebarResizeSessionRef.current = {
      contentLeft,
      minWidth: minSidebarWidth,
      maxWidth: maxSidebarWidth
    };
    sidebarResizeCleanupRef.current?.();

    function handleMouseMove(moveEvent: MouseEvent): void {
      const session = sidebarResizeSessionRef.current;
      if (!session) {
        return;
      }

      const nextWidth = Math.min(
        Math.max(moveEvent.clientX - session.contentLeft, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_left_rail_width", width: nextWidth });
    }

    function handleMouseUp(): void {
      if (!sidebarResizeSessionRef.current) {
        return;
      }
      setIsSidebarResizing(false);
      document.body.classList.remove("shell-sidebar-resizing");
      sidebarResizeSessionRef.current = null;
      sidebarResizeCleanupRef.current?.();
      sidebarResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    sidebarResizeCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
    setIsSidebarResizing(true);
    document.body.classList.add("shell-sidebar-resizing");
    event.preventDefault();
  }

  function startInspectorResize(event: React.MouseEvent<HTMLButtonElement>): void {
    if (!canvasPinned || !inspectorPinned || viewportWidth <= SHELL_STACK_BREAKPOINT || !shellRef.current) {
      return;
    }

    const shellRect = shellRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(shellRef.current);
    const paddingLeft =
      Number.parseFloat(computedStyle.paddingLeft) || shellHorizontalPaddingForViewport(viewportWidth);
    const paddingRight =
      Number.parseFloat(computedStyle.paddingRight) || shellHorizontalPaddingForViewport(viewportWidth);
    const contentWidth = shellRect.width - paddingLeft - paddingRight;
    const contentRight = shellRect.right - paddingRight;
    const gap = shellGapForViewport(viewportWidth);
    const effectiveSidebarWidth = sidebarPinned
      ? Math.max(sidebarWidth ?? shellSidebarDefaultWidthForViewport(viewportWidth), shellSidebarMinWidthForViewport(viewportWidth))
      : shellSidebarRailWidthForViewport(viewportWidth);
    const minInspectorWidth = shellInspectorMinWidthForViewport(viewportWidth);
    const minCanvasWidth = shellCanvasMinWidthForViewport(viewportWidth);
    const maxInspectorWidth = Math.max(minInspectorWidth, contentWidth - effectiveSidebarWidth - minCanvasWidth - gap * 2);

    inspectorResizeSessionRef.current = {
      contentRight,
      minWidth: minInspectorWidth,
      maxWidth: maxInspectorWidth,
      gap
    };
    inspectorResizeCleanupRef.current?.();

    function handleMouseMove(moveEvent: MouseEvent): void {
      const session = inspectorResizeSessionRef.current;
      if (!session) {
        return;
      }

      const nextWidth = Math.min(
        Math.max(session.contentRight - moveEvent.clientX - session.gap / 2, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_right_rail_width", width: nextWidth });
    }

    function handleMouseUp(): void {
      if (!inspectorResizeSessionRef.current) {
        return;
      }
      setIsInspectorResizing(false);
      document.body.classList.remove("shell-inspector-resizing");
      inspectorResizeSessionRef.current = null;
      inspectorResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    inspectorResizeCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
    setIsInspectorResizing(true);
    document.body.classList.add("shell-inspector-resizing");
    event.preventDefault();
  }

  function handleShellResizeCaptureMouseMove(event: React.MouseEvent<HTMLDivElement>): void {
    if (sidebarResizeSessionRef.current) {
      const session = sidebarResizeSessionRef.current;
      const nextWidth = Math.min(
        Math.max(event.clientX - session.contentLeft, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_left_rail_width", width: nextWidth });
      return;
    }

    if (inspectorResizeSessionRef.current) {
      const session = inspectorResizeSessionRef.current;
      const nextWidth = Math.min(
        Math.max(session.contentRight - event.clientX, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_right_rail_width", width: nextWidth });
    }
  }

  function handleShellResizeCaptureMouseUp(): void {
    if (sidebarResizeSessionRef.current) {
      setIsSidebarResizing(false);
      document.body.classList.remove("shell-sidebar-resizing");
      sidebarResizeSessionRef.current = null;
      sidebarResizeCleanupRef.current?.();
      sidebarResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
      return;
    }

    if (inspectorResizeSessionRef.current) {
      setIsInspectorResizing(false);
      document.body.classList.remove("shell-inspector-resizing");
      inspectorResizeSessionRef.current = null;
      inspectorResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }
  }


  function startRailSectionResize(side: "left" | "right", event: React.MouseEvent<HTMLButtonElement>): void {
    const panel = side === "left" ? sidebarPanelRef.current : inspectorPanelRef.current;
    const list = side === "left" ? leftRailListRef.current : rightRailListRef.current;
    if (!panel || !list) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const minHeight = 63;
    const minContentHeight = 120;
    const availableHeight = panelRect.bottom - listRect.top - 12;
    const maxHeight = Math.max(minHeight, availableHeight - minContentHeight - 7);

    railSectionResizeSessionRef.current = {
      side,
      startClientY: event.clientY,
      startHeight: listRect.height,
      minHeight,
      maxHeight
    };
    railSectionResizeCleanupRef.current?.();

    function handleMouseMove(moveEvent: MouseEvent): void {
      const session = railSectionResizeSessionRef.current;
      if (!session) {
        return;
      }
      const nextHeight = Math.min(
        Math.max(session.startHeight + (moveEvent.clientY - session.startClientY), session.minHeight),
        session.maxHeight
      );
      if (session.side === "left") {
        setLeftRailDockSectionHeight(nextHeight);
      } else {
        setRightRailDockSectionHeight(nextHeight);
      }
    }

    function handleMouseUp(): void {
      if (!railSectionResizeSessionRef.current) {
        return;
      }
      setActiveRailSectionResizeSide(null);
      document.body.classList.remove("shell-rail-section-resizing");
      railSectionResizeSessionRef.current = null;
      railSectionResizeCleanupRef.current?.();
      railSectionResizeCleanupRef.current = null;
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    railSectionResizeCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
    setActiveRailSectionResizeSide(side);
    document.body.classList.add("shell-rail-section-resizing");
    event.preventDefault();
  }

  const shellRenderLayout = deriveShellRenderLayout(shellLayout, viewportWidth);
  const effectiveSidebarColumnWidth = shellRenderLayout.sidebarColumnWidth;
  const effectiveInspectorColumnWidth = shellRenderLayout.inspectorColumnWidth;
  const shellGap = shellRenderLayout.gap;
  const shellHorizontalPadding = shellRenderLayout.horizontalPadding;
  const shellCanvasMinWidth = shellRenderLayout.canvasMinWidth;
  const shellInspectorMinWidth = shellRenderLayout.inspectorMinWidth;
  const desktopShellInlineColumns = shellRenderLayout.desktopShellInlineColumns;

  async function applyThemePreference(nextThemePreference: ThemePreference): Promise<void> {
    setThemePreference(nextThemePreference);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      themePreference: nextThemePreference
    });
  }

  async function updateLispParenColor(index: number, color: string): Promise<void> {
    const nextColors = normalizeParenDepthColors(
      lispParenColors.map((currentColor, currentIndex) => (currentIndex === index ? color : currentColor))
    );
    setLispParenColors(nextColors);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      lispCodeView: {
        parenDepthColors: nextColors
      }
    });
  }

  async function updateDesktopSurfaceScalePreference(
    key: "tooltipScalePercent" | "controlIconScalePercent" | "dockIconScalePercent" | "conversationTextScalePercent" | "sourceCodeTextScalePercent",
    value: number
  ): Promise<void> {
    const normalizedValue = normalizeDesktopSurfaceScalePercent(value);
    const nextDesktopSurfaceView = {
      tooltipScalePercent:
        key === "tooltipScalePercent" ? normalizedValue : tooltipScalePercent,
      controlIconScalePercent:
        key === "controlIconScalePercent" ? normalizedValue : controlIconScalePercent,
      dockIconScalePercent:
        key === "dockIconScalePercent" ? normalizedValue : dockIconScalePercent,
      conversationTextScalePercent:
        key === "conversationTextScalePercent" ? normalizedValue : conversationTextScalePercent,
      sourceCodeTextScalePercent:
        key === "sourceCodeTextScalePercent" ? normalizedValue : sourceCodeTextScalePercent
    };

    if (key === "tooltipScalePercent") {
      setTooltipScalePercent(normalizedValue);
    } else if (key === "controlIconScalePercent") {
      setControlIconScalePercent(normalizedValue);
    } else if (key === "dockIconScalePercent") {
      setDockIconScalePercent(normalizedValue);
    } else if (key === "conversationTextScalePercent") {
      setConversationTextScalePercent(normalizedValue);
    } else {
      setSourceCodeTextScalePercent(normalizedValue);
    }

    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      desktopSurfaceView: nextDesktopSurfaceView
    });
  }

  async function applyProviderRoutingMode(mode: ProviderRoutingMode): Promise<void> {
    try {
      setIsUpdatingProviderRouting(true);
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const result = await window.sbclAgentDesktop.command.updateProviderRouting({ mode });
      setProviderSummary(result.data);
      setProviderProfileStatusMessage(`Routing mode updated to ${mode}.`);
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to update provider routing mode."
      );
    } finally {
      setIsUpdatingProviderRouting(false);
    }
  }

  async function activateProviderProfile(profileName: string): Promise<void> {
    try {
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const result = await window.sbclAgentDesktop.command.useProviderProfile({ profileName });
      setProviderSummary(result.data);
      setSelectedProviderProfileName(profileName);
      setProviderProfileStatusMessage(`Activated provider profile ${profileName}.`);
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to activate provider profile."
      );
    }
  }

  async function saveProviderProfile(clearApiKey = false): Promise<void> {
    try {
      setIsSavingProviderProfile(true);
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const apiKey = providerProfileDraft.apiKey?.trim() ?? "";
      const payload: ConfigureProviderProfileInput = {
        ...providerProfileDraft,
        profileName: providerProfileDraft.profileName.trim() || "default",
        model: providerProfileDraft.model.trim() || llmProviderPresetForProfile(providerProfileDraft).defaultModel,
        fastModel:
          providerProfileDraft.fastModel?.trim() ||
          providerProfileDraft.model.trim() ||
          llmProviderPresetForProfile(providerProfileDraft).defaultFastModel,
        apiBase: providerProfileDraft.apiBase?.trim() ?? "",
        intents: (providerProfileDraft.intents ?? []).map((intent) => intent.trim()).filter(Boolean),
        activate: providerProfileDraft.activate ?? false
      };
      if (clearApiKey) {
        payload.clearApiKey = true;
        payload.apiKey = "";
      } else if (apiKey.length > 0) {
        payload.apiKey = apiKey;
      } else {
        delete payload.apiKey;
      }
      const result = await window.sbclAgentDesktop.command.configureProviderProfile(payload);
      setProviderSummary(result.data);
      setSelectedProviderProfileName(payload.profileName);
      setProviderProfileDraft((current) => ({
        ...current,
        profileName: payload.profileName,
        model: payload.model,
        fastModel: payload.fastModel,
        apiBase: payload.apiBase,
        apiKey: "",
        clearApiKey: false
      }));
      setProviderProfileStatusMessage(
        clearApiKey
          ? `Cleared the stored token for ${payload.profileName}.`
          : payload.activate
            ? `Saved and activated provider profile ${payload.profileName}.`
            : `Saved provider profile ${payload.profileName}.`
      );
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to save provider profile."
      );
    } finally {
      setIsSavingProviderProfile(false);
    }
  }

  async function runPackageManagementCommand(
    execute: () => Promise<CommandResultDto<PackageManagementCommandResultDto>>
  ): Promise<void> {
    try {
      setIsPackageManagementBusy(true);
      setPackageManagementError(null);
      setPackageManagementStatusMessage(null);
      const result = await execute();
      setPackageManagementCommandResult(result.data);
      setPackageManagementSummary(result.data.packageManagement);
      setPackageManagementStatusMessage(result.data.summary);
    } catch (error) {
      setPackageManagementError(
        error instanceof Error ? error.message : "Package-management command failed."
      );
    } finally {
      setIsPackageManagementBusy(false);
    }
  }

  async function installQuicklispPackage(): Promise<void> {
    if (!effectiveEnvironmentId || quicklispSystemDraft.trim().length === 0) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.installQuicklispPackage({
        environmentId: effectiveEnvironmentId,
        systemName: quicklispSystemDraft.trim()
      })
    );
  }

  async function executeQlotCommand(): Promise<void> {
    if (!effectiveEnvironmentId || qlotCommandDraft.trim().length === 0) {
      return;
    }
    const args = qlotCommandDraft
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.runQlotCommand({
        environmentId: effectiveEnvironmentId,
        args
      })
    );
  }

  async function saveSourceRegistryEntry(): Promise<void> {
    if (!effectiveEnvironmentId || sourceRegistryDraftPath.trim().length === 0) {
      return;
    }
    const path = sourceRegistryDraftPath.trim();
    await runPackageManagementCommand(() =>
      sourceRegistryEditOriginalPath
        ? window.sbclAgentDesktop.command.updateSourceRegistryEntry({
            environmentId: effectiveEnvironmentId,
            oldPath: sourceRegistryEditOriginalPath,
            newPath: path
          })
        : window.sbclAgentDesktop.command.addSourceRegistryEntry({
            environmentId: effectiveEnvironmentId,
            path
          })
    );
    setSourceRegistryDraftPath("");
    setSourceRegistryEditOriginalPath(null);
  }

  async function removeSourceRegistryPath(path: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.removeSourceRegistryEntry({
        environmentId: effectiveEnvironmentId,
        path
      })
    );
  }

  async function saveLocalProject(): Promise<void> {
    if (!effectiveEnvironmentId || localProjectPathDraft.trim().length === 0) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.addLocalProject({
        environmentId: effectiveEnvironmentId,
        path: localProjectPathDraft.trim(),
        name: localProjectNameDraft.trim() || undefined
      })
    );
    setLocalProjectPathDraft("");
    setLocalProjectNameDraft("");
  }

  async function removeLocalProjectByName(name: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.removeLocalProject({
        environmentId: effectiveEnvironmentId,
        name
      })
    );
  }

  async function saveMcpServer(): Promise<void> {
    if (!effectiveEnvironmentId || mcpServerDraft.name.trim().length === 0) {
      return;
    }
    try {
      setIsSavingMcpServer(true);
      setMcpServerError(null);
      setMcpServerStatusMessage(null);
      const payload: ConfigureMcpServerInput = {
        environmentId: effectiveEnvironmentId,
        serverId: mcpServerDraft.serverId ?? undefined,
        name: mcpServerDraft.name.trim(),
        transport: mcpServerDraft.transport,
        command: mcpServerDraft.command?.trim() || undefined,
        arguments: (mcpServerDraft.arguments ?? []).map((value) => value.trim()).filter(Boolean),
        environmentVariables: mcpServerDraft.environmentVariables ?? {},
        workingDirectory: mcpServerDraft.workingDirectory?.trim() || undefined,
        endpoint: mcpServerDraft.endpoint?.trim() || undefined,
        capabilities: (mcpServerDraft.capabilities ?? []).map((value) => value.trim()).filter(Boolean),
        retryPolicy: mcpServerDraft.retryPolicy ?? undefined,
        healthStatus: mcpServerDraft.healthStatus ?? undefined,
        enabledP: mcpServerDraft.enabledP ?? true,
        discoverableP: mcpServerDraft.discoverableP ?? true
      };
      const result = await window.sbclAgentDesktop.command.configureMcpServer(payload);
      await refreshMcpServerConfigs(effectiveEnvironmentId);
      await refreshDesktopTaskManifests(effectiveEnvironmentId);
      setSelectedMcpServerId(result.data.id);
      setMcpServerDraft(buildMcpServerDraft(result.data));
      setMcpServerStatusMessage(`Saved MCP server ${result.data.name}.`);
    } catch (error) {
      setMcpServerError(
        error instanceof Error ? error.message : "Failed to save MCP server configuration."
      );
    } finally {
      setIsSavingMcpServer(false);
    }
  }

  async function removeMcpServer(serverId: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    try {
      setIsSavingMcpServer(true);
      setMcpServerError(null);
      setMcpServerStatusMessage(null);
      await window.sbclAgentDesktop.command.removeMcpServer({
        environmentId: effectiveEnvironmentId,
        serverId
      });
      const nextServers = await refreshMcpServerConfigs(effectiveEnvironmentId);
      await refreshDesktopTaskManifests(effectiveEnvironmentId);
      setSelectedMcpServerId(nextServers[0]?.id ?? null);
      setMcpServerDraft(buildMcpServerDraft(nextServers[0] ?? null));
      setMcpServerStatusMessage(`Removed MCP server ${serverId}.`);
    } catch (error) {
      setMcpServerError(
        error instanceof Error ? error.message : "Failed to remove MCP server configuration."
      );
    } finally {
      setIsSavingMcpServer(false);
    }
  }

  function toggleWorkspaceMenu(workspace: string): void {
    setExpandedWorkspaceMenus((current) => ({
      ...current,
      [workspace]: !current[workspace]
    }));
  }

  async function navigateToBrowserDomain(domain: BrowserDomain): Promise<void> {
    setSelectedBrowserDomain(domain);
    setExpandedWorkspaceMenus((current) => ({ ...current, browser: true }));
    openDesktopWindow("window:browser-surface");
    await navigateToWorkspace("browser");
  }

  async function navigateToProjectsSurface(): Promise<void> {
    openDesktopWindow("window:projects-surface");
    await navigateToWorkspace("projects");
  }

  async function navigateToConfigurationSurface(): Promise<void> {
    openDesktopWindow("window:configuration-surface");
    await navigateToWorkspace("configuration");
  }

  async function navigateToOperateSection(section: OperateSection): Promise<void> {
    setSelectedOperateSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, environment: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("environment");
    if (effectiveEnvironmentId) {
      await loadWorkWorkspace(effectiveEnvironmentId);
      await loadApprovalWorkspace(effectiveEnvironmentId);
      await loadIncidentWorkspace(effectiveEnvironmentId);
    }
    setActiveWorkspace("environment");
  }

  async function navigateToConversationSection(section: ConversationSection): Promise<void> {
    if (section !== "draft") {
      setDraftEntryFocusOverride(null);
    } else if (!draftEntryFocusOverride) {
      setDraftEntryFocusOverride(null);
    }
    setSelectedConversationSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, conversations: true }));
    openDesktopWindow("window:conversations-surface");
    await navigateToWorkspace("conversations");
    setSelectedConversationSection(section);
  }

  async function navigateToEditorSurface(): Promise<void> {
    openDesktopWindow("window:editor-surface");
    await navigateToWorkspace("editor");
  }

  async function navigateToTranscriptSurface(): Promise<void> {
    openDesktopWindow("window:transcript-surface");
    await navigateToWorkspace("transcript");
  }

  async function navigateToMemorySurface(): Promise<void> {
    openDesktopWindow("window:memory-surface");
    await navigateToWorkspace("memory");
  }

  async function openActorSystemSurface(): Promise<void> {
    setSelectedExecutionSection("actor-system");
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    openDesktopWindow("window:actor-system-surface");
    await navigateToWorkspace("runtime");
  }

  function conversationSectionLabel(section: ConversationSection): string {
    return section === "threads"
      ? "Threads"
      : section === "turns"
        ? "Turns"
        : section === "draft"
          ? "Draft"
          : "REPL";
  }

  function activateConversationInspectorSection(section: ConversationSection): void {
    if (section !== "draft") {
      setDraftEntryFocusOverride(null);
    }
    setSelectedConversationSection(section);
    setActiveHostedApp("control-panel");
    setActiveWorkspace("conversations");
  }

  async function openConversationDraftWithFocusOverride(override: EnvironmentFocusState): Promise<void> {
    setDraftEntryFocusOverride(override);
    setConversationRecoveryHandoff(null);
    setSelectedConversationSection("draft");
    setExpandedWorkspaceMenus((current) => ({ ...current, conversations: true }));
    openDesktopWindow("window:conversations-surface");
    await navigateToWorkspace("conversations");
    setSelectedConversationSection("draft");
  }

  async function openConversationDraftForIncidentRestartSuggestion(restartLabel: string): Promise<void> {
    const incidentLabel = selectedIncidentId ?? "current incident";
    const override: EnvironmentFocusState = {
      ...createDefaultEnvironmentFocusState(),
      kind: "governance-incident",
      sourceWorkspace: "incidents",
      sourceSurface: "incidents",
      incidentId: selectedIncidentId
    };
    const basePrompt = buildConversationPrompt({
      focusKind: "governance-incident",
      incidentId: selectedIncidentId
    });
    const restartPrompt = [
      basePrompt,
      `Prioritize the captured restart suggestion: "${restartLabel}".`,
      "Explain whether this restart is the safest governed next step, what evidence justifies it, and what should be checked before using it."
    ].join("\n");
    setDraftEntryFocusOverride(override);
    setConversationRecoveryHandoff({
      source: "incident-restart",
      incidentId: incidentLabel,
      restartLabel
    });
    setConversationDraft(restartPrompt);
    if (selectedIncident?.linkedThreadId) {
      setSelectedThreadId(selectedIncident.linkedThreadId);
      setSelectedThread(null);
      setSelectedTurnId(null);
      setSelectedTurn(null);
      setPendingConversationComposerFocusThreadId(selectedIncident.linkedThreadId);
    }
    await navigateToConversationSection("draft");
  }

  async function openListenerWorkbenchForIncidentRestartSuggestion(restartLabel: string): Promise<void> {
    const incidentLabel = selectedIncidentId ?? "current incident";
    const restartForm = [
      ";; Evaluate the guarded recovery restart path before resuming execution.",
      `;; Incident: ${incidentLabel}`,
      `;; Prioritized restart: ${restartLabel}`,
      "(list",
      ` :incident-id "${incidentLabel}"`,
      ` :restart-suggestion "${restartLabel}")`
    ].join("\n");
    setRuntimeForm(restartForm);
    setRuntimeRecoveryLaunch({
      source: "incident-restart",
      incidentId: incidentLabel,
      restartLabel
    });
    await openListenerWorkbench();
  }

  async function continueThread(threadId: string): Promise<void> {
    setSelectedThreadId(threadId);
    setSelectedThread(null);
    setSelectedTurnId(null);
    setSelectedTurn(null);
    setPendingConversationComposerFocusThreadId(threadId);
    if (currentProjectId) {
      await persistConversationThreadSelection(currentProjectId, threadId);
    }
    await navigateToConversationSection("threads");
  }

  async function continueWorkItem(workItemId: string): Promise<void> {
    setSelectedWorkItemId(workItemId);
    setPendingWorkItemFocusId(workItemId);
    await navigateToExecutionSection("work");
  }

  async function continueRecovery(incidentId: string): Promise<void> {
    setSelectedIncidentId(incidentId);
    setPendingIncidentFocusId(incidentId);
    await navigateToRecoverySection("incidents");
  }

  async function openListenerWorkbench(): Promise<void> {
    focusDesktopWindow("window:listener-workbench");
    updateActiveDesktopWindows((current) => updateWindowState(current, "window:listener-workbench", "open"));
    setSelectedExecutionSection("listener");
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    setActiveHostedApp("listener-workbench");
    setActiveWorkspace("runtime");

    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    const actionPromise = environmentId
      ? window.sbclAgentDesktop.command.desktopAction({
          environmentId,
          actionKind: "activate-panel",
          panelId: workspaceToDesktopPanelId("runtime")
        })
      : Promise.resolve(null);

    const [desktopActionResult] = await Promise.all([
      actionPromise,
      window.sbclAgentDesktop.desktop.focusWorkspace("runtime"),
      window.sbclAgentDesktop.desktop.setDesktopPreferences({ lastWorkspace: "runtime" })
    ]);

    if (desktopActionResult?.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
    }
  }

  async function navigateToDesktopPanel(panelId: DesktopPanelId): Promise<void> {
    if (panelId === "governance") {
      await navigateToWorkspace("environment");
      return;
    }
    focusDesktopWindow(
      panelId === "display"
        ? "window:display"
        : "window:inspector"
    );
    if (panelId === "inspector" && !inspectorPinned) {
      void persistResolvedShellLayout(applyShellLayoutAction({ type: "expand_right_rail" }));
      updateActiveDesktopWindows((current) => updateWindowState(current, "window:inspector", "open"));
    }
    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    setActiveHostedApp("control-panel");

    if (!environmentId) {
      setActiveWorkspace((current) => desktopPanelToWorkspaceId(panelId, current));
      return;
    }

    const desktopActionResult = await window.sbclAgentDesktop.command.desktopAction({
      environmentId,
      actionKind: "activate-panel",
      panelId
    });

    if (desktopActionResult.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
      setActiveWorkspace((current) =>
        desktopPanelToWorkspaceId(desktopActionResult.data.desktopModel.activePanel, current)
      );
    } else {
      setActiveWorkspace((current) => desktopPanelToWorkspaceId(panelId, current));
    }
  }


  function resolveOrchestrationApprovalContext(threadIdHint?: string | null): {
    approvalId: string | null;
    actorMessageId: string | null;
    sessionId: string | null;
    threadId: string | null;
    operator: string | null;
  } | null {
    const candidates = [asRecord(orchestrationFocus), ...orchestrationInbox.map((entry) => asRecord(entry))];
    const normalizedThreadIdHint = firstStringValue(threadIdHint);
    const matchingCandidate =
      candidates.find((candidate) => {
        const operator = firstStringValue(
          candidate.primaryCommandOperator,
          asRecord(candidate.primaryCommand).operator
        );
        if (operator !== "desktop-task/approve-approval") {
          return false;
        }
        const candidateThreadId = firstStringValue(candidate.threadId);
        return normalizedThreadIdHint == null || candidateThreadId == null || candidateThreadId === normalizedThreadIdHint;
      }) ??
      (normalizedThreadIdHint == null
        ? candidates.find((candidate) => {
            const operator = firstStringValue(
              candidate.primaryCommandOperator,
              asRecord(candidate.primaryCommand).operator
            );
            return operator === "desktop-task/approve-approval";
          })
        : undefined);
    if (!matchingCandidate) {
      return null;
    }
    const primaryCommand = asRecord(matchingCandidate.primaryCommand);
    const payload = asRecord(primaryCommand.payload);
    return {
      approvalId: firstStringValue(
        matchingCandidate.approvalId,
        payload.approvalId,
        asRecord(matchingCandidate.approvalSummary).approvalId
      ),
      actorMessageId: firstStringValue(
        matchingCandidate.actorMessageId,
        payload.actorMessageId,
        asRecord(matchingCandidate.approvalSummary).actorMessageId
      ),
      sessionId: firstStringValue(
        matchingCandidate.sessionId,
        payload.sessionId,
        asRecord(matchingCandidate.approvalSummary).sessionId
      ),
      threadId: firstStringValue(
        matchingCandidate.threadId,
        asRecord(matchingCandidate.approvalSummary).threadId,
        normalizedThreadIdHint
      ),
      operator: firstStringValue(matchingCandidate.primaryCommandOperator, primaryCommand.operator)
    };
  }

  function focusDesktopWindow(windowId: string): void {
    setDesktopFocusById((current) => ({ ...current, [activeDesktopId]: windowId }));
    setDesktopWindowZCounterById((current) => {
      const nextZIndex = (current[activeDesktopId] ?? 3) + 1;
      updateActiveDesktopWindows((windows) => bringWindowToFront(windows, windowId, nextZIndex));
      return { ...current, [activeDesktopId]: nextZIndex };
    });
  }

  function minimizeDesktopWindow(windowId: string): void {
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "minimized"));
  }

  function restoreDesktopWindow(windowId: string): void {
    focusDesktopWindow(windowId);
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "open"));
  }

  function openDesktopWindow(windowId: string): void {
    restoreDesktopWindow(windowId);
  }

  function openCalculatorApplication(): void {
    openDesktopWindow("window:calculator");
  }

  async function openCalculatorWithExpression(expression: string, shouldEvaluate = false): Promise<void> {
    const trimmedExpression = expression.trim();
    if (trimmedExpression.length === 0) {
      return;
    }
    setPendingCalculatorExpressionRequest({
      expression: trimmedExpression,
      shouldEvaluate,
      token: Date.now()
    });
    openCalculatorApplication();
  }

  function clearPendingCalculatorExpressionRequest(): void {
    setPendingCalculatorExpressionRequest(null);
  }

  async function insertCalculatorResultIntoConversationDraft(input: {
    expression: string;
    result: CalculatorResultDto;
  }): Promise<void> {
    setLatestCalculatorResult(input);
    const summaryLine = input.result.summary?.trim().length
      ? input.result.summary.trim()
      : `Result ${input.result.displayValue}`;
    const addition = `Calculator: ${input.expression} = ${input.result.displayValue}\n${summaryLine}`;
    setConversationDraft((current) =>
      current.trim().length > 0 ? `${current.trim()}\n\n${addition}` : addition
    );
    await navigateToConversationSection("draft");
  }

  function closeDesktopWindow(windowId: string): void {
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "closed"));
  }

  function resetDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => resetDesktopWindowLayout(current));
  }

  function cascadeDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => cascadeDesktopWindows(current));
  }

  function tileDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => tileDesktopWindows(current));
  }

  function resizeDesktopWindowState(windowId: string, preset: DesktopWindowSizePreset): void {
    updateActiveDesktopWindows((current) => resizeDesktopWindow(current, windowId, preset));
    focusDesktopWindow(windowId);
  }

  function resizeDesktopWindowDimensionsState(windowId: string, width: number, height: number): void {
    updateActiveDesktopWindows((current) => resizeDesktopWindowToDimensions(current, windowId, width, height));
    focusDesktopWindow(windowId);
  }

  function setDesktopWindowFrameState(windowId: string, x: number, y: number, width: number, height: number): void {
    updateActiveDesktopWindows((current) => setDesktopWindowFrame(current, windowId, x, y, width, height));
    focusDesktopWindow(windowId);
  }

  function moveDesktopWindowState(windowId: string, direction: DesktopWindowMoveDirection): void {
    updateActiveDesktopWindows((current) => moveDesktopWindow(current, windowId, direction));
    focusDesktopWindow(windowId);
  }

  function positionDesktopWindowState(windowId: string, x: number, y: number): void {
    updateActiveDesktopWindows((current) => positionDesktopWindow(current, windowId, x, y));
    focusDesktopWindow(windowId);
  }

  function createDesktopSpace(): void {
    const nextNumber = Object.keys(desktopLabelsById).length + 1;
    const nextDesktopId = `desktop-${nextNumber}`;
    setDesktopSpaces((current) => ({ ...current, [nextDesktopId]: [] }));
    setDesktopLabelsById((current) => ({ ...current, [nextDesktopId]: `Desktop ${nextNumber}` }));
    setDesktopFocusById((current) => ({ ...current, [nextDesktopId]: "" }));
    setDesktopWindowZCounterById((current) => ({ ...current, [nextDesktopId]: 1 }));
    setDesktopZoomById((current) => ({ ...current, [nextDesktopId]: 0.72 }));
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [nextDesktopId]: [
        "window:control-panel",
        "window:listener-workbench",
        "window:inspector",
        "window:display",
        "window:shell-context",
        "window:detailed-surface",
        "window:browser-surface",
        "window:actor-system-surface",
        "window:editor-surface",
        "window:workspace-surface",
        "window:transcript-surface",
        "window:memory-surface",
        "window:configuration-surface",
        "window:conversations-surface",
        "window:calculator"
      ]
    }));
    setActiveDesktopId(nextDesktopId);
  }

  function switchDesktopSpace(desktopId: string): void {
    setActiveDesktopId(desktopId);
  }

  function moveWindowToNextDesktop(windowId: string): void {
    const desktopIds = Object.keys(desktopLabelsById);
    if (desktopIds.length < 2) {
      createDesktopSpace();
      return;
    }
    const currentIndex = desktopIds.indexOf(activeDesktopId);
    const targetDesktopId = desktopIds[(currentIndex + 1) % desktopIds.length];
    const targetWindow = desktopWindows.find((window) => window.id === windowId);
    if (!targetWindow || targetDesktopId === activeDesktopId) {
      return;
    }

    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const targetWindows = current[targetDesktopId] ?? [];
      return {
        ...current,
        [activeDesktopId]: currentWindows.filter((window) => window.id !== windowId),
        [targetDesktopId]: upsertDesktopWindow(
          targetWindows,
          { ...targetWindow, state: "open" }
        )
      };
    });
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [activeDesktopId]: Array.from(new Set([...(current[activeDesktopId] ?? []), windowId])),
      [targetDesktopId]: (current[targetDesktopId] ?? []).filter((id) => id !== windowId)
    }));
    setDesktopFocusById((current) => ({ ...current, [targetDesktopId]: windowId }));
  }

  function moveWindowToPreviousDesktop(windowId: string): void {
    const desktopIds = Object.keys(desktopLabelsById);
    if (desktopIds.length < 2) {
      return;
    }
    const currentIndex = desktopIds.indexOf(activeDesktopId);
    const targetDesktopId = desktopIds[(currentIndex - 1 + desktopIds.length) % desktopIds.length];
    const targetWindow = desktopWindows.find((window) => window.id === windowId);
    if (!targetWindow || targetDesktopId === activeDesktopId) {
      return;
    }

    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const targetWindows = current[targetDesktopId] ?? [];
      return {
        ...current,
        [activeDesktopId]: currentWindows.filter((window) => window.id !== windowId),
        [targetDesktopId]: upsertDesktopWindow(
          targetWindows,
          { ...targetWindow, state: "open" }
        )
      };
    });
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [activeDesktopId]: Array.from(new Set([...(current[activeDesktopId] ?? []), windowId])),
      [targetDesktopId]: (current[targetDesktopId] ?? []).filter((id) => id !== windowId)
    }));
    setDesktopFocusById((current) => ({ ...current, [targetDesktopId]: windowId }));
  }

  function updateActiveDesktopZoom(nextZoom: number): void {
    setDesktopZoomById((current) => ({
      ...current,
      [activeDesktopId]: Math.max(0.4, Math.min(nextZoom, 1.6))
    }));
  }

  async function navigateToExecutionSection(section: ExecutionSection): Promise<void> {
    setSelectedExecutionSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    if (section === "actor-system") {
      openDesktopWindow("window:actor-system-surface");
      await navigateToWorkspace("runtime");
      return;
    }
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("runtime");
  }

  async function navigateToRecoverySection(section: RecoverySection): Promise<void> {
    setSelectedRecoverySection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, incidents: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("incidents");
  }

  async function navigateToEvidenceSection(section: EvidenceSection): Promise<void> {
    setSelectedEvidenceSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, artifacts: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("artifacts");
  }

  async function openApprovalRequest(requestId: string): Promise<void> {
    setSelectedApprovalId(requestId);
    await navigateToWorkspace("environment");
  }

  async function navigateToLinkedEntity(entity: LinkedEntityRefDto): Promise<void> {
    switch (entity.entityType) {
      case "approval":
        setSelectedApprovalId(entity.entityId);
        await navigateToWorkspace("environment");
        return;
      case "incident":
        setSelectedIncidentId(entity.entityId);
        await navigateToRecoverySection("incidents");
        return;
      case "work-item":
        setSelectedWorkItemId(entity.entityId);
        await navigateToExecutionSection("work");
        return;
      case "artifact":
        setSelectedArtifactId(entity.entityId);
        await navigateToEvidenceSection("artifacts");
        return;
      case "operation":
        await navigateToExecutionSection("listener");
        return;
      default:
        return;
    }
  }

  async function navigateToActionQueueItem(item: ActionQueueItem): Promise<void> {
    switch (item.objectType) {
      case "Thread":
        setSelectedThreadId(item.objectId);
        await navigateToConversationSection("threads");
        return;
      case "Approval":
        setSelectedApprovalId(item.objectId);
        setSelectedIncidentId(null);
        setSelectedWorkItemId(null);
        setSelectedArtifactId(null);
        await navigateToWorkspace("environment");
        return;
      case "Work":
        setSelectedApprovalId(null);
        setSelectedIncidentId(null);
        setSelectedWorkItemId(item.objectId);
        setSelectedArtifactId(null);
        await navigateToWorkspace("environment");
        return;
      case "Recovery":
        setSelectedApprovalId(null);
        setSelectedIncidentId(item.objectId);
        setSelectedWorkItemId(null);
        setSelectedArtifactId(null);
        await navigateToWorkspace("environment");
        return;
      case "Artifact":
        setSelectedApprovalId(null);
        setSelectedIncidentId(null);
        setSelectedWorkItemId(null);
        setSelectedArtifactId(item.objectId);
        await navigateToWorkspace("environment");
        return;
      case "Task":
        setSelectedBrowserDomain("governance");
        await navigateToWorkspace("browser");
        return;
      case "Runtime":
      default:
        await navigateToExecutionSection("listener");
        return;
    }
  }

  useEffect(() => {
    updateActiveDesktopWindows((current) => {
      const activeUndockedPanelIds = new Set(shellLayout.undockedPanelIds);
      let next = current.filter((window) => window.id !== "window:workspace-surface");
      let removedUndockedWindow = false;

      for (const window of next) {
        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
        if (panelId && !activeUndockedPanelIds.has(panelId)) {
          removedUndockedWindow = true;
          break;
        }
      }

      if (removedUndockedWindow) {
        next = next.filter((window) => {
          const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
          return !panelId || activeUndockedPanelIds.has(panelId);
        });
      }

      function defaultFrameForUndockedPanel(panelId: ShellDockPanelId): {
        x: number;
        y: number;
        width: number;
        height: number;
      } {
        switch (panelId) {
          case "shell-navigation":
            return { x: 24, y: 22, width: 90, height: 90 };
          case "shell-utilities":
            return { x: 34, y: 28, width: 74, height: 52 };
          case "conversation-context":
            return { x: 164, y: 18, width: 96, height: 90 };
          case "workspace-inspector":
            return { x: 152, y: 24, width: 78, height: 82 };
          case "editor-symbol":
            return { x: 144, y: 34, width: 76, height: 58 };
          default:
            return { x: 28, y: 24, width: 76, height: 60 };
        }
      }

      if (!suppressedDesktopWindowIds.includes("window:control-panel")) {
        next = upsertDesktopWindow(next, {
          id: "window:control-panel",
          kind: "hosted-app",
          title: "Control Panel",
          summary: workspaceDescriptor.summary,
          state: next.find((window) => window.id === "window:control-panel")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:control-panel")?.zIndex ?? 2,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:control-panel"],
          closable: false,
          hostedAppId: "control-panel"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:listener-workbench")) {
        next = upsertDesktopWindow(next, {
          id: "window:listener-workbench",
          kind: "hosted-app",
          title: "Listener Workbench",
          summary:
            runtimeSummary?.runtimeId
              ? `Runtime ${runtimeSummary.runtimeId} is live with ${runtimeSummary.loadedSystems.length} loaded systems.`
              : "Direct image-native listener, runtime execution, and retained REPL session work.",
          state: next.find((window) => window.id === "window:listener-workbench")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:listener-workbench")?.zIndex ?? 1,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:listener-workbench"],
          closable: true,
          hostedAppId: "listener-workbench"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:inspector")) {
        next = upsertDesktopWindow(next, {
          id: "window:inspector",
          kind: "utility",
          title: "Inspector",
          summary: summary?.activeContext.focusSummary ?? "Shell-wide object and execution inspection.",
          state: next.find((window) => window.id === "window:inspector")?.state ?? (inspectorPinned ? "minimized" : "minimized"),
          zIndex: next.find((window) => window.id === "window:inspector")?.zIndex ?? 3,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:inspector"],
          closable: true,
          panelId: "inspector"
        });
      }

      if ((desktopModel?.displayCount ?? 0) > 0 && !suppressedDesktopWindowIds.includes("window:display")) {
        next = upsertDesktopWindow(next, {
          id: "window:display",
          kind: "utility",
          title: "Display Surface",
          summary:
            desktopModel?.panels?.display?.selectedTitle ??
            "Display-backed governed surfaces and compatibility residents.",
          state: next.find((window) => window.id === "window:display")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:display")?.zIndex ?? 5,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:display"],
          closable: true,
          panelId: "display"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:shell-context")) {
        next = upsertDesktopWindow(next, {
          id: "window:shell-context",
          kind: "utility",
          title: "Shell Context",
          summary: shellCurrentSurfaceSummary.summary,
          state: next.find((window) => window.id === "window:shell-context")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:shell-context")?.zIndex ?? 6,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:shell-context"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:detailed-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:detailed-surface",
          kind: "utility",
          title: "Detailed Surface",
          summary: `${activeHostedAppDescriptor.label} detail routing and deeper single-surface work.`,
          state: next.find((window) => window.id === "window:detailed-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:detailed-surface")?.zIndex ?? 8,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:detailed-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:browser-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:browser-surface",
          kind: "utility",
          title: "Browser Surface",
          summary: `${selectedBrowserDomainDescriptor.label}: ${selectedBrowserDomainDescriptor.summary}`,
          state: next.find((window) => window.id === "window:browser-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:browser-surface")?.zIndex ?? 9,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:browser-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:actor-system-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:actor-system-surface",
          kind: "utility",
          title: "Actor System Surface",
          summary: "Dedicated actor-system hierarchy, workflow, metrics, and supervision inspection.",
          state: next.find((window) => window.id === "window:actor-system-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:actor-system-surface")?.zIndex ?? 9,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:actor-system-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:projects-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:projects-surface",
          kind: "utility",
          title: "Projects Surface",
          summary:
            selectedProjectDetail?.summary ??
            selectedProjectSummary?.summary ??
            "Open or create a governed project.",
          state: next.find((window) => window.id === "window:projects-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:projects-surface")?.zIndex ?? 10,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:projects-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:editor-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:editor-surface",
          kind: "utility",
          title: "Editor Surface",
          summary:
            currentEditorResult?.data.summary ??
            "",
          state: next.find((window) => window.id === "window:editor-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:editor-surface")?.zIndex ?? 10,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:editor-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:transcript-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:transcript-surface",
          kind: "utility",
          title: "Transcript Surface",
          summary:
            transcriptEntries[0]?.summary ??
            "Durable runtime, workspace, and event output stays visible here instead of being trapped inside whichever surface produced it.",
          state: next.find((window) => window.id === "window:transcript-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:transcript-surface")?.zIndex ?? 12,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:transcript-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:memory-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:memory-surface",
          kind: "utility",
          title: "Memory Surface",
          summary:
            selectedMemory?.summary ??
            "Inspect, revise, and delete deliberate operator memories without leaving the active environment.",
          state: next.find((window) => window.id === "window:memory-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:memory-surface")?.zIndex ?? 12,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:memory-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:operate-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:operate-surface",
          kind: "utility",
          title: "Notifications Surface",
          summary: `${selectedOperateSurfaceDescriptor.label}: ${selectedOperateSurfaceDescriptor.summary}`,
          state: next.find((window) => window.id === "window:operate-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:operate-surface")?.zIndex ?? 13,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:operate-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:configuration-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:configuration-surface",
          kind: "utility",
          title: "Configuration Surface",
          summary: `${configurationSections.find((section) => section.id === selectedConfigurationSection)?.label ?? "Configuration"}: ${workspaceDescriptor.summary}`,
          state: next.find((window) => window.id === "window:configuration-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:configuration-surface")?.zIndex ?? 14,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:configuration-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:conversations-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:conversations-surface",
          kind: "utility",
          title: "Conversations Surface",
          summary: `${conversationSectionLabel(selectedConversationSection)}: durable conversation work stays attached to the current environment.`,
          state: next.find((window) => window.id === "window:conversations-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:conversations-surface")?.zIndex ?? 15,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:conversations-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:calculator")) {
        next = upsertDesktopWindow(next, {
          id: "window:calculator",
          kind: "utility",
          title: "Calculator",
          summary: "",
          state: next.find((window) => window.id === "window:calculator")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:calculator")?.zIndex ?? 16,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:calculator"],
          closable: true
        });
      }

      for (const panelId of shellLayout.undockedPanelIds) {
        const panelDefinition = SHELL_DOCK_PANEL_DEFINITIONS[panelId];
        if (!panelDefinition) {
          continue;
        }
        const frame = defaultFrameForUndockedPanel(panelId);
        next = upsertDesktopWindow(next, {
          id: undockedShellWindowId(panelId),
          kind: "utility",
          title: panelDefinition.label,
          summary: `${panelDefinition.label} is floating in the desktop stage until it is docked back into its owning rail.`,
          state: next.find((window) => window.id === undockedShellWindowId(panelId))?.state ?? "open",
          zIndex: next.find((window) => window.id === undockedShellWindowId(panelId))?.zIndex ?? 17,
          ...frame,
          closable: false
        });
      }

      return desktopWindowRecordsEqual(current, next) ? current : next;
    });
  }, [activeDesktopId, desktopWindowCompositionSignature]);

  useEffect(() => {
    if (desktopCompositionInitializedById[activeDesktopId]) {
      return;
    }

    updateActiveDesktopWindows((current) =>
      current.map((window) => {
        return { ...window, state: "minimized" as const };
      })
    );
    setDesktopFocusById((current) => ({ ...current, [activeDesktopId]: "window:control-panel" }));
    setDesktopCompositionInitializedById((current) => ({ ...current, [activeDesktopId]: true }));
  }, [activeDesktopId, desktopCompositionInitializedById]);

  const desktopWindowSnapshots = useMemo(
    () =>
      desktopWindows.map((window) => {
        if (window.id === "window:control-panel") {
          return {
            ...window,
            summary: workspaceDescriptor.summary
          };
        }

        if (window.id === "window:listener-workbench") {
          return {
            ...window,
            summary:
              runtimeSummary?.runtimeId
                ? `Runtime ${runtimeSummary.runtimeId} is live with ${runtimeSummary.loadedSystems.length} loaded systems.`
                : window.summary
          };
        }

        if (window.id === "window:inspector") {
          return {
            ...window,
            summary: summary?.activeContext.focusSummary ?? window.summary
          };
        }

        if (window.id === "window:display") {
          return {
            ...window,
            summary:
              desktopModel?.panels?.display?.selectedTitle ?? "Display-backed governed surfaces and compatibility residents."
          };
        }

        if (window.id === "window:shell-context") {
          return {
            ...window,
            summary: shellCurrentSurfaceSummary.summary
          };
        }

        if (window.id === "window:detailed-surface") {
          return {
            ...window,
            summary: `${activeHostedAppDescriptor.label} detail routing and deeper single-surface work.`
          };
        }

        if (window.id === "window:browser-surface") {
          return {
            ...window,
            summary: `${selectedBrowserDomainDescriptor.label}: ${selectedBrowserDomainDescriptor.summary}`
          };
        }

        if (window.id === "window:projects-surface") {
          return {
            ...window,
            summary:
              selectedProjectDetail?.summary ??
              selectedProjectSummary?.summary ??
              "Open or create a governed project."
          };
        }

        if (window.id === "window:editor-surface") {
          return {
            ...window,
            summary:
              currentEditorResult?.data.summary ??
              ""
          };
        }

        if (window.id === "window:workspace-surface") {
          return {
            ...window,
            summary:
              currentWorkspaceResult?.data.summary ??
              "Draft Lisp forms, evaluate them deliberately, and retain scratch history without turning direct live work into either a thread or an execution queue."
          };
        }

        if (window.id === "window:transcript-surface") {
          return {
            ...window,
            summary:
              transcriptEntries[0]?.summary ??
              "Durable runtime, workspace, and event output stays visible here instead of being trapped inside whichever surface produced it."
          };
        }

        if (window.id === "window:memory-surface") {
          return {
            ...window,
            summary:
              selectedMemory?.summary ??
              "Inspect, revise, and delete deliberate operator memories without leaving the active environment."
          };
        }

        if (window.id === "window:operate-surface") {
          return {
            ...window,
            summary: `${selectedOperateSurfaceDescriptor.label}: ${selectedOperateSurfaceDescriptor.summary}`
          };
        }

        if (window.id === "window:configuration-surface") {
          return {
            ...window,
            summary: `${configurationSections.find((section) => section.id === selectedConfigurationSection)?.label ?? "Configuration"}: ${workspaceDescriptor.summary}`
          };
        }

        if (window.id === "window:conversations-surface") {
          return {
            ...window,
            summary: `${conversationSectionLabel(selectedConversationSection)}: durable conversation work stays attached to the current environment.`
          };
        }

        if (window.id === "window:calculator") {
          return {
            ...window,
            summary: ""
          };
        }

        return window;
      }),
    [activeHostedAppDescriptor.label, currentWorkspaceResult?.data.summary, desktopModel?.panels?.display?.selectedTitle, desktopWindows, runtimeSummary, selectedBrowserDomainDescriptor.label, selectedBrowserDomainDescriptor.summary, selectedConfigurationSection, selectedConversationSection, selectedMemory?.summary, selectedOperateSurfaceDescriptor.label, selectedOperateSurfaceDescriptor.summary, selectedProjectDetail?.summary, selectedProjectSummary?.summary, shellCurrentSurfaceSummary.summary, shellProactiveLead?.summary, summary?.activeContext.focusSummary, transcriptEntries, workspaceDescriptor.summary]
  );

  const allShellPanelContentById: Partial<Record<ShellDockPanelId, ReactNode>> = {
    "shell-navigation": (
      <ShellNavigationPanel
        activeHostedApp={activeHostedApp}
        activeWorkspace={activeWorkspace}
        browserDomains={browserDomains}
        conversationSections={conversationSections}
        expandedWorkspaceMenus={expandedWorkspaceMenus}
        navigateToBrowserDomain={(domainId) => {
          void navigateToBrowserDomain(domainId as BrowserDomain);
        }}
        openActorSystemSurface={() => {
          void openActorSystemSurface();
        }}
        openListenerWorkbench={() => {
          void openListenerWorkbench();
        }}
        openCalculatorApplication={openCalculatorApplication}
        navigateToConfigurationSurface={() => {
          void navigateToConfigurationSurface();
        }}
        navigateToConversationSection={(sectionId) => {
          void navigateToConversationSection(sectionId as ConversationSection);
        }}
        navigateToEditorSurface={() => {
          void navigateToEditorSurface();
        }}
        navigateToEvidenceSection={(sectionId) => {
          void navigateToEvidenceSection(sectionId as EvidenceSection);
        }}
        navigateToExecutionSection={(sectionId) => {
          void navigateToExecutionSection(sectionId as ExecutionSection);
        }}
        navigateToOperateSection={(sectionId) => {
          void navigateToOperateSection(sectionId as OperateSection);
        }}
        navigateToProjectsSurface={() => {
          void navigateToProjectsSurface();
        }}
        navigateToRecoverySection={(sectionId) => {
          void navigateToRecoverySection(sectionId as RecoverySection);
        }}
        navigateToTranscriptSurface={() => {
          void navigateToTranscriptSurface();
        }}
        navigateToMemorySurface={() => {
          void navigateToMemorySurface();
        }}
        navigateToWorkspace={(workspaceId) => {
          void navigateToWorkspace(workspaceId);
        }}
        selectedBrowserDomain={selectedBrowserDomain}
        selectedConversationSection={selectedConversationSection}
        selectedEvidenceSection={selectedEvidenceSection}
        selectedExecutionSection={selectedExecutionSection}
        selectedRecoverySection={selectedRecoverySection}
        toggleWorkspaceMenu={toggleWorkspaceMenu}
      />
    ),
    "shell-utilities": (
      <ShellUtilitiesPanel onExitIntentOsShell={openEnvironmentExitDialog} />
    ),
    "conversation-context": (
      <ConversationContextPanel
        clearPendingConversationComposerFocusThreadId={() => setPendingConversationComposerFocusThreadId(null)}
        conversationAttachments={conversationAttachments}
        conversationDraft={conversationDraft}
        conversationSendError={conversationSendError}
        conversationStream={conversationStream}
        isSendingConversation={isSendingConversation}
        orchestrationFocus={orchestrationFocus}
        orchestrationSnapshot={orchestrationSnapshot}
        planVerification={planVerification}
        onConversationAttachmentSelection={handleConversationAttachmentSelection}
        pendingConversationComposerFocusThreadId={pendingConversationComposerFocusThreadId}
        removeConversationAttachment={removeConversationAttachment}
        selectedConversationMessage={selectedConversationMessage}
        selectedThread={selectedThread}
        sendConversationMessage={handleSendConversationMessage}
        setConversationDraft={setConversationDraft}
        setSelectedConversationMessageId={setSelectedConversationMessageId}
      />
    ),
    "workspace-inspector": (
      <WorkspaceInspector {...workspaceInspectorProps} />
    ),
    "editor-symbol": (
      <EditorSymbolRailPanel
        currentEditorCursorSymbol={currentEditorCursorSymbol}
        currentEditorCursorSymbolHelp={currentEditorCursorSymbolHelp}
        currentEditorCursorSymbolPackage={currentEditorCursorSymbolPackage}
        currentEditorPackage={currentEditorPackage}
        runtimeCurrentPackage={runtimeSummary?.currentPackage}
      />
    )
  };

  const leftRailPanelEntries = createShellRailPanelEntries(leftRailPanels, allShellPanelContentById);
  const rightRailPanelEntries = createShellRailPanelEntries(rightRailPanels, allShellPanelContentById);
  const undockedShellPanelEntries = createShellRailPanelEntries(
    shellLayout.undockedPanelIds
      .map((panelId) => SHELL_DOCK_PANEL_DEFINITIONS[panelId])
      .filter((panel): panel is NonNullable<typeof panel> => Boolean(panel)),
    allShellPanelContentById
  );

  const activeLeftRailPanelEntry = resolveActiveShellRailPanel(leftRailPanelEntries, shellLayout.leftRail.activePanelId);
  const activeRightRailPanelEntry = resolveActiveShellRailPanel(rightRailPanelEntries, shellLayout.rightRail.activePanelId);

  const desktopWindowStageProps = {
    className: "desktop-window-stage desktop-window-stage-floating",
    activeDesktopId,
    approvalRequests,
    orchestrationInbox,
    attentionItems: globalAttentionItems,
    createReplSession: handleCreateReplSession,
    currentProjectReplFocus,
    currentFocusSummary: summary?.activeContext.focusSummary ?? "Environment posture is not yet available.",
    currentFocusTitle: summary?.activeContext.currentThreadTitle ?? summary?.environmentLabel ?? "Environment",
    calculatorRefreshToken,
    desktopDescriptors,
    desktopZoom: activeDesktopZoom,
    actionQueue: dashboardActionQueue,
    displayCount: desktopModel?.displayCount ?? 0,
    displayPanel: desktopModel?.panels?.display ?? null,
    topDisplaySurface: desktopModel?.topDisplaySurface ?? null,
    focusedWindowId: focusedDesktopWindowId,
    inspectorPanel: desktopModel?.panels?.inspector ?? null,
    activeHostedAppId: activeHostedApp,
    activeHostedAppLabel: activeHostedAppDescriptor.label,
    activeHostedAppSummary: activeHostedAppDescriptor.summary,
    browserWorkspaceProps,
    projectsWorkspaceProps,
    operateWorkspaceProps,
    executionWorkspaceProps,
    incidentsWorkspaceProps,
    workWorkspaceProps,
    evidenceWorkspaceProps,
    conversationsWorkspaceProps,
    configurationWorkspaceProps,
    editorSurfaceProps,
    transcriptSurfaceProps,
    memoryWorkspaceProps,
    activeWorkspace,
    selectedExecutionSection,
    currentProjectTitle: currentProject?.title ?? "implicit",
    environmentId: effectiveEnvironmentId,
    bindingId: binding?.environmentId ?? "unbound",
    centerAttentionSignals,
    hostState: hostStatus?.hostState ?? "starting",
    runtimeState: status?.runtimeState ?? "unknown",
    workflowState: status?.workflowState ?? "unknown",
    shellCurrentSurfaceSummary,
    leadAttention: shellProactiveLead,
    governedAttentionSignalCount,
    currentReplSessionId,
    evaluateRuntimeForm,
    incidents,
    isEvaluating,
    isInspectingRuntime,
    isDecidingApproval,
    onCloseWindow: (windowId: string) => {
      closeDesktopWindow(windowId);
    },
    onCascadeLayout: () => {
      cascadeDesktopWindowLayoutState();
    },
    onCreateDesktop: createDesktopSpace,
    onFocusWindow: (window: DesktopWindowRecord) => {
      focusDesktopWindow(window.id);
      if (window.hostedAppId === "listener-workbench") {
        void openListenerWorkbench();
      } else if (window.hostedAppId === "control-panel") {
        void navigateToHostedApp("control-panel");
      } else {
        const windowWorkspace = workspaceForDesktopWindow(window);
        if (windowWorkspace) {
          void navigateToWorkspace(windowWorkspace);
        } else if (window.panelId) {
          void navigateToDesktopPanel(window.panelId);
        }
      }
    },
    onMinimizeWindow: (windowId: string) => {
      minimizeDesktopWindow(windowId);
    },
    onMoveWindowToPreviousDesktop: (windowId: string) => {
      moveWindowToPreviousDesktop(windowId);
    },
    onMoveWindowToNextDesktop: (windowId: string) => {
      moveWindowToNextDesktop(windowId);
    },
    onResetLayout: () => {
      resetDesktopWindowLayoutState();
    },
    onRestoreWindow: (windowId: string) => {
      restoreDesktopWindow(windowId);
    },
    onMoveWindow: (windowId: string, direction: DesktopWindowMoveDirection) => {
      moveDesktopWindowState(windowId, direction);
    },
    onPositionWindow: (windowId: string, x: number, y: number) => {
      positionDesktopWindowState(windowId, x, y);
    },
    onResizeWindow: (windowId: string, preset: DesktopWindowSizePreset) => {
      resizeDesktopWindowState(windowId, preset);
    },
    onResizeWindowToDimensions: (windowId: string, width: number, height: number) => {
      resizeDesktopWindowDimensionsState(windowId, width, height);
    },
    onSetWindowFrame: (windowId: string, x: number, y: number, width: number, height: number) => {
      setDesktopWindowFrameState(windowId, x, y, width, height);
    },
    onTileLayout: () => {
      tileDesktopWindowLayoutState();
    },
    onOpenAttentionItem: (item: GlobalAttentionItem) => {
      void navigateToWorkspace(item.workspace);
    },
    onOpenActionQueueItem: (item: ActionQueueItem) => {
      void navigateToActionQueueItem(item);
    },
    onOpenDisplaySurface: () => {
      void navigateToDesktopPanel("display");
    },
    onOpenInspectorSurface: () => {
      void navigateToDesktopPanel("inspector");
    },
    browserSurfaceEntries,
    browserSurfaceSummary: selectedBrowserDomainDescriptor.summary,
    browserSurfaceTitle: selectedBrowserDomainDescriptor.label,
    onOpenShellContextWindow: () => {
      openDesktopWindow("window:shell-context");
    },
    onOpenProactivityWindow: () => {
      void navigateToWorkspace("environment");
    },
    onOpenDetailedSurfaceWindow: () => {
      openDesktopWindow("window:detailed-surface");
    },
    onOpenBrowserSurfaceWindow: () => {
      openDesktopWindow("window:browser-surface");
    },
    onOpenRuntimeWindow: () => {
      void openListenerWorkbench();
    },
    onOpenWorkflowWindow: () => {
      void navigateToWorkspace("environment");
    },
    onOpenIncident: (incidentId: string) => {
      void continueRecovery(incidentId);
    },
    onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => {
      void submitApprovalDecisionForRequest(requestId, decision);
    },
    onSwitchDesktop: switchDesktopSpace,
    onZoomIn: () => {
      updateActiveDesktopZoom(activeDesktopZoom + 0.1);
    },
    onZoomOut: () => {
      updateActiveDesktopZoom(activeDesktopZoom - 0.1);
    },
    onZoomReset: () => {
      updateActiveDesktopZoom(1);
    },
    onOpenDetailedWorkspace: () => {
      if (activeHostedApp === "listener-workbench") {
        void openListenerWorkbench();
        return;
      }
      void navigateToWorkspace(activeWorkspace);
    },
    undockedPanelContentById: allShellPanelContentById,
    undockDropTargetActive: shellPanelDragState?.target === "undocked",
    undockDropTargetRef: desktopWindowStageDropTargetRef,
    onDropUndockedPanel: (panelId: ShellDockPanelId) => {
      void undockShellPanel(panelId);
      endNativeShellPanelDrag();
    },
    onDockUndockedPanelLeft: (panelId: ShellDockPanelId) => {
      void dockShellPanel(panelId, "left");
    },
    onDockUndockedPanelRight: (panelId: ShellDockPanelId) => {
      void dockShellPanel(panelId, "right");
    },
    replSessionTitleDraft,
    replSessions: currentProjectReplSessions,
    runtimeForm,
    runtimeRecoveryLaunch,
    runtimeInspectionMode,
    runtimeInspectorPackage,
    runtimeInspectorSymbol,
    runtimeInspection,
    runtimeEntityDetail,
    runtimeResult,
    runtimeSummary,
    inspectRuntimeSymbol,
    setReplSessionTitleDraft,
    setRuntimeInspectionMode: updateRuntimeInspectionMode,
    setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
    setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
    setRuntimeForm,
    switchReplSession: handleSwitchReplSession,
    calculatorDraftExpression: conversationDraft,
    pendingCalculatorExpressionRequest,
    clearPendingCalculatorExpressionRequest,
    insertCalculatorResultIntoConversationDraft,
    openConversationDraft: () => navigateToConversationSection("draft"),
    recordCalculatorEvaluation: (input: { expression: string; result: CalculatorResultDto }) =>
      setLatestCalculatorResult(input),
    windows: desktopWindowSnapshots
  };

  return (
    <div
      className={`desktop-shell${sidebarPinned ? "" : " sidebar-collapsed"}${canvasPinned ? "" : " canvas-collapsed"}${inspectorPinned ? "" : " inspector-collapsed"}`}
      data-shell-drag-origin={shellPanelDragState?.origin ?? ""}
      data-shell-drag-panel-id={shellPanelDragState?.panelId ?? ""}
      data-shell-drag-target={shellPanelDragState?.target ?? ""}
      ref={shellRef}
      style={{
        ...(desktopShellInlineColumns
          ? {
              gridTemplateColumns: desktopShellInlineColumns
            }
          : {}),
        ["--shell-gap" as string]: `${shellGap}px`,
        ["--shell-padding-x" as string]: `${shellHorizontalPadding}px`,
        ["--shell-sidebar-width" as string]: `${effectiveSidebarColumnWidth}px`,
        ["--shell-inspector-width" as string]: `${effectiveInspectorColumnWidth}px`,
        ["--desktop-tooltip-scale" as string]: `${tooltipScalePercent / 100}`,
        ["--desktop-control-icon-scale" as string]: `${controlIconScalePercent / 100}`,
        ["--desktop-dock-icon-scale" as string]: `${dockIconScalePercent / 100}`,
        ["--desktop-conversation-text-scale" as string]: `${conversationTextScalePercent / 100}`,
        ["--desktop-source-code-text-scale" as string]: `${sourceCodeTextScalePercent / 100}`
      }}
    >
      {isSidebarResizing || isInspectorResizing ? (
        <div
          aria-hidden="true"
          className="shell-resize-capture-layer"
          onMouseMove={handleShellResizeCaptureMouseMove}
          onMouseUp={handleShellResizeCaptureMouseUp}
        />
      ) : null}
      <div className="window-drag-strip" aria-hidden="true">
        <div className="window-drag-label">Surface</div>
      </div>

      <div className="shell-glow shell-glow-left" />
      <div className="shell-glow shell-glow-right" />

      {errorMessage ? (
        <section className="shell-runtime-alert" role="alert">
          <div className="shell-runtime-alert-copy">
            <p className="shell-runtime-alert-eyebrow">Runtime Recovery</p>
            <strong>Surface encountered a host or startup fault.</strong>
            <p>{errorMessage}</p>
          </div>
          <button
            aria-label="Dismiss runtime alert"
            className="shell-runtime-alert-dismiss"
            onClick={() => setErrorMessage(null)}
            type="button"
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {isEnvironmentImageChooserOpen && environmentImageRegistry ? (
        <EnvironmentImageChooserDialog
          onClose={() => void handleContinueWithCurrentEnvironmentImage()}
          onOpenImage={(imageIdOrName) => void handleOpenEnvironmentImage(imageIdOrName)}
          registry={environmentImageRegistry}
        />
      ) : null}

      {isEnvironmentExitDialogOpen ? (
        <EnvironmentExitDialog
          canOverwriteCurrentImage={Boolean(environmentImageRegistry?.currentImageName)}
          currentImageName={environmentImageRegistry?.currentImageName ?? null}
          onClose={() => setIsEnvironmentExitDialogOpen(false)}
          onDiscard={() => void handleDiscardAndQuit()}
          onSaveAsNew={() => void handleSaveAsNewImageAndQuit()}
          onSaveCurrent={() => void handleSaveCurrentImageAndQuit()}
          saveAsName={environmentSaveAsNameDraft}
          setSaveAsName={setEnvironmentSaveAsNameDraft}
        />
      ) : null}

      {isProjectOpenDialogOpen ? (
        <ProjectOpenDialog
          currentProjectId={currentProjectId}
          onClose={() => setIsProjectOpenDialogOpen(false)}
          onOpenProject={(projectId) => void handleProjectSwitch(projectId)}
          projects={projects}
        />
      ) : null}

      {isProjectCreateDialogOpen ? (
        <ProjectCreateDialog
          environmentId={summary?.environmentId ?? binding?.environmentId ?? null}
          onClose={() => setIsProjectCreateDialogOpen(false)}
          onCreateProject={() => void handleCreateProjectFromEnvironment(newProjectTitleDraft)}
          setTitleDraft={setNewProjectTitleDraft}
          titleDraft={newProjectTitleDraft}
        />
      ) : null}

      {isEditorSourceFileDialogOpen ? (
        <EditorSourceFileLoadDialog
          currentPathDraft={editorSourceDirectoryPathDraft}
          directoryListing={editorSourceDirectoryListing}
          onChangePathDraft={setEditorSourceDirectoryPathDraft}
          onClose={() => setIsEditorSourceFileDialogOpen(false)}
          onLoadDirectory={() => void loadEditorSourceDirectory(editorSourceDirectoryPathDraft)}
          onLoadSelectedFile={() => void handleLoadEditorSourceFile()}
          onNavigateDirectory={navigateEditorSourceDirectory}
          onNavigateParent={navigateEditorSourceParentDirectory}
          selectedFilePath={editorSourceFilePathDraft}
          pathDraft={editorSourceFilePathDraft}
          setPathDraft={setEditorSourceFilePathDraft}
        />
      ) : null}

      {isEditorSourceFileSaveDialogOpen ? (
        <EditorSourceFileSaveDialog
          currentPathDraft={editorSourceSaveDirectoryPathDraft}
          directoryListing={editorSourceSaveDirectoryListing}
          fileNameDraft={editorSourceSaveFileNameDraft}
          onChangeFileNameDraft={setEditorSourceSaveFileNameDraft}
          onChangePathDraft={setEditorSourceSaveDirectoryPathDraft}
          onClose={() => setIsEditorSourceFileSaveDialogOpen(false)}
          onNavigateDirectory={navigateEditorSourceSaveDirectory}
          onNavigateParent={navigateEditorSourceSaveParentDirectory}
          onOpenDirectory={() => void loadEditorSourceSaveDirectory(editorSourceSaveDirectoryPathDraft)}
          onSave={() => void handleSaveCurrentEditorBufferAs()}
          selectedFilePath={joinDirectoryAndFileName(editorSourceSaveDirectoryPathDraft, editorSourceSaveFileNameDraft)}
        />
      ) : null}

      {isProjectConstitutionDialogOpen && selectedProjectDetail ? (
        <ProjectConstitutionEditDialog
          constitutionDraft={projectConstitutionDraft}
          onClose={() => setIsProjectConstitutionDialogOpen(false)}
          onSave={() => void handleSaveProjectConstitution()}
          projectTitle={selectedProjectDetail.title}
          setConstitutionDraft={setProjectConstitutionDraft}
        />
      ) : null}

      {isProjectRequirementDialogOpen && selectedProjectDetail ? (
        <ProjectRequirementCreateDialog
          onClose={() => setIsProjectRequirementDialogOpen(false)}
          onCreateRequirement={() => void handleCreateProjectRequirement()}
          projectTitle={selectedProjectDetail.title}
          requirementPriority={projectRequirementPriorityDraft}
          requirementStatus={projectRequirementStatusDraft}
          requirementSummary={projectRequirementSummaryDraft}
          requirementTitle={projectRequirementTitleDraft}
          setRequirementPriority={setProjectRequirementPriorityDraft}
          setRequirementStatus={setProjectRequirementStatusDraft}
          setRequirementSummary={setProjectRequirementSummaryDraft}
          setRequirementTitle={setProjectRequirementTitleDraft}
        />
      ) : null}

      {isProjectFeatureSpecificationDialogOpen && selectedProjectDetail ? (
        <ProjectFeatureSpecificationCreateDialog
          acceptanceCriteriaDraft={projectFeatureSpecificationAcceptanceCriteriaDraft}
          featureStatus={projectFeatureSpecificationStatusDraft}
          featureSummary={projectFeatureSpecificationSummaryDraft}
          featureTitle={projectFeatureSpecificationTitleDraft}
          onClose={() => setIsProjectFeatureSpecificationDialogOpen(false)}
          onCreateFeatureSpecification={() => void handleCreateProjectFeatureSpecification()}
          projectTitle={selectedProjectDetail.title}
          setAcceptanceCriteriaDraft={setProjectFeatureSpecificationAcceptanceCriteriaDraft}
          setFeatureStatus={setProjectFeatureSpecificationStatusDraft}
          setFeatureSummary={setProjectFeatureSpecificationSummaryDraft}
          setFeatureTitle={setProjectFeatureSpecificationTitleDraft}
        />
      ) : null}

      {isProjectUserJourneyDialogOpen && selectedProjectDetail ? (
        <ProjectUserJourneyCreateDialog
          actorsDraft={projectUserJourneyActorsDraft}
          edgeCasesDraft={projectUserJourneyEdgeCasesDraft}
          entrypointsDraft={projectUserJourneyEntrypointsDraft}
          journeySummary={projectUserJourneySummaryDraft}
          journeyTitle={projectUserJourneyTitleDraft}
          onClose={() => setIsProjectUserJourneyDialogOpen(false)}
          onCreateUserJourney={() => void handleCreateProjectUserJourney()}
          outcomesDraft={projectUserJourneyOutcomesDraft}
          projectTitle={selectedProjectDetail.title}
          setActorsDraft={setProjectUserJourneyActorsDraft}
          setEdgeCasesDraft={setProjectUserJourneyEdgeCasesDraft}
          setEntrypointsDraft={setProjectUserJourneyEntrypointsDraft}
          setJourneySummary={setProjectUserJourneySummaryDraft}
          setJourneyTitle={setProjectUserJourneyTitleDraft}
          setOutcomesDraft={setProjectUserJourneyOutcomesDraft}
          setStepsDraft={setProjectUserJourneyStepsDraft}
          stepsDraft={projectUserJourneyStepsDraft}
        />
      ) : null}

      {isProjectArchitectureDecisionDialogOpen && selectedProjectDetail ? (
        <ProjectArchitectureDecisionCreateDialog
          consequencesDraft={projectArchitectureDecisionConsequencesDraft}
          decisionStatus={projectArchitectureDecisionStatusDraft}
          decisionSummary={projectArchitectureDecisionSummaryDraft}
          decisionTitle={projectArchitectureDecisionTitleDraft}
          driversDraft={projectArchitectureDecisionDriversDraft}
          onClose={() => setIsProjectArchitectureDecisionDialogOpen(false)}
          onCreateArchitectureDecision={() => void handleCreateProjectArchitectureDecision()}
          projectTitle={selectedProjectDetail.title}
          setConsequencesDraft={setProjectArchitectureDecisionConsequencesDraft}
          setDecisionStatus={setProjectArchitectureDecisionStatusDraft}
          setDecisionSummary={setProjectArchitectureDecisionSummaryDraft}
          setDecisionTitle={setProjectArchitectureDecisionTitleDraft}
          setDriversDraft={setProjectArchitectureDecisionDriversDraft}
          setStackChoicesDraft={setProjectArchitectureDecisionStackChoicesDraft}
          stackChoicesDraft={projectArchitectureDecisionStackChoicesDraft}
        />
      ) : null}

      {isProjectDesignSystemDialogOpen && selectedProjectDetail ? (
        <ProjectRecordEditDialog
          draft={projectDesignSystemDraft}
          fieldLabel="Design System JSON"
          onClose={() => setIsProjectDesignSystemDialogOpen(false)}
          onSave={() => void handleSaveProjectDesignSystem()}
          projectTitle={selectedProjectDetail.title}
          recordLabel="Design System"
          setDraft={setProjectDesignSystemDraft}
        />
      ) : null}

      {isProjectStyleGuideDialogOpen && selectedProjectDetail ? (
        <ProjectRecordEditDialog
          draft={projectStyleGuideDraft}
          fieldLabel="Style Guide JSON"
          onClose={() => setIsProjectStyleGuideDialogOpen(false)}
          onSave={() => void handleSaveProjectStyleGuide()}
          projectTitle={selectedProjectDetail.title}
          recordLabel="Style Guide"
          setDraft={setProjectStyleGuideDraft}
        />
      ) : null}

      {isProjectReleaseReadinessDialogOpen && selectedProjectDetail ? (
        <ProjectReleaseReadinessEditDialog
          onClose={() => setIsProjectReleaseReadinessDialogOpen(false)}
          onSave={() => void handleSaveProjectReleaseReadiness()}
          openRisksDraft={projectReleaseReadinessOpenRisksDraft}
          observationPlanDraft={projectReleaseReadinessObservationPlanDraft}
          projectTitle={selectedProjectDetail.title}
          requiredApproversDraft={projectReleaseReadinessRequiredApproversDraft}
          setOpenRisksDraft={setProjectReleaseReadinessOpenRisksDraft}
          setObservationPlanDraft={setProjectReleaseReadinessObservationPlanDraft}
          setProjectReleaseReadinessSignoffStatusDraft={setProjectReleaseReadinessSignoffStatusDraft}
          setProjectReleaseReadinessStageDraft={setProjectReleaseReadinessStageDraft}
          setProjectReleaseReadinessTargetWindowDraft={setProjectReleaseReadinessTargetWindowDraft}
          setRequiredApproversDraft={setProjectReleaseReadinessRequiredApproversDraft}
          signoffStatusDraft={projectReleaseReadinessSignoffStatusDraft}
          stageDraft={projectReleaseReadinessStageDraft}
          targetWindowDraft={projectReleaseReadinessTargetWindowDraft}
        />
      ) : null}

      {isProjectReadinessObligationsDialogOpen && selectedProjectDetail ? (
        <ProjectReadinessObligationsEditDialog
          obligationsDraft={projectReadinessObligationsDraft}
          onAddObligation={addProjectReadinessObligationDraft}
          onClose={() => setIsProjectReadinessObligationsDialogOpen(false)}
          onRemoveObligation={removeProjectReadinessObligationDraft}
          onSave={() => void handleSaveProjectReadinessObligations()}
          onUpdateObligation={updateProjectReadinessObligationDraft}
          projectTitle={selectedProjectDetail.title}
        />
      ) : null}

      {isProjectTestingStrategyDialogOpen && selectedProjectDetail ? (
        <ProjectTestingStrategyEditDialog
          availableHarnesses={projectTestingHarnessInventory}
          maximumEnvironmentSaveLoadSecondsDraft={projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft}
          maximumFailedTestsDraft={projectTestingStrategyMaximumFailedTestsDraft}
          maximumSayTurnLatencySecondsDraft={projectTestingStrategyMaximumSayTurnLatencySecondsDraft}
          onAddSuiteExpectation={addProjectTestingStrategySuiteExpectation}
          onClose={() => setIsProjectTestingStrategyDialogOpen(false)}
          onRemoveSuiteExpectation={removeProjectTestingStrategySuiteExpectation}
          onSave={() => void handleSaveProjectTestingStrategy()}
          projectTitle={selectedProjectDetail.title}
          requiredEvidenceDraft={projectTestingStrategyRequiredEvidenceDraft}
          requireCoverageDraft={projectTestingStrategyRequireCoverageDraft}
          requireRecoveryReadyDraft={projectTestingStrategyRequireRecoveryReadyDraft}
          setMaximumEnvironmentSaveLoadSecondsDraft={setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft}
          setMaximumFailedTestsDraft={setProjectTestingStrategyMaximumFailedTestsDraft}
          setMaximumSayTurnLatencySecondsDraft={setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft}
          setRequiredEvidenceDraft={setProjectTestingStrategyRequiredEvidenceDraft}
          setRequireCoverageDraft={setProjectTestingStrategyRequireCoverageDraft}
          setRequireRecoveryReadyDraft={setProjectTestingStrategyRequireRecoveryReadyDraft}
          suiteExpectationsDraft={projectTestingStrategySuiteExpectationsDraft}
          updateSuiteExpectation={updateProjectTestingStrategySuiteExpectation}
        />
      ) : null}

      {isProjectSourceRootDialogOpen && selectedProjectDetail ? (
        <ProjectSourceRootCreateDialog
          onClose={() => setIsProjectSourceRootDialogOpen(false)}
          onCreateSourceRoot={() => void handleCreateProjectSourceRoot()}
          projectTitle={selectedProjectDetail.title}
          setSourceRootDraft={setProjectSourceRootDraft}
          sourceRootDraft={projectSourceRootDraft}
        />
      ) : null}

      {isProjectTestingHarnessDialogOpen && selectedProjectDetail ? (
        <ProjectTestingHarnessBindDialog
          availableHarnesses={projectTestingHarnessInventory}
          harnessIdDraft={projectTestingHarnessIdDraft}
          onBindTestingHarness={() => void handleBindProjectTestingHarness()}
          onClose={() => setIsProjectTestingHarnessDialogOpen(false)}
          projectTitle={selectedProjectDetail.title}
          setHarnessIdDraft={setProjectTestingHarnessIdDraft}
        />
      ) : null}

      {isProjectQualityGateDialogOpen && selectedProjectDetail ? (
        <ProjectQualityGateCreateDialog
          availableHarnesses={projectTestingHarnessInventory}
          gateStatusDraft={projectQualityGateStatusDraft}
          gateSummaryDraft={projectQualityGateSummaryDraft}
          gateTitleDraft={projectQualityGateTitleDraft}
          maximumEnvironmentSaveLoadSecondsDraft={projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft}
          maximumFailedTestsDraft={projectQualityGateMaximumFailedTestsDraft}
          maximumSayTurnLatencySecondsDraft={projectQualityGateMaximumSayTurnLatencySecondsDraft}
          minimumLinkedIncidentsDraft={projectQualityGateMinimumLinkedIncidentsDraft}
          minimumLinkedWorkItemsDraft={projectQualityGateMinimumLinkedWorkItemsDraft}
          onClose={() => setIsProjectQualityGateDialogOpen(false)}
          onCreateQualityGate={() => void handleCreateProjectQualityGate()}
          projectTitle={selectedProjectDetail.title}
          requiredHarnessIdsDraft={projectQualityGateRequiredHarnessIdsDraft}
          requireCoverageDraft={projectQualityGateRequireCoverageDraft}
          requireRecoveryReadyDraft={projectQualityGateRequireRecoveryReadyDraft}
          requireSourceRootsDraft={projectQualityGateRequireSourceRootsDraft}
          setGateStatusDraft={setProjectQualityGateStatusDraft}
          setGateSummaryDraft={setProjectQualityGateSummaryDraft}
          setGateTitleDraft={setProjectQualityGateTitleDraft}
          setMaximumEnvironmentSaveLoadSecondsDraft={setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft}
          setMaximumFailedTestsDraft={setProjectQualityGateMaximumFailedTestsDraft}
          setMaximumSayTurnLatencySecondsDraft={setProjectQualityGateMaximumSayTurnLatencySecondsDraft}
          setMinimumLinkedIncidentsDraft={setProjectQualityGateMinimumLinkedIncidentsDraft}
          setMinimumLinkedWorkItemsDraft={setProjectQualityGateMinimumLinkedWorkItemsDraft}
          setRequiredHarnessIdsDraft={setProjectQualityGateRequiredHarnessIdsDraft}
          setRequireCoverageDraft={setProjectQualityGateRequireCoverageDraft}
          setRequireRecoveryReadyDraft={setProjectQualityGateRequireRecoveryReadyDraft}
          setRequireSourceRootsDraft={setProjectQualityGateRequireSourceRootsDraft}
        />
      ) : null}

      {isWorkItemSteerDialogOpen && selectedWorkItem ? (
        <WorkItemSteerDialog
          nextStepDraft={workItemSteerNextStepDraft}
          noteDraft={workItemSteerNoteDraft}
          onClose={() => setIsWorkItemSteerDialogOpen(false)}
          onSave={() => void handleSteerWorkItem()}
          phaseDraft={workItemSteerPhaseDraft}
          setNextStepDraft={setWorkItemSteerNextStepDraft}
          setNoteDraft={setWorkItemSteerNoteDraft}
          setPhaseDraft={setWorkItemSteerPhaseDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemResumeDialogOpen && selectedWorkItem ? (
        <WorkItemResumeDialog
          noteDraft={workItemResumeNoteDraft}
          onClose={() => setIsWorkItemResumeDialogOpen(false)}
          onSave={() => void handleResumeWorkItem()}
          setNoteDraft={setWorkItemResumeNoteDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemQuarantineDialogOpen && selectedWorkItem ? (
        <WorkItemQuarantineDialog
          onClose={() => setIsWorkItemQuarantineDialogOpen(false)}
          onSave={() => void handleQuarantineWorkItem()}
          reasonDraft={workItemQuarantineReasonDraft}
          setReasonDraft={setWorkItemQuarantineReasonDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemRollbackDialogOpen && selectedWorkItem ? (
        <WorkItemRollbackDialog
          noteDraft={workItemRollbackNoteDraft}
          onClose={() => setIsWorkItemRollbackDialogOpen(false)}
          onSave={() => void handleRollbackWorkItem()}
          reasonDraft={workItemRollbackReasonDraft}
          setNoteDraft={setWorkItemRollbackNoteDraft}
          setReasonDraft={setWorkItemRollbackReasonDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemValidationDialogOpen && selectedWorkItem ? (
        <WorkItemValidationDialog
          onClose={() => setIsWorkItemValidationDialogOpen(false)}
          onSave={() => void handleCompleteWorkItemValidations()}
          setStatusDraft={setWorkItemValidationStatusDraft}
          statusDraft={workItemValidationStatusDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isIncidentRemediationPlanDialogOpen && selectedIncident ? (
        <IncidentRemediationPlanDialog
          actionDraft={incidentRemediationActionsDraft}
          blockerDraft={incidentRemediationBlockersDraft}
          incidentTitle={selectedIncident.title}
          onClose={() => setIsIncidentRemediationPlanDialogOpen(false)}
          onSave={() => void handleUpdateIncidentRemediationPlan()}
          ownerDraft={incidentRemediationOwnerDraft}
          setActionDraft={setIncidentRemediationActionsDraft}
          setBlockerDraft={setIncidentRemediationBlockersDraft}
          setOwnerDraft={setIncidentRemediationOwnerDraft}
          setStatusDraft={setIncidentRemediationStatusDraft}
          setSummaryDraft={setIncidentRemediationSummaryDraft}
          setValidationDraft={setIncidentRemediationValidationDraft}
          statusDraft={incidentRemediationStatusDraft}
          summaryDraft={incidentRemediationSummaryDraft}
          validationDraft={incidentRemediationValidationDraft}
        />
      ) : null}

      {isConversationSessionCreateDialogOpen ? (
        <ConversationSessionCreateDialog
          onClose={() => {
            setIsConversationSessionCreateDialogOpen(false);
            setConversationSessionTitleDraft("");
          }}
          onCreateSession={() => void handleCreateConversationSession()}
          setTitleDraft={setConversationSessionTitleDraft}
          titleDraft={conversationSessionTitleDraft}
        />
      ) : null}

      {isConversationThreadRenameDialogOpen ? (
        <ConversationThreadRenameDialog
          onClose={() => {
            setIsConversationThreadRenameDialogOpen(false);
            setConversationThreadRenameDraft("");
            setConversationThreadRenameTargetId(null);
          }}
          onRenameThread={() => void handleRenameConversationThread()}
          setTitleDraft={setConversationThreadRenameDraft}
          titleDraft={conversationThreadRenameDraft}
        />
      ) : null}

      {sidebarPinned && canvasPinned && viewportWidth > SHELL_STACK_BREAKPOINT ? (
        <ShellColumnSplitter
          active={isSidebarResizing}
          ariaLabel="Resize navigation"
          layout={splitterLayout}
          onMouseDown={startSidebarResize}
          side="left"
        />
      ) : null}

      {sidebarPinned ? (
        <ShellRailHost
          activePanelId={shellLayout.leftRail.activePanelId}
          ariaLabel="Application navigation"
          dockPanels={leftRailPanels}
          dockSectionHeight={leftRailDockSectionHeight}
          dragTargetActive={shellPanelDragState?.target === "left"}
          listRef={leftRailListRef}
          onDropDockedPanel={(panelId) => {
            void dockShellPanel(panelId, "left");
            endNativeShellPanelDrag();
          }}
          onNativeDragEnd={endNativeShellPanelDrag}
          onNativeDragStart={(panelId, panelLabel, origin) => {
            beginNativeShellPanelDrag(panelId, panelLabel, origin);
          }}
          onPanelPointerDown={(panelId, panelLabel, event) => {
            beginShellPanelPointerDrag(panelId, panelLabel, "left", event.clientX, event.clientY);
          }}
          onResizeDockSectionMouseDown={(event) => {
            startRailSectionResize("left", event);
          }}
          onToggle={() => {
            void toggleSidebarPinned();
          }}
          onSelectPanel={(panelId) => activateShellRailPanel("left", panelId)}
          onUndockPanel={(panelId) => {
            void undockShellPanel(panelId);
          }}
          onMovePanel={(panelId, direction) => {
            void reorderShellRailPanel("left", panelId, direction);
          }}
          panelRef={sidebarPanelRef}
          title="Shell"
          toggleAriaLabel="Hide Navigation"
          toggleTitle="Hide Navigation"
        >
          {activeLeftRailPanelEntry?.content ?? null}
        </ShellRailHost>
      ) : (
        <ShellCollapsedRail
          ariaLabel="Collapsed application navigation"
          className="sidebar sidebar-collapsed-rail"
          onToggle={() => {
            void toggleSidebarPinned();
          }}
          title="Shell"
          toggleAriaLabel="Show Navigation"
          toggleTitle="Show Navigation"
        >
          <div className="shell-sidebar-dock shell-sidebar-dock-collapsed">
            <div className="desktop-window-dock-rail shell-sidebar-dock-rail" role="toolbar" aria-label="Shell actions">
              <button
                aria-label="Exit Surface"
                className="desktop-window-dock-item shell-sidebar-dock-item-collapsed"
                data-tooltip="Exit Surface"
                onClick={openEnvironmentExitDialog}
                type="button"
              >
                <span className="desktop-window-dock-icon shell-sidebar-dock-icon-collapsed" aria-hidden="true">
                  <span className="desktop-window-dock-glyph desktop-window-dock-glyph-exit" />
                </span>
                <span className="desktop-window-dock-indicator" aria-hidden="true" />
              </button>
            </div>
          </div>
        </ShellCollapsedRail>
      )}
      {canvasPinned ? (
        <main className="canvas" ref={canvasPanelRef}>
          <div className="panel-titlebar">
            <button
              aria-label="Hide Navigation"
              className="panel-titlebar-toggle"
              onClick={() => void toggleCanvasPinned()}
              title="Hide Navigation"
              type="button"
            >
              <span aria-hidden="true">−</span>
            </button>
            <span className="panel-titlebar-label">Surface</span>
          </div>
          <div className="canvas-body desktop-primary-mode">
            <DesktopWindowStage {...desktopWindowStageProps} />
          </div>
        </main>
      ) : (
        <aside className="canvas canvas-collapsed-rail" aria-label="Collapsed workspace canvas">
          <div className="collapsed-panel-titlebar">
            <button
              aria-label="Show Navigation"
              className="panel-titlebar-toggle collapsed-panel-toggle"
              onClick={() => void toggleCanvasPinned()}
              title="Show Navigation"
              type="button"
            >
              <span aria-hidden="true">+</span>
            </button>
            <span className="collapsed-panel-title">Surface</span>
          </div>
        </aside>
      )}

      {canvasPinned && inspectorPinned && viewportWidth > SHELL_STACK_BREAKPOINT ? (
        <ShellColumnSplitter
          active={isInspectorResizing}
          ariaLabel="Resize inspector"
          layout={splitterLayout}
          onMouseDown={startInspectorResize}
          side="right"
        />
      ) : null}

      {inspectorPinned ? (
        <ShellRailHost
          activePanelId={shellLayout.rightRail.activePanelId}
          ariaLabel="Workspace inspector"
          dockPanels={rightRailPanels}
          dockSectionHeight={rightRailDockSectionHeight}
          dragTargetActive={shellPanelDragState?.target === "right"}
          listRef={rightRailListRef}
          onDropDockedPanel={(panelId) => {
            void dockShellPanel(panelId, "right");
            endNativeShellPanelDrag();
          }}
          onNativeDragEnd={endNativeShellPanelDrag}
          onNativeDragStart={(panelId, panelLabel, origin) => {
            beginNativeShellPanelDrag(panelId, panelLabel, origin);
          }}
          onPanelPointerDown={(panelId, panelLabel, event) => {
            beginShellPanelPointerDrag(panelId, panelLabel, "right", event.clientX, event.clientY);
          }}
          onResizeDockSectionMouseDown={(event) => {
            startRailSectionResize("right", event);
          }}
          onToggle={() => {
            void toggleInspectorPinned();
          }}
          onSelectPanel={(panelId) => activateShellRailPanel("right", panelId)}
          onUndockPanel={(panelId) => {
            void undockShellPanel(panelId);
          }}
          onMovePanel={(panelId, direction) => {
            void reorderShellRailPanel("right", panelId, direction);
          }}
          panelRef={inspectorPanelRef}
          title="Inspector"
          toggleAriaLabel="Collapse workspace panel"
          toggleTitle="Collapse workspace panel"
        >
          {activeRightRailPanelEntry?.content ?? null}
        </ShellRailHost>
      ) : (
        <ShellCollapsedRail
          ariaLabel="Collapsed inspector utility window"
          className="inspector inspector-collapsed-rail"
          onToggle={() => {
            void toggleInspectorPinned();
          }}
          title="Inspector"
          toggleAriaLabel="Open Inspector"
          toggleTitle="Open Inspector"
        />
      )}
      {shellTooltip ? (
        <div
          className="shell-tooltip-layer"
          role="tooltip"
          style={{ left: `${shellTooltip.x}px`, top: `${shellTooltip.y}px` }}
        >
          {shellTooltip.label}
        </div>
      ) : null}
      {shellPanelDragState ? (
        <div
          className="shell-panel-drag-ghost"
          style={{ left: `${shellPanelDragState.x + 14}px`, top: `${shellPanelDragState.y + 14}px` }}
        >
          {shellPanelDragState.panelLabel}
        </div>
      ) : null}
    </div>
  );
}

function ConversationContextPanel({
  selectedThread,
  selectedConversationMessage,
  conversationSendError,
  conversationDraft,
  conversationAttachments,
  conversationStream,
  isSendingConversation,
  orchestrationFocus,
  orchestrationSnapshot,
  planVerification,
  sendConversationMessage,
  onConversationAttachmentSelection,
  removeConversationAttachment,
  pendingConversationComposerFocusThreadId,
  clearPendingConversationComposerFocusThreadId,
  setConversationDraft,
  setSelectedConversationMessageId
}: {
  selectedThread: ThreadDetailDto | null;
  selectedConversationMessage: MessageDto | null;
  conversationSendError: string | null;
  conversationDraft: string;
  conversationAttachments: ConversationAttachmentDto[];
  conversationStream: {
    threadId: string;
    turnId: string | null;
    content: string;
  } | null;
  isSendingConversation: boolean;
  orchestrationFocus: Record<string, unknown> | null;
  orchestrationSnapshot: Record<string, unknown> | null;
  planVerification: Record<string, unknown> | null;
  sendConversationMessage: () => Promise<void>;
  onConversationAttachmentSelection: (files: FileList | null) => Promise<void>;
  removeConversationAttachment: (attachmentId: string) => void;
  pendingConversationComposerFocusThreadId: string | null;
  clearPendingConversationComposerFocusThreadId: () => void;
  setConversationDraft: (value: string) => void;
  setSelectedConversationMessageId: (messageId: string | null) => void;
}) {
  const messageStackRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousThreadIdRef = useRef<string | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const displayedConversationMessages =
    selectedThread &&
    conversationStream &&
    conversationStream.threadId === selectedThread.threadId &&
    conversationStream.content.length > 0
      ? [
          ...selectedThread.messages,
          {
            messageId: `streaming-${conversationStream.turnId ?? selectedThread.threadId}`,
            role: "assistant" as const,
            content: conversationStream.content,
            createdAt: new Date().toISOString()
          }
        ]
      : selectedThread?.messages ?? [];
  const orchestrationFocusRecord = asRecord(orchestrationFocus);
  const orchestrationSnapshotRecord = asRecord(orchestrationSnapshot);
  const orchestrationPostureSummary = asRecord(orchestrationSnapshotRecord.postureSummary);
  const latestOrchestrationStepSummary = asRecord(orchestrationSnapshotRecord.latestStepSummary);
  const planVerificationRecord = asRecord(planVerification);
  const verificationCounts = asRecord(planVerificationRecord.verificationCounts);
  const focusedPlanId =
    firstStringValue(
      orchestrationFocusRecord.planId,
      asRecord(orchestrationFocusRecord.plan).id,
      orchestrationSnapshotRecord.planId
    ) ?? "None";
  const orchestrationAction =
    firstStringValue(orchestrationFocusRecord.action, orchestrationPostureSummary.nextAction) ?? "inspect";
  const orchestrationWaitingOn =
    firstStringValue(orchestrationPostureSummary.waitingOn, orchestrationFocusRecord.waitingOn) ?? "none";
  const orchestrationReconciliation =
    firstStringValue(latestOrchestrationStepSummary.reconciliationStatus) ?? "unknown";
  const verifiedStepCount = String(verificationCounts.verifiedCount ?? 0);

  useEffect(() => {
    const messageStack = messageStackRef.current;
    if (!messageStack) {
      return;
    }
    const nextThreadId = selectedThread?.threadId ?? null;
    const threadChanged = previousThreadIdRef.current !== nextThreadId;
    previousThreadIdRef.current = nextThreadId;
    if (!threadChanged && !shouldAutoScrollRef.current) {
      return;
    }
    messageStack.scrollTop = messageStack.scrollHeight;
    shouldAutoScrollRef.current = true;
  }, [
    selectedThread?.threadId,
    displayedConversationMessages.length,
    conversationStream?.content,
    conversationStream?.turnId,
    isSendingConversation
  ]);

  const handleMessageStackScroll = (): void => {
    const messageStack = messageStackRef.current;
    if (!messageStack) {
      return;
    }
    const remainingScroll = messageStack.scrollHeight - messageStack.scrollTop - messageStack.clientHeight;
    shouldAutoScrollRef.current = remainingScroll <= 48;
  };

  useEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) {
      return;
    }
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
    const frameHeight = paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = lineHeight * 5 + frameHeight;
    const maxHeight = lineHeight * 15 + frameHeight;

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [conversationDraft, selectedThread?.threadId]);

  useEffect(() => {
    if (!pendingConversationComposerFocusThreadId || selectedThread?.threadId !== pendingConversationComposerFocusThreadId) {
      return;
    }
    const textarea = composerTextareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus();
    const valueLength = textarea.value.length;
    textarea.setSelectionRange(valueLength, valueLength);
    clearPendingConversationComposerFocusThreadId();
  }, [
    clearPendingConversationComposerFocusThreadId,
    pendingConversationComposerFocusThreadId,
    selectedThread?.threadId
  ]);

  return (
    <div className="conversation-workspace-body conversation-context-panel">
      <section className="inspector-card conversation-thread-panel conversation-thread-transcript-panel">
        {selectedThread ? (
          displayedConversationMessages.length > 0 ? (
            <>
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">Orchestration</p>
                  <strong>{focusedPlanId}</strong>
                  <p>
                    {firstStringValue(
                      orchestrationWaitingOn,
                      orchestrationAction,
                      latestOrchestrationStepSummary.resultSummary
                    ) ?? "No orchestration posture is currently attached to this thread context."}
                  </p>
                </div>
                <Badge tone="steady">{verifiedStepCount} verified</Badge>
              </div>
              <div className="approval-facts">
                <DetailRow label="Action" value={orchestrationAction} />
                <DetailRow label="Waiting On" value={orchestrationWaitingOn} />
                <DetailRow label="Reconciliation" value={orchestrationReconciliation} />
              </div>
              <div className="message-stack" onScroll={handleMessageStackScroll} ref={messageStackRef}>
                {displayedConversationMessages.map((message) => (
                  <MessageBubble
                    key={message.messageId}
                    isSelected={selectedConversationMessage?.messageId === message.messageId}
                    message={message}
                    onSelect={() => setSelectedConversationMessageId(message.messageId)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state conversation-inline-empty">
              <p className="eyebrow">{selectedThread.title}</p>
              <h3>This session exists, but it does not have a retained transcript yet.</h3>
            </div>
          )
        ) : (
          <div className="empty-state conversation-inline-empty">
            <p className="eyebrow">No Thread Selected</p>
            <h3>Select a conversation thread to continue here.</h3>
          </div>
        )}
      </section>

      <section className="inspector-card conversation-thread-panel conversation-composer-panel conversation-composer-dock">
        {selectedThread ? (
          <>
            {conversationSendError ? (
              <div className="conversation-composer-error" role="alert">
                {conversationSendError}
              </div>
            ) : null}
            <input
              accept="*/*"
              className="conversation-attachment-input"
              multiple
              onChange={(event) => {
                void onConversationAttachmentSelection(event.target.files);
                event.target.value = "";
              }}
              ref={composerAttachmentInputRef}
              type="file"
            />
            <textarea
              className="runtime-editor conversation-draft-editor"
              ref={composerTextareaRef}
              onChange={(event) => setConversationDraft(event.target.value)}
              rows={5}
              value={conversationDraft}
            />
            {conversationAttachments.length > 0 ? (
              <div className="conversation-composer-attachment-list">
                {conversationAttachments.map((attachment) => (
                  <div className="conversation-composer-attachment-chip" key={attachment.attachmentId}>
                    <div className="conversation-composer-attachment-chip-copy">
                      <strong>{attachment.name}</strong>
                      <span>{attachment.summary}</span>
                    </div>
                    <div className="conversation-composer-attachment-chip-actions">
                      <Badge tone="steady">{attachment.kind}</Badge>
                      <button
                        aria-label={`Remove ${attachment.name}`}
                        className="conversation-composer-attachment-remove"
                        onClick={() => removeConversationAttachment(attachment.attachmentId)}
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="conversation-composer-actions">
              <button
                className="action-button action-button-secondary conversation-attachment-button"
                onClick={() => composerAttachmentInputRef.current?.click()}
                type="button"
              >
                Add files
              </button>
              <button
                aria-label={isSendingConversation ? "Sending message" : "Send message"}
                className="action-button conversation-send-button"
                disabled={
                  isSendingConversation ||
                  (conversationDraft.trim().length === 0 && conversationAttachments.length === 0)
                }
                onClick={() => void sendConversationMessage()}
                title={isSendingConversation ? "Sending..." : "Send message"}
                type="button"
              >
                <span aria-hidden="true">{isSendingConversation ? "…" : "↵"}</span>
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state conversation-inline-empty">
            <p className="eyebrow">Conversation Input</p>
            <h3>The composer becomes active when a conversation thread is selected.</h3>
          </div>
        )}
      </section>
    </div>
  );
}
