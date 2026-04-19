import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  ApprovalDecisionInput,
  BindingDto,
  CommandResultDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentSummaryDto,
  LinkedEntityRefDto,
  MessageDto,
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";

const workspaceOrder: Array<{ id: WorkspaceId; label: string; group: string; primary: boolean }> = [
  { id: "environment", label: "Operate", group: "Journeys", primary: true },
  { id: "conversations", label: "Conversations", group: "Journeys", primary: true },
  { id: "browser", label: "Browser", group: "Journeys", primary: true },
  { id: "runtime", label: "Execution", group: "Journeys", primary: true },
  { id: "incidents", label: "Recovery", group: "Journeys", primary: true },
  { id: "artifacts", label: "Evidence", group: "Journeys", primary: true },
  { id: "documentation", label: "Documentation", group: "Journeys", primary: true },
  { id: "configuration", label: "Configuration", group: "Journeys", primary: true },
  { id: "work", label: "Execution Detail", group: "Internal", primary: false },
  { id: "activity", label: "Evidence Detail", group: "Internal", primary: false },
  { id: "approvals", label: "Approval Detail", group: "Internal", primary: false }
];

const keyboardWorkspaceOrder = workspaceOrder.filter((workspace) => workspace.primary).map((workspace) => workspace.id);

interface GlobalAttentionItem {
  id: string;
  label: string;
  summary: string;
  value: number;
  workspace: WorkspaceId;
  tone: "active" | "warning" | "danger" | "steady";
}

interface WorkspaceDescriptor {
  eyebrow: string;
  title: string;
  summary: string;
}

