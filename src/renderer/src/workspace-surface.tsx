import { useEffect, useRef, useState } from "react";
import type { CommandResultDto, ReplSessionHistoryEntryDto, RuntimeEvalResultDto, RuntimeSummaryDto } from "../../shared/contracts";
import { Badge, PanelHeader, toneForCommandStatus } from "./surface-support";

export function WorkspaceSurface({
  workspacePackage,
  setWorkspacePackage,
  workspaceDraft,
  setWorkspaceDraft,
  evaluateWorkspaceForm,
  evaluateWorkspaceSource,
  workspaceResult,
  workspaceHistory,
  runtimeSummary,
  isEvaluating,
  openConversationRepl,
  setRuntimeForm,
  openInspectorSurface
}: {
  workspacePackage: string;
  setWorkspacePackage: (value: string) => void;
  workspaceDraft: string;
  setWorkspaceDraft: (value: string) => void;
  evaluateWorkspaceForm: () => Promise<void>;
  evaluateWorkspaceSource: (form: string) => Promise<void>;
  workspaceResult: CommandResultDto<RuntimeEvalResultDto> | null;
  workspaceHistory: ReplSessionHistoryEntryDto[];
  runtimeSummary: RuntimeSummaryDto | null;
  isEvaluating: boolean;
  openConversationRepl: (form: string) => Promise<void>;
  setRuntimeForm: (value: string) => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [workspaceSelection, setWorkspaceSelection] = useState("");
  const [workspaceCurrentForm, setWorkspaceCurrentForm] = useState("");
  const workspaceStarterForms = [
    {
      id: "describe-runtime",
      label: "Describe Runtime",
      form: '(describe "sbcl-agent")'
    },
    {
      id: "package",
      label: "Package Setup",
      form: `(in-package :${(runtimeSummary?.currentPackage ?? "cl-user").toLowerCase()})`
    },
    {
      id: "system-scan",
      label: "Loaded Systems",
      form: "(mapcar #'identity *features*)"
    }
  ];

  function findCurrentWorkspaceForm(source: string, cursorIndex: number): string {
    if (source.trim().length === 0) {
      return "";
    }

    let start = -1;
    let depth = 0;
    for (let index = Math.min(cursorIndex, source.length - 1); index >= 0; index -= 1) {
      const char = source[index];
      if (char === ")") {
        depth += 1;
      } else if (char === "(") {
        if (depth === 0) {
          start = index;
          break;
        }
        depth -= 1;
      }
    }

    if (start >= 0) {
      depth = 0;
      for (let index = start; index < source.length; index += 1) {
        const char = source[index];
        if (char === "(") {
          depth += 1;
        } else if (char === ")") {
          depth -= 1;
          if (depth === 0) {
            return source.slice(start, index + 1).trim();
          }
        }
      }
    }

    const before = source.slice(0, cursorIndex);
    const after = source.slice(cursorIndex);
    const blockStart = before.lastIndexOf("\n\n");
    const blockEndRelative = after.indexOf("\n\n");
    const normalizedStart = blockStart >= 0 ? blockStart + 2 : 0;
    const normalizedEnd = blockEndRelative >= 0 ? cursorIndex + blockEndRelative : source.length;
    return source.slice(normalizedStart, normalizedEnd).trim();
  }

  function updateWorkspaceSelectionState(): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      setWorkspaceSelection("");
      setWorkspaceCurrentForm("");
      return;
    }
    const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
    setWorkspaceSelection(selectedText);
    setWorkspaceCurrentForm(findCurrentWorkspaceForm(textarea.value, textarea.selectionStart));
  }

  function insertWorkspaceForm(form: string): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      setWorkspaceDraft(workspaceDraft.trim().length > 0 ? `${workspaceDraft}\n\n${form}` : form);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${textarea.value.slice(0, start)}${form}${textarea.value.slice(end)}`;
    setWorkspaceDraft(nextValue);

    requestAnimationFrame(() => {
      if (!textareaRef.current) {
        return;
      }
      const nextCursor = start + form.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      updateWorkspaceSelectionState();
    });
  }

  useEffect(() => {
    updateWorkspaceSelectionState();
  }, [workspaceDraft]);

  const workspaceHandoffForm = workspaceSelection || workspaceCurrentForm || workspaceDraft.trim();

  return (
    <div className="workspace-journey">
      <div className="runtime-grid">
        <section className="panel runtime-session-panel">
          <PanelHeader
            title="Scratch Workspace"
            subtitle="Draft forms here, evaluate them deliberately, and keep the scratch surface distinct from both conversational REPL work and execution-journey listener posture."
          />
          <div className="signal-digest-grid runtime-session-digest">
            <div className="signal-digest-card">
              <span className="context-label">Mode</span>
              <strong>Workspace</strong>
              <p>Immediate Lisp composition remains available without collapsing this surface into either thread continuity or governed execution routing.</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Package</span>
              <strong>{workspacePackage || runtimeSummary?.currentPackage || "cl-user"}</strong>
              <p>{runtimeSummary?.divergencePosture ?? "Bind an environment to expose current runtime posture."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Governance</span>
              <strong>Still Enforced</strong>
              <p>Workspace evaluation stays under the same approval, evidence, and recovery model as the rest of the environment.</p>
            </div>
          </div>
          <div className="browser-action-strip">
            <label className="runtime-session-create">
              <span className="context-label">Package</span>
              <input onChange={(event) => setWorkspacePackage(event.target.value)} value={workspacePackage} />
            </label>
            <button className="starter-chip" onClick={() => setRuntimeForm(workspaceHandoffForm)} type="button">
              Send To Listener
            </button>
            <button
              className="starter-chip"
              disabled={workspaceHandoffForm.trim().length === 0}
              onClick={() => void openConversationRepl(workspaceHandoffForm)}
              type="button"
            >
              Open In REPL
            </button>
            <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
              Open Inspector
            </button>
          </div>
          <div className="browser-action-strip">
            {workspaceStarterForms.map((starter) => (
              <button className="starter-chip" key={starter.id} onClick={() => insertWorkspaceForm(starter.form)} type="button">
                {starter.label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel runtime-eval-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Workspace Buffer</p>
              <h3>Lisp Scratchpad</h3>
            </div>
            <Badge tone="active">{runtimeSummary?.currentPackage ?? "workspace"}</Badge>
          </div>
          <textarea
            className="runtime-editor"
            onChange={(event) => setWorkspaceDraft(event.target.value)}
            onClick={updateWorkspaceSelectionState}
            onKeyUp={updateWorkspaceSelectionState}
            onSelect={updateWorkspaceSelectionState}
            ref={textareaRef}
            value={workspaceDraft}
          />
          <div className="signal-digest-grid runtime-session-digest">
            <div className="signal-digest-card">
              <span className="context-label">Selection</span>
              <strong>{workspaceSelection ? "Active" : "None"}</strong>
              <p>{workspaceSelection ? "The current text selection can be evaluated directly." : "Select a region to evaluate only that portion of the workspace buffer."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Current Form</span>
              <strong>{workspaceCurrentForm ? "Resolved" : "Unavailable"}</strong>
              <p>{workspaceCurrentForm ? "The nearest Lisp form around the cursor is ready for direct evaluation." : "Place the cursor inside a form to evaluate it without running the whole buffer."}</p>
            </div>
          </div>
          <div className="browser-action-strip">
            <button
              className="starter-chip"
              disabled={isEvaluating || workspaceSelection.trim().length === 0}
              onClick={() => void evaluateWorkspaceSource(workspaceSelection)}
              type="button"
            >
              Evaluate Selection
            </button>
            <button
              className="starter-chip"
              disabled={isEvaluating || workspaceCurrentForm.trim().length === 0}
              onClick={() => void evaluateWorkspaceSource(workspaceCurrentForm)}
              type="button"
            >
              Evaluate Current Form
            </button>
            <button
              className="action-button"
              disabled={isEvaluating || workspaceDraft.trim().length === 0}
              onClick={() => void evaluateWorkspaceForm()}
              type="button"
            >
              {isEvaluating ? "Evaluating..." : "Evaluate Buffer"}
            </button>
          </div>
        </section>

        <section className="panel runtime-result-panel">
          <PanelHeader
            title="Workspace Result"
            subtitle="Scratch evaluation should keep a retained result here without requiring the operator to switch into the listener workbench."
          />
          {workspaceResult ? (
            <div className="runtime-result-stack">
              <div className="runtime-result-header">
                <Badge tone={toneForCommandStatus(workspaceResult.status)}>{workspaceResult.status}</Badge>
                <span className="runtime-result-op">{workspaceResult.operation}</span>
              </div>
              <p className="lead-copy">{workspaceResult.data.summary}</p>
              {workspaceResult.data.valuePreview ? <pre className="runtime-preview">{workspaceResult.data.valuePreview}</pre> : null}
              <div className="ref-list">
                {workspaceResult.data.operationId ? <span className="thread-flag">{workspaceResult.data.operationId}</span> : null}
                {workspaceResult.data.approvalId ? <span className="thread-flag">{workspaceResult.data.approvalId}</span> : null}
                {workspaceResult.data.incidentId ? <span className="thread-flag">{workspaceResult.data.incidentId}</span> : null}
                {workspaceResult.data.artifactIds.map((artifactId) => (
                  <span className="thread-flag" key={artifactId}>
                    {artifactId}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="list-empty">Evaluate the current workspace buffer to retain the governed result here.</p>
          )}
        </section>

        <section className="panel runtime-history-panel">
          <PanelHeader
            title="Workspace History"
            subtitle="Recent scratch evaluations stay retained here so useful forms do not disappear into one transient editor state."
          />
          {workspaceHistory.length > 0 ? (
            <div className="runtime-history-list">
              {workspaceHistory.map((entry) => (
                <div className="runtime-history-entry" key={entry.entryId}>
                  <div className="runtime-history-entry-top">
                    <Badge tone={toneForCommandStatus(entry.status)}>{entry.status}</Badge>
                    <span className="runtime-result-op">{entry.timestamp}</span>
                  </div>
                  <pre className="runtime-history-form">{entry.form}</pre>
                  <p>{entry.summary}</p>
                  <div className="browser-action-strip">
                    <button className="starter-chip" onClick={() => insertWorkspaceForm(entry.form)} type="button">
                      Rehydrate To Buffer
                    </button>
                    <button className="starter-chip" onClick={() => void evaluateWorkspaceSource(entry.form)} type="button">
                      Re-run
                    </button>
                  </div>
                  {entry.valuePreview ? <pre className="runtime-preview">{entry.valuePreview}</pre> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="list-empty">Evaluate forms in the workspace to build a retained scratch history here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
