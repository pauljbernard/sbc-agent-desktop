import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentationPageDto, DocumentationPageSummaryDto } from "../shared/contracts";

const __dirname = resolve(fileURLToPath(new URL(".", import.meta.url)));

const DOCUMENTATION_ORDER = [
  "index",
  "development-model",
  "how-sbcl-agent-works",
  "sbcl-agent-concepts",
  "transition-guide",
  "getting-started",
  "desktop-tour",
  "browser",
  "conversations",
  "execution",
  "recovery",
  "evidence",
  "configuration",
  "live-connection",
  "troubleshooting",
  "faq"
] as const;

const CATEGORY_BY_SLUG: Record<string, string> = {
  index: "Overview",
  "development-model": "Conceptual",
  "how-sbcl-agent-works": "Conceptual",
  "sbcl-agent-concepts": "Conceptual",
  "transition-guide": "Conceptual",
  "getting-started": "Onboarding",
  "desktop-tour": "Onboarding",
  browser: "Workspace",
  conversations: "Workspace",
  execution: "Workspace",
  recovery: "Workspace",
  evidence: "Workspace",
  configuration: "Workspace",
  "live-connection": "Operations",
  troubleshooting: "Operations",
  faq: "Operations"
};

function documentationDirectory(): string {
  const candidates = [
    resolve(process.cwd(), "docs"),
    resolve(__dirname, "../../docs"),
    resolve(__dirname, "../../../docs")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) {
    return markdown;
  }

  const closingIndex = markdown.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return markdown;
  }

  return markdown.slice(closingIndex + 5).trimStart();
}

function extractFrontmatter(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---\n")) {
    return {};
  }

  const closingIndex = markdown.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return {};
  }

  const frontmatter = markdown.slice(4, closingIndex).split("\n");
  const values: Record<string, string> = {};

  for (const line of frontmatter) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key.length > 0) {
      values[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return values;
}

function extractFirstHeading(markdown: string): string | null {
  const match = stripFrontmatter(markdown).match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function buildSummary(markdown: string): string {
  const body = stripFrontmatter(markdown)
    .replace(/^#+\s+/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (body.length <= 180) {
    return body;
  }

  return `${body.slice(0, 177).trimEnd()}...`;
}

function summarizePage(slug: string, markdown: string): DocumentationPageSummaryDto {
  const frontmatter = extractFrontmatter(markdown);
  const title = frontmatter.title || extractFirstHeading(markdown) || slug;

  return {
    slug,
    title,
    category: CATEGORY_BY_SLUG[slug] ?? "Reference",
    summary: buildSummary(markdown)
  };
}

function sortDocumentationPages(
  left: DocumentationPageSummaryDto,
  right: DocumentationPageSummaryDto
): number {
  const leftIndex = DOCUMENTATION_ORDER.indexOf(left.slug as (typeof DOCUMENTATION_ORDER)[number]);
  const rightIndex = DOCUMENTATION_ORDER.indexOf(right.slug as (typeof DOCUMENTATION_ORDER)[number]);

  if (leftIndex !== -1 || rightIndex !== -1) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  }

  return left.title.localeCompare(right.title);
}

export async function listDocumentationPages(): Promise<DocumentationPageSummaryDto[]> {
  const docsDir = documentationDirectory();
  const entries = await readdir(docsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const slug = basename(entry.name, ".md");
      const markdown = readFileSync(join(docsDir, entry.name), "utf8");
      return summarizePage(slug, markdown);
    })
    .sort(sortDocumentationPages);
}

export async function readDocumentationPageBySlug(slug: string): Promise<DocumentationPageDto> {
  const docsDir = documentationDirectory();
  const normalizedSlug = slug.trim().toLowerCase();
  const sourcePath = join(docsDir, `${normalizedSlug}.md`);
  const markdown = await readFile(sourcePath, "utf8");
  const summary = summarizePage(normalizedSlug, markdown);

  return {
    ...summary,
    sourcePath,
    markdown
  };
}
