import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type DragEvent as ReactDragEvent, type ReactNode, type Ref } from "react";
import type {
  ApprovalDecisionDto,
  ApprovalRequestDto,
  ApprovalRequestSummaryDto,
  ArtifactDetailDto,
  ArtifactSummaryDto,
  ApprovalDecisionInput,
  BindingDto,
  CommandResultDto,
  ConfigureProviderProfileInput,
  ConsoleLogEntryDto,
  ConversationAttachmentDto,
  ConsoleLogStreamDto,
  DesktopPreferencesDto,
  DesktopModelDto,
  DesktopPanelStateDto,
  DesktopPanelId,
  EnvironmentImageRegistryDto,
  DiagnosticReportDetailDto,
  DiagnosticReportSummaryDto,
  DocumentationPageDto,
  DocumentationPageSummaryDto,
  EditorBufferStateDto,
  EnvironmentEventDto,
  EventSubscriptionInput,
  FileSystemDirectoryListingDto,
  EnvironmentStatusDto,
  EnvironmentSummaryDto,
  WorkspaceSummaryDto,
  HostStatusDto,
  IncidentDetailDto,
  IncidentRemediationPlanDto,
  IncidentSummaryDto,
  LinkedEntityRefDto,
  MessageDto,
  PackageBrowserDto,
  PackageBrowserSymbolDto,
  PackageManagementCommandResultDto,
  PackageManagementSummaryDto,
  QueryResultDto,
  RuntimeEvalResultDto,
  RuntimeEntityDetailDto,
  RuntimeInspectionMode,
  RuntimeInspectionResultDto,
  RuntimeSummaryDto,
  RuntimeTelemetryProcessDto,
  RuntimeTelemetrySnapshotDto,
  ConversationStreamEventDto,
  ProjectProfileDto,
  ProjectListDto,
  ProjectDetailDto,
  ProjectReadinessObligationDto,
  ProjectReleaseReadinessDto,
  ProjectSummaryDto,
  ProjectTestingHarnessDto,
  ProjectTestingStrategyDto,
  ProviderProfileSummaryDto,
  ProviderRoutingMode,
  ReplSessionHistoryEntryDto,
  ReplSessionProfileDto,
  SourceMutationResultDto,
  SourceReloadResultDto,
  SourcePreviewDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  WorkflowRecordDto,
  WorkItemDetailDto,
  WorkItemPlanDto,
  WorkItemSummaryDto,
  WorkspaceId
} from "../../shared/contracts";
import {
  canonicalWorkspace,
  desktopPanelToWorkspaceId,
  hostedApps,
  keyboardWorkspaceOrder,
  labelForWorkspace,
  topLevelJourneyWorkspace,
  type HostedAppDescriptor,
  type HostedAppId,
  workspaceOrder,
  workspaceToDesktopPanelId
} from "./workspace-shell";
import {
  createDefaultShellLayoutState,
  deriveShellRenderLayout,
  SHELL_DOCK_PANEL_DEFINITIONS,
  SHELL_STACK_BREAKPOINT,
  shellRailPanelDefinitions,
  shellCanvasMinWidthForViewport,
  shellGapForViewport,
  shellHorizontalPaddingForViewport,
  shellInspectorDefaultWidthForViewport,
  shellInspectorMinWidthForViewport,
  shellLayoutReducer,
  shellLayoutToDesktopPreferencesPatch,
  shellSidebarDefaultWidthForViewport,
  shellSidebarMinWidthForViewport,
  shellSidebarRailWidthForViewport,
  type ShellDockPanelId,
  type ShellLayoutAction,
  type ShellLayoutState
} from "./shell-layout";
import { ShellCollapsedRail, ShellColumnSplitter, ShellRailHost } from "./shell-rail-components";
import {
  createShellRailPanelEntries,
  resolveActiveShellRailPanel
} from "./shell-panel-registry";
import { EditorSymbolRailPanel, ShellNavigationPanel, ShellUtilitiesPanel } from "./shell-panel-content";
import {
  createDefaultEnvironmentFocusState,
  createEnvironmentFocusFromBrowserContext,
  createEnvironmentFocusFromConversationContext,
  createEnvironmentFocusFromEvidenceContext,
  createEnvironmentFocusFromGovernanceContext,
  formatEnvironmentFocusLabel,
  mergeEnvironmentFocus,
  type EnvironmentFocusState
} from "./environment-focus";
import {
  bringWindowToFront,
  cascadeDesktopWindows,
  DEFAULT_DESKTOP_WINDOW_FRAMES,
  initialDesktopWindows,
  moveDesktopWindow,
  positionDesktopWindow,
  resetDesktopWindowLayout,
  resizeDesktopWindow,
  resizeDesktopWindowToDimensions,
  setDesktopWindowFrame,
  tileDesktopWindows,
  type DesktopWindowMoveDirection,
  type DesktopWindowResizeEdge,
  updateWindowState,
  upsertDesktopWindow,
  type DesktopWindowSizePreset,
  type DesktopWindowRecord
} from "./desktop-windowing";
import { BrowserDataTable, type BrowserTableFilterOption } from "./browser-data-table";
import { Badge, PanelHeader, toneForCommandStatus, transcriptRecencyLabel } from "./surface-support";
import {
  LinkedEntityList,
  MessageBubble,
  PrioritySignalCluster,
  PriorityStateChip,
  RefBlock,
  type SignalCounts,
  type SignalPriority
} from "./interaction-support";
import { TranscriptSurface, type TranscriptSurfaceEntry } from "./transcript-surface";
import { WorkspaceSurface } from "./workspace-surface";
import { EditorSurface } from "./editor-surface";
import { ConfigurationWorkspace } from "./configuration-workspace";
import { ConversationsWorkspace } from "./conversations-workspace";
import { ProjectsWorkspace } from "./projects-workspace";
import { RuntimeWorkspace } from "./runtime-workspace";
import { ListenerWorkbenchApp } from "./listener-workbench-app";
import { ContextBlock, DetailRow, JourneyStageStrip, type JourneyStep } from "./journey-support";
import { EvidenceWorkspace } from "./evidence-workspace";
import { ExecutionWorkspace } from "./execution-workspace";
import { ApprovalsWorkspace, IncidentsWorkspace, WorkWorkspace } from "./journey-workspaces";
import { OperateWorkspace } from "./operate-workspace";
import {
  ConversationSessionCreateDialog,
  ConversationThreadRenameDialog,
  EditorSourceFileLoadDialog,
  EditorSourceFileSaveDialog,
  EnvironmentExitDialog,
  EnvironmentImageChooserDialog,
  ProjectConstitutionEditDialog,
  ProjectArchitectureDecisionCreateDialog,
  ProjectCreateDialog,
  ProjectFeatureSpecificationCreateDialog,
  ProjectOpenDialog,
  ProjectQualityGateCreateDialog,
  ProjectReadinessObligationsEditDialog,
  ProjectReleaseReadinessEditDialog,
  ProjectRecordEditDialog,
  ProjectRequirementCreateDialog,
  ProjectTestingStrategyEditDialog,
  ProjectSourceRootCreateDialog,
  ProjectTestingHarnessBindDialog,
  ProjectUserJourneyCreateDialog,
  IncidentRemediationPlanDialog,
  WorkItemQuarantineDialog,
  WorkItemResumeDialog,
  WorkItemRollbackDialog,
  WorkItemSteerDialog,
  WorkItemValidationDialog
} from "./shell-dialogs";
import { LispCodeBlock, renderDocumentationMarkdown } from "./rendering-support";
import {
  BrowserModePicker,
  DocumentationWorkspace,
  FilterSelect,
  MetricTile,
  PlannedWorkspace,
  SupervisionBoard
} from "./workspace-support-components";

interface GlobalAttentionItem {
  id: string;
  label: string;
  summary: string;
  value: number;
  workspace: WorkspaceId;
  tone: "active" | "warning" | "danger" | "steady";
}

interface ProjectTestingStrategySuiteExpectationDraft {
  harnessId: string;
  purpose: string;
  evidenceKindsDraft: string;
}

function blankProjectTestingStrategySuiteExpectationDraft(): ProjectTestingStrategySuiteExpectationDraft {
  return {
    harnessId: "",
    purpose: "",
    evidenceKindsDraft: ""
  };
}

interface ProjectReadinessObligationDraft {
  obligationId: string;
  title: string;
  summary: string;
  status: string;
  owner: string;
  dueWindow: string;
  blocking: boolean;
  evidenceKindsDraft: string;
}

function blankProjectReadinessObligationDraft(): ProjectReadinessObligationDraft {
  return {
    obligationId: "",
    title: "",
    summary: "",
    status: "blocked",
    owner: "",
    dueWindow: "",
    blocking: true,
    evidenceKindsDraft: ""
  };
}

function draftLines(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

interface ActionQueueItem {
  key: string;
  objectType: "Thread" | "Approval" | "Work" | "Recovery" | "Artifact" | "Runtime";
  objectId: string;
  title: string;
  stateLabel: string;
  whyNow: string;
  effectSummary: string;
  references: string[];
  tone: "active" | "warning" | "danger" | "steady";
  score: number;
  priorityLabel: "High" | "Medium" | "Low";
  destinationWorkspace: WorkspaceId;
  destinationLabel: string;
  actionLabel: string;
  rankReason: string;
}

interface WorkspaceAttentionDigestItem {
  key: string;
  kind: string;
  title: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

interface WorkspaceDescriptor {
  eyebrow: string;
  title: string;
  summary: string;
}

interface WorkspaceResolutionState {
  label: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

interface DockJumpTarget {
  id: string;
  label: string;
  title: string;
  stateLabel: string;
  shortcutKey: string;
  recommendationReason: string;
  score: number;
  recommended?: boolean;
  tone: "active" | "warning" | "danger" | "steady";
  onJump: () => void;
}

interface BrowserSurfaceEntry {
  key: string;
  title: string;
  detail: string;
  meta: string;
}

interface DesktopAttentionSignal {
  id: string;
  label: string;
  tooltip: string;
  glyphClassName: string;
  priority: "red" | "yellow" | "green";
  onOpen: () => void;
}

type ThemePreference = "system" | "light" | "dark";

type ResolvedTheme = "light" | "dark";

const DEFAULT_LISP_PAREN_COLORS = ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"];
const DEFAULT_EDITOR_BUFFER_TITLE = "Main";
const DEFAULT_EDITOR_BOUND_DRAFT = `;; Editor
;; Sustain source and form editing here without collapsing into scratch workspace posture.

(in-package :cl-user)

`;
const DEFAULT_EDITOR_UNBOUND_DRAFT = `;; Editor
;; Bind a project and environment to retain editor buffers.
`;

const LISP_CONFIGURATION_SAMPLE = `(defun reconcile-runtime-state (work-item env)
  (let ((result (evaluate-in-context env '(describe work-item))))
    (when (awaiting-approval-p result)
      (queue-approval work-item :policy :runtime-change))
    result))`;

const PUBLISHED_DOCUMENTATION_URL = "https://pauljbernard.github.io/sbcl-agent/";
const UNDOCKED_SHELL_WINDOW_PREFIX = "window:undocked:";
const SHELL_PANEL_DRAG_MIME = "application/x-sbcl-agent-shell-panel-id";

function undockedShellWindowId(panelId: ShellDockPanelId): string {
  return `${UNDOCKED_SHELL_WINDOW_PREFIX}${panelId}`;
}

function shellDockPanelIdFromUndockedWindowId(windowId: string): ShellDockPanelId | null {
  if (!windowId.startsWith(UNDOCKED_SHELL_WINDOW_PREFIX)) {
    return null;
  }
  const panelId = windowId.slice(UNDOCKED_SHELL_WINDOW_PREFIX.length);
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

function readDraggedShellPanelId(dataTransfer: DataTransfer | null): ShellDockPanelId | null {
  const panelId = dataTransfer?.getData(SHELL_PANEL_DRAG_MIME) ?? "";
  return panelId in SHELL_DOCK_PANEL_DEFINITIONS ? (panelId as ShellDockPanelId) : null;
}

function createEditorBufferState({
  bufferId,
  title,
  draft,
  baselineDraft,
  packageName,
  dirty = false,
  result = null
  ,
  sourceFilePath = null
}: {
  bufferId?: string;
  title: string;
  draft: string;
  baselineDraft?: string;
  packageName: string;
  dirty?: boolean;
  result?: CommandResultDto<RuntimeEvalResultDto> | null;
  sourceFilePath?: string | null;
}): EditorBufferStateDto {
  return {
    bufferId: bufferId ?? `editor-buffer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    draft,
    baselineDraft: baselineDraft ?? draft,
    packageName,
    dirty,
    result,
    sourceFilePath
  };
}

function normalizeEditorBufferFormText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function basenameForPath(path: string): string {
  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? path;
}

function parentDirectoryForPath(path: string): string {
  const normalized = path.trim();
  if (normalized.length === 0) {
    return normalized;
  }
  const separatorIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  if (separatorIndex <= 0) {
    return normalized;
  }
  return normalized.slice(0, separatorIndex);
}

function joinDirectoryAndFileName(directoryPath: string, fileName: string): string {
  const normalizedDirectory = directoryPath.trim();
  const normalizedFileName = fileName.trim();
  if (normalizedDirectory.length === 0) {
    return normalizedFileName;
  }
  if (normalizedFileName.length === 0) {
    return normalizedDirectory;
  }
  const separator = normalizedDirectory.includes("\\") && !normalizedDirectory.includes("/") ? "\\" : "/";
  const trimmedDirectory = normalizedDirectory.replace(/[\\/]+$/, "");
  return `${trimmedDirectory}${separator}${normalizedFileName}`;
}

const CONVERSATION_ATTACHMENT_TEXT_LIMIT = 240_000;
const CONVERSATION_ATTACHMENT_IMAGE_LIMIT = 6 * 1024 * 1024;
const CONVERSATION_ATTACHMENT_DOCUMENT_LIMIT = 12 * 1024 * 1024;

function fileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  return dotIndex >= 0 ? trimmed.slice(dotIndex + 1).toLowerCase() : "";
}

function isTextLikeAttachment(mediaType: string, fileName: string): boolean {
  const normalizedMediaType = mediaType.toLowerCase();
  if (normalizedMediaType.startsWith("text/")) {
    return true;
  }
  return [
    "json",
    "md",
    "markdown",
    "lisp",
    "cl",
    "ts",
    "tsx",
    "js",
    "jsx",
    "css",
    "html",
    "xml",
    "yaml",
    "yml",
    "txt",
    "svg"
  ].includes(fileExtension(fileName));
}

function isDocumentLikeAttachment(mediaType: string, fileName: string): boolean {
  const normalizedMediaType = mediaType.toLowerCase();
  const extension = fileExtension(fileName);
  return (
    normalizedMediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMediaType === "application/msword" ||
    normalizedMediaType === "application/rtf" ||
    normalizedMediaType === "text/rtf" ||
    extension === "docx" ||
    extension === "doc" ||
    extension === "rtf"
  );
}

function readBrowserFileAsText(file: File): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const reader = new FileReader();
    reader.onerror = () => rejectPromise(reader.error ?? new Error(`Failed to read ${file.name} as text.`));
    reader.onload = () => resolvePromise(String(reader.result ?? ""));
    reader.readAsText(file);
  });
}

function readBrowserFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const reader = new FileReader();
    reader.onerror = () => rejectPromise(reader.error ?? new Error(`Failed to read ${file.name} as data URL.`));
    reader.onload = () => resolvePromise(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

async function conversationAttachmentFromFile(
  file: File,
  index: number
): Promise<ConversationAttachmentDto> {
  const mediaType = file.type || "application/octet-stream";
  const imageAttachment = mediaType.startsWith("image/");
  const textAttachment = isTextLikeAttachment(mediaType, file.name);
  const documentAttachment = isDocumentLikeAttachment(mediaType, file.name);
  const attachmentId = `attachment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

  if (imageAttachment && file.size <= CONVERSATION_ATTACHMENT_IMAGE_LIMIT) {
    return {
      attachmentId,
      name: file.name,
      mediaType,
      kind: "image",
      source: "input",
      summary: `${file.name} (${mediaType}, ${file.size} bytes)`,
      sizeBytes: file.size,
      dataUrl: await readBrowserFileAsDataUrl(file),
      textContent: null
    };
  }

  if (textAttachment && file.size <= CONVERSATION_ATTACHMENT_TEXT_LIMIT) {
    return {
      attachmentId,
      name: file.name,
      mediaType,
      kind: "text",
      source: "input",
      summary: `${file.name} (${mediaType}, ${file.size} bytes)`,
      sizeBytes: file.size,
      textContent: await readBrowserFileAsText(file),
      dataUrl: null
    };
  }

  if (documentAttachment && file.size <= CONVERSATION_ATTACHMENT_DOCUMENT_LIMIT) {
    try {
      const extractConversationAttachmentText =
        window.sbclAgentDesktop.command.extractConversationAttachmentText;
      if (typeof extractConversationAttachmentText === "function") {
        const dataUrl = await readBrowserFileAsDataUrl(file);
        const extractedText = await extractConversationAttachmentText({
          name: file.name,
          mediaType,
          dataUrl
        });
        if (extractedText && extractedText.trim().length > 0) {
          return {
            attachmentId,
            name: file.name,
            mediaType,
            kind: "text",
            source: "input",
            summary: `${file.name} (${mediaType}, ${file.size} bytes, extracted text)`,
            sizeBytes: file.size,
            textContent: extractedText,
            dataUrl: null
          };
        }
      }
    } catch {
      // Fall back to opaque binary attachment if host-side extraction fails.
    }
  }

  return {
    attachmentId,
    name: file.name,
    mediaType,
    kind: imageAttachment ? "image" : "binary",
    source: "input",
    summary: `${file.name} (${mediaType}, ${file.size} bytes)`,
    sizeBytes: file.size,
    textContent: null,
    dataUrl: null
  };
}

function extractTopLevelEditorBufferForms(source: string): string[] {
  const forms: string[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === ";") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (char !== "(") {
      const startIndex = index;
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      const text = source.slice(startIndex, index).trim();
      if (text.length > 0) {
        forms.push(text);
      }
      continue;
    }

    const startIndex = index;
    let depth = 0;
    let inString = false;
    let escaping = false;
    while (index < source.length) {
      const current = source[index];
      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (current === "\\") {
          escaping = true;
        } else if (current === "\"") {
          inString = false;
        }
        index += 1;
        continue;
      }
      if (current === "\"") {
        inString = true;
        index += 1;
        continue;
      }
      if (current === ";") {
        while (index < source.length && source[index] !== "\n") {
          index += 1;
        }
        continue;
      }
      if (current === "(") {
        depth += 1;
      } else if (current === ")") {
        depth -= 1;
      }
      index += 1;
      if (depth === 0) {
        break;
      }
    }
    const text = source.slice(startIndex, index).trim();
    if (text.length > 0) {
      forms.push(text);
    }
  }

  return forms;
}

function countChangedEditorBufferForms(baselineDraft: string, draft: string): number {
  const baselineForms = extractTopLevelEditorBufferForms(baselineDraft);
  const currentForms = extractTopLevelEditorBufferForms(draft);
  const maxLength = Math.max(baselineForms.length, currentForms.length);
  let count = 0;
  for (let index = 0; index < maxLength; index += 1) {
    const baseline = baselineForms[index] ?? null;
    const current = currentForms[index] ?? null;
    if (!baseline || !current) {
      count += 1;
      continue;
    }
    if (normalizeEditorBufferFormText(baseline) !== normalizeEditorBufferFormText(current)) {
      count += 1;
    }
  }
  return count;
}

type OperateSection = "orientation" | "journeys" | "evidence";
type ConversationSection = "threads" | "turns" | "draft" | "repl";
type ConfigurationSection = "theme" | "lisp-code-view" | "desktop-surface" | "llm" | "package-management";
type ExecutionSection = "listener" | "approvals" | "work";
type RecoverySection = "incidents";
type EvidenceSection = "artifacts" | "observation";

type BrowserDomain =
  | "systems"
  | "packages"
  | "symbols"
  | "classes-methods"
  | "runtime-objects"
  | "console"
  | "diagnostics"
  | "processes"
  | "performance"
  | "host-io"
  | "source"
  | "xref"
  | "documentation"
  | "governance"
  | "linked-conversations";

interface BrowserDomainDescriptor {
  id: BrowserDomain;
  label: string;
  summary: string;
}

const browserDomains: BrowserDomainDescriptor[] = [
  { id: "systems", label: "Systems", summary: "Loaded systems and their attached packages." },
  { id: "packages", label: "Packages", summary: "Namespaces, exports, internals, and use-lists." },
  { id: "symbols", label: "Symbols", summary: "Functions, variables, macros, classes, and generic functions." },
  { id: "classes-methods", label: "Classes & Methods", summary: "CLOS classes, slots, and dispatch surfaces." },
  { id: "runtime-objects", label: "Runtime Objects", summary: "Active scopes and inspectable live runtime objects." },
  { id: "console", label: "Console", summary: "Governed environment logs with source, severity, and operational correlation." },
  { id: "diagnostics", label: "Diagnostics", summary: "Crash, spin, analytics, and retained host diagnostic reports." },
  { id: "processes", label: "Processes", summary: "Runtime-linked processes, workers, tasks, and governed execution state." },
  { id: "performance", label: "Performance", summary: "CPU and memory posture for the live runtime and its host." },
  { id: "host-io", label: "Host I/O", summary: "Network and disk activity attached to the running environment." },
  { id: "source", label: "Source", summary: "Source-backed definitions, edits, staging, and reload." },
  { id: "xref", label: "XREF", summary: "Incoming and outgoing semantic references." },
  { id: "documentation", label: "Documentation", summary: "Docstrings and environment-linked reference material." },
  { id: "governance", label: "Governance", summary: "Approvals, incidents, work items, and closure state." },
  { id: "linked-conversations", label: "Linked Conversations", summary: "Threads and turns attached to the current entity." }
];

const configurationSections: Array<{
  id: ConfigurationSection;
  label: string;
  summary: string;
  family: string;
}> = [
  {
    id: "theme",
    label: "Theme",
    summary: "Desktop appearance preference and resolved operating-system behavior.",
    family: "appearance"
  },
  {
    id: "lisp-code-view",
    label: "Lisp Code View",
    summary: "Structured Lisp rendering, delimiter depth colors, and code-surface presentation.",
    family: "editor"
  },
  {
    id: "desktop-surface",
    label: "Desktop Surface",
    summary: "Tooltip text, control iconography, conversation text, and iconified application bar scale across the shell desktop.",
    family: "surface"
  },
  {
    id: "llm",
    label: "LLM",
    summary: "Provider profiles, endpoint routing, secure tokens, and model selection for the integrated language-model runtime.",
    family: "integration"
  },
  {
    id: "package-management",
    label: "Package Management",
    summary: "Quicklisp installs, Qlot command execution, managed source-registry entries, and graphical local-project links.",
    family: "runtime"
  }
];

type LlmProviderPresetId =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "microsoft"
  | "amazon"
  | "meta"
  | "lm-studio"
  | "custom-openai-compatible";

interface LlmProviderPreset {
  id: LlmProviderPresetId;
  label: string;
  provider: string;
  defaultModel: string;
  defaultFastModel: string;
  defaultApiBase?: string | null;
  summary: string;
}

const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    provider: "openai-compatible",
    defaultModel: "gpt-5",
    defaultFastModel: "gpt-4.1-mini",
    defaultApiBase: "https://api.openai.com/v1",
    summary: "Direct OpenAI-compatible routing."
  },
  {
    id: "anthropic",
    label: "Anthropic",
    provider: "anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    defaultFastModel: "claude-3-5-haiku",
    defaultApiBase: "https://api.anthropic.com",
    summary: "Native Anthropic messages API routing."
  },
  {
    id: "google",
    label: "Google Gemini",
    provider: "gemini",
    defaultModel: "gemini-2.5-pro",
    defaultFastModel: "gemini-2.5-flash",
    defaultApiBase: "https://generativelanguage.googleapis.com/v1beta/openai",
    summary: "Gemini through the OpenAI-compatible endpoint."
  },
  {
    id: "xai",
    label: "xAI",
    provider: "openai-compatible",
    defaultModel: "grok-3",
    defaultFastModel: "grok-3-mini",
    defaultApiBase: "https://api.x.ai/v1",
    summary: "OpenAI-compatible xAI endpoint."
  },
  {
    id: "microsoft",
    label: "Microsoft Azure OpenAI",
    provider: "openai-compatible",
    defaultModel: "gpt-4.1",
    defaultFastModel: "gpt-4.1-mini",
    defaultApiBase: "",
    summary: "Requires your Azure resource-specific endpoint."
  },
  {
    id: "amazon",
    label: "Amazon-compatible gateway",
    provider: "openai-compatible",
    defaultModel: "claude-sonnet",
    defaultFastModel: "claude-haiku",
    defaultApiBase: "",
    summary: "Requires a compatible endpoint or gateway in front of the target model."
  },
  {
    id: "meta",
    label: "Meta-compatible",
    provider: "meta-compatible",
    defaultModel: "llama-3.1-70b-instruct",
    defaultFastModel: "llama-3.1-8b-instruct",
    defaultApiBase: "",
    summary: "Meta-compatible endpoint with an explicit base URL."
  },
  {
    id: "lm-studio",
    label: "Local LM Studio",
    provider: "lm-studio",
    defaultModel: "local-model",
    defaultFastModel: "local-model",
    defaultApiBase: "http://localhost:1234/v1",
    summary: "Local OpenAI-compatible model serving through LM Studio."
  },
  {
    id: "custom-openai-compatible",
    label: "Custom OpenAI-compatible",
    provider: "openai-compatible",
    defaultModel: "gpt-5",
    defaultFastModel: "gpt-4.1-mini",
    defaultApiBase: "",
    summary: "Bring your own OpenAI-compatible endpoint and model family."
  }
];

const DEFAULT_DESKTOP_TOOLTIP_SCALE_PERCENT = 100;
const DEFAULT_DESKTOP_CONTROL_ICON_SCALE_PERCENT = 100;
const DEFAULT_DESKTOP_DOCK_ICON_SCALE_PERCENT = 100;
const DEFAULT_DESKTOP_CONVERSATION_TEXT_SCALE_PERCENT = 100;
const DEFAULT_DESKTOP_SOURCE_CODE_TEXT_SCALE_PERCENT = 100;

function normalizeDesktopSurfaceScalePercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(160, Math.max(70, Math.round(value)));
}

function llmProviderPresetForProfile(profile: {
  provider?: string | null;
  apiBase?: string | null;
} | null | undefined): LlmProviderPreset {
  const fallbackPreset = LLM_PROVIDER_PRESETS[0]!;
  const provider = profile?.provider?.toLowerCase() ?? "openai-compatible";
  const apiBase = profile?.apiBase?.toLowerCase() ?? "";

  if (provider === "anthropic") {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "anthropic") ?? fallbackPreset;
  }
  if (provider === "gemini" || provider === "google") {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "google") ?? fallbackPreset;
  }
  if (provider === "lm-studio" || provider === "lmstudio" || provider === "local-openai-compatible") {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "lm-studio") ?? fallbackPreset;
  }
  if (provider === "meta-compatible" || provider === "meta-openai-compatible") {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "meta") ?? fallbackPreset;
  }
  if (apiBase.includes("api.x.ai")) {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "xai") ?? fallbackPreset;
  }
  if (apiBase.includes("generativelanguage.googleapis.com")) {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "google") ?? fallbackPreset;
  }
  if (apiBase.includes("openai.azure.com")) {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "microsoft") ?? fallbackPreset;
  }
  if (apiBase.includes("localhost:1234")) {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "lm-studio") ?? fallbackPreset;
  }
  if (provider === "openai-compatible" && apiBase.length > 0 && !apiBase.includes("api.openai.com")) {
    return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "custom-openai-compatible") ?? fallbackPreset;
  }
  return LLM_PROVIDER_PRESETS.find((preset) => preset.id === "openai") ?? fallbackPreset;
}

function buildProviderProfileDraft(
  profile?: Partial<ConfigureProviderProfileInput> | null
): ConfigureProviderProfileInput {
  const preset = llmProviderPresetForProfile(profile);
  return {
    profileName: profile?.profileName ?? "default",
    provider: profile?.provider ?? preset.provider,
    model: profile?.model ?? preset.defaultModel,
    fastModel: profile?.fastModel ?? preset.defaultFastModel,
    apiBase: profile?.apiBase ?? preset.defaultApiBase ?? "",
    apiKey: profile?.apiKey ?? "",
    clearApiKey: false,
    intents: profile?.intents ?? [],
    latencyTier: profile?.latencyTier ?? "balanced",
    reviewBias: profile?.reviewBias ?? "neutral",
    executionBias: profile?.executionBias ?? "balanced",
    locality: profile?.locality ?? (preset.id === "lm-studio" ? "local" : "network"),
    activate: false
  };
}

const operateSections: Array<{
  id: OperateSection;
  label: string;
  summary: string;
}> = [
  {
    id: "orientation",
    label: "Orientation",
    summary: "Environment posture, current continuation, and active truth surfaces."
  },
  {
    id: "journeys",
    label: "Journeys",
    summary: "Choose the dominant path from current pressure and governed context."
  },
  {
    id: "evidence",
    label: "Evidence",
    summary: "Recent proof, artifacts, and compressed signal before entering a narrower journey."
  }
];

const conversationSections: Array<{
  id: ConversationSection;
  label: string;
  summary: string;
}> = [
  {
    id: "threads",
    label: "Threads",
    summary: "Supervise multiple structured conversations as durable work."
  },
  {
    id: "turns",
    label: "Turns",
    summary: "Inspect turn lifecycle, governed references, and selected turn state."
  },
  {
    id: "draft",
    label: "Draft",
    summary: "Compose the next supervised continuation without dropping linked context."
  },
  {
    id: "repl",
    label: "REPL",
    summary: "Use direct evaluation against the live image when agentic orchestration is not required."
  }
];

const executionSections: Array<{
  id: ExecutionSection;
  label: string;
  summary: string;
}> = [
  {
    id: "listener",
    label: "Listener",
    summary: "Runtime control surface, direct evaluation, and execution posture."
  },
  {
    id: "approvals",
    label: "Approvals",
    summary: "Governed execution decisions with explicit consequence and linked context."
  },
  {
    id: "work",
    label: "Work",
    summary: "Reconciliation, workflow closure, and execution obligations."
  }
];

const recoverySections: Array<{
  id: RecoverySection;
  label: string;
  summary: string;
}> = [
  {
    id: "incidents",
    label: "Incidents",
    summary: "Durable failure, restoration, and recovery context."
  }
];

const evidenceSections: Array<{
  id: EvidenceSection;
  label: string;
  summary: string;
}> = [
  {
    id: "artifacts",
    label: "Artifacts",
    summary: "Durable outputs, provenance, and linked producing context."
  },
  {
    id: "observation",
    label: "Observation",
    summary: "Replayable event flow and operational evidence."
  }
];

function buildListenerForm(input: {
  symbol?: string | null;
  packageName?: string | null;
  mode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  line?: number | null;
}): string {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();
  const sourcePath = input.sourcePath?.trim();
  const qualifiedReference = symbol ? (packageName ? `${packageName}::${symbol}` : symbol) : null;

  if (sourcePath) {
    const lineComment = input.line ? ` ;; line ${input.line}` : "";
    return `(progn
  ;; Review source-backed artifact${lineComment}
  (format t "Source: ~A~%" "${sourcePath}")
  ${qualifiedReference ? `(describe '${qualifiedReference})` : ":no-symbol-focus"}
  (values :source-review "${sourcePath}" ${qualifiedReference ? `'${qualifiedReference}` : "nil"}))`;
  }

  if (!symbol) {
    return '(describe "sbcl-agent")';
  }

  switch (input.mode) {
    case "methods":
      return `(progn
  (describe (fdefinition '${qualifiedReference}))
  '${qualifiedReference})`;
    case "callers":
      return `(progn
  ;; Inspect caller relationships for ${qualifiedReference}
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "definitions":
      return `(progn
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "divergence":
      return `(progn
  ;; Review runtime/source drift for ${qualifiedReference}
  (describe '${qualifiedReference})
  '${qualifiedReference})`;
    case "describe":
    default:
      return `(describe '${qualifiedReference})`;
  }
}

function buildConversationPrompt(input: {
  focusKind?: EnvironmentFocusState["kind"];
  symbol?: string | null;
  packageName?: string | null;
  mode?: RuntimeInspectionMode | null;
  sourcePath?: string | null;
  line?: number | null;
  threadTitle?: string | null;
  threadState?: string | null;
  latestTurnState?: string | null;
  approvalId?: string | null;
  workItemId?: string | null;
  incidentId?: string | null;
  artifactId?: string | null;
  eventCursor?: number | null;
}): string {
  const focusLabel = input.symbol?.trim()
    ? `${input.packageName?.trim() ? `${input.packageName?.trim()}::` : ""}${input.symbol.trim()}`
    : input.sourcePath?.trim() ?? "current environment focus";

  const modeLabel = input.mode ?? "describe";
  const sourceLine = input.line ? ` at line ${input.line}` : "";
  const threadStateLabel =
    input.threadState || input.latestTurnState
      ? ` It is currently ${[input.threadState, input.latestTurnState].filter(Boolean).join(" / ")}.`
      : "";
  const threadContext = input.threadTitle?.trim()
    ? `Continue the linked thread "${input.threadTitle?.trim()}" while keeping the current environment focus explicit.${threadStateLabel}`
    : "Start a new conversation continuation anchored in the current environment focus.";

  switch (input.focusKind) {
    case "governance-approval":
      return [
        threadContext,
        `Review approval ${input.approvalId ?? "current approval"} as the active governed focus.`,
        "Explain the requested action, policy basis, linked work, likely consequence of approval or denial, and the best next governed step."
      ].join("\n");
    case "governance-work-item":
      return [
        threadContext,
        `Review work item ${input.workItemId ?? "current work item"} as the active governed focus.`,
        "Summarize current state, blockers, validation and reconciliation posture, linked evidence, and the next closure action."
      ].join("\n");
    case "governance-incident":
      return [
        threadContext,
        `Review incident ${input.incidentId ?? "current incident"} as the active recovery focus.`,
        "Summarize failure posture, linked runtime and workflow context, visible evidence, and the safest next governed recovery step."
      ].join("\n");
    case "evidence-artifact":
      return [
        threadContext,
        `Inspect artifact ${input.artifactId ?? "current artifact"} as the active evidence focus.`,
        "Explain what this evidence proves, what it links to in runtime or workflow state, and what action it suggests next."
      ].join("\n");
    case "evidence-event":
      return [
        threadContext,
        `Inspect event ${input.eventCursor != null ? `#${input.eventCursor}` : "current event"} as the active evidence focus.`,
        "Reconstruct what changed, which governed objects it touches, what evidence or recovery it implies, and the next best inspection target."
      ].join("\n");
    default:
      break;
  }

  if (input.sourcePath?.trim()) {
    return [
      threadContext,
      `Review source artifact ${input.sourcePath.trim()}${sourceLine}.`,
      `Explain what changed or should change around ${focusLabel}.`,
      "Call out any runtime implications, required inspections, and next executable step."
    ].join("\n");
  }

  return [
    threadContext,
    `Inspect ${focusLabel} using the current browser mode "${modeLabel}".`,
    "Summarize what matters in the live environment, what source or runtime evidence is attached, and what to do next."
  ].join("\n");
}

function buildEnvironmentFocusPresentation(input: {
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

function buildEntityQuickForms(input: {
  symbol?: string | null;
  packageName?: string | null;
  entityKind?: RuntimeEntityDetailDto["entityKind"] | PackageBrowserSymbolDto["kind"] | "package" | null;
}): Array<{ id: string; label: string; form: string }> {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();

  if (!symbol && packageName) {
    return [
      {
        id: "package-symbols",
        label: "List Package Symbols",
        form: `(let ((package (find-package '${packageName})))
  (list :package package :symbols (loop for symbol being the external-symbols of package collect (symbol-name symbol))))`
      },
      {
        id: "package-uses",
        label: "Inspect Package Uses",
        form: `(let ((package (find-package '${packageName})))
  (package-use-list package))`
      }
    ];
  }

  if (!symbol) {
    return [];
  }

  const qualifiedReference = packageName ? `${packageName}::${symbol}` : symbol;

  switch (input.entityKind) {
    case "class":
      return [
        {
          id: "class-slots",
          label: "Inspect Class Slots",
          form: `(describe (find-class '${qualifiedReference}))`
        },
        {
          id: "class-precedence",
          label: "Inspect Class Precedence",
          form: `(class-precedence-list (find-class '${qualifiedReference}))`
        }
      ];
    case "generic-function":
      return [
        {
          id: "generic-methods",
          label: "Inspect Methods",
          form: `(describe (fdefinition '${qualifiedReference}))`
        },
        {
          id: "generic-dispatch",
          label: "Inspect Dispatch",
          form: `(type-of (fdefinition '${qualifiedReference}))`
        }
      ];
    case "macro":
      return [
        {
          id: "macro-function",
          label: "Inspect Macro Function",
          form: `(macro-function '${qualifiedReference})`
        },
        {
          id: "macro-describe",
          label: "Describe Macro Symbol",
          form: `(describe '${qualifiedReference})`
        }
      ];
    default:
      return [
        {
          id: "describe-symbol",
          label: "Describe Symbol",
          form: `(describe '${qualifiedReference})`
        },
        {
          id: "inspect-function",
          label: "Inspect Function Binding",
          form: `(when (fboundp '${qualifiedReference}) (describe (fdefinition '${qualifiedReference})))`
        }
      ];
  }
}

function buildSourceOperationForms(input: {
  symbol?: string | null;
  packageName?: string | null;
  path?: string | null;
  line?: number | null;
}): {
  inspect: string;
  reload: string;
  evaluate: string;
} {
  const symbol = input.symbol?.trim();
  const packageName = input.packageName?.trim();
  const path = input.path?.trim() ?? "";
  const lineComment = input.line ? ` ;; line ${input.line}` : "";
  const qualifiedReference = symbol ? (packageName ? `${packageName}::${symbol}` : symbol) : null;

  return {
    inspect: `(progn
  ;; Inspect source context${lineComment}
  (format t "Source: ~A~%" "${path}")
  ${qualifiedReference ? `(describe '${qualifiedReference})` : ":no-symbol-focus"})`,
    reload: `(progn
  ;; Reload source-backed artifact${lineComment}
  (format t "Reload request for ~A~%" "${path}")
  :reload-source)`,
    evaluate: `(progn
  ;; Evaluate near source focus${lineComment}
  (format t "Evaluate around ~A~%" "${path}")
  ${qualifiedReference ? `'${qualifiedReference}` : ":source-focus"})`
  };
}

function normalizeParenDepthColors(colors?: string[] | null): string[] {
  const normalized = Array.isArray(colors)
    ? colors.filter((color) => typeof color === "string" && color.trim().length > 0)
    : [];

  return DEFAULT_LISP_PAREN_COLORS.map((fallback, index) => normalized[index] ?? fallback);
}

function slugifyProjectLabel(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "project";
}

function ensureDesktopProjects(
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

function makeUniqueProjectIdentity(
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

function buildDefaultReplSession(environmentId: string, runtimeSummary: RuntimeSummaryDto | null): ReplSessionProfileDto {
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

export function App() {
  const [activeHostedApp, setActiveHostedApp] = useState<HostedAppId>("control-panel");
  const [desktopSpaces, setDesktopSpaces] = useState<Record<string, DesktopWindowRecord[]>>({
    "desktop-1": initialDesktopWindows()
  });
  const [desktopLabelsById, setDesktopLabelsById] = useState<Record<string, string>>({
    "desktop-1": "Desktop 1"
  });
  const [activeDesktopId, setActiveDesktopId] = useState("desktop-1");
  const [desktopFocusById, setDesktopFocusById] = useState<Record<string, string>>({
    "desktop-1": "window:control-panel"
  });
  const [desktopWindowZCounterById, setDesktopWindowZCounterById] = useState<Record<string, number>>({
    "desktop-1": 3
  });
  const [desktopZoomById, setDesktopZoomById] = useState<Record<string, number>>({
    "desktop-1": 0.66
  });
  const [desktopCompositionInitializedById, setDesktopCompositionInitializedById] = useState<Record<string, boolean>>({});
  const [suppressedDesktopWindowIdsById, setSuppressedDesktopWindowIdsById] = useState<Record<string, string[]>>({
    "desktop-1": []
  });
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("environment");
  const [selectedOperateSection, setSelectedOperateSection] = useState<OperateSection>("orientation");
  const [selectedConversationSection, setSelectedConversationSection] =
    useState<ConversationSection>("threads");
  const [draftEntryFocusOverride, setDraftEntryFocusOverride] =
    useState<EnvironmentFocusState | null>(null);
  const [selectedBrowserDomain, setSelectedBrowserDomain] = useState<BrowserDomain>("symbols");
  const [selectedConfigurationSection, setSelectedConfigurationSection] =
    useState<ConfigurationSection>("theme");
  const [selectedExecutionSection, setSelectedExecutionSection] = useState<ExecutionSection>("listener");
  const [selectedRecoverySection, setSelectedRecoverySection] = useState<RecoverySection>("incidents");
  const [selectedEvidenceSection, setSelectedEvidenceSection] = useState<EvidenceSection>("artifacts");
  const [isWorkspaceTransitioning, setIsWorkspaceTransitioning] = useState(false);
  const [shellLayout, dispatchShellLayout] = useReducer(
    shellLayoutReducer,
    undefined,
    createDefaultShellLayoutState
  );
  const shellLayoutRef = useRef(shellLayout);
  shellLayoutRef.current = shellLayout;
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const [isInspectorResizing, setIsInspectorResizing] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1600 : window.innerWidth
  );
  const sidebarPinned = shellLayout.leftRail.mode === "expanded";
  const canvasPinned = shellLayout.canvas.mode === "expanded";
  const inspectorPinned = shellLayout.rightRail.mode === "expanded";
  const sidebarWidth = shellLayout.leftRail.expandedWidth;
  const inspectorWidth = shellLayout.rightRail.expandedWidth;
  const leftRailPanels = shellRailPanelDefinitions(shellLayout, "left");
  const rightRailPanels = shellRailPanelDefinitions(shellLayout, "right");
  const [shellTooltip, setShellTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [lispParenColors, setLispParenColors] = useState<string[]>(DEFAULT_LISP_PAREN_COLORS);
  const [providerSummary, setProviderSummary] = useState<ProviderProfileSummaryDto | null>(null);
  const [packageManagementSummary, setPackageManagementSummary] = useState<PackageManagementSummaryDto | null>(null);
  const [selectedProviderProfileName, setSelectedProviderProfileName] = useState<string>("default");
  const [providerProfileDraft, setProviderProfileDraft] = useState<ConfigureProviderProfileInput>(
    buildProviderProfileDraft()
  );
  const [providerProfileStatusMessage, setProviderProfileStatusMessage] = useState<string | null>(null);
  const [providerProfileError, setProviderProfileError] = useState<string | null>(null);
  const [packageManagementStatusMessage, setPackageManagementStatusMessage] = useState<string | null>(null);
  const [packageManagementError, setPackageManagementError] = useState<string | null>(null);
  const [packageManagementCommandResult, setPackageManagementCommandResult] =
    useState<PackageManagementCommandResultDto | null>(null);
  const [quicklispSystemDraft, setQuicklispSystemDraft] = useState<string>("");
  const [qlotCommandDraft, setQlotCommandDraft] = useState<string>("update");
  const [sourceRegistryDraftPath, setSourceRegistryDraftPath] = useState<string>("");
  const [sourceRegistryEditOriginalPath, setSourceRegistryEditOriginalPath] = useState<string | null>(null);
  const [localProjectPathDraft, setLocalProjectPathDraft] = useState<string>("");
  const [localProjectNameDraft, setLocalProjectNameDraft] = useState<string>("");
  const [isPackageManagementBusy, setIsPackageManagementBusy] = useState(false);
  const [isSavingProviderProfile, setIsSavingProviderProfile] = useState(false);
  const [isUpdatingProviderRouting, setIsUpdatingProviderRouting] = useState(false);
  const [tooltipScalePercent, setTooltipScalePercent] = useState<number>(
    DEFAULT_DESKTOP_TOOLTIP_SCALE_PERCENT
  );
  const [controlIconScalePercent, setControlIconScalePercent] = useState<number>(
    DEFAULT_DESKTOP_CONTROL_ICON_SCALE_PERCENT
  );
  const [dockIconScalePercent, setDockIconScalePercent] = useState<number>(
    DEFAULT_DESKTOP_DOCK_ICON_SCALE_PERCENT
  );
  const [conversationTextScalePercent, setConversationTextScalePercent] = useState<number>(
    DEFAULT_DESKTOP_CONVERSATION_TEXT_SCALE_PERCENT
  );
  const [sourceCodeTextScalePercent, setSourceCodeTextScalePercent] = useState<number>(
    DEFAULT_DESKTOP_SOURCE_CODE_TEXT_SCALE_PERCENT
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const [expandedWorkspaceMenus, setExpandedWorkspaceMenus] = useState<Record<string, boolean>>({
    environment: true,
    conversations: true,
    runtime: true,
    incidents: true,
    artifacts: true,
    browser: true
  });
  const [, setIsCommandCenterOpen] = useState(false);
  const [hostStatus, setHostStatus] = useState<HostStatusDto | null>(null);
  const [binding, setBinding] = useState<BindingDto | null>(null);
  const [environmentImageRegistry, setEnvironmentImageRegistry] = useState<EnvironmentImageRegistryDto | null>(null);
  const [projects, setProjects] = useState<ProjectProfileDto[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectListResult, setProjectListResult] = useState<QueryResultDto<ProjectListDto> | null>(null);
  const [selectedGovernedProjectId, setSelectedGovernedProjectId] = useState<string | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ProjectDetailDto | null>(null);
  const [selectedConversationThreadByProject, setSelectedConversationThreadByProject] = useState<Record<string, string>>({});
  const [replSessionsByProject, setReplSessionsByProject] = useState<Record<string, ReplSessionProfileDto[]>>({});
  const [currentReplSessionIdByProject, setCurrentReplSessionIdByProject] = useState<Record<string, string>>({});
  const [isProjectOpenDialogOpen, setIsProjectOpenDialogOpen] = useState(false);
  const [isProjectCreateDialogOpen, setIsProjectCreateDialogOpen] = useState(false);
  const [isEditorSourceFileDialogOpen, setIsEditorSourceFileDialogOpen] = useState(false);
  const [isEditorSourceFileSaveDialogOpen, setIsEditorSourceFileSaveDialogOpen] = useState(false);
  const [isProjectConstitutionDialogOpen, setIsProjectConstitutionDialogOpen] = useState(false);
  const [isProjectRequirementDialogOpen, setIsProjectRequirementDialogOpen] = useState(false);
  const [isProjectFeatureSpecificationDialogOpen, setIsProjectFeatureSpecificationDialogOpen] = useState(false);
  const [isProjectUserJourneyDialogOpen, setIsProjectUserJourneyDialogOpen] = useState(false);
  const [isProjectArchitectureDecisionDialogOpen, setIsProjectArchitectureDecisionDialogOpen] = useState(false);
  const [isProjectDesignSystemDialogOpen, setIsProjectDesignSystemDialogOpen] = useState(false);
  const [isProjectStyleGuideDialogOpen, setIsProjectStyleGuideDialogOpen] = useState(false);
  const [isProjectTestingStrategyDialogOpen, setIsProjectTestingStrategyDialogOpen] = useState(false);
  const [isProjectReleaseReadinessDialogOpen, setIsProjectReleaseReadinessDialogOpen] = useState(false);
  const [isProjectReadinessObligationsDialogOpen, setIsProjectReadinessObligationsDialogOpen] = useState(false);
  const [isProjectSourceRootDialogOpen, setIsProjectSourceRootDialogOpen] = useState(false);
  const [isProjectTestingHarnessDialogOpen, setIsProjectTestingHarnessDialogOpen] = useState(false);
  const [isProjectQualityGateDialogOpen, setIsProjectQualityGateDialogOpen] = useState(false);
  const [isWorkItemSteerDialogOpen, setIsWorkItemSteerDialogOpen] = useState(false);
  const [isWorkItemResumeDialogOpen, setIsWorkItemResumeDialogOpen] = useState(false);
  const [isWorkItemQuarantineDialogOpen, setIsWorkItemQuarantineDialogOpen] = useState(false);
  const [isWorkItemRollbackDialogOpen, setIsWorkItemRollbackDialogOpen] = useState(false);
  const [isWorkItemValidationDialogOpen, setIsWorkItemValidationDialogOpen] = useState(false);
  const [isIncidentRemediationPlanDialogOpen, setIsIncidentRemediationPlanDialogOpen] = useState(false);
  const [newProjectTitleDraft, setNewProjectTitleDraft] = useState("");
  const [editorSourceFilePathDraft, setEditorSourceFilePathDraft] = useState("");
  const [editorSourceDirectoryPathDraft, setEditorSourceDirectoryPathDraft] = useState("");
  const [editorSourceDirectoryListing, setEditorSourceDirectoryListing] = useState<FileSystemDirectoryListingDto | null>(null);
  const [editorSourceSaveFileNameDraft, setEditorSourceSaveFileNameDraft] = useState("");
  const [editorSourceSaveDirectoryPathDraft, setEditorSourceSaveDirectoryPathDraft] = useState("");
  const [editorSourceSaveDirectoryListing, setEditorSourceSaveDirectoryListing] = useState<FileSystemDirectoryListingDto | null>(null);
  const [projectConstitutionDraft, setProjectConstitutionDraft] = useState("{}");
  const [projectReleaseReadinessStageDraft, setProjectReleaseReadinessStageDraft] = useState("");
  const [projectReleaseReadinessSignoffStatusDraft, setProjectReleaseReadinessSignoffStatusDraft] = useState("");
  const [projectReleaseReadinessTargetWindowDraft, setProjectReleaseReadinessTargetWindowDraft] = useState("");
  const [projectReleaseReadinessRequiredApproversDraft, setProjectReleaseReadinessRequiredApproversDraft] = useState("");
  const [projectReleaseReadinessObservationPlanDraft, setProjectReleaseReadinessObservationPlanDraft] = useState("");
  const [projectReleaseReadinessOpenRisksDraft, setProjectReleaseReadinessOpenRisksDraft] = useState("");
  const [projectReadinessObligationsDraft, setProjectReadinessObligationsDraft] = useState<ProjectReadinessObligationDraft[]>([
    blankProjectReadinessObligationDraft()
  ]);
  const [projectRequirementTitleDraft, setProjectRequirementTitleDraft] = useState("");
  const [projectRequirementSummaryDraft, setProjectRequirementSummaryDraft] = useState("");
  const [projectRequirementPriorityDraft, setProjectRequirementPriorityDraft] = useState("high");
  const [projectRequirementStatusDraft, setProjectRequirementStatusDraft] = useState("proposed");
  const [projectFeatureSpecificationTitleDraft, setProjectFeatureSpecificationTitleDraft] = useState("");
  const [projectFeatureSpecificationSummaryDraft, setProjectFeatureSpecificationSummaryDraft] = useState("");
  const [projectFeatureSpecificationAcceptanceCriteriaDraft, setProjectFeatureSpecificationAcceptanceCriteriaDraft] = useState("");
  const [projectFeatureSpecificationStatusDraft, setProjectFeatureSpecificationStatusDraft] = useState("proposed");
  const [projectUserJourneyTitleDraft, setProjectUserJourneyTitleDraft] = useState("");
  const [projectUserJourneySummaryDraft, setProjectUserJourneySummaryDraft] = useState("");
  const [projectUserJourneyActorsDraft, setProjectUserJourneyActorsDraft] = useState("");
  const [projectUserJourneyEntrypointsDraft, setProjectUserJourneyEntrypointsDraft] = useState("");
  const [projectUserJourneyStepsDraft, setProjectUserJourneyStepsDraft] = useState("");
  const [projectUserJourneyOutcomesDraft, setProjectUserJourneyOutcomesDraft] = useState("");
  const [projectUserJourneyEdgeCasesDraft, setProjectUserJourneyEdgeCasesDraft] = useState("");
  const [projectArchitectureDecisionTitleDraft, setProjectArchitectureDecisionTitleDraft] = useState("");
  const [projectArchitectureDecisionSummaryDraft, setProjectArchitectureDecisionSummaryDraft] = useState("");
  const [projectArchitectureDecisionStatusDraft, setProjectArchitectureDecisionStatusDraft] = useState("proposed");
  const [projectArchitectureDecisionDriversDraft, setProjectArchitectureDecisionDriversDraft] = useState("");
  const [projectArchitectureDecisionConsequencesDraft, setProjectArchitectureDecisionConsequencesDraft] = useState("");
  const [projectArchitectureDecisionStackChoicesDraft, setProjectArchitectureDecisionStackChoicesDraft] = useState("");
  const [projectDesignSystemDraft, setProjectDesignSystemDraft] = useState("{}");
  const [projectStyleGuideDraft, setProjectStyleGuideDraft] = useState("{}");
  const [projectTestingStrategyRequiredEvidenceDraft, setProjectTestingStrategyRequiredEvidenceDraft] = useState("");
  const [projectTestingStrategySuiteExpectationsDraft, setProjectTestingStrategySuiteExpectationsDraft] = useState<ProjectTestingStrategySuiteExpectationDraft[]>([
    blankProjectTestingStrategySuiteExpectationDraft()
  ]);
  const [projectTestingStrategyMaximumFailedTestsDraft, setProjectTestingStrategyMaximumFailedTestsDraft] = useState("");
  const [projectTestingStrategyMaximumSayTurnLatencySecondsDraft, setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft] = useState("");
  const [projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft, setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft] = useState("");
  const [projectTestingStrategyRequireCoverageDraft, setProjectTestingStrategyRequireCoverageDraft] = useState(false);
  const [projectTestingStrategyRequireRecoveryReadyDraft, setProjectTestingStrategyRequireRecoveryReadyDraft] = useState(false);
  const [projectSourceRootDraft, setProjectSourceRootDraft] = useState("");
  const [projectTestingHarnessIdDraft, setProjectTestingHarnessIdDraft] = useState("");
  const [projectTestingHarnessInventory, setProjectTestingHarnessInventory] = useState<ProjectTestingHarnessDto[]>([]);
  const [projectQualityGateTitleDraft, setProjectQualityGateTitleDraft] = useState("");
  const [projectQualityGateSummaryDraft, setProjectQualityGateSummaryDraft] = useState("");
  const [projectQualityGateStatusDraft, setProjectQualityGateStatusDraft] = useState("proposed");
  const [projectQualityGateRequiredHarnessIdsDraft, setProjectQualityGateRequiredHarnessIdsDraft] = useState("");
  const [projectQualityGateMinimumLinkedWorkItemsDraft, setProjectQualityGateMinimumLinkedWorkItemsDraft] = useState("");
  const [projectQualityGateMinimumLinkedIncidentsDraft, setProjectQualityGateMinimumLinkedIncidentsDraft] = useState("");
  const [projectQualityGateMaximumFailedTestsDraft, setProjectQualityGateMaximumFailedTestsDraft] = useState("");
  const [projectQualityGateMaximumSayTurnLatencySecondsDraft, setProjectQualityGateMaximumSayTurnLatencySecondsDraft] = useState("");
  const [projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft, setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft] = useState("");
  const [projectQualityGateRequireSourceRootsDraft, setProjectQualityGateRequireSourceRootsDraft] = useState(true);
  const [projectQualityGateRequireCoverageDraft, setProjectQualityGateRequireCoverageDraft] = useState(false);
  const [projectQualityGateRequireRecoveryReadyDraft, setProjectQualityGateRequireRecoveryReadyDraft] = useState(false);
  const [workItemSteerPhaseDraft, setWorkItemSteerPhaseDraft] = useState("");
  const [workItemSteerNextStepDraft, setWorkItemSteerNextStepDraft] = useState("");
  const [workItemSteerNoteDraft, setWorkItemSteerNoteDraft] = useState("");
  const [workItemResumeNoteDraft, setWorkItemResumeNoteDraft] = useState("");
  const [workItemQuarantineReasonDraft, setWorkItemQuarantineReasonDraft] = useState("");
  const [workItemRollbackReasonDraft, setWorkItemRollbackReasonDraft] = useState("");
  const [workItemRollbackNoteDraft, setWorkItemRollbackNoteDraft] = useState("");
  const [workItemValidationStatusDraft, setWorkItemValidationStatusDraft] = useState("passed");
  const [incidentRemediationStatusDraft, setIncidentRemediationStatusDraft] =
    useState<IncidentRemediationPlanDto["status"]>("draft");
  const [incidentRemediationOwnerDraft, setIncidentRemediationOwnerDraft] = useState("");
  const [incidentRemediationSummaryDraft, setIncidentRemediationSummaryDraft] = useState("");
  const [incidentRemediationActionsDraft, setIncidentRemediationActionsDraft] = useState("");
  const [incidentRemediationValidationDraft, setIncidentRemediationValidationDraft] = useState("");
  const [incidentRemediationBlockersDraft, setIncidentRemediationBlockersDraft] = useState("");
  const [isEnvironmentImageChooserOpen, setIsEnvironmentImageChooserOpen] = useState(false);
  const [isEnvironmentExitDialogOpen, setIsEnvironmentExitDialogOpen] = useState(false);
  const [environmentSaveAsNameDraft, setEnvironmentSaveAsNameDraft] = useState("");
  const [replSessionTitleDraft, setReplSessionTitleDraft] = useState("New Listener Session");
  const [summary, setSummary] = useState<EnvironmentSummaryDto | null>(null);
  const [status, setStatus] = useState<EnvironmentStatusDto | null>(null);
  const [workspaceSummary, setWorkspaceSummary] = useState<WorkspaceSummaryDto | null>(null);
  const [desktopModel, setDesktopModel] = useState<DesktopModelDto | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ThreadDetailDto | null>(null);
  const [selectedConversationMessageId, setSelectedConversationMessageId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<TurnDetailDto | null>(null);
  const [conversationSessionTitleDraft, setConversationSessionTitleDraft] = useState("");
  const [isConversationSessionCreateDialogOpen, setIsConversationSessionCreateDialogOpen] = useState(false);
  const [isConversationThreadRenameDialogOpen, setIsConversationThreadRenameDialogOpen] = useState(false);
  const [conversationThreadRenameDraft, setConversationThreadRenameDraft] = useState("");
  const [conversationThreadRenameTargetId, setConversationThreadRenameTargetId] = useState<string | null>(null);
  const [conversationDraft, setConversationDraft] = useState(
    "Start from the live environment focus and keep runtime, source, and governance context attached."
  );
  const [conversationAttachments, setConversationAttachments] = useState<ConversationAttachmentDto[]>([]);
  const [conversationSendError, setConversationSendError] = useState<string | null>(null);
  const [isSendingConversation, setIsSendingConversation] = useState(false);
  const [conversationStream, setConversationStream] = useState<{
    threadId: string;
    turnId: string | null;
    content: string;
  } | null>(null);
  const [pendingConversationComposerFocusThreadId, setPendingConversationComposerFocusThreadId] = useState<string | null>(null);
  const [runtimeSummary, setRuntimeSummary] = useState<RuntimeSummaryDto | null>(null);
  const [runtimeTelemetry, setRuntimeTelemetry] = useState<RuntimeTelemetrySnapshotDto | null>(null);
  const [selectedTelemetryProcessId, setSelectedTelemetryProcessId] = useState<string | null>(null);
  const [consoleLogStream, setConsoleLogStream] = useState<QueryResultDto<ConsoleLogStreamDto> | null>(null);
  const [selectedConsolePlane, setSelectedConsolePlane] = useState<"environment" | "host">("environment");
  const [selectedConsoleSourceFilter, setSelectedConsoleSourceFilter] = useState("All Sources");
  const [selectedConsoleEntryId, setSelectedConsoleEntryId] = useState<string | null>(null);
  const [diagnosticReports, setDiagnosticReports] = useState<DiagnosticReportSummaryDto[]>([]);
  const [selectedDiagnosticSourceFilter, setSelectedDiagnosticSourceFilter] = useState("All Sources");
  const [selectedDiagnosticReportId, setSelectedDiagnosticReportId] = useState<string | null>(null);
  const [selectedDiagnosticReport, setSelectedDiagnosticReport] = useState<DiagnosticReportDetailDto | null>(null);
  const [runtimeForm, setRuntimeForm] = useState('(describe "sbcl-agent")');
  const [runtimeResult, setRuntimeResult] = useState<CommandResultDto<RuntimeEvalResultDto> | null>(null);
  const [editorBuffersByProject, setEditorBuffersByProject] = useState<Record<string, EditorBufferStateDto[]>>({});
  const [selectedEditorBufferIdByProject, setSelectedEditorBufferIdByProject] = useState<Record<string, string>>({});
  const [currentEditorCursorSymbol, setCurrentEditorCursorSymbol] = useState<string | null>(null);
  const [currentEditorCursorSymbolPackage, setCurrentEditorCursorSymbolPackage] = useState<string>("cl-user");
  const [currentEditorCursorSymbolHelp, setCurrentEditorCursorSymbolHelp] = useState<{
    detail: string;
    info: string;
    type?: string;
    packageName?: string;
    signature?: string | null;
  } | null>(null);
  const [workspacePackageByProject, setWorkspacePackageByProject] = useState<Record<string, string>>({});
  const [workspaceDraftByProject, setWorkspaceDraftByProject] = useState<Record<string, string>>({});
  const [workspaceResultByProject, setWorkspaceResultByProject] = useState<
    Record<string, CommandResultDto<RuntimeEvalResultDto> | null>
  >({});
  const [workspaceHistoryByProject, setWorkspaceHistoryByProject] = useState<Record<string, ReplSessionHistoryEntryDto[]>>({});
  const [runtimeInspectorSymbol, setRuntimeInspectorSymbol] = useState("CAR");
  const [runtimeInspectorPackage, setRuntimeInspectorPackage] = useState("");
  const [runtimeInspectionMode, setRuntimeInspectionMode] =
    useState<RuntimeInspectionMode>("describe");
  const runtimeInspectorSymbolRef = useRef(runtimeInspectorSymbol);
  const runtimeInspectorPackageRef = useRef(runtimeInspectorPackage);
  const runtimeInspectionModeRef = useRef<RuntimeInspectionMode>(runtimeInspectionMode);
  const selectedThreadIdRef = useRef<string | null>(selectedThreadId);
  const environmentFocusRef = useRef<EnvironmentFocusState>(createDefaultEnvironmentFocusState());
  const desktopPreferencesHydratedRef = useRef(false);
  const desktopPreferencesPersistTimeoutRef = useRef<number | null>(null);
  const shellPendingHydrationActionsRef = useRef<ShellLayoutAction[]>([]);
  const suppressExitDesktopPreferencesFlushRef = useRef(false);
  const startupImageSelectionHandledRef = useRef(false);
  const [runtimeInspection, setRuntimeInspection] =
    useState<QueryResultDto<RuntimeInspectionResultDto> | null>(null);
  const [runtimeEntityDetail, setRuntimeEntityDetail] =
    useState<QueryResultDto<RuntimeEntityDetailDto> | null>(null);
  const [packageBrowser, setPackageBrowser] = useState<QueryResultDto<PackageBrowserDto> | null>(null);
  const [selectedPackageName, setSelectedPackageName] = useState<string>("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isInspectingRuntime, setIsInspectingRuntime] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<QueryResultDto<SourcePreviewDto> | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isStagingSource, setIsStagingSource] = useState(false);
  const [isReloadingSource, setIsReloadingSource] = useState(false);
  const [sourceMutationResult, setSourceMutationResult] =
    useState<CommandResultDto<SourceMutationResultDto> | null>(null);
  const [sourceReloadResult, setSourceReloadResult] =
    useState<CommandResultDto<SourceReloadResultDto> | null>(null);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequestSummaryDto[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequestDto | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<CommandResultDto<ApprovalDecisionDto> | null>(null);
  const [isDecidingApproval, setIsDecidingApproval] = useState(false);
  const [incidents, setIncidents] = useState<IncidentSummaryDto[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetailDto | null>(null);
  const [pendingIncidentFocusId, setPendingIncidentFocusId] = useState<string | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemSummaryDto[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItemDetailDto | null>(null);
  const [selectedWorkItemPlan, setSelectedWorkItemPlan] = useState<WorkItemPlanDto | null>(null);
  const [selectedWorkflowRecord, setSelectedWorkflowRecord] = useState<WorkflowRecordDto | null>(null);
  const [pendingWorkItemFocusId, setPendingWorkItemFocusId] = useState<string | null>(null);
  const [environmentEvents, setEnvironmentEvents] = useState<EnvironmentEventDto[]>([]);
  const [selectedEventCursor, setSelectedEventCursor] = useState<number | null>(null);
  const [eventFamilyFilter, setEventFamilyFilter] = useState<string>("all");
  const [eventVisibilityFilter, setEventVisibilityFilter] = useState<string>("all");
  const [documentationPages, setDocumentationPages] = useState<DocumentationPageSummaryDto[]>([]);
  const [selectedDocumentationSlug, setSelectedDocumentationSlug] = useState<string>("development-model");
  const [selectedDocumentationPage, setSelectedDocumentationPage] = useState<DocumentationPageDto | null>(null);
  const activeWorkspaceRef = useRef<WorkspaceId>(activeWorkspace);
  activeWorkspaceRef.current = activeWorkspace;
  const richDesktopPreferencesRef = useRef<Partial<DesktopPreferencesDto>>({});
  richDesktopPreferencesRef.current = {
    selectedBrowserDomain,
    selectedConfigurationSection,
    conversationDraft,
    editorBuffersByProject,
    selectedEditorBufferIdByProject,
    workspacePackageByProject,
    workspaceDraftByProject,
    workspaceResultByProject,
    workspaceHistoryByProject
  };
  const persistRichDesktopPreferences = useCallback(async () => {
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      ...richDesktopPreferencesRef.current
    });
  }, []);
  const flushRichDesktopPreferences = useCallback(async () => {
    if (desktopPreferencesPersistTimeoutRef.current !== null) {
      window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
      desktopPreferencesPersistTimeoutRef.current = null;
    }
    await persistRichDesktopPreferences();
  }, [persistRichDesktopPreferences]);
  const persistResolvedShellLayout = useCallback(async (nextShellLayout: ShellLayoutState) => {
    shellLayoutRef.current = nextShellLayout;
    await window.sbclAgentDesktop.desktop.setDesktopPreferences(
      {
        lastWorkspace: activeWorkspaceRef.current,
        ...shellLayoutToDesktopPreferencesPatch(nextShellLayout)
      }
    );
  }, []);
  const persistShellDesktopPreferences = useCallback(async () => {
    await persistResolvedShellLayout(shellLayoutRef.current);
  }, [persistResolvedShellLayout]);
  const applyShellLayoutAction = useCallback((action: ShellLayoutAction): ShellLayoutState => {
    if (!desktopPreferencesHydratedRef.current) {
      shellPendingHydrationActionsRef.current.push(action);
    }
    const nextShellLayout = shellLayoutReducer(shellLayoutRef.current, action);
    shellLayoutRef.current = nextShellLayout;
    dispatchShellLayout(action);
    return nextShellLayout;
  }, []);
  const effectiveEnvironmentId = summary?.environmentId ?? binding?.environmentId ?? null;
  const desktopWindows = desktopSpaces[activeDesktopId] ?? [];
  const focusedDesktopWindowId =
    desktopFocusById[activeDesktopId] ?? desktopWindows[0]?.id ?? "window:control-panel";
  const desktopWindowZCounter = desktopWindowZCounterById[activeDesktopId] ?? 3;
  const activeDesktopZoom = desktopZoomById[activeDesktopId] ?? 1;
  const suppressedDesktopWindowIds = suppressedDesktopWindowIdsById[activeDesktopId] ?? [];
  const desktopDescriptors = Object.entries(desktopLabelsById).map(([id, label]) => ({
    id,
    label,
    active: id === activeDesktopId
  }));
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<HTMLElement | null>(null);
  const canvasPanelRef = useRef<HTMLElement | null>(null);
  const inspectorPanelRef = useRef<HTMLElement | null>(null);
  const leftRailListRef = useRef<HTMLDivElement | null>(null);
  const rightRailListRef = useRef<HTMLDivElement | null>(null);
  const desktopWindowStageDropTargetRef = useRef<HTMLDivElement | null>(null);
  const activeTooltipTargetRef = useRef<HTMLElement | null>(null);
  const activeTooltipTitleRef = useRef<string | null>(null);
  const shellPanelDragSessionRef = useRef<{
    panelId: ShellDockPanelId;
    panelLabel: string;
    origin: "left" | "right" | "undocked";
    startX: number;
    startY: number;
    dragStarted: boolean;
  } | null>(null);
  const shellPanelDragCleanupRef = useRef<(() => void) | null>(null);
  const inspectorResizeSessionRef = useRef<{
    contentRight: number;
    minWidth: number;
    maxWidth: number;
    gap: number;
  } | null>(null);
  const sidebarResizeSessionRef = useRef<{
    contentLeft: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);
  const sidebarResizeCleanupRef = useRef<(() => void) | null>(null);
  const [splitterLayout, setSplitterLayout] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);
  const inspectorResizeCleanupRef = useRef<(() => void) | null>(null);
  const [shellPanelDragState, setShellPanelDragState] = useState<{
    panelId: ShellDockPanelId;
    panelLabel: string;
    origin: "left" | "right" | "undocked";
    x: number;
    y: number;
    target: "left" | "right" | "undocked" | null;
  } | null>(null);
  function updateActiveDesktopWindows(updater: (windows: DesktopWindowRecord[]) => DesktopWindowRecord[]): void {
    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const nextWindows = updater(currentWindows);
      if (nextWindows === currentWindows) {
        return current;
      }
      return {
        ...current,
        [activeDesktopId]: nextWindows
      };
    });
  }

  function updateRuntimeInspectorSymbol(value: string): void {
    runtimeInspectorSymbolRef.current = value;
    setRuntimeInspectorSymbol(value);
  }

  function updateRuntimeInspectorPackage(value: string): void {
    runtimeInspectorPackageRef.current = value;
    setRuntimeInspectorPackage(value);
  }

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    const selectedProfile =
      providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName) ??
      providerSummary?.activeProfile ??
      null;
    if (!selectedProfile) {
      return;
    }
    setProviderProfileDraft(
      buildProviderProfileDraft({
        profileName: selectedProfile.name,
        provider: selectedProfile.provider,
        model: selectedProfile.model,
        fastModel: selectedProfile.fastModel,
        apiBase: selectedProfile.apiBase ?? "",
        intents: selectedProfile.intents,
        latencyTier: selectedProfile.latencyTier,
        reviewBias: selectedProfile.reviewBias,
        executionBias: selectedProfile.executionBias,
        locality: selectedProfile.locality
      })
    );
  }, [providerSummary, selectedProviderProfileName]);

  useEffect(() => {
    if (!effectiveEnvironmentId) {
      setConversationStream(null);
      return;
    }

    let active = true;
    let environmentSubscriptionId: string | null = null;
    let conversationStreamSubscriptionId: string | null = null;

    const handleStreamEvent = (event: EnvironmentEventDto) => {
      if (!active) {
        return;
      }

      const payload = event.payload as Record<string, unknown>;
      const streamEvent = payload as unknown as ConversationStreamEventDto & {
        canonicalType?: string;
        payload?: unknown;
      };
      const threadId =
        event.threadId ??
        (typeof payload.threadId === "string" ? payload.threadId : null) ??
        selectedThreadIdRef.current;
      const turnId =
        event.turnId ?? (typeof payload.turnId === "string" ? payload.turnId : null) ?? null;
      const delta =
        typeof streamEvent.payload === "string"
          ? streamEvent.payload
          : typeof streamEvent.content === "string"
            ? streamEvent.content
            : "";
      const canonicalType =
        typeof streamEvent.canonicalType === "string"
          ? streamEvent.canonicalType.replaceAll("_", "-")
          : null;

      if (!threadId) {
        return;
      }

      if (canonicalType === "text-delta") {
        setConversationStream((current) => {
          if (current && current.threadId !== threadId) {
            return current;
          }
          return {
            threadId,
            turnId: turnId ?? current?.turnId ?? null,
            content: `${current?.content ?? ""}${delta}`
          };
        });
      }
    };

    void window.sbclAgentDesktop.events
      .subscribeEnvironmentEvents(
        {
          environmentId: effectiveEnvironmentId,
          families: ["provider"]
        },
        handleStreamEvent
      )
      .then((handle) => {
        environmentSubscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    void window.sbclAgentDesktop.events
      .subscribeConversationStream(handleStreamEvent)
      .then((handle) => {
        conversationStreamSubscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (environmentSubscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(environmentSubscriptionId);
      }
      if (conversationStreamSubscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(conversationStreamSubscriptionId);
      }
    };
  }, [effectiveEnvironmentId]);

  function updateRuntimeInspectionMode(value: RuntimeInspectionMode): void {
    runtimeInspectionModeRef.current = value;
    setRuntimeInspectionMode(value);
  }
  const [artifacts, setArtifacts] = useState<ArtifactSummaryDto[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactDetailDto | null>(null);
  const currentProjectReplSessions = currentProjectId ? replSessionsByProject[currentProjectId] ?? [] : [];
  const currentReplSessionId = currentProjectId ? currentReplSessionIdByProject[currentProjectId] ?? currentProjectReplSessions[0]?.sessionId ?? null : null;
  const currentProject = projects.find((project) => project.projectId === currentProjectId) ?? null;
  const selectedProjectSummary =
    projectListResult?.data.projects.find((project) => project.projectId === selectedGovernedProjectId) ?? null;
  const currentProjectConversationSessionCount = currentProjectId
    ? threads.length
    : 0;
  const currentProjectConversationFocus =
    (currentProjectId ? threads.find((thread) => thread.threadId === selectedConversationThreadByProject[currentProjectId]) : null) ??
    threads[0] ??
    null;
  const environmentFocus = useMemo<EnvironmentFocusState>(() => {
    const browserFocus = createEnvironmentFocusFromBrowserContext({
      sourceWorkspace: activeWorkspace,
      runtimeSymbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null,
      runtimePackage:
        runtimeInspection?.data.packageName ??
        runtimeEntityDetail?.data.packageName ??
        runtimeInspectorPackage ??
        null,
      runtimeInspectionMode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
      sourcePath: sourcePreview?.data.path ?? null,
      sourceLine: sourcePreview?.data.focusLine ?? null,
      linkedThreadId: selectedThreadId
    });
    const conversationFocus = createEnvironmentFocusFromConversationContext({
      sourceWorkspace: activeWorkspace,
      threadId: selectedThreadId,
      turnId: selectedTurnId
    });
    const governanceFocus = createEnvironmentFocusFromGovernanceContext({
      sourceWorkspace: activeWorkspace,
      approvalId: selectedApprovalId,
      workItemId: selectedWorkItemId,
      incidentId: selectedIncidentId
    });
    const evidenceFocus = createEnvironmentFocusFromEvidenceContext({
      sourceWorkspace: activeWorkspace,
      artifactId: selectedArtifactId,
      eventCursor: selectedEventCursor
    });
    const focusCandidates = [browserFocus, conversationFocus, governanceFocus, evidenceFocus];
    const crossSurfaceDraftFocus =
      canonicalWorkspace(activeWorkspace) === "conversations" && selectedConversationSection === "draft"
        ? draftEntryFocusOverride
        : null;
    const preferredFocus =
      crossSurfaceDraftFocus
        ? crossSurfaceDraftFocus
        : canonicalWorkspace(activeWorkspace) === "browser" || canonicalWorkspace(activeWorkspace) === "runtime"
        ? browserFocus
        : canonicalWorkspace(activeWorkspace) === "conversations"
          ? conversationFocus
          : canonicalWorkspace(activeWorkspace) === "approvals" ||
              canonicalWorkspace(activeWorkspace) === "incidents" ||
              canonicalWorkspace(activeWorkspace) === "work" ||
              canonicalWorkspace(activeWorkspace) === "environment"
            ? governanceFocus
            : canonicalWorkspace(activeWorkspace) === "artifacts" || canonicalWorkspace(activeWorkspace) === "activity"
              ? evidenceFocus
              : createDefaultEnvironmentFocusState();
    const baseFocus =
      preferredFocus.kind !== "none"
        ? preferredFocus
        : focusCandidates.find((focus) => focus.kind !== "none") ?? createDefaultEnvironmentFocusState();

    return focusCandidates.reduce((combined, focus) => {
      if (focus === baseFocus || focus.kind === "none") {
        return combined;
      }
      return mergeEnvironmentFocus(combined, focus);
    }, baseFocus);
  }, [
    activeWorkspace,
    draftEntryFocusOverride,
    selectedConversationSection,
    selectedApprovalId,
    selectedArtifactId,
    selectedEventCursor,
    selectedIncidentId,
    runtimeEntityDetail?.data.packageName,
    runtimeEntityDetail?.data.symbol,
    runtimeInspection?.data.mode,
    runtimeInspection?.data.packageName,
    runtimeInspection?.data.symbol,
    runtimeInspectionMode,
    runtimeInspectorPackage,
    selectedThreadId,
    selectedTurnId,
    selectedWorkItemId,
    sourcePreview?.data.focusLine,
    sourcePreview?.data.path
  ]);
  environmentFocusRef.current = environmentFocus;
  const environmentFocusLabel = useMemo(() => formatEnvironmentFocusLabel(environmentFocus), [environmentFocus]);
  const environmentFocusPresentation = useMemo(
    () =>
      buildEnvironmentFocusPresentation({
        focus: environmentFocus,
        focusLabel: environmentFocusLabel,
        selectedThread,
        selectedTurn,
        selectedApproval,
        selectedWorkItem,
        selectedIncident,
        selectedArtifact,
        selectedEvent: environmentEvents.find((event) => event.cursor === selectedEventCursor) ?? null
      }),
    [
      environmentEvents,
      environmentFocus,
      environmentFocusLabel,
      selectedApproval,
      selectedArtifact,
      selectedIncident,
      selectedEventCursor,
      selectedThread,
      selectedTurn,
      selectedWorkItem
    ]
  );
  const conversationDraftFocusActions = useMemo(() => {
    switch (environmentFocus.kind) {
      case "governance-approval":
        return [
          ...(environmentFocus.approvalId ?? selectedApproval?.requestId
            ? [{
                label: "Review Approval",
                onSelect: () => openApprovalRequest(environmentFocus.approvalId ?? selectedApproval?.requestId ?? "")
              }]
            : []),
          {
            label: "Open Governance",
            onSelect: () => navigateToExecutionSection("approvals")
          }
        ];
      case "governance-work-item":
        return [
          ...(environmentFocus.workItemId ?? selectedWorkItem?.workItemId
            ? [{
                label: "Open Work Item",
                onSelect: () => continueWorkItem(environmentFocus.workItemId ?? selectedWorkItem?.workItemId ?? "")
              }]
            : []),
          {
            label: "Open Governance",
            onSelect: () => navigateToExecutionSection("work")
          }
        ];
      case "governance-incident":
        return [
          ...(environmentFocus.incidentId ?? selectedIncident?.incidentId
            ? [{
                label: "Open Recovery",
                onSelect: () => continueRecovery(environmentFocus.incidentId ?? selectedIncident?.incidentId ?? "")
              }]
            : []),
          {
            label: "Inspect Evidence",
            onSelect: () => navigateToEvidenceSection("artifacts")
          }
        ];
      case "evidence-artifact":
        return [
          {
            label: "Open Evidence",
            onSelect: async () => {
              const artifactId = environmentFocus.artifactId ?? selectedArtifact?.artifactId ?? null;
              if (artifactId) {
                setSelectedArtifactId(artifactId);
              }
              await navigateToEvidenceSection("artifacts");
            }
          },
          {
            label: "Replay Events",
            onSelect: () => navigateToEvidenceSection("observation")
          }
        ];
      case "evidence-event":
        return [
          {
            label: "Replay Event",
            onSelect: () => navigateToEvidenceSection("observation")
          },
          {
            label: "Inspect Evidence",
            onSelect: () => navigateToEvidenceSection("artifacts")
          }
        ];
      case "runtime-symbol":
      case "source-artifact":
      case "runtime-scope":
        return [
          {
            label: "Open Browser Focus",
            onSelect: () => navigateToBrowserDomain(environmentFocus.sourcePath ? "source" : "symbols")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "conversation-turn":
        return [
          {
            label: "View Turn",
            onSelect: () => navigateToConversationSection("turns")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "conversation-thread":
      case "linked-conversation":
        return [
          {
            label: "View Thread",
            onSelect: () => navigateToConversationSection("threads")
          },
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
      case "none":
      default:
        return [
          {
            label: "Open Inspector",
            onSelect: () => navigateToDesktopPanel("inspector")
          }
        ];
    }
  }, [
    environmentFocus,
    selectedApproval?.requestId,
    selectedArtifact?.artifactId,
    selectedIncident?.incidentId,
    selectedWorkItem?.workItemId
  ]);
  const selectedConversationMessage =
    selectedThread?.messages.find((message) => message.messageId === selectedConversationMessageId) ??
    (selectedThread &&
    conversationStream &&
    conversationStream.threadId === selectedThread.threadId &&
    selectedConversationMessageId === `streaming-${conversationStream.turnId ?? selectedThread.threadId}` &&
    conversationStream.content.length > 0
      ? {
          messageId: `streaming-${conversationStream.turnId ?? selectedThread.threadId}`,
          role: "assistant" as const,
          content: conversationStream.content,
          createdAt: new Date().toISOString()
        }
      : null);
  const currentProjectReplFocus =
    currentProjectReplSessions.find((session) => session.sessionId === currentReplSessionId) ??
    currentProjectReplSessions[0] ??
    null;
  const currentWorkspaceDraft = currentProjectId
    ? workspaceDraftByProject[currentProjectId] ??
      ";; Workspace\n;; Draft forms here, evaluate them deliberately, and keep useful results for later promotion.\n\n(in-package :cl-user)\n\n(values)\n"
    : ";; Workspace\n;; Bind a project and environment to retain workspace state.\n";
  const currentWorkspacePackage = currentProjectId
    ? workspacePackageByProject[currentProjectId] ?? runtimeSummary?.currentPackage ?? "cl-user"
    : runtimeSummary?.currentPackage ?? "cl-user";
  const currentWorkspaceResult = currentProjectId ? workspaceResultByProject[currentProjectId] ?? null : null;
  const currentEditorBuffers = useMemo<EditorBufferStateDto[]>(() => {
    if (!currentProjectId) {
      return [
        createEditorBufferState({
          bufferId: "editor-buffer-unbound-main",
          title: DEFAULT_EDITOR_BUFFER_TITLE,
          draft: DEFAULT_EDITOR_UNBOUND_DRAFT,
          packageName: runtimeSummary?.currentPackage ?? "cl-user"
        })
      ];
    }
    return (
      editorBuffersByProject[currentProjectId] ?? [
        createEditorBufferState({
          bufferId: `editor-buffer-${currentProjectId}-main`,
          title: DEFAULT_EDITOR_BUFFER_TITLE,
          draft: DEFAULT_EDITOR_BOUND_DRAFT,
          packageName: runtimeSummary?.currentPackage ?? "cl-user"
        })
      ]
    );
  }, [currentProjectId, editorBuffersByProject, runtimeSummary?.currentPackage]);
  const currentEditorBufferId = currentProjectId
    ? selectedEditorBufferIdByProject[currentProjectId] ?? currentEditorBuffers[0]?.bufferId ?? null
    : currentEditorBuffers[0]?.bufferId ?? null;
  const currentEditorBuffer =
    currentEditorBuffers.find((buffer) => buffer.bufferId === currentEditorBufferId) ?? currentEditorBuffers[0] ?? null;
  const currentEditorDraft = currentEditorBuffer?.draft ?? DEFAULT_EDITOR_UNBOUND_DRAFT;
  const currentEditorPackage = currentEditorBuffer?.packageName ?? runtimeSummary?.currentPackage ?? "cl-user";
  const currentEditorResult = currentEditorBuffer?.result ?? null;
  const currentEditorBufferTitle = currentEditorBuffer?.title ?? DEFAULT_EDITOR_BUFFER_TITLE;
  const currentEditorBufferDirty = currentEditorBuffer?.dirty ?? false;
  const currentEditorSourceFilePath = currentEditorBuffer?.sourceFilePath ?? sourcePreview?.data.path ?? null;
  const currentEditorChangedFormCount = currentEditorBuffer
    ? countChangedEditorBufferForms(currentEditorBuffer.baselineDraft, currentEditorBuffer.draft)
    : 0;
  const currentWorkspaceHistory = currentProjectId ? workspaceHistoryByProject[currentProjectId] ?? [] : [];
  const transcriptEntries = useMemo<TranscriptSurfaceEntry[]>(
    () =>
      [
        ...currentWorkspaceHistory.map((entry) => ({
          key: `workspace:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "workspace" as const,
          title: "Workspace Evaluation",
          summary: entry.summary,
          preview: entry.valuePreview ?? null,
          form: entry.form,
          status: entry.status,
          family: "workspace"
        })),
        ...(currentProjectReplFocus?.history ?? []).map((entry) => ({
          key: `listener:${entry.entryId}`,
          timestamp: entry.timestamp,
          source: "listener" as const,
          title: currentProjectReplFocus?.title ?? "Listener Session",
          summary: entry.summary,
          preview: entry.valuePreview ?? null,
          form: entry.form,
          status: entry.status,
          family: currentProjectReplFocus?.packageName ?? "listener"
        })),
        ...environmentEvents.slice(0, 12).map((event) => ({
          key: `event:${event.cursor}`,
          timestamp: event.timestamp,
          source: "event" as const,
          title: event.kind,
          summary: event.summary,
          preview: event.entityId ?? event.turnId ?? event.threadId ?? null,
          family: event.family,
          threadId: event.threadId ?? null,
          turnId: event.turnId ?? null,
          eventCursor: event.cursor
        })),
        ...(conversationStream?.content
          ? [
              {
                key: `stream:${conversationStream.turnId ?? conversationStream.threadId}`,
                timestamp: new Date().toISOString(),
                source: "listener" as const,
                title: "Conversation Stream",
                summary: "An assistant response is currently streaming into the active conversational runtime.",
                preview: conversationStream.content,
                family: "conversation-stream",
                threadId: conversationStream.threadId,
                turnId: conversationStream.turnId
              }
            ]
          : [])
      ].sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    [conversationStream?.content, conversationStream?.threadId, conversationStream?.turnId, currentProjectReplFocus, currentWorkspaceHistory, environmentEvents]
  );
  const queueThreads = threads;
  const queueApprovals = approvalRequests;
  const queueIncidents = incidents;
  const queueWorkItems = workItems;
  const queueArtifacts = artifacts;
  const prioritizedThreads = useMemo(
    () =>
      [...queueThreads].sort(
        (left, right) =>
          threadRecommendationScore(right) - threadRecommendationScore(left) ||
          right.latestActivityAt.localeCompare(left.latestActivityAt)
      ),
    [queueThreads]
  );
  const prioritizedWorkItems = useMemo(
    () =>
      [...queueWorkItems].sort(
        (left, right) => workItemRecommendationScore(right) - workItemRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueWorkItems]
  );
  const prioritizedApprovalRequests = useMemo(
    () =>
      [...queueApprovals].sort(
        (left, right) =>
          approvalRecommendationScore(right) - approvalRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueApprovals]
  );
  const prioritizedIncidents = useMemo(
    () =>
      [...queueIncidents].sort(
        (left, right) =>
          incidentRecommendationScore(right) - incidentRecommendationScore(left) || left.title.localeCompare(right.title)
      ),
    [queueIncidents]
  );
  const primaryThreadTarget =
    prioritizedThreads[0] ?? (selectedThreadId ? queueThreads.find((thread) => thread.threadId === selectedThreadId) ?? null : null);
  const primaryWorkItemTarget =
    prioritizedWorkItems[0] ?? (selectedWorkItemId ? queueWorkItems.find((item) => item.workItemId === selectedWorkItemId) ?? null : null);
  const primaryApprovalTarget =
    prioritizedApprovalRequests[0] ??
    (selectedApprovalId ? queueApprovals.find((request) => request.requestId === selectedApprovalId) ?? null : null);
  const primaryIncidentTarget =
    prioritizedIncidents[0] ?? (selectedIncidentId ? queueIncidents.find((incident) => incident.incidentId === selectedIncidentId) ?? null : null);
  const primaryArtifactTarget =
    (selectedArtifactId ? queueArtifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? null : null) ?? queueArtifacts[0] ?? null;
  const dockJumpTargets = [
    runtimeSummary
      ? {
          id: `listener:${runtimeSummary.runtimeId}`,
          label: "Listener",
          title: currentProjectReplFocus?.title ?? "Live Listener Workbench",
          stateLabel: status?.runtimeState ?? "warm",
          shortcutKey: "L",
          recommendationReason:
            status?.runtimeState === "recovering"
              ? "The runtime itself is unstable. Open the listener workbench first so recovery happens at the native image boundary."
              : "The live image is available. The listener workbench is the most direct path into governed runtime execution.",
          score: status?.runtimeState === "recovering" ? 150 : 42 + currentProjectReplSessions.length * 4,
          tone: status?.runtimeState === "recovering" ? "danger" : ("active" as const),
          onJump: () => {
            void openListenerWorkbench();
          }
        }
      : null,
    primaryThreadTarget
      ? {
          id: `thread:${primaryThreadTarget.threadId}`,
          label: "Thread",
          title: primaryThreadTarget.title,
          stateLabel: primaryThreadTarget.state,
          shortcutKey: "T",
          recommendationReason: primaryThreadRecommendationReason(primaryThreadTarget),
          score: threadRecommendationScore(primaryThreadTarget),
          tone: toneForThreadState(primaryThreadTarget.state),
          onJump: () => {
            setSelectedThreadId(primaryThreadTarget.threadId);
            void navigateToConversationSection("threads");
          }
        }
      : null,
    primaryWorkItemTarget
      ? {
          id: `work:${primaryWorkItemTarget.workItemId}`,
          label: "Work",
          title: primaryWorkItemTarget.title,
          stateLabel: primaryWorkItemTarget.state,
          shortcutKey: "W",
          recommendationReason: primaryWorkRecommendationReason(primaryWorkItemTarget),
          score: workItemRecommendationScore(primaryWorkItemTarget),
          tone: toneForWorkState(primaryWorkItemTarget.state),
          onJump: () => {
            setSelectedWorkItemId(primaryWorkItemTarget.workItemId);
            void navigateToExecutionSection("work");
          }
        }
      : null,
    primaryApprovalTarget
      ? {
          id: `approval:${primaryApprovalTarget.requestId}`,
          label: "Approval",
          title: primaryApprovalTarget.title,
          stateLabel: primaryApprovalTarget.state,
          shortcutKey: "A",
          recommendationReason: primaryApprovalRecommendationReason(primaryApprovalTarget),
          score: approvalRecommendationScore(primaryApprovalTarget),
          tone: toneForApprovalState(primaryApprovalTarget.state),
          onJump: () => {
            setSelectedApprovalId(primaryApprovalTarget.requestId);
            void navigateToExecutionSection("approvals");
          }
        }
      : null,
    primaryIncidentTarget
      ? {
          id: `incident:${primaryIncidentTarget.incidentId}`,
          label: "Recovery",
          title: primaryIncidentTarget.title,
          stateLabel: primaryIncidentTarget.state,
          shortcutKey: "R",
          recommendationReason: primaryIncidentRecommendationReason(primaryIncidentTarget),
          score: incidentRecommendationScore(primaryIncidentTarget),
          tone: toneForIncidentSeverity(primaryIncidentTarget.severity),
          onJump: () => {
            setSelectedIncidentId(primaryIncidentTarget.incidentId);
            void navigateToRecoverySection("incidents");
          }
        }
      : null,
    primaryArtifactTarget
      ? {
          id: `artifact:${primaryArtifactTarget.artifactId}`,
          label: "Artifact",
          title: primaryArtifactTarget.title,
          stateLabel: "ready",
          shortcutKey: "E",
          recommendationReason: "Recent evidence remains available for direct inspection.",
          score: artifactRecommendationScore(primaryArtifactTarget),
          tone: "steady",
          onJump: () => {
            setSelectedArtifactId(primaryArtifactTarget.artifactId);
            void navigateToEvidenceSection("artifacts");
          }
        }
      : null
  ].filter((target): target is DockJumpTarget => Boolean(target));
  const dockRecommendedTargetId = dockJumpTargets.reduce<string | null>(
    (bestId, target) => {
      if (!bestId) {
        return target.id;
      }
      const bestTarget = dockJumpTargets.find((item) => item.id === bestId);
      if (!bestTarget) {
        return target.id;
      }
      return target.score > bestTarget.score ? target.id : bestId;
    },
    null
  );
  const rankedDockJumpTargets = dockJumpTargets
    .map((target) => ({ ...target, recommended: target.id === dockRecommendedTargetId }))
    .sort((left, right) => Number(Boolean(right.recommended)) - Number(Boolean(left.recommended)) || right.score - left.score);
  const recommendedDockJumpTarget = rankedDockJumpTargets.find((target) => target.recommended) ?? null;
  const dashboardActionQueue = useMemo<ActionQueueItem[]>(() => {
    const items: ActionQueueItem[] = [];
    const hasAwaitingApprovals = prioritizedApprovalRequests.some((item) => item.state === "awaiting");
    const hasOpenIncidents = prioritizedIncidents.some((item) => item.state === "open");
    const highPressurePresent =
      status?.runtimeState === "recovering" || hasAwaitingApprovals || hasOpenIncidents || prioritizedWorkItems.some((item) => item.state === "blocked" || item.state === "quarantined");

    if (status?.runtimeState === "recovering") {
      items.push({
        key: "runtime:recovering",
        objectType: "Runtime",
        objectId: runtimeSummary?.runtimeId ?? "runtime",
        title: "Recover runtime listener posture",
        stateLabel: status.runtimeState,
        whyNow: "The runtime is recovering and should be stabilized before normal mutation continues.",
        effectSummary: "Opening the listener lets you inspect runtime state, divergence posture, and pending mutation pressure.",
        references: [runtimeSummary?.currentPackage ?? "runtime", status.workflowState],
        tone: "danger",
        score: 145,
        priorityLabel: "High",
        destinationWorkspace: "runtime",
        destinationLabel: "Operate > Execution > Listener",
        actionLabel: "Open listener",
        rankReason: "The runtime itself is unstable, so it outranks downstream work."
      });
    }

    for (const approval of prioritizedApprovalRequests
      .filter((item) => item.state === "awaiting" || item.state === "denied")
      .slice(0, 4)) {
      const tone = toneForApprovalState(approval.state);
      items.push({
        key: `approval:${approval.requestId}`,
        objectType: "Approval",
        objectId: approval.requestId,
        title: approval.title,
        stateLabel: approval.state,
        whyNow:
          approval.state === "awaiting"
            ? "Execution is paused until this approval is explicitly decided."
            : "This approval was denied and may require a redirected execution path.",
        effectSummary:
          approval.state === "awaiting"
            ? "Opening this approval lets you review the governed request and either unblock or deny the action."
            : "Opening this approval lets you review the denial context and decide how work should be redirected.",
        references: [approval.requestId, approval.summary],
        tone,
        score: approvalRecommendationScore(approval),
        priorityLabel: priorityLabelForTone(tone),
        destinationWorkspace: "runtime",
        destinationLabel: "Operate > Execution > Approvals",
        actionLabel: approval.state === "awaiting" ? "Review approval" : "Inspect denial",
        rankReason:
          approval.state === "awaiting"
            ? "Approvals are canonical blocking objects, so they outrank conversation symptoms of the same wait."
            : "A denied approval changes the execution path and should be clarified before adjacent work continues."
      });
    }

    for (const incident of prioritizedIncidents.filter((item) => item.state !== "resolved").slice(0, 4)) {
      const tone = toneForIncidentSeverity(incident.severity);
      items.push({
        key: `incident:${incident.incidentId}`,
        objectType: "Recovery",
        objectId: incident.incidentId,
        title: incident.title,
        stateLabel: incident.state,
        whyNow:
          incident.state === "open"
            ? "This incident is still open and is part of the dominant recovery pressure."
            : "Recovery is active and still needs supervision before execution fully resumes.",
        effectSummary: "Opening this recovery record lets you inspect incident state, evidence, and next recovery context.",
        references: [incident.severity, incident.incidentId],
        tone,
        score: incidentRecommendationScore(incident),
        priorityLabel: priorityLabelForTone(tone),
        destinationWorkspace: "incidents",
        destinationLabel: "Operate > Recovery > Incidents",
        actionLabel: "Open recovery",
        rankReason:
          incident.state === "open"
            ? "Open incidents are the canonical recovery objects and outrank affected work that merely reflects the same failure."
            : "Active recovery remains higher priority than secondary execution cleanup."
      });
    }

    for (const workItem of prioritizedWorkItems
      .filter((item) => {
        const actionable =
          item.state === "blocked" ||
          item.state === "quarantined" ||
          item.state === "waiting" ||
          item.validationBurden === "pending" ||
          item.reconciliationBurden === "required";
        if (!actionable) {
          return false;
        }
        if (
          (item.state === "blocked" || item.state === "quarantined" || item.state === "waiting") &&
          item.incidentCount > 0 &&
          hasOpenIncidents
        ) {
          return false;
        }
        return true;
      })
      .slice(0, 6)) {
      const tone = toneForWorkState(workItem.state);
      const normalizedScore = Math.max(
        20,
        workItemRecommendationScore(workItem) -
          (workItem.state === "waiting" && hasAwaitingApprovals ? 20 : 0) -
          ((workItem.state === "blocked" || workItem.state === "quarantined") && workItem.incidentCount > 0 && hasOpenIncidents ? 18 : 0)
      );
      items.push({
        key: `work:${workItem.workItemId}`,
        objectType: "Work",
        objectId: workItem.workItemId,
        title: workItem.title,
        stateLabel: workItem.state,
        whyNow:
          workItem.waitingReason ??
          (workItem.validationBurden === "pending"
            ? "Validation is still pending for this work item."
            : workItem.reconciliationBurden === "required"
              ? "Reconciliation is still required for this work item."
              : "This work item remains a governed execution obligation."),
        effectSummary: "Opening this work item shows its workflow record, blocking context, and closure obligations.",
        references: [
          workItem.workItemId,
          `${workItem.approvalCount} approvals`,
          `${workItem.incidentCount} incidents`,
          `${workItem.artifactCount} artifacts`
        ],
        tone,
        score: normalizedScore,
        priorityLabel: priorityLabelForTone(tone),
        destinationWorkspace: "runtime",
        destinationLabel: "Operate > Execution > Work",
        actionLabel: "Open work item",
        rankReason:
          workItem.state === "waiting" && hasAwaitingApprovals
            ? "This work item is still important, but the approval causing the wait is the more direct object to act on first."
            : (workItem.state === "blocked" || workItem.state === "quarantined") && workItem.incidentCount > 0 && hasOpenIncidents
              ? "This work item reflects recovery pressure, but the incident itself is the more direct recovery target."
              : "This work item is the canonical governed execution obligation."
      });
    }

    for (const thread of prioritizedThreads.filter(
      (item) =>
        item.state === "blocked" ||
        item.state === "waiting" ||
        item.latestTurnState === "awaiting_approval" ||
        item.latestTurnState === "interrupted" ||
        item.latestTurnState === "failed"
    ).slice(0, 6)) {
      const tone =
        thread.latestTurnState === "failed"
          ? "danger"
          : thread.latestTurnState === "awaiting_approval" || thread.latestTurnState === "interrupted"
            ? "warning"
            : toneForThreadState(thread.state);
      const normalizedScore = Math.max(
        15,
        threadRecommendationScore(thread) -
          (thread.latestTurnState === "awaiting_approval" && hasAwaitingApprovals ? 26 : 0) -
          ((thread.latestTurnState === "failed" || thread.latestTurnState === "interrupted") && hasOpenIncidents ? 10 : 0)
      );
      items.push({
        key: `thread:${thread.threadId}`,
        objectType: "Thread",
        objectId: thread.threadId,
        title: thread.title,
        stateLabel: thread.latestTurnState,
        whyNow: primaryThreadRecommendationReason(thread),
        effectSummary: "Opening this thread lets you resume the governed conversation in its exact retained context.",
        references: [thread.threadId, thread.state, ...thread.attentionFlags.slice(0, 2)],
        tone,
        score: normalizedScore,
        priorityLabel: priorityLabelForTone(tone),
        destinationWorkspace: "conversations",
        destinationLabel: "Conversations > Threads",
        actionLabel: "Resume thread",
        rankReason:
          thread.latestTurnState === "awaiting_approval" && hasAwaitingApprovals
            ? "The thread matters, but the approval record is the more direct object to act on first."
            : thread.latestTurnState === "failed" || thread.latestTurnState === "interrupted"
              ? "This thread remains an important conversational recovery surface."
              : "This thread is the strongest retained conversation context for continued work."
      });
    }

    if (!highPressurePresent) {
      for (const artifact of queueArtifacts.slice(0, 2)) {
      items.push({
        key: `artifact:${artifact.artifactId}`,
        objectType: "Artifact",
        objectId: artifact.artifactId,
        title: artifact.title,
        stateLabel: artifact.kind,
        whyNow: "Recent evidence should remain directly reviewable while the environment is under active governance.",
        effectSummary: "Opening this artifact lets you inspect provenance, observations, and producing context.",
        references: [artifact.artifactId, artifact.updatedAt],
        tone: "active",
        score: artifactRecommendationScore(artifact),
        priorityLabel: "Low",
        destinationWorkspace: "artifacts",
        destinationLabel: "Operate > Evidence > Artifacts",
        actionLabel: "Review artifact",
        rankReason: "Artifacts are included when the queue is otherwise calm so durable evidence remains reviewable."
      });
    }
    }

    return compressActionQueue(
      items.sort((left, right) => right.score - left.score || attentionToneWeight(right.tone) - attentionToneWeight(left.tone))
    )
      .slice(0, 24);
  }, [prioritizedApprovalRequests, prioritizedIncidents, prioritizedThreads, prioritizedWorkItems, queueArtifacts, runtimeSummary?.currentPackage, runtimeSummary?.runtimeId, status?.runtimeState, status?.workflowState]);
  useEffect(() => {
    async function initializeEnvironmentLifecycle(): Promise<void> {
      try {
        const registryResult = await window.sbclAgentDesktop.host.getEnvironmentImageRegistry();
        setEnvironmentImageRegistry(registryResult.data);
        if (registryResult.data.images.length > 0 && !startupImageSelectionHandledRef.current) {
          setEnvironmentSaveAsNameDraft(registryResult.data.currentImageName ?? "");
          setIsEnvironmentImageChooserOpen(true);
          return;
        }
        await loadInitialState();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to initialize environment images."
        );
      }
    }

    void initializeEnvironmentLifecycle();
  }, []);

  useEffect(() => {
    if (!desktopPreferencesHydratedRef.current) {
      return;
    }

    if (desktopPreferencesPersistTimeoutRef.current !== null) {
      window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
    }

    desktopPreferencesPersistTimeoutRef.current = window.setTimeout(() => {
      void persistRichDesktopPreferences();
    }, 250);

    return () => {
      if (desktopPreferencesPersistTimeoutRef.current !== null) {
        window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
        desktopPreferencesPersistTimeoutRef.current = null;
      }
    };
  }, [
    persistRichDesktopPreferences
  ]);

  useEffect(() => {
    if (!desktopPreferencesHydratedRef.current) {
      return;
    }

    const flushRichDesktopPreferencesOnExit = () => {
      if (suppressExitDesktopPreferencesFlushRef.current) {
        return;
      }
      void flushRichDesktopPreferences();
      void persistShellDesktopPreferences();
    };

    window.addEventListener("pagehide", flushRichDesktopPreferencesOnExit);
    window.addEventListener("beforeunload", flushRichDesktopPreferencesOnExit);

    return () => {
      window.removeEventListener("pagehide", flushRichDesktopPreferencesOnExit);
      window.removeEventListener("beforeunload", flushRichDesktopPreferencesOnExit);
    };
  }, [flushRichDesktopPreferences, persistShellDesktopPreferences]);

  useEffect(() => {
    const title = currentProject?.title ?? summary?.environmentLabel ?? "Surface";
    void window.sbclAgentDesktop.desktop.setWindowTitle(title);
  }, [currentProject?.title, summary?.environmentLabel]);

  useEffect(() => {
    let active = true;
    let subscriptionId: string | null = null;

    void window.sbclAgentDesktop.desktop
      .subscribeMenuActions((action) => {
        if (!active) {
          return;
        }

        if (action === "project:new") {
          setNewProjectTitleDraft(summary?.environmentLabel ?? summary?.environmentId ?? binding?.environmentId ?? "");
          setIsProjectCreateDialogOpen(true);
          return;
        }

        if (action === "project:save") {
          void handleSaveCurrentProject();
          return;
        }

        if (action === "project:open") {
          setIsProjectOpenDialogOpen(true);
          return;
        }

        if (action === "app:request-quit") {
          openEnvironmentExitDialog();
        }
      })
      .then((handle) => {
        subscriptionId = handle.subscriptionId;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (subscriptionId) {
        void window.sbclAgentDesktop.events.unsubscribe(subscriptionId);
      }
    };
  }, [
    binding?.environmentId,
    environmentImageRegistry?.currentImageName,
    handleSaveCurrentProject,
    summary?.environmentId,
    summary?.environmentLabel
  ]);

  useEffect(() => {
    setSelectedConversationMessageId(null);
  }, [selectedThreadId]);

  useEffect(() => {
    void loadDocumentationPages();
  }, []);

  useEffect(() => {
    setIsWorkspaceTransitioning(true);
    const timeout = window.setTimeout(() => {
      setIsWorkspaceTransitioning(false);
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [activeWorkspace]);

  useEffect(() => {
    function handleWorkspaceShortcut(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const shortcutIndex = Number(event.key) - 1;
      if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex >= keyboardWorkspaceOrder.length) {
        return;
      }

      const workspace = keyboardWorkspaceOrder[shortcutIndex];
      if (!workspace) {
        return;
      }

      event.preventDefault();
      void navigateToWorkspace(workspace);
    }

    window.addEventListener("keydown", handleWorkspaceShortcut);

    return () => {
      window.removeEventListener("keydown", handleWorkspaceShortcut);
    };
  }, []);

  useEffect(() => {
    function handleCommandCenterShortcut(event: KeyboardEvent): void {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setIsCommandCenterOpen((current) => !current);
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsCommandCenterOpen(false);
      }
    }

    window.addEventListener("keydown", handleCommandCenterShortcut);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleCommandCenterShortcut);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    function handleDockShortcut(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toUpperCase();
      if (key === "N" && recommendedDockJumpTarget) {
        event.preventDefault();
        recommendedDockJumpTarget.onJump();
        return;
      }

      const dockTarget = rankedDockJumpTargets.find((candidate) => candidate.shortcutKey === key);
      if (!dockTarget) {
        return;
      }

      event.preventDefault();
      dockTarget.onJump();
    }

    window.addEventListener("keydown", handleDockShortcut);

    return () => {
      window.removeEventListener("keydown", handleDockShortcut);
    };
  }, [rankedDockJumpTargets, recommendedDockJumpTarget]);

  useEffect(() => {
    function handleViewportResize(): void {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleViewportResize);
    return () => window.removeEventListener("resize", handleViewportResize);
  }, []);

  useEffect(() => {
    function clearActiveTooltipTarget(): void {
      if (activeTooltipTargetRef.current && activeTooltipTitleRef.current !== null) {
        activeTooltipTargetRef.current.setAttribute("title", activeTooltipTitleRef.current);
      }
      activeTooltipTargetRef.current = null;
      activeTooltipTitleRef.current = null;
    }

    function tooltipTargetFromNode(node: EventTarget | null): HTMLElement | null {
      if (!(node instanceof HTMLElement)) {
        return null;
      }
      const candidate = node.closest<HTMLElement>("[data-tooltip],[title]");
      if (!candidate || !shellRef.current?.contains(candidate)) {
        return null;
      }
      return candidate;
    }

    function tooltipLabelForTarget(target: HTMLElement): string | null {
      return target.getAttribute("data-tooltip") ?? activeTooltipTitleRef.current ?? target.getAttribute("title");
    }

    function updateTooltipPosition(clientX: number, clientY: number, label: string): void {
      const left = Math.max(12, Math.min(clientX + 14, viewportWidth - 240));
      const top = Math.max(12, clientY - 42);
      setShellTooltip({ label, x: left, y: top });
    }

    function activateTooltip(target: HTMLElement, clientX: number, clientY: number): void {
      if (activeTooltipTargetRef.current !== target) {
        clearActiveTooltipTarget();
        activeTooltipTargetRef.current = target;
        activeTooltipTitleRef.current = target.getAttribute("title");
        if (activeTooltipTitleRef.current !== null) {
          target.removeAttribute("title");
        }
      }
      const label = tooltipLabelForTarget(target);
      if (!label) {
        setShellTooltip(null);
        return;
      }
      updateTooltipPosition(clientX, clientY, label);
    }

    function handlePointerOver(event: PointerEvent): void {
      const target = tooltipTargetFromNode(event.target);
      if (!target) {
        return;
      }
      activateTooltip(target, event.clientX, event.clientY);
    }

    function handlePointerMove(event: PointerEvent): void {
      if (!activeTooltipTargetRef.current) {
        return;
      }
      const label = tooltipLabelForTarget(activeTooltipTargetRef.current);
      if (!label) {
        setShellTooltip(null);
        return;
      }
      updateTooltipPosition(event.clientX, event.clientY, label);
    }

    function handlePointerOut(event: PointerEvent): void {
      const currentTarget = activeTooltipTargetRef.current;
      if (!currentTarget) {
        return;
      }
      if (event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) {
        return;
      }
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    function handleFocusIn(event: FocusEvent): void {
      const target = tooltipTargetFromNode(event.target);
      if (!target) {
        return;
      }
      const rect = target.getBoundingClientRect();
      activateTooltip(target, rect.left + rect.width / 2, rect.top);
    }

    function handleFocusOut(): void {
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    function handleWindowBlur(): void {
      clearActiveTooltipTarget();
      setShellTooltip(null);
    }

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("blur", handleWindowBlur);
      clearActiveTooltipTarget();
    };
  }, [viewportWidth]);

  useEffect(() => {
    function updateSplitterLayout(): void {
      if (!shellRef.current || !canvasPanelRef.current) {
        return;
      }

      const shellRect = shellRef.current.getBoundingClientRect();
      const panelElements = [
        sidebarPanelRef.current,
        canvasPanelRef.current,
        inspectorPanelRef.current
      ].filter((element): element is HTMLElement => Boolean(element));
      const panelRects = panelElements
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.height > 0 && rect.width > 0);

      if (panelRects.length === 0) {
        const gap = shellGapForViewport(viewportWidth);
        const titleStripHeight = 34;
        setSplitterLayout({
          top: titleStripHeight + gap,
          bottom: gap,
          left: 0,
          right: 0
        });
        return;
      }

      const top = Math.min(...panelRects.map((rect) => rect.top)) - shellRect.top;
      const bottom = shellRect.bottom - Math.max(...panelRects.map((rect) => rect.bottom));
      const canvasRect = canvasPanelRef.current.getBoundingClientRect();
      const sidebarRect = sidebarPanelRef.current?.getBoundingClientRect() ?? canvasRect;
      const inspectorRect = inspectorPanelRef.current?.getBoundingClientRect() ?? canvasRect;
      const leftGapCenter = sidebarRect.right + (canvasRect.left - sidebarRect.right) / 2;
      const rightGapCenter = canvasRect.right + (inspectorRect.left - canvasRect.right) / 2;

      const leftSplitterHalfWidth = 8;
      const rightSplitterHalfWidth = 24;
      setSplitterLayout({
        top: Math.max(0, top),
        bottom: Math.max(0, bottom),
        left: leftGapCenter - shellRect.left - leftSplitterHalfWidth,
        right: shellRect.right - rightGapCenter - rightSplitterHalfWidth
      });
    }

    updateSplitterLayout();
    window.addEventListener("resize", updateSplitterLayout);
    const resizeObserver = new ResizeObserver(() => updateSplitterLayout());
    if (shellRef.current) {
      resizeObserver.observe(shellRef.current);
    }
    if (sidebarPanelRef.current) {
      resizeObserver.observe(sidebarPanelRef.current);
    }
    if (canvasPanelRef.current) {
      resizeObserver.observe(canvasPanelRef.current);
    }
    if (inspectorPanelRef.current) {
      resizeObserver.observe(inspectorPanelRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateSplitterLayout);
      resizeObserver.disconnect();
    };
  }, [viewportWidth, sidebarPinned, canvasPinned, inspectorPinned, sidebarWidth, inspectorWidth, activeWorkspace]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (matches: boolean) => {
      setSystemTheme(matches ? "dark" : "light");
    };

    updateSystemTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => updateSystemTheme(event.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const resolvedTheme: ResolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    normalizeParenDepthColors(lispParenColors).forEach((color, index) => {
      document.documentElement.style.setProperty(`--lisp-paren-depth-${index + 1}`, color);
    });
  }, [lispParenColors]);

  useEffect(() => {
    if (activeWorkspace === "projects" && effectiveEnvironmentId) {
      void loadProjectWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace !== "projects" || !effectiveEnvironmentId || !selectedGovernedProjectId) {
      return;
    }

    void loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
  }, [activeWorkspace, effectiveEnvironmentId, selectedGovernedProjectId]);

  useEffect(() => {
    if (activeWorkspace === "conversations" && effectiveEnvironmentId) {
      void loadConversationWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedThreadId && effectiveEnvironmentId) {
      void loadThreadDetail(selectedThreadId, effectiveEnvironmentId);
    }
  }, [selectedThreadId, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedTurnId && effectiveEnvironmentId) {
      void loadTurnDetail(selectedTurnId, effectiveEnvironmentId);
    }
  }, [selectedTurnId, effectiveEnvironmentId]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }
    const selectedBufferId = selectedEditorBufferIdByProject[currentProjectId];
    const firstBufferId = currentEditorBuffers[0]?.bufferId ?? null;
    if (!firstBufferId) {
      return;
    }
    if (selectedBufferId && currentEditorBuffers.some((buffer) => buffer.bufferId === selectedBufferId)) {
      return;
    }
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: firstBufferId
    }));
  }, [currentEditorBuffers, currentProjectId, selectedEditorBufferIdByProject]);

  useEffect(() => {
    if (activeWorkspace === "runtime" && effectiveEnvironmentId) {
      void loadRuntimeWorkspace(effectiveEnvironmentId);
      void loadRuntimeTelemetry(effectiveEnvironmentId);
      void loadWorkWorkspace(effectiveEnvironmentId);
      void loadApprovalWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "browser" && effectiveEnvironmentId) {
      void loadRuntimeWorkspace(effectiveEnvironmentId);
      void loadRuntimeTelemetry(effectiveEnvironmentId);
      void loadWorkWorkspace(effectiveEnvironmentId);
      void loadArtifactsWorkspace(effectiveEnvironmentId);
      void loadConversationWorkspace(effectiveEnvironmentId);
      void loadApprovalWorkspace(effectiveEnvironmentId);
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if ((activeWorkspace === "environment" || activeWorkspace === "projects") && effectiveEnvironmentId) {
      void loadWorkWorkspace(effectiveEnvironmentId);
      void loadApprovalWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "configuration" && effectiveEnvironmentId) {
      void refreshProviderSummary(effectiveEnvironmentId);
      void refreshPackageManagementSummary(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (
      activeWorkspace !== "browser" ||
      !effectiveEnvironmentId ||
      !["processes", "performance", "host-io"].includes(selectedBrowserDomain)
    ) {
      return;
    }

    void loadRuntimeTelemetry(effectiveEnvironmentId);
    const intervalId = window.setInterval(() => {
      void loadRuntimeTelemetry(effectiveEnvironmentId);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [activeWorkspace, effectiveEnvironmentId, selectedBrowserDomain]);

  useEffect(() => {
    if (activeWorkspace !== "browser" || !effectiveEnvironmentId || selectedBrowserDomain !== "console") {
      return;
    }

    void loadConsoleLogStream(effectiveEnvironmentId, selectedConsolePlane);
  }, [activeWorkspace, effectiveEnvironmentId, selectedBrowserDomain, selectedConsolePlane]);

  useEffect(() => {
    if (activeWorkspace !== "browser" || !effectiveEnvironmentId || selectedBrowserDomain !== "diagnostics") {
      return;
    }

    void loadDiagnosticReports(effectiveEnvironmentId);
  }, [activeWorkspace, effectiveEnvironmentId, selectedBrowserDomain]);

  useEffect(() => {
    if (!selectedDiagnosticReportId || !effectiveEnvironmentId) {
      return;
    }

    void loadDiagnosticReportDetail(selectedDiagnosticReportId, effectiveEnvironmentId);
  }, [selectedDiagnosticReportId, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "browser" && effectiveEnvironmentId && runtimeSummary?.currentPackage) {
      void loadPackageBrowser(selectedPackageName || runtimeSummary.currentPackage);
    }
  }, [activeWorkspace, effectiveEnvironmentId, runtimeSummary?.currentPackage, selectedPackageName]);

  useEffect(() => {
    if (canonicalWorkspace(activeWorkspace) !== "browser" || !runtimeInspection?.data.items.length) {
      return;
    }

    const sourceBackedItem = runtimeInspection.data.items.find((item) => item.path);
    if (!sourceBackedItem?.path) {
      return;
    }

    if (
      sourcePreview?.data.path === sourceBackedItem.path &&
      sourcePreview.data.focusLine === (sourceBackedItem.line ?? null)
    ) {
      return;
    }

    void loadSourcePreview(sourceBackedItem.path, sourceBackedItem.line ?? undefined);
  }, [activeWorkspace, runtimeInspection, sourcePreview?.data.focusLine, sourcePreview?.data.path]);

  useEffect(() => {
    if (
      canonicalWorkspace(activeWorkspace) !== "browser" ||
      !effectiveEnvironmentId ||
      !runtimeInspection?.data.symbol
    ) {
      return;
    }

    void loadRuntimeEntityDetail(runtimeInspection.data.symbol, runtimeInspection.data.packageName);
  }, [activeWorkspace, effectiveEnvironmentId, runtimeInspection?.data.packageName, runtimeInspection?.data.symbol]);

  useEffect(() => {
    setSourceDraft(sourcePreview?.data.editableContent ?? "");
    setIsEditingSource(false);
    setSourceMutationResult(null);
    setSourceReloadResult(null);
  }, [sourcePreview?.data.path, sourcePreview?.data.editableContent]);

  useEffect(() => {
    if (activeWorkspace === "approvals" && effectiveEnvironmentId) {
      void loadApprovalWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedApprovalId && effectiveEnvironmentId) {
      void loadApprovalDetail(selectedApprovalId, effectiveEnvironmentId);
    }
  }, [selectedApprovalId, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace === "incidents" && effectiveEnvironmentId) {
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedIncidentId && effectiveEnvironmentId) {
      void loadIncidentDetail(selectedIncidentId, effectiveEnvironmentId);
    }
  }, [selectedIncidentId, effectiveEnvironmentId]);

  useEffect(() => {
    if (effectiveEnvironmentId && (summary?.attention.openIncidents ?? 0) > 0 && incidents.length === 0) {
      void loadIncidentWorkspace(effectiveEnvironmentId);
    }
  }, [effectiveEnvironmentId, incidents.length, summary?.attention.openIncidents]);

  useEffect(() => {
    if (activeWorkspace === "work" && effectiveEnvironmentId) {
      void loadWorkWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (selectedWorkItemId && effectiveEnvironmentId) {
      void loadWorkItemDetail(selectedWorkItemId, effectiveEnvironmentId);
    }
  }, [selectedWorkItemId, effectiveEnvironmentId]);

  useEffect(() => {
    if (effectiveEnvironmentId && (summary?.attention.blockedWork ?? 0) > 0 && workItems.length === 0) {
      void loadWorkWorkspace(effectiveEnvironmentId);
    }
  }, [effectiveEnvironmentId, summary?.attention.blockedWork, workItems.length]);

  useEffect(() => {
    if (activeWorkspace === "activity" && effectiveEnvironmentId) {
      void loadActivityWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId, eventFamilyFilter, eventVisibilityFilter]);

  useEffect(() => {
    if (activeWorkspace === "artifacts" && effectiveEnvironmentId) {
      void loadArtifactsWorkspace(effectiveEnvironmentId);
    }
  }, [activeWorkspace, effectiveEnvironmentId]);

  useEffect(() => {
    if (activeWorkspace !== "documentation") {
      return;
    }

    if (documentationPages.length === 0) {
      void loadDocumentationPages();
      return;
    }

    if (!selectedDocumentationPage || selectedDocumentationPage.slug !== selectedDocumentationSlug) {
      void loadDocumentationPage(selectedDocumentationSlug);
    }
  }, [activeWorkspace, documentationPages.length, selectedDocumentationPage, selectedDocumentationSlug]);

  useEffect(() => {
    if (selectedArtifactId && effectiveEnvironmentId) {
      void loadArtifactDetail(selectedArtifactId, effectiveEnvironmentId);
    }
  }, [selectedArtifactId, effectiveEnvironmentId]);

  useEffect(() => {
    if (!currentProjectId || !selectedThreadId) {
      return;
    }

    void persistConversationThreadSelection(currentProjectId, selectedThreadId);
  }, [currentProjectId, selectedThreadId]);

  useEffect(() => {
    if (!currentProjectId) {
      return;
    }

    const sessions = replSessionsByProject[currentProjectId];
    if (!sessions || sessions.length === 0) {
      return;
    }

    const currentSessionId = currentReplSessionIdByProject[currentProjectId] ?? sessions[0]?.sessionId;
    let changed = false;
    const nextSessions = sessions.map((session) => {
      if (session.sessionId !== currentSessionId) {
        return session;
      }

      const nextPackageName = runtimeSummary?.currentPackage ?? session.packageName;
      const nextLastSummary = runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? session.lastSummary;
      if (
        session.draftForm === runtimeForm &&
        session.packageName === nextPackageName &&
        session.lastSummary === nextLastSummary
      ) {
        return session;
      }

      changed = true;
      return {
        ...session,
        draftForm: runtimeForm,
        packageName: nextPackageName,
        lastSummary: nextLastSummary
      };
    });
    if (!changed) {
      return;
    }
    setReplSessionsByProject((current) => ({
      ...current,
      [currentProjectId]: nextSessions
    }));
  }, [currentProjectId, currentReplSessionIdByProject, replSessionsByProject, runtimeForm, runtimeResult, runtimeSummary?.currentPackage, runtimeSummary?.divergencePosture]);

  async function loadDesktopShellModel(
    environmentId: string,
    restorePanelState?: Record<string, unknown> | null
  ): Promise<DesktopModelDto> {
    if (restorePanelState) {
      const restoreResult = await window.sbclAgentDesktop.command.desktopRestore({
        environmentId,
        panelState: restorePanelState
      });
      return restoreResult.data.desktopModel;
    }

    const desktopModelResult = await window.sbclAgentDesktop.query.desktopModel(environmentId);
    return desktopModelResult.data;
  }

  async function refreshProviderSummary(environmentId?: string): Promise<ProviderProfileSummaryDto | null> {
    try {
      const providerResult = await window.sbclAgentDesktop.query.providerProfiles(environmentId);
      setProviderSummary(providerResult.data);
      setSelectedProviderProfileName((current) => {
        if (providerResult.data.profiles.some((profile) => profile.name === current)) {
          return current;
        }
        return providerResult.data.activeProfileName ?? providerResult.data.profiles[0]?.name ?? "default";
      });
      return providerResult.data;
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to load provider configuration."
      );
      return null;
    }
  }

  async function refreshPackageManagementSummary(
    environmentId?: string
  ): Promise<PackageManagementSummaryDto | null> {
    try {
      const result = await window.sbclAgentDesktop.query.packageManagementSummary(environmentId);
      setPackageManagementSummary(result.data);
      return result.data;
    } catch (error) {
      setPackageManagementError(
        error instanceof Error ? error.message : "Failed to load package-management summary."
      );
      return null;
    }
  }

  async function loadInitialState(): Promise<void> {
    try {
      desktopPreferencesHydratedRef.current = false;
      const [nextHostStatus, nextBinding, desktopPreferences] = await Promise.all([
        window.sbclAgentDesktop.host.getHostStatus(),
        window.sbclAgentDesktop.host.getCurrentBinding(),
        window.sbclAgentDesktop.desktop.getDesktopPreferences()
      ]);

      setHostStatus(nextHostStatus);
      setBinding(nextBinding);
      setActiveWorkspace(desktopPreferences.lastWorkspace);
      setSelectedBrowserDomain(
        browserDomains.some((domain) => domain.id === desktopPreferences.selectedBrowserDomain)
          ? (desktopPreferences.selectedBrowserDomain as BrowserDomain)
          : "symbols"
      );
      setSelectedConfigurationSection(
        configurationSections.some((section) => section.id === desktopPreferences.selectedConfigurationSection)
          ? (desktopPreferences.selectedConfigurationSection as ConfigurationSection)
          : "theme"
      );
      const hydratedShellLayout = shellLayoutReducer(createDefaultShellLayoutState(), {
        type: "hydrate",
        preferences: {
          sidebarPinned: desktopPreferences.sidebarPinned ?? true,
          sidebarWidth: desktopPreferences.sidebarWidth ?? null,
          sidebarActivePanelId: desktopPreferences.sidebarActivePanelId ?? null,
          sidebarDockedPanelIds: desktopPreferences.sidebarDockedPanelIds,
          canvasPinned: desktopPreferences.canvasPinned ?? true,
          inspectorPinned: desktopPreferences.inspectorPinned ?? true,
          inspectorWidth: desktopPreferences.inspectorWidth ?? null,
          inspectorActivePanelId: desktopPreferences.inspectorActivePanelId ?? null,
          inspectorDockedPanelIds: desktopPreferences.inspectorDockedPanelIds
        }
      });
      const nextShellLayout = shellPendingHydrationActionsRef.current.reduce(
        (currentState, action) => shellLayoutReducer(currentState, action),
        hydratedShellLayout
      );
      shellLayoutRef.current = nextShellLayout;
      dispatchShellLayout({ type: "replace_state", state: nextShellLayout });
      setThemePreference(desktopPreferences.themePreference);
      setTooltipScalePercent(
        normalizeDesktopSurfaceScalePercent(
          desktopPreferences.desktopSurfaceView?.tooltipScalePercent
        )
      );
      setControlIconScalePercent(
        normalizeDesktopSurfaceScalePercent(
          desktopPreferences.desktopSurfaceView?.controlIconScalePercent
        )
      );
        setDockIconScalePercent(
          normalizeDesktopSurfaceScalePercent(
            desktopPreferences.desktopSurfaceView?.dockIconScalePercent
          )
        );
        setConversationTextScalePercent(
          normalizeDesktopSurfaceScalePercent(
            desktopPreferences.desktopSurfaceView?.conversationTextScalePercent
          )
        );
        setSourceCodeTextScalePercent(
          normalizeDesktopSurfaceScalePercent(
            desktopPreferences.desktopSurfaceView?.sourceCodeTextScalePercent
          )
        );
      setLispParenColors(normalizeParenDepthColors(desktopPreferences.lispCodeView?.parenDepthColors));
      setProjects(ensureDesktopProjects(desktopPreferences.projects, nextBinding, null));
      setCurrentProjectId(desktopPreferences.currentProjectId ?? desktopPreferences.projects?.[0]?.projectId ?? null);
      setSelectedConversationThreadByProject(desktopPreferences.selectedConversationThreadByProject ?? {});
      setConversationDraft(
        desktopPreferences.conversationDraft ??
          "Start from the live environment focus and keep runtime, source, and governance context attached."
      );
      setReplSessionsByProject(desktopPreferences.replSessionsByProject ?? {});
      setCurrentReplSessionIdByProject(desktopPreferences.currentReplSessionIdByProject ?? {});
      setEditorBuffersByProject(desktopPreferences.editorBuffersByProject ?? {});
      setSelectedEditorBufferIdByProject(desktopPreferences.selectedEditorBufferIdByProject ?? {});
      setWorkspacePackageByProject(desktopPreferences.workspacePackageByProject ?? {});
      setWorkspaceDraftByProject(desktopPreferences.workspaceDraftByProject ?? {});
      setWorkspaceResultByProject(desktopPreferences.workspaceResultByProject ?? {});
      setWorkspaceHistoryByProject(desktopPreferences.workspaceHistoryByProject ?? {});

      if (nextBinding?.environmentId) {
        const [summaryResult, statusResult, workspaceSummaryResult, desktopModelResult] = await Promise.all([
          window.sbclAgentDesktop.query.environmentSummary(nextBinding.environmentId),
          window.sbclAgentDesktop.query.environmentStatus(nextBinding.environmentId),
          window.sbclAgentDesktop.query.workspaceSummary(nextBinding.environmentId),
          window.sbclAgentDesktop.query.desktopModel(nextBinding.environmentId)
        ]);
        setSummary(summaryResult.data);
        setStatus(statusResult.data);
        setWorkspaceSummary(workspaceSummaryResult.data);
        setDesktopModel(desktopModelResult.data);
        setActiveWorkspace((current) =>
          desktopPanelToWorkspaceId(desktopModelResult.data.activePanel, current)
        );
        setBinding(statusResult.metadata.binding ?? summaryResult.metadata.binding ?? nextBinding);
        const nextProjects = ensureDesktopProjects(
          desktopPreferences.projects,
          statusResult.metadata.binding ?? summaryResult.metadata.binding ?? nextBinding,
          summaryResult.data
        );
        setProjects(nextProjects);
        setCurrentProjectId((current) => current ?? desktopPreferences.currentProjectId ?? nextProjects[0]?.projectId ?? null);
        await refreshProviderSummary(nextBinding.environmentId);
      } else {
        await refreshProviderSummary();
      }
      desktopPreferencesHydratedRef.current = true;
      shellPendingHydrationActionsRef.current = [];
      void persistResolvedShellLayout(nextShellLayout);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load desktop state.");
    }
  }

  async function refreshEnvironmentImageRegistry(): Promise<EnvironmentImageRegistryDto> {
    const registryResult = await window.sbclAgentDesktop.host.getEnvironmentImageRegistry();
    setEnvironmentImageRegistry(registryResult.data);
    return registryResult.data;
  }

  async function handleOpenEnvironmentImage(imageIdOrName: string): Promise<void> {
    try {
      startupImageSelectionHandledRef.current = true;
      await window.sbclAgentDesktop.host.loadEnvironmentImage(imageIdOrName);
      await refreshEnvironmentImageRegistry();
      setIsEnvironmentImageChooserOpen(false);
      await loadInitialState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to open environment image.");
    }
  }

  async function handleContinueWithCurrentEnvironmentImage(): Promise<void> {
    try {
      startupImageSelectionHandledRef.current = true;
      setIsEnvironmentImageChooserOpen(false);
      await loadInitialState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to continue with current image.");
    }
  }

  function openEnvironmentExitDialog(): void {
    setEnvironmentSaveAsNameDraft(
      environmentImageRegistry?.currentImageName ?? summary?.environmentLabel ?? "work-image"
    );
    setIsEnvironmentExitDialogOpen(true);
  }

  async function handleDiscardAndQuit(): Promise<void> {
    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      if (desktopPreferencesPersistTimeoutRef.current !== null) {
        window.clearTimeout(desktopPreferencesPersistTimeoutRef.current);
        desktopPreferencesPersistTimeoutRef.current = null;
      }
      await window.sbclAgentDesktop.host.revertEnvironmentToImage();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to discard work image state.");
    }
  }

  async function handleSaveCurrentImageAndQuit(): Promise<void> {
    const imageName = environmentImageRegistry?.currentImageName ?? null;
    if (!imageName) {
      return;
    }

    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      await flushRichDesktopPreferences();
      await window.sbclAgentDesktop.host.saveEnvironmentImage({
        name: imageName,
        overwrite: true
      });
      await refreshEnvironmentImageRegistry();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to save current image.");
    }
  }

  async function handleSaveAsNewImageAndQuit(): Promise<void> {
    const imageName = environmentSaveAsNameDraft.trim();
    if (imageName.length === 0) {
      return;
    }

    try {
      suppressExitDesktopPreferencesFlushRef.current = true;
      await flushRichDesktopPreferences();
      await window.sbclAgentDesktop.host.saveEnvironmentImage({
        name: imageName,
        overwrite: false
      });
      await refreshEnvironmentImageRegistry();
      await window.sbclAgentDesktop.desktop.quitApp();
    } catch (error) {
      suppressExitDesktopPreferencesFlushRef.current = false;
      setErrorMessage(error instanceof Error ? error.message : "Failed to save image.");
    }
  }

  async function loadDocumentationPages(): Promise<void> {
    try {
      const pages = await window.sbclAgentDesktop.desktop.listDocumentationPages();
      setDocumentationPages(pages);
      setSelectedDocumentationSlug((current) => {
        if (pages.some((page) => page.slug === current)) {
          return current;
        }

        return pages[0]?.slug ?? "index";
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation pages.");
    }
  }

  async function persistProjectRegistry(
    nextProjects: ProjectProfileDto[],
    nextCurrentProjectId: string | null
  ): Promise<void> {
    setProjects(nextProjects);
    setCurrentProjectId(nextCurrentProjectId);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      projects: nextProjects,
      currentProjectId: nextCurrentProjectId
    });
  }

  async function persistConversationThreadSelection(projectId: string, threadId: string): Promise<void> {
    const nextSelections = {
      ...selectedConversationThreadByProject,
      [projectId]: threadId
    };
    setSelectedConversationThreadByProject(nextSelections);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      selectedConversationThreadByProject: nextSelections
    });
  }

  async function persistReplSessions(
    nextSessionsByProject: Record<string, ReplSessionProfileDto[]>,
    nextCurrentSessionIds: Record<string, string>
  ): Promise<void> {
    setReplSessionsByProject(nextSessionsByProject);
    setCurrentReplSessionIdByProject(nextCurrentSessionIds);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      replSessionsByProject: nextSessionsByProject,
      currentReplSessionIdByProject: nextCurrentSessionIds
    });
  }

  async function appendReplSessionHistoryEntry(
    projectId: string,
    sessionId: string,
    form: string,
    result: CommandResultDto<RuntimeEvalResultDto>
  ): Promise<void> {
    const sessions = replSessionsByProject[projectId] ?? [];
    const entry: ReplSessionHistoryEntryDto = {
      entryId: `${sessionId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      form,
      status: result.status,
      summary: result.data.summary,
      valuePreview: result.data.valuePreview ?? null
    };
    const nextSessions = sessions.map((session) =>
      session.sessionId === sessionId
        ? {
            ...session,
            lastSummary: result.data.summary,
            packageName: runtimeSummary?.currentPackage ?? session.packageName,
            history: [entry, ...(session.history ?? [])].slice(0, 8)
          }
        : session
    );
    await persistReplSessions(
      {
        ...replSessionsByProject,
        [projectId]: nextSessions
      },
      currentReplSessionIdByProject
    );
  }

  async function loadEnvironmentBinding(environmentId: string): Promise<void> {
    const bindingResult = await window.sbclAgentDesktop.host.setEnvironmentBinding(environmentId);
    const nextBinding = bindingResult.metadata.binding ?? bindingResult.data;
    const restorePanelState =
      desktopModel?.panels?.[desktopModel.activePanel] ?? null;
    setBinding(nextBinding);
    const [summaryResult, statusResult, workspaceSummaryResult, nextDesktopModel] = await Promise.all([
      window.sbclAgentDesktop.query.environmentSummary(environmentId),
      window.sbclAgentDesktop.query.environmentStatus(environmentId),
      window.sbclAgentDesktop.query.workspaceSummary(environmentId),
      loadDesktopShellModel(environmentId, restorePanelState)
    ]);
    setSummary(summaryResult.data);
    setStatus(statusResult.data);
    setWorkspaceSummary(workspaceSummaryResult.data);
    setDesktopModel(nextDesktopModel);
    setActiveWorkspace((current) =>
      desktopPanelToWorkspaceId(nextDesktopModel.activePanel, current)
    );
    setBinding(statusResult.metadata.binding ?? summaryResult.metadata.binding ?? nextBinding);
  }

  async function handleProjectSwitch(projectId: string): Promise<void> {
    const project = projects.find((entry) => entry.projectId === projectId);
    if (!project) {
      return;
    }

    try {
      await persistProjectRegistry(projects, project.projectId);
      await loadEnvironmentBinding(project.environmentId);
      setIsProjectOpenDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to switch projects.");
    }
  }

  async function handleSaveCurrentProject(): Promise<void> {
    const environmentId = summary?.environmentId ?? binding?.environmentId;
    if (!environmentId) {
      setErrorMessage("Bind an environment before saving a project.");
      return;
    }

    const title = currentProject?.title || summary?.environmentLabel || environmentId;
    if (!title) {
      return;
    }

    const existingCurrentProject = projects.find((project) => project.projectId === currentProjectId) ?? null;
    const projectId = existingCurrentProject?.projectId ?? `project-${slugifyProjectLabel(title)}`;
    const nextProject: ProjectProfileDto = {
      projectId,
      title,
      environmentId,
      summary: summary?.activeContext.focusSummary ?? "Desktop project bound to a governed environment."
    };
    const nextProjects = [nextProject, ...projects.filter((project) => project.projectId !== projectId)];

    try {
      await persistProjectRegistry(nextProjects, projectId);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the current project.");
    }
  }

  function openProjectConstitutionDialog(): void {
    setProjectConstitutionDraft(JSON.stringify(selectedProjectDetail?.constitution ?? {}, null, 2));
    setIsProjectConstitutionDialogOpen(true);
  }

  async function handleSaveProjectConstitution(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its constitution.");
      return;
    }

    let constitution: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectConstitutionDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project constitutions must be stored as a JSON object.");
      }
      constitution = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project constitution draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectConstitution({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        constitution
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectConstitutionDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project constitution.");
    }
  }

  function openProjectRequirementDialog(): void {
    setProjectRequirementTitleDraft("");
    setProjectRequirementSummaryDraft("");
    setProjectRequirementPriorityDraft("high");
    setProjectRequirementStatusDraft("proposed");
    setIsProjectRequirementDialogOpen(true);
  }

  async function handleCreateProjectRequirement(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a requirement.");
      return;
    }

    const title = projectRequirementTitleDraft.trim();
    const summary = projectRequirementSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Requirement title and summary are required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectRequirement({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        priority: projectRequirementPriorityDraft,
        status: projectRequirementStatusDraft,
        kind: "functional",
        scope: "panel-authored",
        verificationKind: "review"
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectRequirementDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the project requirement.");
    }
  }

  function openProjectFeatureSpecificationDialog(): void {
    setProjectFeatureSpecificationTitleDraft("");
    setProjectFeatureSpecificationSummaryDraft("");
    setProjectFeatureSpecificationAcceptanceCriteriaDraft("");
    setProjectFeatureSpecificationStatusDraft("proposed");
    setIsProjectFeatureSpecificationDialogOpen(true);
  }

  async function handleCreateProjectFeatureSpecification(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a feature specification.");
      return;
    }

    const title = projectFeatureSpecificationTitleDraft.trim();
    const summary = projectFeatureSpecificationSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Feature specification title and summary are required.");
      return;
    }

    const acceptanceCriteria = projectFeatureSpecificationAcceptanceCriteriaDraft
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectFeatureSpecification({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        status: projectFeatureSpecificationStatusDraft,
        acceptanceCriteria
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectFeatureSpecificationDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the feature specification.");
    }
  }

  function openProjectUserJourneyDialog(): void {
    setProjectUserJourneyTitleDraft("");
    setProjectUserJourneySummaryDraft("");
    setProjectUserJourneyActorsDraft("");
    setProjectUserJourneyEntrypointsDraft("");
    setProjectUserJourneyStepsDraft("");
    setProjectUserJourneyOutcomesDraft("");
    setProjectUserJourneyEdgeCasesDraft("");
    setIsProjectUserJourneyDialogOpen(true);
  }

  async function handleCreateProjectUserJourney(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a user journey.");
      return;
    }

    const title = projectUserJourneyTitleDraft.trim();
    const summary = projectUserJourneySummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("User journey title and summary are required.");
      return;
    }

    const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectUserJourney({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        actors: toLines(projectUserJourneyActorsDraft),
        entrypoints: toLines(projectUserJourneyEntrypointsDraft),
        steps: toLines(projectUserJourneyStepsDraft),
        outcomes: toLines(projectUserJourneyOutcomesDraft),
        edgeCases: toLines(projectUserJourneyEdgeCasesDraft)
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectUserJourneyDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the user journey.");
    }
  }

  function openProjectArchitectureDecisionDialog(): void {
    setProjectArchitectureDecisionTitleDraft("");
    setProjectArchitectureDecisionSummaryDraft("");
    setProjectArchitectureDecisionStatusDraft("proposed");
    setProjectArchitectureDecisionDriversDraft("");
    setProjectArchitectureDecisionConsequencesDraft("");
    setProjectArchitectureDecisionStackChoicesDraft("");
    setIsProjectArchitectureDecisionDialogOpen(true);
  }

  async function handleCreateProjectArchitectureDecision(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding an architecture decision.");
      return;
    }

    const title = projectArchitectureDecisionTitleDraft.trim();
    const summary = projectArchitectureDecisionSummaryDraft.trim();
    if (!title || !summary) {
      setErrorMessage("Architecture decision title and summary are required.");
      return;
    }

    const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

    try {
      const result = await window.sbclAgentDesktop.command.appendProjectArchitectureDecision({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary,
        status: projectArchitectureDecisionStatusDraft,
        drivers: toLines(projectArchitectureDecisionDriversDraft),
        consequences: toLines(projectArchitectureDecisionConsequencesDraft),
        stackChoices: toLines(projectArchitectureDecisionStackChoicesDraft)
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectArchitectureDecisionDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the architecture decision.");
    }
  }

  function openProjectDesignSystemDialog(): void {
    setProjectDesignSystemDraft(JSON.stringify(selectedProjectDetail?.designSystem ?? {}, null, 2));
    setIsProjectDesignSystemDialogOpen(true);
  }

  async function handleSaveProjectDesignSystem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its design system.");
      return;
    }

    let designSystem: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectDesignSystemDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project design systems must be stored as a JSON object.");
      }
      designSystem = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project design system draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectDesignSystem({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        designSystem
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectDesignSystemDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project design system.");
    }
  }

  function openProjectStyleGuideDialog(): void {
    setProjectStyleGuideDraft(JSON.stringify(selectedProjectDetail?.styleGuide ?? {}, null, 2));
    setIsProjectStyleGuideDialogOpen(true);
  }

  function openProjectReleaseReadinessDialog(): void {
    const releaseReadiness = selectedProjectDetail?.releaseReadiness;
    setProjectReleaseReadinessStageDraft(releaseReadiness?.stage ?? "");
    setProjectReleaseReadinessSignoffStatusDraft(releaseReadiness?.signoffStatus ?? "");
    setProjectReleaseReadinessTargetWindowDraft(releaseReadiness?.targetWindow ?? "");
    setProjectReleaseReadinessRequiredApproversDraft((releaseReadiness?.requiredApprovers ?? []).join("\n"));
    setProjectReleaseReadinessObservationPlanDraft((releaseReadiness?.observationPlan ?? []).join("\n"));
    setProjectReleaseReadinessOpenRisksDraft((releaseReadiness?.openRisks ?? []).join("\n"));
    setIsProjectReleaseReadinessDialogOpen(true);
  }

  function openProjectReadinessObligationsDialog(): void {
    const obligations = (selectedProjectDetail?.readinessObligations ?? []).map((item) => ({
      obligationId: item.obligationId,
      title: item.title,
      summary: item.summary,
      status: item.status,
      owner: item.owner ?? "",
      dueWindow: item.dueWindow ?? "",
      blocking: item.blocking,
      evidenceKindsDraft: item.evidenceKinds.join(", ")
    }));
    setProjectReadinessObligationsDraft(
      obligations.length > 0 ? obligations : [blankProjectReadinessObligationDraft()]
    );
    setIsProjectReadinessObligationsDialogOpen(true);
  }

  async function handleSaveProjectReleaseReadiness(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its release readiness.");
      return;
    }

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    const releaseReadiness: ProjectReleaseReadinessDto = {
      stage: projectReleaseReadinessStageDraft.trim() || null,
      signoffStatus: projectReleaseReadinessSignoffStatusDraft.trim() || null,
      targetWindow: projectReleaseReadinessTargetWindowDraft.trim() || null,
      requiredApprovers: splitDraftValues(projectReleaseReadinessRequiredApproversDraft),
      observationPlan: splitDraftValues(projectReleaseReadinessObservationPlanDraft),
      openRisks: splitDraftValues(projectReleaseReadinessOpenRisksDraft)
    };

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectReleaseReadiness({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        releaseReadiness
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectReleaseReadinessDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project release readiness.");
    }
  }

  function updateProjectReadinessObligationDraft(
    index: number,
    patch: Partial<ProjectReadinessObligationDraft>
  ): void {
    setProjectReadinessObligationsDraft((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
    );
  }

  function addProjectReadinessObligationDraft(): void {
    setProjectReadinessObligationsDraft((current) => [...current, blankProjectReadinessObligationDraft()]);
  }

  function removeProjectReadinessObligationDraft(index: number): void {
    setProjectReadinessObligationsDraft((current) => {
      const next = current.filter((_, entryIndex) => entryIndex !== index);
      return next.length > 0 ? next : [blankProjectReadinessObligationDraft()];
    });
  }

  async function handleSaveProjectReadinessObligations(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its readiness obligations.");
      return;
    }

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    let readinessObligations: ProjectReadinessObligationDto[];
    try {
      readinessObligations = projectReadinessObligationsDraft
        .map((entry, index) => ({
          obligationId: entry.obligationId.trim() || `readiness-obligation-${index + 1}`,
          title: entry.title.trim(),
          summary: entry.summary.trim(),
          status: entry.status.trim() || "blocked",
          owner: entry.owner.trim() || null,
          dueWindow: entry.dueWindow.trim() || null,
          blocking: entry.blocking,
          evidenceKinds: splitDraftValues(entry.evidenceKindsDraft)
        }))
        .filter((entry) => entry.title.length > 0 || entry.summary.length > 0 || entry.evidenceKinds.length > 0);

      readinessObligations.forEach((entry) => {
        if (!entry.title) {
          throw new Error("Each readiness obligation must include a title.");
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse project readiness obligations.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectReadinessObligations({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        readinessObligations
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectReadinessObligationsDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project readiness obligations.");
    }
  }

  async function openProjectTestingStrategyDialog(): Promise<void> {
    const testingStrategy = selectedProjectDetail?.testingStrategy;
    const requiredEvidence = testingStrategy?.requiredEvidence ?? [];
    const suiteExpectations = (testingStrategy?.suiteExpectations ?? []).map((item) => ({
      harnessId: item.harnessId,
      purpose: item.purpose ?? "",
      evidenceKindsDraft: item.evidenceKinds.join(", ")
    }));
    const thresholdPolicy = testingStrategy?.thresholdPolicy ?? null;

    setProjectTestingStrategyRequiredEvidenceDraft(requiredEvidence.join("\n"));
    setProjectTestingStrategySuiteExpectationsDraft(
      suiteExpectations.length > 0 ? suiteExpectations : [blankProjectTestingStrategySuiteExpectationDraft()]
    );
    setProjectTestingStrategyMaximumFailedTestsDraft(thresholdPolicy?.maxFailedTests != null ? String(thresholdPolicy.maxFailedTests) : "");
    setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft(
      thresholdPolicy?.maxSayTurnLatencySeconds != null ? String(thresholdPolicy.maxSayTurnLatencySeconds) : ""
    );
    setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft(
      thresholdPolicy?.maxEnvironmentSaveLoadSeconds != null ? String(thresholdPolicy.maxEnvironmentSaveLoadSeconds) : ""
    );
    setProjectTestingStrategyRequireCoverageDraft(Boolean(thresholdPolicy?.requireCoverage));
    setProjectTestingStrategyRequireRecoveryReadyDraft(Boolean(thresholdPolicy?.requireRecoveryReady));

    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectTestingStrategyDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectTestingStrategyDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleSaveProjectStyleGuide(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its style guide.");
      return;
    }

    let styleGuide: Record<string, unknown>;
    try {
      const parsed = JSON.parse(projectStyleGuideDraft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Project style guides must be stored as a JSON object.");
      }
      styleGuide = parsed as Record<string, unknown>;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project style guide draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectStyleGuide({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        styleGuide
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectStyleGuideDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project style guide.");
    }
  }

  function updateProjectTestingStrategySuiteExpectation(
    index: number,
    patch: Partial<ProjectTestingStrategySuiteExpectationDraft>
  ): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry))
    );
  }

  function addProjectTestingStrategySuiteExpectation(): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) => [...current, blankProjectTestingStrategySuiteExpectationDraft()]);
  }

  function removeProjectTestingStrategySuiteExpectation(index: number): void {
    setProjectTestingStrategySuiteExpectationsDraft((current) => {
      const next = current.filter((_, entryIndex) => entryIndex != index);
      return next.length > 0 ? next : [blankProjectTestingStrategySuiteExpectationDraft()];
    });
  }

  async function handleSaveProjectTestingStrategy(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before editing its testing strategy.");
      return;
    }

    const parseOptionalNumber = (value: string, label: string): number | null => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = Number(trimmed);
      if (Number.isNaN(parsed)) {
        throw new Error(`${label} must be a number.`);
      }
      return parsed;
    };

    const splitDraftValues = (value: string): string[] =>
      value
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

    let testingStrategy: ProjectTestingStrategyDto;
    try {
      const requiredEvidence = splitDraftValues(projectTestingStrategyRequiredEvidenceDraft);
      const suiteExpectations = projectTestingStrategySuiteExpectationsDraft
        .map((entry) => ({
          harnessId: entry.harnessId.trim(),
          purpose: entry.purpose.trim(),
          evidenceKinds: splitDraftValues(entry.evidenceKindsDraft)
        }))
        .filter((entry) => entry.harnessId.length > 0 || entry.purpose.length > 0 || entry.evidenceKinds.length > 0)
        .map((entry) => {
          if (!entry.harnessId) {
            throw new Error("Each suite expectation must include a harness id.");
          }
          return {
            harnessId: entry.harnessId,
            purpose: entry.purpose || null,
            evidenceKinds: entry.evidenceKinds
          };
        });

      const maxFailedTests = parseOptionalNumber(projectTestingStrategyMaximumFailedTestsDraft, "Max failed tests");
      const maxSayTurnLatencySeconds = parseOptionalNumber(
        projectTestingStrategyMaximumSayTurnLatencySecondsDraft,
        "Max say turn latency"
      );
      const maxEnvironmentSaveLoadSeconds = parseOptionalNumber(
        projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft,
        "Max save/load latency"
      );

      testingStrategy = {
        requiredEvidence,
        suiteExpectations,
        thresholdPolicy:
          maxFailedTests != null ||
          maxSayTurnLatencySeconds != null ||
          maxEnvironmentSaveLoadSeconds != null ||
          projectTestingStrategyRequireCoverageDraft ||
          projectTestingStrategyRequireRecoveryReadyDraft
            ? {
                maxFailedTests,
                maxSayTurnLatencySeconds,
                maxEnvironmentSaveLoadSeconds,
                requireCoverage: projectTestingStrategyRequireCoverageDraft,
                requireRecoveryReady: projectTestingStrategyRequireRecoveryReadyDraft
              }
            : null
      };
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to parse the project testing strategy draft.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateProjectTestingStrategy({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        testingStrategy
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectTestingStrategyDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the project testing strategy.");
    }
  }

  function openProjectSourceRootDialog(): void {
    setProjectSourceRootDraft("");
    setIsProjectSourceRootDialogOpen(true);
  }

  async function handleCreateProjectSourceRoot(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a source root.");
      return;
    }
    const sourceRoot = projectSourceRootDraft.trim();
    if (!sourceRoot) {
      setErrorMessage("Source root path is required.");
      return;
    }
    try {
      const result = await window.sbclAgentDesktop.command.appendProjectSourceRoot({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        sourceRoot
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectSourceRootDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the source root.");
    }
  }

  async function ensureProjectTestingHarnessInventory(): Promise<ProjectTestingHarnessDto[]> {
    if (!effectiveEnvironmentId) {
      setProjectTestingHarnessInventory([]);
      return [];
    }
    const result = await window.sbclAgentDesktop.query.projectTestingHarnessInventory(effectiveEnvironmentId);
    setProjectTestingHarnessInventory(result.data);
    return result.data;
  }

  async function openProjectTestingHarnessDialog(): Promise<void> {
    setProjectTestingHarnessIdDraft("");
    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectTestingHarnessDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectTestingHarnessDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleBindProjectTestingHarness(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before binding a testing harness.");
      return;
    }
    const harnessId = projectTestingHarnessIdDraft.trim();
    if (!harnessId) {
      setErrorMessage("Testing harness id is required.");
      return;
    }
    try {
      const result = await window.sbclAgentDesktop.command.bindProjectTestingHarness({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        harnessId
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectTestingHarnessDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to bind the testing harness.");
    }
  }

  async function openProjectQualityGateDialog(): Promise<void> {
    setProjectQualityGateTitleDraft("");
    setProjectQualityGateSummaryDraft("");
    setProjectQualityGateStatusDraft("proposed");
    setProjectQualityGateRequiredHarnessIdsDraft("");
    setProjectQualityGateMinimumLinkedWorkItemsDraft("");
    setProjectQualityGateMinimumLinkedIncidentsDraft("");
    setProjectQualityGateMaximumFailedTestsDraft("");
    setProjectQualityGateMaximumSayTurnLatencySecondsDraft("");
    setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft("");
    setProjectQualityGateRequireSourceRootsDraft(true);
    setProjectQualityGateRequireCoverageDraft(false);
    setProjectQualityGateRequireRecoveryReadyDraft(false);
    try {
      await ensureProjectTestingHarnessInventory();
      setIsProjectQualityGateDialogOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setProjectTestingHarnessInventory([]);
      setIsProjectQualityGateDialogOpen(true);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the testing harness inventory.");
    }
  }

  async function handleCreateProjectQualityGate(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedGovernedProjectId) {
      setErrorMessage("Select a governed project before adding a quality gate.");
      return;
    }
    const title = projectQualityGateTitleDraft.trim();
    if (!title) {
      setErrorMessage("Quality gate title is required.");
      return;
    }
    const maximumFailedTestsValue = projectQualityGateMaximumFailedTestsDraft.trim();
    const maximumFailedTests = maximumFailedTestsValue ? Number.parseInt(maximumFailedTestsValue, 10) : undefined;
    if (maximumFailedTestsValue && Number.isNaN(maximumFailedTests)) {
      setErrorMessage("Max failed tests must be a valid integer.");
      return;
    }
    const minimumLinkedWorkItemsValue = projectQualityGateMinimumLinkedWorkItemsDraft.trim();
    const minimumLinkedWorkItems = minimumLinkedWorkItemsValue ? Number.parseInt(minimumLinkedWorkItemsValue, 10) : undefined;
    if (minimumLinkedWorkItemsValue && Number.isNaN(minimumLinkedWorkItems)) {
      setErrorMessage("Minimum linked work items must be a valid integer.");
      return;
    }
    const minimumLinkedIncidentsValue = projectQualityGateMinimumLinkedIncidentsDraft.trim();
    const minimumLinkedIncidents = minimumLinkedIncidentsValue ? Number.parseInt(minimumLinkedIncidentsValue, 10) : undefined;
    if (minimumLinkedIncidentsValue && Number.isNaN(minimumLinkedIncidents)) {
      setErrorMessage("Minimum linked incidents must be a valid integer.");
      return;
    }
    const maximumSayTurnLatencySecondsValue = projectQualityGateMaximumSayTurnLatencySecondsDraft.trim();
    const maximumSayTurnLatencySeconds = maximumSayTurnLatencySecondsValue ? Number.parseFloat(maximumSayTurnLatencySecondsValue) : undefined;
    if (maximumSayTurnLatencySecondsValue && Number.isNaN(maximumSayTurnLatencySeconds)) {
      setErrorMessage("Max say turn latency must be a valid number.");
      return;
    }
    const maximumEnvironmentSaveLoadSecondsValue = projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft.trim();
    const maximumEnvironmentSaveLoadSeconds = maximumEnvironmentSaveLoadSecondsValue
      ? Number.parseFloat(maximumEnvironmentSaveLoadSecondsValue)
      : undefined;
    if (maximumEnvironmentSaveLoadSecondsValue && Number.isNaN(maximumEnvironmentSaveLoadSeconds)) {
      setErrorMessage("Max save/load latency must be a valid number.");
      return;
    }
    const requiredHarnessIds = projectQualityGateRequiredHarnessIdsDraft
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    try {
      const result = await window.sbclAgentDesktop.command.appendProjectQualityGate({
        environmentId: effectiveEnvironmentId,
        projectId: selectedGovernedProjectId,
        title,
        summary: projectQualityGateSummaryDraft.trim() || undefined,
        status: projectQualityGateStatusDraft,
        requiredHarnessIds: requiredHarnessIds.length > 0 ? requiredHarnessIds : undefined,
        minimumLinkedWorkItems,
        minimumLinkedIncidents,
        requireSourceRoots: projectQualityGateRequireSourceRootsDraft,
        requireCoverage: projectQualityGateRequireCoverageDraft,
        requireRecoveryReady: projectQualityGateRequireRecoveryReadyDraft,
        maximumFailedTests,
        maximumSayTurnLatencySeconds,
        maximumEnvironmentSaveLoadSeconds
      });
      setSelectedProjectDetail(result.data);
      await loadProjectWorkspace(effectiveEnvironmentId);
      await loadProjectDetail(selectedGovernedProjectId, effectiveEnvironmentId);
      setIsProjectQualityGateDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add the quality gate.");
    }
  }

  function openWorkItemSteerDialog(): void {
    setWorkItemSteerPhaseDraft(selectedWorkflowRecord?.phase ?? "");
    setWorkItemSteerNextStepDraft("");
    setWorkItemSteerNoteDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemSteerDialogOpen(true);
  }

  function openWorkItemResumeDialog(): void {
    setWorkItemResumeNoteDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemResumeDialogOpen(true);
  }

  function openWorkItemQuarantineDialog(): void {
    setWorkItemQuarantineReasonDraft(selectedWorkItem?.waitingReason ?? "");
    setIsWorkItemQuarantineDialogOpen(true);
  }

  function openWorkItemRollbackDialog(): void {
    setWorkItemRollbackReasonDraft(selectedWorkItem?.waitingReason ?? "");
    setWorkItemRollbackNoteDraft("");
    setIsWorkItemRollbackDialogOpen(true);
  }

  function openWorkItemValidationDialog(): void {
    setWorkItemValidationStatusDraft("passed");
    setIsWorkItemValidationDialogOpen(true);
  }

  function openIncidentRemediationPlanDialog(): void {
    const plan = selectedIncident?.remediationPlan;
    setIncidentRemediationStatusDraft(plan?.status ?? "draft");
    setIncidentRemediationOwnerDraft(plan?.owner ?? "");
    setIncidentRemediationSummaryDraft(plan?.summary ?? "");
    setIncidentRemediationActionsDraft((plan?.actions ?? []).join("\n"));
    setIncidentRemediationValidationDraft((plan?.validationSteps ?? []).join("\n"));
    setIncidentRemediationBlockersDraft((plan?.blockers ?? []).join("\n"));
    setIsIncidentRemediationPlanDialogOpen(true);
  }

  async function handleSteerWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before steering execution.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.steerWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        phase: workItemSteerPhaseDraft.trim() || null,
        nextStep: workItemSteerNextStepDraft.trim() || null,
        note: workItemSteerNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemSteerDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to steer the work item.");
    }
  }

  async function handleResumeWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before resuming execution.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.resumeWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        note: workItemResumeNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemResumeDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to resume the work item.");
    }
  }

  async function handleQuarantineWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before quarantining execution.");
      return;
    }

    const reason = workItemQuarantineReasonDraft.trim();
    if (!reason) {
      setErrorMessage("A quarantine reason is required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.quarantineWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        reason
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemQuarantineDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to quarantine the work item.");
    }
  }

  async function handleRollbackWorkItem(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before requesting rollback.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.rollbackWorkItem({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        reason: workItemRollbackReasonDraft.trim() || null,
        note: workItemRollbackNoteDraft.trim() || null
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemRollbackDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to roll back the work item.");
    }
  }

  async function handleCompleteWorkItemValidations(): Promise<void> {
    if (!effectiveEnvironmentId || !selectedWorkItemId) {
      setErrorMessage("Select a governed work item before updating validation status.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.completeWorkItemValidations({
        environmentId: effectiveEnvironmentId,
        workItemId: selectedWorkItemId,
        status: workItemValidationStatusDraft
      });
      setSelectedWorkItem(result.data);
      await refreshWorkWorkspaceSelection(result.data.workItemId);
      setIsWorkItemValidationDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update work item validations.");
    }
  }

  async function handleUpdateIncidentRemediationPlan(): Promise<void> {
    const incidentId = selectedIncident?.incidentId ?? selectedIncidentId;
    if (!effectiveEnvironmentId || !incidentId) {
      setErrorMessage("Select an incident before updating remediation.");
      return;
    }

    const summaryDraft = incidentRemediationSummaryDraft.trim();
    if (!summaryDraft) {
      setErrorMessage("A remediation summary is required.");
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.command.updateIncidentRemediationPlan({
        environmentId: effectiveEnvironmentId,
        incidentId,
        remediationPlan: {
          status: incidentRemediationStatusDraft,
          owner: incidentRemediationOwnerDraft.trim() || null,
          summary: summaryDraft,
          actions: draftLines(incidentRemediationActionsDraft),
          validationSteps: draftLines(incidentRemediationValidationDraft),
          blockers: draftLines(incidentRemediationBlockersDraft)
        }
      });
      setSelectedIncident(result.data);
      await loadIncidentWorkspace(effectiveEnvironmentId);
      await loadIncidentDetail(result.data.incidentId, effectiveEnvironmentId);
      setIsIncidentRemediationPlanDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update the incident remediation plan."
      );
    }
  }

  async function handleCreateProjectFromEnvironment(requestedTitleOverride?: string): Promise<void> {
    const environmentId = summary?.environmentId || binding?.environmentId || "";
    if (!environmentId) {
      setErrorMessage("Bind an environment before creating a project.");
      return;
    }

    const requestedTitle = requestedTitleOverride?.trim() || summary?.environmentLabel || environmentId;
    const { projectId, title } = makeUniqueProjectIdentity(projects, requestedTitle);
    if (!title) {
      return;
    }

    try {
      const createProject = window.sbclAgentDesktop.command.createProject;
      if (typeof createProject !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose createProject yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      const result = await createProject({
        environmentId,
        title,
        summary: "Governed project created from the desktop shell."
      });
      const createdProject: ProjectProfileDto = {
        projectId: result.data.projectId,
        title: result.data.title,
        environmentId,
        summary: result.data.summary
      };
      const nextProjects = [
        createdProject,
        ...projects.filter((project) => project.projectId !== createdProject.projectId)
      ];
      await persistProjectRegistry(nextProjects, createdProject.projectId);
      setSelectedGovernedProjectId(result.data.projectId);
      setSelectedProjectDetail(result.data);
      await loadEnvironmentBinding(environmentId);
      await loadProjectWorkspace(environmentId);
      await loadProjectDetail(result.data.projectId, environmentId);
      setIsProjectCreateDialogOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the project.");
    }
  }

  async function handleSwitchReplSession(sessionId: string): Promise<void> {
    if (!currentProjectId) {
      return;
    }

    const sessions = replSessionsByProject[currentProjectId] ?? [];
    const selectedSession = sessions.find((session) => session.sessionId === sessionId);
    if (!selectedSession) {
      return;
    }

    setRuntimeForm(selectedSession.draftForm);
    setRuntimeResult(null);
    await persistReplSessions(replSessionsByProject, {
      ...currentReplSessionIdByProject,
      [currentProjectId]: sessionId
    });
  }

  async function handleCreateReplSession(): Promise<void> {
    if (!currentProjectId || !effectiveEnvironmentId) {
      return;
    }

    const title = replSessionTitleDraft.trim();
    if (!title) {
      return;
    }

    const nextSession: ReplSessionProfileDto = {
      sessionId: `repl-${slugifyProjectLabel(title)}-${Date.now()}`,
      title,
      environmentId: effectiveEnvironmentId,
      draftForm: runtimeForm,
      packageName: runtimeSummary?.currentPackage,
      lastSummary: runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? "New project-scoped listener session."
    };
    const nextSessionsByProject = {
      ...replSessionsByProject,
      [currentProjectId]: [nextSession, ...(replSessionsByProject[currentProjectId] ?? [])]
    };

    await persistReplSessions(nextSessionsByProject, {
      ...currentReplSessionIdByProject,
      [currentProjectId]: nextSession.sessionId
    });
    setRuntimeForm(nextSession.draftForm);
    setRuntimeResult(null);
    setReplSessionTitleDraft("New Listener Session");
  }

  async function handleCreateConversationSession(): Promise<void> {
    if (!currentProjectId || !effectiveEnvironmentId) {
      return;
    }

    const title = conversationSessionTitleDraft.trim() || "New Conversation Session";
    if (!title) {
      return;
    }

    try {
      setErrorMessage(null);
      const createConversationThread = window.sbclAgentDesktop.command.createConversationThread;
      if (typeof createConversationThread !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose createConversationThread yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      const result = await createConversationThread({
        environmentId: effectiveEnvironmentId,
        title,
        summary: "Project-scoped conversation session created from the desktop shell."
      });
      await loadConversationWorkspace(effectiveEnvironmentId);
      setSelectedThreadId(result.data.threadId);
      setSelectedThread(null);
      setSelectedTurnId(null);
      setSelectedTurn(null);
      setConversationSessionTitleDraft("");
      setIsConversationSessionCreateDialogOpen(false);
      await persistConversationThreadSelection(currentProjectId, result.data.threadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create the conversation session.");
    }
  }

  async function handleRenameConversationThread(): Promise<void> {
    if (!effectiveEnvironmentId || !conversationThreadRenameTargetId) {
      return;
    }

    const title = conversationThreadRenameDraft.trim();
    if (!title) {
      return;
    }

    try {
      setErrorMessage(null);
      const updateConversationThread = window.sbclAgentDesktop.command.updateConversationThread;
      if (typeof updateConversationThread !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose updateConversationThread yet. Restart Surface so the updated preload bundle is loaded."
        );
      }
      await updateConversationThread({
        environmentId: effectiveEnvironmentId,
        threadId: conversationThreadRenameTargetId,
        title
      });
      await loadConversationWorkspace(effectiveEnvironmentId);
      await loadThreadDetail(conversationThreadRenameTargetId, effectiveEnvironmentId);
      setConversationThreadRenameDraft("");
      setConversationThreadRenameTargetId(null);
      setIsConversationThreadRenameDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to rename the conversation session.");
    }
  }

  async function handleConversationAttachmentSelection(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setConversationSendError(null);
      const nextAttachments = await Promise.all(
        Array.from(files).map((file, index) => conversationAttachmentFromFile(file, index))
      );
      setConversationAttachments((current) => [...current, ...nextAttachments]);
    } catch (error) {
      setConversationSendError(
        error instanceof Error ? error.message : "Failed to prepare the selected conversation attachments."
      );
    }
  }

  function removeConversationAttachment(attachmentId: string): void {
    setConversationAttachments((current) =>
      current.filter((attachment) => attachment.attachmentId !== attachmentId)
    );
  }

  async function handleSendConversationMessage(): Promise<void> {
    if (
      !effectiveEnvironmentId ||
      !selectedThreadId ||
      (conversationDraft.trim().length === 0 && conversationAttachments.length === 0)
    ) {
      return;
    }

    const currentThreadId = selectedThreadId;
    const priorMessageCount = selectedThread?.messages.length ?? 0;

    try {
      setIsSendingConversation(true);
      setErrorMessage(null);
      setConversationSendError(null);
      setConversationStream({
        threadId: currentThreadId,
        turnId: null,
        content: ""
      });
      const sendConversationMessage = window.sbclAgentDesktop.command.sendConversationMessage;
      if (typeof sendConversationMessage !== "function") {
        throw new Error(
          "The desktop preload bridge does not expose sendConversationMessage yet. Restart Surface so the updated preload bundle is loaded."
        );
      }

      const result = await sendConversationMessage({
        environmentId: effectiveEnvironmentId,
        threadId: currentThreadId,
        prompt: conversationDraft.trim(),
        attachments: conversationAttachments
      });
      console.info(
        "[conversation-send] status=%s threadId=%s turnId=%s attachmentCount=%d summaryLength=%d",
        result.status,
        result.data.threadId,
        result.data.turnId,
        conversationAttachments.length,
        result.data.summary?.length ?? 0
      );

      const nextThreadId =
        result.data.threadId && result.data.threadId !== "thread" ? result.data.threadId : currentThreadId;
      setSelectedThreadId(nextThreadId);
      await loadConversationWorkspace(effectiveEnvironmentId, nextThreadId);
      await loadThreadDetail(nextThreadId, effectiveEnvironmentId, {
        expectedTurnId: result.data.turnId && result.data.turnId !== "turn" ? result.data.turnId : null,
        minimumMessageCount: priorMessageCount + 1
      });
      setSelectedTurnId(result.data.turnId && result.data.turnId !== "turn" ? result.data.turnId : null);
      if (result.status === "error" || result.status === "rejected") {
        const failureSummary =
          result.data.summary || "The live provider could not complete this conversation turn.";
        setConversationStream(null);
        setConversationSendError(failureSummary);
        setErrorMessage(failureSummary);
        return;
      }
      setConversationDraft("");
      setConversationAttachments([]);
      setConversationStream(null);
      setConversationSendError(null);
    } catch (error) {
      setConversationStream(null);
      setConversationSendError(
        error instanceof Error ? error.message : "Failed to send the conversation message."
      );
      setErrorMessage(error instanceof Error ? error.message : "Failed to send the conversation message.");
    } finally {
      setIsSendingConversation(false);
    }
  }

  async function loadDocumentationPage(slug: string): Promise<void> {
    try {
      const page = await window.sbclAgentDesktop.desktop.readDocumentationPage(slug);
      setSelectedDocumentationPage(page);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load documentation page.");
    }
  }

  async function loadProjectWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.projectList(environmentId);
      setProjectListResult(result);
      setSelectedGovernedProjectId((current) => {
        if (current && result.data.projects.some((project) => project.projectId === current)) {
          return current;
        }
        if (currentProjectId && result.data.projects.some((project) => project.projectId === currentProjectId)) {
          return currentProjectId;
        }
        return result.data.currentProjectId ?? result.data.projects[0]?.projectId ?? null;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load project workspace.");
    }
  }

  async function loadProjectDetail(projectId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.projectDetail(projectId, environmentId);
      setSelectedProjectDetail(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load project detail.");
    }
  }

  async function loadConversationWorkspace(environmentId: string, preferredThreadIdOverride?: string | null): Promise<void> {
    try {
      const threadResult = await window.sbclAgentDesktop.query.threadList(environmentId);
      setThreads(threadResult.data);

      const preferredThreadId =
        preferredThreadIdOverride ??
        selectedThreadIdRef.current ??
        (currentProjectId ? selectedConversationThreadByProject[currentProjectId] : null);
      const nextThreadId =
        preferredThreadId && threadResult.data.some((thread) => thread.threadId === preferredThreadId)
          ? preferredThreadId
          : threadResult.data[0]?.threadId ?? null;
      console.info(
        "[conversation-workspace] count=%d preferredThreadId=%s nextThreadId=%s",
        threadResult.data.length,
        preferredThreadId,
        nextThreadId
      );
      setSelectedThreadId(nextThreadId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load conversation workspace.");
    }
  }

  async function loadThreadDetail(
    threadId: string,
    environmentId: string,
    expectation?: {
      expectedTurnId?: string | null;
      minimumMessageCount?: number;
    }
  ): Promise<void> {
    try {
      const expectedTurnId = expectation?.expectedTurnId ?? null;
      const minimumMessageCount = expectation?.minimumMessageCount ?? 0;
      let detailResult = await window.sbclAgentDesktop.query.threadDetail(threadId, environmentId);

      if (
        expectedTurnId ||
        minimumMessageCount > 0
      ) {
        let attemptsRemaining = 4;
        while (attemptsRemaining > 0) {
          const hasExpectedTurn =
            !expectedTurnId || detailResult.data.turns.some((turn) => turn.turnId === expectedTurnId);
          const hasExpectedMessageCount = detailResult.data.messages.length >= minimumMessageCount;
          if (hasExpectedTurn && hasExpectedMessageCount) {
            break;
          }
          await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
          detailResult = await window.sbclAgentDesktop.query.threadDetail(threadId, environmentId);
          attemptsRemaining -= 1;
        }
      }

      console.info(
        "[conversation-thread] threadId=%s messageCount=%d turnCount=%d expectedTurnId=%s minimumMessageCount=%d",
        threadId,
        detailResult.data.messages.length,
        detailResult.data.turns.length,
        expectedTurnId,
        minimumMessageCount
      );
      setSelectedThread(detailResult.data);

      const nextTurnId = selectedTurnId ?? detailResult.data.turns[0]?.turnId ?? null;
      setSelectedTurnId(nextTurnId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load thread detail.");
    }
  }

  async function loadTurnDetail(turnId: string, environmentId: string): Promise<void> {
    try {
      const detailResult = await window.sbclAgentDesktop.query.turnDetail(turnId, environmentId);
      setSelectedTurn(detailResult.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load turn detail.");
    }
  }

  async function loadRuntimeWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.runtimeSummary(environmentId);
      setRuntimeSummary(result.data);
      setSelectedPackageName((current) => current || result.data.currentPackage);
      if (currentProjectId) {
        const existingSessions = replSessionsByProject[currentProjectId] ?? [];
        if (existingSessions.length === 0) {
          const defaultSession = buildDefaultReplSession(environmentId, result.data);
          setReplSessionsByProject((current) => ({ ...current, [currentProjectId]: [defaultSession] }));
          setCurrentReplSessionIdByProject((current) => ({ ...current, [currentProjectId]: defaultSession.sessionId }));
          setRuntimeForm(defaultSession.draftForm);
        } else {
          const currentSessionId = currentReplSessionIdByProject[currentProjectId] ?? existingSessions[0]?.sessionId ?? null;
          const selectedSession = existingSessions.find((session) => session.sessionId === currentSessionId) ?? existingSessions[0] ?? null;
          if (selectedSession) {
            setRuntimeForm(selectedSession.draftForm);
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load runtime workspace.");
    }
  }

  async function loadRuntimeTelemetry(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.runtimeTelemetrySnapshot(environmentId);
      setRuntimeTelemetry(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load runtime telemetry.");
    }
  }

  async function loadConsoleLogStream(
    environmentId: string,
    plane: "environment" | "host" = selectedConsolePlane
  ): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.consoleLogStream({
        environmentId,
        plane,
        limit: 100
      });
      setConsoleLogStream(result);
      setSelectedConsoleEntryId((current) => current ?? result.data.entries[0]?.entryId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load console stream.");
    }
  }

  async function loadDiagnosticReports(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.diagnosticReportList(environmentId);
      setDiagnosticReports(result.data);
      setSelectedDiagnosticReportId((current) => current ?? result.data[0]?.reportId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load diagnostic reports.");
    }
  }

  async function loadDiagnosticReportDetail(reportId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.diagnosticReportDetail(reportId, environmentId);
      setSelectedDiagnosticReport(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load diagnostic report detail.");
    }
  }

  async function loadPackageBrowser(packageName?: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.packageBrowser({
        environmentId: effectiveEnvironmentId,
        packageName
      });
      setPackageBrowser(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Package browser load failed.");
    }
  }

  async function loadRuntimeEntityDetail(symbol: string, packageName?: string): Promise<void> {
    if (!effectiveEnvironmentId || symbol.trim().length === 0) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.runtimeEntityDetail({
        environmentId: effectiveEnvironmentId,
        symbol: symbol.trim(),
        packageName
      });
      setRuntimeEntityDetail(result);
    } catch (error) {
      setRuntimeEntityDetail(null);
    }
  }

  async function evaluateRuntimeForm(): Promise<void> {
    if (!effectiveEnvironmentId || runtimeForm.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form: runtimeForm,
        packageName: runtimeSummary?.currentPackage
      });
      setRuntimeResult(result);
      if (currentProjectId && currentReplSessionId) {
        await appendReplSessionHistoryEntry(currentProjectId, currentReplSessionId, runtimeForm, result);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  function setCurrentWorkspaceDraft(value: string): void {
    if (!currentProjectId) {
      return;
    }
    setWorkspaceDraftByProject((current) => ({
      ...current,
      [currentProjectId]: value
    }));
  }

  function setCurrentWorkspacePackage(value: string): void {
    if (!currentProjectId) {
      return;
    }
    setWorkspacePackageByProject((current) => ({
      ...current,
      [currentProjectId]: value
    }));
  }

  function updateCurrentEditorBuffers(
    updater: (buffers: EditorBufferStateDto[]) => EditorBufferStateDto[]
  ): void {
    if (!currentProjectId) {
      return;
    }
    setEditorBuffersByProject((current) => {
      const existingBuffers =
        current[currentProjectId] ?? [
          createEditorBufferState({
            bufferId: `editor-buffer-${currentProjectId}-main`,
            title: DEFAULT_EDITOR_BUFFER_TITLE,
            draft: DEFAULT_EDITOR_BOUND_DRAFT,
            packageName: runtimeSummary?.currentPackage ?? "cl-user"
          })
        ];
      const nextBuffers = updater(existingBuffers);
      if (nextBuffers === existingBuffers) {
        return current;
      }
      return {
        ...current,
        [currentProjectId]: nextBuffers
      };
    });
  }

  function setCurrentEditorBufferId(bufferId: string): void {
    if (!currentProjectId) {
      return;
    }
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: bufferId
    }));
  }

  function setCurrentEditorDraft(value: string): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              draft: value,
              dirty: true
            }
          : buffer
      )
    );
  }

  function setCurrentEditorPackage(value: string): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              packageName: value,
              dirty: true
            }
          : buffer
      )
    );
  }

  function createEditorBuffer(): void {
    if (!currentProjectId) {
      return;
    }
    const nextBuffer = createEditorBufferState({
      title: `Buffer ${currentEditorBuffers.length + 1}`,
      draft: DEFAULT_EDITOR_BOUND_DRAFT,
      packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage || "cl-user"
    });
    updateCurrentEditorBuffers((buffers) => [...buffers, nextBuffer]);
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: nextBuffer.bufferId
    }));
  }

  function cloneCurrentEditorBuffer(): void {
    if (!currentProjectId || !currentEditorBuffer) {
      return;
    }
    const nextBuffer = createEditorBufferState({
      title: `${currentEditorBuffer.title} Copy`,
      draft: currentEditorBuffer.draft,
      packageName: currentEditorBuffer.packageName,
      dirty: true,
      result: currentEditorBuffer.result,
      sourceFilePath: null
    });
    updateCurrentEditorBuffers((buffers) => [...buffers, nextBuffer]);
    setSelectedEditorBufferIdByProject((current) => ({
      ...current,
      [currentProjectId]: nextBuffer.bufferId
    }));
  }

  function deleteCurrentEditorBuffers(bufferIds: string[]): void {
    if (!currentProjectId || bufferIds.length === 0) {
      return;
    }
    const deleteIds = new Set(bufferIds);
    const remainingBuffers = currentEditorBuffers.filter((buffer) => !deleteIds.has(buffer.bufferId));
    const fallbackBuffer =
      remainingBuffers.length > 0
        ? null
        : createEditorBufferState({
            title: DEFAULT_EDITOR_BUFFER_TITLE,
            draft: DEFAULT_EDITOR_BOUND_DRAFT,
            packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage || "cl-user"
          });
    const nextBuffers = fallbackBuffer ? [fallbackBuffer] : remainingBuffers;
    const nextSelectedBufferId =
      nextBuffers.some((buffer) => buffer.bufferId === currentEditorBufferId)
        ? currentEditorBufferId
        : nextBuffers[0]?.bufferId ?? null;

    updateCurrentEditorBuffers(() => nextBuffers);
    if (nextSelectedBufferId) {
      setSelectedEditorBufferIdByProject((current) => ({
        ...current,
        [currentProjectId]: nextSelectedBufferId
      }));
    }
  }

  function acceptCurrentEditorBufferBaseline(): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              baselineDraft: buffer.draft,
              dirty: false
            }
          : buffer
      )
    );
  }

  function revertCurrentEditorBufferToBaseline(): void {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              draft: buffer.baselineDraft,
              dirty: false
            }
          : buffer
      )
    );
  }

  function openEditorSourceFileDialog(): void {
    const initialPath = sourcePreview?.data.path ?? "";
    setEditorSourceFilePathDraft(initialPath);
    setEditorSourceDirectoryPathDraft(parentDirectoryForPath(initialPath));
    setEditorSourceDirectoryListing(null);
    setIsEditorSourceFileDialogOpen(true);
    void loadEditorSourceDirectory(parentDirectoryForPath(initialPath));
  }

  function openEditorSourceFileSaveDialog(): void {
    const initialPath = currentEditorSourceFilePath ?? "";
    setEditorSourceSaveFileNameDraft(
      initialPath.trim().length > 0
        ? basenameForPath(initialPath)
        : currentEditorBufferTitle.toLowerCase().endsWith(".lisp")
          ? currentEditorBufferTitle
          : `${currentEditorBufferTitle.replace(/\s+/g, "-").toLowerCase()}.lisp`
    );
    setEditorSourceSaveDirectoryPathDraft(parentDirectoryForPath(initialPath));
    setEditorSourceSaveDirectoryListing(null);
    setIsEditorSourceFileSaveDialogOpen(true);
    void loadEditorSourceSaveDirectory(parentDirectoryForPath(initialPath));
  }

  async function loadEditorSourceDirectory(path?: string): Promise<void> {
    try {
      const fileSystemDirectory = window.sbclAgentDesktop.query.fileSystemDirectory;
      if (typeof fileSystemDirectory !== "function") {
        setErrorMessage("The running desktop host does not yet expose file browsing. Restart the desktop app so the updated preload bridge is active.");
        return;
      }
      const result = await fileSystemDirectory({
        path: path && path.trim().length > 0 ? path.trim() : undefined
      });
      setEditorSourceDirectoryListing(result.data);
      setEditorSourceDirectoryPathDraft(result.data.currentPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the source directory.");
    }
  }

  async function loadEditorSourceSaveDirectory(path?: string): Promise<void> {
    try {
      const fileSystemDirectory = window.sbclAgentDesktop.query.fileSystemDirectory;
      if (typeof fileSystemDirectory !== "function") {
        setErrorMessage("The running desktop host does not yet expose file browsing. Restart the desktop app so the updated preload bridge is active.");
        return;
      }
      const result = await fileSystemDirectory({
        path: path && path.trim().length > 0 ? path.trim() : undefined
      });
      setEditorSourceSaveDirectoryListing(result.data);
      setEditorSourceSaveDirectoryPathDraft(result.data.currentPath);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the target directory.");
    }
  }

  function navigateEditorSourceDirectory(path: string): void {
    void loadEditorSourceDirectory(path);
  }

  function navigateEditorSourceParentDirectory(): void {
    if (!editorSourceDirectoryListing?.parentPath) {
      return;
    }
    void loadEditorSourceDirectory(editorSourceDirectoryListing.parentPath);
  }

  function navigateEditorSourceSaveDirectory(path: string): void {
    void loadEditorSourceSaveDirectory(path);
  }

  function navigateEditorSourceSaveParentDirectory(): void {
    if (!editorSourceSaveDirectoryListing?.parentPath) {
      return;
    }
    void loadEditorSourceSaveDirectory(editorSourceSaveDirectoryListing.parentPath);
  }

  async function handleLoadEditorSourceFile(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || !currentEditorBufferId || editorSourceFilePathDraft.trim().length === 0) {
      return;
    }

    try {
      const path = editorSourceFilePathDraft.trim();
      const result = await window.sbclAgentDesktop.query.sourcePreview({
        environmentId: effectiveEnvironmentId,
        path,
        contextRadius: 8
      });
      setSourcePreview(result);
      updateCurrentEditorBuffers((buffers) =>
        buffers.map((buffer) =>
          buffer.bufferId === currentEditorBufferId
            ? {
                ...buffer,
              title: basenameForPath(result.data.path),
              draft: result.data.editableContent,
              baselineDraft: result.data.editableContent,
              packageName: buffer.packageName || runtimeSummary?.currentPackage || "cl-user",
              dirty: false,
              result: null,
              sourceFilePath: result.data.path
            }
          : buffer
      )
    );
    setIsEditorSourceFileDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load the source file into the editor.");
    }
  }

  async function persistCurrentEditorBufferToPath(path: string, overwrite: boolean): Promise<void> {
    if (!currentProjectId || !currentEditorBufferId) {
      return;
    }

    const result = await window.sbclAgentDesktop.command.writeSourceFile({
      path,
      content: currentEditorDraft,
      overwrite
    });
    updateCurrentEditorBuffers((buffers) =>
      buffers.map((buffer) =>
        buffer.bufferId === currentEditorBufferId
          ? {
              ...buffer,
              title: basenameForPath(result.data.path),
              baselineDraft: buffer.draft,
              dirty: false,
              sourceFilePath: result.data.path
            }
          : buffer
      )
    );

    if (effectiveEnvironmentId) {
      try {
        const preview = await window.sbclAgentDesktop.query.sourcePreview({
          environmentId: effectiveEnvironmentId,
          path: result.data.path,
          contextRadius: 8
        });
        setSourcePreview(preview);
      } catch {
        setSourcePreview((current) =>
          current
            ? {
                ...current,
                data: {
                  ...current.data,
                  path: result.data.path,
                  editableContent: currentEditorDraft,
                  content: currentEditorDraft,
                  summary: `Source preview for ${result.data.path}.`
                }
              }
            : current
        );
      }
    }
  }

  async function handleSaveCurrentEditorBuffer(): Promise<void> {
    if (!currentEditorSourceFilePath) {
      openEditorSourceFileSaveDialog();
      return;
    }

    try {
      const confirmed = window.confirm(`Overwrite existing source file?\n\n${currentEditorSourceFilePath}`);
      if (!confirmed) {
        return;
      }
      await persistCurrentEditorBufferToPath(currentEditorSourceFilePath, true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the editor buffer.");
    }
  }

  async function handleSaveCurrentEditorBufferAs(): Promise<void> {
    const targetPath = joinDirectoryAndFileName(editorSourceSaveDirectoryPathDraft, editorSourceSaveFileNameDraft);
    if (targetPath.trim().length === 0) {
      return;
    }

    try {
      const fileAlreadyExists = editorSourceSaveDirectoryListing?.files.some((entry) => entry.path === targetPath) ?? false;
      if (fileAlreadyExists) {
        const confirmed = window.confirm(`Overwrite existing source file?\n\n${targetPath}`);
        if (!confirmed) {
          return;
        }
      }
      await persistCurrentEditorBufferToPath(targetPath, fileAlreadyExists);
      setIsEditorSourceFileSaveDialogOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save the editor buffer.");
    }
  }

  async function evaluateEditorBuffer(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || !currentEditorBufferId || currentEditorDraft.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form: currentEditorDraft,
        packageName: currentEditorPackage.trim() || runtimeSummary?.currentPackage
      });
      updateCurrentEditorBuffers((buffers) =>
        buffers.map((buffer) =>
          buffer.bufferId === currentEditorBufferId
            ? {
                ...buffer,
                result
              }
            : buffer
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Editor evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function evaluateWorkspaceForm(): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || currentWorkspaceDraft.trim().length === 0) {
      return;
    }

    await evaluateWorkspaceSource(currentWorkspaceDraft);
  }

  async function evaluateWorkspaceSource(form: string): Promise<void> {
    if (!effectiveEnvironmentId || !currentProjectId || form.trim().length === 0) {
      return;
    }

    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.evaluateInContext({
        environmentId: effectiveEnvironmentId,
        form,
        packageName: currentWorkspacePackage.trim() || runtimeSummary?.currentPackage
      });
      setWorkspaceResultByProject((current) => ({
        ...current,
        [currentProjectId]: result
      }));
      setWorkspaceHistoryByProject((current) => ({
        ...current,
        [currentProjectId]: [
          {
            entryId: `workspace:${Date.now()}`,
            timestamp: new Date().toISOString(),
            form,
            status: result.status,
            summary: result.data.summary,
            valuePreview: result.data.valuePreview ?? null
          },
          ...(current[currentProjectId] ?? [])
        ].slice(0, 12)
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Workspace evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function performRuntimeInspection(input: {
    symbol: string;
    packageName?: string;
    mode: RuntimeInspectionMode;
  }): Promise<void> {
    if (!effectiveEnvironmentId || input.symbol.trim().length === 0) {
      return;
    }

    setIsInspectingRuntime(true);
    setErrorMessage(null);
    if (input.packageName && input.packageName.trim().length > 0) {
      setSelectedPackageName(input.packageName.trim());
    }

    try {
      const result = await window.sbclAgentDesktop.query.runtimeInspectSymbol({
        environmentId: effectiveEnvironmentId,
        symbol: input.symbol.trim(),
        packageName:
          input.packageName && input.packageName.trim().length > 0
            ? input.packageName.trim()
            : runtimeSummary?.currentPackage,
        mode: input.mode
      });
      setRuntimeInspection(result);
      if (result.data.packageName && result.data.packageName.trim().length > 0) {
        setSelectedPackageName(result.data.packageName);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime inspection failed.");
    } finally {
      setIsInspectingRuntime(false);
    }
  }

  async function inspectRuntimeSymbol(): Promise<void> {
    await performRuntimeInspection({
      symbol: runtimeInspectorSymbolRef.current,
      packageName: runtimeInspectorPackageRef.current,
      mode: runtimeInspectionModeRef.current
    });
  }

  async function browseRuntimeEntity(
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ): Promise<void> {
    updateRuntimeInspectorSymbol(symbol);
    updateRuntimeInspectorPackage(packageName ?? "");
    updateRuntimeInspectionMode(mode);
    if (packageName && packageName.trim().length > 0) {
      setSelectedPackageName(packageName);
    }
    setRuntimeForm(
      buildListenerForm({
        symbol,
        packageName,
        mode
      })
    );
    await performRuntimeInspection({ symbol, packageName, mode });
  }

  async function loadSourcePreview(path: string, line?: number): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }

    try {
      const result = await window.sbclAgentDesktop.query.sourcePreview({
        environmentId: effectiveEnvironmentId,
        path,
        line,
        contextRadius: 8
      });
      setSourcePreview(result);
      setRuntimeForm(
        buildListenerForm({
          symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbolRef.current,
          packageName:
            runtimeInspection?.data.packageName ??
            runtimeEntityDetail?.data.packageName ??
            runtimeInspectorPackageRef.current,
          mode: runtimeInspectionModeRef.current,
          sourcePath: path,
          line
        })
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source preview failed.");
    }
  }

  async function stageSourceChange(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsStagingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.stageSourceChange({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path,
        content: sourceDraft
      });
      setSourceMutationResult(result);
      setIsEditingSource(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Source stage change failed.");
    } finally {
      setIsStagingSource(false);
    }
  }

  async function reloadSourceFile(): Promise<void> {
    if (!effectiveEnvironmentId || !sourcePreview?.data.path) {
      return;
    }

    setIsReloadingSource(true);
    setErrorMessage(null);

    try {
      const result = await window.sbclAgentDesktop.command.reloadSourceFile({
        environmentId: effectiveEnvironmentId,
        path: sourcePreview.data.path
      });
      setSourceReloadResult(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Runtime reload failed.");
    } finally {
      setIsReloadingSource(false);
    }
  }

  async function loadApprovalWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.approvalRequestList(environmentId);
      setApprovalRequests(result.data);
      setSelectedApprovalId((current) => current ?? result.data[0]?.requestId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load approvals workspace.");
    }
  }

  async function loadApprovalDetail(requestId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.approvalRequestDetail(requestId, environmentId);
      setSelectedApproval(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load approval detail.");
    }
  }

  async function submitApprovalDecisionForRequest(
    requestId: string,
    decision: "approve" | "deny"
  ): Promise<void> {
    if (!effectiveEnvironmentId || !requestId) {
      return;
    }

    setIsDecidingApproval(true);
    setErrorMessage(null);

    const input: ApprovalDecisionInput = {
      environmentId: effectiveEnvironmentId,
      requestId
    };

    try {
      const result =
        decision === "approve"
          ? await window.sbclAgentDesktop.command.approveRequest(input)
          : await window.sbclAgentDesktop.command.denyRequest(input);
      setApprovalDecision(result);
      await loadApprovalWorkspace(effectiveEnvironmentId);
      await loadApprovalDetail(requestId, effectiveEnvironmentId);
      await loadWorkWorkspace(effectiveEnvironmentId);
      if (decision === "approve") {
        await loadProjectWorkspace(effectiveEnvironmentId);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Approval decision failed.");
    } finally {
      setIsDecidingApproval(false);
    }
  }

  async function submitApprovalDecision(decision: "approve" | "deny"): Promise<void> {
    if (!selectedApprovalId) {
      return;
    }

    await submitApprovalDecisionForRequest(selectedApprovalId, decision);
  }
  async function loadIncidentWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentList(environmentId);
      setIncidents(result.data);
      setSelectedIncidentId((current) => current ?? result.data[0]?.incidentId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incidents workspace.");
    }
  }

  async function loadIncidentDetail(incidentId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.incidentDetail(incidentId, environmentId);
      setSelectedIncident(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load incident detail.");
    }
  }

  async function loadWorkWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.workItemList(environmentId);
      setWorkItems(result.data);
      setSelectedWorkItemId((current) => current ?? result.data[0]?.workItemId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load work workspace.");
    }
  }

  async function loadWorkItemDetail(workItemId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.workItemDetail(workItemId, environmentId);
      setSelectedWorkItem(result.data);
      const plan = await window.sbclAgentDesktop.query.workItemPlan(workItemId, environmentId);
      setSelectedWorkItemPlan(plan.data);
      const workflow = await window.sbclAgentDesktop.query.workflowRecordDetail(result.data.workflowRecordId, environmentId);
      setSelectedWorkflowRecord(workflow.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load work item detail.");
    }
  }

  async function refreshWorkWorkspaceSelection(workItemId: string | null): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await loadWorkWorkspace(effectiveEnvironmentId);
    if (workItemId) {
      await loadWorkItemDetail(workItemId, effectiveEnvironmentId);
    }
  }

  async function loadActivityWorkspace(environmentId: string): Promise<void> {
    try {
      const input: EventSubscriptionInput = {
        environmentId,
        families: eventFamilyFilter === "all" ? undefined : [eventFamilyFilter],
        visibility: eventVisibilityFilter === "all" ? undefined : [eventVisibilityFilter]
      };
      const result = await window.sbclAgentDesktop.query.environmentEvents(input);
      setEnvironmentEvents(result.data);
      setSelectedEventCursor((current) => current ?? result.data[0]?.cursor ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load activity workspace.");
    }
  }

  async function loadArtifactsWorkspace(environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactList(environmentId);
      setArtifacts(result.data);
      setSelectedArtifactId((current) => current ?? result.data[0]?.artifactId ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifacts workspace.");
    }
  }

  async function loadArtifactDetail(artifactId: string, environmentId: string): Promise<void> {
    try {
      const result = await window.sbclAgentDesktop.query.artifactDetail(artifactId, environmentId);
      setSelectedArtifact(result.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load artifact detail.");
    }
  }

  const selectedEvent = useMemo(
    () => environmentEvents.find((event) => event.cursor === selectedEventCursor) ?? null,
    [environmentEvents, selectedEventCursor]
  );

  const globalAttentionItems = useMemo<GlobalAttentionItem[]>(() => {
    if (!summary || !status) {
      return [];
    }

    const items: GlobalAttentionItem[] = [
      {
        id: "approvals-awaiting",
        label: "Approvals Awaiting",
        summary: "Governed actions are paused until explicit approval decisions are made.",
        value: summary.attention.approvalsAwaiting,
        workspace: "runtime",
        tone: summary.attention.approvalsAwaiting > 0 ? "warning" : "steady"
      },
      {
        id: "open-incidents",
        label: "Open Incidents",
        summary: "Failure and recovery obligations are active and remain durable operator work.",
        value: summary.attention.openIncidents,
        workspace: "incidents",
        tone: summary.attention.openIncidents > 0 ? "danger" : "steady"
      },
      {
        id: "blocked-work",
        label: "Blocked Work",
        summary: "Execution success is not enough; blocked workflow obligations still prevent closure.",
        value: summary.attention.blockedWork,
        workspace: "runtime",
        tone: summary.attention.blockedWork > 0 ? "warning" : "steady"
      },
      {
        id: "interrupted-turns",
        label: "Interrupted Turns",
        summary: "Structured conversation state contains interrupted or deferred turns that still matter.",
        value: summary.attention.interruptedTurns,
        workspace: "conversations",
        tone: summary.attention.interruptedTurns > 0 ? "warning" : "steady"
      },
      {
        id: "active-streams",
        label: "Active Streams",
        summary: "Observation is live and should remain legible across the environment, not buried in logs.",
        value: summary.attention.activeStreams,
        workspace: "artifacts",
        tone: summary.attention.activeStreams > 0 ? "active" : "steady"
      },
      {
        id: "runtime-posture",
        label: "Runtime Posture",
        summary:
          status.runtimeState === "recovering"
            ? "The runtime is recovering and needs direct attention before normal mutation resumes."
            : "The runtime is warm, but its current state still needs to remain governed and inspectable.",
        value: status.runtimeState === "recovering" ? 1 : 0,
        workspace: "runtime",
        tone: status.runtimeState === "recovering" ? "danger" : "active"
      },
      {
        id: "artifact-surface",
        label: "Artifact Surface",
        summary: "Recent durable outputs and evidence remain available as first-class engineering objects.",
        value: summary.recentArtifacts.length,
        workspace: "artifacts",
        tone: summary.recentArtifacts.length > 0 ? "active" : "steady"
      }
    ];

    return items.sort((left, right) => attentionToneWeight(right.tone) - attentionToneWeight(left.tone) || right.value - left.value);
  }, [status, summary]);

  const workspaceAttention = useMemo(() => {
    const base = new Map<WorkspaceId, SignalCounts>();

    for (const workspace of workspaceOrder.filter((item) => item.primary)) {
      base.set(workspace.id, { red: 0, yellow: 0, blue: 0 });
    }

    for (const item of globalAttentionItems) {
      const journeyWorkspace = topLevelJourneyWorkspace(canonicalWorkspace(item.workspace));
      const current = base.get(journeyWorkspace);
      const priority = signalPriorityForTone(item.tone);
      if (!current || !priority || item.value <= 0) {
        continue;
      }
      current[priority] += item.value;
    }

    return base;
  }, [globalAttentionItems]);

  const pageSignalCounts = useMemo<SignalCounts>(
    () => signalCountsForWorkspace(activeWorkspace, globalAttentionItems),
    [activeWorkspace, globalAttentionItems]
  );
  const operateSectionSignals = useMemo(
    () =>
      new Map<OperateSection, SignalCounts>([
        [
          "orientation",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "runtime-posture"))
        ],
        [
          "journeys",
          signalCountsFromItems(
            globalAttentionItems.filter((item) =>
              ["approvals-awaiting", "open-incidents", "blocked-work", "interrupted-turns"].includes(item.id)
            )
          )
        ],
        [
          "evidence",
          signalCountsFromItems(
            globalAttentionItems.filter((item) => ["active-streams", "artifact-surface"].includes(item.id))
          )
        ]
      ]),
    [globalAttentionItems]
  );
  const executionSectionSignals = useMemo(
    () =>
      new Map<ExecutionSection, SignalCounts>([
        [
          "listener",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "runtime-posture"))
        ],
        [
          "approvals",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "approvals-awaiting"))
        ],
        [
          "work",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "blocked-work"))
        ]
      ]),
    [globalAttentionItems]
  );
  const recoverySectionSignals = useMemo(
    () =>
      new Map<RecoverySection, SignalCounts>([
        [
          "incidents",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "open-incidents"))
        ]
      ]),
    [globalAttentionItems]
  );
  const evidenceSectionSignals = useMemo(
    () =>
      new Map<EvidenceSection, SignalCounts>([
        [
          "artifacts",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "artifact-surface"))
        ],
        [
          "observation",
          signalCountsFromItems(globalAttentionItems.filter((item) => item.id === "active-streams"))
        ]
      ]),
    [globalAttentionItems]
  );
  const centerAttentionSignals = useMemo<DesktopAttentionSignal[]>(() => {
    const items: DesktopAttentionSignal[] = [];

    const appendSignal = (
      id: string,
      label: string,
      summary: string,
      counts: SignalCounts | undefined,
      glyphClassName: string,
      onOpen: () => void
    ): void => {
      const signal = counts ?? { red: 0, yellow: 0, blue: 0 };
      const total = signal.red + signal.yellow + signal.blue;
      if (total <= 0) {
        return;
      }

      const priority = signal.red > 0 ? "red" : signal.yellow > 0 ? "yellow" : "green";
      const priorityLabel =
        priority === "red" ? "High priority" : priority === "yellow" ? "Medium priority" : "Low priority";

      items.push({
        id,
        label,
        tooltip: `${label}: ${priorityLabel} attention (${total} active). ${summary}`,
        glyphClassName,
        priority,
        onOpen
      });
    };

    appendSignal(
      "orientation",
      "Orientation",
      "Open the current environment posture and active continuation context.",
      operateSectionSignals.get("orientation"),
      "desktop-window-notification-glyph-orientation",
      () => {
        openDesktopWindow("window:operate-surface");
        void navigateToOperateSection("orientation");
      }
    );
    appendSignal(
      "journeys",
      "Journeys",
      "Open the governed journey selection where blocked work, incidents, and approvals are ranked.",
      operateSectionSignals.get("journeys"),
      "desktop-window-notification-glyph-journeys",
      () => {
        openDesktopWindow("window:operate-surface");
        void navigateToOperateSection("journeys");
      }
    );
    appendSignal(
      "evidence",
      "Evidence",
      "Open the evidence and observation surface that currently requires attention.",
      operateSectionSignals.get("evidence"),
      "desktop-window-notification-glyph-evidence",
      () => {
        openDesktopWindow("window:operate-surface");
        void navigateToOperateSection("evidence");
      }
    );
    appendSignal(
      "conversations",
      "Conversations",
      "Open the structured conversation surface that currently needs direct continuity work.",
      workspaceAttention.get("conversations"),
      "desktop-window-notification-glyph-conversations",
      () => {
        void navigateToConversationSection("threads");
      }
    );

    return items;
  }, [operateSectionSignals, workspaceAttention]);

  const workspaceDescriptor = useMemo<WorkspaceDescriptor>(() => {
    switch (activeWorkspace) {
      case "environment":
        return {
          eyebrow: "Operate",
          title: "Operational Brief",
          summary: "Start from the environment, understand the active continuation, and move into the next supervised action without reconstructing the system from scattered panels."
        };
      case "projects":
        return {
          eyebrow: "Projects",
          title: "Governed SDLC Context",
          summary: "Projects bind constitutions, requirements, journeys, design rules, architecture, and execution evidence into one governed product context."
        };
      case "conversations":
        return {
          eyebrow: "Conversations",
          title: "Thread Continuity",
          summary: "Conversations are durable work objects. Turns, approvals, incidents, and evidence stay attached to the active thread instead of being split into separate operational silos."
        };
      case "editor":
        return {
          eyebrow: "Editor",
          title: "Sustained Editing Surface",
          summary: "Editor is the sustained Lisp editing instrument for longer-lived source and form work, distinct from scratch workspace evaluation and from Browser-local inspection."
        };
      case "workspace":
        return {
          eyebrow: "Workspace",
          title: "Scratch Lisp Surface",
          summary: "Workspace is the deliberate scratch surface for drafting forms, evaluating them under governance, and retaining useful results without forcing that work into either thread supervision or execution-journey posture."
        };
      case "transcript":
        return {
          eyebrow: "Transcript",
          title: "Durable Output Stream",
          summary: "Transcript is the durable cross-surface output lane for runtime evaluations, workspace results, and environment events so feedback stays ambient and inspectable instead of buried inside individual instruments."
        };
      case "browser":
        return {
          eyebrow: "Browser",
          title: "Live System Browser",
          summary: "Browse the living Lisp environment through systems, packages, symbols, source, and governed artifacts instead of collapsing back into a file-first IDE."
        };
      case "configuration":
        return {
          eyebrow: "Configuration",
          title: "Desktop Preferences",
          summary: "Configuration should shape the desktop shell itself without turning into a buried afterthought beneath the operational journeys."
        };
      case "documentation":
        return {
          eyebrow: "Documentation",
          title: "User Documentation",
          summary: "Documentation belongs in its own workspace so the user can deliberately enter guidance when needed, while the rest of the desktop stays focused on operating surfaces."
        };
      case "runtime":
        return {
          eyebrow: "Execution",
          title: "Runtime And Governed Work",
          summary: "Execution brings runtime state, governed work, and approval consequences together so the user can act through one journey instead of hopping between adjacent queues."
        };
      case "incidents":
        return {
          eyebrow: "Recovery",
          title: "Incident And Restoration",
          summary: "Recovery is a journey: inspect failure, understand blocked work, review evidence, and drive the environment back toward trustworthy continuation."
        };
      case "artifacts":
        return {
          eyebrow: "Evidence",
          title: "Artifacts And Observation",
          summary: "Evidence combines durable artifacts with replayable event history so the user can inspect provenance and operational truth without leaving the current method."
        };
      default:
        return {
          eyebrow: "Workspace",
          title: labelForWorkspace(canonicalWorkspace(activeWorkspace)),
          summary: "This workspace remains aligned to the environment-first operating model."
        };
    }
  }, [activeWorkspace]);

  const activeHostedAppDescriptor = useMemo<HostedAppDescriptor>(
    () => hostedApps.find((app) => app.id === activeHostedApp) ?? hostedApps[0],
    [activeHostedApp]
  );

  const shellCurrentSurfaceSummary = useMemo(() => {
    const panelLabel =
      desktopModel?.activePanel === "display"
        ? "Display Surface"
        : desktopModel?.activePanel === "inspector"
            ? "Inspector"
            : desktopModel?.activePanel === "governance"
              ? "Operate Surface"
            : desktopModel?.activePanel === "object-browser"
              ? "Object Browser"
              : activeHostedApp === "control-panel"
                ? "Control Panel Surface"
                : `${activeHostedAppDescriptor.label} Surface`;
    return {
      panelLabel,
      summary:
        activeHostedApp === "control-panel"
          ? `${panelLabel} is currently anchored to the Control Panel with governed attention routed through the desktop shell.`
          : `${panelLabel} is currently anchored to ${activeHostedAppDescriptor.label} while the shell routes governed attention through the desktop.`
    };
  }, [activeHostedApp, activeHostedAppDescriptor.label, desktopModel?.activePanel]);

  const selectedBrowserDomainDescriptor = useMemo(
    () => browserDomains.find((domain) => domain.id === selectedBrowserDomain) ?? browserDomains[0],
    [selectedBrowserDomain]
  );

  const selectedOperateSurfaceDescriptor = useMemo(() => {
    if (activeWorkspace === "runtime") {
      return executionSections.find((section) => section.id === selectedExecutionSection) ?? executionSections[0];
    }

    if (activeWorkspace === "incidents") {
      return recoverySections.find((section) => section.id === selectedRecoverySection) ?? recoverySections[0];
    }

    if (activeWorkspace === "artifacts") {
      return evidenceSections.find((section) => section.id === selectedEvidenceSection) ?? evidenceSections[0];
    }

    return operateSections.find((section) => section.id === selectedOperateSection) ?? operateSections[0];
  }, [
    activeWorkspace,
    selectedEvidenceSection,
    selectedExecutionSection,
    selectedOperateSection,
    selectedRecoverySection
  ]);

  const browserSurfaceEntries = useMemo<BrowserSurfaceEntry[]>(() => {
    switch (selectedBrowserDomain) {
      case "systems":
        return (runtimeSummary?.loadedSystemEntries ?? []).slice(0, 4).map((system) => ({
          key: system.name,
          title: system.name,
          detail: system.status,
          meta: system.type === "asdf-system" ? "ASDF system" : "System"
        }));
      case "packages": {
        const packageNames = Array.from(
          new Set([
            runtimeSummary?.currentPackage,
            packageBrowser?.data.packageName,
            ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
          ].filter((value): value is string => Boolean(value)))
        );
        return packageNames.slice(0, 4).map((packageName) => ({
          key: packageName,
          title: packageName,
          detail:
            packageName === packageBrowser?.data.packageName
              ? packageBrowser?.data.summary ?? "Current package browser target."
              : "Available package surface in the live image.",
          meta: packageName === runtimeSummary?.currentPackage ? "Current package" : "Package"
        }));
      }
      case "symbols": {
        const symbols = [
          ...(packageBrowser?.data.externalSymbols ?? []),
          ...(packageBrowser?.data.internalSymbols ?? [])
        ];
        return symbols.slice(0, 4).map((symbol) => ({
          key: `${symbol.visibility}:${symbol.symbol}`,
          title: symbol.symbol,
          detail: symbol.kind,
          meta: symbol.visibility
        }));
      }
      case "classes-methods": {
        const symbols = [
          ...(packageBrowser?.data.externalSymbols ?? []),
          ...(packageBrowser?.data.internalSymbols ?? [])
        ].filter((symbol) => symbol.kind === "class" || symbol.kind === "generic-function");
        return symbols.slice(0, 4).map((symbol) => ({
          key: `${symbol.kind}:${symbol.symbol}`,
          title: symbol.symbol,
          detail: symbol.kind === "class" ? "Class" : "Generic function",
          meta: "Live entity"
        }));
      }
      case "runtime-objects":
        return (runtimeSummary?.scopes ?? []).slice(0, 4).map((scope) => ({
          key: scope.scopeId,
          title: scope.symbolName ?? scope.packageName,
          detail: scope.summary,
          meta: scope.kind
        }));
      case "console":
        return (consoleLogStream?.data.entries ?? []).slice(0, 4).map((entry) => ({
          key: entry.entryId,
          title: entry.source,
          detail: entry.message,
          meta: entry.type
        }));
      case "diagnostics":
        return diagnosticReports.slice(0, 4).map((report) => ({
          key: report.reportId,
          title: report.title,
          detail: report.summary,
          meta: report.kind
        }));
      case "processes":
        return (runtimeTelemetry?.processes ?? []).slice(0, 4).map((process) => ({
          key: process.processId,
          title: process.label,
          detail: process.summary,
          meta: process.state
        }));
      case "performance":
        return [
          {
            key: "cpu",
            title: "CPU Posture",
            detail: runtimeTelemetry?.cpu.summary ?? "CPU telemetry is not yet available.",
            meta:
              runtimeTelemetry?.cpu.utilizationPercent != null
                ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%`
                : "n/a"
          },
          {
            key: "memory",
            title: "Memory Posture",
            detail: runtimeTelemetry?.memory.summary ?? "Memory telemetry is not yet available.",
            meta:
              runtimeTelemetry?.memory.rssMb != null
                ? `${runtimeTelemetry.memory.rssMb.toFixed(1)} MB`
                : "n/a"
          }
        ];
      case "host-io":
        return [
          {
            key: "network",
            title: "Network",
            detail: runtimeTelemetry?.network.summary ?? "Network telemetry is not yet available.",
            meta:
              runtimeTelemetry?.network.openConnectionCount != null
                ? `${runtimeTelemetry.network.openConnectionCount} open`
                : "n/a"
          },
          {
            key: "disk",
            title: "Disk I/O",
            detail: runtimeTelemetry?.disk.summary ?? "Disk telemetry is not yet available.",
            meta:
              runtimeTelemetry?.disk.readKbps != null || runtimeTelemetry?.disk.writeKbps != null
                ? `${runtimeTelemetry.disk.readKbps ?? 0}/${runtimeTelemetry.disk.writeKbps ?? 0} KB/s`
                : "n/a"
          }
        ];
      case "source": {
        const sourceEntries = [
          ...(runtimeEntityDetail?.data.relatedItems ?? []),
          ...(runtimeInspection?.data.items ?? [])
        ].filter((item, index, items) => Boolean(item.path) && items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index);
        return sourceEntries.slice(0, 4).map((entry) => ({
          key: `${entry.path}:${entry.line ?? 0}`,
          title: entry.label,
          detail: entry.path ?? "No source path",
          meta: entry.line ? `Line ${entry.line}` : entry.emphasis ?? "Source"
        }));
      }
      case "xref":
        return (runtimeEntityDetail?.data.relatedItems ?? []).slice(0, 4).map((item, index) => ({
          key: `${item.label}:${item.path ?? index}`,
          title: item.label,
          detail: item.detail,
          meta: item.emphasis ?? "Reference"
        }));
      case "governance":
        return [
          ...approvalRequests.slice(0, 2).map((request) => ({
            key: request.requestId,
            title: request.title,
            detail: request.summary,
            meta: request.state
          })),
          ...incidents.slice(0, 1).map((incident) => ({
            key: incident.incidentId,
            title: incident.title,
            detail: `Severity ${incident.severity}`,
            meta: incident.state
          })),
          ...workItems.slice(0, 1).map((item) => ({
            key: item.workItemId,
            title: item.title,
            detail: item.waitingReason ?? "Governed work remains attached to this environment.",
            meta: item.state
          }))
        ].slice(0, 4);
      case "linked-conversations":
        return threads.slice(0, 4).map((thread) => ({
          key: thread.threadId,
          title: thread.title,
          detail: thread.summary,
          meta: thread.state
        }));
      case "documentation":
        return [
          {
            key: "focus",
            title: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? "Current Focus",
            detail:
              runtimeInspection?.data.summary ??
              runtimeEntityDetail?.data.summary ??
              "No focused entity summary is available yet.",
            meta: "Runtime focus"
          },
          {
            key: "package",
            title: packageBrowser?.data.packageName ?? runtimeSummary?.currentPackage ?? "Package Context",
            detail:
              packageBrowser?.data.summary ??
              "Package-linked documentation becomes available when a package is selected.",
            meta: "Package"
          },
          {
            key: "source",
            title: sourcePreview?.data.path ?? "Source Relationship",
            detail:
              sourcePreview?.data.summary ??
              runtimeSummary?.sourceRelationship ??
              "Source-backed documentation becomes available when a source artifact is in focus.",
            meta: "Source"
          }
        ];
      default:
        return [];
    }
  }, [approvalRequests, consoleLogStream, diagnosticReports, incidents, packageBrowser, runtimeEntityDetail, runtimeInspection, runtimeSummary, runtimeTelemetry, selectedBrowserDomain, sourcePreview, threads, workItems]);
  const shellProactiveLead = useMemo(
    () => globalAttentionItems.find((item) => item.value > 0) ?? globalAttentionItems[0] ?? null,
    [globalAttentionItems]
  );

  const shellRecommendedTargets = useMemo(() => rankedDockJumpTargets.slice(0, 4), [rankedDockJumpTargets]);
  const shellMonitorItems = useMemo(
    () => globalAttentionItems.filter((item) => item.value > 0).slice(0, 5),
    [globalAttentionItems]
  );
  const governedAttentionSignalCount = useMemo(
    () => shellRecommendedTargets.length + shellMonitorItems.length + dashboardActionQueue.length,
    [dashboardActionQueue.length, shellMonitorItems.length, shellRecommendedTargets.length]
  );

  const workspaceResolution = useMemo<WorkspaceResolutionState | null>(() => {
    switch (canonicalWorkspace(activeWorkspace)) {
      case "projects":
        if (!(projectListResult?.data.projects.length ?? 0)) {
          return {
            label: "Resolving governed projects",
            summary: "The desktop is loading project constitutions, requirements, journeys, and linked SDLC evidence.",
            tone: "warning"
          };
        }
        if (selectedGovernedProjectId && !selectedProjectDetail) {
          return {
            label: "Resolving project detail",
            summary: "The selected project record is still attaching constitution, requirements, architecture, and linked evidence.",
            tone: "warning"
          };
        }
        return null;
      case "conversations":
        if (!selectedThread) {
          return {
            label: "Resolving thread continuity",
            summary: "The desktop is selecting the active thread and turn so conversation continuity stays explicit.",
            tone: "warning"
          };
        }
        if (!selectedTurn) {
          return {
            label: "Resolving turn context",
            summary: "Turn detail is still being attached to the current thread continuation.",
            tone: "warning"
          };
        }
        return null;
      case "browser":
        if (!runtimeSummary) {
          return {
            label: "Resolving browser runtime",
            summary: "The browser is attaching to the current live image before source and symbols can be browsed.",
            tone: "warning"
          };
        }
        return null;
      case "runtime":
        if (!runtimeSummary) {
          return {
            label: "Resolving runtime posture",
            summary: "Execution is still attaching the live image, work state, and approval posture to the current objective.",
            tone: "warning"
          };
        }
        if (workItems.length > 0 && !selectedWorkItem) {
          return {
            label: "Resolving governed work",
            summary: "The current execution item is still being attached to workflow closure posture.",
            tone: "warning"
          };
        }
        return null;
      case "incidents":
        if (incidents.length > 0 && !selectedIncident) {
          return {
            label: "Resolving recovery context",
            summary: "Recovery is still attaching the selected incident to linked runtime and evidence context.",
            tone: "danger"
          };
        }
        return null;
      case "artifacts":
        if (artifacts.length > 0 && !selectedArtifact) {
          return {
            label: "Resolving evidence context",
            summary: "Durable evidence is still being attached to its producing context.",
            tone: "active"
          };
        }
        if (environmentEvents.length > 0 && !selectedEvent) {
          return {
            label: "Resolving event replay",
            summary: "Observation history is still selecting the current event payload for inspection.",
            tone: "active"
          };
        }
        return null;
      default:
        return null;
    }
  }, [
    activeWorkspace,
    artifacts.length,
    environmentEvents.length,
    incidents.length,
    projectListResult?.data.projects.length,
    runtimeSummary,
    selectedArtifact,
    selectedEvent,
    selectedGovernedProjectId,
    selectedIncident,
    selectedProjectDetail,
    selectedThread,
    selectedTurn,
    selectedWorkItem,
    workItems.length
  ]);

  async function navigateToWorkspace(workspace: WorkspaceId): Promise<void> {
    const nextWorkspace = canonicalWorkspace(workspace);
    setActiveHostedApp("control-panel");
    setActiveWorkspace(nextWorkspace);
    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    const nextPanelId = workspaceToDesktopPanelId(nextWorkspace);

    const actionPromise = environmentId
      ? window.sbclAgentDesktop.command.desktopAction({
          environmentId,
          actionKind: "activate-panel",
          panelId: nextPanelId
        })
      : Promise.resolve(null);

    const [desktopActionResult] = await Promise.all([
      actionPromise,
      window.sbclAgentDesktop.desktop.focusWorkspace(nextWorkspace),
      window.sbclAgentDesktop.desktop.setDesktopPreferences({ lastWorkspace: nextWorkspace })
    ]);

    if (desktopActionResult?.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
      setActiveWorkspace(
        nextPanelId === "workspace" || nextPanelId === "display"
          ? nextWorkspace
          : desktopPanelToWorkspaceId(desktopActionResult.data.desktopModel.activePanel, nextWorkspace)
      );
    }
  }

  async function navigateToHostedApp(appId: HostedAppId): Promise<void> {
    focusDesktopWindow(appId === "listener-workbench" ? "window:listener-workbench" : "window:control-panel");
    updateActiveDesktopWindows((current) =>
      updateWindowState(current, appId === "listener-workbench" ? "window:listener-workbench" : "window:control-panel", "open")
    );
    setActiveHostedApp(appId);
    if (appId === "control-panel") {
      await navigateToWorkspace(activeWorkspace);
    }
  }

  function workspaceForDesktopWindow(window: DesktopWindowRecord): WorkspaceId | null {
    switch (window.id) {
      case "window:browser-surface":
        return "browser";
      case "window:projects-surface":
        return "projects";
      case "window:editor-surface":
        return "editor";
      case "window:workspace-surface":
        return "workspace";
      case "window:transcript-surface":
        return "transcript";
      case "window:configuration-surface":
        return "configuration";
      case "window:conversations-surface":
        return "conversations";
      default:
        return null;
    }
  }

  async function toggleInspectorPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "toggle_right_rail" }));
  }

  async function toggleCanvasPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "toggle_canvas" }));
  }

  async function toggleSidebarPinned(): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({
      type: "toggle_left_rail",
      defaultExpandedWidth: shellSidebarDefaultWidthForViewport(viewportWidth)
    }));
  }

  function activateShellRailPanel(rail: "left" | "right", panelId: ShellDockPanelId): void {
    applyShellLayoutAction({ type: "activate_rail_panel", rail, panelId });
  }

  async function undockShellPanel(panelId: ShellDockPanelId): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "undock_panel", panelId }));
  }

  async function dockShellPanel(panelId: ShellDockPanelId, rail: "left" | "right"): Promise<void> {
    await persistResolvedShellLayout(applyShellLayoutAction({ type: "dock_panel", panelId, rail }));
  }

  async function reorderShellRailPanel(
    rail: "left" | "right",
    panelId: ShellDockPanelId,
    direction: "backward" | "forward"
  ): Promise<void> {
    const currentRailState = rail === "left" ? shellLayoutRef.current.leftRail : shellLayoutRef.current.rightRail;
    const currentIndex = currentRailState.dockedPanelIds.indexOf(panelId);
    if (currentIndex < 0) {
      return;
    }
    const nextIndex = direction === "backward" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= currentRailState.dockedPanelIds.length) {
      return;
    }
    const nextPanelIds = [...currentRailState.dockedPanelIds];
    [nextPanelIds[currentIndex], nextPanelIds[nextIndex]] = [nextPanelIds[nextIndex], nextPanelIds[currentIndex]];
    await persistResolvedShellLayout(
      applyShellLayoutAction({ type: "reorder_rail_panels", rail, panelIds: nextPanelIds })
    );
  }

  function shellDropTargetForPoint(clientX: number, clientY: number): "left" | "right" | "undocked" | null {
    const targets: Array<["left" | "right" | "undocked", HTMLElement | null]> = [
      ["left", leftRailListRef.current],
      ["right", rightRailListRef.current],
      ["undocked", desktopWindowStageDropTargetRef.current]
    ];

    for (const [target, element] of targets) {
      if (!element) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return target;
      }
    }

    return null;
  }

  async function applyShellPanelDrop(
    panelId: ShellDockPanelId,
    origin: "left" | "right" | "undocked",
    target: "left" | "right" | "undocked" | null
  ): Promise<void> {
    if (!target) {
      return;
    }

    if (target === "undocked") {
      if (origin !== "undocked") {
        await undockShellPanel(panelId);
      }
      return;
    }

    if (origin === "undocked") {
      await dockShellPanel(panelId, target);
    } else {
      activateShellRailPanel(target, panelId);
    }
  }

  function beginNativeShellPanelDrag(
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "left" | "right" | "undocked"
  ): void {
    setShellPanelDragState({
      panelId,
      panelLabel,
      origin,
      x: 0,
      y: 0,
      target: null
    });
  }

  function endNativeShellPanelDrag(): void {
    setShellPanelDragState(null);
  }

  function beginShellPanelPointerDrag(
    panelId: ShellDockPanelId,
    panelLabel: string,
    origin: "left" | "right" | "undocked",
    clientX: number,
    clientY: number
  ): void {
    shellPanelDragCleanupRef.current?.();
    shellPanelDragSessionRef.current = {
      panelId,
      panelLabel,
      origin,
      startX: clientX,
      startY: clientY,
      dragStarted: false
    };
    setShellPanelDragState({
      panelId,
      panelLabel,
      origin,
      x: clientX,
      y: clientY,
      target: shellDropTargetForPoint(clientX, clientY)
    });

    function handleMouseMove(event: MouseEvent): void {
      const session = shellPanelDragSessionRef.current;
      if (!session) {
        return;
      }

      const deltaX = event.clientX - session.startX;
      const deltaY = event.clientY - session.startY;
      const distance = Math.hypot(deltaX, deltaY);
      if (!session.dragStarted && distance < 8) {
        return;
      }

      if (!session.dragStarted) {
        session.dragStarted = true;
        document.body.classList.add("shell-panel-dragging");
      }

      setShellPanelDragState({
        panelId: session.panelId,
        panelLabel: session.panelLabel,
        origin: session.origin,
        x: event.clientX,
        y: event.clientY,
        target: shellDropTargetForPoint(event.clientX, event.clientY)
      });
    }

    function handleMouseUp(event: MouseEvent): void {
      const session = shellPanelDragSessionRef.current;
      if (!session) {
        return;
      }

      const dropTarget = session.dragStarted ? shellDropTargetForPoint(event.clientX, event.clientY) : null;
      document.body.classList.remove("shell-panel-dragging");
      shellPanelDragSessionRef.current = null;
      setShellPanelDragState(null);
      shellPanelDragCleanupRef.current?.();
      shellPanelDragCleanupRef.current = null;

      if (!session.dragStarted) {
        return;
      }

      void applyShellPanelDrop(session.panelId, session.origin, dropTarget);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    shellPanelDragCleanupRef.current = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("shell-panel-dragging");
    };
  }

  useEffect(
    () => () => {
      shellPanelDragCleanupRef.current?.();
    },
    []
  );

  useEffect(
    () => () => {
      sidebarResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current?.();
    },
    []
  );

  function startSidebarResize(event: React.MouseEvent<HTMLButtonElement>): void {
    if (!sidebarPinned || !canvasPinned || viewportWidth <= SHELL_STACK_BREAKPOINT || !shellRef.current) {
      return;
    }

    const shellRect = shellRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(shellRef.current);
    const paddingLeft =
      Number.parseFloat(computedStyle.paddingLeft) || shellHorizontalPaddingForViewport(viewportWidth);
    const paddingRight =
      Number.parseFloat(computedStyle.paddingRight) || shellHorizontalPaddingForViewport(viewportWidth);
    const contentWidth = shellRect.width - paddingLeft - paddingRight;
    const contentLeft = shellRect.left + paddingLeft;
    const gap = shellGapForViewport(viewportWidth);
    const minSidebarWidth = shellSidebarMinWidthForViewport(viewportWidth);
    const minCanvasWidth = shellCanvasMinWidthForViewport(viewportWidth);
    const inspectorCurrentWidth =
      inspectorPinned && viewportWidth > SHELL_STACK_BREAKPOINT
        ? Math.min(
            Math.max(inspectorWidth ?? shellInspectorDefaultWidthForViewport(viewportWidth), shellInspectorMinWidthForViewport(viewportWidth)),
            Math.max(
              shellInspectorMinWidthForViewport(viewportWidth),
              contentWidth - minSidebarWidth - minCanvasWidth - gap * 2
            )
          )
        : 0;
    const maxSidebarWidth = Math.max(
      minSidebarWidth,
      contentWidth - minCanvasWidth - (inspectorPinned ? inspectorCurrentWidth : 0) - gap * (inspectorPinned ? 2 : 1)
    );

    sidebarResizeSessionRef.current = {
      contentLeft,
      minWidth: minSidebarWidth,
      maxWidth: maxSidebarWidth
    };
    sidebarResizeCleanupRef.current?.();

    function handleMouseMove(moveEvent: MouseEvent): void {
      const session = sidebarResizeSessionRef.current;
      if (!session) {
        return;
      }

      const nextWidth = Math.min(
        Math.max(moveEvent.clientX - session.contentLeft, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_left_rail_width", width: nextWidth });
    }

    function handleMouseUp(): void {
      if (!sidebarResizeSessionRef.current) {
        return;
      }
      setIsSidebarResizing(false);
      document.body.classList.remove("shell-sidebar-resizing");
      sidebarResizeSessionRef.current = null;
      sidebarResizeCleanupRef.current?.();
      sidebarResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    sidebarResizeCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
    setIsSidebarResizing(true);
    document.body.classList.add("shell-sidebar-resizing");
    event.preventDefault();
  }

  function startInspectorResize(event: React.MouseEvent<HTMLButtonElement>): void {
    if (!canvasPinned || !inspectorPinned || viewportWidth <= SHELL_STACK_BREAKPOINT || !shellRef.current) {
      return;
    }

    const shellRect = shellRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(shellRef.current);
    const paddingLeft =
      Number.parseFloat(computedStyle.paddingLeft) || shellHorizontalPaddingForViewport(viewportWidth);
    const paddingRight =
      Number.parseFloat(computedStyle.paddingRight) || shellHorizontalPaddingForViewport(viewportWidth);
    const contentWidth = shellRect.width - paddingLeft - paddingRight;
    const contentRight = shellRect.right - paddingRight;
    const gap = shellGapForViewport(viewportWidth);
    const effectiveSidebarWidth = sidebarPinned
      ? Math.max(sidebarWidth ?? shellSidebarDefaultWidthForViewport(viewportWidth), shellSidebarMinWidthForViewport(viewportWidth))
      : shellSidebarRailWidthForViewport(viewportWidth);
    const minInspectorWidth = shellInspectorMinWidthForViewport(viewportWidth);
    const minCanvasWidth = shellCanvasMinWidthForViewport(viewportWidth);
    const maxInspectorWidth = Math.max(minInspectorWidth, contentWidth - effectiveSidebarWidth - minCanvasWidth - gap * 2);

    inspectorResizeSessionRef.current = {
      contentRight,
      minWidth: minInspectorWidth,
      maxWidth: maxInspectorWidth,
      gap
    };
    inspectorResizeCleanupRef.current?.();

    function handleMouseMove(moveEvent: MouseEvent): void {
      const session = inspectorResizeSessionRef.current;
      if (!session) {
        return;
      }

      const nextWidth = Math.min(
        Math.max(session.contentRight - moveEvent.clientX - session.gap / 2, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_right_rail_width", width: nextWidth });
    }

    function handleMouseUp(): void {
      if (!inspectorResizeSessionRef.current) {
        return;
      }
      setIsInspectorResizing(false);
      document.body.classList.remove("shell-inspector-resizing");
      inspectorResizeSessionRef.current = null;
      inspectorResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    inspectorResizeCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
    setIsInspectorResizing(true);
    document.body.classList.add("shell-inspector-resizing");
    event.preventDefault();
  }

  function handleShellResizeCaptureMouseMove(event: React.MouseEvent<HTMLDivElement>): void {
    if (sidebarResizeSessionRef.current) {
      const session = sidebarResizeSessionRef.current;
      const nextWidth = Math.min(
        Math.max(event.clientX - session.contentLeft, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_left_rail_width", width: nextWidth });
      return;
    }

    if (inspectorResizeSessionRef.current) {
      const session = inspectorResizeSessionRef.current;
      const nextWidth = Math.min(
        Math.max(session.contentRight - event.clientX, session.minWidth),
        session.maxWidth
      );
      applyShellLayoutAction({ type: "set_right_rail_width", width: nextWidth });
    }
  }

  function handleShellResizeCaptureMouseUp(): void {
    if (sidebarResizeSessionRef.current) {
      setIsSidebarResizing(false);
      document.body.classList.remove("shell-sidebar-resizing");
      sidebarResizeSessionRef.current = null;
      sidebarResizeCleanupRef.current?.();
      sidebarResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
      return;
    }

    if (inspectorResizeSessionRef.current) {
      setIsInspectorResizing(false);
      document.body.classList.remove("shell-inspector-resizing");
      inspectorResizeSessionRef.current = null;
      inspectorResizeCleanupRef.current?.();
      inspectorResizeCleanupRef.current = null;
      void persistShellDesktopPreferences();
    }
  }

  const shellRenderLayout = deriveShellRenderLayout(shellLayout, viewportWidth);
  const effectiveSidebarColumnWidth = shellRenderLayout.sidebarColumnWidth;
  const effectiveInspectorColumnWidth = shellRenderLayout.inspectorColumnWidth;
  const shellGap = shellRenderLayout.gap;
  const shellHorizontalPadding = shellRenderLayout.horizontalPadding;
  const shellCanvasMinWidth = shellRenderLayout.canvasMinWidth;
  const shellInspectorMinWidth = shellRenderLayout.inspectorMinWidth;
  const desktopShellInlineColumns = shellRenderLayout.desktopShellInlineColumns;

  async function applyThemePreference(nextThemePreference: ThemePreference): Promise<void> {
    setThemePreference(nextThemePreference);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      themePreference: nextThemePreference
    });
  }

  async function updateLispParenColor(index: number, color: string): Promise<void> {
    const nextColors = normalizeParenDepthColors(
      lispParenColors.map((currentColor, currentIndex) => (currentIndex === index ? color : currentColor))
    );
    setLispParenColors(nextColors);
    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      lispCodeView: {
        parenDepthColors: nextColors
      }
    });
  }

  async function updateDesktopSurfaceScalePreference(
    key: "tooltipScalePercent" | "controlIconScalePercent" | "dockIconScalePercent" | "conversationTextScalePercent" | "sourceCodeTextScalePercent",
    value: number
  ): Promise<void> {
    const normalizedValue = normalizeDesktopSurfaceScalePercent(value);
    const nextDesktopSurfaceView = {
      tooltipScalePercent:
        key === "tooltipScalePercent" ? normalizedValue : tooltipScalePercent,
      controlIconScalePercent:
        key === "controlIconScalePercent" ? normalizedValue : controlIconScalePercent,
      dockIconScalePercent:
        key === "dockIconScalePercent" ? normalizedValue : dockIconScalePercent,
      conversationTextScalePercent:
        key === "conversationTextScalePercent" ? normalizedValue : conversationTextScalePercent,
      sourceCodeTextScalePercent:
        key === "sourceCodeTextScalePercent" ? normalizedValue : sourceCodeTextScalePercent
    };

    if (key === "tooltipScalePercent") {
      setTooltipScalePercent(normalizedValue);
    } else if (key === "controlIconScalePercent") {
      setControlIconScalePercent(normalizedValue);
    } else if (key === "dockIconScalePercent") {
      setDockIconScalePercent(normalizedValue);
    } else if (key === "conversationTextScalePercent") {
      setConversationTextScalePercent(normalizedValue);
    } else {
      setSourceCodeTextScalePercent(normalizedValue);
    }

    await window.sbclAgentDesktop.desktop.setDesktopPreferences({
      lastWorkspace: activeWorkspaceRef.current,
      desktopSurfaceView: nextDesktopSurfaceView
    });
  }

  async function applyProviderRoutingMode(mode: ProviderRoutingMode): Promise<void> {
    try {
      setIsUpdatingProviderRouting(true);
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const result = await window.sbclAgentDesktop.command.updateProviderRouting({ mode });
      setProviderSummary(result.data);
      setProviderProfileStatusMessage(`Routing mode updated to ${mode}.`);
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to update provider routing mode."
      );
    } finally {
      setIsUpdatingProviderRouting(false);
    }
  }

  async function activateProviderProfile(profileName: string): Promise<void> {
    try {
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const result = await window.sbclAgentDesktop.command.useProviderProfile({ profileName });
      setProviderSummary(result.data);
      setSelectedProviderProfileName(profileName);
      setProviderProfileStatusMessage(`Activated provider profile ${profileName}.`);
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to activate provider profile."
      );
    }
  }

  async function saveProviderProfile(clearApiKey = false): Promise<void> {
    try {
      setIsSavingProviderProfile(true);
      setProviderProfileError(null);
      setProviderProfileStatusMessage(null);
      const apiKey = providerProfileDraft.apiKey?.trim() ?? "";
      const payload: ConfigureProviderProfileInput = {
        ...providerProfileDraft,
        profileName: providerProfileDraft.profileName.trim() || "default",
        model: providerProfileDraft.model.trim() || llmProviderPresetForProfile(providerProfileDraft).defaultModel,
        fastModel:
          providerProfileDraft.fastModel?.trim() ||
          providerProfileDraft.model.trim() ||
          llmProviderPresetForProfile(providerProfileDraft).defaultFastModel,
        apiBase: providerProfileDraft.apiBase?.trim() ?? "",
        intents: (providerProfileDraft.intents ?? []).map((intent) => intent.trim()).filter(Boolean),
        activate: providerProfileDraft.activate ?? false
      };
      if (clearApiKey) {
        payload.clearApiKey = true;
        payload.apiKey = "";
      } else if (apiKey.length > 0) {
        payload.apiKey = apiKey;
      } else {
        delete payload.apiKey;
      }
      const result = await window.sbclAgentDesktop.command.configureProviderProfile(payload);
      setProviderSummary(result.data);
      setSelectedProviderProfileName(payload.profileName);
      setProviderProfileDraft((current) => ({
        ...current,
        profileName: payload.profileName,
        model: payload.model,
        fastModel: payload.fastModel,
        apiBase: payload.apiBase,
        apiKey: "",
        clearApiKey: false
      }));
      setProviderProfileStatusMessage(
        clearApiKey
          ? `Cleared the stored token for ${payload.profileName}.`
          : payload.activate
            ? `Saved and activated provider profile ${payload.profileName}.`
            : `Saved provider profile ${payload.profileName}.`
      );
    } catch (error) {
      setProviderProfileError(
        error instanceof Error ? error.message : "Failed to save provider profile."
      );
    } finally {
      setIsSavingProviderProfile(false);
    }
  }

  async function runPackageManagementCommand(
    execute: () => Promise<CommandResultDto<PackageManagementCommandResultDto>>
  ): Promise<void> {
    try {
      setIsPackageManagementBusy(true);
      setPackageManagementError(null);
      setPackageManagementStatusMessage(null);
      const result = await execute();
      setPackageManagementCommandResult(result.data);
      setPackageManagementSummary(result.data.packageManagement);
      setPackageManagementStatusMessage(result.data.summary);
    } catch (error) {
      setPackageManagementError(
        error instanceof Error ? error.message : "Package-management command failed."
      );
    } finally {
      setIsPackageManagementBusy(false);
    }
  }

  async function installQuicklispPackage(): Promise<void> {
    if (!effectiveEnvironmentId || quicklispSystemDraft.trim().length === 0) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.installQuicklispPackage({
        environmentId: effectiveEnvironmentId,
        systemName: quicklispSystemDraft.trim()
      })
    );
  }

  async function executeQlotCommand(): Promise<void> {
    if (!effectiveEnvironmentId || qlotCommandDraft.trim().length === 0) {
      return;
    }
    const args = qlotCommandDraft
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.runQlotCommand({
        environmentId: effectiveEnvironmentId,
        args
      })
    );
  }

  async function saveSourceRegistryEntry(): Promise<void> {
    if (!effectiveEnvironmentId || sourceRegistryDraftPath.trim().length === 0) {
      return;
    }
    const path = sourceRegistryDraftPath.trim();
    await runPackageManagementCommand(() =>
      sourceRegistryEditOriginalPath
        ? window.sbclAgentDesktop.command.updateSourceRegistryEntry({
            environmentId: effectiveEnvironmentId,
            oldPath: sourceRegistryEditOriginalPath,
            newPath: path
          })
        : window.sbclAgentDesktop.command.addSourceRegistryEntry({
            environmentId: effectiveEnvironmentId,
            path
          })
    );
    setSourceRegistryDraftPath("");
    setSourceRegistryEditOriginalPath(null);
  }

  async function removeSourceRegistryPath(path: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.removeSourceRegistryEntry({
        environmentId: effectiveEnvironmentId,
        path
      })
    );
  }

  async function saveLocalProject(): Promise<void> {
    if (!effectiveEnvironmentId || localProjectPathDraft.trim().length === 0) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.addLocalProject({
        environmentId: effectiveEnvironmentId,
        path: localProjectPathDraft.trim(),
        name: localProjectNameDraft.trim() || undefined
      })
    );
    setLocalProjectPathDraft("");
    setLocalProjectNameDraft("");
  }

  async function removeLocalProjectByName(name: string): Promise<void> {
    if (!effectiveEnvironmentId) {
      return;
    }
    await runPackageManagementCommand(() =>
      window.sbclAgentDesktop.command.removeLocalProject({
        environmentId: effectiveEnvironmentId,
        name
      })
    );
  }

  function toggleWorkspaceMenu(workspace: WorkspaceId): void {
    setExpandedWorkspaceMenus((current) => ({
      ...current,
      [workspace]: !current[workspace]
    }));
  }

  async function navigateToBrowserDomain(domain: BrowserDomain): Promise<void> {
    setSelectedBrowserDomain(domain);
    setExpandedWorkspaceMenus((current) => ({ ...current, browser: true }));
    openDesktopWindow("window:browser-surface");
    await navigateToWorkspace("browser");
  }

  async function navigateToProjectsSurface(): Promise<void> {
    openDesktopWindow("window:projects-surface");
    await navigateToWorkspace("projects");
  }

  async function navigateToConfigurationSurface(): Promise<void> {
    openDesktopWindow("window:configuration-surface");
    await navigateToWorkspace("configuration");
  }

  async function navigateToOperateSection(section: OperateSection): Promise<void> {
    setSelectedOperateSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, environment: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("environment");
    if (effectiveEnvironmentId) {
      await loadWorkWorkspace(effectiveEnvironmentId);
      await loadApprovalWorkspace(effectiveEnvironmentId);
    }
    setActiveWorkspace("environment");
  }

  async function navigateToConversationSection(section: ConversationSection): Promise<void> {
    if (section !== "draft") {
      setDraftEntryFocusOverride(null);
    } else if (!draftEntryFocusOverride) {
      setDraftEntryFocusOverride(null);
    }
    setSelectedConversationSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, conversations: true }));
    openDesktopWindow("window:conversations-surface");
    await navigateToWorkspace("conversations");
  }

  async function navigateToWorkspaceSurface(): Promise<void> {
    openDesktopWindow("window:workspace-surface");
    await navigateToWorkspace("workspace");
  }

  async function navigateToEditorSurface(): Promise<void> {
    openDesktopWindow("window:editor-surface");
    await navigateToWorkspace("editor");
  }

  async function navigateToTranscriptSurface(): Promise<void> {
    openDesktopWindow("window:transcript-surface");
    await navigateToWorkspace("transcript");
  }

  function conversationSectionLabel(section: ConversationSection): string {
    return section === "threads"
      ? "Threads"
      : section === "turns"
        ? "Turns"
        : section === "draft"
          ? "Draft"
          : "REPL";
  }

  function activateConversationInspectorSection(section: ConversationSection): void {
    if (section !== "draft") {
      setDraftEntryFocusOverride(null);
    }
    setSelectedConversationSection(section);
    setActiveHostedApp("control-panel");
    setActiveWorkspace("conversations");
  }

  async function openConversationDraftWithFocusOverride(override: EnvironmentFocusState): Promise<void> {
    setDraftEntryFocusOverride(override);
    setSelectedConversationSection("draft");
    setExpandedWorkspaceMenus((current) => ({ ...current, conversations: true }));
    openDesktopWindow("window:conversations-surface");
    await navigateToWorkspace("conversations");
  }

  async function continueThread(threadId: string): Promise<void> {
    setSelectedThreadId(threadId);
    setSelectedThread(null);
    setSelectedTurnId(null);
    setSelectedTurn(null);
    setPendingConversationComposerFocusThreadId(threadId);
    if (currentProjectId) {
      await persistConversationThreadSelection(currentProjectId, threadId);
    }
    await navigateToConversationSection("threads");
  }

  async function continueWorkItem(workItemId: string): Promise<void> {
    setSelectedWorkItemId(workItemId);
    setPendingWorkItemFocusId(workItemId);
    await navigateToExecutionSection("work");
  }

  async function continueRecovery(incidentId: string): Promise<void> {
    setSelectedIncidentId(incidentId);
    setPendingIncidentFocusId(incidentId);
    await navigateToRecoverySection("incidents");
  }

  async function openListenerWorkbench(): Promise<void> {
    focusDesktopWindow("window:listener-workbench");
    updateActiveDesktopWindows((current) => updateWindowState(current, "window:listener-workbench", "open"));
    setSelectedExecutionSection("listener");
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    setActiveHostedApp("listener-workbench");
    setActiveWorkspace("runtime");

    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    const actionPromise = environmentId
      ? window.sbclAgentDesktop.command.desktopAction({
          environmentId,
          actionKind: "activate-panel",
          panelId: workspaceToDesktopPanelId("runtime")
        })
      : Promise.resolve(null);

    const [desktopActionResult] = await Promise.all([
      actionPromise,
      window.sbclAgentDesktop.desktop.focusWorkspace("runtime"),
      window.sbclAgentDesktop.desktop.setDesktopPreferences({ lastWorkspace: "runtime" })
    ]);

    if (desktopActionResult?.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
    }
  }

  async function navigateToDesktopPanel(panelId: DesktopPanelId): Promise<void> {
    if (panelId === "governance") {
      await navigateToOperateSection("journeys");
      return;
    }
    focusDesktopWindow(
      panelId === "display"
        ? "window:display"
        : "window:inspector"
    );
    if (panelId === "inspector" && !inspectorPinned) {
      void persistResolvedShellLayout(applyShellLayoutAction({ type: "expand_right_rail" }));
      updateActiveDesktopWindows((current) => updateWindowState(current, "window:inspector", "open"));
    }
    const environmentId = effectiveEnvironmentId ?? binding?.environmentId;
    setActiveHostedApp("control-panel");

    if (!environmentId) {
      setActiveWorkspace((current) => desktopPanelToWorkspaceId(panelId, current));
      return;
    }

    const desktopActionResult = await window.sbclAgentDesktop.command.desktopAction({
      environmentId,
      actionKind: "activate-panel",
      panelId
    });

    if (desktopActionResult.data.desktopModel) {
      setDesktopModel(desktopActionResult.data.desktopModel);
      setActiveWorkspace((current) =>
        desktopPanelToWorkspaceId(desktopActionResult.data.desktopModel.activePanel, current)
      );
    } else {
      setActiveWorkspace((current) => desktopPanelToWorkspaceId(panelId, current));
    }
  }

  function focusDesktopWindow(windowId: string): void {
    setDesktopFocusById((current) => ({ ...current, [activeDesktopId]: windowId }));
    setDesktopWindowZCounterById((current) => {
      const nextZIndex = (current[activeDesktopId] ?? 3) + 1;
      updateActiveDesktopWindows((windows) => bringWindowToFront(windows, windowId, nextZIndex));
      return { ...current, [activeDesktopId]: nextZIndex };
    });
  }

  function minimizeDesktopWindow(windowId: string): void {
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "minimized"));
  }

  function restoreDesktopWindow(windowId: string): void {
    focusDesktopWindow(windowId);
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "open"));
  }

  function openDesktopWindow(windowId: string): void {
    restoreDesktopWindow(windowId);
  }

  function closeDesktopWindow(windowId: string): void {
    updateActiveDesktopWindows((current) => updateWindowState(current, windowId, "closed"));
  }

  function resetDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => resetDesktopWindowLayout(current));
  }

  function cascadeDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => cascadeDesktopWindows(current));
  }

  function tileDesktopWindowLayoutState(): void {
    updateActiveDesktopWindows((current) => tileDesktopWindows(current));
  }

  function resizeDesktopWindowState(windowId: string, preset: DesktopWindowSizePreset): void {
    updateActiveDesktopWindows((current) => resizeDesktopWindow(current, windowId, preset));
    focusDesktopWindow(windowId);
  }

  function resizeDesktopWindowDimensionsState(windowId: string, width: number, height: number): void {
    updateActiveDesktopWindows((current) => resizeDesktopWindowToDimensions(current, windowId, width, height));
    focusDesktopWindow(windowId);
  }

  function setDesktopWindowFrameState(windowId: string, x: number, y: number, width: number, height: number): void {
    updateActiveDesktopWindows((current) => setDesktopWindowFrame(current, windowId, x, y, width, height));
    focusDesktopWindow(windowId);
  }

  function moveDesktopWindowState(windowId: string, direction: DesktopWindowMoveDirection): void {
    updateActiveDesktopWindows((current) => moveDesktopWindow(current, windowId, direction));
    focusDesktopWindow(windowId);
  }

  function positionDesktopWindowState(windowId: string, x: number, y: number): void {
    updateActiveDesktopWindows((current) => positionDesktopWindow(current, windowId, x, y));
    focusDesktopWindow(windowId);
  }

  function createDesktopSpace(): void {
    const nextNumber = Object.keys(desktopLabelsById).length + 1;
    const nextDesktopId = `desktop-${nextNumber}`;
    setDesktopSpaces((current) => ({ ...current, [nextDesktopId]: [] }));
    setDesktopLabelsById((current) => ({ ...current, [nextDesktopId]: `Desktop ${nextNumber}` }));
    setDesktopFocusById((current) => ({ ...current, [nextDesktopId]: "" }));
    setDesktopWindowZCounterById((current) => ({ ...current, [nextDesktopId]: 1 }));
    setDesktopZoomById((current) => ({ ...current, [nextDesktopId]: 0.72 }));
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [nextDesktopId]: [
        "window:control-panel",
        "window:listener-workbench",
        "window:inspector",
        "window:display",
        "window:shell-context",
        "window:detailed-surface",
        "window:browser-surface",
        "window:editor-surface",
        "window:workspace-surface",
        "window:transcript-surface",
        "window:configuration-surface",
        "window:conversations-surface"
      ]
    }));
    setActiveDesktopId(nextDesktopId);
  }

  function switchDesktopSpace(desktopId: string): void {
    setActiveDesktopId(desktopId);
  }

  function moveWindowToNextDesktop(windowId: string): void {
    const desktopIds = Object.keys(desktopLabelsById);
    if (desktopIds.length < 2) {
      createDesktopSpace();
      return;
    }
    const currentIndex = desktopIds.indexOf(activeDesktopId);
    const targetDesktopId = desktopIds[(currentIndex + 1) % desktopIds.length];
    const targetWindow = desktopWindows.find((window) => window.id === windowId);
    if (!targetWindow || targetDesktopId === activeDesktopId) {
      return;
    }

    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const targetWindows = current[targetDesktopId] ?? [];
      return {
        ...current,
        [activeDesktopId]: currentWindows.filter((window) => window.id !== windowId),
        [targetDesktopId]: upsertDesktopWindow(
          targetWindows,
          { ...targetWindow, state: "open" }
        )
      };
    });
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [activeDesktopId]: Array.from(new Set([...(current[activeDesktopId] ?? []), windowId])),
      [targetDesktopId]: (current[targetDesktopId] ?? []).filter((id) => id !== windowId)
    }));
    setDesktopFocusById((current) => ({ ...current, [targetDesktopId]: windowId }));
  }

  function moveWindowToPreviousDesktop(windowId: string): void {
    const desktopIds = Object.keys(desktopLabelsById);
    if (desktopIds.length < 2) {
      return;
    }
    const currentIndex = desktopIds.indexOf(activeDesktopId);
    const targetDesktopId = desktopIds[(currentIndex - 1 + desktopIds.length) % desktopIds.length];
    const targetWindow = desktopWindows.find((window) => window.id === windowId);
    if (!targetWindow || targetDesktopId === activeDesktopId) {
      return;
    }

    setDesktopSpaces((current) => {
      const currentWindows = current[activeDesktopId] ?? [];
      const targetWindows = current[targetDesktopId] ?? [];
      return {
        ...current,
        [activeDesktopId]: currentWindows.filter((window) => window.id !== windowId),
        [targetDesktopId]: upsertDesktopWindow(
          targetWindows,
          { ...targetWindow, state: "open" }
        )
      };
    });
    setSuppressedDesktopWindowIdsById((current) => ({
      ...current,
      [activeDesktopId]: Array.from(new Set([...(current[activeDesktopId] ?? []), windowId])),
      [targetDesktopId]: (current[targetDesktopId] ?? []).filter((id) => id !== windowId)
    }));
    setDesktopFocusById((current) => ({ ...current, [targetDesktopId]: windowId }));
  }

  function updateActiveDesktopZoom(nextZoom: number): void {
    setDesktopZoomById((current) => ({
      ...current,
      [activeDesktopId]: Math.max(0.4, Math.min(nextZoom, 1.6))
    }));
  }

  async function navigateToExecutionSection(section: ExecutionSection): Promise<void> {
    setSelectedExecutionSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, runtime: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("runtime");
  }

  async function navigateToRecoverySection(section: RecoverySection): Promise<void> {
    setSelectedRecoverySection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, incidents: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("incidents");
  }

  async function navigateToEvidenceSection(section: EvidenceSection): Promise<void> {
    setSelectedEvidenceSection(section);
    setExpandedWorkspaceMenus((current) => ({ ...current, artifacts: true }));
    openDesktopWindow("window:operate-surface");
    await navigateToWorkspace("artifacts");
  }

  async function openApprovalRequest(requestId: string): Promise<void> {
    setSelectedApprovalId(requestId);
    await navigateToExecutionSection("approvals");
  }

  async function navigateToLinkedEntity(entity: LinkedEntityRefDto): Promise<void> {
    switch (entity.entityType) {
      case "approval":
        setSelectedApprovalId(entity.entityId);
        await navigateToExecutionSection("approvals");
        return;
      case "incident":
        setSelectedIncidentId(entity.entityId);
        await navigateToRecoverySection("incidents");
        return;
      case "work-item":
        setSelectedWorkItemId(entity.entityId);
        await navigateToExecutionSection("work");
        return;
      case "artifact":
        setSelectedArtifactId(entity.entityId);
        await navigateToEvidenceSection("artifacts");
        return;
      case "operation":
        await navigateToExecutionSection("listener");
        return;
      default:
        return;
    }
  }

  async function navigateToActionQueueItem(item: ActionQueueItem): Promise<void> {
    switch (item.objectType) {
      case "Thread":
        setSelectedThreadId(item.objectId);
        await navigateToConversationSection("threads");
        return;
      case "Approval":
        setSelectedApprovalId(item.objectId);
        await navigateToExecutionSection("approvals");
        return;
      case "Work":
        setSelectedWorkItemId(item.objectId);
        await navigateToExecutionSection("work");
        return;
      case "Recovery":
        setSelectedIncidentId(item.objectId);
        await navigateToRecoverySection("incidents");
        return;
      case "Artifact":
        setSelectedArtifactId(item.objectId);
        await navigateToEvidenceSection("artifacts");
        return;
      case "Runtime":
      default:
        await navigateToExecutionSection("listener");
        return;
    }
  }

  useEffect(() => {
    updateActiveDesktopWindows((current) => {
      const activeUndockedPanelIds = new Set(shellLayout.undockedPanelIds);
      let next = current;
      let removedUndockedWindow = false;

      for (const window of current) {
        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
        if (panelId && !activeUndockedPanelIds.has(panelId)) {
          removedUndockedWindow = true;
          break;
        }
      }

      if (removedUndockedWindow) {
        next = current.filter((window) => {
          const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
          return !panelId || activeUndockedPanelIds.has(panelId);
        });
      }

      function defaultFrameForUndockedPanel(panelId: ShellDockPanelId): {
        x: number;
        y: number;
        width: number;
        height: number;
      } {
        switch (panelId) {
          case "shell-navigation":
            return { x: 24, y: 22, width: 90, height: 90 };
          case "shell-utilities":
            return { x: 34, y: 28, width: 74, height: 52 };
          case "workspace-inspector":
            return { x: 152, y: 24, width: 78, height: 82 };
          case "editor-symbol":
            return { x: 144, y: 34, width: 76, height: 58 };
          default:
            return { x: 28, y: 24, width: 76, height: 60 };
        }
      }

      if (!suppressedDesktopWindowIds.includes("window:control-panel")) {
        next = upsertDesktopWindow(next, {
          id: "window:control-panel",
          kind: "hosted-app",
          title: "Control Panel",
          summary: workspaceDescriptor.summary,
          state: next.find((window) => window.id === "window:control-panel")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:control-panel")?.zIndex ?? 2,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:control-panel"],
          closable: false,
          hostedAppId: "control-panel"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:listener-workbench")) {
        next = upsertDesktopWindow(next, {
          id: "window:listener-workbench",
          kind: "hosted-app",
          title: "Listener Workbench",
          summary:
            runtimeSummary?.runtimeId
              ? `Runtime ${runtimeSummary.runtimeId} is live with ${runtimeSummary.loadedSystems.length} loaded systems.`
              : "Direct image-native listener, runtime execution, and retained REPL session work.",
          state: next.find((window) => window.id === "window:listener-workbench")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:listener-workbench")?.zIndex ?? 1,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:listener-workbench"],
          closable: true,
          hostedAppId: "listener-workbench"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:inspector")) {
        next = upsertDesktopWindow(next, {
          id: "window:inspector",
          kind: "utility",
          title: "Inspector",
          summary: summary?.activeContext.focusSummary ?? "Shell-wide object and execution inspection.",
          state: next.find((window) => window.id === "window:inspector")?.state ?? (inspectorPinned ? "minimized" : "minimized"),
          zIndex: next.find((window) => window.id === "window:inspector")?.zIndex ?? 3,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:inspector"],
          closable: true,
          panelId: "inspector"
        });
      }

      if ((desktopModel?.displayCount ?? 0) > 0 && !suppressedDesktopWindowIds.includes("window:display")) {
        next = upsertDesktopWindow(next, {
          id: "window:display",
          kind: "utility",
          title: "Display Surface",
          summary:
            desktopModel?.panels?.display?.selectedTitle ??
            "Display-backed governed surfaces and compatibility residents.",
          state: next.find((window) => window.id === "window:display")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:display")?.zIndex ?? 5,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:display"],
          closable: true,
          panelId: "display"
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:shell-context")) {
        next = upsertDesktopWindow(next, {
          id: "window:shell-context",
          kind: "utility",
          title: "Shell Context",
          summary: shellCurrentSurfaceSummary.summary,
          state: next.find((window) => window.id === "window:shell-context")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:shell-context")?.zIndex ?? 6,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:shell-context"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:detailed-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:detailed-surface",
          kind: "utility",
          title: "Detailed Surface",
          summary: `${activeHostedAppDescriptor.label} detail routing and deeper single-surface work.`,
          state: next.find((window) => window.id === "window:detailed-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:detailed-surface")?.zIndex ?? 8,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:detailed-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:browser-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:browser-surface",
          kind: "utility",
          title: "Browser Surface",
          summary: `${selectedBrowserDomainDescriptor.label}: ${selectedBrowserDomainDescriptor.summary}`,
          state: next.find((window) => window.id === "window:browser-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:browser-surface")?.zIndex ?? 9,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:browser-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:projects-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:projects-surface",
          kind: "utility",
          title: "Projects Surface",
          summary:
            selectedProjectDetail?.summary ??
            selectedProjectSummary?.summary ??
            "Open or create a governed project.",
          state: next.find((window) => window.id === "window:projects-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:projects-surface")?.zIndex ?? 10,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:projects-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:editor-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:editor-surface",
          kind: "utility",
          title: "Editor Surface",
          summary:
            currentEditorResult?.data.summary ??
            "",
          state: next.find((window) => window.id === "window:editor-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:editor-surface")?.zIndex ?? 10,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:editor-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:workspace-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:workspace-surface",
          kind: "utility",
          title: "Workspace Surface",
          summary:
            currentWorkspaceResult?.data.summary ??
            "Draft Lisp forms, evaluate them deliberately, and retain scratch history without turning direct live work into either a thread or an execution queue.",
          state: next.find((window) => window.id === "window:workspace-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:workspace-surface")?.zIndex ?? 11,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:workspace-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:transcript-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:transcript-surface",
          kind: "utility",
          title: "Transcript Surface",
          summary:
            transcriptEntries[0]?.summary ??
            "Durable runtime, workspace, and event output stays visible here instead of being trapped inside whichever surface produced it.",
          state: next.find((window) => window.id === "window:transcript-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:transcript-surface")?.zIndex ?? 12,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:transcript-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:operate-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:operate-surface",
          kind: "utility",
          title: "Operate Surface",
          summary: `${selectedOperateSurfaceDescriptor.label}: ${selectedOperateSurfaceDescriptor.summary}`,
          state: next.find((window) => window.id === "window:operate-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:operate-surface")?.zIndex ?? 13,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:operate-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:configuration-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:configuration-surface",
          kind: "utility",
          title: "Configuration Surface",
          summary: `${configurationSections.find((section) => section.id === selectedConfigurationSection)?.label ?? "Configuration"}: ${workspaceDescriptor.summary}`,
          state: next.find((window) => window.id === "window:configuration-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:configuration-surface")?.zIndex ?? 14,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:configuration-surface"],
          closable: true
        });
      }

      if (!suppressedDesktopWindowIds.includes("window:conversations-surface")) {
        next = upsertDesktopWindow(next, {
          id: "window:conversations-surface",
          kind: "utility",
          title: "Conversations Surface",
          summary: `${conversationSectionLabel(selectedConversationSection)}: durable conversation work stays attached to the current environment.`,
          state: next.find((window) => window.id === "window:conversations-surface")?.state ?? "minimized",
          zIndex: next.find((window) => window.id === "window:conversations-surface")?.zIndex ?? 15,
          ...DEFAULT_DESKTOP_WINDOW_FRAMES["window:conversations-surface"],
          closable: true
        });
      }

      for (const panelId of shellLayout.undockedPanelIds) {
        const panelDefinition = SHELL_DOCK_PANEL_DEFINITIONS[panelId];
        if (!panelDefinition) {
          continue;
        }
        const frame = defaultFrameForUndockedPanel(panelId);
        next = upsertDesktopWindow(next, {
          id: undockedShellWindowId(panelId),
          kind: "utility",
          title: panelDefinition.label,
          summary: `${panelDefinition.label} is floating in the desktop stage until it is docked back into its owning rail.`,
          state: next.find((window) => window.id === undockedShellWindowId(panelId))?.state ?? "open",
          zIndex: next.find((window) => window.id === undockedShellWindowId(panelId))?.zIndex ?? 16,
          ...frame,
          closable: false
        });
      }

      return next;
    });
  }, [activeDesktopId, activeHostedAppDescriptor.label, currentWorkspaceResult?.data.summary, desktopModel, inspectorPinned, runtimeSummary, selectedBrowserDomainDescriptor.label, selectedBrowserDomainDescriptor.summary, selectedConfigurationSection, selectedConversationSection, selectedOperateSurfaceDescriptor.label, selectedOperateSurfaceDescriptor.summary, selectedProjectDetail?.summary, selectedProjectSummary?.summary, shellCurrentSurfaceSummary.summary, shellProactiveLead?.summary, shellLayout.undockedPanelIds, suppressedDesktopWindowIds, summary?.activeContext.focusSummary, transcriptEntries, workspaceDescriptor.summary]);

  useEffect(() => {
    if (desktopCompositionInitializedById[activeDesktopId]) {
      return;
    }

    updateActiveDesktopWindows((current) =>
      current.map((window) => {
        return { ...window, state: "minimized" as const };
      })
    );
    setDesktopFocusById((current) => ({ ...current, [activeDesktopId]: "window:control-panel" }));
    setDesktopCompositionInitializedById((current) => ({ ...current, [activeDesktopId]: true }));
  }, [activeDesktopId, desktopCompositionInitializedById]);

  const desktopWindowSnapshots = useMemo(
    () =>
      desktopWindows.map((window) => {
        if (window.id === "window:control-panel") {
          return {
            ...window,
            summary: workspaceDescriptor.summary
          };
        }

        if (window.id === "window:listener-workbench") {
          return {
            ...window,
            summary:
              runtimeSummary?.runtimeId
                ? `Runtime ${runtimeSummary.runtimeId} is live with ${runtimeSummary.loadedSystems.length} loaded systems.`
                : window.summary
          };
        }

        if (window.id === "window:inspector") {
          return {
            ...window,
            summary: summary?.activeContext.focusSummary ?? window.summary
          };
        }

        if (window.id === "window:display") {
          return {
            ...window,
            summary:
              desktopModel?.panels?.display?.selectedTitle ?? "Display-backed governed surfaces and compatibility residents."
          };
        }

        if (window.id === "window:shell-context") {
          return {
            ...window,
            summary: shellCurrentSurfaceSummary.summary
          };
        }

        if (window.id === "window:detailed-surface") {
          return {
            ...window,
            summary: `${activeHostedAppDescriptor.label} detail routing and deeper single-surface work.`
          };
        }

        if (window.id === "window:browser-surface") {
          return {
            ...window,
            summary: `${selectedBrowserDomainDescriptor.label}: ${selectedBrowserDomainDescriptor.summary}`
          };
        }

        if (window.id === "window:projects-surface") {
          return {
            ...window,
            summary:
              selectedProjectDetail?.summary ??
              selectedProjectSummary?.summary ??
              "Open or create a governed project."
          };
        }

        if (window.id === "window:editor-surface") {
          return {
            ...window,
            summary:
              currentEditorResult?.data.summary ??
              ""
          };
        }

        if (window.id === "window:workspace-surface") {
          return {
            ...window,
            summary:
              currentWorkspaceResult?.data.summary ??
              "Draft Lisp forms, evaluate them deliberately, and retain scratch history without turning direct live work into either a thread or an execution queue."
          };
        }

        if (window.id === "window:transcript-surface") {
          return {
            ...window,
            summary:
              transcriptEntries[0]?.summary ??
              "Durable runtime, workspace, and event output stays visible here instead of being trapped inside whichever surface produced it."
          };
        }

        if (window.id === "window:operate-surface") {
          return {
            ...window,
            summary: `${selectedOperateSurfaceDescriptor.label}: ${selectedOperateSurfaceDescriptor.summary}`
          };
        }

        if (window.id === "window:configuration-surface") {
          return {
            ...window,
            summary: `${configurationSections.find((section) => section.id === selectedConfigurationSection)?.label ?? "Configuration"}: ${workspaceDescriptor.summary}`
          };
        }

        if (window.id === "window:conversations-surface") {
          return {
            ...window,
            summary: `${conversationSectionLabel(selectedConversationSection)}: durable conversation work stays attached to the current environment.`
          };
        }

        return window;
      }),
    [activeHostedAppDescriptor.label, currentWorkspaceResult?.data.summary, desktopModel?.panels?.display?.selectedTitle, desktopWindows, runtimeSummary, selectedBrowserDomainDescriptor.label, selectedBrowserDomainDescriptor.summary, selectedConfigurationSection, selectedConversationSection, selectedOperateSurfaceDescriptor.label, selectedOperateSurfaceDescriptor.summary, selectedProjectDetail?.summary, selectedProjectSummary?.summary, shellCurrentSurfaceSummary.summary, shellProactiveLead?.summary, summary?.activeContext.focusSummary, transcriptEntries, workspaceDescriptor.summary]
  );

  const allShellPanelContentById: Partial<Record<ShellDockPanelId, ReactNode>> = {
    "shell-navigation": (
      <ShellNavigationPanel
        activeHostedApp={activeHostedApp}
        activeWorkspace={activeWorkspace}
        browserDomains={browserDomains}
        conversationSections={conversationSections}
        evidenceSections={evidenceSections}
        executionSections={executionSections}
        expandedWorkspaceMenus={expandedWorkspaceMenus}
        navigateToBrowserDomain={(domainId) => {
          void navigateToBrowserDomain(domainId as BrowserDomain);
        }}
        navigateToConfigurationSurface={() => {
          void navigateToConfigurationSurface();
        }}
        navigateToConversationSection={(sectionId) => {
          void navigateToConversationSection(sectionId as ConversationSection);
        }}
        navigateToEditorSurface={() => {
          void navigateToEditorSurface();
        }}
        navigateToEvidenceSection={(sectionId) => {
          void navigateToEvidenceSection(sectionId as EvidenceSection);
        }}
        navigateToExecutionSection={(sectionId) => {
          void navigateToExecutionSection(sectionId as ExecutionSection);
        }}
        navigateToOperateSection={(sectionId) => {
          void navigateToOperateSection(sectionId as OperateSection);
        }}
        navigateToProjectsSurface={() => {
          void navigateToProjectsSurface();
        }}
        navigateToRecoverySection={(sectionId) => {
          void navigateToRecoverySection(sectionId as RecoverySection);
        }}
        navigateToTranscriptSurface={() => {
          void navigateToTranscriptSurface();
        }}
        navigateToWorkspace={(workspaceId) => {
          void navigateToWorkspace(workspaceId);
        }}
        navigateToWorkspaceSurface={() => {
          void navigateToWorkspaceSurface();
        }}
        operateSections={operateSections}
        recoverySections={recoverySections}
        selectedBrowserDomain={selectedBrowserDomain}
        selectedConversationSection={selectedConversationSection}
        selectedEvidenceSection={selectedEvidenceSection}
        selectedExecutionSection={selectedExecutionSection}
        selectedOperateSection={selectedOperateSection}
        selectedRecoverySection={selectedRecoverySection}
        toggleWorkspaceMenu={toggleWorkspaceMenu}
      />
    ),
    "shell-utilities": (
      <ShellUtilitiesPanel onExitIntentOsShell={openEnvironmentExitDialog} />
    ),
    "workspace-inspector": (
      <WorkspaceInspector
        activeWorkspace={activeWorkspace}
        artifacts={artifacts}
        binding={binding}
        onToggleInspector={() => void toggleInspectorPinned()}
        panelRef={undefined}
        renderChrome={false}
        conversationSendError={conversationSendError}
        selectedBrowserDomain={selectedBrowserDomain}
        conversationDraft={conversationDraft}
        conversationAttachments={conversationAttachments}
        conversationStream={conversationStream}
        environmentEvents={environmentEvents}
        isSendingConversation={isSendingConversation}
        lispParenColors={lispParenColors}
        sendConversationMessage={handleSendConversationMessage}
        onConversationAttachmentSelection={handleConversationAttachmentSelection}
        removeConversationAttachment={removeConversationAttachment}
        resolvedTheme={resolvedTheme}
        runtimeForm={runtimeForm}
        runtimeEntityDetail={runtimeEntityDetail}
        runtimeInspection={runtimeInspection}
        runtimeSummary={runtimeSummary}
        runtimeTelemetry={runtimeTelemetry}
        consoleLogStream={consoleLogStream}
        diagnosticReports={diagnosticReports}
        selectedConsolePlane={selectedConsolePlane}
        selectedConsoleSourceFilter={selectedConsoleSourceFilter}
        visibleConsoleEntryCount={
          (consoleLogStream?.data.entries ?? []).filter(
            (entry) => selectedConsoleSourceFilter === "All Sources" || entry.source === selectedConsoleSourceFilter
          ).length
        }
        selectedDiagnosticSourceFilter={selectedDiagnosticSourceFilter}
        visibleDiagnosticReportCount={
          diagnosticReports.filter(
            (report) =>
              selectedDiagnosticSourceFilter === "All Sources" || report.source === selectedDiagnosticSourceFilter
          ).length
        }
        transcriptEntries={transcriptEntries}
        currentWorkspaceHistoryCount={currentWorkspaceHistory.length}
        currentReplHistoryCount={currentProjectReplFocus?.history?.length ?? 0}
        currentProject={currentProject}
        selectedProjectDetail={selectedProjectDetail}
        selectedProjectSummary={selectedProjectSummary}
        workspaceDraft={currentWorkspaceDraft}
        workspaceResult={currentWorkspaceResult}
        workspaceTitle={currentProject?.title ?? "Workspace"}
        selectedApproval={selectedApproval}
        selectedArtifact={selectedArtifact}
        selectedConfigurationSection={selectedConfigurationSection}
        selectedConsoleEntry={
          consoleLogStream?.data.entries.find((entry) => entry.entryId === selectedConsoleEntryId) ??
          consoleLogStream?.data.entries[0] ??
          null
        }
        selectedConversationMessage={selectedConversationMessage}
        selectedConversationSection={selectedConversationSection}
        selectedDiagnosticReport={selectedDiagnosticReport}
        selectedDiagnosticReportSummary={
          diagnosticReports.find((report) => report.reportId === selectedDiagnosticReportId) ??
          diagnosticReports[0] ??
          null
        }
        currentEditorChangedFormCount={currentEditorChangedFormCount}
        currentEditorBufferDirty={currentEditorBufferDirty}
        currentEditorBufferTitle={currentEditorBufferTitle}
        currentEditorBuffers={currentEditorBuffers}
        editorDraft={currentEditorDraft}
        editorResult={currentEditorResult}
        editorPackage={currentEditorPackage}
        currentEditorCursorSymbol={currentEditorCursorSymbol}
        currentEditorCursorSymbolPackage={currentEditorCursorSymbolPackage}
        currentEditorCursorSymbolHelp={currentEditorCursorSymbolHelp}
        selectedDocumentationPage={selectedDocumentationPage}
        selectedEvidenceSection={selectedEvidenceSection}
        selectedEvent={selectedEvent}
        selectedIncident={selectedIncident}
        selectedOperateSection={selectedOperateSection}
        selectedTelemetryProcess={
          runtimeTelemetry?.processes.find((process) => process.processId === selectedTelemetryProcessId) ??
          runtimeTelemetry?.processes[0] ??
          null
        }
        selectedThread={selectedThread}
        selectedTurn={selectedTurn}
        selectedWorkItem={selectedWorkItem}
        selectedWorkItemPlan={selectedWorkItemPlan}
        selectedWorkflowRecord={selectedWorkflowRecord}
        navigateToLinkedEntity={navigateToLinkedEntity}
        pendingConversationComposerFocusThreadId={pendingConversationComposerFocusThreadId}
        clearPendingConversationComposerFocusThreadId={() => setPendingConversationComposerFocusThreadId(null)}
        setConversationDraft={setConversationDraft}
        setSelectedConversationMessageId={setSelectedConversationMessageId}
        sourcePreview={sourcePreview}
        status={status}
        summary={summary}
        systemTheme={systemTheme}
        themePreference={themePreference}
        providerSummary={providerSummary}
        packageManagementSummary={packageManagementSummary}
        packageManagementStatusMessage={packageManagementStatusMessage}
        packageManagementError={packageManagementError}
        packageManagementCommandResult={packageManagementCommandResult}
        quicklispSystemDraft={quicklispSystemDraft}
        qlotCommandDraft={qlotCommandDraft}
        sourceRegistryDraftPath={sourceRegistryDraftPath}
        sourceRegistryEditOriginalPath={sourceRegistryEditOriginalPath}
        localProjectPathDraft={localProjectPathDraft}
        localProjectNameDraft={localProjectNameDraft}
        providerProfileDraft={providerProfileDraft}
        selectedProviderProfileName={selectedProviderProfileName}
        providerProfileStatusMessage={providerProfileStatusMessage}
        providerProfileError={providerProfileError}
        isSavingProviderProfile={isSavingProviderProfile}
        isUpdatingProviderRouting={isUpdatingProviderRouting}
        isPackageManagementBusy={isPackageManagementBusy}
        tooltipScalePercent={tooltipScalePercent}
        controlIconScalePercent={controlIconScalePercent}
        dockIconScalePercent={dockIconScalePercent}
        conversationTextScalePercent={conversationTextScalePercent}
        sourceCodeTextScalePercent={sourceCodeTextScalePercent}
        openPublishedDocumentation={() =>
          window.sbclAgentDesktop.desktop.openExternalLink(PUBLISHED_DOCUMENTATION_URL)
        }
        updateLispParenColor={updateLispParenColor}
        updateThemePreference={applyThemePreference}
        updateDesktopSurfaceScalePreference={updateDesktopSurfaceScalePreference}
        setProviderProfileDraft={setProviderProfileDraft}
        setSelectedProviderProfileName={setSelectedProviderProfileName}
        setQuicklispSystemDraft={setQuicklispSystemDraft}
        setQlotCommandDraft={setQlotCommandDraft}
        setSourceRegistryDraftPath={setSourceRegistryDraftPath}
        setSourceRegistryEditOriginalPath={setSourceRegistryEditOriginalPath}
        setLocalProjectPathDraft={setLocalProjectPathDraft}
        setLocalProjectNameDraft={setLocalProjectNameDraft}
        applyProviderRoutingMode={applyProviderRoutingMode}
        activateProviderProfile={activateProviderProfile}
        saveProviderProfile={saveProviderProfile}
        installQuicklispPackage={installQuicklispPackage}
        executeQlotCommand={executeQlotCommand}
        saveSourceRegistryEntry={saveSourceRegistryEntry}
        removeSourceRegistryPath={removeSourceRegistryPath}
        saveLocalProject={saveLocalProject}
        removeLocalProjectByName={removeLocalProjectByName}
        workItems={workItems}
      />
    ),
    "editor-symbol": (
      <EditorSymbolRailPanel
        currentEditorCursorSymbol={currentEditorCursorSymbol}
        currentEditorCursorSymbolHelp={currentEditorCursorSymbolHelp}
        currentEditorCursorSymbolPackage={currentEditorCursorSymbolPackage}
        currentEditorPackage={currentEditorPackage}
        runtimeCurrentPackage={runtimeSummary?.currentPackage}
      />
    )
  };

  const leftRailPanelEntries = createShellRailPanelEntries(leftRailPanels, allShellPanelContentById);
  const rightRailPanelEntries = createShellRailPanelEntries(rightRailPanels, allShellPanelContentById);
  const undockedShellPanelEntries = createShellRailPanelEntries(
    shellLayout.undockedPanelIds
      .map((panelId) => SHELL_DOCK_PANEL_DEFINITIONS[panelId])
      .filter((panel): panel is NonNullable<typeof panel> => Boolean(panel)),
    allShellPanelContentById
  );

  const activeLeftRailPanelEntry = resolveActiveShellRailPanel(leftRailPanelEntries, shellLayout.leftRail.activePanelId);
  const activeRightRailPanelEntry = resolveActiveShellRailPanel(rightRailPanelEntries, shellLayout.rightRail.activePanelId);

  return (
    <div
      className={`desktop-shell${sidebarPinned ? "" : " sidebar-collapsed"}${canvasPinned ? "" : " canvas-collapsed"}${inspectorPinned ? "" : " inspector-collapsed"}`}
      data-shell-drag-origin={shellPanelDragState?.origin ?? ""}
      data-shell-drag-panel-id={shellPanelDragState?.panelId ?? ""}
      data-shell-drag-target={shellPanelDragState?.target ?? ""}
      ref={shellRef}
      style={{
        ...(desktopShellInlineColumns
          ? {
              gridTemplateColumns: desktopShellInlineColumns
            }
          : {}),
        ["--shell-gap" as string]: `${shellGap}px`,
        ["--shell-padding-x" as string]: `${shellHorizontalPadding}px`,
        ["--shell-sidebar-width" as string]: `${effectiveSidebarColumnWidth}px`,
        ["--shell-inspector-width" as string]: `${effectiveInspectorColumnWidth}px`,
        ["--desktop-tooltip-scale" as string]: `${tooltipScalePercent / 100}`,
        ["--desktop-control-icon-scale" as string]: `${controlIconScalePercent / 100}`,
        ["--desktop-dock-icon-scale" as string]: `${dockIconScalePercent / 100}`,
        ["--desktop-conversation-text-scale" as string]: `${conversationTextScalePercent / 100}`,
        ["--desktop-source-code-text-scale" as string]: `${sourceCodeTextScalePercent / 100}`
      }}
    >
      {isSidebarResizing || isInspectorResizing ? (
        <div
          aria-hidden="true"
          className="shell-resize-capture-layer"
          onMouseMove={handleShellResizeCaptureMouseMove}
          onMouseUp={handleShellResizeCaptureMouseUp}
        />
      ) : null}
      <div className="window-drag-strip" aria-hidden="true">
        <div className="window-drag-label">Surface</div>
      </div>

      <div className="shell-glow shell-glow-left" />
      <div className="shell-glow shell-glow-right" />

      {errorMessage ? (
        <section className="shell-runtime-alert" role="alert">
          <div className="shell-runtime-alert-copy">
            <p className="shell-runtime-alert-eyebrow">Runtime Recovery</p>
            <strong>Surface encountered a host or startup fault.</strong>
            <p>{errorMessage}</p>
          </div>
          <button
            aria-label="Dismiss runtime alert"
            className="shell-runtime-alert-dismiss"
            onClick={() => setErrorMessage(null)}
            type="button"
          >
            Dismiss
          </button>
        </section>
      ) : null}

      {isEnvironmentImageChooserOpen && environmentImageRegistry ? (
        <EnvironmentImageChooserDialog
          onClose={() => void handleContinueWithCurrentEnvironmentImage()}
          onOpenImage={(imageIdOrName) => void handleOpenEnvironmentImage(imageIdOrName)}
          registry={environmentImageRegistry}
        />
      ) : null}

      {isEnvironmentExitDialogOpen ? (
        <EnvironmentExitDialog
          canOverwriteCurrentImage={Boolean(environmentImageRegistry?.currentImageName)}
          currentImageName={environmentImageRegistry?.currentImageName ?? null}
          onClose={() => setIsEnvironmentExitDialogOpen(false)}
          onDiscard={() => void handleDiscardAndQuit()}
          onSaveAsNew={() => void handleSaveAsNewImageAndQuit()}
          onSaveCurrent={() => void handleSaveCurrentImageAndQuit()}
          saveAsName={environmentSaveAsNameDraft}
          setSaveAsName={setEnvironmentSaveAsNameDraft}
        />
      ) : null}

      {isProjectOpenDialogOpen ? (
        <ProjectOpenDialog
          currentProjectId={currentProjectId}
          onClose={() => setIsProjectOpenDialogOpen(false)}
          onOpenProject={(projectId) => void handleProjectSwitch(projectId)}
          projects={projects}
        />
      ) : null}

      {isProjectCreateDialogOpen ? (
        <ProjectCreateDialog
          environmentId={summary?.environmentId ?? binding?.environmentId ?? null}
          onClose={() => setIsProjectCreateDialogOpen(false)}
          onCreateProject={() => void handleCreateProjectFromEnvironment(newProjectTitleDraft)}
          setTitleDraft={setNewProjectTitleDraft}
          titleDraft={newProjectTitleDraft}
        />
      ) : null}

      {isEditorSourceFileDialogOpen ? (
        <EditorSourceFileLoadDialog
          currentPathDraft={editorSourceDirectoryPathDraft}
          directoryListing={editorSourceDirectoryListing}
          onChangePathDraft={setEditorSourceDirectoryPathDraft}
          onClose={() => setIsEditorSourceFileDialogOpen(false)}
          onLoadDirectory={() => void loadEditorSourceDirectory(editorSourceDirectoryPathDraft)}
          onLoadSelectedFile={() => void handleLoadEditorSourceFile()}
          onNavigateDirectory={navigateEditorSourceDirectory}
          onNavigateParent={navigateEditorSourceParentDirectory}
          selectedFilePath={editorSourceFilePathDraft}
          pathDraft={editorSourceFilePathDraft}
          setPathDraft={setEditorSourceFilePathDraft}
        />
      ) : null}

      {isEditorSourceFileSaveDialogOpen ? (
        <EditorSourceFileSaveDialog
          currentPathDraft={editorSourceSaveDirectoryPathDraft}
          directoryListing={editorSourceSaveDirectoryListing}
          fileNameDraft={editorSourceSaveFileNameDraft}
          onChangeFileNameDraft={setEditorSourceSaveFileNameDraft}
          onChangePathDraft={setEditorSourceSaveDirectoryPathDraft}
          onClose={() => setIsEditorSourceFileSaveDialogOpen(false)}
          onNavigateDirectory={navigateEditorSourceSaveDirectory}
          onNavigateParent={navigateEditorSourceSaveParentDirectory}
          onOpenDirectory={() => void loadEditorSourceSaveDirectory(editorSourceSaveDirectoryPathDraft)}
          onSave={() => void handleSaveCurrentEditorBufferAs()}
          selectedFilePath={joinDirectoryAndFileName(editorSourceSaveDirectoryPathDraft, editorSourceSaveFileNameDraft)}
        />
      ) : null}

      {isProjectConstitutionDialogOpen && selectedProjectDetail ? (
        <ProjectConstitutionEditDialog
          constitutionDraft={projectConstitutionDraft}
          onClose={() => setIsProjectConstitutionDialogOpen(false)}
          onSave={() => void handleSaveProjectConstitution()}
          projectTitle={selectedProjectDetail.title}
          setConstitutionDraft={setProjectConstitutionDraft}
        />
      ) : null}

      {isProjectRequirementDialogOpen && selectedProjectDetail ? (
        <ProjectRequirementCreateDialog
          onClose={() => setIsProjectRequirementDialogOpen(false)}
          onCreateRequirement={() => void handleCreateProjectRequirement()}
          projectTitle={selectedProjectDetail.title}
          requirementPriority={projectRequirementPriorityDraft}
          requirementStatus={projectRequirementStatusDraft}
          requirementSummary={projectRequirementSummaryDraft}
          requirementTitle={projectRequirementTitleDraft}
          setRequirementPriority={setProjectRequirementPriorityDraft}
          setRequirementStatus={setProjectRequirementStatusDraft}
          setRequirementSummary={setProjectRequirementSummaryDraft}
          setRequirementTitle={setProjectRequirementTitleDraft}
        />
      ) : null}

      {isProjectFeatureSpecificationDialogOpen && selectedProjectDetail ? (
        <ProjectFeatureSpecificationCreateDialog
          acceptanceCriteriaDraft={projectFeatureSpecificationAcceptanceCriteriaDraft}
          featureStatus={projectFeatureSpecificationStatusDraft}
          featureSummary={projectFeatureSpecificationSummaryDraft}
          featureTitle={projectFeatureSpecificationTitleDraft}
          onClose={() => setIsProjectFeatureSpecificationDialogOpen(false)}
          onCreateFeatureSpecification={() => void handleCreateProjectFeatureSpecification()}
          projectTitle={selectedProjectDetail.title}
          setAcceptanceCriteriaDraft={setProjectFeatureSpecificationAcceptanceCriteriaDraft}
          setFeatureStatus={setProjectFeatureSpecificationStatusDraft}
          setFeatureSummary={setProjectFeatureSpecificationSummaryDraft}
          setFeatureTitle={setProjectFeatureSpecificationTitleDraft}
        />
      ) : null}

      {isProjectUserJourneyDialogOpen && selectedProjectDetail ? (
        <ProjectUserJourneyCreateDialog
          actorsDraft={projectUserJourneyActorsDraft}
          edgeCasesDraft={projectUserJourneyEdgeCasesDraft}
          entrypointsDraft={projectUserJourneyEntrypointsDraft}
          journeySummary={projectUserJourneySummaryDraft}
          journeyTitle={projectUserJourneyTitleDraft}
          onClose={() => setIsProjectUserJourneyDialogOpen(false)}
          onCreateUserJourney={() => void handleCreateProjectUserJourney()}
          outcomesDraft={projectUserJourneyOutcomesDraft}
          projectTitle={selectedProjectDetail.title}
          setActorsDraft={setProjectUserJourneyActorsDraft}
          setEdgeCasesDraft={setProjectUserJourneyEdgeCasesDraft}
          setEntrypointsDraft={setProjectUserJourneyEntrypointsDraft}
          setJourneySummary={setProjectUserJourneySummaryDraft}
          setJourneyTitle={setProjectUserJourneyTitleDraft}
          setOutcomesDraft={setProjectUserJourneyOutcomesDraft}
          setStepsDraft={setProjectUserJourneyStepsDraft}
          stepsDraft={projectUserJourneyStepsDraft}
        />
      ) : null}

      {isProjectArchitectureDecisionDialogOpen && selectedProjectDetail ? (
        <ProjectArchitectureDecisionCreateDialog
          consequencesDraft={projectArchitectureDecisionConsequencesDraft}
          decisionStatus={projectArchitectureDecisionStatusDraft}
          decisionSummary={projectArchitectureDecisionSummaryDraft}
          decisionTitle={projectArchitectureDecisionTitleDraft}
          driversDraft={projectArchitectureDecisionDriversDraft}
          onClose={() => setIsProjectArchitectureDecisionDialogOpen(false)}
          onCreateArchitectureDecision={() => void handleCreateProjectArchitectureDecision()}
          projectTitle={selectedProjectDetail.title}
          setConsequencesDraft={setProjectArchitectureDecisionConsequencesDraft}
          setDecisionStatus={setProjectArchitectureDecisionStatusDraft}
          setDecisionSummary={setProjectArchitectureDecisionSummaryDraft}
          setDecisionTitle={setProjectArchitectureDecisionTitleDraft}
          setDriversDraft={setProjectArchitectureDecisionDriversDraft}
          setStackChoicesDraft={setProjectArchitectureDecisionStackChoicesDraft}
          stackChoicesDraft={projectArchitectureDecisionStackChoicesDraft}
        />
      ) : null}

      {isProjectDesignSystemDialogOpen && selectedProjectDetail ? (
        <ProjectRecordEditDialog
          draft={projectDesignSystemDraft}
          fieldLabel="Design System JSON"
          onClose={() => setIsProjectDesignSystemDialogOpen(false)}
          onSave={() => void handleSaveProjectDesignSystem()}
          projectTitle={selectedProjectDetail.title}
          recordLabel="Design System"
          setDraft={setProjectDesignSystemDraft}
        />
      ) : null}

      {isProjectStyleGuideDialogOpen && selectedProjectDetail ? (
        <ProjectRecordEditDialog
          draft={projectStyleGuideDraft}
          fieldLabel="Style Guide JSON"
          onClose={() => setIsProjectStyleGuideDialogOpen(false)}
          onSave={() => void handleSaveProjectStyleGuide()}
          projectTitle={selectedProjectDetail.title}
          recordLabel="Style Guide"
          setDraft={setProjectStyleGuideDraft}
        />
      ) : null}

      {isProjectReleaseReadinessDialogOpen && selectedProjectDetail ? (
        <ProjectReleaseReadinessEditDialog
          onClose={() => setIsProjectReleaseReadinessDialogOpen(false)}
          onSave={() => void handleSaveProjectReleaseReadiness()}
          openRisksDraft={projectReleaseReadinessOpenRisksDraft}
          observationPlanDraft={projectReleaseReadinessObservationPlanDraft}
          projectTitle={selectedProjectDetail.title}
          requiredApproversDraft={projectReleaseReadinessRequiredApproversDraft}
          setOpenRisksDraft={setProjectReleaseReadinessOpenRisksDraft}
          setObservationPlanDraft={setProjectReleaseReadinessObservationPlanDraft}
          setProjectReleaseReadinessSignoffStatusDraft={setProjectReleaseReadinessSignoffStatusDraft}
          setProjectReleaseReadinessStageDraft={setProjectReleaseReadinessStageDraft}
          setProjectReleaseReadinessTargetWindowDraft={setProjectReleaseReadinessTargetWindowDraft}
          setRequiredApproversDraft={setProjectReleaseReadinessRequiredApproversDraft}
          signoffStatusDraft={projectReleaseReadinessSignoffStatusDraft}
          stageDraft={projectReleaseReadinessStageDraft}
          targetWindowDraft={projectReleaseReadinessTargetWindowDraft}
        />
      ) : null}

      {isProjectReadinessObligationsDialogOpen && selectedProjectDetail ? (
        <ProjectReadinessObligationsEditDialog
          obligationsDraft={projectReadinessObligationsDraft}
          onAddObligation={addProjectReadinessObligationDraft}
          onClose={() => setIsProjectReadinessObligationsDialogOpen(false)}
          onRemoveObligation={removeProjectReadinessObligationDraft}
          onSave={() => void handleSaveProjectReadinessObligations()}
          onUpdateObligation={updateProjectReadinessObligationDraft}
          projectTitle={selectedProjectDetail.title}
        />
      ) : null}

      {isProjectTestingStrategyDialogOpen && selectedProjectDetail ? (
        <ProjectTestingStrategyEditDialog
          availableHarnesses={projectTestingHarnessInventory}
          maximumEnvironmentSaveLoadSecondsDraft={projectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft}
          maximumFailedTestsDraft={projectTestingStrategyMaximumFailedTestsDraft}
          maximumSayTurnLatencySecondsDraft={projectTestingStrategyMaximumSayTurnLatencySecondsDraft}
          onAddSuiteExpectation={addProjectTestingStrategySuiteExpectation}
          onClose={() => setIsProjectTestingStrategyDialogOpen(false)}
          onRemoveSuiteExpectation={removeProjectTestingStrategySuiteExpectation}
          onSave={() => void handleSaveProjectTestingStrategy()}
          projectTitle={selectedProjectDetail.title}
          requiredEvidenceDraft={projectTestingStrategyRequiredEvidenceDraft}
          requireCoverageDraft={projectTestingStrategyRequireCoverageDraft}
          requireRecoveryReadyDraft={projectTestingStrategyRequireRecoveryReadyDraft}
          setMaximumEnvironmentSaveLoadSecondsDraft={setProjectTestingStrategyMaximumEnvironmentSaveLoadSecondsDraft}
          setMaximumFailedTestsDraft={setProjectTestingStrategyMaximumFailedTestsDraft}
          setMaximumSayTurnLatencySecondsDraft={setProjectTestingStrategyMaximumSayTurnLatencySecondsDraft}
          setRequiredEvidenceDraft={setProjectTestingStrategyRequiredEvidenceDraft}
          setRequireCoverageDraft={setProjectTestingStrategyRequireCoverageDraft}
          setRequireRecoveryReadyDraft={setProjectTestingStrategyRequireRecoveryReadyDraft}
          suiteExpectationsDraft={projectTestingStrategySuiteExpectationsDraft}
          updateSuiteExpectation={updateProjectTestingStrategySuiteExpectation}
        />
      ) : null}

      {isProjectSourceRootDialogOpen && selectedProjectDetail ? (
        <ProjectSourceRootCreateDialog
          onClose={() => setIsProjectSourceRootDialogOpen(false)}
          onCreateSourceRoot={() => void handleCreateProjectSourceRoot()}
          projectTitle={selectedProjectDetail.title}
          setSourceRootDraft={setProjectSourceRootDraft}
          sourceRootDraft={projectSourceRootDraft}
        />
      ) : null}

      {isProjectTestingHarnessDialogOpen && selectedProjectDetail ? (
        <ProjectTestingHarnessBindDialog
          availableHarnesses={projectTestingHarnessInventory}
          harnessIdDraft={projectTestingHarnessIdDraft}
          onBindTestingHarness={() => void handleBindProjectTestingHarness()}
          onClose={() => setIsProjectTestingHarnessDialogOpen(false)}
          projectTitle={selectedProjectDetail.title}
          setHarnessIdDraft={setProjectTestingHarnessIdDraft}
        />
      ) : null}

      {isProjectQualityGateDialogOpen && selectedProjectDetail ? (
        <ProjectQualityGateCreateDialog
          availableHarnesses={projectTestingHarnessInventory}
          gateStatusDraft={projectQualityGateStatusDraft}
          gateSummaryDraft={projectQualityGateSummaryDraft}
          gateTitleDraft={projectQualityGateTitleDraft}
          maximumEnvironmentSaveLoadSecondsDraft={projectQualityGateMaximumEnvironmentSaveLoadSecondsDraft}
          maximumFailedTestsDraft={projectQualityGateMaximumFailedTestsDraft}
          maximumSayTurnLatencySecondsDraft={projectQualityGateMaximumSayTurnLatencySecondsDraft}
          minimumLinkedIncidentsDraft={projectQualityGateMinimumLinkedIncidentsDraft}
          minimumLinkedWorkItemsDraft={projectQualityGateMinimumLinkedWorkItemsDraft}
          onClose={() => setIsProjectQualityGateDialogOpen(false)}
          onCreateQualityGate={() => void handleCreateProjectQualityGate()}
          projectTitle={selectedProjectDetail.title}
          requiredHarnessIdsDraft={projectQualityGateRequiredHarnessIdsDraft}
          requireCoverageDraft={projectQualityGateRequireCoverageDraft}
          requireRecoveryReadyDraft={projectQualityGateRequireRecoveryReadyDraft}
          requireSourceRootsDraft={projectQualityGateRequireSourceRootsDraft}
          setGateStatusDraft={setProjectQualityGateStatusDraft}
          setGateSummaryDraft={setProjectQualityGateSummaryDraft}
          setGateTitleDraft={setProjectQualityGateTitleDraft}
          setMaximumEnvironmentSaveLoadSecondsDraft={setProjectQualityGateMaximumEnvironmentSaveLoadSecondsDraft}
          setMaximumFailedTestsDraft={setProjectQualityGateMaximumFailedTestsDraft}
          setMaximumSayTurnLatencySecondsDraft={setProjectQualityGateMaximumSayTurnLatencySecondsDraft}
          setMinimumLinkedIncidentsDraft={setProjectQualityGateMinimumLinkedIncidentsDraft}
          setMinimumLinkedWorkItemsDraft={setProjectQualityGateMinimumLinkedWorkItemsDraft}
          setRequiredHarnessIdsDraft={setProjectQualityGateRequiredHarnessIdsDraft}
          setRequireCoverageDraft={setProjectQualityGateRequireCoverageDraft}
          setRequireRecoveryReadyDraft={setProjectQualityGateRequireRecoveryReadyDraft}
          setRequireSourceRootsDraft={setProjectQualityGateRequireSourceRootsDraft}
        />
      ) : null}

      {isWorkItemSteerDialogOpen && selectedWorkItem ? (
        <WorkItemSteerDialog
          nextStepDraft={workItemSteerNextStepDraft}
          noteDraft={workItemSteerNoteDraft}
          onClose={() => setIsWorkItemSteerDialogOpen(false)}
          onSave={() => void handleSteerWorkItem()}
          phaseDraft={workItemSteerPhaseDraft}
          setNextStepDraft={setWorkItemSteerNextStepDraft}
          setNoteDraft={setWorkItemSteerNoteDraft}
          setPhaseDraft={setWorkItemSteerPhaseDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemResumeDialogOpen && selectedWorkItem ? (
        <WorkItemResumeDialog
          noteDraft={workItemResumeNoteDraft}
          onClose={() => setIsWorkItemResumeDialogOpen(false)}
          onSave={() => void handleResumeWorkItem()}
          setNoteDraft={setWorkItemResumeNoteDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemQuarantineDialogOpen && selectedWorkItem ? (
        <WorkItemQuarantineDialog
          onClose={() => setIsWorkItemQuarantineDialogOpen(false)}
          onSave={() => void handleQuarantineWorkItem()}
          reasonDraft={workItemQuarantineReasonDraft}
          setReasonDraft={setWorkItemQuarantineReasonDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemRollbackDialogOpen && selectedWorkItem ? (
        <WorkItemRollbackDialog
          noteDraft={workItemRollbackNoteDraft}
          onClose={() => setIsWorkItemRollbackDialogOpen(false)}
          onSave={() => void handleRollbackWorkItem()}
          reasonDraft={workItemRollbackReasonDraft}
          setNoteDraft={setWorkItemRollbackNoteDraft}
          setReasonDraft={setWorkItemRollbackReasonDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isWorkItemValidationDialogOpen && selectedWorkItem ? (
        <WorkItemValidationDialog
          onClose={() => setIsWorkItemValidationDialogOpen(false)}
          onSave={() => void handleCompleteWorkItemValidations()}
          setStatusDraft={setWorkItemValidationStatusDraft}
          statusDraft={workItemValidationStatusDraft}
          workItemTitle={selectedWorkItem.title}
        />
      ) : null}

      {isIncidentRemediationPlanDialogOpen && selectedIncident ? (
        <IncidentRemediationPlanDialog
          actionDraft={incidentRemediationActionsDraft}
          blockerDraft={incidentRemediationBlockersDraft}
          incidentTitle={selectedIncident.title}
          onClose={() => setIsIncidentRemediationPlanDialogOpen(false)}
          onSave={() => void handleUpdateIncidentRemediationPlan()}
          ownerDraft={incidentRemediationOwnerDraft}
          setActionDraft={setIncidentRemediationActionsDraft}
          setBlockerDraft={setIncidentRemediationBlockersDraft}
          setOwnerDraft={setIncidentRemediationOwnerDraft}
          setStatusDraft={setIncidentRemediationStatusDraft}
          setSummaryDraft={setIncidentRemediationSummaryDraft}
          setValidationDraft={setIncidentRemediationValidationDraft}
          statusDraft={incidentRemediationStatusDraft}
          summaryDraft={incidentRemediationSummaryDraft}
          validationDraft={incidentRemediationValidationDraft}
        />
      ) : null}

      {isConversationSessionCreateDialogOpen ? (
        <ConversationSessionCreateDialog
          onClose={() => {
            setIsConversationSessionCreateDialogOpen(false);
            setConversationSessionTitleDraft("");
          }}
          onCreateSession={() => void handleCreateConversationSession()}
          setTitleDraft={setConversationSessionTitleDraft}
          titleDraft={conversationSessionTitleDraft}
        />
      ) : null}

      {isConversationThreadRenameDialogOpen ? (
        <ConversationThreadRenameDialog
          onClose={() => {
            setIsConversationThreadRenameDialogOpen(false);
            setConversationThreadRenameDraft("");
            setConversationThreadRenameTargetId(null);
          }}
          onRenameThread={() => void handleRenameConversationThread()}
          setTitleDraft={setConversationThreadRenameDraft}
          titleDraft={conversationThreadRenameDraft}
        />
      ) : null}

      {sidebarPinned && canvasPinned && viewportWidth > SHELL_STACK_BREAKPOINT ? (
        <ShellColumnSplitter
          active={isSidebarResizing}
          ariaLabel="Resize navigation"
          layout={splitterLayout}
          onMouseDown={startSidebarResize}
          side="left"
        />
      ) : null}

      {sidebarPinned ? (
        <ShellRailHost
          activePanelId={shellLayout.leftRail.activePanelId}
          ariaLabel="Application navigation"
          dockPanels={leftRailPanels}
          dragTargetActive={shellPanelDragState?.target === "left"}
          listRef={leftRailListRef}
          onDropDockedPanel={(panelId) => {
            void dockShellPanel(panelId, "left");
            endNativeShellPanelDrag();
          }}
          onNativeDragEnd={endNativeShellPanelDrag}
          onNativeDragStart={(panelId, panelLabel, origin) => {
            beginNativeShellPanelDrag(panelId, panelLabel, origin);
          }}
          onPanelPointerDown={(panelId, panelLabel, event) => {
            beginShellPanelPointerDrag(panelId, panelLabel, "left", event.clientX, event.clientY);
          }}
          onToggle={() => {
            void toggleSidebarPinned();
          }}
          onSelectPanel={(panelId) => activateShellRailPanel("left", panelId)}
          onUndockPanel={(panelId) => {
            void undockShellPanel(panelId);
          }}
          onMovePanel={(panelId, direction) => {
            void reorderShellRailPanel("left", panelId, direction);
          }}
          panelRef={sidebarPanelRef}
          title="Shell"
          toggleAriaLabel="Hide Navigation"
          toggleTitle="Hide Navigation"
        >
          {activeLeftRailPanelEntry?.content ?? null}
        </ShellRailHost>
      ) : (
        <ShellCollapsedRail
          ariaLabel="Collapsed application navigation"
          className="sidebar sidebar-collapsed-rail"
          onToggle={() => {
            void toggleSidebarPinned();
          }}
          title="Shell"
          toggleAriaLabel="Show Navigation"
          toggleTitle="Show Navigation"
        >
          <div className="shell-sidebar-dock shell-sidebar-dock-collapsed">
            <div className="desktop-window-dock-rail shell-sidebar-dock-rail" role="toolbar" aria-label="Shell actions">
              <button
                aria-label="Exit Surface"
                className="desktop-window-dock-item shell-sidebar-dock-item-collapsed"
                data-tooltip="Exit Surface"
                onClick={openEnvironmentExitDialog}
                type="button"
              >
                <span className="desktop-window-dock-icon shell-sidebar-dock-icon-collapsed" aria-hidden="true">
                  <span className="desktop-window-dock-glyph desktop-window-dock-glyph-exit" />
                </span>
                <span className="desktop-window-dock-indicator" aria-hidden="true" />
              </button>
            </div>
          </div>
        </ShellCollapsedRail>
      )}
      {canvasPinned ? (
        <main className="canvas" ref={canvasPanelRef}>
          <div className="panel-titlebar">
            <button
              aria-label="Hide Navigation"
              className="panel-titlebar-toggle"
              onClick={() => void toggleCanvasPinned()}
              title="Hide Navigation"
              type="button"
            >
              <span aria-hidden="true">−</span>
            </button>
            <span className="panel-titlebar-label">Surface</span>
          </div>
          <div className="canvas-body desktop-primary-mode">
            <DesktopWindowStage
              className="desktop-window-stage desktop-window-stage-floating"
              activeDesktopId={activeDesktopId}
              approvalRequests={approvalRequests}
              attentionItems={globalAttentionItems}
              createReplSession={handleCreateReplSession}
              currentProjectReplFocus={currentProjectReplFocus}
              currentFocusSummary={summary?.activeContext.focusSummary ?? "Environment posture is not yet available."}
              currentFocusTitle={summary?.activeContext.currentThreadTitle ?? summary?.environmentLabel ?? "Environment"}
              desktopDescriptors={desktopDescriptors}
              desktopZoom={activeDesktopZoom}
              actionQueue={dashboardActionQueue}
              displayCount={desktopModel?.displayCount ?? 0}
              displayPanel={desktopModel?.panels?.display ?? null}
              topDisplaySurface={desktopModel?.topDisplaySurface ?? null}
              focusedWindowId={focusedDesktopWindowId}
              inspectorPanel={desktopModel?.panels?.inspector ?? null}
              activeHostedAppId={activeHostedApp}
              activeHostedAppLabel={activeHostedAppDescriptor.label}
              activeHostedAppSummary={activeHostedAppDescriptor.summary}
              browserWorkspaceProps={{
                approvalRequests,
                artifacts,
                browseRuntimeEntity,
                conversationDraft,
                environmentFocus,
                incidents,
                inspectRuntimeSymbol,
                isDecidingApproval,
                isEditingSource,
                isInspectingRuntime,
                isReloadingSource,
                isStagingSource,
                loadSourcePreview,
                consoleLogStream,
                diagnosticReports,
                navigateToWorkspace: (workspaceId) => {
                  void navigateToWorkspace(workspaceId);
                },
                packageBrowser,
                parenDepthColors: lispParenColors,
                reloadSourceFile,
                runtimeEntityDetail,
                runtimeForm,
                runtimeInspection,
                runtimeInspectionMode,
                runtimeInspectorPackage,
                runtimeInspectorSymbol,
                runtimeSummary,
                runtimeTelemetry,
                selectedDomain: selectedBrowserDomain,
                selectedTelemetryProcessId,
                selectedPackageName,
                selectedThread,
                selectedThreadId,
                setConversationDraft,
                setIsEditingSource,
                setRuntimeForm,
                setRuntimeInspectionMode: updateRuntimeInspectionMode,
                setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
                setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
                setSelectedConsolePlane,
                setSelectedConsoleSourceFilter,
                setSelectedConsoleEntryId,
                setSelectedDiagnosticSourceFilter,
                setSelectedDiagnosticReportId,
                setSelectedPackageName,
                setSelectedTelemetryProcessId,
                setSelectedThreadId,
                setSourceDraft,
                sourceDraft,
                sourceMutationResult,
                sourcePreview,
                sourceReloadResult,
                stageSourceChange,
                selectedConsolePlane,
                selectedConsoleSourceFilter,
                documentationPages,
                selectedDocumentationSlug,
                selectedConsoleEntryId,
                selectedDiagnosticSourceFilter,
                selectedDiagnosticReport,
                selectedDiagnosticReportId,
                onOpenApprovalRequest: openApprovalRequest,
                onSubmitApprovalDecision: (requestId, decision) => {
                  void submitApprovalDecisionForRequest(requestId, decision);
                },
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                loadDocumentationPage,
                threads,
                workItems
              }}
              projectsWorkspaceProps={{
                approvalRequests,
                currentProjectId,
                isDecidingApproval,
                onAddArchitectureDecision: openProjectArchitectureDecisionDialog,
                onAddFeatureSpecification: openProjectFeatureSpecificationDialog,
                onAddQualityGate: openProjectQualityGateDialog,
                onAddRequirement: openProjectRequirementDialog,
                onAddSourceRoot: openProjectSourceRootDialog,
                onAddUserJourney: openProjectUserJourneyDialog,
                onBindTestingHarness: () => void openProjectTestingHarnessDialog(),
                onEditDesignSystem: openProjectDesignSystemDialog,
                onEditStyleGuide: openProjectStyleGuideDialog,
                onEditTestingStrategy: () => void openProjectTestingStrategyDialog(),
                onEditReleaseReadiness: openProjectReleaseReadinessDialog,
                onEditReadinessObligations: openProjectReadinessObligationsDialog,
                onCreateProjectDialog: () => setIsProjectCreateDialogOpen(true),
                onEditConstitution: openProjectConstitutionDialog,
                onOpenProjectDialog: () => setIsProjectOpenDialogOpen(true),
                onOpenApprovalRequest: openApprovalRequest,
                onSelectProject: setSelectedGovernedProjectId,
                onSubmitApprovalDecision: (requestId, decision) => {
                  void submitApprovalDecisionForRequest(requestId, decision);
                },
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                projectSummaries: projectListResult?.data.projects ?? [],
                selectedProjectDetail,
                selectedProjectId: selectedGovernedProjectId,
                workItems
              }}
              operateWorkspaceProps={{
                actionQueue: dashboardActionQueue,
                approvalRequests,
                artifacts,
                incidents,
                isDecidingApproval,
                leadAttention: shellProactiveLead,
                monitorItems: shellMonitorItems,
                navigateToActionQueueItem,
                navigateToBrowserDomain,
                navigateToConversationSection,
                navigateToEvidenceSection,
                navigateToExecutionSection,
                navigateToRecoverySection,
                openApprovalRequest,
                recommendedTarget: recommendedDockJumpTarget,
                recommendedTargets: shellRecommendedTargets,
                selectedApproval,
                selectedSection: selectedOperateSection,
                status,
                summary,
                submitApprovalDecisionForRequest: (requestId, decision) => {
                  void submitApprovalDecisionForRequest(requestId, decision);
                },
                workItems
              }}
              executionWorkspaceProps={{
                approvalRequests,
                createReplSession: handleCreateReplSession,
                currentReplSessionId,
                evaluateRuntimeForm,
                isEvaluating,
                inspectRuntimeSymbol,
                isInspectingRuntime,
                replSessionTitleDraft,
                replSessions: currentProjectReplSessions,
                runtimeForm,
                runtimeInspection,
                runtimeInspectionMode,
                runtimeInspectorPackage,
                runtimeInspectorSymbol,
                runtimeResult,
                runtimeSummary,
                selectedWorkflowRecord,
                selectedWorkItem,
                selectedWorkItemId,
                setReplSessionTitleDraft,
                setRuntimeForm,
                setRuntimeInspectionMode: updateRuntimeInspectionMode,
                setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
                setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
                switchReplSession: handleSwitchReplSession,
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                workItems
              }}
              approvalsWorkspaceProps={{
                approvalDecision,
                approvalRequests,
                environmentFocusLabel,
                isDecidingApproval,
                navigateToLinkedEntity,
                openConversationDraft: () =>
                  openConversationDraftWithFocusOverride({
                    ...createDefaultEnvironmentFocusState(),
                    kind: "governance-approval",
                    sourceWorkspace: "runtime",
                    sourceSurface: "approvals",
                    approvalId: selectedApprovalId
                  }),
                reconciliationDecision: status?.reconciliationDecision ?? summary?.reconciliationDecision ?? null,
                selectedApproval,
                selectedApprovalId,
                setSelectedApprovalId,
                submitApprovalDecisionForRequest,
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                workItems
              }}
              incidentsWorkspaceProps={{
                clearPendingIncidentFocusId: () => setPendingIncidentFocusId(null),
                environmentFocusLabel,
                incidents,
                navigateToLinkedEntity,
                openIncidentRemediationPlanDialog,
                openConversationDraft: () =>
                  openConversationDraftWithFocusOverride({
                    ...createDefaultEnvironmentFocusState(),
                    kind: "governance-incident",
                    sourceWorkspace: "incidents",
                    sourceSurface: "incidents",
                    incidentId: selectedIncidentId
                  }),
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                pendingIncidentFocusId,
                selectedIncident,
                selectedIncidentId,
                setSelectedIncidentId
              }}
              workWorkspaceProps={{
                approvalRequests,
                clearPendingWorkItemFocusId: () => setPendingWorkItemFocusId(null),
                environmentFocusLabel,
                isDecidingApproval,
                navigateToLinkedEntity,
                openApprovalRequest,
                openCompleteWorkItemValidationsDialog: openWorkItemValidationDialog,
                openConversationDraft: () =>
                  openConversationDraftWithFocusOverride({
                    ...createDefaultEnvironmentFocusState(),
                    kind: "governance-work-item",
                    sourceWorkspace: "runtime",
                    sourceSurface: "operate",
                    workItemId: selectedWorkItemId
                  }),
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                openQuarantineWorkItemDialog: openWorkItemQuarantineDialog,
                openResumeWorkItemDialog: openWorkItemResumeDialog,
                openRollbackWorkItemDialog: openWorkItemRollbackDialog,
                openSteerWorkItemDialog: openWorkItemSteerDialog,
                pendingWorkItemFocusId,
                selectedWorkflowRecord,
                selectedWorkItem,
                selectedWorkItemPlan,
                selectedWorkItemId,
                setSelectedWorkItemId,
                submitApprovalDecisionForRequest,
                workItems
              }}
              evidenceWorkspaceProps={{
                artifacts,
                environmentFocusLabel,
                eventFamilyFilter,
                eventVisibilityFilter,
                events: environmentEvents,
                navigateToLinkedEntity,
                openConversationDraft: () =>
                  openConversationDraftWithFocusOverride(
                    selectedArtifactId
                      ? {
                          ...createDefaultEnvironmentFocusState(),
                          kind: "evidence-artifact",
                          sourceWorkspace: "artifacts",
                          sourceSurface: "artifacts",
                          artifactId: selectedArtifactId
                        }
                      : {
                          ...createDefaultEnvironmentFocusState(),
                          kind: "evidence-event",
                          sourceWorkspace: "artifacts",
                          sourceSurface: "artifacts",
                          eventCursor: selectedEventCursor
                        }
                  ),
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                selectedArtifact,
                selectedArtifactId,
                selectedEvent,
                selectedEventCursor,
                setEventFamilyFilter,
                setEventVisibilityFilter,
                setSelectedArtifactId,
                setSelectedEventCursor
              }}
              conversationsWorkspaceProps={{
                activateConversationInspectorSection,
                conversationDraft,
                draftFocusActions: conversationDraftFocusActions,
                environmentFocusLabel,
                environmentFocusSummary: environmentFocusPresentation.summary,
                environmentFocusTitle: environmentFocusPresentation.title,
                conversationSections,
                currentReplSessionId,
                createReplSession: handleCreateReplSession,
                evaluateRuntimeForm,
                inspectRuntimeSymbol,
                isEvaluating,
                isInspectingRuntime,
                navigateToLinkedEntity,
                onOpenCreateConversationSession: () => {
                  setIsConversationSessionCreateDialogOpen(true);
                },
                onOpenRenameConversationSession: (threadId, title) => {
                  setConversationThreadRenameTargetId(threadId);
                  setConversationThreadRenameDraft(title);
                  setIsConversationThreadRenameDialogOpen(true);
                },
                pageSignalCounts,
                replSessionTitleDraft,
                replSessions: currentProjectReplSessions,
                runtimeForm,
                runtimeInspection,
                runtimeInspectionMode,
                runtimeInspectorPackage,
                runtimeInspectorSymbol,
                runtimeResult,
                runtimeSummary,
                switchReplSession: handleSwitchReplSession,
                selectedSection: selectedConversationSection,
                selectedConversationMessageId,
                selectedThread,
                selectedThreadId,
                selectedTurn,
                selectedTurnId,
                setReplSessionTitleDraft,
                setConversationDraft,
                setSelectedConversationMessageId,
                setRuntimeForm,
                setRuntimeInspectionMode: updateRuntimeInspectionMode,
                setRuntimeInspectorPackage: updateRuntimeInspectorPackage,
                setRuntimeInspectorSymbol: updateRuntimeInspectorSymbol,
                setSelectedThreadId,
                setSelectedTurnId,
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                threads
              }}
              configurationWorkspaceProps={{
                configurationSections,
                lispParenColors: lispParenColors,
                normalizeParenDepthColors,
                resolvedTheme,
                selectedSection: selectedConfigurationSection,
                setSelectedSection: setSelectedConfigurationSection,
                systemTheme,
                themePreference,
                tooltipScalePercent,
                controlIconScalePercent,
                dockIconScalePercent,
                conversationTextScalePercent,
                sourceCodeTextScalePercent,
                providerSummary,
                packageManagementSummary
              }}
              editorSurfaceProps={{
                acceptCurrentBufferBaseline: acceptCurrentEditorBufferBaseline,
                cloneEditorBuffer: cloneCurrentEditorBuffer,
                createEditorBuffer,
                currentBufferDirty: currentEditorBufferDirty,
                currentBufferTitle: currentEditorBufferTitle,
                deleteEditorBuffers: deleteCurrentEditorBuffers,
                editorBuffers: currentEditorBuffers,
                editorPackage: currentEditorPackage,
                editorDraft: currentEditorDraft,
                setEditorDraft: setCurrentEditorDraft,
                editorResult: currentEditorResult,
                packageBrowser,
                runtimeEntityDetail,
                runtimeInspection,
                selectedBufferId: currentEditorBufferId,
                setSelectedBufferId: setCurrentEditorBufferId,
                sourcePreview,
                runtimeSummary,
                isEvaluating,
                parenDepthColors: lispParenColors,
                sourceCodeTextScalePercent,
                inspectDefinitionSymbol: async (symbol, packageName, mode) => {
                  await browseRuntimeEntity(symbol, packageName, mode ?? "definitions");
                },
                fetchRuntimeSymbolHelp: async (symbol, packageName) => {
                  if (!effectiveEnvironmentId || symbol.trim().length === 0) {
                    return null;
                  }
                  try {
                    const result = await window.sbclAgentDesktop.query.runtimeEntityDetail({
                      environmentId: effectiveEnvironmentId,
                      symbol: symbol.trim(),
                      packageName
                    });
                    return {
                      detail: result.data.signature
                        ? `${result.data.entityKind} • ${result.data.signature}`
                        : result.data.entityKind,
                      info: result.data.summary,
                      signature: result.data.signature ?? null,
                      type:
                        result.data.entityKind === "macro"
                          ? "keyword"
                          : result.data.entityKind === "function" || result.data.entityKind === "generic-function"
                            ? "function"
                            : result.data.entityKind === "variable"
                              ? "variable"
                              : result.data.entityKind === "class"
                                ? "class"
                                : "text",
                      packageName: result.data.packageName
                    };
                  } catch (_error) {
                    return null;
                  }
                },
                reportEditorCursorContext: ({ symbol, packageName, help }) => {
                  setCurrentEditorCursorSymbol(symbol);
                  setCurrentEditorCursorSymbolPackage(packageName);
                  setCurrentEditorCursorSymbolHelp(help);
                },
                evaluateEditorBuffer,
                openEditorSourceFileDialog,
                openEditorSourceFileSaveDialog,
                saveCurrentEditorBuffer: handleSaveCurrentEditorBuffer,
                revertCurrentBufferToBaseline: revertCurrentEditorBufferToBaseline,
                openSourcePreview: loadSourcePreview,
                openConversationRepl: async (form) => {
                  setRuntimeForm(form);
                  updateRuntimeInspectorPackage(currentEditorPackage);
                  await navigateToConversationSection("repl");
                },
                setRuntimeForm,
                openInspectorSurface: () => navigateToDesktopPanel("inspector")
              }}
              workspaceSurfaceProps={{
                evaluateWorkspaceForm,
                evaluateWorkspaceSource,
                isEvaluating,
                openConversationRepl: async (form) => {
                  setRuntimeForm(form);
                  updateRuntimeInspectorPackage(currentWorkspacePackage);
                  await navigateToConversationSection("repl");
                },
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                runtimeSummary,
                setWorkspacePackage: setCurrentWorkspacePackage,
                workspacePackage: currentWorkspacePackage,
                setRuntimeForm,
                setWorkspaceDraft: setCurrentWorkspaceDraft,
                workspaceDraft: currentWorkspaceDraft,
                workspaceHistory: currentWorkspaceHistory,
                workspaceResult: currentWorkspaceResult
              }}
              transcriptSurfaceProps={{
                openConversationRepl: async (form) => {
                  setRuntimeForm(form);
                  updateRuntimeInspectorPackage(currentWorkspacePackage);
                  await navigateToConversationSection("repl");
                },
                openConversationContext: async (threadId, turnId) => {
                  setSelectedThreadId(threadId);
                  if (turnId) {
                    setSelectedTurnId(turnId);
                    await navigateToConversationSection("turns");
                    return;
                  }
                  await navigateToConversationSection("threads");
                },
                openEvidenceObservation: () => navigateToEvidenceSection("observation"),
                openInspectorSurface: () => navigateToDesktopPanel("inspector"),
                openListener: async (form) => {
                  setRuntimeForm(form);
                  await navigateToExecutionSection("listener");
                },
                setWorkspaceDraft: setCurrentWorkspaceDraft,
                transcriptEntries
              }}
              activeWorkspace={activeWorkspace}
              selectedExecutionSection={selectedExecutionSection}
              currentProjectTitle={currentProject?.title ?? "implicit"}
              bindingId={binding?.environmentId ?? "unbound"}
              centerAttentionSignals={centerAttentionSignals}
              hostState={hostStatus?.hostState ?? "starting"}
              runtimeState={status?.runtimeState ?? "unknown"}
              workflowState={status?.workflowState ?? "unknown"}
              shellCurrentSurfaceSummary={shellCurrentSurfaceSummary}
              leadAttention={shellProactiveLead}
              governedAttentionSignalCount={governedAttentionSignalCount}
              currentReplSessionId={currentReplSessionId}
              evaluateRuntimeForm={evaluateRuntimeForm}
              incidents={incidents}
              isEvaluating={isEvaluating}
              isInspectingRuntime={isInspectingRuntime}
              isDecidingApproval={isDecidingApproval}
              onCloseWindow={(windowId) => {
                closeDesktopWindow(windowId);
              }}
              onCascadeLayout={() => {
                cascadeDesktopWindowLayoutState();
              }}
              onCreateDesktop={createDesktopSpace}
              onFocusWindow={(window) => {
                focusDesktopWindow(window.id);
                if (window.hostedAppId === "listener-workbench") {
                  void openListenerWorkbench();
                } else if (window.hostedAppId === "control-panel") {
                  void navigateToHostedApp("control-panel");
                } else {
                  const windowWorkspace = workspaceForDesktopWindow(window);
                  if (windowWorkspace) {
                    void navigateToWorkspace(windowWorkspace);
                  } else if (window.panelId) {
                    void navigateToDesktopPanel(window.panelId);
                  }
                }
              }}
              onMinimizeWindow={(windowId) => {
                minimizeDesktopWindow(windowId);
              }}
              onMoveWindowToPreviousDesktop={(windowId) => {
                moveWindowToPreviousDesktop(windowId);
              }}
              onMoveWindowToNextDesktop={(windowId) => {
                moveWindowToNextDesktop(windowId);
              }}
              onResetLayout={() => {
                resetDesktopWindowLayoutState();
              }}
              onRestoreWindow={(windowId) => {
                restoreDesktopWindow(windowId);
              }}
              onMoveWindow={(windowId, direction) => {
                moveDesktopWindowState(windowId, direction);
              }}
              onPositionWindow={(windowId, x, y) => {
                positionDesktopWindowState(windowId, x, y);
              }}
              onResizeWindow={(windowId, preset) => {
                resizeDesktopWindowState(windowId, preset);
              }}
              onResizeWindowToDimensions={(windowId, width, height) => {
                resizeDesktopWindowDimensionsState(windowId, width, height);
              }}
              onSetWindowFrame={(windowId, x, y, width, height) => {
                setDesktopWindowFrameState(windowId, x, y, width, height);
              }}
              onTileLayout={() => {
                tileDesktopWindowLayoutState();
              }}
              onOpenAttentionItem={(item) => {
                void navigateToWorkspace(item.workspace);
              }}
              onOpenActionQueueItem={(item) => {
                void navigateToActionQueueItem(item);
              }}
              onOpenDisplaySurface={() => {
                void navigateToDesktopPanel("display");
              }}
              onOpenInspectorSurface={() => {
                void navigateToDesktopPanel("inspector");
              }}
              browserSurfaceEntries={browserSurfaceEntries}
              browserSurfaceSummary={selectedBrowserDomainDescriptor.summary}
              browserSurfaceTitle={selectedBrowserDomainDescriptor.label}
              onOpenShellContextWindow={() => {
                openDesktopWindow("window:shell-context");
              }}
              onOpenProactivityWindow={() => {
                void navigateToOperateSection("journeys");
              }}
              onOpenDetailedSurfaceWindow={() => {
                openDesktopWindow("window:detailed-surface");
              }}
              onOpenBrowserSurfaceWindow={() => {
                openDesktopWindow("window:browser-surface");
              }}
              onOpenRuntimeWindow={() => {
                void openListenerWorkbench();
              }}
              onOpenWorkflowWindow={() => {
                void navigateToOperateSection("journeys");
              }}
              onOpenIncident={(incidentId) => {
                void continueRecovery(incidentId);
              }}
              onSubmitApprovalDecision={(requestId, decision) => {
                void submitApprovalDecisionForRequest(requestId, decision);
              }}
              onSwitchDesktop={switchDesktopSpace}
              onZoomIn={() => {
                updateActiveDesktopZoom(activeDesktopZoom + 0.1);
              }}
              onZoomOut={() => {
                updateActiveDesktopZoom(activeDesktopZoom - 0.1);
              }}
              onZoomReset={() => {
                updateActiveDesktopZoom(1);
              }}
              onOpenDetailedWorkspace={() => {
                if (activeHostedApp === "listener-workbench") {
                  void openListenerWorkbench();
                  return;
                }
                void navigateToWorkspace(activeWorkspace);
              }}
              undockedPanelContentById={allShellPanelContentById}
              undockDropTargetActive={shellPanelDragState?.target === "undocked"}
              undockDropTargetRef={desktopWindowStageDropTargetRef}
              onDropUndockedPanel={(panelId) => {
                void undockShellPanel(panelId);
                endNativeShellPanelDrag();
              }}
              onDockUndockedPanelLeft={(panelId) => {
                void dockShellPanel(panelId, "left");
              }}
              onDockUndockedPanelRight={(panelId) => {
                void dockShellPanel(panelId, "right");
              }}
              replSessionTitleDraft={replSessionTitleDraft}
              replSessions={currentProjectReplSessions}
              runtimeForm={runtimeForm}
              runtimeInspectionMode={runtimeInspectionMode}
              runtimeInspectorPackage={runtimeInspectorPackage}
              runtimeInspectorSymbol={runtimeInspectorSymbol}
              runtimeInspection={runtimeInspection}
              runtimeEntityDetail={runtimeEntityDetail}
              runtimeResult={runtimeResult}
              runtimeSummary={runtimeSummary}
              inspectRuntimeSymbol={inspectRuntimeSymbol}
              setReplSessionTitleDraft={setReplSessionTitleDraft}
              setRuntimeInspectionMode={updateRuntimeInspectionMode}
              setRuntimeInspectorPackage={updateRuntimeInspectorPackage}
              setRuntimeInspectorSymbol={updateRuntimeInspectorSymbol}
              setRuntimeForm={setRuntimeForm}
              switchReplSession={handleSwitchReplSession}
              windows={desktopWindowSnapshots}
            />
          </div>
        </main>
      ) : (
        <aside className="canvas canvas-collapsed-rail" aria-label="Collapsed workspace canvas">
          <div className="collapsed-panel-titlebar">
            <button
              aria-label="Show Navigation"
              className="panel-titlebar-toggle collapsed-panel-toggle"
              onClick={() => void toggleCanvasPinned()}
              title="Show Navigation"
              type="button"
            >
              <span aria-hidden="true">+</span>
            </button>
            <span className="collapsed-panel-title">Surface</span>
          </div>
        </aside>
      )}

      {canvasPinned && inspectorPinned && viewportWidth > SHELL_STACK_BREAKPOINT ? (
        <ShellColumnSplitter
          active={isInspectorResizing}
          ariaLabel="Resize inspector"
          layout={splitterLayout}
          onMouseDown={startInspectorResize}
          side="right"
        />
      ) : null}

      {inspectorPinned ? (
        <ShellRailHost
          activePanelId={shellLayout.rightRail.activePanelId}
          ariaLabel="Workspace inspector"
          dockPanels={rightRailPanels}
          dragTargetActive={shellPanelDragState?.target === "right"}
          listRef={rightRailListRef}
          onDropDockedPanel={(panelId) => {
            void dockShellPanel(panelId, "right");
            endNativeShellPanelDrag();
          }}
          onNativeDragEnd={endNativeShellPanelDrag}
          onNativeDragStart={(panelId, panelLabel, origin) => {
            beginNativeShellPanelDrag(panelId, panelLabel, origin);
          }}
          onPanelPointerDown={(panelId, panelLabel, event) => {
            beginShellPanelPointerDrag(panelId, panelLabel, "right", event.clientX, event.clientY);
          }}
          onToggle={() => {
            void toggleInspectorPinned();
          }}
          onSelectPanel={(panelId) => activateShellRailPanel("right", panelId)}
          onUndockPanel={(panelId) => {
            void undockShellPanel(panelId);
          }}
          onMovePanel={(panelId, direction) => {
            void reorderShellRailPanel("right", panelId, direction);
          }}
          panelRef={inspectorPanelRef}
          title="Inspector"
          toggleAriaLabel="Collapse workspace panel"
          toggleTitle="Collapse workspace panel"
        >
          {activeRightRailPanelEntry?.content ?? null}
        </ShellRailHost>
      ) : (
        <ShellCollapsedRail
          ariaLabel="Collapsed inspector utility window"
          className="inspector inspector-collapsed-rail"
          onToggle={() => {
            void toggleInspectorPinned();
          }}
          title="Inspector"
          toggleAriaLabel="Open Inspector"
          toggleTitle="Open Inspector"
        />
      )}
      {shellTooltip ? (
        <div
          className="shell-tooltip-layer"
          role="tooltip"
          style={{ left: `${shellTooltip.x}px`, top: `${shellTooltip.y}px` }}
        >
          {shellTooltip.label}
        </div>
      ) : null}
      {shellPanelDragState ? (
        <div
          className="shell-panel-drag-ghost"
          style={{ left: `${shellPanelDragState.x + 14}px`, top: `${shellPanelDragState.y + 14}px` }}
        >
          {shellPanelDragState.panelLabel}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceInspector({
  activeWorkspace,
  binding,
  onToggleInspector,
  panelRef,
  summary,
  status,
  selectedThread,
  selectedTurn,
  conversationSendError,
  conversationDraft,
  conversationAttachments,
  conversationStream,
  isSendingConversation,
  sendConversationMessage,
  onConversationAttachmentSelection,
  removeConversationAttachment,
  selectedConversationSection,
  selectedConfigurationSection,
  runtimeEntityDetail,
  runtimeSummary,
  runtimeInspection,
  runtimeTelemetry,
  consoleLogStream,
  diagnosticReports,
  selectedConsolePlane,
  selectedConsoleSourceFilter,
  visibleConsoleEntryCount,
  selectedDiagnosticSourceFilter,
  visibleDiagnosticReportCount,
  transcriptEntries,
  currentWorkspaceHistoryCount,
  currentReplHistoryCount,
  currentProject,
  selectedProjectDetail,
  selectedProjectSummary,
  runtimeForm,
  lispParenColors,
  resolvedTheme,
  sourcePreview,
  workspaceDraft,
  workspaceResult,
  workspaceTitle,
  selectedApproval,
  selectedWorkItem,
  selectedWorkItemPlan,
  selectedWorkflowRecord,
  selectedIncident,
  selectedArtifact,
  selectedConsoleEntry,
  selectedConversationMessage,
  selectedEvent,
  selectedBrowserDomain,
  selectedOperateSection,
  selectedTelemetryProcess,
  selectedDiagnosticReport,
  selectedDiagnosticReportSummary,
  currentEditorChangedFormCount,
  currentEditorBufferDirty,
  currentEditorBufferTitle,
  currentEditorBuffers,
  editorDraft,
  editorResult,
  editorPackage,
  currentEditorCursorSymbol,
  currentEditorCursorSymbolPackage,
  currentEditorCursorSymbolHelp,
  selectedDocumentationPage,
  selectedEvidenceSection,
  pendingConversationComposerFocusThreadId,
  systemTheme,
  themePreference,
  providerSummary,
  packageManagementSummary,
  packageManagementStatusMessage,
  packageManagementError,
  packageManagementCommandResult,
  quicklispSystemDraft,
  qlotCommandDraft,
  sourceRegistryDraftPath,
  sourceRegistryEditOriginalPath,
  localProjectPathDraft,
  localProjectNameDraft,
  providerProfileDraft,
  selectedProviderProfileName,
  providerProfileStatusMessage,
  providerProfileError,
  isSavingProviderProfile,
  isUpdatingProviderRouting,
  isPackageManagementBusy,
  tooltipScalePercent,
  controlIconScalePercent,
  dockIconScalePercent,
  conversationTextScalePercent,
  sourceCodeTextScalePercent,
  openPublishedDocumentation,
  clearPendingConversationComposerFocusThreadId,
  setConversationDraft,
  setSelectedConversationMessageId,
  updateLispParenColor,
  updateThemePreference,
  updateDesktopSurfaceScalePreference,
  setProviderProfileDraft,
  setSelectedProviderProfileName,
  setQuicklispSystemDraft,
  setQlotCommandDraft,
  setSourceRegistryDraftPath,
  setSourceRegistryEditOriginalPath,
  setLocalProjectPathDraft,
  setLocalProjectNameDraft,
  applyProviderRoutingMode,
  activateProviderProfile,
  saveProviderProfile,
  installQuicklispPackage,
  executeQlotCommand,
  saveSourceRegistryEntry,
  removeSourceRegistryPath,
  saveLocalProject,
  removeLocalProjectByName,
  artifacts,
  environmentEvents,
  workItems,
  navigateToLinkedEntity,
  renderChrome = true
}: {
  activeWorkspace: WorkspaceId;
  binding: BindingDto | null;
  onToggleInspector: () => void;
  panelRef?: React.RefObject<HTMLElement | null>;
  summary: EnvironmentSummaryDto | null;
  status: EnvironmentStatusDto | null;
  selectedThread: ThreadDetailDto | null;
  selectedTurn: TurnDetailDto | null;
  conversationSendError: string | null;
  conversationDraft: string;
  conversationAttachments: ConversationAttachmentDto[];
  conversationStream: {
    threadId: string;
    turnId: string | null;
    content: string;
  } | null;
  isSendingConversation: boolean;
  sendConversationMessage: () => Promise<void>;
  onConversationAttachmentSelection: (files: FileList | null) => Promise<void>;
  removeConversationAttachment: (attachmentId: string) => void;
  selectedConversationSection: ConversationSection;
  selectedConfigurationSection: ConfigurationSection;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  diagnosticReports: DiagnosticReportSummaryDto[];
  selectedConsolePlane: "environment" | "host";
  selectedConsoleSourceFilter: string;
  visibleConsoleEntryCount: number;
  selectedDiagnosticSourceFilter: string;
  visibleDiagnosticReportCount: number;
  transcriptEntries: TranscriptSurfaceEntry[];
  currentWorkspaceHistoryCount: number;
  currentReplHistoryCount: number;
  currentProject: ProjectProfileDto | null;
  selectedProjectDetail: ProjectDetailDto | null;
  selectedProjectSummary: ProjectSummaryDto | null;
  runtimeForm: string;
  lispParenColors: string[];
  resolvedTheme: ResolvedTheme;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  workspaceDraft: string;
  workspaceResult: CommandResultDto<RuntimeEvalResultDto> | null;
  workspaceTitle: string;
  selectedApproval: ApprovalRequestDto | null;
  selectedWorkItem: WorkItemDetailDto | null;
  selectedWorkItemPlan: WorkItemPlanDto | null;
  selectedWorkflowRecord: WorkflowRecordDto | null;
  selectedIncident: IncidentDetailDto | null;
  selectedArtifact: ArtifactDetailDto | null;
  selectedConsoleEntry: ConsoleLogEntryDto | null;
  selectedConversationMessage: MessageDto | null;
  selectedEvent: EnvironmentEventDto | null;
  selectedBrowserDomain: BrowserDomain;
  selectedOperateSection: OperateSection;
  selectedTelemetryProcess: RuntimeTelemetryProcessDto | null;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  selectedDiagnosticReportSummary: DiagnosticReportSummaryDto | null;
  currentEditorChangedFormCount: number;
  currentEditorBufferDirty: boolean;
  currentEditorBufferTitle: string;
  currentEditorBuffers: EditorBufferStateDto[];
  editorDraft: string;
  editorResult: CommandResultDto<RuntimeEvalResultDto> | null;
  editorPackage: string;
  currentEditorCursorSymbol: string | null;
  currentEditorCursorSymbolPackage: string;
  currentEditorCursorSymbolHelp: {
    detail: string;
    info: string;
    type?: string;
    packageName?: string;
    signature?: string | null;
  } | null;
  selectedDocumentationPage: DocumentationPageDto | null;
  selectedEvidenceSection: EvidenceSection;
  pendingConversationComposerFocusThreadId: string | null;
  systemTheme: ResolvedTheme;
  themePreference: ThemePreference;
  providerSummary: ProviderProfileSummaryDto | null;
  packageManagementSummary: PackageManagementSummaryDto | null;
  packageManagementStatusMessage: string | null;
  packageManagementError: string | null;
  packageManagementCommandResult: PackageManagementCommandResultDto | null;
  quicklispSystemDraft: string;
  qlotCommandDraft: string;
  sourceRegistryDraftPath: string;
  sourceRegistryEditOriginalPath: string | null;
  localProjectPathDraft: string;
  localProjectNameDraft: string;
  providerProfileDraft: ConfigureProviderProfileInput;
  selectedProviderProfileName: string;
  providerProfileStatusMessage: string | null;
  providerProfileError: string | null;
  isSavingProviderProfile: boolean;
  isUpdatingProviderRouting: boolean;
  isPackageManagementBusy: boolean;
  tooltipScalePercent: number;
  controlIconScalePercent: number;
  dockIconScalePercent: number;
  conversationTextScalePercent: number;
  sourceCodeTextScalePercent: number;
  openPublishedDocumentation: () => Promise<void>;
  clearPendingConversationComposerFocusThreadId: () => void;
  setConversationDraft: (value: string) => void;
  setSelectedConversationMessageId: (messageId: string | null) => void;
  updateLispParenColor: (index: number, color: string) => Promise<void>;
  updateThemePreference: (value: ThemePreference) => Promise<void>;
  updateDesktopSurfaceScalePreference: (
    key: "tooltipScalePercent" | "controlIconScalePercent" | "dockIconScalePercent" | "conversationTextScalePercent" | "sourceCodeTextScalePercent",
    value: number
  ) => Promise<void>;
  setProviderProfileDraft: React.Dispatch<React.SetStateAction<ConfigureProviderProfileInput>>;
  setSelectedProviderProfileName: React.Dispatch<React.SetStateAction<string>>;
  setQuicklispSystemDraft: React.Dispatch<React.SetStateAction<string>>;
  setQlotCommandDraft: React.Dispatch<React.SetStateAction<string>>;
  setSourceRegistryDraftPath: React.Dispatch<React.SetStateAction<string>>;
  setSourceRegistryEditOriginalPath: React.Dispatch<React.SetStateAction<string | null>>;
  setLocalProjectPathDraft: React.Dispatch<React.SetStateAction<string>>;
  setLocalProjectNameDraft: React.Dispatch<React.SetStateAction<string>>;
  applyProviderRoutingMode: (mode: ProviderRoutingMode) => Promise<void>;
  activateProviderProfile: (profileName: string) => Promise<void>;
  saveProviderProfile: (clearApiKey?: boolean) => Promise<void>;
  installQuicklispPackage: () => Promise<void>;
  executeQlotCommand: () => Promise<void>;
  saveSourceRegistryEntry: () => Promise<void>;
  removeSourceRegistryPath: (path: string) => Promise<void>;
  saveLocalProject: () => Promise<void>;
  removeLocalProjectByName: (name: string) => Promise<void>;
  artifacts: ArtifactSummaryDto[];
  environmentEvents: EnvironmentEventDto[];
  workItems: WorkItemSummaryDto[];
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  renderChrome?: boolean;
}) {
  const selectedConfigurationDescriptor =
    configurationSections.find((section) => section.id === selectedConfigurationSection) ?? configurationSections[0];
  const selectedConfigurationCurrentValue =
    selectedConfigurationSection === "theme"
      ? themePreference === "system"
        ? "System"
        : themePreference
      : selectedConfigurationSection === "lisp-code-view"
        ? `${normalizeParenDepthColors(lispParenColors).length} depth colors`
        : selectedConfigurationSection === "llm"
          ? `${providerSummary?.routingMode ?? "auto"} / ${providerSummary?.activeProfileName ?? "default"} / ${providerSummary?.profileCount ?? 0} profiles`
          : selectedConfigurationSection === "package-management"
            ? `${packageManagementSummary?.packageManager ?? "asdf"} / ${packageManagementSummary?.managedSourceRegistryEntryCount ?? 0} source entries / ${packageManagementSummary?.localProjectCount ?? 0} local projects`
        : `Tooltip ${tooltipScalePercent}% / Controls ${controlIconScalePercent}% / Dock ${dockIconScalePercent}% / Conversation ${conversationTextScalePercent}% / Source ${sourceCodeTextScalePercent}%`;
  const selectedConfigurationResolvedValue =
    selectedConfigurationSection === "theme"
      ? resolvedTheme
      : selectedConfigurationSection === "lisp-code-view"
        ? "Structured Lisp renderer"
        : selectedConfigurationSection === "llm"
          ? providerSummary?.activeProfile?.provider ?? "Provider profiles and routing"
          : selectedConfigurationSection === "package-management"
            ? packageManagementSummary?.qlotProjectRoot ??
              packageManagementSummary?.workingDirectory ??
              "Managed Quicklisp, Qlot, source-registry, and local-project state."
        : "Independent shell surface scaling, including workspace conversation text.";
  const messageStackRef = useRef<HTMLDivElement | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const displayedConversationMessages =
    selectedThread &&
    conversationStream &&
    conversationStream.threadId === selectedThread.threadId &&
    conversationStream.content.length > 0
      ? [
          ...selectedThread.messages,
          {
            messageId: `streaming-${conversationStream.turnId ?? selectedThread.threadId}`,
            role: "assistant" as const,
            content: conversationStream.content,
            createdAt: new Date().toISOString()
          }
        ]
      : selectedThread?.messages ?? [];
  const renderedDocumentationHtml = useMemo(
    () => renderDocumentationMarkdown(selectedDocumentationPage?.markdown ?? ""),
    [selectedDocumentationPage?.markdown]
  );

  useEffect(() => {
    if (activeWorkspace !== "conversations") {
      return;
    }
    const messageStack = messageStackRef.current;
    if (!messageStack) {
      return;
    }
    messageStack.scrollTop = messageStack.scrollHeight;
  }, [
    activeWorkspace,
    selectedConversationSection,
    selectedThread?.threadId,
    displayedConversationMessages.length,
    conversationStream?.content,
    conversationStream?.turnId,
    isSendingConversation
  ]);

  useEffect(() => {
    if (activeWorkspace !== "conversations") {
      return;
    }
    const textarea = composerTextareaRef.current;
    if (!textarea) {
      return;
    }
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computedStyle.borderBottomWidth) || 0;
    const frameHeight = paddingTop + paddingBottom + borderTop + borderBottom;
    const minHeight = lineHeight * 5 + frameHeight;
    const maxHeight = lineHeight * 15 + frameHeight;

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [activeWorkspace, selectedConversationSection, conversationDraft, selectedThread?.threadId]);

  useEffect(() => {
    if (
      activeWorkspace !== "conversations" ||
      !pendingConversationComposerFocusThreadId ||
      selectedThread?.threadId !== pendingConversationComposerFocusThreadId
    ) {
      return;
    }
    const textarea = composerTextareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.focus();
    const valueLength = textarea.value.length;
    textarea.setSelectionRange(valueLength, valueLength);
    clearPendingConversationComposerFocusThreadId();
  }, [activeWorkspace, pendingConversationComposerFocusThreadId, selectedThread?.threadId]);

  const currentFocusTitle =
    activeWorkspace === "conversations"
      ? selectedTurn?.title ?? selectedThread?.title ?? "No conversation focus"
      : activeWorkspace === "projects"
        ? selectedProjectDetail?.title ?? selectedProjectSummary?.title ?? currentProject?.title ?? "No project selected"
      : activeWorkspace === "transcript"
        ? transcriptEntries[0]?.title ?? "Transcript"
      : activeWorkspace === "workspace"
        ? `${workspaceTitle} Workspace`
      : activeWorkspace === "editor"
        ? `${currentEditorBufferTitle} Editor`
      : activeWorkspace === "browser"
        ? selectedBrowserDomain === "console"
          ? `${selectedConsolePlane === "host" ? "Host" : "Environment"} Console${
              selectedConsoleSourceFilter !== "All Sources" ? ` / ${selectedConsoleSourceFilter}` : ""
            }`
          : selectedBrowserDomain === "diagnostics"
            ? selectedDiagnosticReport?.title ??
              selectedDiagnosticReportSummary?.title ??
              `Diagnostics${selectedDiagnosticSourceFilter !== "All Sources" ? ` / ${selectedDiagnosticSourceFilter}` : ""}`
            : selectedBrowserDomain === "processes"
              ? selectedTelemetryProcess?.label ?? "Runtime Processes"
              : selectedBrowserDomain === "performance"
                ? "Runtime Performance"
                : selectedBrowserDomain === "host-io"
                  ? "Host I/O"
                  : runtimeInspection?.data.symbol ?? sourcePreview?.data.path ?? runtimeSummary?.currentPackage ?? "No browser focus"
        : activeWorkspace === "runtime"
          ? selectedWorkItem?.title ?? selectedApproval?.title ?? runtimeSummary?.currentPackage ?? "Listener"
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.title ?? "User Documentation"
          : activeWorkspace === "incidents"
            ? selectedIncident?.title ?? "No incident selected"
            : activeWorkspace === "artifacts"
              ? selectedEvidenceSection === "observation"
              ? selectedEvent?.kind ?? "No event selected"
                : selectedArtifact?.title ?? "No artifact selected"
              : activeWorkspace === "configuration"
                ? selectedConfigurationDescriptor.label
                : summary?.activeContext.currentThreadTitle ?? summary?.environmentLabel ?? "Environment";

  const currentFocusSummary =
    activeWorkspace === "conversations"
      ? selectedTurn?.summary ?? selectedThread?.summary ?? "Select a thread or turn to inspect structured conversation state."
      : activeWorkspace === "projects"
        ? selectedProjectDetail?.summary ??
          selectedProjectSummary?.summary ??
          "Select a governed project to inspect its constitution, requirements, journeys, architecture, and linked evidence."
      : activeWorkspace === "transcript"
        ? transcriptEntries[0]?.summary ?? "Transcript keeps durable evaluation and environment feedback visible across the environment."
      : activeWorkspace === "workspace"
        ? workspaceResult?.data.summary ??
          "Draft Lisp forms here, evaluate them deliberately, and keep the retained scratch history separate from both conversation turns and listener execution posture."
      : activeWorkspace === "editor"
        ? editorResult?.data.summary ??
          `${currentEditorBuffers.length} retained editor buffer${currentEditorBuffers.length === 1 ? "" : "s"} support sustained source and form editing without collapsing the work into scratch posture or forcing it into the Browser. ${currentEditorChangedFormCount} changed form${currentEditorChangedFormCount === 1 ? "" : "s"} currently differ from the retained baseline.`
      : activeWorkspace === "browser"
        ? selectedBrowserDomain === "console"
          ? selectedConsoleEntry?.message ??
            `${consoleLogStream?.data.summary ?? "Inspect governed environment log entries with severity, source, and operational correlation."} ${
              visibleConsoleEntryCount
            } visible of ${consoleLogStream?.data.entries.length ?? 0} total.`
          : selectedBrowserDomain === "diagnostics"
            ? selectedDiagnosticReport?.summary ??
              selectedDiagnosticReportSummary?.summary ??
              `Inspect retained host diagnostic reports, crash artifacts, and analytics outputs. ${
                visibleDiagnosticReportCount
              } visible of ${diagnosticReports.length} total.`
            : selectedBrowserDomain === "processes"
              ? selectedTelemetryProcess?.summary ??
                runtimeTelemetry?.activitySummary ??
                "Inspect governed runtime-linked processes and their operational attachments."
              : selectedBrowserDomain === "performance"
                ? runtimeTelemetry?.cpu.summary ??
                  runtimeTelemetry?.memory.summary ??
                  "Inspect CPU and memory posture for the live runtime and its host."
                : selectedBrowserDomain === "host-io"
                  ? runtimeTelemetry?.network.summary ??
                    runtimeTelemetry?.disk.summary ??
                    "Inspect host network and disk posture attached to the running environment."
                  : runtimeInspection?.data.summary ??
                    sourcePreview?.data.summary ??
                    "Inspect packages, symbols, source, and governed attachments from one live system view."
        : activeWorkspace === "runtime"
          ? selectedWorkItem?.waitingReason ??
            selectedApproval?.consequenceSummary ??
            runtimeSummary?.divergencePosture ??
            "Listener, approval, and work context should stay attached to one execution surface."
          : activeWorkspace === "documentation"
            ? selectedDocumentationPage?.summary ??
              "Use the documentation workspace when you want the conceptual model, workflow guidance, or workspace reference without crowding the operating surfaces."
          : activeWorkspace === "incidents"
            ? selectedIncident?.recoverySummary ?? "Recovery context appears here once an incident is selected."
            : activeWorkspace === "artifacts"
              ? selectedEvidenceSection === "observation"
              ? selectedEvent?.summary ?? "Select an event to inspect replayable evidence."
                : selectedArtifact?.summary ?? "Select an artifact to inspect provenance and evidentiary posture."
              : activeWorkspace === "configuration"
                ? selectedConfigurationDescriptor.summary
              : summary?.activeContext.focusSummary ?? "Environment posture is not yet available.";

  const selectedApprovalLinkedWorkItemId =
    selectedApproval?.linkedEntities.find((entity) => entity.entityType === "work-item")?.entityId ?? null;
  const selectedApprovalInspectorWorkItem =
    (selectedApprovalLinkedWorkItemId
      ? workItems.find((item) => item.workItemId === selectedApprovalLinkedWorkItemId && item.correctiveContext) ?? null
      : null)
    ?? workItems.find((item) => item.approvalCount > 0 && item.correctiveContext) ?? null;
  const selectedApprovalInspectorCorrectiveContext =
    selectedApprovalInspectorWorkItem?.correctiveContext
    ?? ((status?.reconciliationDecision ?? summary?.reconciliationDecision)
      ? {
          kind: "alignment-reconciliation",
          decision: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.decision ?? null,
          approvalPosture: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.approvalPosture ?? null,
          alignmentStatus: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.alignmentStatus ?? null,
          alignmentScore: null,
          proposedActions: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.proposedActions ?? [],
          triggerEvents: (status?.reconciliationDecision ?? summary?.reconciliationDecision)?.triggerEvents ?? []
        }
      : null);

  const inspectorTabs: Array<{ id: string; label: string; content: React.ReactNode }> =
    activeWorkspace === "environment"
      ? [
          {
            id: "context",
            label: "Context",
            content: (
              <div className="entity-list">
                <div className="entity-row">
                  <div>
                    <strong>{summary?.activeContext.currentThreadTitle ?? "No active thread"}</strong>
                    <p>{summary?.activeContext.focusSummary ?? "No current continuation summary."}</p>
                  </div>
                </div>
                <div className="entity-row">
                  <div>
                    <strong>{summary?.activeWorkers[0]?.label ?? "No active worker"}</strong>
                    <p>{summary?.activeWorkers[0]?.responsibility ?? "Actors appear here when the environment exposes them."}</p>
                  </div>
                </div>
              </div>
            )
          },
          {
            id: "pressure",
            label: "Pressure",
            content: (
              <dl className="detail-list">
                <DetailRow label="Approvals" value={String(summary?.attention.approvalsAwaiting ?? 0)} />
                <DetailRow label="Incidents" value={String(summary?.attention.openIncidents ?? 0)} />
                <DetailRow label="Blocked Work" value={String(summary?.attention.blockedWork ?? 0)} />
                <DetailRow label="Artifacts" value={String(summary?.recentArtifacts.length ?? 0)} />
              </dl>
            )
          }
        ]
      : activeWorkspace === "projects"
        ? [
            {
              id: "context",
              label: "Context",
              content: (
                <dl className="detail-list">
                  <DetailRow label="Project" value={selectedProjectDetail?.title ?? selectedProjectSummary?.title ?? "No project selected"} />
                  <DetailRow label="Status" value={selectedProjectDetail?.status ?? selectedProjectSummary?.status ?? "empty"} />
                  <DetailRow label="Requirements" value={String(selectedProjectDetail?.requirements.length ?? selectedProjectSummary?.requirementCount ?? 0)} />
                  <DetailRow label="Features" value={String(selectedProjectDetail?.featureSpecifications.length ?? selectedProjectSummary?.featureSpecCount ?? 0)} />
                  <DetailRow label="Journeys" value={String(selectedProjectDetail?.userJourneys.length ?? selectedProjectSummary?.journeyCount ?? 0)} />
                  <DetailRow
                    label="Decisions"
                    value={String(
                      selectedProjectDetail?.architectureDecisions.length ??
                        selectedProjectSummary?.architectureDecisionCount ??
                        0
                    )}
                  />
                </dl>
              )
            },
            {
              id: "governance",
              label: "Governance",
              content: selectedProjectDetail ? (
                <div className="configuration-inspector-stack">
                  <p className="inspector-copy">{selectedProjectDetail.summary}</p>
                  <pre className="runtime-preview">
                    {JSON.stringify(
                      {
                        constitution: selectedProjectDetail.constitution,
                        designSystem: selectedProjectDetail.designSystem,
                        styleGuide: selectedProjectDetail.styleGuide,
                        metadata: selectedProjectDetail.metadata
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              ) : (
                <p className="inspector-copy">
                  Select a governed project to inspect its constitutional and design-governance context.
                </p>
              )
            },
            {
              id: "evidence",
              label: "Evidence",
              content: selectedProjectDetail ? (
                <dl className="detail-list">
                  <DetailRow label="Work Items" value={String(selectedProjectDetail.linkedWorkItems.length)} />
                  <DetailRow label="Incidents" value={String(selectedProjectDetail.linkedIncidents.length)} />
                  <DetailRow label="Testing" value={String(selectedProjectDetail.linkedTestingHarnesses.length)} />
                  <DetailRow label="Source Roots" value={String(selectedProjectDetail.sourceRoots.length)} />
                  <DetailRow
                    label="Coverage"
                    value={selectedProjectDetail.testingEvidence?.coverage.present ? "present" : "absent"}
                  />
                  <DetailRow
                    label="Latest Report"
                    value={selectedProjectDetail.testingEvidence?.latestReport?.generatedAt ?? "n/a"}
                  />
                </dl>
              ) : (
                <p className="inspector-copy">
                  Select a governed project to inspect its linked work, testing, incident, and source evidence.
                </p>
              )
            }
          ]
      : activeWorkspace === "conversations"
        ? [
            {
              id: "context",
              label: "Context",
              content: (
                <dl className="detail-list">
                  {selectedConversationSection === "repl" ? (
                    <>
                      <DetailRow label="Mode" value="Direct Eval" />
                      <DetailRow label="Package" value={runtimeSummary?.currentPackage ?? "listener"} />
                      <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                      <DetailRow label="Authority" value="Governed REPL" />
                    </>
                  ) : (
                    <>
                      <DetailRow label="Thread" value={selectedThread?.title ?? "No thread selected"} />
                      <DetailRow label="State" value={selectedThread?.state ?? "idle"} />
                      <DetailRow label="Turns" value={String(selectedThread?.turns.length ?? 0)} />
                      <DetailRow label="Linked Entities" value={String(selectedThread?.linkedEntities.length ?? 0)} />
                    </>
                  )}
                </dl>
              )
            },
            {
              id: "detail",
              label: "Turn",
              content:
                selectedConversationSection === "draft" ? (
                  <pre className="runtime-preview">{conversationDraft || "No draft continuation prepared."}</pre>
                ) : selectedConversationSection === "repl" ? (
                  <div className="configuration-inspector-stack">
                    <pre className="runtime-preview">{runtimeForm || "No direct evaluation form prepared."}</pre>
                    <p className="inspector-copy">
                      Direct evaluation is explicit here. This surface is using conversation as a governed REPL rather than as a supervised thread.
                    </p>
                  </div>
                ) : (
                  <dl className="detail-list">
                    <DetailRow label="Turn" value={selectedTurn?.title ?? "No turn selected"} />
                    <DetailRow label="Turn State" value={selectedTurn?.state ?? "idle"} />
                    <DetailRow label="Operations" value={String(selectedTurn?.operationIds.length ?? 0)} />
                    <DetailRow label="Artifacts" value={String(selectedTurn?.artifactIds.length ?? 0)} />
                    <DetailRow label="Approvals" value={String(selectedTurn?.approvalIds.length ?? 0)} />
                  </dl>
                )
            },
            {
              id: "entry",
              label: "Entry",
              content: selectedConversationMessage ? (
                <dl className="detail-list">
                  <DetailRow label="Source" value={selectedConversationMessage.role} />
                  <DetailRow label="Timestamp" value={selectedConversationMessage.createdAt} />
                </dl>
              ) : (
                <p className="inspector-copy">
                  Select a transcript entry to inspect its source and timestamp without repeating that metadata on every bubble.
                </p>
              )
            },
            {
              id: "linked",
              label: "Linked",
              content: selectedThread ? (
                <LinkedEntityList entities={selectedThread.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
              ) : (
                <p className="inspector-copy">
                  Select a conversation session to inspect the artifacts, approvals, incidents, and work attached to it.
                </p>
              )
            }
          ]
        : activeWorkspace === "editor"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  <dl className="detail-list">
                    <DetailRow label="Mode" value="Editor Surface" />
                    <DetailRow label="Buffer" value={currentEditorBufferTitle} />
                    <DetailRow label="State" value={currentEditorBufferDirty ? "Dirty" : "Clean"} />
                    <DetailRow label="Buffers" value={`${currentEditorBuffers.length}`} />
                    <DetailRow label="Changed Forms" value={`${currentEditorChangedFormCount}`} />
                    <DetailRow label="Baseline" value={currentEditorBufferDirty ? "Diverged" : "Aligned"} />
                    <DetailRow label="Package" value={editorPackage || (runtimeSummary?.currentPackage ?? "cl-user")} />
                    <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                    <DetailRow label="Authority" value="Governed Editing" />
                  </dl>
                )
              },
              {
                id: "symbol",
                label: "Symbol",
                content: currentEditorCursorSymbol ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Symbol" value={currentEditorCursorSymbol} />
                      <DetailRow
                        label="Package"
                        value={
                          currentEditorCursorSymbolHelp?.packageName ??
                          currentEditorCursorSymbolPackage ??
                          editorPackage ??
                          runtimeSummary?.currentPackage ??
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
                    {currentEditorCursorSymbolHelp?.info ? (
                      <p className="inspector-copy">{currentEditorCursorSymbolHelp.info}</p>
                    ) : (
                      <p className="inspector-copy">
                        Symbol detail will appear here when runtime-backed help is available for the current editor focus.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Move the caret onto a symbol in the editor to inspect its current package and runtime-backed detail here.
                  </p>
                )
              },
              {
                id: "buffer",
                label: "Buffer",
                content: <pre className="runtime-preview">{editorDraft || "No editor buffer drafted yet."}</pre>
              },
              {
                id: "output",
                label: "Output",
                content: editorResult ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Status" value={editorResult.status} />
                      <DetailRow label="Operation" value={editorResult.operation} />
                    </dl>
                    <p className="inspector-copy">{editorResult.data.summary}</p>
                    {editorResult.data.valuePreview ? <pre className="runtime-preview">{editorResult.data.valuePreview}</pre> : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Evaluate the current editor buffer to inspect sustained editing output here.
                  </p>
                )
              }
            ]
        : activeWorkspace === "workspace"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  <dl className="detail-list">
                    <DetailRow label="Mode" value="Scratch Workspace" />
                    <DetailRow label="Package" value={runtimeSummary?.currentPackage ?? "cl-user"} />
                    <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "unbound"} />
                    <DetailRow label="Authority" value="Governed Evaluation" />
                  </dl>
                )
              },
              {
                id: "buffer",
                label: "Buffer",
                content: <pre className="runtime-preview">{workspaceDraft || "No workspace forms drafted yet."}</pre>
              },
              {
                id: "result",
                label: "Result",
                content: workspaceResult ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Status" value={workspaceResult.status} />
                      <DetailRow label="Operation" value={workspaceResult.operation} />
                    </dl>
                    <p className="inspector-copy">{workspaceResult.data.summary}</p>
                    {workspaceResult.data.valuePreview ? (
                      <pre className="runtime-preview">{workspaceResult.data.valuePreview}</pre>
                    ) : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Evaluate the current workspace buffer to inspect the governed result here.
                  </p>
                )
              }
            ]
        : activeWorkspace === "transcript"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                    <dl className="detail-list">
                      <DetailRow label="Entries" value={String(transcriptEntries.length)} />
                      <DetailRow label="Workspace Results" value={String(currentWorkspaceHistoryCount)} />
                      <DetailRow label="Listener Results" value={String(currentReplHistoryCount)} />
                      <DetailRow label="Events" value={String(environmentEvents.length)} />
                    </dl>
                )
              },
              {
                id: "latest",
                label: "Latest",
                content: transcriptEntries[0] ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Source" value={transcriptEntries[0].source} />
                      <DetailRow label="Timestamp" value={transcriptEntries[0].timestamp} />
                      <DetailRow label="Family" value={transcriptEntries[0].family ?? "transcript"} />
                    </dl>
                    <p className="inspector-copy">{transcriptEntries[0].summary}</p>
                    {transcriptEntries[0].preview ? <pre className="runtime-preview">{transcriptEntries[0].preview}</pre> : null}
                  </div>
                ) : (
                  <p className="inspector-copy">
                    Transcript entries will appear here once workspace, listener, or environment activity is retained.
                  </p>
                )
              }
            ]
        : activeWorkspace === "browser"
          ? [
              {
                id: "context",
                label: "Context",
                content: (
                  selectedBrowserDomain === "governance" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Governance" />
                      <DetailRow
                        label="Selected"
                        value={
                          selectedApproval?.title
                          ?? selectedIncident?.title
                          ?? selectedWorkItem?.title
                          ?? "No governance object selected"
                        }
                      />
                      <DetailRow
                        label="State"
                        value={
                          selectedApproval?.state
                          ?? selectedIncident?.state
                          ?? selectedWorkItem?.state
                          ?? "unknown"
                        }
                      />
                      <DetailRow
                        label="Corrective Kind"
                        value={(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.kind ?? "none"}
                      />
                      <DetailRow
                        label="Approval Posture"
                        value={
                          (selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.approvalPosture
                          ?? "unknown"
                        }
                      />
                      <DetailRow
                        label="Trigger Events"
                        value={String((selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents.length ?? 0)}
                      />
                    </dl>
                  ) : selectedBrowserDomain === "documentation" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Documentation" />
                      <DetailRow label="Title" value={selectedDocumentationPage?.title ?? "No page selected"} />
                      <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                      <DetailRow label="Slug" value={selectedDocumentationPage?.slug ?? "unknown"} />
                    </dl>
                  ) : selectedBrowserDomain === "console" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Console" />
                      <DetailRow label="Plane" value={consoleLogStream?.data.plane ?? "environment"} />
                      <DetailRow label="Source Filter" value={selectedConsoleSourceFilter} />
                      <DetailRow label="Visible Entries" value={String(visibleConsoleEntryCount)} />
                      <DetailRow label="Total Entries" value={String(consoleLogStream?.data.entries.length ?? 0)} />
                      <DetailRow label="Summary" value={consoleLogStream?.data.summary ?? "No console stream loaded."} />
                    </dl>
                  ) : selectedBrowserDomain === "diagnostics" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Diagnostics" />
                      <DetailRow label="Source Filter" value={selectedDiagnosticSourceFilter} />
                      <DetailRow label="Visible Reports" value={String(visibleDiagnosticReportCount)} />
                      <DetailRow label="Total Reports" value={String(diagnosticReports.length)} />
                      <DetailRow label="Selected" value={selectedDiagnosticReport?.title ?? selectedDiagnosticReportSummary?.title ?? "No report selected"} />
                      <DetailRow label="Kind" value={selectedDiagnosticReport?.kind ?? selectedDiagnosticReportSummary?.kind ?? "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "processes" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Processes" />
                      <DetailRow label="Visible Processes" value={String(runtimeTelemetry?.processes.length ?? 0)} />
                      <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                      <DetailRow label="Activity" value={runtimeTelemetry?.activitySummary ?? "Runtime telemetry is not yet available."} />
                    </dl>
                  ) : selectedBrowserDomain === "performance" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Performance" />
                      <DetailRow label="Sampled At" value={runtimeTelemetry?.sampledAt ?? "n/a"} />
                      <DetailRow label="CPU" value={runtimeTelemetry?.cpu.utilizationPercent != null ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%` : "n/a"} />
                      <DetailRow label="Host Memory" value={runtimeTelemetry?.memory.systemUsedPercent != null ? `${runtimeTelemetry.memory.systemUsedPercent.toFixed(1)}%` : "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "host-io" ? (
                    <dl className="detail-list">
                      <DetailRow label="Domain" value="Host I/O" />
                      <DetailRow label="Connections" value={String(runtimeTelemetry?.network.openConnectionCount ?? "n/a")} />
                      <DetailRow label="Interfaces" value={String(runtimeTelemetry?.network.interfaceCount ?? "n/a")} />
                      <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                    </dl>
                  ) : (
                    <dl className="detail-list">
                      <DetailRow
                        label="Domain"
                        value={browserDomains.find((domain) => domain.id === selectedBrowserDomain)?.label ?? selectedBrowserDomain}
                      />
                      <DetailRow label="Package" value={runtimeInspection?.data.packageName ?? runtimeSummary?.currentPackage ?? "unknown"} />
                      <DetailRow label="Mode" value={runtimeInspection?.data.mode ?? "browse"} />
                      <DetailRow label="Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                      <DetailRow label="Scopes" value={String(runtimeSummary?.scopes.length ?? 0)} />
                    </dl>
                  )
                )
              },
              {
                id: "detail",
                label: "Detail",
                content: selectedBrowserDomain === "documentation" ? (
                  selectedDocumentationPage ? (
                    <div className="configuration-inspector-stack">
                      <p className="inspector-copy">{selectedDocumentationPage.summary}</p>
                      <article
                        className="documentation-markdown inspector-documentation-markdown"
                        dangerouslySetInnerHTML={{ __html: renderedDocumentationHtml }}
                      />
                    </div>
                  ) : (
                    <p className="inspector-copy">
                      Select a documentation reference from the browser table to read it in the inspector.
                    </p>
                  )
                ) : selectedBrowserDomain === "governance" ? (
                  selectedApproval || selectedIncident || selectedWorkItem ? (
                    <div className="configuration-inspector-stack">
                      <p className="inspector-copy">
                        {(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.proposedActions[0]?.reason
                          ?? selectedApproval?.summary
                          ?? "No explicit corrective rationale is attached to the selected governance object."}
                      </p>
                      {(selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents.length ? (
                        <div className="ref-list">
                          {((selectedWorkItem?.correctiveContext ?? selectedApprovalInspectorCorrectiveContext)?.triggerEvents ?? []).map((event, index) => (
                            <span className="thread-flag" key={`inspector-governance-trigger:${index}`}>
                              {event.kind ?? event.family ?? "event"}
                              {event.eventId ? ` · ${event.eventId}` : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">
                      Select a governance object from the browser table to inspect its corrective posture here.
                    </p>
                  )
                ) : selectedBrowserDomain === "console" ? (
                  selectedConsoleEntry ? (
                    <div className="configuration-inspector-stack">
	                    <dl className="detail-list">
	                      <DetailRow label="Plane" value={selectedConsoleEntry.plane} />
	                      <DetailRow label="Type" value={selectedConsoleEntry.type} />
	                      <DetailRow label="Process" value={selectedConsoleEntry.processName ?? "n/a"} />
	                      <DetailRow label="PID" value={selectedConsoleEntry.pid ? String(selectedConsoleEntry.pid) : "n/a"} />
	                      <DetailRow label="Category" value={selectedConsoleEntry.category} />
	                      <DetailRow label="Source" value={selectedConsoleEntry.source} />
	                      <DetailRow label="Activity" value={selectedConsoleEntry.activityId ?? "n/a"} />
	                      <DetailRow label="Timestamp" value={selectedConsoleEntry.timestamp} />
	                    </dl>
                      <p className="inspector-copy">{selectedConsoleEntry.message}</p>
                      {selectedConsoleEntry.detail ? <pre className="runtime-preview">{selectedConsoleEntry.detail}</pre> : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">Select a console entry to inspect its full detail and operational correlation.</p>
                  )
                ) : selectedBrowserDomain === "diagnostics" ? (
                  selectedDiagnosticReport ? (
                    <div className="configuration-inspector-stack">
	                    <dl className="detail-list">
	                      <DetailRow label="Title" value={selectedDiagnosticReport.title} />
	                      <DetailRow label="Kind" value={selectedDiagnosticReport.kind} />
	                      <DetailRow label="Source" value={selectedDiagnosticReport.source} />
	                      <DetailRow label="Path" value={selectedDiagnosticReport.path ?? "n/a"} />
	                      <DetailRow label="Created" value={selectedDiagnosticReport.createdAt} />
	                      <DetailRow
	                        label="Bytes"
	                        value={
	                          typeof selectedDiagnosticReport.metadata?.byteSize === "number"
	                            ? String(selectedDiagnosticReport.metadata.byteSize)
	                            : "n/a"
	                        }
	                      />
	                      <DetailRow label="Extension" value={String(selectedDiagnosticReport.metadata?.extension ?? "n/a")} />
	                      <DetailRow label="Incident" value={String(selectedDiagnosticReport.metadata?.incidentId ?? "n/a")} />
	                      <DetailRow label="Bug Type" value={String(selectedDiagnosticReport.metadata?.bugType ?? "n/a")} />
	                      <DetailRow label="Parent" value={String(selectedDiagnosticReport.metadata?.parentProc ?? "n/a")} />
	                      <DetailRow label="Responsible" value={String(selectedDiagnosticReport.metadata?.responsibleProc ?? "n/a")} />
	                    </dl>
                      <p className="inspector-copy">{selectedDiagnosticReport.summary}</p>
                      {selectedDiagnosticReport.contentPreview ? (
                        <pre className="runtime-preview">{selectedDiagnosticReport.contentPreview}</pre>
                      ) : null}
                    </div>
                  ) : (
                    <p className="inspector-copy">Select a retained diagnostic report to inspect its preview and source metadata.</p>
                  )
                ) : selectedBrowserDomain === "processes" ? (
                  selectedTelemetryProcess ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Process" value={selectedTelemetryProcess.label} />
                        <DetailRow label="Kind" value={selectedTelemetryProcess.kind} />
                        <DetailRow label="State" value={selectedTelemetryProcess.state} />
                        <DetailRow label="PID" value={String(selectedTelemetryProcess.pid ?? "n/a")} />
                        <DetailRow label="CPU" value={selectedTelemetryProcess.cpuPercent != null ? `${selectedTelemetryProcess.cpuPercent.toFixed(1)}%` : "n/a"} />
                        <DetailRow label="Memory" value={selectedTelemetryProcess.memoryMb != null ? `${selectedTelemetryProcess.memoryMb.toFixed(1)} MB` : "n/a"} />
                        <DetailRow label="Elapsed" value={selectedTelemetryProcess.elapsed ?? "n/a"} />
                      </dl>
                      <p className="inspector-copy">{selectedTelemetryProcess.summary}</p>
                    </>
                  ) : (
                    <p className="inspector-copy">
                      Select a runtime-linked process to inspect its governed execution posture here.
                    </p>
                  )
                ) : selectedBrowserDomain === "performance" ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="CPU Summary" value={runtimeTelemetry?.cpu.summary ?? "n/a"} />
                      <DetailRow label="Memory Summary" value={runtimeTelemetry?.memory.summary ?? "n/a"} />
                      <DetailRow label="Load 1m" value={runtimeTelemetry?.cpu.loadAverage1m != null ? runtimeTelemetry.cpu.loadAverage1m.toFixed(2) : "n/a"} />
                      <DetailRow label="Heap Used" value={runtimeTelemetry?.memory.heapUsedMb != null ? `${runtimeTelemetry.memory.heapUsedMb.toFixed(1)} MB` : "n/a"} />
                    </dl>
                    <p className="inspector-copy">
                      {runtimeTelemetry?.activitySummary ??
                        "CPU and memory posture will appear here once the runtime telemetry snapshot is available."}
                    </p>
                  </div>
                ) : selectedBrowserDomain === "host-io" ? (
                  <div className="configuration-inspector-stack">
                    <dl className="detail-list">
                      <DetailRow label="Network Summary" value={runtimeTelemetry?.network.summary ?? "n/a"} />
                      <DetailRow label="Disk Summary" value={runtimeTelemetry?.disk.summary ?? "n/a"} />
                      <DetailRow label="Disk Read" value={runtimeTelemetry?.disk.readKbps != null ? `${runtimeTelemetry.disk.readKbps.toFixed(0)} KB/s` : "n/a"} />
                      <DetailRow label="Disk Write" value={runtimeTelemetry?.disk.writeKbps != null ? `${runtimeTelemetry.disk.writeKbps.toFixed(0)} KB/s` : "n/a"} />
                    </dl>
                    <p className="inspector-copy">
                      Host I/O posture is attached to the running environment here rather than split into a separate monitor.
                    </p>
                  </div>
                ) : runtimeEntityDetail ? (
                  <>
                    <dl className="detail-list">
                      <DetailRow label="Kind" value={runtimeEntityDetail.data.entityKind} />
                      <DetailRow label="Package" value={runtimeEntityDetail.data.packageName} />
                      <DetailRow label="Signature" value={runtimeEntityDetail.data.signature ?? "No signature"} />
                      <DetailRow label="Facets" value={String(runtimeEntityDetail.data.facets.length)} />
                      <DetailRow label="Related Items" value={String(runtimeEntityDetail.data.relatedItems.length)} />
                    </dl>
                    <p className="inspector-copy">{runtimeEntityDetail.data.summary}</p>
                    {sourcePreview?.data.path ? (
                      <p className="inspector-copy">
                        Source focus: {sourcePreview.data.path}
                        {sourcePreview.data.focusLine ? `:${sourcePreview.data.focusLine}` : ""}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="inspector-copy">
                    Select a package, symbol, method, class, or runtime object to inspect its semantic runtime detail here.
                  </p>
                )
              },
              {
                id: "source",
                label: "Source",
                content:
                  selectedBrowserDomain === "documentation" ? (
                    <dl className="detail-list">
                      <DetailRow label="Source" value={selectedDocumentationPage?.sourcePath ?? "No documentation source selected"} />
                      <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                      <DetailRow label="Artifacts" value={String(artifacts.length)} />
                      <DetailRow label="Work Items" value={String(workItems.length)} />
                    </dl>
                  ) : selectedBrowserDomain === "console" ? (
                    <dl className="detail-list">
                      <DetailRow label="Work Item" value={selectedConsoleEntry?.workItemId ?? "n/a"} />
                      <DetailRow label="Workflow" value={selectedConsoleEntry?.workflowRecordId ?? "n/a"} />
                      <DetailRow label="Incident" value={selectedConsoleEntry?.incidentId ?? "n/a"} />
                      <DetailRow label="Conversation" value={selectedConsoleEntry?.threadRefId ?? selectedConsoleEntry?.turnRefId ?? "n/a"} />
                    </dl>
                  ) : selectedBrowserDomain === "diagnostics" ? (
                    <dl className="detail-list">
                      <DetailRow label="Process" value={selectedDiagnosticReport?.processName ?? "n/a"} />
                      <DetailRow label="PID" value={String(selectedDiagnosticReport?.pid ?? "n/a")} />
                      <DetailRow label="Source" value={selectedDiagnosticReport?.source ?? "n/a"} />
                      <DetailRow label="Incident" value={String(selectedDiagnosticReport?.metadata?.incidentId ?? "n/a")} />
                      <DetailRow label="Bug Type" value={String(selectedDiagnosticReport?.metadata?.bugType ?? "n/a")} />
                      <DetailRow label="Parent" value={String(selectedDiagnosticReport?.metadata?.parentProc ?? "n/a")} />
                      <DetailRow label="Responsible" value={String(selectedDiagnosticReport?.metadata?.responsibleProc ?? "n/a")} />
                      <DetailRow label="Report Id" value={selectedDiagnosticReport?.reportId ?? selectedDiagnosticReportSummary?.reportId ?? "n/a"} />
                    </dl>
                  ) : (
                    <dl className="detail-list">
                      {selectedBrowserDomain === "processes" ? (
                        <>
                          <DetailRow label="Work Item" value={selectedTelemetryProcess?.workItemId ?? "n/a"} />
                          <DetailRow label="Workflow" value={selectedTelemetryProcess?.workflowRecordId ?? "n/a"} />
                          <DetailRow label="Incident" value={selectedTelemetryProcess?.incidentId ?? "n/a"} />
                          <DetailRow label="Conversation" value={selectedTelemetryProcess?.threadId ?? selectedTelemetryProcess?.turnId ?? "n/a"} />
                        </>
                      ) : selectedBrowserDomain === "performance" ? (
                        <>
                          <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "n/a"} />
                          <DetailRow label="Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                          <DetailRow label="Scopes" value={String(runtimeSummary?.scopes.length ?? 0)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                        </>
                      ) : selectedBrowserDomain === "host-io" ? (
                        <>
                          <DetailRow label="Runtime" value={runtimeSummary?.runtimeId ?? "n/a"} />
                          <DetailRow label="Open Connections" value={String(runtimeTelemetry?.network.openConnectionCount ?? "n/a")} />
                          <DetailRow label="Artifacts" value={String(artifacts.length)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                        </>
                      ) : (
                        <>
                          <DetailRow label="Source" value={sourcePreview?.data.path ?? "No source artifact selected"} />
                          <DetailRow label="Focus Line" value={String(sourcePreview?.data.focusLine ?? 0)} />
                          <DetailRow label="Work Items" value={String(workItems.length)} />
                          <DetailRow label="Artifacts" value={String(artifacts.length)} />
                        </>
                      )}
                    </dl>
                  )
              },
              {
                id: "handoff",
                label: "Handoff",
                content: (
                  <div className="inspector-tab-stack">
                    <div>
                      <p className="context-label">Listener Input</p>
                      <pre className="runtime-preview">{runtimeForm || "No listener handoff prepared."}</pre>
                    </div>
                    <div>
                      <p className="context-label">Draft Continuation</p>
                      <pre className="runtime-preview">{conversationDraft || "No conversation handoff prepared."}</pre>
                    </div>
                  </div>
                )
              }
            ]
          : activeWorkspace === "runtime"
            ? [
                {
                  id: "context",
                  label: "Context",
                  content: (
                    <dl className="detail-list">
                      <DetailRow label="Loaded Systems" value={String(runtimeSummary?.loadedSystemCount ?? 0)} />
                      <DetailRow label="Pending Approval" value={selectedApproval?.title ?? "None"} />
                      <DetailRow label="Selected Work" value={selectedWorkItem?.title ?? "None"} />
                      <DetailRow label="Closure" value={selectedWorkflowRecord?.closureReadiness ?? "unknown"} />
                    </dl>
                  )
                },
                {
                  id: "input",
                  label: "Input",
                  content: <pre className="runtime-preview">{runtimeForm || "No listener form prepared."}</pre>
                },
                {
                  id: "selection",
                  label: "Selection",
                  content: selectedApproval ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Approval" value={selectedApproval.title} />
                        <DetailRow label="State" value={selectedApproval.state} />
                        <DetailRow label="Requested Action" value={selectedApproval.requestedAction} />
                        <DetailRow label="Scope" value={selectedApproval.scopeSummary} />
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow label="Corrective Kind" value={selectedApprovalInspectorCorrectiveContext.kind} />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Approval Posture"
                            value={selectedApprovalInspectorCorrectiveContext.approvalPosture ?? "unknown"}
                          />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Alignment"
                            value={
                              selectedApprovalInspectorCorrectiveContext.alignmentStatus
                                ? `${selectedApprovalInspectorCorrectiveContext.alignmentStatus}${
                                    selectedApprovalInspectorCorrectiveContext.alignmentScore != null
                                      ? ` (${selectedApprovalInspectorCorrectiveContext.alignmentScore.toFixed(2)})`
                                      : ""
                                  }`
                                : "unknown"
                            }
                          />
                        ) : null}
                        {selectedApprovalInspectorCorrectiveContext ? (
                          <DetailRow
                            label="Trigger Events"
                            value={String(selectedApprovalInspectorCorrectiveContext.triggerEvents.length)}
                          />
                        ) : null}
                      </dl>
                      <p className="inspector-copy">{selectedApproval.consequenceSummary}</p>
                      {selectedApprovalInspectorCorrectiveContext?.proposedActions[0]?.reason ? (
                        <p className="inspector-copy">
                          {selectedApprovalInspectorCorrectiveContext.proposedActions[0].reason}
                        </p>
                      ) : null}
                    </>
                  ) : selectedWorkItem ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Work Item" value={selectedWorkItem.title} />
                        <DetailRow label="State" value={selectedWorkItem.state} />
                        <DetailRow label="Workflow Record" value={selectedWorkItem.workflowRecordId} />
                        <DetailRow label="Runtime" value={selectedWorkItem.runtimeSummary} />
                      </dl>
                      <p className="inspector-copy">
                        {selectedWorkItem.waitingReason ?? "This work item currently has no explicit waiting reason."}
                      </p>
                    </>
                  ) : selectedWorkflowRecord ? (
                    <>
                      <dl className="detail-list">
                        <DetailRow label="Phase" value={selectedWorkflowRecord.phase} />
                        <DetailRow label="Validation" value={selectedWorkflowRecord.validationState} />
                        <DetailRow label="Reconciliation" value={selectedWorkflowRecord.reconciliationState} />
                        <DetailRow label="Closure" value={selectedWorkflowRecord.closureReadiness} />
                      </dl>
                      <p className="inspector-copy">{selectedWorkflowRecord.closureSummary}</p>
                    </>
                  ) : (
                    <p className="inspector-copy">
                      Select a work item or approval to inspect the current runtime-governed object here.
                    </p>
                  )
                }
              ]
            : activeWorkspace === "incidents"
              ? [
                  {
                    id: "context",
                    label: "Context",
                    content: (
                      <dl className="detail-list">
                        <DetailRow label="Severity" value={selectedIncident?.severity ?? "clear"} />
                        <DetailRow label="Recovery State" value={selectedIncident?.recoveryState ?? "idle"} />
                        <DetailRow label="Artifacts" value={String(selectedIncident?.artifactIds.length ?? 0)} />
                        <DetailRow label="Linked Entities" value={String(selectedIncident?.linkedEntities.length ?? 0)} />
                      </dl>
                    )
                  },
                  {
                    id: "next",
                    label: "Next",
                    content: (
                      <p className="inspector-copy">
                        {selectedIncident?.nextAction ?? "Select an incident to see the current recovery move."}
                      </p>
                    )
                  }
                ]
              : activeWorkspace === "artifacts"
                ? [
                    {
                      id: "context",
                      label: "Context",
                      content: (
                        <dl className="detail-list">
                          {selectedEvidenceSection === "observation" ? (
                            <>
                              <DetailRow label="Cursor" value={String(selectedEvent?.cursor ?? 0)} />
                              <DetailRow label="Family" value={selectedEvent?.family ?? "unknown"} />
                              <DetailRow label="Visibility" value={selectedEvent?.visibility ?? "unspecified"} />
                              <DetailRow label="Events" value={String(environmentEvents.length)} />
                            </>
                          ) : (
                            <>
                              <DetailRow label="Kind" value={selectedArtifact?.kind ?? "unknown"} />
                              <DetailRow label="State" value={selectedArtifact?.state ?? "unknown"} />
                              <DetailRow label="Authority" value={selectedArtifact?.authority ?? "unknown"} />
                              <DetailRow label="Artifacts" value={String(artifacts.length)} />
                            </>
                          )}
                        </dl>
                      )
                    },
                    {
                      id: "provenance",
                      label: "Provenance",
                      content: (
                        <p className="inspector-copy">
                          {selectedEvidenceSection === "observation"
                            ? selectedEvent?.summary ?? "Select an event to inspect its evidentiary role."
                            : selectedArtifact?.provenance ?? "Select an artifact to inspect provenance."}
                        </p>
                      )
                    }
                  ]
                : activeWorkspace === "configuration"
                  ? [
                      {
                        id: "edit",
                        label: "Edit",
                        content:
                          selectedConfigurationSection === "theme" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Control how the desktop resolves light and dark appearance for this project shell.
                              </p>
                              <div className="configuration-theme-actions" role="group" aria-label="Theme preference">
                                <button
                                  className={themePreference === "system" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("system")}
                                  type="button"
                                >
                                  System
                                </button>
                                <button
                                  className={themePreference === "light" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("light")}
                                  type="button"
                                >
                                  Light
                                </button>
                                <button
                                  className={themePreference === "dark" ? "starter-chip active" : "starter-chip"}
                                  onClick={() => void updateThemePreference("dark")}
                                  type="button"
                                >
                                  Dark
                                </button>
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "lisp-code-view" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Adjust the delimiter palette used by the structured Lisp renderer across browser and execution surfaces.
                              </p>
                              <div className="configuration-code-colors" role="group" aria-label="Parenthesis depth colors">
                                {normalizeParenDepthColors(lispParenColors).map((color, index) => (
                                  <label className="configuration-color-control" key={`inspector-paren-depth:${index + 1}`}>
                                    <span>{`Depth ${index + 1}`}</span>
                                    <input
                                      className="configuration-color-input"
                                      onChange={(event) => void updateLispParenColor(index, event.target.value)}
                                      type="color"
                                      value={color}
                                    />
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "llm" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Configure the integrated language-model routing surface here. Profiles can target OpenAI, Anthropic, Gemini, xAI, Azure-hosted OpenAI-compatible endpoints, local LM Studio, or any other compatible endpoint you provide directly.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Active Profile" value={providerSummary?.activeProfileName ?? "default"} />
                                <DetailRow label="Routing Mode" value={providerSummary?.routingMode ?? "auto"} />
                                <DetailRow label="Profiles" value={String(providerSummary?.profileCount ?? 0)} />
                              </dl>
                              <div className="configuration-theme-actions" role="group" aria-label="Provider routing mode">
                                <button
                                  className={providerSummary?.routingMode === "auto" ? "starter-chip active" : "starter-chip"}
                                  disabled={isUpdatingProviderRouting}
                                  onClick={() => void applyProviderRoutingMode("auto")}
                                  type="button"
                                >
                                  Auto Routing
                                </button>
                                <button
                                  className={providerSummary?.routingMode === "manual" ? "starter-chip active" : "starter-chip"}
                                  disabled={isUpdatingProviderRouting}
                                  onClick={() => void applyProviderRoutingMode("manual")}
                                  type="button"
                                >
                                  Manual Routing
                                </button>
                              </div>
                              <div className="configuration-provider-profile-list" role="list" aria-label="Provider profiles">
                                {(Array.isArray(providerSummary?.profiles) ? providerSummary.profiles : []).map((profile) => (
                                  <div
                                    className={
                                      profile.name === selectedProviderProfileName
                                        ? "configuration-provider-profile-card active"
                                        : "configuration-provider-profile-card"
                                    }
                                    key={`provider-profile:${profile.name}`}
                                    role="listitem"
                                  >
                                    <button
                                      className="configuration-provider-profile-select"
                                      onClick={() => setSelectedProviderProfileName(profile.name)}
                                      type="button"
                                    >
                                      <strong>{profile.name}</strong>
                                      <span>{profile.provider}</span>
                                    </button>
                                    <div className="configuration-provider-profile-meta">
                                      <Badge tone={profile.name === providerSummary?.activeProfileName ? "active" : "steady"}>
                                        {profile.name === providerSummary?.activeProfileName ? "Active" : "Stored"}
                                      </Badge>
                                      <span>{profile.apiKeyPresent ? "Token stored" : "No token stored"}</span>
                                    </div>
                                    <button
                                      className="starter-chip"
                                      disabled={profile.name === providerSummary?.activeProfileName}
                                      onClick={() => void activateProviderProfile(profile.name)}
                                      type="button"
                                    >
                                      Use Profile
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="configuration-provider-form">
                                <label className="configuration-text-control">
                                  <span>Profile Name</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        profileName: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.profileName}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Vendor Preset</span>
                                  <select
                                    className="configuration-select-input"
                                    onChange={(event) => {
                                      const preset =
                                        LLM_PROVIDER_PRESETS.find((entry) => entry.id === event.target.value) ??
                                        LLM_PROVIDER_PRESETS[0]!;
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        provider: preset.provider,
                                        model: current.model.trim().length > 0 ? current.model : preset.defaultModel,
                                        fastModel:
                                          (current.fastModel?.trim()?.length ?? 0) > 0
                                            ? current.fastModel
                                            : preset.defaultFastModel,
                                        apiBase:
                                          (current.apiBase?.trim()?.length ?? 0) > 0
                                            ? current.apiBase
                                            : (preset.defaultApiBase ?? ""),
                                        locality:
                                          (current.locality?.trim()?.length ?? 0) > 0
                                            ? current.locality
                                            : preset.id === "lm-studio"
                                              ? "local"
                                              : "network"
                                      }));
                                    }}
                                    value={llmProviderPresetForProfile(providerProfileDraft).id}
                                  >
                                    {LLM_PROVIDER_PRESETS.map((preset) => (
                                      <option key={`provider-preset:${preset.id}`} value={preset.id}>
                                        {preset.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="configuration-text-control">
                                  <span>Transport Provider</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        provider: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.provider}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Endpoint</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        apiBase: event.target.value
                                      }))
                                    }
                                    placeholder="https://api.example.com/v1"
                                    type="text"
                                    value={providerProfileDraft.apiBase ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Primary Model</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        model: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.model}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Fast Model</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        fastModel: event.target.value
                                      }))
                                    }
                                    type="text"
                                    value={providerProfileDraft.fastModel ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Secure Token</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        apiKey: event.target.value
                                      }))
                                    }
                                    placeholder={
                                      providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName)?.apiKeyPresent
                                        ? "Stored token present. Enter a new token to replace it."
                                        : "Paste a provider token"
                                    }
                                    type="password"
                                    value={providerProfileDraft.apiKey ?? ""}
                                  />
                                </label>
                                <label className="configuration-text-control">
                                  <span>Intents</span>
                                  <input
                                    className="configuration-text-input"
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        intents: event.target.value
                                          .split(",")
                                          .map((value) => value.trim())
                                          .filter(Boolean)
                                      }))
                                    }
                                    placeholder="quick-turn, deep-reasoning, code-execution"
                                    type="text"
                                    value={(providerProfileDraft.intents ?? []).join(", ")}
                                  />
                                </label>
                                <div className="configuration-provider-form-grid">
                                  <label className="configuration-text-control">
                                    <span>Latency Tier</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          latencyTier: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.latencyTier ?? "balanced"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Review Bias</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          reviewBias: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.reviewBias ?? "neutral"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Execution Bias</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          executionBias: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.executionBias ?? "balanced"}
                                    />
                                  </label>
                                  <label className="configuration-text-control">
                                    <span>Locality</span>
                                    <input
                                      className="configuration-text-input"
                                      onChange={(event) =>
                                        setProviderProfileDraft((current) => ({
                                          ...current,
                                          locality: event.target.value
                                        }))
                                      }
                                      type="text"
                                      value={providerProfileDraft.locality ?? "network"}
                                    />
                                  </label>
                                </div>
                                <label className="configuration-checkbox-control">
                                  <input
                                    checked={Boolean(providerProfileDraft.activate)}
                                    onChange={(event) =>
                                      setProviderProfileDraft((current) => ({
                                        ...current,
                                        activate: event.target.checked
                                      }))
                                    }
                                    type="checkbox"
                                  />
                                  <span>Activate this profile after saving</span>
                                </label>
                                {providerProfileStatusMessage ? (
                                  <p className="configuration-status-note" role="status">
                                    {providerProfileStatusMessage}
                                  </p>
                                ) : null}
                                {providerProfileError ? (
                                  <p className="configuration-error-note" role="alert">
                                    {providerProfileError}
                                  </p>
                                ) : null}
                                <div className="configuration-provider-actions">
                                  <button
                                    className="starter-chip active"
                                    disabled={isSavingProviderProfile}
                                    onClick={() => void saveProviderProfile(false)}
                                    type="button"
                                  >
                                    Save Profile
                                  </button>
                                  <button
                                    className="starter-chip"
                                    disabled={
                                      isSavingProviderProfile ||
                                      !(
                                        providerSummary?.profiles.find((profile) => profile.name === selectedProviderProfileName)?.apiKeyPresent
                                      )
                                    }
                                    onClick={() => void saveProviderProfile(true)}
                                    type="button"
                                  >
                                    Clear Stored Token
                                  </button>
                                  <button
                                    className="starter-chip"
                                    onClick={() =>
                                      setProviderProfileDraft(
                                        buildProviderProfileDraft({
                                          profileName: "new-profile"
                                        })
                                      )
                                    }
                                    type="button"
                                  >
                                    New Profile
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : selectedConfigurationSection === "package-management" ? (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Manage runtime package tooling directly: Quicklisp installs, Qlot execution, source-registry entries, and local-project links all route through the live sbcl-agent host.
                              </p>
                              <dl className="detail-list">
                                <DetailRow label="Manager" value={packageManagementSummary?.packageManager ?? "asdf"} />
                                <DetailRow label="Quicklisp" value={packageManagementSummary?.quicklispAvailableP ? "available" : "unavailable"} />
                                <DetailRow label="Qlot" value={packageManagementSummary?.qlotAvailableP ? "available" : "unavailable"} />
                                <DetailRow label="Source Registry" value={String(packageManagementSummary?.managedSourceRegistryEntryCount ?? 0)} />
                                <DetailRow label="Local Projects" value={String(packageManagementSummary?.localProjectCount ?? 0)} />
                              </dl>
                              <label className="configuration-text-control">
                                <span>Quicklisp System</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setQuicklispSystemDraft(event.target.value)}
                                  placeholder="dexador"
                                  type="text"
                                  value={quicklispSystemDraft}
                                />
                              </label>
                              <button
                                className="starter-chip active"
                                disabled={isPackageManagementBusy || quicklispSystemDraft.trim().length === 0}
                                onClick={() => void installQuicklispPackage()}
                                type="button"
                              >
                                Install Quicklisp Package
                              </button>
                              <label className="configuration-text-control">
                                <span>Qlot Command</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setQlotCommandDraft(event.target.value)}
                                  placeholder="update"
                                  type="text"
                                  value={qlotCommandDraft}
                                />
                              </label>
                              <button
                                className="starter-chip"
                                disabled={isPackageManagementBusy || qlotCommandDraft.trim().length === 0}
                                onClick={() => void executeQlotCommand()}
                                type="button"
                              >
                                Run Qlot Command
                              </button>
                              <label className="configuration-text-control">
                                <span>{sourceRegistryEditOriginalPath ? "Edit Source Registry Entry" : "Add Source Registry Entry"}</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setSourceRegistryDraftPath(event.target.value)}
                                  placeholder="/path/to/system/root"
                                  type="text"
                                  value={sourceRegistryDraftPath}
                                />
                              </label>
                              <div className="configuration-provider-actions">
                                <button
                                  className="starter-chip"
                                  disabled={isPackageManagementBusy || sourceRegistryDraftPath.trim().length === 0}
                                  onClick={() => void saveSourceRegistryEntry()}
                                  type="button"
                                >
                                  {sourceRegistryEditOriginalPath ? "Save Entry" : "Add Entry"}
                                </button>
                                {sourceRegistryEditOriginalPath ? (
                                  <button
                                    className="starter-chip"
                                    onClick={() => {
                                      setSourceRegistryDraftPath("");
                                      setSourceRegistryEditOriginalPath(null);
                                    }}
                                    type="button"
                                  >
                                    Cancel Edit
                                  </button>
                                ) : null}
                              </div>
                              <div className="configuration-inspector-stack">
                                {(Array.isArray(packageManagementSummary?.managedSourceRegistryEntries)
                                  ? packageManagementSummary.managedSourceRegistryEntries
                                  : []).map((entry) => (
                                  <div className="browser-focus-card" key={`source-registry:${entry.entryId}`}>
                                    <div>
                                      <p className="context-label">Source Registry</p>
                                      <strong>{entry.path}</strong>
                                      <p>{entry.existsP ? "Directory reachable" : "Directory not found"}</p>
                                    </div>
                                    <div className="browser-action-strip">
                                      <button
                                        className="starter-chip"
                                        onClick={() => {
                                          setSourceRegistryEditOriginalPath(entry.path);
                                          setSourceRegistryDraftPath(entry.path);
                                        }}
                                        type="button"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="starter-chip"
                                        disabled={isPackageManagementBusy}
                                        onClick={() => void removeSourceRegistryPath(entry.path)}
                                        type="button"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <label className="configuration-text-control">
                                <span>Local Project Path</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setLocalProjectPathDraft(event.target.value)}
                                  placeholder="/path/to/local/project"
                                  type="text"
                                  value={localProjectPathDraft}
                                />
                              </label>
                              <label className="configuration-text-control">
                                <span>Local Project Alias</span>
                                <input
                                  className="configuration-text-input"
                                  onChange={(event) => setLocalProjectNameDraft(event.target.value)}
                                  placeholder="optional-link-name"
                                  type="text"
                                  value={localProjectNameDraft}
                                />
                              </label>
                              <button
                                className="starter-chip"
                                disabled={isPackageManagementBusy || localProjectPathDraft.trim().length === 0}
                                onClick={() => void saveLocalProject()}
                                type="button"
                              >
                                Add Local Project
                              </button>
                              <div className="configuration-inspector-stack">
                                {(Array.isArray(packageManagementSummary?.localProjects)
                                  ? packageManagementSummary.localProjects
                                  : []).map((project) => (
                                  <div className="browser-focus-card" key={`local-project:${project.projectId}`}>
                                    <div>
                                      <p className="context-label">Local Project</p>
                                      <strong>{project.name}</strong>
                                      <p>{project.path}</p>
                                    </div>
                                    <div className="browser-action-strip">
                                      <button
                                        className="starter-chip"
                                        disabled={isPackageManagementBusy}
                                        onClick={() => void removeLocalProjectByName(project.name)}
                                        type="button"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {packageManagementStatusMessage ? (
                                <p className="configuration-status-note" role="status">
                                  {packageManagementStatusMessage}
                                </p>
                              ) : null}
                              {packageManagementError ? (
                                <p className="configuration-error-note" role="alert">
                                  {packageManagementError}
                                </p>
                              ) : null}
                              {packageManagementCommandResult?.stdout ? (
                                <pre className="runtime-preview">{packageManagementCommandResult.stdout}</pre>
                              ) : null}
                              {packageManagementCommandResult?.stderr ? (
                                <pre className="runtime-preview">{packageManagementCommandResult.stderr}</pre>
                              ) : null}
                            </div>
                          ) : (
                            <div className="configuration-inspector-stack">
                              <p className="inspector-copy">
                                Tune the shell surface density directly. Each percentage slider changes only its own target and persists with desktop preferences.
                              </p>
                              <div className="configuration-slider-stack" role="group" aria-label="Desktop surface scale controls">
                                <label className="configuration-slider-control">
                                  <span>Mouseover Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "tooltipScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={tooltipScalePercent}
                                    />
                                    <strong>{`${tooltipScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Control Iconography</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "controlIconScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={controlIconScalePercent}
                                    />
                                    <strong>{`${controlIconScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Iconified Applications</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "dockIconScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={dockIconScalePercent}
                                    />
                                    <strong>{`${dockIconScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Conversation Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "conversationTextScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={conversationTextScalePercent}
                                    />
                                    <strong>{`${conversationTextScalePercent}%`}</strong>
                                  </div>
                                </label>
                                <label className="configuration-slider-control">
                                  <span>Source Code Text</span>
                                  <div className="configuration-slider-row">
                                    <input
                                      className="configuration-range-input"
                                      max={160}
                                      min={70}
                                      onChange={(event) =>
                                        void updateDesktopSurfaceScalePreference(
                                          "sourceCodeTextScalePercent",
                                          Number(event.target.value)
                                        )
                                      }
                                      step={1}
                                      type="range"
                                      value={sourceCodeTextScalePercent}
                                    />
                                    <strong>{`${sourceCodeTextScalePercent}%`}</strong>
                                  </div>
                                </label>
                              </div>
                            </div>
                          )
                      }
                    ]
                    : activeWorkspace === "documentation"
                      ? [
                          {
                            id: "context",
                            label: "Context",
                            content: (
                              <div className="configuration-inspector-stack">
                                <dl className="detail-list">
                                  <DetailRow label="Title" value={selectedDocumentationPage?.title ?? "No page selected"} />
                                  <DetailRow label="Category" value={selectedDocumentationPage?.category ?? "unknown"} />
                                  <DetailRow label="Slug" value={selectedDocumentationPage?.slug ?? selectedDocumentationPage?.title ?? "unknown"} />
                                </dl>
                                <p className="inspector-copy">
                                  {selectedDocumentationPage?.summary ??
                                    "Select a documentation page from the workspace table to read it in the inspector."}
                                </p>
                                <button
                                  className="starter-chip"
                                  onClick={() => void openPublishedDocumentation()}
                                  type="button"
                                >
                                  Open Published Site
                                </button>
                              </div>
                            )
                          },
                          {
                            id: "content",
                            label: "Content",
                            content: selectedDocumentationPage ? (
                              <article
                                className="documentation-markdown inspector-documentation-markdown"
                                dangerouslySetInnerHTML={{ __html: renderedDocumentationHtml }}
                              />
                            ) : (
                              <p className="inspector-copy">
                                Select a documentation page from the workspace table to read it here.
                              </p>
                            )
                          }
                        ]
                    : [];
  const [activeInspectorTab, setActiveInspectorTab] = useState<string>(inspectorTabs[0]?.id ?? "context");

  useEffect(() => {
    const nextInspectorTab = inspectorTabs[0]?.id ?? "context";
    if (!inspectorTabs.some((tab) => tab.id === activeInspectorTab) && activeInspectorTab !== nextInspectorTab) {
      setActiveInspectorTab(nextInspectorTab);
    }
  }, [activeInspectorTab, inspectorTabs]);

  const selectedInspectorTab = inspectorTabs.find((tab) => tab.id === activeInspectorTab) ?? inspectorTabs[0] ?? null;
  const inspectorClassName = renderChrome ? "inspector" : "inspector inspector-embedded";
  const renderInspectorChrome = (title: string) =>
    renderChrome ? (
      <div className="panel-titlebar">
        <button
          aria-label={title === "Workspace" ? "Collapse Inspector" : "Collapse workspace panel"}
          className="panel-titlebar-toggle"
          onClick={onToggleInspector}
          title={title === "Workspace" ? "Collapse Inspector" : "Collapse workspace panel"}
          type="button"
        >
          <span aria-hidden="true">−</span>
        </button>
        <span className="panel-titlebar-label">{title}</span>
      </div>
    ) : null;

  if (activeWorkspace === "conversations") {
    return (
      <aside className={inspectorClassName} ref={panelRef}>
        {renderInspectorChrome("Workspace")}
        <div className="inspector-body conversation-workspace-body">
          {selectedThread ? (
            <>
              <section className="inspector-card conversation-thread-panel conversation-thread-transcript-panel">
                {displayedConversationMessages.length > 0 ? (
                  <div className="message-stack" ref={messageStackRef}>
                    {displayedConversationMessages.map((message) => (
                      <MessageBubble
                        key={message.messageId}
                        isSelected={selectedConversationMessage?.messageId === message.messageId}
                        message={message}
                        onSelect={() => setSelectedConversationMessageId(message.messageId)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state conversation-inline-empty">
                    <p className="eyebrow">No Messages Yet</p>
                    <h3>This session exists, but it does not have a retained transcript yet.</h3>
                  </div>
                )}
              </section>

              <section className="inspector-card conversation-thread-panel conversation-composer-panel conversation-composer-dock">
                {conversationSendError ? (
                  <div className="conversation-composer-error" role="alert">
                    {conversationSendError}
                  </div>
                ) : null}
                <input
                  accept="*/*"
                  className="conversation-attachment-input"
                  multiple
                  onChange={(event) => {
                    void onConversationAttachmentSelection(event.target.files);
                    event.target.value = "";
                  }}
                  ref={composerAttachmentInputRef}
                  type="file"
                />
                <textarea
                  className="runtime-editor conversation-draft-editor"
                  ref={composerTextareaRef}
                  onChange={(event) => setConversationDraft(event.target.value)}
                  rows={5}
                  value={conversationDraft}
                />
                {conversationAttachments.length > 0 ? (
                  <div className="conversation-composer-attachment-list">
                    {conversationAttachments.map((attachment) => (
                      <div className="conversation-composer-attachment-chip" key={attachment.attachmentId}>
                        <div className="conversation-composer-attachment-chip-copy">
                          <strong>{attachment.name}</strong>
                          <span>{attachment.summary}</span>
                        </div>
                        <div className="conversation-composer-attachment-chip-actions">
                          <Badge tone="steady">{attachment.kind}</Badge>
                          <button
                            aria-label={`Remove ${attachment.name}`}
                            className="conversation-composer-attachment-remove"
                            onClick={() => removeConversationAttachment(attachment.attachmentId)}
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="conversation-composer-actions">
                  <button
                    className="action-button action-button-secondary conversation-attachment-button"
                    onClick={() => composerAttachmentInputRef.current?.click()}
                    type="button"
                  >
                    Add files
                  </button>
                  <button
                    aria-label={isSendingConversation ? "Sending message" : "Send message"}
                    className="action-button conversation-send-button"
                    disabled={
                      isSendingConversation ||
                      (conversationDraft.trim().length === 0 && conversationAttachments.length === 0)
                    }
                    onClick={() => void sendConversationMessage()}
                    title={isSendingConversation ? "Sending..." : "Send message"}
                    type="button"
                  >
                    <span aria-hidden="true">{isSendingConversation ? "…" : "↵"}</span>
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section className="inspector-card conversation-thread-empty">
              <div className="empty-state">
                <p className="eyebrow">No Thread Selected</p>
                <h3>Select a thread from Browse to continue the session here.</h3>
              </div>
            </section>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className={inspectorClassName} ref={panelRef}>
      {renderInspectorChrome("Inspector")}
      <div className="inspector-body">
        {activeWorkspace === "configuration" ? null : (
          <section className="inspector-card">
            <p className="eyebrow">Current Focus</p>
            <h3>{currentFocusTitle}</h3>
            <p className="inspector-copy">{currentFocusSummary}</p>
            <dl className="detail-list">
              <DetailRow label="Surface" value={labelForWorkspace(activeWorkspace)} />
              <DetailRow label="Binding" value={binding?.environmentId ?? "unbound"} />
              <DetailRow label="Runtime" value={summary?.activeContext.runtimePackage ?? status?.runtimeState ?? "unknown"} />
              <DetailRow label="Workflow" value={status?.workflowState ?? "unknown"} />
            </dl>
          </section>
        )}
        {selectedInspectorTab ? (
          <section className="inspector-card inspector-tabs-card">
            {inspectorTabs.length > 1 ? (
              <div className="inspector-tabs" role="tablist" aria-label="Inspector panels">
                {inspectorTabs.map((tab) => (
                  <button
                    aria-selected={tab.id === selectedInspectorTab.id}
                    className={tab.id === selectedInspectorTab.id ? "inspector-tab active" : "inspector-tab"}
                    key={tab.id}
                    onClick={() => setActiveInspectorTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="inspector-tab-panel" role="tabpanel">
              {selectedInspectorTab.content}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function DesktopWindowStage({
  className,
  activeDesktopId,
  approvalRequests,
  windows,
  focusedWindowId,
  attentionItems,
  createReplSession,
  actionQueue,
  currentProjectReplFocus,
  currentFocusSummary,
  currentFocusTitle,
  desktopDescriptors,
  desktopZoom,
  displayCount,
  displayPanel,
  inspectorPanel,
  topDisplaySurface,
  activeHostedAppId,
  activeHostedAppLabel,
  activeHostedAppSummary,
  browserWorkspaceProps,
  projectsWorkspaceProps,
  operateWorkspaceProps,
  executionWorkspaceProps,
  approvalsWorkspaceProps,
  incidentsWorkspaceProps,
  workWorkspaceProps,
  evidenceWorkspaceProps,
  conversationsWorkspaceProps,
  configurationWorkspaceProps,
  editorSurfaceProps,
  workspaceSurfaceProps,
  transcriptSurfaceProps,
  activeWorkspace,
  selectedExecutionSection,
  browserSurfaceTitle,
  browserSurfaceSummary,
  browserSurfaceEntries,
  currentProjectTitle,
  bindingId,
  centerAttentionSignals,
  hostState,
  runtimeState,
  workflowState,
  shellCurrentSurfaceSummary,
  leadAttention,
  governedAttentionSignalCount,
  replSessions,
  currentReplSessionId,
  switchReplSession,
  runtimeSummary,
  runtimeForm,
  setRuntimeForm,
  evaluateRuntimeForm,
  incidents,
  isEvaluating,
  isInspectingRuntime,
  isDecidingApproval,
  runtimeInspectionMode,
  setRuntimeInspectionMode,
  runtimeInspectorSymbol,
  setRuntimeInspectorSymbol,
  inspectRuntimeSymbol,
  runtimeInspection,
  runtimeEntityDetail,
  runtimeResult,
  onResetLayout,
  onCascadeLayout,
  onTileLayout,
  onCreateDesktop,
  onFocusWindow,
  onMinimizeWindow,
  onMoveWindowToPreviousDesktop,
  onMoveWindowToNextDesktop,
  onRestoreWindow,
  onMoveWindow,
  onPositionWindow,
  onResizeWindow,
  onResizeWindowToDimensions,
  onSetWindowFrame,
  onCloseWindow,
  onOpenAttentionItem,
  onOpenActionQueueItem,
  onOpenDisplaySurface,
  onOpenInspectorSurface,
  onOpenBrowserSurfaceWindow,
  onOpenShellContextWindow,
  onOpenProactivityWindow,
  onOpenDetailedSurfaceWindow,
  onOpenRuntimeWindow,
  onOpenWorkflowWindow,
  onOpenIncident,
  onSubmitApprovalDecision,
  onSwitchDesktop,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenDetailedWorkspace,
  undockedPanelContentById,
  undockDropTargetActive,
  undockDropTargetRef,
  onDropUndockedPanel,
  onDockUndockedPanelLeft,
  onDockUndockedPanelRight,
  replSessionTitleDraft,
  setReplSessionTitleDraft,
  runtimeInspectorPackage,
  setRuntimeInspectorPackage
}: {
  className?: string;
  activeDesktopId: string;
  approvalRequests: ApprovalRequestSummaryDto[];
  windows: DesktopWindowRecord[];
  focusedWindowId: string;
  attentionItems: GlobalAttentionItem[];
  createReplSession: () => Promise<void>;
  actionQueue: ActionQueueItem[];
  currentProjectReplFocus: ReplSessionProfileDto | null;
  currentFocusSummary: string;
  currentFocusTitle: string;
  desktopDescriptors: Array<{ id: string; label: string; active: boolean }>;
  desktopZoom: number;
  displayCount: number;
  displayPanel: DesktopPanelStateDto | null;
  inspectorPanel: DesktopPanelStateDto | null;
  topDisplaySurface: Record<string, unknown> | null;
  activeHostedAppId: HostedAppId;
  activeHostedAppLabel: string;
  activeHostedAppSummary: string;
  browserWorkspaceProps: React.ComponentProps<typeof BrowserWorkspace>;
  projectsWorkspaceProps: React.ComponentProps<typeof ProjectsWorkspace>;
  operateWorkspaceProps: React.ComponentProps<typeof OperateWorkspace>;
  executionWorkspaceProps: React.ComponentProps<typeof ExecutionWorkspace>;
  approvalsWorkspaceProps: React.ComponentProps<typeof ApprovalsWorkspace>;
  incidentsWorkspaceProps: React.ComponentProps<typeof IncidentsWorkspace>;
  workWorkspaceProps: React.ComponentProps<typeof WorkWorkspace>;
  evidenceWorkspaceProps: React.ComponentProps<typeof EvidenceWorkspace>;
  conversationsWorkspaceProps: React.ComponentProps<typeof ConversationsWorkspace>;
  configurationWorkspaceProps: React.ComponentProps<typeof ConfigurationWorkspace>;
  editorSurfaceProps: React.ComponentProps<typeof EditorSurface>;
  workspaceSurfaceProps: React.ComponentProps<typeof WorkspaceSurface>;
  transcriptSurfaceProps: React.ComponentProps<typeof TranscriptSurface>;
  activeWorkspace: WorkspaceId;
  selectedExecutionSection: ExecutionSection;
  browserSurfaceTitle: string;
  browserSurfaceSummary: string;
  browserSurfaceEntries: BrowserSurfaceEntry[];
  currentProjectTitle: string;
  bindingId: string;
  centerAttentionSignals: DesktopAttentionSignal[];
  hostState: string;
  runtimeState: string;
  workflowState: string;
  shellCurrentSurfaceSummary: {
    panelLabel: string;
    summary: string;
  };
  leadAttention: GlobalAttentionItem | null;
  governedAttentionSignalCount: number;
  replSessions: ReplSessionProfileDto[];
  currentReplSessionId: string | null;
  switchReplSession: (sessionId: string) => Promise<void>;
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeForm: string;
  setRuntimeForm: (value: string) => void;
  evaluateRuntimeForm: () => Promise<void>;
  incidents: IncidentSummaryDto[];
  isEvaluating: boolean;
  isInspectingRuntime: boolean;
  isDecidingApproval: boolean;
  runtimeInspectionMode: RuntimeInspectionMode;
  setRuntimeInspectionMode: (mode: RuntimeInspectionMode) => void;
  runtimeInspectorSymbol: string;
  setRuntimeInspectorSymbol: (value: string) => void;
  inspectRuntimeSymbol: () => Promise<void>;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeResult: CommandResultDto<RuntimeEvalResultDto> | null;
  onResetLayout: () => void;
  onCascadeLayout: () => void;
  onTileLayout: () => void;
  onCreateDesktop: () => void;
  onFocusWindow: (window: DesktopWindowRecord) => void;
  onMinimizeWindow: (windowId: string) => void;
  onMoveWindowToPreviousDesktop: (windowId: string) => void;
  onMoveWindowToNextDesktop: (windowId: string) => void;
  onRestoreWindow: (windowId: string) => void;
  onMoveWindow: (windowId: string, direction: DesktopWindowMoveDirection) => void;
  onPositionWindow: (windowId: string, x: number, y: number) => void;
  onResizeWindow: (windowId: string, preset: DesktopWindowSizePreset) => void;
  onResizeWindowToDimensions: (windowId: string, width: number, height: number) => void;
  onSetWindowFrame: (windowId: string, x: number, y: number, width: number, height: number) => void;
  onCloseWindow: (windowId: string) => void;
  onOpenAttentionItem: (item: GlobalAttentionItem) => void;
  onOpenActionQueueItem: (item: ActionQueueItem) => void;
  onOpenDisplaySurface: () => void;
  onOpenInspectorSurface: () => void;
  onOpenBrowserSurfaceWindow: () => void;
  onOpenShellContextWindow: () => void;
  onOpenProactivityWindow: () => void;
  onOpenDetailedSurfaceWindow: () => void;
  onOpenRuntimeWindow: () => void;
  onOpenWorkflowWindow: () => void;
  onOpenIncident: (incidentId: string) => void;
  onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => void;
  onSwitchDesktop: (desktopId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onOpenDetailedWorkspace: () => void;
  undockedPanelContentById: Partial<Record<ShellDockPanelId, ReactNode>>;
  undockDropTargetActive: boolean;
  undockDropTargetRef: Ref<HTMLDivElement>;
  onDropUndockedPanel: (panelId: ShellDockPanelId) => void;
  onDockUndockedPanelLeft: (panelId: ShellDockPanelId) => void;
  onDockUndockedPanelRight: (panelId: ShellDockPanelId) => void;
  replSessionTitleDraft: string;
  setReplSessionTitleDraft: (value: string) => void;
  runtimeInspectorPackage: string;
  setRuntimeInspectorPackage: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const windowCardRefs = useRef(new Map<string, HTMLDivElement>());
  const windowBodyRefs = useRef(new Map<string, HTMLDivElement>());
  const windowFitAttemptsRef = useRef<Record<string, number>>({});
  const dragSessionRef = useRef<{
    pointerId: number;
    windowId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const resizeSessionRef = useRef<{
    pointerId: number;
    windowId: string;
    edge: DesktopWindowResizeEdge;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    canvasWidth: number;
    canvasHeight: number;
  } | null>(null);
  const visibleWindows = windows
    .filter((window) => window.state === "open")
    .sort((left, right) => left.zIndex - right.zIndex);
  const minimizedWindows = windows.filter((window) => window.state === "minimized");
  const desktopUnitScale = 10 * desktopZoom;
  const extentWindows = visibleWindows.length > 0 ? visibleWindows : windows;
  const desktopExtentWidth = Math.max(104, ...extentWindows.map((window) => window.x + window.width + 8));
  const desktopExtentHeight = Math.max(84, ...extentWindows.map((window) => window.y + window.height + 8));
  const desktopSurfaceWidth = desktopExtentWidth * desktopUnitScale;
  const desktopSurfaceHeight = desktopExtentHeight * desktopUnitScale;
  const dominantAttentionItems = attentionItems.filter((item) => item.value > 0).slice(0, 3);
  const stagedControlActions = actionQueue.slice(0, 2);
  const residentQueueItems = actionQueue.slice(0, 4);
  const residentApprovals = approvalRequests.filter((item) => item.state === "awaiting").slice(0, 2);
  const residentIncidents = incidents.filter((item) => item.state !== "resolved").slice(0, 2);
  const hostNeedsAttention = hostState !== "ready";
  const runtimeNeedsAttention = runtimeState === "recovering";
  const workflowNeedsAttention = workflowState === "attention_required";
  const activeReplSession = replSessions.find((session) => session.sessionId === currentReplSessionId) ?? replSessions[0] ?? null;
  const currentRuntimeSummary = runtimeResult?.data.summary ?? runtimeSummary?.divergencePosture ?? "The live image is ready for governed runtime work.";
  const recentHistory = currentProjectReplFocus?.history?.slice(0, 2) ?? [];
  const topDisplaySurfaceTitle =
    typeof topDisplaySurface?.title === "string"
      ? topDisplaySurface.title
      : typeof topDisplaySurface?.label === "string"
        ? topDisplaySurface.label
        : typeof topDisplaySurface?.name === "string"
          ? topDisplaySurface.name
          : "No display surface summary is currently available.";
  const runtimePreview =
    runtimeResult?.data.valuePreview ??
    runtimeEntityDetail?.data.signature ??
    runtimeInspection?.data.summary ??
    "Evaluate a form or inspect a symbol to keep live runtime output visible in the resident window.";
  const handleUndockStageDragOver = (event: ReactDragEvent<HTMLDivElement>): void => {
    if (!readDraggedShellPanelId(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
  };
  const handleUndockStageDrop = (event: ReactDragEvent<HTMLDivElement>): void => {
    const panelId = readDraggedShellPanelId(event.dataTransfer);
    if (!panelId) {
      return;
    }
    event.preventDefault();
    onDropUndockedPanel(panelId);
  };

  function desktopChipGlyph(index: number): string {
    return String(index + 1);
  }

  function dockGlyphClassForWindow(window: DesktopWindowRecord): string {
    const undockedPanelId = shellDockPanelIdFromUndockedWindowId(window.id);
    if (undockedPanelId === "shell-navigation" || undockedPanelId === "shell-utilities") {
      return "desktop-window-dock-glyph-shell";
    }
    if (undockedPanelId === "workspace-inspector") {
      return "desktop-window-dock-glyph-inspector";
    }
    if (undockedPanelId === "editor-symbol") {
      return "desktop-window-dock-glyph-editor";
    }
    if (window.id === "window:control-panel") {
      return "desktop-window-dock-glyph-control-panel";
    }
    if (window.id === "window:listener-workbench") {
      return "desktop-window-dock-glyph-listener";
    }
    if (window.id === "window:inspector") {
      return "desktop-window-dock-glyph-inspector";
    }
    if (window.id === "window:display") {
      return "desktop-window-dock-glyph-display";
    }
    if (window.id === "window:shell-context") {
      return "desktop-window-dock-glyph-shell";
    }
    if (window.id === "window:detailed-surface") {
      return "desktop-window-dock-glyph-detail";
    }
    if (window.id === "window:browser-surface") {
      return "desktop-window-dock-glyph-browser";
    }
    if (window.id === "window:projects-surface") {
      return "desktop-window-dock-glyph-workspace";
    }
    if (window.id === "window:editor-surface") {
      return "desktop-window-dock-glyph-editor";
    }
    if (window.id === "window:workspace-surface") {
      return "desktop-window-dock-glyph-workspace";
    }
    if (window.id === "window:transcript-surface") {
      return "desktop-window-dock-glyph-transcript";
    }
    if (window.id === "window:operate-surface") {
      return "desktop-window-dock-glyph-operate";
    }
    if (window.id === "window:conversations-surface") {
      return "desktop-window-dock-glyph-conversations";
    }
    if (window.id === "window:configuration-surface") {
      return "desktop-window-dock-glyph-configuration";
    }
    return "desktop-window-dock-glyph-generic";
  }

  function shouldShowWindowFacts(window: DesktopWindowRecord): boolean {
    if (shellDockPanelIdFromUndockedWindowId(window.id)) {
      return false;
    }
    return ![
      "window:browser-surface",
      "window:editor-surface",
      "window:projects-surface",
      "window:conversations-surface"
    ].includes(window.id);
  }

  function shouldShowWindowSummary(window: DesktopWindowRecord): boolean {
    if (shellDockPanelIdFromUndockedWindowId(window.id)) {
      return false;
    }
    if (window.id === "window:conversations-surface" || window.id === "window:editor-surface") {
      return false;
    }
    return window.summary.trim().length > 0;
  }

  function renderOperateSurfaceContent(): React.ReactNode {
    if (activeWorkspace === "runtime") {
      if (selectedExecutionSection === "approvals") {
        return <ApprovalsWorkspace {...approvalsWorkspaceProps} />;
      }
      if (selectedExecutionSection === "work") {
        return <WorkWorkspace {...workWorkspaceProps} />;
      }
      return <ExecutionWorkspace {...executionWorkspaceProps} />;
    }

    if (activeWorkspace === "incidents") {
      return <IncidentsWorkspace {...incidentsWorkspaceProps} />;
    }

    if (activeWorkspace === "artifacts") {
      return <EvidenceWorkspace {...evidenceWorkspaceProps} />;
    }

    return <OperateWorkspace {...operateWorkspaceProps} />;
  }

  useEffect(() => {
    function handlePointerMove(event: PointerEvent): void {
      const session = dragSessionRef.current;
      if (session && event.pointerId === session.pointerId) {
        const deltaX = (event.clientX - session.startClientX) / desktopUnitScale;
        const deltaY = (event.clientY - session.startClientY) / desktopUnitScale;
        onPositionWindow(session.windowId, session.startX + deltaX, session.startY + deltaY);
      }
      const resizeSession = resizeSessionRef.current;
      if (resizeSession && event.pointerId === resizeSession.pointerId) {
        const deltaX = (event.clientX - resizeSession.startClientX) / desktopUnitScale;
        const deltaY = (event.clientY - resizeSession.startClientY) / desktopUnitScale;
        const nextX =
          resizeSession.edge.includes("w")
            ? resizeSession.startX + deltaX
            : resizeSession.startX;
        const nextY =
          resizeSession.edge.includes("n")
            ? resizeSession.startY + deltaY
            : resizeSession.startY;
        const nextWidth =
          resizeSession.edge.includes("w")
            ? resizeSession.startWidth - deltaX
            : resizeSession.edge.includes("e")
              ? resizeSession.startWidth + deltaX
              : resizeSession.startWidth;
        const nextHeight =
          resizeSession.edge.includes("n")
            ? resizeSession.startHeight - deltaY
            : resizeSession.edge.includes("s")
              ? resizeSession.startHeight + deltaY
              : resizeSession.startHeight;
        onSetWindowFrame(resizeSession.windowId, nextX, nextY, nextWidth, nextHeight);
      }
    }

    function handlePointerUp(event: PointerEvent): void {
      if (dragSessionRef.current?.pointerId === event.pointerId) {
        dragSessionRef.current = null;
      }
      if (resizeSessionRef.current?.pointerId === event.pointerId) {
        resizeSessionRef.current = null;
      }
      if (!dragSessionRef.current && !resizeSessionRef.current) {
        document.body.classList.remove("desktop-window-dragging");
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [desktopUnitScale, onPositionWindow, onSetWindowFrame]);

  useEffect(() => {
    const rafHandle = window.requestAnimationFrame(() => {
      visibleWindows.forEach((desktopWindow) => {
        const attempts = windowFitAttemptsRef.current[desktopWindow.id] ?? 0;
        if (attempts >= 3) {
          return;
        }

        const card = windowCardRefs.current.get(desktopWindow.id);
        const body = windowBodyRefs.current.get(desktopWindow.id);
        if (!card || !body) {
          return;
        }

        const verticalOverflow = Math.max(0, body.scrollHeight - body.clientHeight);
        const horizontalOverflow = Math.max(0, body.scrollWidth - body.clientWidth);

        if (verticalOverflow <= 2 && horizontalOverflow <= 2) {
          windowFitAttemptsRef.current[desktopWindow.id] = 3;
          return;
        }

        const widthGrowth = horizontalOverflow > 2 ? Math.ceil(horizontalOverflow / desktopUnitScale) + 4 : 0;
        const heightGrowth = verticalOverflow > 2 ? Math.ceil(verticalOverflow / desktopUnitScale) + 4 : 0;

        if (widthGrowth <= 0 && heightGrowth <= 0) {
          windowFitAttemptsRef.current[desktopWindow.id] = 3;
          return;
        }

        windowFitAttemptsRef.current[desktopWindow.id] = attempts + 1;
        onSetWindowFrame(
          desktopWindow.id,
          desktopWindow.x,
          desktopWindow.y,
          desktopWindow.width + widthGrowth,
          desktopWindow.height + heightGrowth
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(rafHandle);
    };
  }, [desktopUnitScale, onSetWindowFrame, visibleWindows]);

  function startWindowDrag(event: React.PointerEvent<HTMLDivElement>, window: DesktopWindowRecord): void {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return;
    }

    dragSessionRef.current = {
      pointerId: event.pointerId,
      windowId: window.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: window.x,
      startY: window.y,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("desktop-window-dragging");
    onFocusWindow(window);
    event.preventDefault();
    event.stopPropagation();
  }

  function startWindowResize(
    event: React.PointerEvent<HTMLButtonElement>,
    window: DesktopWindowRecord,
    edge: DesktopWindowResizeEdge
  ): void {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return;
    }

    resizeSessionRef.current = {
      pointerId: event.pointerId,
      windowId: window.id,
      edge,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: window.x,
      startY: window.y,
      startWidth: window.width,
      startHeight: window.height,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("desktop-window-dragging");
    onFocusWindow(window);
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section className={className ?? "panel desktop-window-stage"}>
      <div className="desktop-window-toolbar">
        <div className="desktop-window-desktops">
          {desktopDescriptors.map((desktop, index) => (
            <button
              className={desktop.active ? "desktop-window-desktop-chip active" : "desktop-window-desktop-chip"}
              key={desktop.id}
              onClick={() => onSwitchDesktop(desktop.id)}
              title={desktop.label}
              aria-label={`Switch to ${desktop.label}`}
              type="button"
            >
              {desktopChipGlyph(index)}
            </button>
          ))}
          <button
            className="desktop-window-desktop-chip desktop-window-desktop-chip-icon"
            onClick={onCreateDesktop}
            title="Create Desktop"
            aria-label="Create desktop"
            type="button"
          >
            +
          </button>
        </div>
        <div className="desktop-window-notifications">
          {centerAttentionSignals.map((signal) => (
            <button
              className={`desktop-window-notification desktop-window-notification-signal desktop-window-notification-signal-${signal.priority}`}
              data-tooltip={signal.tooltip}
              key={signal.id}
              onClick={signal.onOpen}
              title={signal.tooltip}
              type="button"
            >
              <span aria-hidden="true" className={`desktop-window-notification-glyph ${signal.glyphClassName}`} />
            </button>
          ))}
          <button
            className="desktop-window-notification"
            data-tooltip={`Open shell context for ${shellCurrentSurfaceSummary.panelLabel}. Project ${currentProjectTitle}. Binding ${bindingId}.`}
            onClick={onOpenShellContextWindow}
            title={`Open shell context for ${shellCurrentSurfaceSummary.panelLabel}. Project ${currentProjectTitle}. Binding ${bindingId}.`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-shell" />
          </button>
          <button
            className={governedAttentionSignalCount > 0 || leadAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={
              leadAttention
                ? `Open governed attention: ${leadAttention.label}${governedAttentionSignalCount > 0 ? ` (${governedAttentionSignalCount} active)` : ""}`
                : governedAttentionSignalCount > 0
                  ? `Open governed attention (${governedAttentionSignalCount} active)`
                  : "Open governed attention in Operate"
            }
            onClick={onOpenProactivityWindow}
            title={
              leadAttention
                ? `Open governed attention: ${leadAttention.label}${governedAttentionSignalCount > 0 ? ` (${governedAttentionSignalCount} active)` : ""}`
                : governedAttentionSignalCount > 0
                  ? `Open governed attention (${governedAttentionSignalCount} active)`
                  : "Open governed attention in Operate"
            }
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-proactivity" />
            {governedAttentionSignalCount > 0 ? (
              <span className="desktop-window-notification-dot" aria-hidden="true" />
            ) : null}
          </button>
          <button
            className="desktop-window-notification"
            data-tooltip={`Open detailed surface for ${activeHostedAppLabel}`}
            onClick={onOpenDetailedSurfaceWindow}
            title={`Open detailed surface for ${activeHostedAppLabel}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-detail" />
          </button>
          <button
            className={hostNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Host state: ${hostState}`}
            onClick={onOpenShellContextWindow}
            title={`Host state: ${hostState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-host" />
          </button>
          <button
            className={runtimeNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Runtime state: ${runtimeState}`}
            onClick={onOpenRuntimeWindow}
            title={`Runtime state: ${runtimeState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-runtime" />
          </button>
          <button
            className={workflowNeedsAttention ? "desktop-window-notification active" : "desktop-window-notification"}
            data-tooltip={`Workflow state: ${workflowState}`}
            onClick={onOpenWorkflowWindow}
            title={`Workflow state: ${workflowState}`}
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-notification-glyph desktop-window-notification-glyph-workflow" />
          </button>
        </div>
        <div className="desktop-window-layout-actions">
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onResetLayout}
            title="Reset Layout"
            aria-label="Reset desktop layout"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-reset" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onCascadeLayout}
            title="Cascade"
            aria-label="Cascade resident windows"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-cascade" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onTileLayout}
            title="Tile"
            aria-label="Tile resident windows"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-tile" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomOut}
            title="Zoom Out"
            aria-label="Zoom out desktop surface"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-out" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomReset}
            title="Reset Zoom"
            aria-label="Reset desktop zoom to 100 percent"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-reset" />
          </button>
          <button
            className="desktop-window-layout-action desktop-window-layout-action-icon"
            onClick={onZoomIn}
            title="Zoom In"
            aria-label="Zoom in desktop surface"
            type="button"
          >
            <span aria-hidden="true" className="desktop-window-layout-glyph desktop-window-layout-glyph-zoom-in" />
          </button>
        </div>
      </div>
      <div
        aria-label="Desktop window registry"
        className={`desktop-window-canvas-scroll${undockDropTargetActive ? " desktop-window-canvas-scroll-drop-target" : ""}`}
        onDragOver={handleUndockStageDragOver}
        onDrop={handleUndockStageDrop}
        ref={undockDropTargetRef}
      >
      <div
        className="desktop-window-canvas"
        ref={canvasRef}
        style={{ width: `${desktopSurfaceWidth}px`, minHeight: `${desktopSurfaceHeight}px`, height: `${desktopSurfaceHeight}px` }}
      >
        {visibleWindows.map((window) => (
          <div
            className={window.id === focusedWindowId ? "desktop-window-card focused" : "desktop-window-card"}
            key={window.id}
            onClick={() => onFocusWindow(window)}
            ref={(node) => {
              if (node) {
                windowCardRefs.current.set(window.id, node);
              } else {
                windowCardRefs.current.delete(window.id);
              }
            }}
            style={{
              left: `${window.x * desktopUnitScale}px`,
              top: `${window.y * desktopUnitScale}px`,
              width: `${window.width * desktopUnitScale}px`,
              height: `${window.height * desktopUnitScale}px`,
              zIndex: window.zIndex
            }}
          >
            <div className="desktop-window-titlebar" onPointerDown={(event) => startWindowDrag(event, window)}>
              <div className="desktop-window-drag-handle">
                <strong>{window.title}</strong>
              </div>
              <div className="desktop-window-actions" onPointerDown={(event) => event.stopPropagation()}>
                {shellDockPanelIdFromUndockedWindowId(window.id) ? (
                  <>
                    <button
                      className="desktop-window-action desktop-window-action-icon"
                      aria-label={`Dock ${window.title} to left rail`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
                        if (!panelId) {
                          return;
                        }
                        onDockUndockedPanelLeft(panelId);
                      }}
                      title="Dock Left"
                      type="button"
                    >
                      ⇤
                    </button>
                    <button
                      className="desktop-window-action desktop-window-action-icon"
                      aria-label={`Dock ${window.title} to right rail`}
                      onClick={(event) => {
                        event.stopPropagation();
                        const panelId = shellDockPanelIdFromUndockedWindowId(window.id);
                        if (!panelId) {
                          return;
                        }
                        onDockUndockedPanelRight(panelId);
                      }}
                      title="Dock Right"
                      type="button"
                    >
                      ⇥
                    </button>
                  </>
                ) : null}
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} left`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "left");
                  }}
                  title="Move Left"
                  type="button"
                >
                  ←
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} up`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "up");
                  }}
                  title="Move Up"
                  type="button"
                >
                  ↑
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} down`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "down");
                  }}
                  title="Move Down"
                  type="button"
                >
                  ↓
                </button>
                <button
                  className="desktop-window-action desktop-window-action-icon"
                  aria-label={`Move ${window.title} right`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindow(window.id, "right");
                  }}
                  title="Move Right"
                  type="button"
                >
                  →
                </button>
                <button
                  aria-label={`Move ${window.title} to the previous desktop`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindowToPreviousDesktop(window.id);
                  }}
                  title="Move To Previous Desktop"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-send-reverse" />
                </button>
                <button
                  aria-label={`Move ${window.title} to the next desktop`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMoveWindowToNextDesktop(window.id);
                  }}
                  title="Move To Next Desktop"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-send" />
                </button>
                <button
                  aria-label={`Set ${window.title} to compact size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "compact");
                  }}
                  title="Compact"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-compact" />
                </button>
                <button
                  aria-label={`Set ${window.title} to standard size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "standard");
                  }}
                  title="Standard"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-standard" />
                </button>
                <button
                  aria-label={`Set ${window.title} to expanded size`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResizeWindow(window.id, "expanded");
                  }}
                  title="Expand"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-expanded" />
                </button>
                <button
                  aria-label={`Minimize ${window.title}`}
                  className="desktop-window-action desktop-window-action-icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    onMinimizeWindow(window.id);
                  }}
                  title="Minimize"
                  type="button"
                >
                  <span aria-hidden="true" className="desktop-window-action-glyph desktop-window-action-glyph-minimize" />
                </button>
                {window.closable ? (
                  <button
                    className="desktop-window-action desktop-window-action-icon"
                    aria-label={`Close ${window.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseWindow(window.id);
                    }}
                    title="Close"
                    type="button"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            <div
              className={window.id === "window:editor-surface" ? "desktop-window-body desktop-window-body-editor" : "desktop-window-body"}
              ref={(node) => {
                if (node) {
                  windowBodyRefs.current.set(window.id, node);
                } else {
                  windowBodyRefs.current.delete(window.id);
                }
              }}
            >
              {shouldShowWindowSummary(window) ? <p>{window.summary}</p> : null}
              {shouldShowWindowFacts(window) ? (
                <div className="desktop-window-facts">
                  <ContextBlock label="Focus" value={window.id === focusedWindowId ? "foreground" : "resident"} />
                  <ContextBlock label="State" value={window.state} />
                  <ContextBlock label="Layer" value={String(window.zIndex)} />
                </div>
              ) : null}
              {(() => {
                const undockedPanelId = shellDockPanelIdFromUndockedWindowId(window.id);
                if (!undockedPanelId) {
                  return null;
                }
                return (
                  <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                    {undockedPanelContentById[undockedPanelId] ?? null}
                  </div>
                );
              })()}
              {window.id === "window:control-panel" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Dominant Attention</p>
                      {dominantAttentionItems.length > 0 ? (
                        dominantAttentionItems.map((item) => (
                          <button
                            className="desktop-window-control-item"
                            key={item.id}
                            onClick={() => onOpenAttentionItem(item)}
                            type="button"
                          >
                            <strong>{item.label}</strong>
                            <span>{item.summary}</span>
                            <em>{item.value} active</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">The environment is calm and no dominant governed attention object is active.</p>
                      )}
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Staged Continuations</p>
                      {stagedControlActions.length > 0 ? (
                        stagedControlActions.map((item) => (
                          <button
                            className="desktop-window-control-item"
                            key={item.key}
                            onClick={() => onOpenActionQueueItem(item)}
                            type="button"
                          >
                            <strong>{item.title}</strong>
                            <span>{item.effectSummary}</span>
                            <em>{item.actionLabel}</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">No staged continuations currently outrank the rest of the desktop field.</p>
                      )}
                    </div>
                  </div>
                  <div className="desktop-window-control-queue">
                    <p className="context-label">Governed Queue</p>
                    {residentQueueItems.length > 0 ? (
                      residentQueueItems.map((item) => (
                        <button
                          className="desktop-window-control-queue-item"
                          key={item.key}
                          onClick={() => onOpenActionQueueItem(item)}
                          type="button"
                        >
                          <div className="desktop-window-control-queue-top">
                            <strong>{item.title}</strong>
                            <span>{item.objectType}</span>
                          </div>
                          <p>{item.whyNow}</p>
                          <em>{item.actionLabel}</em>
                        </button>
                      ))
                    ) : (
                      <p className="desktop-window-workbench-summary">No governed queue items currently outrank the resident windows already in view.</p>
                    )}
                  </div>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Direct Approvals</p>
                      {residentApprovals.length > 0 ? (
                        residentApprovals.map((approval) => (
                          <div className="desktop-window-control-decision" key={approval.requestId}>
                            <div className="desktop-window-control-queue-top">
                              <strong>{approval.title}</strong>
                              <span>{approval.state}</span>
                            </div>
                            <p>{approval.summary}</p>
                            <div className="desktop-window-control-decision-actions">
                              <button
                                className="desktop-window-action"
                                disabled={isDecidingApproval}
                                onClick={() => onSubmitApprovalDecision(approval.requestId, "approve")}
                                type="button"
                              >
                                Approve
                              </button>
                              <button
                                className="desktop-window-action"
                                disabled={isDecidingApproval}
                                onClick={() => onSubmitApprovalDecision(approval.requestId, "deny")}
                                type="button"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">No awaiting approval is currently blocking the top resident flow.</p>
                      )}
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Direct Recovery</p>
                      {residentIncidents.length > 0 ? (
                        residentIncidents.map((incident) => (
                          <button
                            className="desktop-window-control-item"
                            key={incident.incidentId}
                            onClick={() => onOpenIncident(incident.incidentId)}
                            type="button"
                          >
                            <strong>{incident.title}</strong>
                            <span>{`Severity ${incident.severity}`}</span>
                            <em>{incident.state === "open" ? "Open Recovery" : "Continue Recovery"}</em>
                          </button>
                        ))
                      ) : (
                        <p className="desktop-window-workbench-summary">No open incident currently outranks the rest of the desktop field.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:display" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Focus</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{displayPanel?.selectedTitle ?? "No display surface selected"}</strong>
                          <span>{displayPanel?.selectedKind ?? "display"}</span>
                        </div>
                        <p>
                          {displayPanel?.selectedExecutionId
                            ? `Execution ${displayPanel.selectedExecutionId} is currently attached to the focused display lane.`
                            : "No display-backed governed execution is currently focused."}
                        </p>
                        <em>
                          {displayPanel?.focusObjectId
                            ? `Focus ${displayPanel.focusObjectId}`
                            : "No explicit display focus object is currently selected."}
                        </em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Estate</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{displayCount}</strong>
                          <span>{displayCount === 1 ? "resident" : "residents"}</span>
                        </div>
                        <p>{topDisplaySurfaceTitle}</p>
                        <em>{displayPanel?.resolvedVia ? `Resolved via ${displayPanel.resolvedVia}` : displayPanel?.objectKind ?? "display"}</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Display Route</p>
                      <button className="desktop-window-control-item" onClick={onOpenDisplaySurface} type="button">
                        <strong>Open Display Surface</strong>
                        <span>Route this utility resident into the shell display lane for deeper governed interaction.</span>
                        <em>Open Display Surface</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:shell-context" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Current Surface</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{shellCurrentSurfaceSummary.panelLabel}</strong>
                          <span>{activeHostedAppLabel}</span>
                        </div>
                        <p>{shellCurrentSurfaceSummary.summary}</p>
                          <em>Governed attention routes through the desktop shell.</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Hosted Application</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{activeHostedAppLabel}</strong>
                          <span>resident</span>
                        </div>
                        <p>{activeHostedAppSummary}</p>
                        <em>Shell resident</em>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:inspector" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Focused Object</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{currentFocusTitle}</strong>
                          <span>{inspectorPanel?.objectKind ?? "object"}</span>
                        </div>
                        <p>{currentFocusSummary}</p>
                        <em>
                          {inspectorPanel?.focusObjectId
                            ? `Focus ${inspectorPanel.focusObjectId}`
                            : "No explicit inspector object is currently selected."}
                        </em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Resident Inspection</p>
                      <div className="desktop-window-workbench-inspector">
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Package</span>
                          <input
                            className="desktop-window-workbench-symbol"
                            onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                            value={runtimeInspectorPackage}
                          />
                        </label>
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Symbol</span>
                          <input
                            className="desktop-window-workbench-symbol"
                            onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                            value={runtimeInspectorSymbol}
                          />
                        </label>
                        <label className="desktop-window-workbench-input">
                          <span className="context-label">Mode</span>
                          <select
                            className="desktop-window-workbench-select"
                            onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                            value={runtimeInspectionMode}
                          >
                            <option value="describe">describe</option>
                            <option value="documentation">documentation</option>
                            <option value="source">source</option>
                          </select>
                        </label>
                        <button
                          className="action-button action-button-secondary"
                          disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                          onClick={() => void inspectRuntimeSymbol()}
                          type="button"
                        >
                          {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
                        </button>
                      </div>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{runtimeInspection?.data.symbol ?? (runtimeInspectorSymbol || "No inspection symbol")}</strong>
                          <span>{runtimeInspectionMode}</span>
                        </div>
                        <p>{runtimeInspection?.data.summary ?? "Runtime inspection results stay visible here so the inspector can operate as a concurrent desktop resident."}</p>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Inspector Route</p>
                      <button className="desktop-window-control-item" onClick={onOpenInspectorSurface} type="button">
                        <strong>Open Inspector Surface</strong>
                        <span>
                          {inspectorPanel?.resolvedVia
                            ? `Resolved via ${inspectorPanel.resolvedVia}.`
                            : "Route this utility resident into the shell inspector lane for deeper object and execution inspection."}
                        </span>
                        <em>{inspectorPanel?.selectedExecutionId ? `Execution ${inspectorPanel.selectedExecutionId}` : "Open Inspector"}</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:detailed-surface" ? (
                <div className="desktop-window-control-panel" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-control-grid">
                    <div className="desktop-window-control-column">
                      <p className="context-label">Deep Work Route</p>
                      <div className="desktop-window-control-queue-item">
                        <div className="desktop-window-control-queue-top">
                          <strong>{activeHostedAppLabel}</strong>
                          <span>{shellCurrentSurfaceSummary.panelLabel}</span>
                        </div>
                        <p>{`Use this resident when the current desktop surface needs a deeper, single-surface pass without reopening a bottom-of-page strip.`}</p>
                        <em>{activeHostedAppSummary}</em>
                      </div>
                    </div>
                    <div className="desktop-window-control-column">
                      <p className="context-label">Open Detail</p>
                      <button className="desktop-window-control-item" onClick={onOpenDetailedWorkspace} type="button">
                        <strong>{activeHostedAppId === "listener-workbench" ? "Open Listener Workbench" : "Open Current Workspace"}</strong>
                        <span>{activeHostedAppId === "listener-workbench" ? "Route into the live listener resident and its governed runtime work." : "Route into the current control-panel workspace for deeper single-surface work."}</span>
                        <em>{shellCurrentSurfaceSummary.panelLabel}</em>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {window.id === "window:browser-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <BrowserWorkspace {...browserWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:projects-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ProjectsWorkspace {...projectsWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:editor-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <EditorSurface {...editorSurfaceProps} />
                </div>
              ) : null}
              {window.id === "window:workspace-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <WorkspaceSurface {...workspaceSurfaceProps} />
                </div>
              ) : null}
              {window.id === "window:transcript-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <TranscriptSurface {...transcriptSurfaceProps} />
                </div>
              ) : null}
              {window.id === "window:operate-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  {renderOperateSurfaceContent()}
                </div>
              ) : null}
              {window.id === "window:conversations-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ConversationsWorkspace {...conversationsWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:configuration-surface" ? (
                <div className="desktop-window-browser-surface" onClick={(event) => event.stopPropagation()}>
                  <ConfigurationWorkspace {...configurationWorkspaceProps} />
                </div>
              ) : null}
              {window.id === "window:listener-workbench" ? (
                <div className="desktop-window-workbench" onClick={(event) => event.stopPropagation()}>
                  <div className="desktop-window-workbench-header">
                    <ContextBlock label="Session" value={activeReplSession?.title ?? "No Session"} />
                    <ContextBlock label="Package" value={runtimeSummary?.currentPackage ?? "No Package"} />
                    <ContextBlock label="Runtime" value={runtimeSummary?.runtimeId ?? "No Runtime"} />
                  </div>
                  <div className="desktop-window-workbench-inspector">
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">New Session</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setReplSessionTitleDraft(event.target.value)}
                        value={replSessionTitleDraft}
                      />
                    </label>
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspect Package</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                        value={runtimeInspectorPackage}
                      />
                    </label>
                    <button className="action-button action-button-secondary" onClick={() => void createReplSession()} type="button">
                      New Session
                    </button>
                  </div>
                  <div className="desktop-window-workbench-sessions">
                    {replSessions.slice(0, 3).map((session) => (
                      <button
                        className={session.sessionId === currentReplSessionId ? "desktop-window-session active" : "desktop-window-session"}
                        key={session.sessionId}
                        onClick={() => void switchReplSession(session.sessionId)}
                        type="button"
                      >
                        <strong>{session.title}</strong>
                        <span>{session.lastSummary}</span>
                      </button>
                    ))}
                  </div>
                  <label className="desktop-window-workbench-input">
                    <span className="context-label">Listener Form</span>
                    <textarea
                      className="desktop-window-workbench-textarea"
                      onChange={(event) => setRuntimeForm(event.target.value)}
                      rows={4}
                      value={runtimeForm}
                    />
                  </label>
                  <div className="desktop-window-workbench-actions">
                    <button className="action-button" disabled={isEvaluating} onClick={() => void evaluateRuntimeForm()} type="button">
                      {isEvaluating ? "Running..." : "Run Form"}
                    </button>
                    <button className="action-button action-button-secondary" onClick={onOpenInspectorSurface} type="button">
                      Open Inspector Resident
                    </button>
                    <p className="desktop-window-workbench-summary">{currentRuntimeSummary}</p>
                  </div>
                  <div className="desktop-window-workbench-inspector">
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspect Symbol</span>
                      <input
                        className="desktop-window-workbench-symbol"
                        onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                        value={runtimeInspectorSymbol}
                      />
                    </label>
                    <label className="desktop-window-workbench-input">
                      <span className="context-label">Inspection Mode</span>
                      <select
                        className="desktop-window-workbench-select"
                        onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                        value={runtimeInspectionMode}
                      >
                        <option value="describe">describe</option>
                        <option value="documentation">documentation</option>
                        <option value="source">source</option>
                      </select>
                    </label>
                    <button
                      className="action-button action-button-secondary"
                      disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                      onClick={() => void inspectRuntimeSymbol()}
                      type="button"
                    >
                      {isInspectingRuntime ? "Inspecting..." : "Inspect Symbol"}
                    </button>
                  </div>
                  <div className="desktop-window-workbench-grid">
                    <div className="desktop-window-workbench-panel">
                      <p className="context-label">Live Inspection</p>
                      <strong>{runtimeInspection?.data.symbol ?? runtimeSummary?.currentPackage ?? "No inspection focus"}</strong>
                      <p>{runtimeInspection?.data.summary ?? "Inspection results appear here as the listener workbench explores the live image."}</p>
                    </div>
                    <div className="desktop-window-workbench-panel">
                      <p className="context-label">Image Posture</p>
                      <strong>{`${runtimeSummary?.loadedSystems.length ?? 0} loaded systems`}</strong>
                      <p>
                        {runtimeSummary
                          ? `${runtimeSummary.activeMutations} active mutations, ${runtimeSummary.linkedIncidentIds.length} linked incidents.`
                          : "Runtime posture becomes available when the environment binding is active."}
                      </p>
                    </div>
                  </div>
                  <div className="desktop-window-workbench-panel">
                    <p className="context-label">Result Preview</p>
                    <pre className="desktop-window-history-entry desktop-window-runtime-preview">{runtimePreview}</pre>
                  </div>
                  <div className="desktop-window-workbench-history">
                    <p className="context-label">Session History</p>
                    {recentHistory.length > 0 ? (
                      recentHistory.map((entry) => (
                        <div className="desktop-window-history-entry" key={entry.entryId}>
                          <strong>{entry.summary}</strong>
                          <pre>{entry.form}</pre>
                        </div>
                      ))
                    ) : (
                      <p className="desktop-window-workbench-summary">Run forms in this resident to retain recent history here.</p>
                    )}
                  </div>
                </div>
              ) : null}
              <button
                aria-label={`Resize ${window.title}`}
                className="desktop-window-resize-handle desktop-window-resize-handle-se"
                onPointerDown={(event) => startWindowResize(event, window, "se")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from right edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-e"
                onPointerDown={(event) => startWindowResize(event, window, "e")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from bottom edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-s"
                onPointerDown={(event) => startWindowResize(event, window, "s")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from left edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-w"
                onPointerDown={(event) => startWindowResize(event, window, "w")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top edge`}
                className="desktop-window-resize-handle desktop-window-resize-handle-n"
                onPointerDown={(event) => startWindowResize(event, window, "n")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top right corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-ne"
                onPointerDown={(event) => startWindowResize(event, window, "ne")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from top left corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-nw"
                onPointerDown={(event) => startWindowResize(event, window, "nw")}
                type="button"
              />
              <button
                aria-label={`Resize ${window.title} from bottom left corner`}
                className="desktop-window-resize-handle desktop-window-resize-handle-sw"
                onPointerDown={(event) => startWindowResize(event, window, "sw")}
                type="button"
              />
            </div>
          </div>
        ))}
      </div>
      </div>
      {minimizedWindows.length > 0 ? (
        <div className="desktop-window-dock" role="toolbar" aria-label="Iconified windows">
          <div className="desktop-window-dock-rail">
            {minimizedWindows.map((window) => (
              <button
                className="desktop-window-dock-item"
                key={window.id}
                onClick={() => onRestoreWindow(window.id)}
                data-tooltip={`Restore ${window.title}`}
                title={`Restore ${window.title}`}
                type="button"
              >
                <span className="desktop-window-dock-icon" aria-hidden="true">
                  <span className={`desktop-window-dock-glyph ${dockGlyphClassForWindow(window)}`} />
                </span>
                <span className="desktop-window-dock-indicator" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BrowserWorkspace({
  approvalRequests,
  isDecidingApproval,
  consoleLogStream,
  diagnosticReports,
  runtimeSummary,
  runtimeTelemetry,
  selectedDomain,
  selectedConsolePlane,
  selectedConsoleSourceFilter,
  selectedConsoleEntryId,
  selectedDiagnosticSourceFilter,
  selectedDiagnosticReport,
  selectedDiagnosticReportId,
  selectedTelemetryProcessId,
  parenDepthColors,
  packageBrowser,
  environmentFocus,
  navigateToWorkspace,
  conversationDraft,
  runtimeForm,
  setConversationDraft,
  setRuntimeForm,
  selectedThread,
  selectedThreadId,
  selectedPackageName,
  setSelectedPackageName,
  setSelectedThreadId,
  runtimeInspection,
  runtimeEntityDetail,
  runtimeInspectionMode,
  runtimeInspectorSymbol,
  runtimeInspectorPackage,
  setRuntimeInspectionMode,
  setRuntimeInspectorSymbol,
  setRuntimeInspectorPackage,
  setSelectedConsolePlane,
  setSelectedConsoleSourceFilter,
  setSelectedConsoleEntryId,
  setSelectedDiagnosticSourceFilter,
  setSelectedDiagnosticReportId,
  setSelectedTelemetryProcessId,
  browseRuntimeEntity,
  inspectRuntimeSymbol,
  isInspectingRuntime,
  sourcePreview,
  sourceDraft,
  setSourceDraft,
  isEditingSource,
  setIsEditingSource,
  isStagingSource,
  isReloadingSource,
  sourceMutationResult,
  sourceReloadResult,
  stageSourceChange,
  reloadSourceFile,
  loadSourcePreview,
  incidents,
  artifacts,
  threads,
  documentationPages,
  selectedDocumentationSlug,
  loadDocumentationPage,
  workItems,
  onOpenApprovalRequest,
  onSubmitApprovalDecision,
  openInspectorSurface
}: {
  approvalRequests: ApprovalRequestSummaryDto[];
  isDecidingApproval: boolean;
  consoleLogStream: QueryResultDto<ConsoleLogStreamDto> | null;
  diagnosticReports: DiagnosticReportSummaryDto[];
  runtimeSummary: RuntimeSummaryDto | null;
  runtimeTelemetry: RuntimeTelemetrySnapshotDto | null;
  selectedDomain: BrowserDomain;
  selectedConsolePlane: "environment" | "host";
  selectedConsoleSourceFilter: string;
  selectedConsoleEntryId: string | null;
  selectedDiagnosticSourceFilter: string;
  selectedDiagnosticReport: DiagnosticReportDetailDto | null;
  selectedDiagnosticReportId: string | null;
  selectedTelemetryProcessId: string | null;
  parenDepthColors: string[];
  packageBrowser: QueryResultDto<PackageBrowserDto> | null;
  environmentFocus: EnvironmentFocusState;
  navigateToWorkspace: (workspaceId: WorkspaceId) => void;
  conversationDraft: string;
  runtimeForm: string;
  setConversationDraft: (value: string) => void;
  setRuntimeForm: (value: string) => void;
  selectedThread: ThreadDetailDto | null;
  selectedThreadId: string | null;
  selectedPackageName: string;
  setSelectedPackageName: (value: string) => void;
  setSelectedThreadId: (threadId: string) => void;
  runtimeInspection: QueryResultDto<RuntimeInspectionResultDto> | null;
  runtimeEntityDetail: QueryResultDto<RuntimeEntityDetailDto> | null;
  runtimeInspectionMode: RuntimeInspectionMode;
  runtimeInspectorSymbol: string;
  runtimeInspectorPackage: string;
  setRuntimeInspectionMode: (value: RuntimeInspectionMode) => void;
  setRuntimeInspectorSymbol: (value: string) => void;
  setRuntimeInspectorPackage: (value: string) => void;
  setSelectedConsolePlane: (value: "environment" | "host") => void;
  setSelectedConsoleSourceFilter: (value: string) => void;
  setSelectedConsoleEntryId: (value: string | null) => void;
  setSelectedDiagnosticSourceFilter: (value: string) => void;
  setSelectedDiagnosticReportId: (value: string | null) => void;
  setSelectedTelemetryProcessId: (value: string | null) => void;
  browseRuntimeEntity: (
    symbol: string,
    packageName: string | undefined,
    mode: RuntimeInspectionMode
  ) => Promise<void>;
  inspectRuntimeSymbol: () => Promise<void>;
  isInspectingRuntime: boolean;
  sourcePreview: QueryResultDto<SourcePreviewDto> | null;
  sourceDraft: string;
  setSourceDraft: (value: string) => void;
  isEditingSource: boolean;
  setIsEditingSource: (value: boolean) => void;
  isStagingSource: boolean;
  isReloadingSource: boolean;
  sourceMutationResult: CommandResultDto<SourceMutationResultDto> | null;
  sourceReloadResult: CommandResultDto<SourceReloadResultDto> | null;
  stageSourceChange: () => Promise<void>;
  reloadSourceFile: () => Promise<void>;
  loadSourcePreview: (path: string, line?: number) => Promise<void>;
  incidents: IncidentSummaryDto[];
  artifacts: ArtifactSummaryDto[];
  threads: ThreadSummaryDto[];
  documentationPages: DocumentationPageSummaryDto[];
  selectedDocumentationSlug: string;
  loadDocumentationPage: (slug: string) => Promise<void>;
  workItems: WorkItemSummaryDto[];
  onOpenApprovalRequest: (requestId: string) => Promise<void>;
  onSubmitApprovalDecision: (requestId: string, decision: "approve" | "deny") => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const [packageWorkspaceMode, setPackageWorkspaceMode] = useState<"packages" | "exports" | "internals">("packages");
  const [symbolWorkspaceMode, setSymbolWorkspaceMode] = useState<
    "generic-function" | "class" | "macro" | "function" | "variable"
  >("function");
  const [classMethodMode, setClassMethodMode] = useState<"classes" | "generic-functions">("classes");
  const [xrefMode, setXrefMode] = useState<"incoming" | "outgoing">("incoming");
  const [symbolInspectorExpanded, setSymbolInspectorExpanded] = useState(false);
  const [selectedSystemName, setSelectedSystemName] = useState<string | null>(null);
  const [selectedGovernanceKey, setSelectedGovernanceKey] = useState<string | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [selectedSourceEntryKey, setSelectedSourceEntryKey] = useState<string | null>(null);
  const [selectedDocumentationKey, setSelectedDocumentationKey] = useState<string | null>(null);
  const [selectedLinkedConversationId, setSelectedLinkedConversationId] = useState<string | null>(null);
  const [listenerActionMode, setListenerActionMode] = useState<"default" | "inspect" | "reload" | "evaluate" | "custom">("default");
  const [customListenerForm, setCustomListenerForm] = useState<string | null>(null);
  const previousConversationHandoffPromptRef = useRef("");

  const packageNames = Array.from(
    new Set([
      runtimeSummary?.currentPackage,
      packageBrowser?.data.packageName,
      ...(runtimeSummary?.scopes.map((scope) => scope.packageName) ?? [])
    ].filter((value): value is string => Boolean(value)))
  );

  const browserObjective =
    runtimeInspection?.data.summary ??
    sourcePreview?.data.summary ??
    runtimeSummary?.divergencePosture ??
    "Browse systems, packages, symbols, source, and governed artifacts as one live environment.";

  const filteredExternalSymbols = packageBrowser?.data.externalSymbols ?? [];
  const filteredInternalSymbols = packageBrowser?.data.internalSymbols ?? [];
  const inspectedSymbolKind: PackageBrowserSymbolDto["kind"] =
    runtimeEntityDetail?.data.entityKind ??
    (runtimeInspection?.data.mode === "methods"
      ? "generic-function"
      : runtimeInspection?.data.mode === "describe"
        ? "variable"
        : runtimeInspection?.data.mode === "definitions" || runtimeInspection?.data.mode === "callers"
          ? "function"
          : "unknown");
  const supplementalBrowserSymbols: PackageBrowserSymbolDto[] = runtimeInspection?.data.symbol
    ? [
        {
          symbol: runtimeInspection.data.symbol,
          kind: inspectedSymbolKind,
          visibility: "internal"
        }
      ]
    : [];
  const packageSymbols = [...filteredExternalSymbols, ...filteredInternalSymbols, ...supplementalBrowserSymbols].filter(
    (entry, index, entries) =>
      entries.findIndex(
        (candidate) =>
          candidate.symbol === entry.symbol &&
          candidate.kind === entry.kind &&
          candidate.visibility === entry.visibility
      ) === index
  );
  const focusedPackageSymbol =
    packageSymbols.find((entry) => entry.symbol === (runtimeInspection?.data.symbol ?? runtimeInspectorSymbol)) ??
    null;
  const focusedSymbol = runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? runtimeInspectorSymbol;
  const focusedPackage =
    runtimeInspection?.data.packageName ??
    runtimeEntityDetail?.data.packageName ??
    (runtimeInspectorPackage || undefined) ??
    packageBrowser?.data.packageName;
  const sourceBackedDetailItem =
    runtimeEntityDetail?.data.relatedItems.find((item) => item.path) ??
    runtimeInspection?.data.items.find((item) => item.path) ??
    null;
  const sourceDraftDirty =
    Boolean(sourcePreview) && sourceDraft !== (sourcePreview?.data.editableContent ?? "");
  const filteredPackageNames = packageNames;

  const kindBuckets = useMemo(
    () => [
      {
        key: "generic-function",
        title: "Generic Functions",
        subtitle: "Method-oriented live dispatch surfaces.",
        symbols: packageSymbols.filter((entry) => entry.kind === "generic-function"),
        mode: "methods" as RuntimeInspectionMode
      },
      {
        key: "class",
        title: "Classes",
        subtitle: "CLOS classes and related runtime structure.",
        symbols: packageSymbols.filter((entry) => entry.kind === "class"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "macro",
        title: "Macros",
        subtitle: "Compile-time shaping forms in the selected package.",
        symbols: packageSymbols.filter((entry) => entry.kind === "macro"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "function",
        title: "Functions",
        subtitle: "Callable definitions and unresolved runtime call surfaces.",
        symbols: packageSymbols.filter((entry) => entry.kind === "function" || entry.kind === "unknown"),
        mode: "definitions" as RuntimeInspectionMode
      },
      {
        key: "variable",
        title: "Variables",
        subtitle: "Special variables, runtime bindings, and inspectable symbol values.",
        symbols: packageSymbols.filter((entry) => entry.kind === "variable"),
        mode: "describe" as RuntimeInspectionMode
      }
    ],
    [packageSymbols]
  );
  const classBucket = kindBuckets.find((bucket) => bucket.key === "class") ?? null;
  const genericFunctionBucket = kindBuckets.find((bucket) => bucket.key === "generic-function") ?? null;
  const activeSymbolBucket =
    kindBuckets.find((bucket) => bucket.key === symbolWorkspaceMode) ?? kindBuckets[kindBuckets.length - 1];
  const sourceEntries = [
    ...(runtimeEntityDetail?.data.relatedItems ?? []),
    ...(runtimeInspection?.data.items ?? [])
  ].filter((item, index, items) => Boolean(item.path) && items.findIndex((entry) => entry.path === item.path && entry.line === item.line) === index);
  const selectedSystem =
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystemName)?.name ??
    runtimeSummary?.loadedSystemEntries[0]?.name ??
    runtimeSummary?.loadedSystems[0] ??
    null;
  const selectedSystemEntry =
    runtimeSummary?.loadedSystemEntries.find((system) => system.name === selectedSystem) ?? null;
  const selectedScope =
    runtimeSummary?.scopes.find((scope) => scope.scopeId === selectedScopeId) ?? runtimeSummary?.scopes[0] ?? null;
  const selectedSourceEntry =
    sourceEntries.find((item) => `${item.path}:${item.line ?? 0}` === selectedSourceEntryKey) ?? sourceEntries[0] ?? null;
  const xrefEntries =
    xrefMode === "incoming"
      ? runtimeInspection?.data.mode === "callers"
        ? runtimeInspection.data.items
        : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label === "Caller")
      : (runtimeEntityDetail?.data.relatedItems ?? []).filter((item) => item.label !== "Caller");
  const governanceEntries: Array<{
    id: string;
    label: string;
    detail: string;
    badge: string;
    correctiveContext?: WorkItemSummaryDto["correctiveContext"];
  }> = [
    ...approvalRequests.map((request) => ({
      id: request.requestId,
      label: request.title,
      detail: request.summary,
      badge: request.state
    })),
    ...incidents.map((incident) => ({
      id: incident.incidentId,
      label: incident.title,
      detail: `Severity ${incident.severity}`,
      badge: incident.state
    })),
    ...workItems.map((item) => ({
      id: item.workItemId,
      label: item.title,
      detail:
        item.correctiveContext?.proposedActions[0]?.reason ??
        item.waitingReason ??
        "Governed work remains attached to this environment.",
      badge: item.state,
      correctiveContext: item.correctiveContext ?? null
    }))
  ];
  const linkedConversationEntries = threads.map((thread) => ({
    id: thread.threadId,
    label: thread.title,
    detail: thread.summary,
    badge: thread.state,
    flags: thread.attentionFlags,
    latestTurnState: thread.latestTurnState,
    latestActivityAt: thread.latestActivityAt
  }));
  const linkedConversationSearchTokens = [focusedSymbol, focusedPackage, selectedPackageName, sourcePreview?.data.path]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const prioritizedLinkedConversationEntries = linkedConversationEntries
    .map((entry) => {
      const haystack = `${entry.label} ${entry.detail} ${entry.flags.join(" ")}`.toLowerCase();
      const matchScore = linkedConversationSearchTokens.reduce(
        (score, token) => (haystack.includes(token) ? score + 1 : score),
        0
      );
      return { ...entry, matchScore };
    })
    .sort((left, right) => right.matchScore - left.matchScore || left.label.localeCompare(right.label));
  const selectedLinkedConversation =
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedLinkedConversationId) ??
    prioritizedLinkedConversationEntries.find((entry) => entry.id === selectedThreadId) ??
    prioritizedLinkedConversationEntries[0] ??
    null;
  const documentationEntries = [
    {
      key: "focus",
      label: "Current Focus",
      category: "entity",
      summary: runtimeInspection?.data.summary ?? runtimeEntityDetail?.data.summary ?? "No focused entity summary is available yet.",
      detail:
        runtimeEntityDetail?.data.signature ??
        runtimeInspection?.data.runtimePresence ??
        "Select a live entity to project its environment-linked explanation."
    },
    {
      key: "package",
      label: "Package Context",
      category: "package",
      summary:
        packageBrowser?.data.summary ??
        `Package ${focusedPackage ?? runtimeSummary?.currentPackage ?? "CL-USER"} remains the active semantic namespace.`,
      detail:
        packageBrowser?.data.useList.length
          ? `Uses ${packageBrowser.data.useList.join(", ")}`
          : "No package dependency summary is loaded for the current focus."
    },
    {
      key: "source",
      label: "Source Relationship",
      category: "source",
      summary:
        sourcePreview?.data.summary ??
        runtimeSummary?.sourceRelationship ??
        "The browser will project source relationship once a source-backed entity is selected.",
      detail:
        sourcePreview?.data.path
          ? `${sourcePreview.data.path}${sourcePreview.data.focusLine ? ` line ${sourcePreview.data.focusLine}` : ""}`
          : "No source file is currently open in the browser."
    },
    {
      key: "runtime",
      label: "Runtime Posture",
      category: "runtime",
      summary:
        runtimeInspection?.data.divergence ??
        runtimeSummary?.divergencePosture ??
        "Runtime and source posture will be summarized once inspection data is loaded.",
      detail:
        runtimeInspection?.data.items[0]?.detail ??
        runtimeEntityDetail?.data.facets[0]?.value ??
        "No runtime facet has been surfaced yet."
    },
    {
      key: "conversation",
      label: "Conversation Attachment",
      category: "conversation",
      summary:
        selectedThread?.summary ??
        selectedLinkedConversation?.detail ??
        "No conversation is currently attached to the browser focus.",
      detail:
        selectedThread
          ? `${selectedThread.turns.length} turns, ${selectedThread.linkedEntities.length} linked entities`
          : selectedLinkedConversation
            ? `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`
            : "Select a linked thread to establish conversational continuity."
    }
  ];
  const selectedDocumentation =
    documentationEntries.find((entry) => entry.key === selectedDocumentationKey) ?? documentationEntries[0];
  const effectiveEntityKind =
    runtimeEntityDetail?.data.entityKind ??
    focusedPackageSymbol?.kind ??
    (classBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "class" : null) ??
    (genericFunctionBucket?.symbols.some((entry) => entry.symbol === focusedSymbol) ? "generic-function" : null) ??
    (runtimeInspection?.data.mode === "methods" ? "generic-function" : null) ??
    (runtimeInspection?.data.symbol ? "unknown" : focusedPackage ? "package" : null);
  const listenerHandoffForm = buildListenerForm({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    mode: runtimeInspection?.data.mode ?? runtimeInspectionMode,
    sourcePath: sourcePreview?.data.path,
    line: sourcePreview?.data.focusLine ?? null
  });
  const sourceOperationForms = buildSourceOperationForms({
    symbol: focusedSymbol,
    packageName: focusedPackage,
    path: sourcePreview?.data.path ?? selectedSourceEntry?.path ?? sourceBackedDetailItem?.path ?? null,
    line: sourcePreview?.data.focusLine ?? selectedSourceEntry?.line ?? sourceBackedDetailItem?.line ?? null
  });
  const activeListenerForm =
    listenerActionMode === "inspect"
      ? sourceOperationForms.inspect
      : listenerActionMode === "reload"
        ? sourceOperationForms.reload
        : listenerActionMode === "evaluate"
          ? sourceOperationForms.evaluate
          : listenerActionMode === "custom"
            ? (customListenerForm ?? listenerHandoffForm)
          : listenerHandoffForm;
  const conversationHandoffPrompt = buildConversationPrompt({
    focusKind: environmentFocus.kind,
    symbol: environmentFocus.runtimeSymbol,
    packageName: environmentFocus.runtimePackage,
    mode: environmentFocus.runtimeInspectionMode,
    sourcePath: environmentFocus.sourcePath,
    line: environmentFocus.sourceLine,
    approvalId: environmentFocus.approvalId,
    workItemId: environmentFocus.workItemId,
    incidentId: environmentFocus.incidentId,
    artifactId: environmentFocus.artifactId,
    eventCursor: environmentFocus.eventCursor,
    threadTitle: selectedThread?.title ?? selectedLinkedConversation?.label,
    threadState: selectedThread?.state ?? selectedLinkedConversation?.badge,
    latestTurnState: selectedThread?.turns[0]?.state ?? selectedLinkedConversation?.latestTurnState
  });
  const entityQuickForms = buildEntityQuickForms({
    symbol: runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null,
    packageName: focusedPackage ?? null,
    entityKind: effectiveEntityKind
  });
  const domainDescriptor =
    browserDomains.find((domain) => domain.id === selectedDomain) ?? browserDomains[0];
  const packageRows = filteredPackageNames.map((packageName) => ({
    key: packageName,
    packageName,
    nicknameSummary: packageName === runtimeSummary?.currentPackage ? "current" : "package",
    usesSummary:
      packageName === packageBrowser?.data.packageName
        ? `${packageBrowser?.data.useList.length ?? 0} links`
        : "browse"
  }));
  const packageSymbolRows = (
    (packageWorkspaceMode === "exports" ? packageBrowser?.data.externalSymbols : packageBrowser?.data.internalSymbols) ?? []
  ).map((entry) => ({
    key: `${packageWorkspaceMode}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: packageWorkspaceMode === "exports" ? "external" : "internal"
  }));
  const activeSymbolRows = activeSymbolBucket.symbols.map((entry) => ({
    key: `${activeSymbolBucket.key}:${entry.visibility}:${entry.symbol}`,
    symbol: entry.symbol,
    kind: entry.kind,
    visibility: entry.visibility,
    inspectionMode:
      entry.kind === "generic-function"
        ? ("methods" as RuntimeInspectionMode)
        : entry.kind === "variable" || entry.kind === "unknown"
          ? ("describe" as RuntimeInspectionMode)
          : activeSymbolBucket.mode
  }));
  const classMethodRows =
    (classMethodMode === "classes" ? classBucket?.symbols : genericFunctionBucket?.symbols)?.map((entry) => ({
      key: `${classMethodMode}:${entry.symbol}`,
      symbol: entry.symbol,
      kind: entry.kind,
      action: classMethodMode === "classes" ? "browse class" : "browse methods"
    })) ?? [];
  const systemRows = runtimeSummary?.loadedSystemEntries.map((system) => ({
    key: system.name,
    name: system.name,
    type: system.type === "asdf-system" ? "ASDF System" : "Unknown",
    status: system.status,
    browse: "definition"
  })) ?? [];
  const runtimeScopeRows = runtimeSummary?.scopes.map((scope) => ({
    key: scope.scopeId,
    scopeId: scope.scopeId,
    scopeLabel: scope.symbolName ?? scope.packageName,
    kind: scope.kind,
    summary: scope.summary,
    symbolName: scope.symbolName,
    packageName: scope.packageName
  })) ?? [];
  const telemetryProcessRows =
    runtimeTelemetry?.processes.map((process) => ({
      key: process.processId,
      processId: process.processId,
      label: process.label,
      kind: process.kind,
      state: process.state,
      cpu: process.cpuPercent != null ? `${process.cpuPercent.toFixed(1)}%` : "n/a",
      memory: process.memoryMb != null ? `${process.memoryMb.toFixed(1)} MB` : "n/a",
      summary: process.summary
    })) ?? [];
  const selectedTelemetryProcess =
    runtimeTelemetry?.processes.find((process) => process.processId === selectedTelemetryProcessId) ??
    runtimeTelemetry?.processes[0] ??
    null;
  const consoleEntries = consoleLogStream?.data.entries ?? [];
  const filteredConsoleEntries = consoleEntries.filter(
    (entry) => selectedConsoleSourceFilter === "All Sources" || entry.source === selectedConsoleSourceFilter
  );
  const consoleRows =
    filteredConsoleEntries.map((entry) => ({
      key: entry.entryId,
      entryId: entry.entryId,
      timestamp: entry.timestamp,
      type: entry.type,
      source: entry.source,
      message: entry.message,
      processName: entry.processName ?? "n/a",
      activityId: entry.activityId ?? "n/a",
      threadRef: entry.threadRefId ?? entry.turnRefId ?? "n/a"
    })) ?? [];
  const consoleAlertCount = consoleEntries.filter(
    (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
  ).length;
  const visibleConsoleAlertCount = filteredConsoleEntries.filter(
    (entry) => entry.type === "warning" || entry.type === "error" || entry.type === "fault"
  ).length;
  const consoleProcessCount = new Set(consoleEntries.map((entry) => entry.processName).filter(Boolean)).size;
  const visibleConsoleProcessCount = new Set(filteredConsoleEntries.map((entry) => entry.processName).filter(Boolean)).size;
  const consoleTopSource =
    Object.entries(
      consoleEntries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.source] = (counts[entry.source] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a";
  const visibleConsoleTopSource =
    Object.entries(
      filteredConsoleEntries.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.source] = (counts[entry.source] ?? 0) + 1;
        return counts;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "n/a";
  const selectedConsoleEntry =
    filteredConsoleEntries.find((entry) => entry.entryId === selectedConsoleEntryId) ??
    filteredConsoleEntries[0] ??
    null;
  const filteredDiagnosticReports = diagnosticReports.filter(
    (report) => selectedDiagnosticSourceFilter === "All Sources" || report.source === selectedDiagnosticSourceFilter
  );
  const diagnosticRows = filteredDiagnosticReports.map((report) => ({
    key: report.reportId,
    reportId: report.reportId,
    title: report.title,
    kind: report.kind,
    source: report.source,
    createdAt: report.createdAt,
    processName: report.processName ?? "n/a",
    pid: report.pid != null ? String(report.pid) : "n/a",
    summary: report.summary,
    incidentId: String(
      (selectedDiagnosticReport?.reportId === report.reportId
        ? selectedDiagnosticReport.metadata?.incidentId
        : null) ?? "n/a"
    ),
    bugType: String(
      (selectedDiagnosticReport?.reportId === report.reportId
        ? selectedDiagnosticReport.metadata?.bugType
        : null) ?? "n/a"
    )
  }));
  const diagnosticCrashCount = diagnosticReports.filter((report) => report.kind === "crash").length;
  const diagnosticSpinCount = diagnosticReports.filter((report) => report.kind === "spin").length;
  const visibleDiagnosticCrashCount = filteredDiagnosticReports.filter((report) => report.kind === "crash").length;
  const visibleDiagnosticSpinCount = filteredDiagnosticReports.filter((report) => report.kind === "spin").length;
  const diagnosticProcessCount = new Set(diagnosticReports.map((report) => report.processName).filter(Boolean)).size;
  const visibleDiagnosticProcessCount = new Set(
    filteredDiagnosticReports.map((report) => report.processName).filter(Boolean)
  ).size;
  const latestDiagnosticTimestamp = diagnosticReports[0]?.createdAt ?? null;
  const latestVisibleDiagnosticTimestamp = filteredDiagnosticReports[0]?.createdAt ?? null;
  const selectedDiagnosticReportSummary =
    filteredDiagnosticReports.find((report) => report.reportId === selectedDiagnosticReportId) ??
    filteredDiagnosticReports[0] ??
    null;
  const activeSelectedDiagnosticReport =
    selectedDiagnosticReportSummary?.reportId === selectedDiagnosticReport?.reportId ? selectedDiagnosticReport : null;
  const sourceRows = sourceEntries.map((item) => ({
    key: `${item.path}:${item.line ?? 0}`,
    label: item.label,
    location: item.path?.split("/").slice(-2).join("/") ?? "no-path",
    role: item.emphasis ?? "source",
    path: item.path,
    line: item.line
  }));
  const xrefRows = (xrefEntries ?? []).map((item) => ({
    key: `${xrefMode}:${item.label}:${item.detail}:${item.line ?? 0}`,
    label: item.label,
    emphasis: item.emphasis ?? "reference",
    detail: item.detail,
    path: item.path,
    line: item.line
  }));
  const governanceRows: Array<{
    key: string;
    objectId: string;
    objectType: string;
    label: string;
    detail: string;
    badge: string;
    trace: string;
    correctiveContext?: WorkItemSummaryDto["correctiveContext"];
    tone: "active" | "warning" | "danger" | "steady";
  }> = governanceEntries.map((entry) => ({
    key: `${entry.badge}:${entry.id}`,
    objectId: entry.id,
    objectType: approvalRequests.some((request) => request.requestId === entry.id)
      ? "Approval"
      : incidents.some((incident) => incident.incidentId === entry.id)
        ? "Incident"
        : entry.correctiveContext
          ? "Corrective Work Item"
          : "Work Item",
    label: entry.label,
    detail: entry.detail,
    badge: entry.badge,
    trace: approvalRequests.some((request) => request.requestId === entry.id)
      ? "Execution > Approvals"
      : incidents.some((incident) => incident.incidentId === entry.id)
        ? "Recovery > Incidents"
        : entry.correctiveContext
          ? "Execution > Work > Corrective Direction"
          : "Execution > Work",
    tone:
      entry.badge === "blocked" || entry.badge === "denied"
        ? "danger"
        : entry.badge === "waiting" || entry.badge === "recovering" || entry.badge === "awaiting"
          ? "warning"
          : "active",
    correctiveContext: entry.correctiveContext ?? null
  }));
  const linkedConversationRows: Array<{
    key: string;
    id: string;
    label: string;
    state: string;
    attention: string;
    stateTone: "active" | "warning" | "danger" | "steady";
    attentionTone: "active" | "warning" | "danger" | "steady";
    detail: string;
  }> = prioritizedLinkedConversationEntries.map((entry) => ({
    key: entry.id,
    id: entry.id,
    label: entry.label,
    state: entry.badge,
    attention: entry.flags[0] ?? entry.latestTurnState,
    stateTone: toneForThreadState(entry.badge as ThreadSummaryDto["state"]),
    attentionTone:
      entry.latestTurnState === "failed"
        ? "danger"
        : entry.latestTurnState === "awaiting_approval" || entry.latestTurnState === "interrupted"
          ? "warning"
          : "active",
    detail: entry.detail
  }));
  const selectedGovernanceEntry =
    governanceRows.find((row) => row.key === selectedGovernanceKey) ??
    governanceRows[0] ??
    null;
  const selectedGovernanceWorkSummary =
    selectedGovernanceEntry &&
    (selectedGovernanceEntry.objectType === "Work Item" || selectedGovernanceEntry.objectType === "Corrective Work Item")
      ? workItems.find((item) => item.workItemId === selectedGovernanceEntry.objectId) ?? null
      : null;
  const selectedGovernanceFallbackApproval =
    selectedGovernanceWorkSummary && selectedGovernanceWorkSummary.approvalCount > 0
      ? approvalRequests.find((request) => request.state === "awaiting") ?? null
      : null;
  const selectedGovernanceApprovalId =
    selectedGovernanceEntry?.objectType === "Approval"
      ? selectedGovernanceEntry.objectId
      : selectedGovernanceFallbackApproval?.requestId ?? null;
  const selectedGovernanceApprovalSummary = selectedGovernanceApprovalId
    ? approvalRequests.find((request) => request.requestId === selectedGovernanceApprovalId) ?? null
    : null;
  const selectedGovernanceIdentityRows = selectedGovernanceEntry
    ? [
        ["Object Id", selectedGovernanceEntry.objectId],
        ["Authority", selectedGovernanceEntry.objectType],
        ["Trace", selectedGovernanceEntry.trace]
      ]
    : [];
  const selectedGovernanceCorrectiveRows = selectedGovernanceEntry?.correctiveContext
    ? [
        ["Corrective Kind", selectedGovernanceEntry.correctiveContext.kind],
        ["Decision", selectedGovernanceEntry.correctiveContext.decision ?? "unknown"],
        ["Approval Posture", selectedGovernanceEntry.correctiveContext.approvalPosture ?? "unknown"],
        [
          "Alignment",
          selectedGovernanceEntry.correctiveContext.alignmentStatus
            ? `${selectedGovernanceEntry.correctiveContext.alignmentStatus}${
                selectedGovernanceEntry.correctiveContext.alignmentScore != null
                  ? ` (${selectedGovernanceEntry.correctiveContext.alignmentScore.toFixed(2)})`
                  : ""
              }`
            : "unknown"
        ]
      ]
    : [];
  const selectedLinkedConversationIdentityRows = selectedLinkedConversation
    ? [
        ["Object Id", selectedLinkedConversation.id],
        ["Authority", selectedLinkedConversation.badge],
        ["Trace", `${selectedLinkedConversation.latestTurnState} · ${selectedLinkedConversation.latestActivityAt}`]
      ]
    : [];
  const selectedSystemIdentityRows = selectedSystemEntry
    ? [
        ["Object Id", selectedSystemEntry.name],
        ["Authority", selectedSystemEntry.type === "asdf-system" ? "ASDF System" : "System"],
        ["Trace", selectedSystemEntry.status]
      ]
    : [];
  const documentationRows = documentationPages.map((page) => ({
    key: page.slug,
    slug: page.slug,
    label: page.title,
    category: page.category,
    summary: page.summary
  }));
  const browserFocusIdentityRows = [
    [
      "Object Id",
      focusedSymbol
        ? focusedPackage
          ? `${focusedPackage}::${focusedSymbol}`
          : focusedSymbol
        : focusedPackage ?? domainDescriptor.label
    ],
    ["Authority", effectiveEntityKind ?? domainDescriptor.label],
    [
      "Trace",
      sourcePreview?.data.path
        ? `${sourcePreview.data.path}${sourcePreview.data.focusLine ? `:${sourcePreview.data.focusLine}` : ""}`
        : runtimeInspection?.data.mode ?? "browse"
    ]
  ];
  const showGenericBrowserFocus = false;

  function buildFilterOptions(values: string[]): BrowserTableFilterOption[] {
    return Array.from(new Set(values.filter(Boolean))).map((value) => ({
      label: value,
      value
    }));
  }

  useEffect(() => {
    if (runtimeForm !== activeListenerForm) {
      setRuntimeForm(activeListenerForm);
    }
  }, [activeListenerForm, runtimeForm, setRuntimeForm]);

  useEffect(() => {
    if (selectedDomain !== "symbols" || !runtimeInspection?.data.symbol) {
      return;
    }

    if (runtimeInspection.data.mode === "methods" && symbolWorkspaceMode !== "generic-function") {
      setSymbolWorkspaceMode("generic-function");
      return;
    }

    if (runtimeEntityDetail?.data.entityKind === "class" && symbolWorkspaceMode !== "class") {
      setSymbolWorkspaceMode("class");
    }
  }, [
    runtimeEntityDetail?.data.entityKind,
    runtimeInspection?.data.mode,
    runtimeInspection?.data.symbol,
    selectedDomain,
    symbolWorkspaceMode
  ]);

  useEffect(() => {
    if (
      conversationDraft === previousConversationHandoffPromptRef.current &&
      conversationDraft !== conversationHandoffPrompt
    ) {
      setConversationDraft(conversationHandoffPrompt);
    }
    previousConversationHandoffPromptRef.current = conversationHandoffPrompt;
  }, [conversationDraft, conversationHandoffPrompt, setConversationDraft]);

  useEffect(() => {
    setListenerActionMode("default");
    setCustomListenerForm(null);
  }, [focusedSymbol, focusedPackage, sourcePreview?.data.path, sourcePreview?.data.focusLine]);

  return (
    <div className="browser-journey">
      <div className="browser-layout">
        <div className="browser-main-stack browser-main-stack-full">
          <section className="panel browser-detail-panel browser-domain-pane browser-inspector-panel">
            <div className="browser-domain-header">
              <div>
                <p className="eyebrow">Browser</p>
                <h3>{domainDescriptor.label}</h3>
              </div>
            </div>
            {showGenericBrowserFocus ? (
              <>
                <div className="browser-focus-card">
                  <div>
                    <p className="context-label">Focused Entity</p>
                    <strong>{focusedSymbol ?? focusedPackage ?? domainDescriptor.label}</strong>
                    <p>
                      {runtimeInspection?.data.summary ??
                        runtimeEntityDetail?.data.summary ??
                        sourcePreview?.data.summary ??
                        domainDescriptor.summary}
                    </p>
                  </div>
                  <Badge tone="steady">{effectiveEntityKind ?? "browser focus"}</Badge>
                </div>
                <dl className="detail-list">
                  {browserFocusIdentityRows.map(([label, value]) => (
                    <DetailRow key={`browser-focus:${label}`} label={label} value={value} />
                  ))}
                </dl>
              </>
            ) : null}
            {selectedDomain === "packages" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <BrowserModePicker
                    label="Package View"
                    onChange={(value) => setPackageWorkspaceMode(value as typeof packageWorkspaceMode)}
                    options={[
                      { value: "packages", label: "Packages" },
                      { value: "exports", label: "Exports" },
                      { value: "internals", label: "Internals" }
                    ]}
                    value={packageWorkspaceMode}
                  />
                </div>
                {packageWorkspaceMode === "packages" ? (
                  <BrowserDataTable
                    key="packages-packages"
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "package",
                        label: "Package",
                        render: (row) => <strong>{row.packageName}</strong>,
                        sortValue: (row) => row.packageName
                      },
                      {
                        id: "status",
                        label: "Status",
                        render: (row) => row.nicknameSummary,
                        sortValue: (row) => row.nicknameSummary
                      },
                      {
                        id: "uses",
                        label: "Uses",
                        render: (row) => row.usesSummary,
                        sortValue: (row) => row.usesSummary
                      }
                    ]}
                    emptyMessage="No matching packages are available."
                    filterLabel="Package Filter"
                    filterOptions={buildFilterOptions(packageRows.map((row) => row.nicknameSummary))}
                    getFilterValue={(row) => row.nicknameSummary}
                    getRowKey={(row) => row.key}
                    onSelect={(row) => {
                      setSelectedPackageName(row.packageName);
                      void browseRuntimeEntity(row.packageName, row.packageName, "definitions");
                    }}
                    rows={packageRows}
                    searchPlaceholder="Search packages"
                    selectedKey={packageBrowser?.data.packageName ?? selectedPackageName}
                  />
                ) : (
                  <BrowserDataTable
                    key={`packages-${packageWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols are available in this package lane."
                    filterLabel="Visibility"
                    filterOptions={buildFilterOptions(packageSymbolRows.map((row) => row.kind))}
                    getFilterValue={(row) => row.kind}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(
                        row.symbol,
                        packageBrowser?.data.packageName,
                        row.kind === "generic-function" ? "methods" : "definitions"
                      )
                    }
                    rows={packageSymbolRows}
                    searchPlaceholder={`Search ${packageWorkspaceMode} symbols`}
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                )}
              </div>
            ) : selectedDomain === "symbols" ? (
              <div className="browser-domain-stack">
                <div className="browser-domain-toolbar">
                  <BrowserModePicker
                    label="Symbol Lane"
                    onChange={(value) => setSymbolWorkspaceMode(value as typeof symbolWorkspaceMode)}
                    options={kindBuckets.map((bucket) => ({
                      value: bucket.key,
                      label: bucket.title
                    }))}
                    value={symbolWorkspaceMode}
                  />
                </div>
                <section className="browser-symbol-panel">
                  <div className="browser-symbol-header">
                    <strong>{activeSymbolBucket.title}</strong>
                    <span>{activeSymbolBucket.subtitle}</span>
                  </div>
                  <BrowserDataTable
                    key={`symbols-${symbolWorkspaceMode}`}
                    columnTemplate="minmax(0, 1.3fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                    columns={[
                      {
                        id: "symbol",
                        label: "Symbol",
                        render: (row) => <strong>{row.symbol}</strong>,
                        sortValue: (row) => row.symbol
                      },
                      {
                        id: "kind",
                        label: "Kind",
                        render: (row) => row.kind,
                        sortValue: (row) => row.kind
                      },
                      {
                        id: "visibility",
                        label: "Visibility",
                        render: (row) => row.visibility,
                        sortValue: (row) => row.visibility
                      }
                    ]}
                    emptyMessage="No matching symbols in this lane."
                    filterLabel="Visibility"
                    filterOptions={buildFilterOptions(activeSymbolRows.map((row) => row.visibility))}
                    getFilterValue={(row) => row.visibility}
                    getRowKey={(row) => row.key}
                    onSelect={(row) =>
                      void browseRuntimeEntity(row.symbol, packageBrowser?.data.packageName, row.inspectionMode)
                    }
                    rows={activeSymbolRows}
                    searchPlaceholder="Search symbols"
                    selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                  />
                  {activeSymbolRows.length === 0 && runtimeInspection?.data.symbol ? (
                    <div className="browser-package-card">
                      <strong>{runtimeInspection.data.symbol}</strong>
                      <p>
                        The live runtime focus is available even though the current package browser lane is sparse. Continue
                        from this inspected symbol while the broader package view catches up.
                      </p>
                      <div className="ref-list">
                        <span className="thread-flag">{runtimeInspection.data.packageName ?? selectedPackageName ?? "runtime"}</span>
                        <span className="thread-flag">{runtimeInspection.data.mode}</span>
                      </div>
                    </div>
                  ) : null}
                </section>
                <section className="browser-secondary-card">
                  <div className="browser-secondary-card-header">
                    <div>
                      <p className="eyebrow">Manual Inspect</p>
                      <h4>Direct Runtime Query</h4>
                    </div>
                    <button
                      className="starter-chip"
                      onClick={() => setSymbolInspectorExpanded((current) => !current)}
                      type="button"
                    >
                      {symbolInspectorExpanded ? "Hide" : "Show"}
                    </button>
                  </div>
                  {symbolInspectorExpanded ? (
                    <div className="runtime-inspector-controls browser-manual-inspector-controls">
                      <input
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectorSymbol(event.target.value)}
                        placeholder="Symbol or package"
                        value={runtimeInspectorSymbol}
                      />
                      <input
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectorPackage(event.target.value)}
                        placeholder={runtimeSummary?.currentPackage ?? "Package"}
                        value={runtimeInspectorPackage}
                      />
                      <select
                        className="filter-input"
                        onChange={(event) => setRuntimeInspectionMode(event.target.value as RuntimeInspectionMode)}
                        value={runtimeInspectionMode}
                      >
                        <option value="describe">Describe</option>
                        <option value="definitions">Definitions</option>
                        <option value="callers">Callers</option>
                        <option value="methods">Methods</option>
                        <option value="divergence">Drift</option>
                      </select>
                      <button
                        className="action-button"
                        disabled={isInspectingRuntime || runtimeInspectorSymbol.trim().length === 0}
                        onClick={() => void inspectRuntimeSymbol()}
                        type="button"
                      >
                        {isInspectingRuntime ? "Inspecting..." : "Browse Entity"}
                      </button>
                    </div>
                  ) : (
                    <p className="inspector-copy">Ad hoc symbol, package, and XREF queries stay available here when needed.</p>
                  )}
                </section>
              </div>
            ) : selectedDomain === "classes-methods" ? (
              <div className="browser-domain-stack">
                <BrowserModePicker
                  label="Entity Set"
                  onChange={(value) => setClassMethodMode(value as typeof classMethodMode)}
                  options={[
                    { value: "classes", label: "Classes" },
                    { value: "generic-functions", label: "Generic Functions" }
                  ]}
                  value={classMethodMode}
                />
                <BrowserDataTable
                  key={`classes-methods-${classMethodMode}`}
                  columnTemplate="minmax(0, 1.25fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "entity",
                      label: classMethodMode === "classes" ? "Class" : "Generic Function",
                      render: (row) => <strong>{row.symbol}</strong>,
                      sortValue: (row) => row.symbol
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "action",
                      label: "Action",
                      render: (row) => row.action,
                      sortValue: (row) => row.action
                    }
                  ]}
                  emptyMessage="No matching entities in this domain."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(classMethodRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) =>
                    void browseRuntimeEntity(
                      row.symbol,
                      packageBrowser?.data.packageName,
                      classMethodMode === "classes" ? "definitions" : "methods"
                    )
                  }
                  rows={classMethodRows}
                  searchPlaceholder={`Search ${classMethodMode === "classes" ? "classes" : "generic functions"}`}
                  selectedKey={runtimeInspection?.data.symbol ?? runtimeEntityDetail?.data.symbol ?? null}
                />
              </div>
            ) : selectedDomain === "systems" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="systems"
                  columnTemplate="minmax(0, 1.25fr) minmax(0, 0.95fr) minmax(0, 0.75fr) minmax(0, 0.8fr)"
                  columns={[
                    {
                      id: "system",
                      label: "System",
                      render: (row) => <strong>{row.name}</strong>,
                      sortValue: (row) => row.name
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.type,
                      sortValue: (row) => row.type
                    },
                    {
                      id: "status",
                      label: "Status",
                      render: (row) => row.status,
                      sortValue: (row) => row.status
                    },
                    {
                      id: "browse",
                      label: "Browse",
                      render: (row) => row.browse,
                      sortValue: (row) => row.browse
                    }
                  ]}
                  emptyMessage="No loaded systems are available."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(systemRows.map((row) => row.type))}
                  getFilterValue={(row) => row.type}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSystemName(row.name);
                    void browseRuntimeEntity(row.name.toUpperCase(), runtimeSummary?.currentPackage, "definitions");
                  }}
                  rows={systemRows}
                  searchPlaceholder="Search loaded systems"
                  selectedKey={selectedSystem}
                />
                {selectedSystemEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected System</p>
                        <strong>{selectedSystemEntry.name}</strong>
                        <p>{selectedSystemEntry.status}</p>
                      </div>
                      <Badge tone="steady">{selectedSystemEntry.type === "asdf-system" ? "ASDF System" : "System"}</Badge>
                    </div>
                    <dl className="detail-list">
                      {selectedSystemIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-system:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    <div className="browser-action-strip">
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "runtime-objects" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="runtime-objects"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "scope",
                      label: "Scope",
                      render: (row) => <strong>{row.scopeLabel}</strong>,
                      sortValue: (row) => row.scopeLabel
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.scopeLabel} ${row.kind} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No runtime scopes are available."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(runtimeScopeRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedScopeId(row.scopeId);
                    void browseRuntimeEntity(
                      row.symbolName ?? row.packageName,
                      row.packageName,
                      row.symbolName ? "describe" : "definitions"
                    );
                  }}
                  rows={runtimeScopeRows}
                  searchPlaceholder="Search runtime scopes"
                  selectedKey={selectedScope?.scopeId ?? null}
                />
              </div>
            ) : selectedDomain === "console" ? (
              <div className="browser-domain-stack">
                <BrowserModePicker
                  label="Console Plane"
                  onChange={(value) => {
                    setSelectedConsolePlane(value as "environment" | "host");
                    setSelectedConsoleSourceFilter("All Sources");
                    setSelectedConsoleEntryId(null);
                  }}
                  options={[
                    { value: "environment", label: "Environment" },
                    { value: "host", label: "Host" }
                  ]}
                  value={selectedConsolePlane}
                />
                <FilterSelect
                  label="Source"
                  onChange={(value) => {
                    setSelectedConsoleSourceFilter(value);
                    setSelectedConsoleEntryId(null);
                  }}
                  options={["All Sources", ...buildFilterOptions(consoleEntries.map((row) => row.source)).map((option) => option.value)]}
                  value={selectedConsoleSourceFilter}
                />
                <div className="metric-grid">
                  <MetricTile label="Visible" value={filteredConsoleEntries.length} />
                  <MetricTile label="Alerts" value={visibleConsoleAlertCount} />
                  <MetricTile label="Processes" value={visibleConsoleProcessCount} />
                  <MetricTile label="Top Source" value={visibleConsoleTopSource} />
                </div>
                <BrowserDataTable
                  key={`console:${selectedConsolePlane}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.7fr) minmax(0, 1.6fr)"
                  columns={[
                    {
                      id: "source",
                      label: "Source",
                      render: (row) => <strong>{row.source}</strong>,
                      sortValue: (row) => row.source,
                      searchValue: (row) =>
                        `${row.source} ${row.message} ${row.processName} ${row.activityId} ${row.threadRef}`
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.type,
                      sortValue: (row) => row.type
                    },
                    {
                      id: "message",
                      label: "Message",
                      render: (row) => row.message,
                      sortValue: (row) => row.message,
                      searchValue: (row) =>
                        `${row.message} ${row.timestamp} ${row.processName} ${row.activityId} ${row.threadRef}`
                    }
                  ]}
                  emptyMessage="No console entries are currently available."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(consoleRows.map((row) => row.type))}
                  getFilterValue={(row) => row.type}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedConsoleEntryId(row.entryId)}
                  rows={consoleRows}
                  searchPlaceholder="Search console entries"
                  selectedKey={selectedConsoleEntry?.entryId ?? null}
                />
                {selectedConsoleEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Console Entry</p>
                        <strong>{selectedConsoleEntry.source}</strong>
                        <p>{selectedConsoleEntry.message}</p>
                      </div>
                      <Badge tone={selectedConsoleEntry.type === "error" || selectedConsoleEntry.type === "fault" ? "danger" : selectedConsoleEntry.type === "warning" ? "warning" : "steady"}>
                        {selectedConsoleEntry.type}
                      </Badge>
                    </div>
	                    <dl className="detail-list">
	                      <DetailRow label="Plane" value={selectedConsoleEntry.plane} />
	                      <DetailRow label="Timestamp" value={selectedConsoleEntry.timestamp} />
	                      <DetailRow label="Process" value={selectedConsoleEntry.processName ?? "n/a"} />
	                      <DetailRow label="PID" value={selectedConsoleEntry.pid ? String(selectedConsoleEntry.pid) : "n/a"} />
	                      <DetailRow label="Category" value={selectedConsoleEntry.category} />
	                      <DetailRow label="Source" value={selectedConsoleEntry.source} />
	                      <DetailRow label="Activity" value={selectedConsoleEntry.activityId ?? "n/a"} />
	                      <DetailRow label="Thread" value={selectedConsoleEntry.threadRefId ?? selectedConsoleEntry.turnRefId ?? "n/a"} />
	                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "diagnostics" ? (
              <div className="browser-domain-stack">
                <FilterSelect
                  label="Source"
                  onChange={(value) => {
                    setSelectedDiagnosticSourceFilter(value);
                    setSelectedDiagnosticReportId(null);
                  }}
                  options={[
                    "All Sources",
                    ...buildFilterOptions(diagnosticReports.map((row) => row.source)).map((option) => option.value)
                  ]}
                  value={selectedDiagnosticSourceFilter}
                />
                <div className="metric-grid">
                  <MetricTile label="Visible" value={filteredDiagnosticReports.length} />
                  <MetricTile label="Crash" value={visibleDiagnosticCrashCount} />
                  <MetricTile label="Spin" value={visibleDiagnosticSpinCount} />
                  <MetricTile
                    label="Latest"
                    value={latestVisibleDiagnosticTimestamp ? transcriptRecencyLabel(latestVisibleDiagnosticTimestamp) : "n/a"}
                  />
                </div>
                <BrowserDataTable
                  key="diagnostics"
                  columnTemplate="minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1fr)"
                  columns={[
                    {
                      id: "title",
                      label: "Report",
                      render: (row) => <strong>{row.title}</strong>,
                      sortValue: (row) => row.title,
                      searchValue: (row) =>
                        `${row.title} ${row.processName} ${row.pid} ${row.summary} ${row.incidentId} ${row.bugType}`
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "source",
                      label: "Source",
                      render: (row) => row.source,
                      sortValue: (row) => row.source,
                      searchValue: (row) =>
                        `${row.source} ${row.createdAt} ${row.processName} ${row.pid} ${row.summary} ${row.incidentId} ${row.bugType}`
                    }
                  ]}
                  emptyMessage="No retained diagnostic reports are currently available."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(diagnosticRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedDiagnosticReportId(row.reportId)}
                  rows={diagnosticRows}
                  searchPlaceholder="Search diagnostic reports"
                  selectedKey={selectedDiagnosticReportSummary?.reportId ?? null}
                />
                {selectedDiagnosticReportSummary ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Diagnostic Report</p>
                        <strong>{selectedDiagnosticReportSummary.title}</strong>
                        <p>{selectedDiagnosticReportSummary.summary}</p>
                      </div>
                      <Badge tone="warning">{selectedDiagnosticReportSummary.kind}</Badge>
                    </div>
                    <dl className="detail-list">
                      <DetailRow label="Created" value={selectedDiagnosticReportSummary.createdAt} />
                      <DetailRow label="Kind" value={selectedDiagnosticReportSummary.kind} />
                      <DetailRow label="Source" value={selectedDiagnosticReportSummary.source} />
                      <DetailRow label="Process" value={selectedDiagnosticReportSummary.processName ?? "n/a"} />
                      <DetailRow label="Process Count" value={String(diagnosticProcessCount)} />
                      <DetailRow label="Path" value={selectedDiagnosticReportSummary.path ?? "n/a"} />
                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "processes" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="processes"
                  columnTemplate="minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 0.7fr) minmax(0, 0.7fr) minmax(0, 1.2fr)"
                  columns={[
                    {
                      id: "process",
                      label: "Process",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label,
                      searchValue: (row) => `${row.label} ${row.kind} ${row.summary}`
                    },
                    {
                      id: "kind",
                      label: "Kind",
                      render: (row) => row.kind,
                      sortValue: (row) => row.kind
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => row.state,
                      sortValue: (row) => row.state
                    },
                    {
                      id: "cpu",
                      label: "CPU",
                      render: (row) => row.cpu,
                      sortValue: (row) => row.cpu
                    },
                    {
                      id: "memory",
                      label: "Memory",
                      render: (row) => row.memory,
                      sortValue: (row) => row.memory
                    }
                  ]}
                  emptyMessage="No runtime-linked processes are currently visible."
                  filterLabel="Kind"
                  filterOptions={buildFilterOptions(telemetryProcessRows.map((row) => row.kind))}
                  getFilterValue={(row) => row.kind}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedTelemetryProcessId(row.processId)}
                  rows={telemetryProcessRows}
                  searchPlaceholder="Search runtime processes"
                  selectedKey={selectedTelemetryProcess?.processId ?? null}
                />
                {selectedTelemetryProcess ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Process</p>
                        <strong>{selectedTelemetryProcess.label}</strong>
                        <p>{selectedTelemetryProcess.summary}</p>
                      </div>
                      <Badge tone="active">{selectedTelemetryProcess.state}</Badge>
                    </div>
                    <dl className="detail-list">
                      <DetailRow label="Object Id" value={selectedTelemetryProcess.processId} />
                      <DetailRow label="PID" value={String(selectedTelemetryProcess.pid ?? "n/a")} />
                      <DetailRow label="CPU" value={selectedTelemetryProcess.cpuPercent != null ? `${selectedTelemetryProcess.cpuPercent.toFixed(1)}%` : "n/a"} />
                      <DetailRow label="Memory" value={selectedTelemetryProcess.memoryMb != null ? `${selectedTelemetryProcess.memoryMb.toFixed(1)} MB` : "n/a"} />
                      <DetailRow label="Elapsed" value={selectedTelemetryProcess.elapsed ?? "n/a"} />
                      <DetailRow label="Authority" value={selectedTelemetryProcess.kind === "compatibility-process" ? "governed compatibility process" : "governed runtime"} />
                      <DetailRow label="Trace" value={selectedTelemetryProcess.workItemId ?? selectedTelemetryProcess.threadId ?? selectedTelemetryProcess.controlToken ?? "runtime telemetry"} />
                    </dl>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "performance" ? (
              <div className="browser-domain-stack">
                <div className="metrics-grid">
                  <MetricTile label="CPU" value={runtimeTelemetry?.cpu.utilizationPercent != null ? `${runtimeTelemetry.cpu.utilizationPercent.toFixed(1)}%` : "n/a"} />
                  <MetricTile label="Load 1m" value={runtimeTelemetry?.cpu.loadAverage1m != null ? runtimeTelemetry.cpu.loadAverage1m.toFixed(2) : "n/a"} />
                  <MetricTile label="RSS" value={runtimeTelemetry?.memory.rssMb != null ? `${runtimeTelemetry.memory.rssMb.toFixed(1)} MB` : "n/a"} />
                  <MetricTile label="Heap Used" value={runtimeTelemetry?.memory.heapUsedMb != null ? `${runtimeTelemetry.memory.heapUsedMb.toFixed(1)} MB` : "n/a"} />
                </div>
                <div className="browser-focus-card">
                  <div>
                    <p className="context-label">Performance Posture</p>
                    <strong>{runtimeTelemetry?.activitySummary ?? "Runtime telemetry is not yet available."}</strong>
                    <p>{runtimeTelemetry?.cpu.summary ?? "CPU and memory posture will appear once telemetry is sampled."}</p>
                  </div>
                  <Badge tone="steady">{runtimeTelemetry?.cpu.coreCount ? `${runtimeTelemetry.cpu.coreCount} cores` : "host"}</Badge>
                </div>
                <dl className="detail-list">
                  <DetailRow label="Sampled At" value={runtimeTelemetry?.sampledAt ?? "n/a"} />
                  <DetailRow label="CPU Summary" value={runtimeTelemetry?.cpu.summary ?? "n/a"} />
                  <DetailRow label="Memory Summary" value={runtimeTelemetry?.memory.summary ?? "n/a"} />
                  <DetailRow label="System Memory" value={runtimeTelemetry?.memory.systemUsedPercent != null ? `${runtimeTelemetry.memory.systemUsedPercent.toFixed(1)}%` : "n/a"} />
                </dl>
              </div>
            ) : selectedDomain === "host-io" ? (
              <div className="browser-domain-stack">
                <div className="metrics-grid">
                  <MetricTile label="Connections" value={runtimeTelemetry?.network.openConnectionCount != null ? String(runtimeTelemetry.network.openConnectionCount) : "n/a"} />
                  <MetricTile label="Interfaces" value={runtimeTelemetry?.network.interfaceCount != null ? String(runtimeTelemetry.network.interfaceCount) : "n/a"} />
                  <MetricTile label="Disk Read" value={runtimeTelemetry?.disk.readKbps != null ? `${runtimeTelemetry.disk.readKbps.toFixed(0)} KB/s` : "n/a"} />
                  <MetricTile label="Disk Write" value={runtimeTelemetry?.disk.writeKbps != null ? `${runtimeTelemetry.disk.writeKbps.toFixed(0)} KB/s` : "n/a"} />
                </div>
                <dl className="detail-list">
                  <DetailRow label="Network Summary" value={runtimeTelemetry?.network.summary ?? "n/a"} />
                  <DetailRow label="Disk Summary" value={runtimeTelemetry?.disk.summary ?? "n/a"} />
                  <DetailRow label="Runtime PID" value={String(runtimeTelemetry?.runtimePid ?? "n/a")} />
                  <DetailRow label="Activity" value={runtimeTelemetry?.activitySummary ?? "n/a"} />
                </dl>
              </div>
            ) : selectedDomain === "source" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="source"
                  columnTemplate="minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.7fr)"
                  columns={[
                    {
                      id: "artifact",
                      label: "Artifact",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "location",
                      label: "Location",
                      render: (row) => row.location,
                      sortValue: (row) => row.location
                    },
                    {
                      id: "role",
                      label: "Role",
                      render: (row) => row.role,
                      sortValue: (row) => row.role
                    }
                  ]}
                  emptyMessage="No source-backed entities are currently in focus."
                  filterLabel="Role"
                  filterOptions={buildFilterOptions(sourceRows.map((row) => row.role))}
                  getFilterValue={(row) => row.role}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedSourceEntryKey(row.key);
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={sourceRows}
                  searchPlaceholder="Search source artifacts"
                  selectedKey={selectedSourceEntry ? `${selectedSourceEntry.path}:${selectedSourceEntry.line ?? 0}` : null}
                />
              </div>
            ) : selectedDomain === "xref" ? (
              <div className="browser-domain-stack">
                <BrowserModePicker
                  label="Reference Direction"
                  onChange={(value) => setXrefMode(value as typeof xrefMode)}
                  options={[
                    { value: "incoming", label: "Incoming" },
                    { value: "outgoing", label: "Outgoing" }
                  ]}
                  value={xrefMode}
                />
                <BrowserDataTable
                  key={`xref-${xrefMode}`}
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                  columns={[
                    {
                      id: "label",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "type",
                      label: "Type",
                      render: (row) => row.emphasis,
                      sortValue: (row) => row.emphasis
                    },
                    {
                      id: "detail",
                      label: "Detail",
                      render: (row) => row.detail,
                      sortValue: (row) => row.detail
                    }
                  ]}
                  emptyMessage="No XREF items are available for the current focus."
                  filterLabel="Type"
                  filterOptions={buildFilterOptions(xrefRows.map((row) => row.emphasis))}
                  getFilterValue={(row) => row.emphasis}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    if (row.path) {
                      void loadSourcePreview(row.path, row.line ?? undefined);
                    }
                  }}
                  rows={xrefRows}
                  searchPlaceholder={`Search ${xrefMode} references`}
                  selectedKey={null}
                />
              </div>
            ) : selectedDomain === "governance" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="governance"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.35fr)"
                  columns={[
                    {
                      id: "item",
                      label: "Item",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => <PriorityStateChip label={row.badge} tone={row.tone} />,
                      sortValue: (row) => row.badge
                    },
                    {
                      id: "detail",
                      label: "Detail",
                      render: (row) => row.detail,
                      sortValue: (row) => row.detail
                    }
                  ]}
                  emptyMessage="No governance-linked entities are loaded."
                  filterLabel="State"
                  filterOptions={buildFilterOptions(governanceRows.map((row) => row.badge))}
                  getFilterValue={(row) => row.badge}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => setSelectedGovernanceKey(row.key)}
                  rows={governanceRows}
                  searchPlaceholder="Search governance items"
                  selectedKey={selectedGovernanceEntry?.key ?? null}
                />
                {selectedGovernanceEntry ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Governance Object</p>
                        <strong>{selectedGovernanceEntry.label}</strong>
                        <p>{selectedGovernanceEntry.detail}</p>
                      </div>
                      <PriorityStateChip label={selectedGovernanceEntry.badge} tone={selectedGovernanceEntry.tone} />
                    </div>
                    <dl className="detail-list">
                      {selectedGovernanceIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance:${label}`} label={label} value={value} />
                      ))}
                      {selectedGovernanceCorrectiveRows.map(([label, value]) => (
                        <DetailRow key={`browser-governance-corrective:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    {selectedGovernanceEntry.correctiveContext?.proposedActions.length ? (
                      <div className="thread-section">
                        <p className="context-label">Corrective Actions</p>
                        <div className="thread-card-list">
                          {selectedGovernanceEntry.correctiveContext.proposedActions.map((action, index) => (
                            <article className="thread-row active" key={`browser-governance-action:${index}`}>
                              <div>
                                <strong>{action.kind ?? "correction"}</strong>
                                <p>{action.reason ?? "No corrective rationale captured."}</p>
                              </div>
                              <span>{action.target ?? "governed target"}</span>
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {selectedGovernanceEntry.correctiveContext?.triggerEvents.length ? (
                      <div className="thread-section">
                        <p className="context-label">Trigger Evidence</p>
                        <div className="thread-flags">
                          {selectedGovernanceEntry.correctiveContext.triggerEvents.map((event, index) => (
                            <span className="thread-flag" key={`browser-governance-trigger:${index}`}>
                              {event.kind ?? event.family ?? "event"}
                              {event.eventId ? ` · ${event.eventId}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="browser-action-strip">
                      {selectedGovernanceApprovalId ? (
                        <button
                          className="starter-chip"
                          onClick={() => void onOpenApprovalRequest(selectedGovernanceApprovalId)}
                          type="button"
                        >
                          Review Approval
                        </button>
                      ) : null}
                      {selectedGovernanceApprovalId && selectedGovernanceApprovalSummary?.state === "awaiting" ? (
                        <button
                          className="starter-chip"
                          disabled={isDecidingApproval}
                          onClick={() => onSubmitApprovalDecision(selectedGovernanceApprovalId, "approve")}
                          type="button"
                        >
                          {isDecidingApproval ? "Submitting..." : "Approve Corrective Work"}
                        </button>
                      ) : null}
                      {selectedGovernanceApprovalId && selectedGovernanceApprovalSummary?.state === "awaiting" ? (
                        <button
                          className="starter-chip"
                          disabled={isDecidingApproval}
                          onClick={() => onSubmitApprovalDecision(selectedGovernanceApprovalId, "deny")}
                          type="button"
                        >
                          {isDecidingApproval ? "Submitting..." : "Deny Corrective Work"}
                        </button>
                      ) : null}
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "linked-conversations" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="linked-conversations"
                  columnTemplate="minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.9fr)"
                  columns={[
                    {
                      id: "thread",
                      label: "Thread",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label,
                      searchValue: (row) => `${row.label} ${row.detail}`
                    },
                    {
                      id: "state",
                      label: "State",
                      render: (row) => <PriorityStateChip label={row.state} tone={row.stateTone} />,
                      sortValue: (row) => row.state
                    },
                    {
                      id: "attention",
                      label: "Attention",
                      render: (row) => <PriorityStateChip label={row.attention} tone={row.attentionTone} />,
                      sortValue: (row) => row.attention
                    }
                  ]}
                  emptyMessage="No linked conversation entities are loaded yet."
                  filterLabel="State"
                  filterOptions={buildFilterOptions(linkedConversationRows.map((row) => row.state))}
                  getFilterValue={(row) => row.state}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedLinkedConversationId(row.id);
                    setSelectedThreadId(row.id);
                  }}
                  rows={linkedConversationRows}
                  searchPlaceholder="Search linked conversations"
                  selectedKey={selectedLinkedConversation?.id ?? null}
                />
                {selectedLinkedConversation ? (
                  <>
                    <div className="browser-focus-card">
                      <div>
                        <p className="context-label">Selected Linked Conversation</p>
                        <strong>{selectedLinkedConversation.label}</strong>
                        <p>{selectedLinkedConversation.detail}</p>
                      </div>
                      <PriorityStateChip
                        label={selectedLinkedConversation.badge}
                        tone={toneForThreadState(selectedLinkedConversation.badge as ThreadSummaryDto["state"])}
                      />
                    </div>
                    <dl className="detail-list">
                      {selectedLinkedConversationIdentityRows.map(([label, value]) => (
                        <DetailRow key={`browser-linked-conversation:${label}`} label={label} value={value} />
                      ))}
                    </dl>
                    <div className="browser-action-strip">
                      <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                        Open Inspector
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : selectedDomain === "documentation" ? (
              <div className="browser-domain-stack">
                <BrowserDataTable
                  key="documentation"
                  columnTemplate="minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.4fr)"
                  columns={[
                    {
                      id: "reference",
                      label: "Reference",
                      render: (row) => <strong>{row.label}</strong>,
                      sortValue: (row) => row.label
                    },
                    {
                      id: "category",
                      label: "Category",
                      render: (row) => row.category,
                      sortValue: (row) => row.category
                    },
                    {
                      id: "summary",
                      label: "Summary",
                      render: (row) => row.summary,
                      sortValue: (row) => row.summary,
                      searchValue: (row) => `${row.label} ${row.category} ${row.summary}`
                    }
                  ]}
                  emptyMessage="No documentation references are available."
                  filterLabel="Category"
                  filterOptions={buildFilterOptions(documentationRows.map((row) => row.category))}
                  getFilterValue={(row) => row.category}
                  getRowKey={(row) => row.key}
                  onSelect={(row) => {
                    setSelectedDocumentationKey(row.key);
                    void loadDocumentationPage(row.slug);
                  }}
                  rows={documentationRows}
                  searchPlaceholder="Search documentation references"
                  selectedKey={selectedDocumentationSlug}
                />
              </div>
            ) : (
              <div className="browser-package-card">
                <strong>{domainDescriptor.label}</strong>
                <p>Choose a browser domain to inspect its live runtime surface.</p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

function threadRecommendationScore(thread: ThreadSummaryDto): number {
  let score = 0;
  switch (thread.state) {
    case "blocked":
      score += 120;
      break;
    case "waiting":
      score += 90;
      break;
    case "active":
      score += 35;
      break;
    default:
      score += 10;
  }

  switch (thread.latestTurnState) {
    case "failed":
      score += 120;
      break;
    case "interrupted":
      score += 95;
      break;
    case "awaiting_approval":
      score += 90;
      break;
    case "running":
      score += 40;
      break;
    case "completed":
      score += 15;
      break;
    default:
      score += 5;
  }

  score += thread.attentionFlags.length * 8;
  return score;
}

function primaryThreadRecommendationReason(thread: ThreadSummaryDto): string {
  if (thread.latestTurnState === "failed") {
    return "This thread contains a failed turn that still needs follow-through.";
  }
  if (thread.latestTurnState === "interrupted") {
    return "This thread was interrupted and is the best conversation to resume.";
  }
  if (thread.latestTurnState === "awaiting_approval") {
    return "This thread is paused on approval and remains operationally relevant.";
  }
  if (thread.state === "blocked" || thread.state === "waiting") {
    return "This thread is carrying unresolved governed work.";
  }
  return "This is the strongest current conversation context for continued work.";
}

function workItemRecommendationScore(workItem: WorkItemSummaryDto): number {
  let score = 0;
  switch (workItem.state) {
    case "blocked":
      score += 125;
      break;
    case "quarantined":
      score += 120;
      break;
    case "waiting":
      score += 90;
      break;
    case "active":
      score += 55;
      break;
    case "closable":
      score += 30;
      break;
    default:
      score += 10;
  }

  score += workItem.approvalCount * 8;
  score += workItem.incidentCount * 12;
  score += workItem.validationBurden === "pending" ? 12 : 0;
  score += workItem.reconciliationBurden === "required" ? 14 : 0;
  return score;
}

function primaryWorkRecommendationReason(workItem: WorkItemSummaryDto): string {
  if (workItem.state === "blocked" || workItem.state === "quarantined") {
    return "This work item is preventing trustworthy continuation.";
  }
  if (workItem.state === "waiting") {
    return "This work item is paused and likely needs operator attention.";
  }
  if (workItem.validationBurden === "pending" || workItem.reconciliationBurden === "required") {
    return "This work item still carries closure obligations.";
  }
  return "This is the most relevant governed execution item.";
}

function approvalRecommendationScore(approval: ApprovalRequestSummaryDto): number {
  switch (approval.state) {
    case "awaiting":
      return 130;
    case "denied":
      return 85;
    case "approved":
      return 20;
    default:
      return 0;
  }
}

function primaryApprovalRecommendationReason(approval: ApprovalRequestSummaryDto): string {
  if (approval.state === "awaiting") {
    return "This approval is actively blocking governed execution.";
  }
  if (approval.state === "denied") {
    return "This approval was denied and may require redirection.";
  }
  return "This is the most relevant recent approval decision.";
}

function incidentRecommendationScore(incident: IncidentSummaryDto): number {
  let score = 0;
  switch (incident.severity) {
    case "critical":
      score += 140;
      break;
    case "high":
      score += 115;
      break;
    case "moderate":
      score += 80;
      break;
    case "low":
      score += 35;
      break;
    default:
      score += 10;
  }

  switch (incident.state) {
    case "open":
      score += 35;
      break;
    case "recovering":
      score += 20;
      break;
    case "resolved":
      score += 0;
      break;
    default:
      score += 0;
  }

  return score;
}

function primaryIncidentRecommendationReason(incident: IncidentSummaryDto): string {
  if (incident.state === "open") {
    return "This incident remains open and dominates recovery attention.";
  }
  if (incident.state === "recovering") {
    return "This incident is still in active recovery.";
  }
  return "This is the most relevant retained recovery record.";
}

function artifactRecommendationScore(_artifact: ArtifactSummaryDto): number {
  return 15;
}

function compressActionQueue(items: ActionQueueItem[]): ActionQueueItem[] {
  const normalizedTitles = new Set<string>();
  const perTypeCounts = new Map<ActionQueueItem["objectType"], number>();
  const limits: Record<ActionQueueItem["objectType"], number> = {
    Runtime: 1,
    Approval: 3,
    Recovery: 3,
    Work: 4,
    Thread: 4,
    Artifact: 2
  };

  return items.filter((item) => {
    const titleKey = item.title.trim().toLowerCase();
    if (normalizedTitles.has(titleKey)) {
      return false;
    }

    const count = perTypeCounts.get(item.objectType) ?? 0;
    if (count >= limits[item.objectType]) {
      return false;
    }

    normalizedTitles.add(titleKey);
    perTypeCounts.set(item.objectType, count + 1);
    return true;
  });
}

function signalPriorityForTone(tone: "active" | "warning" | "danger" | "steady"): SignalPriority | null {
  switch (tone) {
    case "danger":
      return "red";
    case "warning":
      return "yellow";
    case "active":
      return "blue";
    default:
      return null;
  }
}

function priorityLabelForTone(
  tone: "active" | "warning" | "danger" | "steady"
): "High" | "Medium" | "Low" {
  switch (tone) {
    case "danger":
      return "High";
    case "warning":
      return "Medium";
    default:
      return "Low";
  }
}

function signalCountsForWorkspace(workspaceId: WorkspaceId, items: GlobalAttentionItem[]): SignalCounts {
  const targetWorkspace = canonicalWorkspace(workspaceId);
  const counts: SignalCounts = { red: 0, yellow: 0, blue: 0 };

  for (const item of items) {
    const priority = signalPriorityForTone(item.tone);
    if (!priority || item.value <= 0) {
      continue;
    }

    const itemWorkspace = canonicalWorkspace(item.workspace);
    const matches =
      targetWorkspace === "environment"
        ? true
        : itemWorkspace === targetWorkspace;

    if (matches) {
      counts[priority] += item.value;
    }
  }

  return counts;
}

function signalCountsFromItems(items: GlobalAttentionItem[]): SignalCounts {
  const counts: SignalCounts = { red: 0, yellow: 0, blue: 0 };

  for (const item of items) {
    const priority = signalPriorityForTone(item.tone);
    if (!priority || item.value <= 0) {
      continue;
    }
    counts[priority] += item.value;
  }

  return counts;
}

function toneForThreadState(
  state: ThreadSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
      return "danger";
    default:
      return "steady";
  }
}

function toneForTurnState(
  state: TurnDetailDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "running":
    case "completed":
      return "active";
    case "awaiting_approval":
    case "interrupted":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "steady";
  }
}

function toneForApprovalState(
  state: ApprovalRequestSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "approved":
      return "active";
    case "awaiting":
      return "warning";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForApprovalDecision(
  decision: ApprovalDecisionDto["decision"]
): "active" | "warning" | "danger" | "steady" {
  switch (decision) {
    case "approved":
      return "active";
    case "denied":
      return "danger";
    default:
      return "steady";
  }
}

function toneForIncidentSeverity(
  severity: IncidentSummaryDto["severity"]
): "active" | "warning" | "danger" | "steady" {
  switch (severity) {
    case "critical":
    case "high":
      return "danger";
    case "moderate":
      return "warning";
    case "low":
      return "steady";
    default:
      return "steady";
  }
}

function toneForWorkState(
  state: WorkItemSummaryDto["state"]
): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
    case "closable":
      return "active";
    case "waiting":
      return "warning";
    case "blocked":
    case "quarantined":
      return "danger";
    default:
      return "steady";
  }
}

function attentionToneWeight(tone: "active" | "warning" | "danger" | "steady"): number {
  switch (tone) {
    case "danger":
      return 4;
    case "warning":
      return 3;
    case "active":
      return 2;
    default:
      return 1;
  }
}
