import { describe, expect, it } from "vitest";

import {
  buildCompletionOptions,
  buildSymbolHelpMap,
  currentSExpressionTextAt,
  findEnclosingSExpression,
  findParentSExpression,
  findSiblingSExpression,
  findSymbolOccurrences,
  indentColumnForNewLispLine
} from "../../src/renderer/src/common-lisp-editor";

describe("common lisp editor symbol intelligence", () => {
  it("merges built-in common lisp completions with package symbol data", () => {
    const completions = buildCompletionOptions(
      [
        { symbol: "my-fn", kind: "function", visibility: "external", packageName: "SBCL-AGENT-USER" },
        { symbol: "*session*", kind: "variable", visibility: "internal", packageName: "SBCL-AGENT-USER" }
      ],
      null,
      "SBCL-AGENT-USER"
    );

    expect(completions.some((entry) => entry.label === "defun")).toBe(true);
    expect(completions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "my-fn",
          type: "function",
          detail: "function • external"
        }),
        expect.objectContaining({
          label: "*session*",
          type: "variable",
          detail: "variable • internal"
        })
      ])
    );
  });

  it("promotes inspected runtime detail into hover/help data", () => {
    const symbolHelp = buildSymbolHelpMap(
      [{ symbol: "my-fn", kind: "function", visibility: "external", packageName: "SBCL-AGENT-USER" }],
      {
        symbol: "MY-FN",
        packageName: "SBCL-AGENT-USER",
        kind: "function",
        summary: "Resolves the active runtime session.",
        signature: "(my-fn session)"
      },
      "SBCL-AGENT-USER"
    );

    expect(symbolHelp["my-fn"]).toEqual(
      expect.objectContaining({
        detail: "function • (my-fn session)",
        info: "Resolves the active runtime session.",
        packageName: "SBCL-AGENT-USER"
      })
    );
  });

  it("finds whole-symbol occurrences without matching substrings", () => {
    const ranges = findSymbolOccurrences("(my-fn x)\n(my-fn y)\n(my-fn-extra z)\nMY-FN", "my-fn");

    expect(ranges).toEqual([
      { from: 1, to: 6 },
      { from: 11, to: 16 },
      { from: 36, to: 41 }
    ]);
  });

  it("finds the nearest enclosing s-expression around the cursor", () => {
    const source = "(defun demo (x)\n  (+ x (* x 2)))";
    const inner = findEnclosingSExpression(source, source.indexOf("* x 2") + 1);
    const outer = findEnclosingSExpression(source, source.indexOf("+ x") + 1);

    expect(inner).toEqual({ from: source.indexOf("(* x 2)"), to: source.indexOf("(* x 2)") + "(* x 2)".length });
    expect(outer).toEqual({ from: source.indexOf("(+ x (* x 2))"), to: source.indexOf("(+ x (* x 2))") + "(+ x (* x 2))".length });
  });

  it("returns the enclosing s-expression text for the current cursor position", () => {
    const source = "(defun demo (x)\n  (+ x (* x 2)))";

    expect(currentSExpressionTextAt(source, source.indexOf("* x 2") + 1)).toBe("(* x 2)");
    expect(currentSExpressionTextAt(source, source.indexOf("+ x") + 1)).toBe("(+ x (* x 2))");
    expect(currentSExpressionTextAt("plain-symbol", 3)).toBeNull();
  });

  it("finds the parent s-expression around the cursor", () => {
    const source = "(defun demo (x)\n  (+ x (* x 2)))";

    expect(findParentSExpression(source, source.indexOf("* x 2") + 1)).toEqual({
      from: source.indexOf("(+ x (* x 2))"),
      to: source.indexOf("(+ x (* x 2))") + "(+ x (* x 2))".length
    });
    expect(findParentSExpression(source, source.indexOf("(defun") + 1)).toBeNull();
  });

  it("finds sibling s-expressions within the same parent form", () => {
    const source = "(progn (alpha) (beta gamma) (delta))";

    expect(findSiblingSExpression(source, source.indexOf("beta"), "previous")).toEqual({
      from: source.indexOf("(alpha)"),
      to: source.indexOf("(alpha)") + "(alpha)".length
    });
    expect(findSiblingSExpression(source, source.indexOf("beta"), "next")).toEqual({
      from: source.indexOf("(delta)"),
      to: source.indexOf("(delta)") + "(delta)".length
    });
    expect(findSiblingSExpression(source, source.indexOf("alpha"), "previous")).toBeNull();
    expect(findSiblingSExpression(source, source.indexOf("delta"), "next")).toBeNull();
  });

  it("indents common body forms with a two-space body offset", () => {
    const source = "(defun demo (x)";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(2);
  });

  it("aligns ordinary function call arguments under the first argument column", () => {
    const source = "(format t \"hello\"";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(8);
  });

  it("preserves top-level indentation when no form is open", () => {
    const source = "  plain-symbol";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(2);
  });

  it("indents multiline defun lambda lists one column inside the lambda list", () => {
    const source = "(defun demo (";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(13);
  });

  it("indents multiline lambda forms one column inside the lambda list", () => {
    const source = "(lambda (";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(9);
  });

  it("indents let binding lists one column inside the binding list", () => {
    const source = "(let (";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(6);
  });

  it("indents extended binding macro lists one column inside the binding list", () => {
    expect(indentColumnForNewLispLine("(multiple-value-bind (", "(multiple-value-bind (".length)).toBe(22);
    expect(indentColumnForNewLispLine("(destructuring-bind (", "(destructuring-bind (".length)).toBe(21);
    expect(indentColumnForNewLispLine("(with-slots (", "(with-slots (".length)).toBe(13);
    expect(indentColumnForNewLispLine("(with-accessors (", "(with-accessors (".length)).toBe(17);
    expect(indentColumnForNewLispLine("(dolist (", "(dolist (".length)).toBe(9);
    expect(indentColumnForNewLispLine("(dotimes (", "(dotimes (".length)).toBe(10);
    expect(indentColumnForNewLispLine("(handler-bind (", "(handler-bind (".length)).toBe(15);
    expect(indentColumnForNewLispLine("(with-open-file (", "(with-open-file (".length)).toBe(17);
    expect(indentColumnForNewLispLine("(with-open-stream (", "(with-open-stream (".length)).toBe(19);
    expect(indentColumnForNewLispLine("(with-input-from-string (", "(with-input-from-string (".length)).toBe(25);
    expect(indentColumnForNewLispLine("(with-output-to-string (", "(with-output-to-string (".length)).toBe(24);
  });

  it("indents nested let binding entries one column inside the entry", () => {
    const source = "(let ((alpha";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(7);
  });

  it("indents local definition entries inside labels one column inside the entry", () => {
    const source = "(labels ((helper (";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(18);
  });

  it("indents labels local-definition bodies as function bodies after the lambda list", () => {
    const source = "(labels ((helper (x)";

    expect(indentColumnForNewLispLine(source, source.length)).toBe(11);
  });

  it("aligns loop clauses under the first clause column", () => {
    expect(indentColumnForNewLispLine("(loop", "(loop".length)).toBe(6);
    expect(indentColumnForNewLispLine("(loop for item", "(loop for item".length)).toBe(6);
  });

  it("aligns cond clauses under the first clause column", () => {
    expect(indentColumnForNewLispLine("(cond", "(cond".length)).toBe(6);
    expect(indentColumnForNewLispLine("(cond ((ready) :go)", "(cond ((ready) :go)".length)).toBe(6);
  });

  it("aligns case-family clauses under the first clause column", () => {
    expect(indentColumnForNewLispLine("(case value", "(case value".length)).toBe(6);
    expect(indentColumnForNewLispLine("(ccase value", "(ccase value".length)).toBe(6);
    expect(indentColumnForNewLispLine("(ecase value", "(ecase value".length)).toBe(6);
    expect(indentColumnForNewLispLine("(typecase value", "(typecase value".length)).toBe(6);
    expect(indentColumnForNewLispLine("(etypecase value", "(etypecase value".length)).toBe(6);
    expect(indentColumnForNewLispLine("(ctypecase value", "(ctypecase value".length)).toBe(6);
  });

  it("aligns handler and restart clauses under the first clause column", () => {
    expect(indentColumnForNewLispLine("(handler-case risky-form", "(handler-case risky-form".length)).toBe(6);
    expect(indentColumnForNewLispLine("(restart-case risky-form", "(restart-case risky-form".length)).toBe(6);
  });
});
