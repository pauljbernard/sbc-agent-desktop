import { describe, expect, it } from "vitest";

import {
  buildQaEvidenceIndex,
  buildQaEvidenceMarkdown,
  buildQaTrendEntry,
  evaluateCoverageThresholds,
  summarizeQaTrend,
  summarizeUiJourneyLanes,
  summarizeUiJourneyReport,
  updateQaTrendHistory
} from "../../src/shared/qa-program.js";

describe("qa program helpers", () => {
  it("passes coverage threshold evaluation when metrics exceed minimums", () => {
    const result = evaluateCoverageThresholds(
      {
        total: {
          statements: { pct: 25.63 },
          branches: { pct: 13.42 },
          functions: { pct: 27.77 },
          lines: { pct: 25.48 }
        }
      },
      {
        statementsPct: 20,
        branchesPct: 10,
        functionsPct: 20,
        linesPct: 20
      }
    );

    expect(result.status).toBe("passed");
    expect(result.failedChecks).toEqual([]);
  });

  it("reports failed threshold checks explicitly", () => {
    const result = evaluateCoverageThresholds(
      {
        total: {
          statements: { pct: 10 },
          branches: { pct: 5 },
          functions: { pct: 30 },
          lines: { pct: 12 }
        }
      },
      {
        statementsPct: 20,
        branchesPct: 10,
        functionsPct: 20,
        linesPct: 20
      }
    );

    expect(result.status).toBe("failed");
    expect(result.failedChecks.map((check) => check.metric)).toEqual(["statementsPct", "branchesPct", "linesPct"]);
  });

  it("builds a qa evidence index and markdown summary", () => {
    const index = buildQaEvidenceIndex({
      generatedAt: "2026-04-28T15:13:49.770Z",
      program: "sbcl-agent-ux",
      summary: {
        totals: {
          total: 20,
          passed: 20,
          failed: 0
        }
      },
      coverageCheck: {
        status: "passed",
        metrics: {
          statementsPct: 25.63,
          branchesPct: 13.42,
          functionsPct: 27.77,
          linesPct: 25.48
        },
        thresholds: {
          statementsPct: 20,
          branchesPct: 10,
          functionsPct: 20,
          linesPct: 20
        }
      },
      compliance: { status: "passed" },
      security: { status: "passed" },
      performance: { status: "passed" },
      uiJourney: {
        status: "passed",
        total: 4,
        lanes: [
          { id: "dashboard", status: "passed", total: 2 },
          { id: "conversation", status: "passed", total: 1 },
          { id: "browser", status: "passed", total: 1 }
        ]
      }
    });

    const markdown = buildQaEvidenceMarkdown(index);

    expect(index.overallStatus).toBe("passed");
    expect(index.suites).toHaveLength(9);
    expect(markdown).toContain("# sbcl-agent-ux QA Evidence Index");
    expect(markdown).toContain("unit-and-integration");
    expect(markdown).toContain("Statements: 25.63%");
    expect(markdown).toContain("ui-journey");
    expect(markdown).toContain("ui-journey:dashboard");
    expect(index.suites.find((suite) => suite.id === "compliance")?.status).toBe("passed");
  });

  it("summarizes a playwright ui journey report", () => {
    const summary = summarizeUiJourneyReport({
      stats: {
        unexpected: 1
      },
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: "creates a new project conversation session from the desktop shell",
                  ok: true,
                  tests: [
                    {
                      results: [{ duration: 100 }]
                    }
                  ]
                },
                {
                  title: "renders runtime-backed browser entity detail for inspected symbols",
                  ok: false,
                  tests: [
                    {
                      results: [{ duration: 250 }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    expect(summary).toEqual({
      suite: "ui-journey",
      status: "failed",
      total: 2,
      passed: 1,
      failed: 1,
      durationMs: 350,
      unexpected: 1,
      lanes: [
        {
          suite: "ui-journey:browser",
          id: "browser",
          status: "failed",
          total: 1,
          passed: 0,
          failed: 1,
          durationMs: 250
        },
        {
          suite: "ui-journey:conversation",
          id: "conversation",
          status: "passed",
          total: 1,
          passed: 1,
          failed: 0,
          durationMs: 100
        }
      ]
    });
  });

  it("breaks ui journey specs into focused lanes", () => {
    const lanes = summarizeUiJourneyLanes({
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  title: "renders a concrete dashboard action queue and routes into the selected operational target",
                  ok: true,
                  tests: [{ results: [{ duration: 50 }] }]
                },
                {
                  title: "creates a new project conversation session from the desktop shell",
                  ok: true,
                  tests: [{ results: [{ duration: 75 }] }]
                },
                {
                  title: "renders runtime-backed browser entity detail for inspected symbols",
                  ok: false,
                  tests: [{ results: [{ duration: 125 }] }]
                },
                {
                  title: "renders configuration preferences and switches themes",
                  ok: true,
                  tests: [{ results: [{ duration: 30 }] }]
                }
              ]
            }
          ]
        }
      ]
    });

    expect(lanes).toEqual([
      {
        suite: "ui-journey:browser",
        id: "browser",
        status: "failed",
        total: 1,
        passed: 0,
        failed: 1,
        durationMs: 125
      },
      {
        suite: "ui-journey:conversation",
        id: "conversation",
        status: "passed",
        total: 1,
        passed: 1,
        failed: 0,
        durationMs: 75
      },
      {
        suite: "ui-journey:dashboard",
        id: "dashboard",
        status: "passed",
        total: 1,
        passed: 1,
        failed: 0,
        durationMs: 50
      },
      {
        suite: "ui-journey:workspace",
        id: "workspace",
        status: "passed",
        total: 1,
        passed: 1,
        failed: 0,
        durationMs: 30
      }
    ]);
  });

  it("tracks qa evidence trends across runs", () => {
    const firstIndex = buildQaEvidenceIndex({
      generatedAt: "2026-04-28T18:00:00.000Z",
      program: "sbcl-agent-ux",
      summary: { totals: { total: 24, passed: 24, failed: 0 } },
      coverageCheck: {
        status: "passed",
        metrics: {
          statementsPct: 25,
          branchesPct: 12,
          functionsPct: 28,
          linesPct: 24
        },
        thresholds: {
          statementsPct: 20,
          branchesPct: 10,
          functionsPct: 20,
          linesPct: 20
        }
      },
      compliance: { status: "passed" },
      security: { status: "passed" },
      performance: { status: "passed" },
      uiJourney: { status: "passed", total: 40, passed: 40, failed: 0, lanes: [] }
    });

    const secondIndex = buildQaEvidenceIndex({
      generatedAt: "2026-04-28T19:00:00.000Z",
      program: "sbcl-agent-ux",
      summary: { totals: { total: 24, passed: 24, failed: 0 } },
      coverageCheck: {
        status: "passed",
        metrics: {
          statementsPct: 28.39,
          branchesPct: 15.82,
          functionsPct: 31.71,
          linesPct: 27.7
        },
        thresholds: {
          statementsPct: 20,
          branchesPct: 10,
          functionsPct: 20,
          linesPct: 20
        }
      },
      compliance: { status: "passed" },
      security: { status: "passed" },
      performance: { status: "passed" },
      uiJourney: { status: "passed", total: 46, passed: 46, failed: 0, lanes: [] }
    });

    const history1 = updateQaTrendHistory(null, buildQaTrendEntry(firstIndex));
    const history2 = updateQaTrendHistory(history1, buildQaTrendEntry(secondIndex));
    const trend = summarizeQaTrend(history2);

    expect(trend.runsTracked).toBe(2);
    expect(trend.latestOverallStatus).toBe("passed");
    expect(trend.coverageDelta).toEqual({
      statementsPct: 3.39,
      branchesPct: 3.82,
      functionsPct: 3.71,
      linesPct: 3.7
    });
    expect(trend.uiJourneyDelta).toEqual({
      total: 6,
      passed: 6,
      failed: 0
    });
    expect(trend.recentRuns).toHaveLength(2);
  });
});
