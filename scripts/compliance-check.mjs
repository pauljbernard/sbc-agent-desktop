import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const testResultsDir = resolve(root, "test-results");
const outputPath = resolve(testResultsDir, "compliance.json");
const specDriftScript = resolve(root, "scripts/spec-drift-check.mjs");

await mkdir(testResultsDir, { recursive: true });

try {
  const { stdout } = await execFileAsync(process.execPath, [specDriftScript], {
    cwd: root
  });

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        suite: "compliance",
        status: "passed",
        checks: ["spec-drift"],
        summary: stdout.trim()
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log("compliance-check> spec drift contract passed.");
} catch (error) {
  const stderr =
    typeof error === "object" && error !== null && "stderr" in error
      ? String(error.stderr ?? "").trim()
      : "compliance failure";

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        suite: "compliance",
        status: "failed",
        checks: ["spec-drift"],
        summary: stderr
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.error(`compliance-check> ${stderr}`);
  process.exit(1);
}
