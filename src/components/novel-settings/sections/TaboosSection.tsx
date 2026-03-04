import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { NovelSettings, createEmptyTaboo } from "../types";

interface TaboosSectionProps {
  settings: NovelSettings;
  setSettings: React.Dispatch<React.SetStateAction<NovelSettings>>;
}

export function TaboosSection({ settings, setSettings }: TaboosSectionProps) {
  const handleAddTaboo = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      setSettings((prev) => ({
        ...prev,
        taboos: [...prev.taboos, { ...createEmptyTaboo(), description: val }],
      }));
      e.currentTarget.value = "";
    }
  };

  const handleRemoveTaboo = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      taboos: prev.taboos.filter((t) => t.id !== id),
    }));
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-destructive/10">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <span className="font-normal opacity-70">08.</span>
          禁忌与额外要求
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-destructive/80">避免踩雷 (输入后按回车添加)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="例如：不要圣母、不要废话水字数、不要主角被绿..."
              onKeyDown={handleAddTaboo}
              className="border-destructive/30 focus-visible:ring-destructive/20 bg-destructive/5"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.taboos.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-1.5 px-3 py-1 bg-destructive/10 text-destructive text-sm rounded-full border border-destructive/20 transition-all hover:bg-destructive hover:text-destructive-foreground"
            >
              <span className="truncate max-w-[200px]">{t.description}</span>
              <button
                type="button"
                onClick={() => handleRemoveTaboo(t.id)}
                className="opacity-50 hover:opacity-100 flex-shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {settings.taboos.length === 0 && (
            <span className="text-sm text-muted-foreground/60 italic">暂无额外要求...</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
