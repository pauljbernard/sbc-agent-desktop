import { beforeEach, describe, expect, it } from "vitest";

import {
  commandApproveRequest,
  commandCreateConversationThread,
  commandDenyRequest,
  commandEvaluateInContext,
  commandSendConversationMessage,
  commandStageSourceChange,
  defaultEnvironmentId,
  listMockEnvironmentIds,
  queryApprovalRequestDetail,
  queryEnvironmentEvents,
  queryRuntimeInspectSymbol,
  querySourcePreview,
  queryWorkspaceSummary
} from "../../src/shared/mock-environments";

describe("mock environment contract", () => {
  beforeEach(() => {
    commandDenyRequest({
      environmentId: defaultEnvironmentId,
      requestId: "approval-binding-shift"
    });
  });

  it("lists the default mock environment and builds an attention queue", () => {
    expect(listMockEnvironmentIds()).toContain(defaultEnvironmentId);

    const workspace = queryWorkspaceSummary(defaultEnvironmentId);

    expect(workspace.status).toBe("ok");
    expect(workspace.data.attentionQueue.count).toBeGreaterThan(0);
    expect(workspace.data.attentionQueue.topItem?.destinationWorkspace).toBeDefined();
  });

  it("filters environment events by family, visibility, and cursor", () => {
    const events = queryEnvironmentEvents({
      environmentId: defaultEnvironmentId,
      families: ["conversation"],
      visibility: ["operator"],
      fromCursor: 0
    });

    expect(events.status).toBe("ok");
    expect(events.data.length).toBeGreaterThan(0);
    expect(events.data.every((event) => event.family === "conversation")).toBe(true);
    expect(events.data.every((event) => event.visibility === "operator")).toBe(true);
  });

  it("creates a conversation thread and appends a turn when sending a message", () => {
    const created = commandCreateConversationThread({
      environmentId: defaultEnvironmentId,
      title: "QA Contract Thread",
      summary: "Thread created during unit coverage."
    });

    expect(created.status).toBe("ok");
    expect(created.data.threadId).toContain("qa-contract-thread");

    const sent = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "hello from qa"
    });

    expect(sent.status).toBe("ok");
    expect(sent.data.threadId).toBe(created.data.threadId);
    expect(sent.data.assistantMessage).toContain("hello from qa");
  });

  it("projects runtime inspection and source preview read models", () => {
    const inspection = queryRuntimeInspectSymbol({
      environmentId: defaultEnvironmentId,
      symbol: "RUN-CONVERSATION-TURN",
      mode: "definitions"
    });
    const preview = querySourcePreview({
      environmentId: defaultEnvironmentId,
      path: "src/runtime/run-conversation-turn.lisp",
      line: 12
    });

    expect(inspection.status).toBe("ok");
    expect(inspection.data.items.some((item) => item.path)).toBe(true);
    expect(preview.status).toBe("ok");
    expect(preview.data.content).toContain("Mock source preview");
    expect(preview.data.focusLine).toBe(12);
  });

  it("surfaces approval-gated and failure-eval postures", () => {
    const awaitingApproval = commandEvaluateInContext({
      environmentId: defaultEnvironmentId,
      form: "(persist-binding)"
    });
    const failed = commandEvaluateInContext({
      environmentId: defaultEnvironmentId,
      form: "(error \"boom\")"
    });

    expect(awaitingApproval.status).toBe("awaiting_approval");
    expect(awaitingApproval.data.approvalId).toBe("approval-binding-shift");
    expect(failed.status).toBe("error");
    expect(failed.data.incidentId).toBeTruthy();
  });

  it("keeps source mutation and approval decisions governed", () => {
    const staged = commandStageSourceChange({
      environmentId: defaultEnvironmentId,
      path: "src/example.lisp",
      content: "(print :qa)"
    });

    expect(staged.status).toBe("awaiting_approval");
    expect(staged.metadata.policyId).toBe("workspace-write");

    const approved = commandApproveRequest({
      environmentId: defaultEnvironmentId,
      requestId: "approval-binding-shift"
    });
    const approvalDetail = queryApprovalRequestDetail(defaultEnvironmentId, "approval-binding-shift");

    expect(approved.status).toBe("ok");
    expect(approved.data.decision).toBe("approved");
    expect(approvalDetail.data.state).toBe("approved");
  });
});
