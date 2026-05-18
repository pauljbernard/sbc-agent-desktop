import type {
  AppendProjectArchitectureDecisionInput,
  AppendProjectFeatureSpecificationInput,
  AppendProjectQualityGateInput,
  AppendProjectRequirementInput,
  AppendProjectSourceRootInput,
  AppendProjectUserJourneyInput,
  BindProjectTestingHarnessInput,
  CommandResultDto,
  CompleteWorkItemValidationsInput,
  CreateIntentInput,
  CreateProjectInput,
  IntentDetailDto,
  ProjectDetailDto,
  ProjectListDto,
  ProjectTestingHarnessDto,
  QueryResultDto,
  QuarantineWorkItemInput,
  ResumeWorkItemInput,
  RollbackWorkItemInput,
  SteerWorkItemInput,
  UpdateProjectConstitutionInput,
  UpdateProjectDesignSystemInput,
  UpdateProjectReadinessObligationsInput,
  UpdateProjectReleaseReadinessInput,
  UpdateProjectStyleGuideInput,
  UpdateProjectTestingStrategyInput,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkflowRecordDto
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface WorkflowServiceDependencies {
  invokeService: InvokeService;
  asRecord: (value: unknown) => Record<string, unknown>;
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => CommandResultDto<ProjectDetailDto>["metadata"];
  adaptIntentDetail: (item: Record<string, unknown>) => IntentDetailDto | null;
  adaptCreateProjectResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<ProjectDetailDto>;
  adaptWorkItemDetailCommandResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<WorkItemDetailDto>;
  adaptProjectListResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ProjectListDto>;
  adaptProjectTestingHarness: (item: Record<string, unknown>) => ProjectTestingHarnessDto;
  adaptProjectDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ProjectDetailDto>;
  adaptWorkItemListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<WorkItemSummaryDto[]>;
  adaptWorkItemDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<WorkItemDetailDto>;
  adaptWorkItemPlanResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<WorkItemPlanDto>;
  adaptWorkflowRecordDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<WorkflowRecordDto>;
}

export class LiveWorkflowService {
  constructor(private readonly dependencies: WorkflowServiceDependencies) {}

  async createIntent(input: CreateIntentInput): Promise<CommandResultDto<IntentDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "intent.create",
      input.environmentId,
      {
        description: input.description,
        scope: input.scope,
        constraints: input.constraints,
        expectedBehaviors: input.expectedBehaviors,
        nonGoals: input.nonGoals,
        priority: input.priority,
        version: input.version,
        status: input.status,
        linkedRuntimeObjects: input.linkedRuntimeObjects,
        linkedSourceArtifacts: input.linkedSourceArtifacts,
        linkedEventIds: input.linkedEventIds,
        linkedMutationIds: input.linkedMutationIds,
        metadata: input.metadata
      }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "intent",
      operation: "intent.create",
      kind: "command",
      status: response.status === "error" ? "error" : "ok",
      data: this.dependencies.adaptIntentDetail(this.dependencies.asRecord(response.data)) ?? {
        id: "",
        description: input.description,
        status: input.status ?? "active",
        priority: input.priority ?? null,
        version: input.version ?? 1,
        scopeSummary: null,
        linkedRuntimeObjectCount: 0,
        linkedSourceArtifactCount: 0,
        linkedEventCount: 0,
        linkedMutationCount: 0,
        createdAt: null,
        updatedAt: null,
        scope: input.scope ?? null,
        constraints: input.constraints ?? [],
        expectedBehaviors: input.expectedBehaviors ?? [],
        nonGoals: input.nonGoals ?? [],
        linkedRuntimeObjects: input.linkedRuntimeObjects ?? [],
        linkedSourceArtifacts: input.linkedSourceArtifacts ?? [],
        linkedEventIds: input.linkedEventIds ?? [],
        linkedMutationIds: input.linkedMutationIds ?? [],
        metadata: input.metadata ?? null,
        current: true,
        diff: null
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async createProject(input: CreateProjectInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.create",
      input.environmentId,
      {
        title: input.title,
        summary: input.summary
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectConstitution(input: UpdateProjectConstitutionInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-constitution",
      input.environmentId,
      {
        projectId: input.projectId,
        constitution: input.constitution
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectDesignSystem(input: UpdateProjectDesignSystemInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-design-system",
      input.environmentId,
      {
        projectId: input.projectId,
        designSystem: input.designSystem
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectStyleGuide(input: UpdateProjectStyleGuideInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-style-guide",
      input.environmentId,
      {
        projectId: input.projectId,
        styleGuide: input.styleGuide
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectTestingStrategy(input: UpdateProjectTestingStrategyInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-testing-strategy",
      input.environmentId,
      {
        projectId: input.projectId,
        testingStrategy: input.testingStrategy
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectReleaseReadiness(input: UpdateProjectReleaseReadinessInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-release-readiness",
      input.environmentId,
      {
        projectId: input.projectId,
        releaseReadiness: input.releaseReadiness
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async updateProjectReadinessObligations(input: UpdateProjectReadinessObligationsInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.set-readiness-obligations",
      input.environmentId,
      {
        projectId: input.projectId,
        readinessObligations: input.readinessObligations
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectRequirement(input: AppendProjectRequirementInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-requirement",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        scope: input.scope,
        kind: input.kind,
        priority: input.priority,
        status: input.status,
        verificationKind: input.verificationKind,
        linkedArtifactIds: input.linkedArtifactIds,
        nonFunctional: input.nonFunctional
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectFeatureSpecification(input: AppendProjectFeatureSpecificationInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-feature-specification",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        acceptanceCriteria: input.acceptanceCriteria,
        linkedRequirementIds: input.linkedRequirementIds,
        linkedJourneyIds: input.linkedJourneyIds
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectUserJourney(input: AppendProjectUserJourneyInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-user-journey",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        actors: input.actors,
        entrypoints: input.entrypoints,
        steps: input.steps,
        outcomes: input.outcomes,
        edgeCases: input.edgeCases
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectArchitectureDecision(input: AppendProjectArchitectureDecisionInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-architecture-decision",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        drivers: input.drivers,
        consequences: input.consequences,
        stackChoices: input.stackChoices,
        linkedRequirementIds: input.linkedRequirementIds
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectSourceRoot(input: AppendProjectSourceRootInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-source-root",
      input.environmentId,
      {
        projectId: input.projectId,
        sourceRoot: input.sourceRoot
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async bindProjectTestingHarness(input: BindProjectTestingHarnessInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.bind-testing-harness",
      input.environmentId,
      {
        projectId: input.projectId,
        harnessId: input.harnessId
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async appendProjectQualityGate(input: AppendProjectQualityGateInput): Promise<CommandResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.append-quality-gate",
      input.environmentId,
      {
        projectId: input.projectId,
        id: input.id,
        title: input.title,
        summary: input.summary,
        status: input.status,
        requiredHarnessIds: input.requiredHarnessIds,
        minimumLinkedWorkItems: input.minimumLinkedWorkItems,
        minimumLinkedIncidents: input.minimumLinkedIncidents,
        requireSourceRoots: input.requireSourceRoots,
        requiredTraceTargetKinds: input.requiredTraceTargetKinds,
        maximumFailedTests: input.maximumFailedTests,
        requireCoverage: input.requireCoverage,
        maximumSayTurnLatencySeconds: input.maximumSayTurnLatencySeconds,
        maximumEnvironmentSaveLoadSeconds: input.maximumEnvironmentSaveLoadSeconds,
        requireRecoveryReady: input.requireRecoveryReady
      }
    );
    return this.dependencies.adaptCreateProjectResponse(response);
  }

  async resumeWorkItem(input: ResumeWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.resume",
      input.environmentId,
      {
        workItemId: input.workItemId,
        note: input.note
      }
    );
    return this.dependencies.adaptWorkItemDetailCommandResponse(response);
  }

  async quarantineWorkItem(input: QuarantineWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.quarantine",
      input.environmentId,
      {
        workItemId: input.workItemId,
        reason: input.reason
      }
    );
    return this.dependencies.adaptWorkItemDetailCommandResponse(response);
  }

  async rollbackWorkItem(input: RollbackWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.rollback",
      input.environmentId,
      {
        workItemId: input.workItemId,
        reason: input.reason,
        note: input.note
      }
    );
    return this.dependencies.adaptWorkItemDetailCommandResponse(response);
  }

  async completeWorkItemValidations(input: CompleteWorkItemValidationsInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.complete-validations",
      input.environmentId,
      {
        workItemId: input.workItemId,
        status: input.status
      }
    );
    return this.dependencies.adaptWorkItemDetailCommandResponse(response);
  }

  async steerWorkItem(input: SteerWorkItemInput): Promise<CommandResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.steer",
      input.environmentId,
      {
        workItemId: input.workItemId,
        phase: input.phase,
        nextStep: input.nextStep,
        note: input.note
      }
    );
    return this.dependencies.adaptWorkItemDetailCommandResponse(response);
  }

  async projectList(environmentId?: string): Promise<QueryResultDto<ProjectListDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.list",
      environmentId
    );
    return this.dependencies.adaptProjectListResponse(response);
  }

  async projectTestingHarnessInventory(environmentId?: string): Promise<QueryResultDto<ProjectTestingHarnessDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>[]>>(
      "project.testing-harness-inventory",
      environmentId
    );
    return {
      contractVersion: response.contractVersion ?? 1,
      domain: String(response.domain ?? "project"),
      operation: String(response.operation ?? "testing-harness-inventory"),
      kind: "query",
      status: String(response.status ?? "ok") as "ok" | "error",
      data: Array.isArray(response.data) ? response.data.map(this.dependencies.adaptProjectTestingHarness) : [],
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async projectDetail(projectId: string, environmentId?: string): Promise<QueryResultDto<ProjectDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "project.detail",
      environmentId,
      { projectId }
    );
    return this.dependencies.adaptProjectDetailResponse(response);
  }

  async workItemList(environmentId?: string): Promise<QueryResultDto<WorkItemSummaryDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "work-item.list",
      environmentId
    );
    return this.dependencies.adaptWorkItemListResponse(response);
  }

  async workItemDetail(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.detail",
      environmentId,
      { workItemId }
    );
    return this.dependencies.adaptWorkItemDetailResponse(response);
  }

  async workItemPlan(workItemId: string, environmentId?: string): Promise<QueryResultDto<WorkItemPlanDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "work-item.plan",
      environmentId,
      { workItemId }
    );
    return this.dependencies.adaptWorkItemPlanResponse(response);
  }

  async workflowRecordDetail(workflowRecordId: string, environmentId?: string): Promise<QueryResultDto<WorkflowRecordDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "workflow.record-detail",
      environmentId,
      { workflowRecordId }
    );
    return this.dependencies.adaptWorkflowRecordDetailResponse(response);
  }
}
