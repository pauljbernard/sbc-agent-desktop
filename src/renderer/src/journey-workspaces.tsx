import { useEffect, useRef } from "react";
import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  CommandResultDto,
  CorrectiveContextDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  LinkedEntityRefDto,
  ReconciliationDecisionDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { LinkedEntityList, PriorityStateChip } from "./interaction-support";
import { ContextBlock, JourneyStageStrip } from "./journey-support";
import { Badge, PanelHeader } from "./surface-support";

function formatTraceLink(link: {
  relation: string;
  sourceKind: string;
  sourceId: string;
  targetKind: string;
  targetId: string;
}): string {
  return `${link.sourceKind}:${link.sourceId} -> ${link.relation} -> ${link.targetKind}:${link.targetId}`;
}

export type ApprovalsWorkspaceProps = {
  approvalRequests: ApprovalRequestSummaryDto[];
  workItems: WorkItemSummaryDto[];
  reconciliationDecision: ReconciliationDecisionDto | null;
  selectedApprovalId: string | null;
  selectedApproval: ApprovalRequestDto | null;
  approvalDecision: CommandResultDto<ApprovalDecisionDto> | null;
  isDecidingApproval: boolean;
  setSelectedApprovalId: (requestId: string) => void;
  submitApprovalDecisionForRequest: (requestId: string, decision: "approve" | "deny") => Promise<void>;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
};

