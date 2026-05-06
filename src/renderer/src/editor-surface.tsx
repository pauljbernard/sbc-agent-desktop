import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CommandResultDto,
  EditorBufferStateDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto
} from "../../shared/contracts";
import { CommonLispEditor } from "./common-lisp-editor";
import { Badge, PanelHeader, toneForCommandStatus } from "./surface-support";

type EditorTab = "text" | "output" | "buffers" | "definitions" | "changed-forms" | "find-definitions";

interface EditorTopLevelForm {
  key: string;
  text: string;
  normalizedText: string;
  startLine: number;
}

interface ChangedEditorForm {
  key: string;
  status: "changed" | "added" | "removed";
  currentText: string | null;
  baselineText: string | null;
  startLine: number | null;
  symbol: string | null;
}

function EditorActionButton({
  className,
  disabled,
  glyphClassName,
  label,
  onClick,
  title
}: {
  className: string;
  disabled?: boolean;
  glyphClassName: string;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      aria-label={label}
      className={`${className} editor-action-button editor-action-button-icon`}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      type="button"
    >
      <span aria-hidden="true" className={`desktop-window-action-glyph ${glyphClassName}`} />
    </button>
  );
}

function normalizeEditorFormText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractEditorDefinitionSymbol(form: string): string | null {
  const match = form.match(/^\s*\((def(?:un|macro|class|generic|method|parameter|var|constant))\s+([^\s()]+)/i);
  return match?.[2] ?? null;
}

function extractTopLevelEditorForms(source: string): EditorTopLevelForm[] {
  const forms: EditorTopLevelForm[] = [];
  let index = 0;
  let line = 1;

  function advanceChar(char: string): void {
    if (char === "\n") {
      line += 1;
    }
    index += 1;
  }

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      advanceChar(char);
      continue;
    }
    if (char === ";") {
      while (index < source.length && source[index] !== "\n") {
        advanceChar(source[index]);
      }
      continue;
    }
    if (char !== "(") {
      const startIndex = index;
      const startLine = line;
      while (index < source.length && source[index] !== "\n") {
        advanceChar(source[index]);
      }
      const text = source.slice(startIndex, index).trim();
      if (text.length > 0) {
        forms.push({
          key: `${startLine}:${forms.length}`,
          text,
          normalizedText: normalizeEditorFormText(text),
          startLine
        });
      }
      continue;
    }

    const startIndex = index;
    const startLine = line;
    let depth = 0;
    let inString = false;
    let escaping = false;
    while (index < source.length) {
      const current = source[index];
      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (current === "\\") {
          escaping = true;
        } else if (current === "\"") {
          inString = false;
        }
        advanceChar(current);
        continue;
      }
      if (current === "\"") {
        inString = true;
        advanceChar(current);
        continue;
      }
      if (current === ";") {
        while (index < source.length && source[index] !== "\n") {
          advanceChar(source[index]);
        }
        continue;
      }
      if (current === "(") {
        depth += 1;
      } else if (current === ")") {
        depth -= 1;
      }
      advanceChar(current);
      if (depth === 0) {
        break;
      }
    }
    const text = source.slice(startIndex, index).trim();
    if (text.length > 0) {
      forms.push({
        key: `${startLine}:${forms.length}`,
        text,
        normalizedText: normalizeEditorFormText(text),
        startLine
      });
    }
  }

  return forms;
}

