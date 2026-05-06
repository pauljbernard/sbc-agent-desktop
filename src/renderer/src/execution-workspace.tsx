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
import { JourneyStageStrip } from "./journey-support";
import { RuntimeWorkspace } from "./runtime-workspace";
import { Badge } from "./surface-support";

export type ExecutionWorkspaceProps = {
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
  approvalRequests: ApprovalRequestSummaryDto[];
  openInspectorSurface: () => Promise<void>;
};

export function ExecutionWorkspace(props: ExecutionWorkspaceProps) {
  const selectedWorkTitle = props.selectedWorkItem?.title ?? props.workItems[0]?.title ?? "No governed work item selected";
  const executionObjective =
    props.selectedWorkItem?.waitingReason ??
    props.selectedWorkflowRecord?.closureSummary ??
    props.runtimeSummary?.divergencePosture ??
    "Inspect runtime posture, pick the current work item, and resolve whatever still prevents trustworthy continuation.";

  return (
    <div className="execution-journey">
      <RuntimeWorkspace
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

      <JourneyStageStrip
        eyebrow="Execution Flow"
        summary="Execution should move through live image inspection, governed work reconciliation, and explicit decisions without turning back into queue-driven SDLC navigation."
        steps={[
          {
            id: "inspect-runtime",
            title: "Inspect Runtime",
            summary: "Confirm current package, mutation pressure, and available inspection scopes in the live image.",
            tone: props.runtimeSummary?.activeMutations ? "warning" : "active"
          },
          {
            id: "reconcile-work",
            title: "Reconcile Work",
            summary: "Work stays attached to validation and closure so the operator can see what still prevents trustworthy continuation.",
            tone: props.workItems.some((item) => item.state === "blocked") ? "warning" : "steady"
          },
          {
            id: "apply-decisions",
            title: "Apply Decisions",
            summary: "Approval decisions remain part of execution context. When there is no approval gate, the desktop should state that explicitly and let execution continue.",
            tone: props.approvalRequests.length > 0 ? "warning" : "active"
          }
        ]}
        title="Execution Journey"
      />
      <section className="panel execution-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Execution Objective</p>
            <h3>{selectedWorkTitle}</h3>
          </div>
          <Badge tone={props.selectedWorkItem ? toneForWorkState(props.selectedWorkItem.state) : "steady"}>
            {props.selectedWorkItem?.state ?? "unscoped"}
          </Badge>
        </div>
        <p className="lead-copy">{executionObjective}</p>
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
            <strong>{props.approvalRequests.length}</strong>
            <p>{props.approvalRequests[0]?.title ?? "No approval request is blocking execution."}</p>
          </div>
        </div>
      </section>
    </div>
  );
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
