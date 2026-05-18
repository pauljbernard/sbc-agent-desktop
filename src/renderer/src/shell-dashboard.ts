import type {
  DesktopTaskRecordDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  IncidentSummaryDto,
  RuntimeSummaryDto,
  ThreadSummaryDto,
  WorkItemSummaryDto,
  WorkspaceId,
  ApprovalRequestSummaryDto
} from "../../shared/contracts";
import type {
  ActionQueueItem,
  GlobalAttentionItem
} from "./shell-attention";
import {
  approvalRecommendationScore,
  artifactRecommendationScore,
  attentionToneWeight,
  compressActionQueue,
  primaryThreadRecommendationReason,
  priorityLabelForTone,
  signalCountsFromItems,
  signalCountsForWorkspace,
  signalPriorityForTone,
  threadRecommendationScore,
  toneForApprovalState,
  toneForIncidentSeverity,
  toneForThreadState,
  toneForWorkState,
  workItemRecommendationScore,
  incidentRecommendationScore
} from "./shell-attention";
import { canonicalWorkspace, topLevelJourneyWorkspace, workspaceOrder } from "./workspace-shell";
import type { SignalCounts } from "./interaction-support";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstDashboardString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

export function buildDashboardActionQueue(input: {
  desktopTaskRecords: DesktopTaskRecordDto[];
  orchestrationInbox: Record<string, unknown>[];
  prioritizedApprovalRequests: ApprovalRequestSummaryDto[];
  prioritizedIncidents: IncidentSummaryDto[];
  prioritizedThreads: ThreadSummaryDto[];
  prioritizedWorkItems: WorkItemSummaryDto[];
  queueArtifacts: Array<{ artifactId: string; title: string; updatedAt?: string | null; kind: string }>;
  runtimeSummary: RuntimeSummaryDto | null;
  status: EnvironmentStatusDto | null;
}): ActionQueueItem[] {
  const {
    desktopTaskRecords,
    orchestrationInbox,
    prioritizedApprovalRequests,
    prioritizedIncidents,
    prioritizedThreads,
    prioritizedWorkItems,
    queueArtifacts,
    runtimeSummary,
    status
  } = input;
  const orchestrationApprovalById = new Map(
    orchestrationInbox
      .map((entry) => {
        const record = asRecord(entry);
        const approvalId = firstDashboardString(record.approvalId, asRecord(record.approvalSummary).approvalId);
        return approvalId ? [approvalId, record] : null;
      })
      .filter((entry): entry is [string, Record<string, unknown>] => Array.isArray(entry))
  );

  const items: ActionQueueItem[] = [];
  const hasAwaitingApprovals = prioritizedApprovalRequests.some((item) => item.state === "awaiting");
  const hasOpenIncidents = prioritizedIncidents.some((item) => item.state === "open");
  const highPressurePresent =
    status?.runtimeState === "recovering" ||
    hasAwaitingApprovals ||
    hasOpenIncidents ||
    prioritizedWorkItems.some((item) => item.state === "blocked" || item.state === "quarantined");

  if (status?.runtimeState === "recovering") {
    items.push({
      key: "runtime:recovering",
      objectType: "Runtime",
      objectId: runtimeSummary?.runtimeId ?? "runtime",
      title: "Recover runtime listener posture",
      timestamp: status.lastUpdatedAt,
      stateLabel: status.runtimeState,
      whyNow: "The runtime is recovering and should be stabilized before normal mutation continues.",
      effectSummary:
        "Opening the listener lets you inspect runtime state, divergence posture, and pending mutation pressure.",
      references: [runtimeSummary?.currentPackage ?? "runtime", status.workflowState],
      tone: "danger",
      score: 145,
      priorityLabel: "High",
      destinationWorkspace: "runtime",
      destinationLabel: "Browser > Runtime > Listener",
      actionLabel: "Open listener",
      rankReason: "The runtime itself is unstable, so it outranks downstream work."
    });
  }

  for (const approval of prioritizedApprovalRequests
    .filter((item) => item.state === "awaiting" || item.state === "denied")
    .slice(0, 4)) {
    const tone = toneForApprovalState(approval.state);
    const orchestrationEntry = orchestrationApprovalById.get(approval.requestId);
    items.push({
      key: `approval:${approval.requestId}`,
      objectType: "Approval",
      objectId: approval.requestId,
      title: firstDashboardString(orchestrationEntry?.goal, approval.title) ?? approval.title,
      timestamp: approval.createdAt,
      stateLabel: approval.state,
      whyNow:
        approval.state === "awaiting"
          ? firstDashboardString(
              orchestrationEntry?.primaryCommandDescription,
              "Execution is paused until this approval is explicitly decided."
            ) ?? "Execution is paused until this approval is explicitly decided."
          : "This approval was denied and may require a redirected execution path.",
      effectSummary:
        approval.state === "awaiting"
          ? "Opening this approval lets you review the governed request and either unblock or deny the action."
          : "Opening this approval lets you review the denial context and decide how work should be redirected.",
      references: [approval.requestId, approval.summary],
      tone,
      score: approvalRecommendationScore(approval),
      priorityLabel: priorityLabelForTone(tone),
      destinationWorkspace: "runtime",
      destinationLabel: "Actions > Actions Board",
      actionLabel:
        approval.state === "awaiting"
          ? firstDashboardString(
              orchestrationEntry?.primaryCommandLabel,
              asRecord(orchestrationEntry?.primaryCommand).label,
              "Review approval"
            ) ?? "Review approval"
          : "Inspect denial",
      rankReason:
        approval.state === "awaiting"
          ? "Approvals are canonical blocking objects, so they outrank conversation symptoms of the same wait."
          : "A denied approval changes the execution path and should be clarified before adjacent work continues."
    });
  }

  for (const incident of prioritizedIncidents.filter((item) => item.state !== "resolved").slice(0, 4)) {
    const tone = toneForIncidentSeverity(incident.severity);
    items.push({
      key: `incident:${incident.incidentId}`,
      objectType: "Recovery",
      objectId: incident.incidentId,
      title: incident.title,
      timestamp: incident.updatedAt,
      stateLabel: incident.state,
      whyNow:
        incident.state === "open"
          ? "This incident is still open and is part of the dominant recovery pressure."
          : "Recovery is active and still needs supervision before execution fully resumes.",
      effectSummary:
        "Opening this recovery record lets you inspect incident state, evidence, and next recovery context.",
      references: [incident.severity, incident.incidentId],
      tone,
      score: incidentRecommendationScore(incident),
      priorityLabel: priorityLabelForTone(tone),
      destinationWorkspace: "incidents",
      destinationLabel: "Actions > Actions Board",
      actionLabel: "Open recovery",
      rankReason:
        incident.state === "open"
          ? "Open incidents are the canonical recovery objects and outrank affected work that merely reflects the same failure."
          : "Active recovery remains higher priority than secondary execution cleanup."
    });
  }

  for (const workItem of prioritizedWorkItems
    .filter((item) => {
      const actionable =
        item.state === "blocked" ||
        item.state === "quarantined" ||
        item.state === "waiting" ||
        item.validationBurden === "pending" ||
        item.reconciliationBurden === "required";
      if (!actionable) {
        return false;
      }
      if (
        (item.state === "blocked" || item.state === "quarantined" || item.state === "waiting") &&
        item.incidentCount > 0 &&
        hasOpenIncidents
      ) {
        return false;
      }
      return true;
    })
    .slice(0, 6)) {
    const tone = toneForWorkState(workItem.state);
    const normalizedScore = Math.max(
      20,
      workItemRecommendationScore(workItem) -
        (workItem.state === "waiting" && hasAwaitingApprovals ? 20 : 0) -
        ((workItem.state === "blocked" || workItem.state === "quarantined") &&
        workItem.incidentCount > 0 &&
        hasOpenIncidents
          ? 18
          : 0)
    );
    items.push({
      key: `work:${workItem.workItemId}`,
      objectType: "Work",
      objectId: workItem.workItemId,
      title: workItem.title,
      timestamp: workItem.updatedAt,
      stateLabel: workItem.state,
      whyNow:
        workItem.waitingReason ??
        (workItem.validationBurden === "pending"
          ? "Validation is still pending for this work item."
          : workItem.reconciliationBurden === "required"
            ? "Reconciliation is still required for this work item."
            : "This work item remains a governed execution obligation."),
      effectSummary:
        "Opening this work item shows its workflow record, blocking context, and closure obligations.",
      references: [
        workItem.workItemId,
        `${workItem.approvalCount} approvals`,
        `${workItem.incidentCount} incidents`,
        `${workItem.artifactCount} artifacts`
      ],
      tone,
      score: normalizedScore,
      priorityLabel: priorityLabelForTone(tone),
      destinationWorkspace: "runtime",
      destinationLabel: "Actions > Actions Board",
      actionLabel: "Open work item",
      rankReason:
        workItem.state === "waiting" && hasAwaitingApprovals
          ? "This work item is still important, but the approval causing the wait is the more direct object to act on first."
          : (workItem.state === "blocked" || workItem.state === "quarantined") &&
              workItem.incidentCount > 0 &&
              hasOpenIncidents
            ? "This work item reflects recovery pressure, but the incident itself is the more direct recovery target."
            : "This work item is the canonical governed execution obligation."
    });
  }

  for (const taskRecord of desktopTaskRecords
    .filter(
      (record) =>
        record.status === "awaiting-approval" ||
        record.status === "retryable-failure" ||
        record.status === "retrying" ||
        record.status === "failed"
    )
    .slice(0, 6)) {
    const tone =
      taskRecord.status === "failed" || taskRecord.status === "retryable-failure"
        ? "danger"
        : "warning";
    items.push({
      key: `task:${taskRecord.id}`,
      objectType: "Task",
      objectId: taskRecord.id,
      title: `${taskRecord.target} / ${taskRecord.operation}`,
      timestamp: taskRecord.completedAt ?? taskRecord.startedAt ?? taskRecord.createdAt,
      stateLabel: taskRecord.status,
      whyNow:
        taskRecord.approvalStatus === "awaiting-approval"
          ? "A governed task is staged and waiting for approval before execution can continue."
          : taskRecord.status === "retryable-failure"
            ? "A governed task failed in a retryable way and may need operator attention before replay."
            : taskRecord.status === "retrying"
              ? "A governed task is actively retrying under protocol retry policy."
              : "A governed task failed and should be inspected directly in the governed task ledger.",
      effectSummary:
        "Opening governance lets you inspect the task record, its approval posture, retry state, and recorded result or error.",
      references: [
        taskRecord.id,
        taskRecord.capability ?? "capability-unspecified",
        taskRecord.approvalStatus ?? "approval-unspecified"
      ],
      tone,
      score:
        taskRecord.approvalStatus === "awaiting-approval"
          ? 118
          : taskRecord.status === "retrying"
            ? 92
            : 104,
      priorityLabel: priorityLabelForTone(tone),
      destinationWorkspace: "browser",
      destinationLabel: "Browser > Governance",
      actionLabel: "Open governed task",
      rankReason:
        "Governed task records are now first-class operator objects, not only indirect consequences of approvals or work items."
    });
  }

  for (const thread of prioritizedThreads
    .filter(
      (item) =>
        item.state === "blocked" ||
        item.state === "waiting" ||
        item.latestTurnState === "awaiting_approval" ||
        item.latestTurnState === "interrupted" ||
        item.latestTurnState === "failed"
    )
    .slice(0, 6)) {
    const tone =
      thread.latestTurnState === "failed"
        ? "danger"
        : thread.latestTurnState === "awaiting_approval" ||
            thread.latestTurnState === "interrupted"
          ? "warning"
          : toneForThreadState(thread.state);
    const normalizedScore = Math.max(
      15,
      threadRecommendationScore(thread) -
        (thread.latestTurnState === "awaiting_approval" && hasAwaitingApprovals ? 26 : 0) -
        ((thread.latestTurnState === "failed" || thread.latestTurnState === "interrupted") &&
        hasOpenIncidents
          ? 10
          : 0)
    );
    items.push({
      key: `thread:${thread.threadId}`,
      objectType: "Thread",
      objectId: thread.threadId,
      title: thread.title,
      timestamp: thread.latestActivityAt,
      stateLabel: thread.latestTurnState,
      whyNow: primaryThreadRecommendationReason(thread),
      effectSummary:
        "Opening this thread lets you resume the governed conversation in its exact retained context.",
      references: [thread.threadId, thread.state, ...thread.attentionFlags.slice(0, 2)],
      tone,
      score: normalizedScore,
      priorityLabel: priorityLabelForTone(tone),
      destinationWorkspace: "conversations",
      destinationLabel: "Conversations > Threads",
      actionLabel: "Resume thread",
      rankReason:
        thread.latestTurnState === "awaiting_approval" && hasAwaitingApprovals
          ? "The thread matters, but the approval record is the more direct object to act on first."
          : thread.latestTurnState === "failed" || thread.latestTurnState === "interrupted"
            ? "This thread remains an important conversational recovery surface."
            : "This thread is the strongest retained conversation context for continued work."
    });
  }

  if (!highPressurePresent) {
    for (const artifact of queueArtifacts.slice(0, 2)) {
      items.push({
        key: `artifact:${artifact.artifactId}`,
        objectType: "Artifact",
        objectId: artifact.artifactId,
        title: artifact.title,
        timestamp: artifact.updatedAt,
        stateLabel: artifact.kind,
        whyNow:
          "Recent evidence should remain directly reviewable while the environment is under active governance.",
        effectSummary:
          "Opening this artifact lets you inspect provenance, observations, and producing context.",
        references: [artifact.artifactId, artifact.updatedAt ?? null].filter(Boolean) as string[],
        tone: "active",
        score: artifactRecommendationScore(artifact),
        priorityLabel: "Low",
        destinationWorkspace: "artifacts",
        destinationLabel: "Actions > Actions Board",
        actionLabel: "Review artifact",
        rankReason:
          "Artifacts are included when the queue is otherwise calm so durable evidence remains reviewable."
      });
    }
  }

  return compressActionQueue(
    items.sort(
      (left, right) =>
        right.score - left.score || attentionToneWeight(right.tone) - attentionToneWeight(left.tone)
    )
  ).slice(0, 24);
}

