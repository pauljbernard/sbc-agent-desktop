import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactSummaryDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  IncidentSummaryDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { PriorityStateChip } from "./interaction-support";
import { DetailRow } from "./journey-support";
import { Badge, PanelHeader } from "./surface-support";

type ConversationSection = "threads" | "turns" | "draft" | "repl";
type ExecutionSection = "listener" | "work";
type RecoverySection = "incidents";
type EvidenceSection = "artifacts";

type AttentionTone = "active" | "warning" | "danger" | "steady";

interface ActionQueueItem {
  key: string;
  objectType: "Thread" | "Approval" | "Work" | "Recovery" | "Artifact" | "Runtime" | "Task";
  objectId: string;
  title: string;
  timestamp?: string | null;
  stateLabel: string;
  whyNow: string;
  effectSummary: string;
  references: string[];
  tone: AttentionTone;
  score: number;
  priorityLabel: "High" | "Medium" | "Low";
  destinationWorkspace: WorkspaceId;
  destinationLabel: string;
  actionLabel: string;
  rankReason: string;
}

export type OperateWorkspaceProps = {
  actionQueue: ActionQueueItem[];
  artifacts: ArtifactSummaryDto[];
  navigateToConversationSection: (section: ConversationSection) => Promise<void>;
  navigateToEvidenceSection: (section: EvidenceSection) => Promise<void>;
  navigateToExecutionSection: (section: ExecutionSection) => Promise<void>;
  navigateToRecoverySection: (section: RecoverySection) => Promise<void>;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  approvalRequests: ApprovalRequestSummaryDto[];
  selectedApprovalId: string | null;
  selectedArtifactId: string | null;
  selectedIncidentId: string | null;
  isDecidingApproval: boolean;
  incidents: IncidentSummaryDto[];
  openApprovalRequest: (requestId: string) => Promise<void>;
  selectedWorkItemId: string | null;
  workItems: WorkItemSummaryDto[];
  selectedApproval: ApprovalRequestDto | null;
  submitApprovalDecisionForRequest: (requestId: string, decision: "approve" | "deny") => void;
};

type TriageSource = "Approval" | "Incident" | "Blocked Work" | "Queue";

interface TriageRow {
  key: string;
  source: TriageSource;
  title: string;
  timestamp: string | null;
  score: number;
  state: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
  destination: string;
  actionLabel: string;
  tone: AttentionTone;
  facts: Array<[string, string]>;
  requestId?: string;
  artifactId?: string;
  incidentId?: string;
  workItemId?: string;
  queueItem?: ActionQueueItem;
}

function scoreForApprovalRow(request: ApprovalRequestSummaryDto): number {
  return request.state === "awaiting" ? 130 : request.state === "denied" ? 90 : 20;
}

function scoreForIncidentRow(incident: IncidentSummaryDto): number {
  return incident.severity === "critical" || incident.severity === "high" ? 120 : 85;
}

function scoreForWorkRow(item: WorkItemSummaryDto): number {
  return item.state === "quarantined" ? 115 : item.state === "blocked" ? 105 : 80;
}

function toneForApprovalState(state: ApprovalRequestSummaryDto["state"]): AttentionTone {
  switch (state) {
    case "awaiting":
      return "warning";
    case "denied":
      return "danger";
    case "approved":
      return "active";
    default:
      return "steady";
  }
}

function toneForIncidentState(severity: IncidentSummaryDto["severity"]): AttentionTone {
  return severity === "critical" || severity === "high" ? "danger" : severity === "moderate" ? "warning" : "steady";
}

function toneForWorkState(state: WorkItemSummaryDto["state"]): AttentionTone {
  return state === "blocked" || state === "quarantined" ? "danger" : "warning";
}

