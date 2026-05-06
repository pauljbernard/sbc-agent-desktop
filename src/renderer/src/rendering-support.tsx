import type { ReactNode } from "react";

const DEFAULT_LISP_PAREN_COLORS = ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"];

function classifyLispToken(token: string): string {
  if (/^[:&]/.test(token)) {
    return "keyword";
  }
  if (/^[+-]?\d+(\.\d+)?$/.test(token)) {
    return "number";
  }
  if (/^(t|nil)$/.test(token)) {
    return "constant";
  }
  if (/^\*[^*]+\*$/.test(token)) {
    return "dynamic";
  }
  if (/^[A-Z][A-Z0-9-]*$/.test(token)) {
    return "symbol";
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
  }

  flushToken();
  return nodes;
}

export function LispCodeBlock({
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

export function renderDocumentationMarkdown(markdown: string): string {
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
        .map((row) => `<tr>${row.map((cell) => `<td>${renderDocumentationInline(cell)}</td>`).join("")}</tr>`)
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
