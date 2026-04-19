import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  AttentionSummaryDto,
  BindingDto,
  CommandResultDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  MessageDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  ServiceMetadataDto,
  SourcePreviewDto,
  TaskSummaryDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  TurnSummaryDto,
  TruthPostureDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemSummaryDto,
  WorkerSummaryDto
} from "./contracts";

interface MockEnvironmentRecord {
  summary: EnvironmentSummaryDto;
  status: EnvironmentStatusDto;
  approvals: ApprovalRequestSummaryDto[];
  incidentDetails: Record<string, IncidentDetailDto>;
  workItems: WorkItemSummaryDto[];
  workItemDetails: Record<string, WorkItemDetailDto>;
  workflowRecords: Record<string, WorkflowRecordDto>;
  threads: ThreadSummaryDto[];
  threadDetails: Record<string, ThreadDetailDto>;
  turnDetails: Record<string, TurnDetailDto>;
  runtimeSummary: RuntimeSummaryDto;
  approvalDetails: Record<string, ApprovalRequestDto>;
  artifactDetails: Record<string, ArtifactDetailDto>;
  events: EnvironmentEventDto[];
}

const now = "2026-04-18T14:20:00Z";

function metadata(binding: BindingDto | null, readModel: string): ServiceMetadataDto {
  return {
    authority: "environment",
    binding,
    readModel
  };
}

function truthPosture(
  domain: TruthPostureDto["domain"],
  label: string,
  posture: string,
  summary: string,
  state: TruthPostureDto["state"],
  counts: TruthPostureDto["counts"]
): TruthPostureDto {
  return { domain, label, posture, summary, state, counts };
}

function attention(
  approvalsAwaiting: number,
  openIncidents: number,
  blockedWork: number,
  interruptedTurns: number,
  activeStreams: number
): AttentionSummaryDto {
  return {
    approvalsAwaiting,
    openIncidents,
    blockedWork,
    interruptedTurns,
    activeStreams
  };
}

function artifacts(items: ArtifactSummaryDto[]): ArtifactSummaryDto[] {
  return items;
}

function tasks(items: TaskSummaryDto[]): TaskSummaryDto[] {
  return items;
}

function workers(items: WorkerSummaryDto[]): WorkerSummaryDto[] {
  return items;
}

function incidents(items: IncidentSummaryDto[]): IncidentSummaryDto[] {
  return items;
}

function approvals(items: ApprovalRequestSummaryDto[]): ApprovalRequestSummaryDto[] {
  return items;
}

function messages(items: MessageDto[]): MessageDto[] {
  return items;
}

function turns(items: TurnSummaryDto[]): TurnSummaryDto[] {
  return items;
}

