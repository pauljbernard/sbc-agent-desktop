import type {
  ConsoleLogStreamDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  EnvironmentEventDto,
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetrySnapshotDto,
  ThreadDetailDto,
  ThreadSummaryDto,
} from "../../shared/contracts";
import type { BrowserTableFilterOption } from "./browser-data-table";

export const ALL_PACKAGES_OPTION = "All Packages";

export function symbolKindsForMode(
  mode: "generic-function" | "class" | "macro" | "variable" | "function"
): Array<PackageBrowserSymbolDto["kind"]> {
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

export function classMethodKindsForMode(
  mode: "classes" | "generic-functions"
): Array<PackageBrowserSymbolDto["kind"]> {
  return mode === "classes" ? ["class"] : ["generic-function"];
}

export function normalizeBrowserPackageData(
  raw: unknown,
  fallbackPackageName: string
): {
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

export function buildFilterOptions(values: string[]): BrowserTableFilterOption[] {
  return Array.from(new Set(values.filter(Boolean))).map((value) => ({
    label: value,
    value
  }));
}

export function buildSourceEntries(
  runtimeEntityDetail: { data: RuntimeEntityDetailDto } | null,
  runtimeInspection: { data: RuntimeInspectionResultDto } | null
) {
  return [
    ...(runtimeEntityDetail?.data.relatedItems ?? []),
    ...(runtimeInspection?.data.items ?? [])
  ].filter(
    (item, index, items) =>
      Boolean(item.path) &&
      items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index
  );
}

export function buildXrefEntries(
  xrefMode: "incoming" | "outgoing",
  runtimeEntityDetail: { data: RuntimeEntityDetailDto } | null,
  runtimeInspection: { data: RuntimeInspectionResultDto } | null
) {
  return xrefMode === "incoming"
    ? runtimeInspection?.data.mode === "callers"
      ? runtimeInspection.data.items
      : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label === "Caller")
    : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label !== "Caller");
}

