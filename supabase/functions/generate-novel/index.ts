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

// LLM provider configurations
interface LLMConfig {
  url: string;
  modelName: string;
  headerBuilder: (apiKey: string) => Record<string, string>;
}

const LLM_CONFIGS: Record<string, LLMConfig> = {
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    modelName: "deepseek-chat",
    headerBuilder: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
  },
  claude: {
    url: "https://api.anthropic.com/v1/messages",
    modelName: "claude-3-5-sonnet-20241022",
    headerBuilder: (key) => ({
      "x-api-key": key,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    }),
  },
  grok: {
    url: "https://api.x.ai/v1/chat/completions",
    modelName: "grok-3",
    headerBuilder: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
  },
  qwen: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    modelName: "qwen-plus",
    headerBuilder: (key) => ({
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }),
  },
};

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

async function streamOpenAICompatible(
  config: LLMConfig,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<Response> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: config.headerBuilder(apiKey),
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error [${response.status}]: ${errorText}`);
  }

  return response;
}

async function streamClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number
): Promise<Response> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: LLM_CONFIGS.claude.headerBuilder(apiKey),
    body: JSON.stringify({
      model: LLM_CONFIGS.claude.modelName,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
      temperature,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error [${response.status}]: ${errorText}`);
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "用户未登录" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      mode, // "generate" | "outline" | "characters" | "rewrite" | "continue"
      settings,
      model,
      apiKey,
      temperature = 0.7,
      novelId,
      chapterNumber,
      rewriteContent,
    } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "请先在设置页面配置API密钥" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const llmModel = model || "deepseek";
    const config = LLM_CONFIGS[llmModel];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `不支持的模型: ${llmModel}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
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
    if (llmModel === "claude") {
      llmResponse = await streamClaude(apiKey, systemPrompt, userPrompt, temperature);
    } else {
      llmResponse = await streamOpenAICompatible(
        config,
        apiKey,
        systemPrompt,
        userPrompt,
        temperature
      );
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
