import type { DesktopPanelId, WorkspaceId } from "../../shared/contracts";

export type HostedAppId = "control-panel" | "listener-workbench";

export interface HostedAppDescriptor {
  id: HostedAppId;
  label: string;
  summary: string;
}

export const hostedApps: HostedAppDescriptor[] = [
  {
    id: "control-panel",
    label: "Control Panel",
    summary: "Governed environment posture, workflow coordination, evidence, approvals, and recovery."
  },
  {
    id: "listener-workbench",
    label: "Listener Workbench",
    summary: "A hosted runtime workbench for image-native listener and governed execution surfaces."
  }
];

export const workspaceOrder: Array<{ id: WorkspaceId; label: string; primary: boolean }> = [
  { id: "environment", label: "Operate", primary: true },
  { id: "projects", label: "Projects", primary: true },
  { id: "conversations", label: "Conversations", primary: true },
  { id: "editor", label: "Editor", primary: true },
  { id: "workspace", label: "Workspace", primary: true },
  { id: "transcript", label: "Transcript", primary: true },
  { id: "browser", label: "Browser", primary: true },
  { id: "configuration", label: "Configuration", primary: true },
  { id: "runtime", label: "Execution", primary: false },
  { id: "incidents", label: "Recovery", primary: false },
  { id: "artifacts", label: "Evidence", primary: false },
  { id: "work", label: "Execution Detail", primary: false },
  { id: "activity", label: "Evidence Detail", primary: false },
  { id: "approvals", label: "Approval Detail", primary: false }
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
    case "environment":
    case "projects":
    case "conversations":
    case "editor":
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