const environments: Record<string, MockEnvironmentRecord> = {
  "local-dev": {
    approvals: approvals([
      {
        requestId: "approval-binding-shift",
        title: "Persist environment binding",
        summary: "Approval required to make the current desktop binding durable.",
        state: "awaiting"
      }
    ]),
    artifactDetails: {
      "artifact-transport-spec": {
        artifactId: "artifact-transport-spec",
        title: "Transport Contract Delta",
        kind: "spec",
        summary: "Protocol envelope changes aligned to the desktop host adapter.",
        updatedAt: "2026-04-18T13:56:00Z",
        provenance: "Synthesized from the host adapter binding slice and current contract boundary changes.",
        authority: "workflow",
        state: "active",
        linkedEntities: [
          { entityType: "approval", entityId: "approval-binding-shift", label: "Persist environment binding" },
          { entityType: "work-item", entityId: "work-item-host-binding", label: "Persist governed desktop binding" }
        ],
        observations: [
          "The renderer remains transport-free and receives only preload-safe DTOs.",
          "Binding durability remains governed and cannot be inferred from UI state alone."
        ]
      },
      "artifact-runtime-audit": {
        artifactId: "artifact-runtime-audit",
        title: "Runtime Audit Snapshot",
        kind: "evidence",
        summary: "Captured image posture before recent evaluation commands.",
        updatedAt: "2026-04-18T13:32:00Z",
        provenance: "Collected from a supervised runtime observation pass before binding persistence proceeded.",
        authority: "runtime",
        state: "evidence",
        linkedEntities: [
          { entityType: "incident", entityId: "incident-runtime-guard", label: "Runtime guard interruption" },
          { entityType: "work-item", entityId: "work-item-runtime-audit", label: "Reconcile runtime audit output" }
        ],
        observations: [
          "One recovery-sensitive package boundary remains open.",
          "Colder validation still must reconcile image truth against durable source truth."
        ]
      }
    },
    incidentDetails: {
      "incident-runtime-guard": {
        incidentId: "incident-runtime-guard",
        title: "Runtime guard interruption",
        summary: "A runtime guard interrupted a mutation path and forced governed recovery review before work may continue.",
        severity: "high",
        state: "recovering",
        runtimeId: "runtime-local-dev",
        recoveryState: "active_recovery",
        recoverySummary: "Recovery is in progress. Evidence exists, but closure is still withheld pending approval and reconciliation.",
        nextAction: "Review approval state and confirm the resumed binding path is safe.",
        blockedReason: "Closure remains blocked until approval and colder validation complete.",
        artifactIds: ["artifact-runtime-audit", "artifact-transport-spec"],
        linkedEntities: [
          { entityType: "operation", entityId: "op-persist-binding", label: "Persist binding operation" },
          { entityType: "incident", entityId: "incident-runtime-guard", label: "Runtime guard interruption" },
          { entityType: "work-item", entityId: "task-host-binding", label: "Bind desktop session" },
          { entityType: "artifact", entityId: "artifact-runtime-audit", label: "Runtime Audit Snapshot" }
        ],
        updatedAt: "2026-04-18T14:18:00Z"
      }
    },
    workItems: [
      {
        workItemId: "work-item-host-binding",
        title: "Persist governed desktop binding",
        state: "blocked",
        waitingReason: "Awaiting approval before durable binding persistence may continue.",
        approvalCount: 1,
        incidentCount: 1,
        artifactCount: 2,
        validationBurden: "pending",
        reconciliationBurden: "required"
      },
      {
        workItemId: "work-item-runtime-audit",
        title: "Reconcile runtime audit output",
        state: "waiting",
        waitingReason: "Evidence is present, but colder validation is still pending.",
        approvalCount: 0,
        incidentCount: 0,
        artifactCount: 1,
        validationBurden: "pending",
        reconciliationBurden: "required"
      }
    ],
    workItemDetails: {
      "work-item-host-binding": {
        workItemId: "work-item-host-binding",
        title: "Persist governed desktop binding",
        state: "blocked",
        waitingReason: "Awaiting approval before durable binding persistence may continue.",
        workflowRecordId: "workflow-record-host-binding",
        runtimeSummary: "Binding persistence touches a live runtime authority path.",
        sourceRelationship: "Runtime binding intent is ahead of durable source confirmation.",
        linkedEntities: [
          { entityType: "approval", entityId: "approval-binding-shift", label: "Persist environment binding" },
          { entityType: "incident", entityId: "incident-runtime-guard", label: "Runtime guard interruption" },
          { entityType: "artifact", entityId: "artifact-transport-spec", label: "Transport Contract Delta" }
        ]
      },
      "work-item-runtime-audit": {
        workItemId: "work-item-runtime-audit",
        title: "Reconcile runtime audit output",
        state: "waiting",
        waitingReason: "Evidence is present, but colder validation is still pending.",
        workflowRecordId: "workflow-record-runtime-audit",
        runtimeSummary: "Audit evidence reflects current runtime posture and mutation history.",
        sourceRelationship: "Source and image remain intentionally distinct until reconciliation closes.",
        linkedEntities: [
          { entityType: "artifact", entityId: "artifact-runtime-audit", label: "Runtime Audit Snapshot" }
        ]
      }
    },
    workflowRecords: {
      "workflow-record-host-binding": {
        workflowRecordId: "workflow-record-host-binding",
        phase: "reconciliation",
        validationState: "pending",
        reconciliationState: "required",
        closureReadiness: "not_closable",
        closureSummary: "The workflow is not closable because approval and colder validation remain open.",
        blockingItems: ["approval-binding-shift", "incident-runtime-guard"]
      },
      "workflow-record-runtime-audit": {
        workflowRecordId: "workflow-record-runtime-audit",
        phase: "validation",
        validationState: "pending",
        reconciliationState: "required",
        closureReadiness: "not_closable",
        closureSummary: "Audit evidence exists, but validation and reconciliation still need confirmation.",
        blockingItems: ["artifact-runtime-audit"]
      }
    },
    summary: {
      environmentId: "local-dev",
      environmentLabel: "Local Development Kernel",
      sourcePosture: truthPosture(
        "source",
        "Source Truth",
        "Divergence Controlled",
        "Three source assets are under active mutation, but evidence and scope remain attached to governed work.",
        "active",
        { active: 3, pending: 1 }
      ),
      imagePosture: truthPosture(
        "image",
        "Image Truth",
        "Warm And Mutable",
        "The runtime is live, evaluated recently, and carrying one recovery-sensitive package boundary.",
        "active",
        { active: 4, blocked: 1 }
      ),
      workflowPosture: truthPosture(
        "workflow",
        "Workflow Truth",
        "Closure Withheld",
        "Execution is progressing, but one work item remains blocked on reconciliation and one approval is outstanding.",
        "warning",
        { blocked: 1, pending: 2 }
      ),
      attention: attention(1, 1, 1, 2, 3),
      activeContext: {
        environmentLabel: "Local Development Kernel",
        runtimeLabel: "SBCL Image 2026.04",
        focusSummary: "Peer agentic development is active across runtime mutation, review, and reconciliation.",
        currentThreadTitle: "Stabilize host transport contract",
        currentTurnSummary: "Waiting on approval to persist a host binding change."
      },
      recentArtifacts: artifacts([
        {
          artifactId: "artifact-transport-spec",
          title: "Transport Contract Delta",
          kind: "spec",
          summary: "Protocol envelope changes aligned to the desktop host adapter.",
          updatedAt: "2026-04-18T13:56:00Z"
        },
        {
          artifactId: "artifact-runtime-audit",
          title: "Runtime Audit Snapshot",
          kind: "evidence",
          summary: "Captured image posture before recent evaluation commands.",
          updatedAt: "2026-04-18T13:32:00Z"
        }
      ]),
      activeTasks: tasks([
        {
          taskId: "task-host-binding",
          title: "Bind desktop session",
          state: "active",
          summary: "Main process is proving the host health and binding contract."
        },
        {
          taskId: "task-reconciliation",
          title: "Reconcile workflow closure",
          state: "blocked",
          summary: "A workflow record is waiting on evidence and approval before closure."
        }
      ]),
      activeWorkers: workers([
        {
          workerId: "worker-main",
          label: "Host Adapter",
          state: "active",
          responsibility: "Connection health, binding, and query routing."
        },
        {
          workerId: "worker-supervisor",
          label: "Attention Aggregator",
          state: "waiting",
          responsibility: "Awaiting live event subscription to replace static rollups."
        }
      ]),
      incidents: incidents([
        {
          incidentId: "incident-runtime-guard",
          title: "Runtime guard interruption",
          severity: "high",
          state: "recovering"
        }
      ]),
      approvals: approvals([
        {
          requestId: "approval-binding-shift",
          title: "Persist environment binding",
          summary: "Approval required to make the current desktop binding durable.",
          state: "awaiting"
        }
      ])
    },
    status: {
      environmentId: "local-dev",
      environmentLabel: "Local Development Kernel",
      connectionState: "bound",
      hostState: "ready",
      runtimeState: "warm",
      workflowState: "attention_required",
      lastUpdatedAt: now
    },
    threads: [
      {
        threadId: "thread-transport-contract",
        title: "Stabilize host transport contract",
        summary: "Desktop host binding and protocol alignment are under active supervised development.",
        state: "active",
        latestActivityAt: "2026-04-18T14:16:00Z",
        latestTurnState: "awaiting_approval",
        attentionFlags: ["approval", "runtime"]
      },
      {
        threadId: "thread-reconciliation-review",
        title: "Reconcile workflow closure posture",
        summary: "A workflow remains blocked until evidence and approval obligations are resolved.",
        state: "blocked",
        latestActivityAt: "2026-04-18T13:48:00Z",
        latestTurnState: "interrupted",
        attentionFlags: ["blocked", "workflow"]
      },
      {
        threadId: "thread-background-audit",
        title: "Runtime audit background pass",
        summary: "Background-only audit of runtime divergence and image posture.",
        state: "background",
        latestActivityAt: "2026-04-18T13:12:00Z",
        latestTurnState: "background",
        attentionFlags: ["background"]
      }
    ],
    threadDetails: {
      "thread-transport-contract": {
        threadId: "thread-transport-contract",
        title: "Stabilize host transport contract",
        summary: "Desktop host binding and protocol alignment are under active supervised development.",
        state: "active",
        messages: messages([
          {
            messageId: "msg-1",
            role: "user",
            content: "Align the desktop host adapter with the public transport contract and preserve binding authority.",
            createdAt: "2026-04-18T14:01:00Z"
          },
          {
            messageId: "msg-2",
            role: "assistant",
            content:
              "The adapter boundary is stable. Binding is explicit in main/preload, and the renderer remains transport-free.",
            createdAt: "2026-04-18T14:07:00Z"
          }
        ]),
        turns: turns([
          {
            turnId: "turn-transport-1",
            title: "Bind desktop shell to local host",
            state: "completed",
            createdAt: "2026-04-18T14:03:00Z"
          },
          {
            turnId: "turn-transport-2",
            title: "Persist governed binding update",
            state: "awaiting_approval",
            createdAt: "2026-04-18T14:12:00Z"
          }
        ]),
        linkedEntities: [
          { entityType: "artifact", entityId: "artifact-transport-spec", label: "Transport Contract Delta" },
          { entityType: "approval", entityId: "approval-binding-shift", label: "Persist environment binding" },
          { entityType: "work-item", entityId: "task-host-binding", label: "Bind desktop session" }
        ]
      },
      "thread-reconciliation-review": {
        threadId: "thread-reconciliation-review",
        title: "Reconcile workflow closure posture",
        summary: "A workflow remains blocked until evidence and approval obligations are resolved.",
        state: "blocked",
        messages: messages([
          {
            messageId: "msg-3",
            role: "user",
            content: "Explain why execution success is not enough to close this workflow.",
            createdAt: "2026-04-18T13:34:00Z"
          },
          {
            messageId: "msg-4",
            role: "assistant",
            content:
              "Validation and reconciliation remain open, and the workflow is blocked on governed evidence before closure.",
            createdAt: "2026-04-18T13:39:00Z"
          }
        ]),
        turns: turns([
          {
            turnId: "turn-reconcile-1",
            title: "Assess closure readiness",
            state: "interrupted",
            createdAt: "2026-04-18T13:40:00Z"
          }
        ]),
        linkedEntities: [
          { entityType: "incident", entityId: "incident-runtime-guard", label: "Runtime guard interruption" },
          { entityType: "work-item", entityId: "task-reconciliation", label: "Reconcile workflow closure" }
        ]
      },
      "thread-background-audit": {
        threadId: "thread-background-audit",
        title: "Runtime audit background pass",
        summary: "Background-only audit of runtime divergence and image posture.",
        state: "background",
        messages: messages([
          {
            messageId: "msg-5",
            role: "system",
            content: "Background supervisory pass evaluating image posture and divergence markers.",
            createdAt: "2026-04-18T12:55:00Z"
          }
        ]),
        turns: turns([
          {
            turnId: "turn-audit-1",
            title: "Audit runtime posture",
            state: "background",
            createdAt: "2026-04-18T13:00:00Z"
          }
        ]),
        linkedEntities: [
          { entityType: "artifact", entityId: "artifact-runtime-audit", label: "Runtime Audit Snapshot" }
        ]
      }
    },
    turnDetails: {
      "turn-transport-1": {
        turnId: "turn-transport-1",
        threadId: "thread-transport-contract",
        title: "Bind desktop shell to local host",
        state: "completed",
        summary: "The host health and binding path completed successfully through main and preload.",
        createdAt: "2026-04-18T14:03:00Z",
        operationIds: ["op-host-health", "op-bind-environment"],
        artifactIds: ["artifact-transport-spec"],
        incidentIds: [],
        approvalIds: [],
        workItemIds: ["task-host-binding"]
      },
      "turn-transport-2": {
        turnId: "turn-transport-2",
        threadId: "thread-transport-contract",
        title: "Persist governed binding update",
        state: "awaiting_approval",
        summary: "A durable binding change is prepared but waiting on governed approval before persistence.",
        createdAt: "2026-04-18T14:12:00Z",
        operationIds: ["op-persist-binding"],
        artifactIds: ["artifact-transport-spec"],
        incidentIds: [],
        approvalIds: ["approval-binding-shift"],
        workItemIds: ["task-host-binding"]
      },
      "turn-reconcile-1": {
        turnId: "turn-reconcile-1",
        threadId: "thread-reconciliation-review",
        title: "Assess closure readiness",
        state: "interrupted",
        summary: "Workflow closure remains interrupted by unresolved evidence and recovery-linked obligations.",
        createdAt: "2026-04-18T13:40:00Z",
        operationIds: ["op-closure-assessment"],
        artifactIds: ["artifact-runtime-audit"],
        incidentIds: ["incident-runtime-guard"],
        approvalIds: [],
        workItemIds: ["task-reconciliation"]
      },
      "turn-audit-1": {
        turnId: "turn-audit-1",
        threadId: "thread-background-audit",
        title: "Audit runtime posture",
        state: "background",
        summary: "A background-only supervision pass is collecting runtime evidence without operator intervention.",
        createdAt: "2026-04-18T13:00:00Z",
        operationIds: ["op-runtime-audit"],
        artifactIds: ["artifact-runtime-audit"],
        incidentIds: [],
        approvalIds: [],
        workItemIds: []
      }
    },
    runtimeSummary: {
      runtimeId: "runtime-local-dev",
      runtimeLabel: "SBCL Image 2026.04",
      currentPackage: "SBCL-AGENT.DESKTOP",
      loadedSystemCount: 12,
      loadedSystems: ["sbcl-agent", "service-core", "runtime-service", "conversation-service"],
      loadedSystemEntries: [
        { name: "sbcl-agent", type: "asdf-system", status: "loaded" },
        { name: "service-core", type: "asdf-system", status: "loaded" },
        { name: "runtime-service", type: "asdf-system", status: "loaded" },
        { name: "conversation-service", type: "asdf-system", status: "loaded" }
      ],
      divergencePosture: "Runtime divergence is controlled but one package boundary still requires colder validation.",
      sourceRelationship: "Runtime image is ahead of durable source in one supervised mutation path.",
      activeMutations: 1,
      linkedIncidentIds: ["incident-runtime-guard"],
      scopes: [
        {
          scopeId: "scope-package-desktop",
          packageName: "SBCL-AGENT.DESKTOP",
          kind: "package",
          summary: "Desktop shell and host binding integration helpers."
        },
        {
          scopeId: "scope-symbol-bind",
          packageName: "SBCL-AGENT.SERVICE",
          symbolName: "SET-ENVIRONMENT-BINDING",
          kind: "symbol",
          summary: "Governed binding mutation path exposed to desktop host flows."
        },
        {
          scopeId: "scope-definition-runtime",
          packageName: "SBCL-AGENT.RUNTIME",
          symbolName: "EVALUATE-IN-CONTEXT",
          kind: "definition",
          summary: "Direct runtime evaluation entrypoint with policy and artifact consequences."
        }
      ]
    },
    approvalDetails: {
      "approval-binding-shift": {
        requestId: "approval-binding-shift",
        title: "Persist environment binding",
        summary: "Approval required to make the current desktop binding durable.",
        state: "awaiting",
        requestedAction: "Persist a governed environment binding mutation",
        scopeSummary: "Desktop host binding, persisted session authority, and resumed workflow work.",
        rationale: "The proposed runtime mutation changes durable environment targeting and therefore requires governed approval.",
        policyId: "policy-binding-persistence",
        consequenceSummary: "If approved, the binding persistence operation resumes and the blocked work item may proceed.",
        createdAt: "2026-04-18T14:14:00Z",
        linkedEntities: [
          { entityType: "operation", entityId: "op-persist-binding", label: "Persist binding operation" },
          { entityType: "work-item", entityId: "task-host-binding", label: "Bind desktop session" },
          { entityType: "approval", entityId: "approval-binding-shift", label: "Persist environment binding" }
        ]
      }
    },
    events: [
      {
        cursor: 4012,
        kind: "thread.turn.awaiting_approval",
        timestamp: "2026-04-18T14:12:00Z",
        family: "conversation",
        summary: "Turn `Persist governed binding update` entered approval wait.",
        entityId: "turn-transport-2",
        visibility: "operator",
        payload: {
          threadId: "thread-transport-contract",
          approvalId: "approval-binding-shift",
          workItemId: "work-item-host-binding"
        }
      },
      {
        cursor: 4013,
        kind: "approval.request.created",
        timestamp: "2026-04-18T14:14:00Z",
        family: "approval",
        summary: "Approval request `Persist environment binding` was emitted by runtime evaluation.",
        entityId: "approval-binding-shift",
        visibility: "operator",
        payload: {
          policyId: "policy-binding-persistence",
          operationId: "op-persist-binding"
        }
      },
      {
        cursor: 4014,
        kind: "incident.recovery.active",
        timestamp: "2026-04-18T14:18:00Z",
        family: "incident",
        summary: "Runtime guard interruption remains active and is holding closure posture open.",
        entityId: "incident-runtime-guard",
        visibility: "operator",
        payload: {
          recoveryState: "active_recovery",
          nextAction: "Review approval state and confirm the resumed binding path is safe."
        }
      },
      {
        cursor: 4015,
        kind: "workflow.reconciliation.blocked",
        timestamp: "2026-04-18T14:19:00Z",
        family: "workflow",
        summary: "Work item `Persist governed desktop binding` remains blocked by approval and colder validation.",
        entityId: "work-item-host-binding",
        visibility: "team",
        payload: {
          workflowRecordId: "workflow-record-host-binding",
          blockingItems: ["approval-binding-shift", "incident-runtime-guard"]
        }
      },
      {
        cursor: 4016,
        kind: "runtime.scope.evaluated",
        timestamp: "2026-04-18T14:20:00Z",
        family: "runtime",
        summary: "The desktop runtime scope was evaluated inside `SBCL-AGENT.DESKTOP`.",
        entityId: "runtime-local-dev",
        visibility: "team",
        payload: {
          packageName: "SBCL-AGENT.DESKTOP",
          operationId: "op-runtime-eval-ok"
        }
      }
    ]
  },
  "recovery-lab": {
    approvals: approvals([]),
    artifactDetails: {
      "artifact-condition-report": {
        artifactId: "artifact-condition-report",
        title: "Condition Report",
        kind: "incident-evidence",
        summary: "Structured condition and restart context captured from the runtime.",
        updatedAt: "2026-04-18T12:58:00Z",
        provenance: "Emitted by the guarded recovery path after a failed runtime mutation.",
        authority: "incident",
        state: "evidence",
        linkedEntities: [
          { entityType: "incident", entityId: "incident-image-divergence", label: "Image divergence under recovery" },
          { entityType: "work-item", entityId: "work-item-recovery-a", label: "Close recovery evidence loop" }
        ],
        observations: [
          "The runtime captured restart options without losing recovery context.",
          "Closure remains withheld until operator review accepts the evidence posture."
        ]
      }
    },
    incidentDetails: {
      "incident-image-divergence": {
        incidentId: "incident-image-divergence",
        title: "Image divergence under recovery",
        summary: "A failed mutation left the recovery image in a guarded divergent state requiring evidence-backed operator review.",
        severity: "critical",
        state: "open",
        runtimeId: "runtime-recovery-lab",
        recoveryState: "awaiting_acknowledgement",
        recoverySummary: "The incident is open and waiting for explicit recovery acknowledgement before restart paths continue.",
        nextAction: "Inspect the condition report and choose a recovery workflow.",
        blockedReason: "Runtime mutation remains suspended pending operator acknowledgement.",
        artifactIds: ["artifact-condition-report"],
        linkedEntities: [
          { entityType: "incident", entityId: "incident-image-divergence", label: "Image divergence under recovery" },
          { entityType: "artifact", entityId: "artifact-condition-report", label: "Condition Report" },
          { entityType: "work-item", entityId: "task-recovery-a", label: "Consolidate evidence" }
        ],
        updatedAt: "2026-04-18T12:58:00Z"
      },
      "incident-workflow-quarantine": {
        incidentId: "incident-workflow-quarantine",
        title: "Workflow quarantine pending review",
        summary: "A recovery-linked workflow remains quarantined until evidence and restart posture are reviewed.",
        severity: "moderate",
        state: "recovering",
        runtimeId: "runtime-recovery-lab",
        recoveryState: "closure_pending",
        recoverySummary: "Recovery workflow is underway, but closure is blocked on review and reconciliation.",
        nextAction: "Complete evidence review and clear quarantine conditions.",
        blockedReason: "Workflow closure is waiting for evidence-backed confirmation.",
        artifactIds: ["artifact-condition-report"],
        linkedEntities: [
          { entityType: "incident", entityId: "incident-workflow-quarantine", label: "Workflow quarantine pending review" },
          { entityType: "work-item", entityId: "task-recovery-a", label: "Consolidate evidence" }
        ],
        updatedAt: "2026-04-18T13:04:00Z"
      }
    },
    workItems: [
      {
        workItemId: "work-item-recovery-a",
        title: "Close recovery evidence loop",
        state: "quarantined",
        waitingReason: "Workflow closure is withheld while recovery evidence is reviewed.",
        approvalCount: 0,
        incidentCount: 2,
        artifactCount: 1,
        validationBurden: "pending",
        reconciliationBurden: "required"
      }
    ],
    workItemDetails: {
      "work-item-recovery-a": {
        workItemId: "work-item-recovery-a",
        title: "Close recovery evidence loop",
        state: "quarantined",
        waitingReason: "Workflow closure is withheld while recovery evidence is reviewed.",
        workflowRecordId: "workflow-record-recovery-a",
        runtimeSummary: "Recovery image remains in guarded posture until evidence is accepted.",
        sourceRelationship: "Source and image are intentionally unreconciled during recovery review.",
        linkedEntities: [
          { entityType: "incident", entityId: "incident-image-divergence", label: "Image divergence under recovery" },
          { entityType: "artifact", entityId: "artifact-condition-report", label: "Condition Report" }
        ]
      }
    },
    workflowRecords: {
      "workflow-record-recovery-a": {
        workflowRecordId: "workflow-record-recovery-a",
        phase: "reconciliation",
        validationState: "pending",
        reconciliationState: "required",
        closureReadiness: "not_closable",
        closureSummary: "Recovery work remains quarantined until evidence review and reconciliation complete.",
        blockingItems: ["incident-image-divergence", "artifact-condition-report"]
      }
    },
    summary: {
      environmentId: "recovery-lab",
      environmentLabel: "Recovery Lab",
      sourcePosture: truthPosture(
        "source",
        "Source Truth",
        "Stable",
        "Source changes are quiet; the environment is focused on incident recovery rather than active mutation.",
        "steady",
        { active: 0, pending: 0 }
      ),
      imagePosture: truthPosture(
        "image",
        "Image Truth",
        "Recovery Mode",
        "The image is recovering from a failed operation and is running under tightened supervision.",
        "risk",
        { active: 1, blocked: 2 }
      ),
      workflowPosture: truthPosture(
        "workflow",
        "Workflow Truth",
        "Governed Recovery",
        "Two recovery workflows are open and closure is prevented until evidence capture completes.",
        "warning",
        { blocked: 2, pending: 1 }
      ),
      attention: attention(0, 2, 2, 1, 1),
      activeContext: {
        environmentLabel: "Recovery Lab",
        runtimeLabel: "SBCL Recovery Image",
        focusSummary: "Incident resolution is the active engineering posture.",
        currentThreadTitle: "Repair package mutation failure",
        currentTurnSummary: "Recovery work is awaiting evidence consolidation."
      },
      recentArtifacts: artifacts([
        {
          artifactId: "artifact-condition-report",
          title: "Condition Report",
          kind: "incident-evidence",
          summary: "Structured condition and restart context captured from the runtime.",
          updatedAt: "2026-04-18T12:58:00Z"
        }
      ]),
      activeTasks: tasks([
        {
          taskId: "task-recovery-a",
          title: "Consolidate evidence",
          state: "waiting",
          summary: "Waiting for additional runtime context before closure."
        }
      ]),
      activeWorkers: workers([
        {
          workerId: "worker-recovery",
          label: "Recovery Supervisor",
          state: "active",
          responsibility: "Monitoring incident-linked workflows."
        }
      ]),
      incidents: incidents([
        {
          incidentId: "incident-image-divergence",
          title: "Image divergence under recovery",
          severity: "critical",
          state: "open"
        },
        {
          incidentId: "incident-workflow-quarantine",
          title: "Workflow quarantine pending review",
          severity: "moderate",
          state: "recovering"
        }
      ]),
      approvals: approvals([])
    },
    status: {
      environmentId: "recovery-lab",
      environmentLabel: "Recovery Lab",
      connectionState: "bound",
      hostState: "ready",
      runtimeState: "recovering",
      workflowState: "attention_required",
      lastUpdatedAt: now
    },
    threads: [
      {
        threadId: "thread-recovery-1",
        title: "Repair package mutation failure",
        summary: "Recovery work is focused on restoring image safety and governed closure posture.",
        state: "waiting",
        latestActivityAt: "2026-04-18T12:58:00Z",
        latestTurnState: "failed",
        attentionFlags: ["incident", "recovery"]
      }
    ],
    threadDetails: {
      "thread-recovery-1": {
        threadId: "thread-recovery-1",
        title: "Repair package mutation failure",
        summary: "Recovery work is focused on restoring image safety and governed closure posture.",
        state: "waiting",
        messages: messages([
          {
            messageId: "msg-r1",
            role: "user",
            content: "Recover the package mutation path without losing condition evidence.",
            createdAt: "2026-04-18T12:32:00Z"
          },
          {
            messageId: "msg-r2",
            role: "assistant",
            content:
              "The runtime is in guarded recovery. Condition evidence is attached and closure is withheld until review completes.",
            createdAt: "2026-04-18T12:36:00Z"
          }
        ]),
        turns: turns([
          {
            turnId: "turn-recovery-1",
            title: "Recover package mutation path",
            state: "failed",
            createdAt: "2026-04-18T12:40:00Z"
          }
        ]),
        linkedEntities: [
          { entityType: "incident", entityId: "incident-image-divergence", label: "Image divergence under recovery" },
          { entityType: "artifact", entityId: "artifact-condition-report", label: "Condition Report" }
        ]
      }
    },
    turnDetails: {
      "turn-recovery-1": {
        turnId: "turn-recovery-1",
        threadId: "thread-recovery-1",
        title: "Recover package mutation path",
        state: "failed",
        summary: "The recovery turn failed safely and emitted structured evidence for operator-guided resolution.",
        createdAt: "2026-04-18T12:40:00Z",
        operationIds: ["op-recovery-restart"],
        artifactIds: ["artifact-condition-report"],
        incidentIds: ["incident-image-divergence"],
        approvalIds: [],
        workItemIds: ["task-recovery-a"]
      }
    },
    runtimeSummary: {
      runtimeId: "runtime-recovery-lab",
      runtimeLabel: "SBCL Recovery Image",
      currentPackage: "SBCL-AGENT.RECOVERY",
      loadedSystemCount: 9,
      loadedSystems: ["sbcl-agent", "runtime-service", "incident-service", "workflow-service"],
      loadedSystemEntries: [
        { name: "sbcl-agent", type: "asdf-system", status: "loaded" },
        { name: "runtime-service", type: "asdf-system", status: "loaded" },
        { name: "incident-service", type: "asdf-system", status: "loaded" },
        { name: "workflow-service", type: "asdf-system", status: "loaded" }
      ],
      divergencePosture: "Runtime is in recovery mode and mutation is restricted pending evidence review.",
      sourceRelationship: "Runtime and source are intentionally held apart until reconciliation completes.",
      activeMutations: 0,
      linkedIncidentIds: ["incident-image-divergence", "incident-workflow-quarantine"],
      scopes: [
        {
          scopeId: "scope-recovery-package",
          packageName: "SBCL-AGENT.RECOVERY",
          kind: "package",
          summary: "Recovery-oriented package surface for restart and condition handling."
        },
        {
          scopeId: "scope-symbol-restart",
          packageName: "SBCL-AGENT.RECOVERY",
          symbolName: "RESTART-FAILED-MUTATION",
          kind: "symbol",
          summary: "Restart coordination for failed runtime mutation paths."
        }
      ]
    },
    approvalDetails: {},
    events: [
      {
        cursor: 2901,
        kind: "runtime.mutation.failed",
        timestamp: "2026-04-18T12:40:00Z",
        family: "runtime",
        summary: "Recovery mutation failed safely and emitted governed condition evidence.",
        entityId: "turn-recovery-1",
        visibility: "operator",
        payload: {
          operationId: "op-recovery-restart",
          artifactId: "artifact-condition-report"
        }
      },
      {
        cursor: 2902,
        kind: "incident.opened",
        timestamp: "2026-04-18T12:58:00Z",
        family: "incident",
        summary: "Image divergence entered an open recovery state.",
        entityId: "incident-image-divergence",
        visibility: "operator",
        payload: {
          severity: "critical",
          runtimeId: "runtime-recovery-lab"
        }
      },
      {
        cursor: 2903,
        kind: "workflow.quarantined",
        timestamp: "2026-04-18T13:04:00Z",
        family: "workflow",
        summary: "Recovery evidence loop was quarantined pending operator review.",
        entityId: "work-item-recovery-a",
        visibility: "team",
        payload: {
          workflowRecordId: "workflow-record-recovery-a",
          incidentIds: ["incident-image-divergence", "incident-workflow-quarantine"]
        }
      }
    ]
  }
};

