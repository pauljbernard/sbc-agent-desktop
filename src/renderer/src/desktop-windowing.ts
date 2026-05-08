import type { DesktopPanelId } from "../../shared/contracts";
import type { HostedAppId } from "./workspace-shell";

export type DesktopWindowKind = "hosted-app" | "utility";
export type DesktopWindowState = "open" | "minimized" | "closed";
export type DesktopWindowSizePreset = "compact" | "standard" | "expanded";
export type DesktopWindowMoveDirection = "left" | "right" | "up" | "down";
export type DesktopWindowResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface DesktopWindowRecord {
  id: string;
  kind: DesktopWindowKind;
  title: string;
  summary: string;
  state: DesktopWindowState;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  closable: boolean;
  hostedAppId?: HostedAppId;
  panelId?: DesktopPanelId;
}

interface DesktopWindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DESKTOP_MIN_X = 4;
const DESKTOP_MIN_Y = 6;
const DESKTOP_MAX_WIDTH = 280;
const DESKTOP_MAX_HEIGHT = 220;

export const DEFAULT_DESKTOP_WINDOW_FRAMES: Record<string, DesktopWindowFrame> = {
  "window:control-panel": {
    x: 10,
    y: 10,
    width: 94,
    height: 82
  },
  "window:listener-workbench": {
    x: 98,
    y: 12,
    width: 108,
    height: 92
  },
  "window:inspector": {
    x: 170,
    y: 10,
    width: 64,
    height: 72
  },
  "window:display": {
    x: 156,
    y: 92,
    width: 68,
    height: 56
  },
  "window:shell-context": {
    x: 10,
    y: 88,
    width: 72,
    height: 56
  },
  "window:detailed-surface": {
    x: 146,
    y: 86,
    width: 76,
    height: 60
  },
  "window:browser-surface": {
    x: 88,
    y: 22,
    width: 96,
    height: 78
  },
  "window:projects-surface": {
    x: 86,
    y: 18,
    width: 110,
    height: 82
  },
  "window:operate-surface": {
    x: 84,
    y: 18,
    width: 102,
    height: 82
  },
  "window:configuration-surface": {
    x: 94,
    y: 18,
    width: 92,
    height: 74
  },
  "window:calculator": {
    x: 108,
    y: 22,
    width: 84,
    height: 84
  },
  "window:conversations-surface": {
    x: 82,
    y: 16,
    width: 110,
    height: 82
  },
  "window:editor-surface": {
    x: 86,
    y: 18,
    width: 110,
    height: 84
  },
  "window:workspace-surface": {
    x: 90,
    y: 20,
    width: 104,
    height: 84
  },
  "window:transcript-surface": {
    x: 96,
    y: 24,
    width: 98,
    height: 82
  },
  "window:memory-surface": {
    x: 94,
    y: 22,
    width: 102,
    height: 82
  }
};

function clampWindowPosition(window: DesktopWindowRecord, x: number, y: number): Pick<DesktopWindowRecord, "x" | "y"> {
  return {
    x: Math.max(DESKTOP_MIN_X, x),
    y: Math.max(DESKTOP_MIN_Y, y)
  };
}

function clampWindowSize(
  window: DesktopWindowRecord,
  width: number,
  height: number
): Pick<DesktopWindowRecord, "width" | "height"> {
  return {
    width: Math.max(24, Math.min(width, DESKTOP_MAX_WIDTH)),
    height: Math.max(24, Math.min(height, DESKTOP_MAX_HEIGHT))
  };
}

function clampWindowFrame(
  x: number,
  y: number,
  width: number,
  height: number
): Pick<DesktopWindowRecord, "x" | "y" | "width" | "height"> {
  const nextX = Math.max(DESKTOP_MIN_X, x);
  const nextY = Math.max(DESKTOP_MIN_Y, y);
  const nextWidth = Math.max(24, Math.min(width, DESKTOP_MAX_WIDTH));
  const nextHeight = Math.max(24, Math.min(height, DESKTOP_MAX_HEIGHT));
  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight
  };
}

export function initialDesktopWindows(): DesktopWindowRecord[] {
  return [
    {
      id: "window:control-panel",
      kind: "hosted-app",
      title: "Control Panel",
      summary: "Environment posture, approvals, incidents, evidence, and workflow coordination.",
      state: "minimized",
      zIndex: 2,
      ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:control-panel"],
      closable: false,
      hostedAppId: "control-panel"
    },
    {
      id: "window:listener-workbench",
      kind: "hosted-app",
      title: "Listener Workbench",
      summary: "Direct image-native listener, runtime execution, and retained REPL session work.",
      state: "minimized",
      zIndex: 1,
      ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:listener-workbench"],
      closable: true,
      hostedAppId: "listener-workbench"
    }
  ];
}

export function resetDesktopWindowLayout(windows: DesktopWindowRecord[]): DesktopWindowRecord[] {
  const baseline = initialDesktopWindows();
  const baselineById = new Map(baseline.map((window) => [window.id, window]));
  let fallbackIndex = 0;

  return windows.map((window) => {
    const baselineWindow = baselineById.get(window.id);
    if (baselineWindow) {
      return {
        ...window,
        x: baselineWindow.x,
        y: baselineWindow.y,
        width: baselineWindow.width,
        height: baselineWindow.height
      };
    }

    const x = 18 + (fallbackIndex % 3) * 62;
    const y = 22 + Math.floor(fallbackIndex / 3) * 34;
    fallbackIndex += 1;
    return {
      ...window,
      x,
      y,
      width: 42,
      height: 36
    };
  });
}

