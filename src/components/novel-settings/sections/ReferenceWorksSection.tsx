import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { NovelSettings, ReferenceWork, createEmptyReferenceWork } from "../types";

interface ReferenceWorksSectionProps {
  settings: NovelSettings;
  setSettings: React.Dispatch<React.SetStateAction<NovelSettings>>;
}

export function ReferenceWorksSection({ settings, setSettings }: ReferenceWorksSectionProps) {
  const handleAddReference = () => {
    setSettings((prev) => ({
      ...prev,
      references: [...prev.references, createEmptyReferenceWork()],
    }));
  };

  const handleRemoveReference = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      references: prev.references.filter((r) => r.id !== id),
    }));
  };

  const handleUpdateReference = (id: string, field: keyof ReferenceWork, value: string) => {
    setSettings((prev) => ({
      ...prev,
      references: prev.references.map((r) =>
        r.id === id ? { ...r, [field]: value } : r,
      ),
    }));
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground font-normal">09.</span>
            参考作品
          </CardTitle>
          <Button
            size="sm"
            onClick={handleAddReference}
            variant="outline"
            className="h-8 gap-1 hover:bg-secondary/80"
          >
            <Plus className="h-4 w-4" /> 添加参考
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {settings.references.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground bg-secondary/10 rounded-lg border border-dashed border-border/60 text-sm">
            暂无参考作品（可选填）
          </div>
        ) : (
          <div className="space-y-3">
            {settings.references.map((ref, index) => (
              <div
                key={ref.id}
                className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg group"
              >
                <span className="text-sm font-semibold text-muted-foreground">{index + 1}.</span>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3 flex-1">
                  <Input
                    placeholder="作品名，如: 斗破苍穹"
                    value={ref.title}
                    onChange={(e) => handleUpdateReference(ref.id, "title", e.target.value)}
                    className="h-9 text-sm"
                  />
                  <Input
                    placeholder="借鉴点，如: 退婚流开局，老爷爷辅助"
                    value={ref.notes}
                    onChange={(e) => handleUpdateReference(ref.id, "notes", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveReference(ref.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
