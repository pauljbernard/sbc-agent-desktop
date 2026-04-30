export function summarizeVitestSuite(report, label) {
  if (!report) {
    return {
      id: label,
      status: "missing",
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0
    };
  }

  const files = Array.isArray(report.testResults) ? report.testResults : [];
  const assertions = files.flatMap((file) => file.assertionResults ?? []);
  const failed = assertions.filter((entry) => entry.status === "failed").length;
  const passed = assertions.filter((entry) => entry.status === "passed").length;

  return {
    id: label,
    status: failed > 0 ? "failed" : "passed",
    total: assertions.length,
    passed,
    failed,
    durationMs: typeof report.numTotalTime === "number" ? report.numTotalTime : 0
  };
}

export function summarizeStructuredSuite(report, label) {
  if (!report) {
    return {
      id: label,
      status: "missing"
    };
  }

  return {
    id: label,
    status: typeof report.status === "string" ? report.status : "unknown",
    ...report
  };
}

export function summarizeCoverage(report) {
  if (!report?.total) {
    return null;
  }

  return {
    statementsPct: report.total.statements?.pct ?? 0,
    branchesPct: report.total.branches?.pct ?? 0,
    functionsPct: report.total.functions?.pct ?? 0,
    linesPct: report.total.lines?.pct ?? 0
  };
}

export function buildProgramSummary(input) {
  const { generatedAt, program, suites, coverage } = input;
  return {
    generatedAt,
    program,
    suites,
    coverage,
    totals: {
      total: suites.reduce((sum, suite) => sum + (typeof suite.total === "number" ? suite.total : 0), 0),
      passed: suites.reduce((sum, suite) => sum + (typeof suite.passed === "number" ? suite.passed : 0), 0),
      failed: suites.reduce((sum, suite) => sum + (typeof suite.failed === "number" ? suite.failed : 0), 0),
      durationMs: suites.reduce((sum, suite) => sum + (typeof suite.durationMs === "number" ? suite.durationMs : 0), 0)
    }
  };
}

export function buildProgramMarkdown(summary) {
  const markdown = [
    "# sbcl-agent-ux Test Report",
    "",
    `- Generated at: ${summary.generatedAt}`,
    `- Total assertions: ${summary.totals.total}`,
    `- Passed: ${summary.totals.passed}`,
    `- Failed: ${summary.totals.failed}`,
    "",
    "## Suites",
    "",
    ...summary.suites.map(
      (suite) =>
        `- \`${suite.id}\`: status=${suite.status} total=${suite.total ?? 0} passed=${suite.passed ?? 0} failed=${suite.failed ?? 0} durationMs=${suite.durationMs ?? 0}`
    )
  ].join("\n");

  if (!summary.coverage) {
    return markdown;
  }

  return `${markdown}\n\n## Coverage\n\n- Statements: ${summary.coverage.statementsPct}%\n- Branches: ${summary.coverage.branchesPct}%\n- Functions: ${summary.coverage.functionsPct}%\n- Lines: ${summary.coverage.linesPct}%`;
}
