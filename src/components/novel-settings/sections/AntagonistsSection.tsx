import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { NovelSettings, Antagonist, createEmptyAntagonist } from "../types";
import { moveItem } from "../utils";

interface AntagonistsSectionProps {
  settings: NovelSettings;
  setSettings: React.Dispatch<React.SetStateAction<NovelSettings>>;
}

export function AntagonistsSection({ settings, setSettings }: AntagonistsSectionProps) {
  const handleAddAntagonist = () => {
    setSettings((prev) => ({
      ...prev,
      antagonists: [...prev.antagonists, createEmptyAntagonist()],
    }));
  };

  const handleRemoveAntagonist = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      antagonists: prev.antagonists.filter((a) => a.id !== id),
    }));
  };

  const handleUpdateAntagonist = (id: string, field: keyof Antagonist, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      antagonists: prev.antagonists.map((a) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    }));
  };

  const handleMoveAntagonist = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const newArr = moveItem(
        prev.antagonists,
        index,
        direction === "up" ? index - 1 : index + 1,
      );
      return { ...prev, antagonists: newArr };
    });
  };

  return (
    <Card className="glass overflow-hidden border-destructive/20 bg-destructive/5">
      <CardHeader className="pb-3 border-b border-border/50 bg-background/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground font-normal">06.</span>
            反派 / 主要敌人
          </CardTitle>
          <Button
            size="sm"
            onClick={handleAddAntagonist}
            variant="destructive"
            className="h-8 gap-1 hover:bg-destructive/90"
          >
            <Plus className="h-4 w-4" /> 添加反派
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {settings.antagonists.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border/60">
            暂无反派，点击右上角添加
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {settings.antagonists.map((a, i) => (
              <AccordionItem
                key={a.id}
                value={a.id}
                className="border border-border/50 rounded-lg overflow-hidden data-[state=open]:shadow-md transition-shadow bg-card"
              >
                <AccordionTrigger className="hover:no-underline hover:bg-destructive/5 px-4 py-3 group">
                  <div className="flex items-center gap-3 w-full pr-4">
                    <div className="flex flex-col gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 hover:bg-secondary rounded cursor-pointer disabled:opacity-30"
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); handleMoveAntagonist(i, "up"); }}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                    </div>
                    <div className="font-semibold text-destructive/90 flex-1 text-left flex items-center gap-2">
                      <span className="bg-destructive/10 text-destructive w-6 h-6 rounded flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {a.name || "未命名反派"}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal hidden sm:block bg-secondary px-2 py-1 rounded">
                      动机: {a.motive || "未填写"}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAntagonist(a.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pt-4 pb-6 bg-secondary/10 border-t border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-destructive/70">姓名</Label>
                      <Input
                        value={a.name}
                        onChange={(e) => handleUpdateAntagonist(a.id, "name", e.target.value)}
                        placeholder="姓名 / 组织名"
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-destructive/70">类型</Label>
                      <Select
                        value={a.type || ""}
                        onValueChange={(v) => handleUpdateAntagonist(a.id, "type", v as string)}
                      >
                        <SelectTrigger className="bg-background/80">
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {["前期小BOSS", "中期强敌", "最终大BOSS", "幕后黑手", "敌对组织", "其他"].map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-semibold text-destructive/70">作恶动机 (核心驱动力)</Label>
                      <Input
                        value={a.motive}
                        onChange={(e) => handleUpdateAntagonist(a.id, "motive", e.target.value)}
                        placeholder="例如：追求长生 / 种族存亡 / 纯粹愉悦犯"
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-semibold text-destructive/70">性格与外貌</Label>
                      <Textarea
                        value={a.personality}
                        onChange={(e) => handleUpdateAntagonist(a.id, "personality", e.target.value)}
                        placeholder="例如：看似温文尔雅，实则病娇且残暴"
                        className="min-h-[60px] resize-y bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-semibold text-destructive/70">核心能力 / 势力范围</Label>
                      <Textarea
                        value={a.abilities}
                        onChange={(e) => handleUpdateAntagonist(a.id, "abilities", e.target.value)}
                        placeholder="例如：掌控深渊之力，手下有十二天将"
                        className="min-h-[60px] resize-y bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-4 border-t border-border/50 pt-4 mt-2">
                      <Label className="text-xs font-semibold text-destructive/70">背景与结局预设</Label>
                      <Textarea
                        value={a.background}
                        onChange={(e) => handleUpdateAntagonist(a.id, "background", e.target.value)}
                        placeholder="例如：千年前的英雄被背叛堕落。结局被主角感化后自我毁灭。"
                        className="min-h-[80px] bg-background/80"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
