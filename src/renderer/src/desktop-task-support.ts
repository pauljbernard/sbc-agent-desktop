import type { DesktopTaskRecordDto } from "../../shared/contracts";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function canonicalDesktopTaskCoordinate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().replace(/^:/, "").replace(/_/g, "-").toLowerCase();
}

export function firstStringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

export function extractPendingConversationApprovalFromActorFlow(flowValue: Record<string, unknown> | null | undefined): {
  actorMessageId: string | null;
  approvalId: string | null;
  sessionId: string | null;
  threadId: string | null;
  policyIds: string[];
} | null {
  const flow = asRecord(flowValue);
  const pendingApprovalFlow = asRecord(flow.pendingApproval);
  const approvalInbox = asRecord(flow.contextChatApprovalInbox);
  const approvalRequest = asRecord(
    Array.isArray(approvalInbox.requests) ? approvalInbox.requests[0] : null
  );
  const actorMessageId =
    firstStringValue(
      Array.isArray(pendingApprovalFlow.actorMessageIds)
        ? pendingApprovalFlow.actorMessageIds[0]
        : null,
      pendingApprovalFlow.actorMessageId,
      approvalRequest.actorMessageId,
      flow.actorMessageId
    ) ?? null;
  const approvalId = firstStringValue(
    Array.isArray(pendingApprovalFlow.approvalIds)
      ? pendingApprovalFlow.approvalIds[0]
      : null,
    pendingApprovalFlow.approvalId,
    approvalRequest.approvalId,
    flow.approvalId
  );
  const sessionId = firstStringValue(
    pendingApprovalFlow.sessionId,
    approvalRequest.sessionId,
    flow.sessionId
  );
  const threadId = firstStringValue(
    pendingApprovalFlow.threadId,
    approvalRequest.threadId,
    flow.threadId,
    asRecord((Array.isArray(pendingApprovalFlow.requests) ? pendingApprovalFlow.requests[0] : null)).threadId
  );
  const policyIds =
    Array.isArray(pendingApprovalFlow.policyIds) && pendingApprovalFlow.policyIds.length > 0
      ? pendingApprovalFlow.policyIds.map((value) => String(value))
      : firstStringValue(approvalRequest.policyId)
        ? [String(approvalRequest.policyId)]
        : [];
  if (!approvalId && !actorMessageId) {
    return null;
  }
  return {
    actorMessageId,
    approvalId: approvalId ?? null,
    sessionId: sessionId ?? null,
    threadId: threadId ?? null,
    policyIds
  };
}

export function extractCompletedEditorAppendFromActorFlow(flowValue: Record<string, unknown> | null | undefined): {
  dedupeKey: string;
  actorMessageId: string | null;
  pendingActionId: string | null;
  text: string;
  scopeId: string | null;
  bufferId: string | null;
  packageName: string | null;
} | null {
  const flow = asRecord(flowValue);
  const editorAuthorizations = asRecord(flow.editorAuthorizations);
  const editorPendingMutations = asRecord(flow.editorPendingMutations);
  const candidates = [
    ...(Array.isArray(editorAuthorizations.authorizations) ? editorAuthorizations.authorizations : []),
    ...(Array.isArray(editorPendingMutations.mutations) ? editorPendingMutations.mutations : [])
  ]
    .map((entry) => asRecord(entry))
    .filter((entry) => {
      const target = canonicalDesktopTaskCoordinate(firstStringValue(entry.target));
      const operation = canonicalDesktopTaskCoordinate(firstStringValue(entry.operation));
      const deliveryStatus = canonicalDesktopTaskCoordinate(firstStringValue(entry.deliveryStatus));
      return (
        target === "editor" &&
        operation === "append-text" &&
        (deliveryStatus === "applied" || deliveryStatus === "replied")
      );
    })
    .sort((left, right) =>
      String(right.completedAt ?? right.dequeuedAt ?? right.approvedAt ?? "").localeCompare(
        String(left.completedAt ?? left.dequeuedAt ?? left.approvedAt ?? "")
      )
    );
  const entry = candidates[0];
  if (!entry) {
    return null;
  }
  const text = firstStringValue(entry.text);
  if (!text) {
    return null;
  }
  const actorMessageId = firstStringValue(entry.actorMessageId, asRecord(entry.actorMessage).id);
  const pendingActionId = firstStringValue(entry.pendingActionId);
  const completedAt = firstStringValue(entry.completedAt, entry.dequeuedAt, entry.approvedAt);
  const dedupeKey = actorMessageId ?? pendingActionId ?? completedAt;
  if (!dedupeKey) {
    return null;
  }
  return {
    dedupeKey,
    actorMessageId: actorMessageId ?? null,
    pendingActionId: pendingActionId ?? null,
    text,
    scopeId: firstStringValue(entry.scopeId),
    bufferId: firstStringValue(entry.bufferId),
    packageName: firstStringValue(entry.packageName)
  };
}

