import { dirname, resolve } from "node:path";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import type {
  BindingDto,
  CalculatorEvaluateInput,
  CalculatorResultDto,
  CommandResultDto,
  FileSystemDirectoryListingDto,
  FileSystemEntryDto,
  FileSystemWriteResultDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  ServiceMetadataDto,
  SourceMutationResultDto,
  SourcePreviewDto,
  SourceReloadResultDto
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

interface SourceServiceDependencies {
  invokeService: InvokeService;
  projectDir: string;
  getCurrentBinding: () => BindingDto | null;
  camelizeKeys: (value: unknown) => unknown;
  asStringArray: (value: unknown) => string[];
  normalizeCommandStatus: (status: unknown) => CommandResultDto<CalculatorResultDto>["status"];
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => ServiceMetadataDto;
  adaptRuntimeEvalResponse: (
    response: RawServiceResponse<Record<string, unknown>>,
    input: {
      form: string;
      packageName?: string;
      recoveryLaunch?: {
        source: "incident-restart";
        incidentId: string;
        restartLabel: string;
      } | null;
    }
  ) => CommandResultDto<RuntimeEvalResultDto>;
}

function sourceLanguageForPath(path: string): string {
  return path.endsWith(".lisp") || path.endsWith(".lsp") || path.endsWith(".asd") ? "lisp" : "text";
}

export class LiveSourceService {
  constructor(private readonly dependencies: SourceServiceDependencies) {}

  async fileSystemDirectory(input?: {
    path?: string;
  }): Promise<QueryResultDto<FileSystemDirectoryListingDto>> {
    const currentPath = resolve(
      input?.path && input.path.trim().length > 0 ? input.path : this.dependencies.projectDir
    );
    const entries = await readdir(currentPath, { withFileTypes: true }).catch((error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error.code === "EPERM" || error.code === "EACCES")
      ) {
        return [];
      }
      throw error;
    });
    const directories: FileSystemEntryDto[] = [];
    const files: FileSystemEntryDto[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = resolve(currentPath, entry.name);
      if (entry.isDirectory()) {
        directories.push({ name: entry.name, path: entryPath, kind: "directory" });
        continue;
      }
      if (entry.isFile()) {
        files.push({ name: entry.name, path: entryPath, kind: "file" });
        continue;
      }
      const entryStat = await stat(entryPath).catch(() => null);
      if (entryStat?.isDirectory()) {
        directories.push({ name: entry.name, path: entryPath, kind: "directory" });
      } else if (entryStat?.isFile()) {
        files.push({ name: entry.name, path: entryPath, kind: "file" });
      }
    }

    directories.sort((left, right) => left.name.localeCompare(right.name));
    files.sort((left, right) => left.name.localeCompare(right.name));

    return {
      contractVersion: 1,
      domain: "filesystem",
      operation: "filesystem.directory",
      kind: "query",
      status: "ok",
      data: {
        currentPath,
        parentPath: dirname(currentPath) === currentPath ? null : dirname(currentPath),
        directories,
        files
      },
      metadata: {
        authority: "environment",
        binding: this.dependencies.getCurrentBinding()
      }
    };
  }

  async sourcePreview(input: {
    environmentId: string;
    path: string;
    line?: number;
    contextRadius?: number;
  }): Promise<QueryResultDto<SourcePreviewDto>> {
    const absolutePath = input.path.startsWith("/")
      ? input.path
      : resolve(this.dependencies.projectDir, input.path);
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split("\n");
    const focusLine = input.line ?? 1;
    const radius = input.contextRadius ?? 8;
    const startLine = Math.max(1, focusLine - radius);
    const endLine = Math.min(lines.length, focusLine + radius);
    const snippet = lines.slice(startLine - 1, endLine).join("\n");

    return {
      contractVersion: 1,
      domain: "source",
      operation: "source.preview",
      kind: "query",
      status: "ok",
      data: {
        path: absolutePath,
        language: sourceLanguageForPath(absolutePath),
        focusLine,
        startLine,
        endLine,
        summary: `Source preview for ${absolutePath}.`,
        content: snippet,
        editableContent: content
      },
      metadata: {
        authority: "environment",
        binding: this.dependencies.getCurrentBinding()
      }
    };
  }

  async writeSourceFile(input: {
    path: string;
    content: string;
    overwrite?: boolean;
  }): Promise<CommandResultDto<FileSystemWriteResultDto>> {
    const absolutePath = input.path.startsWith("/")
      ? input.path
      : resolve(this.dependencies.projectDir, input.path);
    const existingStat = await stat(absolutePath).catch(() => null);
    if (existingStat?.isDirectory()) {
      throw new Error(`Cannot save source into directory path: ${absolutePath}`);
    }
    if (existingStat && !input.overwrite) {
      throw new Error(`File already exists and overwrite was not confirmed: ${absolutePath}`);
    }
    await writeFile(absolutePath, input.content, "utf8");
    const overwritten = Boolean(existingStat);

    return {
      contractVersion: 1,
      domain: "filesystem",
      operation: "filesystem.write-source-file",
      kind: "command",
      status: "ok",
      data: {
        path: absolutePath,
        overwritten,
        summary: overwritten
          ? `Overwrote source file ${absolutePath}.`
          : `Saved new source file ${absolutePath}.`
      },
      metadata: {
        authority: "environment",
        binding: this.dependencies.getCurrentBinding()
      }
    };
  }

  async evaluateInContext(input: {
    environmentId: string;
    form: string;
    packageName?: string;
    recoveryLaunch?: {
      source: "incident-restart";
      incidentId: string;
      restartLabel: string;
    } | null;
  }): Promise<CommandResultDto<RuntimeEvalResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.eval",
      input.environmentId,
      {
        form: input.form,
        packageName: input.packageName,
        recoveryLaunch: input.recoveryLaunch ?? undefined
      }
    );

    return this.dependencies.adaptRuntimeEvalResponse(response, input);
  }

  async evaluateCalculator(
    input: CalculatorEvaluateInput
  ): Promise<CommandResultDto<CalculatorResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "calculator.evaluate",
      input.environmentId,
      input as unknown as Record<string, unknown>
    );

    return {
      contractVersion: response.contractVersion,
      domain: "calculator",
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: this.dependencies.camelizeKeys(response.data) as CalculatorResultDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async stageSourceChange(input: {
    environmentId: string;
    path: string;
    content: string;
  }): Promise<CommandResultDto<SourceMutationResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "source.stage-change",
      input.environmentId,
      {
        path: input.path,
        content: input.content
      }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "source",
      operation: "source.stage_change",
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: {
        path: String(response.data.path ?? input.path),
        summary: String(response.data.summary ?? "Source change staged through governed workspace mutation."),
        bytesWritten: response.data.bytesWritten ? Number(response.data.bytesWritten) : input.content.length,
        artifactIds: this.dependencies.asStringArray(response.data.artifactIds),
        approvalId: response.data.approvalId ? String(response.data.approvalId) : null,
        workItemId: response.data.workItemId ? String(response.data.workItemId) : null
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async reloadSourceFile(input: {
    environmentId: string;
    path: string;
  }): Promise<CommandResultDto<SourceReloadResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "runtime.reload-file",
      input.environmentId,
      { path: input.path }
    );

    return {
      contractVersion: response.contractVersion,
      domain: "runtime",
      operation: "runtime.reload_file",
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: {
        path: String(response.data.path ?? input.path),
        summary: String(response.data.summary ?? "Runtime reload executed for the selected source file."),
        artifactIds: this.dependencies.asStringArray(response.data.artifactIds),
        approvalId: response.data.approvalId ? String(response.data.approvalId) : null,
        incidentId: response.data.incidentId ? String(response.data.incidentId) : null,
        workItemId: response.data.workItemId ? String(response.data.workItemId) : null
      },
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }
}
