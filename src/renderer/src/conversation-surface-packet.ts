import type { DesktopActionDto, DesktopModelDto, MemoryEntryDto, ThreadDetailDto } from "../../shared/contracts";
import type { EnvironmentFocusState } from "./environment-focus";
import type { TranscriptSurfaceEntry } from "./transcript-surface";
import type { DesktopWindowRecord } from "./desktop-windowing";

interface CalculatorSurfacePacketState {
  latestCalculatorResult: {
    expression: string;
    result: {
      displayValue: string;
      summary?: string | null;
      mode: string;
      base: number;
      wordSize: number;
      angleUnit: string;
    };
  } | null;
  pendingCalculatorExpressionRequest: {
    expression: string;
    shouldEvaluate: boolean;
  } | null;
}

interface TranscriptSurfacePacketState {
  selectedTranscriptEntry: TranscriptSurfaceEntry | null;
  selectedTranscriptSourceFilter: "all" | TranscriptSurfaceEntry["source"];
  filteredTranscriptEntries: TranscriptSurfaceEntry[];
}

interface MemorySurfacePacketState {
  selectedMemory: MemoryEntryDto | null;
  memoryEntries: MemoryEntryDto[];
}

interface EditorSurfacePacketState {
  focused: boolean;
  visible: boolean;
  bufferId: string | null;
  title: string | null;
  packageName: string | null;
  dirty: boolean;
  changedFormCount: number;
  draft: string;
}

export interface ConversationSurfacePacketInput {
  activeWorkspace: string;
  selectedConversationSection: string | null;
  selectedBrowserDomain: string | null;
  environmentFocus: EnvironmentFocusState;
  orchestrationFocus: Record<string, unknown> | null;
  orchestrationSnapshot: Record<string, unknown> | null;
  planVerification: Record<string, unknown> | null;
  selectedThread: ThreadDetailDto | null;
  selectedThreadId: string | null;
  conversationDraft: string;
  conversationAttachments: Array<unknown>;
  desktopModel: DesktopModelDto | null;
  desktopWindows: DesktopWindowRecord[];
  focusedDesktopWindowId: string | null;
  calculator: CalculatorSurfacePacketState;
  transcript: TranscriptSurfacePacketState;
  memory: MemorySurfacePacketState;
  editor: EditorSurfacePacketState;
}

function summarizeResidentWindows(
  desktopWindows: DesktopWindowRecord[],
  focusedDesktopWindowId: string | null
): Array<Record<string, unknown>> {
  return desktopWindows
    .filter((window) => window.state !== "minimized")
    .slice(0, 12)
    .map((window) => ({
      windowId: window.id,
      title: window.title,
      summary: window.summary ?? null,
      state: window.state,
      kind: window.kind,
      panelId: window.panelId ?? null,
      focused: window.id === focusedDesktopWindowId
    }));
}

function summarizeMinimizedWindows(desktopWindows: DesktopWindowRecord[]): Array<Record<string, unknown>> {
  return desktopWindows
    .filter((window) => window.state === "minimized")
    .slice(0, 12)
    .map((window) => ({
      windowId: window.id,
      title: window.title,
      summary: window.summary ?? null,
      kind: window.kind,
      panelId: window.panelId ?? null
    }));
}

