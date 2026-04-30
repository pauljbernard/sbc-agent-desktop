import { describe, expect, it } from "vitest";

import {
  buildProgramMarkdown,
  buildProgramSummary,
  summarizeCoverage,
  summarizeStructuredSuite,
  summarizeVitestSuite
} from "../../src/shared/test-reporting.js";

describe("test reporting helpers", () => {
  it("summarizes vitest JSON output into a stable suite record", () => {
    const suite = summarizeVitestSuite(
      {
        numTotalTime: 42,
        testResults: [
          {
            assertionResults: [{ status: "passed" }, { status: "failed" }, { status: "passed" }]
          }
        ]
      },
      "adapter-integration"
    );

    expect(suite).toMatchObject({
      id: "adapter-integration",
      status: "failed",
      total: 3,
      passed: 2,
      failed: 1,
      durationMs: 42
    });
  });

  it("summarizes structured non-vitest suites and coverage", () => {
    const security = summarizeStructuredSuite(
      {
        suite: "security",
        status: "passed",
        checks: ["contextIsolation"]
      },
      "security"
    );
    const coverage = summarizeCoverage({
      total: {
        statements: { pct: 80 },
        branches: { pct: 70 },
        functions: { pct: 90 },
        lines: { pct: 85 }
      }
    });

    expect(security).toMatchObject({
      id: "security",
      status: "passed",
      suite: "security"
    });
    expect(coverage).toEqual({
      statementsPct: 80,
      branchesPct: 70,
      functionsPct: 90,
      linesPct: 85
    });
  });

  it("builds aggregate summary totals and markdown output", () => {
    const summary = buildProgramSummary({
      generatedAt: "2026-04-28T14:42:10.232Z",
      program: "sbcl-agent-ux",
      suites: [
        { id: "renderer-unit", status: "passed", total: 6, passed: 6, failed: 0, durationMs: 10 },
        { id: "adapter-integration", status: "passed", total: 5, passed: 5, failed: 0, durationMs: 12 },
        { id: "security", status: "passed", suite: "security" }
      ],
      coverage: {
        statementsPct: 12.15,
        branchesPct: 7.32,
        functionsPct: 17.57,
        linesPct: 12.21
      }
    });

    const markdown = buildProgramMarkdown(summary);

    expect(summary.totals).toEqual({
      total: 11,
      passed: 11,
      failed: 0,
      durationMs: 22
    });
    expect(markdown).toContain("# sbcl-agent-ux Test Report");
    expect(markdown).toContain("renderer-unit");
    expect(markdown).toContain("Statements: 12.15%");
  });
});
