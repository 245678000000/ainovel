import React from "react";
import {
  WritingStyle,
  NovelSettings,
  NarrationType,
  CheatLevel,
  ToneType,
  FocusArea,
} from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

// 定义叙述视角、金手指、语气和重点描写的可用选项
const NARRATION_OPTIONS: NarrationType[] = ["第一人称", "第三人称有限", "全知视角"];

const CHEAT_OPTIONS: CheatLevel[] = [
  "无敌流",
  "稳步成长",
  "真实吃力",
  "反转流",
  "废柴逆袭",
];

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

export interface WritingStyleSettingsProps {
  writingStyle: WritingStyle;
  totalWords: number;
  nsfw: boolean;
  systemNovel: boolean;
  harem: boolean;
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

// 写作风格与节奏设定组件，使用 React.memo 进行 Props 浅比较拦截
export const WritingStyleSettings = React.memo(
  ({
    writingStyle,
    totalWords,
    nsfw,
    systemNovel,
    harem,
    onUpdateSettings,
  }: WritingStyleSettingsProps) => {
    // 处理器：叙述视角变化
    const handleNarrationChange = (v: NarrationType) => {
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          narration: v,
        },
      }));
    };

    // 处理器：金手指程度变化
    const handleCheatLevelChange = (v: CheatLevel) => {
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          cheatLevel: v,
        },
      }));
    };

    // 处理器：切换整体语气
    const handleToggleTone = (tone: ToneType) => {
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          tones: prev.writingStyle.tones.includes(tone)
            ? prev.writingStyle.tones.filter((t) => t !== tone)
            : [...prev.writingStyle.tones, tone],
        },
      }));
    };

    // 处理器：切换重点描写内容
    const handleToggleFocusArea = (area: FocusArea) => {
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          focusAreas: prev.writingStyle.focusAreas.includes(area)
            ? prev.writingStyle.focusAreas.filter((a) => a !== area)
            : [...prev.writingStyle.focusAreas, area],
        },
      }));
    };

    // 处理器：预计总字数变化
    const handleTotalWordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value || 0);
      onUpdateSettings((prev) => ({
        ...prev,
        totalWords: val,
      }));
    };

    // 处理器：每章建议字数变化
    const handleWordsPerChapterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value || 0);
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          wordsPerChapter: val,
        },
      }));
    };

    // 处理器：创意度 Slider 变化
    const handleTemperatureChange = ([v]: number[]) => {
      onUpdateSettings((prev) => ({
        ...prev,
        writingStyle: {
          ...prev.writingStyle,
          temperature: v,
        },
      }));
    };

    // 处理器：开关类型字段变化（NSFW / 系统文 / 后宫元素）
    const handleToggleFlag = (field: "nsfw" | "systemNovel" | "harem", value: boolean) => {
      onUpdateSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

    // 格式化总字数的计算属性
    const totalWordsLabel = React.useMemo(() => {
      const v = totalWords;
      if (v >= 1000000) return `${v / 10000}万字`;
      if (v >= 10000) return `${v / 10000}万字`;
      return `${v}字`;
    }, [totalWords]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">写作风格与节奏</CardTitle>
          <CardDescription>告诉 AI 你想要哪种阅读体验。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>叙述视角</Label>
              <Select value={writingStyle.narration} onValueChange={handleNarrationChange}>
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
              <Select value={writingStyle.cheatLevel} onValueChange={handleCheatLevelChange}>
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
                const active = writingStyle.tones.includes(tone);
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
                const active = writingStyle.focusAreas.includes(area);
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
                value={totalWords}
                onChange={handleTotalWordsChange}
              />
              <p className="text-xs text-muted-foreground">当前：{totalWordsLabel}</p>
            </div>
            <div className="space-y-1">
              <Label>每章建议字数</Label>
              <Input
                type="number"
                min={500}
                step={500}
                value={writingStyle.wordsPerChapter}
                onChange={handleWordsPerChapterChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>创意度（Temperature）</Label>
              <span className="text-xs text-muted-foreground">
                {writingStyle.temperature.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[writingStyle.temperature]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={handleTemperatureChange}
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
                checked={nsfw}
                onChange={(e) => handleToggleFlag("nsfw", e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
              <span>系统文</span>
              <input
                type="checkbox"
                className="h-3 w-3 accent-primary"
                checked={systemNovel}
                onChange={(e) => handleToggleFlag("systemNovel", e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
              <span>后宫元素</span>
              <input
                type="checkbox"
                className="h-3 w-3 accent-primary"
                checked={harem}
                onChange={(e) => handleToggleFlag("harem", e.target.checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

WritingStyleSettings.displayName = "WritingStyleSettings";
