import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  ArtifactDetailDto,
  ArtifactSummaryDto,
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  CommandResultDto,
  ConsoleLogStreamDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EnvironmentEventDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeEvalResultDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetrySnapshotDto,
  SourceMutationResultDto,
  SourcePreviewDto,
  SourceReloadResultDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkflowRecordDto
} from "../../shared/contracts";

export interface RuntimeBrowserState {
  runtimeSummary: RuntimeSummaryDto | null;
  setRuntimeSummary: Dispatch<SetStateAction<RuntimeSummaryDto | null>>;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  setRuntimeTelemetry: Dispatch<SetStateAction<RuntimeTelemetrySnapshotDto | null>>;
  selectedTelemetryProcessId: string | null;
  setSelectedTelemetryProcessId: Dispatch<SetStateAction<string | null>>;
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  setConsoleLogStream: Dispatch<SetStateAction<QueryResultDto<ConsoleLogStreamDto> | null>>;
  environmentConsoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  setEnvironmentConsoleLogStream: Dispatch<SetStateAction<QueryResultDto<ConsoleLogStreamDto> | null>>;
  hostConsoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  setHostConsoleLogStream: Dispatch<SetStateAction<QueryResultDto<ConsoleLogStreamDto> | null>>;
  selectedConsolePlane: "environment" | "host";
  setSelectedConsolePlane: Dispatch<SetStateAction<"environment" | "host">>;
  selectedConsoleSourceFilter: string;
  setSelectedConsoleSourceFilter: Dispatch<SetStateAction<string>>;
  selectedConsoleEntryId: string | null;
  setSelectedConsoleEntryId: Dispatch<SetStateAction<string | null>>;
  diagnosticReports: DiagnosticReportSummaryDto[];
  setDiagnosticReports: Dispatch<SetStateAction<DiagnosticReportSummaryDto[]>>;
  selectedDiagnosticSourceFilter: string;
  setSelectedDiagnosticSourceFilter: Dispatch<SetStateAction<string>>;
  selectedDiagnosticReportId: string | null;
  setSelectedDiagnosticReportId: Dispatch<SetStateAction<string | null>>;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  setSelectedDiagnosticReport: Dispatch<SetStateAction<DiagnosticReportDetailDto | null>>;
  runtimeForm: string;
  setRuntimeForm: Dispatch<SetStateAction<string>>;
  runtimeResult: CommandResultDto<RuntimeEvalResultDto> | null;
  setRuntimeResult: Dispatch<SetStateAction<CommandResultDto<RuntimeEvalResultDto> | null>>;
  runtimeRecoveryLaunch: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
  setRuntimeRecoveryLaunch: Dispatch<
    SetStateAction<{
      source: "incident-restart";
      incidentId: string;
      restartLabel: string;
    } | null>
  >;
  runtimeInspectorSymbol: string;
  setRuntimeInspectorSymbol: Dispatch<SetStateAction<string>>;
  runtimeInspectorPackage: string;
  setRuntimeInspectorPackage: Dispatch<SetStateAction<string>>;
  runtimeInspectionMode: RuntimeInspectionMode;
  setRuntimeInspectionMode: Dispatch<SetStateAction<RuntimeInspectionMode>>;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  setRuntimeInspection: Dispatch<SetStateAction<QueryResultDto<RuntimeInspectionResultDto> | null>>;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  setRuntimeEntityDetail: Dispatch<SetStateAction<QueryResultDto<RuntimeEntityDetailDto> | null>>;
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  setPackageBrowser: Dispatch<SetStateAction<QueryResultDto<PackageBrowserDto> | null>>;
  selectedPackageName: string;
  setSelectedPackageName: Dispatch<SetStateAction<string>>;
  isEvaluating: boolean;
  setIsEvaluating: Dispatch<SetStateAction<boolean>>;
  isInspectingRuntime: boolean;
  setIsInspectingRuntime: Dispatch<SetStateAction<boolean>>;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  setSourcePreview: Dispatch<SetStateAction<QueryResultDto<SourcePreviewDto> | null>>;
  sourceDraft: string;
  setSourceDraft: Dispatch<SetStateAction<string>>;
  isEditingSource: boolean;
  setIsEditingSource: Dispatch<SetStateAction<boolean>>;
  isStagingSource: boolean;
  setIsStagingSource: Dispatch<SetStateAction<boolean>>;
  isReloadingSource: boolean;
  setIsReloadingSource: Dispatch<SetStateAction<boolean>>;
  sourceMutationResult: CommandResultDto<SourceMutationResultDto> | null;
  setSourceMutationResult: Dispatch<SetStateAction<CommandResultDto<SourceMutationResultDto> | null>>;
  sourceReloadResult: CommandResultDto<SourceReloadResultDto> | null;
  setSourceReloadResult: Dispatch<SetStateAction<CommandResultDto<SourceReloadResultDto> | null>>;
  approvalRequests: ApprovalRequestSummaryDto[];
  setApprovalRequests: Dispatch<SetStateAction<ApprovalRequestSummaryDto[]>>;
  selectedApprovalId: string | null;
  setSelectedApprovalId: Dispatch<SetStateAction<string | null>>;
  selectedApproval: ApprovalRequestDto | null;
  setSelectedApproval: Dispatch<SetStateAction<ApprovalRequestDto | null>>;
  approvalDecision: CommandResultDto<ApprovalDecisionDto> | null;
  setApprovalDecision: Dispatch<SetStateAction<CommandResultDto<ApprovalDecisionDto> | null>>;
  isDecidingApproval: boolean;
  setIsDecidingApproval: Dispatch<SetStateAction<boolean>>;
  incidents: IncidentSummaryDto[];
  setIncidents: Dispatch<SetStateAction<IncidentSummaryDto[]>>;
  selectedIncidentId: string | null;
  setSelectedIncidentId: Dispatch<SetStateAction<string | null>>;
  selectedIncident: IncidentDetailDto | null;
  setSelectedIncident: Dispatch<SetStateAction<IncidentDetailDto | null>>;
  pendingIncidentFocusId: string | null;
  setPendingIncidentFocusId: Dispatch<SetStateAction<string | null>>;
  workItems: WorkItemSummaryDto[];
  setWorkItems: Dispatch<SetStateAction<WorkItemSummaryDto[]>>;
  selectedWorkItemId: string | null;
  setSelectedWorkItemId: Dispatch<SetStateAction<string | null>>;
  selectedWorkItem: WorkItemDetailDto | null;
  setSelectedWorkItem: Dispatch<SetStateAction<WorkItemDetailDto | null>>;
  selectedWorkItemPlan: WorkItemPlanDto | null;
  setSelectedWorkItemPlan: Dispatch<SetStateAction<WorkItemPlanDto | null>>;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  setSelectedWorkflowRecord: Dispatch<SetStateAction<WorkflowRecordDto | null>>;
  pendingWorkItemFocusId: string | null;
  setPendingWorkItemFocusId: Dispatch<SetStateAction<string | null>>;
  environmentEvents: EnvironmentEventDto[];
  setEnvironmentEvents: Dispatch<SetStateAction<EnvironmentEventDto[]>>;
  selectedEventCursor: number | null;
  setSelectedEventCursor: Dispatch<SetStateAction<number | null>>;
  eventFamilyFilter: string;
  setEventFamilyFilter: Dispatch<SetStateAction<string>>;
  eventVisibilityFilter: string;
  setEventVisibilityFilter: Dispatch<SetStateAction<string>>;
  selectedTranscriptSourceFilter:
    | "all"
    | "conversation"
    | "event"
    | "workspace"
    | "listener"
    | "environment-console"
    | "host-console";
  setSelectedTranscriptSourceFilter: Dispatch<
    SetStateAction<
      | "all"
      | "conversation"
      | "event"
      | "workspace"
      | "listener"
      | "environment-console"
      | "host-console"
    >
  >;
  selectedTranscriptEntryKey: string | null;
  setSelectedTranscriptEntryKey: Dispatch<SetStateAction<string | null>>;
  isTranscriptEventRefreshActive: boolean;
  setIsTranscriptEventRefreshActive: Dispatch<SetStateAction<boolean>>;
  documentationPages: DocumentationPageSummaryDto[];
  setDocumentationPages: Dispatch<SetStateAction<DocumentationPageSummaryDto[]>>;
  selectedDocumentationSlug: string;
  setSelectedDocumentationSlug: Dispatch<SetStateAction<string>>;
  selectedDocumentationPage: DocumentationPageDto | null;
  setSelectedDocumentationPage: Dispatch<SetStateAction<DocumentationPageDto | null>>;
  artifacts: ArtifactSummaryDto[];
  setArtifacts: Dispatch<SetStateAction<ArtifactSummaryDto[]>>;
  selectedArtifactId: string | null;
  setSelectedArtifactId: Dispatch<SetStateAction<string | null>>;
  selectedArtifact: ArtifactDetailDto | null;
  setSelectedArtifact: Dispatch<SetStateAction<ArtifactDetailDto | null>>;
}

