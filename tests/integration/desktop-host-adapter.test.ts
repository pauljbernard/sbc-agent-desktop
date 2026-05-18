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

  it("completes the governed editor approval round-trip in mock mode", async () => {
    const adapter = new MockSbclAgentHostAdapter();
    const prompt = "now append (* (- 9 4) 4) into the surface editor.";

    const created = await adapter.createConversationThread({
      environmentId: "environment-3986632124-113500",
      title: "Governed Editor Approval Session",
      summary: "Thread created for adapter approval coverage."
    });

    const awaitingApproval = await adapter.sendConversationMessage({
      environmentId: "environment-3986632124-113500",
      threadId: created.data.threadId,
      prompt
    });

    expect(awaitingApproval.status).toBe("awaiting_approval");
    expect(awaitingApproval.data.pendingApproval).toMatchObject({
      actorMessageId: "actor-message-editor-approval",
      approvalId: "approval-binding-shift"
    });

    const approved = await adapter.approveApproval({
      environmentId: "environment-3986632124-113500",
      approvalId: "approval-binding-shift",
      sessionId: "session-editor-approval"
    });

    expect(approved.status).toBe("ok");
    expect(approved.data.threadId).toBe(created.data.threadId);
    expect(approved.data.assistantMessage).toBe("Appended (* (- 9 4) 4) to the editor now.");

    const detail = await adapter.threadDetail(created.data.threadId, "environment-3986632124-113500");
    expect(detail.status).toBe("ok");
    expect(
      detail.data.messages.some((message) => message.content === "Appended (* (- 9 4) 4) to the editor now.")
    ).toBe(true);
  });
});
