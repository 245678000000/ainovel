import React from "react";
import {
  MainCharacter,
  SideCharacter,
  Antagonist,
  NovelSettings,
  createEmptySideCharacter,
  createEmptyAntagonist,
} from "./types";
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
import { GripVertical, Plus, Trash2 } from "lucide-react";

export interface CharacterSettingsProps {
  mainCharacter: MainCharacter;
  sideCharacters: SideCharacter[];
  antagonists: Antagonist[];
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

const moveItem = <T,>(arr: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
};

// 备用子组件：配角设定条目，用于提高列表打字性能
const SideCharacterItem = React.memo(
  ({
    c,
    index,
    isFirst,
    isLast,
    onMove,
    onRemove,
    onChange,
  }: {
    c: SideCharacter;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onMove: (index: number, direction: number) => void;
    onRemove: (id: string) => void;
    onChange: (id: string, updates: Partial<SideCharacter>) => void;
  }) => {
    return (
      <div className="rounded-lg border bg-card/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span>配角 {index + 1}</span>
            {c.name && <span className="text-muted-foreground">· {c.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={isFirst}
              onClick={() => onMove(index, -1)}
            >
              ↑
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={isLast}
              onClick={() => onMove(index, 1)}
            >
              ↓
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(c.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>姓名 / 昵称</Label>
            <Input
              placeholder="如：李师兄 / 小胖"
              value={c.name}
              onChange={(e) => onChange(c.id, { name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>性别 / 年龄</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={c.gender}
                onValueChange={(v) => onChange(c.id, { gender: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="年龄"
                value={c.age}
                onChange={(e) => onChange(c.id, { age: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>与主角关系</Label>
            <Select
              value={c.relationship || "其他"}
              onValueChange={(v) =>
                onChange(c.id, { relationship: v === "其他" ? "" : (v as any) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择关系" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="盟友">盟友</SelectItem>
                <SelectItem value="恋人">恋人</SelectItem>
                <SelectItem value="导师">导师</SelectItem>
                <SelectItem value="家人">家人</SelectItem>
                <SelectItem value="竞争者">竞争者</SelectItem>
                <SelectItem value="炮灰">炮灰</SelectItem>
                <SelectItem value="死敌">死敌</SelectItem>
                <SelectItem value="其他">自定义</SelectItem>
              </SelectContent>
            </Select>
            {!c.relationship && (
              <Input
                className="mt-1"
                placeholder="自定义关系，如：青梅竹马、损友、发小"
                value={c.relationshipCustom}
                onChange={(e) => onChange(c.id, { relationshipCustom: e.target.value })}
              />
            )}
          </div>
          <div className="space-y-1">
            <Label>人物弧光</Label>
            <Select
              value={c.arc || "其他"}
              onValueChange={(v) => onChange(c.id, { arc: v === "其他" ? "" : (v as any) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择弧光" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="成长">成长</SelectItem>
                <SelectItem value="黑化">黑化</SelectItem>
                <SelectItem value="救赎">救赎</SelectItem>
                <SelectItem value="牺牲">牺牲</SelectItem>
                <SelectItem value="退场">退场</SelectItem>
                <SelectItem value="保持不变">保持不变</SelectItem>
                <SelectItem value="其他">自定义</SelectItem>
              </SelectContent>
            </Select>
            {!c.arc && (
              <Input
                className="mt-1"
                placeholder="自定义人物弧光，如：从胆小鬼到独当一面"
                value={c.arcCustom}
                onChange={(e) => onChange(c.id, { arcCustom: e.target.value })}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label>性格标签（用逗号或顿号分隔）</Label>
          <Input
            placeholder="如：话唠、忠诚、刀子嘴豆腐心"
            value={c.personalityTags.join("、")}
            onChange={(e) => {
              const value = e.target.value;
              const tags = value
                .split(/[,，、\s]+/)
                .map((t) => t.trim())
                .filter(Boolean);
              onChange(c.id, { personalityTags: tags });
            }}
          />
        </div>

        <div className="space-y-1">
          <Label>身份背景（一句话）</Label>
          <Input
            placeholder="如：从小跟随主角一起长大的邻家女孩，是某大宗门的弃徒。"
            value={c.background}
            onChange={(e) => onChange(c.id, { background: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>能力 / 特长 / 弱点</Label>
          <Textarea
            rows={2}
            placeholder="如：擅长情报搜集和易容，但战斗力一般，容易情绪化。"
            value={c.abilities}
            onChange={(e) => onChange(c.id, { abilities: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>在故事中的作用</Label>
          <Textarea
            rows={2}
            placeholder="如：负责缓和气氛、提供情报、偶尔被绑架推动剧情。"
            value={c.role}
            onChange={(e) => onChange(c.id, { role: e.target.value })}
          />
        </div>
      </div>
    );
  }
);
SideCharacterItem.displayName = "SideCharacterItem";

// 备用子组件：反派设定条目，用于提高列表打字性能
const AntagonistItem = React.memo(
  ({
    c,
    index,
    isFirst,
    isLast,
    onMove,
    onRemove,
    onChange,
  }: {
    c: Antagonist;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onMove: (index: number, direction: number) => void;
    onRemove: (id: string) => void;
    onChange: (id: string, updates: Partial<Antagonist>) => void;
  }) => {
    return (
      <div className="rounded-lg border bg-card/40 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span>反派 {index + 1}</span>
            {c.name && <span className="text-muted-foreground">· {c.name}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={isFirst}
              onClick={() => onMove(index, -1)}
            >
              ↑
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={isLast}
              onClick={() => onMove(index, 1)}
            >
              ↓
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => onRemove(c.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>姓名 / 外号</Label>
            <Input
              placeholder="如：黑袍人 / 深渊君主"
              value={c.name}
              onChange={(e) => onChange(c.id, { name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>性别 / 年龄</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={c.gender}
                onValueChange={(v) => onChange(c.id, { gender: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="性别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="男">男</SelectItem>
                  <SelectItem value="女">女</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="年龄"
                value={c.age}
                onChange={(e) => onChange(c.id, { age: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label>动机</Label>
          <Input
            placeholder="如：想打破天道枷锁、复活爱人、纯粹享受毁灭。"
            value={c.motive}
            onChange={(e) => onChange(c.id, { motive: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>最终下场</Label>
          <Input
            placeholder="如：被主角击败但留下隐患 / 自我牺牲 / 被更大的势力收编。"
            value={c.fate}
            onChange={(e) => onChange(c.id, { fate: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <Label>能力与弱点</Label>
          <Textarea
            rows={2}
            placeholder="如：掌控时间的能力，但每次使用都会消耗寿命。"
            value={c.abilities}
            onChange={(e) => onChange(c.id, { abilities: e.target.value })}
          />
        </div>
      </div>
    );
  }
);
AntagonistItem.displayName = "AntagonistItem";

// 主角色设定组件，整合主角、配角、反派
export const CharacterSettings = React.memo(
  ({ mainCharacter, sideCharacters, antagonists, onUpdateSettings }: CharacterSettingsProps) => {
    // 修改主角属性
    const handleChangeMain = (field: keyof MainCharacter, value: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        mainCharacter: {
          ...prev.mainCharacter,
          [field]: value,
        },
      }));
    };

    // 添加配角
    const handleAddSideCharacter = () => {
      onUpdateSettings((prev) => ({
        ...prev,
        sideCharacters: [...prev.sideCharacters, createEmptySideCharacter()],
      }));
    };

    // 移除配角
    const handleRemoveSideCharacter = React.useCallback((id: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        sideCharacters: prev.sideCharacters.filter((x) => x.id !== id),
      }));
    }, [onUpdateSettings]);

    // 移动配角位置
    const handleMoveSideCharacter = React.useCallback((index: number, direction: number) => {
      onUpdateSettings((prev) => ({
        ...prev,
        sideCharacters: moveItem(prev.sideCharacters, index, index + direction),
      }));
    }, [onUpdateSettings]);

    // 修改配角属性
    const handleChangeSideCharacter = React.useCallback((id: string, updates: Partial<SideCharacter>) => {
      onUpdateSettings((prev) => ({
        ...prev,
        sideCharacters: prev.sideCharacters.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    }, [onUpdateSettings]);

    // 添加反派
    const handleAddAntagonist = () => {
      onUpdateSettings((prev) => ({
        ...prev,
        antagonists: [...prev.antagonists, createEmptyAntagonist()],
      }));
    };

    // 移除反派
    const handleRemoveAntagonist = React.useCallback((id: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        antagonists: prev.antagonists.filter((x) => x.id !== id),
      }));
    }, [onUpdateSettings]);

    // 移动反派位置
    const handleMoveAntagonist = React.useCallback((index: number, direction: number) => {
      onUpdateSettings((prev) => ({
        ...prev,
        antagonists: moveItem(prev.antagonists, index, index + direction),
      }));
    }, [onUpdateSettings]);

    // 修改反派属性
    const handleChangeAntagonist = React.useCallback((id: string, updates: Partial<Antagonist>) => {
      onUpdateSettings((prev) => ({
        ...prev,
        antagonists: prev.antagonists.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));
    }, [onUpdateSettings]);

    return (
      <div className="space-y-6">
        {/* 主角设定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">主角设定</CardTitle>
            <CardDescription>越具体的主角，越容易写出有生命力的故事。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>姓名</Label>
                <Input
                  placeholder="主角名字"
                  value={mainCharacter.name}
                  onChange={(e) => handleChangeMain("name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>性别</Label>
                <Select
                  value={mainCharacter.gender}
                  onValueChange={(v) => handleChangeMain("gender", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择性别" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>年龄</Label>
                <Input
                  placeholder="如：18"
                  value={mainCharacter.age}
                  onChange={(e) => handleChangeMain("age", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>性格</Label>
                <Input
                  placeholder="如：表面佛系，实际腹黑记仇"
                  value={mainCharacter.personality}
                  onChange={(e) => handleChangeMain("personality", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配角设定 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">配角设定</CardTitle>
              <CardDescription>为主角准备一支有血有肉的配角队伍。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={handleAddSideCharacter}
            >
              <Plus className="h-3 w-3" />
              添加配角
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {sideCharacters.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                还没有配角。可以添加主角的青梅竹马、死党、导师、队友等。
              </p>
            ) : (
              <div className="space-y-3">
                {sideCharacters.map((c, index) => (
                  <SideCharacterItem
                    key={c.id}
                    c={c}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === sideCharacters.length - 1}
                    onMove={handleMoveSideCharacter}
                    onRemove={handleRemoveSideCharacter}
                    onChange={handleChangeSideCharacter}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 反派 / 主要敌人 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">反派 / 主要敌人</CardTitle>
              <CardDescription>反派的动机和下场，会极大影响故事张力。</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={handleAddAntagonist}
            >
              <Plus className="h-3 w-3" />
              添加反派
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {antagonists.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                可以添加 1–3 个主要反派：大 Boss、中途反派、隐藏幕后黑手等。
              </p>
            ) : (
              <div className="space-y-3">
                {antagonists.map((c, index) => (
                  <AntagonistItem
                    key={c.id}
                    c={c}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === antagonists.length - 1}
                    onMove={handleMoveAntagonist}
                    onRemove={handleRemoveAntagonist}
                    onChange={handleChangeAntagonist}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);
CharacterSettings.displayName = "CharacterSettings";
