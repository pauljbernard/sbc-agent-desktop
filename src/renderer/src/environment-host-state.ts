import { useState, type Dispatch, type SetStateAction } from "react";
import type {
  BindingDto,
  DesktopModelDto,
  EnvironmentImageRegistryDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  HostStatusDto,
  WorkspaceSummaryDto
} from "../../shared/contracts";

export interface EnvironmentHostState {
  hostStatus: HostStatusDto | null;
  setHostStatus: Dispatch<SetStateAction<HostStatusDto | null>>;
  binding: BindingDto | null;
  setBinding: Dispatch<SetStateAction<BindingDto | null>>;
  environmentImageRegistry: EnvironmentImageRegistryDto | null;
  setEnvironmentImageRegistry: Dispatch<SetStateAction<EnvironmentImageRegistryDto | null>>;
  isEnvironmentImageChooserOpen: boolean;
  setIsEnvironmentImageChooserOpen: Dispatch<SetStateAction<boolean>>;
  isEnvironmentExitDialogOpen: boolean;
  setIsEnvironmentExitDialogOpen: Dispatch<SetStateAction<boolean>>;
  environmentSaveAsNameDraft: string;
  setEnvironmentSaveAsNameDraft: Dispatch<SetStateAction<string>>;
  replSessionTitleDraft: string;
  setReplSessionTitleDraft: Dispatch<SetStateAction<string>>;
  summary: EnvironmentSummaryDto | null;
  setSummary: Dispatch<SetStateAction<EnvironmentSummaryDto | null>>;
  status: EnvironmentStatusDto | null;
  setStatus: Dispatch<SetStateAction<EnvironmentStatusDto | null>>;
  workspaceSummary: WorkspaceSummaryDto | null;
  setWorkspaceSummary: Dispatch<SetStateAction<WorkspaceSummaryDto | null>>;
  desktopModel: DesktopModelDto | null;
  setDesktopModel: Dispatch<SetStateAction<DesktopModelDto | null>>;
  errorMessage: string | null;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

export function useEnvironmentHostState(): EnvironmentHostState {
  const [hostStatus, setHostStatus] = useState<HostStatusDto | null>(null);
  const [binding, setBinding] = useState<BindingDto | null>(null);
  const [environmentImageRegistry, setEnvironmentImageRegistry] = useState<EnvironmentImageRegistryDto | null>(null);
  const [isEnvironmentImageChooserOpen, setIsEnvironmentImageChooserOpen] = useState(false);
  const [isEnvironmentExitDialogOpen, setIsEnvironmentExitDialogOpen] = useState(false);
  const [environmentSaveAsNameDraft, setEnvironmentSaveAsNameDraft] = useState("");
  const [replSessionTitleDraft, setReplSessionTitleDraft] = useState("New Listener Session");
  const [summary, setSummary] = useState<EnvironmentSummaryDto | null>(null);
  const [status, setStatus] = useState<EnvironmentStatusDto | null>(null);
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummaryDto | null>(null);
  const [desktopModel, setDesktopModel] = useState<DesktopModelDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return {
    hostStatus,
    setHostStatus,
    binding,
    setBinding,
    environmentImageRegistry,
    setEnvironmentImageRegistry,
    isEnvironmentImageChooserOpen,
    setIsEnvironmentImageChooserOpen,
    isEnvironmentExitDialogOpen,
    setIsEnvironmentExitDialogOpen,
    environmentSaveAsNameDraft,
    setEnvironmentSaveAsNameDraft,
    replSessionTitleDraft,
    setReplSessionTitleDraft,
    summary,
    setSummary,
    status,
    setStatus,
    workspaceSummary,
    setWorkspaceSummary,
    desktopModel,
    setDesktopModel,
    errorMessage,
    setErrorMessage
  };
}
