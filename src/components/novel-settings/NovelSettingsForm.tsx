import { useEffect, useRef, useState } from "react";
import {
  NovelSettings,
  createDefaultNovelSettings,
  ALL_NOVEL_GENRES,
  EndingType,
  NarrationType,
  ToneType,
  CheatLevel,
  FocusArea,
} from "./types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Upload, Download, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import sections
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { MainCharacterSection } from "./sections/MainCharacterSection";
import { WorldBuildingSection } from "./sections/WorldBuildingSection";
import { WritingStyleSection } from "./sections/WritingStyleSection";
import { SideCharactersSection } from "./sections/SideCharactersSection";
import { AntagonistsSection } from "./sections/AntagonistsSection";
import { PlotOutlineSection } from "./sections/PlotOutlineSection";
import { TaboosSection } from "./sections/TaboosSection";
import { ReferenceWorksSection } from "./sections/ReferenceWorksSection";

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
  isGenerating,
  onGenerate,
  onStop,
}: NovelSettingsFormProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NovelSettings>(() => createDefaultNovelSettings());

  // Restore from localStorage on mount
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

  // Auto save to localStorage
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
      genres: prev.genres.includes(g as string)
        ? prev.genres.filter((x) => x !== g)
        : [...prev.genres, g as string],
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

  const handleChangeWritingStyle = (field: keyof NovelSettings["writingStyle"], value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        [field]: value as never,
      },
    }));
  };

  const handleToggleTone = (tone: ToneType) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        tone: prev.writingStyle.tone.includes(tone)
          ? prev.writingStyle.tone.filter((t) => t !== tone)
          : [...prev.writingStyle.tone, tone],
      },
    }));
  };

  const handleToggleFocus = (f: FocusArea) => {
    setSettings((prev) => ({
      ...prev,
      writingStyle: {
        ...prev.writingStyle,
        focus: prev.writingStyle.focus.includes(f)
          ? prev.writingStyle.focus.filter((t) => t !== f)
          : [...prev.writingStyle.focus, f],
      },
    }));
  };

  const handleReset = () => {
    if (confirm("确定要重置所有设定吗？未导出的内容将丢失！")) {
      setSettings(createDefaultNovelSettings());
      toast({ title: "已重置设定" });
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `novel_settings_${settings.title || "untitiled"}.json`);
    dlAnchorElem.click();
    toast({ title: "导出成功", description: "已下载为 JSON 文件" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          mainCharacter: { ...prev.mainCharacter, ...(parsed.mainCharacter || {}) },
          worldDetails: { ...prev.worldDetails, ...(parsed.worldDetails || {}) },
          writingStyle: { ...prev.writingStyle, ...(parsed.writingStyle || {}) },
        }));
        toast({ title: "导入成功", description: "设定已覆盖当前表单" });
      } catch (err: unknown) {
        toast({
          title: "导入失败",
          description: err instanceof Error ? err.message : "JSON 解析失败",
          variant: "destructive",
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-md rounded-xl border border-border/50 shadow-sm relative overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between p-4 bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs h-8 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" /> 重置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs h-8 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Download className="w-3 h-3 mr-1.5" /> 导出 JSON
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="导入 JSON"
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors pointer-events-none"
            >
              <Upload className="w-3 h-3 mr-1.5" /> 导入 JSON
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Button
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm transition-all text-sm font-medium"
            onClick={() => onGenerate("outline", settings)}
            disabled={isGenerating}
          >
            {isGenerating ? "生成中..." : "生成大纲"}
          </Button>
          <Button
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm transition-all text-sm font-medium"
            onClick={() => onGenerate("characters", settings)}
            disabled={isGenerating}
          >
            {isGenerating ? "生成中..." : "生成角色库"}
          </Button>
          {isGenerating ? (
            <Button variant="destructive" onClick={onStop} className="shadow-md shadow-destructive/20 font-medium">
              中止生成
            </Button>
          ) : (
            <Button
              onClick={() => onGenerate("generate", settings)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              生成系统提示词
            </Button>
          )}
        </div>
      </div>

      {/* 滚动表单区 */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8 pb-32">
          <BasicInfoSection
            settings={settings}
            handleChangeWorld={handleChangeWorld}
            handleToggleGenre={handleToggleGenre}
          />

          <MainCharacterSection
            settings={settings}
            handleChangeMain={handleChangeMain}
          />

          <WorldBuildingSection
            settings={settings}
            handleChangeWorldDetail={handleChangeWorldDetail}
          />

          <WritingStyleSection
            settings={settings}
            handleChangeWritingStyle={handleChangeWritingStyle}
            handleToggleTone={handleToggleTone}
            handleToggleFocus={handleToggleFocus}
            NARRATION_OPTIONS={NARRATION_OPTIONS}
            TONE_OPTIONS={TONE_OPTIONS}
            CHEAT_OPTIONS={CHEAT_OPTIONS}
            FOCUS_OPTIONS={FOCUS_OPTIONS}
          />

          <SideCharactersSection
            settings={settings}
            setSettings={setSettings}
          />

          <AntagonistsSection
            settings={settings}
            setSettings={setSettings}
          />

          <PlotOutlineSection
            settings={settings}
            setSettings={setSettings}
            handleChangeWorldDetail={handleChangeWorldDetail}
            ENDING_OPTIONS={ENDING_OPTIONS}
          />

          <TaboosSection
            settings={settings}
            setSettings={setSettings}
          />

          <ReferenceWorksSection
            settings={settings}
            setSettings={setSettings}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
