// Streaming helper for novel generation edge function

export interface StreamNovelParams {
  mode: "generate" | "outline" | "characters" | "rewrite" | "continue" | "continue_chapter";
  settings: Record<string, any>;
  model: string;
  apiKey: string;
  apiBaseUrl?: string;
  actualModel?: string;
  temperature?: number;
  novelId?: string;
  chapterNumber?: number;
  rewriteContent?: string;
  currentText?: string;
  currentChapterTitle?: string;
  currentChapterNumber?: number;
}

export async function streamNovelGeneration({
  params,
  onDelta,
  onDone,
  onError,
  accessToken,
  signal,
}: {
  params: StreamNovelParams;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  accessToken: string;
  signal?: AbortSignal;
}) {
  const isLocal = localStorage.getItem("is_local_mode") === "true";
  if (isLocal) {
    const provider = params.model.toLowerCase();
    const isClaude = provider === "claude";
    const apiKey = params.apiKey || "";
    const baseUrl = params.apiBaseUrl || (isClaude ? "https://api.anthropic.com/v1" : "https://api.openai.com/v1");

    // 格式化 API 端点
    const endpoint = isClaude
      ? (baseUrl.endsWith("/messages") ? baseUrl : `${baseUrl.trim().replace(/\/+$/, "")}/messages`)
      : (baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl.trim().replace(/\/+$/, "")}/chat/completions`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isClaude) {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }

    // 构造 Prompt 和参数
    const systemPrompt = params.mode === "outline"
      ? "You are a top Chinese web novelist. Generate a detailed novel outline in simplified Chinese. Format as structured markdown."
      : "You are a top Chinese web novelist with 15 years experience. Write in beautiful, addictive simplified Chinese.";

    const buildUserPrompt = () => {
      const parts: string[] = [];
      const s = params.settings;
      if (s.genres?.length) parts.push(`类型：${s.genres.join("、")}`);
      if (s.mainCharacter?.name) {
        const p = s.mainCharacter;
        parts.push(`主角：${p.name}，${p.gender}，${p.age || "未知"}岁，性格：${p.personality || "未设定"}`);
      }
      if (s.worldDetails?.geography) parts.push(`世界观地理：${s.worldDetails.geography}`);
      if (s.worldDetails?.rules) parts.push(`世界观设定：${s.worldDetails.rules}`);
      if (s.synopsis) parts.push(`简介：${s.synopsis}`);
      if (s.writingStyle?.narration) parts.push(`视角：${s.writingStyle.narration}`);
      if (s.writingStyle?.tone) parts.push(`风格：${s.writingStyle.tone}`);
      if (s.chapterWords) parts.push(`本章字数要求：约${s.chapterWords}字`);

      if (params.mode === "generate") {
        parts.push(`\n请生成第${params.chapterNumber || 1}章`);
      } else if (params.mode === "outline") {
        parts.push(`\n请生成一个详细的长篇小说大纲，预计总字数：${s.totalWords || "100000"}字。`);
      } else if (params.mode === "characters") {
        parts.push(`\n请为这部小说生成3-5个主要角色的详细人物卡。`);
      } else if (params.mode === "rewrite") {
        parts.push(`\n以下是需要重写的章节内容：\n\n${params.rewriteContent}\n\n请帮我重新润色和重写本章。`);
      } else if (params.mode === "continue_chapter") {
        parts.push(`\n以下是本章已写的内容：\n\n${params.currentText}\n\n请在这段内容末尾继续往下续写，保持剧情连贯与风格统一。`);
      } else if (params.mode === "continue") {
        parts.push(`\n请根据小说大纲继续往下生成下一章。`);
      }
      return parts.join("\n");
    };

    const userPrompt = buildUserPrompt();

    const requestBody = isClaude ? {
      model: params.actualModel || "claude-3-5-sonnet-20241022",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
      temperature: params.temperature || 0.7,
      max_tokens: 4096,
    } : {
      model: params.actualModel || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: true,
      temperature: params.temperature || 0.7,
      max_tokens: 4096,
    };

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!resp.ok) {
        const rawText = await resp.text();
        onError(`本地直连 API 失败 [状态码 ${resp.status}]: ${rawText.slice(0, 200) || "无错误详情"}`);
        return;
      }

      if (!resp.body) {
        onError("无法获取流式响应");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            if (isClaude) {
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                onDelta(parsed.delta.text);
              }
            } else {
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) onDelta(content);
            }
          } catch {
            // json 截断拼回
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      onDone();
    } catch (e: any) {
      if (e.name === "AbortError") return;
      onError(e.message || "直连大模型时发生网络连接错误（请检查您的网络代理或 API 地址是否正确）");
    }
    return;
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-novel`;
  const normalizeDisplayError = (raw: string, status?: number) => {
    if (status === 401) return "登录已过期，请重新登录";
    const text = raw || "";
    if (
      status === 500 ||
      status === 502 ||
      text.includes("LLM API error [500]") ||
      text.includes("LLM API error [502]") ||
      text.includes("Claude API error [500]") ||
      text.includes("Claude API error [502]") ||
      text.includes("internal_server_error")
    ) {
      return "模型服务暂时不稳定（上游返回 5xx），请稍后重试或切换模型。";
    }
    return raw;
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(params),
      signal,
    });

    if (!resp.ok) {
      const rawText = await resp.text();
      let error = `请求失败: ${resp.status}`;
      let code = "";
      try {
        const parsed = JSON.parse(rawText) as { error?: string; code?: string };
        if (parsed.error) error = parsed.error;
        if (parsed.code) code = parsed.code;
      } catch {
        if (rawText) error = rawText.slice(0, 240);
      }
      if (resp.status === 401) {
        onError(normalizeDisplayError("登录已过期，请重新登录", resp.status));
        return;
      }
      const resolved = code ? `${error} [${code}]` : error;
      onError(normalizeDisplayError(resolved, resp.status));
      return;
    }

    if (!resp.body) {
      onError("无法获取流式响应");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pendingLine = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;

        if (pendingLine) {
          if (line.startsWith("data: ")) {
            pendingLine = "";
          } else {
            line = pendingLine + line;
            pendingLine = "";
          }
        }

        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          // 残缺 JSON，将其暂存到 pendingLine 中，不再执行 buffer 倒退拼接，避免污染和死锁
          pendingLine = line;
        }
      }
    }

    // Final flush
    if (buffer.trim() || pendingLine) {
      const raws = buffer.split("\n");
      for (let i = 0; i < raws.length; i++) {
        let raw = raws[i];
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;

        if (pendingLine) {
          if (raw.startsWith("data: ")) {
            pendingLine = "";
          } else {
            raw = pendingLine + raw;
            pendingLine = "";
          }
        }

        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (e: unknown) {
    if (
      (e instanceof DOMException && e.name === "AbortError") ||
      (typeof e === "object" && e !== null && "name" in e && e.name === "AbortError")
    ) {
      return;
    }
    onError(normalizeDisplayError(e instanceof Error ? e.message : "网络错误"));
  }
}
