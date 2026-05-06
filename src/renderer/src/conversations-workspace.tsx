import { useEffect, useMemo, useState } from "react";
import type {
  CommandResultDto,
  LinkedEntityRefDto,
  QueryResultDto,
  ReplSessionProfileDto,
  RuntimeEvalResultDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto
} from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { LinkedEntityList, PrioritySignalCluster, PriorityStateChip, RefBlock, type SignalCounts } from "./interaction-support";
import { Badge } from "./surface-support";
import { RuntimeWorkspace } from "./runtime-workspace";

type ConversationSection = "threads" | "turns" | "draft" | "repl";

export type ConversationsWorkspaceProps = {
  activateConversationInspectorSection: (section: ConversationSection) => void;
  threads: ThreadSummaryDto[];
  conversationDraft: string;
  selectedSection: ConversationSection;
  pageSignalCounts: SignalCounts;
  currentReplSessionId: string | null;
  replSessions: ReplSessionProfileDto[];
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
  isEvaluating: boolean;
  isInspectingRuntime: boolean;
  selectedConversationMessageId: string | null;
  selectedThreadId: string | null;
  selectedThread: ThreadDetailDto | null;
  selectedTurnId: string | null;
  selectedTurn: TurnDetailDto | null;
  setConversationDraft: (value: string) => void;
  setSelectedConversationMessageId: (messageId: string | null) => void;
  onOpenCreateConversationSession: () => void;
  onOpenRenameConversationSession: (threadId: string, title: string) => void;
  setSelectedThreadId: (threadId: string) => void;
  setSelectedTurnId: (turnId: string) => void;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
  conversationSections: Array<{
    id: ConversationSection;
    label: string;
    summary: string;
  }>;
};

