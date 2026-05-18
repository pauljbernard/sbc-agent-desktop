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

  it("surfaces approval-required editor append requests through conversation send", () => {
    const created = commandCreateConversationThread({
      environmentId: defaultEnvironmentId,
      title: "Governed Editor Approval Thread",
      summary: "Thread used for approval contract coverage."
    });

    const sent = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "append (+ 1 1) to the editor surface."
    });

    expect(sent.status).toBe("awaiting_approval");
    expect(sent.data.threadId).toBe(created.data.threadId);
    expect(sent.data.pendingApproval).toMatchObject({
      actorMessageId: "actor-message-editor-approval",
      approvalId: "approval-binding-shift",
      policyIds: ["workspace-write"]
    });
  });

  it("recognizes equivalent governed editor append wording", () => {
    const created = commandCreateConversationThread({
      environmentId: defaultEnvironmentId,
      title: "Governed Editor Approval Variant Thread",
      summary: "Thread used for approval wording coverage."
    });

    const sent = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "append (+ 1 1) into the surface editor."
    });

    expect(sent.status).toBe("awaiting_approval");
    expect(sent.data.pendingApproval).toMatchObject({
      actorMessageId: "actor-message-editor-approval",
      approvalId: "approval-binding-shift",
      policyIds: ["workspace-write"]
    });
  });

  it("routes evaluate prompts through the mock runtime contract", () => {
    const created = commandCreateConversationThread({
      environmentId: defaultEnvironmentId,
      title: "Runtime Evaluation Thread",
      summary: "Thread used for runtime evaluation coverage."
    });

    const sent = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "evaluate (defun foo (x)(x-1))"
    });

    expect(sent.status).toBe("ok");
    expect(sent.data.threadId).toBe(created.data.threadId);
    expect(sent.data.runtimeReply).toMatchObject({
      evaluationId: "eval-ok",
      outcome: "ok"
    });
    expect(sent.data.assistantMessage).toBe("foo");
  });

  it("retains a simple defun across subsequent evaluate turns", () => {
    const created = commandCreateConversationThread({
      environmentId: defaultEnvironmentId,
      title: "Stateful Runtime Evaluation Thread",
      summary: "Thread used for sequential runtime evaluation coverage."
    });

    const defined = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "evaluate (defun foo (x)(* 1 x))"
    });
    const invoked = commandSendConversationMessage({
      environmentId: defaultEnvironmentId,
      threadId: created.data.threadId,
      prompt: "evaluate (foo 5)"
    });

    expect(defined.status).toBe("ok");
    expect(defined.data.assistantMessage).toBe("foo");
    expect(invoked.status).toBe("ok");
    expect(invoked.data.assistantMessage).toBe("5");
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
