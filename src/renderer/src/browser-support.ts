import type {
  ApprovalRequestSummaryDto,
  ConsoleLogStreamDto,
  DiagnosticReportSummaryDto,
  IncidentSummaryDto,
  PackageBrowserDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetrySnapshotDto,
  SourcePreviewDto,
  ThreadSummaryDto,
  WorkItemSummaryDto
} from "../../shared/contracts";

function browserSupportRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstBrowserSupportString(...values: unknown[]): string | null {
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

export type BrowserDomain =
  | "systems"
  | "packages"
  | "symbols"
  | "classes-methods"
  | "runtime-objects"
  | "console"
  | "diagnostics"
  | "processes"
  | "performance"
  | "host-io"
  | "source"
  | "xref"
  | "documentation"
  | "governance"
  | "linked-conversations";

export interface BrowserDomainDescriptor {
  id: BrowserDomain;
  label: string;
  summary: string;
}

export interface BrowserSurfaceEntry {
  key: string;
  title: string;
  detail: string;
  meta: string;
}

export const browserDomains: BrowserDomainDescriptor[] = [
  { id: "systems", label: "Systems", summary: "Loaded systems and their attached packages." },
  { id: "packages", label: "Packages", summary: "Namespaces, exports, internals, and use-lists." },
  { id: "symbols", label: "Symbols", summary: "Functions, variables, macros, classes, and generic functions." },
  { id: "classes-methods", label: "Classes & Methods", summary: "CLOS classes, slots, and dispatch surfaces." },
  { id: "runtime-objects", label: "Runtime Objects", summary: "Active scopes and inspectable live runtime objects." },
  { id: "console", label: "Console", summary: "Governed environment logs with source, severity, and operational correlation." },
  { id: "diagnostics", label: "Diagnostics", summary: "Crash, spin, analytics, and retained host diagnostic reports." },
  { id: "processes", label: "Processes", summary: "Runtime-linked processes, workers, tasks, and governed execution state." },
  { id: "performance", label: "Performance", summary: "CPU and memory posture for the live runtime and its host." },
  { id: "host-io", label: "Host I/O", summary: "Network and disk activity attached to the running environment." },
  { id: "source", label: "Source", summary: "Source-backed definitions, edits, staging, and reload." },
  { id: "xref", label: "XREF", summary: "Incoming and outgoing semantic references." },
  { id: "documentation", label: "Documentation", summary: "Docstrings and environment-linked reference material." },
  { id: "governance", label: "Governance", summary: "Approvals, incidents, work items, and closure state." },
  { id: "linked-conversations", label: "Linked Conversations", summary: "Threads and turns attached to the current entity." }
];

export function selectBrowserDomainDescriptor(selectedBrowserDomain: BrowserDomain): BrowserDomainDescriptor {
  return browserDomains.find((domain) => domain.id === selectedBrowserDomain) ?? browserDomains[0];
}

export function buildBrowserSurfaceEntries(input: {
  approvalRequests: ApprovalRequestSummaryDto[];
  orchestrationInbox: Record<string, unknown>[];
  consoleLogStream: { data: ConsoleLogStreamDto } | null;
  diagnosticReports: DiagnosticReportSummaryDto[];
  incidents: IncidentSummaryDto[];
  packageBrowser: { data: PackageBrowserDto } | null;
  runtimeEntityDetail: { data: RuntimeEntityDetailDto } | null;
  runtimeInspection: { data: RuntimeInspectionResultDto } | null;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  selectedBrowserDomain: BrowserDomain;
  sourcePreview: { data: SourcePreviewDto } | null;
  threads: ThreadSummaryDto[];
  workItems: WorkItemSummaryDto[];
}): BrowserSurfaceEntry[] {
  const {
    approvalRequests,
    orchestrationInbox,
    consoleLogStream,
    diagnosticReports,
    incidents,
    packageBrowser,
    runtimeEntityDetail,
    runtimeInspection,
    runtimeSummary,
    runtimeTelemetry,
    selectedBrowserDomain,
    sourcePreview,
    threads,
    workItems
  } = input;

  switch (selectedBrowserDomain) {
    case "systems":
      return (runtimeSummary?.loadedSystemEntries ?? []).slice(0, 4).map((system) => ({
        key: system.name,
        title: system.name,
        detail: system.status,
        meta: system.type === "asdf-system" ? "ASDF system" : "System"
      }));
    case "packages": {
      const packageNames = Array.from(
        new Set([
          runtimeSummary?.currentPackage,
          packageBrowser?.data.packageName,
          ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
        ].filter((value): value is string => Boolean(value)))
      );
      return packageNames.slice(0, 4).map((packageName) => ({
        key: packageName,
        title: packageName,
        detail:
          packageName === packageBrowser?.data.packageName
            ? packageBrowser?.data.summary ?? "Current package browser target."
            : "Available package surface in the live image.",
        meta: packageName === runtimeSummary?.currentPackage ? "Current package" : "Package"
      }));
    }
    case "symbols": {
      const symbols = [
        ...(packageBrowser?.data.externalSymbols ?? []),
        ...(packageBrowser?.data.internalSymbols ?? [])
      ];
      return symbols.slice(0, 4).map((symbol) => ({
        key: `${symbol.visibility}:${symbol.symbol}`,
        title: symbol.symbol,
        detail: symbol.kind,
        meta: symbol.visibility
      }));
    }
    case "classes-methods": {
      const symbols = [
        ...(packageBrowser?.data.externalSymbols ?? []),
        ...(packageBrowser?.data.internalSymbols ?? [])
      ].filter((symbol) => symbol.kind === "class" || symbol.kind === "generic-function");
      return symbols.slice(0, 4).map((symbol) => ({
        key: `${symbol.kind}:${symbol.symbol}`,
        title: symbol.symbol,
        detail: symbol.kind === "class" ? "Class" : "Generic function",
        meta: "Live entity"
      }));
    }
    case "runtime-objects":
      return (runtimeSummary?.scopes ?? []).slice(0, 4).map((scope) => ({
        key: scope.scopeId,
        title: scope.symbolName ?? scope.packageName,
        detail: scope.summary,
        meta: scope.kind
      }));
    case "console":
      return (consoleLogStream?.data.entries ?? []).slice(0, 4).map((entry) => ({
        key: entry.entryId,
        title: entry.source,
        detail: entry.message,
        meta: entry.type
      }));
    case "diagnostics":
      return diagnosticReports.slice(0, 4).map((report) => ({
        key: report.reportId,
        title: report.title,
        detail: report.summary,
        meta: report.kind
      }));
    case "processes":
      return (runtimeTelemetry?.processes ?? []).slice(0, 4).map((process) => ({
        key: process.processId,
        title: process.label,
        detail: process.summary,
        meta: process.state
      }));
    case "performance":
      return [
        {
          key: "cpu",
          title: "CPU Posture",
          detail: runtimeTelemetry?.cpu.summary ?? "CPU telemetry is not yet available.",
          meta:
            runtimeTelemetry?.cpu.utilizationPercent != null
              ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%`
              : "n/a"
        },
        {
          key: "memory",
          title: "Memory Posture",
          detail: runtimeTelemetry?.memory.summary ?? "Memory telemetry is not yet available.",
          meta:
            runtimeTelemetry?.memory.rssMb != null
              ? `${runtimeTelemetry.memory.rssMb.toFixed(1)} MB`
              : "n/a"
        }
      ];
    case "host-io":
      return [
        {
          key: "network",
          title: "Network",
          detail: runtimeTelemetry?.network.summary ?? "Network telemetry is not yet available.",
          meta:
            runtimeTelemetry?.network.openConnectionCount != null
              ? `${runtimeTelemetry.network.openConnectionCount} open`
              : "n/a"
        },
        {
          key: "disk",
          title: "Disk I/O",
          detail: runtimeTelemetry?.disk.summary ?? "Disk telemetry is not yet available.",
          meta:
            runtimeTelemetry?.disk.readKbps != null || runtimeTelemetry?.disk.writeKbps != null
              ? `${runtimeTelemetry.disk.readKbps ?? 0}/${runtimeTelemetry.disk.writeKbps ?? 0} KB/s`
              : "n/a"
        }
      ];
    case "source": {
      const sourceEntries = [
        ...(runtimeEntityDetail?.data.relatedItems ?? []),
        ...(runtimeInspection?.data.items ?? [])
      ].filter(
        (item, index, items) =>
          Boolean(item.path) &&
          items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index
      );
      return sourceEntries.slice(0, 4).map((entry) => ({
        key: `${entry.path}:${entry.line ?? 0}`,
        title: entry.label,
        detail: entry.path ?? "No source path",
        meta: entry.line ? `Line ${entry.line}` : entry.emphasis ?? "Source"
      }));
    }
    case "xref":
      return (runtimeEntityDetail?.data.relatedItems ?? []).slice(0, 4).map((item, index) => ({
        key: `${item.label}:${item.path ?? index}`,
        title: item.label,
        detail: item.detail,
        meta: item.emphasis ?? "Reference"
      }));
    case "governance":
      const orchestrationApprovalById = new Map(
        orchestrationInbox
          .map((entry) => {
            const record = browserSupportRecord(entry);
            const approvalId = firstBrowserSupportString(
              record.approvalId,
              browserSupportRecord(record.approvalSummary).approvalId
            );
            return approvalId ? [approvalId, record] : null;
          })
          .filter((entry): entry is [string, Record<string, unknown>] => Array.isArray(entry))
      );
      return [
        ...approvalRequests.slice(0, 2).map((request) => {
          const orchestrationEntry = orchestrationApprovalById.get(request.requestId);
          return {
            key: request.requestId,
            title: firstBrowserSupportString(orchestrationEntry?.goal, request.title) ?? request.title,
            detail:
              firstBrowserSupportString(
                orchestrationEntry?.primaryCommandDescription,
                orchestrationEntry?.nextAction,
                request.summary
              ) ?? request.summary,
            meta:
              firstBrowserSupportString(
                orchestrationEntry?.primaryCommandLabel,
                browserSupportRecord(orchestrationEntry?.primaryCommand).label,
                request.state
              ) ?? request.state
          };
        }),
        ...incidents.slice(0, 1).map((incident) => ({
          key: incident.incidentId,
          title: incident.title,
          detail: `Severity ${incident.severity}`,
          meta: incident.state
        })),
        ...workItems.slice(0, 1).map((item) => ({
          key: item.workItemId,
          title: item.title,
          detail: item.waitingReason ?? "Governed work remains attached to this environment.",
          meta: item.state
        }))
      ].slice(0, 4);
    case "linked-conversations":
      return threads.slice(0, 4).map((thread) => ({
        key: thread.threadId,
        title: thread.title,
        detail: thread.summary,
        meta: thread.state
      }));
    case "documentation":
      return [
        {
          key: "focus",
          title: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? "Current Focus",
          detail:
            runtimeInspection?.data.summary ??
            runtimeEntityDetail?.data.summary ??
            "No focused entity summary is available yet.",
          meta: "Runtime focus"
        },
        {
          key: "package",
          title: packageBrowser?.data.packageName ?? runtimeSummary?.currentPackage ?? "Package Context",
          detail:
            packageBrowser?.data.summary ??
            "Package-linked documentation becomes available when a package is selected.",
          meta: "Package"
        },
        {
          key: "source",
          title: sourcePreview?.data.path ?? "Source Relationship",
          detail:
            sourcePreview?.data.summary ??
            runtimeSummary?.sourceRelationship ??
            "Source-backed documentation becomes available when a source artifact is in focus.",
          meta: "Source"
        }
      ];
    default:
      return [];
  }
}
