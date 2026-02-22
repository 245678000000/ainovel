import { useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { PenTool, BookOpen, Users, Loader2, Sparkles } from "lucide-react";

const allGenres = ["玄幻", "仙侠", "都市", "言情", "科幻", "系统文", "后宫", "无限流", "悬疑", "历史", "军事", "游戏"];
const allStyles = ["爽文", "虐文", "细腻", "幽默", "热血", "暗黑", "轻松", "文艺"];
const narrations = ["第三人称", "第一人称"];

export default function Generate() {
  const [searchParams] = useSearchParams();

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

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] md:h-screen">
      {/* Left: Settings Form */}
      <ScrollArea className="w-full border-r border-border/50 md:w-[420px] lg:w-[480px]">
        <div className="space-y-6 p-4 md:p-6">
          <h1 className="font-serif text-xl font-bold">创作设定</h1>

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
            <Button className="w-full" size="lg" disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
              开始创作
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" disabled={isGenerating}>
                <BookOpen className="mr-2 h-4 w-4" />
                生成大纲
              </Button>
              <Button variant="secondary" disabled={isGenerating}>
                <Users className="mr-2 h-4 w-4" />
                生成人物卡
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Right: Preview Area */}
      <div className="hidden flex-1 flex-col md:flex">
        <div className="flex h-12 items-center border-b border-border/50 px-6">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">实时预览</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          {previewContent ? (
            <ScrollArea className="h-full w-full">
              <div className="prose prose-invert max-w-none font-serif leading-relaxed">
                {previewContent}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-4 h-16 w-16 opacity-20" />
              <p className="text-lg">设定好参数后，点击"开始创作"</p>
              <p className="text-sm">AI将在这里实时生成你的小说</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
