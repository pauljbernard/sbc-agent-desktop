import { useEffect, useMemo, useState } from "react";
import type {
  CommandResultDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  ReplSessionProfileDto
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader, toneForCommandStatus } from "./surface-support";
import { ActorSystemPanel } from "./workspace-support-components";

export type RuntimeWorkspaceProps = {
  replSessions: ReplSessionProfileDto[];
  currentReplSessionId: string | null;
  switchReplSession: (sessionId: string) => Promise<void>;
  createReplSession: () => Promise<void>;
  replSessionTitleDraft: string;
  setReplSessionTitleDraft: (value: string) => void;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeForm: string;
  setRuntimeForm: (value: string) => void;
  evaluateRuntimeForm: () => Promise<void>;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeInspectionMode: RuntimeInspectionMode;
  runtimeInspectorSymbol: string;
  runtimeInspectorPackage: string;
  setRuntimeInspectionMode: (value: RuntimeInspectionMode) => void;
  setRuntimeInspectorSymbol: (value: string) => void;
  setRuntimeInspectorPackage: (value: string) => void;
  inspectRuntimeSymbol: () => Promise<void>;
  runtimeResult: CommandResultDto<RuntimeEvalResultDto> | null;
  actorSystemPanel: Record<string, unknown> | null;
  isEvaluating: boolean;
  isInspectingRuntime: boolean;
  openInspectorSurface: () => Promise<void>;
  surfaceMode?: "listener" | "conversation-repl";
};

