import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFileSync } from "node:fs";
import os from "node:os";
import { createInterface, type Interface as ReadLineInterface } from "node:readline";

export interface LiveAdapterOptions {
  transport: "socket" | "pipe";
  endpoint: string;
  projectDir: string;
  bridgePath: string;
  environmentStatePath: string;
}

export interface RawServiceResponse<TData = unknown> {
  contractVersion: number;
  domain: string;
  operation: string;
  kind: "query" | "command";
  status: "ok" | "error" | "awaiting-approval" | "rejected";
  data: TData;
  metadata: Record<string, unknown>;
}

interface PersistentBridgeResponseFrame {
  id: number;
  response: unknown;
}

interface PersistentBridgePendingEntry {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  operation: string;
  startedAt: number;
}

interface PersistentBridgeDependencies {
  options: LiveAdapterOptions;
  resolveSbclExecutable: () => string;
  buildSbclSpawnEnvironment: () => NodeJS.ProcessEnv;
  normalizeFrame: (value: unknown) => PersistentBridgeResponseFrame;
}

export class PersistentSbclBridge {
  private persistentBridgeProcess: ChildProcessWithoutNullStreams | null = null;
  private persistentBridgeReadline: ReadLineInterface | null = null;
  private persistentBridgeRequestId = 0;
  private persistentBridgeWarmupRequested = false;
  private persistentBridgePending = new Map<number, PersistentBridgePendingEntry>();

  constructor(private readonly deps: PersistentBridgeDependencies) {}

  private trace(message: string, detail?: Record<string, unknown>): void {
    const payload = {
      timestamp: new Date().toISOString(),
      message,
      ...(detail ? { detail } : {})
    };
    try {
      appendFileSync("/private/tmp/surface-persistent-bridge.log", `${JSON.stringify(payload)}\n`);
    } catch {
      // Ignore tracing failures during debugging instrumentation.
    }
  }

  get warmupRequested(): boolean {
    return this.persistentBridgeWarmupRequested;
  }

  warmup(): void {
    if (this.deps.options.transport !== "pipe" || this.persistentBridgeWarmupRequested) {
      return;
    }

    this.persistentBridgeWarmupRequested = true;
    const startedAt = performance.now();
    try {
      void this.ensurePersistentBridge();
      console.info(
        "[bridge-perf] operation=%s durationMs=%d status=warmup-requested transport=persistent-pipe",
        "persistent-bridge",
        Math.round(performance.now() - startedAt)
      );
    } catch (error) {
      this.persistentBridgeWarmupRequested = false;
      console.info(
        "[bridge-perf] operation=%s durationMs=%d status=warmup-error transport=persistent-pipe",
        "persistent-bridge",
        Math.round(performance.now() - startedAt)
      );
      throw error;
    }
  }

  async invoke<T>(
    operation: string,
    environmentId: string | undefined,
    request: Record<string, unknown> | undefined,
    transportLabel = "persistent-pipe"
  ): Promise<T> {
    if (this.deps.options.transport !== "pipe") {
      throw new Error(
        `Live adapter transport '${this.deps.options.transport}' is configured, but only the initial pipe bridge is implemented.`
      );
    }

    const startedAt = performance.now();
    const child = await this.ensurePersistentBridge();
    const id = ++this.persistentBridgeRequestId;
    const payload = {
      id,
      operation,
      environmentId: environmentId ?? null,
      request: request ?? null
    };
    this.trace("invoke-write", {
      id,
      operation,
      environmentId: environmentId ?? null
    });

    if (operation === "runtime.symbol-page") {
      console.info("[runtime-symbol-page-payload] %s", JSON.stringify(payload));
    }

    return new Promise<T>((resolvePromise, rejectPromise) => {
      this.persistentBridgePending.set(id, {
        operation,
        startedAt,
        resolve: (value) => {
          this.trace("invoke-resolve", { id, operation });
          console.info(
            "[bridge-perf] operation=%s durationMs=%d status=ok transport=%s",
            operation,
            Math.round(performance.now() - startedAt),
            transportLabel
          );
          resolvePromise(value as T);
        },
        reject: (error) => {
          this.trace("invoke-reject", {
            id,
            operation,
            message: error.message
          });
          console.info(
            "[bridge-perf] operation=%s durationMs=%d status=error transport=%s",
            operation,
            Math.round(performance.now() - startedAt),
            transportLabel
          );
          rejectPromise(error);
        }
      });
      child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (error) {
          this.persistentBridgePending.delete(id);
          rejectPromise(error);
        }
      });
    });
  }

  private async ensurePersistentBridge(): Promise<ChildProcessWithoutNullStreams> {
    if (this.persistentBridgeProcess && !this.persistentBridgeProcess.killed) {
      return this.persistentBridgeProcess;
    }

    const executable = this.deps.resolveSbclExecutable();
    const cwd = existsSync(this.deps.options.projectDir)
      ? this.deps.options.projectDir
      : os.homedir();
    const env = this.deps.buildSbclSpawnEnvironment();
    const child = spawn(
      executable,
      [
        "--script",
        this.deps.options.bridgePath,
        this.deps.options.projectDir,
        this.deps.options.environmentStatePath,
        "--serve"
      ],
      {
        cwd,
        env,
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      this.rejectAllPending(error);
      this.resetBridgeState();
    });
    child.on("close", (code) => {
      const pending = Array.from(this.persistentBridgePending.values());
      this.persistentBridgePending.clear();
      this.resetBridgeState();
      for (const entry of pending) {
        console.info(
          "[bridge-perf] operation=%s durationMs=%d status=persistent-bridge-closed code=%s stderrBytes=%d",
          entry.operation,
          Math.round(performance.now() - entry.startedAt),
          String(code ?? "unknown"),
          stderr.length
        );
        entry.reject(
          new Error(
            stderr.trim() || `Persistent bridge exited before returning a result (exit code ${code ?? "unknown"}).`
          )
        );
      }
    });

    const stdoutLines = createInterface({ input: child.stdout });
    stdoutLines.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }
      this.trace("stdout-line", { line: trimmed.slice(0, 500) });

      let frame: PersistentBridgeResponseFrame;
      try {
        frame = this.deps.normalizeFrame(JSON.parse(trimmed));
      } catch (error) {
        this.rejectAllPending(error instanceof Error ? error : new Error(String(error)));
        return;
      }

      const pending = this.persistentBridgePending.get(frame.id);
      if (!pending) {
        return;
      }

      this.persistentBridgePending.delete(frame.id);
      pending.resolve(frame.response);
    });

    this.persistentBridgeProcess = child;
    this.persistentBridgeReadline = stdoutLines;
    return child;
  }

  private resetBridgeState(): void {
    this.persistentBridgeProcess = null;
    this.persistentBridgeWarmupRequested = false;
    this.persistentBridgeReadline?.close();
    this.persistentBridgeReadline = null;
  }

  private rejectAllPending(error: Error): void {
    const pending = Array.from(this.persistentBridgePending.values());
    this.persistentBridgePending.clear();
    for (const entry of pending) {
      entry.reject(error);
    }
  }
}
