export type ProviderProtocol = "openai-compatible" | "anthropic";
export type ProviderKey =
  | "openai"
  | "deepseek"
  | "claude"
  | "grok"
  | "qwen"
  | "siliconflow"
  | "ollama"
  | "custom";

export interface ProviderConfig {
  protocol: ProviderProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
}

export interface UserProviderConfig {
  provider_type: string;
  api_key: string | null;
  api_base_url: string | null;
  default_model: string | null;
  is_default: boolean | null;
}

export const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
  openai: {
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  deepseek: {
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  claude: {
    protocol: "anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  grok: {
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-3",
  },
  qwen: {
    protocol: "openai-compatible",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
  },
  siliconflow: {
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
  },
  ollama: {
    protocol: "openai-compatible",
    defaultBaseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
  },
  custom: {
    protocol: "openai-compatible",
    defaultBaseUrl: "",
    defaultModel: "gpt-4o-mini",
  },
};

export const PROVIDER_KEYS = new Set<ProviderKey>(
  Object.keys(PROVIDER_CONFIGS) as ProviderKey[]
);

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function buildOpenAIEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export function buildClaudeEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  return normalized.endsWith("/messages")
    ? normalized
    : `${normalized}/messages`;
}

export function inferProviderFromModel(modelName: string): ProviderKey {
  const lower = modelName.toLowerCase();
  if (lower.includes("gpt")) return "openai";
  if (lower.includes("claude")) return "claude";
  if (lower.includes("deepseek")) return "deepseek";
  if (lower.includes("qwen")) return "qwen";
  if (lower.includes("grok")) return "grok";
  return "openai";
}
