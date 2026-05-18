import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  FileSystemDirectoryListingDto,
  IncidentRemediationPlanDto,
  MemoryListDto,
  ProjectDetailDto,
  ProjectListDto,
  ProjectProfileDto,
  ProjectTestingHarnessDto,
  QueryResultDto,
  ReplSessionProfileDto
} from "../../shared/contracts";

export interface ProjectTestingStrategySuiteExpectationDraft {
  harnessId: string;
  purpose: string;
  evidenceKindsDraft: string;
}

function blankProjectTestingStrategySuiteExpectationDraft(): ProjectTestingStrategySuiteExpectationDraft {
  return {
    harnessId: "",
    purpose: "",
    evidenceKindsDraft: ""
  };
}

export interface ProjectReadinessObligationDraft {
  obligationId: string;
  title: string;
  summary: string;
  status: string;
  owner: string;
  dueWindow: string;
  blocking: boolean;
  evidenceKindsDraft: string;
}

function blankProjectReadinessObligationDraft(): ProjectReadinessObligationDraft {
  return {
    obligationId: "",
    title: "",
    summary: "",
    status: "blocked",
    owner: "",
    dueWindow: "",
    blocking: true,
    evidenceKindsDraft: ""
  };
}

export interface ProjectWorkspaceState {
  projects: ProjectProfileDto[];
  setProjects: Dispatch<SetStateAction<ProjectProfileDto[]>>;
  currentProjectId: string | null;
  setCurrentProjectId: Dispatch<SetStateAction<string | null>>;
  projectListResult: QueryResultDto<ProjectListDto> | null;
  setProjectListResult: Dispatch<SetStateAction<QueryResultDto<ProjectListDto> | null>>;
  memoryListResult: QueryResultDto<MemoryListDto> | null;
  setMemoryListResult: Dispatch<SetStateAction<QueryResultDto<MemoryListDto> | null>>;
  selectedMemoryId: string | null;
  setSelectedMemoryId: Dispatch<SetStateAction<string | null>>;
  pendingUpdateMemoryId: string | null;
  setPendingUpdateMemoryId: Dispatch<SetStateAction<string | null>>;
  pendingDeleteMemoryId: string | null;
  setPendingDeleteMemoryId: Dispatch<SetStateAction<string | null>>;
  selectedGovernedProjectId: string | null;
  setSelectedGovernedProjectId: Dispatch<SetStateAction<string | null>>;
  selectedProjectDetail: ProjectDetailDto | null;
  setSelectedProjectDetail: Dispatch<SetStateAction<ProjectDetailDto | null>>;
  selectedConversationThreadByProject: Record<string, string>;
  setSelectedConversationThreadByProject: Dispatch<SetStateAction<Record<string, string>>>;
  replSessionsByProject: Record<string, ReplSessionProfileDto[]>;
  setReplSessionsByProject: Dispatch<SetStateAction<Record<string, ReplSessionProfileDto[]>>>;
  currentReplSessionIdByProject: Record<string, string>;
  setCurrentReplSessionIdByProject: Dispatch<SetStateAction<Record<string, string>>>;
  isProjectOpenDialogOpen: boolean;
  setIsProjectOpenDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectCreateDialogOpen: boolean;
  setIsProjectCreateDialogOpen: Dispatch<SetStateAction<boolean>>;
  isEditorSourceFileDialogOpen: boolean;
  setIsEditorSourceFileDialogOpen: Dispatch<SetStateAction<boolean>>;
  isEditorSourceFileSaveDialogOpen: boolean;
  setIsEditorSourceFileSaveDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectConstitutionDialogOpen: boolean;
  setIsProjectConstitutionDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectRequirementDialogOpen: boolean;
  setIsProjectRequirementDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectFeatureSpecificationDialogOpen: boolean;
  setIsProjectFeatureSpecificationDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectUserJourneyDialogOpen: boolean;
  setIsProjectUserJourneyDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectArchitectureDecisionDialogOpen: boolean;
  setIsProjectArchitectureDecisionDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectDesignSystemDialogOpen: boolean;
  setIsProjectDesignSystemDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectStyleGuideDialogOpen: boolean;
  setIsProjectStyleGuideDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectTestingStrategyDialogOpen: boolean;
  setIsProjectTestingStrategyDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectReleaseReadinessDialogOpen: boolean;
  setIsProjectReleaseReadinessDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectReadinessObligationsDialogOpen: boolean;
  setIsProjectReadinessObligationsDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectSourceRootDialogOpen: boolean;
  setIsProjectSourceRootDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectTestingHarnessDialogOpen: boolean;
  setIsProjectTestingHarnessDialogOpen: Dispatch<SetStateAction<boolean>>;
  isProjectQualityGateDialogOpen: boolean;
  setIsProjectQualityGateDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkItemSteerDialogOpen: boolean;
  setIsWorkItemSteerDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkItemResumeDialogOpen: boolean;
  setIsWorkItemResumeDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkItemQuarantineDialogOpen: boolean;
  setIsWorkItemQuarantineDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkItemRollbackDialogOpen: boolean;
  setIsWorkItemRollbackDialogOpen: Dispatch<SetStateAction<boolean>>;
  isWorkItemValidationDialogOpen: boolean;
  setIsWorkItemValidationDialogOpen: Dispatch<SetStateAction<boolean>>;
  isIncidentRemediationPlanDialogOpen: boolean;
  setIsIncidentRemediationPlanDialogOpen: Dispatch<SetStateAction<boolean>>;
  newProjectTitleDraft: string;
  setNewProjectTitleDraft: Dispatch<SetStateAction<string>>;
  editorSourceFilePathDraft: string;
  setEditorSourceFilePathDraft: Dispatch<SetStateAction<string>>;
  editorSourceDirectoryPathDraft: string;
  setEditorSourceDirectoryPathDraft: Dispatch<SetStateAction<string>>;
  editorSourceDirectoryListing: FileSystemDirectoryListingDto | null;
  setEditorSourceDirectoryListing: Dispatch<SetStateAction<FileSystemDirectoryListingDto | null>>;
  editorSourceSaveFileNameDraft: string;
  setEditorSourceSaveFileNameDraft: Dispatch<SetStateAction<string>>;
  editorSourceSaveDirectoryPathDraft: string;
  setEditorSourceSaveDirectoryPathDraft: Dispatch<SetStateAction<string>>;
  editorSourceSaveDirectoryListing: FileSystemDirectoryListingDto | null;
  setEditorSourceSaveDirectoryListing: Dispatch<SetStateAction<FileSystemDirectoryListingDto | null>>;
  projectConstitutionDraft: string;
  setProjectConstitutionDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessStageDraft: string;
  setProjectReleaseReadinessStageDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessSignoffStatusDraft: string;
  setProjectReleaseReadinessSignoffStatusDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessTargetWindowDraft: string;
  setProjectReleaseReadinessTargetWindowDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessRequiredApproversDraft: string;
  setProjectReleaseReadinessRequiredApproversDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessObservationPlanDraft: string;
  setProjectReleaseReadinessObservationPlanDraft: Dispatch<SetStateAction<string>>;
  projectReleaseReadinessOpenRisksDraft: string;
  setProjectReleaseReadinessOpenRisksDraft: Dispatch<SetStateAction<string>>;
  projectReadinessObligationsDraft: ProjectReadinessObligationDraft[];
  setProjectReadinessObligationsDraft: Dispatch<SetStateAction<ProjectReadinessObligationDraft[]>>;
  projectRequirementTitleDraft: string;
  setProjectRequirementTitleDraft: Dispatch<SetStateAction<string>>;
  projectRequirementSummaryDraft: string;
  setProjectRequirementSummaryDraft: Dispatch<SetStateAction<string>>;
  projectRequirementPriorityDraft: string;
  setProjectRequirementPriorityDraft: Dispatch<SetStateAction<string>>;
  projectRequirementStatusDraft: string;
  setProjectRequirementStatusDraft: Dispatch<SetStateAction<string>>;
  projectFeatureSpecificationTitleDraft: string;
  setProjectFeatureSpecificationTitleDraft: Dispatch<SetStateAction<string>>;
  projectFeatureSpecificationSummaryDraft: string;
  setProjectFeatureSpecificationSummaryDraft: Dispatch<SetStateAction<string>>;
  projectFeatureSpecificationAcceptanceCriteriaDraft: string;
  setProjectFeatureSpecificationAcceptanceCriteriaDraft: Dispatch<SetStateAction<string>>;
  projectFeatureSpecificationStatusDraft: string;
  setProjectFeatureSpecificationStatusDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyTitleDraft: string;
  setProjectUserJourneyTitleDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneySummaryDraft: string;
  setProjectUserJourneySummaryDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyActorsDraft: string;
  setProjectUserJourneyActorsDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyEntrypointsDraft: string;
  setProjectUserJourneyEntrypointsDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyStepsDraft: string;
  setProjectUserJourneyStepsDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyOutcomesDraft: string;
  setProjectUserJourneyOutcomesDraft: Dispatch<SetStateAction<string>>;
  projectUserJourneyEdgeCasesDraft: string;
  setProjectUserJourneyEdgeCasesDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionTitleDraft: string;
  setProjectArchitectureDecisionTitleDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionSummaryDraft: string;
  setProjectArchitectureDecisionSummaryDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionStatusDraft: string;
  setProjectArchitectureDecisionStatusDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionDriversDraft: string;
  setProjectArchitectureDecisionDriversDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionConsequencesDraft: string;
  setProjectArchitectureDecisionConsequencesDraft: Dispatch<SetStateAction<string>>;
  projectArchitectureDecisionStackChoicesDraft: string;
  setProjectArchitectureDecisionStackChoicesDraft: Dispatch<SetStateAction<string>>;
  projectDesignSystemDraft: string;
  setProjectDesignSystemDraft: Dispatch<SetStateAction<string>>;
  projectStyleGuideDraft: string;
  setProjectStyleGuideDraft: Dispatch<SetStateAction<string>>;
  projectTestingStrategyRequiredEvidenceDraft: string;
  setProjectTestingStrategyRequiredEvidenceDraft: Dispatch<SetStateAction<string>>;
  projectTestingStrategySuiteExpectationsDraft: ProjectTestingStrategySuiteExpectationDraft[];
  setProjectTestingStrategySuiteExpectationsDraft: Dispatch<SetStateAction<ProjectTestingStrategySuiteExpectationDraft[]>>;
  projectTestingStrategyMaximumFailedTestsDraft: string;
  setProjectTestingStrategyMaximumFailedTestsDraft: Dispatch<SetStateAction<string>>;
  projectTestingStrategyMaximumSayTurnLatencySecondsDraft: string;
  setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft: Dispatch<SetStateAction<string>>;
  projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft: string;
  setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft: Dispatch<SetStateAction<string>>;
  projectTestingStrategyRequireCoverageDraft: boolean;
  setProjectTestingStrategyRequireCoverageDraft: Dispatch<SetStateAction<boolean>>;
  projectTestingStrategyRequireRecoveryReadyDraft: boolean;
  setProjectTestingStrategyRequireRecoveryReadyDraft: Dispatch<SetStateAction<boolean>>;
  projectSourceRootDraft: string;
  setProjectSourceRootDraft: Dispatch<SetStateAction<string>>;
  projectTestingHarnessIdDraft: string;
  setProjectTestingHarnessIdDraft: Dispatch<SetStateAction<string>>;
  projectTestingHarnessInventory: ProjectTestingHarnessDto[];
  setProjectTestingHarnessInventory: Dispatch<SetStateAction<ProjectTestingHarnessDto[]>>;
  projectQualityGateTitleDraft: string;
  setProjectQualityGateTitleDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateSummaryDraft: string;
  setProjectQualityGateSummaryDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateStatusDraft: string;
  setProjectQualityGateStatusDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateRequiredHarnessIdsDraft: string;
  setProjectQualityGateRequiredHarnessIdsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateMinimumLinkedWorkItemsDraft: string;
  setProjectQualityGateMinimumLinkedWorkItemsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateMinimumLinkedIncidentsDraft: string;
  setProjectQualityGateMinimumLinkedIncidentsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateMaximumFailedTestsDraft: string;
  setProjectQualityGateMaximumFailedTestsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateMaximumSayTurnLatencySecondsDraft: string;
  setProjectQualityGateMaximumSayTurnLatencySecondsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft: string;
  setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft: Dispatch<SetStateAction<string>>;
  projectQualityGateRequireSourceRootsDraft: boolean;
  setProjectQualityGateRequireSourceRootsDraft: Dispatch<SetStateAction<boolean>>;
  projectQualityGateRequireCoverageDraft: boolean;
  setProjectQualityGateRequireCoverageDraft: Dispatch<SetStateAction<boolean>>;
  projectQualityGateRequireRecoveryReadyDraft: boolean;
  setProjectQualityGateRequireRecoveryReadyDraft: Dispatch<SetStateAction<boolean>>;
  workItemSteerPhaseDraft: string;
  setWorkItemSteerPhaseDraft: Dispatch<SetStateAction<string>>;
  workItemSteerNextStepDraft: string;
  setWorkItemSteerNextStepDraft: Dispatch<SetStateAction<string>>;
  workItemSteerNoteDraft: string;
  setWorkItemSteerNoteDraft: Dispatch<SetStateAction<string>>;
  workItemResumeNoteDraft: string;
  setWorkItemResumeNoteDraft: Dispatch<SetStateAction<string>>;
  workItemQuarantineReasonDraft: string;
  setWorkItemQuarantineReasonDraft: Dispatch<SetStateAction<string>>;
  workItemRollbackReasonDraft: string;
  setWorkItemRollbackReasonDraft: Dispatch<SetStateAction<string>>;
  workItemRollbackNoteDraft: string;
  setWorkItemRollbackNoteDraft: Dispatch<SetStateAction<string>>;
  workItemValidationStatusDraft: string;
  setWorkItemValidationStatusDraft: Dispatch<SetStateAction<string>>;
  incidentRemediationStatusDraft: IncidentRemediationPlanDto["status"];
  setIncidentRemediationStatusDraft: Dispatch<SetStateAction<IncidentRemediationPlanDto["status"]>>;
  incidentRemediationOwnerDraft: string;
  setIncidentRemediationOwnerDraft: Dispatch<SetStateAction<string>>;
  incidentRemediationSummaryDraft: string;
  setIncidentRemediationSummaryDraft: Dispatch<SetStateAction<string>>;
  incidentRemediationActionsDraft: string;
  setIncidentRemediationActionsDraft: Dispatch<SetStateAction<string>>;
  incidentRemediationValidationDraft: string;
  setIncidentRemediationValidationDraft: Dispatch<SetStateAction<string>>;
  incidentRemediationBlockersDraft: string;
  setIncidentRemediationBlockersDraft: Dispatch<SetStateAction<string>>;
}