export const defaultEnvironmentId = "local-dev";

export function listMockEnvironmentIds(): string[] {
  return Object.keys(environments);
}

export function createMockHostStatus(): HostStatusDto {
  return {
    hostState: "ready",
    supportedProtocolVersion: 1,
    supportedContractVersion: 1,
    hostLabel: "Local sbcl-agent Host",
    transport: "mock"
  };
}

export function queryEnvironmentSummary(
  environmentId: string
): QueryResultDto<EnvironmentSummaryDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "environment",
    operation: "environment.summary",
    kind: "query",
    status: "ok",
    data: environments[environmentId].summary,
    metadata: metadata(binding, "environment-summary")
  };
}

export function queryEnvironmentStatus(
  environmentId: string
): QueryResultDto<EnvironmentStatusDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "environment",
    operation: "environment.status",
    kind: "query",
    status: "ok",
    data: environments[environmentId].status,
    metadata: metadata(binding, "environment-status")
  };
}

export function queryThreadList(environmentId: string): QueryResultDto<ThreadSummaryDto[]> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "conversation",
    operation: "conversation.thread_list",
    kind: "query",
    status: "ok",
    data: environments[environmentId].threads,
    metadata: metadata(binding, "thread-list")
  };
}

export function queryEnvironmentEvents(
  input: EventSubscriptionInput
): QueryResultDto<EnvironmentEventDto[]> {
  const environmentId = input.environmentId ?? defaultEnvironmentId;
  const binding = { environmentId };
  const visibilityFilter = input.visibility?.length ? new Set(input.visibility) : null;
  const familyFilter = input.families?.length ? new Set(input.families) : null;

  const events = environments[environmentId].events.filter((event) => {
    if (typeof input.fromCursor === "number" && event.cursor < input.fromCursor) {
      return false;
    }

    if (familyFilter && !familyFilter.has(event.family)) {
      return false;
    }

    if (visibilityFilter && !visibilityFilter.has(event.visibility ?? "unspecified")) {
      return false;
    }

    return true;
  });

  return {
    contractVersion: 1,
    domain: "observation",
    operation: "environment.events",
    kind: "query",
    status: "ok",
    data: events,
    metadata: {
      ...metadata(binding, "environment-events"),
      eventFamily: input.families?.join(",") ?? null,
      visibility: input.visibility?.join(",") ?? null
    }
  };
}

