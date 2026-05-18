import type {
  CommandResultDto,
  ConversationLatencySummaryDto,
  ConversationWorkspaceDto,
  CreateConversationThreadInput,
  EnvironmentEventDto,
  MemoryDeleteResultDto,
  MemoryEntryDto,
  MemoryListDto,
  QueryResultDto,
  SendConversationMessageInput,
  SendConversationMessageResultDto,
  ThreadDetailDto,
  ThreadSummaryDto,
  TurnDetailDto,
  UpdateConversationThreadInput
} from "../../shared/contracts";
import type { RawServiceResponse } from "./bridge";
import { appendFileSync } from "node:fs";

const CONVERSATION_TRACE_PATH = "/private/tmp/surface-conversation-service.log";

function traceConversationService(message: string, detail?: Record<string, unknown>): void {
  const payload = {
    timestamp: new Date().toISOString(),
    message,
    ...(detail ? { detail } : {})
  };
  try {
    appendFileSync(CONVERSATION_TRACE_PATH, `${JSON.stringify(payload)}\n`);
  } catch {
    // Ignore tracing failures during debugging instrumentation.
  }
}

type InvokeService = <T>(
  operation: string,
  environmentId?: string,
  payload?: Record<string, unknown>
) => Promise<T>;

type InvokeStreamingService = <T>(
  operation: string,
  environmentId: string | undefined,
  payload: Record<string, unknown>,
  onEvent?: (event: EnvironmentEventDto) => void
) => Promise<T>;

interface ConversationServiceDependencies {
  invokeService: InvokeService;
  invokeStreamingService: InvokeStreamingService;
  camelizeKeys: (value: unknown) => unknown;
  asRecord: (value: unknown) => Record<string, unknown>;
  normalizeCommandStatus: (status: unknown) => CommandResultDto<MemoryEntryDto>["status"];
  normalizeMetadata: (metadata: Record<string, unknown> | undefined) => CommandResultDto<MemoryEntryDto>["metadata"];
  adaptConversationWorkspaceResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ConversationWorkspaceDto>;
  adaptThreadListResponse: (
    response: RawServiceResponse<Array<Record<string, unknown>>>
  ) => QueryResultDto<ThreadSummaryDto[]>;
  adaptThreadDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ThreadDetailDto>;
  adaptTurnDetailResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<TurnDetailDto>;
  adaptConversationLatencyResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => QueryResultDto<ConversationLatencySummaryDto>;
  adaptMemoryListResponse: (
    response: RawServiceResponse<Record<string, unknown> | Array<Record<string, unknown>>>
  ) => QueryResultDto<MemoryListDto>;
  adaptCreateConversationThreadResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<ThreadSummaryDto>;
  adaptSendConversationMessageResponse: (
    response: RawServiceResponse<Record<string, unknown>>
  ) => CommandResultDto<SendConversationMessageResultDto>;
}

export class LiveConversationService {
  constructor(private readonly dependencies: ConversationServiceDependencies) {}

