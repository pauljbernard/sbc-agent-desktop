import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ApprovalRequestSummaryDto,
  ArtifactSummaryDto,
  CommandResultDto,
  ConsoleLogStreamDto,
  DesktopTaskRecordDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  DocumentationPageSummaryDto,
  IncidentSummaryDto,
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSymbolBrowserPageDto,
  RuntimeSummaryDto,
  RuntimeTelemetrySnapshotDto,
  SourceMutationResultDto,
  SourcePreviewDto,
  SourceReloadResultDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import { browserDomains, type BrowserDomain } from "./browser-support";
import type { EnvironmentFocusState } from "./environment-focus";
import { BrowserDataTable, type BrowserTableFilterOption } from "./browser-data-table";
import {
  buildConversationPrompt,
  buildEntityQuickForms,
  buildListenerForm,
  buildSourceOperationForms
} from "./browser-action-forms";
import {
  buildPackageNames,
  collectScopedPackageSymbols,
  resolveBrowserEnvironmentId
} from "./browser-workspace-data";
import { useBrowserWorkspaceEffects } from "./browser-workspace-effects";
import {
  ALL_PACKAGES_OPTION,
  buildActiveSymbolRows,
  buildBrowserFocusIdentityRows,
  buildClassMethodRows,
  buildConsoleView,
  buildDiagnosticRows,
  buildDiagnosticSummaryState,
  buildDocumentationEntries,
  buildFilterOptions,
  buildLinkedConversationRows,
  buildPackageRows,
  buildPackageSymbolRows,
  buildPrioritizedLinkedConversationEntries,
  buildRuntimeScopeRows,
  buildSelectedLinkedConversationIdentityRows,
  buildSelectedScope,
  buildSelectedSystem,
  buildSelectedSystemIdentityRows,
  buildSelectedTelemetryProcess,
  buildSourceEntries,
  buildSourceRows,
  buildSystemRows,
  buildTelemetryProcessRows,
  buildXrefEntries,
  buildXrefRows
} from "./browser-workspace-support";
import { Badge, toneForCommandStatus, transcriptRecencyLabel } from "./surface-support";
import { PriorityStateChip } from "./interaction-support";
import { DetailRow } from "./journey-support";
import {
  BrowserModePicker,
  FilterSelect,
  MetricTile
} from "./workspace-support-components";

function toneForThreadState(
  state: ThreadSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
      return "danger";
    default:
      return "steady";
  }
}

function browserRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function browserString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

