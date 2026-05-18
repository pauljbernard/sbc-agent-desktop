import { execFile } from "node:child_process";
import os from "node:os";
import { basename, resolve } from "node:path";
import { promisify } from "node:util";
import { readFile, readdir, stat } from "node:fs/promises";
import type {
  ConsoleLogEntryDto,
  DiagnosticReportKind,
  DiagnosticReportSummaryDto,
  RuntimeTelemetryProcessDto
} from "../../shared/contracts";
import { asRecord, asRecordArray, firstString } from "./adapter-support";

const execFileAsync = promisify(execFile);

export async function sampleProcessUsage(
  pid: number | null | undefined
): Promise<Partial<RuntimeTelemetryProcessDto>> {
  if (!pid || !Number.isFinite(pid)) {
    return {};
  }

  try {
    const { stdout } = await execFileAsync("ps", [
      "-p",
      String(pid),
      "-o",
      "%cpu=,rss=,etime=,state=,command="
    ]);
    const line = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0);
    if (!line) {
      return {};
    }

    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
    if (!match) {
      return {};
    }

    return {
      cpuPercent: Number.parseFloat(match[1]),
      memoryMb: Number.parseFloat(match[2]) / 1024,
      elapsed: match[3],
      command: match[5]
    };
  } catch {
    return {};
  }
}

export async function sampleOpenConnectionCount(
  pid: number | null | undefined
): Promise<number | null> {
  if (!pid || !Number.isFinite(pid)) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", "-a", "-p", String(pid), "-i"]);
    const lines = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return Math.max(0, lines.length - 1);
  } catch {
    return null;
  }
}

export async function sampleHostNetworkBytes(): Promise<{
  inboundBytes: number;
  outboundBytes: number;
} | null> {
  try {
    const { stdout } = await execFileAsync("netstat", ["-ib"]);
    const totals = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && !entry.startsWith("Name"))
      .reduce(
        (accumulator, line) => {
          const columns = line.split(/\s+/);
          if (columns.length < 10) {
            return accumulator;
          }

          const name = columns[0];
          if (!name || name.startsWith("lo")) {
            return accumulator;
          }

          const inboundBytes = Number(columns[6]);
          const outboundBytes = Number(columns[9]);
          if (Number.isFinite(inboundBytes)) {
            accumulator.inboundBytes += inboundBytes;
          }
          if (Number.isFinite(outboundBytes)) {
            accumulator.outboundBytes += outboundBytes;
          }
          return accumulator;
        },
        { inboundBytes: 0, outboundBytes: 0 }
      );

    return totals.inboundBytes > 0 || totals.outboundBytes > 0 ? totals : null;
  } catch {
    return null;
  }
}

export async function sampleHostDiskThroughputKbps(): Promise<{
  readKbps: number;
  writeKbps: number;
} | null> {
  try {
    const { stdout } = await execFileAsync("iostat", ["-d", "-K", "-w", "1", "-c", "2"]);
    const lines = stdout
      .split("\n")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const dataLines = lines.filter((line) => !line.startsWith("disk") && !line.startsWith("cpu"));
    if (dataLines.length === 0) {
      return null;
    }

    const sampleLine = dataLines[dataLines.length - 1];
    const columns = sampleLine.split(/\s+/);
    if (columns.length < 3) {
      return null;
    }

    let readKbps = 0;
    let writeKbps = 0;
    for (let index = 0; index + 2 < columns.length; index += 3) {
      const kbPerTransfer = Number(columns[index]);
      const transfersPerSecond = Number(columns[index + 1]);
      const mbPerSecond = Number(columns[index + 2]);
      if (!Number.isFinite(kbPerTransfer) || !Number.isFinite(transfersPerSecond)) {
        continue;
      }

      const aggregateKbps =
        Number.isFinite(mbPerSecond) && mbPerSecond > 0
          ? mbPerSecond * 1024
          : kbPerTransfer * transfersPerSecond;
      readKbps += aggregateKbps / 2;
      writeKbps += aggregateKbps / 2;
    }

    if (readKbps <= 0 && writeKbps <= 0) {
      return null;
    }

    return { readKbps, writeKbps };
  } catch {
    return null;
  }
}

export function diagnosticKindForPath(path: string): DiagnosticReportKind {
  if (path.endsWith(".crash")) {
    return "crash";
  }
  if (path.endsWith(".spin")) {
    return "spin";
  }
  if (path.endsWith(".log")) {
    return "log";
  }
  return "diagnostic";
}

export interface DiagnosticPreviewMetadata {
  appName: string | null;
  processName: string | null;
  pid: number | null;
  timestamp: string | null;
  incidentId: string | null;
  parentProc: string | null;
  responsibleProc: string | null;
  bugType: string | null;
}

export function processNameFromDiagnosticFile(fileName: string): string | null {
  const [processName] = fileName.split("_");
  return processName && processName.length > 0 ? processName : null;
}

export function diagnosticPreviewMetadata(content: string): DiagnosticPreviewMetadata {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

  let header: Record<string, unknown> = {};
  try {
    header = firstLine.startsWith("{") ? asRecord(JSON.parse(firstLine)) : {};
  } catch {
    header = {};
  }

  const matchString = (pattern: RegExp): string | null => {
    const match = pattern.exec(content);
    return match?.[1] ?? null;
  };

  const matchNumber = (pattern: RegExp): number | null => {
    const raw = matchString(pattern);
    if (!raw) {
      return null;
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  };

  return {
    appName: firstString(header.app_name, header.name) ?? null,
    processName: firstString(matchString(/"procName"\s*:\s*"([^"]+)"/), header.app_name, header.name) ?? null,
    pid: matchNumber(/"pid"\s*:\s*(\d+)/),
    timestamp: firstString(header.timestamp, matchString(/"captureTime"\s*:\s*"([^"]+)"/)) ?? null,
    incidentId: firstString(header.incident_id, matchString(/"incident"\s*:\s*"([^"]+)"/)) ?? null,
    parentProc: matchString(/"parentProc"\s*:\s*"([^"]+)"/),
    responsibleProc: matchString(/"responsibleProc"\s*:\s*"([^"]+)"/),
    bugType: firstString(header.bug_type, matchString(/"bug_type"\s*:\s*"([^"]+)"/)) ?? null
  };
}

