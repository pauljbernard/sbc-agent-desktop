import type { DesktopPreferencesDto } from "../../shared/contracts";

export type ShellRailMode = "expanded" | "collapsed";
export type ShellCanvasMode = "expanded" | "collapsed";
export type ShellRailId = "left" | "right";
export type ShellDockPanelId =
  | "shell-navigation"
  | "shell-utilities"
  | "workspace-inspector"
  | "editor-symbol";
export const SHELL_STACK_BREAKPOINT = 480;

export interface ShellRailState {
  mode: ShellRailMode;
  expandedWidth: number | null;
  dockedPanelIds: ShellDockPanelId[];
  activePanelId: ShellDockPanelId | null;
}

export interface ShellCanvasState {
  mode: ShellCanvasMode;
}

export interface ShellLayoutState {
  leftRail: ShellRailState;
  canvas: ShellCanvasState;
  rightRail: ShellRailState;
  undockedPanelIds: ShellDockPanelId[];
}

export interface ShellDockPanelDefinition {
  id: ShellDockPanelId;
  label: string;
  rail: ShellRailId;
}

export interface ShellRenderLayout {
  sidebarPinned: boolean;
  canvasPinned: boolean;
  inspectorPinned: boolean;
  sidebarColumnWidth: number;
  inspectorColumnWidth: number;
  gap: number;
  horizontalPadding: number;
  canvasMinWidth: number;
  inspectorMinWidth: number;
  inspectorRailWidth: number;
  stackBreakpointActive: boolean;
  desktopShellInlineColumns?: string;
}

export type ShellLayoutAction =
  | { type: "replace_state"; state: ShellLayoutState }
  | { type: "hydrate"; preferences: Pick<DesktopPreferencesDto, "sidebarPinned" | "sidebarWidth" | "sidebarActivePanelId" | "sidebarDockedPanelIds" | "canvasPinned" | "inspectorPinned" | "inspectorWidth" | "inspectorActivePanelId" | "inspectorDockedPanelIds"> }
  | { type: "toggle_left_rail"; defaultExpandedWidth: number }
  | { type: "toggle_right_rail" }
  | { type: "toggle_canvas" }
  | { type: "expand_right_rail" }
  | { type: "activate_rail_panel"; rail: ShellRailId; panelId: ShellDockPanelId }
  | { type: "set_rail_docked_panels"; rail: ShellRailId; panelIds: ShellDockPanelId[] }
  | { type: "reorder_rail_panels"; rail: ShellRailId; panelIds: ShellDockPanelId[] }
  | { type: "undock_panel"; panelId: ShellDockPanelId }
  | { type: "dock_panel"; panelId: ShellDockPanelId; rail: ShellRailId; index?: number; activate?: boolean }
  | { type: "set_left_rail_width"; width: number | null }
  | { type: "set_right_rail_width"; width: number | null };

export const SHELL_DOCK_PANEL_DEFINITIONS: Record<ShellDockPanelId, ShellDockPanelDefinition> = {
  "shell-navigation": {
    id: "shell-navigation",
    label: "Navigation",
    rail: "left"
  },
  "shell-utilities": {
    id: "shell-utilities",
    label: "Utilities",
    rail: "left"
  },
  "workspace-inspector": {
    id: "workspace-inspector",
    label: "Inspector",
    rail: "right"
  },
  "editor-symbol": {
    id: "editor-symbol",
    label: "Editor Symbol",
    rail: "right"
  }
};

function defaultDockedPanelIdsForRail(rail: ShellRailId): ShellDockPanelId[] {
  return rail === "left"
    ? ["shell-navigation", "shell-utilities"]
    : ["workspace-inspector", "editor-symbol"];
}

function dedupePanelIds(panelIds: ShellDockPanelId[]): ShellDockPanelId[] {
  const seen = new Set<ShellDockPanelId>();
  const deduped: ShellDockPanelId[] = [];
  for (const panelId of panelIds) {
    if (seen.has(panelId)) {
      continue;
    }
    seen.add(panelId);
    deduped.push(panelId);
  }
  return deduped;
}

function normalizeRailExpandedWidth(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }
  return value > 0 ? value : null;
}

function normalizeRailState(rail: ShellRailState, railId: ShellRailId): ShellRailState {
  const panelIds = dedupePanelIds(rail.dockedPanelIds);
  const normalizedPanelIds = panelIds.length > 0 ? panelIds : defaultDockedPanelIdsForRail(railId);
  const activePanelId = normalizedPanelIds.includes(rail.activePanelId as ShellDockPanelId)
    ? rail.activePanelId
    : normalizedPanelIds[0];
  return {
    ...rail,
    dockedPanelIds: normalizedPanelIds,
    activePanelId
  };
}