interface JourneyStep {
  id: string;
  title: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

interface WorkspaceResolutionState {
  label: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

type ThemePreference = "system" | "light" | "dark";

type ResolvedTheme = "light" | "dark";

const DEFAULT_LISP_PAREN_COLORS = ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"];

const LISP_CONFIGURATION_SAMPLE = `(defun reconcile-runtime-state (work-item env)
  (let ((result (evaluate-in-context env '(describe work-item))))
    (when (awaiting-approval-p result)
      (queue-approval work-item :policy :runtime-change))
    result))`;

const PUBLISHED_DOCUMENTATION_URL = "https://pauljbernard.github.io/sbc-agent-desktop/";

type OperateSection = "orientation" | "journeys" | "evidence";
type ConversationSection = "threads" | "turns" | "draft";
type ConfigurationSection = "preferences";
type ExecutionSection = "listener" | "approvals" | "work";
type RecoverySection = "incidents";
type EvidenceSection = "artifacts" | "observation";

type BrowserDomain =
  | "systems"
  | "packages"
  | "symbols"
  | "classes-methods"
  | "runtime-objects"
  | "source"
  | "xref"
  | "documentation"
  | "governance"
  | "linked-conversations";

interface BrowserDomainDescriptor {
  id: BrowserDomain;
  label: string;
  summary: string;
}

const browserDomains: BrowserDomainDescriptor[] = [
  { id: "systems", label: "Systems", summary: "Loaded systems and their attached packages." },
  { id: "packages", label: "Packages", summary: "Namespaces, exports, internals, and use-lists." },
  { id: "symbols", label: "Symbols", summary: "Functions, variables, macros, classes, and generic functions." },
  { id: "classes-methods", label: "Classes & Methods", summary: "CLOS classes, slots, and dispatch surfaces." },
  { id: "runtime-objects", label: "Runtime Objects", summary: "Active scopes and inspectable live runtime objects." },
  { id: "source", label: "Source", summary: "Source-backed definitions, edits, staging, and reload." },
  { id: "xref", label: "XREF", summary: "Incoming and outgoing semantic references." },
  { id: "documentation", label: "Documentation", summary: "Docstrings and environment-linked reference material." },
  { id: "governance", label: "Governance", summary: "Approvals, incidents, work items, and closure state." },
  { id: "linked-conversations", label: "Linked Conversations", summary: "Threads and turns attached to the current entity." }
];

const configurationSections: Array<{
  id: ConfigurationSection;
  label: string;
  summary: string;
}> = [
  {
    id: "preferences",
    label: "Preferences",
    summary: "Desktop appearance and operator defaults that shape the shell itself."
  }
];

const operateSections: Array<{
  id: OperateSection;
  label: string;
  summary: string;
}> = [
  {
    id: "orientation",
    label: "Orientation",
    summary: "Environment posture, current continuation, and active truth surfaces."
  },
  {
    id: "journeys",
    label: "Journeys",
    summary: "Choose the dominant path from current pressure and governed context."
  },
  {
    id: "evidence",
    label: "Evidence",
    summary: "Recent proof, artifacts, and compressed signal before entering a narrower journey."
  }
];

const conversationSections: Array<{
  id: ConversationSection;
  label: string;
  summary: string;
}> = [
  {
    id: "threads",
    label: "Threads",
    summary: "Supervise multiple structured conversations as durable work."
  },
  {
    id: "turns",
    label: "Turns",
    summary: "Inspect turn lifecycle, governed references, and selected turn state."
  },
  {
    id: "draft",
    label: "Draft",
    summary: "Compose the next supervised continuation without dropping linked context."
  }
];

const executionSections: Array<{
  id: ExecutionSection;
  label: string;
  summary: string;
}> = [
  {
    id: "listener",
    label: "Listener",
    summary: "Runtime control surface, direct evaluation, and execution posture."
  },
  {
    id: "approvals",
    label: "Approvals",
    summary: "Governed execution decisions with explicit consequence and linked context."
  },
  {
    id: "work",
    label: "Work",
    summary: "Reconciliation, workflow closure, and execution obligations."
  }
];

const recoverySections: Array<{
  id: RecoverySection;
  label: string;
  summary: string;
}> = [
  {
    id: "incidents",
    label: "Incidents",
    summary: "Durable failure, restoration, and recovery context."
  }
];

const evidenceSections: Array<{
  id: EvidenceSection;
  label: string;
  summary: string;
}> = [
  {
    id: "artifacts",
    label: "Artifacts",
    summary: "Durable outputs, provenance, and linked producing context."
  },
  {
    id: "observation",
    label: "Observation",
    summary: "Replayable event flow and operational evidence."
  }
];

function canonicalWorkspace(workspaceId: WorkspaceId): WorkspaceId {
  switch (workspaceId) {
    case "work":
    case "approvals":
      return "runtime";
    case "activity":
      return "artifacts";
    default:
      return workspaceId;
  }
}

function buildListenerForm(input: {
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

function buildConversationPrompt(input: {
  symbol?: string | null;
  packageName?: string | null;
  mode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  line?: number | null;
  threadTitle?: string | null;
  threadState?: string | null;
  latestTurnState?: string | null;
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
    ? `Continue the linked thread "${input.threadTitle?.trim()}" while keeping the browser focus explicit.${threadStateLabel}`
    : "Start a new conversation continuation anchored in the current browser focus.";

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

function buildEntityQuickForms(input: {
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

function buildSourceOperationForms(input: {
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

function normalizeParenDepthColors(colors?: string[] | null): string[] {
  const normalized = Array.isArray(colors)
    ? colors.filter((color) => typeof color === "string" && color.trim().length > 0)
    : [];

  return DEFAULT_LISP_PAREN_COLORS.map((fallback, index) => normalized[index] ?? fallback);
}

function classifyLispToken(token: string): string {
  if (token.length === 0) {
    return "plain";
  }

  if (token.startsWith(":")) {
    return "keyword";
  }

  if (/^[+-]?\d+(\.\d+)?$/.test(token)) {
    return "number";
  }

  if (token === "t" || token === "nil") {
    return "atom";
  }

  if (token.startsWith("&")) {
    return "lambda-keyword";
  }

  return "symbol";
}

function renderLispLine(line: string, lineIndex: number, parenDepthColors: string[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let depth = 0;
  let token = "";
  let keyIndex = 0;
  let inString = false;
  let escapingString = false;

  function flushToken(): void {
    if (!token) {
      return;
    }

    nodes.push(
      <span className={`lisp-token lisp-token-${classifyLispToken(token)}`} key={`token:${lineIndex}:${keyIndex++}`}>
        {token}
      </span>
    );
    token = "";
  }

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index] ?? "";

    if (!inString && character === ";") {
      flushToken();
      nodes.push(
        <span className="lisp-token lisp-token-comment" key={`comment:${lineIndex}:${keyIndex++}`}>
          {line.slice(index)}
        </span>
      );
      return nodes;
    }

    if (inString) {
      token += character;

      if (escapingString) {
        escapingString = false;
        continue;
      }

      if (character === "\\") {
        escapingString = true;
        continue;
      }

      if (character === "\"") {
        nodes.push(
          <span className="lisp-token lisp-token-string" key={`string:${lineIndex}:${keyIndex++}`}>
            {token}
          </span>
        );
        token = "";
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      flushToken();
      token = "\"";
      inString = true;
      escapingString = false;
      continue;
    }

    if (character === "(") {
      flushToken();
      const color = parenDepthColors[depth % parenDepthColors.length] ?? DEFAULT_LISP_PAREN_COLORS[0];
      nodes.push(
        <span className="lisp-paren" key={`open:${lineIndex}:${keyIndex++}`} style={{ color }}>
          (
        </span>
      );
      depth += 1;
      continue;
    }

    if (character === ")") {
      flushToken();
      depth = Math.max(0, depth - 1);
      const color = parenDepthColors[depth % parenDepthColors.length] ?? DEFAULT_LISP_PAREN_COLORS[0];
      nodes.push(
        <span className="lisp-paren" key={`close:${lineIndex}:${keyIndex++}`} style={{ color }}>
          )
        </span>
      );
      continue;
    }

    if (character === "'" || character === "`" || character === ",") {
      flushToken();
      nodes.push(
        <span className="lisp-token lisp-token-quote" key={`quote:${lineIndex}:${keyIndex++}`}>
          {character}
        </span>
      );
      continue;
    }

    if (/\s/.test(character)) {
      flushToken();
      nodes.push(
        <span className="lisp-token lisp-token-whitespace" key={`space:${lineIndex}:${keyIndex++}`}>
          {character}
        </span>
      );
      continue;
    }

    token += character;
  }

  if (inString && token) {
    nodes.push(
      <span className="lisp-token lisp-token-string" key={`string:${lineIndex}:${keyIndex++}`}>
        {token}
      </span>
    );
    token = "";
  }

  flushToken();
  return nodes;
}

function LispCodeBlock({
  code,
  parenDepthColors,
  className,
  showLineNumbers = true
}: {
  code: string;
  parenDepthColors: string[];
  className?: string;
  showLineNumbers?: boolean;
}) {
  const normalizedCode = code.replace(/\t/g, "  ");
  const lines = normalizedCode.split("\n");

  return (
    <div className={className ? `lisp-code-block ${className}` : "lisp-code-block"}>
      {lines.map((line, index) => (
        <div className="lisp-code-line" key={`line:${index}`}>
          {showLineNumbers ? <span className="lisp-code-line-number">{index + 1}</span> : null}
          <code className="lisp-code-line-content">{renderLispLine(line, index, parenDepthColors)}</code>
        </div>
      ))}
    </div>
  );
}

function stripDocumentationFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) {
    return markdown.trim();
  }

  const closingIndex = markdown.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return markdown.trim();
  }

  return markdown.slice(closingIndex + 5).trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDocumentationInline(markdown: string): string {
  return escapeHtml(markdown)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderDocumentationMarkdown(markdown: string): string {
  const lines = stripDocumentationFrontmatter(markdown).split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let codeFence: string[] = [];
  let inCodeFence = false;
  let tableRows: string[][] = [];

  function flushParagraph(): void {
    if (paragraph.length === 0) {
      return;
    }

    html.push(`<p>${renderDocumentationInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList(): void {
    if (!listType || listItems.length === 0) {
      return;
    }

    html.push(
      `<${listType}>${listItems.map((item) => `<li>${renderDocumentationInline(item)}</li>`).join("")}</${listType}>`
    );
    listItems = [];
    listType = null;
  }

  function flushTable(): void {
    if (tableRows.length < 2) {
      tableRows = [];
      return;
    }

    const [header, separator, ...body] = tableRows;
    const isSeparator = separator.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (!isSeparator) {
      tableRows = [];
      return;
    }

    html.push(
      `<table><thead><tr>${header
        .map((cell) => `<th>${renderDocumentationInline(cell)}</th>`)
        .join("")}</tr></thead><tbody>${body
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${renderDocumentationInline(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody></table>`
    );
    tableRows = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      flushTable();
      if (inCodeFence) {
        html.push(`<pre><code>${escapeHtml(codeFence.join("\n"))}</code></pre>`);
        codeFence = [];
        inCodeFence = false;
      } else {
        inCodeFence = true;
      }
      continue;
    }

    if (inCodeFence) {
      codeFence.push(line);
      continue;
    }

    if (trimmed.length === 0) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph();
      flushList();
      tableRows.push(
        trimmed
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim())
      );
      continue;
    }

    flushTable();

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 3);
      html.push(`<h${level}>${renderDocumentationInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList();
      }
      listType = "ol";
      listItems.push(orderedMatch[1]);
      continue;
    }

    const bulletMatch = trimmed.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList();
      }
      listType = "ul";
      listItems.push(bulletMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushTable();

  if (inCodeFence && codeFence.length > 0) {
    html.push(`<pre><code>${escapeHtml(codeFence.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

export function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("environment");
  const [selectedOperateSection, setSelectedOperateSection] = useState<OperateSection>("orientation");
  const [selectedConversationSection, setSelectedConversationSection] =
    useState<ConversationSection>("threads");
  const [selectedBrowserDomain, setSelectedBrowserDomain] = useState<BrowserDomain>("symbols");
  const [selectedConfigurationSection, setSelectedConfigurationSection] =
    useState<ConfigurationSection>("preferences");
  const [selectedExecutionSection, setSelectedExecutionSection] = useState<ExecutionSection>("listener");
  const [selectedRecoverySection, setSelectedRecoverySection] = useState<RecoverySection>("incidents");
  const [selectedEvidenceSection, setSelectedEvidenceSection] = useState<EvidenceSection>("artifacts");
  const [isWorkspaceTransitioning, setIsWorkspaceTransitioning] = useState(false);
  const [inspectorPinned, setInspectorPinned] = useState(true);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [lispParenColors, setLispParenColors] = useState<string[]>(DEFAULT_LISP_PAREN_COLORS);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [expandedWorkspaceMenus, setExpandedWorkspaceMenus] = useState<Record<string, boolean>>({
    environment: true,
    conversations: true,
    runtime: true,
    incidents: true,
    artifacts: true,
    browser: true,
    documentation: true,
    configuration: true
  });
  const [hostStatus, setHostStatus] = useState<HostStatusDto | null>(null);
  const [binding, setBinding] = useState<BindingDto | null>(null);
  const [summary, setSummary] = useState<EnvironmentSummaryDto | null>(null);
  const [status, setStatus] = useState<EnvironmentStatusDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadDetailDto | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<TurnDetailDto | null>(null);
  const [conversationDraft, setConversationDraft] = useState(
    "Start from the live environment focus and keep runtime, source, and governance context attached."
  );
  const [runtimeSummary, setRuntimeSummary] = useState<RuntimeSummaryDto | null>(null);
  const [runtimeForm, setRuntimeForm] = useState('(describe "sbcl-agent")');
  const [runtimeResult, setRuntimeResult] = useState<CommandResultDto<RuntimeEvalResultDto> | null>(null);
  const [runtimeInspectorSymbol, setRuntimeInspectorSymbol] = useState("CAR");
  const [runtimeInspectorPackage, setRuntimeInspectorPackage] = useState("");
  const [runtimeInspectionMode, setRuntimeInspectionMode] =
    useState<RuntimeInspectionMode>("describe");
  const runtimeInspectorSymbolRef = useRef(runtimeInspectorSymbol);
  const runtimeInspectorPackageRef = useRef(runtimeInspectorPackage);
  const runtimeInspectionModeRef = useRef<RuntimeInspectionMode>(runtimeInspectionMode);
  const [runtimeInspection, setRuntimeInspection] =
    useState<QueryResultDto<RuntimeInspectionResultDto> | null>(null);
  const [runtimeEntityDetail, setRuntimeEntityDetail] =
    useState<QueryResultDto<RuntimeEntityDetailDto> | null>(null);
  const [packageBrowser, setPackageBrowser] = useState<QueryResultDto<PackageBrowserDto> | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isInspectingRuntime, setIsInspectingRuntime] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<QueryResultDto<SourcePreviewDto> | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isStagingSource, setIsStagingSource] = useState(false);
  const [isReloadingSource, setIsReloadingSource] = useState(false);
  const [sourceMutationResult, setSourceMutationResult] =
    useState<CommandResultDto<SourceMutationResultDto> | null>(null);
  const [sourceReloadResult, setSourceReloadResult] =
    useState<CommandResultDto<SourceReloadResultDto> | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestSummaryDto[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestDto | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<CommandResultDto<ApprovalDecisionDto> | null>(null);
  const [isDecidingApproval, setIsDecidingApproval] = useState(false);
  const [incidents, setIncidents] = useState<IncidentSummaryDto[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetailDto | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemSummaryDto[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemDetailDto | null>(null);
  const [selectedWorkflowRecord, setSelectedWorkflowRecord] = useState<WorkflowRecordDto | null>(null);
  const [environmentEvents, setEnvironmentEvents] = useState<EnvironmentEventDto[]>([]);
  const [selectedEventCursor, setSelectedEventCursor] = useState<number | null>(null);
  const [eventFamilyFilter, setEventFamilyFilter] = useState<string>("all");
  const [eventVisibilityFilter, setEventVisibilityFilter] = useState<string>("all");
  const [documentationPages, setDocumentationPages] = useState<DocumentationPageSummaryDto[]>([]);
  const [selectedDocumentationSlug, setSelectedDocumentationSlug] = useState<string>("development-model");
  const [selectedDocumentationPage, setSelectedDocumentationPage] = useState<DocumentationPageDto | null>(null);

  function updateRuntimeInspectorSymbol(value: string): void {
    runtimeInspectorSymbolRef.current = value;
    setRuntimeInspectorSymbol(value);
  }

  function updateRuntimeInspectorPackage(value: string): void {
    runtimeInspectorPackageRef.current = value;
    setRuntimeInspectorPackage(value);
  }

  function updateRuntimeInspectionMode(value: RuntimeInspectionMode): void {
    runtimeInspectionModeRef.current = value;
    setRuntimeInspectionMode(value);
  }
  const [artifacts, setArtifacts] = useState<ArtifactSummaryDto[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDetailDto | null>(null);
  const effectiveEnvironmentId = summary?.environmentId ?? binding?.environmentId ?? null;

  useEffect(() => {
    void loadInitialState();
  }, []);

  useEffect(() => {
    void loadDocumentationPages();
  }, []);

  useEffect(() => {
    setIsWorkspaceTransitioning(true);
    const timeout = window.setTimeout(() => {
      setIsWorkspaceTransitioning(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [activeWorkspace]);

  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const shortcutIndex = Number(event.key) - 1;
      if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex >= keyboardWorkspaceOrder.length) {
        return;
      }

      const workspace = keyboardWorkspaceOrder[shortcutIndex];
      if (!workspace) {
        return;
      }

      event.preventDefault();
      void navigateToWorkspace(workspace);
    }

    window.addEventListener("keydown", handleWorkspaceShortcut);

    return () => {
      window.removeEventListener("keydown", handleWorkspaceShortcut);
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? "dark" : "light");
    };

    updateSystemTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    normalizeParenDepthColors(lispParenColors).forEach((color, index) => {
      document.documentElement.style.setProperty(`--lisp-paren-depth-${index + 1}`, color);
    });
  }, [lispParenColors]);

  useEffect(() => {
    if (activeWorkspace === "conversations" && effectiveEnvironmentId) {
      void loadConversationWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedThreadId && effectiveEnvironmentId) {
      void loadThreadDetail(selectedThreadId, effectiveEnvironmentId);
    }
  }, [selectedThreadId, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedTurnId && effectiveEnvironmentId) {
      void loadTurnDetail(selectedTurnId, effectiveEnvironmentId);
    }
  }, [selectedTurnId, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "runtime" && effectiveEnvironmentId) {
      void loadRuntimeWorkspace(effectiveEnvironmentId);
      void loadWorkWorkspace(effectiveEnvironmentId);
      void loadApprovalWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "browser" && effectiveEnvironmentId) {
      void loadRuntimeWorkspace(effectiveEnvironmentId);
      void loadWorkWorkspace(effectiveEnvironmentId);
      void loadArtifactsWorkspace(effectiveEnvironmentId);
      void loadConversationWorkspace(effectiveEnvironmentId);
      void loadApprovalWorkspace(effectiveEnvironmentId);
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "browser" && effectiveEnvironmentId && runtimeSummary?.currentPackage) {
      void loadPackageBrowser(selectedPackageName || runtimeSummary.currentPackage);
    }
  }, [activeWorkspace, effectiveEnvironmentId, runtimeSummary?.currentPackage, selectedPackageName]);

  useEffect(() => {
    if (canonicalWorkspace(activeWorkspace) !== "browser" || !runtimeInspection?.data.items.length) {
      return;
    }

    const sourceBackedItem = runtimeInspection.data.items.find((item) => item.path);
    if (!sourceBackedItem?.path) {
      return;
    }

    if (
      sourcePreview?.data.path === sourceBackedItem.path &&
      sourcePreview.data.focusLine === (sourceBackedItem.line ?? null)
    ) {
      return;
    }

    void loadSourcePreview(sourceBackedItem.path, sourceBackedItem.line ?? undefined);
  }, [activeWorkspace, runtimeInspection, sourcePreview?.data.focusLine, sourcePreview?.data.path]);

  useEffect(() => {
    if (
      canonicalWorkspace(activeWorkspace) !== "browser" ||
      !effectiveEnvironmentId ||
      !runtimeInspection?.data.symbol
    ) {
      return;
    }

    void loadRuntimeEntityDetail(runtimeInspection.data.symbol, runtimeInspection.data.packageName);
  }, [activeWorkspace, effectiveEnvironmentId, runtimeInspection?.data.packageName, runtimeInspection?.data.symbol]);

  useEffect(() => {
    setSourceDraft(sourcePreview?.data.editableContent ?? "");
    setIsEditingSource(false);
    setSourceMutationResult(null);
    setSourceReloadResult(null);
  }, [sourcePreview?.data.path, sourcePreview?.data.editableContent]);

  useEffect(() => {
    if (activeWorkspace === "approvals" && effectiveEnvironmentId) {
      void loadApprovalWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedApprovalId && effectiveEnvironmentId) {
      void loadApprovalDetail(selectedApprovalId, effectiveEnvironmentId);
    }
  }, [selectedApprovalId, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "incidents" && effectiveEnvironmentId) {
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedIncidentId && effectiveEnvironmentId) {
      void loadIncidentDetail(selectedIncidentId, effectiveEnvironmentId);
    }
  }, [selectedIncidentId, effectiveEnvironmentId]);

  useEffect(() => {
    if (effectiveEnvironmentId && (summary?.attention.openIncidents ?? 0) > 0 && incidents.length === 0) {
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [effectiveEnvironmentId, incidents.length, summary?.attention.openIncidents]);

  useEffect(() => {
    if (activeWorkspace === "work" && effectiveEnvironmentId) {
      void loadWorkWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedWorkItemId && effectiveEnvironmentId) {
      void loadWorkItemDetail(selectedWorkItemId, effectiveEnvironmentId);
    }
  }, [selectedWorkItemId, effectiveEnvironmentId]);

  useEffect(() => {
    if (effectiveEnvironmentId && (summary?.attention.blockedWork ?? 0) > 0 && workItems.length === 0) {
      void loadWorkWorkspace(effectiveEnvironmentId);
    }
  }, [effectiveEnvironmentId, summary?.attention.blockedWork, workItems.length]);

  useEffect(() => {
    if (activeWorkspace === "activity" && effectiveEnvironmentId) {
      void loadActivityWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId, eventFamilyFilter, eventVisibilityFilter]);

  useEffect(() => {
    if (activeWorkspace === "artifacts" && effectiveEnvironmentId) {
      void loadArtifactsWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace !== "documentation") {
      return;
    }

    if (documentationPages.length === 0) {
      void loadDocumentationPages();
      return;
    }

    if (!selectedDocumentationPage || selectedDocumentationPage.slug !== selectedDocumentationSlug) {
      void loadDocumentationPage(selectedDocumentationSlug);
    }
  }, [activeWorkspace, documentationPages.length, selectedDocumentationPage, selectedDocumentationSlug]);

  useEffect(() => {
    if (selectedArtifactId && effectiveEnvironmentId) {
      void loadArtifactDetail(selectedArtifactId, effectiveEnvironmentId);
    }
  }, [selectedArtifactId, effectiveEnvironmentId]);

  async function loadInitialState(): Promise<void> {
    try {
      const [nextHostStatus, nextBinding, desktopPreferences] = await Promise.all([
        window.sbclAgentDesktop.host.getHostStatus(),
        window.sbclAgentDesktop.host.getCurrentBinding(),
        window.sbclAgentDesktop.desktop.getDesktopPreferences()
      ]);

      setHostStatus(nextHostStatus);
      setBinding(nextBinding);
      setActiveWorkspace(desktopPreferences.lastWorkspace);
      setInspectorPinned(desktopPreferences.inspectorPinned);
      setThemePreference(desktopPreferences.themePreference);
      setLispParenColors(normalizeParenDepthColors(desktopPreferences.lispCodeView?.parenDepthColors));

      if (nextBinding?.environmentId) {
        const [summaryResult, statusResult] = await Promise.all([
          window.sbclAgentDesktop.query.environmentSummary(nextBinding.environmentId),
          window.sbclAgentDesktop.query.environmentStatus(nextBinding.environmentId)
        ]);
        setSummary(summaryResult.data);
        setStatus(statusResult.data);
        setBinding(statusResult.metadata.binding ?? summaryResult.metadata.binding ?? nextBinding);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load desktop state.");
    }
  }

  async function loadDocumentationPages(): Promise<void> {
    try {
      const pages = await window.sbclAgentDesktop.desktop.listDocumentationPages();
      setDocumentationPages(pages);
      setSelectedDocumentationSlug((current) => {
        if (pages.some((page) => page.slug === current)) {
          return current;
        }

        return pages[0]?.slug ?? "index";
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation pages.");
    }
  }

  async function loadDocumentationPage(slug: string): Promise<void> {
    try {
      const page = await window.sbclAgentDesktop.desktop.readDocumentationPage(slug);
      setSelectedDocumentationPage(page);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation page.");
    }
  }

  async function loadConversationWorkspace(environmentId: string): Promise<void> {
    try {
      const threadResult = await window.sbclAgentDesktop.query.threadList(environmentId);
      setThreads(threadResult.data);

      const nextThreadId = selectedThreadId ?? threadResult.data[0]?.threadId ?? null;
      setSelectedThreadId(nextThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load conversation workspace.");
    }
  }

  async function loadThreadDetail(threadId: string, environmentId: string): Promise<void> {
    try {
      const detailResult = await window.sbclAgentDesktop.query.threadDetail(threadId, environmentId);
      setSelectedThread(detailResult.data);

      const nextTurnId = selectedTurnId ?? detailResult.data.turns[0]?.turnId ?? null;
      setSelectedTurnId(nextTurnId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load thread detail.");
    }
  }

  async function loadTurnDetail(turnId: string, environmentId: string): Promise<void> {
    try {
      const detailResult = await window.sbclAgentDesktop.query.turnDetail(turnId, environmentId);
      setSelectedTurn(detailResult.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load turn detail.");
    }
  }

  async function loadRuntimeWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.runtimeSummary(environmentId);
      setRuntimeSummary(result.data);
      setSelectedPackageName((current) => current || result.data.currentPackage);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load runtime workspace.");
    }
  }

  async function loadPackageBrowser(packageName?: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.packageBrowser({
        environmentId: effectiveEnvironmentId,
        packageName
      });
      setPackageBrowser(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Package browser load failed.");
    }
  }

  async function loadRuntimeEntityDetail(symbol: string, packageName?: string): Promise<void> {
    if (!effectiveEnvironmentId || symbol.trim().length === 0) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.runtimeEntityDetail({
        environmentId: effectiveEnvironmentId,
        symbol: symbol.trim(),
        packageName
      });
      setRuntimeEntityDetail(result);
    } catch (error) {
      setRuntimeEntityDetail(null);
    }
  }

  async function evaluateRuntimeForm(): Promise<void> {
    if (!effectiveEnvironmentId || runtimeForm.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form: runtimeForm,
        packageName: runtimeSummary?.currentPackage
      });
      setRuntimeResult(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function performRuntimeInspection(input: {
    symbol: string;
    packageName?: string;
    mode: RuntimeInspectionMode;
  }): Promise<void> {
    if (!effectiveEnvironmentId || input.symbol.trim().length === 0) {
      return;
    }

    setIsInspectingRuntime(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.query.runtimeInspectSymbol({
        environmentId: effectiveEnvironmentId,
        symbol: input.symbol.trim(),
        packageName:
          input.packageName && input.packageName.trim().length > 0
            ? input.packageName.trim()
            : runtimeSummary?.currentPackage,
        mode: input.mode
      });
      setRuntimeInspection(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime inspection failed.");
    } finally {
      setIsInspectingRuntime(false);
    }
  }

  async function inspectRuntimeSymbol(): Promise<void> {
    await performRuntimeInspection({
      symbol: runtimeInspectorSymbolRef.current,
      packageName: runtimeInspectorPackageRef.current,
      mode: runtimeInspectionModeRef.current
    });
  }

  async function browseRuntimeEntity(
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ): Promise<void> {
    updateRuntimeInspectorSymbol(symbol);
    updateRuntimeInspectorPackage(packageName ?? "");
    updateRuntimeInspectionMode(mode);
    setRuntimeForm(
      buildListenerForm({
        symbol,
        packageName,
        mode
      })
    );
    await performRuntimeInspection({ symbol, packageName, mode });
  }

  async function loadSourcePreview(path: string, line?: number): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.sourcePreview({
        environmentId: effectiveEnvironmentId,
        path,
        line,
        contextRadius: 8
      });
      setSourcePreview(result);
      setRuntimeForm(
        buildListenerForm({
          symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbolRef.current,
          packageName:
            runtimeInspection?.data.packageName ??
            runtimeEntityDetail?.data.packageName ??
            runtimeInspectorPackageRef.current,
          mode: runtimeInspectionModeRef.current,
          sourcePath: path,
          line
        })
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source preview failed.");
    }
  }

  async function stageSourceChange(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsStagingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.stageSourceChange({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path,
        content: sourceDraft
      });
      setSourceMutationResult(result);
      setIsEditingSource(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source stage change failed.");
    } finally {
      setIsStagingSource(false);
    }
  }

  async function reloadSourceFile(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsReloadingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.reloadSourceFile({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path
      });
      setSourceReloadResult(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime reload failed.");
    } finally {
      setIsReloadingSource(false);
    }
  }

  async function loadApprovalWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
      setApprovalRequests(result.data);
      setSelectedApprovalId((current) => current ?? result.data[0]?.requestId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load approvals workspace.");
    }
  }

  async function loadApprovalDetail(requestId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.approvalRequestDetail(requestId, environmentId);
      setSelectedApproval(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load approval detail.");
    }
  }

  async function submitApprovalDecision(decision: "approve" | "deny"): Promise<void> {
    if (!effectiveEnvironmentId || !selectedApprovalId) {
      return;
    }

    setIsDecidingApproval(true);
    setErrorMessage(null);

    const input: ApprovalDecisionInput = {
      environmentId: effectiveEnvironmentId,
      requestId: selectedApprovalId
    };

    try {
      const result =
        decision === "approve"
          ? await window.sbclAgentDesktop.command.approveRequest(input)
          : await window.sbclAgentDesktop.command.denyRequest(input);
      setApprovalDecision(result);
      await loadApprovalWorkspace(effectiveEnvironmentId);
      await loadApprovalDetail(selectedApprovalId, effectiveEnvironmentId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Approval decision failed.");
    } finally {
      setIsDecidingApproval(false);
    }
  }

  async function loadIncidentWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentList(environmentId);
      setIncidents(result.data);
      setSelectedIncidentId((current) => current ?? result.data[0]?.incidentId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incidents workspace.");
    }
  }

  async function loadIncidentDetail(incidentId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentDetail(incidentId, environmentId);
      setSelectedIncident(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incident detail.");
    }
  }

  async function loadWorkWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.workItemList(environmentId);
      setWorkItems(result.data);
      setSelectedWorkItemId((current) => current ?? result.data[0]?.workItemId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load work workspace.");
    }
  }

  async function loadWorkItemDetail(workItemId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
      setSelectedWorkItem(result.data);
      const workflow = await window.sbclAgentDesktop.query.workflowRecordDetail(result.data.workflowRecordId, environmentId);
      setSelectedWorkflowRecord(workflow.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load work item detail.");
    }
  }

  async function loadActivityWorkspace(environmentId: string): Promise<void> {
    try {
      const input: EventSubscriptionInput = {
        environmentId,
        families: eventFamilyFilter === "all" ? undefined : [eventFamilyFilter],
        visibility: eventVisibilityFilter === "all" ? undefined : [eventVisibilityFilter]
      };
      const result = await window.sbclAgentDesktop.query.environmentEvents(input);
      setEnvironmentEvents(result.data);
      setSelectedEventCursor((current) => current ?? result.data[0]?.cursor ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load activity workspace.");
    }
  }

  async function loadArtifactsWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactList(environmentId);
      setArtifacts(result.data);
      setSelectedArtifactId((current) => current ?? result.data[0]?.artifactId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifacts workspace.");
    }
  }

  async function loadArtifactDetail(artifactId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactDetail(artifactId, environmentId);
      setSelectedArtifact(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifact detail.");
    }
  }

  const selectedEvent = useMemo(
    () => environmentEvents.find((event) => event.cursor === selectedEventCursor) ?? null,
    [environmentEvents, selectedEventCursor]
  );

  const globalAttentionItems = useMemo<GlobalAttentionItem[]>(() => {
    if (!summary || !status) {
      return [];
    }

    const items: GlobalAttentionItem[] = [
      {
        id: "approvals-awaiting",
        label: "Approvals Awaiting",
        summary: "Governed actions are paused until explicit approval decisions are made.",
        value: summary.attention.approvalsAwaiting,
        workspace: "runtime",
        tone: summary.attention.approvalsAwaiting > 0 ? "warning" : "steady"
      },
      {
        id: "open-incidents",
        label: "Open Incidents",
        summary: "Failure and recovery obligations are active and remain durable operator work.",
        value: summary.attention.openIncidents,
        workspace: "incidents",
        tone: summary.attention.openIncidents > 0 ? "danger" : "steady"
      },
      {
        id: "blocked-work",
        label: "Blocked Work",
        summary: "Execution success is not enough; blocked workflow obligations still prevent closure.",
        value: summary.attention.blockedWork,
        workspace: "runtime",
        tone: summary.attention.blockedWork > 0 ? "warning" : "steady"
      },
      {
        id: "interrupted-turns",
        label: "Interrupted Turns",
        summary: "Structured conversation state contains interrupted or deferred turns that still matter.",
        value: summary.attention.interruptedTurns,
        workspace: "conversations",
        tone: summary.attention.interruptedTurns > 0 ? "warning" : "steady"
      },
      {
        id: "active-streams",
        label: "Active Streams",
        summary: "Observation is live and should remain legible across the environment, not buried in logs.",
        value: summary.attention.activeStreams,
        workspace: "artifacts",
        tone: summary.attention.activeStreams > 0 ? "active" : "steady"
      },
      {
        id: "runtime-posture",
        label: "Runtime Posture",
        summary:
          status.runtimeState === "recovering"
            ? "The runtime is recovering and needs direct attention before normal mutation resumes."
            : "The runtime is warm, but its current state still needs to remain governed and inspectable.",
        value: status.runtimeState === "recovering" ? 1 : 0,
        workspace: "runtime",
        tone: status.runtimeState === "recovering" ? "danger" : "active"
      },
      {
        id: "artifact-surface",
        label: "Artifact Surface",
        summary: "Recent durable outputs and evidence remain available as first-class engineering objects.",
        value: summary.recentArtifacts.length,
        workspace: "artifacts",
        tone: summary.recentArtifacts.length > 0 ? "active" : "steady"
      }
    ];

    return items.sort((left, right) => attentionToneWeight(right.tone) - attentionToneWeight(left.tone) || right.value - left.value);
  }, [status, summary]);

  const workspaceAttention = useMemo(() => {
    const base = new Map<WorkspaceId, { tone: "active" | "warning" | "danger" | "steady"; value: number }>();

    for (const workspace of workspaceOrder.filter((item) => item.primary)) {
      base.set(workspace.id, { tone: "steady", value: 0 });
    }

    for (const item of globalAttentionItems) {
      const current = base.get(canonicalWorkspace(item.workspace));
      if (!current) {
        continue;
      }

      const currentWeight = attentionToneWeight(current.tone);
      const nextWeight = attentionToneWeight(item.tone);
      if (nextWeight > currentWeight || (nextWeight === currentWeight && item.value > current.value)) {
        base.set(canonicalWorkspace(item.workspace), { tone: item.tone, value: item.value });
      }
    }

    return base;
  }, [globalAttentionItems]);

  const workspaceDescriptor = useMemo<WorkspaceDescriptor>(() => {
    switch (activeWorkspace) {
      case "environment":
        return {
          eyebrow: "Operate",
          title: "Operational Brief",
          summary: "Start from the environment, understand the active continuation, and move into the next supervised action without reconstructing the system from scattered panels."
        };
      case "conversations":
        return {
          eyebrow: "Conversations",
          title: "Thread Continuity",
          summary: "Conversations are durable work objects. Turns, approvals, incidents, and evidence stay attached to the active thread instead of being split into separate operational silos."
        };
      case "browser":
        return {
          eyebrow: "Browser",
          title: "Live System Browser",
          summary: "Browse the living Lisp environment through systems, packages, symbols, source, and governed artifacts instead of collapsing back into a file-first IDE."
        };
      case "configuration":
        return {
          eyebrow: "Configuration",
          title: "Desktop Preferences",
          summary: "Configuration should shape the desktop shell itself without turning into a buried afterthought beneath the operational journeys."
        };
      case "documentation":
        return {
          eyebrow: "Documentation",
          title: "User Documentation",
          summary: "Documentation belongs in its own workspace so the user can deliberately enter guidance when needed, while the rest of the desktop stays focused on operating surfaces."
        };
      case "runtime":
        return {
          eyebrow: "Execution",
          title: "Runtime And Governed Work",
          summary: "Execution brings runtime state, governed work, and approval consequences together so the user can act through one journey instead of hopping between adjacent queues."
        };
      case "incidents":
        return {
          eyebrow: "Recovery",
          title: "Incident And Restoration",
          summary: "Recovery is a journey: inspect failure, understand blocked work, review evidence, and drive the environment back toward trustworthy continuation."
        };
      case "artifacts":
        return {
          eyebrow: "Evidence",
          title: "Artifacts And Observation",
          summary: "Evidence combines durable artifacts with replayable event history so the user can inspect provenance and operational truth without leaving the current method."
        };
      default:
        return {
          eyebrow: "Workspace",
          title: labelForWorkspace(canonicalWorkspace(activeWorkspace)),
          summary: "This workspace remains aligned to the environment-first operating model."
        };
    }
  }, [activeWorkspace]);

  const workspaceResolution = useMemo<WorkspaceResolutionState | null>(() => {
    switch (canonicalWorkspace(activeWorkspace)) {
      case "conversations":
        if (!selectedThread) {
          return {
            label: "Resolving thread continuity",
            summary: "The desktop is selecting the active thread and turn so conversation continuity stays explicit.",
            tone: "warning"
          };
        }
        if (!selectedTurn) {
          return {
            label: "Resolving turn context",
            summary: "Turn detail is still being attached to the current thread continuation.",
            tone: "warning"
          };
        }
        return null;
      case "browser":
        if (!runtimeSummary) {
          return {
            label: "Resolving browser runtime",
            summary: "The browser is attaching to the current live image before source and symbols can be browsed.",
            tone: "warning"
          };
        }
        return null;
      case "runtime":
        if (!runtimeSummary) {
          return {
            label: "Resolving runtime posture",
            summary: "Execution is still attaching the live image, work state, and approval posture to the current objective.",
            tone: "warning"
          };
        }
        if (workItems.length > 0 && !selectedWorkItem) {
          return {
            label: "Resolving governed work",
            summary: "The current execution item is still being attached to workflow closure posture.",
            tone: "warning"
          };
        }
        return null;
      case "incidents":
        if (incidents.length > 0 && !selectedIncident) {
          return {
            label: "Resolving recovery context",
            summary: "Recovery is still attaching the selected incident to linked runtime and evidence context.",
            tone: "danger"
          };
        }
        return null;
      case "artifacts":
        if (artifacts.length > 0 && !selectedArtifact) {
          return {
            label: "Resolving evidence context",
            summary: "Durable evidence is still being attached to its producing context.",
            tone: "active"
          };
        }
        if (environmentEvents.length > 0 && !selectedEvent) {
          return {
            label: "Resolving event replay",
            summary: "Observation history is still selecting the current event payload for inspection.",
            tone: "active"
          };
        }
        return null;
      default:
        return null;
    }
  }, [
    activeWorkspace,
    artifacts.length,
    environmentEvents.length,
    incidents.length,
    runtimeSummary,
    selectedArtifact,
    selectedEvent,
    selectedIncident,
    selectedThread,
    selectedTurn,
    selectedWorkItem,
    workItems.length
  ]);

  async function navigateToWorkspace(workspace: WorkspaceId): Promise<void> {
    const nextWorkspace = canonicalWorkspace(workspace);
    setActiveWorkspace(nextWorkspace);
    await Promise.all([
      window.sbclAgentDesktop.desktop.focusWorkspace(nextWorkspace),
      window.sbclAgentDesktop.desktop.setDesktopPreferences({ lastWorkspace: nextWorkspace })
    ]);
  }

  async function toggleInspectorPinned(): Promise<void> {
    const nextPinned = !inspectorPinned;
    setInspectorPinned(nextPinned);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({ inspectorPinned: nextPinned });
  }

  async function applyThemePreference(nextThemePreference: ThemePreference): Promise<void> {
    setThemePreference(nextThemePreference);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      themePreference: nextThemePreference
    });
  }

  async function updateLispParenColor(index: number, color: string): Promise<void> {
    const nextColors = normalizeParenDepthColors(
      lispParenColors.map((currentColor, currentIndex) => (currentIndex === index ? color : currentColor))
    );
    setLispParenColors(nextColors);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lispCodeView: {
        parenDepthColors: nextColors
      }
    });
  }

  function toggleWorkspaceMenu(workspace: WorkspaceId): void {
    setExpandedWorkspaceMenus((current) => ({
      ...current,
      [workspace]: !current[workspace]
    }));
  }

  async function navigateToBrowserDomain(domain: BrowserDomain): Promise<void> {
    setSelectedBrowserDomain(domain);
    setExpandedWorkspaceMenus((current) => ({ ...current, browser: true }));
    await navigateToWorkspace("browser");
  }

  async function navigateToConfigurationSection(section: ConfigurationSection): Promise<void> {
    setSelectedConfigurationSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, configuration: true }));
    await navigateToWorkspace("configuration");
  }

  async function navigateToOperateSection(section: OperateSection): Promise<void> {
    setSelectedOperateSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, environment: true }));
    await navigateToWorkspace("environment");
  }

  async function navigateToConversationSection(section: ConversationSection): Promise<void> {
    setSelectedConversationSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, conversations: true }));
    await navigateToWorkspace("conversations");
  }

  async function navigateToExecutionSection(section: ExecutionSection): Promise<void> {
    setSelectedExecutionSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    await navigateToWorkspace("runtime");
  }

  async function navigateToRecoverySection(section: RecoverySection): Promise<void> {
    setSelectedRecoverySection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, incidents: true }));
    await navigateToWorkspace("incidents");
  }

  async function navigateToEvidenceSection(section: EvidenceSection): Promise<void> {
    setSelectedEvidenceSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, artifacts: true }));
    await navigateToWorkspace("artifacts");
  }

  return (
    <div className={inspectorPinned ? "desktop-shell" : "desktop-shell inspector-collapsed"}>
      <div className="window-drag-strip" aria-hidden="true">
        <div className="window-drag-label">sbcl-agent Desktop</div>
      </div>

      <div className="shell-glow shell-glow-left" />
      <div className="shell-glow shell-glow-right" />

      <header className="shell-header">
        <div className="shell-header-brand">
          <div className="brand-mark">SA</div>
          <div className="shell-header-copy">
            <p className="eyebrow">sbcl-agent Desktop</p>
            <strong>Environment Shell</strong>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {groupWorkspaces().map(([group, items]) => (
            <section className="workspace-group" key={group}>
              <p className="workspace-group-label">{group}</p>
              {items.map((workspace) => (
                <div className="workspace-tree-node" key={workspace.id}>
                  <div className={workspace.id === activeWorkspace ? "workspace-link active" : "workspace-link"}>
                    <button
                      className="workspace-link-main"
                      aria-keyshortcuts={workspace.primary ? String(keyboardWorkspaceOrder.indexOf(workspace.id) + 1) : undefined}
                      onClick={() => {
                        if (workspace.id === "environment") {
                          void navigateToOperateSection(selectedOperateSection);
                          return;
                        }
                        if (workspace.id === "conversations") {
                          void navigateToConversationSection(selectedConversationSection);
                          return;
                        }
                        if (workspace.id === "runtime") {
                          void navigateToExecutionSection(selectedExecutionSection);
                          return;
                        }
                        if (workspace.id === "incidents") {
                          void navigateToRecoverySection(selectedRecoverySection);
                          return;
                        }
                        if (workspace.id === "artifacts") {
                          void navigateToEvidenceSection(selectedEvidenceSection);
                          return;
                        }
                        if (workspace.id === "browser") {
                          void navigateToBrowserDomain(selectedBrowserDomain);
                          return;
                        }
                        if (workspace.id === "documentation") {
                          void navigateToWorkspace("documentation");
                          return;
                        }
                        if (workspace.id === "configuration") {
                          void navigateToConfigurationSection(selectedConfigurationSection);
                          return;
                        }
                        void navigateToWorkspace(workspace.id);
                      }}
                      type="button"
                    >
                      <span title={workspace.label === "Documentation" ? "Open the in-app user documentation workspace." : undefined}>
                        {workspace.label}
                      </span>
                    </button>
                    <div className="workspace-link-meta">
                      {workspace.id !== "environment" ? (
                        <WorkspaceSignal signal={workspaceAttention.get(workspace.id)} />
                      ) : null}
                      {workspace.id === "environment" ||
                      workspace.id === "conversations" ||
                      workspace.id === "runtime" ||
                      workspace.id === "incidents" ||
                      workspace.id === "artifacts" ||
                      workspace.id === "browser" ||
                      workspace.id === "documentation" ||
                      workspace.id === "configuration" ? (
                        <button
                          aria-label={`${expandedWorkspaceMenus[workspace.id] ? "Collapse" : "Expand"} ${workspace.label}`}
                          className="workspace-disclosure"
                          onClick={() => toggleWorkspaceMenu(workspace.id)}
                          type="button"
                        >
                          {expandedWorkspaceMenus[workspace.id] ? "▾" : "▸"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {workspace.id === "environment" && expandedWorkspaceMenus.environment ? (
                    <div className="workspace-child-list">
                      {operateSections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "environment" && selectedOperateSection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToOperateSection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "conversations" && expandedWorkspaceMenus.conversations ? (
                    <div className="workspace-child-list">
                      {conversationSections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "conversations" && selectedConversationSection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToConversationSection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "browser" && expandedWorkspaceMenus.browser ? (
                    <div className="workspace-child-list">
                      {browserDomains.map((domain) => (
                        <button
                          className={
                            activeWorkspace === "browser" && selectedBrowserDomain === domain.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={domain.id}
                          onClick={() => {
                            void navigateToBrowserDomain(domain.id);
                          }}
                          type="button"
                        >
                          <span title={domain.summary}>{domain.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "runtime" && expandedWorkspaceMenus.runtime ? (
                    <div className="workspace-child-list">
                      {executionSections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "runtime" && selectedExecutionSection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToExecutionSection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "incidents" && expandedWorkspaceMenus.incidents ? (
                    <div className="workspace-child-list">
                      {recoverySections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "incidents" && selectedRecoverySection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToRecoverySection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "artifacts" && expandedWorkspaceMenus.artifacts ? (
                    <div className="workspace-child-list">
                      {evidenceSections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "artifacts" && selectedEvidenceSection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToEvidenceSection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {workspace.id === "configuration" && expandedWorkspaceMenus.configuration ? (
                    <div className="workspace-child-list">
                      {configurationSections.map((section) => (
                        <button
                          className={
                            activeWorkspace === "configuration" && selectedConfigurationSection === section.id
                              ? "workspace-child-link active"
                              : "workspace-child-link"
                          }
                          key={section.id}
                          onClick={() => {
                            void navigateToConfigurationSection(section.id);
                          }}
                          type="button"
                        >
                          <span title={section.summary}>{section.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </nav>

      </aside>
      <main className="canvas">
        <header className="canvas-header">
          <div className="canvas-header-copy">
            <div className="canvas-header-eyebrow-row">
              <p className="eyebrow">{workspaceDescriptor.eyebrow}</p>
              <HelpHint text={workspaceDescriptor.summary} />
            </div>
            <h2>{workspaceDescriptor.title}</h2>
            <p className="canvas-subtitle">{workspaceDescriptor.summary}</p>
          </div>
        </header>

        {activeWorkspace === "environment" || activeWorkspace === "browser" || activeWorkspace === "configuration" || activeWorkspace === "runtime" ? null : (
          <section className="panel workspace-context-brief">
            <div className="signal-digest-grid execution-objective-digest">
              <div className="signal-digest-card">
                <span className="context-label">Environment</span>
                <strong>{summary?.environmentLabel ?? "Unbound"}</strong>
                <p>{summary?.activeContext.environmentRoot ?? binding?.environmentId ?? "No environment root bound."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Thread</span>
                <strong>{summary?.activeContext.currentThreadTitle ?? "No active thread"}</strong>
                <p>{summary?.activeContext.focusSummary ?? "No active continuation summary."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Runtime</span>
                <strong>{summary?.activeContext.runtimePackage ?? status?.runtimeState ?? "unknown"}</strong>
                <p>{status?.workflowState ?? "No workflow state available."}</p>
              </div>
            </div>
          </section>
        )}

        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        <section className={isWorkspaceTransitioning ? "workspace-frame transitioning" : "workspace-frame"}>
          <WorkspaceTransitionBanner
            activeWorkspace={canonicalWorkspace(activeWorkspace)}
            isTransitioning={isWorkspaceTransitioning}
            resolution={workspaceResolution}
          />
          {activeWorkspace === "environment" ? (
            <OperateWorkspace
              artifacts={artifacts}
              navigateToBrowserDomain={navigateToBrowserDomain}
              navigateToConversationSection={navigateToConversationSection}
              navigateToEvidenceSection={navigateToEvidenceSection}
              navigateToExecutionSection={navigateToExecutionSection}
              navigateToRecoverySection={navigateToRecoverySection}
              selectedSection={selectedOperateSection}
              approvalRequests={approvalRequests}
              incidents={incidents}
              selectedApproval={selectedApproval}
              status={status}
              summary={summary}
              workItems={workItems}
            />
          ) : activeWorkspace === "conversations" ? (
            <ConversationsWorkspace
              conversationDraft={conversationDraft}
              selectedSection={selectedConversationSection}
              selectedThread={selectedThread}
              selectedThreadId={selectedThreadId}
              selectedTurn={selectedTurn}
              selectedTurnId={selectedTurnId}
              setConversationDraft={setConversationDraft}
              setSelectedThreadId={setSelectedThreadId}
              setSelectedTurnId={setSelectedTurnId}
              threads={threads}
            />
          ) : activeWorkspace === "browser" ? (
            <BrowserWorkspace
              approvalRequests={approvalRequests}
              artifacts={artifacts}
              browseRuntimeEntity={browseRuntimeEntity}
              incidents={incidents}
              inspectRuntimeSymbol={inspectRuntimeSymbol}
              isInspectingRuntime={isInspectingRuntime}
              navigateToWorkspace={navigateToWorkspace}
              parenDepthColors={lispParenColors}
              packageBrowser={packageBrowser}
              conversationDraft={conversationDraft}
              runtimeEntityDetail={runtimeEntityDetail}
              runtimeForm={runtimeForm}
              setConversationDraft={setConversationDraft}
              setRuntimeForm={setRuntimeForm}
              selectedThread={selectedThread}
              selectedThreadId={selectedThreadId}
              selectedPackageName={selectedPackageName}
              setSelectedPackageName={setSelectedPackageName}
              setSelectedThreadId={setSelectedThreadId}
              loadSourcePreview={loadSourcePreview}
              runtimeInspection={runtimeInspection}
              runtimeInspectionMode={runtimeInspectionMode}
              runtimeInspectorPackage={runtimeInspectorPackage}
              runtimeInspectorSymbol={runtimeInspectorSymbol}
              runtimeSummary={runtimeSummary}
              selectedDomain={selectedBrowserDomain}
              setRuntimeInspectionMode={updateRuntimeInspectionMode}
              setRuntimeInspectorPackage={updateRuntimeInspectorPackage}
              setRuntimeInspectorSymbol={updateRuntimeInspectorSymbol}
              sourcePreview={sourcePreview}
              sourceDraft={sourceDraft}
              setSourceDraft={setSourceDraft}
              isEditingSource={isEditingSource}
              setIsEditingSource={setIsEditingSource}
              isStagingSource={isStagingSource}
              isReloadingSource={isReloadingSource}
              sourceMutationResult={sourceMutationResult}
              sourceReloadResult={sourceReloadResult}
              stageSourceChange={stageSourceChange}
              threads={threads}
              reloadSourceFile={reloadSourceFile}
              workItems={workItems}
            />
          ) : activeWorkspace === "documentation" ? (
            <DocumentationWorkspace
              documentationPages={documentationPages}
              openPublishedDocumentation={() =>
                window.sbclAgentDesktop.desktop.openExternalLink(PUBLISHED_DOCUMENTATION_URL)
              }
              selectedDocumentationPage={selectedDocumentationPage}
              selectedDocumentationSlug={selectedDocumentationSlug}
              setSelectedDocumentationSlug={setSelectedDocumentationSlug}
              loadDocumentationPage={loadDocumentationPage}
            />
          ) : activeWorkspace === "configuration" ? (
            <ConfigurationWorkspace
              lispParenColors={lispParenColors}
              resolvedTheme={resolvedTheme}
              selectedSection={selectedConfigurationSection}
              systemTheme={systemTheme}
              themePreference={themePreference}
              updateThemePreference={applyThemePreference}
              updateLispParenColor={updateLispParenColor}
            />
          ) : activeWorkspace === "runtime" ? (
            selectedExecutionSection === "approvals" ? (
              <ApprovalsWorkspace
                approvalDecision={approvalDecision}
                approvalRequests={approvalRequests}
                isDecidingApproval={isDecidingApproval}
                selectedApproval={selectedApproval}
                selectedApprovalId={selectedApprovalId}
                setSelectedApprovalId={setSelectedApprovalId}
                submitApprovalDecision={submitApprovalDecision}
              />
            ) : selectedExecutionSection === "work" ? (
              <WorkWorkspace
                selectedWorkItem={selectedWorkItem}
                selectedWorkflowRecord={selectedWorkflowRecord}
                selectedWorkItemId={selectedWorkItemId}
                setSelectedWorkItemId={setSelectedWorkItemId}
                workItems={workItems}
              />
            ) : (
              <ExecutionWorkspace
                approvalRequests={approvalRequests}
                evaluateRuntimeForm={evaluateRuntimeForm}
                isEvaluating={isEvaluating}
                inspectRuntimeSymbol={inspectRuntimeSymbol}
                isInspectingRuntime={isInspectingRuntime}
                runtimeInspection={runtimeInspection}
                runtimeInspectionMode={runtimeInspectionMode}
                runtimeInspectorPackage={runtimeInspectorPackage}
                runtimeInspectorSymbol={runtimeInspectorSymbol}
                runtimeForm={runtimeForm}
                runtimeResult={runtimeResult}
                runtimeSummary={runtimeSummary}
                setRuntimeInspectionMode={updateRuntimeInspectionMode}
                setRuntimeInspectorPackage={updateRuntimeInspectorPackage}
                setRuntimeInspectorSymbol={updateRuntimeInspectorSymbol}
                selectedWorkItem={selectedWorkItem}
                selectedWorkItemId={selectedWorkItemId}
                selectedWorkflowRecord={selectedWorkflowRecord}
                setRuntimeForm={setRuntimeForm}
                workItems={workItems}
              />
            )
          ) : activeWorkspace === "incidents" ? (
            <IncidentsWorkspace
              incidents={incidents}
              selectedIncident={selectedIncident}
              selectedIncidentId={selectedIncidentId}
              setSelectedIncidentId={setSelectedIncidentId}
            />
          ) : activeWorkspace === "artifacts" ? (
            selectedEvidenceSection === "observation" ? (
              <ActivityWorkspace
                eventFamilyFilter={eventFamilyFilter}
                eventVisibilityFilter={eventVisibilityFilter}
                events={environmentEvents}
                selectedEvent={selectedEvent}
                selectedEventCursor={selectedEventCursor}
                setEventFamilyFilter={setEventFamilyFilter}
                setEventVisibilityFilter={setEventVisibilityFilter}
                setSelectedEventCursor={setSelectedEventCursor}
              />
            ) : selectedEvidenceSection === "artifacts" ? (
              <ArtifactsWorkspace
                artifacts={artifacts}
                selectedArtifact={selectedArtifact}
                selectedArtifactId={selectedArtifactId}
                setSelectedArtifactId={setSelectedArtifactId}
              />
            ) : (
              <EvidenceWorkspace
                artifacts={artifacts}
                eventFamilyFilter={eventFamilyFilter}
                eventVisibilityFilter={eventVisibilityFilter}
                events={environmentEvents}
                selectedArtifact={selectedArtifact}
                selectedArtifactId={selectedArtifactId}
                selectedEvent={selectedEvent}
                selectedEventCursor={selectedEventCursor}
                setEventFamilyFilter={setEventFamilyFilter}
                setEventVisibilityFilter={setEventVisibilityFilter}
                setSelectedArtifactId={setSelectedArtifactId}
                setSelectedEventCursor={setSelectedEventCursor}
              />
            )
          ) : (
            <PlannedWorkspace workspaceId={activeWorkspace} />
          )}
        </section>
      </main>

      {inspectorPinned ? (
        <WorkspaceInspector
          activeWorkspace={activeWorkspace}
          artifacts={artifacts}
          binding={binding}
          conversationDraft={conversationDraft}
          environmentEvents={environmentEvents}
          runtimeForm={runtimeForm}
          runtimeInspection={runtimeInspection}
          runtimeSummary={runtimeSummary}
          selectedApproval={selectedApproval}
          selectedArtifact={selectedArtifact}
          selectedConversationSection={selectedConversationSection}
          selectedDocumentationPage={selectedDocumentationPage}
          selectedEvidenceSection={selectedEvidenceSection}
          selectedEvent={selectedEvent}
          selectedIncident={selectedIncident}
          selectedOperateSection={selectedOperateSection}
          selectedThread={selectedThread}
          selectedTurn={selectedTurn}
          selectedWorkItem={selectedWorkItem}
          selectedWorkflowRecord={selectedWorkflowRecord}
          sourcePreview={sourcePreview}
          status={status}
          summary={summary}
          workItems={workItems}
        />
      ) : null}

      <StatusDock
        activeWorkspace={activeWorkspace}
        binding={binding}
        hostStatus={hostStatus}
        inspectorPinned={inspectorPinned}
        onToggleInspector={() => void toggleInspectorPinned()}
        status={status}
      />
    </div>
  );
}

function WorkspaceTransitionBanner({
  activeWorkspace,
  isTransitioning,
  resolution
}: {
  activeWorkspace: WorkspaceId;
  isTransitioning: boolean;
  resolution: WorkspaceResolutionState | null;
}) {
  if (!isTransitioning && !resolution) {
    return null;
  }

  const tone = resolution?.tone ?? "active";
  const label = resolution?.label ?? `Opening ${labelForWorkspace(activeWorkspace)}`;
  const summary =
    resolution?.summary ??
    "The shell is carrying the current continuation into the selected journey.";

  return (
    <section className={`workspace-transition-banner tone-${tone}`}>
      <div className="workspace-transition-copy">
        <p className="eyebrow">Journey Transition</p>
        <strong>{label}</strong>
        <p>{summary}</p>
      </div>
      <div className="workspace-transition-meta">
        <Badge tone={tone}>{labelForWorkspace(activeWorkspace)}</Badge>
        {isTransitioning ? <span className="workspace-transition-pulse" aria-hidden="true" /> : null}
      </div>
    </section>
  );
}

function WorkspaceInspector({
  activeWorkspace,
  binding,
  summary,
  status,
  selectedThread,
  selectedTurn,
  conversationDraft,
  selectedConversationSection,
  runtimeSummary,
  runtimeInspection,
  runtimeForm,
  sourcePreview,
  selectedApproval,
  selectedWorkItem,
  selectedWorkflowRecord,
  selectedIncident,
  selectedArtifact,
  selectedEvent,
  selectedOperateSection,
  selectedDocumentationPage,
  selectedEvidenceSection,
  artifacts,
  environmentEvents,
  workItems
}: {
  activeWorkspace: WorkspaceId;
  binding: BindingDto | null;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  selectedThread: ThreadDetailDto | null;
  selectedTurn: TurnDetailDto | null;
  conversationDraft: string;
  selectedConversationSection: ConversationSection;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeForm: string;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  selectedApproval: ApprovalRequestDto | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  selectedIncident: IncidentDetailDto | null;
  selectedArtifact: ArtifactDetailDto | null;
  selectedEvent: EnvironmentEventDto | null;
  selectedOperateSection: OperateSection;
  selectedDocumentationPage: DocumentationPageDto | null;
  selectedEvidenceSection: EvidenceSection;
  artifacts: ArtifactSummaryDto[];
  environmentEvents: EnvironmentEventDto[];
  workItems: WorkItemSummaryDto[];
}) {
  const currentFocusTitle =
    activeWorkspace === "conversations"
      ? selectedTurn?.title ?? selectedThread?.title ?? "No conversation focus"
      : activeWorkspace === "browser"
        ? runtimeInspection?.data.symbol ?? sourcePreview?.data.path ?? runtimeSummary?.currentPackage ?? "No browser focus"
      : activeWorkspace === "runtime"
          ? selectedWorkItem?.title ?? selectedApproval?.title ?? runtimeSummary?.currentPackage ?? "Listener"
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.title ?? "User Documentation"
          : activeWorkspace === "incidents"
            ? selectedIncident?.title ?? "No incident selected"
            : activeWorkspace === "artifacts"
              ? selectedEvidenceSection === "observation"
                ? selectedEvent?.kind ?? "No event selected"
                : selectedArtifact?.title ?? "No artifact selected"
              : activeWorkspace === "configuration"
                ? "Desktop Preferences"
                : summary?.activeContext.currentThreadTitle ?? summary?.environmentLabel ?? "Environment";

  const currentFocusSummary =
    activeWorkspace === "conversations"
      ? selectedTurn?.summary ?? selectedThread?.summary ?? "Select a thread or turn to inspect structured conversation state."
      : activeWorkspace === "browser"
        ? runtimeInspection?.data.summary ??
          sourcePreview?.data.summary ??
          "Inspect packages, symbols, source, and governed attachments from one live system view."
        : activeWorkspace === "runtime"
          ? selectedWorkItem?.waitingReason ??
            selectedApproval?.consequenceSummary ??
            runtimeSummary?.divergencePosture ??
            "Listener, approval, and work context should stay attached to one execution surface."
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.summary ??
              "Use the documentation workspace when you want the conceptual model, workflow guidance, or workspace reference without crowding the operating surfaces."
          : activeWorkspace === "incidents"
            ? selectedIncident?.recoverySummary ?? "Recovery context appears here once an incident is selected."
            : activeWorkspace === "artifacts"
              ? selectedEvidenceSection === "observation"
                ? selectedEvent?.summary ?? "Select an event to inspect replayable evidence."
                : selectedArtifact?.summary ?? "Select an artifact to inspect provenance and evidentiary posture."
              : activeWorkspace === "configuration"
                ? "Theme and desktop preferences belong here, not hidden behind shell scaffolding."
                : summary?.activeContext.focusSummary ?? "Environment posture is not yet available.";

  return (
    <aside className="inspector">
      <section className="inspector-card">
        <p className="eyebrow">Current Focus</p>
        <h3>{currentFocusTitle}</h3>
        <p className="inspector-copy">{currentFocusSummary}</p>
        <dl className="detail-list">
          <DetailRow label="Workspace" value={labelForWorkspace(activeWorkspace)} />
          <DetailRow label="Binding" value={binding?.environmentId ?? "unbound"} />
          <DetailRow label="Runtime" value={summary?.activeContext.runtimePackage ?? status?.runtimeState ?? "unknown"} />
          <DetailRow label="Workflow" value={status?.workflowState ?? "unknown"} />
        </dl>
      </section>

      {activeWorkspace === "environment" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">Environment Context</p>
            <h3>{selectedOperateSection === "journeys" ? "Dominant Journeys" : "Orientation"}</h3>
            <div className="entity-list">
              <div className="entity-row">
                <div>
                  <strong>{summary?.activeContext.currentThreadTitle ?? "No active thread"}</strong>
                  <p>{summary?.activeContext.focusSummary ?? "No current continuation summary."}</p>
                </div>
              </div>
              <div className="entity-row">
                <div>
                  <strong>{summary?.activeWorkers[0]?.label ?? "No active worker"}</strong>
                  <p>{summary?.activeWorkers[0]?.responsibility ?? "Actors appear here when the environment exposes them."}</p>
                </div>
              </div>
            </div>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Open Pressure</p>
            <h3>What Still Matters</h3>
            <dl className="detail-list">
              <DetailRow label="Approvals" value={String(summary?.attention.approvalsAwaiting ?? 0)} />
              <DetailRow label="Incidents" value={String(summary?.attention.openIncidents ?? 0)} />
              <DetailRow label="Blocked Work" value={String(summary?.attention.blockedWork ?? 0)} />
              <DetailRow label="Artifacts" value={String(summary?.recentArtifacts.length ?? 0)} />
            </dl>
          </section>
        </>
      ) : null}

      {activeWorkspace === "conversations" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">Conversation Context</p>
            <h3>{selectedConversationSection === "draft" ? "Draft Continuation" : "Selected Thread"}</h3>
            <dl className="detail-list">
              <DetailRow label="Thread" value={selectedThread?.title ?? "No thread selected"} />
              <DetailRow label="State" value={selectedThread?.state ?? "idle"} />
              <DetailRow label="Turns" value={String(selectedThread?.turns.length ?? 0)} />
              <DetailRow label="Linked Entities" value={String(selectedThread?.linkedEntities.length ?? 0)} />
            </dl>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Turn Detail</p>
            <h3>{selectedTurn?.title ?? "No turn selected"}</h3>
            {selectedConversationSection === "draft" ? (
              <pre className="runtime-preview">{conversationDraft || "No draft continuation prepared."}</pre>
            ) : (
              <dl className="detail-list">
                <DetailRow label="Turn State" value={selectedTurn?.state ?? "idle"} />
                <DetailRow label="Operations" value={String(selectedTurn?.operationIds.length ?? 0)} />
                <DetailRow label="Artifacts" value={String(selectedTurn?.artifactIds.length ?? 0)} />
                <DetailRow label="Approvals" value={String(selectedTurn?.approvalIds.length ?? 0)} />
              </dl>
            )}
          </section>
        </>
      ) : null}

      {activeWorkspace === "browser" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">Browser Context</p>
            <h3>{runtimeInspection?.data.symbol ?? runtimeSummary?.currentPackage ?? "No entity selected"}</h3>
            <dl className="detail-list">
              <DetailRow label="Package" value={runtimeInspection?.data.packageName ?? runtimeSummary?.currentPackage ?? "unknown"} />
              <DetailRow label="Mode" value={runtimeInspection?.data.mode ?? "browse"} />
              <DetailRow label="Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
              <DetailRow label="Scopes" value={String(runtimeSummary?.scopes.length ?? 0)} />
            </dl>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Source And Governance</p>
            <h3>{sourcePreview?.data.path ? "Source Attached" : "No Source Open"}</h3>
            <dl className="detail-list">
              <DetailRow label="Source" value={sourcePreview?.data.path ?? "No source artifact selected"} />
              <DetailRow label="Focus Line" value={String(sourcePreview?.data.focusLine ?? 0)} />
              <DetailRow label="Work Items" value={String(workItems.length)} />
              <DetailRow label="Artifacts" value={String(artifacts.length)} />
            </dl>
          </section>
        </>
      ) : null}

      {activeWorkspace === "runtime" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">Listener Context</p>
            <h3>{runtimeSummary?.currentPackage ?? "SBCL Listener"}</h3>
            <dl className="detail-list">
              <DetailRow label="Loaded Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
              <DetailRow label="Pending Approval" value={selectedApproval?.title ?? "None"} />
              <DetailRow label="Selected Work" value={selectedWorkItem?.title ?? "None"} />
              <DetailRow label="Closure" value={selectedWorkflowRecord?.closureReadiness ?? "unknown"} />
            </dl>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Prefilled Form</p>
            <h3>Execution Input</h3>
            <pre className="runtime-preview">{runtimeForm || "No listener form prepared."}</pre>
          </section>
        </>
      ) : null}

      {activeWorkspace === "incidents" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">Recovery Context</p>
            <h3>{selectedIncident?.title ?? "No incident selected"}</h3>
            <dl className="detail-list">
              <DetailRow label="Severity" value={selectedIncident?.severity ?? "clear"} />
              <DetailRow label="Recovery State" value={selectedIncident?.recoveryState ?? "idle"} />
              <DetailRow label="Artifacts" value={String(selectedIncident?.artifactIds.length ?? 0)} />
              <DetailRow label="Linked Entities" value={String(selectedIncident?.linkedEntities.length ?? 0)} />
            </dl>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Next Action</p>
            <h3>Recovery Move</h3>
            <p className="inspector-copy">{selectedIncident?.nextAction ?? "Select an incident to see the current recovery move."}</p>
          </section>
        </>
      ) : null}

      {activeWorkspace === "artifacts" ? (
        <>
          <section className="inspector-card">
            <p className="eyebrow">{selectedEvidenceSection === "observation" ? "Observed Event" : "Selected Artifact"}</p>
            <h3>{selectedEvidenceSection === "observation" ? selectedEvent?.kind ?? "No event selected" : selectedArtifact?.title ?? "No artifact selected"}</h3>
            <dl className="detail-list">
              {selectedEvidenceSection === "observation" ? (
                <>
                  <DetailRow label="Cursor" value={String(selectedEvent?.cursor ?? 0)} />
                  <DetailRow label="Family" value={selectedEvent?.family ?? "unknown"} />
                  <DetailRow label="Visibility" value={selectedEvent?.visibility ?? "unspecified"} />
                  <DetailRow label="Events" value={String(environmentEvents.length)} />
                </>
              ) : (
                <>
                  <DetailRow label="Kind" value={selectedArtifact?.kind ?? "unknown"} />
                  <DetailRow label="State" value={selectedArtifact?.state ?? "unknown"} />
                  <DetailRow label="Authority" value={selectedArtifact?.authority ?? "unknown"} />
                  <DetailRow label="Artifacts" value={String(artifacts.length)} />
                </>
              )}
            </dl>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">Provenance</p>
            <h3>Why It Matters</h3>
            <p className="inspector-copy">
              {selectedEvidenceSection === "observation"
                ? selectedEvent?.summary ?? "Select an event to inspect its evidentiary role."
                : selectedArtifact?.provenance ?? "Select an artifact to inspect provenance."}
            </p>
          </section>
        </>
      ) : null}

      {activeWorkspace === "configuration" ? (
        <section className="inspector-card">
          <p className="eyebrow">Configuration Context</p>
          <h3>Desktop Preferences</h3>
          <p className="inspector-copy">
            Configuration should stay concise: current preference, resolved behavior, and any environment-level effect.
          </p>
        </section>
      ) : null}

      {activeWorkspace === "documentation" ? (
        <section className="inspector-card">
          <p className="eyebrow">Documentation Context</p>
          <h3>{selectedDocumentationPage?.title ?? "User Documentation"}</h3>
          <p className="inspector-copy">
            {selectedDocumentationPage?.summary ??
              "Documentation is deliberate and separate from the operational workspaces so learning material stays available without competing with active engineering surfaces."}
          </p>
        </section>
      ) : null}
    </aside>
  );
}

function ConfigurationWorkspace({
  selectedSection,
  themePreference,
  lispParenColors,
  resolvedTheme,
  systemTheme,
  updateLispParenColor,
  updateThemePreference
}: {
  selectedSection: ConfigurationSection;
  themePreference: ThemePreference;
  lispParenColors: string[];
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  updateLispParenColor: (index: number, color: string) => Promise<void>;
  updateThemePreference: (value: ThemePreference) => Promise<void>;
}) {
  const selectedDescriptor =
    configurationSections.find((section) => section.id === selectedSection) ?? configurationSections[0];

  return (
    <div className="configuration-journey">
      <div className="configuration-layout">
        <section className="configuration-pane panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Configuration Workspace</p>
              <h3>{selectedDescriptor.label}</h3>
            </div>
            <Badge tone="active">{themePreference}</Badge>
          </div>
          <p className="lead-copy">{selectedDescriptor.summary}</p>

          <section className="configuration-section">
            <PanelHeader
              title="Theme"
              subtitle="The shell should support an extensible theme system and follow the operating system when System is selected."
              helpText="Use this when the shell should follow macOS appearance or when you need to pin the desktop to a stable light or dark presentation."
            />
            <div className="configuration-theme-grid">
              <div className="signal-digest-card">
                <span className="context-label">Current Preference</span>
                <strong>{themePreference === "system" ? "System Theme" : `${themePreference} theme`}</strong>
                <p>Choose whether the desktop follows macOS or pins itself to an explicit appearance.</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Resolved Theme</span>
                <strong>{resolvedTheme === "light" ? "Light" : "Dark"}</strong>
                <p>The shell currently renders using the resolved palette that is active in the renderer.</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">System Signal</span>
                <strong>{systemTheme === "light" ? "Light" : "Dark"}</strong>
                <p>When System Theme is selected, this macOS preference becomes the active desktop palette.</p>
              </div>
            </div>
            <div className="configuration-theme-actions" role="group" aria-label="Theme preference">
              <button
                className={themePreference === "system" ? "starter-chip active" : "starter-chip"}
                onClick={() => void updateThemePreference("system")}
                type="button"
                title="Follow the operating system appearance."
              >
                System
              </button>
              <button
                className={themePreference === "light" ? "starter-chip active" : "starter-chip"}
                onClick={() => void updateThemePreference("light")}
                type="button"
                title="Keep the desktop in the light theme."
              >
                Light
              </button>
              <button
                className={themePreference === "dark" ? "starter-chip active" : "starter-chip"}
                onClick={() => void updateThemePreference("dark")}
                type="button"
                title="Keep the desktop in the dark theme."
              >
                Dark
              </button>
            </div>
            <div className="configuration-preview-grid">
              <div className="configuration-preview-card">
                <p className="eyebrow">Shell Preview</p>
                <strong>Panels, chips, tables, and editors inherit this theme.</strong>
                <p>
                  This first pass establishes the preference model so additional named themes can be added without
                  changing the configuration structure.
                </p>
              </div>
              <div className="configuration-preview-card">
                <p className="eyebrow">System Behavior</p>
                <strong>System Theme follows `prefers-color-scheme`.</strong>
                <p>
                  On your current macOS setup that should resolve to the light theme whenever the OS appearance is
                  set to light.
                </p>
              </div>
            </div>
          </section>

          <section className="configuration-section">
            <PanelHeader
              title="Lisp Code View"
              subtitle="Common Lisp source should render as structured code with depth-aware delimiter colorization rather than plain text."
              helpText="These settings affect Lisp-aware source presentation in browser and execution surfaces. They do not change source formatting in the runtime itself."
            />
            <div className="configuration-theme-grid">
              <div className="signal-digest-card">
                <span className="context-label">Code Surface</span>
                <strong>Structured Lisp Renderer</strong>
                <p>Browser source panes and Lisp form previews render with syntax emphasis, line structure, and rainbow delimiters.</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Delimiter Depth</span>
                <strong>{lispParenColors.length} configured levels</strong>
                <p>Each nested parenthesis depth can be assigned its own color and cycles once the configured palette is exhausted.</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Persistence</span>
                <strong>Desktop Preference</strong>
                <p>The code-view palette is saved in desktop preferences so the renderer comes back with the same Lisp color model on relaunch.</p>
              </div>
            </div>
            <div className="configuration-code-colors" role="group" aria-label="Parenthesis depth colors">
              {normalizeParenDepthColors(lispParenColors).map((color, index) => (
                <label className="configuration-color-control" key={`paren-depth:${index + 1}`}>
                  <span>{`Depth ${index + 1}`}</span>
                  <input
                    className="configuration-color-input"
                    onChange={(event) => void updateLispParenColor(index, event.target.value)}
                    type="color"
                    value={color}
                  />
                </label>
              ))}
            </div>
            <div className="configuration-code-preview">
              <LispCodeBlock code={LISP_CONFIGURATION_SAMPLE} parenDepthColors={lispParenColors} />
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}

function PlannedWorkspace({ workspaceId }: { workspaceId: WorkspaceId }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Planned Workspace</p>
      <h3>{labelForWorkspace(workspaceId)}</h3>
      <p>
        This workspace is intentionally present in navigation now so the shell is built around the full environment
        model, not around one temporary slice.
      </p>
    </div>
  );
}

function DocumentationWorkspace({
  documentationPages,
  selectedDocumentationSlug,
  selectedDocumentationPage,
  setSelectedDocumentationSlug,
  loadDocumentationPage,
  openPublishedDocumentation
}: {
  documentationPages: DocumentationPageSummaryDto[];
  selectedDocumentationSlug: string;
  selectedDocumentationPage: DocumentationPageDto | null;
  setSelectedDocumentationSlug: (value: string) => void;
  loadDocumentationPage: (slug: string) => Promise<void>;
  openPublishedDocumentation: () => Promise<void>;
}) {
  const renderedDocumentationHtml = useMemo(
    () => renderDocumentationMarkdown(selectedDocumentationPage?.markdown ?? ""),
    [selectedDocumentationPage?.markdown]
  );

  return (
    <div className="documentation-workspace">
      <section className="panel documentation-table-panel">
        <PanelHeader
          title="Documentation Pages"
          subtitle="Enter documentation deliberately here when you need conceptual guidance, workflow explanation, or workspace reference."
          helpText="This workspace keeps user-facing guidance separate from the active engineering surfaces so documentation remains available without competing for attention."
        />
        <BrowserDataTable
          key="desktop-documentation"
          columnTemplate="minmax(0, 1fr) minmax(0, 0.72fr) minmax(0, 1.8fr)"
          columns={[
            {
              id: "title",
              label: "Title",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title
            },
            {
              id: "category",
              label: "Category",
              render: (row) => <Badge tone="active">{row.category}</Badge>,
              sortValue: (row) => row.category,
              searchValue: (row) => row.category
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => `${row.title} ${row.category} ${row.summary}`
            }
          ]}
          emptyMessage="No documentation pages are available."
          filterLabel="Category"
          filterOptions={Array.from(new Set(documentationPages.map((page) => page.category))).map((value) => ({
            label: value,
            value
          }))}
          getFilterValue={(row) => row.category}
          getRowKey={(row) => row.slug}
          onSelect={(row) => {
            setSelectedDocumentationSlug(row.slug);
            void loadDocumentationPage(row.slug);
          }}
          rows={documentationPages}
          searchPlaceholder="Search documentation"
          selectedKey={selectedDocumentationSlug}
        />
      </section>

      {selectedDocumentationPage ? (
        <section className="panel documentation-detail-panel">
          <PanelHeader
            title={selectedDocumentationPage.title}
            subtitle="Read the selected documentation below the page list so navigation stays dense and the reading surface stays deliberate."
            helpText="Use the table above to move between conceptual guides, workspace references, and operational help without changing the rest of the desktop layout."
          />
          <div className="documentation-detail-topbar">
            <Badge tone="active">{selectedDocumentationPage.category}</Badge>
            <button
              className="starter-chip"
              onClick={() => void openPublishedDocumentation()}
              type="button"
              title="Open the published GitHub Pages version of the same documentation set."
            >
              Open Published Site
            </button>
          </div>
          <article
            className="documentation-markdown"
            dangerouslySetInnerHTML={{ __html: renderedDocumentationHtml }}
          />
        </section>
      ) : (
        <section className="panel documentation-detail-panel">
          <div className="empty-state">
            <p className="eyebrow">Documentation</p>
            <h3>No page selected</h3>
            <p>Select a documentation page from the table to read it here.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function JourneyStageStrip({
  eyebrow,
  title,
  summary,
  steps
}: {
  eyebrow: string;
  title: string;
  summary: string;
  steps: JourneyStep[];
}) {
  return (
    <section className="panel journey-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <p className="panel-subtitle">{summary}</p>
      <div className="journey-step-grid">
        {steps.map((step, index) => (
          <article className={`journey-step journey-step-${step.tone}`} key={step.id}>
            <div className="journey-step-top">
              <span className="journey-step-index">0{index + 1}</span>
              <Badge tone={step.tone}>{step.title}</Badge>
            </div>
            <strong>{step.title}</strong>
            <p>{step.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OperateWorkspace({
  artifacts,
  navigateToBrowserDomain,
  navigateToConversationSection,
  navigateToEvidenceSection,
  navigateToExecutionSection,
  navigateToRecoverySection,
  selectedSection,
  summary,
  status,
  approvalRequests,
  incidents,
  workItems,
  selectedApproval
}: {
  artifacts: ArtifactSummaryDto[];
  navigateToBrowserDomain: (domain: BrowserDomain) => Promise<void>;
  navigateToConversationSection: (section: ConversationSection) => Promise<void>;
  navigateToEvidenceSection: (section: EvidenceSection) => Promise<void>;
  navigateToExecutionSection: (section: ExecutionSection) => Promise<void>;
  navigateToRecoverySection: (section: RecoverySection) => Promise<void>;
  selectedSection: OperateSection;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  approvalRequests: ApprovalRequestSummaryDto[];
  incidents: IncidentSummaryDto[];
  workItems: WorkItemSummaryDto[];
  selectedApproval: ApprovalRequestDto | null;
}) {
  if (!summary || !status) {
    return (
      <div className="empty-state">
        <p className="eyebrow">No Environment Bound</p>
        <h3>The shell is ready for an explicit binding.</h3>
      </div>
    );
  }
  function toneForIncidentState(severity: IncidentSummaryDto["severity"]): "active" | "warning" | "danger" | "steady" {
    return severity === "critical" || severity === "high" ? "danger" : severity === "moderate" ? "warning" : "steady";
  }

  function toneForWorkState(state: WorkItemSummaryDto["state"]): "active" | "warning" | "danger" | "steady" {
    return state === "blocked" || state === "quarantined" ? "warning" : state === "active" ? "active" : "steady";
  }

  const orientationRows = [
    {
      key: "binding",
      record: "Current Binding",
      domain: "environment",
      entity: summary.environmentLabel,
      impact: summary.activeContext.focusSummary,
      nextAction: "inspect environment",
      targetWorkspace: "browser" as WorkspaceId,
      tone: status.connectionState === "bound" ? ("active" as const) : ("warning" as const),
      detail: "Verify the current environment root, runtime identity, and active continuation before drilling into a narrower workspace.",
      facts: [
        ["Environment", summary.environmentId],
        ["Connection", status.connectionState],
        ["Host", status.hostState],
        ["Last Update", status.lastUpdatedAt]
      ]
    },
    {
      key: "runtime",
      record: "Runtime Posture",
      domain: "runtime",
      entity: summary.activeContext.runtimePackage ?? summary.activeContext.runtimeLabel,
      impact: summary.imagePosture.summary,
      nextAction: "open listener",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: status.runtimeState === "recovering" ? ("danger" as const) : ("active" as const),
      detail: "Use this surface to move directly into live evaluation or browser inspection at the currently active package and image posture.",
      facts: [
        ["Runtime", summary.activeContext.runtimeLabel],
        ["Package", summary.activeContext.runtimePackage ?? "unknown"],
        ["State", status.runtimeState],
        ["Workflow", status.workflowState]
      ]
    },
    {
      key: "continuation",
      record: "Active Continuation",
      domain: "conversation",
      entity: summary.activeContext.currentThreadTitle ?? "No active thread",
      impact: summary.activeContext.currentTurnSummary ?? "No current turn summary is attached.",
      nextAction: "resume conversation",
      targetWorkspace: "conversations" as WorkspaceId,
      tone: summary.attention.interruptedTurns > 0 ? ("warning" as const) : ("active" as const),
      detail: "The current supervised thread should remain the bridge between Browser, Listener, Recovery, and Evidence.",
      facts: [
        ["Thread", summary.activeContext.currentThreadTitle ?? "none"],
        ["Interrupted", String(summary.attention.interruptedTurns)],
        ["Tasks", String(summary.activeTasks.length)],
        ["Workers", String(summary.activeWorkers.length)]
      ]
    },
    {
      key: "pressure",
      record: "Attention Pressure",
      domain: "workflow",
      entity: status.workflowState,
      impact: `${summary.attention.approvalsAwaiting} approvals, ${summary.attention.openIncidents} incidents, ${summary.attention.blockedWork} blocked work`,
      nextAction: "review journeys",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: status.workflowState === "attention_required" ? ("warning" as const) : ("steady" as const),
      detail: "This condenses the work that still needs explicit human attention before the environment can be treated as clear.",
      facts: [
        ["Approvals", String(summary.attention.approvalsAwaiting)],
        ["Incidents", String(summary.attention.openIncidents)],
        ["Blocked Work", String(summary.attention.blockedWork)],
        ["Streams", String(summary.attention.activeStreams)]
      ]
    },
    {
      key: "evidence",
      record: "Recent Evidence",
      domain: "evidence",
      entity: summary.recentArtifacts[0]?.title ?? "No recent artifact",
      impact: summary.recentArtifacts[0]?.summary ?? "Durable artifacts appear here as proof and consequence rather than as detached attachments.",
      nextAction: "review artifacts",
      targetWorkspace: "artifacts" as WorkspaceId,
      tone: summary.recentArtifacts.length > 0 ? ("active" as const) : ("steady" as const),
      detail: "Recent artifacts should be part of first-run orientation because they often explain what changed and what still needs review.",
      facts: [
        ["Recent Artifacts", String(summary.recentArtifacts.length)],
        ["Open Incidents", String(summary.incidents.length)],
        ["Open Approvals", String(summary.approvals.length)],
        ["Target", "Evidence > Artifacts"]
      ]
    }
  ];

  const journeyRows = [
    ...workItems.map((item) => ({
      key: `work:${item.workItemId}`,
      title: item.title,
      lane: "work",
      state: item.state,
      urgency: item.state === "blocked" || item.state === "quarantined" ? "high" : "active",
      dependency: item.waitingReason ?? "ready",
      nextStep: item.state === "blocked" || item.state === "quarantined" ? "resolve blocker" : "open execution",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: toneForWorkState(item.state),
      detail: item.waitingReason ?? "Governed work is ready to continue in the execution workspace.",
      facts: [
        ["Approvals", String(item.approvalCount)],
        ["Incidents", String(item.incidentCount)],
        ["Artifacts", String(item.artifactCount)],
        ["Validation", item.validationBurden]
      ]
    })),
    ...approvalRequests.map((request) => ({
      key: `approval:${request.requestId}`,
      title: request.title,
      lane: "approval",
      state: request.state,
      urgency: request.state === "awaiting" ? "high" : "steady",
      dependency: "human decision",
      nextStep: request.state === "awaiting" ? "review approval" : "inspect decision",
      targetWorkspace: "runtime" as WorkspaceId,
      tone: toneForApprovalState(request.state),
      detail: request.summary,
      facts: [
        ["Type", "approval gate"],
        ["State", request.state],
        ["Workspace", "Execution > Approvals"],
        ["Consequence", selectedApproval?.requestId === request.requestId ? selectedApproval.consequenceSummary : "Review the decision consequence in Execution."]
      ]
    })),
    ...incidents.map((incident) => ({
      key: `incident:${incident.incidentId}`,
      title: incident.title,
      lane: "incident",
      state: incident.state,
      urgency: incident.severity,
      dependency: "recovery path",
      nextStep: incident.state === "resolved" ? "review closure" : "open recovery",
      targetWorkspace: "incidents" as WorkspaceId,
      tone: toneForIncidentState(incident.severity),
      detail: `Severity ${incident.severity}. Recovery remains part of the current continuation until closure is trustworthy again.`,
      facts: [
        ["Severity", incident.severity],
        ["State", incident.state],
        ["Workspace", "Recovery"],
        ["Artifacts", String(artifacts.filter((artifact) => artifact.kind.includes("incident")).length)]
      ]
    }))
  ];

  const evidenceRows = (artifacts.length > 0 ? artifacts : summary.recentArtifacts).map((artifact) => ({
    key: artifact.artifactId,
    artifact: artifact.title,
    type: artifact.kind,
    updatedAt: artifact.updatedAt,
    summary: artifact.summary,
    impact:
      artifact.kind.includes("incident")
        ? "recovery"
        : artifact.kind.includes("spec") || artifact.kind.includes("source")
          ? "source"
          : "workflow",
    targetWorkspace: "artifacts" as WorkspaceId,
    tone: artifact.kind.includes("incident") ? ("warning" as const) : ("active" as const),
    facts: [
      ["Artifact", artifact.title],
      ["Kind", artifact.kind],
      ["Updated", artifact.updatedAt],
      ["Workspace", "Evidence"]
    ]
  }));

  const [selectedOrientationKey, setSelectedOrientationKey] = useState<string | null>(orientationRows[0]?.key ?? null);
  const [selectedJourneyKey, setSelectedJourneyKey] = useState<string | null>(journeyRows[0]?.key ?? null);
  const [selectedEvidenceKey, setSelectedEvidenceKey] = useState<string | null>(evidenceRows[0]?.key ?? null);

  useEffect(() => {
    if (!orientationRows.some((row) => row.key === selectedOrientationKey)) {
      setSelectedOrientationKey(orientationRows[0]?.key ?? null);
    }
  }, [orientationRows, selectedOrientationKey]);

  useEffect(() => {
    if (!journeyRows.some((row) => row.key === selectedJourneyKey)) {
      setSelectedJourneyKey(journeyRows[0]?.key ?? null);
    }
  }, [journeyRows, selectedJourneyKey]);

  useEffect(() => {
    if (!evidenceRows.some((row) => row.key === selectedEvidenceKey)) {
      setSelectedEvidenceKey(evidenceRows[0]?.key ?? null);
    }
  }, [evidenceRows, selectedEvidenceKey]);

  const selectedOrientation = orientationRows.find((row) => row.key === selectedOrientationKey) ?? orientationRows[0] ?? null;
  const selectedJourney = journeyRows.find((row) => row.key === selectedJourneyKey) ?? journeyRows[0] ?? null;
  const selectedEvidence = evidenceRows.find((row) => row.key === selectedEvidenceKey) ?? evidenceRows[0] ?? null;

  async function openOrientationPrimary(row: (typeof orientationRows)[number]): Promise<void> {
    if (row.key === "binding") {
      await navigateToBrowserDomain("systems");
      return;
    }
    if (row.key === "runtime") {
      await navigateToExecutionSection("listener");
      return;
    }
    if (row.key === "continuation") {
      await navigateToConversationSection("threads");
      return;
    }
    await navigateToExecutionSection("approvals");
  }

  async function openJourneyPrimary(row: (typeof journeyRows)[number]): Promise<void> {
    if (row.lane === "work") {
      await navigateToExecutionSection("work");
      return;
    }
    if (row.lane === "approval") {
      await navigateToExecutionSection("approvals");
      return;
    }
    await navigateToRecoverySection("incidents");
  }

  async function openEvidencePrimary(): Promise<void> {
    await navigateToEvidenceSection("artifacts");
  }

  return (
    <div className="environment-grid">
      {selectedSection === "orientation" ? (
        <>
          <section className="panel operate-table-panel">
            <PanelHeader
              title="Orientation Records"
              subtitle="Each row is an operational checkpoint into the live environment and opens the next relevant workspace."
            />
            <BrowserDataTable
              key="operate-orientation"
              columnTemplate="minmax(0, 1.05fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.9fr)"
              columns={[
                { id: "record", label: "Record", render: (row) => <strong>{row.record}</strong>, sortValue: (row) => row.record },
                {
                  id: "domain",
                  label: "Domain",
                  render: (row) => <Badge tone={row.tone}>{row.domain}</Badge>,
                  sortValue: (row) => row.domain,
                  searchValue: (row) => row.domain
                },
                { id: "entity", label: "Entity", render: (row) => row.entity, sortValue: (row) => row.entity },
                {
                  id: "impact",
                  label: "Impact",
                  render: (row) => row.impact,
                  sortValue: (row) => row.impact,
                  searchValue: (row) => `${row.record} ${row.domain} ${row.entity} ${row.impact}`
                },
                {
                  id: "next",
                  label: "Next",
                  render: (row) => <span className="operate-next-step">{row.nextAction}</span>,
                  sortValue: (row) => row.nextAction
                }
              ]}
              emptyMessage="No orientation records are available."
              filterLabel="Domain"
              filterOptions={Array.from(new Set(orientationRows.map((row) => row.domain))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.domain}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedOrientationKey(row.key)}
              rows={orientationRows}
              searchPlaceholder="Search orientation records"
              selectedKey={selectedOrientation?.key ?? null}
            />
          </section>

          {selectedOrientation ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedOrientation.record}
                subtitle="Selection detail stays below the table so orientation scales without fragmenting the page."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">In Focus</p>
                  <strong>{selectedOrientation.entity}</strong>
                  <p>{selectedOrientation.detail}</p>
                </div>
                <Badge tone={selectedOrientation.tone}>{selectedOrientation.domain}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Primary Concern</span>
                  <strong>{selectedOrientation.record}</strong>
                  <p>{selectedOrientation.impact}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Next Move</span>
                  <strong>{selectedOrientation.nextAction}</strong>
                  <p>Use the selected row to move directly into the relevant engineering workspace.</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedOrientation.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedOrientation.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openOrientationPrimary(selectedOrientation)} type="button">
                  {selectedOrientation.key === "binding"
                    ? "Open Systems"
                    : selectedOrientation.key === "runtime"
                      ? "Open Listener"
                      : selectedOrientation.key === "continuation"
                        ? "Open Threads"
                        : "Open Approvals"}
                </button>
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("symbols")} type="button">
                  Inspect In Browser
                </button>
                <button className="starter-chip" onClick={() => void navigateToEvidenceSection("artifacts")} type="button">
                  Open Evidence
                </button>
              </div>
            </section>
          ) : null}

          <section className="panel operate-objective-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Operate Orientation</p>
                <h3>{summary.activeContext.currentThreadTitle ?? summary.environmentLabel}</h3>
              </div>
              <Badge tone={status.workflowState === "attention_required" ? "warning" : "active"}>
                {status.workflowState}
              </Badge>
            </div>
            <div className="signal-digest-grid execution-objective-digest">
              <div className="signal-digest-card">
                <span className="context-label">Environment</span>
                <strong>{summary.environmentLabel}</strong>
                <p>{summary.environmentId}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Runtime</span>
                <strong>{summary.activeContext.runtimePackage ?? summary.activeContext.runtimeLabel}</strong>
                <p>{status.runtimeState}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Attention</span>
                <strong>{summary.attention.approvalsAwaiting + summary.attention.openIncidents + summary.attention.blockedWork}</strong>
                <p>{summary.activeContext.focusSummary}</p>
              </div>
            </div>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void navigateToBrowserDomain("systems")} type="button">
                Open Systems
              </button>
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
                Open Listener
              </button>
              <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
                Open Threads
              </button>
              <button className="starter-chip" onClick={() => void navigateToEvidenceSection("artifacts")} type="button">
                Open Artifacts
              </button>
            </div>
          </section>
        </>
      ) : null}

      {selectedSection === "journeys" ? (
        <>
          <section className="panel operate-table-panel">
            <PanelHeader
              title="Journey Queue"
              subtitle="This queue should make the next supervised move obvious across work, approvals, and recovery."
            />
            <BrowserDataTable
              key="operate-journeys"
              columnTemplate="minmax(0, 1.25fr) minmax(0, 0.8fr) minmax(0, 0.75fr) minmax(0, 1.2fr) minmax(0, 0.95fr)"
              columns={[
                { id: "journey", label: "Journey", render: (row) => <strong>{row.title}</strong>, sortValue: (row) => row.title },
                {
                  id: "lane",
                  label: "Lane",
                  render: (row) => <Badge tone={row.tone}>{row.lane}</Badge>,
                  sortValue: (row) => row.lane,
                  searchValue: (row) => row.lane
                },
                {
                  id: "state",
                  label: "State",
                  render: (row) => <span className="operate-state">{row.state}</span>,
                  sortValue: (row) => row.state
                },
                { id: "dependency", label: "Dependency", render: (row) => row.dependency, sortValue: (row) => row.dependency },
                {
                  id: "next",
                  label: "Next",
                  render: (row) => <span className="operate-next-step">{row.nextStep}</span>,
                  sortValue: (row) => row.nextStep
                }
              ]}
              emptyMessage="No journeys are active."
              filterLabel="Lane"
              filterOptions={Array.from(new Set(journeyRows.map((row) => row.lane))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.lane}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedJourneyKey(row.key)}
              rows={journeyRows}
              searchPlaceholder="Search journeys"
              selectedKey={selectedJourney?.key ?? null}
            />
          </section>

          {selectedJourney ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedJourney.title}
                subtitle="Journey detail keeps dependency, proof burden, and launch target together."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">Dependency</p>
                  <strong>{selectedJourney.dependency}</strong>
                  <p>{selectedJourney.detail}</p>
                </div>
                <Badge tone={selectedJourney.tone}>{selectedJourney.state}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Lane</span>
                  <strong>{selectedJourney.lane}</strong>
                  <p>{selectedJourney.state}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Next Step</span>
                  <strong>{selectedJourney.nextStep}</strong>
                  <p>{selectedJourney.urgency === "high" || selectedJourney.urgency === "critical" ? "This continuation is carrying elevated pressure." : "This continuation can be resumed without emergency posture."}</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedJourney.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedJourney.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openJourneyPrimary(selectedJourney)} type="button">
                  {selectedJourney.lane === "work"
                    ? "Open Work"
                    : selectedJourney.lane === "approval"
                      ? "Open Approvals"
                      : "Open Recovery"}
                </button>
                <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
                  Resume In Conversations
                </button>
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("governance")} type="button">
                  Inspect Context
                </button>
              </div>
            </section>
          ) : null}

          <section className="panel operate-objective-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Operate Journeys</p>
                <h3>Active Continuations</h3>
              </div>
              <Badge tone={journeyRows.some((row) => row.tone === "danger" || row.tone === "warning") ? "warning" : "active"}>
                {`${journeyRows.length} open`}
              </Badge>
            </div>
            <div className="signal-digest-grid execution-objective-digest">
              <div className="signal-digest-card">
                <span className="context-label">Work Items</span>
                <strong>{workItems.length}</strong>
                <p>{workItems[0]?.title ?? "No governed work item is active."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Approvals</span>
                <strong>{approvalRequests.length}</strong>
                <p>{approvalRequests[0]?.title ?? "No approval gate is dominating continuation."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Incidents</span>
                <strong>{incidents.length}</strong>
                <p>{incidents[0]?.title ?? "No recovery journey is currently open."}</p>
              </div>
            </div>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("work")} type="button">
                Open Work
              </button>
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("approvals")} type="button">
                Open Approvals
              </button>
              <button className="starter-chip" onClick={() => void navigateToRecoverySection("incidents")} type="button">
                Open Recovery
              </button>
              <button className="starter-chip" onClick={() => void navigateToConversationSection("threads")} type="button">
                Open Threads
              </button>
            </div>
          </section>
        </>
      ) : null}

      {selectedSection === "evidence" ? (
        <>
          <section className="panel operate-table-panel">
            <PanelHeader
              title="Evidence Table"
              subtitle="Recent durable artifacts remain explicit engineering objects with provenance, scope, and closure consequence."
            />
            <BrowserDataTable
              key="operate-evidence"
              columnTemplate="minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 0.9fr) minmax(0, 1.45fr)"
              columns={[
                { id: "artifact", label: "Artifact", render: (row) => <strong>{row.artifact}</strong>, sortValue: (row) => row.artifact },
                {
                  id: "type",
                  label: "Type",
                  render: (row) => <Badge tone={row.tone}>{row.type}</Badge>,
                  sortValue: (row) => row.type,
                  searchValue: (row) => row.type
                },
                { id: "updated", label: "Updated", render: (row) => row.updatedAt, sortValue: (row) => row.updatedAt },
                {
                  id: "summary",
                  label: "Summary",
                  render: (row) => row.summary,
                  sortValue: (row) => row.summary,
                  searchValue: (row) => `${row.artifact} ${row.type} ${row.summary}`
                }
              ]}
              emptyMessage="No evidence artifacts are available."
              filterLabel="Impact"
              filterOptions={Array.from(new Set(evidenceRows.map((row) => row.impact))).map((value) => ({ label: value, value }))}
              getFilterValue={(row) => row.impact}
              getRowKey={(row) => row.key}
              onSelect={(row) => setSelectedEvidenceKey(row.key)}
              rows={evidenceRows}
              searchPlaceholder="Search evidence"
              selectedKey={selectedEvidence?.key ?? null}
            />
          </section>

          {selectedEvidence ? (
            <section className="panel operate-detail-panel">
              <PanelHeader
                title={selectedEvidence.artifact}
                subtitle="Evidence detail should keep artifact posture, linkage, and next validation move on one surface."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">Artifact Summary</p>
                  <strong>{selectedEvidence.type}</strong>
                  <p>{selectedEvidence.summary}</p>
                </div>
                <Badge tone={selectedEvidence.tone}>{selectedEvidence.impact}</Badge>
              </div>
              <div className="signal-digest-grid operate-detail-digest">
                <div className="signal-digest-card">
                  <span className="context-label">Evidence Domain</span>
                  <strong>{selectedEvidence.impact}</strong>
                  <p>{selectedEvidence.type}</p>
                </div>
                <div className="signal-digest-card">
                  <span className="context-label">Closure Hint</span>
                  <strong>{selectedEvidence.impact === "recovery" ? "Review Before Closure" : "Validate And Attach"}</strong>
                  <p>{selectedEvidence.summary}</p>
                </div>
              </div>
              <dl className="detail-list">
                {selectedEvidence.facts.map(([label, value]) => (
                  <DetailRow key={`${selectedEvidence.key}:${label}`} label={label} value={value} />
                ))}
              </dl>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openEvidencePrimary()} type="button">
                  Open Artifacts
                </button>
                <button className="starter-chip" onClick={() => void navigateToBrowserDomain("source")} type="button">
                  Inspect Related Source
                </button>
                <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
                  Validate In Listener
                </button>
              </div>
            </section>
          ) : null}

          <section className="panel operate-objective-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Operate Evidence</p>
                <h3>Proof And Closure Readiness</h3>
              </div>
              <Badge tone={evidenceRows.length > 0 ? "active" : "steady"}>{`${evidenceRows.length} artifacts`}</Badge>
            </div>
            <div className="signal-digest-grid execution-objective-digest">
              <div className="signal-digest-card">
                <span className="context-label">Recent Artifacts</span>
                <strong>{evidenceRows.length}</strong>
                <p>{evidenceRows[0]?.artifact ?? "No artifact is currently foregrounded."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Approval Pressure</span>
                <strong>{summary.attention.approvalsAwaiting}</strong>
                <p>{summary.approvals[0]?.title ?? "No approval gate is waiting on proof."}</p>
              </div>
              <div className="signal-digest-card">
                <span className="context-label">Recovery Pressure</span>
                <strong>{summary.incidents.length}</strong>
                <p>{summary.incidents[0]?.title ?? "No recovery evidence loop is open."}</p>
              </div>
            </div>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void navigateToEvidenceSection("artifacts")} type="button">
                Open Artifacts
              </button>
              <button className="starter-chip" onClick={() => void navigateToBrowserDomain("source")} type="button">
                Open Source
              </button>
              <button className="starter-chip" onClick={() => void navigateToExecutionSection("listener")} type="button">
                Open Listener
              </button>
              <button className="starter-chip" onClick={() => void navigateToRecoverySection("incidents")} type="button">
                Open Recovery
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ExecutionWorkspace(
  props: {
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
    workItems: WorkItemSummaryDto[];
    selectedWorkItemId: string | null;
    selectedWorkItem: WorkItemDetailDto | null;
    selectedWorkflowRecord: WorkflowRecordDto | null;
    approvalRequests: ApprovalRequestSummaryDto[];
  }
) {
  const selectedWorkTitle = props.selectedWorkItem?.title ?? props.workItems[0]?.title ?? "No governed work item selected";
  const executionObjective =
    props.selectedWorkItem?.waitingReason ??
    props.selectedWorkflowRecord?.closureSummary ??
    props.runtimeSummary?.divergencePosture ??
    "Inspect runtime posture, pick the current work item, and resolve whatever still prevents trustworthy continuation.";

  return (
    <div className="execution-journey">
      <RuntimeWorkspace
        evaluateRuntimeForm={props.evaluateRuntimeForm}
        isEvaluating={props.isEvaluating}
        inspectRuntimeSymbol={props.inspectRuntimeSymbol}
        isInspectingRuntime={props.isInspectingRuntime}
        runtimeInspection={props.runtimeInspection}
        runtimeInspectionMode={props.runtimeInspectionMode}
        runtimeInspectorPackage={props.runtimeInspectorPackage}
        runtimeInspectorSymbol={props.runtimeInspectorSymbol}
        runtimeForm={props.runtimeForm}
        runtimeResult={props.runtimeResult}
        runtimeSummary={props.runtimeSummary}
        setRuntimeInspectionMode={props.setRuntimeInspectionMode}
        setRuntimeInspectorPackage={props.setRuntimeInspectorPackage}
        setRuntimeInspectorSymbol={props.setRuntimeInspectorSymbol}
        setRuntimeForm={props.setRuntimeForm}
      />

      <JourneyStageStrip
        eyebrow="Execution Flow"
        summary="Execution should move through live image inspection, governed work reconciliation, and explicit decisions without turning back into queue-driven SDLC navigation."
        steps={[
          {
            id: "inspect-runtime",
            title: "Inspect Runtime",
            summary: "Confirm current package, mutation pressure, and available inspection scopes in the live image.",
            tone: props.runtimeSummary?.activeMutations ? "warning" : "active"
          },
          {
            id: "reconcile-work",
            title: "Reconcile Work",
            summary: "Work stays attached to validation and closure so the operator can see what still prevents trustworthy continuation.",
            tone: props.workItems.some((item) => item.state === "blocked") ? "warning" : "steady"
          },
          {
            id: "apply-decisions",
            title: "Apply Decisions",
            summary: "Approval decisions remain part of execution context. When there is no approval gate, the desktop should state that explicitly and let execution continue.",
            tone: props.approvalRequests.length > 0 ? "warning" : "active"
          }
        ]}
        title="Execution Journey"
      />
      <section className="panel execution-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Execution Objective</p>
            <h3>{selectedWorkTitle}</h3>
          </div>
          <Badge tone={props.selectedWorkItem ? toneForWorkState(props.selectedWorkItem.state) : "steady"}>
            {props.selectedWorkItem?.state ?? "unscoped"}
          </Badge>
        </div>
        <p className="lead-copy">{executionObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Runtime</span>
            <strong>{props.runtimeSummary?.currentPackage ?? "Unavailable"}</strong>
            <p>{props.runtimeSummary?.activeMutations ? "Active mutation pressure is present." : "Runtime is inspectable without active mutation pressure."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Work</span>
            <strong>{props.workItems.length}</strong>
            <p>{props.workItems[0]?.title ?? "No governed work item is foregrounded."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Approvals</span>
            <strong>{props.approvalRequests.length}</strong>
            <p>{props.approvalRequests[0]?.title ?? "No approval request is blocking execution."}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function EvidenceWorkspace({
  artifacts,
  selectedArtifact,
  selectedArtifactId,
  setSelectedArtifactId,
  events,
  selectedEventCursor,
  selectedEvent,
  eventFamilyFilter,
  eventVisibilityFilter,
  setSelectedEventCursor,
  setEventFamilyFilter,
  setEventVisibilityFilter
}: {
  artifacts: ArtifactSummaryDto[];
  selectedArtifact: ArtifactDetailDto | null;
  selectedArtifactId: string | null;
  setSelectedArtifactId: (artifactId: string) => void;
  events: EnvironmentEventDto[];
  selectedEventCursor: number | null;
  selectedEvent: EnvironmentEventDto | null;
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  setSelectedEventCursor: (cursor: number) => void;
  setEventFamilyFilter: (value: string) => void;
  setEventVisibilityFilter: (value: string) => void;
}) {
  const evidenceObjective =
    selectedArtifact?.summary ??
    selectedEvent?.summary ??
    artifacts[0]?.summary ??
    "Inspect durable evidence first, then replay event structure to reconstruct how the environment arrived here.";

  return (
    <div className="evidence-journey">
      <JourneyStageStrip
        eyebrow="Evidence Flow"
        summary="Evidence should let the operator move from durable outputs into replayable observation without leaving the current environment method."
        steps={[
          {
            id: "inspect-artifacts",
            title: "Inspect Artifacts",
            summary: "Read durable outputs first so recovery and execution are anchored in retained proof.",
            tone: artifacts.length > 0 ? "active" : "steady"
          },
          {
            id: "replay-events",
            title: "Replay Events",
            summary: "Use structured history to reconstruct what happened instead of relying on raw logs or transport traces.",
            tone: events.length > 0 ? "active" : "steady"
          },
          {
            id: "reconstruct-truth",
            title: "Reconstruct Truth",
            summary: "Artifacts and events should converge into a usable narrative about the environment’s current posture.",
            tone: selectedArtifact || selectedEvent ? "active" : "steady"
          }
        ]}
        title="Evidence Journey"
      />
      <section className="panel evidence-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Evidence Objective</p>
            <h3>{selectedArtifact?.title ?? selectedEvent?.kind ?? artifacts[0]?.title ?? "No evidence selected"}</h3>
          </div>
          <Badge tone={selectedArtifact || selectedEvent ? "active" : "steady"}>
            {selectedArtifact ? "artifact" : selectedEvent ? "event" : "idle"}
          </Badge>
        </div>
        <p className="lead-copy">{evidenceObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Artifacts</span>
            <strong>{artifacts.length}</strong>
            <p>{artifacts[0]?.title ?? "No durable artifact is foregrounded."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Events</span>
            <strong>{events.length}</strong>
            <p>{selectedEvent?.kind ?? "No replayed event is selected."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Truth</span>
            <strong>{selectedArtifact || selectedEvent ? "focused" : "idle"}</strong>
            <p>{selectedEvent?.summary ?? selectedArtifact?.summary ?? "Evidence will converge here as artifacts and events are inspected together."}</p>
          </div>
        </div>
      </section>

      <div className="evidence-layout">
        <div className="evidence-main-rail">
          <ArtifactsWorkspace
            artifacts={artifacts}
            selectedArtifact={selectedArtifact}
            selectedArtifactId={selectedArtifactId}
            setSelectedArtifactId={setSelectedArtifactId}
          />
        </div>
        <div className="evidence-support-rail">
          <ActivityWorkspace
            eventFamilyFilter={eventFamilyFilter}
            eventVisibilityFilter={eventVisibilityFilter}
            events={events}
            selectedEvent={selectedEvent}
            selectedEventCursor={selectedEventCursor}
            setEventFamilyFilter={setEventFamilyFilter}
            setEventVisibilityFilter={setEventVisibilityFilter}
            setSelectedEventCursor={setSelectedEventCursor}
          />
        </div>
      </div>
    </div>
  );
}

interface BrowserTableColumn<Row> {
  id: string;
  label: string;
  render: (row: Row) => ReactNode;
  sortValue: (row: Row) => string | number;
  searchValue?: (row: Row) => string;
}

interface BrowserTableFilterOption {
  label: string;
  value: string;
}

function BrowserDataTable<Row>({
  rows,
  columns,
  columnTemplate,
  emptyMessage,
  filterLabel,
  filterOptions,
  getFilterValue,
  getRowKey,
  onSelect,
  searchPlaceholder,
  selectedKey
}: {
  rows: Row[];
  columns: BrowserTableColumn<Row>[];
  columnTemplate: string;
  emptyMessage: string;
  filterLabel: string;
  filterOptions: BrowserTableFilterOption[];
  getFilterValue: (row: Row) => string;
  getRowKey: (row: Row) => string;
  onSelect: (row: Row) => void;
  searchPlaceholder: string;
  selectedKey: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortColumnId, setSortColumnId] = useState(columns[0]?.id ?? "default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  const sortColumn = columns.find((column) => column.id === sortColumnId) ?? columns[0];
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesFilter = activeFilter === "all" || getFilterValue(row) === activeFilter;
        if (!matchesFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return columns.some((column) => {
          const haystack = (column.searchValue?.(row) ?? String(column.sortValue(row))).toLowerCase();
          return haystack.includes(normalizedSearch);
        });
      }),
    [activeFilter, columns, getFilterValue, normalizedSearch, rows]
  );

  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = sortColumn.sortValue(left);
      const rightValue = sortColumn.sortValue(right);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base"
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, normalizedSearch, pageSize, sortColumnId, sortDirection]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function toggleSort(columnId: string): void {
    if (sortColumnId === columnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnId(columnId);
    setSortDirection("asc");
  }

  return (
    <section className="browser-table-shell">
      <div className="browser-table-toolbar">
        <input
          className="filter-input browser-table-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={searchPlaceholder}
          value={searchTerm}
        />
        <label className="browser-table-select-group">
          <span>{filterLabel}</span>
          <select
            className="filter-input browser-table-select"
            onChange={(event) => setActiveFilter(event.target.value)}
            value={activeFilter}
          >
            <option value="all">All</option>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="browser-table-select-group">
          <span>Page Size</span>
          <select
            className="filter-input browser-table-select"
            onChange={(event) => setPageSize(Number(event.target.value))}
            value={String(pageSize)}
          >
            <option value="8">8</option>
            <option value="16">16</option>
            <option value="32">32</option>
          </select>
        </label>
      </div>
      <div className="browser-table">
        <div className="browser-table-header browser-table-row" style={{ gridTemplateColumns: columnTemplate }}>
          {columns.map((column) => {
            const isActiveSort = sortColumnId === column.id;
            return (
              <button
                className={isActiveSort ? "browser-sort-button active" : "browser-sort-button"}
                key={column.id}
                onClick={() => toggleSort(column.id)}
                type="button"
              >
                <span>{column.label}</span>
                <span className="browser-sort-indicator">
                  {isActiveSort ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="browser-table-body browser-table-scroll">
          {pagedRows.length > 0 ? (
            pagedRows.map((row) => {
              const rowKey = getRowKey(row);
              return (
                <button
                  className={selectedKey === rowKey ? "browser-table-row active" : "browser-table-row"}
                  key={rowKey}
                  onClick={() => onSelect(row)}
                  style={{ gridTemplateColumns: columnTemplate }}
                  type="button"
                >
                  {columns.map((column) => (
                    <span className="browser-table-cell" key={`${rowKey}:${column.id}`}>
                      {column.render(row)}
                    </span>
                  ))}
                </button>
              );
            })
          ) : (
            <p className="list-empty">{emptyMessage}</p>
          )}
        </div>
      </div>
      <div className="browser-table-pagination">
        <span>
          {sortedRows.length === 0
            ? "0 results"
            : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sortedRows.length)} of ${sortedRows.length}`}
        </span>
        <div className="browser-table-pagination-actions">
          <button
            className="starter-chip"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            Previous
          </button>
          <span className="thread-flag">
            Page {page} / {totalPages}
          </span>
          <button
            className="starter-chip"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function BrowserWorkspace({
  approvalRequests,
  runtimeSummary,
  selectedDomain,
  parenDepthColors,
  packageBrowser,
  navigateToWorkspace,
  conversationDraft,
  runtimeForm,
  setConversationDraft,
  setRuntimeForm,
  selectedThread,
  selectedThreadId,
  selectedPackageName,
  setSelectedPackageName,
  setSelectedThreadId,
  runtimeInspection,
  runtimeEntityDetail,
  runtimeInspectionMode,
  runtimeInspectorSymbol,
  runtimeInspectorPackage,
  setRuntimeInspectionMode,
  setRuntimeInspectorSymbol,
  setRuntimeInspectorPackage,
  browseRuntimeEntity,
  inspectRuntimeSymbol,
  isInspectingRuntime,
  sourcePreview,
  sourceDraft,
  setSourceDraft,
  isEditingSource,
  setIsEditingSource,
  isStagingSource,
  isReloadingSource,
  sourceMutationResult,
  sourceReloadResult,
  stageSourceChange,
  reloadSourceFile,
  loadSourcePreview,
  incidents,
  artifacts,
  threads,
  workItems
}: {
  approvalRequests: ApprovalRequestSummaryDto[];
  runtimeSummary: RuntimeSummaryDto | null;
  selectedDomain: BrowserDomain;
  parenDepthColors: string[];
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  navigateToWorkspace: (workspaceId: WorkspaceId) => void;
  conversationDraft: string;
  runtimeForm: string;
  setConversationDraft: (value: string) => void;
  setRuntimeForm: (value: string) => void;
  selectedThread: ThreadDetailDto | null;
  selectedThreadId: string | null;
  selectedPackageName: string;
  setSelectedPackageName: (value: string) => void;
  setSelectedThreadId: (threadId: string) => void;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeInspectionMode: RuntimeInspectionMode;
  runtimeInspectorSymbol: string;
  runtimeInspectorPackage: string;
  setRuntimeInspectionMode: (value: RuntimeInspectionMode) => void;
  setRuntimeInspectorSymbol: (value: string) => void;
  setRuntimeInspectorPackage: (value: string) => void;
  browseRuntimeEntity: (
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ) => Promise<void>;
  inspectRuntimeSymbol: () => Promise<void>;
  isInspectingRuntime: boolean;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  sourceDraft: string;
  setSourceDraft: (value: string) => void;
  isEditingSource: boolean;
  setIsEditingSource: (value: boolean) => void;
  isStagingSource: boolean;
  isReloadingSource: boolean;
  sourceMutationResult: CommandResultDto<SourceMutationResultDto> | null;
  sourceReloadResult: CommandResultDto<SourceReloadResultDto> | null;
  stageSourceChange: () => Promise<void>;
  reloadSourceFile: () => Promise<void>;
  loadSourcePreview: (path: string, line?: number) => Promise<void>;
  incidents: IncidentSummaryDto[];
  artifacts: ArtifactSummaryDto[];
  threads: ThreadSummaryDto[];
  workItems: WorkItemSummaryDto[];
}) {
  const [packageWorkspaceMode, setPackageWorkspaceMode] = useState<"packages" | "exports" | "internals">("packages");
  const [symbolWorkspaceMode, setSymbolWorkspaceMode] = useState<
    "generic-function" | "class" | "macro" | "function" | "variable"
  >("function");
  const [classMethodMode, setClassMethodMode] = useState<"classes" | "generic-functions">("classes");
  const [xrefMode, setXrefMode] = useState<"incoming" | "outgoing">("incoming");
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedSourceEntryKey, setSelectedSourceEntryKey] = useState<string | null>(null);
  const [selectedDocumentationKey, setSelectedDocumentationKey] = useState<string | null>(null);
  const [selectedLinkedConversationId, setSelectedLinkedConversationId] = useState<string | null>(null);
  const [listenerActionMode, setListenerActionMode] = useState<"default" | "inspect" | "reload" | "evaluate" | "custom">("default");
  const [customListenerForm, setCustomListenerForm] = useState<string | null>(null);

  const packageNames = Array.from(
    new Set([
      runtimeSummary?.currentPackage,
      packageBrowser?.data.packageName,
      ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
    ].filter((value): value is string => Boolean(value)))
  );

  const browserObjective =
    runtimeInspection?.data.summary ??
    sourcePreview?.data.summary ??
    runtimeSummary?.divergencePosture ??
    "Browse systems, packages, symbols, source, and governed artifacts as one live environment.";

  const filteredExternalSymbols = packageBrowser?.data.externalSymbols ?? [];
  const filteredInternalSymbols = packageBrowser?.data.internalSymbols ?? [];
  const packageSymbols = [...filteredExternalSymbols, ...filteredInternalSymbols];
  const focusedPackageSymbol =
    packageSymbols.find((entry) => entry.symbol === (runtimeInspection?.data.symbol ?? runtimeInspectorSymbol)) ??
    null;
  const focusedSymbol = runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbol;
  const focusedPackage =
    runtimeInspection?.data.packageName ??
    runtimeEntityDetail?.data.packageName ??
    (runtimeInspectorPackage || undefined) ??
    packageBrowser?.data.packageName;
  const sourceBackedDetailItem =
    runtimeEntityDetail?.data.relatedItems.find((item) => item.path) ??
    runtimeInspection?.data.items.find((item) => item.path) ??
    null;
  const sourceDraftDirty =
    Boolean(sourcePreview) && sourceDraft !== (sourcePreview?.data.editableContent ?? "");
  const filteredPackageNames = packageNames;

  const kindBuckets = useMemo(
    () => [
      {
        key: "generic-function",
        title: "Generic Functions",
        subtitle: "Method-oriented live dispatch surfaces.",
        symbols: [...filteredExternalSymbols, ...filteredInternalSymbols].filter(
          (entry) => entry.kind === "generic-function"
        ),
        mode: "methods" as RuntimeInspectionMode
      },
      {
        key: "class",
        title: "Classes",
        subtitle: "CLOS classes and related runtime structure.",
        symbols: [...filteredExternalSymbols, ...filteredInternalSymbols].filter(
          (entry) => entry.kind === "class"
        ),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "macro",
        title: "Macros",
        subtitle: "Compile-time shaping forms in the selected package.",
        symbols: [...filteredExternalSymbols, ...filteredInternalSymbols].filter(
          (entry) => entry.kind === "macro"
        ),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "function",
        title: "Functions",
        subtitle: "Callable definitions and unresolved runtime call surfaces.",
        symbols: [...filteredExternalSymbols, ...filteredInternalSymbols].filter(
          (entry) => entry.kind === "function" || entry.kind === "unknown"
        ),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "variable",
        title: "Variables",
        subtitle: "Special variables, runtime bindings, and inspectable symbol values.",
        symbols: [...filteredExternalSymbols, ...filteredInternalSymbols].filter((entry) => entry.kind === "variable"),
        mode: "describe" as RuntimeInspectionMode
      }
    ],
    [filteredExternalSymbols, filteredInternalSymbols]
  );
  const classBucket = kindBuckets.find((bucket) => bucket.key === "class") ?? null;
  const genericFunctionBucket = kindBuckets.find((bucket) => bucket.key === "generic-function") ?? null;
  const activeSymbolBucket =
    kindBuckets.find((bucket) => bucket.key === symbolWorkspaceMode) ?? kindBuckets[kindBuckets.length - 1];
  const sourceEntries = [
    ...(runtimeEntityDetail?.data.relatedItems ?? []),
    ...(runtimeInspection?.data.items ?? [])
  ].filter((item, index, items) => Boolean(item.path) && items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index);
  const selectedSystem =
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystemName)?.name ??
    runtimeSummary?.loadedSystemEntries[0]?.name ??
    runtimeSummary?.loadedSystems[0] ??
    null;
  const selectedScope =
    runtimeSummary?.scopes.find((scope) => scope.scopeId === selectedScopeId) ?? runtimeSummary?.scopes[0] ?? null;
  const selectedSourceEntry =
    sourceEntries.find((item) => `${item.path}:${item.line ?? 0}` === selectedSourceEntryKey) ?? sourceEntries[0] ?? null;
  const xrefEntries =
    xrefMode === "incoming"
      ? runtimeInspection?.data.mode === "callers"
        ? runtimeInspection.data.items
        : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label === "Caller")
      : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label !== "Caller");
  const governanceEntries = [
    ...approvalRequests.map((request) => ({
      id: request.requestId,
      label: request.title,
      detail: request.summary,
      badge: request.state
    })),
    ...incidents.map((incident) => ({
      id: incident.incidentId,
      label: incident.title,
      detail: `Severity ${incident.severity}`,
      badge: incident.state
    })),
    ...workItems.map((item) => ({
      id: item.workItemId,
      label: item.title,
      detail: item.waitingReason ?? "Governed work remains attached to this environment.",
      badge: item.state
    }))
  ];
  const linkedConversationEntries = threads.map((thread) => ({
    id: thread.threadId,
    label: thread.title,
    detail: thread.summary,
    badge: thread.state,
    flags: thread.attentionFlags,
    latestTurnState: thread.latestTurnState,
    latestActivityAt: thread.latestActivityAt
  }));
  const linkedConversationSearchTokens = [focusedSymbol, focusedPackage, selectedPackageName, sourcePreview?.data.path]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const prioritizedLinkedConversationEntries = linkedConversationEntries
    .map((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.flags.join(" ")}`.toLowerCase();
      const matchScore = linkedConversationSearchTokens.reduce(
        (score, token) => (haystack.includes(token) ? score + 1 : score),
        0
      );
      return { ...entry, matchScore };
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.label.localeCompare(right.label));
  const selectedLinkedConversation =
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedLinkedConversationId) ??
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedThreadId) ??
    prioritizedLinkedConversationEntries[0] ??
    null;
  const documentationEntries = [
    {
      key: "focus",
      label: "Current Focus",
      category: "entity",
      summary: runtimeInspection?.data.summary ?? runtimeEntityDetail?.data.summary ?? "No focused entity summary is available yet.",
      detail:
        runtimeEntityDetail?.data.signature ??
        runtimeInspection?.data.runtimePresence ??
        "Select a live entity to project its environment-linked explanation."
    },
    {
      key: "package",
      label: "Package Context",
      category: "package",
      summary:
        packageBrowser?.data.summary ??
        `Package ${focusedPackage ?? runtimeSummary?.currentPackage ?? "CL-USER"} remains the active semantic namespace.`,
      detail:
        packageBrowser?.data.useList.length
          ? `Uses ${packageBrowser.data.useList.join(", ")}`
          : "No package dependency summary is loaded for the current focus."
    },
    {
      key: "source",
      label: "Source Relationship",
      category: "source",
      summary:
        sourcePreview?.data.summary ??
        runtimeSummary?.sourceRelationship ??
        "The browser will project source relationship once a source-backed entity is selected.",
      detail:
        sourcePreview?.data.path
          ? `${sourcePreview.data.path}${sourcePreview.data.focusLine ? ` line ${sourcePreview.data.focusLine}` : ""}`
          : "No source file is currently open in the browser."
    },
    {
      key: "runtime",
      label: "Runtime Posture",
      category: "runtime",
      summary:
        runtimeInspection?.data.divergence ??
        runtimeSummary?.divergencePosture ??
        "Runtime and source posture will be summarized once inspection data is loaded.",
      detail:
        runtimeInspection?.data.items[0]?.detail ??
        runtimeEntityDetail?.data.facets[0]?.value ??
        "No runtime facet has been surfaced yet."
    },
    {
      key: "conversation",
      label: "Conversation Attachment",
      category: "conversation",
      summary:
        selectedThread?.summary ??
        selectedLinkedConversation?.detail ??
        "No conversation is currently attached to the browser focus.",
      detail:
        selectedThread
          ? `${selectedThread.turns.length} turns, ${selectedThread.linkedEntities.length} linked entities`
          : selectedLinkedConversation
            ? `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`
            : "Select a linked thread to establish conversational continuity."
    }
  ];
  const selectedDocumentation =
    documentationEntries.find((entry) => entry.key === selectedDocumentationKey) ?? documentationEntries[0];
  const effectiveEntityKind =
    runtimeEntityDetail?.data.entityKind ??
    focusedPackageSymbol?.kind ??
    (classBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "class" : null) ??
    (genericFunctionBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "generic-function" : null) ??
    (runtimeInspection?.data.mode === "methods" ? "generic-function" : null) ??
    (runtimeInspection?.data.symbol ? "unknown" : focusedPackage ? "package" : null);
  const listenerHandoffForm = buildListenerForm({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    mode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
    sourcePath: sourcePreview?.data.path,
    line: sourcePreview?.data.focusLine ?? null
  });
  const sourceOperationForms = buildSourceOperationForms({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    path: sourcePreview?.data.path ?? selectedSourceEntry?.path ?? sourceBackedDetailItem?.path ?? null,
    line: sourcePreview?.data.focusLine ?? selectedSourceEntry?.line ?? sourceBackedDetailItem?.line ?? null
  });
  const activeListenerForm =
    listenerActionMode === "inspect"
      ? sourceOperationForms.inspect
      : listenerActionMode === "reload"
        ? sourceOperationForms.reload
        : listenerActionMode === "evaluate"
          ? sourceOperationForms.evaluate
          : listenerActionMode === "custom"
            ? (customListenerForm ?? listenerHandoffForm)
          : listenerHandoffForm;
  const conversationHandoffPrompt = buildConversationPrompt({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    mode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
    sourcePath: sourcePreview?.data.path,
    line: sourcePreview?.data.focusLine ?? null,
    threadTitle: selectedThread?.title ?? selectedLinkedConversation?.label,
    threadState: selectedThread?.state ?? selectedLinkedConversation?.badge,
    latestTurnState: selectedThread?.turns[0]?.state ?? selectedLinkedConversation?.latestTurnState
  });
  const entityQuickForms = buildEntityQuickForms({
    symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null,
    packageName: focusedPackage ?? null,
    entityKind: effectiveEntityKind
  });
  const domainDescriptor =
    browserDomains.find((domain) => domain.id === selectedDomain) ?? browserDomains[0];
  const packageRows = filteredPackageNames.map((packageName) => ({
    key: packageName,
    packageName,
    nicknameSummary: packageName === runtimeSummary?.currentPackage ? "current" : "package",
    usesSummary:
      packageName === packageBrowser?.data.packageName
        ? `${packageBrowser?.data.useList.length ?? 0} links`
        : "browse"
  }));
  const packageSymbolRows = (
    (packageWorkspaceMode === "exports" ? packageBrowser?.data.externalSymbols : packageBrowser?.data.internalSymbols) ?? []
  ).map((entry) => ({
    key: `${packageWorkspaceMode}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: packageWorkspaceMode === "exports" ? "external" : "internal"
  }));
  const activeSymbolRows = activeSymbolBucket.symbols.map((entry) => ({
    key: `${activeSymbolBucket.key}:${entry.visibility}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: entry.visibility,
    inspectionMode:
      entry.kind === "generic-function"
        ? ("methods" as RuntimeInspectionMode)
        : entry.kind === "variable" || entry.kind === "unknown"
          ? ("describe" as RuntimeInspectionMode)
          : activeSymbolBucket.mode
  }));
  const classMethodRows =
    (classMethodMode === "classes" ? classBucket?.symbols : genericFunctionBucket?.symbols)?.map((entry) => ({
      key: `${classMethodMode}:${entry.symbol}`,
      symbol: entry.symbol,
      kind: entry.kind,
      action: classMethodMode === "classes" ? "browse class" : "browse methods"
    })) ?? [];
  const systemRows = runtimeSummary?.loadedSystemEntries.map((system) => ({
    key: system.name,
    name: system.name,
    type: system.type === "asdf-system" ? "ASDF System" : "Unknown",
    status: system.status,
    browse: "definition"
  })) ?? [];
  const runtimeScopeRows = runtimeSummary?.scopes.map((scope) => ({
    key: scope.scopeId,
    scopeId: scope.scopeId,
    scopeLabel: scope.symbolName ?? scope.packageName,
    kind: scope.kind,
    summary: scope.summary,
    symbolName: scope.symbolName,
    packageName: scope.packageName
  })) ?? [];
  const sourceRows = sourceEntries.map((item) => ({
    key: `${item.path}:${item.line ?? 0}`,
    label: item.label,
    location: item.path?.split("/").slice(-2).join("/") ?? "no-path",
    role: item.emphasis ?? "source",
    path: item.path,
    line: item.line
  }));
  const xrefRows = (xrefEntries ?? []).map((item) => ({
    key: `${xrefMode}:${item.label}:${item.detail}:${item.line ?? 0}`,
    label: item.label,
    emphasis: item.emphasis ?? "reference",
    detail: item.detail,
    path: item.path,
    line: item.line
  }));
  const governanceRows = governanceEntries.map((entry) => ({
    key: `${entry.badge}:${entry.id}`,
    label: entry.label,
    detail: entry.detail,
    badge: entry.badge
  }));
  const linkedConversationRows = prioritizedLinkedConversationEntries.map((entry) => ({
    key: entry.id,
    id: entry.id,
    label: entry.label,
    state: entry.badge,
    attention: entry.flags[0] ?? entry.latestTurnState,
    detail: entry.detail
  }));
  const documentationRows = documentationEntries.map((entry) => ({
    key: entry.key,
    label: entry.label,
    category: entry.category,
    summary: entry.summary
  }));

  function buildFilterOptions(values: string[]): BrowserTableFilterOption[] {
    return Array.from(new Set(values.filter(Boolean))).map((value) => ({
      label: value,
      value
    }));
  }

  useEffect(() => {
    if (runtimeForm !== activeListenerForm) {
      setRuntimeForm(activeListenerForm);
    }
  }, [activeListenerForm, runtimeForm, setRuntimeForm]);

  useEffect(() => {
    if (conversationDraft !== conversationHandoffPrompt) {
      setConversationDraft(conversationHandoffPrompt);
    }
  }, [conversationDraft, conversationHandoffPrompt, setConversationDraft]);

  useEffect(() => {
    setListenerActionMode("default");
    setCustomListenerForm(null);
  }, [focusedSymbol, focusedPackage, sourcePreview?.data.path, sourcePreview?.data.focusLine]);

  return (
    <div className="browser-journey">
      <div className="browser-layout">
        <div className="browser-main-stack browser-main-stack-full">
          <section className="panel browser-detail-panel browser-domain-pane browser-inspector-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Domain Workspace</p>
                <h3>{domainDescriptor.label}</h3>
              </div>
              <Badge tone="active">{runtimeSummary?.currentPackage ?? "CL-USER"}</Badge>
            </div>
            <div className="browser-domain-summary">
              <p className="lead-copy">{domainDescriptor.summary}</p>
            </div>
            {selectedDomain === "packages" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <div className="browser-action-strip">
                    <button
                      className={packageWorkspaceMode === "packages" ? "starter-chip active" : "starter-chip"}
                      onClick={() => setPackageWorkspaceMode("packages")}
                      type="button"
                    >
                      Packages
                    </button>
                    <button
                      className={packageWorkspaceMode === "exports" ? "starter-chip active" : "starter-chip"}
                      onClick={() => setPackageWorkspaceMode("exports")}
                      type="button"
                    >
                      Exports
                    </button>
                    <button
                      className={packageWorkspaceMode === "internals" ? "starter-chip active" : "starter-chip"}
                      onClick={() => setPackageWorkspaceMode("internals")}
                      type="button"
                    >
                      Internals
                    </button>
                  </div>
                </div>
                {packageWorkspaceMode === "packages" ? (
                  <BrowserDataTable
                    key="packages-packages"
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "package",
                        label: "Package",
                        render: (row) => <strong>{row.packageName}</strong>,
                        sortValue: (row) => row.packageName
                      },
                      {
                        id: "status",
                        label: "Status",
                        render: (row) => row.nicknameSummary,
                        sortValue: (row) => row.nicknameSummary
                      },
                      {
                        id: "uses",
                        label: "Uses",
                        render: (row) => row.usesSummary,
                        sortValue: (row) => row.usesSummary
                      }
                    ]}
                    emptyMessage="No matching packages are available."
                    filterLabel="Package Filter"
                    filterOptions={buildFilterOptions(packageRows.map((row) => row.nicknameSummary))}
                    getFilterValue={(row) => row.nicknameSummary}
                    getRowKey={(row) => row.key}
                    onSelect={(row) => {
                      setSelectedPackageName(row.packageName);
                      void browseRuntimeEntity(row.packageName, row.packageName, "definitions");
                    }}
                    rows={packageRows}
                    searchPlaceholder="Search packages"
                    selectedKey={packageBrowser?.data.packageName ?? selectedPackageName}
                  />
                ) : (
                  <BrowserDataTable
                    key={`packages-${packageWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols are available in this package lane."
                    filterLabel="Visibility"
                    filterOptions={buildFilterOptions(packageSymbolRows.map((row) => row.kind))}
                    getFilterValue={(row) => row.kind}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(
                        row.symbol,
                        packageBrowser?.data.packageName,
                        row.kind === "generic-function" ? "methods" : "definitions"
                      )
                    }
                    rows={packageSymbolRows}
                    searchPlaceholder={`Search ${packageWorkspaceMode} symbols`}
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                )}
              </div>
            ) : selectedDomain === "symbols" ? (
              <div className="browser-domain-stack">
                <div className="runtime-inspector-controls">
                  <input
                    className="filter-input"
                    onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                    placeholder="Symbol or package"
                    value={runtimeInspectorSymbol}
                  />
                  <input
                    className="filter-input"
                    onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                    placeholder={runtimeSummary?.currentPackage ?? "Package"}
                    value={runtimeInspectorPackage}
                  />
                  <select
                    className="filter-input"
                    onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                    value={runtimeInspectionMode}
                  >
                    <option value="describe">Describe</option>
                    <option value="definitions">Definitions</option>
                    <option value="callers">Callers</option>
                    <option value="methods">Methods</option>
                    <option value="divergence">Drift</option>
                  </select>
                  <button
                    className="action-button"
                    disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                    onClick={() => void inspectRuntimeSymbol()}
                    type="button"
                  >
                    {isInspectingRuntime ? "Inspecting..." : "Browse Entity"}
                  </button>
                </div>
                <div className="browser-domain-toolbar">
                  <div className="browser-action-strip">
                    {kindBuckets.map((bucket) => (
                      <button
                        className={symbolWorkspaceMode === bucket.key ? "starter-chip active" : "starter-chip"}
                        key={bucket.key}
                        onClick={() => setSymbolWorkspaceMode(bucket.key as typeof symbolWorkspaceMode)}
                        type="button"
                      >
                        {bucket.title}
                      </button>
                    ))}
                  </div>
                </div>
                <section className="browser-symbol-panel">
                  <PanelHeader title={activeSymbolBucket.title} subtitle={activeSymbolBucket.subtitle} />
                  <BrowserDataTable
                    key={`symbols-${symbolWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols in this lane."
                    filterLabel="Visibility"
                    filterOptions={buildFilterOptions(activeSymbolRows.map((row) => row.visibility))}
                    getFilterValue={(row) => row.visibility}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(row.symbol, packageBrowser?.data.packageName, row.inspectionMode)
                    }
                    rows={activeSymbolRows}
                    searchPlaceholder="Search symbols"
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                </section>
              </div>
            ) : selectedDomain === "classes-methods" ? (
              <div className="browser-domain-stack">
                <div className="browser-action-strip">
                  <button
                    className={classMethodMode === "classes" ? "starter-chip active" : "starter-chip"}
                    onClick={() => setClassMethodMode("classes")}
                    type="button"
                  >
                    Classes
                  </button>
                  <button
                    className={classMethodMode === "generic-functions" ? "starter-chip active" : "starter-chip"}
                    onClick={() => setClassMethodMode("generic-functions")}
                    type="button"
                    >
                      Generic Functions
                    </button>
                  </div>
                <BrowserDataTable
                  key={`classes-methods-${classMethodMode}`}
                  columnTemplate="minmax(0, 1.25fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "entity",
                      label: classMethodMode === "classes" ? "Class" : "Generic Function",
                      render: (row) => <strong>{row.symbol}</strong>,
                      sortValue: (row) => row.symbol
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "action",
                      label: "Action",
                      render: (row) => row.action,
                      sortValue: (row) => row.action
                    }
                  ]}
                  emptyMessage="No matching entities in this domain."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(classMethodRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) =>
                    void browseRuntimeEntity(
                      row.symbol,
                      packageBrowser?.data.packageName,
                      classMethodMode === "classes" ? "definitions" : "methods"
                    )
                  }
                  rows={classMethodRows}
                  searchPlaceholder={`Search ${classMethodMode === "classes" ? "classes" : "generic functions"}`}
                  selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                />
              </div>
            ) : selectedDomain === "systems" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="systems"
                  columnTemplate="minmax(0, 1.25fr) minmax(0, 0.95fr) minmax(0, 0.75fr) minmax(0, 0.8fr)"
                  columns={[
                    {
                      id: "system",
                      label: "System",
                      render: (row) => <strong>{row.name}</strong>,
                      sortValue: (row) => row.name
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.type,
                      sortValue: (row) => row.type
                    },
                    {
                      id: "status",
                      label: "Status",
                      render: (row) => row.status,
                      sortValue: (row) => row.status
                    },
                    {
                      id: "browse",
                      label: "Browse",
                      render: (row) => row.browse,
                      sortValue: (row) => row.browse
                    }
                  ]}
                  emptyMessage="No loaded systems are available."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(systemRows.map((row) => row.type))}
                  getFilterValue={(row) => row.type}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSystemName(row.name);
                    void browseRuntimeEntity(row.name.toUpperCase(), runtimeSummary?.currentPackage, "definitions");
                  }}
                  rows={systemRows}
                  searchPlaceholder="Search loaded systems"
                  selectedKey={selectedSystem}
                />
              </div>
            ) : selectedDomain === "runtime-objects" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="runtime-objects"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "scope",
                      label: "Scope",
                      render: (row) => <strong>{row.scopeLabel}</strong>,
                      sortValue: (row) => row.scopeLabel
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.scopeLabel} ${row.kind} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No runtime scopes are available."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(runtimeScopeRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedScopeId(row.scopeId);
                    void browseRuntimeEntity(
                      row.symbolName ?? row.packageName,
                      row.packageName,
                      row.symbolName ? "describe" : "definitions"
                    );
                  }}
                  rows={runtimeScopeRows}
                  searchPlaceholder="Search runtime scopes"
                  selectedKey={selectedScope?.scopeId ?? null}
                />
              </div>
            ) : selectedDomain === "source" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="source"
                  columnTemplate="minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.7fr)"
                  columns={[
                    {
                      id: "artifact",
                      label: "Artifact",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "location",
                      label: "Location",
                      render: (row) => row.location,
                      sortValue: (row) => row.location
                    },
                    {
                      id: "role",
                      label: "Role",
                      render: (row) => row.role,
                      sortValue: (row) => row.role
                    }
                  ]}
                  emptyMessage="No source-backed entities are currently in focus."
                  filterLabel="Role"
                  filterOptions={buildFilterOptions(sourceRows.map((row) => row.role))}
                  getFilterValue={(row) => row.role}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSourceEntryKey(row.key);
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={sourceRows}
                  searchPlaceholder="Search source artifacts"
                  selectedKey={selectedSourceEntry ? `${selectedSourceEntry.path}:${selectedSourceEntry.line ?? 0}` : null}
                />
                {selectedSourceEntry ? (
                  <div className="browser-package-card">
                    <strong>{selectedSourceEntry.label}</strong>
                    <p>{selectedSourceEntry.detail}</p>
                    <div className="ref-list">
                      {selectedSourceEntry.path ? <span className="thread-flag">{selectedSourceEntry.path}</span> : null}
                      {selectedSourceEntry.line ? <span className="thread-flag">line {selectedSourceEntry.line}</span> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : selectedDomain === "xref" ? (
              <div className="browser-domain-stack">
                <div className="browser-action-strip">
                  <button
                    className={xrefMode === "incoming" ? "starter-chip active" : "starter-chip"}
                    onClick={() => setXrefMode("incoming")}
                    type="button"
                  >
                    Incoming
                  </button>
                  <button
                    className={xrefMode === "outgoing" ? "starter-chip active" : "starter-chip"}
                    onClick={() => setXrefMode("outgoing")}
                    type="button"
                    >
                      Outgoing
                    </button>
                </div>
                <BrowserDataTable
                  key={`xref-${xrefMode}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                  columns={[
                    {
                      id: "label",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.emphasis,
                      sortValue: (row) => row.emphasis
                    },
                    {
                      id: "detail",
                      label: "Detail",
                      render: (row) => row.detail,
                      sortValue: (row) => row.detail
                    }
                  ]}
                  emptyMessage="No XREF items are available for the current focus."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(xrefRows.map((row) => row.emphasis))}
                  getFilterValue={(row) => row.emphasis}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={xrefRows}
                  searchPlaceholder={`Search ${xrefMode} references`}
                  selectedKey={null}
                />
              </div>
            ) : selectedDomain === "governance" ? (
              <BrowserDataTable
                key="governance"
                columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                columns={[
                  {
                    id: "item",
                    label: "Item",
                    render: (row) => <strong>{row.label}</strong>,
                    sortValue: (row) => row.label
                  },
                  {
                    id: "state",
                    label: "State",
                    render: (row) => row.badge,
                    sortValue: (row) => row.badge
                  },
                  {
                    id: "detail",
                    label: "Detail",
                    render: (row) => row.detail,
                    sortValue: (row) => row.detail
                  }
                ]}
                emptyMessage="No governance-linked entities are loaded."
                filterLabel="State"
                filterOptions={buildFilterOptions(governanceRows.map((row) => row.badge))}
                getFilterValue={(row) => row.badge}
                getRowKey={(row) => row.key}
                onSelect={() => undefined}
                rows={governanceRows}
                searchPlaceholder="Search governance items"
                selectedKey={null}
              />
            ) : selectedDomain === "linked-conversations" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="linked-conversations"
                  columnTemplate="minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "thread",
                      label: "Thread",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label,
                      searchValue: (row) => `${row.label} ${row.detail}`
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => row.state,
                      sortValue: (row) => row.state
                    },
                    {
                      id: "attention",
                      label: "Attention",
                      render: (row) => row.attention,
                      sortValue: (row) => row.attention
                    }
                  ]}
                  emptyMessage="No linked conversation entities are loaded yet."
                  filterLabel="State"
                  filterOptions={buildFilterOptions(linkedConversationRows.map((row) => row.state))}
                  getFilterValue={(row) => row.state}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedLinkedConversationId(row.id);
                    setSelectedThreadId(row.id);
                  }}
                  rows={linkedConversationRows}
                  searchPlaceholder="Search linked conversations"
                  selectedKey={selectedLinkedConversation?.id ?? null}
                />
              </div>
            ) : selectedDomain === "documentation" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="documentation"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "reference",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "category",
                      label: "Category",
                      render: (row) => row.category,
                      sortValue: (row) => row.category
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.label} ${row.category} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No documentation references are available."
                  filterLabel="Category"
                  filterOptions={buildFilterOptions(documentationRows.map((row) => row.category))}
                  getFilterValue={(row) => row.category}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedDocumentationKey(row.key)}
                  rows={documentationRows}
                  searchPlaceholder="Search documentation references"
                  selectedKey={selectedDocumentation.key}
                />
              </div>
            ) : (
              <div className="browser-package-card">
                <strong>{domainDescriptor.label}</strong>
                <p>{domainDescriptor.summary}</p>
              </div>
            )}
          </section>

          <section className="panel browser-source-panel browser-detail-stack browser-active-context">
              <PanelHeader
                title="Active Work Context"
                subtitle="Focus, source, listener, and conversation continuation stay attached to one live development context."
              />
              <div className="browser-focus-card">
                <div>
                  <p className="context-label">In Focus</p>
                  <strong>{runtimeInspection?.data.symbol ?? (runtimeInspectorSymbol || "No entity selected")}</strong>
                  <p>
                    {runtimeInspection
                      ? `${runtimeInspection.data.mode} in ${runtimeInspection.data.packageName}`
                      : "Select a package, system, symbol, artifact, or work item to browse it live."}
                  </p>
                </div>
                <div className="ref-list">
                  {runtimeInspection?.data.runtimePresence ? (
                    <span className="thread-flag">{runtimeInspection.data.runtimePresence}</span>
                  ) : null}
                  {runtimeInspection?.data.divergence ? (
                    <span className="thread-flag">{runtimeInspection.data.divergence}</span>
                  ) : null}
                </div>
              </div>
              <section className="browser-context-section">
                <div className="browser-action-strip">
                  <button
                    className="starter-chip"
                    disabled={isInspectingRuntime || focusedSymbol.trim().length === 0}
                    onClick={() => void browseRuntimeEntity(focusedSymbol, focusedPackage || undefined, "describe")}
                    type="button"
                  >
                    Describe
                  </button>
                  <button
                    className="starter-chip"
                    disabled={isInspectingRuntime || focusedSymbol.trim().length === 0}
                    onClick={() => void browseRuntimeEntity(focusedSymbol, focusedPackage || undefined, "definitions")}
                    type="button"
                  >
                    Definitions
                  </button>
                  <button
                    className="starter-chip"
                    disabled={isInspectingRuntime || focusedSymbol.trim().length === 0}
                    onClick={() => void browseRuntimeEntity(focusedSymbol, focusedPackage || undefined, "callers")}
                    type="button"
                  >
                    Callers
                  </button>
                  <button
                    className="starter-chip"
                    disabled={isInspectingRuntime || focusedSymbol.trim().length === 0}
                    onClick={() => void browseRuntimeEntity(focusedSymbol, focusedPackage || undefined, "methods")}
                    type="button"
                  >
                    Methods
                  </button>
                  <button
                    className="starter-chip"
                    disabled={isInspectingRuntime || focusedSymbol.trim().length === 0}
                    onClick={() => void browseRuntimeEntity(focusedSymbol, focusedPackage || undefined, "divergence")}
                    type="button"
                  >
                    Drift
                  </button>
                  <button
                    className="starter-chip"
                    disabled={!sourceBackedDetailItem?.path}
                    onClick={() => {
                      if (sourceBackedDetailItem?.path) {
                        void loadSourcePreview(sourceBackedDetailItem.path, sourceBackedDetailItem.line ?? undefined);
                      }
                    }}
                    type="button"
                  >
                    Open Source
                  </button>
                </div>
                <div className="browser-semantic-card">
                  <div>
                    <p className="context-label">Runtime Entity Detail</p>
                    <strong>
                      {runtimeEntityDetail?.data.entityKind ?? focusedPackageSymbol?.kind ?? "unknown"}
                    </strong>
                    <p>
                      {runtimeEntityDetail?.data.summary ??
                        "Select a live entity to project its actual runtime shape into the browser."}
                    </p>
                  </div>
                  <Badge tone="steady">
                    {runtimeEntityDetail?.data.signature ?? "No signature"}
                  </Badge>
                </div>
              </section>
              <div className="browser-workflow-grid">
                <section className="browser-entity-panel browser-listener-panel">
                  <PanelHeader
                    title="Listener Handoff"
                    subtitle="Browser selections should produce an executable next step in the live image."
                  />
                  <div className="browser-source-status">
                    <strong>Prefilled Listener Form</strong>
                    <p>Current browser focus is projected into the REPL so inspection can continue interactively.</p>
                  </div>
                  <LispCodeBlock
                    className="browser-listener-preview"
                    code={activeListenerForm}
                    parenDepthColors={parenDepthColors}
                  />
                  <div className="browser-action-strip">
                    <button
                      className="starter-chip"
                      onClick={() => navigateToWorkspace("runtime")}
                      type="button"
                    >
                      Open In Listener
                    </button>
                    {entityQuickForms.map((item) => (
                      <button
                        className="starter-chip"
                        key={item.id}
                        onClick={() => {
                          setListenerActionMode("custom");
                          setCustomListenerForm(item.form);
                          setRuntimeForm(item.form);
                        }}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="browser-entity-panel browser-conversation-panel">
                  <PanelHeader
                    title="Conversation Handoff"
                    subtitle="Browser context should seed the next structured continuation, not disappear at the workspace boundary."
                  />
                  <div className="browser-source-status">
                    <strong>Draft Continuation</strong>
                    <p>The current focus is also projected into a reusable conversation prompt.</p>
                  </div>
                  <pre className="runtime-preview browser-conversation-preview">{conversationHandoffPrompt}</pre>
                  <div className="browser-action-strip">
                    <button
                      className="starter-chip"
                      onClick={() => {
                        setConversationDraft(conversationHandoffPrompt);
                        navigateToWorkspace("conversations");
                      }}
                      type="button"
                    >
                      Open In Conversations
                    </button>
                  </div>
                </section>
              </div>
              {runtimeEntityDetail ? (
                <div className="browser-entity-detail-grid">
                  <section className="browser-entity-panel">
                    <PanelHeader
                      title="Entity Facets"
                      subtitle="Runtime-backed semantic detail, not inferred dashboard text."
                    />
                    <div className="entity-list">
                      {runtimeEntityDetail.data.facets.map((facet) => (
                        <div className="thread-row static-row" key={`${facet.label}:${facet.value}`}>
                          <div className="thread-row-top">
                            <strong>{facet.label}</strong>
                          </div>
                          <p>{facet.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="browser-entity-panel">
                    <PanelHeader
                      title="Related Runtime Structure"
                      subtitle="Methods, slots, and definitions stay attached to the selected entity."
                    />
                    <div className="entity-list">
                      {runtimeEntityDetail.data.relatedItems.length > 0 ? (
                        runtimeEntityDetail.data.relatedItems.map((item) => (
                          <button
                            className="thread-row"
                            key={`${item.label}:${item.detail}:${item.line ?? 0}`}
                            onClick={() => {
                              if (item.path) {
                                void loadSourcePreview(item.path, item.line ?? undefined);
                              }
                            }}
                            type="button"
                          >
                            <div className="thread-row-top">
                              <strong>{item.label}</strong>
                              {item.emphasis ? <Badge tone="steady">{item.emphasis}</Badge> : null}
                            </div>
                            <p>{item.detail}</p>
                            {item.path ? (
                              <div className="thread-row-meta">
                                <span>{item.path}</span>
                                {item.line ? <span>line {item.line}</span> : null}
                              </div>
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <p className="list-empty">No related runtime structure was returned for this entity yet.</p>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}
              <section className="browser-context-section">
                <PanelHeader
                  title="Source Pane"
                  subtitle="The selected live entity should reveal, edit, and reload source from the same browser surface."
                />
                {sourcePreview ? (
                  <div className="runtime-result-stack">
                    <div className="thread-row-meta">
                      <span>{sourcePreview.data.path}</span>
                      {sourcePreview.data.focusLine ? <span>line {sourcePreview.data.focusLine}</span> : null}
                    </div>
                    <div className="browser-action-strip">
                      <button
                        className="starter-chip"
                        onClick={() => {
                          setListenerActionMode("inspect");
                          setRuntimeForm(sourceOperationForms.inspect);
                        }}
                        type="button"
                      >
                        Inspect In Listener
                      </button>
                      <button
                        className="starter-chip"
                        onClick={() => {
                          setListenerActionMode("reload");
                          setRuntimeForm(sourceOperationForms.reload);
                        }}
                        type="button"
                      >
                        Reload In Listener
                      </button>
                      <button
                        className="starter-chip"
                        onClick={() => {
                          setListenerActionMode("evaluate");
                          setRuntimeForm(sourceOperationForms.evaluate);
                        }}
                        type="button"
                      >
                        Evaluate Near Focus
                      </button>
                    </div>
                    <div className="browser-source-actions">
                      <button
                        className="starter-chip"
                        onClick={() => setIsEditingSource(!isEditingSource)}
                        type="button"
                      >
                        {isEditingSource ? "Preview" : "Edit"}
                      </button>
                      <button
                        className="starter-chip"
                        disabled={!isEditingSource}
                        onClick={() => {
                          setSourceDraft(sourcePreview.data.editableContent);
                          setIsEditingSource(false);
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        className="starter-chip"
                        disabled={!isEditingSource || !sourceDraftDirty || isStagingSource}
                        onClick={() => void stageSourceChange()}
                        type="button"
                      >
                        {isStagingSource ? "Staging..." : "Stage Change"}
                      </button>
                      <button
                        className="starter-chip"
                        disabled={isEditingSource || isReloadingSource}
                        onClick={() => void reloadSourceFile()}
                        type="button"
                      >
                        {isReloadingSource ? "Reloading..." : "Reload File"}
                      </button>
                    </div>
                    {sourceMutationResult ? (
                      <div className="browser-source-status">
                        <strong>Stage Result</strong>
                        <p>{sourceMutationResult.data.summary}</p>
                      </div>
                    ) : null}
                    {sourceReloadResult ? (
                      <div className="browser-source-status">
                        <strong>Reload Result</strong>
                        <p>{sourceReloadResult.data.summary}</p>
                      </div>
                    ) : null}
                    {isEditingSource ? (
                      <textarea
                        className="source-editor"
                        onChange={(event) => setSourceDraft(event.target.value)}
                        spellCheck={false}
                        value={sourceDraft}
                      />
                    ) : (
                      <LispCodeBlock code={sourcePreview.data.content} parenDepthColors={parenDepthColors} />
                    )}
                  </div>
                ) : (
                  <p className="list-empty">Select a definition or caller entry to view source here.</p>
                )}
              </section>
              {selectedDomain === "governance" ? (
                <section className="browser-entity-panel">
                  <PanelHeader
                    title="Governance Attachment"
                    subtitle="Approvals, incidents, and work remain attached to the focused environment entity."
                  />
                  <div className="entity-list">
                    {governanceEntries.slice(0, 4).map((entry) => (
                      <div className="thread-row static-row" key={`attachment:${entry.id}`}>
                        <div className="thread-row-top">
                          <strong>{entry.label}</strong>
                          <Badge tone="steady">{entry.badge}</Badge>
                        </div>
                        <p>{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              {selectedDomain === "linked-conversations" ? (
                <section className="browser-entity-panel">
                  <PanelHeader
                    title="Linked Conversations"
                    subtitle="Conversation continuations attached to the current environment focus."
                  />
                  <div className="entity-list">
                    {linkedConversationEntries.slice(0, 4).map((entry) => (
                      <div className="thread-row static-row" key={`conversation:${entry.id}`}>
                        <div className="thread-row-top">
                          <strong>{entry.label}</strong>
                          <Badge tone="steady">{entry.badge}</Badge>
                        </div>
                        <p>{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
          </section>
        </div>
      </div>
      <section className="panel browser-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Browser Objective</p>
            <h3>{runtimeInspectorSymbol || runtimeSummary?.currentPackage || "System Browser"}</h3>
          </div>
          <Badge tone={runtimeInspection ? "active" : "steady"}>{runtimeInspectionMode}</Badge>
        </div>
        <p className="lead-copy">{browserObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Systems</span>
            <strong>{runtimeSummary?.loadedSystemCount ?? 0}</strong>
            <p>{runtimeSummary?.loadedSystems[0] ?? "No system loaded yet."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Artifacts</span>
            <strong>{artifacts.length}</strong>
            <p>{artifacts[0]?.title ?? "No artifact selected."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Governed Work</span>
            <strong>{workItems.length}</strong>
            <p>{workItems[0]?.title ?? "No work item loaded."}</p>
          </div>
        </div>
        <div className="browser-package-strip">
          {packageNames.map((packageName) => (
            <button
              className={packageName === selectedPackageName ? "starter-chip active" : "starter-chip"}
              key={packageName}
              onClick={() => {
                setSelectedPackageName(packageName);
                void browseRuntimeEntity(packageName, packageName, "definitions");
              }}
              type="button"
            >
              {packageName}
            </button>
          ))}
        </div>
      </section>
      <JourneyStageStrip
        eyebrow="System Browser"
        summary="The browser should expose the living Lisp system directly: packages, symbols, source, and governed artifacts in one inspectable environment."
        steps={[
          {
            id: "browse-system",
            title: "Browse System",
            summary: "Start from loaded systems and runtime scopes, not a detached file tree.",
            tone: runtimeSummary ? "active" : "warning"
          },
          {
            id: "inspect-entity",
            title: "Inspect Entity",
            summary: "Packages, symbols, methods, callers, and drift become browseable runtime entities.",
            tone: runtimeInspection ? "active" : "steady"
          },
          {
            id: "view-source",
            title: "View Source",
            summary: "Source follows the selected live entity and stays attached to the current environment truth.",
            tone: sourcePreview ? "active" : "steady"
          }
        ]}
        title="Browser Journey"
      />
    </div>
  );
}

function ConversationsWorkspace({
  selectedSection,
  conversationDraft,
  threads,
  selectedThreadId,
  selectedThread,
  selectedTurnId,
  selectedTurn,
  setConversationDraft,
  setSelectedThreadId,
  setSelectedTurnId
}: {
  selectedSection: ConversationSection;
  conversationDraft: string;
  threads: ThreadSummaryDto[];
  selectedThreadId: string | null;
  selectedThread: ThreadDetailDto | null;
  selectedTurnId: string | null;
  selectedTurn: TurnDetailDto | null;
  setConversationDraft: (value: string) => void;
  setSelectedThreadId: (threadId: string) => void;
  setSelectedTurnId: (turnId: string) => void;
}) {
  const conversationObjective =
    selectedTurn?.summary ??
    selectedThread?.summary ??
    threads[0]?.summary ??
    "Select the active thread, inspect the current turn, and keep linked entities attached to the same conversation continuation.";

  const threadRows = threads.map((thread) => ({
    key: thread.threadId,
    title: thread.title,
    state: thread.state,
    latestTurnState: thread.latestTurnState,
    latestActivityAt: thread.latestActivityAt,
    summary: thread.summary,
    flags: thread.attentionFlags
  }));

  const turnRows =
    selectedThread?.turns.map((turn) => ({
      key: turn.turnId,
      title: turn.title,
      state: turn.state,
      createdAt: turn.createdAt
    })) ?? [];

  return (
    <div className="conversations-journey">
      <div className="conversation-layout">
        {selectedSection === "threads" ? (
          <>
            <section className="panel conversation-list-panel">
              <PanelHeader
                title="Conversation Threads"
                subtitle="Structured threads stay visible as runtime work, not transcript tabs."
              />
              <BrowserDataTable
                key="conversation-threads"
                columnTemplate="minmax(0, 1.15fr) minmax(0, 0.72fr) minmax(0, 0.78fr) minmax(0, 0.92fr) minmax(0, 1.35fr)"
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
                    render: (row) => <Badge tone={toneForThreadState(row.state)}>{row.state}</Badge>,
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
                  }
                ]}
                emptyMessage="No structured conversation threads are available."
                filterLabel="State"
                filterOptions={Array.from(new Set(threadRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
                getFilterValue={(row) => row.state}
                getRowKey={(row) => row.key}
                onSelect={(row) => setSelectedThreadId(row.key)}
                rows={threadRows}
                searchPlaceholder="Search conversation threads"
                selectedKey={selectedThreadId}
              />
            </section>

            {selectedThread ? (
              <section className="conversation-detail-panel">
                <section className="panel conversation-thread-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Selected Thread</p>
                      <h3>{selectedThread.title}</h3>
                    </div>
                    <Badge tone={toneForThreadState(selectedThread.state)}>{selectedThread.state}</Badge>
                  </div>
                  <div className="browser-focus-card">
                    <div>
                      <p className="context-label">Conversation Focus</p>
                      <strong>{selectedThread.title}</strong>
                      <p>{selectedThread.summary}</p>
                    </div>
                    <Badge tone="steady">{`${selectedThread.turns.length} turns`}</Badge>
                  </div>
                  <div className="signal-digest-grid conversation-detail-digest">
                    <div className="signal-digest-card">
                      <span className="context-label">Messages</span>
                      <strong>{selectedThread.messages.length}</strong>
                      <p>Conversation state remains inspectable as structured messages, not hidden transcript state.</p>
                    </div>
                    <div className="signal-digest-card">
                      <span className="context-label">Linked Entities</span>
                      <strong>{selectedThread.linkedEntities.length}</strong>
                      <p>References stay durable and attached to the selected thread.</p>
                    </div>
                  </div>
                  <div className="message-stack">
                    {selectedThread.messages.map((message) => (
                      <MessageBubble key={message.messageId} message={message} />
                    ))}
                  </div>
                  <section className="linked-entities-panel">
                    <PanelHeader title="Linked Entities" subtitle="Governed references remain explicit, not hidden in transcript." />
                    <LinkedEntityList entities={selectedThread.linkedEntities} />
                  </section>
                </section>
              </section>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Thread Selected</p>
                <h3>Select a thread from the table to inspect structured conversation state.</h3>
              </div>
            )}
          </>
        ) : null}

        {selectedSection === "turns" ? (
          <>
            {selectedThread ? (
              <>
                <section className="panel conversation-turns-panel">
                  <PanelHeader
                    title="Turn Lifecycle"
                    subtitle={`Turns for ${selectedThread.title} remain explicit lifecycle records with searchable, sortable supervision.`}
                  />
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
                        render: (row) => <Badge tone={toneForTurnState(row.state)}>{row.state}</Badge>,
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
                    onSelect={(row) => setSelectedTurnId(row.key)}
                    rows={turnRows}
                    searchPlaceholder="Search turns"
                    selectedKey={selectedTurnId}
                  />
                </section>

                {selectedTurn ? (
                  <section className="conversation-detail-panel">
                    <section className="panel turn-detail-panel">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Selected Turn</p>
                          <h3>{selectedTurn.title}</h3>
                        </div>
                        <Badge tone={toneForTurnState(selectedTurn.state)}>{selectedTurn.state}</Badge>
                      </div>
                      <div className="browser-focus-card">
                        <div>
                          <p className="context-label">Turn Summary</p>
                          <strong>{selectedTurn.title}</strong>
                          <p>{selectedTurn.summary}</p>
                        </div>
                        <Badge tone="steady">{selectedTurn.createdAt}</Badge>
                      </div>
                      <div className="turn-refs-grid">
                        <RefBlock label="Operations" values={selectedTurn.operationIds} />
                        <RefBlock label="Artifacts" values={selectedTurn.artifactIds} />
                        <RefBlock label="Incidents" values={selectedTurn.incidentIds} />
                        <RefBlock label="Approvals" values={selectedTurn.approvalIds} />
                        <RefBlock label="Work Items" values={selectedTurn.workItemIds} />
                      </div>
                    </section>

                    <section className="panel conversation-thread-panel">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">Thread Scope</p>
                          <h3>{selectedThread.title}</h3>
                        </div>
                        <Badge tone={toneForThreadState(selectedThread.state)}>{selectedThread.state}</Badge>
                      </div>
                      <p className="lead-copy">{selectedThread.summary}</p>
                      <section className="linked-entities-panel">
                        <PanelHeader title="Linked Entities" subtitle="Turn interpretation remains anchored in thread-level governed context." />
                        <LinkedEntityList entities={selectedThread.linkedEntities} />
                      </section>
                    </section>
                  </section>
                ) : (
                  <div className="empty-state">
                    <p className="eyebrow">No Turn Selected</p>
                    <h3>Select a turn from the lifecycle table to inspect governed references.</h3>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Thread Selected</p>
                <h3>Select a thread in the Threads view first to inspect its lifecycle turns.</h3>
              </div>
            )}
          </>
        ) : null}

        {selectedSection === "draft" ? (
          <>
            <section className="panel conversation-thread-panel">
              <PanelHeader
                title="Draft Continuation"
                subtitle="Compose the next supervised conversation step against the currently selected thread context."
              />
              <textarea
                className="runtime-editor conversation-draft-editor"
                onChange={(event) => setConversationDraft(event.target.value)}
                value={conversationDraft}
              />
            </section>

            {selectedThread ? (
              <section className="conversation-detail-panel">
                <section className="panel conversation-thread-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Draft Context</p>
                      <h3>{selectedThread.title}</h3>
                    </div>
                    <Badge tone={toneForThreadState(selectedThread.state)}>{selectedThread.state}</Badge>
                  </div>
                  <div className="browser-focus-card">
                    <div>
                      <p className="context-label">Selected Thread</p>
                      <strong>{selectedThread.title}</strong>
                      <p>{selectedThread.summary}</p>
                    </div>
                    <Badge tone="steady">{`${selectedThread.messages.length} messages`}</Badge>
                  </div>
                  <div className="signal-digest-grid conversation-detail-digest">
                    <div className="signal-digest-card">
                      <span className="context-label">Turns</span>
                      <strong>{selectedThread.turns.length}</strong>
                      <p>Drafting remains grounded in the current continuation rather than detached note taking.</p>
                    </div>
                    <div className="signal-digest-card">
                      <span className="context-label">Linked Entities</span>
                      <strong>{selectedThread.linkedEntities.length}</strong>
                      <p>Relevant artifacts, approvals, and incidents remain visible while composing the next turn.</p>
                    </div>
                  </div>
                  <section className="linked-entities-panel">
                    <PanelHeader title="Linked Entities" subtitle="Use these references to keep the drafted continuation attached to the same governed context." />
                    <LinkedEntityList entities={selectedThread.linkedEntities} />
                  </section>
                </section>
              </section>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Thread Selected</p>
                <h3>Select a thread in the Threads view first so the draft has conversation context.</h3>
              </div>
            )}
          </>
        ) : null}

        <section className="panel conversation-objective-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Conversation Context</p>
              <h3>{selectedTurn?.title ?? selectedThread?.title ?? threads[0]?.title ?? "No conversation selected"}</h3>
            </div>
            <Badge tone={selectedTurn ? toneForTurnState(selectedTurn.state) : selectedThread ? toneForThreadState(selectedThread.state) : "steady"}>
              {selectedTurn?.state ?? selectedThread?.state ?? "idle"}
            </Badge>
          </div>
          <p className="lead-copy">{conversationObjective}</p>
          <div className="signal-digest-grid execution-objective-digest">
            <div className="signal-digest-card">
              <span className="context-label">Threads</span>
              <strong>{threads.length}</strong>
              <p>{threads[0]?.title ?? "No structured thread is available."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">Turns</span>
              <strong>{selectedThread?.turns.length ?? 0}</strong>
              <p>{selectedTurn?.title ?? "No turn is selected."}</p>
            </div>
            <div className="signal-digest-card">
              <span className="context-label">References</span>
              <strong>{selectedThread?.linkedEntities.length ?? 0}</strong>
              <p>{selectedThread ? "Linked entities remain explicit within the conversation continuation." : "Linked context appears once a thread is selected."}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RuntimeWorkspace({
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
  isInspectingRuntime
}: {
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
}) {
  const scopeRows = runtimeSummary?.scopes.map((scope) => ({
    key: scope.scopeId,
    packageName: scope.packageName,
    symbolName: scope.symbolName ?? "",
    kind: scope.kind,
    summary: scope.summary
  })) ?? [];
  const [selectedScopeKey, setSelectedScopeKey] = useState<string | null>(scopeRows[0]?.key ?? null);

  useEffect(() => {
    if (!scopeRows.some((scope) => scope.key === selectedScopeKey)) {
      setSelectedScopeKey(scopeRows[0]?.key ?? null);
    }
  }, [scopeRows, selectedScopeKey]);

  const selectedScope = scopeRows.find((scope) => scope.key === selectedScopeKey) ?? scopeRows[0] ?? null;

  if (!runtimeSummary) {
    return (
      <div className="empty-state">
        <p className="eyebrow">No Runtime Loaded</p>
        <h3>Bind an environment to inspect the live image.</h3>
      </div>
    );
  }

  return (
    <div className="runtime-grid">
      <section className="panel runtime-scope-panel">
        <PanelHeader
          title="Inspection Scopes"
          subtitle="Packages, symbols, and loaded definitions stay available as execution inspection entry points."
        />
        <BrowserDataTable
          key="runtime-scopes"
          columnTemplate="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
          columns={[
            {
              id: "package",
              label: "Package",
              render: (row) => <strong>{row.packageName}</strong>,
              sortValue: (row) => row.packageName,
              searchValue: (row) => `${row.packageName} ${row.symbolName} ${row.summary}`
            },
            {
              id: "symbol",
              label: "Symbol",
              render: (row) => row.symbolName || "Package Scope",
              sortValue: (row) => row.symbolName || row.packageName
            },
            {
              id: "kind",
              label: "Kind",
              render: (row) => <Badge tone="steady">{row.kind}</Badge>,
              sortValue: (row) => row.kind
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => row.summary
            }
          ]}
          emptyMessage="No inspection scopes are available."
          filterLabel="Kind"
          filterOptions={Array.from(new Set(scopeRows.map((row) => row.kind))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.kind}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedScopeKey(row.key)}
          rows={scopeRows}
          searchPlaceholder="Search scopes"
          selectedKey={selectedScopeKey}
        />
      </section>

      <section className="panel runtime-inspector-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Inspector</p>
            <h3>Live Symbol And XREF</h3>
          </div>
          <Badge tone="steady">{runtimeInspectionMode}</Badge>
        </div>
        <div className="runtime-inspector-controls">
          <input
            className="filter-input"
            onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
            placeholder="Symbol"
            value={runtimeInspectorSymbol}
          />
          <input
            className="filter-input"
            onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
            placeholder={runtimeSummary.currentPackage}
            value={runtimeInspectorPackage}
          />
          <select
            className="filter-input"
            onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
            value={runtimeInspectionMode}
          >
            <option value="describe">Describe</option>
            <option value="definitions">Find Definition</option>
            <option value="callers">Who Calls This</option>
            <option value="methods">Methods</option>
            <option value="divergence">Source/Image Drift</option>
          </select>
          <button
            className="action-button"
            disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
            onClick={() => void inspectRuntimeSymbol()}
            type="button"
          >
            {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
          </button>
        </div>
        {selectedScope ? (
          <div className="browser-focus-card runtime-scope-focus">
            <div>
              <p className="context-label">Selected Scope</p>
              <strong>{selectedScope.symbolName ? `${selectedScope.packageName} / ${selectedScope.symbolName}` : selectedScope.packageName}</strong>
              <p>{selectedScope.summary}</p>
            </div>
            <button
              className="starter-chip"
              onClick={() => {
                setRuntimeInspectorPackage(selectedScope.packageName);
                setRuntimeInspectorSymbol(selectedScope.symbolName);
              }}
              type="button"
            >
              Load Into Inspector
            </button>
          </div>
        ) : null}
        {runtimeInspection ? (
          <div className="runtime-result-stack">
            <p className="lead-copy">{runtimeInspection.data.summary}</p>
            <div className="ref-list">
              <span className="thread-flag">{runtimeInspection.data.packageName}</span>
              {runtimeInspection.data.runtimePresence ? (
                <span className="thread-flag">{runtimeInspection.data.runtimePresence}</span>
              ) : null}
              {runtimeInspection.data.divergence ? (
                <span className="thread-flag">{runtimeInspection.data.divergence}</span>
              ) : null}
            </div>
            <div className="entity-list">
              {runtimeInspection.data.items.map((item) => (
                <div className="entity-row" key={`${item.label}:${item.detail}`}>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  {item.emphasis ? <Badge tone="steady">{item.emphasis}</Badge> : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="list-empty">
            Inspect a symbol to get live object metadata, definitions, callers, methods, or source/image drift.
          </p>
        )}
      </section>

      <section className="panel runtime-eval-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">REPL</p>
            <h3>Listener</h3>
          </div>
          <Badge tone="active">{runtimeSummary.currentPackage}</Badge>
        </div>
        <textarea
          className="runtime-editor"
          onChange={(event) => setRuntimeForm(event.target.value)}
          value={runtimeForm}
        />
        <button
          className="action-button"
          disabled={isEvaluating || runtimeForm.trim().length === 0}
          onClick={() => void evaluateRuntimeForm()}
          type="button"
        >
          {isEvaluating ? "Evaluating..." : "Run Form"}
        </button>
      </section>

      <section className="panel runtime-result-panel">
        <PanelHeader
          title="Listener Result"
          subtitle="Evaluation remains governed, but the primary surface is still direct interactive development against the live image."
        />
        {runtimeResult ? (
          <div className="runtime-result-stack">
            <div className="runtime-result-header">
              <Badge tone={toneForCommandStatus(runtimeResult.status)}>{runtimeResult.status}</Badge>
              <span className="runtime-result-op">{runtimeResult.operation}</span>
            </div>
            <p className="lead-copy">{runtimeResult.data.summary}</p>
            {runtimeResult.data.valuePreview ? (
              <pre className="runtime-preview">{runtimeResult.data.valuePreview}</pre>
            ) : null}
            <div className="ref-list">
              {runtimeResult.data.operationId ? <span className="thread-flag">{runtimeResult.data.operationId}</span> : null}
              {runtimeResult.data.approvalId ? <span className="thread-flag">{runtimeResult.data.approvalId}</span> : null}
              {runtimeResult.data.incidentId ? <span className="thread-flag">{runtimeResult.data.incidentId}</span> : null}
              {runtimeResult.data.artifactIds.map((artifactId) => (
                <span className="thread-flag" key={artifactId}>
                  {artifactId}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="list-empty">Run a form to see governed runtime results here.</p>
        )}
      </section>

      <section className="panel runtime-summary-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Live Image</p>
            <h3>Listener Runtime Context</h3>
          </div>
          <Badge tone={runtimeSummary.activeMutations > 0 ? "warning" : "active"}>
            {runtimeSummary.currentPackage}
          </Badge>
        </div>
        <div className="runtime-summary-grid">
          <ContextBlock label="Runtime Id" value={runtimeSummary.runtimeId} />
          <ContextBlock label="Loaded Systems" value={String(runtimeSummary.loadedSystemCount)} />
          <ContextBlock label="Active Mutations" value={String(runtimeSummary.activeMutations)} />
          <ContextBlock label="Linked Incidents" value={String(runtimeSummary.linkedIncidentIds.length)} />
        </div>
        <div className="runtime-loaded-systems">
          {runtimeSummary.loadedSystems.map((systemName) => (
            <span className="thread-flag" key={systemName}>
              {systemName}
            </span>
          ))}
        </div>
        <p className="lead-copy">{runtimeSummary.divergencePosture}</p>
        <p className="mission-support">{runtimeSummary.sourceRelationship}</p>
      </section>
    </div>
  );
}

function ApprovalsWorkspace({
  approvalRequests,
  selectedApprovalId,
  selectedApproval,
  approvalDecision,
  isDecidingApproval,
  setSelectedApprovalId,
  submitApprovalDecision
}: {
  approvalRequests: ApprovalRequestSummaryDto[];
  selectedApprovalId: string | null;
  selectedApproval: ApprovalRequestDto | null;
  approvalDecision: CommandResultDto<ApprovalDecisionDto> | null;
  isDecidingApproval: boolean;
  setSelectedApprovalId: (requestId: string) => void;
  submitApprovalDecision: (decision: "approve" | "deny") => Promise<void>;
}) {
  const approvalRows = approvalRequests.map((request) => ({
    key: request.requestId,
    title: request.title,
    state: request.state,
    requestId: request.requestId,
    summary: request.summary
  }));

  return (
    <div className="approvals-grid">
      <section className="approvals-list-panel">
        <PanelHeader
          title="Governed Decisions"
          subtitle="Approvals appear here as execution decisions with consequence, not as detached prompts."
        />
        <BrowserDataTable
          key="execution-approvals"
          columnTemplate="minmax(0, 1.15fr) minmax(0, 0.8fr) minmax(0, 0.95fr) minmax(0, 1.45fr)"
          columns={[
            {
              id: "title",
              label: "Request",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title,
              searchValue: (row) => `${row.title} ${row.summary} ${row.requestId}`
            },
            {
              id: "state",
              label: "State",
              render: (row) => <Badge tone={toneForApprovalState(row.state)}>{row.state}</Badge>,
              sortValue: (row) => row.state
            },
            {
              id: "id",
              label: "Request Id",
              render: (row) => row.requestId,
              sortValue: (row) => row.requestId
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => row.summary
            }
          ]}
          emptyMessage="No approval requests in this environment."
          filterLabel="State"
          filterOptions={Array.from(new Set(approvalRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.state}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedApprovalId(row.key)}
          rows={approvalRows}
          searchPlaceholder="Search approval requests"
          selectedKey={selectedApprovalId}
        />
      </section>

      <section className="approval-detail-panel">
        {selectedApproval ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Decision Context</p>
                <h3>{selectedApproval.title}</h3>
              </div>
              <Badge tone={toneForApprovalState(selectedApproval.state)}>
                {selectedApproval.state}
              </Badge>
            </div>
            <div className="browser-focus-card">
              <div>
                <p className="context-label">Requested Action</p>
                <strong>{selectedApproval.requestedAction}</strong>
                <p>{selectedApproval.summary}</p>
              </div>
              <Badge tone="steady">{selectedApproval.createdAt}</Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Scope" value={selectedApproval.scopeSummary} />
              <ContextBlock label="Policy" value={selectedApproval.policyId ?? "None"} />
              <ContextBlock label="Created" value={selectedApproval.createdAt} />
              <ContextBlock label="State" value={selectedApproval.state} />
            </div>
            <div className="approval-explanation">
              <p className="lead-copy">{selectedApproval.rationale}</p>
              <p className="mission-support">{selectedApproval.consequenceSummary}</p>
            </div>
            <section className="linked-entities-panel">
              <PanelHeader title="Linked Context" subtitle="Turns, operations, work, and incidents stay visible before decision." />
              <LinkedEntityList entities={selectedApproval.linkedEntities} />
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Approval Selected</p>
            <h3>Select an approval request to inspect its governed decision context.</h3>
          </div>
        )}
      </section>

      <section className="approval-action-panel">
        <div className="panel">
          <PanelHeader title="Apply Decision" subtitle="The operator either unblocks execution or diverts it into a different governed path." />
          <div className="approval-actions">
            <button
              className="action-button"
              disabled={!selectedApproval || isDecidingApproval}
              onClick={() => void submitApprovalDecision("approve")}
              type="button"
            >
              {isDecidingApproval ? "Submitting..." : "Approve Request"}
            </button>
            <button
              className="action-button deny-button"
              disabled={!selectedApproval || isDecidingApproval}
              onClick={() => void submitApprovalDecision("deny")}
              type="button"
            >
              {isDecidingApproval ? "Submitting..." : "Deny Request"}
            </button>
          </div>
          {approvalDecision ? (
            <div className="runtime-result-stack">
              <div className="runtime-result-header">
                <Badge tone={toneForApprovalDecision(approvalDecision.data.decision)}>
                  {approvalDecision.data.decision}
                </Badge>
                <span className="runtime-result-op">{approvalDecision.operation}</span>
              </div>
              <p className="lead-copy">{approvalDecision.data.summary}</p>
              <div className="ref-list">
                {approvalDecision.data.resumedEntityIds.map((entityId) => (
                  <span className="thread-flag" key={entityId}>
                    {entityId}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="list-empty">Select an approval request to decide it here.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function IncidentsWorkspace({
  incidents,
  selectedIncidentId,
  selectedIncident,
  setSelectedIncidentId
}: {
  incidents: IncidentSummaryDto[];
  selectedIncidentId: string | null;
  selectedIncident: IncidentDetailDto | null;
  setSelectedIncidentId: (incidentId: string) => void;
}) {
  const selectedIncidentArtifactIds = selectedIncident?.artifactIds ?? [];
  const selectedIncidentLinkedCount = selectedIncident?.linkedEntities.length ?? 0;
  const recoveryObjective =
    selectedIncident?.nextAction ??
    selectedIncident?.recoverySummary ??
    "Assess the dominant incident, restore trust, and only then return the environment to execution.";

  return (
    <div className="incidents-grid">
      <JourneyStageStrip
        eyebrow="Recovery Flow"
        summary="Recovery should guide the operator from failure assessment into restoration, then back toward trustworthy continuation."
        steps={[
          {
            id: "assess",
            title: "Assess Failure",
            summary: "Identify the dominant incident, severity, and recovery state without losing connection to runtime context.",
            tone: incidents.length > 0 ? "danger" : "steady"
          },
          {
            id: "restore",
            title: "Restore Trust",
            summary: "Use linked work and evidence to drive the environment toward a state that can be trusted again.",
            tone:
              selectedIncident?.recoveryState === "awaiting_acknowledgement"
                ? "danger"
                : selectedIncident?.recoveryState === "active_recovery"
                  ? "warning"
                  : selectedIncident
                    ? "active"
                    : "steady"
          },
          {
            id: "resume",
            title: "Resume Execution",
            summary: "Recovery is complete only when the environment can re-enter execution without hidden obligations.",
            tone: selectedIncidentArtifactIds.length > 0 || selectedIncidentLinkedCount > 0 ? "active" : "steady"
          }
        ]}
        title="Recovery Journey"
      />
      <section className="panel recovery-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Recovery Objective</p>
            <h3>{selectedIncident?.title ?? "No incident selected"}</h3>
          </div>
          <Badge tone={selectedIncident ? toneForIncidentSeverity(selectedIncident.severity) : "steady"}>
            {selectedIncident?.state ?? "clear"}
          </Badge>
        </div>
        <p className="lead-copy">{recoveryObjective}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Incidents</span>
            <strong>{incidents.length}</strong>
            <p>{incidents[0]?.title ?? "No incident dominates the environment."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Recovery State</span>
            <strong>{selectedIncident?.recoveryState ?? "idle"}</strong>
            <p>{selectedIncident?.blockedReason ?? "Recovery can proceed without an explicit blocking reason."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Evidence</span>
            <strong>{selectedIncidentArtifactIds.length}</strong>
            <p>{selectedIncidentArtifactIds.length > 0 ? "Recovery evidence is already attached to the incident." : "No explicit recovery evidence is attached yet."}</p>
          </div>
        </div>
      </section>

      <div className="recovery-layout">
        <section className="incidents-list-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Assess Failure</p>
              <p className="panel-subtitle">Failures stay durable, governed, and recoverable.</p>
            </div>
          </div>
          <div className="thread-list">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <button
                  className={incident.incidentId === selectedIncidentId ? "thread-row active" : "thread-row"}
                  key={incident.incidentId}
                  onClick={() => setSelectedIncidentId(incident.incidentId)}
                  type="button"
                >
                  <div className="thread-row-top">
                    <strong>{incident.title}</strong>
                    <Badge tone={toneForIncidentSeverity(incident.severity)}>{incident.severity}</Badge>
                  </div>
                  <p>{incident.incidentId}</p>
                  <div className="thread-row-meta">
                    <span>{incident.state}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="list-empty">No incidents in this environment.</p>
            )}
          </div>
        </section>

        <div className="recovery-main-rail">
          <section className="incident-detail-panel">
            {selectedIncident ? (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Restore Trust</p>
                    <h3>{selectedIncident.title}</h3>
                  </div>
                  <Badge tone={toneForIncidentSeverity(selectedIncident.severity)}>{selectedIncident.state}</Badge>
                </div>
                <p className="lead-copy">{selectedIncident.summary}</p>
                <div className="approval-facts">
                  <ContextBlock label="Severity" value={selectedIncident.severity} />
                  <ContextBlock label="Runtime" value={selectedIncident.runtimeId ?? "None"} />
                  <ContextBlock label="Recovery State" value={selectedIncident.recoveryState} />
                  <ContextBlock label="Updated" value={selectedIncident.updatedAt} />
                </div>
                <div className="approval-explanation">
                  <p className="lead-copy">{selectedIncident.recoverySummary}</p>
                  <p className="mission-support">{selectedIncident.nextAction}</p>
                  {selectedIncident.blockedReason ? (
                    <p className="mission-support">Blocked: {selectedIncident.blockedReason}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Incident Selected</p>
                <h3>Select an incident to inspect governed recovery posture.</h3>
              </div>
            )}
          </section>

          <section className="incident-linked-panel">
            {selectedIncident ? (
              <div className="panel">
                <PanelHeader title="Resume Execution" subtitle="Recovery stays tied to runtime, work, and evidence until continuation is trustworthy again." />
                <LinkedEntityList entities={selectedIncident.linkedEntities} />
                <section className="linked-entities-panel">
                  <PanelHeader title="Evidence" subtitle="Artifacts remain explicit recovery evidence." />
                  <div className="ref-list">
                    {selectedIncident.artifactIds.map((artifactId) => (
                      <span className="thread-flag" key={artifactId}>
                        {artifactId}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="empty-state">
                <p className="eyebrow">No Recovery Context</p>
                <h3>Select an incident to inspect linked runtime and artifact context.</h3>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function WorkWorkspace({
  workItems,
  selectedWorkItemId,
  selectedWorkItem,
  selectedWorkflowRecord,
  setSelectedWorkItemId
}: {
  workItems: WorkItemSummaryDto[];
  selectedWorkItemId: string | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  setSelectedWorkItemId: (workItemId: string) => void;
}) {
  const workRows = workItems.map((workItem) => ({
    key: workItem.workItemId,
    title: workItem.title,
    state: workItem.state,
    waitingReason: workItem.waitingReason ?? "None",
    approvalCount: workItem.approvalCount,
    incidentCount: workItem.incidentCount,
    artifactCount: workItem.artifactCount,
    validationBurden: workItem.validationBurden,
    reconciliationBurden: workItem.reconciliationBurden
  }));

  return (
    <div className="work-grid">
      <section className="work-list-panel">
        <PanelHeader
          title="Reconcile Work"
          subtitle="Execution items remain visible with their validation and closure obligations attached."
        />
        <BrowserDataTable
          key="execution-work"
          columnTemplate="minmax(0, 1.1fr) minmax(0, 0.78fr) minmax(0, 1.15fr) minmax(0, 0.7fr) minmax(0, 0.7fr) minmax(0, 0.7fr)"
          columns={[
            {
              id: "title",
              label: "Work Item",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title,
              searchValue: (row) => `${row.title} ${row.waitingReason} ${row.validationBurden} ${row.reconciliationBurden}`
            },
            {
              id: "state",
              label: "State",
              render: (row) => <Badge tone={toneForWorkState(row.state)}>{row.state}</Badge>,
              sortValue: (row) => row.state
            },
            {
              id: "waiting",
              label: "Waiting",
              render: (row) => row.waitingReason,
              sortValue: (row) => row.waitingReason
            },
            {
              id: "approvals",
              label: "Approvals",
              render: (row) => row.approvalCount,
              sortValue: (row) => row.approvalCount
            },
            {
              id: "incidents",
              label: "Incidents",
              render: (row) => row.incidentCount,
              sortValue: (row) => row.incidentCount
            },
            {
              id: "artifacts",
              label: "Artifacts",
              render: (row) => row.artifactCount,
              sortValue: (row) => row.artifactCount
            }
          ]}
          emptyMessage="No governed work items in this environment."
          filterLabel="State"
          filterOptions={Array.from(new Set(workRows.map((row) => row.state))).map((value) => ({ label: value, value }))}
          getFilterValue={(row) => row.state}
          getRowKey={(row) => row.key}
          onSelect={(row) => setSelectedWorkItemId(row.key)}
          rows={workRows}
          searchPlaceholder="Search work items"
          selectedKey={selectedWorkItemId}
        />
      </section>

      <section className="work-detail-panel">
        {selectedWorkItem ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected Execution Item</p>
                <h3>{selectedWorkItem.title}</h3>
              </div>
              <Badge tone={toneForWorkState(selectedWorkItem.state)}>{selectedWorkItem.state}</Badge>
            </div>
            <div className="browser-focus-card">
              <div>
                <p className="context-label">Selected Execution Item</p>
                <strong>{selectedWorkItem.title}</strong>
                <p>{selectedWorkItem.waitingReason ?? "No waiting reason is currently blocking this work item."}</p>
              </div>
              <Badge tone="steady">{selectedWorkItem.workflowRecordId}</Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Workflow Record" value={selectedWorkItem.workflowRecordId} />
              <ContextBlock label="Waiting" value={selectedWorkItem.waitingReason ?? "None"} />
              <ContextBlock label="Runtime" value={selectedWorkItem.runtimeSummary} />
              <ContextBlock label="Source Relationship" value={selectedWorkItem.sourceRelationship} />
            </div>
            <section className="linked-entities-panel">
              <PanelHeader title="Linked Context" subtitle="Approvals, incidents, and artifacts stay attached to the work." />
              <LinkedEntityList entities={selectedWorkItem.linkedEntities} />
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Work Item Selected</p>
            <h3>Select a governed work item to inspect closure posture.</h3>
          </div>
        )}
      </section>

      <section className="workflow-detail-panel">
        {selectedWorkflowRecord ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Closure Path</p>
                <h3>{selectedWorkflowRecord.phase}</h3>
              </div>
              <Badge tone={selectedWorkflowRecord.closureReadiness === "closable" ? "active" : "warning"}>
                {selectedWorkflowRecord.closureReadiness}
              </Badge>
            </div>
            <div className="approval-facts">
              <ContextBlock label="Validation" value={selectedWorkflowRecord.validationState} />
              <ContextBlock label="Reconciliation" value={selectedWorkflowRecord.reconciliationState} />
              <ContextBlock label="Closure" value={selectedWorkflowRecord.closureReadiness} />
              <ContextBlock label="Phase" value={selectedWorkflowRecord.phase} />
            </div>
            <p className="lead-copy">{selectedWorkflowRecord.closureSummary}</p>
            <section className="linked-entities-panel">
              <PanelHeader title="Blocking Items" subtitle="Closure is withheld until these obligations clear." />
              <div className="ref-list">
                {selectedWorkflowRecord.blockingItems.map((item) => (
                  <span className="thread-flag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Workflow Record</p>
            <h3>Select a work item to inspect its workflow and closure posture.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityWorkspace({
  events,
  selectedEventCursor,
  selectedEvent,
  eventFamilyFilter,
  eventVisibilityFilter,
  setSelectedEventCursor,
  setEventFamilyFilter,
  setEventVisibilityFilter
}: {
  events: EnvironmentEventDto[];
  selectedEventCursor: number | null;
  selectedEvent: EnvironmentEventDto | null;
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  setSelectedEventCursor: (cursor: number) => void;
  setEventFamilyFilter: (value: string) => void;
  setEventVisibilityFilter: (value: string) => void;
}) {
  const families = useMemo(() => {
    const values = new Set(events.map((event) => event.family));
    return ["all", ...Array.from(values)];
  }, [events]);

  const visibilities = useMemo(() => {
    const values = new Set(events.map((event) => event.visibility ?? "unspecified"));
    return ["all", ...Array.from(values)];
  }, [events]);

  return (
    <div className="activity-grid">
      <section className="activity-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Event Replay</p>
            <p className="panel-subtitle">The environment emits replayable operational evidence, not disposable console noise.</p>
          </div>
        </div>

        <div className="activity-filter-row">
          <FilterSelect
            label="Family"
            options={families}
            value={eventFamilyFilter}
            onChange={setEventFamilyFilter}
          />
          <FilterSelect
            label="Visibility"
            options={visibilities}
            value={eventVisibilityFilter}
            onChange={setEventVisibilityFilter}
          />
        </div>

        <div className="activity-summary-grid">
          <MetricTile label="Visible Events" value={events.length} />
          <MetricTile
            label="Operator Events"
            value={events.filter((event) => (event.visibility ?? "unspecified") === "operator").length}
          />
          <MetricTile
            label="Families"
            value={new Set(events.map((event) => event.family)).size}
          />
        </div>

        <div className="thread-list">
          {events.length > 0 ? (
            events.map((event) => (
              <button
                className={event.cursor === selectedEventCursor ? "event-row active" : "event-row"}
                key={event.cursor}
                onClick={() => setSelectedEventCursor(event.cursor)}
                type="button"
              >
                <div className="event-row-top">
                  <strong>{event.kind}</strong>
                  <Badge tone={toneForEventFamily(event.family)}>{event.family}</Badge>
                </div>
                <p>{event.summary}</p>
                <div className="event-row-meta">
                  <span>{event.timestamp}</span>
                  <span>{event.visibility ?? "unspecified"}</span>
                  <span>#{event.cursor}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="list-empty">No events match the current observation filters.</p>
          )}
        </div>
      </section>

      <section className="activity-detail-panel">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Observed Event</p>
              <h3>{selectedEvent ? selectedEvent.kind : "No event matches the active observation filters"}</h3>
            </div>
            <Badge tone={selectedEvent ? toneForEventFamily(selectedEvent.family) : "steady"}>
              {selectedEvent ? selectedEvent.family : "empty"}
            </Badge>
          </div>
          {selectedEvent ? (
            <>
              <p className="lead-copy">{selectedEvent.summary}</p>
              <div className="approval-facts">
                <ContextBlock label="Cursor" value={String(selectedEvent.cursor)} />
                <ContextBlock label="Timestamp" value={selectedEvent.timestamp} />
                <ContextBlock label="Visibility" value={selectedEvent.visibility ?? "unspecified"} />
                <ContextBlock label="Entity" value={selectedEvent.entityId ?? "None"} />
              </div>
              <section className="linked-entities-panel">
                <PanelHeader title="Observed Payload" subtitle="Transport payload remains inspectable and structurally explicit." />
                <pre className="runtime-preview">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
              </section>
            </>
          ) : (
            <>
              <p className="lead-copy">Observation remains part of the evidence journey even when the current filters yield no event rows.</p>
              <section className="linked-entities-panel">
                <PanelHeader title="Observed Payload" subtitle="When replay results are empty, the desktop should explain why instead of collapsing the detail stage." />
                <pre className="runtime-preview">{JSON.stringify({ reason: "no_event_selected", family: eventFamilyFilter, visibility: eventVisibilityFilter }, null, 2)}</pre>
              </section>
            </>
          )}
        </div>
      </section>

      <section className="activity-side-panel">
        <div className="panel">
          <PanelHeader title="Why Evidence Flows" subtitle="Attention should emerge from event structure and provenance, not from raw log volume." />
          <div className="entity-list">
            <div className="entity-row">
              <div>
                <strong>Environment-native</strong>
                <p>Events are scoped to the bound environment rather than to a file, tab, or raw transport trace.</p>
              </div>
            </div>
            <div className="entity-row">
              <div>
                <strong>Governed visibility</strong>
                <p>Operator and team visibility remain explicit so attention can be directed without collapsing context.</p>
              </div>
            </div>
            <div className="entity-row">
              <div>
                <strong>Replay before streaming</strong>
                <p>The desktop can bootstrap from durable event history first, then later layer live subscriptions on top.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArtifactsWorkspace({
  artifacts,
  selectedArtifactId,
  selectedArtifact,
  setSelectedArtifactId
}: {
  artifacts: ArtifactSummaryDto[];
  selectedArtifactId: string | null;
  selectedArtifact: ArtifactDetailDto | null;
  setSelectedArtifactId: (artifactId: string) => void;
}) {
  return (
    <div className="artifacts-grid">
      <section className="artifacts-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Durable Evidence</p>
            <p className="panel-subtitle">Artifacts remain durable engineering objects with provenance, scope, and downstream consequence.</p>
          </div>
        </div>
        <div className="thread-list">
          {artifacts.length > 0 ? (
            artifacts.map((artifact) => (
              <button
                className={artifact.artifactId === selectedArtifactId ? "thread-row active" : "thread-row"}
                key={artifact.artifactId}
                onClick={() => setSelectedArtifactId(artifact.artifactId)}
                type="button"
              >
                <div className="thread-row-top">
                  <strong>{artifact.title}</strong>
                  <Badge tone="steady">{artifact.kind}</Badge>
                </div>
                <p>{artifact.summary}</p>
                <div className="thread-row-meta">
                  <span>{artifact.artifactId}</span>
                  <span>{artifact.updatedAt}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="list-empty">No artifacts in this environment.</p>
          )}
        </div>
      </section>

      <section className="artifacts-detail-panel">
        {selectedArtifact ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected Evidence</p>
                <h3>{selectedArtifact.title}</h3>
              </div>
              <Badge tone={toneForArtifactState(selectedArtifact.state)}>{selectedArtifact.state}</Badge>
            </div>
            <p className="lead-copy">{selectedArtifact.summary}</p>
            <div className="approval-facts">
              <ContextBlock label="Artifact Id" value={selectedArtifact.artifactId} />
              <ContextBlock label="Kind" value={selectedArtifact.kind} />
              <ContextBlock label="Authority" value={selectedArtifact.authority} />
              <ContextBlock label="Updated" value={selectedArtifact.updatedAt} />
            </div>
            <div className="approval-explanation">
              <p className="lead-copy">{selectedArtifact.provenance}</p>
            </div>
            <section className="linked-entities-panel">
              <PanelHeader title="Producing Context" subtitle="Artifacts stay attached to the governed work that produced them or still depends on them." />
              <LinkedEntityList entities={selectedArtifact.linkedEntities} />
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Artifact Selected</p>
            <h3>Select an artifact to inspect its provenance and scope.</h3>
          </div>
        )}
      </section>

      <section className="artifacts-observations-panel">
        {selectedArtifact ? (
          <div className="panel">
            <PanelHeader title="Observations" subtitle="Why this artifact matters in the current environment posture." />
            <div className="entity-list">
              {selectedArtifact.observations.map((observation) => (
                <div className="entity-row" key={observation}>
                  <div>
                    <strong>{selectedArtifact.kind}</strong>
                    <p>{observation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Observations</p>
            <h3>Select an artifact to inspect its current evidentiary posture.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusDock({
  activeWorkspace,
  binding,
  hostStatus,
  status,
  inspectorPinned,
  onToggleInspector
}: {
  activeWorkspace: WorkspaceId;
  binding: BindingDto | null;
  hostStatus: HostStatusDto | null;
  status: EnvironmentStatusDto | null;
  inspectorPinned: boolean;
  onToggleInspector: () => void;
}) {
  return (
    <section className="status-dock">
      <div className="status-dock-group">
        <span className="status-dock-label">Host</span>
        <strong>{hostStatus?.hostState ?? "starting"}</strong>
      </div>
      <div className="status-dock-group">
        <span className="status-dock-label">Binding</span>
        <strong>{binding?.environmentId ?? "unbound"}</strong>
      </div>
      <div className="status-dock-group">
        <span className="status-dock-label">Workspace</span>
        <strong>{labelForWorkspace(activeWorkspace)}</strong>
      </div>
      <div className="status-dock-group">
        <span className="status-dock-label">Runtime</span>
        <strong>{status?.runtimeState ?? "unknown"}</strong>
      </div>
      <div className="status-dock-group">
        <span className="status-dock-label">Workflow</span>
        <strong>{status?.workflowState ?? "unknown"}</strong>
      </div>
      <div className="status-dock-actions">
        <span className="status-dock-hint">1-8 quick header switch</span>
        <button className="dock-button" onClick={onToggleInspector} type="button">
          {inspectorPinned ? "Collapse Inspector" : "Show Inspector"}
        </button>
      </div>
    </section>
  );
}

function HelpHint({ text }: { text: string }) {
  return (
    <span className="help-hint" tabIndex={0}>
      <span aria-hidden="true" className="help-hint-trigger" title={text}>
        ?
      </span>
      <span className="help-hint-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function PanelHeader({
  title,
  subtitle,
  helpText
}: {
  title: string;
  subtitle: string;
  helpText?: string;
}) {
  return (
    <div className="panel-header">
      <div>
        <div className="panel-header-title-row">
          <p className="eyebrow">{title}</p>
          {helpText ? <HelpHint text={helpText} /> : null}
        </div>
        <p className="panel-subtitle">{subtitle}</p>
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

function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="context-block">
      <p className="context-label">{label}</p>
      <p className="context-value">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span className="context-label">{label}</span>
      <select className="filter-input" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MessageBubble({ message }: { message: MessageDto }) {
  return (
    <div className={`message-bubble role-${message.role}`}>
      <div className="message-meta">
        <span>{message.role}</span>
        <span>{message.createdAt}</span>
      </div>
      <p>{message.content}</p>
    </div>
  );
}

function RefBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="ref-block">
      <p className="context-label">{label}</p>
      {values.length > 0 ? (
        <div className="ref-list">
          {values.map((value) => (
            <span className="thread-flag" key={value}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="list-empty">None</p>
      )}
    </div>
  );
}

function LinkedEntityList({ entities }: { entities: LinkedEntityRefDto[] }) {
  return (
    <div className="entity-list">
      {entities.map((entity) => (
        <div className="entity-row" key={`${entity.entityType}-${entity.entityId}`}>
          <div>
            <strong>{entity.label}</strong>
            <p>{entity.entityId}</p>
          </div>
          <Badge tone="steady">{entity.entityType}</Badge>
        </div>
      ))}
    </div>
  );
}

function Badge({ children, tone }: { children: string; tone: "active" | "warning" | "danger" | "steady" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function WorkspaceSignal({
  signal
}: {
  signal?: { tone: "active" | "warning" | "danger" | "steady"; value: number };
}) {
  if (!signal || signal.value <= 0) {
    return <span className="workspace-signal workspace-signal-muted">Quiet</span>;
  }

  return <span className={`workspace-signal workspace-signal-${signal.tone}`}>{signal.value}</span>;
}

function groupWorkspaces(): [string, Array<{ id: WorkspaceId; label: string; group: string; primary: boolean }>] [] {
  const groups = new Map<string, Array<{ id: WorkspaceId; label: string; group: string; primary: boolean }>>();

  for (const workspace of workspaceOrder.filter((item) => item.primary)) {
    const items = groups.get(workspace.group) ?? [];
    items.push(workspace);
    groups.set(workspace.group, items);
  }

  return Array.from(groups.entries());
}

function labelForWorkspace(workspaceId: WorkspaceId): string {
  return workspaceOrder.find((workspace) => workspace.id === canonicalWorkspace(workspaceId))?.label ?? workspaceId;
}

function toneForThreadState(
  state: ThreadSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
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

function toneForTurnState(
  state: TurnDetailDto["state"]
): "active" | "warning" | "danger" | "steady" {
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

function toneForCommandStatus(
  status: CommandResultDto<RuntimeEvalResultDto>["status"]
): "active" | "warning" | "danger" | "steady" {
  switch (status) {
    case "ok":
      return "active";
    case "awaiting_approval":
      return "warning";
    case "error":
    case "rejected":
      return "danger";
    default:
      return "steady";
  }
}

function toneForApprovalState(
  state: ApprovalRequestSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "approved":
      return "active";
    case "awaiting":
      return "warning";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForApprovalDecision(
  decision: ApprovalDecisionDto["decision"]
): "active" | "warning" | "danger" | "steady" {
  switch (decision) {
    case "approved":
      return "active";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForIncidentSeverity(
  severity: IncidentSummaryDto["severity"]
): "active" | "warning" | "danger" | "steady" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "moderate":
      return "warning";
    case "low":
      return "steady";
    default:
      return "steady";
  }
}

function toneForWorkState(
  state: WorkItemSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
    case "closable":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
    case "quarantined":
      return "danger";
    default:
      return "steady";
  }
}

function toneForEventFamily(family: string): "active" | "warning" | "danger" | "steady" {
  switch (family) {
    case "runtime":
    case "conversation":
      return "active";
    case "approval":
    case "workflow":
      return "warning";
    case "incident":
      return "danger";
    default:
      return "steady";
  }
}

function toneForArtifactState(state: ArtifactDetailDto["state"]): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
      return "active";
    case "draft":
      return "warning";
    case "superseded":
      return "steady";
    case "evidence":
      return "danger";
    default:
      return "steady";
  }
}

function attentionToneWeight(tone: "active" | "warning" | "danger" | "steady"): number {
  switch (tone) {
    case "danger":
      return 4;
    case "warning":
      return 3;
    case "active":
      return 2;
    default:
      return 1;
  }
}
