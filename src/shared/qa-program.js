export function evaluateCoverageThresholds(summary, thresholds) {
  const total = summary?.total ?? {};
  const metrics = {
    statementsPct: total.statements?.pct ?? 0,
    branchesPct: total.branches?.pct ?? 0,
    functionsPct: total.functions?.pct ?? 0,
    linesPct: total.lines?.pct ?? 0
  };

  const failedChecks = Object.entries(thresholds)
    .filter(([metric, minimum]) => (metrics[metric] ?? 0) < minimum)
    .map(([metric, minimum]) => ({
      metric,
      minimum,
      actual: metrics[metric] ?? 0
    }));

  return {
    suite: "coverage",
    status: failedChecks.length > 0 ? "failed" : "passed",
    metrics,
    thresholds,
    failedChecks
  };
}

export function summarizeUiJourneyReport(report) {
  if (!report) {
    return {
      suite: "ui-journey",
      status: "missing",
      total: 0,
      passed: 0,
      failed: 0
    };
  }

  function collectSpecs(suites) {
    return suites.flatMap((suite) => [
      ...(suite.specs ?? []),
      ...collectSpecs(Array.isArray(suite.suites) ? suite.suites : [])
    ]);
  }

  const suites = Array.isArray(report.suites) ? report.suites : [];
  const specs = collectSpecs(suites);
  const tests = specs.flatMap((spec) => spec.tests ?? []);
  const results = tests.flatMap((test) => test.results ?? []);

  const passed = specs.filter((spec) => spec.ok === true).length;
  const failed = specs.filter((spec) => spec.ok !== true).length;
  const durationMs = results.reduce((sum, result) => sum + (typeof result.duration === "number" ? result.duration : 0), 0);

  return {
    suite: "ui-journey",
    status: report.stats?.unexpected > 0 || failed > 0 ? "failed" : "passed",
    total: specs.length,
    passed,
    failed,
    durationMs,
    unexpected: report.stats?.unexpected ?? failed,
    lanes: summarizeUiJourneyLanes(report)
  };
}

function classifyUiJourneySpec(spec) {
  const title = String(spec?.title ?? "").toLowerCase();

  if (title.includes("dashboard")) {
    return "dashboard";
  }

  if (
    title.includes("conversation") ||
    title.includes("transcript") ||
    title.includes("composer")
  ) {
    return "conversation";
  }

  if (
    title.includes("browser") ||
    title.includes("listener") ||
    title.includes("inspected package") ||
    title.includes("inspected symbols") ||
    title.includes("system type")
  ) {
    return "browser";
  }

  return "workspace";
}

