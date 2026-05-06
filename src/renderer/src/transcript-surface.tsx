import { useEffect, useMemo, useState } from "react";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader, toneForCommandStatus, transcriptRecencyLabel } from "./surface-support";

export interface TranscriptSurfaceEntry {
  key: string;
  timestamp: string;
  source: "workspace" | "listener" | "event";
  title: string;
  summary: string;
  preview?: string | null;
  form?: string | null;
  status?: "ok" | "awaiting_approval" | "error" | "rejected" | null;
  family?: string | null;
  threadId?: string | null;
  turnId?: string | null;
  eventCursor?: number | null;
}

export function TranscriptSurface({
  transcriptEntries,
  setWorkspaceDraft,
  openConversationRepl,
  openConversationContext,
  openEvidenceObservation,
  openListener,
  openInspectorSurface
}: {
  transcriptEntries: TranscriptSurfaceEntry[];
  setWorkspaceDraft: (value: string) => void;
  openConversationRepl: (form: string) => Promise<void>;
  openConversationContext: (threadId: string, turnId?: string | null) => Promise<void>;
  openEvidenceObservation: () => Promise<void>;
  openListener: (form: string) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
}) {
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<"all" | TranscriptSurfaceEntry["source"]>("all");
  const filteredTranscriptEntries = useMemo(
    () =>
      selectedSourceFilter === "all"
        ? transcriptEntries
        : transcriptEntries.filter((entry) => entry.source === selectedSourceFilter),
    [selectedSourceFilter, transcriptEntries]
  );
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(filteredTranscriptEntries[0]?.key ?? null);

  useEffect(() => {
    const nextEntryKey = filteredTranscriptEntries[0]?.key ?? null;
    if (
      !filteredTranscriptEntries.some((entry) => entry.key === selectedEntryKey) &&
      selectedEntryKey !== nextEntryKey
    ) {
      setSelectedEntryKey(nextEntryKey);
    }
  }, [filteredTranscriptEntries, selectedEntryKey]);

  const selectedEntry =
    filteredTranscriptEntries.find((entry) => entry.key === selectedEntryKey) ??
    filteredTranscriptEntries[0] ??
    null;
  const transcriptSourceGroups = useMemo(
    () =>
      (["workspace", "listener", "event"] as const)
        .map((source) => {
          const entries = filteredTranscriptEntries.filter((entry) => entry.source === source);
          return {
            source,
            count: entries.length,
            latestTitle: entries[0]?.title ?? "No current entries",
            latestTimestamp: entries[0]?.timestamp ?? "No timestamp",
            latestRecency: entries[0] ? transcriptRecencyLabel(entries[0].timestamp) : "Retained",
            families: Array.from(new Set(entries.map((entry) => entry.family).filter((value): value is string => Boolean(value)))).slice(0, 3)
          };
        })
        .filter((group) => group.count > 0),
    [filteredTranscriptEntries]
  );

  return (
    <div className="transcript-journey">
      <div className="runtime-grid">
        <section className="panel runtime-session-panel">
          <PanelHeader
            title="Transcript Stream"
            subtitle="Keep durable listener output, workspace results, and environment events visible in one place so system feedback does not disappear inside whichever surface produced it."
          />
          <div className="signal-digest-grid runtime-session-digest">
            <div className="signal-digest-card">
              <span className="context-label">Entries</span>
              <strong>{filteredTranscriptEntries.length}</strong>
              <p>{filteredTranscriptEntries[0]?.summary ?? "No durable transcript entries have been retained yet."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Latest Source</span>
              <strong>{selectedEntry?.source ?? "transcript"}</strong>
              <p>{selectedEntry?.title ?? "Workspace, listener, and event output will aggregate here."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Recency</span>
              <strong>{selectedEntry ? transcriptRecencyLabel(selectedEntry.timestamp) : "Retained"}</strong>
              <p>{selectedEntry?.timestamp ?? "New transcript entries will expose their ambient timing here."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Inspector</span>
              <strong>Universal</strong>
              <p>The transcript should remain an ambient surface, with deeper object and execution detail still handed off to the inspector.</p>
            </div>
          </div>
          <div className="browser-action-strip">
            {(["all", "workspace", "listener", "event"] as const).map((source) => (
              <button
                className={selectedSourceFilter === source ? "starter-chip active" : "starter-chip"}
                key={source}
                onClick={() => setSelectedSourceFilter(source)}
                type="button"
              >
                {source === "all" ? "All Sources" : source[0].toUpperCase() + source.slice(1)}
              </button>
            ))}
          </div>
          <div className="browser-action-strip">
            <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
              Open Inspector
            </button>
            <button className="starter-chip" onClick={() => void openEvidenceObservation()} type="button">
              Open Observation
            </button>
          </div>
        </section>

        <section className="panel runtime-scope-panel">
          <PanelHeader
            title="Transcript Entries"
            subtitle="Transcript entries stay durable enough to rehydrate scratch work, resume direct evaluation, or pivot into evidentiary observation."
          />
          <BrowserDataTable
            key="transcript-entries"
            columnTemplate="minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 1.1fr) minmax(0, 1.6fr)"
            columns={[
              {
                id: "timestamp",
                label: "Time",
                render: (row) => row.timestamp,
                sortValue: (row) => row.timestamp,
                searchValue: (row) => `${row.timestamp} ${row.title} ${row.summary}`
              },
              {
                id: "source",
                label: "Source",
                render: (row) => <Badge tone="steady">{row.source}</Badge>,
                sortValue: (row) => row.source
              },
              {
                id: "title",
                label: "Title",
                render: (row) => <strong>{row.title}</strong>,
                sortValue: (row) => row.title
              },
              {
                id: "summary",
                label: "Summary",
                render: (row) => row.summary,
                sortValue: (row) => row.summary,
                searchValue: (row) => row.summary
              }
            ]}
            emptyMessage="No transcript entries are currently available."
            filterLabel="Source"
            filterOptions={Array.from(new Set(transcriptEntries.map((row) => row.source))).map((value) => ({ label: value, value }))}
            getFilterValue={(row) => row.source}
            getRowKey={(row) => row.key}
            onSelect={(row) => setSelectedEntryKey(row.key)}
            rows={filteredTranscriptEntries}
            searchPlaceholder="Search transcript entries"
            selectedKey={selectedEntryKey}
          />
        </section>

        <section className="panel runtime-history-panel">
          <PanelHeader
            title="Source Rhythm"
            subtitle="Transcript should read as an ambient stream with visible source clusters, not only as a flat chronological table."
          />
          {transcriptSourceGroups.length > 0 ? (
            <div className="runtime-history-list">
              {transcriptSourceGroups.map((group) => (
                <div className="runtime-history-entry" key={`transcript-group:${group.source}`}>
                  <div className="runtime-history-entry-top">
                    <Badge tone="steady">{group.source}</Badge>
                    <span className="runtime-result-op">{group.latestRecency}</span>
                  </div>
                  <strong>{group.latestTitle}</strong>
                  <p>{`${group.count} retained ${group.count === 1 ? "entry" : "entries"} currently contribute to this source lane. Latest activity: ${group.latestTimestamp}.`}</p>
                  <div className="ref-list">
                    {group.families.length > 0 ? (
                      group.families.map((family) => (
                        <span className="thread-flag" key={`transcript-family:${group.source}:${family}`}>
                          {family}
                        </span>
                      ))
                    ) : (
                      <span className="thread-flag">ambient</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="list-empty">Source grouping appears once transcript entries begin accumulating across the environment.</p>
          )}
        </section>

        <section className="panel runtime-result-panel">
          <PanelHeader
            title="Transcript Detail"
            subtitle="The current transcript focus should support reuse and handoff instead of acting like a dead log."
          />
          {selectedEntry ? (
            <div className="runtime-result-stack">
              <div className="runtime-result-header">
                <Badge tone={selectedEntry.status ? toneForCommandStatus(selectedEntry.status) : "steady"}>
                  {selectedEntry.status ?? selectedEntry.source}
                </Badge>
                <span className="runtime-result-op">{`${transcriptRecencyLabel(selectedEntry.timestamp)} · ${selectedEntry.timestamp}`}</span>
              </div>
              <p className="lead-copy">{selectedEntry.summary}</p>
              {selectedEntry.form ? <pre className="runtime-history-form">{selectedEntry.form}</pre> : null}
              {selectedEntry.preview ? <pre className="runtime-preview">{selectedEntry.preview}</pre> : null}
              <div className="browser-action-strip">
                {selectedEntry.form ? (
                  <button className="starter-chip" onClick={() => setWorkspaceDraft(selectedEntry.form ?? "")} type="button">
                    Rehydrate To Workspace
                  </button>
                ) : null}
                {selectedEntry.form ? (
                  <button className="starter-chip" onClick={() => void openConversationRepl(selectedEntry.form ?? "")} type="button">
                    Open In REPL
                  </button>
                ) : null}
                {selectedEntry.form ? (
                  <button className="starter-chip" onClick={() => void openListener(selectedEntry.form ?? "")} type="button">
                    Send To Listener
                  </button>
                ) : null}
                {selectedEntry.threadId ? (
                  <button
                    className="starter-chip"
                    onClick={() => void openConversationContext(selectedEntry.threadId ?? "", selectedEntry.turnId)}
                    type="button"
                  >
                    {selectedEntry.turnId ? "Open Turn" : "Open Thread"}
                  </button>
                ) : null}
                {selectedEntry.source === "event" ? (
                  <button className="starter-chip" onClick={() => void openEvidenceObservation()} type="button">
                    Open Observation
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="list-empty">Transcript detail will appear here once durable output is retained.</p>
          )}
        </section>
      </div>
    </div>
  );
}
