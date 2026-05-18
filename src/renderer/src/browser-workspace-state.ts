import { useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  PackageBrowserDto,
  QueryResultDto,
  RuntimeSymbolBrowserPageDto
} from "../../shared/contracts";

export interface BrowserWorkspaceState {
  packageWorkspaceMode: "packages" | "exports" | "internals";
  setPackageWorkspaceMode: Dispatch<SetStateAction<"packages" | "exports" | "internals">>;
  symbolWorkspaceMode: "function" | "macro" | "variable" | "class" | "generic-function";
  setSymbolWorkspaceMode: Dispatch<
    SetStateAction<"function" | "macro" | "variable" | "class" | "generic-function">
  >;
  symbolPackageScope: string;
  setSymbolPackageScope: Dispatch<SetStateAction<string>>;
  symbolVisibilityFilter: string;
  setSymbolVisibilityFilter: Dispatch<SetStateAction<string>>;
  symbolSearchTerm: string;
  setSymbolSearchTerm: Dispatch<SetStateAction<string>>;
  symbolPage: number;
  setSymbolPage: Dispatch<SetStateAction<number>>;
  symbolPageSize: number;
  setSymbolPageSize: Dispatch<SetStateAction<number>>;
  symbolPageResult: QueryResultDto<RuntimeSymbolBrowserPageDto> | null;
  setSymbolPageResult: Dispatch<SetStateAction<QueryResultDto<RuntimeSymbolBrowserPageDto> | null>>;
  classMethodMode: "classes" | "generic-functions";
  setClassMethodMode: Dispatch<SetStateAction<"classes" | "generic-functions">>;
  classMethodPackageScope: string;
  setClassMethodPackageScope: Dispatch<SetStateAction<string>>;
  classMethodSearchTerm: string;
  setClassMethodSearchTerm: Dispatch<SetStateAction<string>>;
  classMethodPage: number;
  setClassMethodPage: Dispatch<SetStateAction<number>>;
  classMethodPageSize: number;
  setClassMethodPageSize: Dispatch<SetStateAction<number>>;
  classMethodPageResult: QueryResultDto<RuntimeSymbolBrowserPageDto> | null;
  setClassMethodPageResult: Dispatch<SetStateAction<QueryResultDto<RuntimeSymbolBrowserPageDto> | null>>;
  xrefMode: "incoming" | "outgoing";
  setXrefMode: Dispatch<SetStateAction<"incoming" | "outgoing">>;
  symbolInspectorExpanded: boolean;
  setSymbolInspectorExpanded: Dispatch<SetStateAction<boolean>>;
  selectedSystemName: string | null;
  setSelectedSystemName: Dispatch<SetStateAction<string | null>>;
  selectedGovernanceKey: string | null;
  setSelectedGovernanceKey: Dispatch<SetStateAction<string | null>>;
  selectedScopeId: string | null;
  setSelectedScopeId: Dispatch<SetStateAction<string | null>>;
  selectedSourceEntryKey: string | null;
  setSelectedSourceEntryKey: Dispatch<SetStateAction<string | null>>;
  selectedDocumentationKey: string | null;
  setSelectedDocumentationKey: Dispatch<SetStateAction<string | null>>;
  selectedLinkedConversationId: string | null;
  setSelectedLinkedConversationId: Dispatch<SetStateAction<string | null>>;
  listenerActionMode: "default" | "inspect" | "reload" | "evaluate" | "custom";
  setListenerActionMode: Dispatch<
    SetStateAction<"default" | "inspect" | "reload" | "evaluate" | "custom">
  >;
  customListenerForm: string | null;
  setCustomListenerForm: Dispatch<SetStateAction<string | null>>;
  previousConversationHandoffPromptRef: MutableRefObject<string>;
  packageBrowserLoadRef: MutableRefObject<Map<string, Promise<void>>>;
  packageBrowserCache: Record<string, PackageBrowserDto>;
  setPackageBrowserCache: Dispatch<SetStateAction<Record<string, PackageBrowserDto>>>;
}

