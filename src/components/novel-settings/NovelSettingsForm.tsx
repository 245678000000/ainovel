import { useEffect, useRef, useState, useCallback } from "react";
import {
  NovelSettings,
  createDefaultNovelSettings,
  createEmptySideCharacter,
  createEmptyAntagonist,
  createEmptyPlotBeat,
  createEmptyTaboo,
  createEmptyReferenceWork,
} from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 引入拆分后的 7 个子组件
import { GenreSelector } from "./GenreSelector";
import { CharacterSettings } from "./CharacterSettings";
import { WorldSettings } from "./WorldSettings";
import { PlotSettings } from "./PlotSettings";
import { WritingStyleSettings } from "./WritingStyleSettings";
import { TabooSettings } from "./TabooSettings";
import { ReferenceSettings } from "./ReferenceSettings";

export type GenerateMode = "generate" | "outline" | "characters";

interface NovelSettingsFormProps {
  modelName: string;
  isGenerating: boolean;
  onGenerate: (mode: GenerateMode, settings: NovelSettings) => void;
  onStop: () => void;
}

const STORAGE_KEY = "novel_settings_v1";

/**
 * 封装通用剪贴板复制逻辑，提供现代 API 与传统命令的降级方案
 * @param text 需要复制的文本内容
 * @returns 异步返回复制是否成功
 */
async function copyToClipboard(text: string): Promise<boolean> {
  // 1. 优先尝试使用现代 Clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 仅记录警告，继续执行下方的降级方案
      console.warn("现代 Clipboard API 复制失败，尝试降级方案", err);
    }
  }

  // 2. 传统降级方案：动态创建 textarea 并执行 copy 指令
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // 隐藏 textarea 避免页面抖动，且需保证其在文档流中可选中
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", ""); // 避免在移动端 iOS 设备上拉起键盘
    document.body.appendChild(textarea);
    textarea.select();
    
    // 执行复制命令并返回状态
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error("降级复制方案执行出错", err);
    return false;
  }
}