  async conversationWorkspace(input: {
    environmentId?: string;
    threadId?: string | null;
    turnId?: string | null;
  }): Promise<QueryResultDto<ConversationWorkspaceDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.workspace",
      input.environmentId,
      input.threadId || input.turnId
        ? {
            ...(input.threadId ? { threadId: input.threadId } : {}),
            ...(input.turnId ? { turnId: input.turnId } : {})
          }
        : undefined
    );
    return this.dependencies.adaptConversationWorkspaceResponse(response);
  }

  async threadList(environmentId?: string): Promise<QueryResultDto<ThreadSummaryDto[]>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Array<Record<string, unknown>>>>(
      "conversation.thread-list",
      environmentId
    );
    return this.dependencies.adaptThreadListResponse(response);
  }

  async threadDetail(
    threadId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ThreadDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.thread-detail",
      environmentId,
      { threadId }
    );
    return this.dependencies.adaptThreadDetailResponse(response);
  }

  async turnDetail(turnId: string, environmentId?: string): Promise<QueryResultDto<TurnDetailDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.turn-detail",
      environmentId,
      { turnId }
    );
    return this.dependencies.adaptTurnDetailResponse(response);
  }

  async conversationLatency(
    turnId: string,
    environmentId?: string
  ): Promise<QueryResultDto<ConversationLatencySummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.latency",
      environmentId,
      { turnId }
    );
    return this.dependencies.adaptConversationLatencyResponse(response);
  }

  async memoryList(environmentId?: string): Promise<QueryResultDto<MemoryListDto>> {
    const response = await this.dependencies.invokeService<
      RawServiceResponse<Record<string, unknown> | Array<Record<string, unknown>>>
    >("memory.list", environmentId);
    return this.dependencies.adaptMemoryListResponse(response);
  }

  async memoryDetail(memoryId: string, environmentId?: string): Promise<QueryResultDto<MemoryEntryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "memory.detail",
      environmentId,
      { memoryId }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "memory",
      operation: response.operation,
      kind: "query",
      status: "ok",
      data: this.dependencies.camelizeKeys(response.data) as MemoryEntryDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async createConversationThread(
    input: CreateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.create-thread",
      input.environmentId,
      {
        title: input.title,
        summary: input.summary
      }
    );
    return this.dependencies.adaptCreateConversationThreadResponse(response);
  }

  async updateConversationThread(
    input: UpdateConversationThreadInput
  ): Promise<CommandResultDto<ThreadSummaryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.update-thread",
      input.environmentId,
      {
        threadId: input.threadId,
        title: input.title,
        summary: input.summary
      }
    );
    return this.dependencies.adaptCreateConversationThreadResponse(response);
  }

  async sendConversationMessage(
    input: SendConversationMessageInput,
    onEvent?: (event: EnvironmentEventDto) => void
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    void onEvent;
    traceConversationService("start", {
      environmentId: input.environmentId ?? null,
      threadId: input.threadId,
      promptLength: input.prompt.length,
      attachmentCount: input.attachments?.length ?? 0
    });
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "conversation.send-message",
      input.environmentId,
      {
        threadId: input.threadId,
        prompt: input.prompt,
        attachments: input.attachments ?? [],
        surfaceContext: input.surfaceContext ?? null,
        surfaceActions: input.surfaceActions ?? []
      }
    );
    const adapted = this.dependencies.adaptSendConversationMessageResponse(response);
    traceConversationService("done", {
      status: adapted.status,
      threadId: adapted.data.threadId,
      turnId: adapted.data.turnId,
      summary: adapted.data.summary ?? "",
      assistantMessageLength: adapted.data.assistantMessage?.length ?? 0
    });
    return adapted;
  }

  async approveActorMessage(
    input: { environmentId: string; actorMessageId: string }
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.approve-message",
      input.environmentId,
      { actorMessageId: input.actorMessageId }
    );
    return this.dependencies.adaptSendConversationMessageResponse(response);
  }

  async approveApproval(
    input: { environmentId: string; approvalId: string; sessionId?: string | null }
  ): Promise<CommandResultDto<SendConversationMessageResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "desktop-task.approve-approval",
      input.environmentId,
      { approvalId: input.approvalId, sessionId: input.sessionId ?? null }
    );
    if (response.status === "error" || response.status === "rejected") {
      console.error(
        "[live-host-adapter] approveApproval failed approvalId=%s sessionId=%s status=%s data=%o metadata=%o",
        input.approvalId,
        input.sessionId ?? null,
        response.status,
        response.data,
        response.metadata
      );
    } else {
      console.info(
        "[live-host-adapter] approveApproval approvalId=%s sessionId=%s status=%s dataKeys=%o",
        input.approvalId,
        input.sessionId ?? null,
        response.status,
        Object.keys(this.dependencies.asRecord(response.data))
      );
    }
    return this.dependencies.adaptSendConversationMessageResponse(response);
  }

  async updateMemory(input: {
    environmentId: string;
    memoryId: string;
    category?: string;
    attribute?: string;
    value?: string;
    summary?: string;
    confidence?: number | null;
  }): Promise<CommandResultDto<MemoryEntryDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "memory.update",
      input.environmentId,
      {
        memoryId: input.memoryId,
        category: input.category,
        attribute: input.attribute,
        value: input.value,
        summary: input.summary,
        confidence: input.confidence
      }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "memory",
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: this.dependencies.camelizeKeys(response.data) as MemoryEntryDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }

  async deleteMemory(input: {
    environmentId: string;
    memoryId: string;
  }): Promise<CommandResultDto<MemoryDeleteResultDto>> {
    const response = await this.dependencies.invokeService<RawServiceResponse<Record<string, unknown>>>(
      "memory.delete",
      input.environmentId,
      { memoryId: input.memoryId }
    );
    return {
      contractVersion: response.contractVersion,
      domain: "memory",
      operation: response.operation,
      kind: "command",
      status: this.dependencies.normalizeCommandStatus(response.status),
      data: this.dependencies.camelizeKeys(response.data) as MemoryDeleteResultDto,
      metadata: this.dependencies.normalizeMetadata(response.metadata)
    };
  }
}