export function cascadeDesktopWindows(windows: DesktopWindowRecord[]): DesktopWindowRecord[] {
  const visibleIds = windows.filter((window) => window.state === "open").map((window) => window.id);
  let visibleIndex = 0;

  return windows.map((window) => {
    if (!visibleIds.includes(window.id)) {
      return window;
    }

    const nextWindow = {
      ...window,
      x: 10 + visibleIndex * 16,
      y: 8 + visibleIndex * 12,
      width: 48,
      height: 42
    };
    visibleIndex += 1;
    return nextWindow;
  });
}

export function tileDesktopWindows(windows: DesktopWindowRecord[]): DesktopWindowRecord[] {
  const visibleWindows = windows.filter((window) => window.state === "open");
  if (visibleWindows.length === 0) {
    return windows;
  }

  const columns = visibleWindows.length === 1 ? 1 : visibleWindows.length <= 4 ? 2 : 3;
  const rows = Math.ceil(visibleWindows.length / columns);
  const gap = 4;
  const marginX = 8;
  const marginY = 10;
  const totalWidth = 156;
  const totalHeight = 112;
  const width = (totalWidth - gap * (columns - 1)) / columns;
  const height = (totalHeight - gap * (rows - 1)) / rows;
  const positionById = new Map<string, { x: number; y: number; width: number; height: number }>();

  visibleWindows.forEach((window, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positionById.set(window.id, {
      x: marginX + column * (width + gap),
      y: marginY + row * (height + gap),
      width,
      height
    });
  });

  return windows.map((window) => {
    const position = positionById.get(window.id);
    return position ? { ...window, ...position } : window;
  });
}

export function resizeDesktopWindow(
  windows: DesktopWindowRecord[],
  windowId: string,
  preset: DesktopWindowSizePreset
): DesktopWindowRecord[] {
  return windows.map((window) => {
    if (window.id !== windowId) {
      return window;
    }
    const nextSize =
      preset === "compact"
        ? { width: 32, height: 30 }
        : preset === "expanded"
          ? { width: 68, height: 72 }
          : { width: 48, height: 46 };

    return {
      ...window,
      width: nextSize.width,
      height: nextSize.height,
      ...clampWindowPosition(
        { ...window, width: nextSize.width, height: nextSize.height },
        window.x,
        window.y
      )
    };
  });
}

export function resizeDesktopWindowToDimensions(
  windows: DesktopWindowRecord[],
  windowId: string,
  width: number,
  height: number
): DesktopWindowRecord[] {
  return windows.map((window) =>
    window.id === windowId ? { ...window, ...clampWindowSize(window, width, height) } : window
  );
}

export function moveDesktopWindow(
  windows: DesktopWindowRecord[],
  windowId: string,
  direction: DesktopWindowMoveDirection,
  distance = 4
): DesktopWindowRecord[] {
  return windows.map((window) => {
    if (window.id !== windowId) {
      return window;
    }

    const nextX =
      direction === "left"
        ? window.x - distance
        : direction === "right"
          ? window.x + distance
          : window.x;
    const nextY =
      direction === "up"
        ? window.y - distance
        : direction === "down"
          ? window.y + distance
          : window.y;

    return {
      ...window,
      ...clampWindowPosition(window, nextX, nextY)
    };
  });
}

export function positionDesktopWindow(
  windows: DesktopWindowRecord[],
  windowId: string,
  x: number,
  y: number
): DesktopWindowRecord[] {
  return windows.map((window) => (window.id === windowId ? { ...window, ...clampWindowPosition(window, x, y) } : window));
}

export function setDesktopWindowFrame(
  windows: DesktopWindowRecord[],
  windowId: string,
  x: number,
  y: number,
  width: number,
  height: number
): DesktopWindowRecord[] {
  return windows.map((window) => (window.id === windowId ? { ...window, ...clampWindowFrame(x, y, width, height) } : window));
}

export function bringWindowToFront(
  windows: DesktopWindowRecord[],
  windowId: string,
  nextZIndex: number
): DesktopWindowRecord[] {
  return windows.map((window) =>
    window.id === windowId
      ? {
          ...window,
          state: window.state === "closed" ? "open" : window.state,
          zIndex: nextZIndex
        }
      : window
  );
}

export function updateWindowState(
  windows: DesktopWindowRecord[],
  windowId: string,
  state: DesktopWindowState
): DesktopWindowRecord[] {
  let changed = false;
  const nextWindows = windows.map((window) => {
    if (window.id !== windowId || window.state === state) {
      return window;
    }
    changed = true;
    return { ...window, state };
  });
  return changed ? nextWindows : windows;
}

function sameDesktopWindowRecord(left: DesktopWindowRecord, right: DesktopWindowRecord): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.title === right.title &&
    left.summary === right.summary &&
    left.state === right.state &&
    left.zIndex === right.zIndex &&
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height &&
    left.closable === right.closable &&
    left.hostedAppId === right.hostedAppId &&
    left.panelId === right.panelId
  );
}

export function upsertDesktopWindow(
  windows: DesktopWindowRecord[],
  candidate: DesktopWindowRecord
): DesktopWindowRecord[] {
  const existingIndex = windows.findIndex((window) => window.id === candidate.id);
  if (existingIndex === -1) {
    return [...windows, candidate];
  }

  const existingWindow = windows[existingIndex];
  const nextWindow = {
    ...existingWindow,
    ...candidate,
    x: existingWindow.x,
    y: existingWindow.y,
    width: existingWindow.width,
    height: existingWindow.height,
    zIndex: existingWindow.zIndex
  };

  if (sameDesktopWindowRecord(existingWindow, nextWindow)) {
    return windows;
  }

  return windows.map((window, index) => (index === existingIndex ? nextWindow : window));
}