// 400ms 的防抖保存 hook
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
      if (!parsed || typeof parsed !== "object") return;

      setSettings((prev) => {
        const sideCharacters = Array.isArray(parsed.sideCharacters)
          ? parsed.sideCharacters.map((item) => ({ ...createEmptySideCharacter(), ...item }))
          : prev.sideCharacters || [];
        const antagonists = Array.isArray(parsed.antagonists)
          ? parsed.antagonists.map((item) => ({ ...createEmptyAntagonist(), ...item }))
          : prev.antagonists || [];
        const taboos = Array.isArray(parsed.taboos)
          ? parsed.taboos.map((item) => ({ ...createEmptyTaboo(), ...item }))
          : prev.taboos || [];
        const references = Array.isArray(parsed.references)
          ? parsed.references.map((item) => ({ ...createEmptyReferenceWork(), ...item }))
          : prev.references || [];
        const middleBeats = Array.isArray(parsed.middleBeats)
          ? parsed.middleBeats.map((item) => ({ ...createEmptyPlotBeat(), ...item }))
          : prev.middleBeats || [];
        const subplots = Array.isArray(parsed.subplots)
          ? parsed.subplots.map((item) => ({ ...createEmptyPlotBeat(), ...item }))
          : prev.subplots || [];
        const genres = Array.isArray(parsed.genres)
          ? parsed.genres
          : (prev.genres || []);

        return {
          ...prev,
          ...parsed,
          genres,
          mainCharacter: { ...prev.mainCharacter, ...(parsed.mainCharacter || {}) },
          worldDetails: { ...prev.worldDetails, ...(parsed.worldDetails || {}) },
          writingStyle: { ...prev.writingStyle, ...(parsed.writingStyle || {}) },
          sideCharacters,
          antagonists,
          taboos,
          references,
          middleBeats,
          subplots,
        };
      });
    } catch {
      // 忽略损坏的缓存数据
    }
  }, []);

  // 自动保存到 localStorage (防抖时间为 400ms)
  useDebouncedEffect(
    () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // 忽略写入错误
      }
    },
    400,
    [settings],
  );

  // 稳定的设置项更新回调函数，作为 Props 传给子组件
  // 它的引用地址保持稳定，从而使得子组件的 React.memo Props 浅比较能成立
  const onUpdateSettings = useCallback((
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => {
    setSettings((prev) => {
      if (typeof updater === "function") {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);

  // 重置表单为默认值
  const handleReset = () => {
    setSettings(createDefaultNovelSettings());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略错误
    }
    toast({ title: "已重置", description: "表单已恢复为默认状态" });
  };

  // 导出 JSON 数据并复制到剪贴板
  const handleExportJson = async () => {
    const json = JSON.stringify(settings, null, 2);
    const success = await copyToClipboard(json);
    if (success) {
      toast({ title: "已复制 JSON", description: "表单内容已复制到剪贴板" });
    } else {
      toast({ title: "复制失败", description: "浏览器不允许访问剪贴板", variant: "destructive" });
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 从 JSON 配置文件中导入数据并合并更新状态
  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as NovelSettings;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("导入的数据格式不正确");
      }

      setSettings((prev) => {
        const sideCharacters = Array.isArray(parsed.sideCharacters)
          ? parsed.sideCharacters.map((item) => ({ ...createEmptySideCharacter(), ...item }))
          : prev.sideCharacters || [];
        const antagonists = Array.isArray(parsed.antagonists)
          ? parsed.antagonists.map((item) => ({ ...createEmptyAntagonist(), ...item }))
          : prev.antagonists || [];
        const taboos = Array.isArray(parsed.taboos)
          ? parsed.taboos.map((item) => ({ ...createEmptyTaboo(), ...item }))
          : prev.taboos || [];
        const references = Array.isArray(parsed.references)
          ? parsed.references.map((item) => ({ ...createEmptyReferenceWork(), ...item }))
          : prev.references || [];
        const middleBeats = Array.isArray(parsed.middleBeats)
          ? parsed.middleBeats.map((item) => ({ ...createEmptyPlotBeat(), ...item }))
          : prev.middleBeats || [];
        const subplots = Array.isArray(parsed.subplots)
          ? parsed.subplots.map((item) => ({ ...createEmptyPlotBeat(), ...item }))
          : prev.subplots || [];
        const genres = Array.isArray(parsed.genres)
          ? parsed.genres
          : (prev.genres || []);

        return {
          ...prev,
          ...parsed,
          genres,
          mainCharacter: { ...prev.mainCharacter, ...(parsed.mainCharacter || {}) },
          worldDetails: { ...prev.worldDetails, ...(parsed.worldDetails || {}) },
          writingStyle: { ...prev.writingStyle, ...(parsed.writingStyle || {}) },
          sideCharacters,
          antagonists,
          taboos,
          references,
          middleBeats,
          subplots,
        };
      });
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

  // 拼接并构建小说创作提示词
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
    lines.push(`社会结构与势力分布：${s.worldDetails.factions || "未填写"}`);
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

  // 生成提示词并复制到剪贴板
  const handleCopyPrompt = async () => {
    const prompt = buildPrompt(settings);
    const success = await copyToClipboard(prompt);
    if (success) {
      toast({ title: "提示词已生成", description: "已复制到剪贴板，可直接粘贴到 AI 中" });
    } else {
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
    <ScrollArea className="w-full border-r border-white/20 dark:border-white/5 md:w-[420px] lg:w-[500px] glass">
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

        {/* 1. 题材与基础设定 */}
        <GenreSelector
          genres={settings.genres}
          oneLinePitch={settings.oneLinePitch}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 2. 主角、配角与反派角色设定 */}
        <CharacterSettings
          mainCharacter={settings.mainCharacter}
          sideCharacters={settings.sideCharacters}
          antagonists={settings.antagonists}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 3. 世界设定 */}
        <WorldSettings
          worldSummary={settings.worldSummary}
          conflictTheme={settings.conflictTheme}
          worldDetails={settings.worldDetails}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 4. 写作风格与语气 */}
        <WritingStyleSettings
          writingStyle={settings.writingStyle}
          totalWords={settings.totalWords}
          nsfw={settings.nsfw}
          systemNovel={settings.systemNovel}
          harem={settings.harem}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 5. 情节大纲设定 */}
        <PlotSettings
          opening={settings.opening}
          middleBeats={settings.middleBeats}
          endingType={settings.endingType}
          subplots={settings.subplots}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 6. 写作雷点与禁忌 */}
        <TabooSettings
          taboos={settings.taboos}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 7. 参考作品设定 */}
        <ReferenceSettings
          references={settings.references}
          onUpdateSettings={onUpdateSettings}
        />

        {/* 底部操作区 */}
        <Card className="glass border-white/20 dark:border-white/5">
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
