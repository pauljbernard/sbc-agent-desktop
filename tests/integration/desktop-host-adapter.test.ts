import { describe, expect, it } from "vitest";

import { MockSbclAgentHostAdapter } from "../../src/main/mock-host-adapter";

describe("desktop host adapter contract", () => {
  it("projects the display panel in the desktop model", async () => {
    const adapter = new MockSbclAgentHostAdapter();

    const result = await adapter.desktopModel();

    expect(result.status).toBe("ok");
    expect(result.data.panels.display.panelId).toBe("display");
    expect(result.data.displayCount).toBe(1);
    expect(result.data.topDisplaySurface).toMatchObject({
      appId: "linux.vscode",
      status: "running"
    });
  });

  it("restores browser-oriented panel state through the display lane", async () => {
    const adapter = new MockSbclAgentHostAdapter();

    const result = await adapter.desktopRestore({
      panelState: {
        panelId: "display",
        selectedAppId: "linux.vscode"
      }
    });

    expect(result.status).toBe("ok");
    expect(result.data.panelId).toBe("display");
    expect(result.data.desktopModel.activePanel).toBe("display");
  });

  it("accepts richer desktop action kinds emitted by sbcl-agent", async () => {
    const adapter = new MockSbclAgentHostAdapter();

    const result = await adapter.desktopAction({
      actionKind: "show-panel",
      panelId: "display",
      params: {
        appId: "linux.vscode"
      }
    });

    expect(result.status).toBe("ok");
    expect(result.data.action?.actionKind).toBe("show-panel");
    expect(result.data.action?.panelId).toBe("display");
  });
});
