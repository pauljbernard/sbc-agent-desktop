import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(new URL("..", import.meta.url).pathname);
const docsRoot = join(projectRoot, "eng-docs");
const featuresRoot = join(docsRoot, "features");
const appPath = join(projectRoot, "src", "renderer", "src", "App.tsx");
const stylesPath = join(projectRoot, "src", "renderer", "src", "styles.css");
const uiTestsPath = join(projectRoot, "tests", "ui", "electron-live.spec.ts");

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function collectMarkdownFiles(root) {
  return readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .map((name) => join(root, name))
    .filter((path) => statSync(path).isFile());
}

function includesAll(text, items) {
  return items.every((item) => text.includes(item));
}

function run() {
  const failures = [];

  const constitution = read(join(docsRoot, "constitution.md"));
  const requirements = read(join(docsRoot, "requirements.md"));
  const designSystem = read(join(docsRoot, "design-system.md"));
  const featureTemplate = read(join(docsRoot, "feature-template.md"));
  const appCode = read(appPath);
  const stylesCode = read(stylesPath);
  const uiTests = read(uiTestsPath);
  const featureDocs = collectMarkdownFiles(featuresRoot);

  const constitutionContracts = [
    "## Article 13: Working Space Is Sacred",
    "## Article 14: Scroll Ownership Must Be Explicit",
    "## Article 15: Metadata Must Be Revealed On Demand",
    "## Article 16: Specs Drive Delivery"
  ];
  assert(
    includesAll(constitution, constitutionContracts),
    "constitution.md is missing one or more non-negotiable UX governance articles (13-16).",
    failures
  );

  const requirementContracts = [
    "### FR-0 Workspace Focus Discipline",
    "### FR-3 Durable Conversation Model",
    "### FR-12a Scroll Ownership"
  ];
  assert(
    includesAll(requirements, requirementContracts),
    "requirements.md is missing one or more required UX discipline sections (FR-0, FR-3, FR-12a).",
    failures
  );

  const designSystemContracts = [
    "### Principle 4: Compression Over Explanation",
    "### Workspace Ordering Rule",
    "### Primary Surface Rule",
    "### Scroll Ownership Rule"
  ];
  assert(
    includesAll(designSystem, designSystemContracts),
    "design-system.md is missing one or more required layout/system rules.",
    failures
  );

  const templateContracts = [
    "### Thesis Classification",
    "### Thesis Review",
    "### UX Shape",
    "### Acceptance Criteria",
    "### Primary View",
    "### Primary Queries",
    "### Primary Commands"
  ];
  assert(
    includesAll(featureTemplate, templateContracts),
    "feature-template.md is missing one or more required proposal sections.",
    failures
  );

  const featureHeadings = [
    "## Title",
    "## Summary",
    "## Problem",
    "## User Outcome",
    "## Primary Entities",
    "## Truth Domains Affected",
    "## Service Families Affected",
    "## Thesis Classification",
    "## Thesis Review",
    "## Regression Risk",
    "## Capability Benchmark Impact",
    "## UX Shape",
    "## Command And Query Shape",
    "## Acceptance Criteria",
    "## Open Questions"
  ];

  for (const featurePath of featureDocs) {
    const content = read(featurePath);
    assert(
      includesAll(content, featureHeadings),
      `${featurePath} is missing one or more required feature-spec sections from the template.`,
      failures
    );
    assert(
      content.includes("primary surface") || content.includes("dominant work surface"),
      `${featurePath} does not declare its primary work surface in UX Shape or Acceptance Criteria.`,
      failures
    );
    assert(
      content.includes("scroll") || content.includes("Scroll"),
      `${featurePath} does not mention scroll ownership or scroll behavior.`,
      failures
    );
  }

  const implementationEvidence = [
    {
      name: "Collapsible navigation and inspector rails",
      patterns: ["Hide Navigation", "Collapse Inspector", "toggleInspectorPinned", "workspace-child-link active"],
      texts: [appCode, stylesCode]
    },
    {
      name: "Conversations workspace keeps navigation, transcript, and composer distinct",
      patterns: ["Thread Navigation", "conversation-thread-transcript-panel", "conversation-composer-panel", "inspector-tabs"],
      texts: [appCode, stylesCode]
    },
    {
      name: "Browser workspace keeps inspector-driven context and secondary manual inspect",
      patterns: ["browser-secondary-card", "browser-domain-header", "inspector-tabs", "runtime-preview", "browser-domain-pane"],
      texts: [appCode, stylesCode]
    },
    {
      name: "UI suite protects Browser and Conversation UX commitments",
      patterns: [
        "keeps manual inspect secondary while updating browser inspector context",
        "keeps browser tables first and inspector context separate",
        "renders runtime-backed browser entity detail for inspected symbols",
        "conversation-composer-panel .conversation-draft-editor"
      ],
      texts: [uiTests]
    }
  ];

  for (const check of implementationEvidence) {
    assert(
      check.patterns.every((pattern) => check.texts.some((text) => text.includes(pattern))),
      `Implementation evidence missing for: ${check.name}.`,
      failures
    );
  }

  if (failures.length > 0) {
    console.error("Spec drift check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Spec drift check passed.");
}

run();
