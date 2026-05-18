import type {
  DesktopTaskManifestDto,
  DesktopTaskRecordDto
} from "../../shared/contracts";
import { asRecord } from "./desktop-task-support";

export async function queryDesktopTaskManifests(
  environmentId?: string
): Promise<DesktopTaskManifestDto[]> {
  const result = await window.sbclAgentDesktop.query.desktopTaskManifests(environmentId);
  return result.data;
}

export async function queryDesktopTaskRecords(
  environmentId?: string
): Promise<DesktopTaskRecordDto[]> {
  const result = await window.sbclAgentDesktop.query.desktopTaskRecords(environmentId);
  return result.data;
}

export async function queryDesktopTaskActorTrace(
  environmentId?: string
): Promise<Record<string, unknown>[]> {
  const queryActorTrace = window.sbclAgentDesktop.query.desktopTaskActorTrace;
  if (typeof queryActorTrace !== "function") {
    return [];
  }
  const result = await queryActorTrace({ environmentId });
  return Array.isArray(result.data) ? result.data : [];
}

export async function queryDesktopTaskDeadLetters(
  environmentId?: string
): Promise<Record<string, unknown>[]> {
  const queryDeadLetters = window.sbclAgentDesktop.query.desktopTaskDeadLetterQueue;
  if (typeof queryDeadLetters !== "function") {
    return [];
  }
  const result = await queryDeadLetters({ environmentId });
  return Array.isArray(result.data) ? result.data : [];
}

export async function queryDesktopTaskActorFlow(
  environmentId?: string,
  input?: {
    sessionId?: string | null;
    approvalId?: string | null;
    pendingActionId?: string | null;
    actorMessageId?: string | null;
    scopeId?: string | null;
  }
): Promise<Record<string, unknown> | null> {
  const queryActorFlow = window.sbclAgentDesktop.query.desktopTaskActorFlow;
  if (typeof queryActorFlow !== "function") {
    return null;
  }
  const result = await queryActorFlow({
    environmentId,
    sessionId: input?.sessionId ?? undefined,
    approvalId: input?.approvalId ?? undefined,
    pendingActionId: input?.pendingActionId ?? undefined,
    actorMessageId: input?.actorMessageId ?? undefined,
    scopeId: input?.scopeId ?? undefined,
    latestOnlyP: true
  });
  return asRecord(result.data);
}

export async function queryDesktopTaskActorSystemPanel(
  environmentId?: string,
  input?: {
    sessionId?: string | null;
  }
): Promise<Record<string, unknown> | null> {
  const queryActorSystemPanel = window.sbclAgentDesktop.query.desktopTaskActorSystemPanel;
  if (typeof queryActorSystemPanel !== "function") {
    return null;
  }
  const result = await queryActorSystemPanel({
    environmentId,
    sessionId: input?.sessionId ?? undefined
  });
  const nextPanel = asRecord(result.data);
  console.info(
    "[actor-system-panel] %s",
    JSON.stringify({
      status: result.status,
      environmentId,
      sessionId: input?.sessionId ?? null,
      rootActorId: nextPanel?.rootActorId ?? null,
      actorCount: Array.isArray(nextPanel?.actors) ? nextPanel.actors.length : 0,
      workflowEdgeCount: Array.isArray(nextPanel?.workflowEdges) ? nextPanel.workflowEdges.length : 0,
      incidentCount: Array.isArray(nextPanel?.supervisionIncidents)
        ? nextPanel.supervisionIncidents.length
        : 0,
      keys: nextPanel ? Object.keys(nextPanel) : []
    })
  );
  return nextPanel;
}

export async function queryDesktopTaskPendingApproval(
  environmentId?: string
): Promise<Record<string, unknown> | null> {
  const queryPendingApproval = window.sbclAgentDesktop.query.desktopTaskPendingApproval;
  if (typeof queryPendingApproval !== "function") {
    return null;
  }
  const result = await queryPendingApproval(environmentId);
  return asRecord(result.data);
}