export function buildGlobalAttentionItems(input: {
  desktopTaskActorSystemPanel: unknown;
  status: EnvironmentStatusDto | null;
  summary: EnvironmentSummaryDto | null;
}): GlobalAttentionItem[] {
  const { desktopTaskActorSystemPanel, status, summary } = input;
  if (!summary || !status) {
    return [];
  }

  const actorSystemPanel = asRecord(desktopTaskActorSystemPanel);
  const supervisionIncidents = asRecord(actorSystemPanel.supervisionIncidents);
  const actorSystemOpenIncidents =
    typeof supervisionIncidents.incidentCount === "number"
      ? supervisionIncidents.incidentCount
      : Array.isArray(supervisionIncidents.incidents)
        ? supervisionIncidents.incidents.length
        : 0;

  const items: GlobalAttentionItem[] = [
    {
      id: "approvals-awaiting",
      label: "Approvals Awaiting",
      summary: "Governed actions are paused until explicit approval decisions are made.",
      value: summary.attention.approvalsAwaiting,
      workspace: "runtime",
      tone: summary.attention.approvalsAwaiting > 0 ? "warning" : "steady"
    },
    {
      id: "open-incidents",
      label: "Open Incidents",
      summary: "Failure and recovery obligations are active and remain durable operator work.",
      value: summary.attention.openIncidents,
      workspace: "incidents",
      tone: summary.attention.openIncidents > 0 ? "danger" : "steady"
    },
    {
      id: "blocked-work",
      label: "Blocked Work",
      summary:
        "Execution success is not enough; blocked workflow obligations still prevent closure.",
      value: summary.attention.blockedWork,
      workspace: "runtime",
      tone: summary.attention.blockedWork > 0 ? "warning" : "steady"
    },
    {
      id: "interrupted-turns",
      label: "Interrupted Turns",
      summary:
        "Structured conversation state contains interrupted or deferred turns that still matter.",
      value: summary.attention.interruptedTurns,
      workspace: "conversations",
      tone: summary.attention.interruptedTurns > 0 ? "warning" : "steady"
    },
    {
      id: "active-streams",
      label: "Active Streams",
      summary:
        "Replayable event evidence should remain legible across the environment, not buried in logs.",
      value: summary.attention.activeStreams,
      workspace: "artifacts",
      tone: summary.attention.activeStreams > 0 ? "active" : "steady"
    },
    {
      id: "runtime-posture",
      label: "Runtime Posture",
      summary:
        status.runtimeState === "recovering"
          ? "The runtime is recovering and needs direct attention before normal mutation resumes."
          : "The runtime is warm, but its current state still needs to remain governed and inspectable.",
      value: status.runtimeState === "recovering" ? 1 : 0,
      workspace: "runtime",
      tone: status.runtimeState === "recovering" ? "danger" : "active"
    },
    {
      id: "artifact-surface",
      label: "Artifact Surface",
      summary:
        "Recent durable outputs and evidence remain available as first-class engineering objects.",
      value: summary.recentArtifacts.length,
      workspace: "artifacts",
      tone: summary.recentArtifacts.length > 0 ? "active" : "steady"
    },
    {
      id: "actor-system",
      label: "Actor System",
      summary:
        actorSystemOpenIncidents > 0
          ? "Actor supervision incidents are open and should be inspected through hierarchy and workflow state."
          : "Actor hierarchy, workflow edges, and mailbox state are available for direct inspection.",
      value: actorSystemOpenIncidents,
      workspace: "runtime",
      tone: actorSystemOpenIncidents > 0 ? "danger" : "active"
    }
  ];

  return items.sort(
    (left, right) =>
      attentionToneWeight(right.tone) - attentionToneWeight(left.tone) || right.value - left.value
  );
}

