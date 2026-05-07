import { useEffect, useMemo, useState } from "react";
import type {
  CalculatorAngleUnit,
  CalculatorMode,
  CalculatorResultDto,
  CalculatorSummaryDto
} from "../../shared/contracts";

interface CalculatorSurfaceProps {
  environmentId: string | null;
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

export function CalculatorSurface({ environmentId }: CalculatorSurfaceProps) {
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

  useEffect(() => {
    if (!environmentId) {
      return;
    }
    const calculatorSummary = window.sbclAgentDesktop?.query?.calculatorSummary;
    if (typeof calculatorSummary !== "function") {
      setError("Calculator bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    void calculatorSummary(environmentId)
      .then((response) => {
        setSummary(response.data);
        const nextSummary = normalizeCalculatorSummary(response.data);
        setMode(nextSummary.defaultMode);
        setBase(nextSummary.defaultBase);
        setWordSize(nextSummary.defaultWordSize);
        setAngleUnit(nextSummary.defaultAngleUnit);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load calculator summary.");
      });
  }, [environmentId]);

  function appendToken(token: string): void {
    setExpression((current) => `${current}${token}`);
  }

  function backspace(): void {
    setExpression((current) => current.slice(0, -1));
  }

  function clearExpression(): void {
    setExpression("");
    setResult(null);
    setError(null);
  }

  async function evaluateExpression(): Promise<void> {
    if (!environmentId) {
      setError("A bound environment is required before the calculator can evaluate expressions.");
      return;
    }
    const evaluateCalculator = window.sbclAgentDesktop?.command?.evaluateCalculator;
    if (typeof evaluateCalculator !== "function") {
      setError("Calculator bridge is not available yet. Reload Surface after the host bridge restarts.");
      return;
    }
    if (expression.trim().length === 0) {
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      const response = await evaluateCalculator({
        environmentId,
        expression,
        mode,
        base,
        wordSize,
        angleUnit
      });
      setResult(response.data);
      setHistory((current) => [
        {
          expression,
          mode,
          result: response.data.displayValue
        },
        ...current
      ].slice(0, 12));
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Calculator evaluation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="calculator-surface" onClick={(event) => event.stopPropagation()}>
      <div className="calculator-header">
        <div />
        <div className="calculator-mode-strip">
          {normalizedSummary.availableModes.map((candidateMode) => (
            <button
              className={mode === candidateMode ? "calculator-mode-button active" : "calculator-mode-button"}
              key={candidateMode}
              onClick={() => setMode(candidateMode)}
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
            onChange={(event) => setExpression(event.target.value)}
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
        <button className="action-button action-button-secondary" onClick={clearExpression} type="button">
          Clear
        </button>
        <button className="action-button action-button-secondary" onClick={backspace} type="button">
          Backspace
        </button>
        <button className="action-button action-button-secondary" onClick={() => appendToken("(")} type="button">
          (
        </button>
        <button className="action-button action-button-secondary" onClick={() => appendToken(")")} type="button">
          )
        </button>
        <button className="action-button" disabled={isBusy} onClick={() => void evaluateExpression()} type="button">
          {isBusy ? "Evaluating..." : "Evaluate"}
        </button>
      </div>

      <div className="calculator-grid">
        <section className="calculator-keypad">
          {mode === "scientific" ? (
            <div className="calculator-button-section">
              {SCIENTIFIC_BUTTONS.map((row, rowIndex) => (
                <div className="calculator-button-row" key={`scientific:${rowIndex}`}>
                  {row.map((token) => (
                    <button className="calculator-key" key={token} onClick={() => appendToken(token)} type="button">
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
                  onChange={(event) => setBase(Number(event.target.value))}
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
                  onChange={(event) => setWordSize(Number(event.target.value))}
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
                onChange={(event) => setAngleUnit(event.target.value as CalculatorAngleUnit)}
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
                  <button className="calculator-key" key={token} onClick={() => appendToken(token)} type="button">
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
                  onClick={() => setExpression(entry.expression)}
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
