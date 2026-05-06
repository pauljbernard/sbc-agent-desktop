import type {
  AlignmentStateDto,
  ApprovalRequestSummaryDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  ReconciliationDecisionDto,
  WorkItemSummaryDto
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader } from "./surface-support";

function toneForProjectStatus(status: string): "active" | "steady" | "warning" | "danger" {
  switch (status) {
    case "active":
    case "in-progress":
      return "active";
    case "draft":
    case "proposed":
      return "steady";
    case "attention_required":
    case "blocked":
      return "warning";
    case "deprecated":
    case "retired":
      return "danger";
    default:
      return "steady";
  }
}

function toneForAlignmentStatus(status: string | undefined): "active" | "steady" | "warning" | "danger" {
  switch (status) {
    case "aligned":
      return "active";
    case "degraded":
      return "warning";
    case "misaligned":
      return "danger";
    default:
      return "steady";
  }
}

function toneForReconciliationDecision(decision: string | undefined): "active" | "steady" | "warning" | "danger" {
  switch (decision) {
    case "maintain":
      return "active";
    case "runtime":
    case "intent":
      return "warning";
    case "co-evolve":
      return "danger";
    default:
      return "steady";
  }
}

function alignmentSummaryRows(
  alignmentState: AlignmentStateDto | null | undefined
): Array<{ label: string; value: string }> {
  if (!alignmentState) {
    return [];
  }
  return [
    { label: "Alignment Status", value: alignmentState.status },
    { label: "Alignment Score", value: alignmentState.score.toFixed(2) },
    { label: "Confidence", value: alignmentState.confidence.toFixed(2) },
    { label: "Divergence Types", value: alignmentState.divergenceTypes.join(", ") || "none" },
    { label: "Gap Count", value: String(alignmentState.gapCount) }
  ];
}

function reconciliationSummaryRows(
  reconciliationDecision: ReconciliationDecisionDto | null | undefined
): Array<{ label: string; value: string }> {
  if (!reconciliationDecision) {
    return [];
  }
  return [
    { label: "Corrective Direction", value: reconciliationDecision.decision },
    { label: "Approval Required", value: reconciliationDecision.requiresApproval ? "yes" : "no" },
    { label: "Approval Posture", value: reconciliationDecision.approvalPosture },
    { label: "Alignment Status", value: reconciliationDecision.alignmentStatus },
    { label: "Confidence", value: reconciliationDecision.confidence.toFixed(2) },
    { label: "Divergence Types", value: reconciliationDecision.divergenceTypes.join(", ") || "none" },
    { label: "Proposed Actions", value: String(reconciliationDecision.proposedActions.length) },
    { label: "Trigger Events", value: String(reconciliationDecision.triggerEvents.length) }
  ];
}

function qualityGateCriteria(
  gate: NonNullable<ProjectDetailDto["qualityGateEvidence"]>["qualityGates"][number]
): string[] {
  const criteria: string[] = [];
  if (gate.requiredHarnessIds.length > 0) {
    criteria.push(`${gate.requiredHarnessIds.length} harnesses`);
  }
  if (gate.minimumLinkedWorkItems > 0) {
    criteria.push(`${gate.minimumLinkedWorkItems} work items`);
  }
  if (gate.minimumLinkedIncidents > 0) {
    criteria.push(`${gate.minimumLinkedIncidents} incidents`);
  }
  criteria.push(gate.requireSourceRoots ? "source roots required" : "source roots optional");
  if (gate.requireCoverage) {
    criteria.push("coverage required");
  }
  if (gate.maximumFailedTests != null) {
    criteria.push(`max failed tests ${gate.maximumFailedTests}`);
  }
  if (gate.maximumSayTurnLatencySeconds != null) {
    criteria.push(`say latency <= ${gate.maximumSayTurnLatencySeconds}s`);
  }
  if (gate.maximumEnvironmentSaveLoadSeconds != null) {
    criteria.push(`save/load <= ${gate.maximumEnvironmentSaveLoadSeconds}s`);
  }
  if (gate.requireRecoveryReady) {
    criteria.push("recovery ready required");
  }
  return criteria;
}

function testingStrategyRequiredEvidence(
  testingStrategy: ProjectDetailDto["testingStrategy"]
): string[] {
  return testingStrategy?.requiredEvidence ?? [];
}

function testingStrategySuiteExpectations(
  testingStrategy: ProjectDetailDto["testingStrategy"]
): Array<{ harnessId: string; purpose: string; evidenceKinds: string[] }> {
  return (testingStrategy?.suiteExpectations ?? []).map((item) => ({
    harnessId: item.harnessId,
    purpose: item.purpose ?? "",
    evidenceKinds: item.evidenceKinds
  }));
}