function updateRailState(
  state: ShellLayoutState,
  rail: ShellRailId,
  updater: (railState: ShellRailState) => ShellRailState
): ShellLayoutState {
  return rail === "left"
    ? {
        ...state,
        leftRail: normalizeRailState(updater(state.leftRail), "left")
      }
    : {
        ...state,
        rightRail: normalizeRailState(updater(state.rightRail), "right")
      };
}

function insertDockedPanel(
  dockedPanelIds: ShellDockPanelId[],
  panelId: ShellDockPanelId,
  index?: number
): ShellDockPanelId[] {
  const withoutPanel = dockedPanelIds.filter((entry) => entry !== panelId);
  if (index == null || index < 0 || index > withoutPanel.length) {
    return [...withoutPanel, panelId];
  }
  return [...withoutPanel.slice(0, index), panelId, ...withoutPanel.slice(index)];
}

function railContainingPanel(state: ShellLayoutState, panelId: ShellDockPanelId): ShellRailId | null {
  if (state.leftRail.dockedPanelIds.includes(panelId)) {
    return "left";
  }
  if (state.rightRail.dockedPanelIds.includes(panelId)) {
    return "right";
  }
  return null;
}

function deriveUndockedPanelIdsFromRails(state: Pick<ShellLayoutState, "leftRail" | "rightRail">): ShellDockPanelId[] {
  const dockedPanelIds = new Set<ShellDockPanelId>([...state.leftRail.dockedPanelIds, ...state.rightRail.dockedPanelIds]);
  return (Object.keys(SHELL_DOCK_PANEL_DEFINITIONS) as ShellDockPanelId[]).filter((panelId) => !dockedPanelIds.has(panelId));
}

function shellSidebarWidthForViewport(viewportWidth: number, pinned: boolean): number {
  if (viewportWidth <= 1320) {
    return pinned ? 212 : 56;
  }
  if (viewportWidth <= 1480) {
    return pinned ? 224 : 60;
  }
  return pinned ? 248 : 60;
}

export function shellSidebarDefaultWidthForViewport(viewportWidth: number): number {
  return shellSidebarWidthForViewport(viewportWidth, true);
}

export function shellSidebarRailWidthForViewport(viewportWidth: number): number {
  return shellSidebarWidthForViewport(viewportWidth, false);
}

export function shellSidebarMinWidthForViewport(viewportWidth: number): number {
  return viewportWidth <= 1320 ? 188 : 204;
}

export function shellInspectorDefaultWidthForViewport(viewportWidth: number): number {
  if (viewportWidth <= 1320) {
    return 256;
  }
  if (viewportWidth <= 1480) {
    return 280;
  }
  return 304;
}

export function shellInspectorMinWidthForViewport(viewportWidth: number): number {
  return viewportWidth <= 1320 ? 220 : 240;
}

export function shellInspectorRailWidthForViewport(viewportWidth: number): number {
  return viewportWidth <= 1320 ? 56 : 60;
}

export function shellCanvasMinWidthForViewport(viewportWidth: number): number {
  return viewportWidth <= 1320 ? 360 : 420;
}

export function shellGapForViewport(viewportWidth: number): number {
  return viewportWidth <= 1480 ? 12 : 14;
}

export function shellHorizontalPaddingForViewport(viewportWidth: number): number {
  return viewportWidth <= 1480 ? 12 : 14;
}

export function createDefaultShellLayoutState(): ShellLayoutState {
  return {
    leftRail: {
      mode: "expanded",
      expandedWidth: null,
      dockedPanelIds: defaultDockedPanelIdsForRail("left"),
      activePanelId: "shell-navigation"
    },
    canvas: {
      mode: "expanded"
    },
    rightRail: {
      mode: "expanded",
      expandedWidth: null,
      dockedPanelIds: defaultDockedPanelIdsForRail("right"),
      activePanelId: "workspace-inspector"
    },
    undockedPanelIds: []
  };
}