export function buildRuntimeAssistantMessageFromReply(
  replyValue: Record<string, unknown> | null | undefined
): string | null {
  const reply = asRecord(replyValue);
  const form = firstStringValue(reply.form);
  const packageName = firstStringValue(reply.packageName);
  const summary = firstStringValue(reply.summary, reply.message);
  if (summary) {
    return summary;
  }
  if (Object.prototype.hasOwnProperty.call(reply, "result")) {
    const result = reply.result;
    const renderedResult =
      result == null
        ? "NIL"
        : typeof result === "string"
          ? result
          : JSON.stringify(result);
    if (form && packageName) {
      return `Evaluated ${form} in ${packageName}. Result: ${renderedResult}.`;
    }
    if (form) {
      return `Evaluated ${form}. Result: ${renderedResult}.`;
    }
    return `Runtime result: ${renderedResult}.`;
  }
  return null;
}

export function extractCompletedEditorAppendFromDesktopTaskResult(input: {
  entry: Record<string, unknown>;
  fallbackScopeId?: string | null;
  fallbackBufferId?: string | null;
  fallbackPackageName?: string | null;
}): {
  dedupeKey: string | null;
  text: string | null;
  scopeId: string | null;
  bufferId: string | null;
  packageName: string | null;
} | null {
  const target = canonicalDesktopTaskCoordinate(firstStringValue(input.entry.target));
  const operation = canonicalDesktopTaskCoordinate(firstStringValue(input.entry.operation));
  const status = canonicalDesktopTaskCoordinate(firstStringValue(input.entry.status));
  if (target !== "editor" || operation !== "append-text" || status !== "completed") {
    return null;
  }

  const result = asRecord(input.entry.result);
  const invocationResult = asRecord(result.invocationResult);
  const metadata = asRecord(result.metadata);
  const text = firstStringValue(invocationResult.text, result.text, metadata.text);
  const scopeId = firstStringValue(
    invocationResult.scopeId,
    invocationResult.scope_id,
    result.scopeId,
    result.scope_id,
    metadata.scopeId,
    metadata.scope_id,
    input.fallbackScopeId
  );
  const bufferId = firstStringValue(
    invocationResult.bufferId,
    invocationResult.buffer_id,
    result.bufferId,
    result.buffer_id,
    metadata.bufferId,
    metadata.buffer_id,
    input.fallbackBufferId
  );
  const packageName = firstStringValue(
    invocationResult.packageName,
    invocationResult.package_name,
    result.packageName,
    result.package_name,
    metadata.packageName,
    metadata.package_name,
    input.fallbackPackageName
  );
  const actorMessageId = firstStringValue(
    input.entry.actorMessageId,
    asRecord(input.entry.actorMessage).id,
    result.actorMessageId,
    asRecord(result.actorMessage).id
  );
  const pendingActionId = firstStringValue(
    input.entry.pendingActionId,
    result.pendingActionId,
    metadata.pendingActionId,
    metadata.pending_action_id
  );

  return {
    dedupeKey: actorMessageId ?? pendingActionId ?? text,
    text,
    scopeId,
    bufferId,
    packageName
  };
}

export function buildDesktopTaskRecordFromSummary(
  summary: Record<string, unknown>
): DesktopTaskRecordDto | null {
  const id = firstStringValue(summary.id);
  if (!id) {
    return null;
  }

  return {
    id,
    protocolVersion: typeof summary.protocolVersion === "number" ? summary.protocolVersion : null,
    requestId: firstStringValue(summary.requestId),
    requester: firstStringValue(summary.requester),
    target: firstStringValue(summary.target) ?? "unknown",
    operation: firstStringValue(summary.operation) ?? "unknown",
    capability: firstStringValue(summary.capability),
    backendKind: firstStringValue(summary.backendKind),
    backendRef: firstStringValue(summary.backendRef),
    status: firstStringValue(summary.status) ?? "unknown",
    governanceStatus: firstStringValue(summary.governanceStatus),
    approvalStatus: firstStringValue(summary.approvalStatus),
    retryPolicy: asRecord(summary.retryPolicy),
    retryCount: typeof summary.retryCount === "number" ? summary.retryCount : null,
    maxAttempts: typeof summary.maxAttempts === "number" ? summary.maxAttempts : null,
    retryableP: typeof summary.retryableP === "boolean" ? summary.retryableP : null,
    idempotencyKey: firstStringValue(summary.idempotencyKey),
    threadId: firstStringValue(summary.threadId),
    turnId: firstStringValue(summary.turnId),
    conversationOperationId: firstStringValue(summary.conversationOperationId),
    actorMessageId: firstStringValue(summary.actorMessageId, asRecord(summary.actorMessage).id),
    actorSlice: firstStringValue(summary.actorSlice),
    actorMessage: asRecord(summary.actorMessage),
    requestMetadata: asRecord(summary.requestMetadata),
    createdAt: firstStringValue(summary.createdAt),
    approvedAt: firstStringValue(summary.approvedAt),
    startedAt: firstStringValue(summary.startedAt),
    completedAt: firstStringValue(summary.completedAt),
    lastError: asRecord(summary.lastError),
    resolution: asRecord(summary.resolution),
    result: asRecord(summary.result),
    metadata: asRecord(summary.metadata)
  };
}
