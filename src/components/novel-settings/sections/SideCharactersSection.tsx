import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { NovelSettings, SideCharacter, createEmptySideCharacter } from "../types";
import { moveItem } from "../utils";

interface SideCharactersSectionProps {
  settings: NovelSettings;
  setSettings: React.Dispatch<React.SetStateAction<NovelSettings>>;
}

export function SideCharactersSection({ settings, setSettings }: SideCharactersSectionProps) {
  const handleAddSideCharacter = () => {
    setSettings((prev) => ({
      ...prev,
      sideCharacters: [...prev.sideCharacters, createEmptySideCharacter()],
    }));
  };

  const handleRemoveSideCharacter = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      sideCharacters: prev.sideCharacters.filter((c) => c.id !== id),
    }));
  };

  const handleUpdateSideCharacter = (id: string, field: keyof SideCharacter, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      sideCharacters: prev.sideCharacters.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    }));
  };

  const handleMoveSideCharacter = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const newArr = moveItem(
        prev.sideCharacters,
        index,
        direction === "up" ? index - 1 : index + 1,
      );
      return { ...prev, sideCharacters: newArr };
    });
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground font-normal">05.</span>
            配角设定
          </CardTitle>
          <Button
            size="sm"
            onClick={handleAddSideCharacter}
            className="h-8 gap-1 hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> 添加配角
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {settings.sideCharacters.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border/60">
            暂无配角，点击右上角添加
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {settings.sideCharacters.map((c, i) => (
              <AccordionItem
                key={c.id}
                value={c.id}
                className="border border-border/50 rounded-lg overflow-hidden data-[state=open]:shadow-md transition-shadow bg-card"
              >
                <AccordionTrigger className="hover:no-underline hover:bg-secondary/30 px-4 py-3 group">
                  <div className="flex items-center gap-3 w-full pr-4">
                    <div className="flex flex-col gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        className="p-1 hover:bg-secondary rounded cursor-pointer disabled:opacity-30"
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); handleMoveSideCharacter(i, "up"); }}
                      >
                        <GripVertical className="h-4 w-4 rotate-90" />
                      </button>
                    </div>
                    <div className="font-semibold text-primary/90 flex-1 text-left flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                      {c.name || "未命名配角"}
                    </div>
                    {c.relationship && (
                      <div className="text-xs text-muted-foreground font-normal hidden sm:block bg-secondary px-2 py-1 rounded">
                        与主角: {c.relationship}
                      </div>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSideCharacter(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pt-4 pb-6 bg-secondary/10 border-t border-border/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-primary/70">姓名</Label>
                      <Input
                        value={c.name}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "name", e.target.value)}
                        placeholder="姓名"
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-primary/70">性别</Label>
                      <Select
                        value={c.gender}
                        onValueChange={(v) => handleUpdateSideCharacter(c.id, "gender", v as string)}
                      >
                        <SelectTrigger className="bg-background/80">
                          <SelectValue placeholder="性别" />
                        </SelectTrigger>
                        <SelectContent>
                          {["男", "女", "无性别/不明"].map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-primary/70">年龄</Label>
                      <Input
                        value={c.age}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "age", e.target.value)}
                        placeholder="年龄"
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-primary/70">与主角关系</Label>
                      <Input
                        value={c.relationship}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "relationship", e.target.value)}
                        placeholder="师父 / 死党 / 妹妹 / 竞争者"
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-semibold text-primary/70">性格与外貌</Label>
                      <Textarea
                        value={c.personality}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "personality", e.target.value)}
                        placeholder="例如：毒舌但护短，常穿红衣"
                        className="min-h-[60px] resize-y bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-semibold text-primary/70">核心能力 / 弱点</Label>
                      <Textarea
                        value={c.abilities}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "abilities", e.target.value)}
                        placeholder="例如：精通阵法，但极度怕黑"
                        className="min-h-[60px] resize-y bg-background/80"
                      />
                    </div>
                    <div className="space-y-2 lg:col-span-4 border-t border-border/50 pt-4 mt-2">
                      <Label className="text-xs font-semibold text-primary/70">身份背景 & 结局预设</Label>
                      <Textarea
                        value={c.background}
                        onChange={(e) => handleUpdateSideCharacter(c.id, "background", e.target.value)}
                        placeholder="例如：原为大家闺秀，后家族覆灭。最终为救主角而牺牲（或一路陪伴成神）"
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
