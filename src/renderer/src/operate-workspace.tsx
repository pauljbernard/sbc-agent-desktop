import { useEffect, useMemo, useState } from "react";
import type {
  AlignmentStateDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactSummaryDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  IncidentSummaryDto,
  ReconciliationDecisionDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { PriorityStateChip } from "./interaction-support";
import { DetailRow } from "./journey-support";
import { Badge, PanelHeader } from "./surface-support";
import { SupervisionBoard } from "./workspace-support-components";

type BrowserDomain =
  | "systems"
  | "packages"
  | "symbols"
  | "classes-methods"
  | "runtime-objects"
  | "source"
  | "xref"
  | "documentation"
  | "governance"
  | "linked-conversations";

type OperateSection = "orientation" | "journeys" | "evidence";
type ConversationSection = "threads" | "turns" | "draft" | "repl";
type ExecutionSection = "listener" | "approvals" | "work";
type RecoverySection = "incidents";
type EvidenceSection = "artifacts" | "observation";

type AttentionTone = "active" | "warning" | "danger" | "steady";

function toneForAlignmentStatus(status: string | undefined): AttentionTone {
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

function toneForReconciliationDecision(decision: string | undefined): AttentionTone {
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

function formatAlignmentValue(alignment: AlignmentStateDto | null | undefined): string {
  if (!alignment) {
    return "unknown";
  }
  return `${alignment.status} (${alignment.score.toFixed(2)})`;
}

function formatReconciliationValue(reconciliation: ReconciliationDecisionDto | null | undefined): string {
  if (!reconciliation) {
    return "unknown";
  }
  return reconciliation.decision;
}

function formatTriggerEventSummary(reconciliation: ReconciliationDecisionDto | null | undefined): string {
  if (!reconciliation) {
    return "No trigger evidence available.";
  }
  if (reconciliation.triggerEvents.length === 0) {
    return "No linked trigger events are currently attached.";
  }
  const [firstEvent] = reconciliation.triggerEvents;
  return `${reconciliation.triggerEvents.length} trigger events, starting with ${firstEvent.kind}.`;
}

interface GlobalAttentionItem {
  id: string;
  label: string;
  summary: string;
  value: number;
  workspace: WorkspaceId;
  tone: AttentionTone;
}

interface ActionQueueItem {
  key: string;
  objectType: "Thread" | "Approval" | "Work" | "Recovery" | "Artifact" | "Runtime";
  objectId: string;
  title: string;
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

interface DockJumpTarget {
  id: string;
  label: string;
  title: string;
  stateLabel: string;
  shortcutKey: string;
  recommendationReason: string;
  score: number;
  recommended?: boolean;
  tone: AttentionTone;
  onJump: () => void;
}

export type OperateWorkspaceProps = {
  actionQueue: ActionQueueItem[];
  artifacts: ArtifactSummaryDto[];
  leadAttention: GlobalAttentionItem | null;
  monitorItems: GlobalAttentionItem[];
  navigateToActionQueueItem: (item: ActionQueueItem) => Promise<void>;
  navigateToBrowserDomain: (domain: BrowserDomain) => Promise<void>;
  navigateToConversationSection: (section: ConversationSection) => Promise<void>;
  navigateToEvidenceSection: (section: EvidenceSection) => Promise<void>;
  navigateToExecutionSection: (section: ExecutionSection) => Promise<void>;
  navigateToRecoverySection: (section: RecoverySection) => Promise<void>;
  recommendedTarget: DockJumpTarget | null;
  recommendedTargets: DockJumpTarget[];
  selectedSection: OperateSection;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  approvalRequests: ApprovalRequestSummaryDto[];
  isDecidingApproval: boolean;
  incidents: IncidentSummaryDto[];
  openApprovalRequest: (requestId: string) => Promise<void>;
  workItems: WorkItemSummaryDto[];
  selectedApproval: ApprovalRequestDto | null;
  submitApprovalDecisionForRequest: (requestId: string, decision: "approve" | "deny") => void;
};

function toneForApprovalState(
  state: ApprovalRequestSummaryDto["state"]
): AttentionTone {
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

function attentionToneWeight(tone: AttentionTone): number {
  switch (tone) {
    case "danger":
      return 4;
    case "warning":
      return 3;
    case "active":
      return 2;
    default:
      return 1;
  }
}

export function OperateWorkspace({
  actionQueue,
  artifacts,
  leadAttention,
  monitorItems,
  navigateToActionQueueItem,
  navigateToBrowserDomain,
  navigateToConversationSection,
  navigateToEvidenceSection,
  navigateToExecutionSection,
  navigateToRecoverySection,
  recommendedTarget,
  recommendedTargets,
  selectedSection,
  summary,
  status,
  approvalRequests,
  isDecidingApproval,
  incidents,
  openApprovalRequest,
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
  function toneForIncidentState(severity: IncidentSummaryDto["severity"]): AttentionTone {
    return severity === "critical" || severity === "high" ? "danger" : severity === "moderate" ? "warning" : "steady";
  }

  function toneForWorkState(state: WorkItemSummaryDto["state"]): AttentionTone {
    return state === "blocked" || state === "quarantined" ? "warning" : state === "active" ? "active" : "steady";
  }

  function toneForTaskState(state: EnvironmentSummaryDto["activeTasks"][number]["state"]): AttentionTone {
    return state === "blocked" ? "danger" : state === "active" ? "active" : state === "waiting" ? "warning" : "steady";
  }

  function toneForWorkerState(state: EnvironmentSummaryDto["activeWorkers"][number]["state"]): AttentionTone {
    return state === "active" ? "active" : state === "waiting" ? "warning" : "steady";
  }

  const alignmentState = status.alignmentState ?? summary.alignmentState ?? null;
  const reconciliationDecision = status.reconciliationDecision ?? summary.reconciliationDecision ?? null;
  const availableApprovalRequests = [
    ...approvalRequests,
    ...summary.approvals.filter(
      (candidate) => !approvalRequests.some((existing) => existing.requestId === candidate.requestId)
    )
  ];

  const orientationRows = useMemo(() => [
    {
      key: "binding",
      record: "Current Binding",
      domain: "environment",
      entity: summary.environmentLabel,
      impact: summary.activeContext.focusSummary,
      nextAction: "inspect environment",
      targetWorkspace: "browser" as WorkspaceId,
      tone: status.connectionState === "bound" ? ("active" as const) : ("warning" as const),
      detail: "Verify the current environment root, runtime identity, and active continuation before drilling into a narrower workspace.",
      facts: [
        ["Environment", summary.environmentId],
        ["Connection", status.connectionState],
        ["Host", status.hostState],
        ["Last Update", status.lastUpdatedAt]
      ]
    },
    {
      key: "runtime",
      record: "Runtime Posture",
      domain: "runtime",
      entity: summary.activeContext.runtimePackage ?? summary.activeContext.runtimeLabel,
      impact: summary.imagePosture.summary,
      nextAction: "open listener",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: status.runtimeState === "recovering" ? ("danger" as const) : ("active" as const),
      detail: "Use this surface to move directly into live evaluation or browser inspection at the currently active package and image posture.",
      facts: [
        ["Runtime", summary.activeContext.runtimeLabel],
        ["Package", summary.activeContext.runtimePackage ?? "unknown"],
        ["State", status.runtimeState],
        ["Workflow", status.workflowState]
      ]
    },
    {
      key: "continuation",
      record: "Active Continuation",
      domain: "conversation",
      entity: summary.activeContext.currentThreadTitle ?? "No active thread",
      impact: summary.activeContext.currentTurnSummary ?? "No current turn summary is attached.",
      nextAction: "resume conversation",
      targetWorkspace: "conversations" as WorkspaceId,
      tone: summary.attention.interruptedTurns > 0 ? ("warning" as const) : ("active" as const),
      detail: "The current supervised thread should remain the bridge between Browser, Listener, Recovery, and Evidence.",
      facts: [
        ["Thread", summary.activeContext.currentThreadTitle ?? "none"],
        ["Interrupted", String(summary.attention.interruptedTurns)],
        ["Tasks", String(summary.activeTasks.length)],
        ["Workers", String(summary.activeWorkers.length)]
      ]
    },
    {
      key: "pressure",
      record: "Attention Pressure",
      domain: "workflow",
      entity: status.workflowState,
      impact: `${summary.attention.approvalsAwaiting} approvals, ${summary.attention.openIncidents} incidents, ${summary.attention.blockedWork} blocked work`,
      nextAction: "review journeys",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: status.workflowState === "attention_required" ? ("warning" as const) : ("steady" as const),
      detail: "This condenses the work that still needs explicit human attention before the environment can be treated as clear.",
      facts: [
        ["Approvals", String(summary.attention.approvalsAwaiting)],
        ["Incidents", String(summary.attention.openIncidents)],
        ["Blocked Work", String(summary.attention.blockedWork)],
        ["Streams", String(summary.attention.activeStreams)]
      ]
    },
    {
      key: "trust",
      record: "Alignment And Correction",
      domain: "governance",
      entity: formatReconciliationValue(reconciliationDecision),
      impact: alignmentState
        ? `${alignmentState.divergenceTypes.length} divergence types, ${alignmentState.gapCount} gaps, confidence ${alignmentState.confidence.toFixed(2)}`
        : "No explicit alignment evidence is currently projected into the desktop shell.",
      nextAction: reconciliationDecision?.requiresApproval ? "review approvals" : "inspect trust posture",
      targetWorkspace: "approvals" as WorkspaceId,
      tone: toneForReconciliationDecision(reconciliationDecision?.decision ?? alignmentState?.status),
      detail:
        reconciliationDecision?.proposedActions[0]?.reason ??
        "Review continuous alignment posture before assuming the environment can proceed without intervention.",
      facts: [
        ["Alignment Status", alignmentState?.status ?? "unknown"],
        ["Alignment Score", alignmentState ? alignmentState.score.toFixed(2) : "n/a"],
        ["Corrective Direction", reconciliationDecision?.decision ?? "unknown"],
        ["Approval Required", reconciliationDecision?.requiresApproval ? "yes" : "no"],
        ["Approval Posture", reconciliationDecision?.approvalPosture ?? "unknown"],
        ["Proposed Actions", String(reconciliationDecision?.proposedActions.length ?? 0)],
        ["Trigger Events", String(reconciliationDecision?.triggerEvents.length ?? 0)]
      ]
    },
    {
      key: "evidence",
      record: "Recent Evidence",
      domain: "evidence",
      entity: summary.recentArtifacts[0]?.title ?? "No recent artifact",
      impact: summary.recentArtifacts[0]?.summary ?? "Durable artifacts appear here as proof and consequence rather than as detached attachments.",
      nextAction: "review artifacts",
      targetWorkspace: "artifacts" as WorkspaceId,
      tone: summary.recentArtifacts.length > 0 ? ("active" as const) : ("steady" as const),
      detail: "Recent artifacts should be part of first-run orientation because they often explain what changed and what still needs review.",
      facts: [
        ["Recent Artifacts", String(summary.recentArtifacts.length)],
        ["Open Incidents", String(summary.incidents.length)],
        ["Open Approvals", String(summary.approvals.length)],
        ["Target", "Evidence > Artifacts"]
      ]
    }
  ], [alignmentState, reconciliationDecision, summary, status.connectionState, status.hostState, status.lastUpdatedAt, status.runtimeState, status.workflowState]);

  const journeyRows = useMemo(() => [
    ...workItems.map((item) => ({
      key: `work:${item.workItemId}`,
      title: item.title,
      lane: "work",
      state: item.state,
      urgency: item.state === "blocked" || item.state === "quarantined" ? "high" : "active",
      dependency: item.waitingReason ?? "ready",
      nextStep: item.state === "blocked" || item.state === "quarantined" ? "resolve blocker" : "open execution",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: toneForWorkState(item.state),
      detail: item.waitingReason ?? "Governed work is ready to continue in the execution workspace.",
      facts: [
        ["Approvals", String(item.approvalCount)],
        ["Incidents", String(item.incidentCount)],
        ["Artifacts", String(item.artifactCount)],
        ["Validation", item.validationBurden]
      ]
    })),
    ...approvalRequests.map((request) => ({
      key: `approval:${request.requestId}`,
      title: request.title,
      lane: "approval",
      state: request.state,
      urgency: request.state === "awaiting" ? "high" : "steady",
      dependency: "human decision",
      nextStep: request.state === "awaiting" ? "review approval" : "inspect decision",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: toneForApprovalState(request.state),
      detail: request.summary,
      facts: [
        ["Type", "approval gate"],
        ["State", request.state],
        ["Workspace", "Execution > Approvals"],
        ["Consequence", selectedApproval?.requestId === request.requestId ? selectedApproval.consequenceSummary : "Review the decision consequence in Execution."]
      ]
    })),
    ...incidents.map((incident) => ({
      key: `incident:${incident.incidentId}`,
      title: incident.title,
      lane: "incident",
      state: incident.state,
      urgency: incident.severity,
      dependency: "recovery path",
      nextStep: incident.state === "resolved" ? "review closure" : "open recovery",
      targetWorkspace: "incidents" as WorkspaceId,
      tone: toneForIncidentState(incident.severity),
      detail: `Severity ${incident.severity}. Recovery remains part of the current continuation until closure is trustworthy again.`,
      facts: [
        ["Severity", incident.severity],
        ["State", incident.state],
        ["Workspace", "Recovery"],
        ["Artifacts", String(artifacts.filter((artifact) => artifact.kind.includes("incident")).length)]
      ]
    }))
  ], [approvalRequests, artifacts, incidents, selectedApproval, workItems]);

  const evidenceRows = useMemo(
    () =>
      (artifacts.length > 0 ? artifacts : summary.recentArtifacts).map((artifact) => ({
        key: artifact.artifactId,
        artifact: artifact.title,
        type: artifact.kind,
        updatedAt: artifact.updatedAt,
        summary: artifact.summary,
        impact:
          artifact.kind.includes("incident")
            ? "recovery"
            : artifact.kind.includes("spec") || artifact.kind.includes("source")
              ? "source"
              : "workflow",
        targetWorkspace: "artifacts" as WorkspaceId,
        tone: artifact.kind.includes("incident") ? ("warning" as const) : ("active" as const),
        facts: [
          ["Artifact", artifact.title],
          ["Kind", artifact.kind],
          ["Updated", artifact.updatedAt],
          ["Workspace", "Evidence"]
        ]
      })),
    [artifacts, summary.recentArtifacts]
  );
  const taskRows = summary.activeTasks.map((task) => ({
    key: task.taskId,
    title: task.title,
    state: task.state,
    summary: task.summary,
    tone: toneForTaskState(task.state)
  }));
  const workerRows = summary.activeWorkers.map((worker) => ({
    key: worker.workerId,
    title: worker.label,
    state: worker.state,
    summary: worker.responsibility,
    tone: toneForWorkerState(worker.state)
  }));
  const parallelSnapshot = {
    activeTasks: taskRows.filter((task) => task.state === "active").length,
    blockedTasks: taskRows.filter((task) => task.state === "blocked").length,
    waitingWorkers: workerRows.filter((worker) => worker.state === "waiting").length
  };

  const [selectedOrientationKey, setSelectedOrientationKey] = useState<string | null>(orientationRows[0]?.key ?? null);
  const [selectedJourneyKey, setSelectedJourneyKey] = useState<string | null>(journeyRows[0]?.key ?? null);
  const [selectedEvidenceKey, setSelectedEvidenceKey] = useState<string | null>(evidenceRows[0]?.key ?? null);

  useEffect(() => {
    const nextOrientationKey = orientationRows[0]?.key ?? null;
    if (!orientationRows.some((row) => row.key === selectedOrientationKey) && selectedOrientationKey !== nextOrientationKey) {
      setSelectedOrientationKey(nextOrientationKey);
    }
  }, [orientationRows, selectedOrientationKey]);

  useEffect(() => {
    const nextJourneyKey = journeyRows[0]?.key ?? null;
    if (!journeyRows.some((row) => row.key === selectedJourneyKey) && selectedJourneyKey !== nextJourneyKey) {
      setSelectedJourneyKey(nextJourneyKey);
    }
  }, [journeyRows, selectedJourneyKey]);

  useEffect(() => {
    const nextEvidenceKey = evidenceRows[0]?.key ?? null;
    if (!evidenceRows.some((row) => row.key === selectedEvidenceKey) && selectedEvidenceKey !== nextEvidenceKey) {
      setSelectedEvidenceKey(nextEvidenceKey);
    }
  }, [evidenceRows, selectedEvidenceKey]);

  const selectedOrientation = orientationRows.find((row) => row.key === selectedOrientationKey) ?? orientationRows[0] ?? null;
  const selectedCorrectiveWorkItem =
    workItems.find((item) => item.approvalCount > 0 && item.correctiveContext) ?? null;
  const selectedCorrectiveApproval =
    (selectedCorrectiveWorkItem
      ? availableApprovalRequests.find(
          (request) =>
            request.state === "awaiting"
            && request.title.trim().toLowerCase() === selectedCorrectiveWorkItem.title.trim().toLowerCase()
        )
      : null)
    ?? availableApprovalRequests.find((request) => request.state === "awaiting")
    ?? null;
  const selectedJourney = journeyRows.find((row) => row.key === selectedJourneyKey) ?? journeyRows[0] ?? null;
  const selectedEvidence = evidenceRows.find((row) => row.key === selectedEvidenceKey) ?? evidenceRows[0] ?? null;
  const selectedJourneyIdentityRows = selectedJourney
    ? [
        ["Object Id", selectedJourney.key],
        ["Authority", selectedJourney.lane === "approval" ? "human decision" : selectedJourney.lane === "incident" ? "recovery intervention" : "governed execution"],
        [
          "Trace",
          selectedJourney.facts.find(([label]) => label === "Workspace")?.[1] ??
            selectedJourney.dependency
        ]
      ]
    : [];
  const selectedEvidenceIdentityRows = selectedEvidence
    ? [
        ["Object Id", selectedEvidence.key],
        ["Authority", selectedEvidence.impact === "recovery" ? "closure evidence" : selectedEvidence.impact === "source" ? "source-backed evidence" : "workflow evidence"],
        [
          "Trace",
          selectedEvidence.facts.find(([label]) => label === "Workspace")?.[1] ??
            selectedEvidence.updatedAt
        ]
      ]
    : [];
  const supervisionLanes = {
    foreground: journeyRows.filter((row) => row.tone === "danger" || row.urgency === "critical" || row.urgency === "high").slice(0, 4),
    active: journeyRows.filter((row) => row.tone === "active").slice(0, 4),
    background: journeyRows.filter((row) => row.tone === "steady" || row.tone === "warning").slice(0, 4)
  };
  const governedQueueItems = actionQueue.slice(0, 6);
  const primaryQueueRecommendation = governedQueueItems[0] ?? null;
  const operateSnapshotCards = [
    {
      key: "continuation",
      label: "Continuation",
      value: summary.activeContext.currentThreadTitle ?? summary.environmentLabel,
      detail: summary.activeContext.currentTurnSummary ?? summary.activeContext.focusSummary
    },
    {
      key: "pressure",
      label: "Pressure",
      value: `${summary.attention.approvalsAwaiting + summary.attention.openIncidents + summary.attention.blockedWork}`,
      detail: `${summary.attention.approvalsAwaiting} approvals, ${summary.attention.openIncidents} incidents, ${summary.attention.blockedWork} blocked`
    },
    {
      key: "runtime",
      label: "Runtime",
      value: summary.activeContext.runtimePackage ?? summary.activeContext.runtimeLabel,
      detail: `${status.runtimeState} image posture inside ${summary.environmentLabel}`
    },
    {
      key: "alignment",
      label: "Alignment",
      value: formatAlignmentValue(alignmentState),
      detail: alignmentState
        ? `${alignmentState.divergenceTypes.length} divergence types across ${alignmentState.gapCount} gaps`
        : "No alignment posture is currently available."
    },
    {
      key: "correction",
      label: "Corrective Direction",
      value: formatReconciliationValue(reconciliationDecision),
      detail: reconciliationDecision
        ? `${reconciliationDecision.requiresApproval ? "Approval required." : "No approval required."} ${reconciliationDecision.proposedActions[0]?.reason ?? ""}`.trim()
        : "No reconciliation direction is currently available."
    },
    {
      key: "triggers",
      label: "Trigger Events",
      value: String(reconciliationDecision?.triggerEvents.length ?? 0),
      detail: formatTriggerEventSummary(reconciliationDecision)
    },
    {
      key: "evidence",
      label: "Evidence",
      value: `${evidenceRows.length} artifacts`,
      detail: evidenceRows[0]?.artifact ?? "No recent artifact is currently foregrounded."
    },
    {
      key: "attention",
      label: "Attention",
      value: leadAttention?.label ?? "Calm",
      detail:
        leadAttention?.summary ??
        "No dominant governed attention item is currently outranking the rest of the environment."
    },
    {
      key: "recommendation",
      label: "Next Move",
      value: primaryQueueRecommendation?.title ?? recommendedTarget?.title ?? "No recommended route",
      detail:
        primaryQueueRecommendation?.rankReason ??
        primaryQueueRecommendation?.whyNow ??
        recommendedTarget?.recommendationReason ??
        "Operate remains the main place to review current pressure even when no single route clearly dominates."
    }
  ];
  const operatePressureCards = [
    {
      key: "recommendation",
      label: "Recommended Route",
      value: primaryQueueRecommendation?.title ?? recommendedTarget?.title ?? "No dominant route",
      detail:
        primaryQueueRecommendation?.rankReason ??
        primaryQueueRecommendation?.whyNow ??
        recommendedTarget?.recommendationReason ??
        "No single governed route currently outranks the rest of the environment."
    },
    {
      key: "monitors",
      label: "Active Monitors",
      value: String(monitorItems.length),
      detail:
        monitorItems[0]?.summary ??
        "Current attention pressure is already represented inside the visible operate lanes."
    },
    {
      key: "recommendations",
      label: "Visible Routes",
      value: String(recommendedTargets.length),
      detail:
        recommendedTargets[0]?.title ??
        "When routes are available, they should emerge from the same operational instrument rather than from a separate proactivity panel."
    }
  ];
  async function openOrientationPrimary(row: (typeof orientationRows)[number]): Promise<void> {
    if (row.key === "binding") {
      await navigateToBrowserDomain("systems");
      return;
    }
    if (row.key === "runtime") {
      await navigateToExecutionSection("listener");
      return;
    }
    if (row.key === "continuation") {
      await navigateToConversationSection("threads");
      return;
    }
    if (row.key === "trust") {
      await navigateToExecutionSection("approvals");
      return;
    }
    await navigateToExecutionSection("approvals");
  }

  async function openJourneyPrimary(row: {
    lane: string;
  }): Promise<void> {
    if (row.lane === "work") {
      await navigateToExecutionSection("work");
      return;
    }
    if (row.lane === "approval") {
      await navigateToExecutionSection("approvals");
      return;
    }
    await navigateToRecoverySection("incidents");
  }

  async function openEvidencePrimary(): Promise<void> {
    await navigateToEvidenceSection("artifacts");
  }

  return (
    <div className="environment-grid">
      {selectedSection !== "orientation" ? (
        <section className="panel operate-overview-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Operate Snapshot</p>
              <h3>{selectedSection === "journeys" ? "Supervised Journeys" : "Proof And Closure"}</h3>
            </div>
            <Badge tone={status.workflowState === "attention_required" ? "warning" : "active"}>{status.workflowState}</Badge>
          </div>
          <div className="signal-digest-grid operate-overview-digest">
            {operateSnapshotCards.map((card) => (
              <div className="signal-digest-card" key={card.key}>
                <span className="context-label">{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </div>
            ))}
          </div>
          <div className="browser-action-strip">
            <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
              Open Threads
            </button>
            <button className="starter-chip" onClick={() => void navigateToConversationSection("repl")} type="button">
              Open REPL
            </button>
            <button className="starter-chip" onClick={() => void navigateToExecutionSection("work")} type="button">
              Open Work
            </button>
            <button className="starter-chip" onClick={() => void navigateToEvidenceSection("artifacts")} type="button">
              Open Artifacts
            </button>
            <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
              Open Listener
            </button>
          </div>
        </section>
      ) : null}

      {selectedSection === "orientation" ? (
        <>
          <section className="panel operate-table-panel">
            <PanelHeader
              title="Orientation Records"
              subtitle="Each row is an operational checkpoint into the live environment and opens the next relevant workspace."
            />
            <BrowserDataTable
              key="operate-orientation"
              columnTemplate="minmax(0, 1.05fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.9fr)"
              columns={[
                { id: "record", label: "Record", render: (row) => <strong>{row.record}</strong>, sortValue: (row) => row.record },
                {
                  id: "domain",
                  label: "Domain",
                  render: (row) => <Badge tone={row.tone}>{row.domain}</Badge>,
                  sortValue: (row) => row.domain,
                  searchValue: (row) => row.domain
                },
                { id: "entity", label: "Entity", render: (row) => row.entity, sortValue: (row) => row.entity },
                {
                  id: "impact",
                  label: "Impact",
                  render: (row) => row.impact,
                  sortValue: (row) => row.impact,
                  searchValue: (row) => `${row.record} ${row.domain} ${row.entity} ${row.impact}`
                },
                {
                  id: "next",
                  label: "Next",
                  render: (row) => <span className="operate-next-step">{row.nextAction}</span>,
                  sortValue: (row) => row.nextAction
                }
              ]}
              emptyMessage="No orientation records are available."
              filterLabel="Domain"
              filterOptions={Array.from(new Set(orientationRows.map((row) => row.domain))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.domain}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedOrientationKey(row.key)}
              rows={orientationRows}
              searchPlaceholder="Search orientation records"
              selectedKey={selectedOrientation?.key ?? null}
            />
          </section>

          {selectedOrientation ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedOrientation.record}
                subtitle="Selection detail stays below the table so orientation scales without fragmenting the page."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">In Focus</p>
                  <strong>{selectedOrientation.entity}</strong>
                  <p>{selectedOrientation.detail}</p>
                </div>
                <Badge tone={selectedOrientation.tone}>{selectedOrientation.domain}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Primary Concern</span>
                  <strong>{selectedOrientation.record}</strong>
                  <p>{selectedOrientation.impact}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Next Move</span>
                  <strong>{selectedOrientation.nextAction}</strong>
                  <p>Use the selected row to move directly into the relevant engineering workspace.</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedOrientation.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedOrientation.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openOrientationPrimary(selectedOrientation)} type="button">
                  {selectedOrientation.key === "binding"
                    ? "Open Systems"
                    : selectedOrientation.key === "runtime"
                      ? "Open Listener"
                      : selectedOrientation.key === "continuation"
                        ? "Open Threads"
                      : "Open Approvals"}
                </button>
                {selectedCorrectiveApproval ? (
                  <button
                    className="starter-chip"
                    onClick={() => void openApprovalRequest(selectedCorrectiveApproval.requestId)}
                    type="button"
                  >
                    Review Approval
                  </button>
                ) : null}
                {selectedCorrectiveApproval
                && selectedCorrectiveApproval.state === "awaiting" ? (
                  <button
                    className="starter-chip"
                    disabled={isDecidingApproval}
                    onClick={() => submitApprovalDecisionForRequest(selectedCorrectiveApproval.requestId, "approve")}
                    type="button"
                  >
                    {isDecidingApproval ? "Submitting..." : "Approve Corrective Work"}
                  </button>
                ) : null}
                {selectedCorrectiveApproval
                && selectedCorrectiveApproval.state === "awaiting" ? (
                  <button
                    className="starter-chip"
                    disabled={isDecidingApproval}
                    onClick={() => submitApprovalDecisionForRequest(selectedCorrectiveApproval.requestId, "deny")}
                    type="button"
                  >
                    {isDecidingApproval ? "Submitting..." : "Deny Corrective Work"}
                  </button>
                ) : null}
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("symbols")} type="button">
                  Inspect In Browser
                </button>
                <button className="starter-chip" onClick={() => void navigateToEvidenceSection("artifacts")} type="button">
                  Open Evidence
                </button>
              </div>
            </section>
          ) : null}

        </>
      ) : null}

      {selectedSection === "journeys" ? (
        <>
          <section className="panel operate-parallel-panel">
            <PanelHeader
              title="Parallel Supervision"
              subtitle="Long-running and branching work should stay visible as coordinated continuations, not hidden inside secondary summaries."
            />
            <div className="signal-digest-grid operate-parallel-digest">
              <div className="signal-digest-card">
                <span className="context-label">Active Tasks</span>
                <strong>{parallelSnapshot.activeTasks}</strong>
                <p>{taskRows[0]?.title ?? "No active task branch is currently running."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Blocked Tasks</span>
                <strong>{parallelSnapshot.blockedTasks}</strong>
                <p>{taskRows.find((task) => task.state === "blocked")?.title ?? "No blocked branch is currently foregrounded."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Waiting Workers</span>
                <strong>{parallelSnapshot.waitingWorkers}</strong>
                <p>{workerRows.find((worker) => worker.state === "waiting")?.title ?? "No waiting worker is currently stalled."}</p>
              </div>
            </div>
            <div className="signal-digest-grid operate-parallel-digest">
              {operatePressureCards.map((card) => (
                <div className="signal-digest-card" key={card.key}>
                  <span className="context-label">{card.label}</span>
                  <strong>{card.value}</strong>
                  <p>{card.detail}</p>
                </div>
              ))}
            </div>
            <div className="operate-parallel-grid">
              <section className="parallel-lane">
                <div className="parallel-lane-header">
                  <div>
                    <p className="eyebrow">Task Branches</p>
                    <h4>Governed tasks in flight</h4>
                  </div>
                  <Badge tone={taskRows.some((task) => task.state === "blocked") ? "danger" : taskRows.some((task) => task.state === "active") ? "active" : "steady"}>
                    {`${taskRows.length} visible`}
                  </Badge>
                </div>
                <div className="parallel-card-list">
                  {taskRows.length > 0 ? (
                    taskRows.slice(0, 4).map((task) => (
                      <button className="parallel-card" key={task.key} onClick={() => void navigateToExecutionSection("work")} type="button">
                        <div className="parallel-card-top">
                          <strong>{task.title}</strong>
                          <Badge tone={task.tone}>{task.state}</Badge>
                        </div>
                        <p>{task.summary}</p>
                      </button>
                    ))
                  ) : (
                    <div className="parallel-card parallel-card-empty">
                      <strong>No governed task branches</strong>
                      <p>Tasks appear here when the environment exposes long-running work beyond the current turn.</p>
                    </div>
                  )}
                </div>
              </section>
              <section className="parallel-lane">
                <div className="parallel-lane-header">
                  <div>
                    <p className="eyebrow">Workers</p>
                    <h4>Actors carrying execution</h4>
                  </div>
                  <Badge tone={workerRows.some((worker) => worker.state === "active") ? "active" : "steady"}>
                    {`${workerRows.length} visible`}
                  </Badge>
                </div>
                <div className="parallel-card-list">
                  {workerRows.length > 0 ? (
                    workerRows.slice(0, 4).map((worker) => (
                      <button className="parallel-card" key={worker.key} onClick={() => void navigateToConversationSection("threads")} type="button">
                        <div className="parallel-card-top">
                          <strong>{worker.title}</strong>
                          <Badge tone={worker.tone}>{worker.state}</Badge>
                        </div>
                        <p>{worker.summary}</p>
                      </button>
                    ))
                  ) : (
                    <div className="parallel-card parallel-card-empty">
                      <strong>No active workers</strong>
                      <p>Worker posture appears here once execution is delegated across visible actors.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("work")} type="button">
                Open Work Queue
              </button>
              <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
                Resume Threads
              </button>
              <button className="starter-chip" onClick={() => void navigateToConversationSection("repl")} type="button">
                Open REPL
              </button>
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
                Open Listener
              </button>
            </div>
          </section>

          <section className="panel operate-table-panel">
            <PanelHeader
              title="Ranked Governed Queue"
              subtitle="This keeps one ordered list of concrete next moves inside Operate instead of duplicating them in a separate governance surface."
            />
            <BrowserDataTable
              key="operate-governed-queue"
              columnTemplate="minmax(0, 0.72fr) minmax(0, 0.75fr) minmax(0, 1.15fr) minmax(0, 1.45fr) minmax(0, 1fr) 44px"
              initialSortDirection="desc"
              columns={[
                {
                  id: "priority",
                  label: "Priority",
                  render: (row) => <PriorityStateChip label={row.priorityLabel} tone={row.tone} />,
                  sortValue: (row) => attentionToneWeight(row.tone)
                },
                {
                  id: "type",
                  label: "Type",
                  render: (row) => row.objectType,
                  sortValue: (row) => row.objectType,
                  searchValue: (row) => row.objectType
                },
                {
                  id: "title",
                  label: "Title",
                  render: (row) => <strong>{row.title}</strong>,
                  sortValue: (row) => row.title,
                  searchValue: (row) => `${row.title} ${row.whyNow} ${row.destinationLabel} ${row.references.join(" ")}`
                },
                {
                  id: "why",
                  label: "Why Now",
                  render: (row) => row.whyNow,
                  sortValue: (row) => row.whyNow,
                  searchValue: (row) => row.whyNow
                },
                {
                  id: "destination",
                  label: "Destination",
                  render: (row) => row.destinationLabel,
                  sortValue: (row) => row.destinationLabel
                },
                {
                  id: "open",
                  label: "",
                  render: (row) => (
                    <button
                      aria-label={row.actionLabel}
                      className="panel-titlebar-toggle table-row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        void navigateToActionQueueItem(row);
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
              emptyMessage="No governed queue items are currently active."
              filterLabel="Priority"
              filterOptions={[
                { label: "High", value: "High" },
                { label: "Medium", value: "Medium" },
                { label: "Low", value: "Low" }
              ]}
              getFilterValue={(row) => row.priorityLabel}
              getRowKey={(row) => row.key}
              onSelect={(row) => {
                if (row.objectType === "Approval") {
                  setSelectedJourneyKey("approval");
                  return;
                }
                if (row.objectType === "Recovery") {
                  setSelectedJourneyKey("incident");
                  return;
                }
                if (row.objectType === "Work") {
                  setSelectedJourneyKey("work");
                  return;
                }
                setSelectedJourneyKey(journeyRows[0]?.key ?? null);
              }}
              rows={governedQueueItems}
              searchPlaceholder="Search governed queue"
              selectedKey={null}
            />
          </section>

          <section className="panel operate-table-panel">
            <PanelHeader
              title="Journey Queue"
              subtitle="This queue should make the next supervised move obvious across work, approvals, and recovery."
            />
            <BrowserDataTable
              key="operate-journeys"
              columnTemplate="minmax(0, 1.25fr) minmax(0, 0.8fr) minmax(0, 0.75fr) minmax(0, 1.2fr) minmax(0, 0.95fr)"
              columns={[
                { id: "journey", label: "Journey", render: (row) => <strong>{row.title}</strong>, sortValue: (row) => row.title },
                {
                  id: "lane",
                  label: "Lane",
                  render: (row) => <Badge tone={row.tone}>{row.lane}</Badge>,
                  sortValue: (row) => row.lane,
                  searchValue: (row) => row.lane
                },
                {
                  id: "state",
                  label: "State",
                  render: (row) => <span className="operate-state">{row.state}</span>,
                  sortValue: (row) => row.state
                },
                { id: "dependency", label: "Dependency", render: (row) => row.dependency, sortValue: (row) => row.dependency },
                {
                  id: "next",
                  label: "Next",
                  render: (row) => <span className="operate-next-step">{row.nextStep}</span>,
                  sortValue: (row) => row.nextStep
                }
              ]}
              emptyMessage="No journeys are active."
              filterLabel="Lane"
              filterOptions={Array.from(new Set(journeyRows.map((row) => row.lane))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.lane}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedJourneyKey(row.key)}
              rows={journeyRows}
              searchPlaceholder="Search journeys"
              selectedKey={selectedJourney?.key ?? null}
            />
          </section>

          {selectedJourney ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedJourney.title}
                subtitle="Journey detail keeps dependency, proof burden, and launch target together."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">Dependency</p>
                  <strong>{selectedJourney.dependency}</strong>
                  <p>{selectedJourney.detail}</p>
                </div>
                <Badge tone={selectedJourney.tone}>{selectedJourney.state}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Lane</span>
                  <strong>{selectedJourney.lane}</strong>
                  <p>{selectedJourney.state}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Next Step</span>
                  <strong>{selectedJourney.nextStep}</strong>
                  <p>{selectedJourney.urgency === "high" || selectedJourney.urgency === "critical" ? "This continuation is carrying elevated pressure." : "This continuation can be resumed without emergency posture."}</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedJourneyIdentityRows.map(([label, value]) => (
                  <DetailRow key={`${selectedJourney.key}:identity:${label}`} label={label} value={value} />
                ))}
              </dl>
              <dl className="detail-list">
                {selectedJourney.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedJourney.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openJourneyPrimary(selectedJourney)} type="button">
                  {selectedJourney.lane === "work"
                    ? "Open Work"
                    : selectedJourney.lane === "approval"
                      ? "Open Approvals"
                      : "Open Recovery"}
                </button>
                <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
                  Resume In Conversations
                </button>
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("governance")} type="button">
                  Inspect Context
                </button>
              </div>
            </section>
          ) : null}

          <SupervisionBoard
            lanes={[
              {
                id: "foreground",
                label: "Foreground",
                summary: "Work that should dominate the next operator move.",
                tone: supervisionLanes.foreground.length > 0 ? "danger" : "steady",
                rows: supervisionLanes.foreground
              },
              {
                id: "active",
                label: "Advancing",
                summary: "Continuations that are active but not currently blocking trust.",
                tone: supervisionLanes.active.length > 0 ? "active" : "steady",
                rows: supervisionLanes.active
              },
              {
                id: "background",
                label: "Background",
                summary: "Visible but non-dominant continuations that should not disappear.",
                tone: supervisionLanes.background.length > 0 ? "warning" : "steady",
                rows: supervisionLanes.background
              }
            ]}
            onOpenJourney={(key) => setSelectedJourneyKey(key)}
            onPrimaryAction={openJourneyPrimary}
          />

        </>
      ) : null}

      {selectedSection === "evidence" ? (
        <>
          <section className="panel operate-table-panel">
            <PanelHeader
              title="Evidence Table"
              subtitle="Recent durable artifacts remain explicit engineering objects with provenance, scope, and closure consequence."
            />
            <BrowserDataTable
              key="operate-evidence"
              columnTemplate="minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 0.9fr) minmax(0, 1.45fr)"
              columns={[
                { id: "artifact", label: "Artifact", render: (row) => <strong>{row.artifact}</strong>, sortValue: (row) => row.artifact },
                {
                  id: "type",
                  label: "Type",
                  render: (row) => <Badge tone={row.tone}>{row.type}</Badge>,
                  sortValue: (row) => row.type,
                  searchValue: (row) => row.type
                },
                { id: "updated", label: "Updated", render: (row) => row.updatedAt, sortValue: (row) => row.updatedAt },
                {
                  id: "summary",
                  label: "Summary",
                  render: (row) => row.summary,
                  sortValue: (row) => row.summary,
                  searchValue: (row) => `${row.artifact} ${row.type} ${row.summary}`
                }
              ]}
              emptyMessage="No evidence artifacts are available."
              filterLabel="Impact"
              filterOptions={Array.from(new Set(evidenceRows.map((row) => row.impact))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.impact}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedEvidenceKey(row.key)}
              rows={evidenceRows}
              searchPlaceholder="Search evidence"
              selectedKey={selectedEvidence?.key ?? null}
            />
          </section>

          {selectedEvidence ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedEvidence.artifact}
                subtitle="Evidence detail should keep artifact posture, linkage, and next validation move on one surface."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">Artifact Summary</p>
                  <strong>{selectedEvidence.type}</strong>
                  <p>{selectedEvidence.summary}</p>
                </div>
                <Badge tone={selectedEvidence.tone}>{selectedEvidence.impact}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Evidence Domain</span>
                  <strong>{selectedEvidence.impact}</strong>
                  <p>{selectedEvidence.type}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Closure Hint</span>
                  <strong>{selectedEvidence.impact === "recovery" ? "Review Before Closure" : "Validate And Attach"}</strong>
                  <p>{selectedEvidence.summary}</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedEvidenceIdentityRows.map(([label, value]) => (
                  <DetailRow key={`${selectedEvidence.key}:identity:${label}`} label={label} value={value} />
                ))}
              </dl>
              <dl className="detail-list">
                {selectedEvidence.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedEvidence.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openEvidencePrimary()} type="button">
                  Open Artifacts
                </button>
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("source")} type="button">
                  Inspect Related Source
                </button>
                <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
                  Validate In Listener
                </button>
              </div>
            </section>
          ) : null}

        </>
      ) : null}
    </div>
  );
}
