import { ipcMain } from "electron";
import type { IpcHandlerContext } from "../context";

export function registerQueryIpcHandlers({ hostAdapter }: IpcHandlerContext): void {
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
  ipcMain.handle("query:environment-bootstrap", (_event, environmentId?: string) =>
    hostAdapter.environmentBootstrap(environmentId)
  );
  ipcMain.handle("query:environment-events", (_event, input) => hostAdapter.environmentEvents(input));
  ipcMain.handle("query:transcript-workspace", (_event, input) =>
    hostAdapter.transcriptWorkspace(input)
  );
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
  ipcMain.handle("query:conversation-workspace", (_event, input) =>
    hostAdapter.conversationWorkspace(input)
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
  ipcMain.handle("query:conversation-latency", (_event, turnId: string, environmentId?: string) =>
    hostAdapter.conversationLatency(turnId, environmentId)
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
  ipcMain.handle("query:runtime-symbol-page", (_event, input) => hostAdapter.runtimeSymbolPage(input));
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
  ipcMain.handle("query:orchestration-list", (_event, environmentId?: string) =>
    hostAdapter.orchestrationList(environmentId)
  );
  ipcMain.handle("query:orchestration-inbox", (_event, environmentId?: string) =>
    hostAdapter.orchestrationInbox(environmentId)
  );
  ipcMain.handle("query:orchestration-focus", (_event, input) =>
    hostAdapter.orchestrationFocus(input)
  );
  ipcMain.handle("query:orchestration-snapshot", (_event, input) =>
    hostAdapter.orchestrationSnapshot(input)
  );
  ipcMain.handle("query:plan-verification", (_event, input) =>
    hostAdapter.planVerification(input)
  );
  ipcMain.handle("query:provider-profiles", (_event, environmentId?: string) =>
    hostAdapter.providerProfiles(environmentId)
  );
  ipcMain.handle("query:package-management-summary", (_event, environmentId?: string) =>
    hostAdapter.packageManagementSummary(environmentId)
  );
  ipcMain.handle("query:desktop-task-manifests", (_event, environmentId?: string) =>
    hostAdapter.desktopTaskManifests(environmentId)
  );
  ipcMain.handle("query:desktop-task-records", (_event, environmentId?: string) =>
    hostAdapter.desktopTaskRecords(environmentId)
  );
  ipcMain.handle("query:desktop-task-pending-approval", (_event, environmentId?: string) =>
    hostAdapter.desktopTaskPendingApproval(environmentId)
  );
  ipcMain.handle("query:desktop-task-actor-flow", (_event, input) =>
    hostAdapter.desktopTaskActorFlow(input)
  );
  ipcMain.handle("query:desktop-task-actor-system-panel", (_event, input) =>
    hostAdapter.desktopTaskActorSystemPanel(input)
  );
  ipcMain.handle("query:desktop-task-actor-trace", (_event, input) =>
    hostAdapter.desktopTaskActorTrace(input)
  );
  ipcMain.handle("query:desktop-task-dlq", (_event, input) =>
    hostAdapter.desktopTaskDeadLetterQueue(input)
  );
  ipcMain.handle("query:mcp-server-configs", (_event, environmentId?: string) =>
    hostAdapter.mcpServerConfigs(environmentId)
  );
  ipcMain.handle("query:mcp-server-config", (_event, serverId: string, environmentId?: string) =>
    hostAdapter.mcpServerConfig(serverId, environmentId)
  );
  ipcMain.handle("query:calculator-summary", (_event, environmentId?: string) =>
    hostAdapter.calculatorSummary(environmentId)
  );
}
