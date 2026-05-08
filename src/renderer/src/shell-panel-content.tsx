import type { WorkspaceId } from "../../shared/contracts";
import { keyboardWorkspaceOrder, topLevelJourneyWorkspace, workspaceOrder, type HostedAppId } from "./workspace-shell";
import { DetailRow } from "./journey-support";
import type { CommonLispSymbolHelp } from "./common-lisp-editor";

interface ShellNavigationSectionItem {
  id: string;
  label: string;
  summary: string;
}

interface ShellNavigationPanelProps {
  activeHostedApp: HostedAppId;
  activeWorkspace: WorkspaceId;
  browserDomains: ShellNavigationSectionItem[];
  conversationSections: ShellNavigationSectionItem[];
  evidenceSections: ShellNavigationSectionItem[];
  executionSections: ShellNavigationSectionItem[];
  expandedWorkspaceMenus: Record<string, boolean>;
  navigateToBrowserDomain: (domainId: string) => void;
  openCalculatorApplication: () => void;
  navigateToConfigurationSurface: () => void;
  navigateToConversationSection: (sectionId: string) => void;
  navigateToEditorSurface: () => void;
  navigateToEvidenceSection: (sectionId: string) => void;
  navigateToExecutionSection: (sectionId: string) => void;
  navigateToOperateSection: (sectionId: string) => void;
  navigateToProjectsSurface: () => void;
  navigateToRecoverySection: (sectionId: string) => void;
  navigateToTranscriptSurface: () => void;
  navigateToMemorySurface: () => void;
  navigateToWorkspace: (workspaceId: WorkspaceId) => void;
  navigateToWorkspaceSurface: () => void;
  operateSections: ShellNavigationSectionItem[];
  recoverySections: ShellNavigationSectionItem[];
  selectedBrowserDomain: string;
  selectedConversationSection: string;
  selectedEvidenceSection: string;
  selectedExecutionSection: string;
  selectedOperateSection: string;
  selectedRecoverySection: string;
  toggleWorkspaceMenu: (workspace: WorkspaceId) => void;
}

