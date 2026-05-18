import type {
  CommandResultDto,
  EditorBufferStateDto,
  RuntimeEvalResultDto
} from "../../shared/contracts";

export function createEditorBufferState({
  bufferId,
  title,
  draft,
  baselineDraft,
  packageName,
  dirty = false,
  result = null,
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

export function normalizeEditorBufferFormText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function basenameForPath(path: string): string {
  const segments = path.split(/[\\/]/).filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? path;
}

export function parentDirectoryForPath(path: string): string {
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

export function joinDirectoryAndFileName(directoryPath: string, fileName: string): string {
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

export function extractTopLevelEditorBufferForms(source: string): string[] {
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

export function countChangedEditorBufferForms(baselineDraft: string, draft: string): number {
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

export function appendEditorTextToDraft(currentDraft: string, insertedText: string): string {
  const normalizedInsert = insertedText.trim();
  if (normalizedInsert.length === 0) {
    return currentDraft;
  }
  const trimmedCurrent = currentDraft.replace(/\s+$/, "");
  if (trimmedCurrent.length === 0) {
    return `${normalizedInsert}\n`;
  }
  return `${trimmedCurrent}\n\n${normalizedInsert}\n`;
}
