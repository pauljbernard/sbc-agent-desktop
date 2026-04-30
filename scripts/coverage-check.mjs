import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateCoverageThresholds } from "../src/shared/qa-program.js";

const root = resolve(import.meta.dirname, "..");
const coverageSummaryPath = resolve(root, "coverage/vitest/coverage-summary.json");
const testResultsDir = resolve(root, "test-results");
const outputPath = resolve(testResultsDir, "coverage.json");

const thresholds = {
  statementsPct: 20,
  branchesPct: 10,
  functionsPct: 20,
  linesPct: 20
};

await mkdir(testResultsDir, { recursive: true });

const summary = JSON.parse(await readFile(coverageSummaryPath, "utf8"));
const result = evaluateCoverageThresholds(summary, thresholds);

await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

if (result.status !== "passed") {
  console.error(
    `coverage-check> thresholds failed: ${result.failedChecks
      .map((check) => `${check.metric} actual=${check.actual} minimum=${check.minimum}`)
      .join(", ")}`
  );
  process.exit(1);
}

console.log(
  `coverage-check> thresholds passed (statements=${result.metrics.statementsPct} branches=${result.metrics.branchesPct} functions=${result.metrics.functionsPct} lines=${result.metrics.linesPct})`
);