export function buildConversationSurfaceContext(input: ConversationSurfacePacketInput): Record<string, unknown> {
  const {
    activeWorkspace,
    selectedConversationSection,
    selectedBrowserDomain,
    environmentFocus,
    orchestrationFocus,
    orchestrationSnapshot,
    planVerification,
    selectedThread,
    selectedThreadId,
    conversationDraft,
    conversationAttachments,
    desktopModel,
    desktopWindows,
    focusedDesktopWindowId,
    calculator,
    transcript,
    memory,
    editor
  } = input;
  const calculatorFocused = focusedDesktopWindowId === "window:calculator";
  const transcriptFocused = activeWorkspace === "transcript";
  const desktopResidentWindows = summarizeResidentWindows(desktopWindows, focusedDesktopWindowId);
  const desktopMinimizedWindows = summarizeMinimizedWindows(desktopWindows);

  return {
    activeWorkspace,
    selectedConversationSection,
    selectedBrowserDomain,
    environmentFocus: {
      kind: environmentFocus.kind,
      runtimeSymbol: environmentFocus.runtimeSymbol ?? null,
      runtimePackage: environmentFocus.runtimePackage ?? null,
      runtimeInspectionMode: environmentFocus.runtimeInspectionMode ?? null,
      sourcePath: environmentFocus.sourcePath ?? null,
      sourceLine: environmentFocus.sourceLine ?? null,
      approvalId: environmentFocus.approvalId ?? null,
      workItemId: environmentFocus.workItemId ?? null,
      incidentId: environmentFocus.incidentId ?? null,
      artifactId: environmentFocus.artifactId ?? null,
      eventCursor: environmentFocus.eventCursor ?? null
    },
    orchestration: {
      focus: summarizeOrchestrationRecord(orchestrationFocus),
      snapshot: summarizeOrchestrationRecord(orchestrationSnapshot),
      verification: summarizeOrchestrationRecord(planVerification)
    },
    thread: selectedThread
      ? {
          threadId: selectedThread.threadId,
          title: selectedThread.title,
          state: selectedThread.state,
          latestTurnState:
            selectedThread.turns.length > 0
              ? selectedThread.turns[selectedThread.turns.length - 1]?.state ?? null
              : null
        }
      : selectedThreadId
        ? {
            threadId: selectedThreadId
          }
        : null,
    draft: {
      length: conversationDraft.trim().length,
      attachmentCount: conversationAttachments.length,
      summary:
        conversationDraft.trim().length > 0
          ? conversationDraft.trim().slice(0, 240)
          : "No text draft content."
    },
    calculator:
      calculatorFocused || calculator.latestCalculatorResult || calculator.pendingCalculatorExpressionRequest
        ? {
            focused: calculatorFocused,
            pendingExpression: calculator.pendingCalculatorExpressionRequest?.expression ?? null,
            pendingEvaluationRequested:
              calculator.pendingCalculatorExpressionRequest?.shouldEvaluate ?? false,
            draftExpression:
              conversationDraft.trim().length > 0 ? conversationDraft.trim().slice(0, 240) : null,
            latestResult: calculator.latestCalculatorResult
              ? {
                  expression: calculator.latestCalculatorResult.expression,
                  displayValue: calculator.latestCalculatorResult.result.displayValue,
                  summary: calculator.latestCalculatorResult.result.summary ?? null,
                  mode: calculator.latestCalculatorResult.result.mode,
                  base: calculator.latestCalculatorResult.result.base,
                  wordSize: calculator.latestCalculatorResult.result.wordSize,
                  angleUnit: calculator.latestCalculatorResult.result.angleUnit
                }
              : null
          }
        : null,
    transcript:
      transcriptFocused || transcript.selectedTranscriptEntry || transcript.filteredTranscriptEntries.length > 0
        ? {
            focused: transcriptFocused,
            selectedSourceFilter: transcript.selectedTranscriptSourceFilter,
            visibleEntryCount: transcript.filteredTranscriptEntries.length,
            selectedEntry: transcript.selectedTranscriptEntry
              ? {
                  key: transcript.selectedTranscriptEntry.key,
                  source: transcript.selectedTranscriptEntry.source,
                  timestamp: transcript.selectedTranscriptEntry.timestamp,
                  title: transcript.selectedTranscriptEntry.title,
                  summary: transcript.selectedTranscriptEntry.summary,
                  preview: transcript.selectedTranscriptEntry.preview ?? null,
                  family: transcript.selectedTranscriptEntry.family ?? null,
                  threadId: transcript.selectedTranscriptEntry.threadId ?? null,
                  turnId: transcript.selectedTranscriptEntry.turnId ?? null,
                  eventCursor: transcript.selectedTranscriptEntry.eventCursor ?? null,
                  form: transcript.selectedTranscriptEntry.form ?? null,
                  status: transcript.selectedTranscriptEntry.status ?? null
                }
              : null,
            visibleEntries: transcript.filteredTranscriptEntries.slice(0, 12).map((entry) => ({
              key: entry.key,
              source: entry.source,
              timestamp: entry.timestamp,
              title: entry.title,
              summary: entry.summary,
              preview: entry.preview ?? null,
              family: entry.family ?? null,
              threadId: entry.threadId ?? null,
              turnId: entry.turnId ?? null,
              eventCursor: entry.eventCursor ?? null,
              status: entry.status ?? null
            }))
          }
        : null,
    memory:
      activeWorkspace === "memory" || memory.selectedMemory || memory.memoryEntries.length > 0
        ? {
            focused: activeWorkspace === "memory",
            entryCount: memory.memoryEntries.length,
            selectedMemory: memory.selectedMemory
              ? {
                  memoryId: memory.selectedMemory.memoryId,
                  kind: memory.selectedMemory.kind,
                  category: memory.selectedMemory.category,
                  attribute: memory.selectedMemory.attribute,
                  value: memory.selectedMemory.value,
                  summary: memory.selectedMemory.summary,
                  confidence: memory.selectedMemory.confidence ?? null,
                  sourceTurnId: memory.selectedMemory.sourceTurnId ?? null
                }
              : null,
            visibleEntries: memory.memoryEntries.slice(0, 12).map((entry) => ({
              memoryId: entry.memoryId,
              kind: entry.kind,
              category: entry.category,
              attribute: entry.attribute,
              value: entry.value,
              summary: entry.summary,
              confidence: entry.confidence ?? null
            }))
          }
        : null,
    editor:
      editor.focused || editor.visible || editor.draft.trim().length > 0
        ? {
            focused: editor.focused,
            visible: editor.visible,
            bufferId: editor.bufferId,
            title: editor.title,
            packageName: editor.packageName,
            dirty: editor.dirty,
            changedFormCount: editor.changedFormCount,
            draftLength: editor.draft.trim().length,
            draftPreview:
              editor.draft.trim().length > 0 ? editor.draft.trim().slice(0, 240) : "No editor content."
          }
        : null,
    desktop: desktopModel
      ? {
          workspaceId: desktopModel.workspaceId,
          activePanel: desktopModel.activePanel,
          focusObjectId: desktopModel.focusObjectId ?? null,
          surfaceCount: desktopModel.surfaceCount,
          governanceCount: desktopModel.governanceCount,
          objectGroupCount: desktopModel.objectGroupCount,
          activePanelSummary: desktopModel.activePanelSummary ?? null,
          recommendedAction: desktopModel.recommendedAction ?? null,
          focusedWindowId: focusedDesktopWindowId,
          residentWindowCount: desktopResidentWindows.length,
          minimizedWindowCount: desktopMinimizedWindows.length,
          residentWindows: desktopResidentWindows,
          minimizedWindows: desktopMinimizedWindows
        }
      : null
  };
}

