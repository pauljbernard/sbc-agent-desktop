import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
import { autocompletion, closeBrackets, closeBracketsKeymap, type Completion, type CompletionContext } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, HighlightStyle, indentOnInput, indentUnit, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { commonLisp } from "@codemirror/legacy-modes/mode/commonlisp";
import { Compartment, EditorSelection, EditorState, type Extension, type Range } from "@codemirror/state";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Decoration, drawSelection, EditorView, hoverTooltip, keymap, type DecorationSet, type ViewUpdate, ViewPlugin } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

export interface CommonLispSymbolHelp {
  detail: string;
  info: string;
  type?: string;
  packageName?: string;
  signature?: string | null;
}

const COMMON_LISP_SYMBOL_HELP: Record<string, CommonLispSymbolHelp> = {
  "defclass": {
    detail: "Macro",
    info: "Defines a class and its slots.",
    type: "class"
  },
  "dolist": {
    detail: "Macro",
    info: "Iterates over each element of a list with a binding spec and evaluates the body.",
    type: "keyword"
  },
  "dotimes": {
    detail: "Macro",
    info: "Iterates a fixed number of times with an index binding spec and evaluates the body.",
    type: "keyword"
  },
  "cond": {
    detail: "Macro",
    info: "Evaluates clauses in order and returns the first matching clause result.",
    type: "keyword"
  },
  "case": {
    detail: "Macro",
    info: "Dispatches on a key and evaluates the first matching clause.",
    type: "keyword"
  },
  "ccase": {
    detail: "Macro",
    info: "Dispatches on a place and requires one clause to match, offering restart-driven correction on failure.",
    type: "keyword"
  },
  "defconstant": {
    detail: "Macro",
    info: "Defines a named constant value.",
    type: "constant"
  },
  "defmacro": {
    detail: "Macro",
    info: "Defines a macro that expands source into new forms.",
    type: "keyword"
  },
  "defmethod": {
    detail: "Macro",
    info: "Defines a method specialization for a generic function.",
    type: "function"
  },
  "defparameter": {
    detail: "Macro",
    info: "Defines and initializes a special variable.",
    type: "variable"
  },
  "defun": {
    detail: "Macro",
    info: "Defines a global function.",
    type: "function"
  },
  "ecase": {
    detail: "Macro",
    info: "Dispatches on a key and requires one clause to match.",
    type: "keyword"
  },
  "defvar": {
    detail: "Macro",
    info: "Defines a special variable without forcing reassignment when already bound.",
    type: "variable"
  },
  "format": {
    detail: "Function",
    info: "Formats output to a stream or string destination.",
    type: "function"
  },
  "handler-bind": {
    detail: "Macro",
    info: "Establishes condition-handler bindings while evaluating the body.",
    type: "keyword"
  },
  "handler-case": {
    detail: "Macro",
    info: "Evaluates a form and dispatches matching condition clauses when an error is signaled.",
    type: "keyword"
  },
  "etypecase": {
    detail: "Macro",
    info: "Dispatches on the dynamic type of a value and requires one clause to match.",
    type: "keyword"
  },
  "if": {
    detail: "Special operator",
    info: "Evaluates the then form when the test is true, otherwise the else form.",
    type: "keyword"
  },
  "in-package": {
    detail: "Macro",
    info: "Sets the current package for subsequent reader resolution and evaluation.",
    type: "namespace"
  },
  "lambda": {
    detail: "Special operator",
    info: "Creates an anonymous function.",
    type: "function"
  },
  "let": {
    detail: "Special operator",
    info: "Introduces local lexical bindings.",
    type: "keyword"
  },
  "let*": {
    detail: "Special operator",
    info: "Introduces sequential local lexical bindings.",
    type: "keyword"
  },
  "loop": {
    detail: "Macro",
    info: "Provides the LOOP iteration DSL.",
    type: "keyword"
  },
  "multiple-value-bind": {
    detail: "Macro",
    info: "Binds multiple values returned by a form to a lambda list and evaluates the body.",
    type: "keyword"
  },
  "progn": {
    detail: "Special operator",
    info: "Evaluates forms in order and returns the final value.",
    type: "keyword"
  },
  "restart-case": {
    detail: "Macro",
    info: "Evaluates a form and establishes named restart clauses for recovery paths.",
    type: "keyword"
  },
  "destructuring-bind": {
    detail: "Macro",
    info: "Destructures a tree against a lambda list and evaluates the body.",
    type: "keyword"
  },
  "setf": {
    detail: "Macro",
    info: "Assigns a new value through a generalized place.",
    type: "keyword"
  },
  "typecase": {
    detail: "Macro",
    info: "Dispatches on the dynamic type of a value and evaluates the first matching clause.",
    type: "keyword"
  },
  "ctypecase": {
    detail: "Macro",
    info: "Dispatches on a place by dynamic type and requires one clause to match, offering restart-driven correction on failure.",
    type: "keyword"
  },
  "unless": {
    detail: "Macro",
    info: "Evaluates the body only when the test is false.",
    type: "keyword"
  },
  "with-input-from-string": {
    detail: "Macro",
    info: "Binds a stream variable to characters from a string and evaluates the body.",
    type: "keyword"
  },
  "with-open-file": {
    detail: "Macro",
    info: "Binds a stream variable to an opened file stream and evaluates the body.",
    type: "keyword"
  },
  "with-open-stream": {
    detail: "Macro",
    info: "Binds a stream variable to an existing stream and evaluates the body.",
    type: "keyword"
  },
  "with-output-to-string": {
    detail: "Macro",
    info: "Binds a stream variable that accumulates output into a string and evaluates the body.",
    type: "keyword"
  },
  "when": {
    detail: "Macro",
    info: "Evaluates the body only when the test is true.",
    type: "keyword"
  }
};

const commonLispHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#7f9c72" },
  { tag: t.string, color: "#d9b66f" },
  { tag: [t.keyword, t.definitionKeyword, t.controlKeyword, t.operatorKeyword], color: "#72b8f2" },
  { tag: [t.number, t.integer, t.float], color: "#ee9d76" },
  { tag: [t.bool, t.null], color: "#8dc7ff" },
  { tag: t.variableName, color: "var(--text-primary)" },
  { tag: t.special(t.variableName), color: "#cfa8ff" },
  { tag: [t.typeName, t.className], color: "#df8ac8" }
]);

const LISP_BODY_INDENT_HEADS = new Set([
  "defun",
  "defmacro",
  "defmethod",
  "defclass",
  "defgeneric",
  "lambda",
  "let",
  "let*",
  "flet",
  "labels",
  "macrolet",
  "dolist",
  "dotimes",
  "if",
  "when",
  "unless",
  "progn",
  "setf",
  "loop",
  "in-package",
  "handler-bind",
  "with-open-file",
  "with-open-stream",
  "with-input-from-string",
  "with-output-to-string"
]);

const LAMBDA_LIST_PARENT_HEADS = new Set([
  "defun",
  "defmacro",
  "defmethod",
  "defgeneric",
  "lambda"
]);

const BINDING_LIST_PARENT_HEADS = new Set([
  "let",
  "let*",
  "flet",
  "labels",
  "macrolet",
  "multiple-value-bind",
  "destructuring-bind",
  "with-slots",
  "with-accessors",
  "dolist",
  "dotimes",
  "handler-bind",
  "with-open-file",
  "with-open-stream",
  "with-input-from-string",
  "with-output-to-string"
]);

const LOCAL_DEFINITION_PARENT_HEADS = new Set([
  "flet",
  "labels",
  "macrolet"
]);

const CLAUSE_ALIGNMENT_HEADS = new Set([
  "loop",
  "cond",
  "case",
  "ccase",
  "ecase",
  "handler-case",
  "restart-case",
  "typecase",
  "etypecase",
  "ctypecase"
]);

function buildCommonLispTheme(): Extension {
  return EditorView.theme({
    "&": {
      height: "100%",
      backgroundColor: "transparent",
      color: "var(--text-primary)"
    },
    ".cm-editor": {
      height: "100%"
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "\"SF Mono\", \"IBM Plex Mono\", \"JetBrains Mono\", monospace",
      fontSize: "calc(0.88rem * var(--editor-source-code-scale, 1))",
      lineHeight: "1.45"
    },
    ".cm-content, .cm-line": {
      caretColor: "var(--text-primary)"
    },
    ".cm-content, .cm-gutter": {
      minHeight: "100%"
    },
    ".cm-content": {
      padding: "12px"
    },
    ".cm-lineWrapping": {
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      wordBreak: "normal"
    },
    ".cm-focused": {
      outline: "none"
    },
    ".cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(86, 163, 255, 0.28) !important"
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.035)"
    },
    ".cm-tooltip": {
      border: "1px solid var(--border-strong)",
      borderRadius: "10px",
      backgroundColor: "var(--panel-strong)",
      color: "var(--text-primary)",
      boxShadow: "0 14px 36px rgba(0, 0, 0, 0.28)"
    },
    ".cm-tooltip > div": {
      padding: "10px 12px"
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(244, 178, 103, 0.18)",
      boxShadow: "inset 0 0 0 1px rgba(244, 178, 103, 0.32)",
      color: "inherit",
      borderRadius: "4px"
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(86, 163, 255, 0.14)"
    },
    ".cm-cursorSymbolMatch": {
      backgroundColor: "rgba(78, 226, 209, 0.12)",
      borderRadius: "4px"
    },
    ".cm-cursorSymbolPrimary": {
      backgroundColor: "rgba(78, 226, 209, 0.22)",
      boxShadow: "inset 0 0 0 1px rgba(78, 226, 209, 0.24)",
      borderRadius: "4px"
    }
  });
}

function isSymbolCharacter(character: string | undefined): boolean {
  return Boolean(character && /[A-Za-z0-9*+\-/<>=!?$%_:&.]/.test(character));
}

function lineStartAt(source: string, position: number): number {
  return source.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
}

function columnAt(source: string, position: number): number {
  return position - lineStartAt(source, position);
}

function firstNonWhitespaceColumn(text: string): number {
  const match = text.match(/\S/);
  return match ? match.index ?? 0 : 0;
}

function readHeadSymbol(source: string, openParenIndex: number): string | null {
  let index = openParenIndex + 1;
  let inComment = false;
  while (index < source.length) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      index += 1;
      continue;
    }
    if (character === ";") {
      inComment = true;
      index += 1;
      continue;
    }
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    break;
  }
  const start = index;
  while (index < source.length && isSymbolCharacter(source[index])) {
    index += 1;
  }
  return index > start ? source.slice(start, index).toLowerCase() : null;
}