function testingStrategyThresholdSummary(
  testingStrategy: ProjectDetailDto["testingStrategy"]
): string[] {
  const thresholdPolicy = testingStrategy?.thresholdPolicy;
  if (!thresholdPolicy) {
    return [];
  }
  const summary: string[] = [];
  if (thresholdPolicy.maxFailedTests != null) {
    summary.push(`max failed tests ${thresholdPolicy.maxFailedTests}`);
  }
  if (thresholdPolicy.maxSayTurnLatencySeconds != null) {
    summary.push(`say latency <= ${thresholdPolicy.maxSayTurnLatencySeconds}s`);
  }
  if (thresholdPolicy.maxEnvironmentSaveLoadSeconds != null) {
    summary.push(`save/load <= ${thresholdPolicy.maxEnvironmentSaveLoadSeconds}s`);
  }
  if (thresholdPolicy.requireCoverage) {
    summary.push("coverage required");
  }
  if (thresholdPolicy.requireRecoveryReady) {
    summary.push("recovery ready required");
  }
  return summary;
}

function readinessSummaryRows(
  readinessSummary: ProjectDetailDto["readinessSummary"]
): Array<{ label: string; value: string }> {
  if (!readinessSummary) {
    return [];
  }
  return [
    { label: "Project Readiness", value: readinessSummary.status },
    { label: "Testing Readiness", value: readinessSummary.testingReadiness },
    { label: "Quality Gate Readiness", value: readinessSummary.qualityGateReadiness },
    { label: "Recovery Readiness", value: readinessSummary.recoveryReadiness },
    { label: "Release Readiness", value: readinessSummary.releaseReadinessStatus },
    { label: "Release Review", value: readinessSummary.releaseReviewState },
    { label: "Signoff Progress", value: readinessSummary.releaseSignoffState },
    { label: "Signoff Ownership", value: readinessSummary.releaseSignoffOwnershipReady ? "ready" : "incomplete" },
    { label: "Release Phase", value: readinessSummary.releaseCurrentPhase ?? "unknown" },
    { label: "Next Phase", value: readinessSummary.releaseTargetPhase ?? "none" },
    { label: "Transition Ready", value: readinessSummary.releaseTransitionReady ? "yes" : "no" },
    { label: "Readiness Obligations", value: String(readinessSummary.readinessObligationCount) },
    { label: "Blocked Obligations", value: String(readinessSummary.blockedReadinessObligationCount) },
    { label: "Ready Suites", value: String(readinessSummary.suiteReadyCount) },
    { label: "Blocked Suites", value: String(readinessSummary.suiteBlockedCount) }
  ];
}

function testingEvidenceStatusSummary(
  testingEvidence: ProjectDetailDto["testingEvidence"]
): Array<{ label: string; value: string }> {
  const evidenceStatus = testingEvidence?.evidenceStatus;
  if (!evidenceStatus) {
    return [];
  }
  return [
    {
      label: "Evidence Readiness",
      value: evidenceStatus.status
    },
    {
      label: "Available Evidence",
      value: evidenceStatus.availableEvidence.join(", ") || "none"
    },
    {
      label: "Missing Evidence",
      value: evidenceStatus.missingEvidence.join(", ") || "none"
    }
  ];
}

function performanceMetricText(value: unknown, key: "sayTurnLatency" | "environmentSaveLoad"): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "n/a";
  }
  const record = value as Record<string, unknown>;
  if (key === "sayTurnLatency" && typeof record.avgSeconds !== "undefined") {
    return `${String(record.avgSeconds)}s`;
  }
  if (key === "environmentSaveLoad" && typeof record.totalSeconds !== "undefined") {
    return `${String(record.totalSeconds)}s`;
  }
  return "n/a";
}

function testingEvidenceSummary(testingEvidence: ProjectDetailDto["testingEvidence"]): Array<{ label: string; value: string }> {
  const latestSummary = testingEvidence?.latestReport?.summary ?? null;
  const performance = testingEvidence?.performance ?? null;
  return [
    {
      label: "Coverage",
      value: testingEvidence?.coverage.present ? "present" : "absent"
    },
    {
      label: "Coverage Index",
      value: testingEvidence?.coverage.indexPath ?? "n/a"
    },
    {
      label: "Latest Report",
      value: testingEvidence?.latestReport?.generatedAt ?? "n/a"
    },
    {
      label: "Suite",
      value: testingEvidence?.latestReport?.suiteId ?? "n/a"
    },
    {
      label: "Total Tests",
      value: latestSummary && typeof latestSummary.total !== "undefined" ? String(latestSummary.total) : "n/a"
    },
    {
      label: "Passed",
      value: latestSummary && typeof latestSummary.passed !== "undefined" ? String(latestSummary.passed) : "n/a"
    },
    {
      label: "Failed",
      value: latestSummary && typeof latestSummary.failed !== "undefined" ? String(latestSummary.failed) : "n/a"
    },
    {
      label: "Say Turn Latency",
      value: performanceMetricText(performance?.sayTurnLatency, "sayTurnLatency")
    },
    {
      label: "Save/Load Latency",
      value: performanceMetricText(performance?.environmentSaveLoad, "environmentSaveLoad")
    }
  ];
}

