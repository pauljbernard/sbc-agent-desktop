import "@testing-library/jest-dom/vitest";

import { useEffect } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  EditorBufferStateDto,
  PackageBrowserDto,
  QueryResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto
} from "../../src/shared/contracts";

vi.mock("../../src/renderer/src/common-lisp-editor", () => ({
  CommonLispEditor: ({
    onCursorFormChange,
    onCursorSymbolChange,
    onFindSymbol,
    onInspectSymbol,
    value
  }: {
    onCursorFormChange?: (form: string | null) => void;
    onCursorSymbolChange?: (symbol: string | null) => void;
    onFindSymbol?: (symbol: string) => void;
    onInspectSymbol?: (symbol: string) => void;
    value: string;
    }) => {
      useEffect(() => {
        onCursorSymbolChange?.("in-package");
        onCursorFormChange?.("(+ 1 2)");
      }, [onCursorFormChange, onCursorSymbolChange]);

      return (
        <div data-testid="mock-common-lisp-editor">
        <button onClick={() => onInspectSymbol?.("in-package")} type="button">
          Mock Inspect Current Symbol
        </button>
        <button onClick={() => onFindSymbol?.("in-package")} type="button">
          Mock Find Current Symbol
        </button>
        <pre>{value}</pre>
      </div>
    );
  }
}));

import { EditorSurface } from "../../src/renderer/src/editor-surface";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.assign(globalThis, { ResizeObserver: ResizeObserverMock });
}

function queryResult<T>(data: T, operation: string): QueryResultDto<T> {
  return {
    contractVersion: 1,
    domain: "test",
    operation,
    kind: "query",
    status: "ok",
    data,
    metadata: {
      authority: "environment",
      binding: null
    }
  };
}

function makeEditorProps() {
  const buffers: EditorBufferStateDto[] = [
    {
      bufferId: "buffer-1",
      title: "Main",
      draft: "(in-package :cl-user)\n(+ 1 2)",
      baselineDraft: "(in-package :cl-user)\n(+ 1 2)",
      packageName: "CL-USER",
      dirty: false,
      result: null,
      sourceFilePath: null
    }
  ];
  const packageBrowser = queryResult<PackageBrowserDto>(
    {
      packageName: "CL-USER",
      nicknames: ["COMMON-LISP-USER"],
      useList: ["COMMON-LISP"],
      externalSymbols: [{ symbol: "in-package", kind: "macro", visibility: "external" }],
      internalSymbols: []
    },
    "package-browser"
  );
  const runtimeSummary: RuntimeSummaryDto = {
    runtimeId: "runtime-1",
    imageName: "image",
    currentPackage: "CL-USER",
    loadedSystems: [],
    activeThreads: 1,
    lastEvaluationSummary: "Retained",
    summary: "Runtime ready."
  };
  const fetchRuntimeSymbolHelp = vi.fn().mockResolvedValue({
    detail: "macro • CL-USER",
    info: "Sets the current package for subsequent reader resolution and evaluation.",
    signature: "(in-package package-designator)",
    type: "keyword",
    packageName: "CL-USER"
  });

  return {
    acceptCurrentBufferBaseline: vi.fn(),
    cloneEditorBuffer: vi.fn(),
    createEditorBuffer: vi.fn(),
    currentBufferDirty: false,
    currentBufferTitle: "Main",
    deleteEditorBuffers: vi.fn(),
    editorBuffers: buffers,
    editorPackage: "CL-USER",
    editorDraft: buffers[0]?.draft ?? "",
    setEditorDraft: vi.fn(),
    editorResult: null,
    packageBrowser,
    runtimeEntityDetail: null as QueryResultDto<RuntimeEntityDetailDto> | null,
    runtimeInspection: null as QueryResultDto<RuntimeInspectionResultDto> | null,
    selectedBufferId: "buffer-1",
    setSelectedBufferId: vi.fn(),
    sourcePreview: null,
    runtimeSummary,
    isEvaluating: false,
    parenDepthColors: ["#6ec0c2", "#72b8f2"],
    sourceCodeTextScalePercent: 100,
    inspectDefinitionSymbol: vi.fn().mockResolvedValue(undefined),
    fetchRuntimeSymbolHelp,
    evaluateEditorBuffer: vi.fn().mockResolvedValue(undefined),
    openEditorSourceFileDialog: vi.fn(),
    openEditorSourceFileSaveDialog: vi.fn(),
    saveCurrentEditorBuffer: vi.fn().mockResolvedValue(undefined),
    revertCurrentBufferToBaseline: vi.fn(),
    openSourcePreview: vi.fn().mockResolvedValue(undefined),
    openConversationRepl: vi.fn().mockResolvedValue(undefined),
    setRuntimeForm: vi.fn(),
    openInspectorSurface: vi.fn().mockResolvedValue(undefined)
  };
}

describe("editor surface component", () => {
  it("surfaces current symbol context and routes into definition search", async () => {
    const props = makeEditorProps();
    const { container } = render(<EditorSurface {...props} />);
    const contextStrip = container.querySelector(".editor-context-strip");
    expect(contextStrip).not.toBeNull();
    const contextQueries = within(contextStrip!);

    await waitFor(() => {
      expect(contextQueries.getByText("Main")).toBeInTheDocument();
      expect(contextQueries.getByText("CL-USER")).toBeInTheDocument();
      expect(contextQueries.getByText("Clean")).toBeInTheDocument();
      expect(contextQueries.getByRole("button", { name: "Find Current Symbol" })).toBeEnabled();
    });

    fireEvent.click(contextQueries.getByRole("button", { name: "Find Current Symbol" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Find Definitions" })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByDisplayValue("in-package")).toBeInTheDocument();
    expect(props.fetchRuntimeSymbolHelp).toHaveBeenCalledWith("in-package", "CL-USER");
  });

  it("routes current symbol inspection through the editor surface action", async () => {
    const props = makeEditorProps();
    const { container } = render(<EditorSurface {...props} />);
    const contextStrip = container.querySelector(".editor-context-strip");
    expect(contextStrip).not.toBeNull();
    const contextQueries = within(contextStrip!);

    await waitFor(() => {
      expect(contextQueries.getByRole("button", { name: "Inspect Current Symbol" })).toBeEnabled();
    });

    fireEvent.click(contextQueries.getAllByRole("button", { name: "Inspect Current Symbol" })[0]!);

    await waitFor(() => {
      expect(props.inspectDefinitionSymbol).toHaveBeenCalledWith("in-package", "CL-USER", "definitions");
    });
  });

  it("routes the current enclosing form into the listener and repl actions", async () => {
    const props = makeEditorProps();
    const { container } = render(<EditorSurface {...props} />);

    const contextStrip = container.querySelector(".editor-context-strip");
    expect(contextStrip).not.toBeNull();

    const contextQueries = within(contextStrip!);
    const sendCurrentForm = contextQueries.getByRole("button", { name: "Send Current Form" });
    const openCurrentFormInRepl = contextQueries.getByRole("button", { name: "Open Current Form In REPL" });

    await waitFor(() => {
      expect(sendCurrentForm).toBeEnabled();
      expect(openCurrentFormInRepl).toBeEnabled();
    });

    fireEvent.click(sendCurrentForm);
    expect(props.setRuntimeForm).toHaveBeenCalledWith("(+ 1 2)");

    fireEvent.click(openCurrentFormInRepl);
    await waitFor(() => {
      expect(props.openConversationRepl).toHaveBeenCalledWith("(+ 1 2)");
    });
  });
});
