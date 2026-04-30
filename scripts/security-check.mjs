import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const mainEntry = resolve(root, "src/main/index.ts");
const testResultsDir = resolve(root, "test-results");
const outputPath = resolve(testResultsDir, "security.json");

const source = await readFile(mainEntry, "utf8");

const requiredGuards = [
  { label: "contextIsolation", needle: "contextIsolation: true" },
  { label: "nodeIntegration", needle: "nodeIntegration: false" },
  { label: "sandbox posture", needle: "sandbox: false" }
];

const missing = requiredGuards.filter((entry) => !source.includes(entry.needle));

await mkdir(testResultsDir, { recursive: true });

if (missing.length > 0) {
  const result = {
    suite: "security",
    status: "failed",
    missing: missing.map((entry) => entry.label)
  };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.error(`security-check> missing expected Electron security posture markers: ${missing.map((entry) => entry.label).join(", ")}`);
  process.exit(1);
}

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      suite: "security",
      status: "passed",
      checks: requiredGuards.map((entry) => entry.label)
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log("security-check> Electron security posture markers present.");
