import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rendererAssetsDir = resolve(root, "dist/renderer/assets");
const testResultsDir = resolve(root, "test-results");
const outputPath = resolve(testResultsDir, "performance.json");
const maxRendererBundleBytes = 1_300_000;

await mkdir(testResultsDir, { recursive: true });

const entries = await readdir(rendererAssetsDir);
const jsBundles = entries.filter((entry) => entry.endsWith(".js"));

if (jsBundles.length === 0) {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        suite: "performance",
        status: "failed",
        thresholdBytes: maxRendererBundleBytes,
        reason: "no renderer JavaScript bundles found"
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.error("performance-check> no renderer JavaScript bundles found; run npm run build first.");
  process.exit(1);
}

const bundleSizes = await Promise.all(
  jsBundles.map(async (bundle) => {
    const bundlePath = resolve(rendererAssetsDir, bundle);
    const details = await stat(bundlePath);
    return {
      bundle,
      bytes: details.size
    };
  })
);

const oversized = bundleSizes.filter((entry) => entry.bytes > maxRendererBundleBytes);

if (oversized.length > 0) {
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        suite: "performance",
        status: "failed",
        thresholdBytes: maxRendererBundleBytes,
        bundles: bundleSizes,
        oversized
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.error(
    `performance-check> renderer bundles exceed threshold ${maxRendererBundleBytes} bytes: ${oversized
      .map((entry) => `${entry.bundle}=${entry.bytes}`)
      .join(", ")}`
  );
  process.exit(1);
}

await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      suite: "performance",
      status: "passed",
      thresholdBytes: maxRendererBundleBytes,
      bundles: bundleSizes
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(
  `performance-check> renderer bundle budget passed (${bundleSizes
    .map((entry) => `${entry.bundle}=${entry.bytes}`)
    .join(", ")})`
);
