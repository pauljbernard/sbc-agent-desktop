export async function queryOrchestrationList(
  environmentId?: string
): Promise<Record<string, unknown>[]> {
  const result = await window.sbclAgentDesktop.query.orchestrationList(environmentId);
  return Array.isArray(result.data) ? result.data : [];
}

export async function queryOrchestrationInbox(
  environmentId?: string
): Promise<Record<string, unknown>[]> {
  const result = await window.sbclAgentDesktop.query.orchestrationInbox(environmentId);
  return Array.isArray(result.data) ? result.data : [];
}

export async function queryOrchestrationFocus(input?: {
  environmentId?: string;
  planId?: string | null;
  workflowRecordId?: string | null;
  workItemId?: string | null;
}): Promise<Record<string, unknown> | null> {
  const result = await window.sbclAgentDesktop.query.orchestrationFocus({
    environmentId: input?.environmentId,
    planId: input?.planId ?? undefined,
    workflowRecordId: input?.workflowRecordId ?? undefined,
    workItemId: input?.workItemId ?? undefined
  });
  return result.data ?? null;
}

export async function queryOrchestrationSnapshot(input?: {
  environmentId?: string;
  planId?: string | null;
}): Promise<Record<string, unknown> | null> {
  const result = await window.sbclAgentDesktop.query.orchestrationSnapshot({
    environmentId: input?.environmentId,
    planId: input?.planId ?? undefined
  });
  return result.data ?? null;
}

export async function queryPlanVerification(input?: {
  environmentId?: string;
  planId?: string | null;
}): Promise<Record<string, unknown> | null> {
  const result = await window.sbclAgentDesktop.query.planVerification({
    environmentId: input?.environmentId,
    planId: input?.planId ?? undefined
  });
  return result.data ?? null;
}
