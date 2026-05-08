import { BrowserWindow, ipcMain, shell, type WebContents } from "electron";
import type { EnvironmentEventDto, EventSubscriptionInput, WorkspaceId } from "../shared/contracts";
import { listDocumentationPages, readDocumentationPageBySlug } from "./documentation";
import { hostAdapter } from "./host-adapter";

interface EventSubscriptionRecord {
  input: EventSubscriptionInput;
  sender: WebContents;
}

const eventSubscriptions = new Map<string, EventSubscriptionRecord>();
let nextSubscriptionId = 1;
let quitAppHandler: (() => Promise<void> | void) | null = null;

export function setQuitAppHandler(handler: (() => Promise<void> | void) | null): void {
  quitAppHandler = handler;
}

function eventMatchesSubscription(
  event: EnvironmentEventDto,
  input: EventSubscriptionInput
): boolean {
  if (input.families && input.families.length > 0 && !input.families.includes(event.family)) {
    return false;
  }

  if (input.visibility && input.visibility.length > 0) {
    const visibility = event.visibility ?? "operator";
    if (!input.visibility.includes(visibility)) {
      return false;
    }
  }

  if (input.fromCursor !== undefined && event.cursor < input.fromCursor) {
    return false;
  }

  return true;
}

function emitDesktopEvent(event: EnvironmentEventDto): void {
  for (const [subscriptionId, record] of eventSubscriptions.entries()) {
    if (!eventMatchesSubscription(event, record.input) || record.sender.isDestroyed()) {
      continue;
    }

    record.sender.send("events:subscription-event", {
      subscriptionId,
      event
    });
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle("host:get-status", () => hostAdapter.getHostStatus());
  ipcMain.handle("host:get-current-binding", () => hostAdapter.getCurrentBinding());
  ipcMain.handle("host:set-environment-binding", (_event, environmentId: string) =>
    hostAdapter.setEnvironmentBinding(environmentId)
  );
  ipcMain.handle("host:get-environment-image-registry", () =>
    hostAdapter.getEnvironmentImageRegistry()
  );
  ipcMain.handle("host:load-environment-image", (_event, imageIdOrName: string) =>
    hostAdapter.loadEnvironmentImage(imageIdOrName)
  );
  ipcMain.handle("host:save-environment-image", (_event, input) =>
    hostAdapter.saveEnvironmentImage(input)
  );
  ipcMain.handle("host:revert-environment-image", () =>
    hostAdapter.revertEnvironmentToImage()
  );

  ipcMain.handle("query:project-list", (_event, environmentId?: string) =>
    hostAdapter.projectList(environmentId)
  );
  ipcMain.handle("query:project-detail", (_event, projectId: string, environmentId?: string) =>
    hostAdapter.projectDetail(projectId, environmentId)
  );
  ipcMain.handle("query:project-testing-harness-inventory", (_event, environmentId?: string) =>
    hostAdapter.projectTestingHarnessInventory(environmentId)
  );
  ipcMain.handle("query:environment-summary", (_event, environmentId?: string) =>
    hostAdapter.environmentSummary(environmentId)
  );
  ipcMain.handle("query:environment-status", (_event, environmentId?: string) =>
    hostAdapter.environmentStatus(environmentId)
  );
  ipcMain.handle("query:workspace-summary", (_event, environmentId?: string) =>
    hostAdapter.workspaceSummary(environmentId)
  );
  ipcMain.handle("query:desktop-model", (_event, environmentId?: string) =>
    hostAdapter.desktopModel(environmentId)
  );
  ipcMain.handle("query:environment-events", (_event, input) => hostAdapter.environmentEvents(input));
  ipcMain.handle("query:console-log-stream", (_event, input) => hostAdapter.consoleLogStream(input));
  ipcMain.handle("query:diagnostic-report-list", (_event, environmentId?: string) =>
    hostAdapter.diagnosticReportList(environmentId)
  );
  ipcMain.handle("query:diagnostic-report-detail", (_event, reportId: string, environmentId?: string) =>
    hostAdapter.diagnosticReportDetail(reportId, environmentId)
  );
  ipcMain.handle("query:artifact-list", (_event, environmentId?: string) =>
    hostAdapter.artifactList(environmentId)
  );
  ipcMain.handle("query:artifact-detail", (_event, artifactId: string, environmentId?: string) =>
    hostAdapter.artifactDetail(artifactId, environmentId)
  );
  ipcMain.handle("query:thread-list", (_event, environmentId?: string) =>
    hostAdapter.threadList(environmentId)
  );
  ipcMain.handle("query:thread-detail", (_event, threadId: string, environmentId?: string) =>
    hostAdapter.threadDetail(threadId, environmentId)
  );
  ipcMain.handle("query:turn-detail", (_event, turnId: string, environmentId?: string) =>
    hostAdapter.turnDetail(turnId, environmentId)
  );
  ipcMain.handle("query:memory-list", (_event, environmentId?: string) =>
    hostAdapter.memoryList(environmentId)
  );
  ipcMain.handle("query:memory-detail", (_event, memoryId: string, environmentId?: string) =>
    hostAdapter.memoryDetail(memoryId, environmentId)
  );
  ipcMain.handle("query:runtime-summary", (_event, environmentId?: string) =>
    hostAdapter.runtimeSummary(environmentId)
  );
  ipcMain.handle("query:runtime-telemetry-snapshot", (_event, environmentId?: string) =>
    hostAdapter.runtimeTelemetrySnapshot(environmentId)
  );
  ipcMain.handle("query:runtime-inspect-symbol", (_event, input) =>
    hostAdapter.runtimeInspectSymbol(input)
  );
  ipcMain.handle("query:runtime-entity-detail", (_event, input) =>
    hostAdapter.runtimeEntityDetail(input)
  );
  ipcMain.handle("query:package-browser", (_event, input) => hostAdapter.packageBrowser(input));
  ipcMain.handle("query:file-system-directory", (_event, input) => hostAdapter.fileSystemDirectory(input));
  ipcMain.handle("query:source-preview", (_event, input) => hostAdapter.sourcePreview(input));
  ipcMain.handle("query:approval-request-list", (_event, environmentId?: string) =>
    hostAdapter.approvalRequestList(environmentId)
  );
  ipcMain.handle("query:approval-request-detail", (_event, requestId: string, environmentId?: string) =>
    hostAdapter.approvalRequestDetail(requestId, environmentId)
  );
  ipcMain.handle("query:incident-list", (_event, environmentId?: string) =>
    hostAdapter.incidentList(environmentId)
  );
  ipcMain.handle("query:incident-detail", (_event, incidentId: string, environmentId?: string) =>
    hostAdapter.incidentDetail(incidentId, environmentId)
  );
  ipcMain.handle("query:work-item-list", (_event, environmentId?: string) =>
    hostAdapter.workItemList(environmentId)
  );
  ipcMain.handle("query:work-item-detail", (_event, workItemId: string, environmentId?: string) =>
    hostAdapter.workItemDetail(workItemId, environmentId)
  );
  ipcMain.handle("query:work-item-plan", (_event, workItemId: string, environmentId?: string) =>
    hostAdapter.workItemPlan(workItemId, environmentId)
  );
  ipcMain.handle(
    "query:workflow-record-detail",
    (_event, workflowRecordId: string, environmentId?: string) =>
      hostAdapter.workflowRecordDetail(workflowRecordId, environmentId)
  );
  ipcMain.handle("query:provider-profiles", (_event, environmentId?: string) =>
    hostAdapter.providerProfiles(environmentId)
  );
  ipcMain.handle("query:package-management-summary", (_event, environmentId?: string) =>
    hostAdapter.packageManagementSummary(environmentId)
  );
  ipcMain.handle("query:calculator-summary", (_event, environmentId?: string) =>
    hostAdapter.calculatorSummary(environmentId)
  );
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
  ipcMain.handle("command:write-source-file", (_event, input) =>
    hostAdapter.writeSourceFile(input)
  );
  ipcMain.handle("command:create-intent", (_event, input) =>
    hostAdapter.createIntent(input)
  );
  ipcMain.handle("command:create-project", (_event, input) =>
    hostAdapter.createProject(input)
  );
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
  ipcMain.handle("command:resume-work-item", (_event, input) =>
    hostAdapter.resumeWorkItem(input)
  );
  ipcMain.handle("command:quarantine-work-item", (_event, input) =>
    hostAdapter.quarantineWorkItem(input)
  );
  ipcMain.handle("command:rollback-work-item", (_event, input) =>
    hostAdapter.rollbackWorkItem(input)
  );
  ipcMain.handle("command:complete-work-item-validations", (_event, input) =>
    hostAdapter.completeWorkItemValidations(input)
  );
  ipcMain.handle("command:steer-work-item", (_event, input) =>
    hostAdapter.steerWorkItem(input)
  );
  ipcMain.handle("command:create-conversation-thread", (_event, input) =>
    hostAdapter.createConversationThread(input)
  );
  ipcMain.handle("command:update-conversation-thread", (_event, input) =>
    hostAdapter.updateConversationThread(input)
  );
  ipcMain.handle("command:update-memory", (_event, input) =>
    hostAdapter.updateMemory(input)
  );
  ipcMain.handle("command:delete-memory", (_event, input) =>
    hostAdapter.deleteMemory(input)
  );
  ipcMain.handle("command:send-conversation-message", (_event, input) =>
    hostAdapter.sendConversationMessage(input, (streamEvent) => {
      emitDesktopEvent(streamEvent);
      _event.sender.send("conversation:stream-event", streamEvent);
    })
  );
  ipcMain.handle("command:extract-conversation-attachment-text", (_event, input) =>
    hostAdapter.extractConversationAttachmentText(input)
  );
  ipcMain.handle("command:stage-source-change", (_event, input) =>
    hostAdapter.stageSourceChange(input)
  );
  ipcMain.handle("command:reload-source-file", (_event, input) =>
    hostAdapter.reloadSourceFile(input)
  );
  ipcMain.handle("command:desktop-action", (_event, input) =>
    hostAdapter.desktopAction(input)
  );
  ipcMain.handle("command:desktop-restore", (_event, input) =>
    hostAdapter.desktopRestore(input)
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

  ipcMain.handle("desktop:focus-workspace", (_event, workspace: WorkspaceId) =>
    hostAdapter.focusWorkspace(workspace)
  );
  ipcMain.handle("desktop:get-preferences", () => hostAdapter.getDesktopPreferences());
  ipcMain.handle("desktop:set-preferences", (_event, patch) =>
    hostAdapter.setDesktopPreferences(patch)
  );
  ipcMain.handle("desktop:quit-app", async () => {
    if (quitAppHandler) {
      await quitAppHandler();
      return;
    }
    await hostAdapter.quitApp();
  });
  ipcMain.handle("desktop:set-window-title", (event, title: string) => {
    BrowserWindow.fromWebContents(event.sender)?.setTitle(title);
  });
  ipcMain.handle("desktop:open-entity", (_event, ref) => hostAdapter.openEntityInNewWindow(ref));
  ipcMain.handle("desktop:list-documentation-pages", () => listDocumentationPages());
  ipcMain.handle("desktop:read-documentation-page", (_event, slug: string) =>
    readDocumentationPageBySlug(slug)
  );
  ipcMain.handle("desktop:open-external-link", (_event, url: string) => shell.openExternal(url));
  ipcMain.handle("events:subscribe", (event, input: EventSubscriptionInput) => {
    const subscriptionId = `subscription-${nextSubscriptionId++}`;
    eventSubscriptions.set(subscriptionId, {
      input,
      sender: event.sender
    });
    return { subscriptionId };
  });
  ipcMain.handle("events:unsubscribe", (_event, subscriptionId: string) => {
    eventSubscriptions.delete(subscriptionId);
  });
}
