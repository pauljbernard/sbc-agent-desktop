import { describe, expect, it } from "vitest";

import {
  createDefaultShellLayoutState,
  createShellLayoutStateFromPreferences,
  deriveShellRenderLayout,
  shellRailPanelDefinitions,
  shellLayoutReducer,
  shellLayoutToDesktopPreferencesPatch
} from "../../src/renderer/src/shell-layout";

describe("shell layout reducer", () => {
  it("hydrates from desktop preferences", () => {
    const state = createShellLayoutStateFromPreferences({
      sidebarPinned: false,
      sidebarWidth: 312,
      sidebarActivePanelId: "shell-utilities",
      sidebarDockedPanelIds: ["shell-utilities", "shell-navigation"],
      canvasPinned: true,
      inspectorPinned: false,
      inspectorWidth: 356,
      inspectorActivePanelId: "editor-symbol",
      inspectorDockedPanelIds: ["editor-symbol", "workspace-inspector"]
    });

    expect(state.leftRail.mode).toBe("collapsed");
    expect(state.leftRail.expandedWidth).toBe(312);
    expect(state.leftRail.dockedPanelIds).toEqual(["shell-utilities", "shell-navigation"]);
    expect(state.leftRail.activePanelId).toBe("shell-utilities");
    expect(state.canvas.mode).toBe("expanded");
    expect(state.rightRail.mode).toBe("collapsed");
    expect(state.rightRail.expandedWidth).toBe(356);
    expect(state.rightRail.dockedPanelIds).toEqual(["editor-symbol", "workspace-inspector"]);
    expect(state.rightRail.activePanelId).toBe("editor-symbol");
    expect(state.undockedPanelIds).toEqual([]);
  });

  it("restores a default width when expanding the left rail from a null width", () => {
    const initial = createDefaultShellLayoutState();
    const collapsed = shellLayoutReducer(initial, {
      type: "hydrate",
      preferences: {
        sidebarPinned: false,
        sidebarWidth: null,
        sidebarActivePanelId: null,
        sidebarDockedPanelIds: undefined,
        canvasPinned: true,
        inspectorPinned: true,
        inspectorWidth: null,
        inspectorActivePanelId: null,
        inspectorDockedPanelIds: undefined
      }
    });
    const expanded = shellLayoutReducer(collapsed, {
      type: "toggle_left_rail",
      defaultExpandedWidth: 248
    });

    expect(expanded.leftRail.mode).toBe("expanded");
    expect(expanded.leftRail.expandedWidth).toBe(248);
  });

  it("updates explicit rail widths through reducer actions", () => {
    const initial = createDefaultShellLayoutState();
    const resized = shellLayoutReducer(
      shellLayoutReducer(initial, { type: "set_left_rail_width", width: 300 }),
      { type: "set_right_rail_width", width: 340 }
    );

    expect(resized.leftRail.expandedWidth).toBe(300);
    expect(resized.rightRail.expandedWidth).toBe(340);
  });

  it("serializes shell layout back into desktop preference fields", () => {
    const state = shellLayoutReducer(createDefaultShellLayoutState(), {
      type: "hydrate",
      preferences: {
        sidebarPinned: true,
        sidebarWidth: 280,
        sidebarActivePanelId: "shell-utilities",
        sidebarDockedPanelIds: ["shell-utilities", "shell-navigation"],
        canvasPinned: false,
        inspectorPinned: false,
        inspectorWidth: 332,
        inspectorActivePanelId: "editor-symbol",
        inspectorDockedPanelIds: ["editor-symbol", "workspace-inspector"]
      }
    });

    expect(shellLayoutToDesktopPreferencesPatch(state)).toEqual({
      sidebarPinned: true,
      sidebarWidth: 280,
      sidebarActivePanelId: "shell-utilities",
      sidebarDockedPanelIds: ["shell-utilities", "shell-navigation"],
      canvasPinned: false,
      inspectorPinned: false,
      inspectorWidth: 332,
      inspectorActivePanelId: "editor-symbol",
      inspectorDockedPanelIds: ["editor-symbol", "workspace-inspector"]
    });
  });

  it("derives collapsed rail widths for side rails", () => {
    const state = createShellLayoutStateFromPreferences({
      sidebarPinned: false,
      sidebarWidth: 280,
      sidebarActivePanelId: "shell-navigation",
      sidebarDockedPanelIds: ["shell-navigation", "shell-utilities"],
      canvasPinned: true,
      inspectorPinned: false,
      inspectorWidth: 320,
      inspectorActivePanelId: "workspace-inspector",
      inspectorDockedPanelIds: ["workspace-inspector", "editor-symbol"]
    });

    const layout = deriveShellRenderLayout(state, 1440);

    expect(layout.sidebarPinned).toBe(false);
    expect(layout.inspectorPinned).toBe(false);
    expect(layout.sidebarColumnWidth).toBe(60);
    expect(layout.inspectorColumnWidth).toBe(60);
    expect(layout.desktopShellInlineColumns).toBe("60px minmax(0, 1fr) 60px");
  });

  it("clamps inspector width against remaining canvas space", () => {
    const state = createShellLayoutStateFromPreferences({
      sidebarPinned: true,
      sidebarWidth: 248,
      sidebarActivePanelId: "shell-navigation",
      sidebarDockedPanelIds: ["shell-navigation", "shell-utilities"],
      canvasPinned: true,
      inspectorPinned: true,
      inspectorWidth: 800,
      inspectorActivePanelId: "workspace-inspector",
      inspectorDockedPanelIds: ["workspace-inspector", "editor-symbol"]
    });

    const layout = deriveShellRenderLayout(state, 1100);

    expect(layout.inspectorColumnWidth).toBe(444);
    expect(layout.desktopShellInlineColumns).toBe("248px minmax(0, 1fr) 444px");
  });

  it("activates docked rail panels through explicit reducer actions", () => {
    const initial = createDefaultShellLayoutState();
    const updated = shellLayoutReducer(initial, {
      type: "activate_rail_panel",
      rail: "left",
      panelId: "shell-utilities"
    });

    expect(updated.leftRail.activePanelId).toBe("shell-utilities");
    expect(shellRailPanelDefinitions(updated, "left").map((panel) => panel.id)).toEqual([
      "shell-navigation",
      "shell-utilities"
    ]);
  });

  it("normalizes active panel selection when a docked rail stack changes", () => {
    const initial = createDefaultShellLayoutState();
    const updated = shellLayoutReducer(initial, {
      type: "set_rail_docked_panels",
      rail: "right",
      panelIds: ["editor-symbol"]
    });

    expect(updated.rightRail.dockedPanelIds).toEqual(["editor-symbol"]);
    expect(updated.rightRail.activePanelId).toBe("editor-symbol");
  });

  it("reorders docked rail panels while preserving the active panel when still present", () => {
    const initial = createDefaultShellLayoutState();
    const activated = shellLayoutReducer(initial, {
      type: "activate_rail_panel",
      rail: "left",
      panelId: "shell-utilities"
    });
    const reordered = shellLayoutReducer(activated, {
      type: "reorder_rail_panels",
      rail: "left",
      panelIds: ["shell-utilities", "shell-navigation"]
    });

    expect(reordered.leftRail.dockedPanelIds).toEqual(["shell-utilities", "shell-navigation"]);
    expect(reordered.leftRail.activePanelId).toBe("shell-utilities");
  });

  it("undocks a non-last docked panel and tracks it outside the owning rail", () => {
    const initial = createDefaultShellLayoutState();
    const updated = shellLayoutReducer(initial, {
      type: "undock_panel",
      panelId: "shell-navigation"
    });

    expect(updated.leftRail.dockedPanelIds).toEqual(["shell-utilities"]);
    expect(updated.leftRail.activePanelId).toBe("shell-utilities");
    expect(updated.undockedPanelIds).toEqual(["shell-navigation"]);
  });

  it("does not undock the last remaining docked panel for a rail", () => {
    const initial = shellLayoutReducer(createDefaultShellLayoutState(), {
      type: "set_rail_docked_panels",
      rail: "right",
      panelIds: ["editor-symbol"]
    });
    const updated = shellLayoutReducer(initial, {
      type: "undock_panel",
      panelId: "editor-symbol"
    });

    expect(updated.rightRail.dockedPanelIds).toEqual(["editor-symbol"]);
    expect(updated.undockedPanelIds).toEqual([]);
  });

  it("docks an undocked panel back into an explicitly selected rail at the requested position", () => {
    const initial = shellLayoutReducer(createDefaultShellLayoutState(), {
      type: "undock_panel",
      panelId: "shell-navigation"
    });
    const updated = shellLayoutReducer(initial, {
      type: "dock_panel",
      panelId: "shell-navigation",
      rail: "right",
      index: 0
    });

    expect(updated.leftRail.dockedPanelIds).toEqual(["shell-utilities"]);
    expect(updated.rightRail.dockedPanelIds).toEqual(["shell-navigation", "workspace-inspector", "editor-symbol"]);
    expect(updated.rightRail.activePanelId).toBe("shell-navigation");
    expect(updated.undockedPanelIds).toEqual([]);
  });

  it("accepts cross-rail docked panel preferences and only derives undocked panels from absence", () => {
    const state = createShellLayoutStateFromPreferences({
      sidebarPinned: true,
      sidebarWidth: 240,
      sidebarActivePanelId: "workspace-inspector",
      sidebarDockedPanelIds: ["workspace-inspector" as never, "shell-navigation"],
      canvasPinned: true,
      inspectorPinned: true,
      inspectorWidth: 320,
      inspectorActivePanelId: "editor-symbol",
      inspectorDockedPanelIds: ["editor-symbol"]
    });

    expect(state.leftRail.dockedPanelIds).toEqual(["workspace-inspector", "shell-navigation"]);
    expect(state.leftRail.activePanelId).toBe("workspace-inspector");
    expect(state.rightRail.dockedPanelIds).toEqual(["editor-symbol"]);
    expect(state.rightRail.activePanelId).toBe("editor-symbol");
    expect(state.undockedPanelIds).toEqual(["shell-utilities"]);
  });

  it("derives undocked panels from persisted docked panel preferences during hydration", () => {
    const state = createShellLayoutStateFromPreferences({
      sidebarPinned: true,
      sidebarWidth: 248,
      sidebarActivePanelId: "shell-navigation",
      sidebarDockedPanelIds: ["shell-navigation"],
      canvasPinned: true,
      inspectorPinned: true,
      inspectorWidth: 304,
      inspectorActivePanelId: "workspace-inspector",
      inspectorDockedPanelIds: ["workspace-inspector"]
    });

    expect(state.leftRail.dockedPanelIds).toEqual(["shell-navigation"]);
    expect(state.rightRail.dockedPanelIds).toEqual(["workspace-inspector"]);
    expect(state.undockedPanelIds).toEqual(["shell-utilities", "editor-symbol"]);
  });
});