export function queryArtifactList(environmentId: string): QueryResultDto<ArtifactSummaryDto[]> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "artifact",
    operation: "artifact.list",
    kind: "query",
    status: "ok",
    data: environments[environmentId].summary.recentArtifacts,
    metadata: metadata(binding, "artifact-list")
  };
}

export function queryArtifactDetail(
  environmentId: string,
  artifactId: string
): QueryResultDto<ArtifactDetailDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "artifact",
    operation: "artifact.detail",
    kind: "query",
    status: "ok",
    data: environments[environmentId].artifactDetails[artifactId],
    metadata: {
      ...metadata(binding, "artifact-detail"),
      workItemId: null
    }
  };
}

export function queryThreadDetail(
  environmentId: string,
  threadId: string
): QueryResultDto<ThreadDetailDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "conversation",
    operation: "conversation.thread_detail",
    kind: "query",
    status: "ok",
    data: environments[environmentId].threadDetails[threadId],
    metadata: {
      ...metadata(binding, "thread-detail"),
      threadId
    }
  };
}

export function queryTurnDetail(
  environmentId: string,
  turnId: string
): QueryResultDto<TurnDetailDto> {
  const binding = { environmentId };
  const turn = environments[environmentId].turnDetails[turnId];
  return {
    contractVersion: 1,
    domain: "conversation",
    operation: "conversation.turn_detail",
    kind: "query",
    status: "ok",
    data: turn,
    metadata: {
      ...metadata(binding, "turn-detail"),
      threadId: turn.threadId,
      turnId
    }
  };
}

