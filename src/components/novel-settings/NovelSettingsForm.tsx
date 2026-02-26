import { useEffect, useMemo, useRef, useState } from "react";
import {
  NovelSettings,
  createDefaultNovelSettings,
  ALL_NOVEL_GENRES,
  createEmptySideCharacter,
  createEmptyAntagonist,
  createEmptyPlotBeat,
  createEmptyTaboo,
  createEmptyReferenceWork,
  EndingType,
  NarrationType,
  ToneType,
  CheatLevel,
  FocusArea,
} from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { GripVertical, Plus, Trash2, Sparkles, Upload, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type GenerateMode = "generate" | "outline" | "characters";

interface NovelSettingsFormProps {
  modelName: string;
  isGenerating: boolean;
  onGenerate: (mode: GenerateMode, settings: NovelSettings) => void;
  onStop: () => void;
}

const STORAGE_KEY = "novel_settings_v1";

const NARRATION_OPTIONS: NarrationType[] = ["第一人称", "第三人称有限", "全知视角"];

const TONE_OPTIONS: ToneType[] = [
  "热血",
  "黑暗",
  "轻松",
  "细腻",
  "幽默",
  "压抑",
  "爽快",
  "文艺",
  "写实",
];

const CHEAT_OPTIONS: CheatLevel[] = [
  "无敌流",
  "稳步成长",
  "真实吃力",
  "反转流",
  "废柴逆袭",
];

const FOCUS_OPTIONS: FocusArea[] = [
  "战斗",
  "感情",
  "智斗",
  "日常",
  "装逼",
  "后宫",
  "权谋",
  "经营",
];

const ENDING_OPTIONS: EndingType[] = ["HE", "BE", "开放", "大团圆", "虐", "爽", "开放式"];

const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

const useDebouncedEffect = (effect: () => void, delay: number, deps: unknown[]) => {
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      effect();
    }, delay);
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export function NovelSettingsForm({
  modelName,
  isGenerating,
  onGenerate,
  onStop,
}: NovelSettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NovelSettings>(() => createDefaultNovelSettings());

  // 初次挂载时从 localStorage 恢复
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NovelSettings>;
      setSettings((prev) => ({
        ...prev,
        ...parsed,
        mainCharacter: { ...prev.mainCharacter, ...(parsed.mainCharacter || {}) },
        worldDetails: { ...prev.worldDetails, ...(parsed.worldDetails || {}) },
        writingStyle: { ...prev.writingStyle, ...(parsed.writingStyle || {}) },
      }));
    } catch {
      // ignore corrupted value
    }
  }, []);

  // 自动保存到 localStorage
  useDebouncedEffect(
    () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // ignore
      }
    },
    400,
    [settings],
  );

  const handleToggleGenre = (g: string) => {
    setSettings((prev) => ({
      ...prev,
      genres: prev.genres.includes(g as any)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g as any],
    }));
  };

  const handleChangeMain = (field: keyof NovelSettings["mainCharacter"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      mainCharacter: {
        ...prev.mainCharacter,
        [field]: value,
      },
    }));
  };

  const handleChangeWorld = (field: keyof NovelSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangeWorldDetail = (field: keyof NovelSettings["worldDetails"], value: string) => {
    setSettings((prev) => ({
      ...prev,
      worldDetails: {
        ...prev.worldDetails,
        [field]: value,
      },
    }));
  };

  const handleChangeWritingStyle = (field: keyof NovelSettings["writingStyle"], value: any) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        [field]: value,
      },
    }));
  };

  const handleToggleTone = (tone: ToneType) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        tones: prev.writingStyle.tones.includes(tone)
          ? prev.writingStyle.tones.filter((t) => t !== tone)
          : [...prev.writingStyle.tones, tone],
      },
    }));
  };

  const handleToggleFocusArea = (area: FocusArea) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        focusAreas: prev.writingStyle.focusAreas.includes(area)
          ? prev.writingStyle.focusAreas.filter((a) => a !== area)
          : [...prev.writingStyle.focusAreas, area],
      },
    }));
  };

  const handleToggleFlag = (field: "nsfw" | "systemNovel" | "harem", value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalWordsLabel = useMemo(() => {
    const v = settings.totalWords;
    if (v >= 1000000) return `${v / 10000}万字`;
    if (v >= 10000) return `${v / 10000}万字`;
    return `${v}字`;
  }, [settings.totalWords]);

  const handleReset = () => {
    setSettings(createDefaultNovelSettings());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    toast({ title: "已重置", description: "表单已恢复为默认状态" });
  };

  const handleExportJson = async () => {
    const json = JSON.stringify(settings, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      toast({ title: "已复制 JSON", description: "表单内容已复制到剪贴板" });
    } catch {
      toast({ title: "复制失败", description: "浏览器不允许访问剪贴板", variant: "destructive" });
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as NovelSettings;
      setSettings((prev) => ({
        ...prev,
        ...parsed,
        mainCharacter: { ...prev.mainCharacter, ...(parsed.mainCharacter || {}) },
        worldDetails: { ...prev.worldDetails, ...(parsed.worldDetails || {}) },
        writingStyle: { ...prev.writingStyle, ...(parsed.writingStyle || {}) },
      }));
      toast({ title: "导入成功" });
    } catch (err: any) {
      toast({
        title: "导入失败",
        description: err?.message || "JSON 解析失败",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  const buildPrompt = (s: NovelSettings): string => {
    const lines: string[] = [];
    lines.push("你现在是一名经验丰富的中文网络小说作者，请严格按照以下设定创作：");
    lines.push("");
    lines.push("【作品信息】");
    lines.push(`题材：${s.genres.join("、") || "未指定"}`);
    lines.push(`一句话简介：${s.oneLinePitch || "未填写"}`);
    lines.push("");
    lines.push("【主角设定】");
    lines.push(
      `姓名：${s.mainCharacter.name || "未命名"}，性别：${s.mainCharacter.gender}，年龄：${
        s.mainCharacter.age || "未知"
      }，性格：${s.mainCharacter.personality || "未填写"}`,
    );
    lines.push("");
    if (s.sideCharacters.length) {
      lines.push("【配角设定】");
      s.sideCharacters.forEach((c, idx) => {
        const relation =
          c.relationshipCustom || c.relationship || "未填写关系";
        const tags = c.personalityTags.join("、") || "未填写性格";
        lines.push(
          `${idx + 1}. ${c.name || "未命名"}（${relation}）：性格【${tags}】，背景【${
            c.background || "未填写"
          }】，能力/弱点【${c.abilities || "未填写"}】，故事作用【${c.role || "未填写"}】，人物弧光【${
            c.arcCustom || c.arc || "未填写"
          }】`,
        );
      });
      lines.push("");
    }
    if (s.antagonists.length) {
      lines.push("【反派 / 敌人】");
      s.antagonists.forEach((c, idx) => {
        const relation =
          c.relationshipCustom || c.relationship || "未填写关系";
        const tags = c.personalityTags.join("、") || "未填写性格";
        lines.push(
          `${idx + 1}. ${c.name || "未命名"}（${relation}）：性格【${tags}】，背景【${
            c.background || "未填写"
          }】，能力/弱点【${c.abilities || "未填写"}】，动机【${
            c.motive || "未填写"
          }】，最终下场【${c.fate || "未填写"}】，人物弧光【${
            c.arcCustom || c.arc || "未填写"
          }】`,
        );
      });
      lines.push("");
    }
    lines.push("【世界观与规则】");
    lines.push(`整体背景：${s.worldSummary || "未填写"}`);
    lines.push(`核心冲突 / 主题：${s.conflictTheme || "未填写"}`);
    lines.push(`力量 / 科技 / 修炼体系：${s.worldDetails.powerSystem || "未填写"}`);
    lines.push(`社会结构与势力：${s.worldDetails.factions || "未填写"}`);
    lines.push(`历史重大事件：${s.worldDetails.historyEvents || "未填写"}`);
    lines.push(`重要地点：${s.worldDetails.importantLocations || "未填写"}`);
    lines.push(`文化习俗与禁忌：${s.worldDetails.cultureAndTaboos || "未填写"}`);
    lines.push("");
    lines.push("【情节大纲】");
    lines.push(`开头（前 30%）：${s.opening || "未填写"}`);
    if (s.middleBeats.length) {
      lines.push("中段高潮与关键转折：");
      s.middleBeats.forEach((b, idx) => {
        lines.push(`${idx + 1}. ${b.title || "未命名节点"}：${b.detail || "未填写"}`);
      });
    }
    if (s.subplots.length) {
      lines.push("主要副线：");
      s.subplots.forEach((b, idx) => {
        lines.push(`${idx + 1}. ${b.title || "未命名副线"}：${b.detail || "未填写"}`);
      });
    }
    lines.push(`结局类型：${s.endingType || "未指定"}`);
    lines.push("");
    lines.push("【写作风格与重点】");
    lines.push(`叙述视角：${s.writingStyle.narration}`);
    lines.push(`整体语气：${s.writingStyle.tones.join("、") || "未指定"}`);
    lines.push(`金手指程度：${s.writingStyle.cheatLevel}`);
    lines.push(`重点描写内容：${s.writingStyle.focusAreas.join("、") || "未指定"}`);
    lines.push(
      `建议篇幅：全书约 ${s.totalWords} 字，每章约 ${s.writingStyle.wordsPerChapter} 字，temperature≈${s.writingStyle.temperature}`,
    );
    if (s.nsfw) lines.push("允许适度 NSFW 内容。");
    if (s.systemNovel) lines.push("这是系统文，主角拥有类似面板/系统等金手指。");
    if (s.harem) lines.push("允许存在后宫元素。");
    lines.push("");
    if (s.taboos.length) {
      lines.push("【写作禁忌】");
      s.taboos.forEach((t, idx) => {
        if (t.content.trim()) lines.push(`${idx + 1}. ${t.content.trim()}`);
      });
      lines.push("");
    }
    if (s.references.length) {
      lines.push("【参考作品与借鉴点】");
      s.references.forEach((r, idx) => {
        lines.push(
          `${idx + 1}. 《${r.title || "未命名"}》：${r.inspiration || "未填写借鉴点"}`,
        );
      });
      lines.push("");
    }
    lines.push("请在创作过程中严格遵守以上所有设定，保证人物行为、世界观规则和情节发展前后一致。");
    return lines.join("\n");
  };

  const handleCopyPrompt = async () => {
    const prompt = buildPrompt(settings);
    try {
      await navigator.clipboard.writeText(prompt);
      toast({ title: "提示词已生成", description: "已复制到剪贴板，可直接粘贴到 AI 中" });
    } catch {
      toast({ title: "复制失败", description: "浏览器不允许访问剪贴板", variant: "destructive" });
    }
  };

  const handleGenerateClick = (mode: GenerateMode) => {
    const normalized: NovelSettings = {
      ...settings,
      chapterWords: settings.writingStyle.wordsPerChapter,
    };
    onGenerate(mode, normalized);
  };

  return (
    <ScrollArea className="w-full border-r border-border/50 md:w-[420px] lg:w-[500px]">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold">创作设定</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              像在起点创作中心一样，先把世界和人物想清楚，再让 AI 帮你写。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-xs">
              模型: {modelName}
            </Badge>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                title="导出 JSON"
                onClick={handleExportJson}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                title="导入 JSON"
                onClick={handleImportClick}
              >
                <Upload className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                title="重置表单"
                onClick={handleReset}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="default"
              className="mt-1 gap-2 text-xs"
              onClick={handleCopyPrompt}
            >
              <Sparkles className="h-3 w-3" />
              生成小说提示词
            </Button>
          </div>
        </div>

        {/* 基础信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基础信息</CardTitle>
            <CardDescription>选择题材、写一段一句话简介，帮助 AI 把握氛围。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>小说类型（可多选）</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_NOVEL_GENRES.map((g) => {
                  const active = settings.genres.includes(g);
                  return (
                    <Badge
                      key={g}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleGenre(g)}
                    >
                      {g}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label>一句话简介</Label>
              <Textarea
                placeholder="例如：卑微社畜穿越异界，一边摸鱼一边靠系统苟成天道之主。"
                value={settings.oneLinePitch}
                onChange={(e) => setSettings({ ...settings, oneLinePitch: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* 主角设定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主角设定</CardTitle>
            <CardDescription>越具体的主角，越容易写出有生命力的故事。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>姓名</Label>
                <Input
                  placeholder="主角名字"
                  value={settings.mainCharacter.name}
                  onChange={(e) => handleChangeMain("name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>性别</Label>
                <Select
                  value={settings.mainCharacter.gender}
                  onValueChange={(v) => handleChangeMain("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>年龄</Label>
                <Input
                  placeholder="如：18"
                  value={settings.mainCharacter.age}
                  onChange={(e) => handleChangeMain("age", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>性格</Label>
                <Input
                  placeholder="如：表面佛系，实际腹黑记仇"
                  value={settings.mainCharacter.personality}
                  onChange={(e) => handleChangeMain("personality", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 世界观与背景 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">世界观与背景</CardTitle>
            <CardDescription>先给 AI 一个大致的舞台，再补充规则和细节。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>世界观 / 时代背景</Label>
              <Textarea
                placeholder="例如：灵气复苏后的现代都市，官方与民间异能组织并存……"
                value={settings.worldSummary}
                onChange={(e) => handleChangeWorld("worldSummary", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>核心冲突 / 主题</Label>
              <Input
                placeholder="例如：底层逆袭、复仇、求真、守护家人、对抗命运……"
                value={settings.conflictTheme}
                onChange={(e) => handleChangeWorld("conflictTheme", e.target.value)}
              />
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="world-details">
                <AccordionTrigger className="text-sm">
                  展开世界观细节（力量体系、势力、历史、地点、禁忌）
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>力量 / 魔法 / 科技 / 修炼体系</Label>
                    <Textarea
                      rows={3}
                      placeholder="例如：以灵根为基础的五行修真体系，每境界分九层……"
                      value={settings.worldDetails.powerSystem}
                      onChange={(e) => handleChangeWorldDetail("powerSystem", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>社会结构与势力分布</Label>
                    <Textarea
                      rows={3}
                      placeholder="朝廷、宗门、家族、黑帮、跨国财团、幕后组织……"
                      value={settings.worldDetails.factions}
                      onChange={(e) => handleChangeWorldDetail("factions", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>历史重大事件</Label>
                    <Textarea
                      rows={3}
                      placeholder="例如：百年前的神魔大战导致大陆四分五裂……"
                      value={settings.worldDetails.historyEvents}
                      onChange={(e) => handleChangeWorldDetail("historyEvents", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>重要地点</Label>
                    <Textarea
                      rows={3}
                      placeholder="主城、学院、秘境、禁区、遗迹、神殿等关键地点。"
                      value={settings.worldDetails.importantLocations}
                      onChange={(e) =>
                        handleChangeWorldDetail("importantLocations", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>文化习俗与禁忌</Label>
                    <Textarea
                      rows={3}
                      placeholder="节日、礼仪、禁忌话题、宗教信仰、婚姻制度……"
                      value={settings.worldDetails.cultureAndTaboos}
                      onChange={(e) =>
                        handleChangeWorldDetail("cultureAndTaboos", e.target.value)
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* 写作风格 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">写作风格与节奏</CardTitle>
            <CardDescription>告诉 AI 你想要哪种阅读体验。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>叙述视角</Label>
                <Select
                  value={settings.writingStyle.narration}
                  onValueChange={(v: NarrationType) =>
                    handleChangeWritingStyle("narration", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择视角" />
                  </SelectTrigger>
                  <SelectContent>
                    {NARRATION_OPTIONS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>金手指程度</Label>
                <Select
                  value={settings.writingStyle.cheatLevel}
                  onValueChange={(v: CheatLevel) =>
                    handleChangeWritingStyle("cheatLevel", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择程度" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHEAT_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>整体语气（可多选）</Label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((tone) => {
                  const active = settings.writingStyle.tones.includes(tone);
                  return (
                    <Badge
                      key={tone}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleTone(tone)}
                    >
                      {tone}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>重点描写内容（可多选）</Label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((area) => {
                  const active = settings.writingStyle.focusAreas.includes(area);
                  return (
                    <Badge
                      key={area}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => handleToggleFocusArea(area)}
                    >
                      {area}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>预计总字数</Label>
                <Input
                  type="number"
                  min={10000}
                  step={10000}
                  value={settings.totalWords}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      totalWords: Number(e.target.value || 0),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">当前：{totalWordsLabel}</p>
              </div>
              <div className="space-y-1">
                <Label>每章建议字数</Label>
                <Input
                  type="number"
                  min={500}
                  step={500}
                  value={settings.writingStyle.wordsPerChapter}
                  onChange={(e) =>
                    handleChangeWritingStyle(
                      "wordsPerChapter",
                      Number(e.target.value || 0),
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>创意度（Temperature）</Label>
                <span className="text-xs text-muted-foreground">
                  {settings.writingStyle.temperature.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[settings.writingStyle.temperature]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => handleChangeWritingStyle("temperature", v)}
              />
              <p className="text-xs text-muted-foreground">低：稳重保守，高：脑洞大开。</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <span>NSFW 内容</span>
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={settings.nsfw}
                  onChange={(e) => handleToggleFlag("nsfw", e.target.checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <span>系统文</span>
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={settings.systemNovel}
                  onChange={(e) => handleToggleFlag("systemNovel", e.target.checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <span>后宫元素</span>
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={settings.harem}
                  onChange={(e) => handleToggleFlag("harem", e.target.checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配角设定 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">配角设定</CardTitle>
              <CardDescription>为主角准备一支有血有肉的配角队伍。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  sideCharacters: [...prev.sideCharacters, createEmptySideCharacter()],
                }))
              }
            >
              <Plus className="h-3 w-3" />
              添加配角
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.sideCharacters.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                还没有配角。可以添加主角的青梅竹马、死党、导师、队友等。
              </p>
            ) : (
              <div className="space-y-3">
                {settings.sideCharacters.map((c, index) => (
                  <div
                    key={c.id}
                    className="rounded-lg border bg-card/40 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <span>配角 {index + 1}</span>
                        {c.name && <span className="text-muted-foreground">· {c.name}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: moveItem(prev.sideCharacters, index, index - 1),
                            }))
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === settings.sideCharacters.length - 1}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: moveItem(prev.sideCharacters, index, index + 1),
                            }))
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: prev.sideCharacters.filter((x) => x.id !== c.id),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>姓名 / 昵称</Label>
                        <Input
                          placeholder="如：李师兄 / 小胖"
                          value={c.name}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: prev.sideCharacters.map((s) =>
                                s.id === c.id ? { ...s, name: e.target.value } : s,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>性别 / 年龄</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={c.gender}
                            onValueChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                sideCharacters: prev.sideCharacters.map((s) =>
                                  s.id === c.id ? { ...s, gender: v as any } : s,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="性别" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="男">男</SelectItem>
                              <SelectItem value="女">女</SelectItem>
                              <SelectItem value="其他">其他</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="年龄"
                            value={c.age}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                sideCharacters: prev.sideCharacters.map((s) =>
                                  s.id === c.id ? { ...s, age: e.target.value } : s,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>与主角关系</Label>
                        <Select
                          value={c.relationship || "其他"}
                          onValueChange={(v) =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: prev.sideCharacters.map((s) =>
                                s.id === c.id
                                  ? {
                                      ...s,
                                      relationship: v === "其他" ? "" : (v as any),
                                    }
                                  : s,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择关系" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="盟友">盟友</SelectItem>
                            <SelectItem value="恋人">恋人</SelectItem>
                            <SelectItem value="导师">导师</SelectItem>
                            <SelectItem value="家人">家人</SelectItem>
                            <SelectItem value="竞争者">竞争者</SelectItem>
                            <SelectItem value="炮灰">炮灰</SelectItem>
                            <SelectItem value="死敌">死敌</SelectItem>
                            <SelectItem value="其他">自定义</SelectItem>
                          </SelectContent>
                        </Select>
                        {!c.relationship && (
                          <Input
                            className="mt-1"
                            placeholder="自定义关系，如：青梅竹马、损友、发小"
                            value={c.relationshipCustom}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                sideCharacters: prev.sideCharacters.map((s) =>
                                  s.id === c.id ? { ...s, relationshipCustom: e.target.value } : s,
                                ),
                              }))
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>人物弧光</Label>
                        <Select
                          value={c.arc || "其他"}
                          onValueChange={(v) =>
                            setSettings((prev) => ({
                              ...prev,
                              sideCharacters: prev.sideCharacters.map((s) =>
                                s.id === c.id
                                  ? {
                                      ...s,
                                      arc: v === "其他" ? "" : (v as any),
                                    }
                                  : s,
                              ),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="选择弧光" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="成长">成长</SelectItem>
                            <SelectItem value="黑化">黑化</SelectItem>
                            <SelectItem value="救赎">救赎</SelectItem>
                            <SelectItem value="牺牲">牺牲</SelectItem>
                            <SelectItem value="退场">退场</SelectItem>
                            <SelectItem value="保持不变">保持不变</SelectItem>
                            <SelectItem value="其他">自定义</SelectItem>
                          </SelectContent>
                        </Select>
                        {!c.arc && (
                          <Input
                            className="mt-1"
                            placeholder="自定义人物弧光，如：从胆小鬼到独当一面"
                            value={c.arcCustom}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                sideCharacters: prev.sideCharacters.map((s) =>
                                  s.id === c.id ? { ...s, arcCustom: e.target.value } : s,
                                ),
                              }))
                            }
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>性格标签（用逗号或顿号分隔）</Label>
                      <Input
                        placeholder="如：话唠、忠诚、刀子嘴豆腐心"
                        value={c.personalityTags.join("、")}
                        onChange={(e) => {
                          const value = e.target.value;
                          const tags = value
                            .split(/[,，、\s]+/)
                            .map((t) => t.trim())
                            .filter(Boolean);
                          setSettings((prev) => ({
                            ...prev,
                            sideCharacters: prev.sideCharacters.map((s) =>
                              s.id === c.id ? { ...s, personalityTags: tags } : s,
                            ),
                          }));
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>身份背景（一句话）</Label>
                      <Input
                        placeholder="如：从小跟随主角一起长大的邻家女孩，是某大宗门的弃徒。"
                        value={c.background}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            sideCharacters: prev.sideCharacters.map((s) =>
                              s.id === c.id ? { ...s, background: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>能力 / 特长 / 弱点</Label>
                      <Textarea
                        rows={2}
                        placeholder="如：擅长情报搜集和易容，但战斗力一般，容易情绪化。"
                        value={c.abilities}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            sideCharacters: prev.sideCharacters.map((s) =>
                              s.id === c.id ? { ...s, abilities: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>在故事中的作用</Label>
                      <Textarea
                        rows={2}
                        placeholder="如：负责缓和气氛、提供情报、偶尔被绑架推动剧情。"
                        value={c.role}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            sideCharacters: prev.sideCharacters.map((s) =>
                              s.id === c.id ? { ...s, role: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 反派 / 敌人 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">反派 / 主要敌人</CardTitle>
              <CardDescription>反派的动机和下场，会极大影响故事张力。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  antagonists: [...prev.antagonists, createEmptyAntagonist()],
                }))
              }
            >
              <Plus className="h-3 w-3" />
              添加反派
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.antagonists.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                可以添加 1–3 个主要反派：大 Boss、中途反派、隐藏幕后黑手等。
              </p>
            ) : (
              <div className="space-y-3">
                {settings.antagonists.map((c, index) => (
                  <div key={c.id} className="rounded-lg border bg-card/40 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <span>反派 {index + 1}</span>
                        {c.name && <span className="text-muted-foreground">· {c.name}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              antagonists: moveItem(prev.antagonists, index, index - 1),
                            }))
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={index === settings.antagonists.length - 1}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              antagonists: moveItem(prev.antagonists, index, index + 1),
                            }))
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              antagonists: prev.antagonists.filter((x) => x.id !== c.id),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>姓名 / 外号</Label>
                        <Input
                          placeholder="如：黑袍人 / 深渊君主"
                          value={c.name}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              antagonists: prev.antagonists.map((s) =>
                                s.id === c.id ? { ...s, name: e.target.value } : s,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>性别 / 年龄</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={c.gender}
                            onValueChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                antagonists: prev.antagonists.map((s) =>
                                  s.id === c.id ? { ...s, gender: v as any } : s,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="性别" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="男">男</SelectItem>
                              <SelectItem value="女">女</SelectItem>
                              <SelectItem value="其他">其他</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="年龄"
                            value={c.age}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                antagonists: prev.antagonists.map((s) =>
                                  s.id === c.id ? { ...s, age: e.target.value } : s,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>动机</Label>
                      <Input
                        placeholder="如：想打破天道枷锁、复活爱人、纯粹享受毁灭。"
                        value={c.motive}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            antagonists: prev.antagonists.map((s) =>
                              s.id === c.id ? { ...s, motive: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>最终下场</Label>
                      <Input
                        placeholder="如：被主角击败但留下隐患 / 自我牺牲 / 被更大的势力收编。"
                        value={c.fate}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            antagonists: prev.antagonists.map((s) =>
                              s.id === c.id ? { ...s, fate: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>能力与弱点</Label>
                      <Textarea
                        rows={2}
                        placeholder="如：掌控时间的能力，但每次使用都会消耗寿命。"
                        value={c.abilities}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            antagonists: prev.antagonists.map((s) =>
                              s.id === c.id ? { ...s, abilities: e.target.value } : s,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 情节大纲 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">情节大纲</CardTitle>
            <CardDescription>为 AI 提供一个清晰的剧情走向骨架。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>开头（前 30%）</Label>
              <Textarea
                rows={3}
                placeholder="主角的日常状态、引发故事的导火索、第一次转折……"
                value={settings.opening}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    opening: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>中段高潮与关键转折</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      middleBeats: [...prev.middleBeats, createEmptyPlotBeat()],
                    }))
                  }
                >
                  <Plus className="h-3 w-3" />
                  添加节点
                </Button>
              </div>
              {settings.middleBeats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  建议添加 3–5 个关键节点，例如：首次挫败、真相揭露、分队行动、大决战前夜等。
                </p>
              ) : (
                <div className="space-y-2">
                  {settings.middleBeats.map((b, index) => (
                    <div
                      key={b.id}
                      className="grid grid-cols-[auto,1fr,auto] items-start gap-2 rounded-md border bg-card/40 p-2"
                    >
                      <div className="mt-1 text-xs text-muted-foreground">{index + 1}.</div>
                      <div className="space-y-1">
                        <Input
                          placeholder="节点标题，如：主角被迫离开安全区"
                          value={b.title}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              middleBeats: prev.middleBeats.map((x) =>
                                x.id === b.id ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                        <Textarea
                          rows={2}
                          placeholder="简要描述该节点发生了什么、改变了什么。"
                          value={b.detail}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              middleBeats: prev.middleBeats.map((x) =>
                                x.id === b.id ? { ...x, detail: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              middleBeats: moveItem(prev.middleBeats, index, index - 1),
                            }))
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === settings.middleBeats.length - 1}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              middleBeats: moveItem(prev.middleBeats, index, index + 1),
                            }))
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              middleBeats: prev.middleBeats.filter((x) => x.id !== b.id),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>主要副线</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      subplots: [...prev.subplots, createEmptyPlotBeat()],
                    }))
                  }
                >
                  <Plus className="h-3 w-3" />
                  添加副线
                </Button>
              </div>
              {settings.subplots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  比如感情线、师门线、家族线、国家战争线等，每条一两句话说明即可。
                </p>
              ) : (
                <div className="space-y-2">
                  {settings.subplots.map((b, index) => (
                    <div
                      key={b.id}
                      className="grid grid-cols-[auto,1fr,auto] items-start gap-2 rounded-md border bg-card/40 p-2"
                    >
                      <div className="mt-1 text-xs text-muted-foreground">{index + 1}.</div>
                      <div className="space-y-1">
                        <Input
                          placeholder="副线名称，如：师徒情感线"
                          value={b.title}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              subplots: prev.subplots.map((x) =>
                                x.id === b.id ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                        <Textarea
                          rows={2}
                          placeholder="这一条副线的大致走向、开头与收束方式。"
                          value={b.detail}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              subplots: prev.subplots.map((x) =>
                                x.id === b.id ? { ...x, detail: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === 0}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              subplots: moveItem(prev.subplots, index, index - 1),
                            }))
                          }
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          disabled={index === settings.subplots.length - 1}
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              subplots: moveItem(prev.subplots, index, index + 1),
                            }))
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              subplots: prev.subplots.filter((x) => x.id !== b.id),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>结局类型</Label>
              <Select
                value={settings.endingType || ""}
                onValueChange={(v: EndingType) =>
                  setSettings((prev) => ({
                    ...prev,
                    endingType: v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择结局风格" />
                </SelectTrigger>
                <SelectContent>
                  {ENDING_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 禁忌与额外要求 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">禁忌与额外要求</CardTitle>
              <CardDescription>告诉 AI 绝对不能碰的雷点，以及你特别在意的写作要求。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  taboos: [...prev.taboos, createEmptyTaboo()],
                }))
              }
            >
              <Plus className="h-3 w-3" />
              添加禁忌
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.taboos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                例如：禁止 NTR、禁止虐主、避免过度血腥、避免现实政治等。
              </p>
            ) : (
              <div className="space-y-2">
                {settings.taboos.map((t, index) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-2 rounded-md border bg-card/40 p-2"
                  >
                    <span className="mt-1 text-xs text-muted-foreground">{index + 1}.</span>
                    <Textarea
                      rows={2}
                      placeholder="不想出现的内容或写作雷点。"
                      value={t.content}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          taboos: prev.taboos.map((x) =>
                            x.id === t.id ? { ...x, content: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="mt-1 h-7 w-7 text-destructive"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          taboos: prev.taboos.filter((x) => x.id !== t.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 参考作品 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">参考作品</CardTitle>
              <CardDescription>可以告诉 AI 你想要的味道，但不要照抄剧情。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  references: [...prev.references, createEmptyReferenceWork()],
                }))
              }
            >
              <Plus className="h-3 w-3" />
              添加作品
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.references.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                例如：世界观像《斗破苍穹》，主角性格像《诡秘之主》，感情线像某部作品等。
              </p>
            ) : (
              <div className="space-y-2">
                {settings.references.map((r, index) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[auto,1fr,auto] items-start gap-2 rounded-md border bg-card/40 p-2"
                  >
                    <span className="mt-2 text-xs text-muted-foreground">{index + 1}.</span>
                    <div className="space-y-1">
                      <Input
                        placeholder="作品名，如：斗破苍穹"
                        value={r.title}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            references: prev.references.map((x) =>
                              x.id === r.id ? { ...x, title: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <Textarea
                        rows={2}
                        placeholder="具体借鉴点，如：世界观设定、修炼体系、主角成长曲线、叙事节奏等。"
                        value={r.inspiration}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            references: prev.references.map((x) =>
                              x.id === r.id ? { ...x, inspiration: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="mt-1 h-7 w-7 text-destructive"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          references: prev.references.filter((x) => x.id !== r.id),
                        }))
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 底部操作区 */}
        <Card>
          <CardContent className="space-y-3 pt-4">
            {isGenerating ? (
              <Button className="w-full" size="lg" variant="destructive" onClick={onStop}>
                停止生成
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleGenerateClick("generate")}
              >
                开始创作
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                disabled={isGenerating}
                onClick={() => handleGenerateClick("outline")}
              >
                生成大纲
              </Button>
              <Button
                variant="secondary"
                disabled={isGenerating}
                onClick={() => handleGenerateClick("characters")}
              >
                生成人物卡
              </Button>
            </div>
          </CardContent>
        </Card>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportChange}
        />
      </div>
    </ScrollArea>
  );
}

