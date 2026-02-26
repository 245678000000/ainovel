import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { streamNovelGeneration } from "@/lib/stream-novel";
import { PROVIDER_TYPES } from "@/lib/provider-types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { NovelSettingsForm, GenerateMode } from "@/components/novel-settings/NovelSettingsForm";
import { NovelSettings } from "@/components/novel-settings/types";

export default function Generate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [generationMode, setGenerationMode] = useState("");
  const [providers, setProviders] = useState<{ provider_type: string; api_key: string | null; is_default: boolean | null; name: string; default_model: string | null; enabled: boolean | null; api_base_url: string | null }[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const abortRef = useRef(false);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const [latestSettings, setLatestSettings] = useState<NovelSettings | null>(null);

  const loadSettings = async () => {
    if (!user) return;
    const [{ data: profile }, { data: providerData }] = await Promise.all([
      supabase.from("profiles").select("default_llm_model, nsfw_enabled").eq("user_id", user.id).single(),
      supabase.from("model_providers").select("provider_type, api_key, is_default, name, default_model, enabled, api_base_url").eq("user_id", user.id),
    ]);
    if (providerData) {
      setProviders(providerData);
    }
    if (profile) {
      let model = profile.default_llm_model;
      if (!model && providerData && providerData.length > 0) {
        const def = providerData.find((p) => p.is_default && p.enabled !== false);
        const first = providerData.find((p) => p.enabled !== false);
        model = (def || first)?.provider_type || null;
      }
      setDefaultModel(model || "deepseek");
    }
  };

  useEffect(() => {
    if (!user) return;
    loadSettings();

    const onSettingsChanged = () => loadSettings();
    window.addEventListener("model-settings-changed", onSettingsChanged);

    const onVisible = () => {
      if (document.visibilityState === "visible") loadSettings();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("model-settings-changed", onSettingsChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  // Auto-scroll preview
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [previewContent]);

  useEffect(() => {
    return () => {
      requestAbortControllerRef.current?.abort();
      requestAbortControllerRef.current = null;
    };
  }, []);

    const enabledProviders = providers.filter((p) => p.enabled !== false);
    const normalizedDefaultModel = defaultModel.toLowerCase();
    const hasApiKey = (provider: { api_key: string | null }) => Boolean(provider.api_key?.trim());

    const typeMatchedWithKey = enabledProviders.find(
      (p) => p.provider_type.toLowerCase() === normalizedDefaultModel && hasApiKey(p)
    );
    const defaultWithKey = enabledProviders.find((p) => p.is_default && hasApiKey(p));
    const firstWithKey = enabledProviders.find((p) => hasApiKey(p));
    const typeMatchedProvider = enabledProviders.find(
      (p) => p.provider_type.toLowerCase() === normalizedDefaultModel
    );
    const defaultProvider = enabledProviders.find((p) => p.is_default);

    const matchedProvider =
      typeMatchedWithKey ||
      defaultWithKey ||
      firstWithKey ||
      typeMatchedProvider ||
      defaultProvider ||
      enabledProviders[0];

    const currentApiKey = matchedProvider?.api_key?.trim() || "";

  const activeModelType = matchedProvider?.provider_type || defaultModel;
  // 不再强制 fallback 到 grok，直接使用用户配置的提供商，让后端判断是否缺 Key
  const effectiveProvider = activeModelType;
  const effectiveApiBaseUrl = matchedProvider?.api_base_url || undefined;
  const effectiveActualModel = matchedProvider?.default_model || undefined;
  const displayModelName =
    PROVIDER_TYPES.find((p) => p.value.toLowerCase() === effectiveProvider.toLowerCase())?.label ||
    matchedProvider?.name ||
    effectiveProvider;

  const handleGenerate = async (mode: GenerateMode, settings: NovelSettings) => {
    if (!session?.access_token) {
      toast({ title: "未登录", description: "请先登录", variant: "destructive" });
      return;
    }
    setLatestSettings(settings);
    setIsGenerating(true);
    setPreviewContent("");
    setGenerationMode(mode);
    abortRef.current = false;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode,
        settings,
        model: effectiveProvider,
        apiKey: currentApiKey,
        apiBaseUrl: effectiveApiBaseUrl,
        actualModel: effectiveActualModel,
        temperature: settings.writingStyle.temperature,
        chapterNumber: 1,
      },
      onDelta: (text) => {
        if (abortRef.current) return;
        fullContent += text;
        setPreviewContent(fullContent);
      },
      onDone: async () => {
        requestAbortControllerRef.current = null;
        setIsGenerating(false);
        if (abortRef.current) return;

        // Auto-save based on mode
        if (mode === "generate" && user) {
          try {
            const lines = fullContent.split("\n").filter((l) => l.trim());
            const chapterTitle = lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") || "第一章";
            const chapterContent = lines.slice(1).join("\n").trim();
            const initialWordCount = chapterContent.length || fullContent.trim().length;

            // Create novel
            const { data: novel, error: novelErr } = await supabase
              .from("novels")
              .insert({
                user_id: user.id,
                title: settings.mainCharacter.name
                  ? `${settings.mainCharacter.name}的故事`
                  : "未命名小说",
                genre: settings.genres,
                settings_json: settings,
                word_count: initialWordCount,
              })
              .select()
              .single();

            if (novelErr) throw novelErr;

            const { error: chapterErr } = await supabase.from("chapters").insert({
              novel_id: novel.id,
              chapter_number: 1,
              title: chapterTitle,
              content: chapterContent,
              word_count: chapterContent.length,
            });
            if (chapterErr) throw chapterErr;

            toast({ title: "创作完成", description: "小说已自动保存到书库" });
          } catch (e: any) {
            toast({ title: "保存失败", description: e.message, variant: "destructive" });
          }
        } else if (mode === "outline" && user) {
          toast({ title: "大纲生成完成", description: "开始创作时将自动使用此大纲" });
        } else if (mode === "characters") {
          toast({ title: "人物卡生成完成" });
        }
      },
      onError: (error) => {
        requestAbortControllerRef.current = null;
        if (abortRef.current) return;
        setIsGenerating(false);
        toast({ title: "生成失败", description: error, variant: "destructive" });
      },
      accessToken: session.access_token,
      signal: controller.signal,
    });
  };

  const handleStop = () => {
    abortRef.current = true;
    requestAbortControllerRef.current?.abort();
    requestAbortControllerRef.current = null;
    setIsGenerating(false);
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen">
      {/* Left: 高级创作设定表单 */}
      <NovelSettingsForm
        modelName={displayModelName}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        onStop={handleStop}
      />

      {/* Right: Preview Area */}
      <div className="hidden flex-1 flex-col md:flex">
        <div className="flex h-12 items-center justify-between border-b border-border/50 px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">实时预览</span>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在创作中...
            </div>
          )}
        </div>
        <div ref={previewRef} className="flex-1 overflow-auto p-8">
          {previewContent ? (
            <div className="mx-auto max-w-3xl font-serif text-base leading-loose text-foreground/90">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="mb-6 text-2xl font-bold text-center">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-4 mt-8 text-xl font-bold">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-3 mt-6 text-lg font-semibold">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 indent-8 leading-loose">{children}</p>,
                  code: ({ children }) => <pre className="my-4 rounded-lg bg-muted p-4 text-sm overflow-x-auto"><code>{children}</code></pre>,
                }}
              >
                {previewContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-muted-foreground">
              <div>
                <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-20" />
                <p className="text-lg">设定好参数后，点击"开始创作"</p>
                <p className="text-sm">AI将在这里实时生成你的小说</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
