import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  ConfigureMcpServerInput,
  ConfigureProviderProfileInput,
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  ProviderProfileSummaryDto
} from "../../shared/contracts";

export type McpServerDraft = Omit<ConfigureMcpServerInput, "environmentId">;

export interface ConfigurationWorkspaceState {
  providerSummary: ProviderProfileSummaryDto | null;
  setProviderSummary: Dispatch<SetStateAction<ProviderProfileSummaryDto | null>>;
  packageManagementSummary: PackageManagementSummaryDto | null;
  setPackageManagementSummary: Dispatch<SetStateAction<PackageManagementSummaryDto | null>>;
  desktopTaskManifests: DesktopTaskManifestDto[];
  setDesktopTaskManifests: Dispatch<SetStateAction<DesktopTaskManifestDto[]>>;
  desktopTaskRecords: DesktopTaskRecordDto[];
  setDesktopTaskRecords: Dispatch<SetStateAction<DesktopTaskRecordDto[]>>;
  desktopTaskActorFlow: Record<string, unknown> | null;
  setDesktopTaskActorFlow: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  desktopTaskActorSystemPanel: Record<string, unknown> | null;
  setDesktopTaskActorSystemPanel: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  desktopTaskActorTrace: Record<string, unknown>[];
  setDesktopTaskActorTrace: Dispatch<SetStateAction<Record<string, unknown>[]>>;
  desktopTaskDeadLetters: Record<string, unknown>[];
  setDesktopTaskDeadLetters: Dispatch<SetStateAction<Record<string, unknown>[]>>;
  orchestrationInbox: Record<string, unknown>[];
  setOrchestrationInbox: Dispatch<SetStateAction<Record<string, unknown>[]>>;
  orchestrationFocus: Record<string, unknown> | null;
  setOrchestrationFocus: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  orchestrationSnapshot: Record<string, unknown> | null;
  setOrchestrationSnapshot: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  planVerification: Record<string, unknown> | null;
  setPlanVerification: Dispatch<SetStateAction<Record<string, unknown> | null>>;
  appliedActorFlowEditorMutationKeysRef: React.MutableRefObject<Set<string>>;
  mcpServerConfigs: McpServerConfigDto[];
  setMcpServerConfigs: Dispatch<SetStateAction<McpServerConfigDto[]>>;
  selectedProviderProfileName: string;
  setSelectedProviderProfileName: Dispatch<SetStateAction<string>>;
  providerProfileDraft: ConfigureProviderProfileInput;
  setProviderProfileDraft: Dispatch<SetStateAction<ConfigureProviderProfileInput>>;
  selectedMcpServerId: string | null;
  setSelectedMcpServerId: Dispatch<SetStateAction<string | null>>;
  mcpServerDraft: McpServerDraft;
  setMcpServerDraft: Dispatch<SetStateAction<McpServerDraft>>;
  providerProfileStatusMessage: string | null;
  setProviderProfileStatusMessage: Dispatch<SetStateAction<string | null>>;
  providerProfileError: string | null;
  setProviderProfileError: Dispatch<SetStateAction<string | null>>;
  packageManagementStatusMessage: string | null;
  setPackageManagementStatusMessage: Dispatch<SetStateAction<string | null>>;
  packageManagementError: string | null;
  setPackageManagementError: Dispatch<SetStateAction<string | null>>;
  mcpServerStatusMessage: string | null;
  setMcpServerStatusMessage: Dispatch<SetStateAction<string | null>>;
  mcpServerError: string | null;
  setMcpServerError: Dispatch<SetStateAction<string | null>>;
  isSavingMcpServer: boolean;
  setIsSavingMcpServer: Dispatch<SetStateAction<boolean>>;
  packageManagementCommandResult: PackageManagementCommandResultDto | null;
  setPackageManagementCommandResult: Dispatch<SetStateAction<PackageManagementCommandResultDto | null>>;
  quicklispSystemDraft: string;
  setQuicklispSystemDraft: Dispatch<SetStateAction<string>>;
  qlotCommandDraft: string;
  setQlotCommandDraft: Dispatch<SetStateAction<string>>;
  sourceRegistryDraftPath: string;
  setSourceRegistryDraftPath: Dispatch<SetStateAction<string>>;
  sourceRegistryEditOriginalPath: string | null;
  setSourceRegistryEditOriginalPath: Dispatch<SetStateAction<string | null>>;
  localProjectPathDraft: string;
  setLocalProjectPathDraft: Dispatch<SetStateAction<string>>;
  localProjectNameDraft: string;
  setLocalProjectNameDraft: Dispatch<SetStateAction<string>>;
  isPackageManagementBusy: boolean;
  setIsPackageManagementBusy: Dispatch<SetStateAction<boolean>>;
  isSavingProviderProfile: boolean;
  setIsSavingProviderProfile: Dispatch<SetStateAction<boolean>>;
  isUpdatingProviderRouting: boolean;
  setIsUpdatingProviderRouting: Dispatch<SetStateAction<boolean>>;
}

