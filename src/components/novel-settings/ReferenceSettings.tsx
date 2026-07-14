import React from "react";
import { ReferenceWork, NovelSettings, createEmptyReferenceWork } from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export interface ReferenceSettingsProps {
  references: ReferenceWork[];
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

// 参考作品单项组件，使用 React.memo 避免其他无关项重绘
const ReferenceItem = React.memo(
  ({
    r,
    index,
    onRemove,
    onChange,
  }: {
    r: ReferenceWork;
    index: number;
    onRemove: (id: string) => void;
    onChange: (id: string, updates: Partial<ReferenceWork>) => void;
  }) => {
    return (
      <div className="grid grid-cols-[auto,1fr,auto] items-start gap-2 rounded-md border bg-card/40 p-2">
        <span className="mt-2 text-xs text-muted-foreground">{index + 1}.</span>
        <div className="space-y-1">
          <Input
            placeholder="作品名，如：斗破苍穹"
            value={r.title}
            onChange={(e) => onChange(r.id, { title: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder="具体借鉴点，如：世界观设定、修炼体系、主角成长曲线、叙事节奏等。"
            value={r.inspiration}
            onChange={(e) => onChange(r.id, { inspiration: e.target.value })}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="mt-1 h-7 w-7 text-destructive"
          onClick={() => onRemove(r.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }
);
ReferenceItem.displayName = "ReferenceItem";

// 参考作品设定组件，使用 React.memo 进行拦截保护
export const ReferenceSettings = React.memo(
  ({ references, onUpdateSettings }: ReferenceSettingsProps) => {
    // 处理器：添加新参考作品
    const handleAddReference = () => {
      onUpdateSettings((prev) => ({
        ...prev,
        references: [...prev.references, createEmptyReferenceWork()],
      }));
    };

    // 处理器：移除特定参考作品
    const handleRemoveReference = React.useCallback(
      (id: string) => {
        onUpdateSettings((prev) => ({
          ...prev,
          references: prev.references.filter((x) => x.id !== id),
        }));
      },
      [onUpdateSettings]
    );

    // 处理器：更改特定参考作品信息
    const handleChangeReference = React.useCallback(
      (id: string, updates: Partial<ReferenceWork>) => {
        onUpdateSettings((prev) => ({
          ...prev,
          references: prev.references.map((x) => (x.id === id ? { ...x, ...updates } : x)),
        }));
      },
      [onUpdateSettings]
    );

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">参考作品</CardTitle>
            <CardDescription>可以告诉 AI 你想要的味道，但不要照抄剧情。</CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={handleAddReference}>
            <Plus className="h-3 w-3" />
            添加作品
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {references.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              例如：世界观像《斗破苍穹》，主角性格像《诡秘之主》，感情线像某部作品等。
            </p>
          ) : (
            <div className="space-y-2">
              {references.map((r, index) => (
                <ReferenceItem
                  key={r.id}
                  r={r}
                  index={index}
                  onRemove={handleRemoveReference}
                  onChange={handleChangeReference}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ReferenceSettings.displayName = "ReferenceSettings";
