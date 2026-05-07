import { contextBridge, ipcRenderer } from "electron";
import type {
  ConfigureProviderProfileInput,
  DesktopActionInput,
  DesktopRestoreInput,
  DesktopPreferencesDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EntityRefDto,
  EnvironmentEventDto,
  EventSubscriptionHandle,
  EventSubscriptionInput,
  ProviderProfileSummaryDto,
  QueryResultDto,
  SbclAgentDesktopApi,
  UpdateProviderRoutingInput,
  UseProviderProfileInput,
  WorkspaceId
} from "../shared/contracts";

const eventHandlers = new Map<string, (event: EnvironmentEventDto) => void>();
const pendingEvents = new Map<string, EnvironmentEventDto[]>();
const conversationStreamHandlers = new Map<string, (event: EnvironmentEventDto) => void>();
const menuActionHandlers = new Map<string, (action: string) => void>();
let nextConversationStreamSubscriptionId = 1;
let nextMenuActionSubscriptionId = 1;

ipcRenderer.on(
  "events:subscription-event",
  (_event, payload: { subscriptionId: string; event: EnvironmentEventDto }) => {
    const handler = eventHandlers.get(payload.subscriptionId);
    if (handler) {
      handler(payload.event);
      return;
    }

    const queued = pendingEvents.get(payload.subscriptionId) ?? [];
    queued.push(payload.event);
    pendingEvents.set(payload.subscriptionId, queued);
  }
);

ipcRenderer.on("conversation:stream-event", (_event, payload: EnvironmentEventDto) => {
  for (const handler of conversationStreamHandlers.values()) {
    handler(payload);
  }
});

ipcRenderer.on("menu:action", (_event, payload: { action: string }) => {
  for (const handler of menuActionHandlers.values()) {
    handler(payload.action);
  }
});