export function useRuntimeBrowserState(): RuntimeBrowserState {
  const [runtimeSummary, setRuntimeSummary] = useState<RuntimeSummaryDto | null>(null);
  const [runtimeTelemetry, setRuntimeTelemetry] = useState<RuntimeTelemetrySnapshotDto | null>(null);
  const [selectedTelemetryProcessId, setSelectedTelemetryProcessId] = useState<string | null>(null);
  const [consoleLogStream, setConsoleLogStream] = useState<QueryResultDto<ConsoleLogStreamDto> | null>(null);
  const [environmentConsoleLogStream, setEnvironmentConsoleLogStream] = useState<QueryResultDto<ConsoleLogStreamDto> | null>(null);
  const [hostConsoleLogStream, setHostConsoleLogStream] = useState<QueryResultDto<ConsoleLogStreamDto> | null>(null);
  const [selectedConsolePlane, setSelectedConsolePlane] = useState<"environment" | "host">("environment");
  const [selectedConsoleSourceFilter, setSelectedConsoleSourceFilter] = useState("All Sources");
  const [selectedConsoleEntryId, setSelectedConsoleEntryId] = useState<string | null>(null);
  const [diagnosticReports, setDiagnosticReports] = useState<DiagnosticReportSummaryDto[]>([]);
  const [selectedDiagnosticSourceFilter, setSelectedDiagnosticSourceFilter] = useState("All Sources");
  const [selectedDiagnosticReportId, setSelectedDiagnosticReportId] = useState<string | null>(null);
  const [selectedDiagnosticReport, setSelectedDiagnosticReport] = useState<DiagnosticReportDetailDto | null>(null);
  const [runtimeForm, setRuntimeForm] = useState('(describe "sbcl-agent")');
  const [runtimeResult, setRuntimeResult] = useState<CommandResultDto<RuntimeEvalResultDto> | null>(null);
  const [runtimeRecoveryLaunch, setRuntimeRecoveryLaunch] = useState<{
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null>(null);
  const [runtimeInspectorSymbol, setRuntimeInspectorSymbol] = useState("CAR");
  const [runtimeInspectorPackage, setRuntimeInspectorPackage] = useState("");
  const [runtimeInspectionMode, setRuntimeInspectionMode] = useState<RuntimeInspectionMode>("describe");
  const [runtimeInspection, setRuntimeInspection] = useState<QueryResultDto<RuntimeInspectionResultDto> | null>(null);
  const [runtimeEntityDetail, setRuntimeEntityDetail] = useState<QueryResultDto<RuntimeEntityDetailDto> | null>(null);
  const [packageBrowser, setPackageBrowser] = useState<QueryResultDto<PackageBrowserDto> | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isInspectingRuntime, setIsInspectingRuntime] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<QueryResultDto<SourcePreviewDto> | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isStagingSource, setIsStagingSource] = useState(false);
  const [isReloadingSource, setIsReloadingSource] = useState(false);
  const [sourceMutationResult, setSourceMutationResult] = useState<CommandResultDto<SourceMutationResultDto> | null>(null);
  const [sourceReloadResult, setSourceReloadResult] = useState<CommandResultDto<SourceReloadResultDto> | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestSummaryDto[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestDto | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<CommandResultDto<ApprovalDecisionDto> | null>(null);
  const [isDecidingApproval, setIsDecidingApproval] = useState(false);
  const [incidents, setIncidents] = useState<IncidentSummaryDto[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetailDto | null>(null);
  const [pendingIncidentFocusId, setPendingIncidentFocusId] = useState<string | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemSummaryDto[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemDetailDto | null>(null);
  const [selectedWorkItemPlan, setSelectedWorkItemPlan] = useState<WorkItemPlanDto | null>(null);
  const [selectedWorkflowRecord, setSelectedWorkflowRecord] = useState<WorkflowRecordDto | null>(null);
  const [pendingWorkItemFocusId, setPendingWorkItemFocusId] = useState<string | null>(null);
  const [environmentEvents, setEnvironmentEvents] = useState<EnvironmentEventDto[]>([]);
  const [selectedEventCursor, setSelectedEventCursor] = useState<number | null>(null);
  const [eventFamilyFilter, setEventFamilyFilter] = useState<string>("all");
  const [eventVisibilityFilter, setEventVisibilityFilter] = useState<string>("all");
  const [selectedTranscriptSourceFilter, setSelectedTranscriptSourceFilter] = useState<
    | "all"
    | "conversation"
    | "event"
    | "workspace"
    | "listener"
    | "environment-console"
    | "host-console"
  >("all");
  const [selectedTranscriptEntryKey, setSelectedTranscriptEntryKey] = useState<string | null>(null);
  const [isTranscriptEventRefreshActive, setIsTranscriptEventRefreshActive] = useState(false);
  const [documentationPages, setDocumentationPages] = useState<DocumentationPageSummaryDto[]>([]);
  const [selectedDocumentationSlug, setSelectedDocumentationSlug] = useState<string>("development-model");
  const [selectedDocumentationPage, setSelectedDocumentationPage] = useState<DocumentationPageDto | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactSummaryDto[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDetailDto | null>(null);

  return {
    runtimeSummary,
    setRuntimeSummary,
    runtimeTelemetry,
    setRuntimeTelemetry,
    selectedTelemetryProcessId,
    setSelectedTelemetryProcessId,
    consoleLogStream,
    setConsoleLogStream,
    environmentConsoleLogStream,
    setEnvironmentConsoleLogStream,
    hostConsoleLogStream,
    setHostConsoleLogStream,
    selectedConsolePlane,
    setSelectedConsolePlane,
    selectedConsoleSourceFilter,
    setSelectedConsoleSourceFilter,
    selectedConsoleEntryId,
    setSelectedConsoleEntryId,
    diagnosticReports,
    setDiagnosticReports,
    selectedDiagnosticSourceFilter,
    setSelectedDiagnosticSourceFilter,
    selectedDiagnosticReportId,
    setSelectedDiagnosticReportId,
    selectedDiagnosticReport,
    setSelectedDiagnosticReport,
    runtimeForm,
    setRuntimeForm,
    runtimeResult,
    setRuntimeResult,
    runtimeRecoveryLaunch,
    setRuntimeRecoveryLaunch,
    runtimeInspectorSymbol,
    setRuntimeInspectorSymbol,
    runtimeInspectorPackage,
    setRuntimeInspectorPackage,
    runtimeInspectionMode,
    setRuntimeInspectionMode,
    runtimeInspection,
    setRuntimeInspection,
    runtimeEntityDetail,
    setRuntimeEntityDetail,
    packageBrowser,
    setPackageBrowser,
    selectedPackageName,
    setSelectedPackageName,
    isEvaluating,
    setIsEvaluating,
    isInspectingRuntime,
    setIsInspectingRuntime,
    sourcePreview,
    setSourcePreview,
    sourceDraft,
    setSourceDraft,
    isEditingSource,
    setIsEditingSource,
    isStagingSource,
    setIsStagingSource,
    isReloadingSource,
    setIsReloadingSource,
    sourceMutationResult,
    setSourceMutationResult,
    sourceReloadResult,
    setSourceReloadResult,
    approvalRequests,
    setApprovalRequests,
    selectedApprovalId,
    setSelectedApprovalId,
    selectedApproval,
    setSelectedApproval,
    approvalDecision,
    setApprovalDecision,
    isDecidingApproval,
    setIsDecidingApproval,
    incidents,
    setIncidents,
    selectedIncidentId,
    setSelectedIncidentId,
    selectedIncident,
    setSelectedIncident,
    pendingIncidentFocusId,
    setPendingIncidentFocusId,
    workItems,
    setWorkItems,
    selectedWorkItemId,
    setSelectedWorkItemId,
    selectedWorkItem,
    setSelectedWorkItem,
    selectedWorkItemPlan,
    setSelectedWorkItemPlan,
    selectedWorkflowRecord,
    setSelectedWorkflowRecord,
    pendingWorkItemFocusId,
    setPendingWorkItemFocusId,
    environmentEvents,
    setEnvironmentEvents,
    selectedEventCursor,
    setSelectedEventCursor,
    eventFamilyFilter,
    setEventFamilyFilter,
    eventVisibilityFilter,
    setEventVisibilityFilter,
    selectedTranscriptSourceFilter,
    setSelectedTranscriptSourceFilter,
    selectedTranscriptEntryKey,
    setSelectedTranscriptEntryKey,
    isTranscriptEventRefreshActive,
    setIsTranscriptEventRefreshActive,
    documentationPages,
    setDocumentationPages,
    selectedDocumentationSlug,
    setSelectedDocumentationSlug,
    selectedDocumentationPage,
    setSelectedDocumentationPage,
    artifacts,
    setArtifacts,
    selectedArtifactId,
    setSelectedArtifactId,
    selectedArtifact,
    setSelectedArtifact
  };
}
