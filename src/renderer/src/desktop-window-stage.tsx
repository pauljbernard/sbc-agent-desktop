import { useEffect, useRef, type DragEvent as ReactDragEvent, type ReactNode, type Ref } from "react";
import type {
  ApprovalRequestSummaryDto,
  CalculatorResultDto,
  CommandResultDto,
  DesktopPanelStateDto,
  IncidentSummaryDto,
  QueryResultDto,
  ReplSessionProfileDto,
  RuntimeEntityDetailDto,
  RuntimeEvalResultDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import type { HostedAppId } from "./workspace-shell";
import { BrowserWorkspace } from "./browser-workspace";
import { CalculatorSurface } from "./calculator-surface";
import { ConfigurationWorkspace } from "./configuration-workspace";
import { ConversationsWorkspace } from "./conversations-workspace";
import { EditorSurface } from "./editor-surface";
import { EvidenceWorkspace } from "./evidence-workspace";
import { ExecutionWorkspace } from "./execution-workspace";
import { IncidentsWorkspace, WorkWorkspace } from "./journey-workspaces";
import { ContextBlock } from "./journey-support";
import { MemoryWorkspace } from "./memory-workspace";
import { OperateWorkspace } from "./operate-workspace";
import { ProjectsWorkspace } from "./projects-workspace";
import type { BrowserSurfaceEntry } from "./browser-support";
import type { ActionQueueItem, GlobalAttentionItem } from "./shell-attention";
import type { ShellDockPanelId } from "./shell-layout";
import { SHELL_DOCK_PANEL_DEFINITIONS } from "./shell-layout";
import type { ExecutionSection } from "./shell-workspace-state";
import {
  type DesktopWindowMoveDirection,
  type DesktopWindowRecord,
  type DesktopWindowSizePreset
} from "./desktop-windowing";
import { ActorSystemPanel } from "./workspace-support-components";
import { TranscriptSurface } from "./transcript-surface";
type DesktopWindowResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface DesktopAttentionSignal {
  id: string;
  label: string;
  tooltip: string;
  glyphClassName: string;
  priority: "red" | "yellow" | "green";
  onOpen: () => void;
}

function shellDockPanelIdFromUndockedWindowId(windowId: string): ShellDockPanelId | null {
  const prefix = "window:undocked:";
  if (!windowId.startsWith(prefix)) {
    return null;
  }
  const panelId = windowId.slice(prefix.length);
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

function readDraggedShellPanelId(dataTransfer: DataTransfer | null): ShellDockPanelId | null {
  const mime = "application/x-sbcl-agent-shell-panel";
  const panelId = dataTransfer?.getData(mime) ?? "";
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

function desktopWindowRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstDesktopWindowString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function DesktopWindowStage({
  className,
  activeDesktopId,
  approvalRequests,
  orchestrationInbox,
  windows,
  focusedWindowId,
  attentionItems,
  createReplSession,
  actionQueue,
  currentProjectReplFocus,
  currentFocusSummary,
  currentFocusTitle,
  desktopDescriptors,
  desktopZoom,
  displayCount,
  displayPanel,
  inspectorPanel,
  topDisplaySurface,
  activeHostedAppId,
  activeHostedAppLabel,
  activeHostedAppSummary,
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
  browserSurfaceTitle,
  browserSurfaceSummary,
  browserSurfaceEntries,
  currentProjectTitle,
  environmentId,
  bindingId,
  centerAttentionSignals,
  hostState,
  runtimeState,
  workflowState,
  shellCurrentSurfaceSummary,
  leadAttention,
  governedAttentionSignalCount,
  replSessions,
  currentReplSessionId,
  switchReplSession,
  runtimeSummary,
  runtimeForm,
  runtimeRecoveryLaunch,
  setRuntimeForm,
  evaluateRuntimeForm,
  incidents,
  isEvaluating,
  isInspectingRuntime,
  isDecidingApproval,
  runtimeInspectionMode,
  setRuntimeInspectionMode,
  runtimeInspectorSymbol,
  setRuntimeInspectorSymbol,
  inspectRuntimeSymbol,
  runtimeInspection,
  runtimeEntityDetail,
  runtimeResult,
  onResetLayout,
  onCascadeLayout,
  onTileLayout,
  onCreateDesktop,
  onFocusWindow,
  onMinimizeWindow,
  onMoveWindowToPreviousDesktop,
  onMoveWindowToNextDesktop,
  onRestoreWindow,
  onMoveWindow,
  onPositionWindow,
  onResizeWindow,
  onResizeWindowToDimensions,
  onSetWindowFrame,
  onCloseWindow,
  onOpenAttentionItem,
  onOpenActionQueueItem,
  onOpenDisplaySurface,
  onOpenInspectorSurface,
  onOpenBrowserSurfaceWindow,
  onOpenShellContextWindow,
  onOpenProactivityWindow,
  onOpenDetailedSurfaceWindow,
  onOpenRuntimeWindow,
  onOpenWorkflowWindow,
  onOpenIncident,
  onSubmitApprovalDecision,
  onSwitchDesktop,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenDetailedWorkspace,
  undockedPanelContentById,
  undockDropTargetActive,
  undockDropTargetRef,
  onDropUndockedPanel,
  onDockUndockedPanelLeft,
  onDockUndockedPanelRight,
  replSessionTitleDraft,
  setReplSessionTitleDraft,
  runtimeInspectorPackage,
  setRuntimeInspectorPackage,
  calculatorDraftExpression,
  calculatorRefreshToken,
  pendingCalculatorExpressionRequest,
  clearPendingCalculatorExpressionRequest,
  insertCalculatorResultIntoConversationDraft,
  openConversationDraft,
  recordCalculatorEvaluation
}: {
  className?: string;
  activeDesktopId: string;
  approvalRequests: ApprovalRequestSummaryDto[];
  orchestrationInbox: Record<string, unknown>[];
  windows: DesktopWindowRecord[];
  focusedWindowId: string;
  attentionItems: GlobalAttentionItem[];
  createReplSession: () => Promise<void>;
  actionQueue: ActionQueueItem[];
  currentProjectReplFocus: ReplSessionProfileDto | null;
  currentFocusSummary: string;
  currentFocusTitle: string;
  desktopDescriptors: Array<{ id: string; label: string; active: boolean }>;
  desktopZoom: number;
  displayCount: number;
  displayPanel: DesktopPanelStateDto | null;
  inspectorPanel: DesktopPanelStateDto | null;
  topDisplaySurface: Record<string, unknown> | null;
  activeHostedAppId: HostedAppId;
  activeHostedAppLabel: string;
  activeHostedAppSummary: string;
  browserWorkspaceProps: React.ComponentProps<typeof BrowserWorkspace>;
  projectsWorkspaceProps: React.ComponentProps<typeof ProjectsWorkspace>;
  operateWorkspaceProps: React.ComponentProps<typeof OperateWorkspace>;
  executionWorkspaceProps: React.ComponentProps<typeof ExecutionWorkspace>;
  incidentsWorkspaceProps: React.ComponentProps<typeof IncidentsWorkspace>;
  workWorkspaceProps: React.ComponentProps<typeof WorkWorkspace>;
  evidenceWorkspaceProps: React.ComponentProps<typeof EvidenceWorkspace>;
  conversationsWorkspaceProps: React.ComponentProps<typeof ConversationsWorkspace>;
  configurationWorkspaceProps: React.ComponentProps<typeof ConfigurationWorkspace>;
  editorSurfaceProps: React.ComponentProps<typeof EditorSurface>;
  transcriptSurfaceProps: React.ComponentProps<typeof TranscriptSurface>;
  memoryWorkspaceProps: React.ComponentProps<typeof MemoryWorkspace>;
  activeWorkspace: WorkspaceId;
  selectedExecutionSection: ExecutionSection;
  browserSurfaceTitle: string;
  browserSurfaceSummary: string;
  browserSurfaceEntries: BrowserSurfaceEntry[];
  currentProjectTitle: string;
  environmentId: string | null;
  bindingId: string;
  centerAttentionSignals: DesktopAttentionSignal[];
  hostState: string;
  runtimeState: string;
  workflowState: string;
  shellCurrentSurfaceSummary: {
    panelLabel: string;
    summary: string;
  };
  leadAttention: GlobalAttentionItem | null;
  governedAttentionSignalCount: number;
  replSessions: ReplSessionProfileDto[];
  currentReplSessionId: string | null;
  switchReplSession: (sessionId: string) => Promise<void>;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeForm: string;
  runtimeRecoveryLaunch: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
  setRuntimeForm: (value: string) => void;
  evaluateRuntimeForm: () => Promise<void>;
  incidents: IncidentSummaryDto[];
  isEvaluating: boolean;
  isInspectingRuntime: boolean;
  isDecidingApproval: boolean;
  runtimeInspectionMode: RuntimeInspectionMode;
  setRuntimeInspectionMode: (mode: RuntimeInspectionMode) => void;
  runtimeInspectorSymbol: string;
  setRuntimeInspectorSymbol: (value: string) => void;
  inspectRuntimeSymbol: () => Promise<void>;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeResult: CommandResultDto<RuntimeEvalResultDto> | null;
  onResetLayout: () => void;
  onCascadeLayout: () => void;
  onTileLayout: () => void;
  onCreateDesktop: () => void;
  onFocusWindow: (window: DesktopWindowRecord) => void;
  onMinimizeWindow: (windowId: string) => void;
  onMoveWindowToPreviousDesktop: (windowId: string) => void;
  onMoveWindowToNextDesktop: (windowId: string) => void;
  onRestoreWindow: (windowId: string) => void;
  onMoveWindow: (windowId: string, direction: DesktopWindowMoveDirection) => void;
  onPositionWindow: (windowId: string, x: number, y: number) => void;
  onResizeWindow: (windowId: string, preset: DesktopWindowSizePreset) => void;
  onResizeWindowToDimensions: (windowId: string, width: number, height: number) => void;
  onSetWindowFrame: (windowId: string, x: number, y: number, width: number, height: number) => void;
  onCloseWindow: (windowId: string) => void;
  onOpenAttentionItem: (item: GlobalAttentionItem) => void;
  onOpenActionQueueItem: (item: ActionQueueItem) => void;
  onOpenDisplaySurface: () => void;
  onOpenInspectorSurface: () => void;
  onOpenBrowserSurfaceWindow: () => void;
  onOpenShellContextWindow: () => void;
  onOpenProactivityWindow: () => void;
  onOpenDetailedSurfaceWindow: () => void;
  onOpenRuntimeWindow: () => void;
  onOpenWorkflowWindow: () => void;
  onOpenIncident: (incidentId: string) => void;
  onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => void;
  onSwitchDesktop: (desktopId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenDetailedWorkspace: () => void;
  undockedPanelContentById: Partial<Record<ShellDockPanelId, ReactNode>>;
  undockDropTargetActive: boolean;
  undockDropTargetRef: Ref<HTMLDivElement>;
  onDropUndockedPanel: (panelId: ShellDockPanelId) => void;
  onDockUndockedPanelLeft: (panelId: ShellDockPanelId) => void;
  onDockUndockedPanelRight: (panelId: ShellDockPanelId) => void;
  replSessionTitleDraft: string;
  setReplSessionTitleDraft: (value: string) => void;
  runtimeInspectorPackage: string;
  setRuntimeInspectorPackage: (value: string) => void;
  calculatorDraftExpression: string;
  calculatorRefreshToken: string;
  pendingCalculatorExpressionRequest: {
    expression: string;
    shouldEvaluate: boolean;
    token: number;
  } | null;
  clearPendingCalculatorExpressionRequest: () => void;
  insertCalculatorResultIntoConversationDraft: (input: {
    expression: string;
    result: CalculatorResultDto;
  }) => Promise<void>;
  openConversationDraft: () => Promise<void>;
  recordCalculatorEvaluation: (input: { expression: string; result: CalculatorResultDto }) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const windowCardRefs = useRef(new Map<string, HTMLDivElement>());
  const windowBodyRefs = useRef(new Map<string, HTMLDivElement>());
  const windowFitAttemptsRef = useRef<Record<string, number>>({});
  const dragSessionRef = useRef<{
    pointerId: number;
    windowId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const resizeSessionRef = useRef<{
    pointerId: number;
    windowId: string;
    edge: DesktopWindowResizeEdge;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const visibleWindows = windows
    .filter((window) => window.state === "open")
    .sort((left, right) => left.zIndex - right.zIndex);
  const minimizedWindows = windows.filter((window) => window.state === "minimized");
  const desktopUnitScale = 10 * desktopZoom;
  const extentWindows = visibleWindows.length > 0 ? visibleWindows : windows;
  const desktopExtentWidth = Math.max(104, ...extentWindows.map((window) => window.x + window.width + 8));
  const desktopExtentHeight = Math.max(84, ...extentWindows.map((window) => window.y + window.height + 8));
  const desktopSurfaceWidth = desktopExtentWidth * desktopUnitScale;
  const desktopSurfaceHeight = desktopExtentHeight * desktopUnitScale;
  const dominantAttentionItems = attentionItems.filter((item) => item.value > 0).slice(0, 3);
  const stagedControlActions = actionQueue.slice(0, 2);
  const residentQueueItems = actionQueue.slice(0, 4);
  const residentApprovals = orchestrationInbox
    .map((entry) => desktopWindowRecord(entry))
    .filter((entry) => firstDesktopWindowString(entry.action) === "grant-approval")
    .slice(0, 2);
  const residentIncidents = incidents.filter((item) => item.state !== "resolved").slice(0, 2);
  const hostNeedsAttention = hostState !== "ready";
  const runtimeNeedsAttention = runtimeState === "recovering";
  const workflowNeedsAttention = workflowState === "attention_required";
  const activeReplSession = replSessions.find((session) => session.sessionId === currentReplSessionId) ?? replSessions[0] ?? null;
  const currentRuntimeSummary = runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? "The live image is ready for governed runtime work.";
  const recentHistory = currentProjectReplFocus?.history?.slice(0, 2) ?? [];
  const topDisplaySurfaceTitle =
    typeof topDisplaySurface?.title === "string"
      ? topDisplaySurface.title
      : typeof topDisplaySurface?.label === "string"
        ? topDisplaySurface.label
        : typeof topDisplaySurface?.name === "string"
          ? topDisplaySurface.name
          : "No display surface summary is currently available.";
  const runtimePreview =
    runtimeResult?.data.valuePreview ??
    runtimeEntityDetail?.data.signature ??
    runtimeInspection?.data.summary ??
    "Evaluate a form or inspect a symbol to keep live runtime output visible in the resident window.";
  const handleUndockStageDragOver = (event: ReactDragEvent<HTMLDivElement>): void => {
    if (!readDraggedShellPanelId(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
  };
  const handleUndockStageDrop = (event: ReactDragEvent<HTMLDivElement>): void => {
    const panelId = readDraggedShellPanelId(event.dataTransfer);
    if (!panelId) {
      return;
    }
    event.preventDefault();
    onDropUndockedPanel(panelId);
  };

  function desktopChipGlyph(index: number): string {
    return String(index + 1);
  }

  function dockGlyphClassForWindow(window: DesktopWindowRecord): string {
    const undockedPanelId = shellDockPanelIdFromUndockedWindowId(window.id);
    if (undockedPanelId === "shell-navigation" || undockedPanelId === "shell-utilities") {
      return "desktop-window-dock-glyph-shell";
    }
    if (undockedPanelId === "conversation-context") {
      return "desktop-window-dock-glyph-conversations";
    }
    if (undockedPanelId === "workspace-inspector") {
      return "desktop-window-dock-glyph-inspector";
    }
    if (undockedPanelId === "editor-symbol") {
      return "desktop-window-dock-glyph-editor";
    }
    if (window.id === "window:control-panel") {
      return "desktop-window-dock-glyph-control-panel";
    }
    if (window.id === "window:listener-workbench") {
      return "desktop-window-dock-glyph-listener";
    }
    if (window.id === "window:inspector") {
      return "desktop-window-dock-glyph-inspector";
    }
    if (window.id === "window:display") {
      return "desktop-window-dock-glyph-display";
    }
    if (window.id === "window:shell-context") {
      return "desktop-window-dock-glyph-shell";
    }
    if (window.id === "window:detailed-surface") {
      return "desktop-window-dock-glyph-detail";
    }
    if (window.id === "window:browser-surface") {
      return "desktop-window-dock-glyph-browser";
    }
    if (window.id === "window:actor-system-surface") {
      return "desktop-window-dock-glyph-operate";
    }
    if (window.id === "window:projects-surface") {
      return "desktop-window-dock-glyph-workspace";
    }
    if (window.id === "window:editor-surface") {
      return "desktop-window-dock-glyph-editor";
    }
    if (window.id === "window:workspace-surface") {
      return "desktop-window-dock-glyph-workspace";
    }
    if (window.id === "window:transcript-surface") {
      return "desktop-window-dock-glyph-transcript";
    }
    if (window.id === "window:memory-surface") {
      return "desktop-window-dock-glyph-workspace";
    }
    if (window.id === "window:operate-surface") {
      return "desktop-window-dock-glyph-operate";
    }
    if (window.id === "window:conversations-surface") {
      return "desktop-window-dock-glyph-conversations";
    }
    if (window.id === "window:configuration-surface") {
      return "desktop-window-dock-glyph-configuration";
    }
    return "desktop-window-dock-glyph-generic";
  }

  function shouldShowWindowSummary(window: DesktopWindowRecord): boolean {
    if (shellDockPanelIdFromUndockedWindowId(window.id)) {
      return false;
    }
    if (
      window.id === "window:conversations-surface" ||
      window.id === "window:editor-surface" ||
      window.id === "window:transcript-surface" ||
      window.id === "window:memory-surface" ||
      window.id === "window:calculator"
    ) {
      return false;
    }
    return window.summary.trim().length > 0;
  }

  function renderOperateSurfaceContent(): React.ReactNode {
    if (activeWorkspace === "runtime") {
      if (selectedExecutionSection === "work") {
        return <WorkWorkspace {...workWorkspaceProps} />;
      }
      return <ExecutionWorkspace {...executionWorkspaceProps} />;
    }

    if (activeWorkspace === "incidents") {
      return <IncidentsWorkspace {...incidentsWorkspaceProps} />;
    }

    if (activeWorkspace === "artifacts") {
      return <EvidenceWorkspace {...evidenceWorkspaceProps} />;
    }

    return <OperateWorkspace {...operateWorkspaceProps} />;
  }

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      const session = dragSessionRef.current;
      if (session && event.pointerId === session.pointerId) {
        const deltaX = (event.clientX - session.startClientX) / desktopUnitScale;
        const deltaY = (event.clientY - session.startClientY) / desktopUnitScale;
        onPositionWindow(session.windowId, session.startX + deltaX, session.startY + deltaY);
      }
      const resizeSession = resizeSessionRef.current;
      if (resizeSession && event.pointerId === resizeSession.pointerId) {
        const deltaX = (event.clientX - resizeSession.startClientX) / desktopUnitScale;
        const deltaY = (event.clientY - resizeSession.startClientY) / desktopUnitScale;
        const nextX =
          resizeSession.edge.includes("w")
            ? resizeSession.startX + deltaX
            : resizeSession.startX;
        const nextY =
          resizeSession.edge.includes("n")
            ? resizeSession.startY + deltaY
            : resizeSession.startY;
        const nextWidth =
          resizeSession.edge.includes("w")
            ? resizeSession.startWidth - deltaX
            : resizeSession.edge.includes("e")
              ? resizeSession.startWidth + deltaX
              : resizeSession.startWidth;
        const nextHeight =
          resizeSession.edge.includes("n")
            ? resizeSession.startHeight - deltaY
            : resizeSession.edge.includes("s")
              ? resizeSession.startHeight + deltaY
              : resizeSession.startHeight;
        onSetWindowFrame(resizeSession.windowId, nextX, nextY, nextWidth, nextHeight);
      }
    }

    function handlePointerUp(event: PointerEvent): void {
      if (dragSessionRef.current?.pointerId === event.pointerId) {
        dragSessionRef.current = null;
      }
      if (resizeSessionRef.current?.pointerId === event.pointerId) {
        resizeSessionRef.current = null;
      }
      if (!dragSessionRef.current && !resizeSessionRef.current) {
        document.body.classList.remove("desktop-window-dragging");
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [desktopUnitScale, onPositionWindow, onSetWindowFrame]);

  useEffect(() => {
    const rafHandle = window.requestAnimationFrame(() => {
      visibleWindows.forEach((desktopWindow) => {
        const attempts = windowFitAttemptsRef.current[desktopWindow.id] ?? 0;
        if (attempts >= 3) {
          return;
        }

        const card = windowCardRefs.current.get(desktopWindow.id);
        const body = windowBodyRefs.current.get(desktopWindow.id);
        if (!card || !body) {
          return;
        }

        const verticalOverflow = Math.max(0, body.scrollHeight - body.clientHeight);
        const horizontalOverflow = Math.max(0, body.scrollWidth - body.clientWidth);

        if (verticalOverflow <= 2 && horizontalOverflow <= 2) {
          windowFitAttemptsRef.current[desktopWindow.id] = 3;
          return;
        }

        const widthGrowth = horizontalOverflow > 2 ? Math.ceil(horizontalOverflow / desktopUnitScale) + 4 : 0;
        const heightGrowth = verticalOverflow > 2 ? Math.ceil(verticalOverflow / desktopUnitScale) + 4 : 0;

        if (widthGrowth <= 0 && heightGrowth <= 0) {
          windowFitAttemptsRef.current[desktopWindow.id] = 3;
          return;
        }

        windowFitAttemptsRef.current[desktopWindow.id] = attempts + 1;
        onSetWindowFrame(
          desktopWindow.id,
          desktopWindow.x,
          desktopWindow.y,
          desktopWindow.width + widthGrowth,
          desktopWindow.height + heightGrowth
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(rafHandle);
    };
  }, [desktopUnitScale, onSetWindowFrame, visibleWindows]);

  function startWindowDrag(event: React.PointerEvent<HTMLDivElement>, window: DesktopWindowRecord): void {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return;
    }

    dragSessionRef.current = {
      pointerId: event.pointerId,
      windowId: window.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: window.x,
      startY: window.y,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("desktop-window-dragging");
    onFocusWindow(window);
    event.preventDefault();
    event.stopPropagation();
  }

  function startWindowResize(
    event: React.PointerEvent<HTMLButtonElement>,
    window: DesktopWindowRecord,
    edge: DesktopWindowResizeEdge
  ): void {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return;
    }

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      windowId: window.id,
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: window.x,
      startY: window.y,
      startWidth: window.width,
      startHeight: window.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("desktop-window-dragging");
    onFocusWindow(window);
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section className={className ?? "panel desktop-window-stage"}>
      <div className="desktop-window-toolbar">
        <div className="desktop-window-desktops">
          {desktopDescriptors.map((desktop, index) => (
            <button
              className={desktop.active ? "desktop-window-desktop-chip active" : "desktop-window-desktop-chip"}
              key={desktop.id}
              onClick={() => onSwitchDesktop(desktop.id)}
              title={desktop.label}
              aria-label={`Switch to ${desktop.label}`}
              type="button"
            >
              {desktopChipGlyph(index)}
            </button>
          ))}
          <button
            className="desktop-window-desktop-chip desktop-window-desktop-chip-icon"
            onClick={onCreateDesktop}
            title="Create Desktop"
            aria-label="Create desktop"
            type="button"
          >
            +
          </button>
        </div>
        <div className="desktop-window-notifications">
          {centerAttentionSignals.map((signal) => (
            <button
              className={`desktop-window-notification desktop-window-notification-signal desktop-window-notification-signal-${signal.priority}`}
              data-tooltip={signal.tooltip}
              key={signal.id}
              onClick={signal.onOpen}
              title={signal.tooltip}
              type="button"
            >
              <span aria-hidden="true" className={`desktop-window-notification-glyph ${signal.glyphClassName}`} />
            </button>
          ))}
          <button
            className="desktop-window-notification"
            data-tooltip={`Open shell context for ${shellCurrentSurfaceSummary.panelLabel}. Project ${currentProjectTitle}. Binding ${bindingId}.`}
            onClick={onOpenShellContextWindow}
            title={`Open shell context for ${shellCurrentSurfaceSummary.panelLabel}. Project ${currentProjectTitle}. Binding ${bindingId}.`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-shell" />
          </button>
          <button
            className={governedAttentionSignalCount > 0 || leadAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={
              leadAttention
                ? `Open governed attention: ${leadAttention.label}${governedAttentionSignalCount > 0 ? ` (${governedAttentionSignalCount} active)` : ""}`
                : governedAttentionSignalCount > 0
                  ? `Open governed attention (${governedAttentionSignalCount} active)`
                  : "Open governed attention in Actions"
            }
            onClick={onOpenProactivityWindow}
            title={
              leadAttention
                ? `Open governed attention: ${leadAttention.label}${governedAttentionSignalCount > 0 ? ` (${governedAttentionSignalCount} active)` : ""}`
                : governedAttentionSignalCount > 0
                  ? `Open governed attention (${governedAttentionSignalCount} active)`
                  : "Open governed attention in Actions"
            }
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-proactivity" />
            {governedAttentionSignalCount > 0 ? (
              <span className="desktop-window-notification-dot" aria-hidden="true" />
            ) : null}
          </button>
          <button
            className="desktop-window-notification"
            data-tooltip={`Open detailed surface for ${activeHostedAppLabel}`}
            onClick={onOpenDetailedSurfaceWindow}
            title={`Open detailed surface for ${activeHostedAppLabel}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-detail" />
          </button>
          <button
            className={hostNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Host state: ${hostState}`}
            onClick={onOpenShellContextWindow}
            title={`Host state: ${hostState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-host" />
          </button>
          <button
            className={runtimeNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Runtime state: ${runtimeState}`}
            onClick={onOpenRuntimeWindow}
            title={`Runtime state: ${runtimeState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-runtime" />
          </button>
          <button
            className={workflowNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Workflow state: ${workflowState}`}
            onClick={onOpenWorkflowWindow}
            title={`Workflow state: ${workflowState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-workflow" />
          </button>
        </div>
        <div className="desktop-window-layout-actions">
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onResetLayout}
            title="Reset Layout"
            aria-label="Reset desktop layout"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-reset" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onCascadeLayout}
            title="Cascade"
            aria-label="Cascade resident windows"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-cascade" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onTileLayout}
            title="Tile"
            aria-label="Tile resident windows"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-tile" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomOut}
            title="Zoom Out"
            aria-label="Zoom out desktop surface"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-out" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomReset}
            title="Reset Zoom"
            aria-label="Reset desktop zoom to 100 percent"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-reset" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomIn}
            title="Zoom In"
            aria-label="Zoom in desktop surface"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-in" />
          </button>
        </div>
      </div>
      <div
        aria-label="Desktop window registry"
        className={`desktop-window-canvas-scroll${undockDropTargetActive ? " desktop-window-canvas-scroll-drop-target" : ""}`}
        onDragOver={handleUndockStageDragOver}
        onDrop={handleUndockStageDrop}
        ref={undockDropTargetRef}
      >
      <div
        className="desktop-window-canvas"
        ref={canvasRef}
        style={{ width: `${desktopSurfaceWidth}px`, minHeight: `${desktopSurfaceHeight}px`, height: `${desktopSurfaceHeight}px` }}
      >
        {visibleWindows.map((window) => (
          <div
            className={window.id === focusedWindowId ? "desktop-window-card focused" : "desktop-window-card"}
            key={window.id}
            onClick={() => onFocusWindow(window)}
            ref={(node) => {
              if (node) {
                windowCardRefs.current.set(window.id, node);
              } else {
                windowCardRefs.current.delete(window.id);
              }
            }}
            style={{
              left: `${window.x * desktopUnitScale}px`,
              top: `${window.y * desktopUnitScale}px`,
              width: `${window.width * desktopUnitScale}px`,
              height: `${window.height * desktopUnitScale}px`,
              zIndex: window.zIndex
            }}
          >
            <div className="desktop-window-titlebar" onPointerDown={(event) => startWindowDrag(event, window)}>
              <div className="desktop-window-drag-handle">
                <strong>{window.title}</strong>
              </div>
              <div className="desktop-window-actions" onPointerDown={(event) => event.stopPropagation()}>
                {shellDockPanelIdFromUndockedWindowId(window.id) ? (
                  <>
                    <button
                      className="desktop-window-action desktop-window-action-icon"
                      aria-label={`Dock ${window.title} to left rail`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
                        if (!panelId) {
                          return;
                        }
                        onDockUndockedPanelLeft(panelId);
                      }}
                      title="Dock Left"
                      type="button"
                    >
                      ⇤
                    </button>
                    <button
                      className="desktop-window-action desktop-window-action-icon"
                      aria-label={`Dock ${window.title} to right rail`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
                        if (!panelId) {
                          return;
                        }
                        onDockUndockedPanelRight(panelId);
                      }}
                      title="Dock Right"
                      type="button"
                    >
                      ⇥
                    </button>
                  </>
                ) : null}
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} left`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "left");
                  }}
                  title="Move Left"
                  type="button"
                >
                  ←
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} up`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "up");
                  }}
                  title="Move Up"
                  type="button"
                >
                  ↑
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} down`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "down");
                  }}
                  title="Move Down"
                  type="button"
                >
                  ↓
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} right`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "right");
                  }}
                  title="Move Right"
                  type="button"
                >
                  →
                </button>
                <button
                  aria-label={`Move ${window.title} to the previous desktop`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindowToPreviousDesktop(window.id);
                  }}
                  title="Move To Previous Desktop"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-send-reverse" />
                </button>
                <button
                  aria-label={`Move ${window.title} to the next desktop`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindowToNextDesktop(window.id);
                  }}
                  title="Move To Next Desktop"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-send" />
                </button>
                <button
                  aria-label={`Set ${window.title} to compact size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "compact");
                  }}
                  title="Compact"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-compact" />
                </button>
                <button
                  aria-label={`Set ${window.title} to standard size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "standard");
                  }}
                  title="Standard"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-standard" />
                </button>
                <button
                  aria-label={`Set ${window.title} to expanded size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "expanded");
                  }}
                  title="Expand"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-expanded" />
                </button>
                <button
                  aria-label={`Minimize ${window.title}`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMinimizeWindow(window.id);
                  }}
                  title="Minimize"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-minimize" />
                </button>
                {window.closable ? (
                  <button
                    className="desktop-window-action desktop-window-action-icon"
                    aria-label={`Close ${window.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseWindow(window.id);
                    }}
                    title="Close"
                    type="button"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className={
                window.id === "window:editor-surface" || window.id === "window:actor-system-surface"
                  ? "desktop-window-body desktop-window-body-editor"
                  : "desktop-window-body"
              }
              ref={(node) => {
                if (node) {
                  windowBodyRefs.current.set(window.id, node);
                } else {
                  windowBodyRefs.current.delete(window.id);
                }
              }}
            >
              {shouldShowWindowSummary(window) ? <p>{window.summary}</p> : null}
              {(() => {
                const undockedPanelId = shellDockPanelIdFromUndockedWindowId(window.id);
                if (!undockedPanelId) {
                  return null;
                }
                return (
                  <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                    {undockedPanelContentById[undockedPanelId] ?? null}
                  </div>
                );
              })()}
              {window.id === "window:control-panel" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Dominant Attention</p>
                      {dominantAttentionItems.length > 0 ? (
                        dominantAttentionItems.map((item) => (
                          <button
                            className="desktop-window-control-item"
                            key={item.id}
                            onClick={() => onOpenAttentionItem(item)}
                            type="button"
                          >
                            <strong>{item.label}</strong>
                            <span>{item.summary}</span>
                            <em>{item.value} active</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">The environment is calm and no dominant governed attention object is active.</p>
                      )}
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Staged Continuations</p>
                      {stagedControlActions.length > 0 ? (
                        stagedControlActions.map((item) => (
                          <button
                            className="desktop-window-control-item"
                            key={item.key}
                            onClick={() => onOpenActionQueueItem(item)}
                            type="button"
                          >
                            <strong>{item.title}</strong>
                            <span>{item.effectSummary}</span>
                            <em>{item.actionLabel}</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">No staged continuations currently outrank the rest of the desktop field.</p>
                      )}
                    </div>
                  </div>
                  <div className="desktop-window-control-queue">
                    <p className="context-label">Governed Queue</p>
                    {residentQueueItems.length > 0 ? (
                      residentQueueItems.map((item) => (
                        <button
                          className="desktop-window-control-queue-item"
                          key={item.key}
                          onClick={() => onOpenActionQueueItem(item)}
                          type="button"
                        >
                          <div className="desktop-window-control-queue-top">
                            <strong>{item.title}</strong>
                            <span>{item.objectType}</span>
                          </div>
                          <p>{item.whyNow}</p>
                          <em>{item.actionLabel}</em>
                        </button>
                      ))
                    ) : (
                      <p className="desktop-window-workbench-summary">No governed queue items currently outrank the resident windows already in view.</p>
                    )}
                  </div>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Direct Approvals</p>
                      {residentApprovals.length > 0 ? (
                        residentApprovals.map((approval) => {
                          const requestId = firstDesktopWindowString(approval.approvalId, approval.requestId);
                          const primaryCommandLabel = firstDesktopWindowString(approval.primaryCommandLabel) ?? "Approve";
                          const commandDescription =
                            firstDesktopWindowString(
                              approval.primaryCommandDescription,
                              approval.nextAction,
                              approval.waitingOn
                            ) ?? "Approve the governed action and continue execution.";
                          return (
                            <div
                              className="desktop-window-control-decision"
                              key={firstDesktopWindowString(approval.id, requestId) ?? "approval"}
                            >
                              <div className="desktop-window-control-queue-top">
                                <strong>{firstDesktopWindowString(approval.goal, approval.title) ?? "Governed approval"}</strong>
                                <span>{firstDesktopWindowString(approval.status, approval.urgency) ?? "awaiting"}</span>
                              </div>
                              <p>{commandDescription}</p>
                              <div className="desktop-window-control-decision-actions">
                                <button
                                  className="desktop-window-action"
                                  disabled={isDecidingApproval || !requestId}
                                  onClick={() => requestId ? onSubmitApprovalDecision(requestId, "approve") : undefined}
                                  type="button"
                                >
                                  {primaryCommandLabel}
                                </button>
                                <button
                                  className="desktop-window-action"
                                  disabled={isDecidingApproval || !requestId}
                                  onClick={() => requestId ? onSubmitApprovalDecision(requestId, "deny") : undefined}
                                  type="button"
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="desktop-window-workbench-summary">No awaiting approval is currently blocking the top resident flow.</p>
                      )}
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Direct Recovery</p>
                      {residentIncidents.length > 0 ? (
                        residentIncidents.map((incident) => (
                          <button
                            className="desktop-window-control-item"
                            key={incident.incidentId}
                            onClick={() => onOpenIncident(incident.incidentId)}
                            type="button"
                          >
                            <strong>{incident.title}</strong>
                            <span>{`Severity ${incident.severity}`}</span>
                            <em>{incident.state === "open" ? "Open Recovery" : "Continue Recovery"}</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">No open incident currently outranks the rest of the desktop field.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:display" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Focus</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{displayPanel?.selectedTitle ?? "No display surface selected"}</strong>
                          <span>{displayPanel?.selectedKind ?? "display"}</span>
                        </div>
                        <p>
                          {displayPanel?.selectedExecutionId
                            ? `Execution ${displayPanel.selectedExecutionId} is currently attached to the focused display lane.`
                            : "No display-backed governed execution is currently focused."}
                        </p>
                        <em>
                          {displayPanel?.focusObjectId
                            ? `Focus ${displayPanel.focusObjectId}`
                            : "No explicit display focus object is currently selected."}
                        </em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Estate</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{displayCount}</strong>
                          <span>{displayCount === 1 ? "resident" : "residents"}</span>
                        </div>
                        <p>{topDisplaySurfaceTitle}</p>
                        <em>{displayPanel?.resolvedVia ? `Resolved via ${displayPanel.resolvedVia}` : displayPanel?.objectKind ?? "display"}</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Route</p>
                      <button className="desktop-window-control-item" onClick={onOpenDisplaySurface} type="button">
                        <strong>Open Display Surface</strong>
                        <span>Route this utility resident into the shell display lane for deeper governed interaction.</span>
                        <em>Open Display Surface</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:shell-context" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Current Surface</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{shellCurrentSurfaceSummary.panelLabel}</strong>
                          <span>{activeHostedAppLabel}</span>
                        </div>
                        <p>{shellCurrentSurfaceSummary.summary}</p>
                          <em>Governed attention routes through the desktop shell.</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Hosted Application</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{activeHostedAppLabel}</strong>
                          <span>resident</span>
                        </div>
                        <p>{activeHostedAppSummary}</p>
                        <em>Shell resident</em>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:inspector" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Focused Object</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{currentFocusTitle}</strong>
                          <span>{inspectorPanel?.objectKind ?? "object"}</span>
                        </div>
                        <p>{currentFocusSummary}</p>
                        <em>
                          {inspectorPanel?.focusObjectId
                            ? `Focus ${inspectorPanel.focusObjectId}`
                            : "No explicit inspector object is currently selected."}
                        </em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Resident Inspection</p>
                      <div className="desktop-window-workbench-inspector">
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Package</span>
                          <input
                            className="desktop-window-workbench-symbol"
                            onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                            value={runtimeInspectorPackage}
                          />
                        </label>
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Symbol</span>
                          <input
                            className="desktop-window-workbench-symbol"
                            onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                            value={runtimeInspectorSymbol}
                          />
                        </label>
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Mode</span>
                          <select
                            className="desktop-window-workbench-select"
                            onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                            value={runtimeInspectionMode}
                          >
                            <option value="describe">describe</option>
                            <option value="documentation">documentation</option>
                            <option value="source">source</option>
                          </select>
                        </label>
                        <button
                          className="action-button action-button-secondary"
                          disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                          onClick={() => void inspectRuntimeSymbol()}
                          type="button"
                        >
                          {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
                        </button>
                      </div>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{runtimeInspection?.data.symbol ?? (runtimeInspectorSymbol || "No inspection symbol")}</strong>
                          <span>{runtimeInspectionMode}</span>
                        </div>
                        <p>{runtimeInspection?.data.summary ?? "Runtime inspection results stay visible here so the inspector can operate as a concurrent desktop resident."}</p>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Inspector Route</p>
                      <button className="desktop-window-control-item" onClick={onOpenInspectorSurface} type="button">
                        <strong>Open Inspector Surface</strong>
                        <span>
                          {inspectorPanel?.resolvedVia
                            ? `Resolved via ${inspectorPanel.resolvedVia}.`
                            : "Route this utility resident into the shell inspector lane for deeper object and execution inspection."}
                        </span>
                        <em>{inspectorPanel?.selectedExecutionId ? `Execution ${inspectorPanel.selectedExecutionId}` : "Open Inspector"}</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:detailed-surface" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Deep Work Route</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{activeHostedAppLabel}</strong>
                          <span>{shellCurrentSurfaceSummary.panelLabel}</span>
                        </div>
                        <p>{`Use this resident when the current desktop surface needs a deeper, single-surface pass without reopening a bottom-of-page strip.`}</p>
                        <em>{activeHostedAppSummary}</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Open Detail</p>
                      <button className="desktop-window-control-item" onClick={onOpenDetailedWorkspace} type="button">
                        <strong>{activeHostedAppId === "listener-workbench" ? "Open Listener Workbench" : "Open Current Workspace"}</strong>
                        <span>{activeHostedAppId === "listener-workbench" ? "Route into the live listener resident and its governed runtime work." : "Route into the current control-panel workspace for deeper single-surface work."}</span>
                        <em>{shellCurrentSurfaceSummary.panelLabel}</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:browser-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <BrowserWorkspace {...browserWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:actor-system-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ActorSystemPanel actorSystemPanel={executionWorkspaceProps.actorSystemPanel} />
                </div>
              ) : null}
              {window.id === "window:projects-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ProjectsWorkspace {...projectsWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:editor-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <EditorSurface {...editorSurfaceProps} />
                </div>
              ) : null}
              {window.id === "window:transcript-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <TranscriptSurface {...transcriptSurfaceProps} />
                </div>
              ) : null}
              {window.id === "window:memory-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <MemoryWorkspace {...memoryWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:operate-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  {renderOperateSurfaceContent()}
                </div>
              ) : null}
              {window.id === "window:conversations-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ConversationsWorkspace {...conversationsWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:configuration-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ConfigurationWorkspace {...configurationWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:calculator" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <CalculatorSurface
                    clearPendingExpressionRequest={clearPendingCalculatorExpressionRequest}
                    draftExpression={calculatorDraftExpression}
                    environmentId={environmentId}
                    insertResultIntoDraft={insertCalculatorResultIntoConversationDraft}
                    openConversationDraft={openConversationDraft}
                    pendingExpressionRequest={pendingCalculatorExpressionRequest}
                    refreshToken={calculatorRefreshToken}
                    recordEvaluation={recordCalculatorEvaluation}
                  />
                </div>
              ) : null}
              {window.id === "window:listener-workbench" ? (
                <div className="desktop-window-workbench" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-workbench-header">
                    <ContextBlock label="Session" value={activeReplSession?.title ?? "No Session"} />
                    <ContextBlock label="Package" value={runtimeSummary?.currentPackage ?? "No Package"} />
                    <ContextBlock label="Runtime" value={runtimeSummary?.runtimeId ?? "No Runtime"} />
                  </div>
                  <div className="desktop-window-workbench-inspector">
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">New Session</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setReplSessionTitleDraft(event.target.value)}
                        value={replSessionTitleDraft}
                      />
                    </label>
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspect Package</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                        value={runtimeInspectorPackage}
                      />
                    </label>
                    <button className="action-button action-button-secondary" onClick={() => void createReplSession()} type="button">
                      New Session
                    </button>
                  </div>
                  {runtimeRecoveryLaunch ? (
                    <div className="signal-detail-list">
                      <div className="signal-detail-row">
                        <span>Recovery Source</span>
                        <strong>{runtimeRecoveryLaunch.source}</strong>
                      </div>
                      <div className="signal-detail-row">
                        <span>Incident</span>
                        <strong>{runtimeRecoveryLaunch.incidentId}</strong>
                      </div>
                      <div className="signal-detail-row">
                        <span>Restart</span>
                        <strong>{runtimeRecoveryLaunch.restartLabel}</strong>
                      </div>
                    </div>
                  ) : null}
                  <div className="desktop-window-workbench-sessions">
                    {replSessions.slice(0, 3).map((session) => (
                      <button
                        className={session.sessionId === currentReplSessionId ? "desktop-window-session active" : "desktop-window-session"}
                        key={session.sessionId}
                        onClick={() => void switchReplSession(session.sessionId)}
                        type="button"
                      >
                        <strong>{session.title}</strong>
                        <span>{session.lastSummary}</span>
                      </button>
                    ))}
                  </div>
                  <label className="desktop-window-workbench-input">
                    <span className="context-label">Listener Form</span>
                    <textarea
                      className="desktop-window-workbench-textarea"
                      onChange={(event) => setRuntimeForm(event.target.value)}
                      rows={4}
                      value={runtimeForm}
                    />
                  </label>
                  <div className="desktop-window-workbench-actions">
                    <button className="action-button" disabled={isEvaluating} onClick={() => void evaluateRuntimeForm()} type="button">
                      {isEvaluating ? "Running..." : "Run Form"}
                    </button>
                    <button className="action-button action-button-secondary" onClick={onOpenInspectorSurface} type="button">
                      Open Inspector Resident
                    </button>
                    <p className="desktop-window-workbench-summary">{currentRuntimeSummary}</p>
                  </div>
                  <div className="desktop-window-workbench-inspector">
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspect Symbol</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                        value={runtimeInspectorSymbol}
                      />
                    </label>
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspection Mode</span>
                      <select
                        className="desktop-window-workbench-select"
                        onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                        value={runtimeInspectionMode}
                      >
                        <option value="describe">describe</option>
                        <option value="documentation">documentation</option>
                        <option value="source">source</option>
                      </select>
                    </label>
                    <button
                      className="action-button action-button-secondary"
                      disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                      onClick={() => void inspectRuntimeSymbol()}
                      type="button"
                    >
                      {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
                    </button>
                  </div>
                  <div className="desktop-window-workbench-grid">
                    <div className="desktop-window-workbench-panel">
                      <p className="context-label">Live Inspection</p>
                      <strong>{runtimeInspection?.data.symbol ?? runtimeSummary?.currentPackage ?? "No inspection focus"}</strong>
                      <p>{runtimeInspection?.data.summary ?? "Inspection results appear here as the listener workbench explores the live image."}</p>
                    </div>
                    <div className="desktop-window-workbench-panel">
                      <p className="context-label">Image Posture</p>
                      <strong>{`${runtimeSummary?.loadedSystems.length ?? 0} loaded systems`}</strong>
                      <p>
                        {runtimeSummary
                          ? `${runtimeSummary.activeMutations} active mutations, ${runtimeSummary.linkedIncidentIds.length} linked incidents.`
                          : "Runtime posture becomes available when the environment binding is active."}
                      </p>
                    </div>
                  </div>
                  <div className="desktop-window-workbench-panel">
                    <p className="context-label">Result Preview</p>
                    <pre className="desktop-window-history-entry desktop-window-runtime-preview">{runtimePreview}</pre>
                  </div>
                  <div className="desktop-window-workbench-history">
                    <p className="context-label">Session History</p>
                    {recentHistory.length > 0 ? (
                      recentHistory.map((entry) => (
                        <div className="desktop-window-history-entry" key={entry.entryId}>
                          <strong>{entry.summary}</strong>
                          <pre>{entry.form}</pre>
                        </div>
                      ))
                    ) : (
                      <p className="desktop-window-workbench-summary">Run forms in this resident to retain recent history here.</p>
                    )}
                  </div>
                </div>
              ) : null}
              <button
                aria-label={`Resize ${window.title}`}
                className="desktop-window-resize-handle desktop-window-resize-handle-se"
                onPointerDown={(event) => startWindowResize(event, window, "se")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from right edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-e"
                onPointerDown={(event) => startWindowResize(event, window, "e")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from bottom edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-s"
                onPointerDown={(event) => startWindowResize(event, window, "s")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from left edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-w"
                onPointerDown={(event) => startWindowResize(event, window, "w")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-n"
                onPointerDown={(event) => startWindowResize(event, window, "n")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top right corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-ne"
                onPointerDown={(event) => startWindowResize(event, window, "ne")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top left corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-nw"
                onPointerDown={(event) => startWindowResize(event, window, "nw")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from bottom left corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-sw"
                onPointerDown={(event) => startWindowResize(event, window, "sw")}
                type="button"
              />
            </div>
          </div>
        ))}
      </div>
      </div>
      {minimizedWindows.length > 0 ? (
        <div className="desktop-window-dock" role="toolbar" aria-label="Iconified windows">
          <div className="desktop-window-dock-rail">
            {minimizedWindows.map((window) => (
              <button
                className="desktop-window-dock-item"
                key={window.id}
                onClick={() => onRestoreWindow(window.id)}
                data-tooltip={`Restore ${window.title}`}
                title={`Restore ${window.title}`}
                type="button"
              >
                <span className="desktop-window-dock-icon" aria-hidden="true">
                  <span className={`desktop-window-dock-glyph ${dockGlyphClassForWindow(window)}`} />
                </span>
                <span className="desktop-window-dock-indicator" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
