import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { NovelSettings } from "../types";

interface WorldBuildingSectionProps {
  settings: NovelSettings;
  handleChangeWorldDetail: (field: keyof NovelSettings["worldDetails"], value: string) => void;
}

export function WorldBuildingSection({ settings, handleChangeWorldDetail }: WorldBuildingSectionProps) {
  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-muted-foreground font-normal">03.</span>
          世界观与背景
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <Accordion type="multiple" defaultValue={["world-overview"]} className="w-full">
          <AccordionItem value="world-overview" className="border-border/50 border-b-0 mb-4">
            <AccordionTrigger className="hover:no-underline bg-secondary/10 px-4 rounded-t-lg border border-border/50 text-sm font-semibold hover:bg-secondary/20 transition-colors">
              基础世界观 (必填)
            </AccordionTrigger>
            <AccordionContent className="pt-4 px-4 pb-4 border border-t-0 border-border/50 rounded-b-lg">
              <Textarea
                placeholder="例如：修仙界分为九州，灵气复苏的现代都市，被不可名状之物入侵的蒸汽朋克..."
                value={settings.worldDetails.overview}
                onChange={(e) => handleChangeWorldDetail("overview", e.target.value)}
                className="min-h-[120px] resize-y"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="world-details" className="border-none">
            <AccordionTrigger className="hover:no-underline bg-secondary/10 px-4 rounded-lg border border-border/50 text-sm font-semibold hover:bg-secondary/20 transition-colors data-[state=open]:rounded-b-none data-[state=open]:border-b-0">
              <div className="flex items-center gap-2">细节设定展开 <span className="text-xs font-normal text-muted-foreground ml-2">(可选补充，丰富世界真实感)</span></div>
            </AccordionTrigger>
            <AccordionContent className="pt-6 px-4 pb-6 border border-t-0 border-border/50 rounded-b-lg bg-background/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary/80">力量 / 魔法 / 科技体系</Label>
                  <Textarea
                    placeholder="境界划分、核心能源、技能获取方式..."
                    value={settings.worldDetails.powerSystem}
                    onChange={(e) => handleChangeWorldDetail("powerSystem", e.target.value)}
                    className="min-h-[100px] bg-background/50 border-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary/80">核心势力 / 国家 / 组织</Label>
                  <Textarea
                    placeholder="例如：三大宗门结构、财阀统治的都市..."
                    value={settings.worldDetails.factions}
                    onChange={(e) => handleChangeWorldDetail("factions", e.target.value)}
                    className="min-h-[100px] bg-background/50 border-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary/80">重大历史事件</Label>
                  <Textarea
                    placeholder="例如：百年前的大灾变、神魔大战..."
                    value={settings.worldDetails.history}
                    onChange={(e) => handleChangeWorldDetail("history", e.target.value)}
                    className="min-h-[100px] bg-background/50 border-primary/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-primary/80">主要地图 / 关键地点</Label>
                  <Textarea
                    placeholder="例如：主角新手村、最终BOSS所在的神渊..."
                    value={settings.worldDetails.geography}
                    onChange={(e) => handleChangeWorldDetail("geography", e.target.value)}
                    className="min-h-[100px] bg-background/50 border-primary/10"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-semibold text-primary/80">文化风俗 / 禁忌 / 常识</Label>
                  <Textarea
                    placeholder="例如：不可直视神明、夜间禁止出门..."
                    value={settings.worldDetails.culture}
                    onChange={(e) => handleChangeWorldDetail("culture", e.target.value)}
                    className="min-h-[80px] bg-background/50 border-primary/10"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