export function queryRuntimeSummary(
  environmentId: string
): QueryResultDto<RuntimeSummaryDto> {
  const binding = { environmentId };
  const runtime = environments[environmentId].runtimeSummary;
  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.summary",
    kind: "query",
    status: "ok",
    data: runtime,
    metadata: {
      ...metadata(binding, "runtime-summary"),
      runtimeId: runtime.runtimeId
    }
  };
}

export function queryRuntimeInspectSymbol(input: {
  environmentId: string;
  symbol: string;
  packageName?: string;
  mode: "describe" | "definitions" | "callers" | "methods" | "divergence";
}): QueryResultDto<RuntimeInspectionResultDto> {
  const binding = { environmentId: input.environmentId };
  const runtime = environments[input.environmentId].runtimeSummary;
  const symbol = input.symbol.trim() || "UNKNOWN";
  const packageName = input.packageName ?? runtime.currentPackage;

  const result: RuntimeInspectionResultDto = {
    inspectionId: `${input.mode}:${packageName}:${symbol}`,
    mode: input.mode,
    symbol,
    packageName,
    summary: "",
    runtimePresence: null,
    divergence: null,
    items: []
  };

  switch (input.mode) {
    case "describe":
      result.summary = `${symbol} is visible from ${packageName} and can be inspected directly in the live image.`;
      result.runtimePresence = "present";
      result.items = [
        { label: "Home Package", detail: packageName, emphasis: "package" },
        { label: "Function Binding", detail: "A callable function binding is projected for this symbol.", emphasis: "fboundp" },
        { label: "Value Binding", detail: "No special value binding is currently projected.", emphasis: "boundp false" }
      ];
      break;
    case "definitions":
      result.summary = `${symbol} has source definitions that can be navigated and reconciled against the image.`;
      result.runtimePresence = "present";
      result.items = [
        {
          label: "Definition",
          detail: `src/runtime/${symbol.toLowerCase()}.lisp`,
          emphasis: "definition",
          path: `src/runtime/${symbol.toLowerCase()}.lisp`,
          line: 12
        },
        { label: "Definition Context", detail: "The source form is attached to the current live package projection.", emphasis: "source" }
      ];
      break;
    case "callers":
      result.summary = `${symbol} has runtime-relevant call sites that can be followed without leaving the environment.`;
      result.runtimePresence = "present";
      result.items = [
        {
          label: "Caller",
          detail: `src/workflows/${symbol.toLowerCase()}-workflow.lisp`,
          emphasis: "caller",
          path: `src/workflows/${symbol.toLowerCase()}-workflow.lisp`,
          line: 24
        },
        {
          label: "Caller",
          detail: `src/desktop/${symbol.toLowerCase()}-bridge.lisp`,
          emphasis: "caller",
          path: `src/desktop/${symbol.toLowerCase()}-bridge.lisp`,
          line: 38
        }
      ];
      break;
    case "methods":
      result.summary = `${symbol} exposes live method information for CLOS-oriented inspection.`;
      result.runtimePresence = "present";
      result.items = [
        { label: "Method", detail: "Specializers: (STANDARD-OBJECT T)", emphasis: "method" }
      ];
      break;
    case "divergence":
      result.summary = `${symbol} can be checked for source/image drift before trusting the current live state.`;
      result.runtimePresence = "present";
      result.divergence = "in-sync";
      result.items = [
        { label: "Divergence", detail: "Source and image are currently projected as in sync.", emphasis: "in-sync" },
        { label: "Open Mutation", detail: "No open mutation work item is currently attached to this symbol.", emphasis: null }
      ];
      break;
  }

  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.inspect_symbol",
    kind: "query",
    status: "ok",
    data: result,
    metadata: {
      ...metadata(binding, "runtime-inspector"),
      runtimeId: runtime.runtimeId
    }
  };
}

