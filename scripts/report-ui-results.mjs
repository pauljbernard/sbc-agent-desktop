import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { summarizeUiJourneyReport } from "../src/shared/qa-program.js";

const root = resolve(import.meta.dirname, "..");
const testResultsDir = resolve(root, "test-results");
const inputPath = resolve(testResultsDir, "ui-results.json");
const outputPath = resolve(testResultsDir, "ui-summary.json");

await mkdir(testResultsDir, { recursive: true });

const report = JSON.parse(await readFile(inputPath, "utf8"));
const summary = summarizeUiJourneyReport(report);

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(`ui-report/json> ${outputPath}`);
