import type {
  ConfigureProviderProfileInput,
  McpServerConfigDto
} from "../../shared/contracts";
import type {
  ConfigurationSection
} from "./shell-workspace-state";
import type { McpServerDraft } from "./configuration-workspace-state";

const DEFAULT_LISP_PAREN_COLORS = ["#6ec0c2", "#f4b267", "#9f8cff", "#7bc47f", "#f07c9b", "#56a3ff"];
export const configurationSections: Array<{
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
  },
  {
    id: "capabilities",
    label: "Capabilities",
    summary: "Discoverable governed desktop task manifests, including internal and MCP-backed operations.",
    family: "integration"
  },
  {
    id: "mcp-servers",
    label: "MCP Servers",
    summary: "Persisted MCP server configurations, transport settings, discoverability, and lifecycle maintenance.",
    family: "integration"
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

export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
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

export function llmProviderPresetForProfile(profile: {
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

export function buildProviderProfileDraft(
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

export function buildMcpServerDraft(server?: Partial<McpServerConfigDto> | null): McpServerDraft {
  return {
    serverId: server?.id ?? null,
    name: server?.name ?? "",
    transport: server?.transport === "http" ? "http" : "stdio",
    command: server?.command ?? "",
    arguments: server?.arguments ?? [],
    environmentVariables: server?.environmentVariables ?? {},
    workingDirectory: server?.workingDirectory ?? "",
    endpoint: server?.endpoint ?? "",
    capabilities: server?.capabilities ?? [],
    retryPolicy: server?.retryPolicy ?? { retryableP: true, maxAttempts: 3, backoffSeconds: 5 },
    healthStatus: server?.healthStatus ?? "unknown",
    enabledP: server?.enabledP ?? true,
    discoverableP: server?.discoverableP ?? true
  };
}

export function normalizeParenDepthColors(colors?: string[] | null): string[] {
  const normalized = Array.isArray(colors)
    ? colors.filter((color) => typeof color === "string" && color.trim().length > 0)
    : [];

  return DEFAULT_LISP_PAREN_COLORS.map((fallback, index) => normalized[index] ?? fallback);
}

export function normalizeDesktopSurfaceScalePercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 100;
  }

  return Math.min(160, Math.max(70, Math.round(value)));
}

export function canonicalDesktopTaskCoordinate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.trim().replace(/^:/, "").replace(/_/g, "-").toLowerCase();
}
