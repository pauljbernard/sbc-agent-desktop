import { useEffect, useMemo } from "react";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader, toneForCommandStatus, transcriptRecencyLabel } from "./surface-support";

export interface TranscriptSurfaceEntry {
  key: string;
  timestamp: string;
  source:
    | "workspace"
    | "listener"
    | "conversation"
    | "event"
    | "environment-console"
    | "host-console";
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
  selectedSourceFilter,
  setSelectedSourceFilter,
  selectedEntryKey,
  setSelectedEntryKey,
  setWorkspaceDraft,
  openConversationRepl,
  openConversationContext,
  openEvidenceObservation,
  openListener,
  openInspectorSurface
}: {
  transcriptEntries: TranscriptSurfaceEntry[];
  selectedSourceFilter: "all" | TranscriptSurfaceEntry["source"];
  setSelectedSourceFilter: (value: "all" | TranscriptSurfaceEntry["source"]) => void;
  selectedEntryKey: string | null;
  setSelectedEntryKey: (value: string | null) => void;
  setWorkspaceDraft: (value: string) => void;
  openConversationRepl: (form: string) => Promise<void>;
  openConversationContext: (threadId: string, turnId?: string | null) => Promise<void>;
  openEvidenceObservation: () => Promise<void>;
  openListener: (form: string) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
}) {
  const filteredTranscriptEntries = useMemo(
    () =>
      selectedSourceFilter === "all"
        ? transcriptEntries
        : transcriptEntries.filter((entry) => entry.source === selectedSourceFilter),
    [selectedSourceFilter, transcriptEntries]
  );

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
  const transcriptSourceOptions = useMemo(
    () =>
      Array.from(new Set(transcriptEntries.map((entry) => entry.source))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [transcriptEntries]
  );
  return (
    <div className="transcript-journey">
      <div className="runtime-grid">
        <section className="panel runtime-scope-panel">
          <PanelHeader
            title="Transcript Entries"
            subtitle="Transcript entries stay durable enough to rehydrate scratch work, resume direct evaluation, or pivot into evidentiary observation."
          />
          <div className="browser-action-strip">
            {(["all", ...transcriptSourceOptions] as const).map((source) => (
              <button
                className={selectedSourceFilter === source ? "starter-chip active" : "starter-chip"}
                key={source}
                onClick={() => setSelectedSourceFilter(source)}
                type="button"
              >
                {source === "all"
                  ? "All Sources"
                  : source
                      .split("-")
                      .map((part) => part[0].toUpperCase() + part.slice(1))
                      .join(" ")}
              </button>
            ))}
          </div>
          <div className="browser-action-strip">
            <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
              Open Inspector
            </button>
            <button className="starter-chip" onClick={() => void openEvidenceObservation()} type="button">
              Open Evidence
            </button>
          </div>
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
            filterOptions={transcriptSourceOptions.map((value) => ({ label: value, value }))}
            getFilterValue={(row) => row.source}
            getRowKey={(row) => row.key}
            onSelect={(row) => setSelectedEntryKey(row.key)}
            rows={filteredTranscriptEntries}
            searchPlaceholder="Search transcript entries"
            selectedKey={selectedEntryKey}
          />
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
                    Open Evidence
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