export function OperateWorkspace({
  actionQueue,
  artifacts,
  navigateToConversationSection,
  navigateToEvidenceSection,
  navigateToExecutionSection,
  navigateToRecoverySection,
  summary,
  status,
  approvalRequests,
  selectedApprovalId,
  selectedArtifactId,
  selectedIncidentId,
  isDecidingApproval,
  incidents,
  openApprovalRequest,
  selectedWorkItemId,
  workItems,
  selectedApproval,
  submitApprovalDecisionForRequest
}: OperateWorkspaceProps) {
  if (!summary || !status) {
    return (
      <div className="empty-state">
        <p className="eyebrow">No Environment Bound</p>
        <h3>The shell is ready for an explicit binding.</h3>
      </div>
    );
  }

  const availableApprovalRequests = [
    ...approvalRequests,
    ...summary.approvals.filter(
      (candidate) => !approvalRequests.some((existing) => existing.requestId === candidate.requestId)
    )
  ];

  const triageRows = useMemo<TriageRow[]>(() => {
    const rowByKey = new Map<string, TriageRow>();

    for (const request of availableApprovalRequests) {
      rowByKey.set(`approval:${request.requestId}`, {
        key: `approval:${request.requestId}`,
        source: "Approval",
        title: request.title,
        timestamp: request.createdAt,
        score: scoreForApprovalRow(request),
        state: request.state,
        priority: request.state === "awaiting" ? "High" : request.state === "denied" ? "Medium" : "Low",
        reason: request.summary,
        destination: "Actions Board",
        actionLabel: "Open Approval",
        tone: toneForApprovalState(request.state),
        requestId: request.requestId,
        facts: [
          ["Request", request.requestId],
          ["State", request.state],
          ["Summary", request.summary]
        ]
      });
    }

    for (const incident of incidents.filter((item) => item.state !== "resolved")) {
      rowByKey.set(`incident:${incident.incidentId}`, {
        key: `incident:${incident.incidentId}`,
        source: "Incident",
        title: incident.title,
        timestamp: incident.updatedAt,
        score: scoreForIncidentRow(incident),
        state: incident.state,
        priority: incident.severity === "critical" || incident.severity === "high" ? "High" : "Medium",
        reason: `${incident.severity} incident requires review.`,
        destination: "Actions Board",
        actionLabel: "Open Incident",
        tone: toneForIncidentState(incident.severity),
        incidentId: incident.incidentId,
        facts: [
          ["Incident", incident.incidentId],
          ["Severity", incident.severity],
          ["State", incident.state]
        ]
      });
    }

    for (const item of workItems.filter((entry) => entry.state === "blocked" || entry.state === "quarantined")) {
      rowByKey.set(`work:${item.workItemId}`, {
        key: `work:${item.workItemId}`,
        source: "Blocked Work",
        title: item.title,
        timestamp: item.updatedAt,
        score: scoreForWorkRow(item),
        state: item.state,
        priority: "High",
        reason:
          item.waitingReason ??
          `${item.approvalCount} approvals, ${item.incidentCount} incidents, ${item.artifactCount} artifacts linked.`,
        destination: "Actions Board",
        actionLabel: "Open Work Item",
        tone: toneForWorkState(item.state),
        workItemId: item.workItemId,
        facts: [
          ["Work Item", item.workItemId],
          ["State", item.state],
          ["Waiting", item.waitingReason ?? "n/a"],
          ["Validation", item.validationBurden],
          ["Reconciliation", item.reconciliationBurden]
        ]
      });
    }

    for (const item of actionQueue) {
      const key = item.key;
      const queueRow: TriageRow = {
        key,
        source: "Queue",
        title: item.title,
        timestamp: item.timestamp ?? null,
        score: item.score,
        state: item.stateLabel,
        priority: item.priorityLabel,
        reason: item.whyNow,
        destination: item.destinationLabel,
        actionLabel: item.actionLabel,
        tone: item.tone,
        requestId: item.objectType === "Approval" ? item.objectId : undefined,
        artifactId: item.objectType === "Artifact" ? item.objectId : undefined,
        incidentId: item.objectType === "Recovery" ? item.objectId : undefined,
        workItemId: item.objectType === "Work" ? item.objectId : undefined,
        queueItem: item,
        facts: [
          ["Object", item.objectType],
          ["Object Id", item.objectId],
          ["Destination", item.destinationLabel],
          ["Reason", item.rankReason || item.effectSummary || item.whyNow]
        ]
      };
      const existing = rowByKey.get(key);
      if (!existing) {
        rowByKey.set(key, queueRow);
        continue;
      }
      rowByKey.set(key, {
        ...existing,
        timestamp: existing.timestamp ?? queueRow.timestamp,
        score: Math.max(existing.score, queueRow.score),
        reason: queueRow.reason,
        destination: queueRow.destination,
        actionLabel: queueRow.actionLabel,
        tone: queueRow.tone,
        queueItem: queueRow.queueItem
      });
    }

    return Array.from(rowByKey.values());
  }, [actionQueue, approvalRequests, availableApprovalRequests, incidents, workItems, summary.approvals]);

  const [selectedTriageKey, setSelectedTriageKey] = useState<string | null>(triageRows[0]?.key ?? null);
  const lastSyncedFocusKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const focusedKey =
      (selectedApprovalId ? `approval:${selectedApprovalId}` : null) ??
      (selectedIncidentId ? `incident:${selectedIncidentId}` : null) ??
      (selectedWorkItemId ? `work:${selectedWorkItemId}` : null) ??
      (selectedArtifactId ? `artifact:${selectedArtifactId}` : null);

    if (focusedKey && focusedKey !== lastSyncedFocusKeyRef.current) {
      lastSyncedFocusKeyRef.current = focusedKey;
      setSelectedTriageKey(focusedKey);
      return;
    }
    if (!focusedKey) {
      lastSyncedFocusKeyRef.current = null;
    }
    if (!triageRows.some((row) => row.key === selectedTriageKey)) {
      setSelectedTriageKey(triageRows[0]?.key ?? null);
    }
  }, [selectedApprovalId, selectedArtifactId, selectedIncidentId, selectedTriageKey, selectedWorkItemId, triageRows]);

  const selectedRow = triageRows.find((row) => row.key === selectedTriageKey) ?? triageRows[0] ?? null;
  const selectedApprovalRequest =
    selectedRow?.requestId != null
      ? availableApprovalRequests.find((request) => request.requestId === selectedRow.requestId) ?? null
      : selectedApproval;
  const selectedIncidentSummary =
    selectedRow?.incidentId != null ? incidents.find((incident) => incident.incidentId === selectedRow.incidentId) ?? null : null;
  const selectedWorkItemSummary =
    selectedRow?.workItemId != null ? workItems.find((item) => item.workItemId === selectedRow.workItemId) ?? null : null;
  const selectedArtifactSummary =
    selectedRow?.artifactId != null ? artifacts.find((artifact) => artifact.artifactId === selectedRow.artifactId) ?? null : null;
  const selectedQueueItem = selectedRow?.queueItem ?? null;
  const selectedContextSummary =
    selectedArtifactSummary?.summary ??
    selectedApprovalRequest?.summary ??
    selectedWorkItemSummary?.waitingReason ??
    (selectedIncidentSummary ? `${selectedIncidentSummary.severity} incident remains ${selectedIncidentSummary.state}.` : null) ??
    selectedQueueItem?.effectSummary ??
    selectedQueueItem?.rankReason ??
    null;

  async function openLinkedSurface(row: TriageRow): Promise<void> {
    if (row.queueItem) {
      switch (row.queueItem.objectType) {
        case "Thread":
          await navigateToConversationSection("threads");
          return;
        case "Approval":
          await openApprovalRequest(row.queueItem.objectId);
          return;
        case "Work":
          await navigateToExecutionSection("work");
          return;
        case "Recovery":
          await navigateToRecoverySection("incidents");
          return;
        case "Artifact":
          await navigateToEvidenceSection("artifacts");
          return;
        case "Runtime":
        default:
          await navigateToExecutionSection("listener");
          return;
      }
    }
    if (row.requestId) {
      await openApprovalRequest(row.requestId);
      return;
    }
    if (row.incidentId) {
      await navigateToRecoverySection("incidents");
      return;
    }
    if (row.workItemId) {
      await navigateToExecutionSection("work");
      return;
    }
    await navigateToConversationSection("threads");
  }

  return (
    <div className="environment-grid">
      <section className="panel operate-table-panel">
        <PanelHeader
          title="Actions"
          subtitle="One list across approvals, incidents, blocked work, and queued items."
        />
        <BrowserDataTable
          key="operate-triage"
          columnTemplate="minmax(0, 0.85fr) minmax(0, 0.7fr) minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.75fr) minmax(0, 1.45fr) minmax(0, 0.9fr) 44px"
          columns={[
            {
              id: "priority",
              label: "Priority",
              render: (row) => <PriorityStateChip label={row.priority} tone={row.tone} />,
              sortValue: (row) => row.score,
              searchValue: (row) => row.priority
            },
            {
              id: "source",
              label: "Source",
              render: (row) => <Badge tone={row.tone}>{row.source}</Badge>,
              sortValue: (row) => row.source,
              searchValue: (row) => row.source
            },
            {
              id: "title",
              label: "Title",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title,
              searchValue: (row) => `${row.title} ${row.reason}`
            },
            {
              id: "timestamp",
              label: "Timestamp",
              render: (row) => row.timestamp ?? "—",
              sortValue: (row) => row.timestamp ?? "",
              searchValue: (row) => row.timestamp ?? ""
            },
            {
              id: "state",
              label: "State",
              render: (row) => row.state,
              sortValue: (row) => row.state,
              searchValue: (row) => row.state
            },
            {
              id: "reason",
              label: "Reason",
              render: (row) => row.reason,
              sortValue: (row) => row.reason,
              searchValue: (row) => `${row.reason} ${row.destination}`
            },
            {
              id: "destination",
              label: "Surface",
              render: (row) => row.destination,
              sortValue: (row) => row.destination
            },
            {
              id: "launch",
              label: "",
              render: (row) => (
                <button
                  aria-label={row.actionLabel}
                  className="panel-titlebar-toggle table-row-action"
                  onClick={(event) => {
                    event.stopPropagation();
                    void openLinkedSurface(row);
                  }}
                  title={row.actionLabel}
                  type="button"
                >
                  <span aria-hidden="true">↗</span>
                </button>
              ),
              sortValue: () => ""
            }
          ]}
          emptyMessage="No triage items are active."
          filterLabel="Source"
          filterOptions={[
            { label: "Approval", value: "Approval" },
            { label: "Incident", value: "Incident" },
            { label: "Blocked Work", value: "Blocked Work" },
            { label: "Queue", value: "Queue" }
          ]}
          getFilterValue={(row) => row.source}
          getRowKey={(row) => row.key}
          initialSortColumnId="priority"
          initialSortDirection="desc"
          onSelect={(row) => setSelectedTriageKey(row.key)}
          rows={triageRows}
          searchPlaceholder="Search triage"
          selectedKey={selectedRow?.key ?? null}
        />
      </section>

      {selectedRow ? (
        <section className="panel operate-detail-panel">
          <PanelHeader
            title={selectedRow.title}
            subtitle="Selected item detail and linked actions."
          />
          <div className="browser-focus-card">
            <div>
              <p className="context-label">Reason</p>
              <strong>{selectedRow.reason}</strong>
              <p>{selectedRow.destination}</p>
            </div>
            <PriorityStateChip label={selectedRow.priority} tone={selectedRow.tone} />
          </div>
          {selectedContextSummary ? (
            <div className="browser-focus-card">
              <div>
                <p className="context-label">Current Context</p>
                <strong>{selectedContextSummary}</strong>
              </div>
            </div>
          ) : null}
          <dl className="detail-list">
            {selectedRow.facts.map(([label, value]) => (
              <DetailRow key={`${selectedRow.key}:${label}`} label={label} value={value} />
            ))}
            {selectedIncidentSummary ? (
              <>
                <DetailRow label="Severity" value={selectedIncidentSummary.severity} />
                <DetailRow label="Recovery State" value={selectedIncidentSummary.state} />
              </>
            ) : null}
            {selectedWorkItemSummary ? (
              <>
                <DetailRow label="Approvals" value={String(selectedWorkItemSummary.approvalCount)} />
                <DetailRow label="Incidents" value={String(selectedWorkItemSummary.incidentCount)} />
                <DetailRow label="Artifacts" value={String(selectedWorkItemSummary.artifactCount)} />
              </>
            ) : null}
            {selectedArtifactSummary ? (
              <>
                <DetailRow label="Artifact Kind" value={selectedArtifactSummary.kind} />
                <DetailRow label="Updated" value={selectedArtifactSummary.updatedAt} />
                <DetailRow label="Artifact Summary" value={selectedArtifactSummary.summary} />
              </>
            ) : null}
            {selectedQueueItem?.references.length ? (
              <DetailRow label="References" value={selectedQueueItem.references.join(" · ")} />
            ) : null}
          </dl>
          <div className="browser-action-strip">
            <button className="starter-chip" onClick={() => void openLinkedSurface(selectedRow)} type="button">
              {selectedRow.actionLabel}
            </button>
            {selectedRow.requestId && selectedApprovalRequest?.state === "awaiting" ? (
              <button
                className="starter-chip"
                disabled={isDecidingApproval}
                onClick={() => submitApprovalDecisionForRequest(selectedRow.requestId ?? "", "approve")}
                type="button"
              >
                {isDecidingApproval ? "Submitting..." : "Approve"}
              </button>
            ) : null}
            {selectedRow.requestId && selectedApprovalRequest?.state === "awaiting" ? (
              <button
                className="starter-chip"
                disabled={isDecidingApproval}
                onClick={() => submitApprovalDecisionForRequest(selectedRow.requestId ?? "", "deny")}
                type="button"
              >
                {isDecidingApproval ? "Submitting..." : "Deny"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