export function queryRuntimeEntityDetail(input: {
  environmentId: string;
  symbol: string;
  packageName?: string;
}): QueryResultDto<RuntimeEntityDetailDto> {
  const binding = { environmentId: input.environmentId };
  const runtime = environments[input.environmentId].runtimeSummary;
  const symbol = input.symbol.trim() || "UNKNOWN";
  const packageName = input.packageName ?? runtime.currentPackage;
  const upperSymbol = symbol.toUpperCase();

  const isGenericFunction = upperSymbol === "RUN-CONVERSATION-TURN";
  const isClass = upperSymbol === "DESKTOP-BRIDGE-STATE";

  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.entity_detail",
    kind: "query",
    status: "ok",
    data: {
      entityId: `${packageName}:${symbol}`,
      symbol,
      packageName,
      entityKind: isGenericFunction ? "generic-function" : isClass ? "class" : "function",
      signature: isGenericFunction
        ? "(run-conversation-turn thread turn provider)"
        : isClass
          ? "(defclass desktop-bridge-state ...)"
          : `(${symbol.toLowerCase()} ...)`,
      summary: isGenericFunction
        ? `${symbol} is a live generic-function surface. Method dispatch and source locations should stay visible together.`
        : isClass
          ? `${symbol} is a runtime class surface. Slots and source definitions should remain visible from the same browser pane.`
          : `${symbol} is available as a live runtime entity within ${packageName}.`,
      facets: isGenericFunction
        ? [
            { label: "Entity Kind", value: "generic-function" },
            { label: "Method Count", value: "2" },
            { label: "Definition Count", value: "1" },
            { label: "Caller Count", value: "2" },
            { label: "Primary Package", value: packageName }
          ]
        : isClass
          ? [
              { label: "Entity Kind", value: "class" },
              { label: "Direct Slots", value: "3" },
              { label: "Superclass Count", value: "1" },
              { label: "Subclass Count", value: "2" },
              { label: "Definition Count", value: "1" },
              { label: "Caller Count", value: "0" },
              { label: "Primary Package", value: packageName }
            ]
          : [
              { label: "Entity Kind", value: "function" },
              { label: "Definition Count", value: "1" },
              { label: "Caller Count", value: "2" },
              { label: "Primary Package", value: packageName }
            ],
      relatedItems: isGenericFunction
        ? [
            {
              label: "Method",
              detail: "Specializers: (THREAD TURN PROVIDER)",
              emphasis: "primary"
            },
            {
              label: "Caller",
              detail: "src/conversation/dispatch-router.lisp",
              emphasis: "line 31",
              path: "src/conversation/dispatch-router.lisp",
              line: 31
            },
            {
              label: "Definition",
              detail: "src/conversation/runtime-turns.lisp",
              emphasis: "line 48",
              path: "src/conversation/runtime-turns.lisp",
              line: 48
            }
          ]
        : isClass
          ? [
              {
                label: "Superclass",
                detail: "STANDARD-OBJECT"
              },
              {
                label: "Subclass",
                detail: "DESKTOP-SESSION-STATE"
              },
              {
                label: "Slot",
                detail: "current-thread"
              },
              {
                label: "Slot",
                detail: "selected-package"
              },
              {
                label: "Definition",
                detail: "src/desktop/bridge-state.lisp",
                emphasis: "line 12",
                path: "src/desktop/bridge-state.lisp",
                line: 12
              }
            ]
          : [
              {
                label: "Definition",
                detail: `src/runtime/${symbol.toLowerCase()}.lisp`,
                emphasis: "line 12",
                path: `src/runtime/${symbol.toLowerCase()}.lisp`,
                line: 12
              }
            ]
    },
    metadata: {
      ...metadata(binding, "runtime-entity-detail"),
      runtimeId: runtime.runtimeId
    }
  };
}