function formatRecordPreview(record: Record<string, unknown> | null | undefined): string {
  if (!record || Object.keys(record).length === 0) {
    return "None";
  }

  return Object.entries(record)
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("\n");
}

function formatTraceLink(link: {
  relation: string;
  sourceKind: string;
  sourceId: string;
  targetKind: string;
  targetId: string;
}): string {
  return `${link.sourceKind}:${link.sourceId} -> ${link.relation} -> ${link.targetKind}:${link.targetId}`;
}

export function ProjectsWorkspace({
  projectSummaries,
  selectedProjectId,
  selectedProjectDetail,
  currentProjectId,
  approvalRequests,
  workItems,
  isDecidingApproval,
  onSelectProject,
  onOpenProjectDialog,
  onCreateProjectDialog,
  onEditConstitution,
  onAddArchitectureDecision,
  onAddFeatureSpecification,
  onAddQualityGate,
  onAddRequirement,
  onAddSourceRoot,
  onAddUserJourney,
  onBindTestingHarness,
  onEditDesignSystem,
  onEditStyleGuide,
  onEditTestingStrategy,
  onEditReleaseReadiness,
  onEditReadinessObligations,
  onOpenApprovalRequest,
  onSubmitApprovalDecision,
  openInspectorSurface
}: {
  projectSummaries: ProjectSummaryDto[];
  selectedProjectId: string | null;
  selectedProjectDetail: ProjectDetailDto | null;
  currentProjectId: string | null;
  approvalRequests: ApprovalRequestSummaryDto[];
  workItems: WorkItemSummaryDto[];
  isDecidingApproval: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenProjectDialog: () => void;
  onCreateProjectDialog: () => void;
  onEditConstitution: () => void;
  onAddArchitectureDecision: () => void;
  onAddFeatureSpecification: () => void;
  onAddQualityGate: () => void;
  onAddRequirement: () => void;
  onAddSourceRoot: () => void;
  onAddUserJourney: () => void;
  onBindTestingHarness: () => void;
  onEditDesignSystem: () => void;
  onEditStyleGuide: () => void;
  onEditTestingStrategy: () => void;
  onEditReleaseReadiness: () => void;
  onEditReadinessObligations: () => void;
  onOpenApprovalRequest: (requestId: string) => Promise<void>;
  onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const selectedSummary =
    projectSummaries.find((project) => project.projectId === selectedProjectId) ?? projectSummaries[0] ?? null;
  const selectedProject = selectedProjectDetail ?? selectedSummary;
  const selectedCorrectiveWorkItem =
    (selectedProjectDetail
      ? workItems.find(
          (item) =>
            selectedProjectDetail.linkedWorkItemIds.includes(item.workItemId)
            && item.approvalCount > 0
            && item.correctiveContext
        )
      : null)
    ?? workItems.find((item) => item.approvalCount > 0 && item.correctiveContext)
    ?? null;
  const selectedCorrectiveApproval =
    (selectedCorrectiveWorkItem
      ? approvalRequests.find(
          (request) =>
            request.state === "awaiting"
            && request.title.trim().toLowerCase() === selectedCorrectiveWorkItem.title.trim().toLowerCase()
        )
      : null)
    ?? approvalRequests.find((request) => request.state === "awaiting")
    ?? null;

  return (
    <div className="projects-journey">
      <section className="panel evidence-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h3>{selectedProject?.title ?? "No governed project selected"}</h3>
          </div>
          {selectedProject ? <Badge tone={toneForProjectStatus(selectedProject.status)}>{selectedProject.status}</Badge> : null}
        </div>
        {selectedProject?.summary ? <p className="lead-copy">{selectedProject.summary}</p> : null}
        <div className="browser-action-strip">
          <button className="starter-chip" onClick={onOpenProjectDialog} type="button">
            Open Project
          </button>
          <button className="starter-chip" onClick={onCreateProjectDialog} type="button">
            Create Project
          </button>
          <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
            Open Inspector
          </button>
        </div>
      </section>

      <div className="configuration-layout">
        <section className="configuration-pane panel">
          <PanelHeader
            title="Project Registry"
            subtitle="Select a project."
          />
          <BrowserDataTable
            key="project-registry"
            columnTemplate="minmax(0, 1.2fr) minmax(0, 0.65fr) minmax(0, 0.65fr) minmax(0, 1.35fr)"
            columns={[
              {
                id: "title",
                label: "Project",
                render: (row) => (
                  <div>
                    <strong>{row.title}</strong>
                    {row.projectId === currentProjectId ? <div className="thread-flag">current shell project</div> : null}
                  </div>
                ),
                sortValue: (row) => row.title,
                searchValue: (row) => `${row.title} ${row.summary} ${row.status}`
              },
              {
                id: "status",
                label: "Status",
                render: (row) => <Badge tone={toneForProjectStatus(row.status)}>{row.status}</Badge>,
                sortValue: (row) => row.status
              },
              {
                id: "counts",
                label: "Scope",
                render: (row) =>
                  `${row.requirementCount} req / ${row.featureSpecCount} feat / ${row.journeyCount} journeys`,
                sortValue: (row) => row.requirementCount + row.featureSpecCount + row.journeyCount,
                searchValue: (row) =>
                  `${row.requirementCount} ${row.featureSpecCount} ${row.journeyCount} ${row.architectureDecisionCount}`
              },
              {
                id: "summary",
                label: "Summary",
                render: (row) => row.summary,
                sortValue: (row) => row.summary,
                searchValue: (row) => row.summary
              }
            ]}
            emptyMessage="No governed project records are available."
            filterLabel="Status"
            filterOptions={Array.from(new Set(projectSummaries.map((project) => project.status))).map((value) => ({
              label: value,
              value
            }))}
            getFilterValue={(row) => row.status}
            getRowKey={(row) => row.projectId}
            onSelect={(row) => onSelectProject(row.projectId)}
            rows={projectSummaries}
            searchPlaceholder="Search governed projects"
            selectedKey={selectedProject?.projectId ?? null}
          />
        </section>

        <section className="configuration-pane panel">
          <PanelHeader
            title="Project Detail"
            subtitle={selectedProjectDetail ? "Governed project record." : ""}
          />
          {selectedProjectDetail ? (
            <div className="configuration-inspector-stack">
              <div className="detail-list">
                <div className="detail-row">
                  <dt>Requirements</dt>
                  <dd>{selectedProjectDetail.requirements.length}</dd>
                </div>
                <div className="detail-row">
                  <dt>Features</dt>
                  <dd>{selectedProjectDetail.featureSpecifications.length}</dd>
                </div>
                <div className="detail-row">
                  <dt>Journeys</dt>
                  <dd>{selectedProjectDetail.userJourneys.length}</dd>
                </div>
                <div className="detail-row">
                  <dt>Decisions</dt>
                  <dd>{selectedProjectDetail.architectureDecisions.length}</dd>
                </div>
                <div className="detail-row">
                  <dt>Source Roots</dt>
                  <dd>{selectedProjectDetail.sourceRoots.length}</dd>
                </div>
              </div>

              <section className="linked-entities-panel">
                <PanelHeader title="Trust Posture" subtitle="" />
                <div className="thread-list">
                  <div className="thread-row active">
                    <div className="thread-row-top">
                      <strong>Alignment</strong>
                      <Badge tone={toneForAlignmentStatus(selectedProjectDetail.alignmentState?.status)}>
                        {selectedProjectDetail.alignmentState?.status ?? "unknown"}
                      </Badge>
                    </div>
                    <p>
                      {selectedProjectDetail.alignmentState
                        ? `${selectedProjectDetail.alignmentState.divergenceTypes.length} divergence types across ${selectedProjectDetail.alignmentState.gapCount} gaps.`
                        : "No project-scoped alignment posture is currently available."}
                    </p>
                  </div>
                  <div className="thread-row active">
                    <div className="thread-row-top">
                      <strong>Corrective Direction</strong>
                      <Badge tone={toneForReconciliationDecision(selectedProjectDetail.reconciliationDecision?.decision)}>
                        {selectedProjectDetail.reconciliationDecision?.decision ?? "unknown"}
                      </Badge>
                    </div>
                    <p>
                      {selectedProjectDetail.reconciliationDecision?.proposedActions[0]?.reason ??
                        "No project-scoped reconciliation direction is currently available."}
                    </p>
                  </div>
                </div>
                <div className="detail-list">
                  {alignmentSummaryRows(selectedProjectDetail.alignmentState).map((row) => (
                    <div className="detail-row" key={`alignment:${row.label}`}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                  {reconciliationSummaryRows(selectedProjectDetail.reconciliationDecision).map((row) => (
                    <div className="detail-row" key={`reconciliation:${row.label}`}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </div>
                {selectedCorrectiveApproval ? (
                  <div className="browser-action-strip">
                    <button
                      className="starter-chip"
                      onClick={() => void onOpenApprovalRequest(selectedCorrectiveApproval.requestId)}
                      type="button"
                    >
                      Review Approval
                    </button>
                    {selectedCorrectiveApproval.state === "awaiting" ? (
                      <button
                        className="starter-chip"
                        disabled={isDecidingApproval}
                        onClick={() => onSubmitApprovalDecision(selectedCorrectiveApproval.requestId, "approve")}
                        type="button"
                      >
                        {isDecidingApproval ? "Submitting..." : "Approve Corrective Work"}
                      </button>
                    ) : null}
                    {selectedCorrectiveApproval.state === "awaiting" ? (
                      <button
                        className="starter-chip"
                        disabled={isDecidingApproval}
                        onClick={() => onSubmitApprovalDecision(selectedCorrectiveApproval.requestId, "deny")}
                        type="button"
                      >
                        {isDecidingApproval ? "Submitting..." : "Deny Corrective Work"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <section className="linked-entities-panel">
                  <PanelHeader title="Corrective Queue" subtitle="" />
                  <div className="thread-list">
                    {selectedProjectDetail.reconciliationDecision?.proposedActions.length ? (
                      selectedProjectDetail.reconciliationDecision.proposedActions.map((action, index) => (
                        <div className="thread-row active" key={`reconciliation-action:${action.kind}:${index}`}>
                          <div className="thread-row-top">
                            <strong>{action.kind}</strong>
                            <span>{action.target}</span>
                          </div>
                          <p>{action.reason}</p>
                        </div>
                      ))
                    ) : (
                      <p className="list-empty">No corrective actions are currently queued for this project.</p>
                    )}
                  </div>
                </section>
                <section className="linked-entities-panel">
                  <PanelHeader title="Trigger Events" subtitle="" />
                  <div className="thread-list">
                    {selectedProjectDetail.reconciliationDecision?.triggerEvents.length ? (
                      selectedProjectDetail.reconciliationDecision.triggerEvents.map((event) => (
                        <div className="thread-row active" key={`reconciliation-event:${event.eventId}`}>
                          <div className="thread-row-top">
                            <strong>{event.kind}</strong>
                            <span>{event.family ?? "event"}</span>
                          </div>
                          <p>{event.entityId ?? event.eventId}</p>
                        </div>
                      ))
                    ) : (
                      <p className="list-empty">No trigger events are currently attached to this project trust posture.</p>
                    )}
                  </div>
                </section>
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Constitution" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onEditConstitution} type="button">
                    Edit Constitution
                  </button>
                </div>
                <pre className="runtime-preview">{formatRecordPreview(selectedProjectDetail.constitution)}</pre>
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Requirements" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onAddRequirement} type="button">
                    Add Requirement
                  </button>
                </div>
                <div className="thread-list">
                  {selectedProjectDetail.requirements.length > 0 ? (
                    selectedProjectDetail.requirements.map((requirement) => (
                      <div className="thread-row active" key={requirement.requirementId}>
                        <div className="thread-row-top">
                          <strong>{requirement.title}</strong>
                          <Badge tone={toneForProjectStatus(requirement.status)}>{requirement.priority}</Badge>
                        </div>
                        <p>{requirement.summary}</p>
                      </div>
                    ))
                  ) : (
                    <p className="list-empty">No governed requirements are attached to this project.</p>
                  )}
                </div>
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Specifications And Journeys" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onAddFeatureSpecification} type="button">
                    Add Feature Specification
                  </button>
                  <button className="starter-chip" onClick={onAddUserJourney} type="button">
                    Add User Journey
                  </button>
                </div>
                <div className="thread-list">
                  {selectedProjectDetail.featureSpecifications.map((feature) => (
                    <div className="thread-row active" key={feature.featureSpecId}>
                      <div className="thread-row-top">
                        <strong>{feature.title}</strong>
                        <Badge tone={toneForProjectStatus(feature.status)}>{feature.status}</Badge>
                      </div>
                      <p>{feature.summary}</p>
                    </div>
                  ))}
                  {selectedProjectDetail.userJourneys.map((journey) => (
                    <div className="thread-row active" key={journey.journeyId}>
                      <div className="thread-row-top">
                        <strong>{journey.title}</strong>
                        <span>{journey.actors.join(", ") || "actorless"}</span>
                      </div>
                      <p>{journey.summary}</p>
                    </div>
                  ))}
                  {selectedProjectDetail.featureSpecifications.length === 0 &&
                  selectedProjectDetail.userJourneys.length === 0 ? (
                    <p className="list-empty">No feature specifications or journeys are attached yet.</p>
                  ) : null}
                </div>
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Architecture And Evidence" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onAddArchitectureDecision} type="button">
                    Add Architecture Decision
                  </button>
                  <button className="starter-chip" onClick={onEditDesignSystem} type="button">
                    Edit Design System
                  </button>
                  <button className="starter-chip" onClick={onEditStyleGuide} type="button">
                    Edit Style Guide
                  </button>
                  <button className="starter-chip" onClick={onAddSourceRoot} type="button">
                    Add Source Root
                  </button>
                  <button className="starter-chip" onClick={onBindTestingHarness} type="button">
                    Bind Testing Harness
                  </button>
                </div>
                <pre className="runtime-preview">{formatRecordPreview(selectedProjectDetail.designSystem)}</pre>
                <pre className="runtime-preview">{formatRecordPreview(selectedProjectDetail.styleGuide)}</pre>
                <div className="thread-list">
                  {selectedProjectDetail.architectureDecisions.map((decision) => (
                    <div className="thread-row active" key={decision.architectureDecisionId}>
                      <div className="thread-row-top">
                        <strong>{decision.title}</strong>
                        <Badge tone={toneForProjectStatus(decision.status)}>{decision.status}</Badge>
                      </div>
                      <p>{decision.summary}</p>
                    </div>
                  ))}
                  {selectedProjectDetail.linkedWorkItems.map((workItem) => (
                    <div className="thread-row active" key={workItem.workItemId}>
                      <div className="thread-row-top">
                        <strong>{workItem.title}</strong>
                        <span>{workItem.status}</span>
                      </div>
                      <p>{workItem.pendingValidations.length} pending validations.</p>
                    </div>
                  ))}
                  {selectedProjectDetail.linkedIncidents.map((incident) => (
                    <div className="thread-row active" key={incident.incidentId}>
                      <div className="thread-row-top">
                        <strong>{incident.title}</strong>
                        <span>{incident.status}</span>
                      </div>
                      <p>{incident.summary}</p>
                    </div>
                  ))}
                  {selectedProjectDetail.linkedTestingHarnesses.map((harness) => (
                    <div className="thread-row active" key={harness.harnessId}>
                      <div className="thread-row-top">
                        <strong>{harness.label}</strong>
                        <span>{harness.kind}</span>
                      </div>
                      <p>{harness.entrypoint}</p>
                    </div>
                  ))}
                  {selectedProjectDetail.sourceRoots.map((sourceRoot) => (
                    <div className="thread-row active" key={sourceRoot}>
                      <div className="thread-row-top">
                        <strong>{sourceRoot}</strong>
                        <span>source root</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Testing Evidence" subtitle="" />
                {selectedProjectDetail.testingStrategy ? (
                  <>
                    <div className="detail-list">
                      <div className="detail-row">
                        <dt>Required Evidence</dt>
                        <dd>
                          {testingStrategyRequiredEvidence(selectedProjectDetail.testingStrategy).join(", ") || "none"}
                        </dd>
                      </div>
                      <div className="detail-row">
                        <dt>Suite Expectations</dt>
                        <dd>{testingStrategySuiteExpectations(selectedProjectDetail.testingStrategy).length}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Threshold Posture</dt>
                        <dd>{testingStrategyThresholdSummary(selectedProjectDetail.testingStrategy).join("; ") || "none"}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Readiness Coupling</dt>
                        <dd>{selectedProjectDetail.qualityGateEvidence?.qualityGateSummary?.readiness ?? "unknown"}</dd>
                      </div>
                    </div>
                    {testingStrategySuiteExpectations(selectedProjectDetail.testingStrategy).length > 0 ? (
                      <div className="thread-list compact">
                        {testingStrategySuiteExpectations(selectedProjectDetail.testingStrategy).map((expectation) => (
                          <div className="thread-row active" key={`${expectation.harnessId}-${expectation.purpose}`}>
                            <div className="thread-row-top">
                              <strong>{expectation.harnessId}</strong>
                              <span>suite expectation</span>
                            </div>
                            <p>{expectation.purpose || "No suite purpose specified."}</p>
                            {expectation.evidenceKinds.length > 0 ? (
                              <div className="thread-row-meta">
                                {expectation.evidenceKinds.map((evidenceKind) => (
                                  <span key={evidenceKind}>{evidenceKind}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="list-empty">No testing strategy is defined for this project yet.</p>
                )}
                {selectedProjectDetail.testingEvidence ? (
                  <>
                    <div className="detail-list">
                      {[
                        ...readinessSummaryRows(selectedProjectDetail.readinessSummary),
                        ...testingEvidenceStatusSummary(selectedProjectDetail.testingEvidence),
                        ...testingEvidenceSummary(selectedProjectDetail.testingEvidence)
                      ].map((item) => (
                        <div className="detail-row" key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </div>
                    {selectedProjectDetail.readinessSummary && selectedProjectDetail.readinessSummary.unmetObligations.length > 0 ? (
                      <div className="thread-list compact">
                        {selectedProjectDetail.readinessSummary.unmetObligations.map((obligation) => (
                          <div className="thread-row active" key={obligation}>
                            <div className="thread-row-top">
                              <strong>Readiness obligation</strong>
                              <span>blocked</span>
                            </div>
                            <p>{obligation}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {selectedProjectDetail.readinessSummary && selectedProjectDetail.readinessSummary.releaseNextActions.length > 0 ? (
                      <div className="thread-list compact">
                        {selectedProjectDetail.readinessSummary.releaseNextActions.map((action) => (
                          <div className="thread-row active" key={action}>
                            <div className="thread-row-top">
                              <strong>Release next action</strong>
                              <span>{selectedProjectDetail.readinessSummary?.releaseReviewState ?? "unknown"}</span>
                            </div>
                            <p>{action}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {selectedProjectDetail.readinessSummary?.releaseTransitionSummary ? (
                      <div className="surface-inline-note">
                        {selectedProjectDetail.readinessSummary.releaseTransitionSummary}
                      </div>
                    ) : null}
                    {selectedProjectDetail.readinessSummary?.releaseSignoffSummary ? (
                      <div className="surface-inline-note">
                        {selectedProjectDetail.readinessSummary.releaseSignoffSummary}
                      </div>
                    ) : null}
                    {selectedProjectDetail.readinessSummary ? (
                      <div className="detail-list">
                        <div className="detail-row">
                          <dt>Signoff Ready</dt>
                          <dd>{selectedProjectDetail.readinessSummary.releaseSignoffReady ? "yes" : "no"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Required Approvers</dt>
                          <dd>{selectedProjectDetail.readinessSummary.releaseRequiredApprovers.join(", ") || "none"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Approved Approvers</dt>
                          <dd>{selectedProjectDetail.readinessSummary.releaseApprovedApprovers.join(", ") || "none"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Pending Approvers</dt>
                          <dd>{selectedProjectDetail.readinessSummary.releasePendingApprovers.join(", ") || "none"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Unassigned Approvers</dt>
                          <dd>{selectedProjectDetail.readinessSummary.releaseUnassignedApprovers.join(", ") || "none"}</dd>
                        </div>
                      </div>
                    ) : null}
                    {selectedProjectDetail.testingEvidence.suiteStatuses.length > 0 ? (
                      <div className="thread-list compact">
                        {selectedProjectDetail.testingEvidence.suiteStatuses.map((suiteStatus) => (
                          <div className="thread-row active" key={`${suiteStatus.harnessId}-${suiteStatus.purpose ?? "suite"}`}>
                            <div className="thread-row-top">
                              <strong>{suiteStatus.harnessId}</strong>
                              <span>{suiteStatus.status}</span>
                            </div>
                            <p>{suiteStatus.purpose || "No suite purpose specified."}</p>
                            <div className="thread-row-meta">
                              <span>{suiteStatus.linked ? "linked" : "unlinked"}</span>
                              <span>evidence: {suiteStatus.evidenceKinds.join(", ") || "none"}</span>
                              <span>missing: {suiteStatus.missingEvidenceKinds.join(", ") || "none"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {selectedProjectDetail.testingEvidence.performance &&
                    Object.keys(selectedProjectDetail.testingEvidence.performance).length > 0 ? (
                      <pre className="runtime-preview">
                        {JSON.stringify(selectedProjectDetail.testingEvidence.performance, null, 2)}
                      </pre>
                    ) : null}
                  </>
                ) : (
                  <p className="list-empty">No testing evidence is attached to this project yet.</p>
                )}
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Release Readiness" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onEditReleaseReadiness} type="button">
                    Edit Release Readiness
                  </button>
                  <button className="starter-chip" onClick={onEditReadinessObligations} type="button">
                    Edit Readiness Obligations
                  </button>
                </div>
                {selectedProjectDetail.releaseReadiness || selectedProjectDetail.readinessObligations.length > 0 ? (
                  <>
                    <div className="detail-list">
                      <div className="detail-row">
                        <dt>Stage</dt>
                        <dd>{selectedProjectDetail.releaseReadiness?.stage ?? "unknown"}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Signoff</dt>
                        <dd>{selectedProjectDetail.releaseReadiness?.signoffStatus ?? "unknown"}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Target Window</dt>
                        <dd>{selectedProjectDetail.releaseReadiness?.targetWindow ?? "n/a"}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Obligations</dt>
                        <dd>{selectedProjectDetail.readinessObligations.length}</dd>
                      </div>
                    </div>
                    {selectedProjectDetail.readinessObligations.length > 0 ? (
                      <div className="thread-list">
                        {selectedProjectDetail.readinessObligations.map((obligation) => (
                          <div className="thread-row active" key={obligation.obligationId}>
                            <div className="thread-row-top">
                              <strong>{obligation.title || "Readiness obligation"}</strong>
                              <span>{obligation.status}</span>
                            </div>
                            <p>{obligation.summary}</p>
                            <div className="thread-row-meta">
                              <span>{obligation.blocking ? "blocking" : "advisory"}</span>
                              <span>owner: {obligation.owner ?? "unassigned"}</span>
                              <span>due: {obligation.dueWindow ?? "n/a"}</span>
                              <span>evidence: {obligation.evidenceKinds.join(", ") || "none"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="list-empty">No release readiness record is defined for this project yet.</p>
                )}
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Quality Gates" subtitle="" />
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={onEditTestingStrategy} type="button">
                    Edit Testing Strategy
                  </button>
                  <button className="starter-chip" onClick={onAddQualityGate} type="button">
                    Add Quality Gate
                  </button>
                </div>
                {selectedProjectDetail.qualityGateEvidence ? (
                  <>
                    <div className="detail-list">
                      <div className="detail-row">
                        <dt>Readiness</dt>
                        <dd>{selectedProjectDetail.qualityGateEvidence.qualityGateSummary?.readiness ?? "unknown"}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Ready</dt>
                        <dd>{selectedProjectDetail.qualityGateEvidence.qualityGateSummary?.readyCount ?? 0}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Blocked</dt>
                        <dd>{selectedProjectDetail.qualityGateEvidence.qualityGateSummary?.blockedCount ?? 0}</dd>
                      </div>
                    </div>
                    <div className="thread-list">
                      {selectedProjectDetail.qualityGateEvidence.qualityGates.map((gate) => (
                        <div className="thread-row active" key={gate.gateId}>
                          <div className="thread-row-top">
                            <strong>{gate.title}</strong>
                            <Badge tone={toneForProjectStatus(gate.status)}>{gate.status}</Badge>
                          </div>
                          <p>{gate.summary}</p>
                          <div className="thread-row-meta">
                            {qualityGateCriteria(gate).map((criterion) => (
                              <span key={criterion}>{criterion}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {selectedProjectDetail.qualityGateEvidence.qualityGates.length === 0 ? (
                        <p className="list-empty">No quality gates are attached to this project yet.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="list-empty">No quality-gate posture is available for this project yet.</p>
                )}
              </section>

              <section className="linked-entities-panel">
                <PanelHeader title="Trace" subtitle="Requirement-to-work-to-incident trace stays attached to the governed project." />
                {selectedProjectDetail.traceNeighborhood ? (
                  <>
                    <div className="detail-list">
                      <div className="detail-row">
                        <dt>Links</dt>
                        <dd>{selectedProjectDetail.traceNeighborhood.count}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Outbound</dt>
                        <dd>{selectedProjectDetail.traceNeighborhood.outbound.length}</dd>
                      </div>
                      <div className="detail-row">
                        <dt>Inbound</dt>
                        <dd>{selectedProjectDetail.traceNeighborhood.inbound.length}</dd>
                      </div>
                    </div>
                    <div className="thread-list">
                      {selectedProjectDetail.traceNeighborhood.outbound.map((link) => (
                        <div className="thread-row active" key={link.traceLinkId}>
                          <div className="thread-row-top">
                            <strong>{link.relation}</strong>
                            <span>{link.status ?? "active"}</span>
                          </div>
                          <p>{formatTraceLink(link)}</p>
                        </div>
                      ))}
                      {selectedProjectDetail.traceNeighborhood.inbound.map((link) => (
                        <div className="thread-row active" key={link.traceLinkId}>
                          <div className="thread-row-top">
                            <strong>{link.relation}</strong>
                            <span>{link.status ?? "active"}</span>
                          </div>
                          <p>{formatTraceLink(link)}</p>
                        </div>
                      ))}
                      {selectedProjectDetail.traceNeighborhood.outbound.length === 0 &&
                      selectedProjectDetail.traceNeighborhood.inbound.length === 0 ? (
                        <p className="list-empty">No trace links are attached to this project yet.</p>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <p className="list-empty">No trace neighborhood is available for this project yet.</p>
                )}
              </section>
            </div>
          ) : (
            <p className="list-empty">Select a project.</p>
          )}
        </section>
      </div>
    </div>
  );
}
