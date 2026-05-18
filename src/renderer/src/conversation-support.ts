import type { ConversationAttachmentDto } from "../../shared/contracts";

const CONVERSATION_ATTACHMENT_TEXT_LIMIT = 240_000;
const CONVERSATION_ATTACHMENT_IMAGE_LIMIT = 6 * 1024 * 1024;
const CONVERSATION_ATTACHMENT_DOCUMENT_LIMIT = 12 * 1024 * 1024;

export function normalizeConversationStreamType(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value.trim().toLowerCase().replaceAll("_", "-");
}

export function extractAssistantResponseText(value: string): string {
  const trimmed = value.trim();
  const structMatch = trimmed.match(
    /^#S\(ASSISTANT-RESPONSE\s+:MESSAGE\s+([\s\S]*?)\s+:ACTIONS\b/i
  );
  return structMatch ? structMatch[1].trim() : value;
}

export function extractConversationStreamText(value: unknown): string {
  if (typeof value === "string") {
    return extractAssistantResponseText(value);
  }
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return (
    (typeof record.payload === "string" ? record.payload : "") ||
    (typeof record.content === "string" ? record.content : "") ||
    (typeof record.delta === "string" ? record.delta : "") ||
    (typeof record.text === "string" ? record.text : "") ||
    (typeof record.message === "string" ? record.message : "") ||
    extractConversationStreamText(record.response)
  );
}

export function mergeConversationStreamCompletion(
  currentContent: string,
  completionContent: string
): string {
  if (currentContent.length === 0) {
    return completionContent;
  }
  if (completionContent.length === 0) {
    return currentContent;
  }
  if (completionContent === currentContent) {
    return currentContent;
  }
  if (completionContent.startsWith(currentContent)) {
    return completionContent;
  }
  if (currentContent.startsWith(completionContent) || currentContent.includes(completionContent)) {
    return currentContent;
  }
  return completionContent;
}

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

export async function conversationAttachmentFromFile(
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
