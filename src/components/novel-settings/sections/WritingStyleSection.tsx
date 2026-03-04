import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { NovelSettings, NarrationType, ToneType, CheatLevel, FocusArea } from "../types";

interface WritingStyleSectionProps {
  settings: NovelSettings;
  handleChangeWritingStyle: (field: keyof NovelSettings["writingStyle"], value: unknown) => void;
  handleToggleTone: (tone: ToneType) => void;
  handleToggleFocus: (f: FocusArea) => void;
  NARRATION_OPTIONS: NarrationType[];
  TONE_OPTIONS: ToneType[];
  CHEAT_OPTIONS: CheatLevel[];
  FOCUS_OPTIONS: FocusArea[];
}

export function WritingStyleSection({
  settings,
  handleChangeWritingStyle,
  handleToggleTone,
  handleToggleFocus,
  NARRATION_OPTIONS,
  TONE_OPTIONS,
  CHEAT_OPTIONS,
  FOCUS_OPTIONS,
}: WritingStyleSectionProps) {
  const formatWordCount = (v: number) => {
    if (v >= 1000000) return `${v / 10000}万字`;
    if (v >= 10000) return `${v / 10000}万字`;
    return `${v}字`;
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground font-normal">04.</span>
            写作风格与节奏
          </CardTitle>
          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
            控制 AI 语气
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">叙述视角</Label>
            <Select
              value={settings.writingStyle.narration}
              onValueChange={(v) => handleChangeWritingStyle("narration", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择视角" />
              </SelectTrigger>
              <SelectContent>
                {NARRATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">金手指强度 (爽文度)</Label>
            <Select
              value={settings.writingStyle.cheatLevel}
              onValueChange={(v) => handleChangeWritingStyle("cheatLevel", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择强度" />
              </SelectTrigger>
              <SelectContent>
                {CHEAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">整体语气 / 风格基调 (多选)</Label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((tone) => {
              const active = settings.writingStyle.tone.includes(tone);
              return (
                <Badge
                  key={tone}
                  variant={active ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    active ? "hover:bg-primary/90" : "hover:bg-primary/10 hover:text-primary border-primary/20"
                  }`}
                  onClick={() => handleToggleTone(tone)}
                >
                  {tone}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">重点描写偏好 (多选)</Label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => {
              const active = settings.writingStyle.focus.includes(f);
              return (
                <Badge
                  key={f}
                  variant={active ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    active ? "hover:bg-primary/90" : "hover:bg-primary/10 hover:text-primary border-primary/20"
                  }`}
                  onClick={() => handleToggleFocus(f)}
                >
                  {f}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-border/50">
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-sm font-semibold">单章建议字数 (给大模型的提示)</Label>
              <span className="text-sm font-medium text-primary">
                {settings.writingStyle.targetWordCount} 字左右
              </span>
            </div>
            <Slider
              min={500}
              max={10000}
              step={500}
              value={[settings.writingStyle.targetWordCount]}
              onValueChange={([val]) => handleChangeWritingStyle("targetWordCount", val)}
              className="py-4"
            />
            <CardDescription className="text-xs mt-2">
              注意：受限于大模型上下文窗口，单次输出超过 3000 字容易截断或质量下降
            </CardDescription>
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label className="text-sm font-semibold">预期总字数</Label>
              <span className="text-sm font-medium text-primary">
                {formatWordCount(settings.writingStyle.expectedLength)}
              </span>
            </div>
            <Slider
              min={10000}
              max={5000000}
              step={10000}
              value={[settings.writingStyle.expectedLength]}
              onValueChange={([val]) => handleChangeWritingStyle("expectedLength", val)}
              className="py-4"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
