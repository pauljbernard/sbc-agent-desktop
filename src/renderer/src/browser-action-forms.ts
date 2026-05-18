import type {
  PackageBrowserSymbolDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode
} from "../../shared/contracts";
import type { EnvironmentFocusState } from "./environment-focus";

export function buildListenerForm(input: {
  symbol?: string | null;
  packageName?: string | null;
  mode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  line?: number | null;
}): string {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();
  const sourcePath = input.sourcePath?.trim();
  const qualifiedReference = symbol ? (packageName ? `${packageName}::${symbol}` : symbol) : null;

  if (sourcePath) {
    const lineComment = input.line ? ` ;; line ${input.line}` : "";
    return `(progn
  ;; Review source-backed artifact${lineComment}
  (format t "Source: ~A~%" "${sourcePath}")
  ${qualifiedReference ? `(describe '${qualifiedReference})` : ":no-symbol-focus"}
  (values :source-review "${sourcePath}" ${qualifiedReference ? `'${qualifiedReference}` : "nil"}))`;
  }

  if (!symbol) {
    return '(describe "sbcl-agent")';
  }

  switch (input.mode) {
    case "methods":
      return `(progn
  (describe (fdefinition '${qualifiedReference}))
  '${qualifiedReference})`;
    case "callers":
      return `(progn
  ;; Inspect caller relationships for ${qualifiedReference}
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "definitions":
      return `(progn
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "divergence":
      return `(progn
  ;; Review runtime/source drift for ${qualifiedReference}
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "describe":
    default:
      return `(describe '${qualifiedReference})`;
  }
}

export function buildConversationPrompt(input: {
  focusKind?: EnvironmentFocusState["kind"];
  symbol?: string | null;
  packageName?: string | null;
  mode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  line?: number | null;
  threadTitle?: string | null;
  threadState?: string | null;
  latestTurnState?: string | null;
  approvalId?: string | null;
  workItemId?: string | null;
  incidentId?: string | null;
  artifactId?: string | null;
  eventCursor?: number | null;
}): string {
  const focusLabel = input.symbol?.trim()
    ? `${input.packageName?.trim() ? `${input.packageName?.trim()}::` : ""}${input.symbol.trim()}`
    : input.sourcePath?.trim() ?? "current environment focus";

  const modeLabel = input.mode ?? "describe";
  const sourceLine = input.line ? ` at line ${input.line}` : "";
  const threadStateLabel =
    input.threadState || input.latestTurnState
      ? ` It is currently ${[input.threadState, input.latestTurnState].filter(Boolean).join(" / ")}.`
      : "";
  const threadContext = input.threadTitle?.trim()
    ? `Continue the linked thread "${input.threadTitle?.trim()}" while keeping the current environment focus explicit.${threadStateLabel}`
    : "Start a new conversation continuation anchored in the current environment focus.";

  switch (input.focusKind) {
    case "governance-approval":
      return [
        threadContext,
        `Review approval ${input.approvalId ?? "current approval"} as the active governed focus.`,
        "Explain the requested action, policy basis, linked work, likely consequence of approval or denial, and the best next governed step."
      ].join("\n");
    case "governance-work-item":
      return [
        threadContext,
        `Review work item ${input.workItemId ?? "current work item"} as the active governed focus.`,
        "Summarize current state, blockers, validation and reconciliation posture, linked evidence, and the next closure action."
      ].join("\n");
    case "governance-incident":
      return [
        threadContext,
        `Review incident ${input.incidentId ?? "current incident"} as the active recovery focus.`,
        "Summarize failure posture, linked runtime and workflow context, visible evidence, and the safest next governed recovery step."
      ].join("\n");
    case "evidence-artifact":
      return [
        threadContext,
        `Inspect artifact ${input.artifactId ?? "current artifact"} as the active evidence focus.`,
        "Explain what this evidence proves, what it links to in runtime or workflow state, and what action it suggests next."
      ].join("\n");
    case "evidence-event":
      return [
        threadContext,
        `Inspect event ${input.eventCursor != null ? `#${input.eventCursor}` : "current event"} as the active evidence focus.`,
        "Reconstruct what changed, which governed objects it touches, what evidence or recovery it implies, and the next best inspection target."
      ].join("\n");
    default:
      break;
  }

  if (input.sourcePath?.trim()) {
    return [
      threadContext,
      `Review source artifact ${input.sourcePath.trim()}${sourceLine}.`,
      `Explain what changed or should change around ${focusLabel}.`,
      "Call out any runtime implications, required inspections, and next executable step."
    ].join("\n");
  }

  return [
    threadContext,
    `Inspect ${focusLabel} using the current browser mode "${modeLabel}".`,
    "Summarize what matters in the live environment, what source or runtime evidence is attached, and what to do next."
  ].join("\n");
}

export function buildEntityQuickForms(input: {
  symbol?: string | null;
  packageName?: string | null;
  entityKind?: RuntimeEntityDetailDto["entityKind"] | PackageBrowserSymbolDto["kind"] | "package" | null;
}): Array<{ id: string; label: string; form: string }> {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();

  if (!symbol && packageName) {
    return [
      {
        id: "package-symbols",
        label: "List Package Symbols",
        form: `(let ((package (find-package '${packageName})))
  (list :package package :symbols (loop for symbol being the external-symbols of package collect (symbol-name symbol))))`
      },
      {
        id: "package-uses",
        label: "Inspect Package Uses",
        form: `(let ((package (find-package '${packageName})))
  (package-use-list package))`
      }
    ];
  }

  if (!symbol) {
    return [];
  }

  const qualifiedReference = packageName ? `${packageName}::${symbol}` : symbol;

  switch (input.entityKind) {
    case "class":
      return [
        {
          id: "class-slots",
          label: "Inspect Class Slots",
          form: `(describe (find-class '${qualifiedReference}))`
        },
        {
          id: "class-precedence",
          label: "Inspect Class Precedence",
          form: `(class-precedence-list (find-class '${qualifiedReference}))`
        }
      ];
    case "generic-function":
      return [
        {
          id: "generic-methods",
          label: "Inspect Methods",
          form: `(describe (fdefinition '${qualifiedReference}))`
        },
        {
          id: "generic-dispatch",
          label: "Inspect Dispatch",
          form: `(type-of (fdefinition '${qualifiedReference}))`
        }
      ];
    case "macro":
      return [
        {
          id: "macro-function",
          label: "Inspect Macro Function",
          form: `(macro-function '${qualifiedReference})`
        },
        {
          id: "macro-describe",
          label: "Describe Macro Symbol",
          form: `(describe '${qualifiedReference})`
        }
      ];
    default:
      return [
        {
          id: "describe-symbol",
          label: "Describe Symbol",
          form: `(describe '${qualifiedReference})`
        },
        {
          id: "inspect-function",
          label: "Inspect Function Binding",
          form: `(when (fboundp '${qualifiedReference}) (describe (fdefinition '${qualifiedReference})))`
        }
      ];
  }
}

export function buildSourceOperationForms(input: {
  symbol?: string | null;
  packageName?: string | null;
  path?: string | null;
  line?: number | null;
}): {
  inspect: string;
  reload: string;
  evaluate: string;
} {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();
  const path = input.path?.trim() ?? "";
  const lineComment = input.line ? ` ;; line ${input.line}` : "";
  const qualifiedReference = symbol ? (packageName ? `${packageName}::${symbol}` : symbol) : null;

  return {
    inspect: `(progn
  ;; Inspect source context${lineComment}
  (format t "Source: ~A~%" "${path}")
  ${qualifiedReference ? `(describe '${qualifiedReference})` : ":no-symbol-focus"})`,
    reload: `(progn
  ;; Reload source-backed artifact${lineComment}
  (format t "Reload request for ~A~%" "${path}")
  :reload-source)`,
    evaluate: `(progn
  ;; Evaluate near source focus${lineComment}
  (format t "Evaluate around ~A~%" "${path}")
  ${qualifiedReference ? `'${qualifiedReference}` : ":source-focus"})`
  };
}
