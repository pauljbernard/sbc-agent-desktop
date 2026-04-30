import { describe, expect, it } from "vitest";

import {
  canonicalWorkspace,
  desktopPanelToWorkspaceId,
  keyboardWorkspaceOrder,
  labelForWorkspace,
  topLevelJourneyWorkspace,
  workspaceToDesktopPanelId
} from "../../src/renderer/src/workspace-shell";

describe("workspace shell mapping", () => {
  it("routes browser workspace through the display panel", () => {
    expect(workspaceToDesktopPanelId("browser")).toBe("display");
  });

  it("maps display and object-browser panels back to the browser workspace", () => {
    expect(desktopPanelToWorkspaceId("display", "environment")).toBe("browser");
    expect(desktopPanelToWorkspaceId("object-browser", "environment")).toBe("browser");
  });

  it("canonicalizes nested workspaces", () => {
    expect(canonicalWorkspace("work")).toBe("runtime");
    expect(canonicalWorkspace("activity")).toBe("artifacts");
  });

  it("derives top-level journey workspaces from internal execution surfaces", () => {
    expect(topLevelJourneyWorkspace("runtime")).toBe("environment");
    expect(topLevelJourneyWorkspace("approvals")).toBe("environment");
    expect(topLevelJourneyWorkspace("browser")).toBe("browser");
  });

  it("keeps primary keyboard journeys stable", () => {
    expect(keyboardWorkspaceOrder).toEqual([
      "dashboard",
      "environment",
      "conversations",
      "browser",
      "documentation",
      "configuration"
    ]);
  });

  it("resolves workspace labels through the canonical mapping", () => {
    expect(labelForWorkspace("work")).toBe("Execution");
    expect(labelForWorkspace("activity")).toBe("Evidence");
  });
});
