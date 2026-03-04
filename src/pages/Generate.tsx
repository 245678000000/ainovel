import { useCallback, useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { streamNovelGeneration } from "@/lib/stream-novel";
import { PROVIDER_TYPES } from "@/lib/provider-types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useModelProviders } from "@/hooks/useModelProviders";
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
  const { providers, defaultModel } = useModelProviders();

  const abortRef = useRef(false);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const [latestSettings, setLatestSettings] = useState<NovelSettings | null>(null);

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

  const targetModelName =
    matchedProvider?.provider_type || normalizedDefaultModel || "deepseek";
  const apiBaseUrl = matchedProvider?.api_base_url || undefined;
  const actualModelName = matchedProvider?.default_model || undefined;

  const handleGenerate = async (mode: GenerateMode, settings: NovelSettings) => {
    if (!session) {
      toast({
        title: "错误",
        description: "需要登录才能使用大模型",
        variant: "destructive",
      });
      return;
    }

    if (!matchedProvider || (!matchedProvider.api_key && matchedProvider.provider_type !== "custom")) {
      toast({
        title: "配置缺失",
        description: "请先在右上角「设置」中配置您的模型 API Key。",
        variant: "destructive",
      });
      navigate("/settings");
      return;
    }

    setIsGenerating(true);
    setPreviewContent("");
    setGenerationMode(mode);
    setLatestSettings(settings);
    abortRef.current = false;

    if (requestAbortControllerRef.current) {
      requestAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    requestAbortControllerRef.current = abortController;

    const apiKeyToUse = matchedProvider.api_key || "";

    try {
      await streamNovelGeneration({
        params: {
          mode,
          settings,
          model: targetModelName,
          apiKey: apiKeyToUse,
          apiBaseUrl,
          actualModel: actualModelName,
        },
        accessToken: session.access_token,
        signal: abortController.signal,
        onDelta: (text) => {
          if (abortRef.current) return;
          setPreviewContent((prev) => prev + text);
        },
        onDone: async () => {
          if (abortRef.current) return;
          setIsGenerating(false);
          setGenerationMode("");
        },
        onError: (err) => {
          if (abortRef.current || abortController.signal.aborted) return;
          setIsGenerating(false);
          setGenerationMode("");
          toast({
            title: "生成失败",
            description: err,
            variant: "destructive",
          });
        },
      });
    } catch (e: unknown) {
      if (abortRef.current || abortController.signal.aborted) return;
      setIsGenerating(false);
      setGenerationMode("");
      toast({
        title: "发生错误",
        description: e instanceof Error ? e.message : "请求失败",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    if (requestAbortControllerRef.current) {
      requestAbortControllerRef.current.abort();
      requestAbortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationMode("");
    toast({
      title: "已停止",
      description: "生成进程已被手动中止。",
    });
  };

  const handleSaveToLibrary = async () => {
    if (!user || !latestSettings) return;

    if (!previewContent.trim()) {
      toast({ title: "提示", description: "没有生成的内容可保存" });
      return;
    }

    const { data, error } = await supabase
      .from("novels")
      .insert([
        {
          user_id: user.id,
          title: latestSettings.title || "未命名小说",
          genre: latestSettings.genres.join(", ") || "未分类",
          word_count: previewContent.length,
          outline: previewContent,
          settings_json: latestSettings,
        },
      ])
      .select()
      .single();

    if (error) {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "保存成功",
        description: "设定和大纲已存入您的书架",
      });
      navigate(`/novel/${data.id}`);
    }
  };

  const currentProviderInfo = PROVIDER_TYPES.find(
    (p) => p.id === targetModelName
  );

  return (
    <div className="container py-8 max-w-[1600px] h-[calc(100vh-3rem)]">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI 智能生成
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">
            填写设定表单，AI
            将为您构建宏大世界与细腻情节，生成结果可直接作为提示词或大纲。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {session ? (
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              当前使用模型: {currentProviderInfo?.name || targetModelName.toUpperCase()}
              {actualModelName ? ` (${actualModelName})` : ""}
            </Badge>
          ) : (
            <Badge variant="destructive" className="animate-pulse">未登录</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100%-6rem)]">
        <div className="h-full min-h-[600px]">
          <NovelSettingsForm
            modelName={targetModelName}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onStop={handleStop}
          />
        </div>

        <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-border/50 bg-background/50 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="font-serif font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {isGenerating ? "正在生成..." : "生成结果"}
            </h2>
            <div className="flex gap-2">
              <Badge variant="secondary" className="opacity-80">
                {generationMode === "outline" ? "故事大纲" : generationMode === "characters" ? "角色卡片" : "世界观与背景"}
              </Badge>
              {previewContent && !isGenerating && (
                <button
                  onClick={handleSaveToLibrary}
                  className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                >
                  存入书架
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {isGenerating && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-primary text-sm font-medium bg-background/80 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm backdrop-blur-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在构思...
              </div>
            )}

            <div
              ref={previewRef}
              className="h-full overflow-y-auto p-6 prose prose-stone dark:prose-invert max-w-none
                         prose-headings:font-serif prose-h1:text-2xl prose-h2:text-xl
                         prose-p:leading-relaxed prose-p:text-muted-foreground
                         scroll-smooth"
            >
              {!previewContent && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
                  <div className="p-4 rounded-full bg-secondary/50">
                    <Sparkles className="h-8 w-8 opacity-50" />
                  </div>
                  <p>点击左侧的生成按钮，开启创作之旅</p>
                </div>
              ) : (
                <ReactMarkdown>{previewContent}</ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
