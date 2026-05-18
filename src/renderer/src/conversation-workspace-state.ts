import { useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type {
  CalculatorResultDto,
  CommandResultDto,
  ConversationAttachmentDto,
  EditorBufferStateDto,
  ReplSessionHistoryEntryDto,
  RuntimeEvalResultDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto
} from "../../shared/contracts";

export const DEFAULT_CONVERSATION_DRAFT =
  "Start from the live environment focus and keep runtime, source, and governance context attached.";

export interface PendingConversationApprovalState {
  actorMessageId?: string | null;
  approvalId?: string | null;
  sessionId?: string | null;
  threadId: string | null;
  policyIds: string[];
}

export interface ConversationRecoveryHandoffState {
  source: "incident-restart";
  incidentId: string;
  restartLabel: string;
}

export interface CalculatorExpressionRequestState {
  expression: string;
  shouldEvaluate: boolean;
  token: number;
}

export interface LatestCalculatorResultState {
  expression: string;
  result: CalculatorResultDto;
}

export interface ConversationStreamState {
  threadId: string;
  turnId: string | null;
  content: string;
}

export interface EditorCursorSymbolHelpState {
  detail: string;
  info: string;
  type?: string;
  packageName?: string;
  signature?: string | null;
}

export interface ConversationWorkspaceState {
  threads: ThreadSummaryDto[];
  setThreads: Dispatch<SetStateAction<ThreadSummaryDto[]>>;
  selectedThreadId: string | null;
  setSelectedThreadId: Dispatch<SetStateAction<string | null>>;
  selectedThread: ThreadDetailDto | null;
  setSelectedThread: Dispatch<SetStateAction<ThreadDetailDto | null>>;
  selectedConversationMessageId: string | null;
  setSelectedConversationMessageId: Dispatch<SetStateAction<string | null>>;
  selectedTurnId: string | null;
  setSelectedTurnId: Dispatch<SetStateAction<string | null>>;
  selectedTurn: TurnDetailDto | null;
  setSelectedTurn: Dispatch<SetStateAction<TurnDetailDto | null>>;
  conversationSessionTitleDraft: string;
  setConversationSessionTitleDraft: Dispatch<SetStateAction<string>>;
  isConversationSessionCreateDialogOpen: boolean;
  setIsConversationSessionCreateDialogOpen: Dispatch<SetStateAction<boolean>>;
  isConversationThreadRenameDialogOpen: boolean;
  setIsConversationThreadRenameDialogOpen: Dispatch<SetStateAction<boolean>>;
  conversationThreadRenameDraft: string;
  setConversationThreadRenameDraft: Dispatch<SetStateAction<string>>;
  conversationThreadRenameTargetId: string | null;
  setConversationThreadRenameTargetId: Dispatch<SetStateAction<string | null>>;
  conversationDraft: string;
  setConversationDraft: Dispatch<SetStateAction<string>>;
  conversationRecoveryHandoff: ConversationRecoveryHandoffState | null;
  setConversationRecoveryHandoff: Dispatch<SetStateAction<ConversationRecoveryHandoffState | null>>;
  pendingCalculatorExpressionRequest: CalculatorExpressionRequestState | null;
  setPendingCalculatorExpressionRequest: Dispatch<SetStateAction<CalculatorExpressionRequestState | null>>;
  latestCalculatorResult: LatestCalculatorResultState | null;
  setLatestCalculatorResult: Dispatch<SetStateAction<LatestCalculatorResultState | null>>;
  conversationAttachments: ConversationAttachmentDto[];
  setConversationAttachments: Dispatch<SetStateAction<ConversationAttachmentDto[]>>;
  conversationSendError: string | null;
  setConversationSendError: Dispatch<SetStateAction<string | null>>;
  isSendingConversation: boolean;
  setIsSendingConversation: Dispatch<SetStateAction<boolean>>;
  conversationStream: ConversationStreamState | null;
  setConversationStream: Dispatch<SetStateAction<ConversationStreamState | null>>;
  pendingConversationApproval: PendingConversationApprovalState | null;
  setPendingConversationApproval: Dispatch<SetStateAction<PendingConversationApprovalState | null>>;
  pendingConversationComposerFocusThreadId: string | null;
  setPendingConversationComposerFocusThreadId: Dispatch<SetStateAction<string | null>>;
  editorBuffersByProject: Record<string, EditorBufferStateDto[]>;
  setEditorBuffersByProject: Dispatch<SetStateAction<Record<string, EditorBufferStateDto[]>>>;
  selectedEditorBufferIdByProject: Record<string, string>;
  setSelectedEditorBufferIdByProject: Dispatch<SetStateAction<Record<string, string>>>;
  currentEditorCursorSymbol: string | null;
  setCurrentEditorCursorSymbol: Dispatch<SetStateAction<string | null>>;
  currentEditorCursorSymbolPackage: string;
  setCurrentEditorCursorSymbolPackage: Dispatch<SetStateAction<string>>;
  currentEditorCursorSymbolHelp: EditorCursorSymbolHelpState | null;
  setCurrentEditorCursorSymbolHelp: Dispatch<SetStateAction<EditorCursorSymbolHelpState | null>>;
  workspacePackageByProject: Record<string, string>;
  setWorkspacePackageByProject: Dispatch<SetStateAction<Record<string, string>>>;
  workspaceDraftByProject: Record<string, string>;
  setWorkspaceDraftByProject: Dispatch<SetStateAction<Record<string, string>>>;
  workspaceResultByProject: Record<string, CommandResultDto<RuntimeEvalResultDto> | null>;
  setWorkspaceResultByProject: Dispatch<
    SetStateAction<Record<string, CommandResultDto<RuntimeEvalResultDto> | null>>
  >;
  workspaceHistoryByProject: Record<string, ReplSessionHistoryEntryDto[]>;
  setWorkspaceHistoryByProject: Dispatch<SetStateAction<Record<string, ReplSessionHistoryEntryDto[]>>>;
  selectedThreadIdRef: MutableRefObject<string | null>;
  stickyConversationThreadIdRef: MutableRefObject<string | null>;
  pendingConversationApprovalRef: MutableRefObject<PendingConversationApprovalState | null>;
  currentEditorScopeIdRef: MutableRefObject<string>;
  currentEditorBufferIdRef: MutableRefObject<string | null>;
  currentEditorPackageRef: MutableRefObject<string>;
  pendingConversationRefreshTimerRef: MutableRefObject<number | null>;
  pendingTranscriptRefreshTimerRef: MutableRefObject<number | null>;
}

export function useConversationWorkspaceState(unboundEditorScopeId: string): ConversationWorkspaceState {
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
  const [conversationDraft, setConversationDraft] = useState(DEFAULT_CONVERSATION_DRAFT);
  const [conversationRecoveryHandoff, setConversationRecoveryHandoff] =
    useState<ConversationRecoveryHandoffState | null>(null);
  const [pendingCalculatorExpressionRequest, setPendingCalculatorExpressionRequest] =
    useState<CalculatorExpressionRequestState | null>(null);
  const [latestCalculatorResult, setLatestCalculatorResult] = useState<LatestCalculatorResultState | null>(null);
  const [conversationAttachments, setConversationAttachments] = useState<ConversationAttachmentDto[]>([]);
  const [conversationSendError, setConversationSendError] = useState<string | null>(null);
  const [isSendingConversation, setIsSendingConversation] = useState(false);
  const [conversationStream, setConversationStream] = useState<ConversationStreamState | null>(null);
  const [pendingConversationApproval, setPendingConversationApproval] =
    useState<PendingConversationApprovalState | null>(null);
  const [pendingConversationComposerFocusThreadId, setPendingConversationComposerFocusThreadId] =
    useState<string | null>(null);
  const [editorBuffersByProject, setEditorBuffersByProject] = useState<Record<string, EditorBufferStateDto[]>>({});
  const [selectedEditorBufferIdByProject, setSelectedEditorBufferIdByProject] = useState<Record<string, string>>({});
  const [currentEditorCursorSymbol, setCurrentEditorCursorSymbol] = useState<string | null>(null);
  const [currentEditorCursorSymbolPackage, setCurrentEditorCursorSymbolPackage] = useState<string>("cl-user");
  const [currentEditorCursorSymbolHelp, setCurrentEditorCursorSymbolHelp] =
    useState<EditorCursorSymbolHelpState | null>(null);
  const [workspacePackageByProject, setWorkspacePackageByProject] = useState<Record<string, string>>({});
  const [workspaceDraftByProject, setWorkspaceDraftByProject] = useState<Record<string, string>>({});
  const [workspaceResultByProject, setWorkspaceResultByProject] = useState<
    Record<string, CommandResultDto<RuntimeEvalResultDto> | null>
  >({});
  const [workspaceHistoryByProject, setWorkspaceHistoryByProject] =
    useState<Record<string, ReplSessionHistoryEntryDto[]>>({});
  const selectedThreadIdRef = useRef<string | null>(selectedThreadId);
  const stickyConversationThreadIdRef = useRef<string | null>(null);
  const pendingConversationApprovalRef = useRef<PendingConversationApprovalState | null>(pendingConversationApproval);
  const currentEditorScopeIdRef = useRef<string>(unboundEditorScopeId);
  const currentEditorBufferIdRef = useRef<string | null>(null);
  const currentEditorPackageRef = useRef<string>("cl-user");
  const pendingConversationRefreshTimerRef = useRef<number | null>(null);
  const pendingTranscriptRefreshTimerRef = useRef<number | null>(null);

  return {
    threads,
    setThreads,
    selectedThreadId,
    setSelectedThreadId,
    selectedThread,
    setSelectedThread,
    selectedConversationMessageId,
    setSelectedConversationMessageId,
    selectedTurnId,
    setSelectedTurnId,
    selectedTurn,
    setSelectedTurn,
    conversationSessionTitleDraft,
    setConversationSessionTitleDraft,
    isConversationSessionCreateDialogOpen,
    setIsConversationSessionCreateDialogOpen,
    isConversationThreadRenameDialogOpen,
    setIsConversationThreadRenameDialogOpen,
    conversationThreadRenameDraft,
    setConversationThreadRenameDraft,
    conversationThreadRenameTargetId,
    setConversationThreadRenameTargetId,
    conversationDraft,
    setConversationDraft,
    conversationRecoveryHandoff,
    setConversationRecoveryHandoff,
    pendingCalculatorExpressionRequest,
    setPendingCalculatorExpressionRequest,
    latestCalculatorResult,
    setLatestCalculatorResult,
    conversationAttachments,
    setConversationAttachments,
    conversationSendError,
    setConversationSendError,
    isSendingConversation,
    setIsSendingConversation,
    conversationStream,
    setConversationStream,
    pendingConversationApproval,
    setPendingConversationApproval,
    pendingConversationComposerFocusThreadId,
    setPendingConversationComposerFocusThreadId,
    editorBuffersByProject,
    setEditorBuffersByProject,
    selectedEditorBufferIdByProject,
    setSelectedEditorBufferIdByProject,
    currentEditorCursorSymbol,
    setCurrentEditorCursorSymbol,
    currentEditorCursorSymbolPackage,
    setCurrentEditorCursorSymbolPackage,
    currentEditorCursorSymbolHelp,
    setCurrentEditorCursorSymbolHelp,
    workspacePackageByProject,
    setWorkspacePackageByProject,
    workspaceDraftByProject,
    setWorkspaceDraftByProject,
    workspaceResultByProject,
    setWorkspaceResultByProject,
    workspaceHistoryByProject,
    setWorkspaceHistoryByProject,
    selectedThreadIdRef,
    stickyConversationThreadIdRef,
    pendingConversationApprovalRef,
    currentEditorScopeIdRef,
    currentEditorBufferIdRef,
    currentEditorPackageRef,
    pendingConversationRefreshTimerRef,
    pendingTranscriptRefreshTimerRef
  };
}