export function buildPrioritizedLinkedConversationEntries(input: {
  threads: ThreadSummaryDto[];
  focusedSymbol: string | null;
  focusedPackage?: string;
  selectedPackageName: string;
  sourcePath?: string | null;
}) {
  const linkedConversationEntries = input.threads.map((thread) => ({
    id: thread.threadId,
    label: thread.title,
    detail: thread.summary,
    badge: thread.state,
    flags: thread.attentionFlags,
    latestTurnState: thread.latestTurnState,
    latestActivityAt: thread.latestActivityAt
  }));
  const searchTokens = [
    input.focusedSymbol,
    input.focusedPackage,
    input.selectedPackageName,
    input.sourcePath
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  return linkedConversationEntries
    .map((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.flags.join(" ")}`.toLowerCase();
      const matchScore = searchTokens.reduce(
        (score, token) => (haystack.includes(token) ? score + 1 : score),
        0
      );
      return { ...entry, matchScore };
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.label.localeCompare(right.label));
}

export function buildDiagnosticRows(input: {
  diagnosticReports: DiagnosticReportSummaryDto[];
  selectedDiagnosticSourceFilter: string;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
}) {
  const filteredDiagnosticReports = input.diagnosticReports.filter(
    (report) =>
      input.selectedDiagnosticSourceFilter === "All Sources" ||
      report.source === input.selectedDiagnosticSourceFilter
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
      (input.selectedDiagnosticReport?.reportId === report.reportId
        ? input.selectedDiagnosticReport.metadata?.incidentId
        : null) ?? "n/a"
    ),
    bugType: String(
      (input.selectedDiagnosticReport?.reportId === report.reportId
        ? input.selectedDiagnosticReport.metadata?.bugType
        : null) ?? "n/a"
    )
  }));

  return {
    filteredDiagnosticReports,
    diagnosticRows
  };
}

export function buildDocumentationEntries(input: {
  packageSummary?: string | null;
  packageUseList?: string[] | null;
  focusedPackage?: string;
  currentPackage?: string | null;
  sourceSummary?: string | null;
  sourceRelationship?: string | null;
  sourcePath?: string | null;
  sourceLine?: number | null;
  runtimeSummary?: string | null;
  runtimeDetail?: string | null;
  focusedEntitySummary?: string | null;
  focusedEntityDetail?: string | null;
  selectedThread: ThreadDetailDto | null;
  selectedLinkedConversation:
    | {
        detail: string;
        latestTurnState: string;
        latestActivityAt: string;
      }
    | null;
}) {
  return [
    {
      key: "focus",
      label: "Current Focus",
      category: "entity",
      summary: input.focusedEntitySummary ?? "No focused entity summary is available yet.",
      detail:
        input.focusedEntityDetail ??
        "Select a live entity to project its environment-linked explanation."
    },
    {
      key: "package",
      label: "Package Context",
      category: "package",
      summary:
        input.packageSummary ??
        `Package ${input.focusedPackage ?? input.currentPackage ?? "CL-USER"} remains the active semantic namespace.`,
      detail:
        input.packageUseList?.length
          ? `Uses ${input.packageUseList.join(", ")}`
          : "No package dependency summary is loaded for the current focus."
    },
    {
      key: "source",
      label: "Source Relationship",
      category: "source",
      summary:
        input.sourceSummary ??
        input.sourceRelationship ??
        "The browser will project source relationship once a source-backed entity is selected.",
      detail:
        input.sourcePath
          ? `${input.sourcePath}${input.sourceLine ? ` line ${input.sourceLine}` : ""}`
          : "No source file is currently open in the browser."
    },
    {
      key: "runtime",
      label: "Runtime Posture",
      category: "runtime",
      summary:
        input.runtimeSummary ??
        "Runtime and source posture will be summarized once inspection data is loaded.",
      detail: input.runtimeDetail ?? "No runtime facet has been surfaced yet."
    },
    {
      key: "conversation",
      label: "Conversation Attachment",
      category: "conversation",
      summary:
        input.selectedThread?.summary ??
        input.selectedLinkedConversation?.detail ??
        "No conversation is currently attached to the browser focus.",
      detail:
        input.selectedThread
          ? `${input.selectedThread.turns.length} turns, ${input.selectedThread.linkedEntities.length} linked entities`
          : input.selectedLinkedConversation
            ? `${input.selectedLinkedConversation.latestTurnState} · ${input.selectedLinkedConversation.latestActivityAt}`
            : "Select a linked thread to establish conversational continuity."
    }
  ];
}

export function buildSourceRows(sourceEntries: Array<{
  path?: string | null;
  line?: number | null;
  label: string;
  emphasis?: string | null;
}>) {
  return sourceEntries.map((item) => ({
    key: `${item.path}:${item.line ?? 0}`,
    label: item.label,
    location: item.path?.split("/").slice(-2).join("/") ?? "no-path",
    role: item.emphasis ?? "source",
    path: item.path,
    line: item.line
  }));
}

export function buildXrefRows(
  xrefMode: "incoming" | "outgoing",
  xrefEntries: Array<{
    label: string;
    detail: string;
    emphasis?: string | null;
    path?: string | null;
    line?: number | null;
  }>
) {
  return xrefEntries.map((item) => ({
    key: `${xrefMode}:${item.label}:${item.detail}:${item.line ?? 0}`,
    label: item.label,
    emphasis: item.emphasis ?? "reference",
    detail: item.detail,
    path: item.path,
    line: item.line
  }));
}

export function buildSelectedLinkedConversationIdentityRows(selectedLinkedConversation: {
  id: string;
  badge: string;
  latestTurnState: string;
  latestActivityAt: string;
} | null) {
  return selectedLinkedConversation
    ? [
        ["Object Id", selectedLinkedConversation.id],
        ["Authority", selectedLinkedConversation.badge],
        ["Trace", `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`]
      ]
    : [];
}

export function buildSelectedSystemIdentityRows(selectedSystemEntry: {
  name: string;
  type: string;
  status: string;
} | null) {
  return selectedSystemEntry
    ? [
        ["Object Id", selectedSystemEntry.name],
        ["Authority", selectedSystemEntry.type === "asdf-system" ? "ASDF System" : "System"],
        ["Trace", selectedSystemEntry.status]
      ]
    : [];
}

export function buildSelectedSystem(
  runtimeSummary: RuntimeSummaryDto | null,
  selectedSystemName: string | null
) {
  return (
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystemName)?.name ??
    runtimeSummary?.loadedSystemEntries[0]?.name ??
    runtimeSummary?.loadedSystems[0] ??
    null
  );
}

export function buildSelectedScope(
  runtimeSummary: RuntimeSummaryDto | null,
  selectedScopeId: string | null
) {
  return runtimeSummary?.scopes.find((scope) => scope.scopeId === selectedScopeId) ?? runtimeSummary?.scopes[0] ?? null;
}

export function buildPackageRows(input: {
  filteredPackageNames: string[];
  currentPackage?: string | null;
  packageBrowserPackageName?: string | null;
  packageUseCount?: number | null;
}) {
  return input.filteredPackageNames.map((packageName) => ({
    key: packageName,
    packageName,
    nicknameSummary: packageName === input.currentPackage ? "current" : "package",
    usesSummary:
      packageName === input.packageBrowserPackageName ? `${input.packageUseCount ?? 0} links` : "browse"
  }));
}

export function buildPackageSymbolRows(
  packageWorkspaceMode: "packages" | "exports" | "internals",
  packageBrowserData:
    | {
        externalSymbols: PackageBrowserSymbolDto[];
        internalSymbols: PackageBrowserSymbolDto[];
      }
    | null
) {
  return (
    (packageWorkspaceMode === "exports"
      ? packageBrowserData?.externalSymbols
      : packageWorkspaceMode === "internals"
        ? packageBrowserData?.internalSymbols
        : []) ?? []
  ).map((entry) => ({
    key: `${packageWorkspaceMode}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: packageWorkspaceMode === "exports" ? "external" : "internal"
  }));
}

