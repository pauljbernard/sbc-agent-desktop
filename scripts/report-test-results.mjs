import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildProgramMarkdown,
  buildProgramSummary,
  summarizeCoverage,
  summarizeStructuredSuite,
  summarizeVitestSuite
} from "../src/shared/test-reporting.js";

const root = resolve(import.meta.dirname, "..");
const testResultsDir = resolve(root, "test-results");

async function readJsonIfPresent(path) {
  try {
    const body = await readFile(path, "utf8");
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(testResultsDir, { recursive: true });

  const rendererUnit = await readJsonIfPresent(resolve(testResultsDir, "renderer-unit.json"));
  const adapterIntegration = await readJsonIfPresent(resolve(testResultsDir, "adapter-integration.json"));
  const security = await readJsonIfPresent(resolve(testResultsDir, "security.json"));
  const performance = await readJsonIfPresent(resolve(testResultsDir, "performance.json"));
  const coverage = await readJsonIfPresent(resolve(root, "coverage/vitest/coverage-summary.json"));

  const suites = [
    summarizeVitestSuite(rendererUnit, "renderer-unit"),
    summarizeVitestSuite(adapterIntegration, "adapter-integration"),
    summarizeStructuredSuite(security, "security"),
    summarizeStructuredSuite(performance, "performance")
  ];

  const coverageSummary = summarizeCoverage(coverage);

  const summary = buildProgramSummary({
    generatedAt: new Date().toISOString(),
    program: "sbcl-agent-ux",
    suites,
    coverage: coverageSummary
  });

  await writeFile(resolve(testResultsDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(resolve(testResultsDir, "summary.md"), `${buildProgramMarkdown(summary)}\n`, "utf8");
  console.log(`test-report/json> ${resolve(testResultsDir, "summary.json")}`);
  console.log(`test-report/markdown> ${resolve(testResultsDir, "summary.md")}`);
}

await main();