export function ApprovalsWorkspace({
  approvalRequests,
  workItems,
  reconciliationDecision,
  selectedApprovalId,
  selectedApproval,
  approvalDecision,
  isDecidingApproval,
  setSelectedApprovalId,
  submitApprovalDecisionForRequest,
  navigateToLinkedEntity,
  openInspectorSurface
}: ApprovalsWorkspaceProps) {
  const approvalRows = approvalRequests.map((request) => ({
    key: request.requestId,
    title: request.title,
    state: request.state,
    requestId: request.requestId,
    summary: request.summary
  }));
  const selectedApprovalLinkedWorkItemId =
    selectedApproval?.linkedEntities.find((entity) => entity.entityType === "work-item")?.entityId ?? null;
  const selectedApprovalCorrectiveWorkItem =
    (selectedApprovalLinkedWorkItemId
      ? workItems.find((item) => item.workItemId === selectedApprovalLinkedWorkItemId && item.correctiveContext) ?? null
      : null)
    ?? workItems.find((item) => item.approvalCount > 0 && item.correctiveContext) ?? null;
  const selectedApprovalCorrectiveContextFromReconciliation: CorrectiveContextDto | null = reconciliationDecision
    ? {
        kind: "alignment-reconciliation",
        intentId: reconciliationDecision.intentId ?? null,
        decision: reconciliationDecision.decision,
        approvalPosture: reconciliationDecision.approvalPosture,
        alignmentStatus: reconciliationDecision.alignmentStatus,
        alignmentScore: null,
        proposedActions: reconciliationDecision.proposedActions,
        triggerEvents: reconciliationDecision.triggerEvents
      }
    : null;
  const selectedApprovalCorrectiveContext =
    selectedApprovalCorrectiveWorkItem?.correctiveContext ?? selectedApprovalCorrectiveContextFromReconciliation;

  return (
    <div className="approvals-grid">
      <section className="approvals-list-panel">
        <PanelHeader
          title="Governed Decisions"
          subtitle="Approvals appear here as execution decisions with consequence, not as detached prompts."
        />
        <BrowserDataTable
          key="execution-approvals"
          columnTemplate="minmax(0, 1.15fr) minmax(0, 0.8fr) minmax(0, 0.95fr) minmax(0, 1.45fr)"
          columns={[
            {
              id: "title",
              label: "Request",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title,
              searchValue: (row) => `${row.title} ${row.summary} ${row.requestId}`
            },
            {
              id: "state",
              label: "State",
              render: (row) => <PriorityStateChip label={row.state} tone={toneForApprovalState(row.state)} />,
              sortValue: (row) => row.state
            },
            {
              id: "id",
              label: "Request Id",
              render: (row) => row.requestId,
              sortValue: (row) => row.requestId
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => row.summary
            }
          ]}
          emptyMessage="No approval requests in this environment."
          filterLabel="State"
          filterOptions={Array.from(new Set(approvalRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.state}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedApprovalId(row.key)}
          rows={approvalRows}
          searchPlaceholder="Search approval requests"
          selectedKey={selectedApprovalId}
        />
      </section>

      <section className="approval-detail-panel">
        {selectedApproval ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Decision Context</p>
                <h3>{selectedApproval.title}</h3>
              </div>
              <PriorityStateChip label={selectedApproval.state} tone={toneForApprovalState(selectedApproval.state)} />
            </div>
            <div className="browser-focus-card">
              <div>
                <p className="context-label">Requested Action</p>
                <strong>{selectedApproval.requestedAction}</strong>
                <p>{selectedApproval.summary}</p>
              </div>
              <Badge tone="steady">{selectedApproval.createdAt}</Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Scope" value={selectedApproval.scopeSummary} />
              <ContextBlock label="Policy" value={selectedApproval.policyId ?? "None"} />
              <ContextBlock label="Created" value={selectedApproval.createdAt} />
              <ContextBlock label="State" value={selectedApproval.state} />
            </div>
            <div className="approval-explanation">
              <p className="lead-copy">{selectedApproval.rationale}</p>
              <p className="mission-support">{selectedApproval.consequenceSummary}</p>
            </div>
            {selectedApprovalCorrectiveContext ? (
              <section className="linked-entities-panel">
                <PanelHeader title="Corrective Posture" subtitle="Alignment rationale stays explicit at the approval point, not only in work detail." />
                <div className="thread-row active">
                  <div className="thread-row-top">
                    <strong>{selectedApprovalCorrectiveWorkItem?.title ?? "Corrective governed work"}</strong>
                    <Badge tone={toneForCorrectiveDecision(selectedApprovalCorrectiveContext.decision)}>
                      {selectedApprovalCorrectiveContext.decision ?? "unknown"}
                    </Badge>
                  </div>
                  <p>{formatCorrectiveSummary(selectedApprovalCorrectiveContext)}</p>
                </div>
                <div className="approval-facts">
                  <ContextBlock label="Corrective Kind" value={selectedApprovalCorrectiveContext.kind} />
                  <ContextBlock label="Approval Posture" value={selectedApprovalCorrectiveContext.approvalPosture ?? "unknown"} />
                  <ContextBlock
                    label="Alignment"
                    value={
                      selectedApprovalCorrectiveContext.alignmentStatus
                        ? `${selectedApprovalCorrectiveContext.alignmentStatus}${
                            selectedApprovalCorrectiveContext.alignmentScore != null
                              ? ` (${selectedApprovalCorrectiveContext.alignmentScore.toFixed(2)})`
                              : ""
                          }`
                        : "unknown"
                    }
                  />
                  <ContextBlock label="Trigger Events" value={String(selectedApprovalCorrectiveContext.triggerEvents.length)} />
                </div>
                {selectedApprovalCorrectiveContext.proposedActions.length > 0 ? (
                  <div className="thread-list">
                    {selectedApprovalCorrectiveContext.proposedActions.map((action, index) => (
                      <div className="thread-row active" key={`approval-corrective-action:${index}`}>
                        <div className="thread-row-top">
                          <strong>{action.kind ?? "correction"}</strong>
                          <span>{action.target ?? "governed target"}</span>
                        </div>
                        <p>{action.reason ?? "No corrective rationale was projected."}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {selectedApprovalCorrectiveContext.triggerEvents.length > 0 ? (
                  <div className="ref-list">
                    {selectedApprovalCorrectiveContext.triggerEvents.map((event, index) => (
                      <span className="thread-flag" key={`approval-corrective-trigger:${index}`}>
                        {event.kind ?? event.family ?? "event"}
                        {event.eventId ? ` · ${event.eventId}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            <section className="linked-entities-panel">
              <PanelHeader title="Linked Context" subtitle="Turns, operations, work, and incidents stay visible before decision." />
              <LinkedEntityList entities={selectedApproval.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
            </section>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                Open Inspector
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Approval Selected</p>
            <h3>Select an approval request to inspect its governed decision context.</h3>
          </div>
        )}
      </section>

      <section className="approval-action-panel">
        <div className="panel">
          <PanelHeader title="Apply Decision" subtitle="The operator either unblocks execution or diverts it into a different governed path." />
          <div className="approval-actions">
            <button
              className="action-button"
              disabled={!selectedApproval || isDecidingApproval}
              onClick={() => selectedApproval ? void submitApprovalDecisionForRequest(selectedApproval.requestId, "approve") : undefined}
              type="button"
            >
              {isDecidingApproval ? "Submitting..." : "Approve Request"}
            </button>
            <button
              className="action-button deny-button"
              disabled={!selectedApproval || isDecidingApproval}
              onClick={() => selectedApproval ? void submitApprovalDecisionForRequest(selectedApproval.requestId, "deny") : undefined}
              type="button"
            >
              {isDecidingApproval ? "Submitting..." : "Deny Request"}
            </button>
          </div>
          {approvalDecision ? (
            <div className="runtime-result-stack">
              <div className="runtime-result-header">
                <Badge tone={toneForApprovalDecision(approvalDecision.data.decision)}>
                  {approvalDecision.data.decision}
                </Badge>
                <span className="runtime-result-op">{approvalDecision.operation}</span>
              </div>
              <p className="lead-copy">{approvalDecision.data.summary}</p>
              <div className="ref-list">
                {approvalDecision.data.resumedEntityIds.map((entityId) => (
                  <span className="thread-flag" key={entityId}>
                    {entityId}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="list-empty">Select an approval request to decide it here.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export type IncidentsWorkspaceProps = {
  incidents: IncidentSummaryDto[];
  selectedIncidentId: string | null;
  selectedIncident: IncidentDetailDto | null;
  pendingIncidentFocusId: string | null;
  clearPendingIncidentFocusId: () => void;
  setSelectedIncidentId: (incidentId: string) => void;
  openIncidentRemediationPlanDialog: () => void;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
};

export function IncidentsWorkspace({
  incidents,
  selectedIncidentId,
  selectedIncident,
  pendingIncidentFocusId,
  clearPendingIncidentFocusId,
  setSelectedIncidentId,
  openIncidentRemediationPlanDialog,
  navigateToLinkedEntity,
  openInspectorSurface
}: IncidentsWorkspaceProps) {
  const incidentDetailPanelRef = useRef<HTMLDivElement | null>(null);
  const selectedIncidentArtifactIds = selectedIncident?.artifactIds ?? [];
  const selectedIncidentLinkedCount = selectedIncident?.linkedEntities.length ?? 0;
  const recoveryObjective =
    selectedIncident?.nextAction ??
    selectedIncident?.recoverySummary ??
    "Assess the dominant incident, restore trust, and only then return the environment to execution.";

  useEffect(() => {
    if (!pendingIncidentFocusId || selectedIncident?.incidentId !== pendingIncidentFocusId) {
      return;
    }

    const incidentPanel = incidentDetailPanelRef.current;
    if (!incidentPanel) {
      return;
    }

    incidentPanel.focus();
    incidentPanel.scrollIntoView({ block: "start", behavior: "smooth" });
    clearPendingIncidentFocusId();
  }, [clearPendingIncidentFocusId, pendingIncidentFocusId, selectedIncident?.incidentId]);

  return (
    <div className="incidents-grid">
      <JourneyStageStrip
        eyebrow="Recovery Flow"
        summary="Recovery should guide the operator from failure assessment into restoration, then back toward trustworthy continuation."
        steps={[
          {
            id: "assess",
            title: "Assess Failure",
            summary: "Identify the dominant incident, severity, and recovery state without losing connection to runtime context.",
            tone: incidents.length > 0 ? "danger" : "steady"
          },
          {
            id: "restore",
            title: "Restore Trust",
            summary: "Use linked work and evidence to drive the environment toward a state that can be trusted again.",
            tone:
              selectedIncident?.recoveryState === "awaiting_acknowledgement"
                ? "danger"
                : selectedIncident?.recoveryState === "active_recovery"
                  ? "warning"
                  : selectedIncident
                    ? "active"
                    : "steady"
          },
          {
            id: "resume",
            title: "Resume Execution",
            summary: "Recovery is complete only when the environment can re-enter execution without hidden obligations.",
            tone: selectedIncidentArtifactIds.length > 0 || selectedIncidentLinkedCount > 0 ? "active" : "steady"
          }
        ]}
        title="Recovery Journey"
      />
      <section className="panel recovery-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Recovery Objective</p>
            <h3>{selectedIncident?.title ?? "No incident selected"}</h3>
          </div>
          <Badge tone={selectedIncident ? toneForIncidentSeverity(selectedIncident.severity) : "steady"}>
            {selectedIncident?.state ?? "clear"}
          </Badge>
        </div>
        <p className="lead-copy">{recoveryObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Incidents</span>
            <strong>{incidents.length}</strong>
            <p>{incidents[0]?.title ?? "No incident dominates the environment."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Recovery State</span>
            <strong>{selectedIncident?.recoveryState ?? "idle"}</strong>
            <p>{selectedIncident?.blockedReason ?? "Recovery can proceed without an explicit blocking reason."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Evidence</span>
            <strong>{selectedIncidentArtifactIds.length}</strong>
            <p>{selectedIncidentArtifactIds.length > 0 ? "Recovery evidence is already attached to the incident." : "No explicit recovery evidence is attached yet."}</p>
          </div>
        </div>
      </section>

      <div className="recovery-layout">
        <section className="incidents-list-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Assess Failure</p>
              <p className="panel-subtitle">Failures stay durable, governed, and recoverable.</p>
            </div>
          </div>
          <div className="thread-list">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <button
                  className={incident.incidentId === selectedIncidentId ? "thread-row active" : "thread-row"}
                  key={incident.incidentId}
                  onClick={() => setSelectedIncidentId(incident.incidentId)}
                  type="button"
                >
                  <div className="thread-row-top">
                    <strong>{incident.title}</strong>
                    <Badge tone={toneForIncidentSeverity(incident.severity)}>{incident.severity}</Badge>
                  </div>
                  <p>{incident.incidentId}</p>
                  <div className="thread-row-meta">
                    <span>{incident.state}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="list-empty">No incidents in this environment.</p>
            )}
          </div>
        </section>

        <div className="recovery-main-rail">
          <section className="incident-detail-panel">
            {selectedIncident ? (
              <div className="panel" ref={incidentDetailPanelRef} tabIndex={-1}>
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Restore Trust</p>
                    <h3>{selectedIncident.title}</h3>
                  </div>
                  <Badge tone={toneForIncidentSeverity(selectedIncident.severity)}>{selectedIncident.state}</Badge>
                </div>
                <p className="lead-copy">{selectedIncident.summary}</p>
                <div className="approval-facts">
                  <ContextBlock label="Severity" value={selectedIncident.severity} />
                  <ContextBlock label="Runtime" value={selectedIncident.runtimeId ?? "None"} />
                  <ContextBlock label="Recovery State" value={selectedIncident.recoveryState} />
                  <ContextBlock label="Updated" value={selectedIncident.updatedAt} />
                </div>
                <div className="approval-explanation">
                  <p className="lead-copy">{selectedIncident.recoverySummary}</p>
                  <p className="mission-support">{selectedIncident.nextAction}</p>
                  {selectedIncident.blockedReason ? <p className="mission-support">Blocked: {selectedIncident.blockedReason}</p> : null}
                </div>
                <section className="linked-entities-panel">
                  <PanelHeader title="Remediation Plan" subtitle="Operator-owned recovery steps stay explicit and durable." />
                  {selectedIncident.remediationPlan ? (
                    <div className="approval-facts">
                      <ContextBlock label="Status" value={selectedIncident.remediationPlan.status} />
                      <ContextBlock label="Owner" value={selectedIncident.remediationPlan.owner ?? "Unassigned"} />
                      <ContextBlock label="Actions" value={String(selectedIncident.remediationPlan.actions.length)} />
                      <ContextBlock
                        label="Validation Steps"
                        value={String(selectedIncident.remediationPlan.validationSteps.length)}
                      />
                      <ContextBlock label="Blockers" value={String(selectedIncident.remediationPlan.blockers.length)} />
                    </div>
                  ) : (
                    <p className="list-empty">No remediation plan is attached to this incident yet.</p>
                  )}
                  {selectedIncident.remediationPlan?.summary ? (
                    <p className="lead-copy">{selectedIncident.remediationPlan.summary}</p>
                  ) : null}
                  {selectedIncident.remediationPlan?.actions.length ? (
                    <div className="ref-list">
                      {selectedIncident.remediationPlan.actions.map((action) => (
                        <span className="thread-flag" key={action}>
                          {action}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={openIncidentRemediationPlanDialog} type="button">
                    Edit Remediation Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Incident Selected</p>
                <h3>Select an incident to inspect governed recovery posture.</h3>
              </div>
            )}
          </section>

          <section className="incident-linked-panel">
            {selectedIncident ? (
              <div className="panel">
                <PanelHeader title="Resume Execution" subtitle="Recovery stays tied to runtime, work, and evidence until continuation is trustworthy again." />
                <LinkedEntityList entities={selectedIncident.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
                <section className="linked-entities-panel">
                  <PanelHeader title="Evidence" subtitle="Artifacts remain explicit recovery evidence." />
                  <div className="ref-list">
                    {selectedIncident.artifactIds.map((artifactId) => (
                      <span className="thread-flag" key={artifactId}>
                        {artifactId}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="linked-entities-panel">
                  <PanelHeader title="Trace" subtitle="Recovery stays linked to the surrounding governed trace graph." />
                  {selectedIncident.traceNeighborhood ? (
                    <div className="thread-list">
                      {selectedIncident.traceNeighborhood.outbound.map((link) => (
                        <div className="thread-row active" key={link.traceLinkId}>
                          <div className="thread-row-top">
                            <strong>{link.relation}</strong>
                            <span>{link.status ?? "active"}</span>
                          </div>
                          <p>{formatTraceLink(link)}</p>
                        </div>
                      ))}
                      {selectedIncident.traceNeighborhood.inbound.map((link) => (
                        <div className="thread-row active" key={link.traceLinkId}>
                          <div className="thread-row-top">
                            <strong>{link.relation}</strong>
                            <span>{link.status ?? "active"}</span>
                          </div>
                          <p>{formatTraceLink(link)}</p>
                        </div>
                      ))}
                      {selectedIncident.traceNeighborhood.outbound.length === 0 &&
                      selectedIncident.traceNeighborhood.inbound.length === 0 ? (
                        <p className="list-empty">No trace links are attached to this incident yet.</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="list-empty">No trace neighborhood is available for this incident yet.</p>
                  )}
                </section>
                <div className="browser-action-strip">
                  <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                    Open Inspector
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Recovery Context</p>
                <h3>Select an incident to inspect linked runtime and artifact context.</h3>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export type WorkWorkspaceProps = {
  approvalRequests: ApprovalRequestSummaryDto[];
  isDecidingApproval: boolean;
  workItems: WorkItemSummaryDto[];
  selectedWorkItemId: string | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkItemPlan: WorkItemPlanDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  pendingWorkItemFocusId: string | null;
  clearPendingWorkItemFocusId: () => void;
  setSelectedWorkItemId: (workItemId: string) => void;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openApprovalRequest: (requestId: string) => Promise<void>;
  openSteerWorkItemDialog: () => void;
  openResumeWorkItemDialog: () => void;
  openQuarantineWorkItemDialog: () => void;
  openRollbackWorkItemDialog: () => void;
  openCompleteWorkItemValidationsDialog: () => void;
  submitApprovalDecisionForRequest: (requestId: string, decision: "approve" | "deny") => Promise<void>;
  openInspectorSurface: () => Promise<void>;
};

export function WorkWorkspace({
  approvalRequests,
  isDecidingApproval,
  workItems,
  selectedWorkItemId,
  selectedWorkItem,
  selectedWorkItemPlan,
  selectedWorkflowRecord,
  pendingWorkItemFocusId,
  clearPendingWorkItemFocusId,
  setSelectedWorkItemId,
  navigateToLinkedEntity,
  openApprovalRequest,
  openSteerWorkItemDialog,
  openResumeWorkItemDialog,
  openQuarantineWorkItemDialog,
  openRollbackWorkItemDialog,
  openCompleteWorkItemValidationsDialog,
  submitApprovalDecisionForRequest,
  openInspectorSurface
}: WorkWorkspaceProps) {
  const workflowDetailPanelRef = useRef<HTMLDivElement | null>(null);
  const workRows = workItems.map((workItem) => ({
    key: workItem.workItemId,
    title: workItem.title,
    state: workItem.state,
    waitingReason: workItem.waitingReason ?? "None",
    approvalCount: workItem.approvalCount,
    incidentCount: workItem.incidentCount,
    artifactCount: workItem.artifactCount,
    validationBurden: workItem.validationBurden,
    reconciliationBurden: workItem.reconciliationBurden,
    correctiveContext: workItem.correctiveContext ?? null
  }));
  const selectedWorkItemSummary =
    selectedWorkItem ? workItems.find((item) => item.workItemId === selectedWorkItem.workItemId) ?? null : null;
  const selectedWorkItemLinkedApproval =
    selectedWorkItem?.linkedEntities.find((entity) => entity.entityType === "approval") ?? null;
  const fallbackAwaitingApproval =
    selectedWorkItemSummary && selectedWorkItemSummary.approvalCount > 0
      ? approvalRequests.find((request) => request.state === "awaiting") ?? null
      : null;
  const selectedWorkItemApprovalId = selectedWorkItemLinkedApproval?.entityId ?? fallbackAwaitingApproval?.requestId ?? null;
  const selectedWorkItemApprovalSummary = selectedWorkItemApprovalId
    ? approvalRequests.find((request) => request.requestId === selectedWorkItemApprovalId) ?? null
    : null;
  const selectedWorkItemApprovalState = selectedWorkItemApprovalSummary?.state ?? "none";

  useEffect(() => {
    if (!pendingWorkItemFocusId || selectedWorkItem?.workItemId !== pendingWorkItemFocusId || !selectedWorkflowRecord) {
      return;
    }

    const workflowPanel = workflowDetailPanelRef.current;
    if (!workflowPanel) {
      return;
    }

    workflowPanel.focus();
    workflowPanel.scrollIntoView({ block: "start", behavior: "smooth" });
    clearPendingWorkItemFocusId();
  }, [clearPendingWorkItemFocusId, pendingWorkItemFocusId, selectedWorkItem?.workItemId, selectedWorkflowRecord]);

  return (
    <div className="work-grid">
      <section className="work-list-panel">
        <PanelHeader
          title="Reconcile Work"
          subtitle="Execution items remain visible with their validation and closure obligations attached."
        />
        <BrowserDataTable
          key="execution-work"
          columnTemplate="minmax(0, 1.1fr) minmax(0, 0.78fr) minmax(0, 1.15fr) minmax(0, 0.7fr) minmax(0, 0.7fr) minmax(0, 0.7fr)"
          columns={[
            {
              id: "title",
              label: "Work Item",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title,
              searchValue: (row) => `${row.title} ${row.waitingReason} ${row.validationBurden} ${row.reconciliationBurden}`
            },
            {
              id: "state",
              label: "State",
              render: (row) => <PriorityStateChip label={row.state} tone={toneForWorkState(row.state)} />,
              sortValue: (row) => row.state
            },
            {
              id: "waiting",
              label: "Waiting",
              render: (row) => row.waitingReason,
              sortValue: (row) => row.waitingReason
            },
            {
              id: "approvals",
              label: "Approvals",
              render: (row) => row.approvalCount,
              sortValue: (row) => row.approvalCount
            },
            {
              id: "incidents",
              label: "Incidents",
              render: (row) => row.incidentCount,
              sortValue: (row) => row.incidentCount
            },
            {
              id: "artifacts",
              label: "Artifacts",
              render: (row) => row.artifactCount,
              sortValue: (row) => row.artifactCount
            }
          ]}
          emptyMessage="No governed work items in this environment."
          filterLabel="State"
          filterOptions={Array.from(new Set(workRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.state}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedWorkItemId(row.key)}
          rows={workRows}
          searchPlaceholder="Search work items"
          selectedKey={selectedWorkItemId}
        />
      </section>

      <section className="work-detail-panel">
        {selectedWorkItem ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected Execution Item</p>
                <h3>{selectedWorkItem.title}</h3>
              </div>
              <PriorityStateChip label={selectedWorkItem.state} tone={toneForWorkState(selectedWorkItem.state)} />
            </div>
            <div className="browser-focus-card">
              <div>
                <p className="context-label">Selected Execution Item</p>
                <strong>{selectedWorkItem.title}</strong>
                <p>{formatCorrectiveSummary(selectedWorkItem.correctiveContext)}</p>
              </div>
              <Badge tone={toneForCorrectiveDecision(selectedWorkItem.correctiveContext?.decision)}>
                {selectedWorkItem.correctiveContext?.decision ?? selectedWorkItem.workflowRecordId}
              </Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Workflow Record" value={selectedWorkItem.workflowRecordId} />
              <ContextBlock label="Waiting" value={selectedWorkItem.waitingReason ?? "None"} />
              <ContextBlock label="Runtime" value={selectedWorkItem.runtimeSummary} />
              <ContextBlock label="Source Relationship" value={selectedWorkItem.sourceRelationship} />
            </div>
            {selectedWorkItem.correctiveContext ? (
              <section className="linked-entities-panel">
                <PanelHeader
                  title="Corrective Direction"
                  subtitle="Reconciliation-created work stays explicit about why it exists, what it intends to change, and what evidence triggered it."
                />
                <div className="approval-facts">
                  <ContextBlock label="Corrective Kind" value={selectedWorkItem.correctiveContext.kind} />
                  <ContextBlock label="Decision" value={selectedWorkItem.correctiveContext.decision ?? "unknown"} />
                  <ContextBlock
                    label="Approval Posture"
                    value={selectedWorkItem.correctiveContext.approvalPosture ?? "unknown"}
                  />
                  <ContextBlock label="Linked Approval" value={selectedWorkItemApprovalState} />
                  <ContextBlock
                    label="Alignment"
                    value={
                      selectedWorkItem.correctiveContext.alignmentStatus
                        ? `${selectedWorkItem.correctiveContext.alignmentStatus}${
                            selectedWorkItem.correctiveContext.alignmentScore != null
                              ? ` (${selectedWorkItem.correctiveContext.alignmentScore.toFixed(2)})`
                              : ""
                          }`
                        : "unknown"
                    }
                  />
                </div>
                {selectedWorkItem.correctiveContext.proposedActions.length > 0 ? (
                  <div className="thread-list">
                    {selectedWorkItem.correctiveContext.proposedActions.map((action, index) => (
                      <div className="thread-row active" key={`${action.kind ?? "action"}:${index}`}>
                        <div className="thread-row-top">
                          <strong>{action.kind ?? "corrective-action"}</strong>
                          <span>{action.target ?? "environment"}</span>
                        </div>
                        <p>{action.reason ?? "No corrective rationale was projected."}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="list-empty">No proposed corrective actions are currently projected for this work item.</p>
                )}
                {selectedWorkItem.correctiveContext.triggerEvents.length > 0 ? (
                  <div className="ref-list">
                    {selectedWorkItem.correctiveContext.triggerEvents.map((event, index) => (
                      <span className="thread-flag" key={`${event.eventId ?? event.kind ?? "event"}:${index}`}>
                        {event.kind ?? "event"}
                        {event.eventId ? ` · ${event.eventId}` : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
            <section className="linked-entities-panel">
              <PanelHeader title="Plan" subtitle="Long-horizon steering and pending execution obligations remain attached to the work item." />
              {selectedWorkItemPlan ? (
                <>
                  <div className="approval-facts">
                    <ContextBlock label="Plan Health" value={selectedWorkItemPlan.planHealth ?? "unknown"} />
                    <ContextBlock
                      label="Current Phase"
                      value={selectedWorkItemPlan.planSteering?.currentPhase ?? "unplanned"}
                    />
                    <ContextBlock
                      label="Next Step"
                      value={selectedWorkItemPlan.planSteering?.nextStep ?? "none"}
                    />
                    <ContextBlock
                      label="Pending Validations"
                      value={
                        selectedWorkItemPlan.pendingValidations.length > 0
                          ? selectedWorkItemPlan.pendingValidations.join(", ")
                          : "none"
                      }
                    />
                  </div>
                  <div className="approval-facts">
                    <ContextBlock
                      label="Operator Phase"
                      value={selectedWorkItemPlan.planSteering?.operatorDirectedPhase ?? "none"}
                    />
                    <ContextBlock
                      label="Operator Step"
                      value={selectedWorkItemPlan.planSteering?.operatorDirectedNextStep ?? "none"}
                    />
                    <ContextBlock
                      label="Revision Reason"
                      value={selectedWorkItemPlan.planSteering?.revisionReason ?? "steady-state"}
                    />
                    <ContextBlock
                      label="Remaining Phases"
                      value={
                        (selectedWorkItemPlan.planSteering?.remainingPhases ?? []).length > 0
                          ? (selectedWorkItemPlan.planSteering?.remainingPhases ?? []).join(", ")
                          : "none"
                      }
                    />
                  </div>
                  {selectedWorkItemPlan.operatorSteeringHistory.length > 0 ? (
                    <div className="thread-list">
                      {selectedWorkItemPlan.operatorSteeringHistory.map((entry, index) => (
                        <div className="thread-row active" key={`${entry.timestamp ?? index}-${entry.phase ?? "plan"}`}>
                          <div className="thread-row-top">
                            <strong>{entry.phase ?? "operator-steered"}</strong>
                            <span>{entry.nextStep ?? "next-step-unspecified"}</span>
                          </div>
                          <p>{entry.note ?? "No operator note recorded."}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="list-empty">No structured work-item plan has been projected yet.</p>
              )}
            </section>
            <section className="linked-entities-panel">
              <PanelHeader title="Linked Context" subtitle="Approvals, incidents, and artifacts stay attached to the work." />
              <LinkedEntityList entities={selectedWorkItem.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
            </section>
            <section className="linked-entities-panel">
              <PanelHeader title="Trace" subtitle="Execution remains attached to the requirement-to-incident trace graph." />
              {selectedWorkItem.traceNeighborhood ? (
                <div className="thread-list">
                  {selectedWorkItem.traceNeighborhood.outbound.map((link) => (
                    <div className="thread-row active" key={link.traceLinkId}>
                      <div className="thread-row-top">
                        <strong>{link.relation}</strong>
                        <span>{link.status ?? "active"}</span>
                      </div>
                      <p>{formatTraceLink(link)}</p>
                    </div>
                  ))}
                  {selectedWorkItem.traceNeighborhood.inbound.map((link) => (
                    <div className="thread-row active" key={link.traceLinkId}>
                      <div className="thread-row-top">
                        <strong>{link.relation}</strong>
                        <span>{link.status ?? "active"}</span>
                      </div>
                      <p>{formatTraceLink(link)}</p>
                    </div>
                  ))}
                  {selectedWorkItem.traceNeighborhood.outbound.length === 0 &&
                  selectedWorkItem.traceNeighborhood.inbound.length === 0 ? (
                    <p className="list-empty">No trace links are attached to this work item yet.</p>
                  ) : null}
                </div>
              ) : (
                <p className="list-empty">No trace neighborhood is available for this work item yet.</p>
              )}
            </section>
            <div className="browser-action-strip">
              {selectedWorkItemApprovalId ? (
                <button
                  className="starter-chip"
                  onClick={() =>
                    selectedWorkItemLinkedApproval
                      ? void navigateToLinkedEntity(selectedWorkItemLinkedApproval)
                      : void openApprovalRequest(selectedWorkItemApprovalId)
                  }
                  type="button"
                >
                  Review Approval
                </button>
              ) : null}
              {selectedWorkItemApprovalId && selectedWorkItemApprovalSummary?.state === "awaiting" ? (
                <button
                  className="starter-chip"
                  disabled={isDecidingApproval}
                  onClick={() => void submitApprovalDecisionForRequest(selectedWorkItemApprovalId, "approve")}
                  type="button"
                >
                  {isDecidingApproval ? "Submitting..." : "Approve Corrective Work"}
                </button>
              ) : null}
              {selectedWorkItemApprovalId && selectedWorkItemApprovalSummary?.state === "awaiting" ? (
                <button
                  className="starter-chip"
                  disabled={isDecidingApproval}
                  onClick={() => void submitApprovalDecisionForRequest(selectedWorkItemApprovalId, "deny")}
                  type="button"
                >
                  {isDecidingApproval ? "Submitting..." : "Deny Corrective Work"}
                </button>
              ) : null}
              <button className="starter-chip" onClick={openSteerWorkItemDialog} type="button">
                Steer Work
              </button>
              <button className="starter-chip" onClick={openCompleteWorkItemValidationsDialog} type="button">
                Complete Validations
              </button>
              <button className="starter-chip" onClick={openResumeWorkItemDialog} type="button">
                Resume Work
              </button>
              <button className="starter-chip" onClick={openQuarantineWorkItemDialog} type="button">
                Quarantine
              </button>
              <button className="starter-chip" onClick={openRollbackWorkItemDialog} type="button">
                Rollback
              </button>
              <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                Open Inspector
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Work Item Selected</p>
            <h3>Select a governed work item to inspect closure posture.</h3>
          </div>
        )}
      </section>

      <section className="workflow-detail-panel">
        {selectedWorkflowRecord ? (
          <div className="panel" ref={workflowDetailPanelRef} tabIndex={-1}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">Closure Path</p>
                <h3>{selectedWorkflowRecord.phase}</h3>
              </div>
              <Badge tone={selectedWorkflowRecord.closureReadiness === "closable" ? "active" : "warning"}>
                {selectedWorkflowRecord.closureReadiness}
              </Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Validation" value={selectedWorkflowRecord.validationState} />
              <ContextBlock label="Reconciliation" value={selectedWorkflowRecord.reconciliationState} />
              <ContextBlock label="Closure" value={selectedWorkflowRecord.closureReadiness} />
              <ContextBlock label="Phase" value={selectedWorkflowRecord.phase} />
            </div>
            <p className="lead-copy">{selectedWorkflowRecord.closureSummary}</p>
            <section className="linked-entities-panel">
              <PanelHeader title="Blocking Items" subtitle="Closure is withheld until these obligations clear." />
              <div className="ref-list">
                {selectedWorkflowRecord.blockingItems.map((item) => (
                  <span className="thread-flag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Workflow Record</p>
            <h3>Select a work item to inspect its workflow and closure posture.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

function toneForApprovalState(
  state: ApprovalRequestSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "approved":
      return "active";
    case "awaiting":
      return "warning";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForApprovalDecision(
  decision: ApprovalDecisionDto["decision"]
): "active" | "warning" | "danger" | "steady" {
  switch (decision) {
    case "approved":
      return "active";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForIncidentSeverity(
  severity: IncidentSummaryDto["severity"]
): "active" | "warning" | "danger" | "steady" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "moderate":
      return "warning";
    case "low":
      return "steady";
    default:
      return "steady";
  }
}

function toneForWorkState(
  state: WorkItemSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
    case "closable":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
    case "quarantined":
      return "danger";
    default:
      return "steady";
  }
}

function toneForCorrectiveDecision(
  decision: string | null | undefined
): "active" | "warning" | "danger" | "steady" {
  switch (decision) {
    case "co-evolve":
      return "warning";
    case "runtime":
    case "intent":
      return "active";
    case "maintain":
      return "steady";
    default:
      return "warning";
  }
}

function formatCorrectiveSummary(correctiveContext: CorrectiveContextDto | null | undefined): string {
  if (!correctiveContext) {
    return "No corrective reconciliation context is attached to this work item.";
  }

  const leadReason = correctiveContext.proposedActions[0]?.reason;
  if (leadReason) {
    return leadReason;
  }

  return "This work item exists to execute a governed reconciliation correction.";
}
