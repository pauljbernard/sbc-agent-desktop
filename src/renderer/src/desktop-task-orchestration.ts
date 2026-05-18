import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { PendingConversationApprovalState } from "./conversation-workspace-state";
import { asRecord, extractPendingConversationApprovalFromActorFlow, firstStringValue } from "./desktop-task-support";
import { queryDesktopTaskPendingApproval } from "./desktop-task-queries";

export interface ResolvedPendingConversationApproval {
  actorMessageId: string | null;
  approvalId: string | null;
  sessionId: string | null;
  threadId: string | null;
  policyIds: string[];
}

export async function refreshPendingConversationApprovalState(input: {
  environmentId?: string;
  pendingConversationApprovalRef: MutableRefObject<PendingConversationApprovalState | null>;
  selectedThreadIdRef: MutableRefObject<string | null>;
  refreshDesktopTaskActorFlow: (
    environmentId?: string,
    input?: {
      sessionId?: string | null;
      approvalId?: string | null;
      pendingActionId?: string | null;
      actorMessageId?: string | null;
      scopeId?: string | null;
    }
  ) => Promise<Record<string, unknown> | null>;
  setDesktopTaskActorFlow: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  setPendingConversationApproval: Dispatch<SetStateAction<PendingConversationApprovalState | null>>;
}): Promise<ResolvedPendingConversationApproval | null> {
  try {
    const retainedPendingApproval = input.pendingConversationApprovalRef.current;
    const refreshedActorFlow = await input.refreshDesktopTaskActorFlow(input.environmentId, {
      sessionId: retainedPendingApproval?.sessionId ?? undefined,
      approvalId: retainedPendingApproval?.approvalId ?? undefined,
      actorMessageId: retainedPendingApproval?.actorMessageId ?? undefined
    });
    if (refreshedActorFlow) {
      const actorFlowPendingApproval = extractPendingConversationApprovalFromActorFlow(refreshedActorFlow);
      console.info(
        "[conversation-approval] actor-flow actorMessageId=%s approvalId=%s sessionId=%s threadId=%s",
        actorFlowPendingApproval?.actorMessageId ?? null,
        actorFlowPendingApproval?.approvalId ?? null,
        actorFlowPendingApproval?.sessionId ?? null,
        actorFlowPendingApproval?.threadId ?? null
      );
      if (actorFlowPendingApproval) {
        const nextPendingApproval = {
          ...actorFlowPendingApproval,
          threadId: actorFlowPendingApproval.threadId ?? input.selectedThreadIdRef.current ?? null
        };
        input.setPendingConversationApproval(nextPendingApproval);
        return {
          actorMessageId: nextPendingApproval.actorMessageId ?? null,
          approvalId: nextPendingApproval.approvalId ?? null,
          sessionId: nextPendingApproval.sessionId ?? null,
          threadId: nextPendingApproval.threadId ?? null,
          policyIds: nextPendingApproval.policyIds
        };
      }
    }

    const data = await queryDesktopTaskPendingApproval(input.environmentId);
    if (!data) {
      return null;
    }
    const actorMessageIds = Array.isArray(data.actorMessageIds) ? data.actorMessageIds : [];
    const approvalIds = Array.isArray(data.approvalIds) ? data.approvalIds : [];
    const actorMessageId =
      firstStringValue(actorMessageIds[0]) ??
      firstStringValue(asRecord((Array.isArray(data.actorMessages) ? data.actorMessages[0] : null)).id) ??
      null;
    const approvalId = firstStringValue(approvalIds[0], data.approvalId);
    const sessionId = firstStringValue(data.sessionId);
    const threadId = firstStringValue(
      data.threadId,
      data.turnThreadId,
      asRecord((Array.isArray(data.records) ? data.records[0] : null)).threadId
    );
    console.info(
      "[conversation-approval] pending-query actorMessageId=%s approvalId=%s sessionId=%s threadId=%s",
      actorMessageId,
      approvalId,
      sessionId,
      threadId
    );
    input.setDesktopTaskActorFlow(null);
    if (approvalId || actorMessageId) {
      const nextPendingApproval = {
        actorMessageId,
        approvalId: approvalId ?? null,
        sessionId: sessionId ?? null,
        threadId: threadId ?? input.selectedThreadIdRef.current ?? null,
        policyIds: []
      };
      input.setPendingConversationApproval(nextPendingApproval);
      return nextPendingApproval;
    }
    const fallbackPendingApproval = input.pendingConversationApprovalRef.current;
    if (fallbackPendingApproval?.approvalId || fallbackPendingApproval?.actorMessageId) {
      return {
        actorMessageId: fallbackPendingApproval.actorMessageId ?? null,
        approvalId: fallbackPendingApproval.approvalId ?? null,
        sessionId: fallbackPendingApproval.sessionId ?? null,
        threadId: fallbackPendingApproval.threadId ?? null,
        policyIds: fallbackPendingApproval.policyIds
      };
    }
    input.setPendingConversationApproval(null);
    return null;
  } catch (error) {
    console.info("[conversation-approval] pending-query-failed error=%o", error);
    const currentPendingApproval = input.pendingConversationApprovalRef.current;
    return currentPendingApproval
      ? {
          actorMessageId: currentPendingApproval.actorMessageId ?? null,
          approvalId: currentPendingApproval.approvalId ?? null,
          sessionId: currentPendingApproval.sessionId ?? null,
          threadId: currentPendingApproval.threadId ?? null,
          policyIds: currentPendingConversationApprovalPolicyIds(currentPendingApproval)
        }
      : null;
  }
}

function currentPendingConversationApprovalPolicyIds(
  pendingApproval: PendingConversationApprovalState
): string[] {
  return Array.isArray(pendingApproval.policyIds) ? pendingApproval.policyIds : [];
}
