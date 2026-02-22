import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, PenTool, RotateCcw, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export default function NovelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
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
      if (chaptersRes.data && chaptersRes.data.length > 0) {
        setSelectedChapter(chaptersRes.data[0] as Chapter);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

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
          <span className="font-serif text-sm">
            第{selectedChapter.chapter_number}章 {selectedChapter.title}
          </span>
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
                  onClick={() => setSelectedChapter(ch)}
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
          <div className="hidden md:block" />
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(true)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {selectedChapter ? (
            <div className="mx-auto max-w-3xl px-6 py-10">
              <h2 className="mb-8 font-serif text-2xl font-bold text-center">
                第{selectedChapter.chapter_number}章 {selectedChapter.title}
              </h2>
              <div className="font-serif text-base leading-loose text-foreground/85 whitespace-pre-wrap">
                {selectedChapter.content || "暂无内容"}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>选择一个章节开始阅读</p>
            </div>
          )}
        </ScrollArea>
        {/* Action bar */}
        <div className="flex items-center justify-center gap-3 border-t border-border/50 px-4 py-3">
          <Button variant="secondary" disabled>
            <PenTool className="mr-2 h-4 w-4" />
            继续写作
          </Button>
          <Button variant="outline" disabled>
            <RotateCcw className="mr-2 h-4 w-4" />
            重写本章
          </Button>
          <Button variant="outline" disabled>
            <ChevronRight className="mr-2 h-4 w-4" />
            生成下一章
          </Button>
        </div>
      </div>
    </div>
  );
}