function findUnmatchedOpenParens(source: string, position: number): number[] {
  const stack: number[] = [];
  let inString = false;
  let escapingString = false;
  let inComment = false;
  for (let index = 0; index < Math.min(position, source.length); index += 1) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === ";") {
      inComment = true;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "(") {
      stack.push(index);
      continue;
    }
    if (character === ")" && stack.length) {
      stack.pop();
    }
  }
  return stack;
}

function topLevelElementIndexInList(source: string, listOpenParenIndex: number, targetIndex: number): number | null {
  let index = listOpenParenIndex + 1;
  let depth = 0;
  let inString = false;
  let escapingString = false;
  let inComment = false;
  let elementIndex = -1;
  let inAtom = false;

  while (index < targetIndex && index < source.length) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      index += 1;
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      index += 1;
      continue;
    }
    if (character === ";") {
      inComment = true;
      inAtom = false;
      index += 1;
      continue;
    }
    if (character === "\"") {
      if (depth === 0 && !inAtom) {
        elementIndex += 1;
        inAtom = true;
      }
      inString = true;
      index += 1;
      continue;
    }
    if (character === "(") {
      if (depth === 0) {
        elementIndex += 1;
        if (index === targetIndex) {
          return elementIndex;
        }
      }
      depth += 1;
      inAtom = false;
      index += 1;
      continue;
    }
    if (character === ")") {
      depth = Math.max(0, depth - 1);
      inAtom = false;
      index += 1;
      continue;
    }
    if (depth === 0) {
      if (/\s/.test(character)) {
        inAtom = false;
      } else if (!inAtom) {
        elementIndex += 1;
        inAtom = true;
      }
    }
    index += 1;
  }

  return targetIndex < source.length && source[targetIndex] === "(" ? elementIndex + 1 : null;
}

function countTopLevelElementsInList(source: string, listOpenParenIndex: number, position: number): number {
  let index = listOpenParenIndex + 1;
  let depth = 0;
  let inString = false;
  let escapingString = false;
  let inComment = false;
  let count = 0;
  let inAtom = false;

  while (index < position && index < source.length) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      index += 1;
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      index += 1;
      continue;
    }
    if (character === ";") {
      inComment = true;
      inAtom = false;
      index += 1;
      continue;
    }
    if (character === "\"") {
      if (depth === 0 && !inAtom) {
        count += 1;
        inAtom = true;
      }
      inString = true;
      index += 1;
      continue;
    }
    if (character === "(") {
      if (depth === 0) {
        count += 1;
      }
      depth += 1;
      inAtom = false;
      index += 1;
      continue;
    }
    if (character === ")") {
      depth = Math.max(0, depth - 1);
      inAtom = false;
      index += 1;
      continue;
    }
    if (depth === 0) {
      if (/\s/.test(character)) {
        inAtom = false;
      } else if (!inAtom) {
        count += 1;
        inAtom = true;
      }
    }
    index += 1;
  }

  return count;
}

function isLambdaOrBindingListContext(
  source: string,
  openParenIndex: number,
  parentOpenParenIndex: number
): boolean {
  const parentHead = readHeadSymbol(source, parentOpenParenIndex);
  if (!parentHead) {
    return false;
  }
  const elementIndex = topLevelElementIndexInList(source, parentOpenParenIndex, openParenIndex);
  if (elementIndex == null) {
    return false;
  }
  if (LAMBDA_LIST_PARENT_HEADS.has(parentHead)) {
    return (parentHead === "lambda" && elementIndex === 1) || (parentHead !== "lambda" && elementIndex === 2);
  }
  if (BINDING_LIST_PARENT_HEADS.has(parentHead)) {
    return elementIndex === 1;
  }
  return false;
}

function isTopLevelElementOfDesignatedList(
  source: string,
  elementOpenParenIndex: number,
  listOpenParenIndex: number,
  ancestorOpenParenIndex: number
): boolean {
  if (!isLambdaOrBindingListContext(source, listOpenParenIndex, ancestorOpenParenIndex)) {
    return false;
  }
  return topLevelElementIndexInList(source, listOpenParenIndex, elementOpenParenIndex) != null;
}

function symbolRangeAt(state: EditorState, position: number): { from: number; to: number; symbol: string } | null {
  const { doc } = state;
  let from = position;
  let to = position;
  while (from > 0 && isSymbolCharacter(doc.sliceString(from - 1, from))) {
    from -= 1;
  }
  while (to < doc.length && isSymbolCharacter(doc.sliceString(to, to + 1))) {
    to += 1;
  }
  if (from === to) {
    return null;
  }
  return {
    from,
    to,
    symbol: doc.sliceString(from, to)
  };
}

function buildCommonLispCompletionSource(completions: Completion[]) {
  return (context: CompletionContext) => {
    const range = symbolRangeAt(context.state, context.pos);
    if (!range) {
      return context.explicit ? { from: context.pos, options: completions } : null;
    }
    const lower = range.symbol.toLowerCase();
    const options = completions.filter((completion) => completion.label.startsWith(lower));
    if (!options.length && !context.explicit) {
      return null;
    }
    return {
      from: range.from,
      to: range.to,
      options: options.length ? options : completions
    };
  };
}

function buildDynamicCommonLispCompletionSource(completionsRef: { current: Completion[] }) {
  return (context: CompletionContext) => buildCommonLispCompletionSource(completionsRef.current)(context);
}

