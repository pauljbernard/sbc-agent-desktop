import { appendFileSync } from "node:fs";
import { ipcMain } from "electron";
import type { IpcHandlerContext } from "../context";

const CONVERSATION_TRACE_PATH = "/private/tmp/surface-conversation-command.log";

function traceConversationCommand(message: string, detail?: Record<string, unknown>): void {
  const payload = {
    timestamp: new Date().toISOString(),
    message,
    ...(detail ? { detail } : {})
  };
  try {
    appendFileSync(CONVERSATION_TRACE_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    // Ignore tracing failures during debugging instrumentation.
  }
}

export function registerCommandIpcHandlers({ hostAdapter, eventBroker }: IpcHandlerContext): void {
  ipcMain.handle("command:evaluate-in-context", (_event, input) =>
    hostAdapter.evaluateInContext(input)
  );
  ipcMain.handle("command:evaluate-calculator", (_event, input) =>
    hostAdapter.evaluateCalculator(input)
  );
  ipcMain.handle("command:set-calculator-expression", (_event, input) =>
    hostAdapter.setCalculatorExpression(input)
  );
  ipcMain.handle("command:append-calculator-token", (_event, input) =>
    hostAdapter.appendCalculatorToken(input)
  );
  ipcMain.handle("command:backspace-calculator", (_event, environmentId: string) =>
    hostAdapter.backspaceCalculator(environmentId)
  );
  ipcMain.handle("command:clear-calculator", (_event, environmentId: string) =>
    hostAdapter.clearCalculator(environmentId)
  );
  ipcMain.handle("command:set-calculator-mode", (_event, input) =>
    hostAdapter.setCalculatorMode(input)
  );
  ipcMain.handle("command:set-calculator-base", (_event, input) =>
    hostAdapter.setCalculatorBase(input)
  );
  ipcMain.handle("command:set-calculator-word-size", (_event, input) =>
    hostAdapter.setCalculatorWordSize(input)
  );
  ipcMain.handle("command:set-calculator-angle-unit", (_event, input) =>
    hostAdapter.setCalculatorAngleUnit(input)
  );
  ipcMain.handle("command:write-source-file", (_event, input) => hostAdapter.writeSourceFile(input));
  ipcMain.handle("command:create-intent", (_event, input) => hostAdapter.createIntent(input));
  ipcMain.handle("command:create-project", (_event, input) => hostAdapter.createProject(input));
  ipcMain.handle("command:update-project-constitution", (_event, input) =>
    hostAdapter.updateProjectConstitution(input)
  );
  ipcMain.handle("command:update-project-design-system", (_event, input) =>
    hostAdapter.updateProjectDesignSystem(input)
  );
  ipcMain.handle("command:update-project-style-guide", (_event, input) =>
    hostAdapter.updateProjectStyleGuide(input)
  );
  ipcMain.handle("command:update-project-testing-strategy", (_event, input) =>
    hostAdapter.updateProjectTestingStrategy(input)
  );
  ipcMain.handle("command:update-project-release-readiness", (_event, input) =>
    hostAdapter.updateProjectReleaseReadiness(input)
  );
  ipcMain.handle("command:update-project-readiness-obligations", (_event, input) =>
    hostAdapter.updateProjectReadinessObligations(input)
  );
  ipcMain.handle("command:append-project-requirement", (_event, input) =>
    hostAdapter.appendProjectRequirement(input)
  );
  ipcMain.handle("command:append-project-feature-specification", (_event, input) =>
    hostAdapter.appendProjectFeatureSpecification(input)
  );
  ipcMain.handle("command:append-project-user-journey", (_event, input) =>
    hostAdapter.appendProjectUserJourney(input)
  );
  ipcMain.handle("command:append-project-architecture-decision", (_event, input) =>
    hostAdapter.appendProjectArchitectureDecision(input)
  );
  ipcMain.handle("command:append-project-source-root", (_event, input) =>
    hostAdapter.appendProjectSourceRoot(input)
  );
  ipcMain.handle("command:bind-project-testing-harness", (_event, input) =>
    hostAdapter.bindProjectTestingHarness(input)
  );
  ipcMain.handle("command:append-project-quality-gate", (_event, input) =>
    hostAdapter.appendProjectQualityGate(input)
  );
  ipcMain.handle("command:update-incident-remediation-plan", (_event, input) =>
    hostAdapter.updateIncidentRemediationPlan(input)
  );
  ipcMain.handle("command:resume-work-item", (_event, input) => hostAdapter.resumeWorkItem(input));
  ipcMain.handle("command:quarantine-work-item", (_event, input) =>
    hostAdapter.quarantineWorkItem(input)
  );
  ipcMain.handle("command:rollback-work-item", (_event, input) =>
    hostAdapter.rollbackWorkItem(input)
  );
  ipcMain.handle("command:complete-work-item-validations", (_event, input) =>
    hostAdapter.completeWorkItemValidations(input)
  );
  ipcMain.handle("command:steer-work-item", (_event, input) => hostAdapter.steerWorkItem(input));
  ipcMain.handle("command:create-conversation-thread", (_event, input) =>
    hostAdapter.createConversationThread(input)
  );
  ipcMain.handle("command:update-conversation-thread", (_event, input) =>
    hostAdapter.updateConversationThread(input)
  );
  ipcMain.handle("command:update-memory", (_event, input) => hostAdapter.updateMemory(input));
  ipcMain.handle("command:delete-memory", (_event, input) => hostAdapter.deleteMemory(input));
  ipcMain.handle("command:send-conversation-message", async (_event, input) => {
    traceConversationCommand("start", {
      environmentId: input.environmentId ?? null,
      threadId: input.threadId,
      promptLength: typeof input.prompt === "string" ? input.prompt.length : 0
    });
    try {
      const result = await hostAdapter.sendConversationMessage(input, (streamEvent) => {
        eventBroker.emit(streamEvent);
        _event.sender.send("conversation:stream-event", streamEvent);
      });
      traceConversationCommand("done", {
        status: result.status,
        threadId: result.data?.threadId ?? null,
        turnId: result.data?.turnId ?? null,
        summary: result.data?.summary ?? "",
        assistantMessageLength: result.data?.assistantMessage?.length ?? 0
      });
      return result;
    } catch (error) {
      traceConversationCommand("error", {
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  });
  ipcMain.handle("command:extract-conversation-attachment-text", (_event, input) =>
    hostAdapter.extractConversationAttachmentText(input)
  );
  ipcMain.handle("command:stage-source-change", (_event, input) =>
    hostAdapter.stageSourceChange(input)
  );
  ipcMain.handle("command:reload-source-file", (_event, input) =>
    hostAdapter.reloadSourceFile(input)
  );
  ipcMain.handle("command:desktop-action", (_event, input) => hostAdapter.desktopAction(input));
  ipcMain.handle("command:desktop-restore", (_event, input) => hostAdapter.desktopRestore(input));
  ipcMain.handle("command:approve-actor-message", (_event, input) =>
    hostAdapter.approveActorMessage(input)
  );
  ipcMain.handle("command:approve-approval", (_event, input) =>
    hostAdapter.approveApproval(input)
  );
  ipcMain.handle("command:approve-request", (_event, input) => hostAdapter.approveRequest(input));
  ipcMain.handle("command:deny-request", (_event, input) => hostAdapter.denyRequest(input));
  ipcMain.handle("command:configure-provider-profile", (_event, input) =>
    hostAdapter.configureProviderProfile(input)
  );
  ipcMain.handle("command:use-provider-profile", (_event, input) =>
    hostAdapter.useProviderProfile(input)
  );
  ipcMain.handle("command:update-provider-routing", (_event, input) =>
    hostAdapter.updateProviderRouting(input)
  );
  ipcMain.handle("command:configure-mcp-server", (_event, input) =>
    hostAdapter.configureMcpServer(input)
  );
  ipcMain.handle("command:remove-mcp-server", (_event, input) =>
    hostAdapter.removeMcpServer(input)
  );
  ipcMain.handle("command:install-quicklisp-package", (_event, input) =>
    hostAdapter.installQuicklispPackage(input)
  );
  ipcMain.handle("command:run-qlot-command", (_event, input) =>
    hostAdapter.runQlotCommand(input)
  );
  ipcMain.handle("command:add-source-registry-entry", (_event, input) =>
    hostAdapter.addSourceRegistryEntry(input)
  );
  ipcMain.handle("command:update-source-registry-entry", (_event, input) =>
    hostAdapter.updateSourceRegistryEntry(input)
  );
  ipcMain.handle("command:remove-source-registry-entry", (_event, input) =>
    hostAdapter.removeSourceRegistryEntry(input)
  );
  ipcMain.handle("command:add-local-project", (_event, input) =>
    hostAdapter.addLocalProject(input)
  );
  ipcMain.handle("command:remove-local-project", (_event, input) =>
    hostAdapter.removeLocalProject(input)
  );
}
