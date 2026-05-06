import type { ReactNode } from "react";

import type { ShellDockPanelDefinition, ShellDockPanelId } from "./shell-layout";

export interface ShellRailPanelEntry {
  id: ShellDockPanelId;
  label: string;
  content: ReactNode;
}

export function createShellRailPanelEntries(
  dockPanels: ShellDockPanelDefinition[],
  contentById: Partial<Record<ShellDockPanelId, ReactNode>>
): ShellRailPanelEntry[] {
  return dockPanels.flatMap((panel) => {
    const content = contentById[panel.id];
    if (content == null) {
      return [];
    }
    return [
      {
        ...panel,
        content
      }
    ];
  });
}

export function resolveActiveShellRailPanel(
  entries: ShellRailPanelEntry[],
  activePanelId: ShellDockPanelId | null
): ShellRailPanelEntry | null {
  return entries.find((panel) => panel.id === activePanelId) ?? entries[0] ?? null;
}
