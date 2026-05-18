import type {
  CommandResultDto,
  DesktopPreferencesDto,
  ProjectProfileDto,
  RuntimeEvalResultDto,
  ServiceMetadataDto
} from "../../shared/contracts";

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

export function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(camelizeKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        snakeToCamel(key),
        camelizeKeys(nestedValue)
      ])
    );
  }

  return value;
}

export function normalizeMetadata(
  metadata: Record<string, unknown> | undefined
): ServiceMetadataDto {
  const bindingValue = metadata?.binding;
  const binding =
    bindingValue && typeof bindingValue === "object"
      ? {
          sessionId: (bindingValue as Record<string, unknown>).sessionId as string | null | undefined,
          environmentId:
            ((bindingValue as Record<string, unknown>).environmentId as string | undefined) ??
            "live-environment"
        }
      : null;

  return {
    authority: "environment",
    binding,
    readModel: metadata?.readModel as string | undefined,
    commandModel: metadata?.commandModel as string | undefined,
    policyId: (metadata?.policyId as string | null | undefined) ?? null,
    threadId: (metadata?.threadId as string | null | undefined) ?? null,
    turnId: (metadata?.turnId as string | null | undefined) ?? null,
    workItemId: (metadata?.workItemId as string | null | undefined) ?? null,
    workflowRecordId: (metadata?.workflowRecordId as string | null | undefined) ?? null,
    incidentId: (metadata?.incidentId as string | null | undefined) ?? null,
    runtimeId: (metadata?.runtimeId as string | null | undefined) ?? null,
    eventFamily: (metadata?.eventFamily as string | null | undefined) ?? null,
    visibility: (metadata?.visibility as string | null | undefined) ?? null
  };
}

export function mergeDesktopPreferences(
  current: DesktopPreferencesDto,
  patch: Partial<DesktopPreferencesDto>
): DesktopPreferencesDto {
  const currentDesktopSurfaceView = current.desktopSurfaceView ?? {
    tooltipScalePercent: 100,
    controlIconScalePercent: 100,
    dockIconScalePercent: 100,
    conversationTextScalePercent: 100,
    sourceCodeTextScalePercent: 100
  };

  return {
    ...current,
    ...patch,
    desktopSurfaceView: {
      tooltipScalePercent:
        patch.desktopSurfaceView?.tooltipScalePercent ??
        currentDesktopSurfaceView.tooltipScalePercent,
      controlIconScalePercent:
        patch.desktopSurfaceView?.controlIconScalePercent ??
        currentDesktopSurfaceView.controlIconScalePercent,
      dockIconScalePercent:
        patch.desktopSurfaceView?.dockIconScalePercent ??
        currentDesktopSurfaceView.dockIconScalePercent,
      conversationTextScalePercent:
        patch.desktopSurfaceView?.conversationTextScalePercent ??
        currentDesktopSurfaceView.conversationTextScalePercent,
      sourceCodeTextScalePercent:
        patch.desktopSurfaceView?.sourceCodeTextScalePercent ??
        currentDesktopSurfaceView.sourceCodeTextScalePercent
    },
    lispCodeView: {
      ...current.lispCodeView,
      ...patch.lispCodeView
    }
  };
}

export function normalizeCommandResultLike<T>(value: unknown): CommandResultDto<T> | null {
  if (value === null || value === false || value === "null" || value === undefined) {
    return null;
  }

  return value as CommandResultDto<T>;
}

export function normalizeDesktopPreferencesPayload(
  payload: Partial<DesktopPreferencesDto> | null | undefined
): Partial<DesktopPreferencesDto> {
  if (!payload) {
    return {};
  }

  const normalized: Partial<DesktopPreferencesDto> = {
    ...payload
  };

  if (payload.projects && typeof payload.projects === "object") {
    normalized.projects = Array.isArray(payload.projects)
      ? payload.projects
      : (Object.values(payload.projects).filter((project) =>
          Boolean(project && typeof project === "object")
        ) as ProjectProfileDto[]);
  }

  if (payload.replSessionsByProject && typeof payload.replSessionsByProject === "object") {
    normalized.replSessionsByProject = Object.fromEntries(
      Object.entries(payload.replSessionsByProject).map(([projectId, sessions]) => [
        projectId,
        Array.isArray(sessions)
          ? sessions.map((session) => ({
              ...session,
              history: Array.isArray(session.history) ? session.history : []
            }))
          : []
      ])
    );
  }

  if (payload.editorBuffersByProject && typeof payload.editorBuffersByProject === "object") {
    normalized.editorBuffersByProject = Object.fromEntries(
      Object.entries(payload.editorBuffersByProject).map(([projectId, buffers]) => [
        projectId,
        Array.isArray(buffers)
          ? buffers.map((buffer) => ({
              ...buffer,
              result: normalizeCommandResultLike<RuntimeEvalResultDto>(buffer.result)
            }))
          : []
      ])
    );
  }

  if (payload.workspaceHistoryByProject && typeof payload.workspaceHistoryByProject === "object") {
    normalized.workspaceHistoryByProject = Object.fromEntries(
      Object.entries(payload.workspaceHistoryByProject).map(([projectId, history]) => [
        projectId,
        Array.isArray(history) ? history : []
      ])
    );
  }

  if (payload.workspaceResultByProject && typeof payload.workspaceResultByProject === "object") {
    normalized.workspaceResultByProject = Object.fromEntries(
      Object.entries(payload.workspaceResultByProject).map(([projectId, result]) => [
        projectId,
        normalizeCommandResultLike<RuntimeEvalResultDto>(result)
      ])
    );
  }

  return normalized;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

export function asRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];
}

export function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}
