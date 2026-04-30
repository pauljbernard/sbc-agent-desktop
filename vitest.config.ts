import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "test-results/.vite-temp",
  test: {
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/vitest",
      reporter: ["text", "json-summary", "html"]
    },
    projects: [
      {
        test: {
          name: "renderer-unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          coverage: {
            include: ["src/renderer/src/workspace-shell.ts", "src/shared/mock-environments.ts", "src/shared/test-reporting.js"]
          }
        }
      },
      {
        test: {
          name: "adapter-integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"]
        }
      }
    ]
  }
});