function buildHoverDom(symbol: string, help: CommonLispSymbolHelp): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "common-lisp-editor-tooltip";
  const title = document.createElement("strong");
  title.textContent = symbol;
  const detail = document.createElement("div");
  detail.textContent = help.packageName ? `${help.detail} • ${help.packageName}` : help.detail;
  detail.style.opacity = "0.76";
  const info = document.createElement("p");
  info.textContent = help.info;
  info.style.margin = "6px 0 0";
  info.style.maxWidth = "32ch";
  wrapper.append(title, detail, info);
  return wrapper;
}

function buildCommonLispHover(
  symbolHelp: Record<string, CommonLispSymbolHelp>,
  fetchRuntimeSymbolHelp?: (symbol: string, packageName: string) => Promise<CommonLispSymbolHelp | null>,
  currentPackageName?: string
) {
  const cache = new Map<string, CommonLispSymbolHelp | null>();
  return hoverTooltip((view, position) => {
    const range = symbolRangeAt(view.state, position);
    if (!range) {
      return null;
    }
    const normalizedSymbol = range.symbol.toLowerCase();
    const cacheKey = `${(currentPackageName ?? "").toLowerCase()}::${normalizedSymbol}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        pos: range.from,
        end: range.to,
        create: () => ({ dom: buildHoverDom(range.symbol, cached) })
      };
    }
    const localHelp = symbolHelp[normalizedSymbol];
    if (!fetchRuntimeSymbolHelp) {
      if (!localHelp) {
        return null;
      }
      return {
        pos: range.from,
        end: range.to,
        create: () => ({ dom: buildHoverDom(range.symbol, localHelp) })
      };
    }
    return Promise.resolve(fetchRuntimeSymbolHelp(range.symbol, currentPackageName ?? ""))
      .then((runtimeHelp) => {
        const resolvedHelp = runtimeHelp ?? localHelp ?? null;
        cache.set(cacheKey, resolvedHelp);
        if (!resolvedHelp) {
          return null;
        }
        return {
          pos: range.from,
          end: range.to,
          create: () => ({ dom: buildHoverDom(range.symbol, resolvedHelp) })
        };
      })
      .catch(() => {
        if (!localHelp) {
          cache.set(cacheKey, null);
          return null;
        }
        cache.set(cacheKey, localHelp);
        return {
          pos: range.from,
          end: range.to,
          create: () => ({ dom: buildHoverDom(range.symbol, localHelp) })
        };
      });
  });
}

function buildDynamicCommonLispHover(
  symbolHelpRef: { current: Record<string, CommonLispSymbolHelp> },
  fetchRuntimeSymbolHelpRef: { current?: (symbol: string, packageName: string) => Promise<CommonLispSymbolHelp | null> },
  currentPackageNameRef: { current: string }
) {
  const cache = new Map<string, CommonLispSymbolHelp | null>();
  return hoverTooltip((view, position) => {
    const range = symbolRangeAt(view.state, position);
    if (!range) {
      return null;
    }
    const normalizedSymbol = range.symbol.toLowerCase();
    const currentPackageName = currentPackageNameRef.current;
    const cacheKey = `${currentPackageName.toLowerCase()}::${normalizedSymbol}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        pos: range.from,
        end: range.to,
        create: () => ({ dom: buildHoverDom(range.symbol, cached) })
      };
    }
    const localHelp = symbolHelpRef.current[normalizedSymbol];
    const fetchRuntimeSymbolHelp = fetchRuntimeSymbolHelpRef.current;
    if (!fetchRuntimeSymbolHelp) {
      if (!localHelp) {
        return null;
      }
      return {
        pos: range.from,
        end: range.to,
        create: () => ({ dom: buildHoverDom(range.symbol, localHelp) })
      };
    }
    return Promise.resolve(fetchRuntimeSymbolHelp(range.symbol, currentPackageName))
      .then((runtimeHelp) => {
        const resolvedHelp = runtimeHelp ?? localHelp ?? null;
        cache.set(cacheKey, resolvedHelp);
        if (!resolvedHelp) {
          return null;
        }
        return {
          pos: range.from,
          end: range.to,
          create: () => ({ dom: buildHoverDom(range.symbol, resolvedHelp) })
        };
      })
      .catch(() => {
        if (!localHelp) {
          cache.set(cacheKey, null);
          return null;
        }
        cache.set(cacheKey, localHelp);
        return {
          pos: range.from,
          end: range.to,
          create: () => ({ dom: buildHoverDom(range.symbol, localHelp) })
        };
      });
  });
}

function buildRainbowParensExtension(parenDepthColors: string[]): Extension {
  const colors = parenDepthColors.length ? parenDepthColors : ["#6ec0c2"];
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, colors);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view, colors);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations
    }
  );
}

function buildCursorSymbolHighlightExtension(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildCursorSymbolDecorations(view);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildCursorSymbolDecorations(update.view);
        }
      }
    },
    {
      decorations: (instance) => instance.decorations
    }
  );
}

function buildCursorSymbolDecorations(view: EditorView): DecorationSet {
  const selection = view.state.selection.main;
  if (!selection.empty) {
    return Decoration.none;
  }
  const current = symbolRangeAt(view.state, selection.head);
  if (!current) {
    return Decoration.none;
  }
  const ranges = findSymbolOccurrences(view.state.doc.toString(), current.symbol).map(({ from, to }) =>
    Decoration.mark({
      class: from === current.from && to === current.to ? "cm-cursorSymbolPrimary" : "cm-cursorSymbolMatch"
    }).range(from, to)
  );
  return Decoration.set(ranges, true);
}