export function useConfigurationWorkspaceState(deps: {
  buildProviderProfileDraft: (
    profile?: Partial<ConfigureProviderProfileInput> | null
  ) => ConfigureProviderProfileInput;
  buildMcpServerDraft: (server?: Partial<McpServerConfigDto> | null) => McpServerDraft;
}): ConfigurationWorkspaceState {
  const [providerSummary, setProviderSummary] = useState<ProviderProfileSummaryDto | null>(null);
  const [packageManagementSummary, setPackageManagementSummary] = useState<PackageManagementSummaryDto | null>(null);
  const [desktopTaskManifests, setDesktopTaskManifests] = useState<DesktopTaskManifestDto[]>([]);
  const [desktopTaskRecords, setDesktopTaskRecords] = useState<DesktopTaskRecordDto[]>([]);
  const [desktopTaskActorFlow, setDesktopTaskActorFlow] = useState<Record<string, unknown> | null>(null);
  const [desktopTaskActorSystemPanel, setDesktopTaskActorSystemPanel] = useState<Record<string, unknown> | null>(null);
  const [desktopTaskActorTrace, setDesktopTaskActorTrace] = useState<Record<string, unknown>[]>([]);
  const [desktopTaskDeadLetters, setDesktopTaskDeadLetters] = useState<Record<string, unknown>[]>([]);
  const [orchestrationInbox, setOrchestrationInbox] = useState<Record<string, unknown>[]>([]);
  const [orchestrationFocus, setOrchestrationFocus] = useState<Record<string, unknown> | null>(null);
  const [orchestrationSnapshot, setOrchestrationSnapshot] = useState<Record<string, unknown> | null>(null);
  const [planVerification, setPlanVerification] = useState<Record<string, unknown> | null>(null);
  const appliedActorFlowEditorMutationKeysRef = useRef<Set<string>>(new Set());
  const [mcpServerConfigs, setMcpServerConfigs] = useState<McpServerConfigDto[]>([]);
  const [selectedProviderProfileName, setSelectedProviderProfileName] = useState<string>("default");
  const [providerProfileDraft, setProviderProfileDraft] = useState<ConfigureProviderProfileInput>(
    deps.buildProviderProfileDraft()
  );
  const [selectedMcpServerId, setSelectedMcpServerId] = useState<string | null>(null);
  const [mcpServerDraft, setMcpServerDraft] = useState<McpServerDraft>(deps.buildMcpServerDraft());
  const [providerProfileStatusMessage, setProviderProfileStatusMessage] = useState<string | null>(null);
  const [providerProfileError, setProviderProfileError] = useState<string | null>(null);
  const [packageManagementStatusMessage, setPackageManagementStatusMessage] = useState<string | null>(null);
  const [packageManagementError, setPackageManagementError] = useState<string | null>(null);
  const [mcpServerStatusMessage, setMcpServerStatusMessage] = useState<string | null>(null);
  const [mcpServerError, setMcpServerError] = useState<string | null>(null);
  const [isSavingMcpServer, setIsSavingMcpServer] = useState(false);
  const [packageManagementCommandResult, setPackageManagementCommandResult] =
    useState<PackageManagementCommandResultDto | null>(null);
  const [quicklispSystemDraft, setQuicklispSystemDraft] = useState<string>("");
  const [qlotCommandDraft, setQlotCommandDraft] = useState<string>("update");
  const [sourceRegistryDraftPath, setSourceRegistryDraftPath] = useState<string>("");
  const [sourceRegistryEditOriginalPath, setSourceRegistryEditOriginalPath] = useState<string | null>(null);
  const [localProjectPathDraft, setLocalProjectPathDraft] = useState<string>("");
  const [localProjectNameDraft, setLocalProjectNameDraft] = useState<string>("");
  const [isPackageManagementBusy, setIsPackageManagementBusy] = useState(false);
  const [isSavingProviderProfile, setIsSavingProviderProfile] = useState(false);
  const [isUpdatingProviderRouting, setIsUpdatingProviderRouting] = useState(false);

  return {
    providerSummary,
    setProviderSummary,
    packageManagementSummary,
    setPackageManagementSummary,
    desktopTaskManifests,
    setDesktopTaskManifests,
    desktopTaskRecords,
    setDesktopTaskRecords,
    desktopTaskActorFlow,
    setDesktopTaskActorFlow,
    desktopTaskActorSystemPanel,
    setDesktopTaskActorSystemPanel,
    desktopTaskActorTrace,
    setDesktopTaskActorTrace,
    desktopTaskDeadLetters,
    setDesktopTaskDeadLetters,
    orchestrationInbox,
    setOrchestrationInbox,
    orchestrationFocus,
    setOrchestrationFocus,
    orchestrationSnapshot,
    setOrchestrationSnapshot,
    planVerification,
    setPlanVerification,
    appliedActorFlowEditorMutationKeysRef,
    mcpServerConfigs,
    setMcpServerConfigs,
    selectedProviderProfileName,
    setSelectedProviderProfileName,
    providerProfileDraft,
    setProviderProfileDraft,
    selectedMcpServerId,
    setSelectedMcpServerId,
    mcpServerDraft,
    setMcpServerDraft,
    providerProfileStatusMessage,
    setProviderProfileStatusMessage,
    providerProfileError,
    setProviderProfileError,
    packageManagementStatusMessage,
    setPackageManagementStatusMessage,
    packageManagementError,
    setPackageManagementError,
    mcpServerStatusMessage,
    setMcpServerStatusMessage,
    mcpServerError,
    setMcpServerError,
    isSavingMcpServer,
    setIsSavingMcpServer,
    packageManagementCommandResult,
    setPackageManagementCommandResult,
    quicklispSystemDraft,
    setQuicklispSystemDraft,
    qlotCommandDraft,
    setQlotCommandDraft,
    sourceRegistryDraftPath,
    setSourceRegistryDraftPath,
    sourceRegistryEditOriginalPath,
    setSourceRegistryEditOriginalPath,
    localProjectPathDraft,
    setLocalProjectPathDraft,
    localProjectNameDraft,
    setLocalProjectNameDraft,
    isPackageManagementBusy,
    setIsPackageManagementBusy,
    isSavingProviderProfile,
    setIsSavingProviderProfile,
    isUpdatingProviderRouting,
    setIsUpdatingProviderRouting
  };
}
