import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { NovelSettings, PlotBeat, createEmptyPlotBeat, EndingType } from "../types";
import { moveItem } from "../utils";

interface PlotOutlineSectionProps {
  settings: NovelSettings;
  handleChangeWorldDetail: (field: keyof NovelSettings["worldDetails"], value: string) => void;
  setSettings: React.Dispatch<React.SetStateAction<NovelSettings>>;
  ENDING_OPTIONS: EndingType[];
}

export function PlotOutlineSection({ settings, handleChangeWorldDetail, setSettings, ENDING_OPTIONS }: PlotOutlineSectionProps) {
  const handleAddPlotBeat = () => {
    setSettings((prev) => ({
      ...prev,
      plotOutline: {
        ...prev.plotOutline,
        mainBeats: [...prev.plotOutline.mainBeats, createEmptyPlotBeat()],
      },
    }));
  };

  const handleRemovePlotBeat = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      plotOutline: {
        ...prev.plotOutline,
        mainBeats: prev.plotOutline.mainBeats.filter((b) => b.id !== id),
      },
    }));
  };

  const handleUpdatePlotBeat = (id: string, field: keyof PlotBeat, value: string) => {
    setSettings((prev) => ({
      ...prev,
      plotOutline: {
        ...prev.plotOutline,
        mainBeats: prev.plotOutline.mainBeats.map((b) =>
          b.id === id ? { ...b, [field]: value } : b,
        ),
      },
    }));
  };

  const handleMovePlotBeat = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const newArr = moveItem(
        prev.plotOutline.mainBeats,
        index,
        direction === "up" ? index - 1 : index + 1,
      );
      return {
        ...prev,
        plotOutline: { ...prev.plotOutline, mainBeats: newArr },
      };
    });
  };

  return (
    <Card className="glass overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 border-b border-border/50 bg-background/50">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-muted-foreground font-normal">07.</span>
          情节大纲
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-primary/80">开篇引入 (起) - 前 20%</Label>
          <Textarea
            placeholder="交代背景、金手指觉醒、拉仇恨、定下短期目标..."
            value={settings.plotOutline.beginning}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                plotOutline: { ...prev.plotOutline, beginning: e.target.value },
              }))
            }
            className="min-h-[100px] bg-background/80"
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold text-primary/80">中段关键节点 (承 / 转) - 中间 60%</Label>
            <Button
              size="sm"
              onClick={handleAddPlotBeat}
              variant="outline"
              className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" /> 添加剧情节点
            </Button>
          </div>
          {settings.plotOutline.mainBeats.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-background/50 rounded border border-dashed border-primary/30 text-sm">
              点击右侧添加剧情高潮/转折节点
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {settings.plotOutline.mainBeats.map((beat, i) => (
                <AccordionItem
                  key={beat.id}
                  value={beat.id}
                  className="border border-border/50 rounded-lg overflow-hidden bg-background/80"
                >
                  <AccordionTrigger className="hover:no-underline hover:bg-secondary/30 px-3 py-2 group">
                    <div className="flex items-center gap-3 w-full pr-4 text-sm">
                      <div className="flex flex-col gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="p-1 hover:bg-secondary rounded cursor-pointer disabled:opacity-30"
                          disabled={i === 0}
                          onClick={(e) => { e.stopPropagation(); handleMovePlotBeat(i, "up"); }}
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </button>
                      </div>
                      <div className="font-semibold text-primary/90">节点 {i + 1}</div>
                      <div className="text-muted-foreground truncate max-w-[200px] sm:max-w-xs font-normal">
                        {beat.title || "未命名"}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlotBeat(beat.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-3 pb-4 bg-secondary/5 border-t border-border/50">
                    <div className="space-y-3">
                      <Input
                        value={beat.title}
                        onChange={(e) => handleUpdatePlotBeat(beat.id, "title", e.target.value)}
                        placeholder="节点标题 (如：门派大比 / 深渊试炼)"
                        className="h-8 text-sm"
                      />
                      <Textarea
                        value={beat.description}
                        onChange={(e) => handleUpdatePlotBeat(beat.id, "description", e.target.value)}
                        placeholder="节点详细描述：遇到了什么危机？获得了什么成长？"
                        className="min-h-[80px] text-sm"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-primary/20">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-primary/80">结局类型</Label>
            <Select
              value={settings.plotOutline.endingType}
              onValueChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  plotOutline: { ...prev.plotOutline, endingType: v as EndingType },
                }))
              }
            >
              <SelectTrigger className="bg-background/80">
                <SelectValue placeholder="选择结局" />
              </SelectTrigger>
              <SelectContent>
                {ENDING_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-semibold text-primary/80">结局走向 (合) - 最后 20%</Label>
            <Textarea
              placeholder="大决战怎么打？主角最终归宿？是否留有悬念？"
              value={settings.plotOutline.ending}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  plotOutline: { ...prev.plotOutline, ending: e.target.value },
                }))
              }
              className="min-h-[100px] bg-background/80"
            />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-primary/20">
          <Label className="text-sm font-semibold text-primary/80">隐藏线索 / 贯穿副线 (可选)</Label>
          <Textarea
            placeholder="例如：伴随主线的寻宝、配角复仇、恋爱发展..."
            value={settings.worldDetails.hiddenLore}
            onChange={(e) => handleChangeWorldDetail("hiddenLore", e.target.value)}
            className="min-h-[80px] bg-background/80"
          />
        </div>
      </CardContent>
    </Card>
  );
}
