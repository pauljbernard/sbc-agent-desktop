import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopPreferencesDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EntityRefDto,
  EnvironmentEventDto,
  EventSubscriptionHandle,
  EventSubscriptionInput,
  SbclAgentDesktopApi,
  WorkspaceId
} from "../shared/contracts";

const api: SbclAgentDesktopApi = {
  host: {
    getHostStatus: () => ipcRenderer.invoke("host:get-status"),
    getCurrentBinding: () => ipcRenderer.invoke("host:get-current-binding"),
    setEnvironmentBinding: (environmentId: string) =>
      ipcRenderer.invoke("host:set-environment-binding", environmentId)
  },
  query: {
    environmentSummary: (environmentId?: string) =>
      ipcRenderer.invoke("query:environment-summary", environmentId),
    environmentStatus: (environmentId?: string) =>
      ipcRenderer.invoke("query:environment-status", environmentId),
    environmentEvents: (input) => ipcRenderer.invoke("query:environment-events", input),
    artifactList: (environmentId?: string) => ipcRenderer.invoke("query:artifact-list", environmentId),
    artifactDetail: (artifactId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:artifact-detail", artifactId, environmentId),
    threadList: (environmentId?: string) => ipcRenderer.invoke("query:thread-list", environmentId),
    threadDetail: (threadId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:thread-detail", threadId, environmentId),
    turnDetail: (turnId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:turn-detail", turnId, environmentId),
    runtimeSummary: (environmentId?: string) => ipcRenderer.invoke("query:runtime-summary", environmentId),
    runtimeInspectSymbol: (input) => ipcRenderer.invoke("query:runtime-inspect-symbol", input),
    runtimeEntityDetail: (input) => ipcRenderer.invoke("query:runtime-entity-detail", input),
    packageBrowser: (input) => ipcRenderer.invoke("query:package-browser", input),
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
    workflowRecordDetail: (workflowRecordId: string, environmentId?: string) =>
      ipcRenderer.invoke("query:workflow-record-detail", workflowRecordId, environmentId)
  },
  command: {
    evaluateInContext: (input) => ipcRenderer.invoke("command:evaluate-in-context", input),
    stageSourceChange: (input) => ipcRenderer.invoke("command:stage-source-change", input),
    reloadSourceFile: (input) => ipcRenderer.invoke("command:reload-source-file", input),
    approveRequest: (input) => ipcRenderer.invoke("command:approve-request", input),
    denyRequest: (input) => ipcRenderer.invoke("command:deny-request", input)
  },
  events: {
    subscribeEnvironmentEvents: async (
      input: EventSubscriptionInput,
      _handler: (event: EnvironmentEventDto) => void
    ): Promise<EventSubscriptionHandle> => ipcRenderer.invoke("events:subscribe", input),
    unsubscribe: async (subscriptionId: string): Promise<void> =>
      ipcRenderer.invoke("events:unsubscribe", subscriptionId)
  },
  desktop: {
    focusWorkspace: (workspace: WorkspaceId) =>
      ipcRenderer.invoke("desktop:focus-workspace", workspace),
    getDesktopPreferences: (): Promise<DesktopPreferencesDto> =>
      ipcRenderer.invoke("desktop:get-preferences"),
    setDesktopPreferences: (patch: Partial<DesktopPreferencesDto>): Promise<DesktopPreferencesDto> =>
      ipcRenderer.invoke("desktop:set-preferences", patch),
    openEntityInNewWindow: (ref: EntityRefDto) => ipcRenderer.invoke("desktop:open-entity", ref),
    listDocumentationPages: (): Promise<DocumentationPageSummaryDto[]> =>
      ipcRenderer.invoke("desktop:list-documentation-pages"),
    readDocumentationPage: (slug: string): Promise<DocumentationPageDto> =>
      ipcRenderer.invoke("desktop:read-documentation-page", slug),
    openExternalLink: (url: string): Promise<void> => ipcRenderer.invoke("desktop:open-external-link", url)
  }
};

contextBridge.exposeInMainWorld("sbclAgentDesktop", api);
