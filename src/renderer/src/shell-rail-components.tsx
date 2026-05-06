import type {
  DragEvent as ReactDragEvent,
  DragEventHandler,
  MouseEventHandler,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref
} from "react";

import type { ShellDockPanelDefinition, ShellDockPanelId } from "./shell-layout";

export interface ShellSplitterLayout {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ShellColumnSplitterProps {
  active: boolean;
  ariaLabel: string;
  layout: ShellSplitterLayout | null;
  onMouseDown: MouseEventHandler<HTMLButtonElement>;
  side: "left" | "right";
}

export function ShellColumnSplitter({
  active,
  ariaLabel,
  layout,
  onMouseDown,
  side
}: ShellColumnSplitterProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`shell-column-splitter${side === "left" ? " shell-column-splitter-left" : ""}${active ? " active" : ""}`}
      onMouseDown={onMouseDown}
      style={
        layout
          ? {
              top: `${layout.top}px`,
              bottom: `${layout.bottom}px`,
              [side]: `${layout[side]}px`
            }
          : undefined
      }
      type="button"
    />
  );
}

interface ShellRailHostProps {
  ariaLabel: string;
  children: ReactNode;
  dockPanels?: ShellDockPanelDefinition[];
  activePanelId?: ShellDockPanelId | null;
  dragTargetActive?: boolean;
  listRef?: Ref<HTMLDivElement>;
  panelRef?: Ref<HTMLElement>;
  title: string;
  toggleAriaLabel: string;
  toggleTitle: string;
  onToggle: () => void;
  onNativeDragStart?: (
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "left" | "right",
    event: ReactDragEvent<HTMLElement>
  ) => void;
  onNativeDragEnd?: () => void;
  onPanelPointerDown?: (
    panelId: ShellDockPanelId,
    panelLabel: string,
    event: ReactMouseEvent<HTMLElement>
  ) => void;
  onSelectPanel?: (panelId: ShellDockPanelId) => void;
  onUndockPanel?: (panelId: ShellDockPanelId) => void;
  onDropDockedPanel?: (panelId: ShellDockPanelId) => void;
  onMovePanel?: (panelId: ShellDockPanelId, direction: "backward" | "forward") => void;
}

const SHELL_PANEL_DRAG_MIME = "application/x-sbcl-agent-shell-panel-id";

function readDraggedPanelId(event: { dataTransfer: DataTransfer | null }): ShellDockPanelId | null {
  const panelId = event.dataTransfer?.getData(SHELL_PANEL_DRAG_MIME) ?? "";
  return panelId.length > 0 ? (panelId as ShellDockPanelId) : null;
}

export function ShellRailHost({
  ariaLabel,
  activePanelId,
  children,
  dockPanels = [],
  dragTargetActive = false,
  listRef,
  panelRef,
  title,
  toggleAriaLabel,
  toggleTitle,
  onToggle,
  onNativeDragStart,
  onNativeDragEnd,
  onPanelPointerDown,
  onSelectPanel,
  onUndockPanel,
  onDropDockedPanel,
  onMovePanel
}: ShellRailHostProps) {
  const handleListDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    if (!onDropDockedPanel || !readDraggedPanelId(event)) {
      return;
    }
    event.preventDefault();
  };

  const handleListDrop: DragEventHandler<HTMLDivElement> = (event) => {
    if (!onDropDockedPanel) {
      return;
    }
    const panelId = readDraggedPanelId(event);
    if (!panelId) {
      return;
    }
    event.preventDefault();
    onDropDockedPanel(panelId);
  };

  return (
    <aside aria-label={ariaLabel} className={title === "Inspector" ? "inspector" : "sidebar"} ref={panelRef}>
      <div className="panel-titlebar">
        <button
          aria-label={toggleAriaLabel}
          className="panel-titlebar-toggle"
          onClick={onToggle}
          title={toggleTitle}
          type="button"
        >
          <span aria-hidden="true">−</span>
        </button>
        <span className="panel-titlebar-label">{title}</span>
      </div>
      {dockPanels.length > 0 ? (
        <div
          aria-label={`${title} rail panels`}
          className={`shell-dock-list${dragTargetActive ? " shell-dock-list-drop-target" : ""}`}
          onDragOver={handleListDragOver}
          onDrop={handleListDrop}
          ref={listRef}
          role="listbox"
        >
          {dockPanels.map((panel, index) => (
            <div
              aria-selected={panel.id === activePanelId}
              className={panel.id === activePanelId ? "shell-dock-list-item active" : "shell-dock-list-item"}
              key={panel.id}
              onClick={() => onSelectPanel?.(panel.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectPanel?.(panel.id);
                }
              }}
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                const target = event.target as HTMLElement | null;
                if (target?.closest(".shell-dock-list-undock, .shell-dock-list-reorder")) {
                  return;
                }
                event.preventDefault();
                onPanelPointerDown?.(panel.id, panel.label, event);
              }}
              role="option"
              tabIndex={0}
            >
              {onMovePanel ? (
                <button
                  aria-label={`Move ${panel.label} earlier`}
                  className="shell-dock-list-reorder"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMovePanel(panel.id, "backward");
                  }}
                  title={`Move ${panel.label} earlier`}
                  type="button"
                >
                  ‹
                </button>
              ) : null}
              <button
                aria-label={`Drag ${panel.label}`}
                className="shell-dock-list-drag"
                draggable
                onDragEnd={() => onNativeDragEnd?.()}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(SHELL_PANEL_DRAG_MIME, panel.id);
                  onNativeDragStart?.(panel.id, panel.label, title === "Inspector" ? "right" : "left", event);
                }}
                type="button"
              >
                ⋮⋮
              </button>
              <button
                className="shell-dock-list-option"
                onMouseDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  onPanelPointerDown?.(panel.id, panel.label, event);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPanel?.(panel.id);
                }}
                type="button"
              >
                {panel.label}
              </button>
              {onUndockPanel ? (
                <button
                  aria-label={`Undock ${panel.label}`}
                  className="shell-dock-list-undock"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUndockPanel(panel.id);
                  }}
                  title={`Undock ${panel.label}`}
                  type="button"
                >
                  ↗
                </button>
              ) : null}
              {onMovePanel ? (
                <button
                  aria-label={`Move ${panel.label} later`}
                  className="shell-dock-list-reorder"
                  disabled={index === dockPanels.length - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMovePanel(panel.id, "forward");
                  }}
                  title={`Move ${panel.label} later`}
                  type="button"
                >
                  ›
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </aside>
  );
}