export function ShellNavigationPanel({
  activeHostedApp,
  activeWorkspace,
  browserDomains,
  conversationSections,
  evidenceSections,
  executionSections,
  expandedWorkspaceMenus,
  navigateToBrowserDomain,
  openCalculatorApplication,
  navigateToConfigurationSurface,
  navigateToConversationSection,
  navigateToEditorSurface,
  navigateToEvidenceSection,
  navigateToExecutionSection,
  navigateToOperateSection,
  navigateToProjectsSurface,
  navigateToRecoverySection,
  navigateToTranscriptSurface,
  navigateToMemorySurface,
  navigateToWorkspace,
  navigateToWorkspaceSurface,
  operateSections,
  recoverySections,
  selectedBrowserDomain,
  selectedConversationSection,
  selectedEvidenceSection,
  selectedExecutionSection,
  selectedOperateSection,
  selectedRecoverySection,
  toggleWorkspaceMenu
}: ShellNavigationPanelProps) {
  return (
    <div className="sidebar-body">
      <nav className="workspace-nav" aria-label="Control Panel workspace navigation">
        <section className="workspace-group">
          {workspaceOrder.filter((workspace) => workspace.primary).map((workspace) => (
            <div className="workspace-tree-node" key={workspace.id}>
              <div
                className={
                  activeHostedApp === "control-panel" && workspace.id === topLevelJourneyWorkspace(activeWorkspace)
                    ? "workspace-link active"
                    : "workspace-link"
                }
              >
                <button
                  className="workspace-link-main"
                  aria-keyshortcuts={workspace.primary ? String(keyboardWorkspaceOrder.indexOf(workspace.id) + 1) : undefined}
                  onClick={() => {
                    if (workspace.id === "environment") {
                      navigateToOperateSection(selectedOperateSection);
                      return;
                    }
                    if (workspace.id === "conversations") {
                      navigateToConversationSection(selectedConversationSection);
                      return;
                    }
                    if (workspace.id === "projects") {
                      navigateToProjectsSurface();
                      return;
                    }
                    if (workspace.id === "editor") {
                      navigateToEditorSurface();
                      return;
                    }
                    if (workspace.id === "workspace") {
                      navigateToWorkspaceSurface();
                      return;
                    }
                    if (workspace.id === "transcript") {
                      navigateToTranscriptSurface();
                      return;
                    }
                    if (workspace.id === "memory") {
                      navigateToMemorySurface();
                      return;
                    }
                    if (workspace.id === "runtime") {
                      navigateToExecutionSection(selectedExecutionSection);
                      return;
                    }
                    if (workspace.id === "incidents") {
                      navigateToRecoverySection(selectedRecoverySection);
                      return;
                    }
                    if (workspace.id === "artifacts") {
                      navigateToEvidenceSection(selectedEvidenceSection);
                      return;
                    }
                    if (workspace.id === "browser") {
                      navigateToBrowserDomain(selectedBrowserDomain);
                      return;
                    }
                    if (workspace.id === "configuration") {
                      navigateToConfigurationSurface();
                      return;
                    }
                    navigateToWorkspace(workspace.id);
                  }}
                  type="button"
                >
                  <span>{workspace.label}</span>
                </button>
                <div className="workspace-link-meta">
                  {workspace.id === "environment" ||
                  workspace.id === "conversations" ||
                  workspace.id === "browser" ? (
                    <button
                      aria-label={`${expandedWorkspaceMenus[workspace.id] ? "Collapse" : "Expand"} ${workspace.label}`}
                      className="workspace-disclosure"
                      onClick={() => toggleWorkspaceMenu(workspace.id)}
                      type="button"
                    >
                      {expandedWorkspaceMenus[workspace.id] ? "▾" : "▸"}
                    </button>
                  ) : null}
                </div>
              </div>
              {workspace.id === "environment" && expandedWorkspaceMenus.environment ? (
                <div className="workspace-child-list">
                  {operateSections.map((section) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "environment" &&
                        selectedOperateSection === section.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={section.id}
                      onClick={() => {
                        navigateToOperateSection(section.id);
                      }}
                      type="button"
                    >
                      <span title={section.summary}>{section.label}</span>
                    </button>
                  ))}
                  <div className="workspace-child-section-label">Execution</div>
                  {executionSections.map((section) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "runtime" &&
                        selectedExecutionSection === section.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={section.id}
                      onClick={() => {
                        navigateToExecutionSection(section.id);
                      }}
                      type="button"
                    >
                      <span title={section.summary}>{section.label}</span>
                    </button>
                  ))}
                  <div className="workspace-child-section-label">Recovery</div>
                  {recoverySections.map((section) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "incidents" &&
                        selectedRecoverySection === section.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={section.id}
                      onClick={() => {
                        navigateToRecoverySection(section.id);
                      }}
                      type="button"
                    >
                      <span title={section.summary}>{section.label}</span>
                    </button>
                  ))}
                  <div className="workspace-child-section-label">Evidence</div>
                  {evidenceSections.map((section) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "artifacts" &&
                        selectedEvidenceSection === section.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={section.id}
                      onClick={() => {
                        navigateToEvidenceSection(section.id);
                      }}
                      type="button"
                    >
                      <span title={section.summary}>{section.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {workspace.id === "conversations" && expandedWorkspaceMenus.conversations ? (
                <div className="workspace-child-list">
                  {conversationSections.map((section) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "conversations" &&
                        selectedConversationSection === section.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={section.id}
                      onClick={() => {
                        navigateToConversationSection(section.id);
                      }}
                      type="button"
                    >
                      <span title={section.summary}>{section.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {workspace.id === "browser" && expandedWorkspaceMenus.browser ? (
                <div className="workspace-child-list">
                  {browserDomains.map((domain) => (
                    <button
                      className={
                        activeHostedApp === "control-panel" &&
                        activeWorkspace === "browser" &&
                        selectedBrowserDomain === domain.id
                          ? "workspace-child-link active"
                          : "workspace-child-link"
                      }
                      key={domain.id}
                      onClick={() => {
                        navigateToBrowserDomain(domain.id);
                      }}
                      type="button"
                    >
                      <span title={domain.summary}>{domain.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
        <section className="workspace-group">
          <div className="workspace-child-section-label">Applications</div>
          <div className="workspace-child-list">
            <button className="workspace-child-link" onClick={openCalculatorApplication} type="button">
              <span title="Open the Lisp-backed calculator resident.">Calculator</span>
            </button>
          </div>
        </section>
      </nav>
    </div>
  );
}

interface ShellUtilitiesPanelProps {
  onExitIntentOsShell: () => void;
}

export function ShellUtilitiesPanel({ onExitIntentOsShell }: ShellUtilitiesPanelProps) {
  return (
    <div className="sidebar-body shell-rail-utility-panel">
      <div className="shell-sidebar-dock">
        <div className="desktop-window-dock-rail shell-sidebar-dock-rail" role="toolbar" aria-label="Shell actions">
          <button
            aria-label="Exit Surface"
            className="desktop-window-dock-item"
            data-tooltip="Exit Surface"
            onClick={onExitIntentOsShell}
            type="button"
          >
            <span className="desktop-window-dock-icon" aria-hidden="true">
              <span className="desktop-window-dock-glyph desktop-window-dock-glyph-exit" />
            </span>
            <span className="desktop-window-dock-indicator" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditorSymbolRailPanelProps {
  currentEditorCursorSymbol: string | null;
  currentEditorCursorSymbolHelp: CommonLispSymbolHelp | null;
  currentEditorCursorSymbolPackage: string | null;
  currentEditorPackage: string;
  runtimeCurrentPackage?: string | null;
}

export function EditorSymbolRailPanel({
  currentEditorCursorSymbol,
  currentEditorCursorSymbolHelp,
  currentEditorCursorSymbolPackage,
  currentEditorPackage,
  runtimeCurrentPackage
}: EditorSymbolRailPanelProps) {
  return (
    <div className="sidebar-body shell-rail-utility-panel">
      <div className="configuration-inspector-stack">
        <dl className="detail-list">
          <DetailRow label="Symbol" value={currentEditorCursorSymbol ?? "No editor symbol"} />
          <DetailRow
            label="Package"
            value={
              currentEditorCursorSymbolHelp?.packageName ??
              currentEditorCursorSymbolPackage ??
              currentEditorPackage ??
              runtimeCurrentPackage ??
              "cl-user"
            }
          />
          <DetailRow label="Kind" value={currentEditorCursorSymbolHelp?.type ?? "unknown"} />
          {currentEditorCursorSymbolHelp?.signature ? (
            <DetailRow label="Signature" value={currentEditorCursorSymbolHelp.signature} />
          ) : currentEditorCursorSymbolHelp?.detail ? (
            <DetailRow label="Detail" value={currentEditorCursorSymbolHelp.detail} />
          ) : null}
        </dl>
        <p className="inspector-copy">
          {currentEditorCursorSymbolHelp?.info ??
            "Runtime-backed symbol detail for the current editor focus appears here when available."}
        </p>
      </div>
    </div>
  );
}