export function buildActiveSymbolRows(
  activeSymbolBucketKey: string,
  activeSymbolBucketMode: RuntimeInspectionMode,
  symbolPageResult: QueryResultDto<{ items: Array<{
    packageName: string;
    symbol: string;
    kind: PackageBrowserSymbolDto["kind"];
    visibility: PackageBrowserSymbolDto["visibility"];
  }> }> | null
) {
  return (symbolPageResult?.data.items ?? []).map((entry) => ({
    key: `${activeSymbolBucketKey}:${entry.visibility}:${entry.symbol}`,
    packageName: entry.packageName,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: entry.visibility,
    inspectionMode:
      entry.kind === "generic-function"
        ? ("methods" as RuntimeInspectionMode)
        : entry.kind === "variable" || entry.kind === "unknown"
          ? ("describe" as RuntimeInspectionMode)
          : activeSymbolBucketMode
  }));
}

export function buildClassMethodRows(
  classMethodMode: "classes" | "generic-functions",
  classMethodPageResult: QueryResultDto<{ items: Array<{
    packageName: string;
    symbol: string;
    kind: PackageBrowserSymbolDto["kind"];
  }> }> | null
) {
  return (
    classMethodPageResult?.data.items.map((entry) => ({
      key: `${classMethodMode}:${entry.packageName}:${entry.symbol}`,
      packageName: entry.packageName,
      symbol: entry.symbol,
      kind: entry.kind,
      action: classMethodMode === "classes" ? "browse class" : "browse methods"
    })) ?? []
  );
}

export function buildSystemRows(runtimeSummary: RuntimeSummaryDto | null) {
  return (
    runtimeSummary?.loadedSystemEntries.map((system) => ({
      key: system.name,
      name: system.name,
      type: system.type === "asdf-system" ? "ASDF System" : "Unknown",
      status: system.status,
      browse: "definition"
    })) ?? []
  );
}

export function buildRuntimeScopeRows(runtimeSummary: RuntimeSummaryDto | null) {
  return (
    runtimeSummary?.scopes.map((scope) => ({
      key: scope.scopeId,
      scopeId: scope.scopeId,
      scopeLabel: scope.symbolName ?? scope.packageName,
      kind: scope.kind,
      summary: scope.summary,
      symbolName: scope.symbolName,
      packageName: scope.packageName
    })) ?? []
  );
}

export function buildTelemetryProcessRows(runtimeTelemetry: RuntimeTelemetrySnapshotDto | null) {
  return (
    runtimeTelemetry?.processes.map((process) => ({
      key: process.processId,
      processId: process.processId,
      label: process.label,
      kind: process.kind,
      state: process.state,
      cpu: process.cpuPercent != null ? `${process.cpuPercent.toFixed(1)}%` : "n/a",
      memory: process.memoryMb != null ? `${process.memoryMb.toFixed(1)} MB` : "n/a",
      summary: process.summary
    })) ?? []
  );
}