export function createShellLayoutStateFromPreferences(
  preferences: Pick<DesktopPreferencesDto, "sidebarPinned" | "sidebarWidth" | "sidebarActivePanelId" | "sidebarDockedPanelIds" | "canvasPinned" | "inspectorPinned" | "inspectorWidth" | "inspectorActivePanelId" | "inspectorDockedPanelIds">
): ShellLayoutState {
  const state = createDefaultShellLayoutState();
  state.leftRail.mode = preferences.sidebarPinned ?? true ? "expanded" : "collapsed";
  state.leftRail.expandedWidth = normalizeRailExpandedWidth(preferences.sidebarWidth);
  state.leftRail.dockedPanelIds = (preferences.sidebarDockedPanelIds as ShellDockPanelId[] | undefined) ?? state.leftRail.dockedPanelIds;
  state.leftRail.activePanelId = (preferences.sidebarActivePanelId as ShellDockPanelId | null | undefined) ?? state.leftRail.activePanelId;
  state.canvas.mode = preferences.canvasPinned ?? true ? "expanded" : "collapsed";
  state.rightRail.mode = preferences.inspectorPinned ?? true ? "expanded" : "collapsed";
  state.rightRail.expandedWidth = normalizeRailExpandedWidth(preferences.inspectorWidth);
  state.rightRail.dockedPanelIds =
    (preferences.inspectorDockedPanelIds as ShellDockPanelId[] | undefined) ?? state.rightRail.dockedPanelIds;
  state.rightRail.activePanelId =
    (preferences.inspectorActivePanelId as ShellDockPanelId | null | undefined) ?? state.rightRail.activePanelId;
  state.leftRail = normalizeRailState(state.leftRail, "left");
  state.rightRail = normalizeRailState(state.rightRail, "right");
  state.undockedPanelIds = deriveUndockedPanelIdsFromRails(state);
  return state;
}

export function shellLayoutReducer(state: ShellLayoutState, action: ShellLayoutAction): ShellLayoutState {
  switch (action.type) {
    case "replace_state":
      return action.state;
    case "hydrate":
      return createShellLayoutStateFromPreferences(action.preferences);
    case "toggle_left_rail":
      return {
        ...state,
        leftRail: {
          ...state.leftRail,
          mode: state.leftRail.mode === "expanded" ? "collapsed" : "expanded",
          expandedWidth:
            state.leftRail.mode === "collapsed" && state.leftRail.expandedWidth === null
              ? action.defaultExpandedWidth
              : state.leftRail.expandedWidth
        }
      };
    case "toggle_right_rail":
      return {
        ...state,
        rightRail: {
          ...state.rightRail,
          mode: state.rightRail.mode === "expanded" ? "collapsed" : "expanded"
        }
      };
    case "toggle_canvas":
      return {
        ...state,
        canvas: {
          mode: state.canvas.mode === "expanded" ? "collapsed" : "expanded"
        }
      };
    case "expand_right_rail":
      return {
        ...state,
        rightRail: {
          ...state.rightRail,
          mode: "expanded"
        }
      };
    case "activate_rail_panel":
      return updateRailState(state, action.rail, (railState) => ({
        ...railState,
        activePanelId: action.panelId
      }));
    case "set_rail_docked_panels":
    case "reorder_rail_panels":
      return updateRailState(state, action.rail, (railState) => ({
        ...railState,
        dockedPanelIds: action.panelIds,
        activePanelId: action.panelIds.includes(railState.activePanelId as ShellDockPanelId)
          ? railState.activePanelId
          : action.panelIds[0] ?? null
      }));
    case "undock_panel": {
      const rail = railContainingPanel(state, action.panelId);
      if (!rail) {
        return state;
      }
      const railState = rail === "left" ? state.leftRail : state.rightRail;
      if (!railState.dockedPanelIds.includes(action.panelId) || railState.dockedPanelIds.length <= 1) {
        return state;
      }
      const nextState = updateRailState(state, rail, (currentRailState) => ({
        ...currentRailState,
        dockedPanelIds: currentRailState.dockedPanelIds.filter((panelId) => panelId !== action.panelId),
        activePanelId:
          currentRailState.activePanelId === action.panelId
            ? currentRailState.dockedPanelIds.find((panelId) => panelId !== action.panelId) ?? null
            : currentRailState.activePanelId
      }));
      return {
        ...nextState,
        undockedPanelIds: dedupePanelIds([...nextState.undockedPanelIds, action.panelId])
      };
    }
    case "dock_panel": {
      const sourceRail = railContainingPanel(state, action.panelId);
      const stateWithoutPanel =
        sourceRail === null
          ? state
          : updateRailState(state, sourceRail, (railState) => ({
              ...railState,
              dockedPanelIds: railState.dockedPanelIds.filter((panelId) => panelId !== action.panelId),
              activePanelId:
                railState.activePanelId === action.panelId
                  ? railState.dockedPanelIds.find((panelId) => panelId !== action.panelId) ?? null
                  : railState.activePanelId
            }));
      const nextState = updateRailState(stateWithoutPanel, action.rail, (railState) => ({
        ...railState,
        dockedPanelIds: insertDockedPanel(railState.dockedPanelIds, action.panelId, action.index),
        activePanelId: action.activate === false ? railState.activePanelId : action.panelId
      }));
      return {
        ...nextState,
        undockedPanelIds: nextState.undockedPanelIds.filter((panelId) => panelId !== action.panelId)
      };
    }
    case "set_left_rail_width":
      return {
        ...state,
        leftRail: {
          ...state.leftRail,
          expandedWidth: normalizeRailExpandedWidth(action.width)
        }
      };
    case "set_right_rail_width":
      return {
        ...state,
        rightRail: {
          ...state.rightRail,
          expandedWidth: normalizeRailExpandedWidth(action.width)
        }
      };
    default:
      return state;
  }
}

