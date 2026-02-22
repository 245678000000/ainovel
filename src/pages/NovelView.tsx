import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { streamNovelGeneration } from "@/lib/stream-novel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, PenTool, RotateCcw, ChevronRight, Maximize2, Minimize2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
}

interface Novel {
  id: string;
  title: string;
  genre: string[];
  outline: string | null;
  word_count: number;
  settings_json: any;
}

export default function NovelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session } = useAuth();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [providers, setProviders] = useState<{ provider_type: string; api_key: string | null; is_default: boolean | null; name: string; default_model: string | null; enabled: boolean | null; api_base_url: string | null }[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const streamRef = useRef<HTMLDivElement>(null);

  const loadProviders = async () => {
    if (!user) return;
    const [{ data: profile }, { data: providerData }] = await Promise.all([
      supabase.from("profiles").select("default_llm_model").eq("user_id", user.id).single(),
      supabase.from("model_providers").select("provider_type, api_key, is_default, name, default_model, enabled, api_base_url").eq("user_id", user.id),
    ]);
    if (providerData) setProviders(providerData);
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
    if (!id || !user) return;
    const fetchData = async () => {
      const [novelRes, chaptersRes] = await Promise.all([
        supabase.from("novels").select("*").eq("id", id).single(),
        supabase.from("chapters").select("*").eq("novel_id", id).order("chapter_number"),
      ]);
      if (novelRes.error) {
        toast({ title: "加载失败", description: novelRes.error.message, variant: "destructive" });
        return;
      }
      setNovel(novelRes.data as Novel);
      setChapters((chaptersRes.data || []) as Chapter[]);
      if (chaptersRes.data?.length) setSelectedChapter(chaptersRes.data[0] as Chapter);
      setLoading(false);
    };
    fetchData();
    loadProviders();

    const onSettingsChanged = () => loadProviders();
    window.addEventListener("model-settings-changed", onSettingsChanged);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadProviders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("model-settings-changed", onSettingsChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, user]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [streamContent]);

  const defaultProvider = providers.find((p) => p.is_default && p.enabled !== false);
  const modelLower = defaultModel.toLowerCase();
  const nameMatchedProvider = providers.find(
    (p) =>
      p.enabled !== false &&
      (p.provider_type.toLowerCase() === modelLower ||
        p.name.toLowerCase() === modelLower ||
        (p.default_model && p.default_model.toLowerCase().includes(modelLower)))
  );
  const matchedProvider = defaultProvider || nameMatchedProvider;
  const currentApiKey = matchedProvider?.api_key || "";

  const handleContinue = async () => {
    if (!novel || !session?.access_token) {
      toast({ title: "操作失败", description: "请先登录", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setStreamContent("");
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode: "continue",
        settings: novel.settings_json || {},
        model: defaultModel,
        apiKey: currentApiKey,
        apiBaseUrl: matchedProvider?.api_base_url || undefined,
        actualModel: matchedProvider?.default_model || undefined,
        novelId: novel.id,
      },
      onDelta: (text) => {
        fullContent += text;
        setStreamContent(fullContent);
      },
      onDone: async () => {
        setIsGenerating(false);
        const nextNum = chapters.length + 1;
        const lines = fullContent.split("\n").filter((l) => l.trim());
        const chapterTitle = lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") || `第${nextNum}章`;
        const chapterContent = lines.slice(1).join("\n").trim();

        const { data, error } = await supabase
          .from("chapters")
          .insert({
            novel_id: novel.id,
            chapter_number: nextNum,
            title: chapterTitle,
            content: chapterContent,
            word_count: chapterContent.length,
          })
          .select()
          .single();

        if (error) {
          toast({ title: "保存失败", description: error.message, variant: "destructive" });
        } else {
          const newChapter = data as Chapter;
          setChapters((prev) => [...prev, newChapter]);
          setSelectedChapter(newChapter);
          setStreamContent("");
          // Update word count
          await supabase.from("novels").update({ word_count: (novel.word_count || 0) + chapterContent.length }).eq("id", novel.id);
          toast({ title: "章节已保存" });
        }
      },
      onError: (error) => {
        setIsGenerating(false);
        toast({ title: "生成失败", description: error, variant: "destructive" });
      },
      accessToken: session.access_token,
    });
  };

  const handleRewrite = async () => {
    if (!selectedChapter || !novel || !session?.access_token) return;
    setIsGenerating(true);
    setStreamContent("");
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode: "rewrite",
        settings: novel.settings_json || {},
        model: defaultModel,
        apiKey: currentApiKey,
        apiBaseUrl: matchedProvider?.api_base_url || undefined,
        actualModel: matchedProvider?.default_model || undefined,
        rewriteContent: selectedChapter.content,
      },
      onDelta: (text) => {
        fullContent += text;
        setStreamContent(fullContent);
      },
      onDone: async () => {
        setIsGenerating(false);
        const lines = fullContent.split("\n").filter((l) => l.trim());
        const chapterTitle = lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") || selectedChapter.title;
        const chapterContent = lines.slice(1).join("\n").trim();

        const { error } = await supabase
          .from("chapters")
          .update({ title: chapterTitle, content: chapterContent, word_count: chapterContent.length })
          .eq("id", selectedChapter.id);

        if (error) {
          toast({ title: "保存失败", description: error.message, variant: "destructive" });
        } else {
          setChapters((prev) =>
            prev.map((ch) =>
              ch.id === selectedChapter.id ? { ...ch, title: chapterTitle, content: chapterContent, word_count: chapterContent.length } : ch
            )
          );
          setSelectedChapter((prev) => prev ? { ...prev, title: chapterTitle, content: chapterContent, word_count: chapterContent.length } : prev);
          setStreamContent("");
          toast({ title: "重写完成并已保存" });
        }
      },
      onError: (error) => {
        setIsGenerating(false);
        toast({ title: "重写失败", description: error, variant: "destructive" });
      },
      accessToken: session.access_token,
    });
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">加载中...</div>;
  }
  if (!novel) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">小说不存在</div>;
  }

  if (fullscreen && selectedChapter) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex h-12 items-center justify-between border-b border-border/50 px-6">
          <span className="font-serif text-sm">第{selectedChapter.chapter_number}章 {selectedChapter.title}</span>
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(false)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-3rem)]">
          <div className="mx-auto max-w-3xl px-6 py-10 font-serif text-lg leading-loose text-foreground/90 whitespace-pre-wrap">
            {selectedChapter.content || "暂无内容"}
          </div>
        </ScrollArea>
      </div>
    );
  }

  const displayContent = streamContent || selectedChapter?.content || "";

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen">
      {/* Chapter List */}
      <div className="w-64 border-r border-border/50 flex-shrink-0 hidden md:block">
        <div className="flex h-12 items-center gap-2 border-b border-border/50 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/library")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-serif text-sm font-medium truncate">{novel.title}</span>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          <div className="p-2 space-y-1">
            {chapters.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">暂无章节</p>
            ) : (
              chapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChapter(ch); setStreamContent(""); }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedChapter?.id === ch.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">第{ch.chapter_number}章 {ch.title}</span>
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Reading Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex h-12 items-center justify-between border-b border-border/50 px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => navigate("/library")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-serif text-sm truncate">{novel.title}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在生成中...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div ref={streamRef} className="flex-1 overflow-auto">
          {displayContent ? (
            <div className="mx-auto max-w-3xl px-6 py-10">
              {selectedChapter && !streamContent && (
                <h2 className="mb-8 font-serif text-2xl font-bold text-center">
                  第{selectedChapter.chapter_number}章 {selectedChapter.title}
                </h2>
              )}
              <div className="font-serif text-base leading-loose text-foreground/85">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-4 indent-8 leading-loose">{children}</p>,
                    h1: ({ children }) => <h1 className="mb-6 text-2xl font-bold text-center">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-4 mt-8 text-xl font-bold">{children}</h2>,
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>选择一个章节开始阅读，或点击"继续写作"生成新章节</p>
            </div>
          )}
        </div>
        {/* Action bar */}
        <div className="flex items-center justify-center gap-3 border-t border-border/50 px-4 py-3">
          <Button variant="secondary" disabled={isGenerating} onClick={handleContinue}>
            {isGenerating && !streamContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
            继续写作
          </Button>
          <Button variant="outline" disabled={isGenerating || !selectedChapter} onClick={handleRewrite}>
            <RotateCcw className="mr-2 h-4 w-4" />
            重写本章
          </Button>
          <Button variant="outline" disabled={isGenerating} onClick={handleContinue}>
            <ChevronRight className="mr-2 h-4 w-4" />
            生成下一章
          </Button>
        </div>
      </div>
    </div>
  );
}
