import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NovelSettings } from "../types";

interface MainCharacterSectionProps {
  settings: NovelSettings;
  handleChangeMain: (field: keyof NovelSettings["mainCharacter"], value: string) => void;
}

export function MainCharacterSection({ settings, handleChangeMain }: MainCharacterSectionProps) {
  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-muted-foreground font-normal">02.</span>
          主角设定
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">姓名</Label>
            <Input
              value={settings.mainCharacter.name}
              onChange={(e) => handleChangeMain("name", e.target.value)}
              placeholder="林动 / 克莱恩"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold mb-3 block">性别</Label>
            <RadioGroup
              value={settings.mainCharacter.gender}
              onValueChange={(v) => handleChangeMain("gender", v)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="男" id="mc-male" />
                <Label htmlFor="mc-male" className="cursor-pointer">
                  男
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="女" id="mc-female" />
                <Label htmlFor="mc-female" className="cursor-pointer">
                  女
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="无性别" id="mc-other" />
                <Label htmlFor="mc-other" className="cursor-pointer">
                  无性别/不明
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">年龄</Label>
            <Input
              value={settings.mainCharacter.age}
              onChange={(e) => handleChangeMain("age", e.target.value)}
              placeholder="例如：18岁 / 上古活化石"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">外貌特征</Label>
          <Input
            value={settings.mainCharacter.appearance}
            onChange={(e) => handleChangeMain("appearance", e.target.value)}
            placeholder="例如：黑发黑瞳，常穿青衫，左眼有一道细小疤痕"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">性格标签</Label>
          <Input
            value={settings.mainCharacter.personality}
            onChange={(e) => handleChangeMain("personality", e.target.value)}
            placeholder="例如：杀伐果断、表面稳如老狗实则慌得一批、重情重义"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">初始身份 / 背景</Label>
          <Input
            value={settings.mainCharacter.background}
            onChange={(e) => handleChangeMain("background", e.target.value)}
            placeholder="例如：落魄修仙世家旁支 / 刚毕业的社畜"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex justify-between">
            <span>金手指 / 核心能力</span>
            <span className="text-xs text-muted-foreground font-normal">可选</span>
          </Label>
          <Textarea
            value={settings.mainCharacter.abilities}
            onChange={(e) => handleChangeMain("abilities", e.target.value)}
            placeholder="例如：带有熟练度面板，只要努力就有收获"
            className="min-h-[80px]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex justify-between">
            <span>人物目标 / 核心驱动力</span>
            <span className="text-xs text-muted-foreground font-normal">决定了剧情主线</span>
          </Label>
          <Textarea
            value={settings.mainCharacter.goal}
            onChange={(e) => handleChangeMain("goal", e.target.value)}
            placeholder="例如：寻找失踪的妹妹，顺便拯救一下世界"
            className="min-h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