export function findSymbolOccurrences(source: string, symbol: string): Array<{ from: number; to: number }> {
  if (!symbol.length) {
    return [];
  }
  const lowerSource = source.toLowerCase();
  const target = symbol.toLowerCase();
  const ranges: Array<{ from: number; to: number }> = [];
  let index = 0;
  while (index < source.length) {
    const lowerIndex = lowerSource.indexOf(target, index);
    if (lowerIndex < 0) {
      break;
    }
    const before = source[lowerIndex - 1];
    const after = source[lowerIndex + symbol.length];
    if (!isSymbolCharacter(before) && !isSymbolCharacter(after)) {
      ranges.push({ from: lowerIndex, to: lowerIndex + symbol.length });
    }
    index = lowerIndex + symbol.length;
  }
  return ranges;
}

export function findEnclosingSExpression(source: string, position: number): { from: number; to: number } | null {
  const normalizedPosition = Math.max(0, Math.min(position, source.length));
  const stack: number[] = [];
  let inString = false;
  let escapingString = false;
  let inComment = false;
  let candidate: { from: number; to: number } | null = null;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === ";") {
      inComment = true;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "(") {
      stack.push(index);
      continue;
    }
    if (character === ")" && stack.length) {
      const from = stack.pop() ?? 0;
      const to = index + 1;
      if (from <= normalizedPosition && normalizedPosition <= to) {
        if (!candidate || from >= candidate.from) {
          candidate = { from, to };
        }
      }
    }
  }

  return candidate;
}

export function findParentSExpression(source: string, position: number): { from: number; to: number } | null {
  const normalizedPosition = Math.max(0, Math.min(position, source.length));
  const stack: number[] = [];
  let inString = false;
  let escapingString = false;
  let inComment = false;
  const containing: Array<{ from: number; to: number }> = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === ";") {
      inComment = true;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "(") {
      stack.push(index);
      continue;
    }
    if (character === ")" && stack.length) {
      const from = stack.pop() ?? 0;
      const to = index + 1;
      if (from <= normalizedPosition && normalizedPosition <= to) {
        containing.push({ from, to });
      }
    }
  }

  if (containing.length < 2) {
    return null;
  }

  containing.sort((left, right) => right.from - left.from);
  return containing[1] ?? null;
}

export function findSiblingSExpression(
  source: string,
  position: number,
  direction: "previous" | "next"
): { from: number; to: number } | null {
  const current = findEnclosingSExpression(source, position);
  if (!current) {
    return null;
  }
  const parent = findParentSExpression(source, position);
  if (!parent) {
    return null;
  }

  const siblings: Array<{ from: number; to: number }> = [];
  const stack: number[] = [];
  let inString = false;
  let escapingString = false;
  let inComment = false;

  for (let index = parent.from; index < parent.to; index += 1) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === ";") {
      inComment = true;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "(") {
      stack.push(index);
      continue;
    }
    if (character === ")" && stack.length) {
      const from = stack.pop() ?? 0;
      const to = index + 1;
      if (stack.length === 1 && parent.from < from && to <= parent.to) {
        siblings.push({ from, to });
      }
    }
  }

  const currentIndex = siblings.findIndex((candidate) => candidate.from === current.from && candidate.to === current.to);
  if (currentIndex < 0) {
    return null;
  }
  if (direction === "previous") {
    return siblings[currentIndex - 1] ?? null;
  }
  return siblings[currentIndex + 1] ?? null;
}

export function currentSExpressionTextAt(source: string, position: number): string | null {
  const range = findEnclosingSExpression(source, position);
  if (!range) {
    return null;
  }
  return source.slice(range.from, range.to);
}

export function indentColumnForNewLispLine(source: string, position: number, indentUnitSize = 2): number {
  const normalizedPosition = Math.max(0, Math.min(position, source.length));
  const stacks = findUnmatchedOpenParens(source, normalizedPosition);
  if (!stacks.length) {
    const currentLine = source.slice(lineStartAt(source, normalizedPosition), normalizedPosition);
    return firstNonWhitespaceColumn(currentLine);
  }

  const openParenIndex = stacks[stacks.length - 1] ?? 0;
  const head = readHeadSymbol(source, openParenIndex);
  const openParenColumn = columnAt(source, openParenIndex);
  const parentOpenParenIndex = stacks.length > 1 ? (stacks[stacks.length - 2] ?? null) : null;
  const grandParentOpenParenIndex = stacks.length > 2 ? (stacks[stacks.length - 3] ?? null) : null;
  const greatGrandParentOpenParenIndex = stacks.length > 3 ? (stacks[stacks.length - 4] ?? null) : null;

  if (parentOpenParenIndex != null && isLambdaOrBindingListContext(source, openParenIndex, parentOpenParenIndex)) {
    return openParenColumn + 1;
  }

  if (
    parentOpenParenIndex != null &&
    grandParentOpenParenIndex != null &&
    isTopLevelElementOfDesignatedList(source, openParenIndex, parentOpenParenIndex, grandParentOpenParenIndex)
  ) {
    const grandParentHead = readHeadSymbol(source, grandParentOpenParenIndex);
    if (grandParentHead && LOCAL_DEFINITION_PARENT_HEADS.has(grandParentHead)) {
      const currentListElementCount = countTopLevelElementsInList(source, openParenIndex, normalizedPosition);
      if (currentListElementCount >= 2) {
        return openParenColumn + indentUnitSize;
      }
    }
    return openParenColumn + 1;
  }

  if (
    parentOpenParenIndex != null &&
    grandParentOpenParenIndex != null &&
    greatGrandParentOpenParenIndex != null &&
    isTopLevelElementOfDesignatedList(source, parentOpenParenIndex, grandParentOpenParenIndex, greatGrandParentOpenParenIndex) &&
    topLevelElementIndexInList(source, parentOpenParenIndex, openParenIndex) === 1
  ) {
    return openParenColumn + 1;
  }

  if (!head) {
    return openParenColumn + indentUnitSize;
  }

  if (head && CLAUSE_ALIGNMENT_HEADS.has(head)) {
    return openParenColumn + 6;
  }

  if (LISP_BODY_INDENT_HEADS.has(head)) {
    return openParenColumn + indentUnitSize;
  }

  return openParenColumn + head.length + 2;
}

