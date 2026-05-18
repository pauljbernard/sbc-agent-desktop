import type {
  ApprovalRequestSummaryDto,
  CommandResultDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  ReplSessionProfileDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemSummaryDto
} from "../../shared/contracts";
import { RuntimeWorkspace } from "./runtime-workspace";
import { Badge } from "./surface-support";

export type ExecutionWorkspaceProps = {
  actorSystemPanel: Record<string, unknown> | null;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeForm: string;
  setRuntimeForm: (value: string) => void;
  evaluateRuntimeForm: () => Promise<void>;
  replSessions: ReplSessionProfileDto[];
  currentReplSessionId: string | null;
  switchReplSession: (sessionId: string) => Promise<void>;
  createReplSession: () => Promise<void>;
  replSessionTitleDraft: string;
  setReplSessionTitleDraft: (value: string) => void;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeInspectionMode: RuntimeInspectionMode;
  runtimeInspectorSymbol: string;
  runtimeInspectorPackage: string;
  setRuntimeInspectionMode: (value: RuntimeInspectionMode) => void;
  setRuntimeInspectorSymbol: (value: string) => void;
  setRuntimeInspectorPackage: (value: string) => void;
  inspectRuntimeSymbol: () => Promise<void>;
  runtimeResult: CommandResultDto<RuntimeEvalResultDto> | null;
  isEvaluating: boolean;
  isInspectingRuntime: boolean;
  workItems: WorkItemSummaryDto[];
  selectedWorkItemId: string | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  orchestrationFocus: Record<string, unknown> | null;
  orchestrationSnapshot: Record<string, unknown> | null;
  planVerification: Record<string, unknown> | null;
  approvalRequests: ApprovalRequestSummaryDto[];
  openInspectorSurface: () => Promise<void>;
};

export function ExecutionWorkspace(props: ExecutionWorkspaceProps) {
  const orchestrationSnapshot = executionRecord(props.orchestrationSnapshot);
  const postureSummary = executionRecord(orchestrationSnapshot.postureSummary);
  const latestStepSummary = executionRecord(orchestrationSnapshot.latestStepSummary);
  const planVerification = executionRecord(props.planVerification);
  const verificationCounts = executionRecord(planVerification.verificationCounts);
  const selectedPlanId =
    firstExecutionString(
      executionRecord(props.orchestrationFocus).planId,
      executionRecord(executionRecord(props.orchestrationFocus).plan).id,
      orchestrationSnapshot.planId
    ) ?? "No active plan";
  const primaryCommandLabel =
    firstExecutionString(
      executionRecord(props.orchestrationFocus).primaryCommandLabel,
      executionRecord(executionRecord(props.orchestrationFocus).primaryCommand).label,
      orchestrationSnapshot.primaryCommandLabel,
      executionRecord(orchestrationSnapshot.primaryCommand).label
    ) ?? "No approval command";
  const primaryCommandDescription =
    firstExecutionString(
      executionRecord(props.orchestrationFocus).primaryCommandDescription,
      executionRecord(executionRecord(props.orchestrationFocus).primaryCommand).description,
      orchestrationSnapshot.primaryCommandDescription,
      executionRecord(orchestrationSnapshot.primaryCommand).description
    ) ?? "No approval request is blocking execution.";
  const selectedWorkTitle = props.selectedWorkItem?.title ?? props.workItems[0]?.title ?? "No governed work item selected";
  const executionObjective =
    firstExecutionString(props.selectedWorkItem?.waitingReason, postureSummary.nextAction, latestStepSummary.resultSummary) ??
    props.selectedWorkflowRecord?.closureSummary ??
    props.runtimeSummary?.divergencePosture ??
    "Inspect runtime posture, pick the current work item, and resolve whatever still prevents trustworthy continuation.";

  return (
    <div className="execution-journey">
      <RuntimeWorkspace
        actorSystemPanel={props.actorSystemPanel}
        createReplSession={props.createReplSession}
        currentReplSessionId={props.currentReplSessionId}
        evaluateRuntimeForm={props.evaluateRuntimeForm}
        inspectRuntimeSymbol={props.inspectRuntimeSymbol}
        isEvaluating={props.isEvaluating}
        isInspectingRuntime={props.isInspectingRuntime}
        openInspectorSurface={props.openInspectorSurface}
        replSessions={props.replSessions}
        replSessionTitleDraft={props.replSessionTitleDraft}
        runtimeForm={props.runtimeForm}
        runtimeInspection={props.runtimeInspection}
        runtimeInspectionMode={props.runtimeInspectionMode}
        runtimeInspectorPackage={props.runtimeInspectorPackage}
        runtimeInspectorSymbol={props.runtimeInspectorSymbol}
        runtimeResult={props.runtimeResult}
        runtimeSummary={props.runtimeSummary}
        setReplSessionTitleDraft={props.setReplSessionTitleDraft}
        setRuntimeForm={props.setRuntimeForm}
        setRuntimeInspectionMode={props.setRuntimeInspectionMode}
        setRuntimeInspectorPackage={props.setRuntimeInspectorPackage}
        setRuntimeInspectorSymbol={props.setRuntimeInspectorSymbol}
        surfaceMode="listener"
        switchReplSession={props.switchReplSession}
      />

      <section className="panel execution-objective-panel">
        <div className="panel-header">
          <div>
            <h3>Execution</h3>
            <p className="panel-subtitle">Listener state, current work, and approval pressure.</p>
          </div>
          <Badge tone={props.selectedWorkItem ? toneForWorkState(props.selectedWorkItem.state) : "steady"}>
            {props.selectedWorkItem?.state ?? "unscoped"}
          </Badge>
        </div>
        <p className="lead-copy">{selectedWorkTitle}</p>
        <p>{executionObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Runtime</span>
            <strong>{props.runtimeSummary?.currentPackage ?? "Unavailable"}</strong>
            <p>
              {props.runtimeSummary?.activeMutations
                ? "Active mutation pressure is present."
                : "Runtime is inspectable without active mutation pressure."}
            </p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Work</span>
            <strong>{props.workItems.length}</strong>
            <p>{props.workItems[0]?.title ?? "No governed work item is foregrounded."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Approvals</span>
            <strong>{primaryCommandLabel}</strong>
            <p>
              {firstExecutionString(
                postureSummary.waitingOn,
                postureSummary.nextAction,
                primaryCommandDescription,
                props.approvalRequests[0]?.title
              ) ?? "No approval request is blocking execution."}
            </p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Orchestration</span>
            <strong>{selectedPlanId}</strong>
            <p>
              {firstExecutionString(postureSummary.waitingOn, postureSummary.nextAction, latestStepSummary.capability) ??
                "No orchestration posture is currently attached to this execution context."}
            </p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Verification</span>
            <strong>{String(verificationCounts.verifiedCount ?? 0)}</strong>
            <p>
              {firstExecutionString(
                latestStepSummary.reconciliationStatus,
                executionRecord(planVerification.latestEvidenceSummary).status
              ) ?? "No verification evidence is projected yet."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function executionRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstExecutionString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
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