export function RuntimeWorkspace({
  replSessions,
  currentReplSessionId,
  switchReplSession,
  createReplSession,
  replSessionTitleDraft,
  setReplSessionTitleDraft,
  runtimeSummary,
  runtimeForm,
  setRuntimeForm,
  evaluateRuntimeForm,
  runtimeInspection,
  runtimeInspectionMode,
  runtimeInspectorSymbol,
  runtimeInspectorPackage,
  setRuntimeInspectionMode,
  setRuntimeInspectorSymbol,
  setRuntimeInspectorPackage,
  inspectRuntimeSymbol,
  runtimeResult,
  actorSystemPanel,
  isEvaluating,
  isInspectingRuntime,
  openInspectorSurface,
  surfaceMode = "listener"
}: RuntimeWorkspaceProps) {
  const scopeRows = useMemo(
    () =>
      runtimeSummary?.scopes.map((scope) => ({
        key: scope.scopeId,
        packageName: scope.packageName,
        symbolName: scope.symbolName ?? "",
        kind: scope.kind,
        summary: scope.summary
      })) ?? [],
    [runtimeSummary?.scopes]
  );
  const [selectedScopeKey, setSelectedScopeKey] = useState<string | null>(scopeRows[0]?.key ?? null);

  useEffect(() => {
    const nextScopeKey = scopeRows[0]?.key ?? null;
    if (!scopeRows.some((scope) => scope.key === selectedScopeKey) && selectedScopeKey !== nextScopeKey) {
      setSelectedScopeKey(nextScopeKey);
    }
  }, [scopeRows, selectedScopeKey]);

  const selectedScope = scopeRows.find((scope) => scope.key === selectedScopeKey) ?? scopeRows[0] ?? null;
  const selectedScopeIdentityRows = selectedScope
    ? [
        ["Object Id", selectedScope.key],
        ["Authority", selectedScope.kind],
        [
          "Trace",
          selectedScope.symbolName
            ? `${selectedScope.packageName}::${selectedScope.symbolName}`
            : selectedScope.packageName
        ]
      ]
    : [];
  const activeReplSession =
    replSessions.find((session) => session.sessionId === currentReplSessionId) ?? replSessions[0] ?? null;
  const sessionPanelTitle =
    surfaceMode === "conversation-repl" ? "Conversation REPL Sessions" : "Project REPL Sessions";
  const sessionPanelSubtitle =
    surfaceMode === "conversation-repl"
      ? "Direct eval inside the conversation surface should retain named governed sessions without collapsing back into agent-thread navigation."
      : "Listener work should retain named project-scoped sessions rather than collapsing into one ambient editor state.";
  const activeSessionLabel = surfaceMode === "conversation-repl" ? "Primary REPL" : "Primary Listener";
  const activeSessionSummary =
    surfaceMode === "conversation-repl"
      ? "The conversation REPL keeps the current package and latest governed runtime result attached to the active direct-eval session."
      : "The listener keeps the current package and latest runtime result attached to the active session.";
  const emptySessionSummary =
    surfaceMode === "conversation-repl"
      ? "Create a governed REPL session to keep separate direct-eval explorations inside the conversational surface."
      : "Create a listener session to keep separate runtime explorations and form history inside the same project.";
  const evalEyebrow = surfaceMode === "conversation-repl" ? "Direct Eval" : "REPL";
  const evalTitle = surfaceMode === "conversation-repl" ? "Conversation REPL" : "Listener";
  const evalActionLabel = surfaceMode === "conversation-repl" ? "Evaluate Form" : "Run Form";
  const resultTitle = surfaceMode === "conversation-repl" ? "Direct Eval Result" : "Listener Result";
  const resultSubtitle =
    surfaceMode === "conversation-repl"
      ? "Direct evaluation remains governed, but this surface is optimized for immediate conversational runtime work rather than execution-journey supervision."
      : "Evaluation remains governed, but the primary surface is still direct interactive development against the live image.";
  const historyTitle = surfaceMode === "conversation-repl" ? "REPL History" : "Session History";
  const historySubtitle =
    surfaceMode === "conversation-repl"
      ? "Each governed REPL session retains its recent evaluation trail so direct conversational runtime work remains inspectable."
      : "Each project REPL session now retains its recent evaluation trail instead of collapsing everything into the current editor state.";
  const emptyHistorySummary =
    surfaceMode === "conversation-repl"
      ? "Run forms in this REPL session to build a retained direct-eval history here."
      : "Run forms in this session to build a retained listener history here.";
  const summaryEyebrow = surfaceMode === "conversation-repl" ? "Direct Eval Surface" : "Live Image";
  const summaryTitle = surfaceMode === "conversation-repl" ? "REPL Runtime Context" : "Listener Runtime Context";

  if (!runtimeSummary) {
    return (
      <div className="empty-state">
        <p className="eyebrow">No Runtime Surface</p>
        <h3>Bind an environment to open the live image surface.</h3>
      </div>
    );
  }

  return (
    <div className="runtime-grid">
      <section className="panel runtime-session-panel">
        <PanelHeader title={sessionPanelTitle} subtitle={sessionPanelSubtitle} />
        <div className="signal-digest-grid runtime-session-digest">
          <div className="signal-digest-card">
            <span className="context-label">Sessions</span>
            <strong>{replSessions.length}</strong>
            <p>{replSessions[0]?.title ?? "No retained REPL session is currently available."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Active Session</span>
            <strong>{activeReplSession?.title ?? activeSessionLabel}</strong>
            <p>{activeReplSession?.lastSummary ?? activeSessionSummary}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Package</span>
            <strong>{activeReplSession?.packageName ?? runtimeSummary.currentPackage}</strong>
            <p>{runtimeSummary.divergencePosture}</p>
          </div>
        </div>
        <div className="runtime-session-strip">
          {replSessions.length > 0 ? (
            replSessions.slice(0, 6).map((session) => (
              <button
                className={session.sessionId === currentReplSessionId ? "runtime-session-card active" : "runtime-session-card"}
                key={session.sessionId}
                onClick={() => void switchReplSession(session.sessionId)}
                type="button"
              >
                <div className="runtime-session-card-top">
                  <strong>{session.title}</strong>
                  <Badge tone={session.sessionId === currentReplSessionId ? "active" : "steady"}>
                    {session.packageName ?? "listener"}
                  </Badge>
                </div>
                <p>{session.lastSummary ?? "No runtime result has been retained for this session yet."}</p>
              </button>
            ))
          ) : (
            <div className="runtime-session-card runtime-session-card-empty">
              <strong>No retained REPL sessions</strong>
              <p>{emptySessionSummary}</p>
            </div>
          )}
        </div>
        <div className="browser-action-strip">
          <label className="runtime-session-create">
            <span className="context-label">New Session</span>
            <input onChange={(event) => setReplSessionTitleDraft(event.target.value)} value={replSessionTitleDraft} />
          </label>
          <button className="starter-chip" onClick={() => void createReplSession()} type="button">
            New REPL Session
          </button>
        </div>
      </section>

      <section className="panel runtime-scope-panel">
        <PanelHeader
          title="Inspection Scopes"
          subtitle="Packages, symbols, and loaded definitions stay available as execution inspection entry points."
        />
        <BrowserDataTable
          key="runtime-scopes"
          columnTemplate="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
          columns={[
            {
              id: "package",
              label: "Package",
              render: (row) => <strong>{row.packageName}</strong>,
              sortValue: (row) => row.packageName,
              searchValue: (row) => `${row.packageName} ${row.symbolName} ${row.summary}`
            },
            {
              id: "symbol",
              label: "Symbol",
              render: (row) => row.symbolName || "Package Scope",
              sortValue: (row) => row.symbolName || row.packageName
            },
            {
              id: "kind",
              label: "Kind",
              render: (row) => <Badge tone="steady">{row.kind}</Badge>,
              sortValue: (row) => row.kind
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => row.summary
            }
          ]}
          emptyMessage="No inspection scopes are available."
          filterLabel="Kind"
          filterOptions={Array.from(new Set(scopeRows.map((row) => row.kind))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.kind}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedScopeKey(row.key)}
          rows={scopeRows}
          searchPlaceholder="Search scopes"
          selectedKey={selectedScopeKey}
        />
      </section>

      <section className="panel runtime-inspector-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Inspector</p>
            <h3>Live Symbol And XREF</h3>
          </div>
          <Badge tone="steady">{runtimeInspectionMode}</Badge>
        </div>
        <div className="runtime-inspector-controls">
          <input
            className="filter-input"
            onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
            placeholder="Symbol"
            value={runtimeInspectorSymbol}
          />
          <input
            className="filter-input"
            onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
            placeholder={runtimeSummary.currentPackage}
            value={runtimeInspectorPackage}
          />
          <select
            className="filter-input"
            onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
            value={runtimeInspectionMode}
          >
            <option value="describe">Describe</option>
            <option value="definitions">Find Definition</option>
            <option value="callers">Who Calls This</option>
            <option value="methods">Methods</option>
            <option value="divergence">Source/Image Drift</option>
          </select>
          <button
            className="action-button"
            disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
            onClick={() => void inspectRuntimeSymbol()}
            type="button"
          >
            {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
          </button>
        </div>
        {selectedScope ? (
          <>
            <div className="browser-focus-card runtime-scope-focus">
              <div>
                <p className="context-label">Selected Scope</p>
                <strong>
                  {selectedScope.symbolName
                    ? `${selectedScope.packageName} / ${selectedScope.symbolName}`
                    : selectedScope.packageName}
                </strong>
                <p>{selectedScope.summary}</p>
              </div>
              <button
                className="starter-chip"
                onClick={() => {
                  setRuntimeInspectorPackage(selectedScope.packageName);
                  setRuntimeInspectorSymbol(selectedScope.symbolName);
                }}
                type="button"
              >
                Load Into Inspector
              </button>
              <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                Open Inspector
              </button>
            </div>
            <dl className="detail-list">
              {selectedScopeIdentityRows.map(([label, value]) => (
                <DetailRow key={`runtime-scope:${label}`} label={label} value={value} />
              ))}
            </dl>
          </>
        ) : null}
        {runtimeInspection ? (
          <div className="runtime-result-stack">
            <p className="lead-copy">{runtimeInspection.data.summary}</p>
            <div className="ref-list">
              <span className="thread-flag">{runtimeInspection.data.packageName}</span>
              {runtimeInspection.data.runtimePresence ? (
                <span className="thread-flag">{runtimeInspection.data.runtimePresence}</span>
              ) : null}
              {runtimeInspection.data.divergence ? (
                <span className="thread-flag">{runtimeInspection.data.divergence}</span>
              ) : null}
            </div>
            <div className="entity-list">
              {runtimeInspection.data.items.map((item) => (
                <div className="entity-row" key={`${item.label}:${item.detail}`}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  {item.emphasis ? <Badge tone="steady">{item.emphasis}</Badge> : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="list-empty">
            Inspect a symbol to get live object metadata, definitions, callers, methods, or source/image drift.
          </p>
        )}
      </section>

      <section className="panel runtime-eval-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{evalEyebrow}</p>
            <h3>{evalTitle}</h3>
          </div>
          <Badge tone="active">{runtimeSummary.currentPackage}</Badge>
        </div>
        <textarea className="runtime-editor" onChange={(event) => setRuntimeForm(event.target.value)} value={runtimeForm} />
        <button
          className="action-button"
          disabled={isEvaluating || runtimeForm.trim().length === 0}
          onClick={() => void evaluateRuntimeForm()}
          type="button"
        >
          {isEvaluating ? "Evaluating..." : evalActionLabel}
        </button>
      </section>

      <section className="panel runtime-result-panel">
        <PanelHeader title={resultTitle} subtitle={resultSubtitle} />
        {runtimeResult ? (
          <div className="runtime-result-stack">
            <div className="runtime-result-header">
              <Badge tone={toneForCommandStatus(runtimeResult.status)}>{runtimeResult.status}</Badge>
              <span className="runtime-result-op">{runtimeResult.operation}</span>
            </div>
            <p className="lead-copy">{runtimeResult.data.summary}</p>
            {runtimeResult.data.valuePreview ? <pre className="runtime-preview">{runtimeResult.data.valuePreview}</pre> : null}
            {runtimeResult.data.recoveryLaunch ? (
              <div className="signal-detail-list">
                <div className="signal-detail-row">
                  <span>Recovery Source</span>
                  <strong>{runtimeResult.data.recoveryLaunch.source}</strong>
                </div>
                <div className="signal-detail-row">
                  <span>Incident</span>
                  <strong>{runtimeResult.data.recoveryLaunch.incidentId}</strong>
                </div>
                <div className="signal-detail-row">
                  <span>Restart</span>
                  <strong>{runtimeResult.data.recoveryLaunch.restartLabel}</strong>
                </div>
              </div>
            ) : null}
            <div className="ref-list">
              {runtimeResult.data.operationId ? <span className="thread-flag">{runtimeResult.data.operationId}</span> : null}
              {runtimeResult.data.approvalId ? <span className="thread-flag">{runtimeResult.data.approvalId}</span> : null}
              {runtimeResult.data.incidentId ? <span className="thread-flag">{runtimeResult.data.incidentId}</span> : null}
              {runtimeResult.data.artifactIds.map((artifactId) => (
                <span className="thread-flag" key={artifactId}>
                  {artifactId}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="list-empty">Run a form to see governed runtime results here.</p>
        )}
      </section>

      <section className="panel runtime-history-panel">
        <PanelHeader title={historyTitle} subtitle={historySubtitle} />
        {activeReplSession && (activeReplSession.history?.length ?? 0) > 0 ? (
          <div className="runtime-history-list">
            {(activeReplSession.history ?? []).map((entry) => (
              <div className="runtime-history-entry" key={entry.entryId}>
                <div className="runtime-history-entry-top">
                  <Badge tone={toneForCommandStatus(entry.status)}>{entry.status}</Badge>
                  <span className="runtime-result-op">{entry.timestamp}</span>
                </div>
                <pre className="runtime-history-form">{entry.form}</pre>
                <p>{entry.summary}</p>
                {entry.valuePreview ? <pre className="runtime-preview">{entry.valuePreview}</pre> : null}
                {entry.recoveryLaunch ? (
                  <div className="ref-list">
                    <span className="thread-flag">{entry.recoveryLaunch.source}</span>
                    <span className="thread-flag">{entry.recoveryLaunch.incidentId}</span>
                    <span className="thread-flag">{entry.recoveryLaunch.restartLabel}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="list-empty">{emptyHistorySummary}</p>
        )}
      </section>

      <section className="panel runtime-summary-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{summaryEyebrow}</p>
            <h3>{summaryTitle}</h3>
          </div>
          <Badge tone={runtimeSummary.activeMutations > 0 ? "warning" : "active"}>{runtimeSummary.currentPackage}</Badge>
        </div>
        <div className="runtime-summary-grid">
          <ContextBlock label="Runtime Id" value={runtimeSummary.runtimeId} />
          <ContextBlock label="Loaded Systems" value={String(runtimeSummary.loadedSystemCount)} />
          <ContextBlock label="Active Mutations" value={String(runtimeSummary.activeMutations)} />
          <ContextBlock label="Linked Incidents" value={String(runtimeSummary.linkedIncidentIds.length)} />
        </div>
        <div className="runtime-loaded-systems">
          {runtimeSummary.loadedSystems.map((systemName) => (
            <span className="thread-flag" key={systemName}>
              {systemName}
            </span>
          ))}
        </div>
        <p className="lead-copy">{runtimeSummary.divergencePosture}</p>
        <p className="mission-support">{runtimeSummary.sourceRelationship}</p>
      </section>

      <ActorSystemPanel actorSystemPanel={actorSystemPanel} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="context-block">
      <p className="context-label">{label}</p>
      <p className="context-value">{value}</p>
    </div>
  );
}