function insertLispNewlineAndIndent(view: EditorView): boolean {
  if (view.state.selection.ranges.length !== 1) {
    return false;
  }
  const selection = view.state.selection.main;
  if (!selection.empty) {
    return false;
  }
  const source = view.state.doc.toString();
  const indentColumn = indentColumnForNewLispLine(source, selection.head);
  const insertion = `\n${" ".repeat(Math.max(0, indentColumn))}`;
  view.dispatch({
    changes: { from: selection.head, to: selection.head, insert: insertion },
    selection: EditorSelection.cursor(selection.head + insertion.length),
    scrollIntoView: true
  });
  return true;
}

function moveToSExpressionBoundary(
  view: EditorView,
  boundary: "start" | "end",
  selectionMode: "move" | "select"
): boolean {
  const selection = view.state.selection.main;
  const enclosing = findEnclosingSExpression(view.state.doc.toString(), selection.head);
  if (!enclosing) {
    return false;
  }
  const target = boundary === "start" ? enclosing.from : enclosing.to;
  view.dispatch({
    selection:
      selectionMode === "select"
        ? EditorSelection.range(selection.anchor, target)
        : EditorSelection.cursor(target),
    scrollIntoView: true
  });
  return true;
}

function selectSExpression(view: EditorView, level: "current" | "parent"): boolean {
  const selection = view.state.selection.main;
  const source = view.state.doc.toString();
  const target =
    level === "parent"
      ? findParentSExpression(source, selection.head)
      : findEnclosingSExpression(source, selection.head);
  if (!target) {
    return false;
  }
  view.dispatch({
    selection: EditorSelection.range(target.from, target.to),
    scrollIntoView: true
  });
  return true;
}

function moveToSiblingSExpression(
  view: EditorView,
  direction: "previous" | "next",
  selectionMode: "move" | "select"
): boolean {
  const selection = view.state.selection.main;
  const target = findSiblingSExpression(view.state.doc.toString(), selection.head, direction);
  if (!target) {
    return false;
  }
  view.dispatch({
    selection:
      selectionMode === "select"
        ? EditorSelection.range(selection.anchor, target.to)
        : EditorSelection.cursor(target.from),
    scrollIntoView: true
  });
  return true;
}

function buildDecorations(view: EditorView, colors: string[]): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const source = view.state.doc.toString();
  let depth = 0;
  let inString = false;
  let escapingString = false;
  let inComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? "";
    if (inComment) {
      if (character === "\n") {
        inComment = false;
      }
      continue;
    }
    if (inString) {
      if (escapingString) {
        escapingString = false;
      } else if (character === "\\") {
        escapingString = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === ";") {
      inComment = true;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "(") {
      const color = colors[depth % colors.length] ?? colors[0];
      ranges.push(Decoration.mark({ attributes: { style: `color: ${color};` } }).range(index, index + 1));
      depth += 1;
      continue;
    }
    if (character === ")") {
      depth = Math.max(0, depth - 1);
      const color = colors[depth % colors.length] ?? colors[0];
      ranges.push(Decoration.mark({ attributes: { style: `color: ${color};` } }).range(index, index + 1));
    }
  }

  return Decoration.set(ranges, true);
}

