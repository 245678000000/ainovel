import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Download, Clock, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Novel {
  id: string;
  title: string;
  genre: string[];
  word_count: number;
  updated_at: string;
  outline: string | null;
}

const genres = ["全部", "玄幻", "仙侠", "都市", "言情", "科幻", "系统文", "后宫", "无限流", "悬疑", "历史"];

export default function LibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [novels, setNovels] = useState<Novel[]>([]);
  const [search, setSearch] = useState("");
  const [filterGenre, setFilterGenre] = useState("全部");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNovels = async () => {
      const { data, error } = await supabase
        .from("novels")
        .select("id, title, genre, word_count, updated_at, outline")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        toast({ title: "加载失败", description: error.message, variant: "destructive" });
      } else {
        setNovels(data || []);
      }
      setLoading(false);
    };
    fetchNovels();
  }, [user]);

  const filtered = novels.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre = filterGenre === "全部" || (n.genre && n.genre.includes(filterGenre));
    return matchSearch && matchGenre;
  });

  const exportNovel = async (novel: Novel, format: "txt" | "md") => {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("chapter_number, title, content")
      .eq("novel_id", novel.id)
      .order("chapter_number");

    if (!chapters || chapters.length === 0) {
      toast({ title: "无章节内容", description: "该小说暂无章节可导出", variant: "destructive" });
      return;
    }

    let content = `${novel.title}\n\n`;
    chapters.forEach((ch) => {
      content += format === "md"
        ? `## 第${ch.chapter_number}章 ${ch.title}\n\n${ch.content}\n\n`
        : `第${ch.chapter_number}章 ${ch.title}\n\n${ch.content}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${novel.title}.${format === "md" ? "md" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-serif text-2xl font-bold">我的书库</h1>
        <Button onClick={() => navigate("/generate")}>
          <Plus className="mr-2 h-4 w-4" />
          新建小说
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索小说..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterGenre} onValueChange={setFilterGenre}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {genres.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Novels Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-20">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground/20" />
          <p className="text-muted-foreground">还没有小说，开始创作吧！</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((novel) => (
            <Card
              key={novel.id}
              className="glass cursor-pointer transition-all hover:glow-purple hover:border-primary/30"
              onClick={() => navigate(`/novel/${novel.id}`)}
            >
              <CardContent className="p-5">
                <h3 className="mb-2 font-serif text-lg font-bold text-foreground truncate">{novel.title}</h3>
                <div className="mb-3 flex flex-wrap gap-1">
                  {novel.genre?.map((g) => (
                    <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {(novel.word_count || 0).toLocaleString()}字
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(novel.updated_at).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="ghost" onClick={() => exportNovel(novel, "txt")}>
                    <Download className="mr-1 h-3 w-3" />TXT
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportNovel(novel, "md")}>
                    <Download className="mr-1 h-3 w-3" />MD
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