export function queryPackageBrowser(input: {
  environmentId: string;
  packageName?: string;
}): QueryResultDto<PackageBrowserDto> {
  const binding = { environmentId: input.environmentId };
  const runtime = environments[input.environmentId].runtimeSummary;
  const packageName = input.packageName ?? runtime.currentPackage;

  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.package_browser",
    kind: "query",
    status: "ok",
    data: {
      packageName,
      nicknames: packageName === runtime.currentPackage ? ["SAU"] : [],
      useList: ["COMMON-LISP"],
      externalSymbols: [
        { symbol: "START-SHELL", kind: "function", visibility: "external" },
        { symbol: "RUN-CONVERSATION-TURN", kind: "generic-function", visibility: "external" },
        { symbol: "MAKE-DEFAULT-ENVIRONMENT", kind: "function", visibility: "external" }
      ],
      internalSymbols: [
        { symbol: "CURRENT-THREAD", kind: "variable", visibility: "internal" },
        { symbol: "RUNTIME-SOURCE-ANALYSIS", kind: "function", visibility: "internal" },
        { symbol: "DESKTOP-BRIDGE-STATE", kind: "class", visibility: "internal" }
      ],
      summary: `${packageName} exposes live namespace structure for browsing exported and internal symbols.`
    },
    metadata: {
      ...metadata(binding, "package-browser"),
      runtimeId: runtime.runtimeId
    }
  };
}

export function querySourcePreview(input: {
  environmentId: string;
  path: string;
  line?: number;
  contextRadius?: number;
}): QueryResultDto<SourcePreviewDto> {
  const binding = { environmentId: input.environmentId };
  const focusLine = input.line ?? 12;
  const startLine = Math.max(1, focusLine - (input.contextRadius ?? 4));
  const endLine = focusLine + (input.contextRadius ?? 4);

  return {
    contractVersion: 1,
    domain: "source",
    operation: "source.preview",
    kind: "query",
    status: "ok",
    data: {
      path: input.path,
      language: "lisp",
      focusLine,
      startLine,
      endLine,
      summary: `Live source preview for ${input.path}.`,
      content: [
        ";;; Source preview",
        `(in-package #:sbcl-agent-user)`,
        "",
        `(defun ${input.path.split("/").pop()?.replace(".lisp", "") ?? "example"} ()`,
        `  ;; Mock source preview used for desktop browser development.`,
        `  (format t "Focused line ~D~%" ${focusLine}))`
      ].join("\n"),
      editableContent: [
        ";;; Mock source edit buffer",
        `(in-package #:sbcl-agent-user)`,
        "",
        `(defun ${input.path.split("/").pop()?.replace(".lisp", "") ?? "example"} ()`,
        `  ;; Mock source preview used for desktop browser development.`,
        `  (format t "Focused line ~D~%" ${focusLine}))`
      ].join("\n")
    },
    metadata: {
      ...metadata(binding, "source-preview")
    }
  };
}

export function commandStageSourceChange(input: {
  environmentId: string;
  path: string;
  content: string;
}): CommandResultDto<SourceMutationResultDto> {
  const binding = { environmentId: input.environmentId };

  return {
    contractVersion: 1,
    domain: "source",
    operation: "source.stage_change",
    kind: "command",
    status: "awaiting_approval",
    data: {
      path: input.path,
      summary: "Source change prepared and is waiting for workspace-write approval.",
      bytesWritten: input.content.length,
      artifactIds: ["artifact-transport-spec"],
      approvalId: "approval-binding-shift",
      workItemId: "work-item-host-binding"
    },
    metadata: {
      ...metadata(binding, "source-mutation"),
      policyId: "workspace-write",
      workItemId: "work-item-host-binding"
    }
  };
}

export function commandReloadSourceFile(input: {
  environmentId: string;
  path: string;
}): CommandResultDto<SourceReloadResultDto> {
  const binding = { environmentId: input.environmentId };
  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.reload_file",
    kind: "command",
    status: "awaiting_approval",
    data: {
      path: input.path,
      summary: "Runtime reload prepared and is waiting for runtime-reload approval.",
      artifactIds: ["artifact-runtime-audit"],
      approvalId: "approval-binding-shift",
      incidentId: null,
      workItemId: "work-item-runtime-audit"
    },
    metadata: {
      ...metadata(binding, "runtime-reload"),
      policyId: "runtime-reload",
      workItemId: "work-item-runtime-audit"
    }
  };
}