export function buildWorkspaceAttentionMap(
  globalAttentionItems: GlobalAttentionItem[]
): Map<WorkspaceId, SignalCounts> {
  const base = new Map<WorkspaceId, SignalCounts>();

  for (const workspace of workspaceOrder.filter((item) => item.primary)) {
    base.set(workspace.id, { red: 0, yellow: 0, blue: 0 });
  }

  for (const item of globalAttentionItems) {
    const journeyWorkspace = topLevelJourneyWorkspace(canonicalWorkspace(item.workspace));
    const current = base.get(journeyWorkspace);
    const priority = signalPriorityForTone(item.tone);
    if (!current || !priority || item.value <= 0) {
      continue;
    }
    current[priority] += item.value;
  }

  return base;
}

export function buildPageSignalCounts(
  activeWorkspace: WorkspaceId,
  globalAttentionItems: GlobalAttentionItem[]
): SignalCounts {
  return signalCountsForWorkspace(activeWorkspace, globalAttentionItems);
}

export function buildOperateSectionSignals(globalAttentionItems: GlobalAttentionItem[]) {
  return new Map([
    [
      "orientation",
      signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "runtime-posture"))
    ],
    [
      "journeys",
      signalCountsFromItems(
        globalAttentionItems.filter((item) =>
          ["approvals-awaiting", "open-incidents", "blocked-work", "interrupted-turns"].includes(
            item.id
          )
        )
      )
    ],
    [
      "evidence",
      signalCountsFromItems(
        globalAttentionItems.filter((item) => ["active-streams", "artifact-surface"].includes(item.id))
      )
    ]
  ]);
}

export function buildExecutionSectionSignals(globalAttentionItems: GlobalAttentionItem[]) {
  return new Map([
    [
      "listener",
      signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "runtime-posture"))
    ],
    [
      "work",
      signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "blocked-work"))
    ]
  ]);
}

export function buildRecoverySectionSignals(globalAttentionItems: GlobalAttentionItem[]) {
  return new Map([
    [
      "incidents",
      signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "open-incidents"))
    ]
  ]);
}

export function buildEvidenceSectionSignals(globalAttentionItems: GlobalAttentionItem[]) {
  return new Map([
    [
      "artifacts",
      signalCountsFromItems(
        globalAttentionItems.filter(
          (item) => item.id === "artifact-surface" || item.id === "active-streams"
        )
      )
    ]
  ]);
}
