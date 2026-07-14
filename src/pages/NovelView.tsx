import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { streamNovelGeneration } from "@/lib/stream-novel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, PenTool, RotateCcw, ChevronRight, Maximize2, Minimize2, Loader2, StopCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

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

// 章节列表组件属性接口
interface ChapterListProps {
  chapters: Chapter[];
  selectedChapter: Chapter | null;
  onSelectChapter: (chapter: Chapter) => void;
}

// 抽取复用的章节列表组件
function ChapterList({ chapters, selectedChapter, onSelectChapter }: ChapterListProps) {
  return (
    <div className="p-2 space-y-1">
      {chapters.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">暂无章节</p>
      ) : (
        chapters.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onSelectChapter(ch)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedChapter?.id === ch.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="truncate">第{ch.chapter_number}章 {ch.title}</span>
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          </button>
        ))
      )}
    </div>
  );
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [generationMode, setGenerationMode] = useState<"continue" | "continue_chapter" | "rewrite" | null>(null);

  // 统一章节切换处理器，处理生成中拦截及自动关闭抽屉
  const handleChapterSelect = (chapter: Chapter) => {
    if (isGenerating) {
      toast({
        title: "请先停止当前生成，再切换到其他章节",
        variant: "destructive",
      });
      return;
    }
    setSelectedChapter(chapter);
    setStreamContent("");
    setIsSheetOpen(false);
  };

  const [providers, setProviders] = useState<{ provider_type: string; api_key: string | null; is_default: boolean | null; name: string; default_model: string | null; enabled: boolean | null; api_base_url: string | null }[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const streamRef = useRef<HTMLDivElement>(null);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const stopRequestedRef = useRef(false);

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
        setLoading(false);
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

  useEffect(() => {
    return () => {
      requestAbortControllerRef.current?.abort();
      requestAbortControllerRef.current = null;
      stopRequestedRef.current = true;
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
  const effectiveProvider = matchedProvider?.provider_type || defaultModel;
  const effectiveApiBaseUrl = matchedProvider?.api_base_url || undefined;
  const effectiveActualModel = matchedProvider?.default_model || undefined;

  const handleContinue = async () => {
    if (isGenerating) return;
    if (!novel || !session?.access_token) {
      toast({ title: "操作失败", description: "请先登录", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenerationMode("continue");
    setStreamContent("");
    stopRequestedRef.current = false;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode: "continue",
        settings: novel.settings_json || {},
        model: effectiveProvider,
        apiKey: currentApiKey,
        apiBaseUrl: effectiveApiBaseUrl,
        actualModel: effectiveActualModel,
        novelId: novel.id,
      },
      onDelta: (text) => {
        // 在 onDelta 内部进行控制器比对，防止流数据在 Abort 后漏刷
        if (requestAbortControllerRef.current !== controller) return;
        fullContent += text;
        setStreamContent(fullContent);
      },
      onDone: async () => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) {
          setIsGenerating(false);
          setGenerationMode(null);
          return;
        }

        try {
          const nextNum = chapters.length + 1;
          const lines = fullContent.split("\n").filter((l) => l.trim());
          const chapterTitle =
            lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") ||
            `第${nextNum}章`;
          const chapterContent = lines.slice(1).join("\n").trim();

          // 校验解析出的正文内容字数，如果为空或少于 10 个字，则通过 toast 报错拦截，不写入数据库
          if (chapterContent.length < 10) {
            toast({
              title: "生成内容过少",
              description: "生成内容字数不足（少于 10 个字），已拦截保存",
              variant: "destructive",
            });
            setStreamContent("");
            return;
          }

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
            setStreamContent("");
          } else {
            const newChapter = data as Chapter;
            setChapters((prev) => [...prev, newChapter]);
            setSelectedChapter(newChapter);
            setStreamContent("");

            const nextWordCount = (novel.word_count || 0) + chapterContent.length;
            const { error: novelUpdateError } = await supabase
              .from("novels")
              .update({ word_count: nextWordCount })
              .eq("id", novel.id);

            if (novelUpdateError) {
              toast({
                title: "字数更新失败",
                description: novelUpdateError.message,
                variant: "destructive",
              });
            } else {
              setNovel((prev) => (prev ? { ...prev, word_count: nextWordCount } : prev));
            }

            toast({ title: "章节已保存" });
          }
        } catch (e: any) {
          console.error(e);
          toast({ title: "网络错误", description: "保存失败，请检查网络", variant: "destructive" });
        } finally {
          // 只在所有异步返回后的 finally 块中释放锁
          setIsGenerating(false);
          setGenerationMode(null);
        }
      },
      onError: (error) => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) return;
        setIsGenerating(false);
        setGenerationMode(null);
        toast({ title: "生成失败", description: error, variant: "destructive" });
        setStreamContent("");
      },
      accessToken: session.access_token,
      signal: controller.signal,
    });
  };

  const handleRewrite = async () => {
    if (isGenerating) return;
    if (!selectedChapter || !novel || !session?.access_token) return;

    // 记录发起重写时的章节 ID 闭包校验，防竞态与防状态篡改
    const targetChapterId = selectedChapter.id;
    setIsGenerating(true);
    setGenerationMode("rewrite");
    setStreamContent("");
    stopRequestedRef.current = false;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode: "rewrite",
        settings: novel.settings_json || {},
        model: effectiveProvider,
        apiKey: currentApiKey,
        apiBaseUrl: effectiveApiBaseUrl,
        actualModel: effectiveActualModel,
        rewriteContent: selectedChapter.content,
      },
      onDelta: (text) => {
        // 在 onDelta 内部进行控制器比对，防止流数据在 Abort 后漏刷
        if (requestAbortControllerRef.current !== controller) return;
        fullContent += text;
        setStreamContent(fullContent);
      },
      onDone: async () => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) {
          setIsGenerating(false);
          setGenerationMode(null);
          return;
        }

        try {
          const lines = fullContent.split("\n").filter((l) => l.trim());
          const chapterTitle =
            lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") ||
            selectedChapter.title;
          const chapterContent = lines.slice(1).join("\n").trim();

          // 校验重写后的正文内容字数，如果为空或少于 10 个字，则通过 toast 报错拦截，不进行数据库更新
          if (chapterContent.length < 10) {
            toast({
              title: "重写失败",
              description: "生成的内容过少（少于 10 个字），已拦截保存",
              variant: "destructive",
            });
            setStreamContent("");
            return;
          }

          const { error } = await supabase
            .from("chapters")
            .update({
              title: chapterTitle,
              content: chapterContent,
              word_count: chapterContent.length,
            })
            .eq("id", targetChapterId);

          if (error) {
            toast({ title: "保存失败", description: error.message, variant: "destructive" });
            setStreamContent("");
          } else {
            const previousWords = selectedChapter.word_count || selectedChapter.content.length;
            const wordDelta = chapterContent.length - previousWords;

            // 状态更新时加入发起时的章节 ID 校验，确保安全性
            setChapters((prev) =>
              prev.map((ch) =>
                ch.id === targetChapterId
                  ? {
                      ...ch,
                      title: chapterTitle,
                      content: chapterContent,
                      word_count: chapterContent.length,
                    }
                  : ch
              )
            );
            setSelectedChapter((prev) =>
              prev && prev.id === targetChapterId
                ? {
                    ...prev,
                    title: chapterTitle,
                    content: chapterContent,
                    word_count: chapterContent.length,
                  }
                : prev
            );
            setStreamContent("");

            if (wordDelta !== 0) {
              const nextWordCount = Math.max(0, (novel.word_count || 0) + wordDelta);
              const { error: novelUpdateError } = await supabase
                .from("novels")
                .update({ word_count: nextWordCount })
                .eq("id", novel.id);

              if (novelUpdateError) {
                toast({
                  title: "字数更新失败",
                  description: novelUpdateError.message,
                  variant: "destructive",
                });
              } else {
                setNovel((prev) => (prev ? { ...prev, word_count: nextWordCount } : prev));
              }
            }

            toast({ title: "重写完成并已保存" });
          }
        } catch (e: any) {
          console.error(e);
          toast({ title: "重写失败", description: "网络异常或服务错误", variant: "destructive" });
        } finally {
          // 只在所有异步返回后的 finally 块中释放锁
          setIsGenerating(false);
          setGenerationMode(null);
        }
      },
      onError: (error) => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) return;
        setIsGenerating(false);
        setGenerationMode(null);
        toast({ title: "重写失败", description: error, variant: "destructive" });
        setStreamContent("");
      },
      accessToken: session.access_token,
      signal: controller.signal,
    });
  };

  const handleContinueChapter = async () => {
    if (isGenerating) return;
    if (!selectedChapter || !novel || !session?.access_token) {
      toast({ title: "操作失败", description: "请先登录或选择章节", variant: "destructive" });
      return;
    }

    // 记录发起续写时的章节 ID 闭包校验，防竞态与防状态篡改
    const targetChapterId = selectedChapter.id;
    const originalContent = selectedChapter.content || "";
    setIsGenerating(true);
    setGenerationMode("continue_chapter");
    setStreamContent("");
    stopRequestedRef.current = false;
    requestAbortControllerRef.current?.abort();
    const controller = new AbortController();
    requestAbortControllerRef.current = controller;
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode: "continue_chapter",
        settings: novel.settings_json || {},
        model: effectiveProvider,
        apiKey: currentApiKey,
        apiBaseUrl: effectiveApiBaseUrl,
        actualModel: effectiveActualModel,
        novelId: novel.id,
        currentText: originalContent,
        currentChapterTitle: selectedChapter.title,
        currentChapterNumber: selectedChapter.chapter_number,
      },
      onDelta: (text) => {
        // 在 onDelta 内部进行控制器比对，防止流数据在 Abort 后漏刷
        if (requestAbortControllerRef.current !== controller) return;
        fullContent += text;
        setStreamContent(fullContent);
      },
      onDone: async () => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) {
          setIsGenerating(false);
          setGenerationMode(null);
          return;
        }

        try {
          const nextContent = originalContent + "\n\n" + fullContent;
          const newWords = nextContent.length;

          const { error } = await supabase
            .from("chapters")
            .update({
              content: nextContent,
              word_count: newWords,
            })
            .eq("id", targetChapterId);

          if (error) {
            toast({ title: "保存失败", description: error.message, variant: "destructive" });
            setStreamContent("");
          } else {
            // 状态更新时加入发起时的章节 ID 校验，确保安全性
            setChapters((prev) =>
              prev.map((ch) =>
                ch.id === targetChapterId
                  ? {
                      ...ch,
                      content: nextContent,
                      word_count: newWords,
                    }
                  : ch
              )
            );
            setSelectedChapter((prev) =>
              prev && prev.id === targetChapterId
                ? {
                    ...prev,
                    content: nextContent,
                    word_count: newWords,
                  }
                : prev
            );
            setStreamContent("");

            const wordDelta = nextContent.length - originalContent.length;
            if (wordDelta > 0) {
              const nextWordCount = (novel.word_count || 0) + wordDelta;
              const { error: novelUpdateError } = await supabase
                .from("novels")
                .update({ word_count: nextWordCount })
                .eq("id", novel.id);

              if (novelUpdateError) {
                toast({
                  title: "字数更新失败",
                  description: novelUpdateError.message,
                  variant: "destructive",
                });
              } else {
                setNovel((prev) => (prev ? { ...prev, word_count: nextWordCount } : prev));
              }
            }

            toast({ title: "章节已保存" });
          }
        } catch (e: any) {
          console.error(e);
          toast({ title: "保存失败", description: "网络异常或服务错误", variant: "destructive" });
        } finally {
          // 只在所有异步返回后的 finally 块中释放锁
          setIsGenerating(false);
          setGenerationMode(null);
        }
      },
      onError: (error) => {
        if (requestAbortControllerRef.current !== controller) return;
        requestAbortControllerRef.current = null;
        if (stopRequestedRef.current) return;
        setIsGenerating(false);
        setGenerationMode(null);
        toast({ title: "续写失败", description: error, variant: "destructive" });
        setStreamContent("");
      },
      accessToken: session.access_token,
      signal: controller.signal,
    });
  };

  const handleStop = async () => {
    stopRequestedRef.current = true;
    requestAbortControllerRef.current?.abort();
    requestAbortControllerRef.current = null;

    let saveSuccess = false;
    const isContinueChapter = generationMode === "continue_chapter";

    try {
      // 续写当前章模式下，如果流内容非空，则进行优雅保存
      if (isContinueChapter && streamContent.trim()) {
        const currentStream = streamContent;
        if (selectedChapter && novel) {
          const targetChapterId = selectedChapter.id;
          const originalContent = selectedChapter.content || "";
          const nextContent = originalContent ? originalContent + "\n\n" + currentStream : currentStream;
          const newWords = nextContent.length;
          const previousWords = originalContent.length;
          const wordDelta = newWords - previousWords;

          const { error } = await supabase
            .from("chapters")
            .update({
              content: nextContent,
              word_count: newWords,
            })
            .eq("id", targetChapterId);

          if (error) {
            toast({ title: "优雅保存失败", description: error.message, variant: "destructive" });
          } else {
            saveSuccess = true;
            setChapters((prev) =>
              prev.map((ch) =>
                ch.id === targetChapterId
                  ? {
                      ...ch,
                      content: nextContent,
                      word_count: newWords,
                    }
                  : ch
              )
            );
            setSelectedChapter((prev) =>
              prev && prev.id === targetChapterId
                ? {
                    ...prev,
                    content: nextContent,
                    word_count: newWords,
                  }
                : prev
            );

            if (wordDelta > 0) {
              const nextWordCount = (novel.word_count || 0) + wordDelta;
              const { error: novelUpdateError } = await supabase
                .from("novels")
                .update({ word_count: nextWordCount })
                .eq("id", novel.id);

              if (novelUpdateError) {
                toast({
                  title: "字数更新失败",
                  description: novelUpdateError.message,
                  variant: "destructive",
                });
              } else {
                setNovel((prev) => (prev ? { ...prev, word_count: nextWordCount } : prev));
              }
            }
            toast({ title: "已保存已生成的内容" });
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      toast({
        title: "保存失败：网络错误，无法保存最新续写内容",
        variant: "destructive",
      });
    } finally {
      // 仅在不需要保存，或者保存成功，或者不是续写模式时，清空流内容，防止数据在报错时消失
      if (!isContinueChapter || !streamContent.trim() || saveSuccess) {
        setStreamContent("");
      }
      setGenerationMode(null);
      setIsGenerating(false);
    }
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

  const displayContent =
    isGenerating && generationMode === "continue_chapter"
      ? (selectedChapter?.content || "") + "\n\n" + streamContent
      : streamContent || selectedChapter?.content || "";

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
            <ChapterList
              chapters={chapters}
              selectedChapter={selectedChapter}
              onSelectChapter={handleChapterSelect}
            />
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
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="目录">
                  <BookOpen className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <Button variant="ghost" size="icon" onClick={() => setFullscreen(true)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 移动端章节列表抽屉 */}
          <SheetContent side="left" className="w-80 p-0" aria-describedby={undefined}>
            <div className="flex h-12 items-center gap-2 border-b border-border/50 px-4">
              <SheetTitle className="font-serif text-sm font-medium truncate">{novel.title} (目录)</SheetTitle>
            </div>
            <div className="h-[calc(100%-3rem)]">
              <ScrollArea className="h-full">
                <ChapterList
                  chapters={chapters}
                  selectedChapter={selectedChapter}
                  onSelectChapter={handleChapterSelect}
                />
              </ScrollArea>
            </div>
          </SheetContent>

          <div ref={streamRef} className="flex-1 overflow-auto">
            {displayContent ? (
              <div className="mx-auto max-w-3xl px-4 md:px-6 py-10">
                {selectedChapter && (!streamContent || generationMode === "continue_chapter") && (
                  <h2 className="mb-8 font-serif text-2xl font-bold text-center">
                    第{selectedChapter.chapter_number}章 {selectedChapter.title}
                  </h2>
                )}
                <div className="font-serif text-base leading-loose text-foreground/85 break-words">
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
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border/50 px-4 py-3">
            {isGenerating && (
              <Button variant="destructive" onClick={handleStop}>
                <StopCircle className="mr-2 h-4 w-4" />
                停止生成
              </Button>
            )}
            <Button variant="secondary" disabled={isGenerating || !selectedChapter} onClick={handleContinueChapter}>
              {generationMode === "continue_chapter" && !streamContent ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenTool className="mr-2 h-4 w-4" />
              )}
              续写当前章
            </Button>
            <Button variant="outline" disabled={isGenerating || !selectedChapter} onClick={handleRewrite}>
              {generationMode === "rewrite" && !streamContent ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              重写本章
            </Button>
            <Button variant="outline" disabled={isGenerating} onClick={handleContinue}>
              {generationMode === "continue" && !streamContent ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="mr-2 h-4 w-4" />
              )}
              生成下一章
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