export function diagnosticKindFromMetadata(
  path: string,
  preview: DiagnosticPreviewMetadata
): DiagnosticReportKind {
  if (path.endsWith(".ips")) {
    return preview.incidentId || preview.bugType ? "crash" : "analytics";
  }

  return diagnosticKindForPath(path);
}

export function diagnosticSummary(
  kind: DiagnosticReportKind,
  processName: string | null,
  source: string,
  preview?: DiagnosticPreviewMetadata | null
): string {
  const provenance =
    preview?.parentProc || preview?.responsibleProc
      ? ` Parent: ${preview?.parentProc ?? "unknown"}, responsible: ${preview?.responsibleProc ?? "unknown"}.`
      : "";
  switch (kind) {
    case "crash":
      return `${processName ?? "Process"} crash report retained from ${source}.${provenance}`;
    case "spin":
      return `${processName ?? "Process"} spin report retained from ${source}.${provenance}`;
    case "analytics":
      return `${processName ?? "Process"} analytics report retained from ${source}.${provenance}`;
    case "log":
      return `${processName ?? "Process"} log report retained from ${source}.${provenance}`;
    default:
      return `Retained host diagnostic report from ${source}.${provenance}`;
  }
}

export async function collectHostDiagnosticReports(
  limit = 40
): Promise<DiagnosticReportSummaryDto[]> {
  const roots = [
    resolve(os.homedir(), "Library/Logs/DiagnosticReports"),
    "/Library/Logs/DiagnosticReports"
  ];
  const entries: DiagnosticReportSummaryDto[] = [];

  for (const root of roots) {
    try {
      const names = await readdir(root);
      for (const name of names) {
        const fullPath = resolve(root, name);
        try {
          const info = await stat(fullPath);
          if (!info.isFile()) {
            continue;
          }
          let preview: DiagnosticPreviewMetadata | null = null;
          try {
            preview = diagnosticPreviewMetadata((await readFile(fullPath, "utf8")).slice(0, 8192));
          } catch {
            preview = null;
          }
          const processName = preview?.processName ?? processNameFromDiagnosticFile(name);
          const kind = diagnosticKindFromMetadata(name, preview ?? diagnosticPreviewMetadata(""));
          entries.push({
            reportId: fullPath,
            kind,
            title: name,
            summary: diagnosticSummary(kind, processName, basename(root), preview),
            source: basename(root),
            processName,
            pid: preview?.pid ?? null,
            createdAt: preview?.timestamp ?? info.mtime.toISOString(),
            path: fullPath
          });
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }

  return entries
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function consoleTypeFromHostLogLevel(level: string | undefined): ConsoleLogEntryDto["type"] {
  switch ((level ?? "").toLowerCase()) {
    case "debug":
      return "debug";
    case "notice":
      return "notice";
    case "error":
      return "error";
    case "fault":
      return "fault";
    case "warning":
      return "warning";
    default:
      return "info";
  }
}

function parseHostLogJsonLines(stdout: string): Array<Record<string, unknown>> {
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((entry) => asRecord(entry)) : [];
    } catch {
      return [];
    }
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      try {
        return [asRecord(JSON.parse(line))];
      } catch {
        return [];
      }
    });
}

export async function collectHostConsoleEntries(limit = 80): Promise<ConsoleLogEntryDto[]> {
  try {
    const predicate =
      'process == "sbcl" OR process == "Electron" OR process CONTAINS "sbcl-agent" OR subsystem CONTAINS "electron"';
    const { stdout } = await execFileAsync("log", [
      "show",
      "--style",
      "json",
      "--last",
      "10m",
      "--predicate",
      predicate
    ]);
    const records = parseHostLogJsonLines(stdout);
    return records
      .map((record, index) => {
        const processName =
          firstString(record.process, record.processImagePath && basename(String(record.processImagePath))) ?? "host";
        const source = firstString(record.subsystem, record.category, processName) ?? "host";
        const message = firstString(record.eventMessage, record.message) ?? "Host console entry";
        const timestamp = firstString(record.timestamp, record.date) ?? new Date().toISOString();
        return {
          entryId: `host:${index}:${timestamp}`,
          cursor: index,
          plane: "host" as const,
          timestamp,
          message,
          source,
          category: firstString(record.category, record.subsystem) ?? "host",
          type: consoleTypeFromHostLogLevel(firstString(record.messageType, record.level)),
          processName,
          pid:
            typeof record.processID === "number"
              ? record.processID
              : typeof record.pid === "number"
                ? record.pid
                : null,
          threadId: firstString(record.threadID, record.threadIdentifier) ?? null,
          activityId: firstString(record.activityIdentifier) ?? null,
          environmentId: null,
          runtimeId: null,
          workItemId: null,
          workflowRecordId: null,
          incidentId: null,
          threadRefId: null,
          turnRefId: null,
          visibility: "operator",
          detail: JSON.stringify(record, null, 2)
        } satisfies ConsoleLogEntryDto;
      })
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}