export function useBrowserWorkspaceState(): BrowserWorkspaceState {
  const [packageWorkspaceMode, setPackageWorkspaceMode] = useState<"packages" | "exports" | "internals">("packages");
  const [symbolWorkspaceMode, setSymbolWorkspaceMode] = useState<
    "function" | "macro" | "variable" | "class" | "generic-function"
  >("function");
  const [symbolPackageScope, setSymbolPackageScope] = useState<string>("All Packages");
  const [symbolVisibilityFilter, setSymbolVisibilityFilter] = useState<string>("all");
  const [symbolSearchTerm, setSymbolSearchTerm] = useState("");
  const [symbolPage, setSymbolPage] = useState(1);
  const [symbolPageSize, setSymbolPageSize] = useState(16);
  const [symbolPageResult, setSymbolPageResult] = useState<QueryResultDto<RuntimeSymbolBrowserPageDto> | null>(null);
  const [classMethodMode, setClassMethodMode] = useState<"classes" | "generic-functions">("classes");
  const [classMethodPackageScope, setClassMethodPackageScope] = useState<string>("All Packages");
  const [classMethodSearchTerm, setClassMethodSearchTerm] = useState("");
  const [classMethodPage, setClassMethodPage] = useState(1);
  const [classMethodPageSize, setClassMethodPageSize] = useState(16);
  const [classMethodPageResult, setClassMethodPageResult] =
    useState<QueryResultDto<RuntimeSymbolBrowserPageDto> | null>(null);
  const [xrefMode, setXrefMode] = useState<"incoming" | "outgoing">("incoming");
  const [symbolInspectorExpanded, setSymbolInspectorExpanded] = useState(false);
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedGovernanceKey, setSelectedGovernanceKey] = useState<string | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedSourceEntryKey, setSelectedSourceEntryKey] = useState<string | null>(null);
  const [selectedDocumentationKey, setSelectedDocumentationKey] = useState<string | null>(null);
  const [selectedLinkedConversationId, setSelectedLinkedConversationId] = useState<string | null>(null);
  const [listenerActionMode, setListenerActionMode] =
    useState<"default" | "inspect" | "reload" | "evaluate" | "custom">("default");
  const [customListenerForm, setCustomListenerForm] = useState<string | null>(null);
  const previousConversationHandoffPromptRef = useRef("");
  const packageBrowserLoadRef = useRef(new Map<string, Promise<void>>());
  const [packageBrowserCache, setPackageBrowserCache] = useState<Record<string, PackageBrowserDto>>({});

  return {
    packageWorkspaceMode,
    setPackageWorkspaceMode,
    symbolWorkspaceMode,
    setSymbolWorkspaceMode,
    symbolPackageScope,
    setSymbolPackageScope,
    symbolVisibilityFilter,
    setSymbolVisibilityFilter,
    symbolSearchTerm,
    setSymbolSearchTerm,
    symbolPage,
    setSymbolPage,
    symbolPageSize,
    setSymbolPageSize,
    symbolPageResult,
    setSymbolPageResult,
    classMethodMode,
    setClassMethodMode,
    classMethodPackageScope,
    setClassMethodPackageScope,
    classMethodSearchTerm,
    setClassMethodSearchTerm,
    classMethodPage,
    setClassMethodPage,
    classMethodPageSize,
    setClassMethodPageSize,
    classMethodPageResult,
    setClassMethodPageResult,
    xrefMode,
    setXrefMode,
    symbolInspectorExpanded,
    setSymbolInspectorExpanded,
    selectedSystemName,
    setSelectedSystemName,
    selectedGovernanceKey,
    setSelectedGovernanceKey,
    selectedScopeId,
    setSelectedScopeId,
    selectedSourceEntryKey,
    setSelectedSourceEntryKey,
    selectedDocumentationKey,
    setSelectedDocumentationKey,
    selectedLinkedConversationId,
    setSelectedLinkedConversationId,
    listenerActionMode,
    setListenerActionMode,
    customListenerForm,
    setCustomListenerForm,
    previousConversationHandoffPromptRef,
    packageBrowserLoadRef,
    packageBrowserCache,
    setPackageBrowserCache
  };
}