export function commandEvaluateInContext(input: {
  environmentId: string;
  form: string;
  packageName?: string;
}): CommandResultDto<RuntimeEvalResultDto> {
  const binding = { environmentId: input.environmentId };
  const normalized = input.form.trim();

  if (normalized.includes("persist-binding")) {
    return {
      contractVersion: 1,
      domain: "runtime",
      operation: "runtime.eval",
      kind: "command",
      status: "awaiting_approval",
      data: {
        evaluationId: "eval-awaiting-approval",
        outcome: "awaiting_approval",
        summary: "Evaluation prepared a governed mutation that requires approval before persistence.",
        valuePreview: null,
        operationId: "op-persist-binding",
        artifactIds: ["artifact-transport-spec"],
        approvalId: "approval-binding-shift",
        incidentId: null
      },
      metadata: {
        ...metadata(binding, "runtime-eval"),
        runtimeId: environments[input.environmentId].runtimeSummary.runtimeId,
        policyId: "policy-binding-persistence"
      }
    };
  }

  if (normalized.includes("fail") || normalized.includes("error")) {
    return {
      contractVersion: 1,
      domain: "runtime",
      operation: "runtime.eval",
      kind: "command",
      status: "error",
      data: {
        evaluationId: "eval-failed",
        outcome: "failed",
        summary: "Evaluation failed safely and emitted an incident-linked result.",
        valuePreview: "Condition: runtime mutation failed under guarded execution.",
        operationId: "op-runtime-eval-failed",
        artifactIds: ["artifact-runtime-audit"],
        approvalId: null,
        incidentId: environments[input.environmentId].runtimeSummary.linkedIncidentIds[0] ?? null
      },
      metadata: {
        ...metadata(binding, "runtime-eval"),
        runtimeId: environments[input.environmentId].runtimeSummary.runtimeId,
        incidentId: environments[input.environmentId].runtimeSummary.linkedIncidentIds[0] ?? null
      }
    };
  }

  return {
    contractVersion: 1,
    domain: "runtime",
    operation: "runtime.eval",
    kind: "command",
    status: "ok",
    data: {
      evaluationId: "eval-ok",
      outcome: "ok",
      summary: "Evaluation completed normally inside the governed runtime context.",
      valuePreview: "#<RESULT ok>",
      operationId: "op-runtime-eval-ok",
      artifactIds: [],
      approvalId: null,
      incidentId: null
    },
    metadata: {
      ...metadata(binding, "runtime-eval"),
      runtimeId: environments[input.environmentId].runtimeSummary.runtimeId
    }
  };
}

export function queryApprovalRequestList(
  environmentId: string
): QueryResultDto<ApprovalRequestSummaryDto[]> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "approval",
    operation: "approval.request_list",
    kind: "query",
    status: "ok",
    data: environments[environmentId].approvals,
    metadata: metadata(binding, "approval-list")
  };
}

export function queryApprovalRequestDetail(
  environmentId: string,
  requestId: string
): QueryResultDto<ApprovalRequestDto> {
  const binding = { environmentId };
  const detail = environments[environmentId].approvalDetails[requestId];
  return {
    contractVersion: 1,
    domain: "approval",
    operation: "approval.request_detail",
    kind: "query",
    status: "ok",
    data: detail,
    metadata: {
      ...metadata(binding, "approval-detail"),
      policyId: detail?.policyId ?? null
    }
  };
}

export function queryIncidentList(environmentId: string): QueryResultDto<IncidentSummaryDto[]> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "incident",
    operation: "incident.list",
    kind: "query",
    status: "ok",
    data: environments[environmentId].summary.incidents,
    metadata: metadata(binding, "incident-list")
  };
}

export function queryIncidentDetail(
  environmentId: string,
  incidentId: string
): QueryResultDto<IncidentDetailDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "incident",
    operation: "incident.detail",
    kind: "query",
    status: "ok",
    data: environments[environmentId].incidentDetails[incidentId],
    metadata: {
      ...metadata(binding, "incident-detail"),
      incidentId
    }
  };
}

export function queryWorkItemList(environmentId: string): QueryResultDto<WorkItemSummaryDto[]> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "workflow",
    operation: "work_item.list",
    kind: "query",
    status: "ok",
    data: environments[environmentId].workItems,
    metadata: metadata(binding, "work-item-list")
  };
}

export function queryWorkItemDetail(
  environmentId: string,
  workItemId: string
): QueryResultDto<WorkItemDetailDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "workflow",
    operation: "work_item.detail",
    kind: "query",
    status: "ok",
    data: environments[environmentId].workItemDetails[workItemId],
    metadata: {
      ...metadata(binding, "work-item-detail"),
      workItemId
    }
  };
}

export function queryWorkflowRecordDetail(
  environmentId: string,
  workflowRecordId: string
): QueryResultDto<WorkflowRecordDto> {
  const binding = { environmentId };
  return {
    contractVersion: 1,
    domain: "workflow",
    operation: "workflow.record_detail",
    kind: "query",
    status: "ok",
    data: environments[environmentId].workflowRecords[workflowRecordId],
    metadata: {
      ...metadata(binding, "workflow-record-detail"),
      workflowRecordId
    }
  };
}

export function commandApproveRequest(input: {
  environmentId: string;
  requestId: string;
}): CommandResultDto<ApprovalDecisionDto> {
  const binding = { environmentId: input.environmentId };
  const request = environments[input.environmentId].approvalDetails[input.requestId];
  if (request) {
    request.state = "approved";
  }
  environments[input.environmentId].approvals = environments[input.environmentId].approvals.map((approval) =>
    approval.requestId === input.requestId ? { ...approval, state: "approved" } : approval
  );

  return {
    contractVersion: 1,
    domain: "approval",
    operation: "approval.approve",
    kind: "command",
    status: "ok",
    data: {
      requestId: input.requestId,
      decision: "approved",
      summary: "Approval granted. Governed work may resume.",
      resumedEntityIds: ["op-persist-binding", "task-host-binding"]
    },
    metadata: {
      ...metadata(binding, "approval-decision"),
      policyId: request?.policyId ?? null
    }
  };
}

export function commandDenyRequest(input: {
  environmentId: string;
  requestId: string;
}): CommandResultDto<ApprovalDecisionDto> {
  const binding = { environmentId: input.environmentId };
  const request = environments[input.environmentId].approvalDetails[input.requestId];
  if (request) {
    request.state = "denied";
  }
  environments[input.environmentId].approvals = environments[input.environmentId].approvals.map((approval) =>
    approval.requestId === input.requestId ? { ...approval, state: "denied" } : approval
  );

  return {
    contractVersion: 1,
    domain: "approval",
    operation: "approval.deny",
    kind: "command",
    status: "ok",
    data: {
      requestId: input.requestId,
      decision: "denied",
      summary: "Approval denied. The governed mutation remains blocked.",
      resumedEntityIds: []
    },
    metadata: {
      ...metadata(binding, "approval-decision"),
      policyId: request?.policyId ?? null
    }
  };
}

export function hasEnvironment(environmentId: string): boolean {
  return environmentId in environments;
}
