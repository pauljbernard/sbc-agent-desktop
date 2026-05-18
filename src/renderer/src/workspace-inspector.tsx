import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type RefObject, type SetStateAction } from "react";
import type {
  ApprovalRequestDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  BindingDto,
  CommandResultDto,
  ConfigureProviderProfileInput,
  ConsoleLogEntryDto,
  ConsoleLogStreamDto,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  DocumentationPageDto,
  EditorBufferStateDto,
  EnvironmentEventDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  IncidentDetailDto,
  LinkedEntityRefDto,
  McpServerConfigDto,
  MemoryEntryDto,
  MessageDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  ProjectDetailDto,
  ProjectProfileDto,
  ProjectSummaryDto,
  ProviderProfileSummaryDto,
  ProviderRoutingMode,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeEvalResultDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetryProcessDto,
  RuntimeTelemetrySnapshotDto,
  SourcePreviewDto,
  ThreadDetailDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import { browserDomains, type BrowserDomain } from "./browser-support";
import { labelForWorkspace } from "./workspace-shell";
import {
  buildMcpServerDraft,
  buildProviderProfileDraft,
  canonicalDesktopTaskCoordinate,
  configurationSections,
  LLM_PROVIDER_PRESETS,
  llmProviderPresetForProfile,
  normalizeParenDepthColors
} from "./configuration-support";
import { LinkedEntityList } from "./interaction-support";
import { DetailRow } from "./journey-support";
import { renderDocumentationMarkdown } from "./rendering-support";
import type {
  ConfigurationSection,
  ConversationSection,
  EvidenceSection,
  OperateSection,
  ResolvedTheme,
  ThemePreference
} from "./shell-workspace-state";
import type { McpServerDraft } from "./configuration-workspace-state";
import { Badge } from "./surface-support";
import type { TranscriptSurfaceEntry } from "./transcript-surface";

export function WorkspaceInspector({
  activeWorkspace,
  binding,
  onToggleInspector,
  panelRef,
  summary,
  status,
  selectedThread,
  selectedTurn,
  conversationDraft,
  conversationRecoveryHandoff,
  runtimeRecoveryLaunch,
  selectedConversationSection,
  selectedConfigurationSection,
  runtimeEntityDetail,
  runtimeSummary,
  runtimeInspection,
  runtimeTelemetry,
  consoleLogStream,
  diagnosticReports,
  selectedConsolePlane,
  selectedConsoleSourceFilter,
  visibleConsoleEntryCount,
  selectedDiagnosticSourceFilter,
  visibleDiagnosticReportCount,
  transcriptEntries,
  currentWorkspaceHistoryCount,
  currentReplHistoryCount,
  memoryEntries,
  currentProject,
  selectedProjectDetail,
  selectedProjectSummary,
  runtimeForm,
  lispParenColors,
  resolvedTheme,
  sourcePreview,
  workspaceDraft,
  workspaceResult,
  workspaceTitle,
  selectedApproval,
  selectedWorkItem,
  selectedWorkItemPlan,
  selectedWorkflowRecord,
  selectedIncident,
  selectedMemory,
  selectedArtifact,
  selectedConsoleEntry,
  selectedConversationMessage,
  selectedEvent,
  selectedBrowserDomain,
  selectedOperateSection,
  selectedTelemetryProcess,
  selectedDiagnosticReport,
  selectedDiagnosticReportSummary,
  currentEditorChangedFormCount,
  currentEditorBufferDirty,
  currentEditorBufferTitle,
  currentEditorBuffers,
  editorDraft,
  editorResult,
  editorPackage,
  currentEditorCursorSymbol,
  currentEditorCursorSymbolPackage,
  currentEditorCursorSymbolHelp,
  selectedDocumentationPage,
  selectedEvidenceSection,
  systemTheme,
  themePreference,
  providerSummary,
  packageManagementSummary,
  desktopTaskManifests,
  desktopTaskRecords,
  desktopTaskActorTrace,
  desktopTaskDeadLetters,
  orchestrationInbox,
  orchestrationFocus,
  orchestrationSnapshot,
  planVerification,
  mcpServerConfigs,
  packageManagementStatusMessage,
  packageManagementError,
  packageManagementCommandResult,
  quicklispSystemDraft,
  qlotCommandDraft,
  sourceRegistryDraftPath,
  sourceRegistryEditOriginalPath,
  localProjectPathDraft,
  localProjectNameDraft,
  providerProfileDraft,
  selectedMcpServerId,
  mcpServerDraft,
  selectedProviderProfileName,
  providerProfileStatusMessage,
  providerProfileError,
  mcpServerStatusMessage,
  mcpServerError,
  isSavingProviderProfile,
  isUpdatingProviderRouting,
  isSavingMcpServer,
  isPackageManagementBusy,
  tooltipScalePercent,
  controlIconScalePercent,
  dockIconScalePercent,
  conversationTextScalePercent,
  sourceCodeTextScalePercent,
  openPublishedDocumentation,
  setSelectedConversationMessageId,
  updateLispParenColor,
  updateThemePreference,
  updateDesktopSurfaceScalePreference,
  setProviderProfileDraft,
  setSelectedProviderProfileName,
  setQuicklispSystemDraft,
  setQlotCommandDraft,
  setSourceRegistryDraftPath,
  setSourceRegistryEditOriginalPath,
  setLocalProjectPathDraft,
  setLocalProjectNameDraft,
  setSelectedMcpServerId,
  setMcpServerDraft,
  applyProviderRoutingMode,
  activateProviderProfile,
  saveProviderProfile,
  installQuicklispPackage,
  executeQlotCommand,
  saveSourceRegistryEntry,
  removeSourceRegistryPath,
  saveLocalProject,
  removeLocalProjectByName,
  saveMcpServer,
  removeMcpServer,
  artifacts,
  environmentEvents,
  workItems,
  navigateToLinkedEntity,
  renderChrome = true
}: {
  activeWorkspace: WorkspaceId;
  binding: BindingDto | null;
  onToggleInspector: () => void;
  panelRef?: RefObject<HTMLElement | null>;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  selectedThread: ThreadDetailDto | null;
  selectedTurn: TurnDetailDto | null;
  conversationDraft: string;
  conversationRecoveryHandoff: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
  runtimeRecoveryLaunch: {
    source: "incident-restart";
    incidentId: string;
    restartLabel: string;
  } | null;
  selectedConversationSection: ConversationSection;
  selectedConfigurationSection: ConfigurationSection;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  diagnosticReports: DiagnosticReportSummaryDto[];
  selectedConsolePlane: "environment" | "host";
  selectedConsoleSourceFilter: string;
  visibleConsoleEntryCount: number;
  selectedDiagnosticSourceFilter: string;
  visibleDiagnosticReportCount: number;
  transcriptEntries: TranscriptSurfaceEntry[];
  currentWorkspaceHistoryCount: number;
  currentReplHistoryCount: number;
  memoryEntries: MemoryEntryDto[];
  currentProject: ProjectProfileDto | null;
  selectedProjectDetail: ProjectDetailDto | null;
  selectedProjectSummary: ProjectSummaryDto | null;
  runtimeForm: string;
  lispParenColors: string[];
  resolvedTheme: ResolvedTheme;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  workspaceDraft: string;
  workspaceResult: CommandResultDto<RuntimeEvalResultDto> | null;
  workspaceTitle: string;
  selectedApproval: ApprovalRequestDto | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkItemPlan: WorkItemPlanDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  selectedIncident: IncidentDetailDto | null;
  selectedMemory: MemoryEntryDto | null;
  selectedArtifact: ArtifactDetailDto | null;
  selectedConsoleEntry: ConsoleLogEntryDto | null;
  selectedConversationMessage: MessageDto | null;
  selectedEvent: EnvironmentEventDto | null;
  selectedBrowserDomain: BrowserDomain;
  selectedOperateSection: OperateSection;
  selectedTelemetryProcess: RuntimeTelemetryProcessDto | null;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  selectedDiagnosticReportSummary: DiagnosticReportSummaryDto | null;
  currentEditorChangedFormCount: number;
  currentEditorBufferDirty: boolean;
  currentEditorBufferTitle: string;
  currentEditorBuffers: EditorBufferStateDto[];
  editorDraft: string;
  editorResult: CommandResultDto<RuntimeEvalResultDto> | null;
  editorPackage: string;
  currentEditorCursorSymbol: string | null;
  currentEditorCursorSymbolPackage: string;
  currentEditorCursorSymbolHelp: {
    detail: string;
    info: string;
    type?: string;
    packageName?: string;
    signature?: string | null;
  } | null;
  selectedDocumentationPage: DocumentationPageDto | null;
  selectedEvidenceSection: EvidenceSection;
  systemTheme: ResolvedTheme;
  themePreference: ThemePreference;
  providerSummary: ProviderProfileSummaryDto | null;
  packageManagementSummary: PackageManagementSummaryDto | null;
  desktopTaskManifests: DesktopTaskManifestDto[];
  desktopTaskRecords: DesktopTaskRecordDto[];
  desktopTaskActorTrace: Record<string, unknown>[];
  desktopTaskDeadLetters: Record<string, unknown>[];
  orchestrationInbox: Record<string, unknown>[];
  orchestrationFocus: Record<string, unknown> | null;
  orchestrationSnapshot: Record<string, unknown> | null;
  planVerification: Record<string, unknown> | null;
  mcpServerConfigs: McpServerConfigDto[];
  packageManagementStatusMessage: string | null;
  packageManagementError: string | null;
  packageManagementCommandResult: PackageManagementCommandResultDto | null;
  quicklispSystemDraft: string;
  qlotCommandDraft: string;
  sourceRegistryDraftPath: string;
  sourceRegistryEditOriginalPath: string | null;
  localProjectPathDraft: string;
  localProjectNameDraft: string;
  providerProfileDraft: ConfigureProviderProfileInput;
  selectedMcpServerId: string | null;
  mcpServerDraft: McpServerDraft;
  selectedProviderProfileName: string;
  providerProfileStatusMessage: string | null;
  providerProfileError: string | null;
  mcpServerStatusMessage: string | null;
  mcpServerError: string | null;
  isSavingProviderProfile: boolean;
  isUpdatingProviderRouting: boolean;
  isSavingMcpServer: boolean;
  isPackageManagementBusy: boolean;
  tooltipScalePercent: number;
  controlIconScalePercent: number;
  dockIconScalePercent: number;
  conversationTextScalePercent: number;
  sourceCodeTextScalePercent: number;
  openPublishedDocumentation: () => Promise<void>;
  setSelectedConversationMessageId: (messageId: string | null) => void;
  updateLispParenColor: (index: number, color: string) => Promise<void>;
  updateThemePreference: (value: ThemePreference) => Promise<void>;
  updateDesktopSurfaceScalePreference: (
    key: "tooltipScalePercent" | "controlIconScalePercent" | "dockIconScalePercent" | "conversationTextScalePercent" | "sourceCodeTextScalePercent",
    value: number
  ) => Promise<void>;
  setProviderProfileDraft: Dispatch<SetStateAction<ConfigureProviderProfileInput>>;
  setSelectedProviderProfileName: Dispatch<SetStateAction<string>>;
  setQuicklispSystemDraft: Dispatch<SetStateAction<string>>;
  setQlotCommandDraft: Dispatch<SetStateAction<string>>;
  setSourceRegistryDraftPath: Dispatch<SetStateAction<string>>;
  setSourceRegistryEditOriginalPath: Dispatch<SetStateAction<string | null>>;
  setLocalProjectPathDraft: Dispatch<SetStateAction<string>>;
  setLocalProjectNameDraft: Dispatch<SetStateAction<string>>;
  setSelectedMcpServerId: Dispatch<SetStateAction<string | null>>;
  setMcpServerDraft: Dispatch<SetStateAction<McpServerDraft>>;
  applyProviderRoutingMode: (mode: ProviderRoutingMode) => Promise<void>;
  activateProviderProfile: (profileName: string) => Promise<void>;
  saveProviderProfile: (clearApiKey?: boolean) => Promise<void>;
  installQuicklispPackage: () => Promise<void>;
  executeQlotCommand: () => Promise<void>;
  saveSourceRegistryEntry: () => Promise<void>;
  removeSourceRegistryPath: (path: string) => Promise<void>;
  saveLocalProject: () => Promise<void>;
  removeLocalProjectByName: (name: string) => Promise<void>;
  saveMcpServer: () => Promise<void>;
  removeMcpServer: (serverId: string) => Promise<void>;
  artifacts: ArtifactSummaryDto[];
  environmentEvents: EnvironmentEventDto[];
  workItems: WorkItemSummaryDto[];
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  renderChrome?: boolean;
}) {
  const selectedConfigurationDescriptor =
    configurationSections.find((section) => section.id === selectedConfigurationSection) ?? configurationSections[0];
  const selectedConfigurationCurrentValue =
    selectedConfigurationSection === "theme"
      ? themePreference === "system"
        ? "System"
        : themePreference
      : selectedConfigurationSection === "lisp-code-view"
        ? `${normalizeParenDepthColors(lispParenColors).length} depth colors`
      : selectedConfigurationSection === "llm"
          ? `${providerSummary?.routingMode ?? "auto"} / ${providerSummary?.activeProfileName ?? "default"} / ${providerSummary?.profileCount ?? 0} profiles`
          : selectedConfigurationSection === "package-management"
            ? `${packageManagementSummary?.packageManager ?? "asdf"} / ${packageManagementSummary?.managedSourceRegistryEntryCount ?? 0} source entries / ${packageManagementSummary?.localProjectCount ?? 0} local projects`
            : selectedConfigurationSection === "capabilities"
              ? `${desktopTaskManifests.length} manifests`
              : selectedConfigurationSection === "mcp-servers"
                ? `${mcpServerConfigs.length} servers`
                : `Tooltip ${tooltipScalePercent}% / Controls ${controlIconScalePercent}% / Dock ${dockIconScalePercent}% / Conversation ${conversationTextScalePercent}% / Source ${sourceCodeTextScalePercent}%`;
  const selectedConfigurationResolvedValue =
    selectedConfigurationSection === "theme"
      ? resolvedTheme
      : selectedConfigurationSection === "lisp-code-view"
        ? "Structured Lisp renderer"
        : selectedConfigurationSection === "llm"
          ? providerSummary?.activeProfile?.provider ?? "Provider profiles and routing"
          : selectedConfigurationSection === "package-management"
            ? packageManagementSummary?.qlotProjectRoot ??
              packageManagementSummary?.workingDirectory ??
              "Managed Quicklisp, Qlot, source-registry, and local-project state."
            : selectedConfigurationSection === "capabilities"
              ? "Governed desktop task manifest registry."
              : selectedConfigurationSection === "mcp-servers"
                ? "Persisted MCP server registry."
                : "Independent shell surface scaling, including workspace conversation text.";
  const renderedDocumentationHtml = useMemo(
    () => renderDocumentationMarkdown(selectedDocumentationPage?.markdown ?? ""),
    [selectedDocumentationPage?.markdown]
  );

  const currentFocusTitle =
    activeWorkspace === "conversations"
      ? selectedTurn?.title ?? selectedThread?.title ?? "No conversation focus"
      : activeWorkspace === "projects"
        ? selectedProjectDetail?.title ?? selectedProjectSummary?.title ?? currentProject?.title ?? "No project selected"
      : activeWorkspace === "transcript"
        ? transcriptEntries[0]?.title ?? "Transcript"
      : activeWorkspace === "memory"
        ? selectedMemory
          ? `${selectedMemory.category} / ${selectedMemory.attribute}`
          : "Retained Memory"
      : activeWorkspace === "workspace"
        ? `${workspaceTitle} Workspace`
      : activeWorkspace === "editor"
        ? `${currentEditorBufferTitle} Editor`
      : activeWorkspace === "browser"
        ? selectedBrowserDomain === "console"
          ? `${selectedConsolePlane === "host" ? "Host" : "Environment"} Console${
              selectedConsoleSourceFilter !== "All Sources" ? ` / ${selectedConsoleSourceFilter}` : ""
            }`
          : selectedBrowserDomain === "diagnostics"
            ? selectedDiagnosticReport?.title ??
              selectedDiagnosticReportSummary?.title ??
              `Diagnostics${selectedDiagnosticSourceFilter !== "All Sources" ? ` / ${selectedDiagnosticSourceFilter}` : ""}`
            : selectedBrowserDomain === "processes"
              ? selectedTelemetryProcess?.label ?? "Runtime Processes"
              : selectedBrowserDomain === "performance"
                ? "Runtime Performance"
                : selectedBrowserDomain === "host-io"
                  ? "Host I/O"
                  : runtimeInspection?.data.symbol ?? sourcePreview?.data.path ?? runtimeSummary?.currentPackage ?? "No browser focus"
        : activeWorkspace === "runtime"
          ? selectedWorkItem?.title ?? selectedApproval?.title ?? runtimeSummary?.currentPackage ?? "Listener"
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.title ?? "User Documentation"
            : activeWorkspace === "incidents"
              ? selectedIncident?.title ?? "No incident selected"
            : activeWorkspace === "artifacts"
              ? selectedArtifact?.title ?? selectedEvent?.kind ?? "No evidence selected"
              : activeWorkspace === "configuration"
                ? selectedConfigurationDescriptor.label
                : summary?.activeContext.currentThreadTitle ?? summary?.environmentLabel ?? "Environment";

  const currentFocusSummary =
    activeWorkspace === "conversations"
      ? selectedTurn?.summary ?? selectedThread?.summary ?? "Select a thread or turn to inspect structured conversation state."
      : activeWorkspace === "projects"
        ? selectedProjectDetail?.summary ??
          selectedProjectSummary?.summary ??
          "Select a governed project to inspect its constitution, requirements, journeys, architecture, and linked evidence."
      : activeWorkspace === "transcript"
        ? transcriptEntries[0]?.summary ?? "Transcript keeps durable evaluation and environment feedback visible across the environment."
      : activeWorkspace === "memory"
        ? selectedMemory?.summary ??
          `Inspect ${memoryEntries.length} retained memory entr${memoryEntries.length === 1 ? "y" : "ies"} and deliberately revise or delete them when they no longer reflect the operator.`
      : activeWorkspace === "workspace"
        ? workspaceResult?.data.summary ??
          "Draft Lisp forms here, evaluate them deliberately, and keep the retained scratch history separate from both conversation turns and listener execution posture."
      : activeWorkspace === "editor"
        ? editorResult?.data.summary ??
          `${currentEditorBuffers.length} retained editor buffer${currentEditorBuffers.length === 1 ? "" : "s"} support sustained source and form editing without collapsing the work into scratch posture or forcing it into the Browser. ${currentEditorChangedFormCount} changed form${currentEditorChangedFormCount === 1 ? "" : "s"} currently differ from the retained baseline.`
      : activeWorkspace === "browser"
        ? selectedBrowserDomain === "console"
          ? selectedConsoleEntry?.message ??
            `${consoleLogStream?.data.summary ?? "Inspect governed environment log entries with severity, source, and operational correlation."} ${
              visibleConsoleEntryCount
            } visible of ${consoleLogStream?.data.entries.length ?? 0} total.`
          : selectedBrowserDomain === "diagnostics"
            ? selectedDiagnosticReport?.summary ??
              selectedDiagnosticReportSummary?.summary ??
              `Inspect retained host diagnostic reports, crash artifacts, and analytics outputs. ${
                visibleDiagnosticReportCount
              } visible of ${diagnosticReports.length} total.`
            : selectedBrowserDomain === "processes"
              ? selectedTelemetryProcess?.summary ??
                runtimeTelemetry?.activitySummary ??
                "Inspect governed runtime-linked processes and their operational attachments."
              : selectedBrowserDomain === "performance"
                ? runtimeTelemetry?.cpu.summary ??
                  runtimeTelemetry?.memory.summary ??
                  "Inspect CPU and memory posture for the live runtime and its host."
                : selectedBrowserDomain === "host-io"
                  ? runtimeTelemetry?.network.summary ??
                    runtimeTelemetry?.disk.summary ??
                    "Inspect host network and disk posture attached to the running environment."
                  : runtimeInspection?.data.summary ??
                    sourcePreview?.data.summary ??
                    "Inspect packages, symbols, source, and governed attachments from one live system view."
        : activeWorkspace === "runtime"
          ? selectedWorkItem?.waitingReason ??
            selectedApproval?.consequenceSummary ??
            runtimeSummary?.divergencePosture ??
            "Listener, approval, and work context should stay attached to one execution surface."
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.summary ??
              "Use the documentation workspace when you want the conceptual model, workflow guidance, or workspace reference without crowding the operating surfaces."
          : activeWorkspace === "incidents"
            ? selectedIncident?.recoverySummary ?? "Recovery context appears here once an incident is selected."
            : activeWorkspace === "artifacts"
              ? selectedArtifact?.summary ?? selectedEvent?.summary ?? "Select evidence to inspect provenance and replayable event context."
              : activeWorkspace === "configuration"
                ? selectedConfigurationDescriptor.summary
              : summary?.activeContext.focusSummary ?? "Environment posture is not yet available.";

  const selectedApprovalLinkedWorkItemId =
    selectedApproval?.linkedEntities.find((entity) => entity.entityType === "work-item")?.entityId ?? null;
  const selectedApprovalInspectorWorkItem =
    (selectedApprovalLinkedWorkItemId
      ? workItems.find((item) => item.workItemId === selectedApprovalLinkedWorkItemId && item.correctiveContext) ?? null
      : null)
    ?? workItems.find((item) => item.approvalCount > 0 && item.correctiveContext) ?? null;
  const selectedApprovalInspectorCorrectiveContext =
    selectedApprovalInspectorWorkItem?.correctiveContext
    ?? ((status?.reconciliationDecision ?? summary?.reconciliationDecision)
      ? {
          kind: "alignment-reconciliation",
          decision: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.decision ?? null,
          approvalPosture: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.approvalPosture ?? null,
          alignmentStatus: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.alignmentStatus ?? null,
          alignmentScore: null,
          proposedActions: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.proposedActions ?? [],
          triggerEvents: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.triggerEvents ?? []
        }
      : null);
  const orchestrationFocusRecord = inspectorRecord(orchestrationFocus);
  const orchestrationSnapshotRecord = inspectorRecord(orchestrationSnapshot);
  const orchestrationPostureSummary = inspectorRecord(orchestrationSnapshotRecord.postureSummary);
  const latestOrchestrationStepSummary = inspectorRecord(orchestrationSnapshotRecord.latestStepSummary);
  const planVerificationRecord = inspectorRecord(planVerification);
  const verificationCounts = inspectorRecord(planVerificationRecord.verificationCounts);
  const focusedPlanId =
    firstInspectorString(
      orchestrationFocusRecord.planId,
      inspectorRecord(orchestrationFocusRecord.plan).id,
      orchestrationSnapshotRecord.planId
    ) ?? "None";
  const focusedWorkflowId =
    firstInspectorString(
      orchestrationFocusRecord.workflowRecordId,
      inspectorRecord(orchestrationFocusRecord.workflow).workflowRecordId,
      orchestrationSnapshotRecord.workflowRecordId
    ) ?? "None";
  const focusedNextAction =
    firstInspectorString(orchestrationPostureSummary.nextAction, orchestrationFocusRecord.nextAction) ?? "none";
  const focusedWaitingOn =
    firstInspectorString(orchestrationPostureSummary.waitingOn, orchestrationFocusRecord.waitingOn) ?? "none";
  const focusedPrimaryCommandLabel =
    firstInspectorString(
      orchestrationFocusRecord.primaryCommandLabel,
      inspectorRecord(orchestrationFocusRecord.primaryCommand).label
    ) ?? "none";
  const focusedPrimaryCommandDescription =
    firstInspectorString(
      orchestrationFocusRecord.primaryCommandDescription,
      inspectorRecord(orchestrationFocusRecord.primaryCommand).description
    ) ?? "No orchestration command description is currently attached.";
  const focusedReconciliation =
    firstInspectorString(latestOrchestrationStepSummary.reconciliationStatus) ?? "unknown";
  const focusedVerificationCount = Number(verificationCounts.verifiedCount ?? 0);

  const inspectorTabs: Array<{ id: string; label: string; content: React.ReactNode }> =
    activeWorkspace === "environment"
      ? [
          {
            id: "context",
            label: "Context",
            content: (
              <div className="entity-list">
                <div className="entity-row">
                  <div>
                    <strong>{summary?.activeContext.currentThreadTitle ?? "No active thread"}</strong>
                    <p>{summary?.activeContext.focusSummary ?? "No current continuation summary."}</p>
                  </div>
                </div>
                <div className="entity-row">
                  <div>
                    <strong>{summary?.activeWorkers[0]?.label ?? "No active worker"}</strong>
                    <p>{summary?.activeWorkers[0]?.responsibility ?? "Actors appear here when the environment exposes them."}</p>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: "pressure",
            label: "Pressure",
            content: (
              <dl className="detail-list">
                <DetailRow label="Approvals" value={String(summary?.attention.approvalsAwaiting ?? 0)} />
                <DetailRow label="Incidents" value={String(summary?.attention.openIncidents ?? 0)} />
                <DetailRow label="Blocked Work" value={String(summary?.attention.blockedWork ?? 0)} />
                <DetailRow label="Artifacts" value={String(summary?.recentArtifacts.length ?? 0)} />
              </dl>
            )
          }
        ]
      : activeWorkspace === "projects"
        ? [
            {
              id: "context",
              label: "Context",
              content: (
                <dl className="detail-list">
                  <DetailRow label="Project" value={selectedProjectDetail?.title ?? selectedProjectSummary?.title ?? "No project selected"} />
                  <DetailRow label="Status" value={selectedProjectDetail?.status ?? selectedProjectSummary?.status ?? "empty"} />
                  <DetailRow label="Requirements" value={String(selectedProjectDetail?.requirements.length ?? selectedProjectSummary?.requirementCount ?? 0)} />
                  <DetailRow label="Features" value={String(selectedProjectDetail?.featureSpecifications.length ?? selectedProjectSummary?.featureSpecCount ?? 0)} />
                  <DetailRow label="Journeys" value={String(selectedProjectDetail?.userJourneys.length ?? selectedProjectSummary?.journeyCount ?? 0)} />
                  <DetailRow
                    label="Decisions"
                    value={String(
                      selectedProjectDetail?.architectureDecisions.length ??
                        selectedProjectSummary?.architectureDecisionCount ??
                        0
                    )}
                  />
                </dl>
              )
            },
            {
              id: "governance",
              label: "Governance",
              content: selectedProjectDetail ? (
                <div className="configuration-inspector-stack">
                  <p className="inspector-copy">{selectedProjectDetail.summary}</p>
                  <pre className="runtime-preview">
                    {JSON.stringify(
                      {
                        constitution: selectedProjectDetail.constitution,
                        designSystem: selectedProjectDetail.designSystem,
                        styleGuide: selectedProjectDetail.styleGuide,
                        metadata: selectedProjectDetail.metadata
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              ) : (
                <p className="inspector-copy">
                  Select a governed project to inspect its constitutional and design-governance context.
                </p>
              )
            },
            {
              id: "evidence",
              label: "Evidence",
              content: selectedProjectDetail ? (
                <dl className="detail-list">
                  <DetailRow label="Work Items" value={String(selectedProjectDetail.linkedWorkItems.length)} />
                  <DetailRow label="Incidents" value={String(selectedProjectDetail.linkedIncidents.length)} />
                  <DetailRow label="Testing" value={String(selectedProjectDetail.linkedTestingHarnesses.length)} />
                  <DetailRow label="Source Roots" value={String(selectedProjectDetail.sourceRoots.length)} />
                  <DetailRow
                    label="Coverage"
                    value={selectedProjectDetail.testingEvidence?.coverage.present ? "present" : "absent"}
                  />
                  <DetailRow
                    label="Latest Report"
                    value={selectedProjectDetail.testingEvidence?.latestReport?.generatedAt ?? "n/a"}
                  />
                </dl>
              ) : (
                <p className="inspector-copy">
                  Select a governed project to inspect its linked work, testing, incident, and source evidence.
                </p>
              )
            }
          ]
      : activeWorkspace === "conversations"
        ? [
            {
              id: "context",
              label: "Context",
              content: (
                <dl className="detail-list">
                  {selectedConversationSection === "repl" ? (
                    <>
                      <DetailRow label="Mode" value="Direct Eval" />
                      <DetailRow label="Package" value={runtimeSummary?.currentPackage ?? "listener"} />
                      <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                      <DetailRow label="Authority" value="Governed REPL" />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Thread" value={selectedThread?.title ?? "No thread selected"} />
                      <DetailRow label="State" value={selectedThread?.state ?? "idle"} />
                      <DetailRow label="Turns" value={String(selectedThread?.turns.length ?? 0)} />
                      <DetailRow label="Linked Entities" value={String(selectedThread?.linkedEntities.length ?? 0)} />
                    </>
                  )}
                </dl>
              )
            },
            {
              id: "detail",
              label: "Turn",
              content:
                selectedConversationSection === "draft" ? (
                  <div className="configuration-inspector-stack">
                    <pre className="runtime-preview">{conversationDraft || "No draft continuation prepared."}</pre>
                    {conversationRecoveryHandoff ? (
                      <dl className="detail-list">
                        <DetailRow label="Recovery Source" value={conversationRecoveryHandoff.source} />
                        <DetailRow label="Incident" value={conversationRecoveryHandoff.incidentId} />
                        <DetailRow label="Restart" value={conversationRecoveryHandoff.restartLabel} />
                      </dl>
                    ) : null}
                  </div>
                ) : selectedConversationSection === "repl" ? (
                  <div className="configuration-inspector-stack">
                    <pre className="runtime-preview">{runtimeForm || "No direct evaluation form prepared."}</pre>
                    <p className="inspector-copy">
                      Direct evaluation is explicit here. This surface is using conversation as a governed REPL rather than as a supervised thread.
                    </p>
                  </div>
                ) : (
                  <dl className="detail-list">
                    <DetailRow label="Turn" value={selectedTurn?.title ?? "No turn selected"} />
                    <DetailRow label="Turn State" value={selectedTurn?.state ?? "idle"} />
                    <DetailRow label="Operations" value={String(selectedTurn?.operationIds.length ?? 0)} />
                    <DetailRow label="Artifacts" value={String(selectedTurn?.artifactIds.length ?? 0)} />
                    <DetailRow label="Approvals" value={String(selectedTurn?.approvalIds.length ?? 0)} />
                  </dl>
                )
            },
            {
              id: "entry",
              label: "Entry",
              content: selectedConversationMessage ? (
                <dl className="detail-list">
                  <DetailRow label="Source" value={selectedConversationMessage.role} />
                  <DetailRow label="Timestamp" value={selectedConversationMessage.createdAt} />
                </dl>
              ) : (
                <p className="inspector-copy">
                  Select a transcript entry to inspect its source and timestamp without repeating that metadata on every bubble.
                </p>
              )
            },
            {
              id: "linked",
              label: "Linked",
              content: selectedThread ? (
                <LinkedEntityList entities={selectedThread.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
              ) : (
                <p className="inspector-copy">
                  Select a conversation session to inspect the artifacts, approvals, incidents, and work attached to it.
                </p>
              )
            }
          ]
        : activeWorkspace === "editor"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  <dl className="detail-list">
                    <DetailRow label="Mode" value="Editor Surface" />
                    <DetailRow label="Buffer" value={currentEditorBufferTitle} />
                    <DetailRow label="State" value={currentEditorBufferDirty ? "Dirty" : "Clean"} />
                    <DetailRow label="Buffers" value={`${currentEditorBuffers.length}`} />
                    <DetailRow label="Changed Forms" value={`${currentEditorChangedFormCount}`} />
                    <DetailRow label="Baseline" value={currentEditorBufferDirty ? "Diverged" : "Aligned"} />
                    <DetailRow label="Package" value={editorPackage || (runtimeSummary?.currentPackage ?? "cl-user")} />
                    <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                    <DetailRow label="Authority" value="Governed Editing" />
                  </dl>
                )
              },
              {
                id: "symbol",
                label: "Symbol",
                content: currentEditorCursorSymbol ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Symbol" value={currentEditorCursorSymbol} />
                      <DetailRow
                        label="Package"
                        value={
                          currentEditorCursorSymbolHelp?.packageName ??
                          currentEditorCursorSymbolPackage ??
                          editorPackage ??
                          runtimeSummary?.currentPackage ??
                          "cl-user"
                        }
                      />
                      <DetailRow label="Kind" value={currentEditorCursorSymbolHelp?.type ?? "unknown"} />
                      {currentEditorCursorSymbolHelp?.signature ? (
                        <DetailRow label="Signature" value={currentEditorCursorSymbolHelp.signature} />
                      ) : currentEditorCursorSymbolHelp?.detail ? (
                        <DetailRow label="Detail" value={currentEditorCursorSymbolHelp.detail} />
                      ) : null}
                    </dl>
                    {currentEditorCursorSymbolHelp?.info ? (
                      <p className="inspector-copy">{currentEditorCursorSymbolHelp.info}</p>
                    ) : (
                      <p className="inspector-copy">
                        Symbol detail will appear here when runtime-backed help is available for the current editor focus.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Move the caret onto a symbol in the editor to inspect its current package and runtime-backed detail here.
                  </p>
                )
              },
              {
                id: "buffer",
                label: "Buffer",
                content: <pre className="runtime-preview">{editorDraft || "No editor buffer drafted yet."}</pre>
              },
              {
                id: "output",
                label: "Output",
                content: editorResult ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Status" value={editorResult.status} />
                      <DetailRow label="Operation" value={editorResult.operation} />
                    </dl>
                    <p className="inspector-copy">{editorResult.data.summary}</p>
                    {editorResult.data.valuePreview ? <pre className="runtime-preview">{editorResult.data.valuePreview}</pre> : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Evaluate the current editor buffer to inspect sustained editing output here.
                  </p>
                )
              }
            ]
        : activeWorkspace === "workspace"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  <dl className="detail-list">
                    <DetailRow label="Mode" value="Scratch Workspace" />
                    <DetailRow label="Package" value={runtimeSummary?.currentPackage ?? "cl-user"} />
                    <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                    <DetailRow label="Authority" value="Governed Evaluation" />
                  </dl>
                )
              },
              {
                id: "buffer",
                label: "Buffer",
                content: <pre className="runtime-preview">{workspaceDraft || "No workspace forms drafted yet."}</pre>
              },
              {
                id: "result",
                label: "Result",
                content: workspaceResult ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Status" value={workspaceResult.status} />
                      <DetailRow label="Operation" value={workspaceResult.operation} />
                    </dl>
                    <p className="inspector-copy">{workspaceResult.data.summary}</p>
                    {workspaceResult.data.valuePreview ? (
                      <pre className="runtime-preview">{workspaceResult.data.valuePreview}</pre>
                    ) : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Evaluate the current workspace buffer to inspect the governed result here.
                  </p>
                )
              }
            ]
        : activeWorkspace === "transcript"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                    <dl className="detail-list">
                      <DetailRow label="Entries" value={String(transcriptEntries.length)} />
                      <DetailRow label="Workspace Results" value={String(currentWorkspaceHistoryCount)} />
                      <DetailRow label="Listener Results" value={String(currentReplHistoryCount)} />
                      <DetailRow label="Events" value={String(environmentEvents.length)} />
                    </dl>
                )
              },
              {
                id: "latest",
                label: "Latest",
                content: transcriptEntries[0] ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Source" value={transcriptEntries[0].source} />
                      <DetailRow label="Timestamp" value={transcriptEntries[0].timestamp} />
                      <DetailRow label="Family" value={transcriptEntries[0].family ?? "transcript"} />
                    </dl>
                    <p className="inspector-copy">{transcriptEntries[0].summary}</p>
                    {transcriptEntries[0].preview ? <pre className="runtime-preview">{transcriptEntries[0].preview}</pre> : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Transcript entries will appear here once workspace, listener, or environment activity is retained.
                  </p>
                )
              }
            ]
        : activeWorkspace === "memory"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  <dl className="detail-list">
                    <DetailRow label="Entries" value={String(memoryEntries.length)} />
                    <DetailRow label="Selected" value={selectedMemory?.memoryId ?? "No memory selected"} />
                    <DetailRow label="Category" value={selectedMemory?.category ?? "n/a"} />
                    <DetailRow label="Attribute" value={selectedMemory?.attribute ?? "n/a"} />
                  </dl>
                )
              },
              {
                id: "detail",
                label: "Detail",
                content: selectedMemory ? (
                  <div className="configuration-inspector-stack">
                    <p className="inspector-copy">{selectedMemory.summary}</p>
                    <dl className="detail-list">
                      <DetailRow label="Value" value={selectedMemory.value} />
                      <DetailRow
                        label="Confidence"
                        value={selectedMemory.confidence != null ? String(selectedMemory.confidence) : "n/a"}
                      />
                      <DetailRow label="Kind" value={selectedMemory.kind} />
                      <DetailRow label="Recorded" value={selectedMemory.recordedAt ?? "n/a"} />
                      <DetailRow label="Updated" value={selectedMemory.updatedAt ?? "n/a"} />
                    </dl>
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Select a retained memory to inspect and maintain its deliberate identity or preference record.
                  </p>
                )
              }
            ]
        : activeWorkspace === "browser"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  selectedBrowserDomain === "governance" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Governance" />
                      <DetailRow
                        label="Selected"
                        value={
                          selectedApproval?.title
                          ?? selectedIncident?.title
                          ?? selectedWorkItem?.title
                          ?? "No governance object selected"
                        }
                      />
                      <DetailRow
                        label="State"
                        value={
                          selectedApproval?.state
                          ?? selectedIncident?.state
                          ?? selectedWorkItem?.state
                          ?? "unknown"
                        }
                      />
                      <DetailRow
                        label="Corrective Kind"
                        value={(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.kind ?? "none"}
                      />
                      <DetailRow
                        label="Approval Posture"
                        value={
                          (selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.approvalPosture
                          ?? "unknown"
                        }
                      />
                      <DetailRow label="Primary Command" value={focusedPrimaryCommandLabel} />
                      <DetailRow
                        label="Trigger Events"
                        value={String((selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents.length ?? 0)}
                      />
                    </dl>
                  ) : selectedBrowserDomain === "documentation" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Documentation" />
                      <DetailRow label="Title" value={selectedDocumentationPage?.title ?? "No page selected"} />
                      <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                      <DetailRow label="Slug" value={selectedDocumentationPage?.slug ?? "unknown"} />
                    </dl>
                  ) : selectedBrowserDomain === "console" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Console" />
                      <DetailRow label="Plane" value={consoleLogStream?.data.plane ?? "environment"} />
                      <DetailRow label="Source Filter" value={selectedConsoleSourceFilter} />
                      <DetailRow label="Visible Entries" value={String(visibleConsoleEntryCount)} />
                      <DetailRow label="Total Entries" value={String(consoleLogStream?.data.entries.length ?? 0)} />
                      <DetailRow label="Summary" value={consoleLogStream?.data.summary ?? "No console stream loaded."} />
                    </dl>
                  ) : selectedBrowserDomain === "diagnostics" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Diagnostics" />
                      <DetailRow label="Source Filter" value={selectedDiagnosticSourceFilter} />
                      <DetailRow label="Visible Reports" value={String(visibleDiagnosticReportCount)} />
                      <DetailRow label="Total Reports" value={String(diagnosticReports.length)} />
                      <DetailRow label="Selected" value={selectedDiagnosticReport?.title ?? selectedDiagnosticReportSummary?.title ?? "No report selected"} />
                      <DetailRow label="Kind" value={selectedDiagnosticReport?.kind ?? selectedDiagnosticReportSummary?.kind ?? "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "processes" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Processes" />
                      <DetailRow label="Visible Processes" value={String(runtimeTelemetry?.processes.length ?? 0)} />
                      <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                      <DetailRow label="Activity" value={runtimeTelemetry?.activitySummary ?? "Runtime telemetry is not yet available."} />
                    </dl>
                  ) : selectedBrowserDomain === "performance" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Performance" />
                      <DetailRow label="Sampled At" value={runtimeTelemetry?.sampledAt ?? "n/a"} />
                      <DetailRow label="CPU" value={runtimeTelemetry?.cpu.utilizationPercent != null ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%` : "n/a"} />
                      <DetailRow label="Host Memory" value={runtimeTelemetry?.memory.systemUsedPercent != null ? `${runtimeTelemetry.memory.systemUsedPercent.toFixed(1)}%` : "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "host-io" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Host I/O" />
                      <DetailRow label="Connections" value={String(runtimeTelemetry?.network.openConnectionCount ?? "n/a")} />
                      <DetailRow label="Interfaces" value={String(runtimeTelemetry?.network.interfaceCount ?? "n/a")} />
                      <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                    </dl>
                  ) : (
                    <dl className="detail-list">
                      <DetailRow
                        label="Domain"
                        value={browserDomains.find((domain) => domain.id === selectedBrowserDomain)?.label ?? selectedBrowserDomain}
                      />
                      <DetailRow label="Package" value={runtimeInspection?.data.packageName ?? runtimeSummary?.currentPackage ?? "unknown"} />
                      <DetailRow label="Mode" value={runtimeInspection?.data.mode ?? "browse"} />
                      <DetailRow label="Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                      <DetailRow label="Scopes" value={String(runtimeSummary?.scopes.length ?? 0)} />
                      {runtimeEntityDetail?.data.facets.slice(0, 4).map((facet) => (
                        <DetailRow
                          key={`browser-context:${facet.label}:${facet.value}`}
                          label={facet.label}
                          value={facet.value}
                        />
                      ))}
                    </dl>
                  )
                )
              },
              {
                id: "detail",
                label: "Detail",
                content: selectedBrowserDomain === "documentation" ? (
                  selectedDocumentationPage ? (
                    <div className="configuration-inspector-stack">
                      <p className="inspector-copy">{selectedDocumentationPage.summary}</p>
                      <article
                        className="documentation-markdown inspector-documentation-markdown"
                        dangerouslySetInnerHTML={{ __html: renderedDocumentationHtml }}
                      />
                    </div>
                  ) : (
                    <p className="inspector-copy">
                      Select a documentation reference from the browser table to read it in the inspector.
                    </p>
                  )
                ) : selectedBrowserDomain === "governance" ? (
                  selectedApproval || selectedIncident || selectedWorkItem ? (
                    <div className="configuration-inspector-stack">
                      <p className="inspector-copy">
                        {(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.proposedActions[0]?.reason
                          ?? selectedApproval?.summary
                          ?? "No explicit corrective rationale is attached to the selected governance object."}
                      </p>
                      {(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents.length ? (
                        <div className="ref-list">
                          {((selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents ?? []).map((event, index) => (
                            <span className="thread-flag" key={`inspector-governance-trigger:${index}`}>
                              {event.kind ?? event.family ?? "event"}
                              {event.eventId ? ` · ${event.eventId}` : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">
                      Select a governance object from the browser table to inspect its corrective posture here.
                    </p>
                  )
                ) : selectedBrowserDomain === "console" ? (
                  selectedConsoleEntry ? (
                    <div className="configuration-inspector-stack">
	                    <dl className="detail-list">
	                      <DetailRow label="Plane" value={selectedConsoleEntry.plane} />
	                      <DetailRow label="Type" value={selectedConsoleEntry.type} />
	                      <DetailRow label="Process" value={selectedConsoleEntry.processName ?? "n/a"} />
	                      <DetailRow label="PID" value={selectedConsoleEntry.pid ? String(selectedConsoleEntry.pid) : "n/a"} />
	                      <DetailRow label="Category" value={selectedConsoleEntry.category} />
	                      <DetailRow label="Source" value={selectedConsoleEntry.source} />
	                      <DetailRow label="Activity" value={selectedConsoleEntry.activityId ?? "n/a"} />
	                      <DetailRow label="Timestamp" value={selectedConsoleEntry.timestamp} />
	                    </dl>
                      <p className="inspector-copy">{selectedConsoleEntry.message}</p>
                      {selectedConsoleEntry.detail ? <pre className="runtime-preview">{selectedConsoleEntry.detail}</pre> : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">Select a console entry to inspect its full detail and operational correlation.</p>
                  )
                ) : selectedBrowserDomain === "diagnostics" ? (
                  selectedDiagnosticReport ? (
                    <div className="configuration-inspector-stack">
	                    <dl className="detail-list">
	                      <DetailRow label="Title" value={selectedDiagnosticReport.title} />
	                      <DetailRow label="Kind" value={selectedDiagnosticReport.kind} />
	                      <DetailRow label="Source" value={selectedDiagnosticReport.source} />
	                      <DetailRow label="Path" value={selectedDiagnosticReport.path ?? "n/a"} />
	                      <DetailRow label="Created" value={selectedDiagnosticReport.createdAt} />
	                      <DetailRow
	                        label="Bytes"
	                        value={
	                          typeof selectedDiagnosticReport.metadata?.byteSize === "number"
	                            ? String(selectedDiagnosticReport.metadata.byteSize)
	                            : "n/a"
	                        }
	                      />
	                      <DetailRow label="Extension" value={String(selectedDiagnosticReport.metadata?.extension ?? "n/a")} />
	                      <DetailRow label="Incident" value={String(selectedDiagnosticReport.metadata?.incidentId ?? "n/a")} />
	                      <DetailRow label="Bug Type" value={String(selectedDiagnosticReport.metadata?.bugType ?? "n/a")} />
	                      <DetailRow label="Parent" value={String(selectedDiagnosticReport.metadata?.parentProc ?? "n/a")} />
	                      <DetailRow label="Responsible" value={String(selectedDiagnosticReport.metadata?.responsibleProc ?? "n/a")} />
	                    </dl>
                      <p className="inspector-copy">{selectedDiagnosticReport.summary}</p>
                      {selectedDiagnosticReport.contentPreview ? (
                        <pre className="runtime-preview">{selectedDiagnosticReport.contentPreview}</pre>
                      ) : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">Select a retained diagnostic report to inspect its preview and source metadata.</p>
                  )
                ) : selectedBrowserDomain === "processes" ? (
                  selectedTelemetryProcess ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Process" value={selectedTelemetryProcess.label} />
                        <DetailRow label="Kind" value={selectedTelemetryProcess.kind} />
                        <DetailRow label="State" value={selectedTelemetryProcess.state} />
                        <DetailRow label="PID" value={String(selectedTelemetryProcess.pid ?? "n/a")} />
                        <DetailRow label="CPU" value={selectedTelemetryProcess.cpuPercent != null ? `${selectedTelemetryProcess.cpuPercent.toFixed(1)}%` : "n/a"} />
                        <DetailRow label="Memory" value={selectedTelemetryProcess.memoryMb != null ? `${selectedTelemetryProcess.memoryMb.toFixed(1)} MB` : "n/a"} />
                        <DetailRow label="Elapsed" value={selectedTelemetryProcess.elapsed ?? "n/a"} />
                      </dl>
                      <p className="inspector-copy">{selectedTelemetryProcess.summary}</p>
                    </>
                  ) : (
                    <p className="inspector-copy">
                      Select a runtime-linked process to inspect its governed execution posture here.
                    </p>
                  )
                ) : selectedBrowserDomain === "performance" ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="CPU Summary" value={runtimeTelemetry?.cpu.summary ?? "n/a"} />
                      <DetailRow label="Memory Summary" value={runtimeTelemetry?.memory.summary ?? "n/a"} />
                      <DetailRow label="Load 1m" value={runtimeTelemetry?.cpu.loadAverage1m != null ? runtimeTelemetry.cpu.loadAverage1m.toFixed(2) : "n/a"} />
                      <DetailRow label="Heap Used" value={runtimeTelemetry?.memory.heapUsedMb != null ? `${runtimeTelemetry.memory.heapUsedMb.toFixed(1)} MB` : "n/a"} />
                    </dl>
                    <p className="inspector-copy">
                      {runtimeTelemetry?.activitySummary ??
                        "CPU and memory posture will appear here once the runtime telemetry snapshot is available."}
                    </p>
                  </div>
                ) : selectedBrowserDomain === "host-io" ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Network Summary" value={runtimeTelemetry?.network.summary ?? "n/a"} />
                      <DetailRow label="Disk Summary" value={runtimeTelemetry?.disk.summary ?? "n/a"} />
                      <DetailRow label="Disk Read" value={runtimeTelemetry?.disk.readKbps != null ? `${runtimeTelemetry.disk.readKbps.toFixed(0)} KB/s` : "n/a"} />
                      <DetailRow label="Disk Write" value={runtimeTelemetry?.disk.writeKbps != null ? `${runtimeTelemetry.disk.writeKbps.toFixed(0)} KB/s` : "n/a"} />
                    </dl>
                    <p className="inspector-copy">
                      Host I/O posture is attached to the running environment here rather than split into a separate monitor.
                    </p>
                  </div>
                ) : runtimeEntityDetail ? (
                  <>
                    <dl className="detail-list">
                      <DetailRow label="Kind" value={runtimeEntityDetail.data.entityKind} />
                      <DetailRow label="Package" value={runtimeEntityDetail.data.packageName} />
                      <DetailRow label="Signature" value={runtimeEntityDetail.data.signature ?? "No signature"} />
                      {runtimeEntityDetail.data.facets.slice(0, 12).map((facet) => (
                        <DetailRow
                          key={`${facet.label}:${facet.value}`}
                          label={facet.label}
                          value={facet.value}
                        />
                      ))}
                      <DetailRow label="Related Items" value={String(runtimeEntityDetail.data.relatedItems.length)} />
                    </dl>
                    <p className="inspector-copy">{runtimeEntityDetail.data.summary}</p>
                    {sourcePreview?.data.path ? (
                      <p className="inspector-copy">
                        Source focus: {sourcePreview.data.path}
                        {sourcePreview.data.focusLine ? `:${sourcePreview.data.focusLine}` : ""}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="inspector-copy">
                    Select a package, symbol, method, class, or runtime object to inspect its semantic runtime detail here.
                  </p>
                )
              },
              {
                id: "source",
                label: "Source",
                content:
                  selectedBrowserDomain === "documentation" ? (
                    <dl className="detail-list">
                      <DetailRow label="Source" value={selectedDocumentationPage?.sourcePath ?? "No documentation source selected"} />
                      <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                      <DetailRow label="Artifacts" value={String(artifacts.length)} />
                      <DetailRow label="Work Items" value={String(workItems.length)} />
                    </dl>
                  ) : selectedBrowserDomain === "console" ? (
                    <dl className="detail-list">
                      <DetailRow label="Work Item" value={selectedConsoleEntry?.workItemId ?? "n/a"} />
                      <DetailRow label="Workflow" value={selectedConsoleEntry?.workflowRecordId ?? "n/a"} />
                      <DetailRow label="Incident" value={selectedConsoleEntry?.incidentId ?? "n/a"} />
                      <DetailRow label="Conversation" value={selectedConsoleEntry?.threadRefId ?? selectedConsoleEntry?.turnRefId ?? "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "diagnostics" ? (
                    <dl className="detail-list">
                      <DetailRow label="Process" value={selectedDiagnosticReport?.processName ?? "n/a"} />
                      <DetailRow label="PID" value={String(selectedDiagnosticReport?.pid ?? "n/a")} />
                      <DetailRow label="Source" value={selectedDiagnosticReport?.source ?? "n/a"} />
                      <DetailRow label="Incident" value={String(selectedDiagnosticReport?.metadata?.incidentId ?? "n/a")} />
                      <DetailRow label="Bug Type" value={String(selectedDiagnosticReport?.metadata?.bugType ?? "n/a")} />
                      <DetailRow label="Parent" value={String(selectedDiagnosticReport?.metadata?.parentProc ?? "n/a")} />
                      <DetailRow label="Responsible" value={String(selectedDiagnosticReport?.metadata?.responsibleProc ?? "n/a")} />
                      <DetailRow label="Report Id" value={selectedDiagnosticReport?.reportId ?? selectedDiagnosticReportSummary?.reportId ?? "n/a"} />
                    </dl>
                  ) : (
                    <dl className="detail-list">
                      {selectedBrowserDomain === "processes" ? (
                        <>
                          <DetailRow label="Work Item" value={selectedTelemetryProcess?.workItemId ?? "n/a"} />
                          <DetailRow label="Workflow" value={selectedTelemetryProcess?.workflowRecordId ?? "n/a"} />
                          <DetailRow label="Incident" value={selectedTelemetryProcess?.incidentId ?? "n/a"} />
                          <DetailRow label="Conversation" value={selectedTelemetryProcess?.threadId ?? selectedTelemetryProcess?.turnId ?? "n/a"} />
                        </>
                      ) : selectedBrowserDomain === "performance" ? (
                        <>
                          <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "n/a"} />
                          <DetailRow label="Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                          <DetailRow label="Scopes" value={String(runtimeSummary?.scopes.length ?? 0)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                        </>
                      ) : selectedBrowserDomain === "host-io" ? (
                        <>
                          <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "n/a"} />
                          <DetailRow label="Open Connections" value={String(runtimeTelemetry?.network.openConnectionCount ?? "n/a")} />
                          <DetailRow label="Artifacts" value={String(artifacts.length)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                        </>
                      ) : (
                        <>
                          <DetailRow label="Source" value={sourcePreview?.data.path ?? "No source artifact selected"} />
                          <DetailRow label="Focus Line" value={String(sourcePreview?.data.focusLine ?? 0)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                          <DetailRow label="Artifacts" value={String(artifacts.length)} />
                        </>
                      )}
                    </dl>
                  )
              },
              {
                id: "handoff",
                label: "Handoff",
                content: (
                  <div className="inspector-tab-stack">
                    {runtimeRecoveryLaunch || conversationRecoveryHandoff ? (
                      <dl className="detail-list">
                        {runtimeRecoveryLaunch ? (
                          <>
                            <DetailRow label="Listener Recovery Source" value={runtimeRecoveryLaunch.source} />
                            <DetailRow label="Listener Incident" value={runtimeRecoveryLaunch.incidentId} />
                            <DetailRow label="Listener Restart" value={runtimeRecoveryLaunch.restartLabel} />
                          </>
                        ) : null}
                        {conversationRecoveryHandoff ? (
                          <>
                            <DetailRow label="Draft Recovery Source" value={conversationRecoveryHandoff.source} />
                            <DetailRow label="Draft Incident" value={conversationRecoveryHandoff.incidentId} />
                            <DetailRow label="Draft Restart" value={conversationRecoveryHandoff.restartLabel} />
                          </>
                        ) : null}
                      </dl>
                    ) : null}
                    <div>
                      <p className="context-label">Listener Input</p>
                      <pre className="runtime-preview">{runtimeForm || "No listener handoff prepared."}</pre>
                    </div>
                    <div>
                      <p className="context-label">Draft Continuation</p>
                      <pre className="runtime-preview">{conversationDraft || "No conversation handoff prepared."}</pre>
                    </div>
                  </div>
                )
              }
            ]
          : activeWorkspace === "runtime"
            ? [
                {
                  id: "context",
                  label: "Context",
                  content: (
                    <dl className="detail-list">
                      <DetailRow label="Loaded Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                      <DetailRow label="Pending Approval" value={selectedApproval?.title ?? "None"} />
                      <DetailRow label="Selected Work" value={selectedWorkItem?.title ?? "None"} />
                      <DetailRow label="Closure" value={selectedWorkflowRecord?.closureReadiness ?? "unknown"} />
                      <DetailRow label="Focused Plan" value={focusedPlanId} />
                      <DetailRow label="Focused Workflow" value={focusedWorkflowId} />
                      <DetailRow label="Next Action" value={focusedNextAction} />
                      <DetailRow label="Waiting On" value={focusedWaitingOn} />
                      <DetailRow label="Primary Command" value={focusedPrimaryCommandLabel} />
                      <DetailRow label="Step Reconciliation" value={focusedReconciliation} />
                      <DetailRow label="Verified Steps" value={String(focusedVerificationCount)} />
                      <DetailRow label="Inbox" value={String(orchestrationInbox.length)} />
                    </dl>
                  )
                },
                {
                  id: "input",
                  label: "Input",
                  content: <pre className="runtime-preview">{runtimeForm || "No listener form prepared."}</pre>
                },
                {
                  id: "selection",
                  label: "Selection",
                  content: selectedApproval ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Approval" value={selectedApproval.title} />
                        <DetailRow label="State" value={selectedApproval.state} />
                        <DetailRow label="Requested Action" value={selectedApproval.requestedAction} />
                        <DetailRow label="Scope" value={selectedApproval.scopeSummary} />
                        <DetailRow label="Plan" value={focusedPlanId} />
                        <DetailRow label="Workflow" value={focusedWorkflowId} />
                        <DetailRow label="Next Action" value={focusedNextAction} />
                        <DetailRow label="Waiting On" value={focusedWaitingOn} />
                        <DetailRow label="Primary Command" value={focusedPrimaryCommandLabel} />
                        <DetailRow label="Reconciliation" value={focusedReconciliation} />
                        <DetailRow label="Verified Steps" value={String(focusedVerificationCount)} />
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow label="Corrective Kind" value={selectedApprovalInspectorCorrectiveContext.kind} />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Approval Posture"
                            value={selectedApprovalInspectorCorrectiveContext.approvalPosture ?? "unknown"}
                          />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Alignment"
                            value={
                              selectedApprovalInspectorCorrectiveContext.alignmentStatus
                                ? `${selectedApprovalInspectorCorrectiveContext.alignmentStatus}${
                                    selectedApprovalInspectorCorrectiveContext.alignmentScore != null
                                      ? ` (${selectedApprovalInspectorCorrectiveContext.alignmentScore.toFixed(2)})`
                                      : ""
                                  }`
                                : "unknown"
                            }
                          />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Trigger Events"
                            value={String(selectedApprovalInspectorCorrectiveContext.triggerEvents.length)}
                          />
                        ) : null}
                      </dl>
                      <p className="inspector-copy">{focusedPrimaryCommandDescription}</p>
                      <p className="inspector-copy">{selectedApproval.consequenceSummary}</p>
                      {selectedApprovalInspectorCorrectiveContext?.proposedActions[0]?.reason ? (
                        <p className="inspector-copy">
                          {selectedApprovalInspectorCorrectiveContext.proposedActions[0].reason}
                        </p>
                      ) : null}
                    </>
                  ) : selectedWorkItem ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Work Item" value={selectedWorkItem.title} />
                        <DetailRow label="State" value={selectedWorkItem.state} />
                        <DetailRow label="Workflow Record" value={selectedWorkItem.workflowRecordId} />
                        <DetailRow label="Runtime" value={selectedWorkItem.runtimeSummary} />
                      </dl>
                      <p className="inspector-copy">
                        {selectedWorkItem.waitingReason ?? "This work item currently has no explicit waiting reason."}
                      </p>
                    </>
                  ) : selectedWorkflowRecord ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Phase" value={selectedWorkflowRecord.phase} />
                        <DetailRow label="Validation" value={selectedWorkflowRecord.validationState} />
                        <DetailRow label="Reconciliation" value={selectedWorkflowRecord.reconciliationState} />
                        <DetailRow label="Closure" value={selectedWorkflowRecord.closureReadiness} />
                        <DetailRow label="Plan" value={focusedPlanId} />
                        <DetailRow label="Workflow" value={focusedWorkflowId} />
                        <DetailRow label="Next Action" value={focusedNextAction} />
                        <DetailRow label="Waiting On" value={focusedWaitingOn} />
                      </dl>
                      <p className="inspector-copy">{selectedWorkflowRecord.closureSummary}</p>
                    </>
                  ) : (
                    <p className="inspector-copy">
                      Select a work item or approval to inspect the current runtime-governed object here.
                    </p>
                  )
                }
              ]
            : activeWorkspace === "incidents"
              ? [
                  {
                    id: "context",
                    label: "Context",
                    content: (
                      <dl className="detail-list">
                        <DetailRow label="Severity" value={selectedIncident?.severity ?? "clear"} />
                        <DetailRow label="Recovery State" value={selectedIncident?.recoveryState ?? "idle"} />
                        <DetailRow label="Artifacts" value={String(selectedIncident?.artifactIds.length ?? 0)} />
                        <DetailRow label="Linked Entities" value={String(selectedIncident?.linkedEntities.length ?? 0)} />
                      </dl>
                    )
                  },
                  {
                    id: "next",
                    label: "Next",
                    content: (
                      <p className="inspector-copy">
                        {selectedIncident?.nextAction ?? "Select an incident to see the current recovery move."}
                      </p>
                    )
                  },
                  {
                    id: "runtime",
                    label: "Runtime",
                    content: selectedIncident?.conditionDetail ? (
                      <div className="configuration-inspector-stack">
                        <dl className="detail-list">
                          <DetailRow label="Condition Type" value={selectedIncident.conditionDetail.type ?? "unknown"} />
                          <DetailRow label="Condition Class" value={selectedIncident.conditionDetail.class ?? "unknown"} />
                          <DetailRow label="Restarts" value={String(selectedIncident.conditionDetail.restartCount)} />
                          <DetailRow
                            label="Condition Slots"
                            value={String(selectedIncident.conditionDetail.slotCount ?? selectedIncident.conditionDetail.slots.length)}
                          />
                        </dl>
                        <p className="inspector-copy">{selectedIncident.conditionDetail.message}</p>
                        {selectedIncident.conditionDetail.printed ? (
                          <pre className="runtime-preview">{selectedIncident.conditionDetail.printed}</pre>
                        ) : null}
                        {selectedIncident.restartSuggestions.length ? (
                          <div className="ref-list">
                            {selectedIncident.restartSuggestions.map((restart) => (
                              <span className="thread-flag" key={`${restart.name ?? ""}:${restart.label}`}>
                                {restart.label}
                                {restart.name ? ` · ${restart.name}` : ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="inspector-copy">No restart suggestions were captured for this incident.</p>
                        )}
                      </div>
                    ) : (
                      <p className="inspector-copy">
                        Select an incident with captured runtime failure detail to inspect its condition and restart posture.
                      </p>
                    )
                  }
                ]
              : activeWorkspace === "artifacts"
                ? [
                    {
                      id: "context",
                      label: "Context",
                      content: (
                        <dl className="detail-list">
                          {selectedArtifact ? (
                            <>
                              <DetailRow label="Kind" value={selectedArtifact?.kind ?? "unknown"} />
                              <DetailRow label="State" value={selectedArtifact?.state ?? "unknown"} />
                              <DetailRow label="Authority" value={selectedArtifact?.authority ?? "unknown"} />
                              <DetailRow label="Artifacts" value={String(artifacts.length)} />
                            </>
                          ) : (
                            <>
                              <DetailRow label="Cursor" value={String(selectedEvent?.cursor ?? 0)} />
                              <DetailRow label="Family" value={selectedEvent?.family ?? "unknown"} />
                              <DetailRow label="Visibility" value={selectedEvent?.visibility ?? "unspecified"} />
                              <DetailRow label="Events" value={String(environmentEvents.length)} />
                            </>
                          )}
                        </dl>
                      )
                    },
                    {
                      id: "provenance",
                      label: "Provenance",
                      content: (
                        <p className="inspector-copy">
                          {selectedArtifact?.provenance ?? selectedEvent?.summary ?? "Select evidence to inspect provenance or event role."}
                        </p>
                      )
                    }
                  ]
                : activeWorkspace === "configuration"
                  ? [
                      {
                        id: "edit",
                        label: "Edit",
                        content:
                          selectedConfigurationSection === "theme" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Control how the desktop resolves light and dark appearance for this project shell.
                              </p>
                              <div className="configuration-theme-actions" role="group" aria-label="Theme preference">
                                <button
                                  className={themePreference === "system" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("system")}
                                  type="button"
                                >
                                  System
                                </button>
                                <button
                                  className={themePreference === "light" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("light")}
                                  type="button"
                                >
                                  Light
                                </button>
                                <button
                                  className={themePreference === "dark" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("dark")}
                                  type="button"
                                >
                                  Dark
                                </button>
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "lisp-code-view" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Adjust the delimiter palette used by the structured Lisp renderer across browser and execution surfaces.
                              </p>
                              <div className="configuration-code-colors" role="group" aria-label="Parenthesis depth colors">
                                {normalizeParenDepthColors(lispParenColors).map((color, index) => (
                                  <label className="configuration-color-control" key={`inspector-paren-depth:${index + 1}`}>
                                    <span>{`Depth ${index + 1}`}</span>
                                    <input
                                      className="configuration-color-input"
                                      onChange={(event) => void updateLispParenColor(index, event.target.value)}
                                      type="color"
                                      value={color}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "llm" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Configure the integrated language-model routing surface here. Profiles can target OpenAI, Anthropic, Gemini, xAI, Azure-hosted OpenAI-compatible endpoints, local LM Studio, or any other compatible endpoint you provide directly.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Active Profile" value={providerSummary?.activeProfileName ?? "default"} />
                                <DetailRow label="Routing Mode" value={providerSummary?.routingMode ?? "auto"} />
                                <DetailRow label="Profiles" value={String(providerSummary?.profileCount ?? 0)} />
                              </dl>
                              <div className="configuration-theme-actions" role="group" aria-label="Provider routing mode">
                                <button
                                  className={providerSummary?.routingMode === "auto" ? "starter-chip active" : "starter-chip"}
                                  disabled={isUpdatingProviderRouting}
                                  onClick={() => void applyProviderRoutingMode("auto")}
                                  type="button"
                                >
                                  Auto Routing
                                </button>
                                <button
                                  className={providerSummary?.routingMode === "manual" ? "starter-chip active" : "starter-chip"}
                                  disabled={isUpdatingProviderRouting}
                                  onClick={() => void applyProviderRoutingMode("manual")}
                                  type="button"
                                >
                                  Manual Routing
                                </button>
                              </div>
                              <div className="configuration-provider-profile-list" role="list" aria-label="Provider profiles">
                                {(Array.isArray(providerSummary?.profiles) ? providerSummary.profiles : []).map((profile) => (
                                  <div
                                    className={
                                      profile.name === selectedProviderProfileName
                                        ? "configuration-provider-profile-card active"
                                        : "configuration-provider-profile-card"
                                    }
                                    key={`provider-profile:${profile.name}`}
                                    role="listitem"
                                  >
                                    <button
                                      className="configuration-provider-profile-select"
                                      onClick={() => setSelectedProviderProfileName(profile.name)}
                                      type="button"
                                    >
                                      <strong>{profile.name}</strong>
                                      <span>{profile.provider}</span>
                                    </button>
                                    <div className="configuration-provider-profile-meta">
                                      <Badge tone={profile.name === providerSummary?.activeProfileName ? "active" : "steady"}>
                                        {profile.name === providerSummary?.activeProfileName ? "Active" : "Stored"}
                                      </Badge>
                                      <span>{profile.apiKeyPresent ? "Token stored" : "No token stored"}</span>
                                    </div>
                                    <button
                                      className="starter-chip"
                                      disabled={profile.name === providerSummary?.activeProfileName}
                                      onClick={() => void activateProviderProfile(profile.name)}
                                      type="button"
                                    >
                                      Use Profile
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="configuration-provider-form">
                                <label className="configuration-text-control">
                                  <span>Profile Name</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        profileName: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.profileName}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Vendor Preset</span>
                                  <select
                                    className="configuration-select-input"
                                    onChange={(event) => {
                                      const preset =
                                        LLM_PROVIDER_PRESETS.find((entry) => entry.id === event.target.value) ??
                                        LLM_PROVIDER_PRESETS[0]!;
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        provider: preset.provider,
                                        model: current.model.trim().length > 0 ? current.model : preset.defaultModel,
                                        fastModel:
                                          (current.fastModel?.trim()?.length ?? 0) > 0
                                            ? current.fastModel
                                            : preset.defaultFastModel,
                                        apiBase:
                                          (current.apiBase?.trim()?.length ?? 0) > 0
                                            ? current.apiBase
                                            : (preset.defaultApiBase ?? ""),
                                        locality:
                                          (current.locality?.trim()?.length ?? 0) > 0
                                            ? current.locality
                                            : preset.id === "lm-studio"
                                              ? "local"
                                              : "network"
                                      }));
                                    }}
                                    value={llmProviderPresetForProfile(providerProfileDraft).id}
                                  >
                                    {LLM_PROVIDER_PRESETS.map((preset) => (
                                      <option key={`provider-preset:${preset.id}`} value={preset.id}>
                                        {preset.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="configuration-text-control">
                                  <span>Transport Provider</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        provider: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.provider}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Endpoint</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        apiBase: event.target.value
                                      }))
                                    }
                                    placeholder="https://api.example.com/v1"
                                    type="text"
                                    value={providerProfileDraft.apiBase ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Primary Model</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        model: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.model}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Fast Model</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        fastModel: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.fastModel ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Secure Token</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        apiKey: event.target.value
                                      }))
                                    }
                                    placeholder={
                                      providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName)?.apiKeyPresent
                                        ? "Stored token present. Enter a new token to replace it."
                                        : "Paste a provider token"
                                    }
                                    type="password"
                                    value={providerProfileDraft.apiKey ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Intents</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        intents: event.target.value
                                          .split(",")
                                          .map((value) => value.trim())
                                          .filter(Boolean)
                                      }))
                                    }
                                    placeholder="quick-turn, deep-reasoning, code-execution"
                                    type="text"
                                    value={(providerProfileDraft.intents ?? []).join(", ")}
                                  />
                                </label>
                                <div className="configuration-provider-form-grid">
                                  <label className="configuration-text-control">
                                    <span>Latency Tier</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          latencyTier: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.latencyTier ?? "balanced"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Review Bias</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          reviewBias: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.reviewBias ?? "neutral"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Execution Bias</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          executionBias: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.executionBias ?? "balanced"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Locality</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          locality: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.locality ?? "network"}
                                    />
                                  </label>
                                </div>
                                <label className="configuration-checkbox-control">
                                  <input
                                    checked={Boolean(providerProfileDraft.activate)}
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        activate: event.target.checked
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Activate this profile after saving</span>
                                </label>
                                {providerProfileStatusMessage ? (
                                  <p className="configuration-status-note" role="status">
                                    {providerProfileStatusMessage}
                                  </p>
                                ) : null}
                                {providerProfileError ? (
                                  <p className="configuration-error-note" role="alert">
                                    {providerProfileError}
                                  </p>
                                ) : null}
                                <div className="configuration-provider-actions">
                                  <button
                                    className="starter-chip active"
                                    disabled={isSavingProviderProfile}
                                    onClick={() => void saveProviderProfile(false)}
                                    type="button"
                                  >
                                    Save Profile
                                  </button>
                                  <button
                                    className="starter-chip"
                                    disabled={
                                      isSavingProviderProfile ||
                                      !(
                                        providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName)?.apiKeyPresent
                                      )
                                    }
                                    onClick={() => void saveProviderProfile(true)}
                                    type="button"
                                  >
                                    Clear Stored Token
                                  </button>
                                  <button
                                    className="starter-chip"
                                    onClick={() =>
                                      setProviderProfileDraft(
                                        buildProviderProfileDraft({
                                          profileName: "new-profile"
                                        })
                                      )
                                    }
                                    type="button"
                                  >
                                    New Profile
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "package-management" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Manage runtime package tooling directly: Quicklisp installs, Qlot execution, source-registry entries, and local-project links all route through the live sbcl-agent host.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Manager" value={packageManagementSummary?.packageManager ?? "asdf"} />
                                <DetailRow label="Quicklisp" value={packageManagementSummary?.quicklispAvailableP ? "available" : "unavailable"} />
                                <DetailRow label="Qlot" value={packageManagementSummary?.qlotAvailableP ? "available" : "unavailable"} />
                                <DetailRow label="Source Registry" value={String(packageManagementSummary?.managedSourceRegistryEntryCount ?? 0)} />
                                <DetailRow label="Local Projects" value={String(packageManagementSummary?.localProjectCount ?? 0)} />
                              </dl>
                              <label className="configuration-text-control">
                                <span>Quicklisp System</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setQuicklispSystemDraft(event.target.value)}
                                  placeholder="dexador"
                                  type="text"
                                  value={quicklispSystemDraft}
                                />
                              </label>
                              <button
                                className="starter-chip active"
                                disabled={isPackageManagementBusy || quicklispSystemDraft.trim().length === 0}
                                onClick={() => void installQuicklispPackage()}
                                type="button"
                              >
                                Install Quicklisp Package
                              </button>
                              <label className="configuration-text-control">
                                <span>Qlot Command</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setQlotCommandDraft(event.target.value)}
                                  placeholder="update"
                                  type="text"
                                  value={qlotCommandDraft}
                                />
                              </label>
                              <button
                                className="starter-chip"
                                disabled={isPackageManagementBusy || qlotCommandDraft.trim().length === 0}
                                onClick={() => void executeQlotCommand()}
                                type="button"
                              >
                                Run Qlot Command
                              </button>
                              <label className="configuration-text-control">
                                <span>{sourceRegistryEditOriginalPath ? "Edit Source Registry Entry" : "Add Source Registry Entry"}</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setSourceRegistryDraftPath(event.target.value)}
                                  placeholder="/path/to/system/root"
                                  type="text"
                                  value={sourceRegistryDraftPath}
                                />
                              </label>
                              <div className="configuration-provider-actions">
                                <button
                                  className="starter-chip"
                                  disabled={isPackageManagementBusy || sourceRegistryDraftPath.trim().length === 0}
                                  onClick={() => void saveSourceRegistryEntry()}
                                  type="button"
                                >
                                  {sourceRegistryEditOriginalPath ? "Save Entry" : "Add Entry"}
                                </button>
                                {sourceRegistryEditOriginalPath ? (
                                  <button
                                    className="starter-chip"
                                    onClick={() => {
                                      setSourceRegistryDraftPath("");
                                      setSourceRegistryEditOriginalPath(null);
                                    }}
                                    type="button"
                                  >
                                    Cancel Edit
                                  </button>
                                ) : null}
                              </div>
                              <div className="configuration-inspector-stack">
                                {(Array.isArray(packageManagementSummary?.managedSourceRegistryEntries)
                                  ? packageManagementSummary.managedSourceRegistryEntries
                                  : []).map((entry) => (
                                  <div className="browser-focus-card" key={`source-registry:${entry.entryId}`}>
                                    <div>
                                      <p className="context-label">Source Registry</p>
                                      <strong>{entry.path}</strong>
                                      <p>{entry.existsP ? "Directory reachable" : "Directory not found"}</p>
                                    </div>
                                    <div className="browser-action-strip">
                                      <button
                                        className="starter-chip"
                                        onClick={() => {
                                          setSourceRegistryEditOriginalPath(entry.path);
                                          setSourceRegistryDraftPath(entry.path);
                                        }}
                                        type="button"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="starter-chip"
                                        disabled={isPackageManagementBusy}
                                        onClick={() => void removeSourceRegistryPath(entry.path)}
                                        type="button"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <label className="configuration-text-control">
                                <span>Local Project Path</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setLocalProjectPathDraft(event.target.value)}
                                  placeholder="/path/to/local/project"
                                  type="text"
                                  value={localProjectPathDraft}
                                />
                              </label>
                              <label className="configuration-text-control">
                                <span>Local Project Alias</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setLocalProjectNameDraft(event.target.value)}
                                  placeholder="optional-link-name"
                                  type="text"
                                  value={localProjectNameDraft}
                                />
                              </label>
                              <button
                                className="starter-chip"
                                disabled={isPackageManagementBusy || localProjectPathDraft.trim().length === 0}
                                onClick={() => void saveLocalProject()}
                                type="button"
                              >
                                Add Local Project
                              </button>
                              <div className="configuration-inspector-stack">
                                {(Array.isArray(packageManagementSummary?.localProjects)
                                  ? packageManagementSummary.localProjects
                                  : []).map((project) => (
                                  <div className="browser-focus-card" key={`local-project:${project.projectId}`}>
                                    <div>
                                      <p className="context-label">Local Project</p>
                                      <strong>{project.name}</strong>
                                      <p>{project.path}</p>
                                    </div>
                                    <div className="browser-action-strip">
                                      <button
                                        className="starter-chip"
                                        disabled={isPackageManagementBusy}
                                        onClick={() => void removeLocalProjectByName(project.name)}
                                        type="button"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {packageManagementStatusMessage ? (
                                <p className="configuration-status-note" role="status">
                                  {packageManagementStatusMessage}
                                </p>
                              ) : null}
                              {packageManagementError ? (
                                <p className="configuration-error-note" role="alert">
                                  {packageManagementError}
                                </p>
                              ) : null}
                              {packageManagementCommandResult?.stdout ? (
                                <pre className="runtime-preview">{packageManagementCommandResult.stdout}</pre>
                              ) : null}
                              {packageManagementCommandResult?.stderr ? (
                                <pre className="runtime-preview">{packageManagementCommandResult.stderr}</pre>
                              ) : null}
                            </div>
                          ) : selectedConfigurationSection === "capabilities" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                The governed capability registry is the common manifest layer for internal receivers and future MCP-backed receivers. Every operation here is discoverable through the same desktop-task protocol.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Manifests" value={String(desktopTaskManifests.length)} />
                                <DetailRow
                                  label="MCP-backed"
                                  value={String(desktopTaskManifests.filter((manifest) => manifest.backendKind === "mcp").length)}
                                />
                                <DetailRow
                                  label="Internal"
                                  value={String(desktopTaskManifests.filter((manifest) => manifest.backendKind !== "mcp").length)}
                                />
                              </dl>
                              <div className="configuration-inspector-stack">
                                {desktopTaskManifests.length > 0 ? (
                                  desktopTaskManifests.map((manifest) => {
                                    const invocationRecords = desktopTaskRecords
                                      .filter(
                                        (record) =>
                                          canonicalDesktopTaskCoordinate(record.target) ===
                                            canonicalDesktopTaskCoordinate(manifest.target) &&
                                          canonicalDesktopTaskCoordinate(record.operation) ===
                                            canonicalDesktopTaskCoordinate(manifest.operation)
                                      )
                                      .sort((left, right) =>
                                        String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""))
                                      );
                                    const recentInvocationRecords = invocationRecords.slice(0, 6);
                                    return (
                                      <div className="browser-focus-card" key={`desktop-task-manifest:${manifest.id}`}>
                                        <div>
                                          <p className="context-label">{manifest.target}</p>
                                          <strong>{manifest.operation}</strong>
                                          <p>{manifest.description ?? "No manifest description provided."}</p>
                                        </div>
                                        <dl className="detail-list">
                                          <DetailRow label="Capability" value={manifest.capability ?? "unspecified"} />
                                          <DetailRow label="Backend" value={manifest.backendKind ?? "internal"} />
                                          <DetailRow label="Backend Ref" value={manifest.backendRef ?? "n/a"} />
                                          <DetailRow label="Approval" value={manifest.approvalPolicy ?? "implicit"} />
                                          <DetailRow label="Mode" value={manifest.executionMode ?? "sync"} />
                                          <DetailRow label="Version" value={String(manifest.version ?? 1)} />
                                          <DetailRow label="Invocations" value={String(invocationRecords.length)} />
                                        </dl>
                                        <div className="browser-action-strip">
                                          <Badge tone={manifest.discoverableP ? "active" : "steady"}>
                                            {manifest.discoverableP ? "Discoverable" : "Hidden"}
                                          </Badge>
                                          {manifest.tags.map((tag) => (
                                            <Badge key={`desktop-task-manifest-tag:${manifest.id}:${tag}`} tone="steady">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                        {recentInvocationRecords.length > 0 ? (
                                          <details open>
                                            <summary>Received Invocations</summary>
                                            <div className="configuration-inspector-stack">
                                              {recentInvocationRecords.map((record) => (
                                                <div
                                                  className="browser-focus-card"
                                                  key={`desktop-task-invocation:${manifest.id}:${record.id}`}
                                                >
                                                  <div>
                                                    <p className="context-label">
                                                      {record.createdAt
                                                        ? new Date(record.createdAt).toLocaleString()
                                                        : "Invocation received"}
                                                    </p>
                                                    <strong>{record.status}</strong>
                                                    <p>
                                                      {String(
                                                        record.result?.summary ??
                                                          record.lastError?.summary ??
                                                          record.requestId ??
                                                          "Governed invocation recorded."
                                                      )}
                                                    </p>
                                                  </div>
                                                  <dl className="detail-list">
                                                    <DetailRow label="Request" value={record.requestId ?? "n/a"} />
                                                    <DetailRow label="Approval" value={record.approvalStatus ?? "n/a"} />
                                                    <DetailRow label="Governance" value={record.governanceStatus ?? "n/a"} />
                                                    <DetailRow label="Thread" value={record.threadId ?? "n/a"} />
                                                    <DetailRow label="Turn" value={record.turnId ?? "n/a"} />
                                                  </dl>
                                                </div>
                                              ))}
                                            </div>
                                          </details>
                                        ) : (
                                          <p className="inspector-copy">
                                            No invocations have been recorded for this capability server yet.
                                          </p>
                                        )}
                                        {manifest.requestSchema ? (
                                          <details>
                                            <summary>Request Schema</summary>
                                            <pre className="runtime-preview">{JSON.stringify(manifest.requestSchema, null, 2)}</pre>
                                          </details>
                                        ) : null}
                                        {manifest.resultSchema ? (
                                          <details>
                                            <summary>Result Schema</summary>
                                            <pre className="runtime-preview">{JSON.stringify(manifest.resultSchema, null, 2)}</pre>
                                          </details>
                                        ) : null}
                                        {manifest.retryPolicy ? (
                                          <details>
                                            <summary>Retry Policy</summary>
                                            <pre className="runtime-preview">{JSON.stringify(manifest.retryPolicy, null, 2)}</pre>
                                          </details>
                                        ) : null}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="inspector-copy">
                                    No desktop-task manifests are registered in the current environment.
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "mcp-servers" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Manage MCP server registrations as first-class governed capability providers. These records feed the same manifest and governance protocol as internal desktop task receivers.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Servers" value={String(mcpServerConfigs.length)} />
                                <DetailRow
                                  label="Enabled"
                                  value={String(mcpServerConfigs.filter((config) => config.enabledP).length)}
                                />
                                <DetailRow
                                  label="Discoverable"
                                  value={String(mcpServerConfigs.filter((config) => config.discoverableP).length)}
                                />
                              </dl>
                              <div className="configuration-provider-profile-list" role="list" aria-label="MCP servers">
                                {mcpServerConfigs.map((server) => (
                                  <div
                                    className={
                                      server.id === selectedMcpServerId
                                        ? "configuration-provider-profile-card active"
                                        : "configuration-provider-profile-card"
                                    }
                                    key={`mcp-server:${server.id}`}
                                    role="listitem"
                                  >
                                    <button
                                      className="configuration-provider-profile-select"
                                      onClick={() => setSelectedMcpServerId(server.id)}
                                      type="button"
                                    >
                                      <strong>{server.name}</strong>
                                      <span>{server.transport}</span>
                                    </button>
                                    <div className="configuration-provider-profile-meta">
                                      <Badge tone={server.enabledP ? "active" : "warning"}>
                                        {server.enabledP ? "Enabled" : "Disabled"}
                                      </Badge>
                                      <span>{`${server.operationCount} operations`}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="configuration-provider-form">
                                <label className="configuration-text-control">
                                  <span>Server Name</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        name: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={mcpServerDraft.name}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Transport</span>
                                  <select
                                    className="configuration-select-input"
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        transport: event.target.value === "http" ? "http" : "stdio"
                                      }))
                                    }
                                    value={mcpServerDraft.transport}
                                  >
                                    <option value="stdio">stdio</option>
                                    <option value="http">http</option>
                                  </select>
                                </label>
                                {mcpServerDraft.transport === "stdio" ? (
                                  <>
                                    <label className="configuration-text-control">
                                      <span>Command</span>
                                      <input
                                        className="configuration-text-input"
                                        onChange={(event) =>
                                          setMcpServerDraft((current) => ({
                                            ...current,
                                            command: event.target.value
                                          }))
                                        }
                                        placeholder="npx"
                                        type="text"
                                        value={mcpServerDraft.command ?? ""}
                                      />
                                    </label>
                                    <label className="configuration-text-control">
                                      <span>Arguments</span>
                                      <input
                                        className="configuration-text-input"
                                        onChange={(event) =>
                                          setMcpServerDraft((current) => ({
                                            ...current,
                                            arguments: event.target.value
                                              .split(",")
                                              .map((value) => value.trim())
                                              .filter(Boolean)
                                          }))
                                        }
                                        placeholder="-y, @modelcontextprotocol/server-filesystem, /workspace"
                                        type="text"
                                        value={(mcpServerDraft.arguments ?? []).join(", ")}
                                      />
                                    </label>
                                    <label className="configuration-text-control">
                                      <span>Working Directory</span>
                                      <input
                                        className="configuration-text-input"
                                        onChange={(event) =>
                                          setMcpServerDraft((current) => ({
                                            ...current,
                                            workingDirectory: event.target.value
                                          }))
                                        }
                                        placeholder="/path/to/server/root"
                                        type="text"
                                        value={mcpServerDraft.workingDirectory ?? ""}
                                      />
                                    </label>
                                  </>
                                ) : (
                                  <label className="configuration-text-control">
                                    <span>Endpoint</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setMcpServerDraft((current) => ({
                                          ...current,
                                          endpoint: event.target.value
                                        }))
                                      }
                                      placeholder="https://mcp.example.com"
                                      type="text"
                                      value={mcpServerDraft.endpoint ?? ""}
                                    />
                                  </label>
                                )}
                                <label className="configuration-text-control">
                                  <span>Capabilities</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        capabilities: event.target.value
                                          .split(",")
                                          .map((value) => value.trim())
                                          .filter(Boolean)
                                      }))
                                    }
                                    placeholder="filesystem, search, github"
                                    type="text"
                                    value={(mcpServerDraft.capabilities ?? []).join(", ")}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Environment Variables</span>
                                  <textarea
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        environmentVariables: Object.fromEntries(
                                          event.target.value
                                            .split("\n")
                                            .map((line) => line.trim())
                                            .filter(Boolean)
                                            .map((line) => {
                                              const separator = line.indexOf("=");
                                              if (separator < 0) {
                                                return [line, ""];
                                              }
                                              return [
                                                line.slice(0, separator).trim(),
                                                line.slice(separator + 1).trim()
                                              ];
                                            })
                                        )
                                      }))
                                    }
                                    placeholder={"API_KEY=...\nPROJECT_ROOT=/workspace"}
                                    rows={4}
                                    value={Object.entries(mcpServerDraft.environmentVariables ?? {})
                                      .map(([key, value]) => `${key}=${value}`)
                                      .join("\n")}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Retry Policy (JSON)</span>
                                  <textarea
                                    className="configuration-text-input"
                                    onChange={(event) => {
                                      const nextValue = event.target.value.trim();
                                      if (nextValue.length === 0) {
                                        setMcpServerDraft((current) => ({
                                          ...current,
                                          retryPolicy: {}
                                        }));
                                        return;
                                      }
                                      try {
                                        const parsed = JSON.parse(nextValue) as Record<string, unknown>;
                                        setMcpServerDraft((current) => ({
                                          ...current,
                                          retryPolicy: parsed
                                        }));
                                      } catch {
                                        // Keep the previous parsed value until the JSON becomes valid again.
                                      }
                                    }}
                                    rows={4}
                                    value={JSON.stringify(mcpServerDraft.retryPolicy ?? {}, null, 2)}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Health Status</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        healthStatus: event.target.value
                                      }))
                                    }
                                    placeholder="unknown"
                                    type="text"
                                    value={mcpServerDraft.healthStatus ?? ""}
                                  />
                                </label>
                                <label className="configuration-checkbox-control">
                                  <input
                                    checked={Boolean(mcpServerDraft.enabledP)}
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        enabledP: event.target.checked
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Enabled</span>
                                </label>
                                <label className="configuration-checkbox-control">
                                  <input
                                    checked={Boolean(mcpServerDraft.discoverableP)}
                                    onChange={(event) =>
                                      setMcpServerDraft((current) => ({
                                        ...current,
                                        discoverableP: event.target.checked
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Discoverable</span>
                                </label>
                                {mcpServerStatusMessage ? (
                                  <p className="configuration-status-note" role="status">
                                    {mcpServerStatusMessage}
                                  </p>
                                ) : null}
                                {mcpServerError ? (
                                  <p className="configuration-error-note" role="alert">
                                    {mcpServerError}
                                  </p>
                                ) : null}
                                <div className="configuration-provider-actions">
                                  <button
                                    className="starter-chip active"
                                    disabled={isSavingMcpServer}
                                    onClick={() => void saveMcpServer()}
                                    type="button"
                                  >
                                    Save MCP Server
                                  </button>
                                  <button
                                    className="starter-chip"
                                    onClick={() => {
                                      setSelectedMcpServerId(null);
                                      setMcpServerDraft(buildMcpServerDraft());
                                    }}
                                    type="button"
                                  >
                                    New Server
                                  </button>
                                  <button
                                    className="starter-chip"
                                    disabled={isSavingMcpServer || !selectedMcpServerId}
                                    onClick={() => {
                                      if (selectedMcpServerId) {
                                        void removeMcpServer(selectedMcpServerId);
                                      }
                                    }}
                                    type="button"
                                  >
                                    Remove Server
                                  </button>
                                </div>
                              </div>
                              {selectedMcpServerId ? (
                                <div className="configuration-inspector-stack">
                                  {(mcpServerConfigs.find((server) => server.id === selectedMcpServerId)?.operations ?? []).map(
                                    (manifest) => (
                                      <div className="browser-focus-card" key={`mcp-server-operation:${manifest.id}`}>
                                        <div>
                                          <p className="context-label">Registered Operation</p>
                                          <strong>{`${manifest.target} / ${manifest.operation}`}</strong>
                                          <p>{manifest.description ?? "No manifest description provided."}</p>
                                        </div>
                                        <div className="browser-action-strip">
                                          <Badge tone="active">{manifest.backendKind ?? "mcp"}</Badge>
                                          <Badge tone="steady">{manifest.approvalPolicy ?? "implicit"}</Badge>
                                          <Badge tone="steady">{manifest.executionMode ?? "sync"}</Badge>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Tune the shell surface density directly. Each percentage slider changes only its own target and persists with desktop preferences.
                              </p>
                              <div className="configuration-slider-stack" role="group" aria-label="Desktop surface scale controls">
                                <label className="configuration-slider-control">
                                  <span>Mouseover Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "tooltipScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={tooltipScalePercent}
                                    />
                                    <strong>{`${tooltipScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Control Iconography</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "controlIconScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={controlIconScalePercent}
                                    />
                                    <strong>{`${controlIconScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Iconified Applications</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "dockIconScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={dockIconScalePercent}
                                    />
                                    <strong>{`${dockIconScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Conversation Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "conversationTextScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={conversationTextScalePercent}
                                    />
                                    <strong>{`${conversationTextScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Source Code Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "sourceCodeTextScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={sourceCodeTextScalePercent}
                                    />
                                    <strong>{`${sourceCodeTextScalePercent}%`}</strong>
                                  </div>
                                </label>
                              </div>
                            </div>
                          )
                      }
                    ]
                    : activeWorkspace === "documentation"
                      ? [
                          {
                            id: "context",
                            label: "Context",
                            content: (
                              <div className="configuration-inspector-stack">
                                <dl className="detail-list">
                                  <DetailRow label="Title" value={selectedDocumentationPage?.title ?? "No page selected"} />
                                  <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                                  <DetailRow label="Slug" value={selectedDocumentationPage?.slug ?? selectedDocumentationPage?.title ?? "unknown"} />
                                </dl>
                                <p className="inspector-copy">
                                  {selectedDocumentationPage?.summary ??
                                    "Select a documentation page from the workspace table to read it in the inspector."}
                                </p>
                                <button
                                  className="starter-chip"
                                  onClick={() => void openPublishedDocumentation()}
                                  type="button"
                                >
                                  Open Published Site
                                </button>
                              </div>
                            )
                          },
                          {
                            id: "content",
                            label: "Content",
                            content: selectedDocumentationPage ? (
                              <article
                                className="documentation-markdown inspector-documentation-markdown"
                                dangerouslySetInnerHTML={{ __html: renderedDocumentationHtml }}
                              />
                            ) : (
                              <p className="inspector-copy">
                                Select a documentation page from the workspace table to read it here.
                              </p>
                            )
                          }
                        ]
                    : [];
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>(inspectorTabs[0]?.id ?? "context");

  useEffect(() => {
    const nextInspectorTab = inspectorTabs[0]?.id ?? "context";
    if (!inspectorTabs.some((tab) => tab.id === activeInspectorTab) && activeInspectorTab !== nextInspectorTab) {
      setActiveInspectorTab(nextInspectorTab);
    }
  }, [activeInspectorTab, inspectorTabs]);

  useEffect(() => {
    if (
      !renderChrome &&
      activeWorkspace === "browser" &&
      runtimeEntityDetail?.data.facets.length &&
      inspectorTabs.some((tab) => tab.id === "detail") &&
      activeInspectorTab !== "detail"
    ) {
      setActiveInspectorTab("detail");
    }
  }, [
    activeInspectorTab,
    activeWorkspace,
    inspectorTabs,
    renderChrome,
    runtimeEntityDetail?.data.entityId,
    runtimeEntityDetail?.data.facets.length
  ]);

  const selectedInspectorTab = inspectorTabs.find((tab) => tab.id === activeInspectorTab) ?? inspectorTabs[0] ?? null;
  const inspectorClassName = renderChrome ? "inspector" : "inspector inspector-embedded";
  const renderInspectorChrome = (title: string) =>
    renderChrome ? (
      <div className="panel-titlebar">
        <button
          aria-label={title === "Workspace" ? "Collapse Inspector" : "Collapse workspace panel"}
          className="panel-titlebar-toggle"
          onClick={onToggleInspector}
          title={title === "Workspace" ? "Collapse Inspector" : "Collapse workspace panel"}
          type="button"
        >
          <span aria-hidden="true">−</span>
        </button>
        <span className="panel-titlebar-label">{title}</span>
      </div>
    ) : null;

  return (
    <aside className={inspectorClassName} ref={panelRef}>
      {renderInspectorChrome("Inspector")}
      <div className="inspector-body">
        {activeWorkspace === "configuration" ? null : (
          <section className="inspector-card">
            <p className="eyebrow">Current Focus</p>
            <h3>{currentFocusTitle}</h3>
            <p className="inspector-copy">{currentFocusSummary}</p>
            <dl className="detail-list">
              <DetailRow label="Surface" value={labelForWorkspace(activeWorkspace)} />
              <DetailRow label="Binding" value={binding?.environmentId ?? "unbound"} />
              <DetailRow label="Runtime" value={summary?.activeContext.runtimePackage ?? status?.runtimeState ?? "unknown"} />
              <DetailRow label="Workflow" value={status?.workflowState ?? "unknown"} />
            </dl>
          </section>
        )}
        {selectedInspectorTab ? (
          <section className="inspector-card inspector-tabs-card">
            {inspectorTabs.length > 1 ? (
              <div className="inspector-tabs" role="tablist" aria-label="Inspector panels">
                {inspectorTabs.map((tab) => (
                  <button
                    aria-selected={tab.id === selectedInspectorTab.id}
                    className={tab.id === selectedInspectorTab.id ? "inspector-tab active" : "inspector-tab"}
                    key={tab.id}
                    onClick={() => setActiveInspectorTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="inspector-tab-panel" role="tabpanel">
              {selectedInspectorTab.content}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function inspectorRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstInspectorString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}
