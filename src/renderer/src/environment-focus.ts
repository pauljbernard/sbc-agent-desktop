import type { WorkspaceId } from "../../shared/contracts";
import type { RuntimeInspectionMode } from "../../shared/contracts";

export type EnvironmentFocusKind =
  | "none"
  | "runtime-symbol"
  | "runtime-scope"
  | "source-artifact"
  | "linked-conversation"
  | "conversation-thread"
  | "conversation-turn"
  | "governance-approval"
  | "governance-work-item"
  | "governance-incident"
  | "evidence-artifact"
  | "evidence-event";

export type EnvironmentFocusSourceSurface =
  | "browser"
  | "conversations"
  | "operate"
  | "runtime"
  | "workspace"
  | "editor"
  | "transcript"
  | "incidents"
  | "artifacts"
  | "approvals";

export interface EnvironmentFocusState {
  kind: EnvironmentFocusKind;
  sourceWorkspace: WorkspaceId;
  sourceSurface: EnvironmentFocusSourceSurface;

  runtimeSymbol: string | null;
  runtimePackage: string | null;
  runtimeInspectionMode: RuntimeInspectionMode | null;

  sourcePath: string | null;
  sourceLine: number | null;

  threadId: string | null;
  turnId: string | null;

  approvalId: string | null;
  workItemId: string | null;
  incidentId: string | null;
  artifactId: string | null;
  eventCursor: number | null;
}

export interface BrowserFocusContextInput {
  sourceWorkspace: WorkspaceId;
  runtimeSymbol?: string | null;
  runtimePackage?: string | null;
  runtimeInspectionMode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  sourceLine?: number | null;
  linkedThreadId?: string | null;
}

export interface ConversationFocusContextInput {
  sourceWorkspace: WorkspaceId;
  threadId?: string | null;
  turnId?: string | null;
}

export interface GovernanceFocusContextInput {
  sourceWorkspace: WorkspaceId;
  approvalId?: string | null;
  workItemId?: string | null;
  incidentId?: string | null;
}

export interface EvidenceFocusContextInput {
  sourceWorkspace: WorkspaceId;
  artifactId?: string | null;
  eventCursor?: number | null;
}

export function createDefaultEnvironmentFocusState(): EnvironmentFocusState {
  return {
    kind: "none",
    sourceWorkspace: "environment",
    sourceSurface: "operate",
    runtimeSymbol: null,
    runtimePackage: null,
    runtimeInspectionMode: null,
    sourcePath: null,
    sourceLine: null,
    threadId: null,
    turnId: null,
    approvalId: null,
    workItemId: null,
    incidentId: null,
    artifactId: null,
    eventCursor: null
  };
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeLine(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function environmentFocusPriority(kind: EnvironmentFocusKind): number {
  switch (kind) {
    case "conversation-turn":
      return 6;
    case "conversation-thread":
      return 5;
    case "runtime-symbol":
      return 4;
    case "source-artifact":
      return 3;
    case "linked-conversation":
      return 2;
    case "runtime-scope":
    case "governance-approval":
    case "governance-work-item":
    case "governance-incident":
    case "evidence-artifact":
    case "evidence-event":
      return 1;
    case "none":
    default:
      return 0;
  }
}

export function createEnvironmentFocusFromBrowserContext(
  input: BrowserFocusContextInput
): EnvironmentFocusState {
  const runtimeSymbol = normalizeText(input.runtimeSymbol);
  const runtimePackage = normalizeText(input.runtimePackage);
  const sourcePath = normalizeText(input.sourcePath);
  const linkedThreadId = normalizeText(input.linkedThreadId);

  if (runtimeSymbol) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "runtime-symbol",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "browser",
      runtimeSymbol,
      runtimePackage,
      runtimeInspectionMode: input.runtimeInspectionMode ?? null,
      sourcePath,
      sourceLine: normalizeLine(input.sourceLine),
      threadId: linkedThreadId
    };
  }

  if (sourcePath) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "source-artifact",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "browser",
      runtimePackage,
      runtimeInspectionMode: input.runtimeInspectionMode ?? null,
      sourcePath,
      sourceLine: normalizeLine(input.sourceLine),
      threadId: linkedThreadId
    };
  }

  if (linkedThreadId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "linked-conversation",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "browser",
      threadId: linkedThreadId
    };
  }

  return {
    ...createDefaultEnvironmentFocusState(),
    sourceWorkspace: input.sourceWorkspace,
    sourceSurface: "browser"
  };
}

export function createEnvironmentFocusFromConversationContext(
  input: ConversationFocusContextInput
): EnvironmentFocusState {
  const threadId = normalizeText(input.threadId);
  const turnId = normalizeText(input.turnId);

  if (turnId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "conversation-turn",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "conversations",
      threadId,
      turnId
    };
  }

  if (threadId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "conversation-thread",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "conversations",
      threadId
    };
  }

  return {
    ...createDefaultEnvironmentFocusState(),
    sourceWorkspace: input.sourceWorkspace,
    sourceSurface: "conversations"
  };
}