export function buildConsoleView(
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null,
  selectedConsoleSourceFilter: string,
  selectedConsoleEntryId: string | null
) {
  const consoleEntries = consoleLogStream?.data.entries ?? [];
  const filteredConsoleEntries = consoleEntries.filter(
    (entry) => selectedConsoleSourceFilter === "All Sources" || entry.source === selectedConsoleSourceFilter
  );
  const consoleRows = filteredConsoleEntries.map((entry) => ({
    key: entry.entryId,
    entryId: entry.entryId,
    timestamp: entry.timestamp,
    type: entry.type,
    source: entry.source,
    message: entry.message,
    processName: entry.processName ?? "n/a",
    activityId: entry.activityId ?? "n/a",
    threadRef: entry.threadRefId ?? entry.turnRefId ?? "n/a"
  }));
  const topSource = (entries: typeof consoleEntries) =>
    Object.entries(
      entries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.source] = (counts[entry.source] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a";
  return {
    consoleEntries,
    filteredConsoleEntries,
    consoleRows,
    consoleAlertCount: consoleEntries.filter(
      (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
    ).length,
    visibleConsoleAlertCount: filteredConsoleEntries.filter(
      (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
    ).length,
    consoleProcessCount: new Set(consoleEntries.map((entry) => entry.processName).filter(Boolean)).size,
    visibleConsoleProcessCount: new Set(
      filteredConsoleEntries.map((entry) => entry.processName).filter(Boolean)
    ).size,
    consoleTopSource: topSource(consoleEntries),
    visibleConsoleTopSource: topSource(filteredConsoleEntries),
    selectedConsoleEntry:
      filteredConsoleEntries.find((entry) => entry.entryId === selectedConsoleEntryId) ??
      filteredConsoleEntries[0] ??
      null
  };
}

export function buildSelectedTelemetryProcess(
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null,
  selectedTelemetryProcessId: string | null
) {
  return (
    runtimeTelemetry?.processes.find((process) => process.processId === selectedTelemetryProcessId) ??
    runtimeTelemetry?.processes[0] ??
    null
  );
}

export function buildDiagnosticSummaryState(input: {
  diagnosticReports: DiagnosticReportSummaryDto[];
  filteredDiagnosticReports: DiagnosticReportSummaryDto[];
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  selectedDiagnosticReportId: string | null;
}) {
  const selectedDiagnosticReportSummary =
    input.filteredDiagnosticReports.find((report) => report.reportId === input.selectedDiagnosticReportId) ??
    input.filteredDiagnosticReports[0] ??
    null;
  return {
    diagnosticCrashCount: input.diagnosticReports.filter((report) => report.kind === "crash").length,
    diagnosticSpinCount: input.diagnosticReports.filter((report) => report.kind === "spin").length,
    visibleDiagnosticCrashCount: input.filteredDiagnosticReports.filter((report) => report.kind === "crash").length,
    visibleDiagnosticSpinCount: input.filteredDiagnosticReports.filter((report) => report.kind === "spin").length,
    diagnosticProcessCount: new Set(
      input.diagnosticReports.map((report) => report.processName).filter(Boolean)
    ).size,
    visibleDiagnosticProcessCount: new Set(
      input.filteredDiagnosticReports.map((report) => report.processName).filter(Boolean)
    ).size,
    latestDiagnosticTimestamp: input.diagnosticReports[0]?.createdAt ?? null,
    latestVisibleDiagnosticTimestamp: input.filteredDiagnosticReports[0]?.createdAt ?? null,
    selectedDiagnosticReportSummary,
    activeSelectedDiagnosticReport:
      selectedDiagnosticReportSummary?.reportId === input.selectedDiagnosticReport?.reportId
        ? input.selectedDiagnosticReport
        : null
  };
}

export function buildLinkedConversationRows(
  prioritizedLinkedConversationEntries: Array<{
    id: string;
    label: string;
    badge: string;
    flags: string[];
    latestTurnState: string;
    detail: string;
  }>
) {
  return prioritizedLinkedConversationEntries.map((entry) => ({
    key: entry.id,
    id: entry.id,
    label: entry.label,
    state: entry.badge,
    attention: entry.flags[0] ?? entry.latestTurnState,
    stateTone:
      entry.badge === "failed"
        ? ("danger" as const)
        : entry.badge === "awaiting_approval" || entry.badge === "interrupted"
          ? ("warning" as const)
          : ("active" as const),
    attentionTone:
      entry.latestTurnState === "failed"
        ? ("danger" as const)
        : entry.latestTurnState === "awaiting_approval" || entry.latestTurnState === "interrupted"
          ? ("warning" as const)
          : ("active" as const),
    detail: entry.detail
  }));
}

export function buildDocumentationRows(documentationPages: Array<{
  slug: string;
  title: string;
  category: string;
  summary: string;
}>) {
  return documentationPages.map((page) => ({
    key: page.slug,
    slug: page.slug,
    label: page.title,
    category: page.category,
    summary: page.summary
  }));
}

export function buildBrowserFocusIdentityRows(input: {
  focusedSymbol: string;
  focusedPackage?: string;
  domainLabel: string;
  effectiveEntityKind?: string | null;
  sourcePath?: string | null;
  sourceLine?: number | null;
  runtimeMode?: string | null;
}) {
  return [
    [
      "Object Id",
      input.focusedSymbol
        ? input.focusedPackage
          ? `${input.focusedPackage}::${input.focusedSymbol}`
          : input.focusedSymbol
        : input.focusedPackage ?? input.domainLabel
    ],
    ["Authority", input.effectiveEntityKind ?? input.domainLabel],
    [
      "Trace",
      input.sourcePath
        ? `${input.sourcePath}${input.sourceLine ? `:${input.sourceLine}` : ""}`
        : input.runtimeMode ?? "browse"
    ]
  ];
}