export function EditorSurface({
  acceptCurrentBufferBaseline,
  cloneEditorBuffer,
  createEditorBuffer,
  currentBufferDirty,
  currentBufferTitle,
  deleteEditorBuffers,
  editorBuffers,
  editorPackage,
  editorDraft,
  setEditorDraft,
  editorResult,
  packageBrowser,
  runtimeEntityDetail,
  runtimeInspection,
  selectedBufferId,
  setSelectedBufferId,
  sourcePreview,
  runtimeSummary,
  isEvaluating,
  parenDepthColors,
  sourceCodeTextScalePercent,
  inspectDefinitionSymbol,
  fetchRuntimeSymbolHelp,
  reportEditorCursorContext,
  evaluateEditorBuffer,
  openEditorSourceFileDialog,
  openEditorSourceFileSaveDialog,
  saveCurrentEditorBuffer,
  revertCurrentBufferToBaseline,
  openSourcePreview,
  openConversationRepl,
  setRuntimeForm,
  openInspectorSurface
}: {
  acceptCurrentBufferBaseline: () => void;
  cloneEditorBuffer: () => void;
  createEditorBuffer: () => void;
  currentBufferDirty: boolean;
  currentBufferTitle: string;
  deleteEditorBuffers: (bufferIds: string[]) => void;
  editorBuffers: EditorBufferStateDto[];
  editorPackage: string;
  editorDraft: string;
  setEditorDraft: (value: string) => void;
  editorResult: CommandResultDto<RuntimeEvalResultDto> | null;
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  selectedBufferId: string | null;
  setSelectedBufferId: (bufferId: string) => void;
  sourcePreview: { data: { path: string; focusLine?: number | null; summary: string } } | null;
  runtimeSummary: RuntimeSummaryDto | null;
  isEvaluating: boolean;
  parenDepthColors: string[];
  sourceCodeTextScalePercent: number;
  inspectDefinitionSymbol: (symbol: string, packageName?: string, mode?: RuntimeInspectionMode) => Promise<void>;
  fetchRuntimeSymbolHelp: (symbol: string, packageName?: string) => Promise<{
    detail: string;
    info: string;
    type?: string;
    packageName?: string;
    signature?: string | null;
  } | null>;
  reportEditorCursorContext?: (context: {
    symbol: string | null;
    packageName: string;
    help: {
      detail: string;
      info: string;
      type?: string;
      packageName?: string;
      signature?: string | null;
    } | null;
  }) => void;
  evaluateEditorBuffer: () => Promise<void>;
  openEditorSourceFileDialog: () => void;
  openEditorSourceFileSaveDialog: () => void;
  saveCurrentEditorBuffer: () => Promise<void>;
  revertCurrentBufferToBaseline: () => void;
  openSourcePreview: (path: string, line?: number) => Promise<void>;
  openConversationRepl: (form: string) => Promise<void>;
  setRuntimeForm: (value: string) => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>("text");
  const [bufferFilter, setBufferFilter] = useState("");
  const [definitionFilter, setDefinitionFilter] = useState("");
  const [definitionSearch, setDefinitionSearch] = useState("");
  const [definitionKindFilter, setDefinitionKindFilter] = useState("all");
  const [definitionVisibilityFilter, setDefinitionVisibilityFilter] = useState("all");
  const [changedFormFilter, setChangedFormFilter] = useState("");
  const [changedFormStatusFilter, setChangedFormStatusFilter] = useState("all");
  const [selectedBufferIds, setSelectedBufferIds] = useState<string[]>([]);
  const [cursorSymbol, setCursorSymbol] = useState<string | null>(null);
  const [cursorForm, setCursorForm] = useState<string | null>(null);
  const [cursorSymbolHelp, setCursorSymbolHelp] = useState<{
    detail: string;
    info: string;
    type?: string;
    packageName?: string;
    signature?: string | null;
  } | null>(null);
  const cursorSymbolHelpCacheRef = useRef(
    new Map<
      string,
      {
        detail: string;
        info: string;
        type?: string;
        packageName?: string;
        signature?: string | null;
      } | null
    >()
  );
  const editorTabs: Array<{ id: EditorTab; label: string }> = [
    { id: "text", label: "Text" },
    { id: "output", label: "Output" },
    { id: "buffers", label: "Buffers" },
    { id: "definitions", label: "Definitions" },
    { id: "changed-forms", label: "Changed Forms" },
    { id: "find-definitions", label: "Find Definitions" }
  ];
  const currentDefinitionSummary =
    runtimeEntityDetail?.data.summary ?? runtimeInspection?.data.summary ?? "";
  const currentDefinitionSource =
    runtimeEntityDetail?.data.relatedItems.find((item) => item.path) ??
    runtimeInspection?.data.items.find((item) => item.path) ??
    null;
  const filteredEditorBuffers = useMemo(() => {
    const normalizedFilter = bufferFilter.trim().toLowerCase();
    if (normalizedFilter.length === 0) {
      return editorBuffers;
    }
    return editorBuffers.filter((buffer) => {
      const haystack = [
        buffer.title,
        buffer.packageName,
        buffer.result?.data.summary,
        buffer.result?.data.valuePreview
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n")
        .toLowerCase();
      return haystack.includes(normalizedFilter);
    });
  }, [bufferFilter, editorBuffers]);
  const filteredDefinitionRelatedItems = useMemo(() => {
    const items = runtimeEntityDetail?.data.relatedItems ?? [];
    const normalizedFilter = definitionFilter.trim().toLowerCase();
    if (normalizedFilter.length === 0) {
      return items;
    }
    return items.filter((item) =>
      [item.label, item.detail, item.path, item.emphasis]
        .filter((value): value is string => Boolean(value))
        .join("\n")
        .toLowerCase()
        .includes(normalizedFilter)
    );
  }, [definitionFilter, runtimeEntityDetail?.data.relatedItems]);
  const definitionRows = useMemo(() => {
    const symbols = [...(packageBrowser?.data.externalSymbols ?? []), ...(packageBrowser?.data.internalSymbols ?? [])];
    const normalizedSearch = definitionSearch.trim().toLowerCase();
    const normalizedKindFilter = definitionKindFilter.toLowerCase();
    return symbols
      .filter((entry) => normalizedSearch.length === 0 || entry.symbol.toLowerCase().includes(normalizedSearch))
      .filter((entry) => definitionVisibilityFilter === "all" || entry.visibility === definitionVisibilityFilter)
      .filter((entry) => normalizedKindFilter === "all" || entry.kind === normalizedKindFilter)
      .slice(0, 48);
  }, [
    definitionKindFilter,
    definitionSearch,
    definitionVisibilityFilter,
    packageBrowser?.data.externalSymbols,
    packageBrowser?.data.internalSymbols
  ]);
  const editorSymbolCatalog = useMemo(
    () =>
      [
        ...(packageBrowser?.data.externalSymbols ?? []).map((entry) => ({
          ...entry,
          packageName: packageBrowser?.data.packageName
        })),
        ...(packageBrowser?.data.internalSymbols ?? []).map((entry) => ({
          ...entry,
          packageName: packageBrowser?.data.packageName
        }))
      ],
    [packageBrowser?.data.externalSymbols, packageBrowser?.data.internalSymbols, packageBrowser?.data.packageName]
  );
  const inspectedEditorSymbolHelp = useMemo(
    () =>
      runtimeEntityDetail?.data
        ? {
            symbol: runtimeEntityDetail.data.symbol,
            packageName: runtimeEntityDetail.data.packageName,
            kind: runtimeEntityDetail.data.entityKind,
            summary: runtimeEntityDetail.data.summary,
            signature: runtimeEntityDetail.data.signature ?? null
          }
        : runtimeInspection?.data
          ? {
              symbol: runtimeInspection.data.symbol,
              packageName: runtimeInspection.data.packageName,
              kind: runtimeInspection.data.mode,
              summary: runtimeInspection.data.summary,
              signature: null
            }
          : null,
    [
      runtimeEntityDetail?.data,
      runtimeInspection?.data
    ]
  );
  const activeEditorBuffer = editorBuffers.find((buffer) => buffer.bufferId === selectedBufferId) ?? editorBuffers[0] ?? null;
  const selectedBufferIdSet = useMemo(() => new Set(selectedBufferIds), [selectedBufferIds]);
  const deletableBufferCount = selectedBufferIds.length;

  useEffect(() => {
    setSelectedBufferIds((current) => current.filter((bufferId) => editorBuffers.some((buffer) => buffer.bufferId === bufferId)));
  }, [editorBuffers]);
  useEffect(() => {
    if (!cursorSymbol) {
      setCursorSymbolHelp(null);
      return;
    }
    const cacheKey = `${editorPackage.toLowerCase()}::${cursorSymbol.toLowerCase()}`;
    const cached = cursorSymbolHelpCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      setCursorSymbolHelp(cached);
      return;
    }
    let cancelled = false;
    void fetchRuntimeSymbolHelp(cursorSymbol, editorPackage).then((result) => {
      if (cancelled) {
        return;
      }
      cursorSymbolHelpCacheRef.current.set(cacheKey, result);
      setCursorSymbolHelp(result);
    });
    return () => {
      cancelled = true;
    };
  }, [cursorSymbol, editorPackage, fetchRuntimeSymbolHelp]);
  useEffect(() => {
    reportEditorCursorContext?.({
      symbol: cursorSymbol,
      packageName: editorPackage,
      help: cursorSymbolHelp
    });
  }, [cursorSymbol, cursorSymbolHelp, editorPackage, reportEditorCursorContext]);
  const changedForms = useMemo<ChangedEditorForm[]>(() => {
    if (!activeEditorBuffer) {
      return [];
    }
    const baselineForms = extractTopLevelEditorForms(activeEditorBuffer.baselineDraft);
    const currentForms = extractTopLevelEditorForms(activeEditorBuffer.draft);
    const maxLength = Math.max(baselineForms.length, currentForms.length);
    const entries: ChangedEditorForm[] = [];
    for (let index = 0; index < maxLength; index += 1) {
      const baselineForm = baselineForms[index] ?? null;
      const currentForm = currentForms[index] ?? null;
      if (!baselineForm && currentForm) {
        entries.push({
          key: `added:${currentForm.key}`,
          status: "added",
          currentText: currentForm.text,
          baselineText: null,
          startLine: currentForm.startLine,
          symbol: extractEditorDefinitionSymbol(currentForm.text)
        });
        continue;
      }
      if (baselineForm && !currentForm) {
        entries.push({
          key: `removed:${baselineForm.key}`,
          status: "removed",
          currentText: null,
          baselineText: baselineForm.text,
          startLine: baselineForm.startLine,
          symbol: extractEditorDefinitionSymbol(baselineForm.text)
        });
        continue;
      }
      if (
        baselineForm &&
        currentForm &&
        baselineForm.normalizedText !== currentForm.normalizedText
      ) {
        entries.push({
          key: `changed:${currentForm.key}`,
          status: "changed",
          currentText: currentForm.text,
          baselineText: baselineForm.text,
          startLine: currentForm.startLine,
          symbol: extractEditorDefinitionSymbol(currentForm.text)
        });
      }
    }
    return entries;
  }, [activeEditorBuffer]);
  const changedFormCount = changedForms.length;
  const filteredChangedForms = useMemo(() => {
    const normalizedFilter = changedFormFilter.trim().toLowerCase();
    return changedForms.filter((entry) => {
      if (changedFormStatusFilter !== "all" && entry.status !== changedFormStatusFilter) {
        return false;
      }
      if (normalizedFilter.length === 0) {
        return true;
      }
      return [
        entry.symbol,
        entry.status,
        entry.currentText,
        entry.baselineText,
        entry.startLine ? String(entry.startLine) : null
      ]
        .filter((value): value is string => Boolean(value))
        .join("\n")
        .toLowerCase()
        .includes(normalizedFilter);
    });
  }, [changedFormFilter, changedFormStatusFilter, changedForms]);
  function inspectEditorSymbol(symbol: string): void {
    void inspectDefinitionSymbol(symbol, editorPackage, "definitions");
  }

  function findEditorSymbol(symbol: string): void {
    setActiveTab("find-definitions");
    setDefinitionSearch(symbol);
  }

  function sendCurrentFormToListener(): void {
    if (!cursorForm) {
      return;
    }
    setRuntimeForm(cursorForm);
  }

  function openCurrentFormInRepl(): void {
    if (!cursorForm) {
      return;
    }
    void openConversationRepl(cursorForm);
  }

  return (
    <div className="editor-journey">
      <section className="panel runtime-session-panel">
        <div className="browser-action-strip">
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-expanded" label="New Buffer" onClick={createEditorBuffer} />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-standard" label="Load Source File" onClick={openEditorSourceFileDialog} />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-send" label="Save" onClick={() => void saveCurrentEditorBuffer()} />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-standard" label="Save As" onClick={openEditorSourceFileSaveDialog} />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-standard" label="Clone Buffer" onClick={cloneEditorBuffer} />
          <EditorActionButton
            className="starter-chip"
            disabled={isEvaluating || editorDraft.trim().length === 0}
            glyphClassName="desktop-window-action-glyph-send"
            label={isEvaluating ? "Evaluating..." : "Evaluate Buffer"}
            onClick={() => void evaluateEditorBuffer()}
          />
          <EditorActionButton
            className="starter-chip"
            disabled={!currentBufferDirty}
            glyphClassName="desktop-window-action-glyph-send-reverse"
            label="Revert To Baseline"
            onClick={revertCurrentBufferToBaseline}
          />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-send" label="Send To Listener" onClick={() => setRuntimeForm(editorDraft)} />
          <EditorActionButton
            className="starter-chip"
            disabled={editorDraft.trim().length === 0}
            glyphClassName="desktop-window-action-glyph-send"
            label="Open In REPL"
            onClick={() => void openConversationRepl(editorDraft)}
          />
          <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-compact" label="Open Inspector" onClick={() => void openInspectorSurface()} />
          <EditorActionButton
            className="starter-chip"
            disabled={!currentBufferDirty}
            glyphClassName="desktop-window-action-glyph-standard"
            label="Accept Baseline"
            onClick={acceptCurrentBufferBaseline}
          />
        </div>
      </section>

      <section className="panel runtime-eval-panel">
        <div className="editor-tab-strip" aria-label="Editor views" role="tablist">
          {editorTabs.map((tab) => (
            <button
              aria-controls={`editor-tab-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "editor-tab active" : "editor-tab"}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="editor-tab-panel" id={`editor-tab-panel-${activeTab}`} role="tabpanel">
        {activeTab === "text" ? (
          <>
            <div className="editor-context-strip">
              <div className="editor-context-summary">
                <div className="editor-context-buffer-row">
                  <strong>{activeEditorBuffer?.title ?? currentBufferTitle}</strong>
                  <span>{editorPackage}</span>
                  <span>{currentBufferDirty ? "Dirty" : "Clean"}</span>
                </div>
              </div>
              <div className="browser-action-strip">
                <EditorActionButton
                  className="starter-chip"
                  disabled={!cursorSymbol}
                  glyphClassName="desktop-window-action-glyph-compact"
                  label="Inspect Current Symbol"
                  onClick={() => (cursorSymbol ? inspectEditorSymbol(cursorSymbol) : undefined)}
                />
                <EditorActionButton
                  className="starter-chip"
                  disabled={!cursorSymbol}
                  glyphClassName="desktop-window-action-glyph-expanded"
                  label="Find Current Symbol"
                  onClick={() => (cursorSymbol ? findEditorSymbol(cursorSymbol) : undefined)}
                />
                <EditorActionButton
                  className="starter-chip"
                  disabled={!cursorForm}
                  glyphClassName="desktop-window-action-glyph-send"
                  label="Send Current Form"
                  onClick={sendCurrentFormToListener}
                />
                <EditorActionButton
                  className="starter-chip"
                  disabled={!cursorForm}
                  glyphClassName="desktop-window-action-glyph-send"
                  label="Open Current Form In REPL"
                  onClick={openCurrentFormInRepl}
                />
              </div>
            </div>
            <CommonLispEditor
              key={selectedBufferId ?? currentBufferTitle}
              currentPackageName={editorPackage}
              onChange={setEditorDraft}
              onCursorFormChange={setCursorForm}
              onCursorSymbolChange={setCursorSymbol}
              fetchRuntimeSymbolHelp={fetchRuntimeSymbolHelp}
              onFindSymbol={findEditorSymbol}
              onInspectSymbol={inspectEditorSymbol}
              parenDepthColors={parenDepthColors}
              inspectedSymbolHelp={inspectedEditorSymbolHelp}
              sourceCodeTextScalePercent={sourceCodeTextScalePercent}
              symbolCatalog={editorSymbolCatalog}
              value={editorDraft}
            />
          </>
        ) : activeTab === "output" ? (
          <div className="runtime-result-stack">
            <PanelHeader title="Output" subtitle="Retained result" />
            {editorResult ? (
              <>
                <div className="runtime-result-header">
                  <Badge tone={toneForCommandStatus(editorResult.status)}>{editorResult.status}</Badge>
                  <span className="runtime-result-op">{editorResult.operation}</span>
                </div>
                <p className="runtime-result-summary">{editorResult.data.summary}</p>
                {editorResult.data.valuePreview ? <pre className="runtime-preview">{editorResult.data.valuePreview}</pre> : null}
              </>
            ) : (
              <p className="inspector-copy">No retained output.</p>
            )}
          </div>
        ) : activeTab === "buffers" ? (
          <div className="runtime-result-stack">
            <div className="browser-action-strip">
              <EditorActionButton className="action-button" glyphClassName="desktop-window-action-glyph-expanded" label="New Buffer" onClick={createEditorBuffer} />
              <EditorActionButton className="action-button secondary" glyphClassName="desktop-window-action-glyph-standard" label="Clone Current Buffer" onClick={cloneEditorBuffer} />
              <EditorActionButton
                className="action-button secondary"
                disabled={deletableBufferCount === 0}
                glyphClassName="desktop-window-action-glyph-send-reverse"
                label={deletableBufferCount > 0 ? `Delete Selected (${deletableBufferCount})` : "Delete Selected"}
                onClick={() => {
                  deleteEditorBuffers(selectedBufferIds);
                  setSelectedBufferIds([]);
                }}
              />
            </div>
            <div className="editor-filter-row">
              <input
                className="filter-input"
                onChange={(event) => setBufferFilter(event.target.value)}
                placeholder="Filter buffers"
                value={bufferFilter}
              />
            </div>
            {filteredEditorBuffers.length ? (
              <div className="editor-buffer-table-wrap">
                <table className="editor-buffer-table">
                  <thead>
                    <tr>
                      <th aria-label="Select buffer">Select</th>
                      <th>Name</th>
                      <th>Active</th>
                      <th>State</th>
                      <th>Package</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEditorBuffers.map((buffer) => (
                      <tr className={buffer.bufferId === selectedBufferId ? "active" : ""} key={buffer.bufferId}>
                        <td>
                          <input
                            checked={selectedBufferIdSet.has(buffer.bufferId)}
                            onChange={(event) =>
                              setSelectedBufferIds((current) =>
                                event.target.checked
                                  ? [...current, buffer.bufferId]
                                  : current.filter((bufferId) => bufferId !== buffer.bufferId)
                              )
                            }
                            type="checkbox"
                          />
                        </td>
                        <td>
                          <button className="editor-buffer-row-link" onClick={() => setSelectedBufferId(buffer.bufferId)} type="button">
                            {buffer.title}
                          </button>
                        </td>
                        <td>{buffer.bufferId === selectedBufferId ? "Current" : ""}</td>
                        <td>{buffer.dirty ? "Dirty" : "Clean"}</td>
                        <td>{buffer.packageName || runtimeSummary?.currentPackage || "cl-user"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="inspector-copy">No buffers match the current filter.</p>
            )}
          </div>
        ) : activeTab === "definitions" ? (
          <div className="runtime-result-stack">
            <div className="browser-action-strip">
              <EditorActionButton
                className="action-button"
                disabled={!runtimeInspection?.data.symbol}
                glyphClassName="desktop-window-action-glyph-standard"
                label="Refresh Definition"
                onClick={() =>
                  void inspectDefinitionSymbol(
                    runtimeInspection?.data.symbol ?? "",
                    runtimeInspection?.data.packageName ?? editorPackage,
                    "definitions"
                  )
                }
              />
              <EditorActionButton
                className="action-button secondary"
                disabled={!currentDefinitionSource?.path}
                glyphClassName="desktop-window-action-glyph-expanded"
                label="Open Source"
                onClick={() => void openSourcePreview(currentDefinitionSource?.path ?? "", currentDefinitionSource?.line ?? undefined)}
              />
            </div>
            <div className="editor-filter-row">
              <input
                className="filter-input"
                onChange={(event) => setDefinitionFilter(event.target.value)}
                placeholder="Filter related items"
                value={definitionFilter}
              />
            </div>
            <div className="configuration-inspector-stack">
              {currentDefinitionSummary ? <p className="inspector-copy">{currentDefinitionSummary}</p> : null}
              {runtimeEntityDetail?.data.facets?.length ? (
                <dl className="detail-list">
                  {runtimeEntityDetail.data.facets.slice(0, 6).map((facet) => (
                    <div key={facet.label}>
                      <dt>{facet.label}</dt>
                      <dd>{facet.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {filteredDefinitionRelatedItems.length ? (
                <div className="editor-buffer-list">
                  {filteredDefinitionRelatedItems.slice(0, 8).map((item, index) => (
                    <button
                      className="editor-buffer-card"
                      key={`${item.label}:${item.detail}:${index}`}
                      onClick={() => {
                        if (item.path) {
                          void openSourcePreview(item.path, item.line ?? undefined);
                        }
                      }}
                      type="button"
                    >
                      <div className="editor-buffer-card-header">
                        <strong>{item.label}</strong>
                        <Badge tone="active">{item.emphasis ?? "related"}</Badge>
                      </div>
                      <p className="inspector-copy">{item.detail}</p>
                      {item.path ? (
                        <p className="editor-buffer-meta">
                          {item.path}
                          {item.line ? `:${item.line}` : ""}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : runtimeEntityDetail?.data.relatedItems?.length ? <p className="inspector-copy">No related items match the current filter.</p> : null}
            </div>
          </div>
        ) : activeTab === "find-definitions" ? (
          <div className="runtime-result-stack">
            <PanelHeader title="Find Definitions" subtitle="Package symbol index" />
            <div className="editor-filter-grid">
              <label className="filter-select">
                <span className="context-label">Name</span>
                <input className="filter-input" onChange={(event) => setDefinitionSearch(event.target.value)} value={definitionSearch} />
              </label>
              <label className="filter-select">
                <span className="context-label">Kind</span>
                <select className="filter-input" onChange={(event) => setDefinitionKindFilter(event.target.value)} value={definitionKindFilter}>
                  <option value="all">All</option>
                  <option value="function">Function</option>
                  <option value="variable">Variable</option>
                  <option value="macro">Macro</option>
                  <option value="class">Class</option>
                  <option value="generic-function">Generic Function</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
              <label className="filter-select">
                <span className="context-label">Visibility</span>
                <select className="filter-input" onChange={(event) => setDefinitionVisibilityFilter(event.target.value)} value={definitionVisibilityFilter}>
                  <option value="all">All</option>
                  <option value="external">External</option>
                  <option value="internal">Internal</option>
                </select>
              </label>
              <EditorActionButton
                className="action-button secondary"
                glyphClassName="desktop-window-action-glyph-send-reverse"
                label="Clear"
                onClick={() => {
                  setDefinitionSearch("");
                  setDefinitionKindFilter("all");
                  setDefinitionVisibilityFilter("all");
                }}
              />
            </div>
            <div className="editor-buffer-list">
              {definitionRows.length ? (
                definitionRows.map((entry) => (
                  <button
                    className="editor-buffer-card"
                    key={`${entry.visibility}:${entry.kind}:${entry.symbol}`}
                    onClick={() =>
                      void inspectDefinitionSymbol(
                        entry.symbol,
                        packageBrowser?.data.packageName ?? editorPackage,
                        entry.kind === "variable"
                          ? "describe"
                          : entry.kind === "generic-function"
                            ? "methods"
                            : "definitions"
                      )
                    }
                    type="button"
                  >
                    <div className="editor-buffer-card-header">
                      <strong>{entry.symbol}</strong>
                      <Badge tone={entry.visibility === "external" ? "active" : "steady"}>{entry.visibility}</Badge>
                    </div>
                    <p className="inspector-copy">{entry.kind}</p>
                  </button>
                ))
              ) : (
                <p className="inspector-copy">No definitions match the current search in the active package index.</p>
              )}
            </div>
          </div>
        ) : activeTab === "changed-forms" ? (
          <div className="runtime-result-stack">
            <div className="browser-action-strip">
              <EditorActionButton
                className="action-button"
                disabled={changedFormCount === 0}
                glyphClassName="desktop-window-action-glyph-standard"
                label="Accept Buffer Baseline"
                onClick={acceptCurrentBufferBaseline}
              />
              <EditorActionButton
                className="action-button secondary"
                disabled={!currentBufferDirty}
                glyphClassName="desktop-window-action-glyph-send-reverse"
                label="Revert Buffer"
                onClick={revertCurrentBufferToBaseline}
              />
            </div>
            <div className="editor-filter-grid">
              <input
                className="filter-input"
                onChange={(event) => setChangedFormFilter(event.target.value)}
                placeholder="Filter forms"
                value={changedFormFilter}
              />
              <label className="filter-select">
                <span className="context-label">Status</span>
                <select className="filter-input" onChange={(event) => setChangedFormStatusFilter(event.target.value)} value={changedFormStatusFilter}>
                  <option value="all">All</option>
                  <option value="changed">Changed</option>
                  <option value="added">Added</option>
                  <option value="removed">Removed</option>
                </select>
              </label>
            </div>
            <div className="editor-buffer-list">
              {filteredChangedForms.length ? (
                filteredChangedForms.map((entry) => (
                  <div className="editor-buffer-card" key={entry.key}>
                    <div className="editor-buffer-card-header">
                      <strong>{entry.symbol ?? "Top-level form"}</strong>
                      <Badge tone={entry.status === "removed" ? "danger" : entry.status === "added" ? "active" : "warning"}>
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="editor-buffer-meta">{entry.startLine ? `Line ${entry.startLine}` : "No line"}</p>
                    {entry.currentText ? <pre className="runtime-history-form">{entry.currentText}</pre> : null}
                    {!entry.currentText && entry.baselineText ? <pre className="runtime-history-form">{entry.baselineText}</pre> : null}
                    <div className="browser-action-strip">
                      {entry.currentText ? (
                        <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-send" label="Send To Listener" onClick={() => setRuntimeForm(entry.currentText ?? "")} />
                      ) : null}
                      {entry.currentText ? (
                        <EditorActionButton className="starter-chip" glyphClassName="desktop-window-action-glyph-send" label="Open In REPL" onClick={() => void openConversationRepl(entry.currentText ?? "")} />
                      ) : null}
                      {entry.currentText ? (
                        <EditorActionButton
                          className="starter-chip"
                          disabled={!entry.symbol}
                          glyphClassName="desktop-window-action-glyph-compact"
                          label="Inspect Symbol"
                          onClick={() =>
                            void inspectDefinitionSymbol(
                              entry.symbol ?? "",
                              editorPackage,
                              entry.symbol ? "definitions" : undefined
                            )
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                ))
              ) : changedForms.length ? (
                <p className="inspector-copy">No changed forms match the current filter.</p>
              ) : (
                <p className="inspector-copy">No changed forms.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="runtime-result-stack">
            <PanelHeader
              title={editorTabs.find((tab) => tab.id === activeTab)?.label ?? "Editor Tab"}
              subtitle="Reserved"
            />
            <p className="inspector-copy">Reserved.</p>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
