import React from "react";
import { PlotBeat, EndingType, NovelSettings, createEmptyPlotBeat } from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export interface PlotSettingsProps {
  opening: string;
  middleBeats: PlotBeat[];
  endingType: EndingType | "";
  subplots: PlotBeat[];
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

const ENDING_OPTIONS: EndingType[] = ["HE", "BE", "开放", "大团圆", "虐", "爽", "开放式"];

const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

// 情节节点子项，利用 React.memo 确保单独修改某一节点时不重绘其它节点
const PlotBeatItem = React.memo(
  ({
    b,
    index,
    isFirst,
    isLast,
    onMove,
    onRemove,
    onChange,
    titlePlaceholder,
    detailPlaceholder,
  }: {
    b: PlotBeat;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onMove: (index: number, direction: number) => void;
    onRemove: (id: string) => void;
    onChange: (id: string, updates: Partial<PlotBeat>) => void;
    titlePlaceholder: string;
    detailPlaceholder: string;
  }) => {
    return (
      <div className="grid grid-cols-[auto,1fr,auto] items-start gap-2 rounded-md border bg-card/40 p-2">
        <div className="mt-1 text-xs text-muted-foreground">{index + 1}.</div>
        <div className="space-y-1">
          <Input
            placeholder={titlePlaceholder}
            value={b.title}
            onChange={(e) => onChange(b.id, { title: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder={detailPlaceholder}
            value={b.detail}
            onChange={(e) => onChange(b.id, { detail: e.target.value })}
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            disabled={isFirst}
            onClick={() => onMove(index, -1)}
          >
            ↑
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            disabled={isLast}
            onClick={() => onMove(index, 1)}
          >
            ↓
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={() => onRemove(b.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
);
PlotBeatItem.displayName = "PlotBeatItem";

// 主情节设定组件
export const PlotSettings = React.memo(
  ({ opening, middleBeats, endingType, subplots, onUpdateSettings }: PlotSettingsProps) => {
    // 处理器：开头修改
    const handleChangeOpening = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onUpdateSettings((prev) => ({ ...prev, opening: val }));
    };

    // 处理器：添加中段情节节点
    const handleAddMiddleBeat = () => {
      onUpdateSettings((prev) => ({
        ...prev,
        middleBeats: [...prev.middleBeats, createEmptyPlotBeat()],
      }));
    };

    // 处理器：删除中段节点
    const handleRemoveMiddleBeat = React.useCallback((id: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        middleBeats: prev.middleBeats.filter((x) => x.id !== id),
      }));
    }, [onUpdateSettings]);

    // 处理器：移动中段节点位置
    const handleMoveMiddleBeat = React.useCallback((index: number, direction: number) => {
      onUpdateSettings((prev) => ({
        ...prev,
        middleBeats: moveItem(prev.middleBeats, index, index + direction),
      }));
    }, [onUpdateSettings]);

    // 处理器：更改中段节点内容
    const handleChangeMiddleBeat = React.useCallback((id: string, updates: Partial<PlotBeat>) => {
      onUpdateSettings((prev) => ({
        ...prev,
        middleBeats: prev.middleBeats.map((x) => (x.id === id ? { ...x, ...updates } : x)),
      }));
    }, [onUpdateSettings]);

    // 处理器：添加故事副线
    const handleAddSubplot = () => {
      onUpdateSettings((prev) => ({
        ...prev,
        subplots: [...prev.subplots, createEmptyPlotBeat()],
      }));
    };

    // 处理器：删除副线
    const handleRemoveSubplot = React.useCallback((id: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        subplots: prev.subplots.filter((x) => x.id !== id),
      }));
    }, [onUpdateSettings]);

    // 处理器：移动副线位置
    const handleMoveSubplot = React.useCallback((index: number, direction: number) => {
      onUpdateSettings((prev) => ({
        ...prev,
        subplots: moveItem(prev.subplots, index, index + direction),
      }));
    }, [onUpdateSettings]);

    // 处理器：修改副线内容
    const handleChangeSubplot = React.useCallback((id: string, updates: Partial<PlotBeat>) => {
      onUpdateSettings((prev) => ({
        ...prev,
        subplots: prev.subplots.map((x) => (x.id === id ? { ...x, ...updates } : x)),
      }));
    }, [onUpdateSettings]);

    // 处理器：修改结局风格
    const handleChangeEndingType = (value: EndingType) => {
      onUpdateSettings((prev) => ({
        ...prev,
        endingType: value,
      }));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">情节大纲</CardTitle>
          <CardDescription>为 AI 提供一个清晰的剧情走向骨架。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>开头（前 30%）</Label>
            <Textarea
              rows={3}
              placeholder="主角的日常状态、引发故事的导火索、第一次转折……"
              value={opening}
              onChange={handleChangeOpening}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>中段高潮与关键转折</Label>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={handleAddMiddleBeat}
              >
                <Plus className="h-3 w-3" />
                添加节点
              </Button>
            </div>
            {middleBeats.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                建议添加 3–5 个关键节点，例如：首次挫败、真相揭露、分队行动、大决战前夜等。
              </p>
            ) : (
              <div className="space-y-2">
                {middleBeats.map((b, index) => (
                  <PlotBeatItem
                    key={b.id}
                    b={b}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === middleBeats.length - 1}
                    onMove={handleMoveMiddleBeat}
                    onRemove={handleRemoveMiddleBeat}
                    onChange={handleChangeMiddleBeat}
                    titlePlaceholder="节点标题，如：主角被迫离开安全区"
                    detailPlaceholder="简要描述该节点发生了什么、改变了什么。"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>主要副线</Label>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={handleAddSubplot}
              >
                <Plus className="h-3 w-3" />
                添加副线
              </Button>
            </div>
            {subplots.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                比如感情线、师门线、家族线、国家战争线等，每条一两句话说明即可。
              </p>
            ) : (
              <div className="space-y-2">
                {subplots.map((b, index) => (
                  <PlotBeatItem
                    key={b.id}
                    b={b}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === subplots.length - 1}
                    onMove={handleMoveSubplot}
                    onRemove={handleRemoveSubplot}
                    onChange={handleChangeSubplot}
                    titlePlaceholder="副线名称，如：师徒情感线"
                    detailPlaceholder="这一条副线的大致走向、开头与收束方式。"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>结局类型</Label>
            <Select
              value={endingType || ""}
              onValueChange={(v) => handleChangeEndingType(v as EndingType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择结局风格" />
              </SelectTrigger>
              <SelectContent>
                {ENDING_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }
);
PlotSettings.displayName = "PlotSettings";
