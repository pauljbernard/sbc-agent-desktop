import { ipcMain } from "electron";
import type { WorkspaceId } from "../shared/contracts";
import { hostAdapter } from "./host-adapter";

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
  ipcMain.handle("desktop:open-entity", (_event, ref) => hostAdapter.openEntityInNewWindow(ref));
  ipcMain.handle("events:subscribe", () => ({ subscriptionId: "mock-subscription" }));
  ipcMain.handle("events:unsubscribe", () => undefined);
}