export function createEnvironmentFocusFromGovernanceContext(
  input: GovernanceFocusContextInput
): EnvironmentFocusState {
  const approvalId = normalizeText(input.approvalId);
  const workItemId = normalizeText(input.workItemId);
  const incidentId = normalizeText(input.incidentId);

  if (approvalId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "governance-approval",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "approvals",
      approvalId
    };
  }

  if (incidentId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "governance-incident",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "incidents",
      incidentId
    };
  }

  if (workItemId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "governance-work-item",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "operate",
      workItemId
    };
  }

  return {
    ...createDefaultEnvironmentFocusState(),
    sourceWorkspace: input.sourceWorkspace,
    sourceSurface: "operate"
  };
}

export function createEnvironmentFocusFromEvidenceContext(
  input: EvidenceFocusContextInput
): EnvironmentFocusState {
  const artifactId = normalizeText(input.artifactId);
  const eventCursor = normalizeLine(input.eventCursor);

  if (artifactId) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "evidence-artifact",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "artifacts",
      artifactId
    };
  }

  if (eventCursor != null) {
    return {
      ...createDefaultEnvironmentFocusState(),
      kind: "evidence-event",
      sourceWorkspace: input.sourceWorkspace,
      sourceSurface: "artifacts",
      eventCursor
    };
  }

  return {
    ...createDefaultEnvironmentFocusState(),
    sourceWorkspace: input.sourceWorkspace,
    sourceSurface: "artifacts"
  };
}

export function mergeEnvironmentFocus(
  primary: EnvironmentFocusState,
  secondary: EnvironmentFocusState
): EnvironmentFocusState {
  const primaryDominant =
    primary.kind !== "none" &&
    (secondary.kind === "none" || environmentFocusPriority(primary.kind) >= environmentFocusPriority(secondary.kind));
  const dominant = primaryDominant ? primary : secondary;
  const fallback = primaryDominant ? secondary : primary;

  return {
    ...fallback,
    ...dominant,
    kind: dominant.kind,
    sourceWorkspace: dominant.sourceWorkspace,
    sourceSurface: dominant.sourceSurface,
    runtimeSymbol: dominant.runtimeSymbol ?? fallback.runtimeSymbol,
    runtimePackage: dominant.runtimePackage ?? fallback.runtimePackage,
    runtimeInspectionMode: dominant.runtimeInspectionMode ?? fallback.runtimeInspectionMode,
    sourcePath: dominant.sourcePath ?? fallback.sourcePath,
    sourceLine: dominant.sourceLine ?? fallback.sourceLine,
    threadId: dominant.threadId ?? fallback.threadId,
    turnId: dominant.turnId ?? fallback.turnId,
    approvalId: dominant.approvalId ?? fallback.approvalId,
    workItemId: dominant.workItemId ?? fallback.workItemId,
    incidentId: dominant.incidentId ?? fallback.incidentId,
    artifactId: dominant.artifactId ?? fallback.artifactId,
    eventCursor: dominant.eventCursor ?? fallback.eventCursor
  };
}

export function formatEnvironmentFocusLabel(focus: EnvironmentFocusState): string {
  switch (focus.kind) {
    case "conversation-turn":
      return focus.turnId ? `Focus: conversation turn ${focus.turnId}` : "Focus: conversation turn";
    case "conversation-thread":
      return focus.threadId ? `Focus: conversation thread ${focus.threadId}` : "Focus: conversation thread";
    case "runtime-symbol":
      return `Focus: ${focus.runtimePackage ? `${focus.runtimePackage}::` : ""}${focus.runtimeSymbol ?? "runtime symbol"}`;
    case "source-artifact":
      return focus.sourcePath
        ? `Focus: ${focus.sourcePath}${focus.sourceLine ? ` line ${focus.sourceLine}` : ""}`
        : "Focus: source artifact";
    case "linked-conversation":
      return focus.threadId ? `Focus: linked conversation ${focus.threadId}` : "Focus: linked conversation";
    case "governance-approval":
      return focus.approvalId ? `Focus: approval ${focus.approvalId}` : "Focus: approval";
    case "governance-work-item":
      return focus.workItemId ? `Focus: work item ${focus.workItemId}` : "Focus: work item";
    case "governance-incident":
      return focus.incidentId ? `Focus: incident ${focus.incidentId}` : "Focus: incident";
    case "evidence-artifact":
      return focus.artifactId ? `Focus: artifact ${focus.artifactId}` : "Focus: artifact";
    case "evidence-event":
      return focus.eventCursor != null ? `Focus: event ${focus.eventCursor}` : "Focus: event";
    case "runtime-scope":
      return "Focus: runtime scope";
    case "none":
    default:
      return "Focus: current environment";
  }
}
