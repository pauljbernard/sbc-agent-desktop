import type {
  DesktopTaskManifestDto,
  DesktopTaskRecordDto,
  McpServerConfigDto,
  PackageManagementSummaryDto,
  ProviderProfileSummaryDto
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader } from "./surface-support";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ConfigurationSection =
  | "theme"
  | "lisp-code-view"
  | "desktop-surface"
  | "llm"
  | "package-management"
  | "capabilities"
  | "mcp-servers";

interface ConfigurationSectionDescriptor {
  id: ConfigurationSection;
  label: string;
  summary: string;
  family: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeActorToken(value: unknown): string {
  return String(value ?? "").replace(/^:/, "").replace(/_/g, "-").toLowerCase();
}

export function ConfigurationWorkspace({
  selectedSection,
  setSelectedSection,
  themePreference,
  lispParenColors,
  resolvedTheme,
  systemTheme: _systemTheme,
  tooltipScalePercent,
  controlIconScalePercent,
  dockIconScalePercent,
  conversationTextScalePercent,
  sourceCodeTextScalePercent,
  providerSummary,
  packageManagementSummary,
  desktopTaskManifests,
  desktopTaskRecords,
  desktopTaskActorTrace,
  desktopTaskDeadLetters,
  mcpServerConfigs,
  configurationSections,
  normalizeParenDepthColors
}: {
  selectedSection: ConfigurationSection;
  setSelectedSection: (value: ConfigurationSection) => void;
  themePreference: ThemePreference;
  lispParenColors: string[];
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  tooltipScalePercent: number;
  controlIconScalePercent: number;
  dockIconScalePercent: number;
  conversationTextScalePercent: number;
  sourceCodeTextScalePercent: number;
  providerSummary: ProviderProfileSummaryDto | null;
  packageManagementSummary: PackageManagementSummaryDto | null;
  desktopTaskManifests: DesktopTaskManifestDto[];
  desktopTaskRecords: DesktopTaskRecordDto[];
  desktopTaskActorTrace: Record<string, unknown>[];
  desktopTaskDeadLetters: Record<string, unknown>[];
  mcpServerConfigs: McpServerConfigDto[];
  configurationSections: ConfigurationSectionDescriptor[];
  normalizeParenDepthColors: (colors?: string[] | null) => string[];
}) {
  const selectedDescriptor =
    configurationSections.find((section) => section.id === selectedSection) ?? configurationSections[0];
  const configurationRows = configurationSections.map((section) => ({
    key: section.id,
    category: section.label,
    family: section.family,
    currentValue:
      section.id === "theme"
        ? themePreference === "system"
          ? `System (${resolvedTheme})`
          : `${themePreference} (${resolvedTheme})`
        : section.id === "lisp-code-view"
          ? `${normalizeParenDepthColors(lispParenColors).length} configured depths`
          : section.id === "llm"
            ? `${providerSummary?.routingMode ?? "auto"} / ${providerSummary?.activeProfileName ?? "default"} / ${providerSummary?.profileCount ?? 0} profiles`
            : section.id === "package-management"
              ? `${packageManagementSummary?.packageManager ?? "asdf"} / ${packageManagementSummary?.managedSourceRegistryEntryCount ?? 0} source entries / ${packageManagementSummary?.localProjectCount ?? 0} local projects`
              : section.id === "capabilities"
                ? `${desktopTaskManifests.length} manifests / ${desktopTaskManifests.filter((manifest) => manifest.backendKind === "mcp").length} MCP-backed`
                : section.id === "mcp-servers"
                  ? `${mcpServerConfigs.length} servers / ${mcpServerConfigs.filter((config) => config.enabledP).length} enabled`
                  : `Tooltip ${tooltipScalePercent}% / Controls ${controlIconScalePercent}% / Dock ${dockIconScalePercent}% / Conversation ${conversationTextScalePercent}% / Source ${sourceCodeTextScalePercent}%`,
    summary: section.summary
  }));

  return (
    <div className="configuration-journey">
      <div className="configuration-layout">
        <section className="configuration-pane panel">
          <PanelHeader
            title="Configuration Categories"
            subtitle="Browse configurable domains in the workspace, then edit the selected category in the inspector."
            helpText="This keeps the left rail shallow while allowing the configuration system to scale to many categories over time."
          />
          <BrowserDataTable
            key="configuration-categories"
            columnTemplate="minmax(0, 1fr) minmax(0, 0.82fr) minmax(0, 1fr) minmax(0, 1.45fr)"
            columns={[
              {
                id: "category",
                label: "Category",
                render: (row) => <strong>{row.category}</strong>,
                sortValue: (row) => row.category,
                searchValue: (row) => `${row.category} ${row.summary} ${row.family}`
              },
              {
                id: "family",
                label: "Family",
                render: (row) => <Badge tone="steady">{row.family}</Badge>,
                sortValue: (row) => row.family
              },
              {
                id: "current",
                label: "Current",
                render: (row) => row.currentValue,
                sortValue: (row) => row.currentValue
              },
              {
                id: "summary",
                label: "Summary",
                render: (row) => row.summary,
                sortValue: (row) => row.summary,
                searchValue: (row) => row.summary
              }
            ]}
            emptyMessage="No configuration categories are available."
            filterLabel="Family"
            filterOptions={Array.from(new Set(configurationRows.map((row) => row.family))).map((value) => ({ label: value, value }))}
            getFilterValue={(row) => row.family}
            getRowKey={(row) => row.key}
            onSelect={(row) => setSelectedSection(row.key as ConfigurationSection)}
            rows={configurationRows}
            searchPlaceholder="Search configuration categories"
            selectedKey={selectedDescriptor.id}
          />
          {selectedSection === "capabilities" ? (
            <div className="configuration-inline-detail-stack">
              <PanelHeader
                title="Capability Servers"
                subtitle="Each governed capability behaves like a discoverable server with its own received invocation history."
                helpText="Invocation history is projected from the governed desktop-task ledger, so approvals, retries, and results remain on one protocol-backed source of truth."
              />
              <div className="configuration-inspector-stack">
                {desktopTaskManifests.map((manifest) => {
                  const invocationRecords = desktopTaskRecords
                    .filter((record) => record.target === manifest.target && record.operation === manifest.operation)
                    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
                  const recentInvocationRecords = invocationRecords.slice(0, 6);
                  const actorRole = normalizeActorToken(manifest.target);
                  const traceEvents = desktopTaskActorTrace
                    .filter((event) => {
                      const entry = asRecord(event);
                      const receiver = asRecord(entry.receiver);
                      return normalizeActorToken(receiver.role ?? entry.target) === actorRole;
                    })
                    .sort((left, right) => String(asRecord(right).recordedAt ?? "").localeCompare(String(asRecord(left).recordedAt ?? "")));
                  const recentTraceEvents = traceEvents.slice(0, 6);
                  const deadLetterEvents = desktopTaskDeadLetters.filter((event) => {
                    const entry = asRecord(event);
                    const receiver = asRecord(entry.receiver);
                    return normalizeActorToken(receiver.role ?? entry.target) === actorRole;
                  });
                  return (
                    <div className="browser-focus-card" key={`configuration-capability-server:${manifest.id}`}>
                      <div>
                        <p className="context-label">{manifest.target}</p>
                        <strong>{manifest.operation}</strong>
                        <p>{manifest.description ?? "No manifest description provided."}</p>
                      </div>
                      <dl className="detail-list">
                        <div className="detail-row">
                          <dt>Capability</dt>
                          <dd>{manifest.capability ?? "unspecified"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Backend</dt>
                          <dd>{manifest.backendKind ?? "internal"}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Invocations</dt>
                          <dd>{String(invocationRecords.length)}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>Trace events</dt>
                          <dd>{String(traceEvents.length)}</dd>
                        </div>
                        <div className="detail-row">
                          <dt>DLQ</dt>
                          <dd>{String(deadLetterEvents.length)}</dd>
                        </div>
                      </dl>
                      <div className="browser-action-strip">
                        <Badge tone={manifest.discoverableP ? "active" : "steady"}>
                          {manifest.discoverableP ? "Discoverable" : "Hidden"}
                        </Badge>
                        {manifest.tags.map((tag) => (
                          <Badge key={`configuration-capability-tag:${manifest.id}:${tag}`} tone="steady">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {recentTraceEvents.length > 0 ? (
                        <div className="configuration-inspector-stack">
                          <p className="context-label">Actor Transport Trace</p>
                          {recentTraceEvents.map((event, index) => {
                            const entry = asRecord(event);
                            return (
                              <div
                                className="browser-focus-card"
                                key={`configuration-capability-trace:${manifest.id}:${String(entry.eventId ?? index)}`}
                              >
                                <div>
                                  <p className="context-label">
                                    {entry.recordedAt ? new Date(String(entry.recordedAt)).toLocaleString() : "Actor event recorded"}
                                  </p>
                                  <strong>{String(entry.phase ?? "unknown")}</strong>
                                  <p>{String(entry.actorMessageId ?? entry.recordId ?? "Actor transport event recorded.")}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                      {recentInvocationRecords.length > 0 ? (
                        <div className="configuration-inspector-stack">
                          <p className="context-label">Received Invocations</p>
                          {recentInvocationRecords.map((record) => (
                            <div
                              className="browser-focus-card"
                              key={`configuration-capability-invocation:${manifest.id}:${record.id}`}
                            >
                              <div>
                                <p className="context-label">
                                  {record.createdAt ? new Date(record.createdAt).toLocaleString() : "Invocation received"}
                                </p>
                                <strong>{record.status}</strong>
                                <p>
                                  {String(
                                    record.result?.summary ??
                                      record.lastError?.summary ??
                                      record.requestId ??
                                      "Governed invocation recorded."
                                  )}
                                </p>
                              </div>
                              <dl className="detail-list">
                                <div className="detail-row">
                                  <dt>Request</dt>
                                  <dd>{record.requestId ?? "n/a"}</dd>
                                </div>
                                <div className="detail-row">
                                  <dt>Approval</dt>
                                  <dd>{record.approvalStatus ?? "n/a"}</dd>
                                </div>
                                <div className="detail-row">
                                  <dt>Governance</dt>
                                  <dd>{record.governanceStatus ?? "n/a"}</dd>
                                </div>
                              </dl>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="inspector-copy">No invocations have been recorded for this capability server yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
