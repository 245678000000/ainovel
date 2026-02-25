import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a top Chinese web novelist with 15 years experience. Write in beautiful, addictive simplified Chinese. Follow all user settings strictly. Every chapter must end with a hook. Never add author notes. Output ONLY the chapter title and pure text content.`;

const OUTLINE_SYSTEM_PROMPT = `You are a top Chinese web novelist. Generate a detailed novel outline in simplified Chinese. Include: overall story arc, chapter breakdown with brief descriptions, major plot points, climax, and ending. Format as structured markdown. Output ONLY the outline content.`;

const CHARACTER_SYSTEM_PROMPT = `You are a top Chinese web novelist. Generate detailed character cards in simplified Chinese as a JSON array. Each character should have: name, gender, age, personality, appearance, background, abilities, relationships, and role in the story. Output ONLY valid JSON.`;

const REWRITE_SYSTEM_PROMPT = `You are a top Chinese web novelist with 15 years experience. Rewrite the given chapter in simplified Chinese, improving quality, pacing, and engagement. Keep the core plot points but enhance the writing. Every chapter must end with a hook. Never add author notes. Output ONLY the chapter title and pure text content.`;

const ALLOWED_MODES = new Set([
  "generate",
  "outline",
  "characters",
  "rewrite",
  "continue",
  "test",
]);
const MAX_UPSTREAM_RETRIES = 2;

type ProviderProtocol = "openai-compatible" | "anthropic";
type ProviderKey =
  | "openai"
  | "deepseek"
  | "claude"
  | "grok"
  | "qwen"
  | "siliconflow"
  | "ollama"
  | "custom";

interface ProviderConfig {
  protocol: ProviderProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
}

interface UserProviderConfig {
  provider_type: string;
  api_key: string | null;
  api_base_url: string | null;
  default_model: string | null;
  is_default: boolean | null;
}

const PROVIDER_CONFIGS: Record<ProviderKey, ProviderConfig> = {
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

const PROVIDER_KEYS = new Set<ProviderKey>(
  Object.keys(PROVIDER_CONFIGS) as ProviderKey[]
);

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildOpenAIEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

function buildClaudeEndpoint(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return "";
  return normalized.endsWith("/messages")
    ? normalized
    : `${normalized}/messages`;
}

function inferProviderFromModel(modelName: string): ProviderKey {
  const value = modelName.toLowerCase();

  if (value.includes("claude")) return "claude";
  if (value.includes("grok")) return "grok";
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("qwen")) return "qwen";
  if (value.includes("silicon")) return "siliconflow";
  if (value.includes("ollama") || value.includes("llama")) return "ollama";
  if (value.includes("gpt") || value.includes("openai")) return "openai";

  return "custom";
}

function resolveProvider(model: unknown): ProviderKey {
  if (typeof model !== "string") return "custom";
  const normalized = model.trim().toLowerCase();
  if (!normalized) return "custom";
  if (PROVIDER_KEYS.has(normalized as ProviderKey)) {
    return normalized as ProviderKey;
  }
  return inferProviderFromModel(normalized);
}

function resolveModel(
  actualModel: unknown,
  model: unknown,
  provider: ProviderKey
): string {
  if (typeof actualModel === "string" && actualModel.trim()) {
    return actualModel.trim();
  }

  if (typeof model === "string") {
    const candidate = model.trim();
    if (candidate && !PROVIDER_KEYS.has(candidate.toLowerCase() as ProviderKey)) {
      return candidate;
    }
  }

  return PROVIDER_CONFIGS[provider].defaultModel;
}

function resolveBaseUrl(apiBaseUrl: unknown, provider: ProviderKey): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return normalizeBaseUrl(apiBaseUrl);
  }
  return normalizeBaseUrl(PROVIDER_CONFIGS[provider].defaultBaseUrl);
}

function resolveApiKey(provider: ProviderKey, userApiKey: unknown): string {
  if (typeof userApiKey === "string" && userApiKey.trim()) {
    return userApiKey.trim();
  }

  if (provider === "grok") {
    return Deno.env.get("XAI_API_KEY") || Deno.env.get("GROK_API_KEY") || "";
  }

  if (provider === "claude") {
    return (
      Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY") || ""
    );
  }

  return "";
}

async function getUserProviderConfig(
  supabase: any,
  userId: string,
  provider: ProviderKey
): Promise<UserProviderConfig | null> {
  const { data, error } = await supabase
    .from("model_providers")
    .select("provider_type, api_key, api_base_url, default_model, is_default")
    .eq("user_id", userId)
    .eq("provider_type", provider)
    .eq("enabled", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0] as unknown as UserProviderConfig;
}

function errorResponse(
  status: number,
  code: string,
  message: string
): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractUpstreamErrorMessage(rawText: string): string {
  if (!rawText) return "上游模型服务返回空错误信息";

  try {
    const parsed = JSON.parse(rawText) as {
      error?: string | { message?: string };
      message?: string;
    };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
    if (
      parsed.error &&
      typeof parsed.error === "object" &&
      typeof parsed.error.message === "string" &&
      parsed.error.message.trim()
    ) {
      return parsed.error.message;
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }
  } catch {
    // fall through to heuristic parsing
  }

  const messageMatch = rawText.match(/message["'\s:：]+([^,"'}\]\n]+)/i);
  if (messageMatch?.[1]) {
    return messageMatch[1].trim();
  }

  return rawText.slice(0, 300);
}

function buildUserPrompt(settings: any, context?: any): string {
  const parts: string[] = [];

  if (settings.genres?.length) parts.push(`类型：${settings.genres.join("、")}`);
  if (settings.protagonist?.name) {
    const p = settings.protagonist;
    parts.push(`主角：${p.name}，${p.gender}，${p.age || "未知"}岁，性格：${p.personality || "未设定"}`);
  }
  if (settings.worldSetting) parts.push(`世界观：${settings.worldSetting}`);
  if (settings.conflict) parts.push(`核心冲突：${settings.conflict}`);
  if (settings.synopsis) parts.push(`简介：${settings.synopsis}`);
  if (settings.style) parts.push(`风格：${settings.style}`);
  if (settings.narration) parts.push(`视角：${settings.narration}`);
  if (settings.chapterWords) parts.push(`本章字数要求：约${settings.chapterWords}字`);
  if (settings.nsfw) parts.push("允许成人内容");
  if (settings.systemNovel) parts.push("这是一本系统文，主角拥有系统");
  if (settings.harem) parts.push("后宫元素");

  // Context from previous chapters
  if (context?.outline) parts.push(`\n【大纲】\n${context.outline}`);
  if (context?.characters?.length) {
    parts.push(`\n【人物卡】\n${JSON.stringify(context.characters, null, 2)}`);
  }
  if (context?.previousSummary) {
    parts.push(`\n【前文摘要（最近3章）】\n${context.previousSummary}`);
  }
  if (context?.chapterNumber) {
    parts.push(`\n请生成第${context.chapterNumber}章`);
  }

  return parts.join("\n");
}

// Truncate context to fit within token limits (~4 chars per token, keep under 6000 tokens for context)
function truncateContext(text: string, maxChars: number = 24000): string {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
}

function buildPreviousSummary(chapters: any[]): string {
  if (!chapters?.length) return "";
  // Take last 3 chapters, summarize by taking first 500 chars each
  const recent = chapters.slice(-3);
  return recent
    .map((ch: any) => {
      const content = ch.content || "";
      const summary = content.length > 500 ? content.slice(0, 500) + "..." : content;
      return `第${ch.chapter_number}章 ${ch.title}：${summary}`;
    })
    .join("\n\n");
}

async function streamOpenAICompatible({
  url,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature,
}: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}): Promise<Response> {
  let lastError = "上游模型服务调用失败";

  for (let attempt = 0; attempt <= MAX_UPSTREAM_RETRIES; attempt++) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
          temperature,
          max_tokens: 4096,
        }),
      });

      if (response.ok) {
        return response;
      }

      const errorText = await response.text();
      const normalizedMessage = extractUpstreamErrorMessage(errorText);
      lastError = `LLM API error [${response.status}]: ${normalizedMessage}`;

      const retryable = response.status >= 500 && response.status < 600;
      if (!retryable || attempt >= MAX_UPSTREAM_RETRIES) {
        throw new Error(lastError);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知网络错误";
      lastError = msg;
      if (attempt >= MAX_UPSTREAM_RETRIES) {
        throw new Error(lastError);
      }
    }

    await sleep(400 * (attempt + 1));
  }

  throw new Error(lastError);
}

async function streamClaude({
  url,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  temperature,
}: {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
}): Promise<Response> {
  let response: Response | null = null;
  let lastError = "Claude API 调用失败";

  for (let attempt = 0; attempt <= MAX_UPSTREAM_RETRIES; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
          temperature,
          max_tokens: 4096,
        }),
      });

      if (response.ok) break;

      const errorText = await response.text();
      const normalizedMessage = extractUpstreamErrorMessage(errorText);
      lastError = `Claude API error [${response.status}]: ${normalizedMessage}`;

      const retryable = response.status >= 500 && response.status < 600;
      if (!retryable || attempt >= MAX_UPSTREAM_RETRIES) {
        throw new Error(lastError);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "未知网络错误";
      lastError = msg;
      if (attempt >= MAX_UPSTREAM_RETRIES) {
        throw new Error(lastError);
      }
    }

    await sleep(400 * (attempt + 1));
  }

  if (!response || !response.ok) {
    throw new Error(lastError);
  }

  // Transform Claude's SSE format to OpenAI-compatible format
  const reader = response.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async pull(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              const openaiFormat = {
                choices: [{ delta: { content: parsed.delta.text } }],
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
              );
            }
            if (parsed.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "仅支持 POST 请求");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(401, "AUTH_HEADER_INVALID", "未授权");
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse(
        500,
        "SUPABASE_ENV_MISSING",
        "服务端 Supabase 环境变量缺失（SUPABASE_URL / SUPABASE_ANON_KEY）"
      );
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return errorResponse(401, "AUTH_REQUIRED", "用户未登录");
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return errorResponse(400, "INVALID_PAYLOAD", "请求体必须为对象");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return errorResponse(400, "INVALID_JSON", "请求体必须为有效 JSON");
    }

    const mode = typeof body.mode === "string" ? body.mode : "";
    if (!ALLOWED_MODES.has(mode)) {
      return errorResponse(
        400,
        "INVALID_MODE",
        "无效的生成模式，支持 generate/outline/characters/rewrite/continue/test"
      );
    }

    // ── test 模式：后端代发检测请求，绕过浏览器 CORS 限制 ──
    if (mode === "test") {
      const testApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      const testBaseUrl = typeof body.apiBaseUrl === "string" ? body.apiBaseUrl.trim() : "";
      const testModel = typeof body.actualModel === "string" ? body.actualModel.trim() : "";
      const testProviderType = typeof body.model === "string" ? body.model.trim() : "openai";

      if (!testApiKey) {
        return new Response(JSON.stringify({ ok: false, error: "请填写 API Key" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!testBaseUrl) {
        return new Response(JSON.stringify({ ok: false, error: "请填写 API 地址" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        let testRes: Response;
        if (testProviderType === "claude") {
          // Anthropic 协议
          const url = buildClaudeEndpoint(testBaseUrl);
          testRes = await fetch(url, {
            method: "POST",
            headers: {
              "x-api-key": testApiKey,
              "Content-Type": "application/json",
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: testModel || "claude-3-haiku-20240307",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 5,
            }),
          });
        } else {
          // OpenAI 兼容协议
          const url = buildOpenAIEndpoint(testBaseUrl);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (testApiKey) headers.Authorization = `Bearer ${testApiKey}`;
          testRes = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: testModel || "gpt-4o-mini",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 5,
              stream: false,
            }),
          });
        }

        if (testRes.ok) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await testRes.text();
        const errMsg = extractUpstreamErrorMessage(errText);
        return new Response(JSON.stringify({ ok: false, error: `状态码 ${testRes.status}: ${errMsg}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "网络错误";
        return new Response(JSON.stringify({ ok: false, error: msg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (
      !body.settings ||
      typeof body.settings !== "object" ||
      Array.isArray(body.settings)
    ) {
      return errorResponse(400, "INVALID_SETTINGS", "缺少有效的 settings");
    }

    const settings = body.settings as Record<string, unknown>;
    const model = body.model;
    const apiKey = body.apiKey;
    const apiBaseUrl = body.apiBaseUrl;
    const actualModel = body.actualModel;
    const novelId =
      typeof body.novelId === "string" && body.novelId.trim()
        ? body.novelId.trim()
        : undefined;
    const chapterNumber =
      typeof body.chapterNumber === "number" ? body.chapterNumber : undefined;
    const rewriteContent =
      typeof body.rewriteContent === "string" ? body.rewriteContent : undefined;
    const temperature =
      typeof body.temperature === "number"
        ? Math.max(0, Math.min(2, body.temperature))
        : 0.7;

    if (mode === "continue" && !novelId) {
      return errorResponse(400, "NOVEL_ID_REQUIRED", "继续写作需要 novelId");
    }

    if (mode === "rewrite" && !rewriteContent?.trim()) {
      return errorResponse(
        400,
        "REWRITE_CONTENT_REQUIRED",
        "重写模式需要 rewriteContent"
      );
    }

    const resolvedProvider = resolveProvider(model);
    const providerConfig = PROVIDER_CONFIGS[resolvedProvider];
    const userProviderConfig = await getUserProviderConfig(
      supabase,
      user.id,
      resolvedProvider
    );
    const resolvedBaseUrl = resolveBaseUrl(
      apiBaseUrl ?? userProviderConfig?.api_base_url,
      resolvedProvider
    );
    const resolvedModel = resolveModel(
      actualModel ?? userProviderConfig?.default_model,
      model,
      resolvedProvider
    );
    const resolvedApiKey = resolveApiKey(
      resolvedProvider,
      apiKey ?? userProviderConfig?.api_key
    );

    if (!resolvedBaseUrl) {
      return errorResponse(
        400,
        "API_BASE_URL_REQUIRED",
        "请先配置有效的 API Base URL"
      );
    }

    if (!resolvedModel) {
      return errorResponse(400, "MODEL_REQUIRED", "请先配置可用的模型名称");
    }

    if (resolvedProvider === "grok" && !resolvedApiKey) {
      return errorResponse(
        400,
        "API_KEY_REQUIRED_GROK",
        "Grok 未配置可用 API Key。请在设置中填写 API Key，或在服务端配置 XAI_API_KEY/GROK_API_KEY。"
      );
    }

    if (providerConfig.protocol === "anthropic" && !resolvedApiKey) {
      return errorResponse(
        400,
        "API_KEY_REQUIRED_CLAUDE",
        "Claude 需要 API Key。请在设置中填写 API Key，或在服务端配置 ANTHROPIC_API_KEY/CLAUDE_API_KEY。"
      );
    }

    if (
      (resolvedProvider === "openai" ||
        resolvedProvider === "deepseek" ||
        resolvedProvider === "qwen" ||
        resolvedProvider === "siliconflow") &&
      !resolvedApiKey
    ) {
      return errorResponse(
        400,
        "API_KEY_REQUIRED_PROVIDER",
        `${resolvedProvider} 需要 API Key。请在设置中配置该提供商的 API Key。`
      );
    }

    let systemPrompt = SYSTEM_PROMPT;
    let userPrompt = "";

    // Build context for continue mode
    let context: any = {};
    if (mode === "continue" && novelId) {
      const [novelRes, chaptersRes, charsRes] = await Promise.all([
        supabase.from("novels").select("outline").eq("id", novelId).single(),
        supabase
          .from("chapters")
          .select("chapter_number, title, content")
          .eq("novel_id", novelId)
          .order("chapter_number"),
        supabase
          .from("characters")
          .select("name, card_json")
          .eq("novel_id", novelId),
      ]);

      context.outline = truncateContext(novelRes.data?.outline || "", 4000);
      context.characters = charsRes.data || [];
      context.previousSummary = truncateContext(
        buildPreviousSummary(chaptersRes.data || []),
        8000
      );
      context.chapterNumber = (chaptersRes.data?.length || 0) + 1;
    }

    if (mode === "generate") {
      context.chapterNumber = chapterNumber || 1;
      userPrompt = buildUserPrompt(settings, context);
    } else if (mode === "continue") {
      userPrompt = buildUserPrompt(settings, context);
    } else if (mode === "outline") {
      systemPrompt = OUTLINE_SYSTEM_PROMPT;
      userPrompt = buildUserPrompt(settings) + `\n\n请生成一个详细的长篇小说大纲，包含章节规划。预计总字数：${settings.totalWords || "100000"}字。`;
    } else if (mode === "characters") {
      systemPrompt = CHARACTER_SYSTEM_PROMPT;
      userPrompt = buildUserPrompt(settings) + `\n\n请为这部小说生成3-5个主要角色的详细人物卡，以JSON数组格式输出。`;
    } else if (mode === "rewrite") {
      systemPrompt = REWRITE_SYSTEM_PROMPT;
      userPrompt = `以下是需要重写的章节内容：\n\n${rewriteContent}\n\n设定信息：\n${buildUserPrompt(settings)}`;
    }

    // Call the appropriate LLM
    let llmResponse: Response;
    if (providerConfig.protocol === "anthropic") {
      llmResponse = await streamClaude({
        url: buildClaudeEndpoint(resolvedBaseUrl),
        apiKey: resolvedApiKey,
        model: resolvedModel,
        systemPrompt,
        userPrompt,
        temperature,
      });
    } else {
      llmResponse = await streamOpenAICompatible({
        url: buildOpenAIEndpoint(resolvedBaseUrl),
        apiKey: resolvedApiKey,
        model: resolvedModel,
        systemPrompt,
        userPrompt,
        temperature,
      });
    }

    return new Response(llmResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("generate-novel error:", e);
    const message = e instanceof Error ? e.message : "未知错误";
    const isUpstreamError = /API error \[\d+\]/.test(message);
    return errorResponse(
      isUpstreamError ? 502 : 500,
      isUpstreamError ? "LLM_UPSTREAM_ERROR" : "INTERNAL_ERROR",
      message
    );
  }
});