export function summarizeUiJourneyLanes(report) {
  if (!report) {
    return [];
  }

  function collectSpecs(suites) {
    return suites.flatMap((suite) => [
      ...(suite.specs ?? []),
      ...collectSpecs(Array.isArray(suite.suites) ? suite.suites : [])
    ]);
  }

  const specs = collectSpecs(Array.isArray(report.suites) ? report.suites : []);
  const grouped = new Map();

  for (const spec of specs) {
    const laneId = classifyUiJourneySpec(spec);
    const entry = grouped.get(laneId) ?? { id: laneId, total: 0, passed: 0, failed: 0, durationMs: 0 };
    const tests = spec.tests ?? [];
    const results = tests.flatMap((test) => test.results ?? []);
    entry.total += 1;
    entry.durationMs += results.reduce((sum, result) => sum + (typeof result.duration === "number" ? result.duration : 0), 0);
    if (spec.ok === true) {
      entry.passed += 1;
    } else {
      entry.failed += 1;
    }
    grouped.set(laneId, entry);
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((lane) => ({
      suite: `ui-journey:${lane.id}`,
      id: lane.id,
      status: lane.failed > 0 ? "failed" : "passed",
      total: lane.total,
      passed: lane.passed,
      failed: lane.failed,
      durationMs: lane.durationMs
    }));
}

export function buildQaEvidenceIndex(input) {
  const {
    generatedAt,
    program,
    summary,
    coverageCheck,
    compliance,
    security,
    performance,
    uiJourney = null,
    trend = null
  } = input;

  const suites = [
    {
      id: "unit-and-integration",
      status: summary?.totals?.failed > 0 ? "failed" : "passed",
      assertions: summary?.totals?.total ?? 0
    },
    {
      id: "coverage",
      status: coverageCheck?.status ?? "missing"
    },
    {
      id: "security",
      status: security?.status ?? "missing"
    },
    {
      id: "compliance",
      status: compliance?.status ?? "missing"
    },
    {
      id: "performance",
      status: performance?.status ?? "missing"
    }
  ];

  if (uiJourney) {
    suites.push({
      id: "ui-journey",
      status: uiJourney.status,
      assertions: uiJourney.total
    });

    for (const lane of uiJourney.lanes ?? []) {
      suites.push({
        id: `ui-journey:${lane.id}`,
        status: lane.status,
        assertions: lane.total
      });
    }
  }

  const failing = suites.filter((suite) => suite.status !== "passed").map((suite) => suite.id);

  return {
    generatedAt,
    program,
    overallStatus: failing.length > 0 ? "attention" : "passed",
    suites,
    failing,
    summary,
    coverageCheck,
    compliance,
    security,
    performance,
    uiJourney,
    trend
  };
}

export function buildQaEvidenceMarkdown(index) {
  return [
    "# sbcl-agent-ux QA Evidence Index",
    "",
    `- Generated at: ${index.generatedAt}`,
    `- Overall status: ${index.overallStatus}`,
    index.failing.length > 0 ? `- Attention lanes: ${index.failing.join(", ")}` : "- Attention lanes: none",
    "",
    "## Lanes",
    "",
    ...index.suites.map((suite) => `- \`${suite.id}\`: status=${suite.status}${typeof suite.assertions === "number" ? ` assertions=${suite.assertions}` : ""}`),
    "",
    "## Coverage Thresholds",
    "",
    `- Statements: ${index.coverageCheck?.metrics?.statementsPct ?? 0}% (minimum ${index.coverageCheck?.thresholds?.statementsPct ?? 0}%)`,
    `- Branches: ${index.coverageCheck?.metrics?.branchesPct ?? 0}% (minimum ${index.coverageCheck?.thresholds?.branchesPct ?? 0}%)`,
    `- Functions: ${index.coverageCheck?.metrics?.functionsPct ?? 0}% (minimum ${index.coverageCheck?.thresholds?.functionsPct ?? 0}%)`,
    `- Lines: ${index.coverageCheck?.metrics?.linesPct ?? 0}% (minimum ${index.coverageCheck?.thresholds?.linesPct ?? 0}%)`,
    "",
    "## Trend",
    "",
    `- Runs tracked: ${index.trend?.runsTracked ?? 0}`,
    `- Latest overall status: ${index.trend?.latestOverallStatus ?? index.overallStatus}`,
    `- Coverage delta (statements): ${formatTrendDelta(index.trend?.coverageDelta?.statementsPct)}`,
    `- Coverage delta (branches): ${formatTrendDelta(index.trend?.coverageDelta?.branchesPct)}`,
    `- Coverage delta (functions): ${formatTrendDelta(index.trend?.coverageDelta?.functionsPct)}`,
    `- Coverage delta (lines): ${formatTrendDelta(index.trend?.coverageDelta?.linesPct)}`,
    `- Journey assertion delta: ${formatTrendDelta(index.trend?.uiJourneyDelta?.total, 0)}`
  ].join("\n");
}

export function buildQaTrendEntry(input) {
  return {
    generatedAt: input.generatedAt,
    overallStatus: input.overallStatus,
    coverage: {
      statementsPct: input.coverageCheck?.metrics?.statementsPct ?? 0,
      branchesPct: input.coverageCheck?.metrics?.branchesPct ?? 0,
      functionsPct: input.coverageCheck?.metrics?.functionsPct ?? 0,
      linesPct: input.coverageCheck?.metrics?.linesPct ?? 0
    },
    uiJourney: {
      total: input.uiJourney?.total ?? 0,
      passed: input.uiJourney?.passed ?? 0,
      failed: input.uiJourney?.failed ?? 0
    }
  };
}

export function updateQaTrendHistory(history, entry, limit = 20) {
  const items = Array.isArray(history?.runs) ? [...history.runs] : [];
  items.push(entry);
  const trimmed = items.slice(Math.max(0, items.length - limit));
  return { runs: trimmed };
}

export function summarizeQaTrend(history) {
  const runs = Array.isArray(history?.runs) ? history.runs : [];
  const latest = runs.at(-1) ?? null;
  const previous = runs.length > 1 ? runs.at(-2) : null;

  return {
    runsTracked: runs.length,
    latestOverallStatus: latest?.overallStatus ?? "unknown",
    coverageDelta: {
      statementsPct: computeDelta(latest?.coverage?.statementsPct, previous?.coverage?.statementsPct),
      branchesPct: computeDelta(latest?.coverage?.branchesPct, previous?.coverage?.branchesPct),
      functionsPct: computeDelta(latest?.coverage?.functionsPct, previous?.coverage?.functionsPct),
      linesPct: computeDelta(latest?.coverage?.linesPct, previous?.coverage?.linesPct)
    },
    uiJourneyDelta: {
      total: computeDelta(latest?.uiJourney?.total, previous?.uiJourney?.total),
      passed: computeDelta(latest?.uiJourney?.passed, previous?.uiJourney?.passed),
      failed: computeDelta(latest?.uiJourney?.failed, previous?.uiJourney?.failed)
    },
    recentRuns: runs.slice(-5)
  };
}

function computeDelta(current, previous) {
  if (typeof current !== "number") {
    return null;
  }
  if (typeof previous !== "number") {
    return current;
  }
  return Number((current - previous).toFixed(2));
}

function formatTrendDelta(value, digits = 2) {
  if (typeof value !== "number") {
    return "n/a";
  }
  const rounded = digits === 0 ? Math.round(value) : value.toFixed(digits);
  return value >= 0 ? `+${rounded}` : `${rounded}`;
}