export function CommonLispEditor({
  value,
  onChange,
  parenDepthColors,
  sourceCodeTextScalePercent,
  currentPackageName,
  symbolCatalog,
  inspectedSymbolHelp,
  onCursorSymbolChange,
  onCursorFormChange,
  onInspectSymbol,
  onFindSymbol,
  fetchRuntimeSymbolHelp
}: {
  value: string;
  onChange: (value: string) => void;
  parenDepthColors: string[];
  sourceCodeTextScalePercent: number;
  currentPackageName: string;
  symbolCatalog: Array<{
    symbol: string;
    kind: "function" | "variable" | "macro" | "class" | "generic-function" | "unknown";
    visibility?: "external" | "internal";
    packageName?: string;
  }>;
  inspectedSymbolHelp?: {
    symbol: string;
    packageName: string;
    kind: string;
    summary: string;
    signature?: string | null;
  } | null;
  onCursorSymbolChange?: (symbol: string | null) => void;
  onCursorFormChange?: (form: string | null) => void;
  onInspectSymbol?: (symbol: string) => void;
  onFindSymbol?: (symbol: string) => void;
  fetchRuntimeSymbolHelp?: (symbol: string, packageName: string) => Promise<CommonLispSymbolHelp | null>;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const pendingLocalValuesRef = useRef(new Set<string>());
  const onChangeRef = useRef(onChange);
  const onCursorSymbolChangeRef = useRef(onCursorSymbolChange);
  const onCursorFormChangeRef = useRef(onCursorFormChange);
  const onInspectSymbolRef = useRef(onInspectSymbol);
  const onFindSymbolRef = useRef(onFindSymbol);
  const fetchRuntimeSymbolHelpRef = useRef(fetchRuntimeSymbolHelp);
  const currentPackageNameRef = useRef(currentPackageName);
  const rainbowCompartmentRef = useRef(new Compartment());
  const completionsRef = useRef<Completion[]>([]);
  const symbolHelpRef = useRef<Record<string, CommonLispSymbolHelp>>({});
  onChangeRef.current = onChange;
  onCursorSymbolChangeRef.current = onCursorSymbolChange;
  onCursorFormChangeRef.current = onCursorFormChange;
  onInspectSymbolRef.current = onInspectSymbol;
  onFindSymbolRef.current = onFindSymbol;
  fetchRuntimeSymbolHelpRef.current = fetchRuntimeSymbolHelp;
  currentPackageNameRef.current = currentPackageName;
  completionsRef.current = buildCompletionOptions(symbolCatalog, inspectedSymbolHelp, currentPackageName);
  symbolHelpRef.current = buildSymbolHelpMap(symbolCatalog, inspectedSymbolHelp, currentPackageName);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) {
      return;
    }

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        drawSelection(),
        EditorView.lineWrapping,
        StreamLanguage.define(commonLisp),
        syntaxHighlighting(commonLispHighlightStyle),
        buildCommonLispTheme(),
        highlightSelectionMatches(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        buildCursorSymbolHighlightExtension(),
        autocompletion({
          activateOnTyping: true,
          override: [buildDynamicCommonLispCompletionSource(completionsRef)]
        }),
        buildDynamicCommonLispHover(symbolHelpRef, fetchRuntimeSymbolHelpRef, currentPackageNameRef),
        rainbowCompartmentRef.current.of(buildRainbowParensExtension(parenDepthColors)),
        keymap.of([
          {
            key: "Alt-ArrowLeft",
            run: (view) => moveToSExpressionBoundary(view, "start", "move")
          },
          {
            key: "Alt-ArrowRight",
            run: (view) => moveToSExpressionBoundary(view, "end", "move")
          },
          {
            key: "Alt-Shift-ArrowLeft",
            run: (view) => moveToSExpressionBoundary(view, "start", "select")
          },
          {
            key: "Alt-Shift-ArrowRight",
            run: (view) => moveToSExpressionBoundary(view, "end", "select")
          },
          {
            key: "Alt-Enter",
            run: (view) => selectSExpression(view, "current")
          },
          {
            key: "Alt-Shift-Enter",
            run: (view) => selectSExpression(view, "parent")
          },
          {
            key: "Alt-ArrowUp",
            run: (view) => moveToSiblingSExpression(view, "previous", "move")
          },
          {
            key: "Alt-ArrowDown",
            run: (view) => moveToSiblingSExpression(view, "next", "move")
          },
          {
            key: "Alt-Shift-ArrowUp",
            run: (view) => moveToSiblingSExpression(view, "previous", "select")
          },
          {
            key: "Alt-Shift-ArrowDown",
            run: (view) => moveToSiblingSExpression(view, "next", "select")
          },
          {
            key: "Mod-Shift-i",
            run: (view) => {
              const range = symbolRangeAt(view.state, view.state.selection.main.head);
              if (!range) {
                return false;
              }
              onInspectSymbolRef.current?.(range.symbol);
              return true;
            }
          },
          {
            key: "Mod-Shift-f",
            run: (view) => {
              const range = symbolRangeAt(view.state, view.state.selection.main.head);
              if (!range) {
                return false;
              }
              onFindSymbolRef.current?.(range.symbol);
              return true;
            }
          },
          { key: "Enter", run: insertLispNewlineAndIndent },
          indentWithTab,
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap
        ]),
        EditorView.domEventHandlers({
          mousedown: (_event, view) => {
            const event = _event as MouseEvent;
            if (!event.metaKey && !event.ctrlKey) {
              return false;
            }
            const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (position == null) {
              return false;
            }
            const range = symbolRangeAt(view.state, position);
            if (!range) {
              return false;
            }
            event.preventDefault();
            onInspectSymbolRef.current?.(range.symbol);
            return true;
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextValue = update.state.doc.toString();
            pendingLocalValuesRef.current.add(nextValue);
            onChangeRef.current(nextValue);
          }
          if (update.selectionSet || update.docChanged) {
            const range = symbolRangeAt(update.state, update.state.selection.main.head);
            onCursorSymbolChangeRef.current?.(range ? range.symbol : null);
            onCursorFormChangeRef.current?.(
              currentSExpressionTextAt(update.state.doc.toString(), update.state.selection.main.head)
            );
          }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: hostRef.current
    });

    viewRef.current = view;
    const initialRange = symbolRangeAt(state, state.selection.main.head);
    onCursorSymbolChangeRef.current?.(initialRange ? initialRange.symbol : null);
    onCursorFormChangeRef.current?.(currentSExpressionTextAt(state.doc.toString(), state.selection.main.head));

    return () => {
      view.destroy();
      viewRef.current = null;
      pendingLocalValuesRef.current.clear();
      onCursorSymbolChangeRef.current?.(null);
      onCursorFormChangeRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const currentDoc = view.state.doc.toString();
    if (currentDoc === value) {
      pendingLocalValuesRef.current.delete(value);
      return;
    }
    if (view.hasFocus) {
      return;
    }
    if (pendingLocalValuesRef.current.has(value)) {
      return;
    }
    pendingLocalValuesRef.current.clear();
    const selection = view.state.selection.main;
    const nextAnchor = Math.min(selection.anchor, value.length);
    const nextHead = Math.min(selection.head, value.length);
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value
      },
      selection: EditorSelection.single(nextAnchor, nextHead)
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    view.dispatch({
      effects: rainbowCompartmentRef.current.reconfigure(buildRainbowParensExtension(parenDepthColors))
    });
  }, [parenDepthColors]);

  function focusEditorFromShell(event: ReactMouseEvent<HTMLDivElement>): void {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (hostRef.current?.contains(target)) {
      return;
    }
    const position = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.doc.length;
    view.focus();
    view.dispatch({
      selection: EditorSelection.single(position)
    });
    event.preventDefault();
  }

  return (
    <div
      className="lisp-editor-shell"
      onMouseDown={focusEditorFromShell}
      style={{ ["--editor-source-code-scale" as string]: `${sourceCodeTextScalePercent / 100}` }}
    >
      <div className="common-lisp-editor-host" ref={hostRef} />
    </div>
  );
}