export function useProjectWorkspaceState(): ProjectWorkspaceState {
  const [projects, setProjects] = useState<ProjectProfileDto[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectListResult, setProjectListResult] = useState<QueryResultDto<ProjectListDto> | null>(null);
  const [memoryListResult, setMemoryListResult] = useState<QueryResultDto<MemoryListDto> | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [pendingUpdateMemoryId, setPendingUpdateMemoryId] = useState<string | null>(null);
  const [pendingDeleteMemoryId, setPendingDeleteMemoryId] = useState<string | null>(null);
  const [selectedGovernedProjectId, setSelectedGovernedProjectId] = useState<string | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [selectedConversationThreadByProject, setSelectedConversationThreadByProject] = useState<Record<string, string>>({});
  const [replSessionsByProject, setReplSessionsByProject] = useState<Record<string, ReplSessionProfileDto[]>>({});
  const [currentReplSessionIdByProject, setCurrentReplSessionIdByProject] = useState<Record<string, string>>({});
  const [isProjectOpenDialogOpen, setIsProjectOpenDialogOpen] = useState(false);
  const [isProjectCreateDialogOpen, setIsProjectCreateDialogOpen] = useState(false);
  const [isEditorSourceFileDialogOpen, setIsEditorSourceFileDialogOpen] = useState(false);
  const [isEditorSourceFileSaveDialogOpen, setIsEditorSourceFileSaveDialogOpen] = useState(false);
  const [isProjectConstitutionDialogOpen, setIsProjectConstitutionDialogOpen] = useState(false);
  const [isProjectRequirementDialogOpen, setIsProjectRequirementDialogOpen] = useState(false);
  const [isProjectFeatureSpecificationDialogOpen, setIsProjectFeatureSpecificationDialogOpen] = useState(false);
  const [isProjectUserJourneyDialogOpen, setIsProjectUserJourneyDialogOpen] = useState(false);
  const [isProjectArchitectureDecisionDialogOpen, setIsProjectArchitectureDecisionDialogOpen] = useState(false);
  const [isProjectDesignSystemDialogOpen, setIsProjectDesignSystemDialogOpen] = useState(false);
  const [isProjectStyleGuideDialogOpen, setIsProjectStyleGuideDialogOpen] = useState(false);
  const [isProjectTestingStrategyDialogOpen, setIsProjectTestingStrategyDialogOpen] = useState(false);
  const [isProjectReleaseReadinessDialogOpen, setIsProjectReleaseReadinessDialogOpen] = useState(false);
  const [isProjectReadinessObligationsDialogOpen, setIsProjectReadinessObligationsDialogOpen] = useState(false);
  const [isProjectSourceRootDialogOpen, setIsProjectSourceRootDialogOpen] = useState(false);
  const [isProjectTestingHarnessDialogOpen, setIsProjectTestingHarnessDialogOpen] = useState(false);
  const [isProjectQualityGateDialogOpen, setIsProjectQualityGateDialogOpen] = useState(false);
  const [isWorkItemSteerDialogOpen, setIsWorkItemSteerDialogOpen] = useState(false);
  const [isWorkItemResumeDialogOpen, setIsWorkItemResumeDialogOpen] = useState(false);
  const [isWorkItemQuarantineDialogOpen, setIsWorkItemQuarantineDialogOpen] = useState(false);
  const [isWorkItemRollbackDialogOpen, setIsWorkItemRollbackDialogOpen] = useState(false);
  const [isWorkItemValidationDialogOpen, setIsWorkItemValidationDialogOpen] = useState(false);
  const [isIncidentRemediationPlanDialogOpen, setIsIncidentRemediationPlanDialogOpen] = useState(false);
  const [newProjectTitleDraft, setNewProjectTitleDraft] = useState("");
  const [editorSourceFilePathDraft, setEditorSourceFilePathDraft] = useState("");
  const [editorSourceDirectoryPathDraft, setEditorSourceDirectoryPathDraft] = useState("");
  const [editorSourceDirectoryListing, setEditorSourceDirectoryListing] = useState<FileSystemDirectoryListingDto | null>(null);
  const [editorSourceSaveFileNameDraft, setEditorSourceSaveFileNameDraft] = useState("");
  const [editorSourceSaveDirectoryPathDraft, setEditorSourceSaveDirectoryPathDraft] = useState("");
  const [editorSourceSaveDirectoryListing, setEditorSourceSaveDirectoryListing] =
    useState<FileSystemDirectoryListingDto | null>(null);
  const [projectConstitutionDraft, setProjectConstitutionDraft] = useState("{}");
  const [projectReleaseReadinessStageDraft, setProjectReleaseReadinessStageDraft] = useState("");
  const [projectReleaseReadinessSignoffStatusDraft, setProjectReleaseReadinessSignoffStatusDraft] = useState("");
  const [projectReleaseReadinessTargetWindowDraft, setProjectReleaseReadinessTargetWindowDraft] = useState("");
  const [projectReleaseReadinessRequiredApproversDraft, setProjectReleaseReadinessRequiredApproversDraft] = useState("");
  const [projectReleaseReadinessObservationPlanDraft, setProjectReleaseReadinessObservationPlanDraft] = useState("");
  const [projectReleaseReadinessOpenRisksDraft, setProjectReleaseReadinessOpenRisksDraft] = useState("");
  const [projectReadinessObligationsDraft, setProjectReadinessObligationsDraft] =
    useState<ProjectReadinessObligationDraft[]>([blankProjectReadinessObligationDraft()]);
  const [projectRequirementTitleDraft, setProjectRequirementTitleDraft] = useState("");
  const [projectRequirementSummaryDraft, setProjectRequirementSummaryDraft] = useState("");
  const [projectRequirementPriorityDraft, setProjectRequirementPriorityDraft] = useState("high");
  const [projectRequirementStatusDraft, setProjectRequirementStatusDraft] = useState("proposed");
  const [projectFeatureSpecificationTitleDraft, setProjectFeatureSpecificationTitleDraft] = useState("");
  const [projectFeatureSpecificationSummaryDraft, setProjectFeatureSpecificationSummaryDraft] = useState("");
  const [projectFeatureSpecificationAcceptanceCriteriaDraft, setProjectFeatureSpecificationAcceptanceCriteriaDraft] =
    useState("");
  const [projectFeatureSpecificationStatusDraft, setProjectFeatureSpecificationStatusDraft] = useState("proposed");
  const [projectUserJourneyTitleDraft, setProjectUserJourneyTitleDraft] = useState("");
  const [projectUserJourneySummaryDraft, setProjectUserJourneySummaryDraft] = useState("");
  const [projectUserJourneyActorsDraft, setProjectUserJourneyActorsDraft] = useState("");
  const [projectUserJourneyEntrypointsDraft, setProjectUserJourneyEntrypointsDraft] = useState("");
  const [projectUserJourneyStepsDraft, setProjectUserJourneyStepsDraft] = useState("");
  const [projectUserJourneyOutcomesDraft, setProjectUserJourneyOutcomesDraft] = useState("");
  const [projectUserJourneyEdgeCasesDraft, setProjectUserJourneyEdgeCasesDraft] = useState("");
  const [projectArchitectureDecisionTitleDraft, setProjectArchitectureDecisionTitleDraft] = useState("");
  const [projectArchitectureDecisionSummaryDraft, setProjectArchitectureDecisionSummaryDraft] = useState("");
  const [projectArchitectureDecisionStatusDraft, setProjectArchitectureDecisionStatusDraft] = useState("proposed");
  const [projectArchitectureDecisionDriversDraft, setProjectArchitectureDecisionDriversDraft] = useState("");
  const [projectArchitectureDecisionConsequencesDraft, setProjectArchitectureDecisionConsequencesDraft] = useState("");
  const [projectArchitectureDecisionStackChoicesDraft, setProjectArchitectureDecisionStackChoicesDraft] = useState("");
  const [projectDesignSystemDraft, setProjectDesignSystemDraft] = useState("{}");
  const [projectStyleGuideDraft, setProjectStyleGuideDraft] = useState("{}");
  const [projectTestingStrategyRequiredEvidenceDraft, setProjectTestingStrategyRequiredEvidenceDraft] = useState("");
  const [projectTestingStrategySuiteExpectationsDraft, setProjectTestingStrategySuiteExpectationsDraft] =
    useState<ProjectTestingStrategySuiteExpectationDraft[]>([blankProjectTestingStrategySuiteExpectationDraft()]);
  const [projectTestingStrategyMaximumFailedTestsDraft, setProjectTestingStrategyMaximumFailedTestsDraft] = useState("");
  const [projectTestingStrategyMaximumSayTurnLatencySecondsDraft, setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft] =
    useState("");
  const [projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft, setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft] =
    useState("");
  const [projectTestingStrategyRequireCoverageDraft, setProjectTestingStrategyRequireCoverageDraft] = useState(false);
  const [projectTestingStrategyRequireRecoveryReadyDraft, setProjectTestingStrategyRequireRecoveryReadyDraft] =
    useState(false);
  const [projectSourceRootDraft, setProjectSourceRootDraft] = useState("");
  const [projectTestingHarnessIdDraft, setProjectTestingHarnessIdDraft] = useState("");
  const [projectTestingHarnessInventory, setProjectTestingHarnessInventory] = useState<ProjectTestingHarnessDto[]>([]);
  const [projectQualityGateTitleDraft, setProjectQualityGateTitleDraft] = useState("");
  const [projectQualityGateSummaryDraft, setProjectQualityGateSummaryDraft] = useState("");
  const [projectQualityGateStatusDraft, setProjectQualityGateStatusDraft] = useState("proposed");
  const [projectQualityGateRequiredHarnessIdsDraft, setProjectQualityGateRequiredHarnessIdsDraft] = useState("");
  const [projectQualityGateMinimumLinkedWorkItemsDraft, setProjectQualityGateMinimumLinkedWorkItemsDraft] = useState("");
  const [projectQualityGateMinimumLinkedIncidentsDraft, setProjectQualityGateMinimumLinkedIncidentsDraft] = useState("");
  const [projectQualityGateMaximumFailedTestsDraft, setProjectQualityGateMaximumFailedTestsDraft] = useState("");
  const [projectQualityGateMaximumSayTurnLatencySecondsDraft, setProjectQualityGateMaximumSayTurnLatencySecondsDraft] =
    useState("");
  const [projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft, setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft] =
    useState("");
  const [projectQualityGateRequireSourceRootsDraft, setProjectQualityGateRequireSourceRootsDraft] = useState(true);
  const [projectQualityGateRequireCoverageDraft, setProjectQualityGateRequireCoverageDraft] = useState(false);
  const [projectQualityGateRequireRecoveryReadyDraft, setProjectQualityGateRequireRecoveryReadyDraft] = useState(false);
  const [workItemSteerPhaseDraft, setWorkItemSteerPhaseDraft] = useState("");
  const [workItemSteerNextStepDraft, setWorkItemSteerNextStepDraft] = useState("");
  const [workItemSteerNoteDraft, setWorkItemSteerNoteDraft] = useState("");
  const [workItemResumeNoteDraft, setWorkItemResumeNoteDraft] = useState("");
  const [workItemQuarantineReasonDraft, setWorkItemQuarantineReasonDraft] = useState("");
  const [workItemRollbackReasonDraft, setWorkItemRollbackReasonDraft] = useState("");
  const [workItemRollbackNoteDraft, setWorkItemRollbackNoteDraft] = useState("");
  const [workItemValidationStatusDraft, setWorkItemValidationStatusDraft] = useState("passed");
  const [incidentRemediationStatusDraft, setIncidentRemediationStatusDraft] =
    useState<IncidentRemediationPlanDto["status"]>("draft");
  const [incidentRemediationOwnerDraft, setIncidentRemediationOwnerDraft] = useState("");
  const [incidentRemediationSummaryDraft, setIncidentRemediationSummaryDraft] = useState("");
  const [incidentRemediationActionsDraft, setIncidentRemediationActionsDraft] = useState("");
  const [incidentRemediationValidationDraft, setIncidentRemediationValidationDraft] = useState("");
  const [incidentRemediationBlockersDraft, setIncidentRemediationBlockersDraft] = useState("");

  return {
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    projectListResult,
    setProjectListResult,
    memoryListResult,
    setMemoryListResult,
    selectedMemoryId,
    setSelectedMemoryId,
    pendingUpdateMemoryId,
    setPendingUpdateMemoryId,
    pendingDeleteMemoryId,
    setPendingDeleteMemoryId,
    selectedGovernedProjectId,
    setSelectedGovernedProjectId,
    selectedProjectDetail,
    setSelectedProjectDetail,
    selectedConversationThreadByProject,
    setSelectedConversationThreadByProject,
    replSessionsByProject,
    setReplSessionsByProject,
    currentReplSessionIdByProject,
    setCurrentReplSessionIdByProject,
    isProjectOpenDialogOpen,
    setIsProjectOpenDialogOpen,
    isProjectCreateDialogOpen,
    setIsProjectCreateDialogOpen,
    isEditorSourceFileDialogOpen,
    setIsEditorSourceFileDialogOpen,
    isEditorSourceFileSaveDialogOpen,
    setIsEditorSourceFileSaveDialogOpen,
    isProjectConstitutionDialogOpen,
    setIsProjectConstitutionDialogOpen,
    isProjectRequirementDialogOpen,
    setIsProjectRequirementDialogOpen,
    isProjectFeatureSpecificationDialogOpen,
    setIsProjectFeatureSpecificationDialogOpen,
    isProjectUserJourneyDialogOpen,
    setIsProjectUserJourneyDialogOpen,
    isProjectArchitectureDecisionDialogOpen,
    setIsProjectArchitectureDecisionDialogOpen,
    isProjectDesignSystemDialogOpen,
    setIsProjectDesignSystemDialogOpen,
    isProjectStyleGuideDialogOpen,
    setIsProjectStyleGuideDialogOpen,
    isProjectTestingStrategyDialogOpen,
    setIsProjectTestingStrategyDialogOpen,
    isProjectReleaseReadinessDialogOpen,
    setIsProjectReleaseReadinessDialogOpen,
    isProjectReadinessObligationsDialogOpen,
    setIsProjectReadinessObligationsDialogOpen,
    isProjectSourceRootDialogOpen,
    setIsProjectSourceRootDialogOpen,
    isProjectTestingHarnessDialogOpen,
    setIsProjectTestingHarnessDialogOpen,
    isProjectQualityGateDialogOpen,
    setIsProjectQualityGateDialogOpen,
    isWorkItemSteerDialogOpen,
    setIsWorkItemSteerDialogOpen,
    isWorkItemResumeDialogOpen,
    setIsWorkItemResumeDialogOpen,
    isWorkItemQuarantineDialogOpen,
    setIsWorkItemQuarantineDialogOpen,
    isWorkItemRollbackDialogOpen,
    setIsWorkItemRollbackDialogOpen,
    isWorkItemValidationDialogOpen,
    setIsWorkItemValidationDialogOpen,
    isIncidentRemediationPlanDialogOpen,
    setIsIncidentRemediationPlanDialogOpen,
    newProjectTitleDraft,
    setNewProjectTitleDraft,
    editorSourceFilePathDraft,
    setEditorSourceFilePathDraft,
    editorSourceDirectoryPathDraft,
    setEditorSourceDirectoryPathDraft,
    editorSourceDirectoryListing,
    setEditorSourceDirectoryListing,
    editorSourceSaveFileNameDraft,
    setEditorSourceSaveFileNameDraft,
    editorSourceSaveDirectoryPathDraft,
    setEditorSourceSaveDirectoryPathDraft,
    editorSourceSaveDirectoryListing,
    setEditorSourceSaveDirectoryListing,
    projectConstitutionDraft,
    setProjectConstitutionDraft,
    projectReleaseReadinessStageDraft,
    setProjectReleaseReadinessStageDraft,
    projectReleaseReadinessSignoffStatusDraft,
    setProjectReleaseReadinessSignoffStatusDraft,
    projectReleaseReadinessTargetWindowDraft,
    setProjectReleaseReadinessTargetWindowDraft,
    projectReleaseReadinessRequiredApproversDraft,
    setProjectReleaseReadinessRequiredApproversDraft,
    projectReleaseReadinessObservationPlanDraft,
    setProjectReleaseReadinessObservationPlanDraft,
    projectReleaseReadinessOpenRisksDraft,
    setProjectReleaseReadinessOpenRisksDraft,
    projectReadinessObligationsDraft,
    setProjectReadinessObligationsDraft,
    projectRequirementTitleDraft,
    setProjectRequirementTitleDraft,
    projectRequirementSummaryDraft,
    setProjectRequirementSummaryDraft,
    projectRequirementPriorityDraft,
    setProjectRequirementPriorityDraft,
    projectRequirementStatusDraft,
    setProjectRequirementStatusDraft,
    projectFeatureSpecificationTitleDraft,
    setProjectFeatureSpecificationTitleDraft,
    projectFeatureSpecificationSummaryDraft,
    setProjectFeatureSpecificationSummaryDraft,
    projectFeatureSpecificationAcceptanceCriteriaDraft,
    setProjectFeatureSpecificationAcceptanceCriteriaDraft,
    projectFeatureSpecificationStatusDraft,
    setProjectFeatureSpecificationStatusDraft,
    projectUserJourneyTitleDraft,
    setProjectUserJourneyTitleDraft,
    projectUserJourneySummaryDraft,
    setProjectUserJourneySummaryDraft,
    projectUserJourneyActorsDraft,
    setProjectUserJourneyActorsDraft,
    projectUserJourneyEntrypointsDraft,
    setProjectUserJourneyEntrypointsDraft,
    projectUserJourneyStepsDraft,
    setProjectUserJourneyStepsDraft,
    projectUserJourneyOutcomesDraft,
    setProjectUserJourneyOutcomesDraft,
    projectUserJourneyEdgeCasesDraft,
    setProjectUserJourneyEdgeCasesDraft,
    projectArchitectureDecisionTitleDraft,
    setProjectArchitectureDecisionTitleDraft,
    projectArchitectureDecisionSummaryDraft,
    setProjectArchitectureDecisionSummaryDraft,
    projectArchitectureDecisionStatusDraft,
    setProjectArchitectureDecisionStatusDraft,
    projectArchitectureDecisionDriversDraft,
    setProjectArchitectureDecisionDriversDraft,
    projectArchitectureDecisionConsequencesDraft,
    setProjectArchitectureDecisionConsequencesDraft,
    projectArchitectureDecisionStackChoicesDraft,
    setProjectArchitectureDecisionStackChoicesDraft,
    projectDesignSystemDraft,
    setProjectDesignSystemDraft,
    projectStyleGuideDraft,
    setProjectStyleGuideDraft,
    projectTestingStrategyRequiredEvidenceDraft,
    setProjectTestingStrategyRequiredEvidenceDraft,
    projectTestingStrategySuiteExpectationsDraft,
    setProjectTestingStrategySuiteExpectationsDraft,
    projectTestingStrategyMaximumFailedTestsDraft,
    setProjectTestingStrategyMaximumFailedTestsDraft,
    projectTestingStrategyMaximumSayTurnLatencySecondsDraft,
    setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft,
    projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
    setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
    projectTestingStrategyRequireCoverageDraft,
    setProjectTestingStrategyRequireCoverageDraft,
    projectTestingStrategyRequireRecoveryReadyDraft,
    setProjectTestingStrategyRequireRecoveryReadyDraft,
    projectSourceRootDraft,
    setProjectSourceRootDraft,
    projectTestingHarnessIdDraft,
    setProjectTestingHarnessIdDraft,
    projectTestingHarnessInventory,
    setProjectTestingHarnessInventory,
    projectQualityGateTitleDraft,
    setProjectQualityGateTitleDraft,
    projectQualityGateSummaryDraft,
    setProjectQualityGateSummaryDraft,
    projectQualityGateStatusDraft,
    setProjectQualityGateStatusDraft,
    projectQualityGateRequiredHarnessIdsDraft,
    setProjectQualityGateRequiredHarnessIdsDraft,
    projectQualityGateMinimumLinkedWorkItemsDraft,
    setProjectQualityGateMinimumLinkedWorkItemsDraft,
    projectQualityGateMinimumLinkedIncidentsDraft,
    setProjectQualityGateMinimumLinkedIncidentsDraft,
    projectQualityGateMaximumFailedTestsDraft,
    setProjectQualityGateMaximumFailedTestsDraft,
    projectQualityGateMaximumSayTurnLatencySecondsDraft,
    setProjectQualityGateMaximumSayTurnLatencySecondsDraft,
    projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft,
    setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft,
    projectQualityGateRequireSourceRootsDraft,
    setProjectQualityGateRequireSourceRootsDraft,
    projectQualityGateRequireCoverageDraft,
    setProjectQualityGateRequireCoverageDraft,
    projectQualityGateRequireRecoveryReadyDraft,
    setProjectQualityGateRequireRecoveryReadyDraft,
    workItemSteerPhaseDraft,
    setWorkItemSteerPhaseDraft,
    workItemSteerNextStepDraft,
    setWorkItemSteerNextStepDraft,
    workItemSteerNoteDraft,
    setWorkItemSteerNoteDraft,
    workItemResumeNoteDraft,
    setWorkItemResumeNoteDraft,
    workItemQuarantineReasonDraft,
    setWorkItemQuarantineReasonDraft,
    workItemRollbackReasonDraft,
    setWorkItemRollbackReasonDraft,
    workItemRollbackNoteDraft,
    setWorkItemRollbackNoteDraft,
    workItemValidationStatusDraft,
    setWorkItemValidationStatusDraft,
    incidentRemediationStatusDraft,
    setIncidentRemediationStatusDraft,
    incidentRemediationOwnerDraft,
    setIncidentRemediationOwnerDraft,
    incidentRemediationSummaryDraft,
    setIncidentRemediationSummaryDraft,
    incidentRemediationActionsDraft,
    setIncidentRemediationActionsDraft,
    incidentRemediationValidationDraft,
    setIncidentRemediationValidationDraft,
    incidentRemediationBlockersDraft,
    setIncidentRemediationBlockersDraft
  };
}
