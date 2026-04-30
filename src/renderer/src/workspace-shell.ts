import type { DesktopPanelId, WorkspaceId } from "../../shared/contracts";

export type HostedAppId = "control-panel" | "listener-workbench" | "artifact-explorer" | "package-manager";

export interface HostedAppDescriptor {
  id: HostedAppId;
  label: string;
  summary: string;
  availability: "available" | "planned";
}

export const hostedApps: HostedAppDescriptor[] = [
  {
    id: "control-panel",
    label: "Control Panel",
    summary: "Governed environment posture, workflow coordination, evidence, approvals, and recovery.",
    availability: "available"
  },
  {
    id: "listener-workbench",
    label: "Listener Workbench",
    summary: "A hosted runtime workbench for image-native listener and governed execution surfaces.",
    availability: "available"
  },
  {
    id: "artifact-explorer",
    label: "Artifact Explorer",
    summary: "A future hosted application for source, evidence, and environment artifacts.",
    availability: "planned"
  },
  {
    id: "package-manager",
    label: "Package Manager",
    summary: "A future hosted application for platform packages, compatibility apps, and lifecycle posture.",
    availability: "planned"
  }
];

export const workspaceOrder: Array<{ id: WorkspaceId; label: string; group: string; primary: boolean }> = [
  { id: "dashboard", label: "Dashboard", group: "Journeys", primary: true },
  { id: "environment", label: "Operate", group: "Journeys", primary: true },
  { id: "conversations", label: "Conversations", group: "Journeys", primary: true },
  { id: "browser", label: "Browser", group: "Journeys", primary: true },
  { id: "configuration", label: "Configuration", group: "Journeys", primary: true },
  { id: "runtime", label: "Execution", group: "Internal", primary: false },
  { id: "incidents", label: "Recovery", group: "Internal", primary: false },
  { id: "artifacts", label: "Evidence", group: "Internal", primary: false },
  { id: "work", label: "Execution Detail", group: "Internal", primary: false },
  { id: "activity", label: "Evidence Detail", group: "Internal", primary: false },
  { id: "approvals", label: "Approval Detail", group: "Internal", primary: false }
];

export const keyboardWorkspaceOrder = workspaceOrder
  .filter((workspace) => workspace.primary)
  .map((workspace) => workspace.id);

export function workspaceToDesktopPanelId(workspace: WorkspaceId): DesktopPanelId {
  switch (workspace) {
    case "browser":
      return "display";
    case "runtime":
    case "incidents":
    case "artifacts":
    case "work":
    case "activity":
    case "approvals":
      return "governance";
    case "dashboard":
    case "environment":
    case "conversations":
    case "documentation":
    case "configuration":
    default:
      return "workspace";
  }
}

export function desktopPanelToWorkspaceId(panelId: DesktopPanelId, fallbackWorkspace: WorkspaceId): WorkspaceId {
  switch (panelId) {
    case "display":
    case "object-browser":
      return "browser";
    case "governance":
    case "inspector":
      return "runtime";
    case "workspace":
    default:
      return fallbackWorkspace;
  }
}

export function canonicalWorkspace(workspaceId: WorkspaceId): WorkspaceId {
  switch (workspaceId) {
    case "work":
    case "approvals":
      return "runtime";
    case "activity":
      return "artifacts";
    default:
      return workspaceId;
  }
}

export function topLevelJourneyWorkspace(workspaceId: WorkspaceId): WorkspaceId {
  switch (workspaceId) {
    case "runtime":
    case "incidents":
    case "artifacts":
    case "work":
    case "activity":
    case "approvals":
      return "environment";
    default:
      return workspaceId;
  }
}

export function labelForWorkspace(workspaceId: WorkspaceId): string {
  return workspaceOrder.find((workspace) => workspace.id === canonicalWorkspace(workspaceId))?.label ?? workspaceId;
}

export function appForWorkspace(_workspaceId: WorkspaceId): HostedAppId {
  return "control-panel";
}