const api: SbclAgentDesktopApi = {
  host: {
    getHostStatus: () => ipcRenderer.invoke("host:get-status"),
    getCurrentBinding: () => ipcRenderer.invoke("host:get-current-binding"),
    setEnvironmentBinding: (environmentId: string) =>
      ipcRenderer.invoke("host:set-environment-binding", environmentId),
    getEnvironmentImageRegistry: () => ipcRenderer.invoke("host:get-environment-image-registry"),
    loadEnvironmentImage: (imageIdOrName: string) =>
      ipcRenderer.invoke("host:load-environment-image", imageIdOrName),
    saveEnvironmentImage: (input: { name: string; overwrite?: boolean }) =>
      ipcRenderer.invoke("host:save-environment-image", input),
    revertEnvironmentToImage: () => ipcRenderer.invoke("host:revert-environment-image")
  },
  query: {
    projectList: (environmentId?: string) => ipcRenderer.invoke("query:project-list", environmentId),
    projectDetail: (projectId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:project-detail", projectId, environmentId),
    projectTestingHarnessInventory: (environmentId?: string) =>
      ipcRenderer.invoke("query:project-testing-harness-inventory", environmentId),
    environmentSummary: (environmentId?: string) =>
      ipcRenderer.invoke("query:environment-summary", environmentId),
    environmentStatus: (environmentId?: string) =>
      ipcRenderer.invoke("query:environment-status", environmentId),
    workspaceSummary: (environmentId?: string) =>
      ipcRenderer.invoke("query:workspace-summary", environmentId),
    desktopModel: (environmentId?: string) =>
      ipcRenderer.invoke("query:desktop-model", environmentId),
    environmentEvents: (input) => ipcRenderer.invoke("query:environment-events", input),
    consoleLogStream: (input) => ipcRenderer.invoke("query:console-log-stream", input),
    diagnosticReportList: (environmentId?: string) =>
      ipcRenderer.invoke("query:diagnostic-report-list", environmentId),
    diagnosticReportDetail: (reportId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:diagnostic-report-detail", reportId, environmentId),
    artifactList: (environmentId?: string) => ipcRenderer.invoke("query:artifact-list", environmentId),
    artifactDetail: (artifactId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:artifact-detail", artifactId, environmentId),
    threadList: (environmentId?: string) => ipcRenderer.invoke("query:thread-list", environmentId),
    threadDetail: (threadId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:thread-detail", threadId, environmentId),
    turnDetail: (turnId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:turn-detail", turnId, environmentId),
    runtimeSummary: (environmentId?: string) => ipcRenderer.invoke("query:runtime-summary", environmentId),
    runtimeTelemetrySnapshot: (environmentId?: string) =>
      ipcRenderer.invoke("query:runtime-telemetry-snapshot", environmentId),
    runtimeInspectSymbol: (input) => ipcRenderer.invoke("query:runtime-inspect-symbol", input),
    runtimeEntityDetail: (input) => ipcRenderer.invoke("query:runtime-entity-detail", input),
    packageBrowser: (input) => ipcRenderer.invoke("query:package-browser", input),
    fileSystemDirectory: (input) => ipcRenderer.invoke("query:file-system-directory", input),
    sourcePreview: (input) => ipcRenderer.invoke("query:source-preview", input),
    approvalRequestList: (environmentId?: string) =>
      ipcRenderer.invoke("query:approval-request-list", environmentId),
    approvalRequestDetail: (requestId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:approval-request-detail", requestId, environmentId),
    incidentList: (environmentId?: string) => ipcRenderer.invoke("query:incident-list", environmentId),
    incidentDetail: (incidentId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:incident-detail", incidentId, environmentId),
    workItemList: (environmentId?: string) => ipcRenderer.invoke("query:work-item-list", environmentId),
    workItemDetail: (workItemId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:work-item-detail", workItemId, environmentId),
    workItemPlan: (workItemId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:work-item-plan", workItemId, environmentId),
    workflowRecordDetail: (workflowRecordId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:workflow-record-detail", workflowRecordId, environmentId),
    providerProfiles: (environmentId?: string): Promise<QueryResultDto<ProviderProfileSummaryDto>> =>
      ipcRenderer.invoke("query:provider-profiles", environmentId),
    packageManagementSummary: (environmentId?: string) =>
      ipcRenderer.invoke("query:package-management-summary", environmentId)
  },
  command: {
    createIntent: (input) => ipcRenderer.invoke("command:create-intent", input),
    createProject: (input) => ipcRenderer.invoke("command:create-project", input),
    updateProjectConstitution: (input) => ipcRenderer.invoke("command:update-project-constitution", input),
    updateProjectDesignSystem: (input) => ipcRenderer.invoke("command:update-project-design-system", input),
    updateProjectStyleGuide: (input) => ipcRenderer.invoke("command:update-project-style-guide", input),
    updateProjectTestingStrategy: (input) => ipcRenderer.invoke("command:update-project-testing-strategy", input),
    updateProjectReleaseReadiness: (input) => ipcRenderer.invoke("command:update-project-release-readiness", input),
    updateProjectReadinessObligations: (input) => ipcRenderer.invoke("command:update-project-readiness-obligations", input),
    appendProjectRequirement: (input) => ipcRenderer.invoke("command:append-project-requirement", input),
    appendProjectFeatureSpecification: (input) =>
      ipcRenderer.invoke("command:append-project-feature-specification", input),
    appendProjectUserJourney: (input) => ipcRenderer.invoke("command:append-project-user-journey", input),
    appendProjectArchitectureDecision: (input) =>
      ipcRenderer.invoke("command:append-project-architecture-decision", input),
    appendProjectSourceRoot: (input) => ipcRenderer.invoke("command:append-project-source-root", input),
    bindProjectTestingHarness: (input) => ipcRenderer.invoke("command:bind-project-testing-harness", input),
    appendProjectQualityGate: (input) => ipcRenderer.invoke("command:append-project-quality-gate", input),
    updateIncidentRemediationPlan: (input) =>
      ipcRenderer.invoke("command:update-incident-remediation-plan", input),
    resumeWorkItem: (input) => ipcRenderer.invoke("command:resume-work-item", input),
    quarantineWorkItem: (input) => ipcRenderer.invoke("command:quarantine-work-item", input),
    rollbackWorkItem: (input) => ipcRenderer.invoke("command:rollback-work-item", input),
    completeWorkItemValidations: (input) => ipcRenderer.invoke("command:complete-work-item-validations", input),
    steerWorkItem: (input) => ipcRenderer.invoke("command:steer-work-item", input),
    createConversationThread: (input) => ipcRenderer.invoke("command:create-conversation-thread", input),
    updateConversationThread: (input) => ipcRenderer.invoke("command:update-conversation-thread", input),
    sendConversationMessage: (input) => ipcRenderer.invoke("command:send-conversation-message", input),
    extractConversationAttachmentText: (input) =>
      ipcRenderer.invoke("command:extract-conversation-attachment-text", input),
    evaluateInContext: (input) => ipcRenderer.invoke("command:evaluate-in-context", input),
    stageSourceChange: (input) => ipcRenderer.invoke("command:stage-source-change", input),
    writeSourceFile: (input) => ipcRenderer.invoke("command:write-source-file", input),
    reloadSourceFile: (input) => ipcRenderer.invoke("command:reload-source-file", input),
    desktopAction: (input: DesktopActionInput) => ipcRenderer.invoke("command:desktop-action", input),
    desktopRestore: (input: DesktopRestoreInput) =>
      ipcRenderer.invoke("command:desktop-restore", input),
    approveRequest: (input) => ipcRenderer.invoke("command:approve-request", input),
    denyRequest: (input) => ipcRenderer.invoke("command:deny-request", input),
    configureProviderProfile: (input: ConfigureProviderProfileInput) =>
      ipcRenderer.invoke("command:configure-provider-profile", input),
    useProviderProfile: (input: UseProviderProfileInput) =>
      ipcRenderer.invoke("command:use-provider-profile", input),
    updateProviderRouting: (input: UpdateProviderRoutingInput) =>
      ipcRenderer.invoke("command:update-provider-routing", input),
    installQuicklispPackage: (input) => ipcRenderer.invoke("command:install-quicklisp-package", input),
    runQlotCommand: (input) => ipcRenderer.invoke("command:run-qlot-command", input),
    addSourceRegistryEntry: (input) => ipcRenderer.invoke("command:add-source-registry-entry", input),
    updateSourceRegistryEntry: (input) => ipcRenderer.invoke("command:update-source-registry-entry", input),
    removeSourceRegistryEntry: (input) => ipcRenderer.invoke("command:remove-source-registry-entry", input),
    addLocalProject: (input) => ipcRenderer.invoke("command:add-local-project", input),
    removeLocalProject: (input) => ipcRenderer.invoke("command:remove-local-project", input)
  },
  events: {
    subscribeEnvironmentEvents: async (
      input: EventSubscriptionInput,
      handler: (event: EnvironmentEventDto) => void
    ): Promise<EventSubscriptionHandle> => {
      const handle = (await ipcRenderer.invoke("events:subscribe", input)) as EventSubscriptionHandle;
      eventHandlers.set(handle.subscriptionId, handler);
      const queued = pendingEvents.get(handle.subscriptionId) ?? [];
      for (const event of queued) {
        handler(event);
      }
      pendingEvents.delete(handle.subscriptionId);
      return handle;
    },
    subscribeConversationStream: async (
      handler: (event: EnvironmentEventDto) => void
    ): Promise<EventSubscriptionHandle> => {
      const subscriptionId = `conversation-stream-${nextConversationStreamSubscriptionId++}`;
      conversationStreamHandlers.set(subscriptionId, handler);
      return { subscriptionId };
    },
    unsubscribe: async (subscriptionId: string): Promise<void> => {
      eventHandlers.delete(subscriptionId);
      pendingEvents.delete(subscriptionId);
      if (menuActionHandlers.delete(subscriptionId)) {
        return;
      }
      if (conversationStreamHandlers.delete(subscriptionId)) {
        return;
      }
      await ipcRenderer.invoke("events:unsubscribe", subscriptionId);
    }
  },
  desktop: {
    focusWorkspace: (workspace: WorkspaceId) =>
      ipcRenderer.invoke("desktop:focus-workspace", workspace),
    getDesktopPreferences: (): Promise<DesktopPreferencesDto> =>
      ipcRenderer.invoke("desktop:get-preferences"),
    setDesktopPreferences: (patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto> =>
      ipcRenderer.invoke("desktop:set-preferences", patch),
    quitApp: (): Promise<void> => ipcRenderer.invoke("desktop:quit-app"),
    setWindowTitle: (title: string): Promise<void> => ipcRenderer.invoke("desktop:set-window-title", title),
    openEntityInNewWindow: (ref: EntityRefDto) => ipcRenderer.invoke("desktop:open-entity", ref),
    listDocumentationPages: (): Promise<DocumentationPageSummaryDto[]> =>
      ipcRenderer.invoke("desktop:list-documentation-pages"),
    readDocumentationPage: (slug: string): Promise<DocumentationPageDto> =>
      ipcRenderer.invoke("desktop:read-documentation-page", slug),
    openExternalLink: (url: string): Promise<void> => ipcRenderer.invoke("desktop:open-external-link", url),
    subscribeMenuActions: async (handler: (action: string) => void): Promise<EventSubscriptionHandle> => {
      const subscriptionId = `menu-action-${nextMenuActionSubscriptionId++}`;
      menuActionHandlers.set(subscriptionId, handler);
      return { subscriptionId };
    }
  }
};

contextBridge.exposeInMainWorld("sbclAgentDesktop", api);
