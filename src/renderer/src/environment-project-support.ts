import type {
  ApprovalRequestDto,
  ArtifactDetailDto,
  BindingDto,
  EnvironmentEventDto,
  EnvironmentSummaryDto,
  IncidentDetailDto,
  ProjectProfileDto,
  ReplSessionProfileDto,
  RuntimeSummaryDto,
  ThreadDetailDto,
  TurnDetailDto,
  WorkItemDetailDto
} from "../../shared/contracts";
import type { EnvironmentFocusState } from "./environment-focus";

export function buildEnvironmentFocusPresentation(input: {
  focus: EnvironmentFocusState;
  focusLabel: string;
  selectedThread: ThreadDetailDto | null;
  selectedTurn: TurnDetailDto | null;
  selectedApproval: ApprovalRequestDto | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedIncident: IncidentDetailDto | null;
  selectedArtifact: ArtifactDetailDto | null;
  selectedEvent: EnvironmentEventDto | null;
}): {
  title: string;
  summary: string;
} {
  switch (input.focus.kind) {
    case "conversation-turn":
      return {
        title: input.selectedTurn?.title ?? input.focus.turnId ?? "Conversation turn",
        summary: input.selectedTurn?.summary ?? "Continue from the actively selected conversation turn."
      };
    case "conversation-thread":
    case "linked-conversation":
      return {
        title: input.selectedThread?.title ?? input.focus.threadId ?? "Conversation thread",
        summary: input.selectedThread?.summary ?? "Continue from the actively selected conversation thread."
      };
    case "runtime-symbol":
      return {
        title: input.focus.runtimeSymbol ?? "Runtime symbol",
        summary: `The draft is anchored to ${
          input.focus.runtimePackage ? `${input.focus.runtimePackage}::` : ""
        }${input.focus.runtimeSymbol ?? "the active symbol"} in the live runtime.`
      };
    case "source-artifact":
      return {
        title: input.focus.sourcePath ?? "Source artifact",
        summary: input.focus.sourceLine
          ? `The draft is anchored to ${input.focus.sourcePath ?? "the active source artifact"} at line ${input.focus.sourceLine}.`
          : "The draft is anchored to the active source artifact."
      };
    case "governance-approval":
      return {
        title: input.selectedApproval?.title ?? input.focus.approvalId ?? "Approval",
        summary:
          input.selectedApproval?.summary ??
          "Reason from the selected approval request, its policy posture, and its likely consequences."
      };
    case "governance-work-item":
      return {
        title: input.selectedWorkItem?.title ?? input.focus.workItemId ?? "Work item",
        summary:
          input.selectedWorkItem?.waitingReason ??
          "Stay attached to the selected work item, its blockers, and its closure posture."
      };
    case "governance-incident":
      return {
        title: input.selectedIncident?.title ?? input.focus.incidentId ?? "Incident",
        summary:
          input.selectedIncident?.summary ??
          "Stay attached to the selected incident, its recovery posture, and the next governed remediation step."
      };
    case "evidence-artifact":
      return {
        title: input.selectedArtifact?.title ?? input.focus.artifactId ?? "Artifact",
        summary:
          input.selectedArtifact?.summary ??
          "Use the selected artifact as the active evidence focus for the draft."
      };
    case "evidence-event":
      return {
        title:
          input.selectedEvent?.kind ??
          (input.focus.eventCursor != null ? `Event #${input.focus.eventCursor}` : "Environment event"),
        summary:
          input.selectedEvent?.summary ??
          "Reconstruct the selected event and use it as the active evidence focus."
      };
    case "runtime-scope":
      return {
        title: "Runtime scope",
        summary: "Keep the draft anchored to the active runtime scope rather than a detached chat topic."
      };
    case "none":
    default:
      return {
        title: "Current environment",
        summary: `${input.focusLabel}. Continue from the active environment posture rather than an isolated thread.`
      };
  }
}

export function slugifyProjectLabel(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "project";
}

export function ensureDesktopProjects(
  projects: ProjectProfileDto[] | undefined,
  binding: BindingDto | null,
  summary: EnvironmentSummaryDto | null
): ProjectProfileDto[] {
  const normalized = Array.isArray(projects) ? [...projects] : [];
  const environmentId = summary?.environmentId ?? binding?.environmentId ?? null;
  if (!environmentId) {
    return normalized;
  }

  if (normalized.some((project) => project.environmentId === environmentId)) {
    return normalized;
  }

  normalized.unshift({
    projectId: `project-${slugifyProjectLabel(environmentId)}`,
    title: summary?.environmentLabel ?? environmentId,
    environmentId,
    summary: summary?.activeContext.focusSummary ?? "Current bound environment."
  });
  return normalized;
}

export function makeUniqueProjectIdentity(
  projects: ProjectProfileDto[],
  requestedTitle: string
): { projectId: string; title: string } {
  const normalizedTitle = requestedTitle.trim() || "Untitled Project";
  let title = normalizedTitle;
  let suffix = 2;
  while (projects.some((project) => project.title === title)) {
    title = `${normalizedTitle} ${suffix}`;
    suffix += 1;
  }

  let projectId = `project-${slugifyProjectLabel(title)}`;
  while (projects.some((project) => project.projectId === projectId)) {
    projectId = `project-${slugifyProjectLabel(`${title}-${suffix}`)}`;
    suffix += 1;
  }

  return { projectId, title };
}

export function buildDefaultReplSession(
  environmentId: string,
  runtimeSummary: RuntimeSummaryDto | null
): ReplSessionProfileDto {
  return {
    sessionId: `repl-${slugifyProjectLabel(environmentId)}`,
    title: "Primary Listener",
    environmentId,
    draftForm: '(describe "sbcl-agent")',
    packageName: runtimeSummary?.currentPackage,
    lastSummary: runtimeSummary?.divergencePosture ?? "Primary project listener session.",
    history: []
  };
}
