import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { streamNovelGeneration } from "@/lib/stream-novel";
import { PROVIDER_TYPES } from "@/lib/provider-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PenTool, BookOpen, Users, Loader2, Sparkles, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const allGenres = ["玄幻", "仙侠", "都市", "言情", "科幻", "系统文", "后宫", "无限流", "悬疑", "历史", "军事", "游戏"];
const allStyles = ["爽文", "虐文", "细腻", "幽默", "热血", "暗黑", "轻松", "文艺"];
const narrations = ["第三人称", "第一人称"];

export default function Generate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [genres, setGenres] = useState<string[]>(
    searchParams.get("genre") ? [searchParams.get("genre")!] : []
  );
  const [protagonistName, setProtagonistName] = useState(searchParams.get("protagonist") || "");
  const [protagonistGender, setProtagonistGender] = useState("男");
  const [protagonistAge, setProtagonistAge] = useState("");
  const [protagonistPersonality, setProtagonistPersonality] = useState("");
  const [worldSetting, setWorldSetting] = useState("");
  const [conflict, setConflict] = useState("");
  const [totalWords, setTotalWords] = useState("100000");
  const [chapterWords, setChapterWords] = useState("3000");
  const [style, setStyle] = useState(searchParams.get("style") || "");
  const [narration, setNarration] = useState("第三人称");
  const [nsfw, setNsfw] = useState(false);
  const [systemNovel, setSystemNovel] = useState(false);
  const [harem, setHarem] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [synopsis, setSynopsis] = useState(searchParams.get("synopsis") || "");

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [generationMode, setGenerationMode] = useState("");
  const [providers, setProviders] = useState<{ provider_type: string; api_key: string | null; is_default: boolean | null; name: string; default_model: string | null; enabled: boolean | null; api_base_url: string | null }[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const abortRef = useRef(false);

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
      setNsfw(profile.nsfw_enabled || false);
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

  const getSettings = () => ({
    genres,
    protagonist: {
      name: protagonistName,
      gender: protagonistGender,
      age: protagonistAge,
      personality: protagonistPersonality,
    },
    worldSetting,
    conflict,
    synopsis,
    totalWords,
    chapterWords,
    style,
    narration,
    nsfw,
    systemNovel,
    harem,
  });

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
  const activeModelType = matchedProvider?.provider_type || defaultModel;
  const displayModelName =
    PROVIDER_TYPES.find((p) => p.value.toLowerCase() === activeModelType.toLowerCase())?.label ||
    matchedProvider?.name ||
    defaultModel;

  const handleGenerate = async (mode: "generate" | "outline" | "characters") => {
    if (!currentApiKey) {
      toast({ title: "缺少API密钥", description: `请先在设置中配置 ${defaultModel} 的API密钥`, variant: "destructive" });
      return;
    }
    if (!session?.access_token) {
      toast({ title: "未登录", description: "请先登录", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setPreviewContent("");
    setGenerationMode(mode);
    abortRef.current = false;
    let fullContent = "";

    await streamNovelGeneration({
      params: {
        mode,
        settings: getSettings(),
        model: defaultModel,
        apiKey: currentApiKey,
        apiBaseUrl: matchedProvider?.api_base_url || undefined,
        actualModel: matchedProvider?.default_model || undefined,
        temperature: temperature[0],
        chapterNumber: 1,
      },
      onDelta: (text) => {
        if (abortRef.current) return;
        fullContent += text;
        setPreviewContent(fullContent);
      },
      onDone: async () => {
        setIsGenerating(false);
        if (abortRef.current) return;

        // Auto-save based on mode
        if (mode === "generate" && user) {
          try {
            // Create novel
            const { data: novel, error: novelErr } = await supabase
              .from("novels")
              .insert({
                user_id: user.id,
                title: protagonistName ? `${protagonistName}的故事` : "未命名小说",
                genre: genres,
                settings_json: getSettings(),
                word_count: fullContent.length,
              })
              .select()
              .single();

            if (novelErr) throw novelErr;

            // Extract title from content (first line)
            const lines = fullContent.split("\n").filter((l) => l.trim());
            const chapterTitle = lines[0]?.replace(/^#+\s*/, "").replace(/^第.+章\s*/, "") || "第一章";
            const chapterContent = lines.slice(1).join("\n").trim();

            await supabase.from("chapters").insert({
              novel_id: novel.id,
              chapter_number: 1,
              title: chapterTitle,
              content: chapterContent,
              word_count: chapterContent.length,
            });

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
        setIsGenerating(false);
        toast({ title: "生成失败", description: error, variant: "destructive" });
      },
      accessToken: session.access_token,
    });
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsGenerating(false);
  };

  const toggleGenre = (g: string) => {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen">
      {/* Left: Settings Form */}
      <ScrollArea className="w-full border-r border-border/50 md:w-[420px] lg:w-[480px]">
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-xl font-bold">创作设定</h1>
            <Badge variant="outline" className="text-xs">
              模型: {displayModelName}
            </Badge>
          </div>

          {!currentApiKey && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-3 text-sm text-destructive">
                ⚠️ 请先前往<button onClick={() => navigate("/settings")} className="underline mx-1 font-medium">设置 → 模型设置</button>配置 {displayModelName} 的 API Key
              </CardContent>
            </Card>
          )}

          {/* Genre Multi-select */}
          <div className="space-y-2">
            <Label>小说类型（可多选）</Label>
            <div className="flex flex-wrap gap-2">
              {allGenres.map((g) => (
                <Badge
                  key={g}
                  variant={genres.includes(g) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Protagonist */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">主角设定</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">姓名</Label>
                <Input placeholder="主角名字" value={protagonistName} onChange={(e) => setProtagonistName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">性别</Label>
                <Select value={protagonistGender} onValueChange={setProtagonistGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">年龄</Label>
                <Input placeholder="如：18" value={protagonistAge} onChange={(e) => setProtagonistAge(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">性格</Label>
                <Input placeholder="如：冷静、果断" value={protagonistPersonality} onChange={(e) => setProtagonistPersonality(e.target.value)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* World & Conflict */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>世界观 / 时代背景</Label>
              <Textarea placeholder="描述故事发生的世界..." value={worldSetting} onChange={(e) => setWorldSetting(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>核心冲突 / 主题</Label>
              <Input placeholder="如：复仇、成长、拯救世界..." value={conflict} onChange={(e) => setConflict(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>一句话简介</Label>
              <Textarea placeholder="用一句话描述你的故事..." value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={2} />
            </div>
          </div>

          <Separator />

          {/* Word count & Style */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>预计总字数</Label>
              <Select value={totalWords} onValueChange={setTotalWords}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50000">5万字</SelectItem>
                  <SelectItem value="100000">10万字</SelectItem>
                  <SelectItem value="300000">30万字</SelectItem>
                  <SelectItem value="500000">50万字</SelectItem>
                  <SelectItem value="1000000">100万字</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>单章字数</Label>
              <Select value={chapterWords} onValueChange={setChapterWords}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">2000字</SelectItem>
                  <SelectItem value="3000">3000字</SelectItem>
                  <SelectItem value="5000">5000字</SelectItem>
                  <SelectItem value="8000">8000字</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>写作风格</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent>
                  {allStyles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>叙事视角</Label>
              <Select value={narration} onValueChange={setNarration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {narrations.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>NSFW 内容</Label>
              <Switch checked={nsfw} onCheckedChange={setNsfw} />
            </div>
            <div className="flex items-center justify-between">
              <Label>系统文模式</Label>
              <Switch checked={systemNovel} onCheckedChange={setSystemNovel} />
            </div>
            <div className="flex items-center justify-between">
              <Label>后宫模式</Label>
              <Switch checked={harem} onCheckedChange={setHarem} />
            </div>
          </div>

          <Separator />

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>创意度 (Temperature)</Label>
              <span className="text-sm text-muted-foreground">{temperature[0]}</span>
            </div>
            <Slider value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.05} />
            <p className="text-xs text-muted-foreground">低=保守严谨，高=天马行空</p>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3 pb-6">
            {isGenerating ? (
              <Button className="w-full" size="lg" variant="destructive" onClick={handleStop}>
                <StopCircle className="mr-2 h-4 w-4" />
                停止生成
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={() => handleGenerate("generate")} disabled={!currentApiKey}>
                <PenTool className="mr-2 h-4 w-4" />
                开始创作
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" disabled={isGenerating || !currentApiKey} onClick={() => handleGenerate("outline")}>
                <BookOpen className="mr-2 h-4 w-4" />
                生成大纲
              </Button>
              <Button variant="secondary" disabled={isGenerating || !currentApiKey} onClick={() => handleGenerate("characters")}>
                <Users className="mr-2 h-4 w-4" />
                生成人物卡
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

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