function summarizeOrchestrationRecord(
  value: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) {
        return false;
      }
      if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
        return true;
      }
      return Array.isArray(entry) || typeof entry === "object";
    })
  );
}

export function buildConversationSurfaceActions(input: ConversationSurfacePacketInput): Array<Record<string, unknown>> {
  const {
    activeWorkspace,
    conversationDraft,
    desktopModel,
    focusedDesktopWindowId,
    calculator,
    transcript,
    editor
  } = input;
  const calculatorFocused = focusedDesktopWindowId === "window:calculator";
  const transcriptFocused = activeWorkspace === "transcript";
  const calculatorExpressionCandidate =
    calculator.pendingCalculatorExpressionRequest?.expression?.trim() ||
    calculator.latestCalculatorResult?.expression?.trim() ||
    conversationDraft.trim();
  const actions: Array<Record<string, unknown>> = [];

  if (calculatorFocused) {
    const calculatorMode = calculator.latestCalculatorResult?.result.mode ?? "basic";
    const calculatorBase = calculator.latestCalculatorResult?.result.base ?? 10;
    const calculatorWordSize = calculator.latestCalculatorResult?.result.wordSize ?? 64;
    const calculatorAngleUnit = calculator.latestCalculatorResult?.result.angleUnit ?? "radians";
    actions.push({
      toolId: "calculator/summary",
      label: "Inspect Calculator",
      summary:
        "Read the current calculator capabilities, modes, expression buffer, and numeric controls before acting on the focused calculator panel.",
      source: "calculator.focus"
    });
    actions.push({
      toolId: "calculator/set-expression",
      label: "Set Calculator Expression",
      summary:
        "Replace the focused calculator expression buffer with a new expression. Use this for multi-token calculations such as 7*5 before evaluating.",
      source: "calculator.expression",
      requiredArguments: ["expression"]
    });
    actions.push({
      toolId: "calculator/append-token",
      label: "Press Calculator Token",
      summary:
        "Append one calculator token such as 7, 5, +, -, *, /, (, ), sin(, or 0x to the focused calculator expression buffer.",
      source: "calculator.keypad",
      requiredArguments: ["token"]
    });
    actions.push({
      toolId: "calculator/append-token",
      label: "Press 7",
      summary: "Append the token 7 to the focused calculator expression buffer.",
      source: "calculator.keypad",
      arguments: { token: "7" }
    });
    actions.push({
      toolId: "calculator/clear",
      label: "Clear Calculator",
      summary: "Clear the focused calculator expression buffer and latest result.",
      source: "calculator.controls"
    });
    actions.push({
      toolId: "calculator/backspace",
      label: "Backspace Calculator",
      summary: "Remove the last character from the focused calculator expression buffer.",
      source: "calculator.controls"
    });
    actions.push({
      toolId: "calculator/set-mode",
      label: "Switch To Scientific",
      summary: "Switch the focused calculator to scientific mode.",
      source: "calculator.mode",
      arguments: { mode: "scientific" }
    });
    if (calculatorExpressionCandidate.length > 0) {
      actions.push({
        toolId: "calculator/evaluate",
        label: "Evaluate In Calculator",
        summary: `Evaluate ${JSON.stringify(calculatorExpressionCandidate.slice(0, 120))} in the focused calculator panel context.`,
        source:
          calculator.latestCalculatorResult?.expression?.trim() === calculatorExpressionCandidate
            ? "calculator.latestResult"
            : calculator.pendingCalculatorExpressionRequest?.expression?.trim() ===
                calculatorExpressionCandidate
              ? "calculator.pendingExpression"
              : "calculator.draftExpression",
        arguments: {
          expression: calculatorExpressionCandidate,
          mode: calculatorMode,
          base: calculatorBase,
          wordSize: calculatorWordSize,
          angleUnit: calculatorAngleUnit
        }
      });
    }
    actions.push({
      toolId: "calculator/evaluate",
      label: "Evaluate Calculator Expression",
      summary:
        "Evaluate a specific expression in the focused calculator. Use this when the user asks for a calculation result directly.",
      source: "calculator.evaluate",
      requiredArguments: ["expression"],
      arguments: {
        mode: calculatorMode,
        base: calculatorBase,
        wordSize: calculatorWordSize,
        angleUnit: calculatorAngleUnit
      }
    });
  }

  if (transcriptFocused && transcript.selectedTranscriptEntry?.form) {
    actions.push({
      toolId: "desktop/show",
      label: "Inspect Transcript Focus",
      summary: `Inspect the currently selected transcript entry ${JSON.stringify(transcript.selectedTranscriptEntry.title)} before acting on its runtime or governance implications.`,
      source: "transcript.focus"
    });
  }

  if (editor.focused || editor.visible) {
    actions.push({
      toolId: "editor/append-text",
      label: "Append To Editor Buffer",
      summary:
        "Append text to the currently selected editor buffer shown in the Surface editor panel. Use this when the user explicitly asks to add or insert code that should appear in the visible editor.",
      source: editor.focused ? "editor.focus" : "editor.visible",
      requiredArguments: ["text"]
    });
  }

  actions.push({
    toolId: "desktop/show",
    label: "Inspect Surface",
    summary: "Read the current Surface desktop model before deciding on a UI action."
  });

  const seenActionIds = new Set<string>();
  const seenActionKeys = new Set<string>();
  const actionLimit = 16;

  const pushDesktopAction = (
    action: DesktopActionDto | null | undefined,
    label: string,
    summary: string,
    source: string
  ): boolean => {
    if (!action) {
      return false;
    }
    const identity =
      action.actionId ??
      `${action.panelId}:${action.actionKind}:${action.index ?? ""}:${action.executionId ?? ""}:${action.objectKind ?? ""}:${action.command}`;
    if (seenActionIds.has(action.actionId ?? "") || seenActionKeys.has(identity)) {
      return false;
    }
    if (action.actionId) {
      seenActionIds.add(action.actionId);
    }
    seenActionKeys.add(identity);
    actions.push({
      toolId: "desktop/action",
      label,
      summary,
      source,
      arguments: {
        actionId: action.actionId,
        actionKind: action.actionKind,
        panelId: action.panelId,
        command: action.command,
        index: action.index ?? null,
        executionId: action.executionId ?? null,
        objectKind: action.objectKind ?? null,
        params: action.params ?? null
      }
    });
    return actions.length >= actionLimit;
  };

  const recommendedAction = desktopModel?.recommendedAction;
  if (recommendedAction) {
    const desktopRecommendedAction: DesktopActionDto = {
      actionId: recommendedAction.actionId,
      actionKind: recommendedAction.actionKind,
      panelId: desktopModel?.activePanel ?? "workspace",
      command: recommendedAction.command
    };
    if (
      pushDesktopAction(
        desktopRecommendedAction,
        recommendedAction.label || "Recommended Surface action",
        `Recommended next Surface action from the current desktop focus: ${recommendedAction.command}.`,
        "desktop.recommendedAction"
      )
    ) {
      return actions;
    }
  }

  const entryPoints = desktopModel?.entryPoints ?? [];
  for (const entryPoint of entryPoints) {
    if (
      pushDesktopAction(
        entryPoint.action,
        `${entryPoint.label} / open`,
        `Open the ${entryPoint.label.toLowerCase()} entry point from the current Surface desktop model.`,
        `desktop.entryPoint.${entryPoint.entryKind}`
      )
    ) {
      return actions;
    }
    const entryPointActions = entryPoint.actions ? Object.entries(entryPoint.actions) : [];
    for (const [actionKey, entryAction] of entryPointActions) {
      if (
        pushDesktopAction(
          entryAction,
          `${entryPoint.label} / ${actionKey}`,
          `Invoke ${actionKey} for the ${entryPoint.label.toLowerCase()} entry point.`,
          `desktop.entryPoint.${entryPoint.entryKind}.${actionKey}`
        )
      ) {
        return actions;
      }
    }
  }

  const desktopPanels = desktopModel?.panels ? Object.values(desktopModel.panels) : [];
  const activePanelId = desktopModel?.activePanel ?? null;
  const orderedPanels = [
    ...desktopPanels.filter((panel) => panel.panelId === activePanelId),
    ...desktopPanels.filter((panel) => panel.panelId !== activePanelId)
  ];

  for (const panel of orderedPanels) {
    const panelActions = [panel.actions.activate, panel.actions.select, panel.actions.open, panel.actions.restore];
    for (const action of panelActions) {
      if (
        pushDesktopAction(
          action,
          `${panel.panelId} / ${action?.actionKind ?? "action"}`,
          `Invoke ${action?.command ?? "the selected command"} for the ${panel.panelId} panel.`,
          panel.panelId === activePanelId ? "desktop.activePanel" : "desktop.panel"
        )
      ) {
        return actions;
      }
    }
  }

  return actions;
}
