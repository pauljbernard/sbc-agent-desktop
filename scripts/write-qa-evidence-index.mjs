import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildQaEvidenceIndex,
  buildQaEvidenceMarkdown,
  buildQaTrendEntry,
  summarizeQaTrend,
  updateQaTrendHistory
} from "../src/shared/qa-program.js";

const root = resolve(import.meta.dirname, "..");
const testResultsDir = resolve(root, "test-results");

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

await mkdir(testResultsDir, { recursive: true });

const summary = await readJsonIfPresent(resolve(testResultsDir, "summary.json"));
const coverageCheck = await readJsonIfPresent(resolve(testResultsDir, "coverage.json"));
const compliance = await readJsonIfPresent(resolve(testResultsDir, "compliance.json"));
const security = await readJsonIfPresent(resolve(testResultsDir, "security.json"));
const performance = await readJsonIfPresent(resolve(testResultsDir, "performance.json"));
const uiJourney = await readJsonIfPresent(resolve(testResultsDir, "ui-summary.json"));
const trendHistoryPath = resolve(testResultsDir, "qa-trend-history.json");
const existingTrendHistory = await readJsonIfPresent(trendHistoryPath);

const baseIndex = buildQaEvidenceIndex({
  generatedAt: new Date().toISOString(),
  program: "sbcl-agent-ux",
  summary,
  coverageCheck,
  compliance,
  security,
  performance,
  uiJourney
});

const trendEntry = buildQaTrendEntry(baseIndex);
const trendHistory = updateQaTrendHistory(existingTrendHistory, trendEntry);
const trend = summarizeQaTrend(trendHistory);

const index = buildQaEvidenceIndex({
  ...baseIndex,
  trend
});

await writeFile(resolve(testResultsDir, "qa-index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
await writeFile(resolve(testResultsDir, "qa-index.md"), `${buildQaEvidenceMarkdown(index)}\n`, "utf8");
await writeFile(trendHistoryPath, `${JSON.stringify(trendHistory, null, 2)}\n`, "utf8");

console.log(`qa-index/json> ${resolve(testResultsDir, "qa-index.json")}`);
console.log(`qa-index/markdown> ${resolve(testResultsDir, "qa-index.md")}`);
console.log(`qa-index/trend-history> ${trendHistoryPath}`);
