import React from "react";
import { TabooRule, NovelSettings, createEmptyTaboo } from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export interface TabooSettingsProps {
  taboos: TabooRule[];
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

// 写作禁忌单项组件，使用 React.memo 避免其他无关项重绘
const TabooItem = React.memo(
  ({
    t,
    index,
    onRemove,
    onChange,
  }: {
    t: TabooRule;
    index: number;
    onRemove: (id: string) => void;
    onChange: (id: string, content: string) => void;
  }) => {
    return (
      <div className="flex items-start gap-2 rounded-md border bg-card/40 p-2">
        <span className="mt-1 text-xs text-muted-foreground">{index + 1}.</span>
        <Textarea
          rows={2}
          placeholder="不想出现的内容或写作雷点。"
          value={t.content}
          onChange={(e) => onChange(t.id, e.target.value)}
        />
        <Button
          size="icon"
          variant="ghost"
          className="mt-1 h-7 w-7 text-destructive"
          onClick={() => onRemove(t.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    );
  }
);
TabooItem.displayName = "TabooItem";

// 写作禁忌设定组件，使用 React.memo 进行拦截保护
export const TabooSettings = React.memo(({ taboos, onUpdateSettings }: TabooSettingsProps) => {
  // 处理器：添加新禁忌规则
  const handleAddTaboo = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      taboos: [...prev.taboos, createEmptyTaboo()],
    }));
  };

  // 处理器：移除特定禁忌规则
  const handleRemoveTaboo = React.useCallback(
    (id: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        taboos: prev.taboos.filter((x) => x.id !== id),
      }));
    },
    [onUpdateSettings]
  );

  // 处理器：更改特定禁忌规则内容
  const handleChangeTaboo = React.useCallback(
    (id: string, content: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        taboos: prev.taboos.map((x) => (x.id === id ? { ...x, content } : x)),
      }));
    },
    [onUpdateSettings]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">禁忌与额外要求</CardTitle>
          <CardDescription>告诉 AI 绝对不能碰的雷点，以及你特别在意的写作要求。</CardDescription>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={handleAddTaboo}>
          <Plus className="h-3 w-3" />
          添加禁忌
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {taboos.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            例如：禁止 NTR、禁止虐主、避免过度血腥、避免现实政治等。
          </p>
        ) : (
          <div className="space-y-2">
            {taboos.map((t, index) => (
              <TabooItem
                key={t.id}
                t={t}
                index={index}
                onRemove={handleRemoveTaboo}
                onChange={handleChangeTaboo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TabooSettings.displayName = "TabooSettings";
