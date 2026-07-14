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