function normalizeCompletionType(kind?: string): string | undefined {
  switch (kind) {
    case "function":
    case "generic-function":
      return "function";
    case "macro":
      return "keyword";
    case "variable":
      return "variable";
    case "class":
      return "class";
    case "unknown":
      return "text";
    default:
      return kind;
  }
}

export function buildCompletionOptions(
  symbolCatalog: Array<{
    symbol: string;
    kind: "function" | "variable" | "macro" | "class" | "generic-function" | "unknown";
    visibility?: "external" | "internal";
    packageName?: string;
  }>,
  inspectedSymbolHelp: {
    symbol: string;
    packageName: string;
    kind: string;
    summary: string;
    signature?: string | null;
  } | null | undefined,
  currentPackageName: string
): Completion[] {
  const map = new Map<string, Completion>();
  Object.entries(COMMON_LISP_SYMBOL_HELP).forEach(([label, help]) => {
    map.set(label, {
      label,
      type: help.type,
      detail: help.detail,
      info: help.info
    });
  });
  symbolCatalog.forEach((entry) => {
    const label = entry.symbol.toLowerCase();
    const packageName = entry.packageName ?? currentPackageName;
    map.set(label, {
      label,
      type: normalizeCompletionType(entry.kind),
      detail: `${entry.kind}${entry.visibility ? ` • ${entry.visibility}` : ""}`,
      info: `${entry.symbol} in ${packageName}`
    });
  });
  if (inspectedSymbolHelp?.symbol) {
    map.set(inspectedSymbolHelp.symbol.toLowerCase(), {
      label: inspectedSymbolHelp.symbol.toLowerCase(),
      type: normalizeCompletionType(inspectedSymbolHelp.kind),
      detail: inspectedSymbolHelp.signature
        ? `${inspectedSymbolHelp.kind} • ${inspectedSymbolHelp.signature}`
        : inspectedSymbolHelp.kind,
      info: inspectedSymbolHelp.summary
    });
  }
  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function buildSymbolHelpMap(
  symbolCatalog: Array<{
    symbol: string;
    kind: "function" | "variable" | "macro" | "class" | "generic-function" | "unknown";
    visibility?: "external" | "internal";
    packageName?: string;
  }>,
  inspectedSymbolHelp: {
    symbol: string;
    packageName: string;
    kind: string;
    summary: string;
    signature?: string | null;
  } | null | undefined,
  currentPackageName: string
): Record<string, CommonLispSymbolHelp> {
  const map: Record<string, CommonLispSymbolHelp> = { ...COMMON_LISP_SYMBOL_HELP };
  symbolCatalog.forEach((entry) => {
    map[entry.symbol.toLowerCase()] = {
      detail: entry.visibility ? `${entry.kind} • ${entry.visibility}` : entry.kind,
      info: `${entry.symbol} in ${entry.packageName ?? currentPackageName}`,
      type: normalizeCompletionType(entry.kind),
      packageName: entry.packageName ?? currentPackageName,
      signature: null
    };
  });
  if (inspectedSymbolHelp?.symbol) {
    map[inspectedSymbolHelp.symbol.toLowerCase()] = {
      detail: inspectedSymbolHelp.signature
        ? `${inspectedSymbolHelp.kind} • ${inspectedSymbolHelp.signature}`
        : inspectedSymbolHelp.kind,
      info: inspectedSymbolHelp.summary,
      type: normalizeCompletionType(inspectedSymbolHelp.kind),
      packageName: inspectedSymbolHelp.packageName,
      signature: inspectedSymbolHelp.signature ?? null
    };
  }
  return map;
}
