import React from "react";
import { NovelGenre, NovelSettings, ALL_NOVEL_GENRES } from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export interface GenreSelectorProps {
  genres: NovelGenre[];
  oneLinePitch: string;
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

// 题材选择组件，使用 React.memo 避免多余的重渲染
export const GenreSelector = React.memo(
  ({ genres, oneLinePitch, onUpdateSettings }: GenreSelectorProps) => {
    // 切换题材的选择状态
    const handleToggleGenre = (g: NovelGenre) => {
      onUpdateSettings((prev) => ({
        ...prev,
        genres: prev.genres.includes(g)
          ? prev.genres.filter((x) => x !== g)
          : [...prev.genres, g],
      }));
    };

    // 处理器：一句话简介变化
    const handlePitchChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onUpdateSettings((prev) => ({
        ...prev,
        oneLinePitch: val,
      }));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础信息</CardTitle>
          <CardDescription>选择题材、写一段一句话简介，帮助 AI 把握氛围。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>小说类型（可多选）</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_NOVEL_GENRES.map((g) => {
                const active = genres.includes(g);
                return (
                  <Badge
                    key={g}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => handleToggleGenre(g)}
                  >
                    {g}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <Label>一句话简介</Label>
            <Textarea
              placeholder="例如：卑微社畜穿越异界，一边摸鱼一边靠系统苟成天道之主。"
              value={oneLinePitch}
              onChange={handlePitchChange}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
);

GenreSelector.displayName = "GenreSelector";