export function ConversationsWorkspace({
  activateConversationInspectorSection,
  threads,
  conversationDraft,
  selectedSection,
  pageSignalCounts,
  currentReplSessionId,
  replSessions,
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
  isEvaluating,
  isInspectingRuntime,
  selectedConversationMessageId,
  selectedThreadId,
  selectedThread,
  selectedTurnId,
  selectedTurn,
  setConversationDraft,
  setSelectedConversationMessageId,
  onOpenCreateConversationSession,
  onOpenRenameConversationSession,
  setSelectedThreadId,
  setSelectedTurnId,
  navigateToLinkedEntity,
  openInspectorSurface,
  conversationSections
}: ConversationsWorkspaceProps) {
  const [threadTableExpanded, setThreadTableExpanded] = useState(true);
  const selectedThreadSubview = !selectedThread && selectedSection !== "repl" ? "threads" : selectedSection;
  const threadRows = useMemo(
    () =>
      threads.map((thread) => ({
        key: thread.threadId,
        title: thread.title,
        state: thread.state,
        latestTurnState: thread.latestTurnState,
        latestActivityAt: thread.latestActivityAt,
        summary: thread.summary,
        flags: thread.attentionFlags
      })),
    [threads]
  );
  const attentionThreadRows = useMemo(
    () =>
      threadRows.filter(
        (thread) =>
          thread.flags.length > 0 ||
          thread.state === "waiting" ||
          thread.state === "blocked" ||
          thread.latestTurnState === "awaiting_approval" ||
          thread.latestTurnState === "interrupted" ||
          thread.latestTurnState === "failed"
      ),
    [threadRows]
  );
  const primaryAttentionThread = attentionThreadRows[0] ?? null;
  const collapsedThreadSummary = primaryAttentionThread
    ? attentionThreadRows.length > 1
      ? `${attentionThreadRows.length} threads require attention. ${primaryAttentionThread.title} is the first surfaced thread.`
      : `${primaryAttentionThread.title} requires attention.`
    : `${threadRows.length} conversation sessions available.${selectedThread ? ` ${selectedThread.title} is selected.` : ""}`;
  const collapsedThreadMeta = primaryAttentionThread
    ? [primaryAttentionThread.state, primaryAttentionThread.latestTurnState, primaryAttentionThread.flags[0]]
        .filter((value): value is string => Boolean(value))
        .join(" · ")
    : selectedThread?.summary ?? "Collapse the thread frame to preserve working space without losing navigation context.";
  const turnRows = useMemo(
    () =>
      selectedThread?.turns.map((turn) => ({
        key: turn.turnId,
        title: turn.title,
        state: turn.state,
        createdAt: turn.createdAt
      })) ?? [],
    [selectedThread?.turns]
  );
  const selectedConversationMessage =
    selectedThread?.messages.find((message) => message.messageId === selectedConversationMessageId) ?? null;
  const focusTurnSummary = selectedThread?.turns[0] ?? null;
  const focusMessage = selectedConversationMessage ?? selectedThread?.messages.at(-1) ?? null;

  useEffect(() => {
    if (!selectedThread && selectedSection !== "threads" && selectedSection !== "repl") {
      activateConversationInspectorSection("threads");
    }
  }, [activateConversationInspectorSection, selectedSection, selectedThread]);

  return (
    <div className="conversations-journey">
      <div className="conversation-layout">
        <div className="conversation-threads-shell">
          <section
            aria-label="Thread Navigation"
            className={`panel conversation-list-panel${threadTableExpanded ? "" : " conversation-list-panel-collapsed"}`}
          >
            {threadTableExpanded ? (
              <div className="conversation-frame-header">
                <div>
                  <p className="eyebrow">Conversations &gt;&gt; Threads</p>
                </div>
                <div className="conversation-frame-header-actions">
                  <PrioritySignalCluster counts={pageSignalCounts} />
                  <Badge tone="steady">{`${threadRows.length} threads`}</Badge>
                  <button
                    aria-label="Collapse thread table"
                    className="panel-titlebar-toggle"
                    onClick={() => setThreadTableExpanded((current) => !current)}
                    title="Collapse thread table"
                    type="button"
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="conversation-frame-inline">
                <div className="conversation-frame-inline-title">
                  <span className="conversation-frame-inline-eyebrow">Conversations &gt;&gt; Threads</span>
                </div>
                <div className="conversation-frame-inline-summary" title={`${collapsedThreadSummary} ${collapsedThreadMeta}`}>
                  <strong>{collapsedThreadSummary}</strong>
                  <span>{collapsedThreadMeta}</span>
                </div>
                <div className="conversation-frame-inline-actions">
                  <PrioritySignalCluster counts={pageSignalCounts} />
                  <Badge tone="steady">{`${threadRows.length} threads`}</Badge>
                  {primaryAttentionThread ? (
                    <button
                      className="thread-collapsed-focus-button"
                      onClick={() => {
                        setSelectedThreadId(primaryAttentionThread.key);
                        activateConversationInspectorSection("threads");
                      }}
                      type="button"
                    >
                      Focus {primaryAttentionThread.title}
                    </button>
                  ) : null}
                  <button
                    aria-label="Expand thread table"
                    className="panel-titlebar-toggle"
                    onClick={() => setThreadTableExpanded(true)}
                    title="Expand thread table"
                    type="button"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </div>
            )}
            {threadTableExpanded ? (
              <BrowserDataTable
                key="conversation-threads"
                columnTemplate="minmax(180px, 1.05fr) minmax(92px, max-content) minmax(112px, max-content) minmax(132px, 0.92fr) minmax(220px, 1.2fr) 44px"
                columns={[
                  {
                    id: "thread",
                    label: "Thread",
                    render: (row) => <strong>{row.title}</strong>,
                    sortValue: (row) => row.title,
                    searchValue: (row) => `${row.title} ${row.summary} ${row.flags.join(" ")}`
                  },
                  {
                    id: "state",
                    label: "State",
                    render: (row) => <PriorityStateChip label={row.state} tone={toneForThreadState(row.state)} />,
                    sortValue: (row) => row.state
                  },
                  {
                    id: "turn",
                    label: "Latest Turn",
                    render: (row) => row.latestTurnState,
                    sortValue: (row) => row.latestTurnState
                  },
                  {
                    id: "updated",
                    label: "Updated",
                    render: (row) => row.latestActivityAt,
                    sortValue: (row) => row.latestActivityAt
                  },
                  {
                    id: "summary",
                    label: "Summary",
                    render: (row) => row.summary,
                    sortValue: (row) => row.summary,
                    searchValue: (row) => row.summary
                  },
                  {
                    id: "edit",
                    label: "",
                    render: (row) => (
                      <button
                        aria-label={`Rename ${row.title}`}
                        className="panel-titlebar-toggle table-row-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenRenameConversationSession(row.key, row.title);
                        }}
                        title={`Rename ${row.title}`}
                        type="button"
                      >
                        <span aria-hidden="true">✎</span>
                      </button>
                    ),
                    sortValue: () => ""
                  }
                ]}
                emptyMessage="No structured conversation threads are available."
                filterLabel="State"
                filterOptions={Array.from(new Set(threadRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
                getFilterValue={(row) => row.state}
                getRowKey={(row) => row.key}
                onSelect={(row) => {
                  setSelectedThreadId(row.key);
                  activateConversationInspectorSection("threads");
                }}
                rows={threadRows}
                searchPlaceholder="Search conversation threads"
                selectedKey={selectedThreadId}
                toolbarLeading={
                  <button
                    aria-label="New conversation session"
                    className="panel-titlebar-toggle"
                    onClick={onOpenCreateConversationSession}
                    title="New conversation session"
                    type="button"
                  >
                    <span aria-hidden="true">{`{+}`}</span>
                  </button>
                }
              />
            ) : null}
          </section>

          <section className="panel conversation-thread-panel conversation-browse-detail-panel">
            <div className="conversation-thread-subview-header">
              <p className="eyebrow">
                {selectedThreadSubview === "repl"
                  ? "Conversations >> REPL"
                  : selectedThread
                    ? `Conversations >> Threads >> ${selectedThread.title}`
                    : "Conversations >> Threads"}
              </p>
              {selectedThread || selectedThreadSubview === "repl" ? (
                <div className="browser-action-strip">
                  <div className="inspector-tabs" role="tablist" aria-label="Selected thread views">
                    {conversationSections.map((section) => (
                      <button
                        aria-selected={selectedThreadSubview === section.id}
                        className={selectedThreadSubview === section.id ? "inspector-tab active" : "inspector-tab"}
                        key={section.id}
                        onClick={() => activateConversationInspectorSection(section.id)}
                        role="tab"
                        type="button"
                      >
                        {section.id === "threads" ? "Overview" : section.label}
                      </button>
                    ))}
                  </div>
                  <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                    Open Inspector
                  </button>
                </div>
              ) : (
                <p className="inspector-copy">
                  Select a thread first. Turns and drafting become available only inside the active thread context.
                </p>
              )}
            </div>
            {selectedThreadSubview === "threads" ? (
              selectedThread ? (
                <div className="conversation-subview-stack">
                  <div className="browser-focus-card">
                    <div>
                      <p className="context-label">Thread</p>
                      <strong>{selectedThread.title}</strong>
                      <p>{selectedThread.summary}</p>
                    </div>
                    <PriorityStateChip label={selectedThread.state} tone={toneForThreadState(selectedThread.state)} />
                  </div>
                  <dl className="detail-list">
                    <DetailRow label="Turns" value={String(selectedThread.turns.length)} />
                    <DetailRow label="Messages" value={String(selectedThread.messages.length)} />
                    <DetailRow label="Linked Entities" value={String(selectedThread.linkedEntities.length)} />
                    <DetailRow label="Latest Activity" value={focusTurnSummary?.createdAt ?? "n/a"} />
                  </dl>
                  {selectedTurn ? (
                    <div className="conversation-subview-detail">
                      <div className="browser-focus-card">
                        <div>
                          <p className="context-label">Focused Turn</p>
                          <strong>{selectedTurn.title}</strong>
                          <p>{selectedTurn.summary}</p>
                        </div>
                        <PriorityStateChip label={selectedTurn.state} tone={toneForTurnState(selectedTurn.state)} />
                      </div>
                      <div className="turn-refs-grid">
                        <RefBlock label="Operations" values={selectedTurn.operationIds} />
                        <RefBlock label="Artifacts" values={selectedTurn.artifactIds} />
                        <RefBlock label="Incidents" values={selectedTurn.incidentIds} />
                        <RefBlock label="Approvals" values={selectedTurn.approvalIds} />
                        <RefBlock label="Work Items" values={selectedTurn.workItemIds} />
                      </div>
                    </div>
                  ) : focusTurnSummary ? (
                    <div className="thread-row static-row">
                      <div className="thread-row-top">
                        <strong>{focusTurnSummary.title}</strong>
                        <PriorityStateChip label={focusTurnSummary.state} tone={toneForTurnState(focusTurnSummary.state)} />
                      </div>
                      <p>{focusTurnSummary.createdAt}</p>
                    </div>
                  ) : null}
                  {focusMessage ? (
                    <div className="thread-row static-row">
                      <div className="thread-row-top">
                        <strong>{focusMessage.role}</strong>
                        <span>{focusMessage.createdAt}</span>
                      </div>
                      <p>{focusMessage.content}</p>
                    </div>
                  ) : null}
                  {selectedThread.linkedEntities.length > 0 ? (
                    <section className="linked-entities-panel">
                      <LinkedEntityList entities={selectedThread.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
                    </section>
                  ) : null}
                </div>
              ) : (
                <p className="inspector-copy">
                  Select a thread in the thread table to inspect its current turn, recent message, and linked governed entities.
                </p>
              )
            ) : null}
            {selectedThreadSubview === "turns" ? (
              selectedThread ? (
                <div className="conversation-subview-stack">
                  <BrowserDataTable
                    key={`conversation-turns:${selectedThread.threadId}`}
                    columnTemplate="minmax(0, 1.2fr) minmax(0, 0.85fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "turn",
                        label: "Turn",
                        render: (row) => <strong>{row.title}</strong>,
                        sortValue: (row) => row.title,
                        searchValue: (row) => `${row.title} ${row.state} ${row.createdAt}`
                      },
                      {
                        id: "state",
                        label: "State",
                        render: (row) => <PriorityStateChip label={row.state} tone={toneForTurnState(row.state)} />,
                        sortValue: (row) => row.state
                      },
                      {
                        id: "created",
                        label: "Created",
                        render: (row) => row.createdAt,
                        sortValue: (row) => row.createdAt
                      }
                    ]}
                    emptyMessage="No turns are available for the selected thread."
                    filterLabel="State"
                    filterOptions={Array.from(new Set(turnRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
                    getFilterValue={(row) => row.state}
                    getRowKey={(row) => row.key}
                    onSelect={(row) => {
                      setSelectedTurnId(row.key);
                      activateConversationInspectorSection("turns");
                    }}
                    rows={turnRows}
                    searchPlaceholder="Search turns"
                    selectedKey={selectedTurnId}
                  />
                  {selectedTurn ? (
                    <div className="conversation-subview-detail">
                      <div className="browser-focus-card">
                        <div>
                          <p className="context-label">Turn Summary</p>
                          <strong>{selectedTurn.title}</strong>
                          <p>{selectedTurn.summary}</p>
                        </div>
                        <PriorityStateChip label={selectedTurn.state} tone={toneForTurnState(selectedTurn.state)} />
                      </div>
                      <div className="turn-refs-grid">
                        <RefBlock label="Operations" values={selectedTurn.operationIds} />
                        <RefBlock label="Artifacts" values={selectedTurn.artifactIds} />
                        <RefBlock label="Incidents" values={selectedTurn.incidentIds} />
                        <RefBlock label="Approvals" values={selectedTurn.approvalIds} />
                        <RefBlock label="Work Items" values={selectedTurn.workItemIds} />
                      </div>
                    </div>
                  ) : (
                    <p className="inspector-copy">Select a turn to inspect its governed references.</p>
                  )}
                </div>
              ) : (
                <p className="inspector-copy">Select a thread in the thread table first to inspect its turns.</p>
              )
            ) : null}
            {selectedThreadSubview === "draft" ? (
              selectedThread ? (
                <div className="conversation-subview-stack">
                  <textarea
                    className="runtime-editor conversation-draft-editor"
                    onChange={(event) => setConversationDraft(event.target.value)}
                    value={conversationDraft}
                  />
                  <dl className="detail-list">
                    <DetailRow label="Thread" value={selectedThread.title} />
                    <DetailRow label="Messages" value={String(selectedThread.messages.length)} />
                    <DetailRow label="Turns" value={String(selectedThread.turns.length)} />
                    <DetailRow label="Linked Entities" value={String(selectedThread.linkedEntities.length)} />
                  </dl>
                </div>
              ) : (
                <p className="inspector-copy">
                  Select a thread in the thread table first so the draft has conversation context.
                </p>
              )
            ) : null}
            {selectedThreadSubview === "repl" ? (
              <div className="conversation-subview-stack">
                <dl className="detail-list">
                  <DetailRow label="Mode" value="Direct Eval" />
                  <DetailRow
                    label="Session"
                    value={
                      replSessions.find((session) => session.sessionId === currentReplSessionId)?.title ??
                      replSessions[0]?.title ??
                      "Primary Listener"
                    }
                  />
                  <DetailRow label="Package" value={runtimeSummary?.currentPackage ?? "listener"} />
                  <DetailRow label="Governance" value="Enforced" />
                </dl>
                <RuntimeWorkspace
                  createReplSession={createReplSession}
                  currentReplSessionId={currentReplSessionId}
                  evaluateRuntimeForm={evaluateRuntimeForm}
                  isEvaluating={isEvaluating}
                  inspectRuntimeSymbol={inspectRuntimeSymbol}
                  isInspectingRuntime={isInspectingRuntime}
                  openInspectorSurface={openInspectorSurface}
                  replSessionTitleDraft={replSessionTitleDraft}
                  replSessions={replSessions}
                  runtimeForm={runtimeForm}
                  runtimeInspection={runtimeInspection}
                  runtimeInspectionMode={runtimeInspectionMode}
                  runtimeInspectorPackage={runtimeInspectorPackage}
                  runtimeInspectorSymbol={runtimeInspectorSymbol}
                  runtimeResult={runtimeResult}
                  runtimeSummary={runtimeSummary}
                  setReplSessionTitleDraft={setReplSessionTitleDraft}
                  setRuntimeForm={setRuntimeForm}
                  setRuntimeInspectionMode={setRuntimeInspectionMode}
                  setRuntimeInspectorPackage={setRuntimeInspectorPackage}
                  setRuntimeInspectorSymbol={setRuntimeInspectorSymbol}
                  surfaceMode="conversation-repl"
                  switchReplSession={switchReplSession}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
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

function toneForThreadState(state: ThreadSummaryDto["state"]): "active" | "warning" | "danger" | "steady" {
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

function toneForTurnState(state: TurnDetailDto["state"]): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "running":
    case "completed":
      return "active";
    case "awaiting_approval":
    case "interrupted":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "steady";
  }
}
