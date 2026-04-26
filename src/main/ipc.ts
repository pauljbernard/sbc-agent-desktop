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

  ipcMain.handle("query:environment-summary", (_event, environmentId?: string) =>
    hostAdapter.environmentSummary(environmentId)
  );
  ipcMain.handle("query:environment-status", (_event, environmentId?: string) =>
    hostAdapter.environmentStatus(environmentId)
  );
  ipcMain.handle("query:workspace-summary", (_event, environmentId?: string) =>
    hostAdapter.workspaceSummary(environmentId)
  );
  ipcMain.handle("query:environment-events", (_event, input) => hostAdapter.environmentEvents(input));
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
  ipcMain.handle("query:runtime-summary", (_event, environmentId?: string) =>
    hostAdapter.runtimeSummary(environmentId)
  );
  ipcMain.handle("query:runtime-inspect-symbol", (_event, input) =>
    hostAdapter.runtimeInspectSymbol(input)
  );
  ipcMain.handle("query:runtime-entity-detail", (_event, input) =>
    hostAdapter.runtimeEntityDetail(input)
  );
  ipcMain.handle("query:package-browser", (_event, input) => hostAdapter.packageBrowser(input));
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
  ipcMain.handle(
    "query:workflow-record-detail",
    (_event, workflowRecordId: string, environmentId?: string) =>
      hostAdapter.workflowRecordDetail(workflowRecordId, environmentId)
  );
  ipcMain.handle("command:evaluate-in-context", (_event, input) =>
    hostAdapter.evaluateInContext(input)
  );
  ipcMain.handle("command:create-conversation-thread", (_event, input) =>
    hostAdapter.createConversationThread(input)
  );
  ipcMain.handle("command:update-conversation-thread", (_event, input) =>
    hostAdapter.updateConversationThread(input)
  );
  ipcMain.handle("command:send-conversation-message", (_event, input) =>
    hostAdapter.sendConversationMessage(input, (streamEvent) => {
      emitDesktopEvent(streamEvent);
      _event.sender.send("conversation:stream-event", streamEvent);
    })
  );
  ipcMain.handle("command:stage-source-change", (_event, input) =>
    hostAdapter.stageSourceChange(input)
  );
  ipcMain.handle("command:reload-source-file", (_event, input) =>
    hostAdapter.reloadSourceFile(input)
  );
  ipcMain.handle("command:approve-request", (_event, input) => hostAdapter.approveRequest(input));
  ipcMain.handle("command:deny-request", (_event, input) => hostAdapter.denyRequest(input));

  ipcMain.handle("desktop:focus-workspace", (_event, workspace: WorkspaceId) =>
    hostAdapter.focusWorkspace(workspace)
  );
  ipcMain.handle("desktop:get-preferences", () => hostAdapter.getDesktopPreferences());
  ipcMain.handle("desktop:set-preferences", (_event, patch) =>
    hostAdapter.setDesktopPreferences(patch)
  );
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
