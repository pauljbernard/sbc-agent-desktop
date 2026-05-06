import { RuntimeWorkspace, type RuntimeWorkspaceProps } from "./runtime-workspace";

export type ListenerWorkbenchAppProps = RuntimeWorkspaceProps & {
  onReturnToControlPanel: () => void;
};

export function ListenerWorkbenchApp({
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
  isEvaluating,
  isInspectingRuntime,
  openInspectorSurface,
  onReturnToControlPanel
}: ListenerWorkbenchAppProps) {
  return (
    <div className="hosted-app-workspace">
      <section className="panel hosted-app-hero">
        <p className="eyebrow">Hosted Application</p>
        <h2>Listener Workbench</h2>
        <p className="canvas-subtitle">
          This is the first hosted runtime-native application outside the control panel. It keeps live image work
          direct, inspectable, and governed at the shell level.
        </p>
        <div className="hosted-app-callouts">
          <div className="signal-digest-card">
            <span className="context-label">Native Surface</span>
            <strong>SBCL Image Listener</strong>
            <p>
              The workbench is where runtime execution becomes a first-class desktop resident instead of a nested
              control-panel view.
            </p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Retained Sessions</span>
            <strong>{replSessions.length}</strong>
            <p>{replSessions[0]?.title ?? "No retained REPL session is currently available."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Return Path</span>
            <strong>Control Panel</strong>
            <p>The control panel remains available for broader workflow, evidence, and recovery coordination.</p>
          </div>
        </div>
        <div className="hosted-app-actions">
          <button className="action-button" onClick={onReturnToControlPanel} type="button">
            Open Control Panel
          </button>
        </div>
      </section>
      <RuntimeWorkspace
        createReplSession={createReplSession}
        currentReplSessionId={currentReplSessionId}
        evaluateRuntimeForm={evaluateRuntimeForm}
        inspectRuntimeSymbol={inspectRuntimeSymbol}
        isEvaluating={isEvaluating}
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
        switchReplSession={switchReplSession}
      />
    </div>
  );
}
