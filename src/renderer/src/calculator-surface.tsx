import { useEffect, useMemo, useState } from "react";
import type {
  CalculatorAngleUnit,
  CalculatorMode,
  CalculatorResultDto,
  CalculatorSummaryDto
} from "../../shared/contracts";

interface CalculatorSurfaceProps {
  environmentId: string | null;
  refreshToken: string;
  draftExpression: string;
  pendingExpressionRequest: {
    expression: string;
    shouldEvaluate: boolean;
    token: number;
  } | null;
  clearPendingExpressionRequest: () => void;
  recordEvaluation: (input: { expression: string; result: CalculatorResultDto }) => void;
  insertResultIntoDraft: (input: { expression: string; result: CalculatorResultDto }) => Promise<void> | void;
  openConversationDraft: () => Promise<void> | void;
}

interface CalculatorHistoryEntry {
  expression: string;
  mode: CalculatorMode;
  result: string;
}

interface NormalizedCalculatorSummary {
  availableModes: CalculatorMode[];
  defaultMode: CalculatorMode;
  availableBases: number[];
  defaultBase: number;
  availableWordSizes: number[];
  defaultWordSize: number;
  availableAngleUnits: CalculatorAngleUnit[];
  defaultAngleUnit: CalculatorAngleUnit;
  summary: string;
}

const BASIC_BUTTONS = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "%", "+"]
];

const SCIENTIFIC_BUTTONS = [
  ["sin(", "cos(", "tan(", "^"],
  ["ln(", "log10(", "exp(", "sqrt("],
  ["pi", "e", "fact(", "abs("]
];

const PROGRAMMER_BUTTONS = [
  ["A", "B", "C", "&"],
  ["D", "E", "F", "|"],
  ["<<", ">>", "xor", "~"],
  ["0x", "0o", "0b", "%"]
];

function canShowDigit(token: string, base: number): boolean {
  if (!/^[0-9A-F]$/i.test(token)) {
    return true;
  }
  const value = Number.parseInt(token, 16);
  return Number.isFinite(value) && value < base;
}

function asCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  return [];
}

function normalizeMode(value: unknown): CalculatorMode | null {
  const normalized = String(value ?? "").toLowerCase().replace(/^:/, "");
  if (normalized === "basic" || normalized === "scientific" || normalized === "programmer") {
    return normalized;
  }
  return null;
}

