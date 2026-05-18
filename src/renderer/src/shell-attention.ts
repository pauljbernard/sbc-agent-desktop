import type {
  ApprovalDecisionDto,
  ApprovalRequestSummaryDto,
  ArtifactSummaryDto,
  IncidentSummaryDto,
  ThreadSummaryDto,
  TurnDetailDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import type { SignalCounts, SignalPriority } from "./interaction-support";
import { canonicalWorkspace } from "./workspace-shell";

export type AttentionTone = "active" | "warning" | "danger" | "steady";

export interface GlobalAttentionItem {
  id: string;
  label: string;
  summary: string;
  value: number;
  workspace: WorkspaceId;
  tone: AttentionTone;
}

export interface ActionQueueItem {
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

export function threadRecommendationScore(thread: ThreadSummaryDto): number {
  let score = 0;
  switch (thread.state) {
    case "blocked":
      score += 120;
      break;
    case "waiting":
      score += 90;
      break;
    case "active":
      score += 35;
      break;
    default:
      score += 10;
  }

  switch (thread.latestTurnState) {
    case "failed":
      score += 120;
      break;
    case "interrupted":
      score += 95;
      break;
    case "awaiting_approval":
      score += 90;
      break;
    case "running":
      score += 40;
      break;
    case "completed":
      score += 15;
      break;
    default:
      score += 5;
  }

  score += thread.attentionFlags.length * 8;
  return score;
}

export function primaryThreadRecommendationReason(thread: ThreadSummaryDto): string {
  if (thread.latestTurnState === "failed") {
    return "This thread contains a failed turn that still needs follow-through.";
  }
  if (thread.latestTurnState === "interrupted") {
    return "This thread was interrupted and is the best conversation to resume.";
  }
  if (thread.latestTurnState === "awaiting_approval") {
    return "This thread is paused on approval and remains operationally relevant.";
  }
  if (thread.state === "blocked" || thread.state === "waiting") {
    return "This thread is carrying unresolved governed work.";
  }
  return "This is the strongest current conversation context for continued work.";
}

export function workItemRecommendationScore(workItem: WorkItemSummaryDto): number {
  let score = 0;
  switch (workItem.state) {
    case "blocked":
      score += 125;
      break;
    case "quarantined":
      score += 120;
      break;
    case "waiting":
      score += 90;
      break;
    case "active":
      score += 55;
      break;
    case "closable":
      score += 30;
      break;
    default:
      score += 10;
  }

  score += workItem.approvalCount * 8;
  score += workItem.incidentCount * 12;
  score += workItem.validationBurden === "pending" ? 12 : 0;
  score += workItem.reconciliationBurden === "required" ? 14 : 0;
  return score;
}

export function primaryWorkRecommendationReason(workItem: WorkItemSummaryDto): string {
  if (workItem.state === "blocked" || workItem.state === "quarantined") {
    return "This work item is preventing trustworthy continuation.";
  }
  if (workItem.state === "waiting") {
    return "This work item is paused and likely needs operator attention.";
  }
  if (workItem.validationBurden === "pending" || workItem.reconciliationBurden === "required") {
    return "This work item still carries closure obligations.";
  }
  return "This is the most relevant governed execution item.";
}

export function approvalRecommendationScore(approval: ApprovalRequestSummaryDto): number {
  switch (approval.state) {
    case "awaiting":
      return 130;
    case "denied":
      return 85;
    case "approved":
      return 20;
    default:
      return 0;
  }
}

export function primaryApprovalRecommendationReason(approval: ApprovalRequestSummaryDto): string {
  if (approval.state === "awaiting") {
    return "This approval is actively blocking governed execution.";
  }
  if (approval.state === "denied") {
    return "This approval was denied and may require redirection.";
  }
  return "This is the most relevant recent approval decision.";
}

export function incidentRecommendationScore(incident: IncidentSummaryDto): number {
  let score = 0;
  switch (incident.severity) {
    case "critical":
      score += 140;
      break;
    case "high":
      score += 115;
      break;
    case "moderate":
      score += 80;
      break;
    case "low":
      score += 35;
      break;
    default:
      score += 10;
  }

  switch (incident.state) {
    case "open":
      score += 35;
      break;
    case "recovering":
      score += 20;
      break;
    case "resolved":
      score += 0;
      break;
    default:
      score += 0;
  }

  return score;
}

export function primaryIncidentRecommendationReason(incident: IncidentSummaryDto): string {
  if (incident.state === "open") {
    return "This incident remains open and dominates recovery attention.";
  }
  if (incident.state === "recovering") {
    return "This incident is still in active recovery.";
  }
  return "This is the most relevant retained recovery record.";
}

export function artifactRecommendationScore(
  _artifact: Pick<ArtifactSummaryDto, "artifactId"> | { artifactId: string }
): number {
  return 15;
}

export function compressActionQueue(items: ActionQueueItem[]): ActionQueueItem[] {
  const normalizedTitles = new Set<string>();
  const perTypeCounts = new Map<ActionQueueItem["objectType"], number>();
  const limits: Record<ActionQueueItem["objectType"], number> = {
    Runtime: 1,
    Approval: 3,
    Recovery: 3,
    Work: 4,
    Task: 3,
    Thread: 4,
    Artifact: 2
  };

  return items.filter((item) => {
    const titleKey = item.title.trim().toLowerCase();
    if (normalizedTitles.has(titleKey)) {
      return false;
    }

    const count = perTypeCounts.get(item.objectType) ?? 0;
    if (count >= limits[item.objectType]) {
      return false;
    }

    normalizedTitles.add(titleKey);
    perTypeCounts.set(item.objectType, count + 1);
    return true;
  });
}

export function signalPriorityForTone(tone: AttentionTone): SignalPriority | null {
  switch (tone) {
    case "danger":
      return "red";
    case "warning":
      return "yellow";
    case "active":
      return "blue";
    default:
      return null;
  }
}

export function priorityLabelForTone(tone: AttentionTone): "High" | "Medium" | "Low" {
  switch (tone) {
    case "danger":
      return "High";
    case "warning":
      return "Medium";
    default:
      return "Low";
  }
}

export function signalCountsForWorkspace(
  workspaceId: WorkspaceId,
  items: GlobalAttentionItem[]
): SignalCounts {
  const targetWorkspace = canonicalWorkspace(workspaceId);
  const counts: SignalCounts = { red: 0, yellow: 0, blue: 0 };

  for (const item of items) {
    const priority = signalPriorityForTone(item.tone);
    if (!priority || item.value <= 0) {
      continue;
    }

    const itemWorkspace = canonicalWorkspace(item.workspace);
    const matches = targetWorkspace === "environment" ? true : itemWorkspace === targetWorkspace;

    if (matches) {
      counts[priority] += item.value;
    }
  }

  return counts;
}

export function signalCountsFromItems(items: GlobalAttentionItem[]): SignalCounts {
  const counts: SignalCounts = { red: 0, yellow: 0, blue: 0 };

  for (const item of items) {
    const priority = signalPriorityForTone(item.tone);
    if (!priority || item.value <= 0) {
      continue;
    }
    counts[priority] += item.value;
  }

  return counts;
}

export function toneForThreadState(state: ThreadSummaryDto["state"]): AttentionTone {
  switch (state) {
    case "active":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
      return "danger";
    default:
      return "steady";
  }
}

export function toneForTurnState(state: TurnDetailDto["state"]): AttentionTone {
  switch (state) {
    case "running":
    case "completed":
      return "active";
    case "awaiting_approval":
    case "interrupted":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "steady";
  }
}

export function toneForApprovalState(state: ApprovalRequestSummaryDto["state"]): AttentionTone {
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

export function toneForApprovalDecision(decision: ApprovalDecisionDto["decision"]): AttentionTone {
  switch (decision) {
    case "approved":
      return "active";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

export function toneForIncidentSeverity(severity: IncidentSummaryDto["severity"]): AttentionTone {
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

export function toneForWorkState(state: WorkItemSummaryDto["state"]): AttentionTone {
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

export function attentionToneWeight(tone: AttentionTone): number {
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
