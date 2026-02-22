export interface ProviderType {
  value: string;
  label: string;
  icon: string;
  defaultUrl: string;
  models: string[];
}

export const PROVIDER_TYPES: ProviderType[] = [
  {
    value: "openai",
    label: "OpenAI",
    icon: "🤖",
    defaultUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    icon: "🐋",
    defaultUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    value: "claude",
    label: "Claude (Anthropic)",
    icon: "🧠",
    defaultUrl: "https://api.anthropic.com/v1",
    models: ["claude-3.5-sonnet", "claude-3-haiku", "claude-3-opus"],
  },
  {
    value: "grok",
    label: "Grok (xAI)",
    icon: "⚡",
    defaultUrl: "https://api.x.ai/v1",
    models: ["grok-2", "grok-2-mini"],
  },
  {
    value: "qwen",
    label: "Qwen (通义千问)",
    icon: "🌐",
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct"],
  },
  {
    value: "siliconflow",
    label: "SiliconFlow",
    icon: "💎",
    defaultUrl: "https://api.siliconflow.cn/v1",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
  },
  {
    value: "ollama",
    label: "Ollama (本地)",
    icon: "🦙",
    defaultUrl: "http://localhost:11434/v1",
    models: ["llama3", "qwen2.5", "deepseek-r1"],
  },
  {
    value: "custom",
    label: "自定义 (OpenAI 兼容)",
    icon: "🔧",
    defaultUrl: "",
    models: [],
  },
];

export interface ModelProvider {
  id: string;
  user_id: string;
  name: string;
  provider_type: string;
  api_key: string;
  api_base_url: string;
  default_model: string;
  is_default: boolean;
  enabled: boolean;
  config_json: {
    temperature: number;
    top_p: number;
    max_tokens: number;
  };
  created_at: string;
  updated_at: string;
}