interface ShellUndockedPanelHostProps {
  panels: Array<{
    id: ShellDockPanelId;
    label: string;
    content: ReactNode;
  }>;
  dragTargetActive?: boolean;
  hostRef?: Ref<HTMLElement>;
  onDockPanel: (panelId: ShellDockPanelId) => void;
  onDropUndockedPanel?: (panelId: ShellDockPanelId) => void;
  onNativeDragStart?: (
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "undocked",
    event: ReactDragEvent<HTMLElement>
  ) => void;
  onNativeDragEnd?: () => void;
  onPanelPointerDown?: (
    panelId: ShellDockPanelId,
    panelLabel: string,
    event: ReactMouseEvent<HTMLElement>
  ) => void;
}

export function ShellUndockedPanelHost({
  panels,
  dragTargetActive = false,
  hostRef,
  onDockPanel,
  onDropUndockedPanel,
  onNativeDragStart,
  onNativeDragEnd,
  onPanelPointerDown
}: ShellUndockedPanelHostProps) {
  const handleHostDragOver: DragEventHandler<HTMLElement> = (event) => {
    if (!onDropUndockedPanel || !readDraggedPanelId(event)) {
      return;
    }
    event.preventDefault();
  };

  const handleHostDrop: DragEventHandler<HTMLElement> = (event) => {
    if (!onDropUndockedPanel) {
      return;
    }
    const panelId = readDraggedPanelId(event);
    if (!panelId) {
      return;
    }
    event.preventDefault();
    onDropUndockedPanel(panelId);
  };

  return (
    <section
      aria-label="Undocked shell panels"
      className={`shell-undocked-host${panels.length === 0 ? " shell-undocked-host-empty" : ""}${dragTargetActive ? " shell-undocked-host-drop-target" : ""}`}
      onDragOver={handleHostDragOver}
      onDrop={handleHostDrop}
      ref={hostRef}
    >
      <div className={`shell-undocked-drop-hint${panels.length > 0 ? " shell-undocked-drop-hint-populated" : ""}`}>
        Drag rail panels here to undock them.
      </div>
      {panels.map((panel) => (
        <article
          className="shell-undocked-panel"
          key={panel.id}
          onMouseDown={(event) => {
            if (event.button !== 0) {
              return;
            }
            const target = event.target as HTMLElement | null;
            if (target?.closest(".shell-undocked-panel-redock")) {
              return;
            }
            event.preventDefault();
            onPanelPointerDown?.(panel.id, panel.label, event);
          }}
        >
          <div className="shell-undocked-panel-titlebar">
            <span
              className="shell-undocked-panel-label"
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                onPanelPointerDown?.(panel.id, panel.label, event);
              }}
            >
              {panel.label}
            </span>
            <button
              aria-label={`Drag ${panel.label}`}
              className="shell-undocked-panel-drag"
              draggable
              onDragEnd={() => onNativeDragEnd?.()}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(SHELL_PANEL_DRAG_MIME, panel.id);
                onNativeDragStart?.(panel.id, panel.label, "undocked", event);
              }}
              type="button"
            >
              ⋮⋮
            </button>
            <button
              aria-label={`Redock ${panel.label}`}
              className="shell-undocked-panel-redock"
              onClick={() => onDockPanel(panel.id)}
              type="button"
            >
              Redock
            </button>
          </div>
          <div className="shell-undocked-panel-body">{panel.content}</div>
        </article>
      ))}
    </section>
  );
}

interface ShellCollapsedRailProps {
  ariaLabel: string;
  children?: ReactNode;
  className: string;
  title: string;
  toggleAriaLabel: string;
  toggleTitle: string;
  onToggle: () => void;
}

export function ShellCollapsedRail({
  ariaLabel,
  children,
  className,
  title,
  toggleAriaLabel,
  toggleTitle,
  onToggle
}: ShellCollapsedRailProps) {
  return (
    <aside aria-label={ariaLabel} className={className}>
      <div className="collapsed-panel-titlebar">
        <button
          aria-label={toggleAriaLabel}
          className="panel-titlebar-toggle collapsed-panel-toggle"
          onClick={onToggle}
          title={toggleTitle}
          type="button"
        >
          <span aria-hidden="true">+</span>
        </button>
        <span className="collapsed-panel-title">{title}</span>
      </div>
      {children}
    </aside>
  );
}