function normalizeAngleUnit(value: unknown): CalculatorAngleUnit | null {
  const normalized = String(value ?? "").toLowerCase().replace(/^:/, "");
  if (normalized === "radians" || normalized === "degrees") {
    return normalized;
  }
  return null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCalculatorSummary(summary: CalculatorSummaryDto | null): NormalizedCalculatorSummary {
  const availableModes = asCollection(summary?.availableModes)
    .map(normalizeMode)
    .filter((value): value is CalculatorMode => value !== null);
  const availableBases = asCollection(summary?.availableBases)
    .map(normalizeNumber)
    .filter((value): value is number => value !== null);
  const availableWordSizes = asCollection(summary?.availableWordSizes)
    .map(normalizeNumber)
    .filter((value): value is number => value !== null);
  const availableAngleUnits = asCollection(summary?.availableAngleUnits)
    .map(normalizeAngleUnit)
    .filter((value): value is CalculatorAngleUnit => value !== null);

  return {
    availableModes: availableModes.length > 0 ? availableModes : ["basic", "scientific", "programmer"],
    defaultMode: normalizeMode(summary?.defaultMode) ?? "basic",
    availableBases: availableBases.length > 0 ? availableBases : [2, 8, 10, 16],
    defaultBase: normalizeNumber(summary?.defaultBase) ?? 10,
    availableWordSizes: availableWordSizes.length > 0 ? availableWordSizes : [8, 16, 32, 64],
    defaultWordSize: normalizeNumber(summary?.defaultWordSize) ?? 64,
    availableAngleUnits: availableAngleUnits.length > 0 ? availableAngleUnits : ["radians", "degrees"],
    defaultAngleUnit: normalizeAngleUnit(summary?.defaultAngleUnit) ?? "radians",
    summary:
      typeof summary?.summary === "string" && summary.summary.length > 0
        ? summary.summary
        : "Lisp-backed calculator utility for Surface."
  };
}

function calculatorHistoryEntries(summary: CalculatorSummaryDto | null): CalculatorHistoryEntry[] {
  return Array.isArray(summary?.history)
    ? summary.history.map((entry) => ({
        expression: entry.expression,
        mode: entry.mode,
        result: entry.result
      }))
    : [];
}

export function CalculatorSurface({
  environmentId,
  refreshToken,
  draftExpression,
  pendingExpressionRequest,
  clearPendingExpressionRequest,
  recordEvaluation,
  insertResultIntoDraft,
  openConversationDraft
}: CalculatorSurfaceProps) {
  const [summary, setSummary] = useState<CalculatorSummaryDto | null>(null);
  const [mode, setMode] = useState<CalculatorMode>("basic");
  const [expression, setExpression] = useState("");
  const [base, setBase] = useState(10);
  const [wordSize, setWordSize] = useState(64);
  const [angleUnit, setAngleUnit] = useState<CalculatorAngleUnit>("radians");
  const [result, setResult] = useState<CalculatorResultDto | null>(null);
  const [history, setHistory] = useState<CalculatorHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const normalizedSummary = useMemo(() => normalizeCalculatorSummary(summary), [summary]);
  const visibleProgrammerButtons = useMemo(
    () => PROGRAMMER_BUTTONS.map((row) => row.filter((token) => canShowDigit(token, base))),
    [base]
  );

  function applySummaryState(nextSummaryDto: CalculatorSummaryDto): void {
    setSummary(nextSummaryDto);
    const nextSummary = normalizeCalculatorSummary(nextSummaryDto);
    setExpression(nextSummaryDto.currentExpression ?? "");
    setMode(nextSummaryDto.currentMode ?? nextSummary.defaultMode);
    setBase(nextSummaryDto.currentBase ?? nextSummary.defaultBase);
    setWordSize(nextSummaryDto.currentWordSize ?? nextSummary.defaultWordSize);
    setAngleUnit(nextSummaryDto.currentAngleUnit ?? nextSummary.defaultAngleUnit);
    setResult(nextSummaryDto.latestResult ?? null);
    setHistory(calculatorHistoryEntries(nextSummaryDto));
  }

  async function refreshSummary(activeEnvironmentId: string): Promise<void> {
    const calculatorSummary = window.sbclAgentDesktop?.query?.calculatorSummary;
    if (typeof calculatorSummary !== "function") {
      throw new Error("Calculator bridge is not available yet. Reload Surface after the host bridge restarts.");
    }
    const response = await calculatorSummary(activeEnvironmentId);
    applySummaryState(response.data);
  }

  useEffect(() => {
    if (!environmentId) {
      return;
    }
    void refreshSummary(environmentId).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load calculator summary.");
    });
  }, [environmentId, refreshToken]);

  useEffect(() => {
    if (!environmentId) {
      return;
    }
    const intervalId = window.setInterval(() => {
      void refreshSummary(environmentId).catch(() => {
        // Keep the last visible state if the background refresh fails.
      });
    }, 4000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [environmentId]);

  async function appendToken(token: string): Promise<void> {
    if (!environmentId) {
      return;
    }
    const appendCalculatorToken = window.sbclAgentDesktop?.command?.appendCalculatorToken;
    if (typeof appendCalculatorToken !== "function") {
      setError("Calculator control bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    setError(null);
    const response = await appendCalculatorToken({ environmentId, token });
    applySummaryState(response.data);
  }

  async function backspace(): Promise<void> {
    if (!environmentId) {
      return;
    }
    const backspaceCalculator = window.sbclAgentDesktop?.command?.backspaceCalculator;
    if (typeof backspaceCalculator !== "function") {
      setError("Calculator control bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    setError(null);
    const response = await backspaceCalculator(environmentId);
    applySummaryState(response.data);
  }

  async function clearExpression(): Promise<void> {
    if (!environmentId) {
      return;
    }
    const clearCalculator = window.sbclAgentDesktop?.command?.clearCalculator;
    if (typeof clearCalculator !== "function") {
      setError("Calculator control bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    setError(null);
    const response = await clearCalculator(environmentId);
    applySummaryState(response.data);
  }

  async function evaluateExpression(expressionOverride?: string): Promise<void> {
    if (!environmentId) {
      setError("A bound environment is required before the calculator can evaluate expressions.");
      return;
    }
    const evaluateCalculator = window.sbclAgentDesktop?.command?.evaluateCalculator;
    if (typeof evaluateCalculator !== "function") {
      setError("Calculator bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    const activeExpression = (expressionOverride ?? expression).trim();
    if (activeExpression.length === 0) {
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const response = await evaluateCalculator({
        environmentId,
        expression: activeExpression,
        mode,
        base,
        wordSize,
        angleUnit
      });
      setResult(response.data);
      recordEvaluation({ expression: activeExpression, result: response.data });
      await refreshSummary(environmentId);
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Calculator evaluation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!pendingExpressionRequest || !environmentId) {
      return;
    }
    const setCalculatorExpression = window.sbclAgentDesktop?.command?.setCalculatorExpression;
    if (typeof setCalculatorExpression !== "function") {
      setError("Calculator control bridge is not available yet. Reload Surface after the host bridge restarts.");
      clearPendingExpressionRequest();
      return;
    }
    void setCalculatorExpression({
      environmentId,
      expression: pendingExpressionRequest.expression
    })
      .then((response) => {
        applySummaryState(response.data);
        setError(null);
        if (pendingExpressionRequest.shouldEvaluate) {
          void evaluateExpression(pendingExpressionRequest.expression);
        }
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to update calculator expression.");
      })
      .finally(() => {
        clearPendingExpressionRequest();
      });
  }, [environmentId, pendingExpressionRequest]);

  return (
    <div className="calculator-surface" onClick={(event) => event.stopPropagation()}>
      <div className="calculator-header">
        <div />
        <div className="calculator-mode-strip">
          {normalizedSummary.availableModes.map((candidateMode) => (
            <button
              className={mode === candidateMode ? "calculator-mode-button active" : "calculator-mode-button"}
              key={candidateMode}
              onClick={() => { const setCalculatorMode = window.sbclAgentDesktop?.command?.setCalculatorMode; if (!environmentId || typeof setCalculatorMode !== "function") { setMode(candidateMode); return; } void setCalculatorMode({ environmentId, mode: candidateMode }).then((response) => applySummaryState(response.data)); }}
              type="button"
            >
              {candidateMode}
            </button>
          ))}
        </div>
      </div>

      <div className="calculator-display">
        <label className="desktop-window-workbench-input">
          <span className="context-label">Expression</span>
          <input
            className="desktop-window-workbench-symbol calculator-expression-input"
            onChange={(event) => setExpression(event.target.value)} onBlur={() => { const setCalculatorExpression = window.sbclAgentDesktop?.command?.setCalculatorExpression; if (!environmentId || typeof setCalculatorExpression !== "function") { return; } void setCalculatorExpression({ environmentId, expression }).then((response) => applySummaryState(response.data)).catch(() => {}); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void evaluateExpression();
              }
            }}
            value={expression}
          />
        </label>
        <div className="calculator-result-card">
          <span className="context-label">Result</span>
          <strong>{result?.displayValue ?? "No result yet"}</strong>
          <p>{result?.summary ?? "Evaluate an expression to inspect decimal, scientific, and programmer representations."}</p>
        </div>
      </div>

      <div className="calculator-controls">
        <button className="action-button action-button-secondary" onClick={() => void clearExpression()} type="button">
          Clear
        </button>
        <button className="action-button action-button-secondary" onClick={() => void backspace()} type="button">
          Backspace
        </button>
        <button className="action-button action-button-secondary" onClick={() => void appendToken("(")} type="button">
          (
        </button>
        <button className="action-button action-button-secondary" onClick={() => void appendToken(")")} type="button">
          )
        </button>
        <button className="action-button" disabled={isBusy} onClick={() => void evaluateExpression()} type="button">
          {isBusy ? "Evaluating..." : "Evaluate"}
        </button>
      </div>
      <div className="browser-action-strip">
        <button
          className="starter-chip"
          disabled={draftExpression.trim().length === 0}
          onClick={() => { const setCalculatorExpression = window.sbclAgentDesktop?.command?.setCalculatorExpression; if (!environmentId || typeof setCalculatorExpression !== "function") { setExpression(draftExpression); return; } void setCalculatorExpression({ environmentId, expression: draftExpression }).then((response) => applySummaryState(response.data)); }}
          type="button"
        >
          Use Draft Expression
        </button>
        <button
          className="starter-chip"
          disabled={!result || expression.trim().length === 0}
          onClick={() => {
            if (!result) {
              return;
            }
            void insertResultIntoDraft({ expression: expression.trim(), result });
          }}
          type="button"
        >
          Insert Result Into Draft
        </button>
        <button className="starter-chip" onClick={() => void openConversationDraft()} type="button">
          Open Draft
        </button>
      </div>

      <div className="calculator-grid">
        <section className="calculator-keypad">
          {mode === "scientific" ? (
            <div className="calculator-button-section">
              {SCIENTIFIC_BUTTONS.map((row, rowIndex) => (
                <div className="calculator-button-row" key={`scientific:${rowIndex}`}>
                  {row.map((token) => (
                    <button className="calculator-key" key={token} onClick={() => void appendToken(token)} type="button">
                      {token}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {mode === "programmer" ? (
            <div className="calculator-programmer-controls">
              <label className="desktop-window-workbench-input">
                <span className="context-label">Base</span>
                <select
                  className="desktop-window-workbench-select"
                  onChange={(event) => { const nextBase = Number(event.target.value); const setCalculatorBase = window.sbclAgentDesktop?.command?.setCalculatorBase; if (!environmentId || typeof setCalculatorBase !== "function") { setBase(nextBase); return; } void setCalculatorBase({ environmentId, base: nextBase }).then((response) => applySummaryState(response.data)); }}
                  value={base}
                >
                  {normalizedSummary.availableBases.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="desktop-window-workbench-input">
                <span className="context-label">Word Size</span>
                <select
                  className="desktop-window-workbench-select"
                  onChange={(event) => { const nextWordSize = Number(event.target.value); const setCalculatorWordSize = window.sbclAgentDesktop?.command?.setCalculatorWordSize; if (!environmentId || typeof setCalculatorWordSize !== "function") { setWordSize(nextWordSize); return; } void setCalculatorWordSize({ environmentId, wordSize: nextWordSize }).then((response) => applySummaryState(response.data)); }}
                  value={wordSize}
                >
                  {normalizedSummary.availableWordSizes.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="desktop-window-workbench-input calculator-angle-control">
              <span className="context-label">Angle Unit</span>
              <select
                className="desktop-window-workbench-select"
                onChange={(event) => { const nextAngleUnit = event.target.value as CalculatorAngleUnit; const setCalculatorAngleUnit = window.sbclAgentDesktop?.command?.setCalculatorAngleUnit; if (!environmentId || typeof setCalculatorAngleUnit !== "function") { setAngleUnit(nextAngleUnit); return; } void setCalculatorAngleUnit({ environmentId, angleUnit: nextAngleUnit }).then((response) => applySummaryState(response.data)); }}
                value={angleUnit}
              >
                {normalizedSummary.availableAngleUnits.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="calculator-button-section">
            {(mode === "programmer" ? visibleProgrammerButtons : BASIC_BUTTONS).map((row, rowIndex) => (
              <div className="calculator-button-row" key={`row:${rowIndex}`}>
                {row.map((token) => (
                  <button className="calculator-key" key={token} onClick={() => void appendToken(token)} type="button">
                    {token}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="calculator-inspector">
          {error ? (
            <div className="calculator-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="calculator-facts">
            <div className="calculator-fact">
              <span className="context-label">Scientific</span>
              <strong>{result?.scientificNotation ?? "n/a"}</strong>
            </div>
            <div className="calculator-fact">
              <span className="context-label">Decimal</span>
              <strong>{result?.decimalValue ?? "n/a"}</strong>
            </div>
            <div className="calculator-fact">
              <span className="context-label">Hex</span>
              <strong>{result?.hexadecimalValue ?? "n/a"}</strong>
            </div>
            <div className="calculator-fact">
              <span className="context-label">Octal</span>
              <strong>{result?.octalValue ?? "n/a"}</strong>
            </div>
            <div className="calculator-fact">
              <span className="context-label">Binary</span>
              <strong className="calculator-binary-value">{result?.binaryValue ?? "n/a"}</strong>
            </div>
          </div>

          <div className="calculator-history">
            <p className="context-label">Recent Evaluations</p>
            {history.length > 0 ? (
              history.map((entry, index) => (
                <button
                  className="calculator-history-entry"
                  key={`${entry.expression}:${index}`}
                  onClick={() => { const setCalculatorExpression = window.sbclAgentDesktop?.command?.setCalculatorExpression; if (!environmentId || typeof setCalculatorExpression !== "function") { setExpression(entry.expression); return; } void setCalculatorExpression({ environmentId, expression: entry.expression }).then((response) => applySummaryState(response.data)); }}
                  type="button"
                >
                  <strong>{entry.expression}</strong>
                  <span>{entry.result}</span>
                  <em>{entry.mode}</em>
                </button>
              ))
            ) : (
              <p className="desktop-window-workbench-summary">Evaluation history will appear here as you use the calculator.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