export function BrowserWorkspace({
  approvalRequests,
  orchestrationInbox,
  isDecidingApproval,
  consoleLogStream,
  desktopTaskRecords,
  diagnosticReports,
  runtimeSummary,
  runtimeTelemetry,
  environmentId,
  selectedDomain,
  selectedConsolePlane,
  selectedConsoleSourceFilter,
  selectedConsoleEntryId,
  selectedDiagnosticSourceFilter,
  selectedDiagnosticReport,
  selectedDiagnosticReportId,
  selectedTelemetryProcessId,
  parenDepthColors,
  packageBrowser,
  environmentFocus,
  navigateToWorkspace,
  conversationDraft,
  runtimeForm,
  setConversationDraft,
  setRuntimeForm,
  selectedThread,
  selectedThreadId,
  selectedPackageName,
  setSelectedPackageName,
  setSelectedThreadId,
  runtimeInspection,
  runtimeEntityDetail,
  runtimeInspectionMode,
  runtimeInspectorSymbol,
  runtimeInspectorPackage,
  setRuntimeInspectionMode,
  setRuntimeInspectorSymbol,
  setRuntimeInspectorPackage,
  setSelectedConsolePlane,
  setSelectedConsoleSourceFilter,
  setSelectedConsoleEntryId,
  setSelectedDiagnosticSourceFilter,
  setSelectedDiagnosticReportId,
  setSelectedTelemetryProcessId,
  browseRuntimeEntity,
  inspectRuntimeSymbol,
  isInspectingRuntime,
  sourcePreview,
  sourceDraft,
  setSourceDraft,
  isEditingSource,
  setIsEditingSource,
  isStagingSource,
  isReloadingSource,
  sourceMutationResult,
  sourceReloadResult,
  stageSourceChange,
  reloadSourceFile,
  loadSourcePreview,
  incidents,
  artifacts,
  threads,
  documentationPages,
  selectedDocumentationSlug,
  loadDocumentationPage,
  workItems,
  onOpenApprovalRequest,
  onSubmitApprovalDecision,
  openInspectorSurface
}: {
  approvalRequests: ApprovalRequestSummaryDto[];
  orchestrationInbox: Record<string, unknown>[];
  isDecidingApproval: boolean;
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  desktopTaskRecords: DesktopTaskRecordDto[];
  diagnosticReports: DiagnosticReportSummaryDto[];
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  environmentId: string | null;
  selectedDomain: BrowserDomain;
  selectedConsolePlane: "environment" | "host";
  selectedConsoleSourceFilter: string;
  selectedConsoleEntryId: string | null;
  selectedDiagnosticSourceFilter: string;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  selectedDiagnosticReportId: string | null;
  selectedTelemetryProcessId: string | null;
  parenDepthColors: string[];
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  environmentFocus: EnvironmentFocusState;
  navigateToWorkspace: (workspaceId: WorkspaceId) => void;
  conversationDraft: string;
  runtimeForm: string;
  setConversationDraft: (value: string) => void;
  setRuntimeForm: (value: string) => void;
  selectedThread: ThreadDetailDto | null;
  selectedThreadId: string | null;
  selectedPackageName: string;
  setSelectedPackageName: (value: string) => void;
  setSelectedThreadId: (threadId: string) => void;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeInspectionMode: RuntimeInspectionMode;
  runtimeInspectorSymbol: string;
  runtimeInspectorPackage: string;
  setRuntimeInspectionMode: (value: RuntimeInspectionMode) => void;
  setRuntimeInspectorSymbol: (value: string) => void;
  setRuntimeInspectorPackage: (value: string) => void;
  setSelectedConsolePlane: (value: "environment" | "host") => void;
  setSelectedConsoleSourceFilter: (value: string) => void;
  setSelectedConsoleEntryId: (value: string | null) => void;
  setSelectedDiagnosticSourceFilter: (value: string) => void;
  setSelectedDiagnosticReportId: (value: string | null) => void;
  setSelectedTelemetryProcessId: (value: string | null) => void;
  browseRuntimeEntity: (
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ) => Promise<void>;
  inspectRuntimeSymbol: () => Promise<void>;
  isInspectingRuntime: boolean;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  sourceDraft: string;
  setSourceDraft: (value: string) => void;
  isEditingSource: boolean;
  setIsEditingSource: (value: boolean) => void;
  isStagingSource: boolean;
  isReloadingSource: boolean;
  sourceMutationResult: CommandResultDto<SourceMutationResultDto> | null;
  sourceReloadResult: CommandResultDto<SourceReloadResultDto> | null;
  stageSourceChange: () => Promise<void>;
  reloadSourceFile: () => Promise<void>;
  loadSourcePreview: (path: string, line?: number) => Promise<void>;
  incidents: IncidentSummaryDto[];
  artifacts: ArtifactSummaryDto[];
  threads: ThreadSummaryDto[];
  documentationPages: DocumentationPageSummaryDto[];
  selectedDocumentationSlug: string;
  loadDocumentationPage: (slug: string) => Promise<void>;
  workItems: WorkItemSummaryDto[];
  onOpenApprovalRequest: (requestId: string) => Promise<void>;
  onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const [packageWorkspaceMode, setPackageWorkspaceMode] = useState<"packages" | "exports" | "internals">("packages");
  const [symbolWorkspaceMode, setSymbolWorkspaceMode] = useState<
    "generic-function" | "class" | "macro" | "function" | "variable"
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
  const [classMethodPageResult, setClassMethodPageResult] = useState<QueryResultDto<RuntimeSymbolBrowserPageDto> | null>(null);
  const [xrefMode, setXrefMode] = useState<"incoming" | "outgoing">("incoming");
  const [symbolInspectorExpanded, setSymbolInspectorExpanded] = useState(false);
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedGovernanceKey, setSelectedGovernanceKey] = useState<string | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedSourceEntryKey, setSelectedSourceEntryKey] = useState<string | null>(null);
  const [selectedDocumentationKey, setSelectedDocumentationKey] = useState<string | null>(null);
  const [selectedLinkedConversationId, setSelectedLinkedConversationId] = useState<string | null>(null);
  const [listenerActionMode, setListenerActionMode] = useState<"default" | "inspect" | "reload" | "evaluate" | "custom">("default");
  const [customListenerForm, setCustomListenerForm] = useState<string | null>(null);
  const previousConversationHandoffPromptRef = useRef("");
  const packageBrowserLoadRef = useRef(new Map<string, Promise<void>>());
  const packageBrowserPrefetchTimerRef = useRef<number | null>(null);
  const [packageBrowserCache, setPackageBrowserCache] = useState<Record<string, PackageBrowserDto>>({});

  const packageNames = useMemo(
    () =>
      Array.from(
        new Set([
          ...(packageBrowser?.data.availablePackages ?? []),
          runtimeSummary?.currentPackage,
          packageBrowser?.data.packageName,
          ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
        ].filter((value): value is string => Boolean(value)))
      ),
    [packageBrowser, runtimeSummary]
  );
  const resolvedBrowserEnvironmentId =
    packageBrowser?.metadata.binding?.environmentId ??
    runtimeInspection?.metadata.binding?.environmentId ??
    runtimeEntityDetail?.metadata.binding?.environmentId ??
    environmentId;
  const allPackagesOption = "All Packages";
  const packageScopeOptions = [allPackagesOption, ...packageNames];

  function scopedPackageNames(scope: string): string[] {
    return scope === allPackagesOption ? packageNames : scope ? [scope] : [];
  }

  function commitPackageBrowserCacheEntries(entries: Record<string, PackageBrowserDto>): void {
    const entryNames = Object.keys(entries);
    if (entryNames.length === 0) {
      return;
    }
    setPackageBrowserCache((current) => {
      let changed = false;
      const next = { ...current };
      for (const packageName of entryNames) {
        if (next[packageName] !== entries[packageName]) {
          next[packageName] = entries[packageName];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }

  async function fetchPackageBrowserData(packageName: string): Promise<PackageBrowserDto | null> {
    if (!environmentId || !packageName) {
      return null;
    }
    if (packageBrowserCache[packageName] || packageBrowser?.data.packageName === packageName) {
      return packageBrowserCache[packageName] ?? packageBrowser?.data ?? null;
    }
    const result = await window.sbclAgentDesktop.query.packageBrowser({
      environmentId,
      packageName
    });
    return result.data;
  }

  async function ensurePackageBrowserData(packageName: string): Promise<void> {
    if (!environmentId || !packageName) {
      return;
    }
    if (packageBrowserCache[packageName] || packageBrowser?.data.packageName === packageName) {
      return;
    }
    const existingLoad = packageBrowserLoadRef.current.get(packageName);
    if (existingLoad) {
      return existingLoad;
    }
    let loadPromise: Promise<void> | null = null;
    loadPromise = (async () => {
      try {
        const result = await fetchPackageBrowserData(packageName);
        if (!result) {
          return;
        }
        commitPackageBrowserCacheEntries({ [packageName]: result });
      } finally {
        if (packageBrowserLoadRef.current.get(packageName) === loadPromise) {
          packageBrowserLoadRef.current.delete(packageName);
        }
      }
    })();
    packageBrowserLoadRef.current.set(packageName, loadPromise);
    return loadPromise;
  }

  function browserDataForPackage(packageName: string): PackageBrowserDto | null {
    if (packageBrowser?.data.packageName === packageName) {
      return packageBrowser.data;
    }
    return packageBrowserCache[packageName] ?? null;
  }

  function symbolKindsForMode(mode: typeof symbolWorkspaceMode): Array<PackageBrowserSymbolDto["kind"]> {
    switch (mode) {
      case "generic-function":
        return ["generic-function"];
      case "class":
        return ["class"];
      case "macro":
        return ["macro"];
      case "variable":
        return ["variable"];
      case "function":
      default:
        return ["function", "unknown"];
    }
  }

  function classMethodKindsForMode(mode: typeof classMethodMode): Array<PackageBrowserSymbolDto["kind"]> {
    return mode === "classes" ? ["class"] : ["generic-function"];
  }

  async function loadRuntimeSymbolPage(input: {
    packageScope: string;
    kinds: Array<PackageBrowserSymbolDto["kind"]>;
    visibility?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<QueryResultDto<RuntimeSymbolBrowserPageDto> | null> {
    if (!resolvedBrowserEnvironmentId) {
      return null;
    }
    return window.sbclAgentDesktop.query.runtimeSymbolPage({
      environmentId: resolvedBrowserEnvironmentId,
      packageScope: input.packageScope === allPackagesOption ? null : input.packageScope,
      kinds: input.kinds,
      visibility:
        input.visibility === "external" || input.visibility === "internal" ? input.visibility : "all",
      search: input.search?.trim() ? input.search.trim() : undefined,
      offset: (input.page - 1) * input.pageSize,
      limit: input.pageSize
    });
  }

  function normalizeBrowserPackageData(raw: unknown, fallbackPackageName: string): {
    packageName: string;
    externalSymbols: PackageBrowserSymbolDto[];
    internalSymbols: PackageBrowserSymbolDto[];
  } {
    if (!raw || typeof raw !== "object") {
      return {
        packageName: fallbackPackageName,
        externalSymbols: [],
        internalSymbols: []
      };
    }
    const record = raw as Record<string, unknown>;
    return {
      packageName:
        (typeof record.packageName === "string" && record.packageName) ||
        (typeof record.package === "string" && record.package) ||
        fallbackPackageName,
      externalSymbols: Array.isArray(record.externalSymbols)
        ? (record.externalSymbols as PackageBrowserSymbolDto[])
        : Array.isArray(record.external_symbols)
          ? (record.external_symbols as PackageBrowserSymbolDto[])
          : [],
      internalSymbols: Array.isArray(record.internalSymbols)
        ? (record.internalSymbols as PackageBrowserSymbolDto[])
        : Array.isArray(record.internal_symbols)
          ? (record.internal_symbols as PackageBrowserSymbolDto[])
          : []
    };
  }

  function collectScopedPackageSymbols(scope: string): Array<PackageBrowserSymbolDto & { packageName: string }> {
    return scopedPackageNames(scope)
      .flatMap((packageName) => {
        const browserData = browserDataForPackage(packageName);
        if (!browserData) {
          return [];
        }
        const normalized = normalizeBrowserPackageData(browserData, packageName);
        return [
          ...normalized.externalSymbols.map((entry) => ({ ...entry, packageName: normalized.packageName })),
          ...normalized.internalSymbols.map((entry) => ({ ...entry, packageName: normalized.packageName }))
        ];
      })
      .filter(
        (entry, index, entries) =>
          entries.findIndex(
            (candidate) =>
              candidate.packageName === entry.packageName &&
              candidate.symbol === entry.symbol &&
              candidate.kind === entry.kind &&
              candidate.visibility === entry.visibility
          ) === index
      );
  }

  const browserObjective =
    runtimeInspection?.data.summary ??
    sourcePreview?.data.summary ??
    runtimeSummary?.divergencePosture ??
    "Browse systems, packages, symbols, source, and governed artifacts as one live environment.";

  const filteredExternalSymbols = packageBrowser?.data.externalSymbols ?? [];
  const filteredInternalSymbols = packageBrowser?.data.internalSymbols ?? [];
  const inspectedSymbolKind: PackageBrowserSymbolDto["kind"] =
    runtimeEntityDetail?.data.entityKind === "generic-function" ||
    runtimeEntityDetail?.data.entityKind === "class" ||
    runtimeEntityDetail?.data.entityKind === "macro" ||
    runtimeEntityDetail?.data.entityKind === "function" ||
    runtimeEntityDetail?.data.entityKind === "variable"
      ? runtimeEntityDetail.data.entityKind
      : runtimeInspection?.data.mode === "methods"
        ? "generic-function"
        : runtimeInspection?.data.mode === "describe"
          ? "variable"
          : runtimeInspection?.data.mode === "definitions" || runtimeInspection?.data.mode === "callers"
            ? "function"
            : "unknown";
  const supplementalBrowserSymbols: PackageBrowserSymbolDto[] = runtimeInspection?.data.symbol
    ? [
        {
          symbol: runtimeInspection.data.symbol,
          kind: inspectedSymbolKind,
          visibility: "internal"
        }
      ]
    : [];
  const packageSymbols = [...filteredExternalSymbols, ...filteredInternalSymbols, ...supplementalBrowserSymbols].filter(
    (entry, index, entries) =>
      entries.findIndex(
        (candidate) =>
          candidate.symbol === entry.symbol &&
          candidate.kind === entry.kind &&
          candidate.visibility === entry.visibility
      ) === index
  );
  const focusedPackageSymbol =
    packageSymbols.find((entry) => entry.symbol === (runtimeInspection?.data.symbol ?? runtimeInspectorSymbol)) ??
    null;
  const focusedSymbol = runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbol;
  const focusedPackage =
    runtimeInspection?.data.packageName ??
    runtimeEntityDetail?.data.packageName ??
    (runtimeInspectorPackage || undefined) ??
    packageBrowser?.data.packageName;
  const sourceBackedDetailItem =
    runtimeEntityDetail?.data.relatedItems.find((item) => item.path) ??
    runtimeInspection?.data.items.find((item) => item.path) ??
    null;
  const sourceDraftDirty =
    Boolean(sourcePreview) && sourceDraft !== (sourcePreview?.data.editableContent ?? "");
  const filteredPackageNames = packageNames;
  const scopedSymbolEntries = useMemo(
    () => collectScopedPackageSymbols(symbolPackageScope),
    [packageBrowser, packageBrowserCache, packageNames, symbolPackageScope]
  );
  const scopedClassMethodEntries = useMemo(
    () => collectScopedPackageSymbols(classMethodPackageScope),
    [classMethodPackageScope, packageBrowser, packageBrowserCache, packageNames]
  );

  const kindBuckets = useMemo(
    () => [
      {
        key: "generic-function",
        title: "Generic Functions",
        subtitle: "Method-oriented live dispatch surfaces.",
        symbols: scopedSymbolEntries.filter((entry) => entry.kind === "generic-function"),
        mode: "methods" as RuntimeInspectionMode
      },
      {
        key: "class",
        title: "Classes",
        subtitle: "CLOS classes and related runtime structure.",
        symbols: scopedSymbolEntries.filter((entry) => entry.kind === "class"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "macro",
        title: "Macros",
        subtitle: "Compile-time shaping forms in the selected package.",
        symbols: scopedSymbolEntries.filter((entry) => entry.kind === "macro"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "function",
        title: "Functions",
        subtitle: "Callable definitions and unresolved runtime call surfaces.",
        symbols: scopedSymbolEntries.filter((entry) => entry.kind === "function" || entry.kind === "unknown"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "variable",
        title: "Variables",
        subtitle: "Special variables, runtime bindings, and inspectable symbol values.",
        symbols: scopedSymbolEntries.filter((entry) => entry.kind === "variable"),
        mode: "describe" as RuntimeInspectionMode
      }
    ],
    [scopedSymbolEntries]
  );
  const classBucket = {
    key: "class",
    symbols: scopedClassMethodEntries.filter((entry) => entry.kind === "class")
  };
  const genericFunctionBucket = {
    key: "generic-function",
    symbols: scopedClassMethodEntries.filter((entry) => entry.kind === "generic-function")
  };
  const activeSymbolBucket =
    kindBuckets.find((bucket) => bucket.key === symbolWorkspaceMode) ?? kindBuckets[kindBuckets.length - 1];
  useEffect(() => {
    if (!packageBrowser?.data.packageName) {
      return;
    }
    setPackageBrowserCache((current) =>
      current[packageBrowser.data.packageName] === packageBrowser.data
        ? current
        : {
            ...current,
            [packageBrowser.data.packageName]: packageBrowser.data
          }
    );
  }, [packageBrowser]);

  useEffect(() => {
    if (!environmentId) {
      return;
    }
    const requiredPackages = selectedDomain === "packages" ? scopedPackageNames(selectedPackageName) : [];
    if (requiredPackages.length === 0) {
      return;
    }
    if (packageBrowserPrefetchTimerRef.current !== null) {
      window.clearTimeout(packageBrowserPrefetchTimerRef.current);
      packageBrowserPrefetchTimerRef.current = null;
    }
    if (requiredPackages.length === 1) {
      void ensurePackageBrowserData(requiredPackages[0]);
      return;
    }
    let cancelled = false;
    const pendingPackages = requiredPackages.filter(
      (packageName) => !packageBrowserCache[packageName] && packageBrowser?.data.packageName !== packageName
    );
    const loadNextBatch = async () => {
      if (cancelled || pendingPackages.length === 0) {
        return;
      }
      const nextBatch = pendingPackages.splice(0, 4);
      const loadedEntries: Record<string, PackageBrowserDto> = {};
      for (const packageName of nextBatch) {
        if (cancelled) {
          return;
        }
        const result = await fetchPackageBrowserData(packageName);
        if (result) {
          loadedEntries[packageName] = result;
        }
      }
      commitPackageBrowserCacheEntries(loadedEntries);
      if (cancelled || pendingPackages.length === 0) {
        return;
      }
      packageBrowserPrefetchTimerRef.current = window.setTimeout(() => {
        void loadNextBatch();
      }, 80);
    };
    void loadNextBatch();
    return () => {
      cancelled = true;
      if (packageBrowserPrefetchTimerRef.current !== null) {
        window.clearTimeout(packageBrowserPrefetchTimerRef.current);
        packageBrowserPrefetchTimerRef.current = null;
      }
    };
  }, [
    classMethodPackageScope,
    environmentId,
    packageBrowser,
    packageBrowserCache,
    packageNames,
    selectedDomain,
    symbolPackageScope
  ]);

  useEffect(() => {
    if (selectedDomain !== "symbols") {
      return;
    }
    console.info(
      "[browser-symbols] scope=%s packageCount=%d cacheCount=%d rowCount=%d lane=%s",
      symbolPackageScope,
      packageNames.length,
      Object.keys(packageBrowserCache).length,
      symbolPageResult?.data.items.length ?? 0,
      symbolWorkspaceMode
    );
  }, [
    symbolPageResult,
    packageBrowserCache,
    packageNames.length,
    selectedDomain,
    symbolPackageScope,
    symbolWorkspaceMode
  ]);
  useEffect(() => {
    setSymbolPage(1);
  }, [symbolPackageScope, symbolSearchTerm, symbolVisibilityFilter, symbolWorkspaceMode, symbolPageSize]);

  useEffect(() => {
    setClassMethodPage(1);
  }, [classMethodMode, classMethodPackageScope, classMethodSearchTerm, classMethodPageSize]);

  useEffect(() => {
    let cancelled = false;
    if (selectedDomain !== "symbols") {
      return;
    }
    void (async () => {
      const result = await loadRuntimeSymbolPage({
        packageScope: symbolPackageScope,
        kinds: symbolKindsForMode(symbolWorkspaceMode),
        visibility: symbolVisibilityFilter,
        search: symbolSearchTerm,
        page: symbolPage,
        pageSize: symbolPageSize
      });
      if (!cancelled) {
        console.info(
          "[browser-symbol-page] scope=%s lane=%s total=%d items=%d page=%d pageSize=%d",
          symbolPackageScope,
          symbolWorkspaceMode,
          result?.data.totalCount ?? 0,
          result?.data.items.length ?? 0,
          symbolPage,
          symbolPageSize
        );
        setSymbolPageResult(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    resolvedBrowserEnvironmentId,
    environmentId,
    selectedDomain,
    symbolPackageScope,
    symbolWorkspaceMode,
    symbolVisibilityFilter,
    symbolSearchTerm,
    symbolPage,
    symbolPageSize
  ]);

  useEffect(() => {
    let cancelled = false;
    if (selectedDomain !== "classes-methods") {
      return;
    }
    void (async () => {
      const result = await loadRuntimeSymbolPage({
        packageScope: classMethodPackageScope,
        kinds: classMethodKindsForMode(classMethodMode),
        search: classMethodSearchTerm,
        page: classMethodPage,
        pageSize: classMethodPageSize
      });
      if (!cancelled) {
        console.info(
          "[browser-class-page] scope=%s mode=%s total=%d items=%d page=%d pageSize=%d",
          classMethodPackageScope,
          classMethodMode,
          result?.data.totalCount ?? 0,
          result?.data.items.length ?? 0,
          classMethodPage,
          classMethodPageSize
        );
        setClassMethodPageResult(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    classMethodMode,
    classMethodPackageScope,
    environmentId,
    resolvedBrowserEnvironmentId,
    classMethodPage,
    classMethodPageSize,
    classMethodSearchTerm,
    selectedDomain
  ]);
  const sourceEntries = [
    ...(runtimeEntityDetail?.data.relatedItems ?? []),
    ...(runtimeInspection?.data.items ?? [])
  ].filter((item, index, items) => Boolean(item.path) && items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index);
  const selectedSystem =
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystemName)?.name ??
    runtimeSummary?.loadedSystemEntries[0]?.name ??
    runtimeSummary?.loadedSystems[0] ??
    null;
  const selectedSystemEntry =
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystem) ?? null;
  const selectedScope =
    runtimeSummary?.scopes.find((scope) => scope.scopeId === selectedScopeId) ?? runtimeSummary?.scopes[0] ?? null;
  const selectedSourceEntry =
    sourceEntries.find((item) => `${item.path}:${item.line ?? 0}` === selectedSourceEntryKey) ?? sourceEntries[0] ?? null;
  const xrefEntries =
    xrefMode === "incoming"
      ? runtimeInspection?.data.mode === "callers"
        ? runtimeInspection.data.items
        : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label === "Caller")
      : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label !== "Caller");
  const orchestrationApprovalById = new Map(
    orchestrationInbox
      .map((entry) => {
        const record = browserRecord(entry);
        const approvalId = browserString(record.approvalId, browserRecord(record.approvalSummary).approvalId);
        return approvalId ? [approvalId, record] : null;
      })
      .filter((entry): entry is [string, Record<string, unknown>] => Array.isArray(entry))
  );
  const governanceEntries: Array<{
    id: string;
    label: string;
    detail: string;
    badge: string;
    correctiveContext?: WorkItemSummaryDto["correctiveContext"];
    desktopTaskRecord?: DesktopTaskRecordDto | null;
  }> = [
    ...approvalRequests.map((request) => {
      const orchestrationEntry = orchestrationApprovalById.get(request.requestId);
      return {
        id: request.requestId,
        label: browserString(orchestrationEntry?.goal, request.title) ?? request.title,
        detail:
          browserString(
            orchestrationEntry?.primaryCommandDescription,
            orchestrationEntry?.nextAction,
            request.summary
          ) ?? request.summary,
        badge: request.state
      };
    }),
    ...incidents.map((incident) => ({
      id: incident.incidentId,
      label: incident.title,
      detail: `Severity ${incident.severity}`,
      badge: incident.state
    })),
    ...workItems.map((item) => ({
      id: item.workItemId,
      label: item.title,
      detail:
        item.correctiveContext?.proposedActions[0]?.reason ??
        item.waitingReason ??
        "Governed work remains attached to this environment.",
      badge: item.state,
      correctiveContext: item.correctiveContext ?? null
    })),
    ...desktopTaskRecords.map((record) => ({
      id: record.id,
      label: `${record.target} / ${record.operation}`,
      detail:
        record.approvalStatus === "awaiting-approval"
          ? "Governed task is staged and awaiting approval."
          : record.lastError
            ? String(record.lastError.message ?? record.lastError.error ?? "Governed task recorded an error.")
            : String(record.result?.summary ?? record.metadata?.summary ?? "Governed desktop task record."),
      badge: record.status,
      desktopTaskRecord: record
    }))
  ];
  const linkedConversationEntries = threads.map((thread) => ({
    id: thread.threadId,
    label: thread.title,
    detail: thread.summary,
    badge: thread.state,
    flags: thread.attentionFlags,
    latestTurnState: thread.latestTurnState,
    latestActivityAt: thread.latestActivityAt
  }));
  const linkedConversationSearchTokens = [focusedSymbol, focusedPackage, selectedPackageName, sourcePreview?.data.path]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const prioritizedLinkedConversationEntries = linkedConversationEntries
    .map((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.flags.join(" ")}`.toLowerCase();
      const matchScore = linkedConversationSearchTokens.reduce(
        (score, token) => (haystack.includes(token) ? score + 1 : score),
        0
      );
      return { ...entry, matchScore };
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.label.localeCompare(right.label));
  const selectedLinkedConversation =
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedLinkedConversationId) ??
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedThreadId) ??
    prioritizedLinkedConversationEntries[0] ??
    null;
  const documentationEntries = [
    {
      key: "focus",
      label: "Current Focus",
      category: "entity",
      summary: runtimeInspection?.data.summary ?? runtimeEntityDetail?.data.summary ?? "No focused entity summary is available yet.",
      detail:
        runtimeEntityDetail?.data.signature ??
        runtimeInspection?.data.runtimePresence ??
        "Select a live entity to project its environment-linked explanation."
    },
    {
      key: "package",
      label: "Package Context",
      category: "package",
      summary:
        packageBrowser?.data.summary ??
        `Package ${focusedPackage ?? runtimeSummary?.currentPackage ?? "CL-USER"} remains the active semantic namespace.`,
      detail:
        packageBrowser?.data.useList.length
          ? `Uses ${packageBrowser.data.useList.join(", ")}`
          : "No package dependency summary is loaded for the current focus."
    },
    {
      key: "source",
      label: "Source Relationship",
      category: "source",
      summary:
        sourcePreview?.data.summary ??
        runtimeSummary?.sourceRelationship ??
        "The browser will project source relationship once a source-backed entity is selected.",
      detail:
        sourcePreview?.data.path
          ? `${sourcePreview.data.path}${sourcePreview.data.focusLine ? ` line ${sourcePreview.data.focusLine}` : ""}`
          : "No source file is currently open in the browser."
    },
    {
      key: "runtime",
      label: "Runtime Posture",
      category: "runtime",
      summary:
        runtimeInspection?.data.divergence ??
        runtimeSummary?.divergencePosture ??
        "Runtime and source posture will be summarized once inspection data is loaded.",
      detail:
        runtimeInspection?.data.items[0]?.detail ??
        runtimeEntityDetail?.data.facets[0]?.value ??
        "No runtime facet has been surfaced yet."
    },
    {
      key: "conversation",
      label: "Conversation Attachment",
      category: "conversation",
      summary:
        selectedThread?.summary ??
        selectedLinkedConversation?.detail ??
        "No conversation is currently attached to the browser focus.",
      detail:
        selectedThread
          ? `${selectedThread.turns.length} turns, ${selectedThread.linkedEntities.length} linked entities`
          : selectedLinkedConversation
            ? `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`
            : "Select a linked thread to establish conversational continuity."
    }
  ];
  const selectedDocumentation =
    documentationEntries.find((entry) => entry.key === selectedDocumentationKey) ?? documentationEntries[0];
  const effectiveEntityKind =
    runtimeEntityDetail?.data.entityKind ??
    focusedPackageSymbol?.kind ??
    (classBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "class" : null) ??
    (genericFunctionBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "generic-function" : null) ??
    (runtimeInspection?.data.mode === "methods" ? "generic-function" : null) ??
    (runtimeInspection?.data.symbol ? "unknown" : focusedPackage ? "package" : null);
  const listenerHandoffForm = buildListenerForm({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    mode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
    sourcePath: sourcePreview?.data.path,
    line: sourcePreview?.data.focusLine ?? null
  });
  const sourceOperationForms = buildSourceOperationForms({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    path: sourcePreview?.data.path ?? selectedSourceEntry?.path ?? sourceBackedDetailItem?.path ?? null,
    line: sourcePreview?.data.focusLine ?? selectedSourceEntry?.line ?? sourceBackedDetailItem?.line ?? null
  });
  const activeListenerForm =
    listenerActionMode === "inspect"
      ? sourceOperationForms.inspect
      : listenerActionMode === "reload"
        ? sourceOperationForms.reload
        : listenerActionMode === "evaluate"
          ? sourceOperationForms.evaluate
          : listenerActionMode === "custom"
            ? (customListenerForm ?? listenerHandoffForm)
          : listenerHandoffForm;
  const conversationHandoffPrompt = buildConversationPrompt({
    focusKind: environmentFocus.kind,
    symbol: environmentFocus.runtimeSymbol,
    packageName: environmentFocus.runtimePackage,
    mode: environmentFocus.runtimeInspectionMode,
    sourcePath: environmentFocus.sourcePath,
    line: environmentFocus.sourceLine,
    approvalId: environmentFocus.approvalId,
    workItemId: environmentFocus.workItemId,
    incidentId: environmentFocus.incidentId,
    artifactId: environmentFocus.artifactId,
    eventCursor: environmentFocus.eventCursor,
    threadTitle: selectedThread?.title ?? selectedLinkedConversation?.label,
    threadState: selectedThread?.state ?? selectedLinkedConversation?.badge,
    latestTurnState: selectedThread?.turns[0]?.state ?? selectedLinkedConversation?.latestTurnState
  });
  const entityQuickForms = buildEntityQuickForms({
    symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null,
    packageName: focusedPackage ?? null,
    entityKind: effectiveEntityKind
  });
  const domainDescriptor =
    browserDomains.find((domain) => domain.id === selectedDomain) ?? browserDomains[0];
  const packageRows = filteredPackageNames.map((packageName) => ({
    key: packageName,
    packageName,
    nicknameSummary: packageName === runtimeSummary?.currentPackage ? "current" : "package",
    usesSummary:
      packageName === packageBrowser?.data.packageName
        ? `${packageBrowser?.data.useList.length ?? 0} links`
        : "browse"
  }));
  const packageSymbolRows = (
    (packageWorkspaceMode === "exports" ? packageBrowser?.data.externalSymbols : packageBrowser?.data.internalSymbols) ?? []
  ).map((entry) => ({
    key: `${packageWorkspaceMode}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: packageWorkspaceMode === "exports" ? "external" : "internal"
  }));
  const activeSymbolRows = (symbolPageResult?.data.items ?? []).map((entry) => ({
    key: `${activeSymbolBucket.key}:${entry.visibility}:${entry.symbol}`,
    packageName: entry.packageName,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: entry.visibility,
    inspectionMode:
      entry.kind === "generic-function"
        ? ("methods" as RuntimeInspectionMode)
        : entry.kind === "variable" || entry.kind === "unknown"
          ? ("describe" as RuntimeInspectionMode)
          : activeSymbolBucket.mode
  }));
  const classMethodRows =
    (classMethodPageResult?.data.items ?? []).map((entry) => ({
      key: `${classMethodMode}:${entry.packageName}:${entry.symbol}`,
      packageName: entry.packageName,
      symbol: entry.symbol,
      kind: entry.kind,
      action: classMethodMode === "classes" ? "browse class" : "browse methods"
    })) ?? [];
  const systemRows = runtimeSummary?.loadedSystemEntries.map((system) => ({
    key: system.name,
    name: system.name,
    type: system.type === "asdf-system" ? "ASDF System" : "Unknown",
    status: system.status,
    browse: "definition"
  })) ?? [];
  const runtimeScopeRows = runtimeSummary?.scopes.map((scope) => ({
    key: scope.scopeId,
    scopeId: scope.scopeId,
    scopeLabel: scope.symbolName ?? scope.packageName,
    kind: scope.kind,
    summary: scope.summary,
    symbolName: scope.symbolName,
    packageName: scope.packageName
  })) ?? [];
  const telemetryProcessRows =
    runtimeTelemetry?.processes.map((process) => ({
      key: process.processId,
      processId: process.processId,
      label: process.label,
      kind: process.kind,
      state: process.state,
      cpu: process.cpuPercent != null ? `${process.cpuPercent.toFixed(1)}%` : "n/a",
      memory: process.memoryMb != null ? `${process.memoryMb.toFixed(1)} MB` : "n/a",
      summary: process.summary
    })) ?? [];
  const selectedTelemetryProcess =
    runtimeTelemetry?.processes.find((process) => process.processId === selectedTelemetryProcessId) ??
    runtimeTelemetry?.processes[0] ??
    null;
  const consoleEntries = consoleLogStream?.data.entries ?? [];
  const filteredConsoleEntries = consoleEntries.filter(
    (entry) => selectedConsoleSourceFilter === "All Sources" || entry.source === selectedConsoleSourceFilter
  );
  const consoleRows =
    filteredConsoleEntries.map((entry) => ({
      key: entry.entryId,
      entryId: entry.entryId,
      timestamp: entry.timestamp,
      type: entry.type,
      source: entry.source,
      message: entry.message,
      processName: entry.processName ?? "n/a",
      activityId: entry.activityId ?? "n/a",
      threadRef: entry.threadRefId ?? entry.turnRefId ?? "n/a"
    })) ?? [];
  const consoleAlertCount = consoleEntries.filter(
    (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
  ).length;
  const visibleConsoleAlertCount = filteredConsoleEntries.filter(
    (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
  ).length;
  const consoleProcessCount = new Set(consoleEntries.map((entry) => entry.processName).filter(Boolean)).size;
  const visibleConsoleProcessCount = new Set(filteredConsoleEntries.map((entry) => entry.processName).filter(Boolean)).size;
  const consoleTopSource =
    Object.entries(
      consoleEntries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.source] = (counts[entry.source] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a";
  const visibleConsoleTopSource =
    Object.entries(
      filteredConsoleEntries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.source] = (counts[entry.source] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a";
  const selectedConsoleEntry =
    filteredConsoleEntries.find((entry) => entry.entryId === selectedConsoleEntryId) ??
    filteredConsoleEntries[0] ??
    null;
  const filteredDiagnosticReports = diagnosticReports.filter(
    (report) => selectedDiagnosticSourceFilter === "All Sources" || report.source === selectedDiagnosticSourceFilter
  );
  const diagnosticRows = filteredDiagnosticReports.map((report) => ({
    key: report.reportId,
    reportId: report.reportId,
    title: report.title,
    kind: report.kind,
    source: report.source,
    createdAt: report.createdAt,
    processName: report.processName ?? "n/a",
    pid: report.pid != null ? String(report.pid) : "n/a",
    summary: report.summary,
    incidentId: String(
      (selectedDiagnosticReport?.reportId === report.reportId
        ? selectedDiagnosticReport.metadata?.incidentId
        : null) ?? "n/a"
    ),
    bugType: String(
      (selectedDiagnosticReport?.reportId === report.reportId
        ? selectedDiagnosticReport.metadata?.bugType
        : null) ?? "n/a"
    )
  }));
  const diagnosticCrashCount = diagnosticReports.filter((report) => report.kind === "crash").length;
  const diagnosticSpinCount = diagnosticReports.filter((report) => report.kind === "spin").length;
  const visibleDiagnosticCrashCount = filteredDiagnosticReports.filter((report) => report.kind === "crash").length;
  const visibleDiagnosticSpinCount = filteredDiagnosticReports.filter((report) => report.kind === "spin").length;
  const diagnosticProcessCount = new Set(diagnosticReports.map((report) => report.processName).filter(Boolean)).size;
  const visibleDiagnosticProcessCount = new Set(
    filteredDiagnosticReports.map((report) => report.processName).filter(Boolean)
  ).size;
  const latestDiagnosticTimestamp = diagnosticReports[0]?.createdAt ?? null;
  const latestVisibleDiagnosticTimestamp = filteredDiagnosticReports[0]?.createdAt ?? null;
  const selectedDiagnosticReportSummary =
    filteredDiagnosticReports.find((report) => report.reportId === selectedDiagnosticReportId) ??
    filteredDiagnosticReports[0] ??
    null;
  const activeSelectedDiagnosticReport =
    selectedDiagnosticReportSummary?.reportId === selectedDiagnosticReport?.reportId ? selectedDiagnosticReport : null;
  const sourceRows = sourceEntries.map((item) => ({
    key: `${item.path}:${item.line ?? 0}`,
    label: item.label,
    location: item.path?.split("/").slice(-2).join("/") ?? "no-path",
    role: item.emphasis ?? "source",
    path: item.path,
    line: item.line
  }));
  const xrefRows = (xrefEntries ?? []).map((item) => ({
    key: `${xrefMode}:${item.label}:${item.detail}:${item.line ?? 0}`,
    label: item.label,
    emphasis: item.emphasis ?? "reference",
    detail: item.detail,
    path: item.path,
    line: item.line
  }));
  const governanceRows: Array<{
    key: string;
    objectId: string;
    objectType: string;
    label: string;
    detail: string;
    badge: string;
    trace: string;
    correctiveContext?: WorkItemSummaryDto["correctiveContext"];
    tone: "active" | "warning" | "danger" | "steady";
  }> = governanceEntries.map((entry) => ({
    key: `${entry.badge}:${entry.id}`,
    objectId: entry.id,
    objectType: approvalRequests.some((request) => request.requestId === entry.id)
      ? "Approval"
      : incidents.some((incident) => incident.incidentId === entry.id)
        ? "Incident"
        : entry.desktopTaskRecord
          ? "Desktop Task"
        : entry.correctiveContext
          ? "Corrective Work Item"
          : "Work Item",
    label: entry.label,
    detail: entry.detail,
    badge: entry.badge,
    trace: approvalRequests.some((request) => request.requestId === entry.id)
      ? "Actions > Actions Board"
      : incidents.some((incident) => incident.incidentId === entry.id)
        ? "Actions > Actions Board"
        : entry.desktopTaskRecord
          ? "Governed Task Ledger"
        : entry.correctiveContext
          ? "Actions > Actions Board"
          : "Actions > Actions Board",
    tone:
      entry.badge === "blocked" || entry.badge === "denied" || entry.badge === "failed" || entry.badge === "retryable-failure"
        ? "danger"
        : entry.badge === "waiting" || entry.badge === "recovering" || entry.badge === "awaiting" || entry.badge === "awaiting-approval" || entry.badge === "retrying"
          ? "warning"
          : "active",
    correctiveContext: entry.correctiveContext ?? null
  }));
  const linkedConversationRows: Array<{
    key: string;
    id: string;
    label: string;
    state: string;
    attention: string;
    stateTone: "active" | "warning" | "danger" | "steady";
    attentionTone: "active" | "warning" | "danger" | "steady";
    detail: string;
  }> = prioritizedLinkedConversationEntries.map((entry) => ({
    key: entry.id,
    id: entry.id,
    label: entry.label,
    state: entry.badge,
    attention: entry.flags[0] ?? entry.latestTurnState,
    stateTone: toneForThreadState(entry.badge as ThreadSummaryDto["state"]),
    attentionTone:
      entry.latestTurnState === "failed"
        ? "danger"
        : entry.latestTurnState === "awaiting_approval" || entry.latestTurnState === "interrupted"
          ? "warning"
          : "active",
    detail: entry.detail
  }));
  const selectedGovernanceEntry =
    governanceRows.find((row) => row.key === selectedGovernanceKey) ??
    governanceRows[0] ??
    null;
  const selectedGovernanceWorkSummary =
    selectedGovernanceEntry &&
    (selectedGovernanceEntry.objectType === "Work Item" || selectedGovernanceEntry.objectType === "Corrective Work Item")
      ? workItems.find((item) => item.workItemId === selectedGovernanceEntry.objectId) ?? null
      : null;
  const selectedGovernanceTaskRecord =
    selectedGovernanceEntry?.objectType === "Desktop Task"
      ? desktopTaskRecords.find((record) => record.id === selectedGovernanceEntry.objectId) ?? null
      : null;
  const selectedGovernanceFallbackApproval =
    selectedGovernanceWorkSummary && selectedGovernanceWorkSummary.approvalCount > 0
      ? approvalRequests.find((request) => request.state === "awaiting") ?? null
      : null;
  const selectedGovernanceApprovalId =
    selectedGovernanceEntry?.objectType === "Approval"
      ? selectedGovernanceEntry.objectId
      : selectedGovernanceFallbackApproval?.requestId ?? null;
  const selectedGovernanceApprovalSummary = selectedGovernanceApprovalId
    ? approvalRequests.find((request) => request.requestId === selectedGovernanceApprovalId) ?? null
    : null;
  const selectedGovernanceOrchestration = selectedGovernanceApprovalId
    ? orchestrationApprovalById.get(selectedGovernanceApprovalId) ?? null
    : null;
  const selectedGovernanceIdentityRows = selectedGovernanceEntry
    ? [
        ["Object Id", selectedGovernanceEntry.objectId],
        ["Authority", selectedGovernanceEntry.objectType],
        ["Trace", selectedGovernanceEntry.trace]
      ]
    : [];
  const selectedGovernanceCorrectiveRows = selectedGovernanceEntry?.correctiveContext
    ? [
        ["Corrective Kind", selectedGovernanceEntry.correctiveContext.kind],
        ["Decision", selectedGovernanceEntry.correctiveContext.decision ?? "unknown"],
        ["Approval Posture", selectedGovernanceEntry.correctiveContext.approvalPosture ?? "unknown"],
        [
          "Alignment",
          selectedGovernanceEntry.correctiveContext.alignmentStatus
            ? `${selectedGovernanceEntry.correctiveContext.alignmentStatus}${
                selectedGovernanceEntry.correctiveContext.alignmentScore != null
                  ? ` (${selectedGovernanceEntry.correctiveContext.alignmentScore.toFixed(2)})`
                  : ""
              }`
            : "unknown"
        ]
      ]
    : [];
  const selectedGovernanceTaskRows = selectedGovernanceTaskRecord
    ? [
        ["Target", selectedGovernanceTaskRecord.target],
        ["Operation", selectedGovernanceTaskRecord.operation],
        ["Capability", selectedGovernanceTaskRecord.capability ?? "unspecified"],
        ["Governance", selectedGovernanceTaskRecord.governanceStatus ?? "unknown"],
        ["Approval", selectedGovernanceTaskRecord.approvalStatus ?? "unknown"],
        [
          "Retries",
          `${selectedGovernanceTaskRecord.retryCount ?? 0}/${selectedGovernanceTaskRecord.maxAttempts ?? 1}`
        ],
        ["Thread", selectedGovernanceTaskRecord.threadId ?? "n/a"],
        ["Turn", selectedGovernanceTaskRecord.turnId ?? "n/a"]
      ]
    : [];
  const selectedGovernanceOrchestrationRows = selectedGovernanceOrchestration
    ? [
        ["Plan", browserString(selectedGovernanceOrchestration.planId, browserRecord(selectedGovernanceOrchestration.plan).id) ?? "n/a"],
        [
          "Workflow",
          browserString(
            selectedGovernanceOrchestration.workflowRecordId,
            browserRecord(selectedGovernanceOrchestration.workflow).workflowRecordId
          ) ?? "n/a"
        ],
        ["Action", browserString(selectedGovernanceOrchestration.action, selectedGovernanceOrchestration.primaryCommandKind) ?? "inspect"],
        ["Waiting On", browserString(selectedGovernanceOrchestration.waitingOn, browserRecord(selectedGovernanceOrchestration.postureSummary).waitingOn) ?? "none"],
        ["Primary Command", browserString(selectedGovernanceOrchestration.primaryCommandLabel, browserRecord(selectedGovernanceOrchestration.primaryCommand).label) ?? "n/a"],
        [
          "Command Detail",
          browserString(
            selectedGovernanceOrchestration.primaryCommandDescription,
            browserRecord(selectedGovernanceOrchestration.primaryCommand).description
          ) ?? "n/a"
        ]
      ]
    : [];
  const selectedLinkedConversationIdentityRows = selectedLinkedConversation
    ? [
        ["Object Id", selectedLinkedConversation.id],
        ["Authority", selectedLinkedConversation.badge],
        ["Trace", `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`]
      ]
    : [];
  const selectedSystemIdentityRows = selectedSystemEntry
    ? [
        ["Object Id", selectedSystemEntry.name],
        ["Authority", selectedSystemEntry.type === "asdf-system" ? "ASDF System" : "System"],
        ["Trace", selectedSystemEntry.status]
      ]
    : [];
  const documentationRows = documentationPages.map((page) => ({
    key: page.slug,
    slug: page.slug,
    label: page.title,
    category: page.category,
    summary: page.summary
  }));
  const browserFocusIdentityRows = [
    [
      "Object Id",
      focusedSymbol
        ? focusedPackage
          ? `${focusedPackage}::${focusedSymbol}`
          : focusedSymbol
        : focusedPackage ?? domainDescriptor.label
    ],
    ["Authority", effectiveEntityKind ?? domainDescriptor.label],
    [
      "Trace",
      sourcePreview?.data.path
        ? `${sourcePreview.data.path}${sourcePreview.data.focusLine ? `:${sourcePreview.data.focusLine}` : ""}`
        : runtimeInspection?.data.mode ?? "browse"
    ]
  ];
  const showGenericBrowserFocus = false;

  function buildFilterOptions(values: string[]): BrowserTableFilterOption[] {
    return Array.from(new Set(values.filter(Boolean))).map((value) => ({
      label: value,
      value
    }));
  }

  useEffect(() => {
    if (runtimeForm !== activeListenerForm) {
      setRuntimeForm(activeListenerForm);
    }
  }, [activeListenerForm, runtimeForm, setRuntimeForm]);

  useEffect(() => {
    if (selectedDomain !== "symbols" || !runtimeInspection?.data.symbol) {
      return;
    }

    if (runtimeInspection.data.mode === "methods" && symbolWorkspaceMode !== "generic-function") {
      setSymbolWorkspaceMode("generic-function");
      return;
    }

    if (runtimeEntityDetail?.data.entityKind === "class" && symbolWorkspaceMode !== "class") {
      setSymbolWorkspaceMode("class");
    }
  }, [
    runtimeEntityDetail?.data.entityKind,
    runtimeInspection?.data.mode,
    runtimeInspection?.data.symbol,
    selectedDomain,
    symbolWorkspaceMode
  ]);

  useEffect(() => {
    if (
      conversationDraft === previousConversationHandoffPromptRef.current &&
      conversationDraft !== conversationHandoffPrompt
    ) {
      setConversationDraft(conversationHandoffPrompt);
    }
    previousConversationHandoffPromptRef.current = conversationHandoffPrompt;
  }, [conversationDraft, conversationHandoffPrompt, setConversationDraft]);

  useEffect(() => {
    setListenerActionMode("default");
    setCustomListenerForm(null);
  }, [focusedSymbol, focusedPackage, sourcePreview?.data.path, sourcePreview?.data.focusLine]);

  return (
    <div className="browser-journey">
      <div className="browser-layout">
        <div className="browser-main-stack browser-main-stack-full">
          <section className="panel browser-detail-panel browser-domain-pane browser-inspector-panel">
            <div className="browser-domain-header">
              <div>
                <p className="eyebrow">Browser</p>
                <h3>{domainDescriptor.label}</h3>
              </div>
            </div>
            {showGenericBrowserFocus ? (
              <>
                <div className="browser-focus-card">
                  <div>
                    <p className="context-label">Focused Entity</p>
                    <strong>{focusedSymbol ?? focusedPackage ?? domainDescriptor.label}</strong>
                    <p>
                      {runtimeInspection?.data.summary ??
                        runtimeEntityDetail?.data.summary ??
                        sourcePreview?.data.summary ??
                        domainDescriptor.summary}
                    </p>
                  </div>
                  <Badge tone="steady">{effectiveEntityKind ?? "browser focus"}</Badge>
                </div>
                <dl className="detail-list">
                  {browserFocusIdentityRows.map(([label, value]) => (
                    <DetailRow key={`browser-focus:${label}`} label={label} value={value} />
                  ))}
                </dl>
              </>
            ) : null}
            {selectedDomain === "packages" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <BrowserModePicker
                    label="Package View"
                    onChange={(value) => setPackageWorkspaceMode(value as typeof packageWorkspaceMode)}
                    options={[
                      { value: "packages", label: "Packages" },
                      { value: "exports", label: "Exports" },
                      { value: "internals", label: "Internals" }
                    ]}
                    value={packageWorkspaceMode}
                  />
                </div>
                {packageWorkspaceMode === "packages" ? (
                  <BrowserDataTable
                    key="packages-packages"
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "package",
                        label: "Package",
                        render: (row) => <strong>{row.packageName}</strong>,
                        sortValue: (row) => row.packageName
                      },
                      {
                        id: "status",
                        label: "Status",
                        render: (row) => row.nicknameSummary,
                        sortValue: (row) => row.nicknameSummary
                      },
                      {
                        id: "uses",
                        label: "Uses",
                        render: (row) => row.usesSummary,
                        sortValue: (row) => row.usesSummary
                      }
                    ]}
                    emptyMessage="No matching packages are available."
                    filterLabel="Package Filter"
                    filterOptions={buildFilterOptions(packageRows.map((row) => row.nicknameSummary))}
                    getFilterValue={(row) => row.nicknameSummary}
                    getRowKey={(row) => row.key}
                    onSelect={(row) => {
                      setSelectedPackageName(row.packageName);
                      void browseRuntimeEntity(row.packageName, row.packageName, "definitions");
                    }}
                    rows={packageRows}
                    searchPlaceholder="Search packages"
                    selectedKey={packageBrowser?.data.packageName ?? selectedPackageName}
                  />
                ) : (
                  <BrowserDataTable
                    key={`packages-${packageWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols are available in this package lane."
                    filterLabel="Visibility"
                    filterOptions={buildFilterOptions(packageSymbolRows.map((row) => row.kind))}
                    getFilterValue={(row) => row.kind}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(
                        row.symbol,
                        packageBrowser?.data.packageName,
                        row.kind === "generic-function" ? "methods" : "definitions"
                      )
                    }
                    rows={packageSymbolRows}
                    searchPlaceholder={`Search ${packageWorkspaceMode} symbols`}
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                )}
              </div>
            ) : selectedDomain === "symbols" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <BrowserModePicker
                    label="Symbol Lane"
                    onChange={(value) => setSymbolWorkspaceMode(value as typeof symbolWorkspaceMode)}
                    options={kindBuckets.map((bucket) => ({
                      value: bucket.key,
                      label: bucket.title
                    }))}
                    value={symbolWorkspaceMode}
                  />
                  <FilterSelect
                    label="Package"
                    onChange={(value) => {
                      setSymbolPackageScope(value);
                      if (value !== allPackagesOption) {
                        setSelectedPackageName(value);
                      }
                    }}
                    options={packageScopeOptions}
                    value={symbolPackageScope}
                  />
                </div>
                <section className="browser-symbol-panel">
                  <div className="browser-symbol-header">
                    <strong>{activeSymbolBucket.title}</strong>
                    <span>{activeSymbolBucket.subtitle}</span>
                  </div>
                  <BrowserDataTable
                    key={`symbols-${symbolWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.05fr) minmax(0, 1.05fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "package",
                        label: "Package",
                        render: (row) => row.packageName,
                        sortValue: (row) => row.packageName
                      },
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols in this lane."
                    filterLabel="Visibility"
                    filterOptions={[
                      { label: "External", value: "external" },
                      { label: "Internal", value: "internal" }
                    ]}
                    getFilterValue={(row) => row.visibility}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(row.symbol, row.packageName, row.inspectionMode)
                    }
                    remotePagination={{
                      totalRowCount: symbolPageResult?.data.totalCount ?? 0,
                      page: symbolPage,
                      pageSize: symbolPageSize,
                      searchTerm: symbolSearchTerm,
                      activeFilter: symbolVisibilityFilter,
                      onPageChange: setSymbolPage,
                      onPageSizeChange: setSymbolPageSize,
                      onSearchTermChange: setSymbolSearchTerm,
                      onFilterChange: setSymbolVisibilityFilter
                    }}
                    rows={activeSymbolRows}
                    searchPlaceholder="Search symbols"
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                  {activeSymbolRows.length === 0 && runtimeInspection?.data.symbol ? (
                    <div className="browser-package-card">
                      <strong>{runtimeInspection.data.symbol}</strong>
                      <p>
                        The live runtime focus is available even though the current package browser lane is sparse. Continue
                        from this inspected symbol while the broader package view catches up.
                      </p>
                      <div className="ref-list">
                        <span className="thread-flag">{runtimeInspection.data.packageName ?? selectedPackageName ?? "runtime"}</span>
                        <span className="thread-flag">{runtimeInspection.data.mode}</span>
                      </div>
                    </div>
                  ) : null}
                </section>
                <section className="browser-secondary-card">
                  <div className="browser-secondary-card-header">
                    <div>
                      <p className="eyebrow">Manual Inspect</p>
                      <h4>Direct Runtime Query</h4>
                    </div>
                    <button
                      className="starter-chip"
                      onClick={() => setSymbolInspectorExpanded((current) => !current)}
                      type="button"
                    >
                      {symbolInspectorExpanded ? "Hide" : "Show"}
                    </button>
                  </div>
                  {symbolInspectorExpanded ? (
                    <div className="runtime-inspector-controls browser-manual-inspector-controls">
                      <input
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                        placeholder="Symbol or package"
                        value={runtimeInspectorSymbol}
                      />
                      <input
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                        placeholder={runtimeSummary?.currentPackage ?? "Package"}
                        value={runtimeInspectorPackage}
                      />
                      <select
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                        value={runtimeInspectionMode}
                      >
                        <option value="describe">Describe</option>
                        <option value="definitions">Definitions</option>
                        <option value="callers">Callers</option>
                        <option value="methods">Methods</option>
                        <option value="divergence">Drift</option>
                      </select>
                      <button
                        className="action-button"
                        disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                        onClick={() => void inspectRuntimeSymbol()}
                        type="button"
                      >
                        {isInspectingRuntime ? "Inspecting..." : "Browse Entity"}
                      </button>
                    </div>
                  ) : (
                    <p className="inspector-copy">Ad hoc symbol, package, and XREF queries stay available here when needed.</p>
                  )}
                </section>
              </div>
            ) : selectedDomain === "classes-methods" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <BrowserModePicker
                    label="Entity Set"
                    onChange={(value) => setClassMethodMode(value as typeof classMethodMode)}
                    options={[
                      { value: "classes", label: "Classes" },
                      { value: "generic-functions", label: "Generic Functions" }
                    ]}
                    value={classMethodMode}
                  />
                  <FilterSelect
                    label="Package"
                    onChange={(value) => {
                      setClassMethodPackageScope(value);
                      if (value !== allPackagesOption) {
                        setSelectedPackageName(value);
                      }
                    }}
                    options={packageScopeOptions}
                    value={classMethodPackageScope}
                  />
                </div>
                <BrowserDataTable
                  key={`classes-methods-${classMethodMode}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "package",
                      label: "Package",
                      render: (row) => row.packageName,
                      sortValue: (row) => row.packageName
                    },
                    {
                      id: "entity",
                      label: classMethodMode === "classes" ? "Class" : "Generic Function",
                      render: (row) => <strong>{row.symbol}</strong>,
                      sortValue: (row) => row.symbol
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "action",
                      label: "Action",
                      render: (row) => row.action,
                      sortValue: (row) => row.action
                    }
                  ]}
                  emptyMessage="No matching entities in this domain."
                  filterLabel="Kind"
                  filterOptions={[]}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) =>
                    void browseRuntimeEntity(
                      row.symbol,
                      row.packageName,
                      classMethodMode === "classes" ? "definitions" : "methods"
                    )
                  }
                  remotePagination={{
                    totalRowCount: classMethodPageResult?.data.totalCount ?? 0,
                    page: classMethodPage,
                    pageSize: classMethodPageSize,
                    searchTerm: classMethodSearchTerm,
                    activeFilter: "all",
                    onPageChange: setClassMethodPage,
                    onPageSizeChange: setClassMethodPageSize,
                    onSearchTermChange: setClassMethodSearchTerm,
                    onFilterChange: () => undefined
                  }}
                  rows={classMethodRows}
                  searchPlaceholder={`Search ${classMethodMode === "classes" ? "classes" : "generic functions"}`}
                  selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                />
              </div>
            ) : selectedDomain === "systems" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="systems"
                  columnTemplate="minmax(0, 1.25fr) minmax(0, 0.95fr) minmax(0, 0.75fr) minmax(0, 0.8fr)"
                  columns={[
                    {
                      id: "system",
                      label: "System",
                      render: (row) => <strong>{row.name}</strong>,
                      sortValue: (row) => row.name
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.type,
                      sortValue: (row) => row.type
                    },
                    {
                      id: "status",
                      label: "Status",
                      render: (row) => row.status,
                      sortValue: (row) => row.status
                    },
                    {
                      id: "browse",
                      label: "Browse",
                      render: (row) => row.browse,
                      sortValue: (row) => row.browse
                    }
                  ]}
                  emptyMessage="No loaded systems are available."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(systemRows.map((row) => row.type))}
                  getFilterValue={(row) => row.type}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSystemName(row.name);
                    void browseRuntimeEntity(row.name.toUpperCase(), runtimeSummary?.currentPackage, "definitions");
                  }}
                  rows={systemRows}
                  searchPlaceholder="Search loaded systems"
                  selectedKey={selectedSystem}
                />
                {selectedSystemEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected System</p>
                        <strong>{selectedSystemEntry.name}</strong>
                        <p>{selectedSystemEntry.status}</p>
                      </div>
                      <Badge tone="steady">{selectedSystemEntry.type === "asdf-system" ? "ASDF System" : "System"}</Badge>
                    </div>
                    <dl className="detail-list">
                      {selectedSystemIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-system:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    <div className="browser-action-strip">
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "runtime-objects" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="runtime-objects"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "scope",
                      label: "Scope",
                      render: (row) => <strong>{row.scopeLabel}</strong>,
                      sortValue: (row) => row.scopeLabel
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.scopeLabel} ${row.kind} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No runtime scopes are available."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(runtimeScopeRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedScopeId(row.scopeId);
                    void browseRuntimeEntity(
                      row.symbolName ?? row.packageName,
                      row.packageName,
                      row.symbolName ? "describe" : "definitions"
                    );
                  }}
                  rows={runtimeScopeRows}
                  searchPlaceholder="Search runtime scopes"
                  selectedKey={selectedScope?.scopeId ?? null}
                />
              </div>
            ) : selectedDomain === "console" ? (
              <div className="browser-domain-stack">
                <BrowserModePicker
                  label="Console Plane"
                  onChange={(value) => {
                    setSelectedConsolePlane(value as "environment" | "host");
                    setSelectedConsoleSourceFilter("All Sources");
                    setSelectedConsoleEntryId(null);
                  }}
                  options={[
                    { value: "environment", label: "Environment" },
                    { value: "host", label: "Host" }
                  ]}
                  value={selectedConsolePlane}
                />
                <FilterSelect
                  label="Source"
                  onChange={(value) => {
                    setSelectedConsoleSourceFilter(value);
                    setSelectedConsoleEntryId(null);
                  }}
                  options={["All Sources", ...buildFilterOptions(consoleEntries.map((row) => row.source)).map((option) => option.value)]}
                  value={selectedConsoleSourceFilter}
                />
                <div className="metric-grid">
                  <MetricTile label="Visible" value={filteredConsoleEntries.length} />
                  <MetricTile label="Alerts" value={visibleConsoleAlertCount} />
                  <MetricTile label="Processes" value={visibleConsoleProcessCount} />
                  <MetricTile label="Top Source" value={visibleConsoleTopSource} />
                </div>
                <BrowserDataTable
                  key={`console:${selectedConsolePlane}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 1.6fr)"
                  columns={[
                    {
                      id: "source",
                      label: "Source",
                      render: (row) => <strong>{row.source}</strong>,
                      sortValue: (row) => row.source,
                      searchValue: (row) =>
                        `${row.source} ${row.message} ${row.processName} ${row.activityId} ${row.threadRef}`
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.type,
                      sortValue: (row) => row.type
                    },
                    {
                      id: "message",
                      label: "Message",
                      render: (row) => row.message,
                      sortValue: (row) => row.message,
                      searchValue: (row) =>
                        `${row.message} ${row.timestamp} ${row.processName} ${row.activityId} ${row.threadRef}`
                    }
                  ]}
                  emptyMessage="No console entries are currently available."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(consoleRows.map((row) => row.type))}
                  getFilterValue={(row) => row.type}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedConsoleEntryId(row.entryId)}
                  rows={consoleRows}
                  searchPlaceholder="Search console entries"
                  selectedKey={selectedConsoleEntry?.entryId ?? null}
                />
                {selectedConsoleEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Console Entry</p>
                        <strong>{selectedConsoleEntry.source}</strong>
                        <p>{selectedConsoleEntry.message}</p>
                      </div>
                      <Badge tone={selectedConsoleEntry.type === "error" || selectedConsoleEntry.type === "fault" ? "danger" : selectedConsoleEntry.type === "warning" ? "warning" : "steady"}>
                        {selectedConsoleEntry.type}
                      </Badge>
                    </div>
	                    <dl className="detail-list">
	                      <DetailRow label="Plane" value={selectedConsoleEntry.plane} />
	                      <DetailRow label="Timestamp" value={selectedConsoleEntry.timestamp} />
	                      <DetailRow label="Process" value={selectedConsoleEntry.processName ?? "n/a"} />
	                      <DetailRow label="PID" value={selectedConsoleEntry.pid ? String(selectedConsoleEntry.pid) : "n/a"} />
	                      <DetailRow label="Category" value={selectedConsoleEntry.category} />
	                      <DetailRow label="Source" value={selectedConsoleEntry.source} />
	                      <DetailRow label="Activity" value={selectedConsoleEntry.activityId ?? "n/a"} />
	                      <DetailRow label="Thread" value={selectedConsoleEntry.threadRefId ?? selectedConsoleEntry.turnRefId ?? "n/a"} />
	                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "diagnostics" ? (
              <div className="browser-domain-stack">
                <FilterSelect
                  label="Source"
                  onChange={(value) => {
                    setSelectedDiagnosticSourceFilter(value);
                    setSelectedDiagnosticReportId(null);
                  }}
                  options={[
                    "All Sources",
                    ...buildFilterOptions(diagnosticReports.map((row) => row.source)).map((option) => option.value)
                  ]}
                  value={selectedDiagnosticSourceFilter}
                />
                <div className="metric-grid">
                  <MetricTile label="Visible" value={filteredDiagnosticReports.length} />
                  <MetricTile label="Crash" value={visibleDiagnosticCrashCount} />
                  <MetricTile label="Spin" value={visibleDiagnosticSpinCount} />
                  <MetricTile
                    label="Latest"
                    value={latestVisibleDiagnosticTimestamp ? transcriptRecencyLabel(latestVisibleDiagnosticTimestamp) : "n/a"}
                  />
                </div>
                <BrowserDataTable
                  key="diagnostics"
                  columnTemplate="minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                  columns={[
                    {
                      id: "title",
                      label: "Report",
                      render: (row) => <strong>{row.title}</strong>,
                      sortValue: (row) => row.title,
                      searchValue: (row) =>
                        `${row.title} ${row.processName} ${row.pid} ${row.summary} ${row.incidentId} ${row.bugType}`
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "source",
                      label: "Source",
                      render: (row) => row.source,
                      sortValue: (row) => row.source,
                      searchValue: (row) =>
                        `${row.source} ${row.createdAt} ${row.processName} ${row.pid} ${row.summary} ${row.incidentId} ${row.bugType}`
                    }
                  ]}
                  emptyMessage="No retained diagnostic reports are currently available."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(diagnosticRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedDiagnosticReportId(row.reportId)}
                  rows={diagnosticRows}
                  searchPlaceholder="Search diagnostic reports"
                  selectedKey={selectedDiagnosticReportSummary?.reportId ?? null}
                />
                {selectedDiagnosticReportSummary ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Diagnostic Report</p>
                        <strong>{selectedDiagnosticReportSummary.title}</strong>
                        <p>{selectedDiagnosticReportSummary.summary}</p>
                      </div>
                      <Badge tone="warning">{selectedDiagnosticReportSummary.kind}</Badge>
                    </div>
                    <dl className="detail-list">
                      <DetailRow label="Created" value={selectedDiagnosticReportSummary.createdAt} />
                      <DetailRow label="Kind" value={selectedDiagnosticReportSummary.kind} />
                      <DetailRow label="Source" value={selectedDiagnosticReportSummary.source} />
                      <DetailRow label="Process" value={selectedDiagnosticReportSummary.processName ?? "n/a"} />
                      <DetailRow label="Process Count" value={String(diagnosticProcessCount)} />
                      <DetailRow label="Path" value={selectedDiagnosticReportSummary.path ?? "n/a"} />
                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "processes" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="processes"
                  columnTemplate="minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 0.7fr) minmax(0, 0.7fr) minmax(0, 1.2fr)"
                  columns={[
                    {
                      id: "process",
                      label: "Process",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label,
                      searchValue: (row) => `${row.label} ${row.kind} ${row.summary}`
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => row.state,
                      sortValue: (row) => row.state
                    },
                    {
                      id: "cpu",
                      label: "CPU",
                      render: (row) => row.cpu,
                      sortValue: (row) => row.cpu
                    },
                    {
                      id: "memory",
                      label: "Memory",
                      render: (row) => row.memory,
                      sortValue: (row) => row.memory
                    }
                  ]}
                  emptyMessage="No runtime-linked processes are currently visible."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(telemetryProcessRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedTelemetryProcessId(row.processId)}
                  rows={telemetryProcessRows}
                  searchPlaceholder="Search runtime processes"
                  selectedKey={selectedTelemetryProcess?.processId ?? null}
                />
                {selectedTelemetryProcess ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Process</p>
                        <strong>{selectedTelemetryProcess.label}</strong>
                        <p>{selectedTelemetryProcess.summary}</p>
                      </div>
                      <Badge tone="active">{selectedTelemetryProcess.state}</Badge>
                    </div>
                    <dl className="detail-list">
                      <DetailRow label="Object Id" value={selectedTelemetryProcess.processId} />
                      <DetailRow label="PID" value={String(selectedTelemetryProcess.pid ?? "n/a")} />
                      <DetailRow label="CPU" value={selectedTelemetryProcess.cpuPercent != null ? `${selectedTelemetryProcess.cpuPercent.toFixed(1)}%` : "n/a"} />
                      <DetailRow label="Memory" value={selectedTelemetryProcess.memoryMb != null ? `${selectedTelemetryProcess.memoryMb.toFixed(1)} MB` : "n/a"} />
                      <DetailRow label="Elapsed" value={selectedTelemetryProcess.elapsed ?? "n/a"} />
                      <DetailRow label="Authority" value={selectedTelemetryProcess.kind === "compatibility-process" ? "governed compatibility process" : "governed runtime"} />
                      <DetailRow label="Trace" value={selectedTelemetryProcess.workItemId ?? selectedTelemetryProcess.threadId ?? selectedTelemetryProcess.controlToken ?? "runtime telemetry"} />
                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "performance" ? (
              <div className="browser-domain-stack">
                <div className="metrics-grid">
                  <MetricTile label="CPU" value={runtimeTelemetry?.cpu.utilizationPercent != null ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%` : "n/a"} />
                  <MetricTile label="Load 1m" value={runtimeTelemetry?.cpu.loadAverage1m != null ? runtimeTelemetry.cpu.loadAverage1m.toFixed(2) : "n/a"} />
                  <MetricTile label="RSS" value={runtimeTelemetry?.memory.rssMb != null ? `${runtimeTelemetry.memory.rssMb.toFixed(1)} MB` : "n/a"} />
                  <MetricTile label="Heap Used" value={runtimeTelemetry?.memory.heapUsedMb != null ? `${runtimeTelemetry.memory.heapUsedMb.toFixed(1)} MB` : "n/a"} />
                </div>
                <div className="browser-focus-card">
                  <div>
                    <p className="context-label">Performance Posture</p>
                    <strong>{runtimeTelemetry?.activitySummary ?? "Runtime telemetry is not yet available."}</strong>
                    <p>{runtimeTelemetry?.cpu.summary ?? "CPU and memory posture will appear once telemetry is sampled."}</p>
                  </div>
                  <Badge tone="steady">{runtimeTelemetry?.cpu.coreCount ? `${runtimeTelemetry.cpu.coreCount} cores` : "host"}</Badge>
                </div>
                <dl className="detail-list">
                  <DetailRow label="Sampled At" value={runtimeTelemetry?.sampledAt ?? "n/a"} />
                  <DetailRow label="CPU Summary" value={runtimeTelemetry?.cpu.summary ?? "n/a"} />
                  <DetailRow label="Memory Summary" value={runtimeTelemetry?.memory.summary ?? "n/a"} />
                  <DetailRow label="System Memory" value={runtimeTelemetry?.memory.systemUsedPercent != null ? `${runtimeTelemetry.memory.systemUsedPercent.toFixed(1)}%` : "n/a"} />
                </dl>
              </div>
            ) : selectedDomain === "host-io" ? (
              <div className="browser-domain-stack">
                <div className="metrics-grid">
                  <MetricTile label="Connections" value={runtimeTelemetry?.network.openConnectionCount != null ? String(runtimeTelemetry.network.openConnectionCount) : "n/a"} />
                  <MetricTile label="Interfaces" value={runtimeTelemetry?.network.interfaceCount != null ? String(runtimeTelemetry.network.interfaceCount) : "n/a"} />
                  <MetricTile label="Disk Read" value={runtimeTelemetry?.disk.readKbps != null ? `${runtimeTelemetry.disk.readKbps.toFixed(0)} KB/s` : "n/a"} />
                  <MetricTile label="Disk Write" value={runtimeTelemetry?.disk.writeKbps != null ? `${runtimeTelemetry.disk.writeKbps.toFixed(0)} KB/s` : "n/a"} />
                </div>
                <dl className="detail-list">
                  <DetailRow label="Network Summary" value={runtimeTelemetry?.network.summary ?? "n/a"} />
                  <DetailRow label="Disk Summary" value={runtimeTelemetry?.disk.summary ?? "n/a"} />
                  <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                  <DetailRow label="Activity" value={runtimeTelemetry?.activitySummary ?? "n/a"} />
                </dl>
              </div>
            ) : selectedDomain === "source" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="source"
                  columnTemplate="minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.7fr)"
                  columns={[
                    {
                      id: "artifact",
                      label: "Artifact",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "location",
                      label: "Location",
                      render: (row) => row.location,
                      sortValue: (row) => row.location
                    },
                    {
                      id: "role",
                      label: "Role",
                      render: (row) => row.role,
                      sortValue: (row) => row.role
                    }
                  ]}
                  emptyMessage="No source-backed entities are currently in focus."
                  filterLabel="Role"
                  filterOptions={buildFilterOptions(sourceRows.map((row) => row.role))}
                  getFilterValue={(row) => row.role}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSourceEntryKey(row.key);
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={sourceRows}
                  searchPlaceholder="Search source artifacts"
                  selectedKey={selectedSourceEntry ? `${selectedSourceEntry.path}:${selectedSourceEntry.line ?? 0}` : null}
                />
              </div>
            ) : selectedDomain === "xref" ? (
              <div className="browser-domain-stack">
                <BrowserModePicker
                  label="Reference Direction"
                  onChange={(value) => setXrefMode(value as typeof xrefMode)}
                  options={[
                    { value: "incoming", label: "Incoming" },
                    { value: "outgoing", label: "Outgoing" }
                  ]}
                  value={xrefMode}
                />
                <BrowserDataTable
                  key={`xref-${xrefMode}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                  columns={[
                    {
                      id: "label",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.emphasis,
                      sortValue: (row) => row.emphasis
                    },
                    {
                      id: "detail",
                      label: "Detail",
                      render: (row) => row.detail,
                      sortValue: (row) => row.detail
                    }
                  ]}
                  emptyMessage="No XREF items are available for the current focus."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(xrefRows.map((row) => row.emphasis))}
                  getFilterValue={(row) => row.emphasis}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={xrefRows}
                  searchPlaceholder={`Search ${xrefMode} references`}
                  selectedKey={null}
                />
              </div>
            ) : selectedDomain === "governance" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="governance"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                  columns={[
                    {
                      id: "item",
                      label: "Item",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => <PriorityStateChip label={row.badge} tone={row.tone} />,
                      sortValue: (row) => row.badge
                    },
                    {
                      id: "detail",
                      label: "Detail",
                      render: (row) => row.detail,
                      sortValue: (row) => row.detail
                    }
                  ]}
                  emptyMessage="No governance-linked entities are loaded."
                  filterLabel="State"
                  filterOptions={buildFilterOptions(governanceRows.map((row) => row.badge))}
                  getFilterValue={(row) => row.badge}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedGovernanceKey(row.key)}
                  rows={governanceRows}
                  searchPlaceholder="Search governance items"
                  selectedKey={selectedGovernanceEntry?.key ?? null}
                />
                {selectedGovernanceEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Governance Object</p>
                        <strong>{selectedGovernanceEntry.label}</strong>
                        <p>{selectedGovernanceEntry.detail}</p>
                      </div>
                      <PriorityStateChip label={selectedGovernanceEntry.badge} tone={selectedGovernanceEntry.tone} />
                    </div>
                    <dl className="detail-list">
                      {selectedGovernanceIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance:${label}`} label={label} value={value} />
                      ))}
                      {selectedGovernanceTaskRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance-task:${label}`} label={label} value={value} />
                      ))}
                      {selectedGovernanceOrchestrationRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance-orchestration:${label}`} label={label} value={value} />
                      ))}
                      {selectedGovernanceCorrectiveRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance-corrective:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    {selectedGovernanceTaskRecord?.result ? (
                      <details>
                        <summary>Task Result</summary>
                        <pre className="runtime-preview">{JSON.stringify(selectedGovernanceTaskRecord.result, null, 2)}</pre>
                      </details>
                    ) : null}
                    {selectedGovernanceTaskRecord?.lastError ? (
                      <details>
                        <summary>Task Error</summary>
                        <pre className="runtime-preview">{JSON.stringify(selectedGovernanceTaskRecord.lastError, null, 2)}</pre>
                      </details>
                    ) : null}
                    {selectedGovernanceEntry.correctiveContext?.proposedActions.length ? (
                      <div className="thread-section">
                        <p className="context-label">Corrective Actions</p>
                        <div className="thread-card-list">
                          {selectedGovernanceEntry.correctiveContext.proposedActions.map((action, index) => (
                            <article className="thread-row active" key={`browser-governance-action:${index}`}>
                              <div>
                                <strong>{action.kind ?? "correction"}</strong>
                                <p>{action.reason ?? "No corrective rationale captured."}</p>
                              </div>
                              <span>{action.target ?? "governed target"}</span>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedGovernanceEntry.correctiveContext?.triggerEvents.length ? (
                      <div className="thread-section">
                        <p className="context-label">Trigger Evidence</p>
                        <div className="thread-flags">
                          {selectedGovernanceEntry.correctiveContext.triggerEvents.map((event, index) => (
                            <span className="thread-flag" key={`browser-governance-trigger:${index}`}>
                              {event.kind ?? event.family ?? "event"}
                              {event.eventId ? ` · ${event.eventId}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="browser-action-strip">
                      {selectedGovernanceApprovalId ? (
                        <button
                          className="starter-chip"
                          onClick={() => void onOpenApprovalRequest(selectedGovernanceApprovalId)}
                          type="button"
                        >
                          Review Approval
                        </button>
                      ) : null}
                      {selectedGovernanceApprovalId && selectedGovernanceApprovalSummary?.state === "awaiting" ? (
                        <button
                          className="starter-chip"
                          disabled={isDecidingApproval}
                          onClick={() => onSubmitApprovalDecision(selectedGovernanceApprovalId, "approve")}
                          title={browserString(
                            selectedGovernanceOrchestration?.primaryCommandDescription,
                            browserRecord(selectedGovernanceOrchestration?.primaryCommand).description
                          ) ?? undefined}
                          type="button"
                        >
                          {isDecidingApproval
                            ? "Submitting..."
                            : browserString(
                                selectedGovernanceOrchestration?.primaryCommandLabel,
                                browserRecord(selectedGovernanceOrchestration?.primaryCommand).label,
                                "Approve"
                              )}
                        </button>
                      ) : null}
                      {selectedGovernanceApprovalId && selectedGovernanceApprovalSummary?.state === "awaiting" ? (
                        <button
                          className="starter-chip"
                          disabled={isDecidingApproval}
                          onClick={() => onSubmitApprovalDecision(selectedGovernanceApprovalId, "deny")}
                          type="button"
                        >
                          {isDecidingApproval ? "Submitting..." : "Deny Approval"}
                        </button>
                      ) : null}
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "linked-conversations" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="linked-conversations"
                  columnTemplate="minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "thread",
                      label: "Thread",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label,
                      searchValue: (row) => `${row.label} ${row.detail}`
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => <PriorityStateChip label={row.state} tone={row.stateTone} />,
                      sortValue: (row) => row.state
                    },
                    {
                      id: "attention",
                      label: "Attention",
                      render: (row) => <PriorityStateChip label={row.attention} tone={row.attentionTone} />,
                      sortValue: (row) => row.attention
                    }
                  ]}
                  emptyMessage="No linked conversation entities are loaded yet."
                  filterLabel="State"
                  filterOptions={buildFilterOptions(linkedConversationRows.map((row) => row.state))}
                  getFilterValue={(row) => row.state}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedLinkedConversationId(row.id);
                    setSelectedThreadId(row.id);
                  }}
                  rows={linkedConversationRows}
                  searchPlaceholder="Search linked conversations"
                  selectedKey={selectedLinkedConversation?.id ?? null}
                />
                {selectedLinkedConversation ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Linked Conversation</p>
                        <strong>{selectedLinkedConversation.label}</strong>
                        <p>{selectedLinkedConversation.detail}</p>
                      </div>
                      <PriorityStateChip
                        label={selectedLinkedConversation.badge}
                        tone={toneForThreadState(selectedLinkedConversation.badge as ThreadSummaryDto["state"])}
                      />
                    </div>
                    <dl className="detail-list">
                      {selectedLinkedConversationIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-linked-conversation:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    <div className="browser-action-strip">
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "documentation" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="documentation"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "reference",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "category",
                      label: "Category",
                      render: (row) => row.category,
                      sortValue: (row) => row.category
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.label} ${row.category} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No documentation references are available."
                  filterLabel="Category"
                  filterOptions={buildFilterOptions(documentationRows.map((row) => row.category))}
                  getFilterValue={(row) => row.category}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedDocumentationKey(row.key);
                    void loadDocumentationPage(row.slug);
                  }}
                  rows={documentationRows}
                  searchPlaceholder="Search documentation references"
                  selectedKey={selectedDocumentationSlug}
                />
              </div>
            ) : (
              <div className="browser-package-card">
                <strong>{domainDescriptor.label}</strong>
                <p>Choose a browser domain to inspect its live runtime surface.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