export function shellLayoutToDesktopPreferencesPatch(
  state: ShellLayoutState
): Pick<DesktopPreferencesDto, "sidebarPinned" | "sidebarWidth" | "sidebarActivePanelId" | "sidebarDockedPanelIds" | "canvasPinned" | "inspectorPinned" | "inspectorWidth" | "inspectorActivePanelId" | "inspectorDockedPanelIds"> {
  return {
    sidebarPinned: state.leftRail.mode === "expanded",
    sidebarWidth: normalizeRailExpandedWidth(state.leftRail.expandedWidth),
    sidebarActivePanelId: state.leftRail.activePanelId,
    sidebarDockedPanelIds: [...state.leftRail.dockedPanelIds],
    canvasPinned: state.canvas.mode === "expanded",
    inspectorPinned: state.rightRail.mode === "expanded",
    inspectorWidth: normalizeRailExpandedWidth(state.rightRail.expandedWidth),
    inspectorActivePanelId: state.rightRail.activePanelId,
    inspectorDockedPanelIds: [...state.rightRail.dockedPanelIds]
  };
}

export function shellRailIsExpanded(state: ShellLayoutState, rail: ShellRailId): boolean {
  return rail === "left" ? state.leftRail.mode === "expanded" : state.rightRail.mode === "expanded";
}

export function shellRailPanelDefinitions(state: ShellLayoutState, rail: ShellRailId): ShellDockPanelDefinition[] {
  const panelIds = rail === "left" ? state.leftRail.dockedPanelIds : state.rightRail.dockedPanelIds;
  return panelIds
    .map((panelId) => SHELL_DOCK_PANEL_DEFINITIONS[panelId])
    .filter((panel): panel is ShellDockPanelDefinition => Boolean(panel));
}

export function deriveShellRenderLayout(state: ShellLayoutState, viewportWidth: number): ShellRenderLayout {
  const sidebarPinned = state.leftRail.mode === "expanded";
  const canvasPinned = state.canvas.mode === "expanded";
  const inspectorPinned = state.rightRail.mode === "expanded";
  const gap = shellGapForViewport(viewportWidth);
  const horizontalPadding = shellHorizontalPaddingForViewport(viewportWidth);
  const canvasMinWidth = shellCanvasMinWidthForViewport(viewportWidth);
  const inspectorMinWidth = shellInspectorMinWidthForViewport(viewportWidth);
  const inspectorRailWidth = shellInspectorRailWidthForViewport(viewportWidth);
  const stackBreakpointActive = canvasPinned && viewportWidth > SHELL_STACK_BREAKPOINT;
  const sidebarColumnWidth = sidebarPinned
    ? Math.max(
        state.leftRail.expandedWidth ?? shellSidebarDefaultWidthForViewport(viewportWidth),
        shellSidebarMinWidthForViewport(viewportWidth)
      )
    : shellSidebarRailWidthForViewport(viewportWidth);

  const inspectorColumnWidth = stackBreakpointActive
    ? (() => {
        if (!inspectorPinned) {
          return inspectorRailWidth;
        }
        const availableWidth = viewportWidth - horizontalPadding * 2;
        const maxInspectorWidth = Math.max(
          inspectorMinWidth,
          availableWidth - sidebarColumnWidth - canvasMinWidth - gap * 2
        );
        return Math.min(
          Math.max(
            state.rightRail.expandedWidth ?? shellInspectorDefaultWidthForViewport(viewportWidth),
            inspectorMinWidth
          ),
          maxInspectorWidth
        );
      })()
    : inspectorPinned
      ? Math.max(
          state.rightRail.expandedWidth ?? shellInspectorDefaultWidthForViewport(viewportWidth),
          inspectorMinWidth
        )
      : inspectorRailWidth;

  return {
    sidebarPinned,
    canvasPinned,
    inspectorPinned,
    sidebarColumnWidth,
    inspectorColumnWidth,
    gap,
    horizontalPadding,
    canvasMinWidth,
    inspectorMinWidth,
    inspectorRailWidth,
    stackBreakpointActive,
    desktopShellInlineColumns: stackBreakpointActive
      ? `${sidebarColumnWidth}px minmax(0, 1fr) ${inspectorColumnWidth}px`
      : undefined
  };
}
