import type {
  ApprovalDecisionDto,
  ApprovalDecisionInput,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  CommandResultDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  QueryResultDto,
  UpdateIncidentRemediationPlanInput
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface IncidentServiceDependencies {
  invokeService: InvokeService;
  asStringArray: (value: unknown) => string[];
  camelizeKeys: (value: unknown) => unknown;
  asRecord: (value: unknown) => Record<string, unknown>;
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => CommandResultDto<ApprovalDecisionDto>["metadata"];
  adaptApprovalListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<ApprovalRequestSummaryDto[]>;
  adaptApprovalDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ApprovalRequestDto>;
  adaptIncidentListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<IncidentSummaryDto[]>;
  adaptIncidentDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<IncidentDetailDto>;
}

export class LiveIncidentService {
  constructor(private readonly dependencies: IncidentServiceDependencies) {}

  async approvalRequestList(
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestSummaryDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "approval.list",
      environmentId
    );
    return this.dependencies.adaptApprovalListResponse(response);
  }

  async approvalRequestDetail(
    requestId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ApprovalRequestDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "approval.detail",
      environmentId,
      { requestId }
    );
    return this.dependencies.adaptApprovalDetailResponse(response);
  }

  async approveRequest(
    input: ApprovalDecisionInput
  ): Promise<CommandResultDto<ApprovalDecisionDto>> {
    const orchestrationFocusResponse = await this.dependencies.invokeService<
      RawServiceResponse<Record<string, unknown>>
    >(
      "planning/orchestration-focus",
      input.environmentId,
      { workItemId: input.requestId }
    );
    const orchestrationFocus = (
      orchestrationFocusResponse.status === "error"
        ? null
        : this.dependencies.camelizeKeys(
            this.dependencies.asRecord(orchestrationFocusResponse.data)
          )
    ) as Record<string, unknown> | null;
    const approvalId =
      typeof orchestrationFocus?.approvalId === "string"
        ? orchestrationFocus.approvalId
        : Array.isArray(orchestrationFocus?.approvalIds) &&
            typeof orchestrationFocus.approvalIds[0] === "string"
          ? orchestrationFocus.approvalIds[0]
          : null;
    const actorMessageId =
      typeof orchestrationFocus?.actorMessageId === "string"
        ? orchestrationFocus.actorMessageId
        : Array.isArray(orchestrationFocus?.actorMessageIds) &&
            typeof orchestrationFocus.actorMessageIds[0] === "string"
          ? orchestrationFocus.actorMessageIds[0]
          : null;
    const sessionId =
      typeof orchestrationFocus?.sessionId === "string" ? orchestrationFocus.sessionId : null;

    const response = approvalId
      ? await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
          "desktop-task.approve-approval",
          input.environmentId,
          { approvalId, sessionId }
        )
      : actorMessageId
        ? await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
            "desktop-task.approve-message",
            input.environmentId,
            { actorMessageId }
          )
        : await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
            "approval.approve",
            input.environmentId,
            { requestId: input.requestId }
          );

    return {
      contractVersion: response.contractVersion,
      domain: "approval",
      operation: response.operation,
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: {
        requestId: String(response.data.requestId ?? input.requestId),
        decision: "approved",
        summary: String(
          response.data.summary ?? "Approval granted. Governed work resumed in the live environment."
        ),
        resumedEntityIds: this.dependencies.asStringArray(response.data.resumedEntityIds)
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async denyRequest(input: ApprovalDecisionInput): Promise<CommandResultDto<ApprovalDecisionDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "approval.deny",
      input.environmentId,
      { requestId: input.requestId }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "approval",
      operation: "approval.deny",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: {
        requestId: String(response.data.requestId ?? input.requestId),
        decision: "denied",
        summary: String(
          response.data.summary ??
            "Approval denied. The governed work item has been moved into operator review."
        ),
        resumedEntityIds: this.dependencies.asStringArray(response.data.resumedEntityIds)
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async incidentList(environmentId?: string): Promise<QueryResultDto<IncidentSummaryDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "incident.list",
      environmentId
    );
    return this.dependencies.adaptIncidentListResponse(response);
  }

  async incidentDetail(
    incidentId: string,
    environmentId?: string
  ): Promise<QueryResultDto<IncidentDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "incident.detail",
      environmentId,
      { incidentId }
    );
    return this.dependencies.adaptIncidentDetailResponse(response);
  }

  async updateIncidentRemediationPlan(
    input: UpdateIncidentRemediationPlanInput
  ): Promise<CommandResultDto<IncidentDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "incident.set-remediation-plan",
      input.environmentId,
      {
        incidentId: input.incidentId,
        remediationPlan: input.remediationPlan
      }
    );
    const adapted = this.dependencies.adaptIncidentDetailResponse(response);
    return {
      ...adapted,
      kind: "command",
      status: response.status === "error" ? "error" : "ok"
    };
  }
}
