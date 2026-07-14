import React from "react";
import { WorldDetails, NovelSettings } from "./types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface WorldSettingsProps {
  worldSummary: string;
  conflictTheme: string;
  worldDetails: WorldDetails;
  onUpdateSettings: (
    updater: Partial<NovelSettings> | ((prev: NovelSettings) => NovelSettings)
  ) => void;
}

// 世界设定组件，使用 React.memo 避免多余重渲染
export const WorldSettings = React.memo(
  ({ worldSummary, conflictTheme, worldDetails, onUpdateSettings }: WorldSettingsProps) => {
    // 处理器：世界观简述发生改变
    const handleChangeSummary = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onUpdateSettings((prev) => ({ ...prev, worldSummary: val }));
    };

    // 处理器：核心冲突主题发生改变
    const handleChangeConflictTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onUpdateSettings((prev) => ({ ...prev, conflictTheme: val }));
    };

    // 处理器：世界细节信息改变
    const handleChangeDetail = (field: keyof WorldDetails, val: string) => {
      onUpdateSettings((prev) => ({
        ...prev,
        worldDetails: {
          ...prev.worldDetails,
          [field]: val,
        },
      }));
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">世界观与背景</CardTitle>
          <CardDescription>先给 AI 一个大致的舞台，再补充规则和细节。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>世界观 / 时代背景</Label>
            <Textarea
              placeholder="例如：灵气复苏后的现代都市，官方与民间异能组织并存……"
              value={worldSummary}
              onChange={handleChangeSummary}
              rows={3}
            />
          </div>
          <div className="space-y-1">
            <Label>核心冲突 / 主题</Label>
            <Input
              placeholder="例如：底层逆袭、复仇、求真、守护家人、对抗命运……"
              value={conflictTheme}
              onChange={handleChangeConflictTheme}
            />
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="world-details">
              <AccordionTrigger className="text-sm">
                展开世界观细节（力量体系、势力、历史、地点、禁忌）
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>力量 / 魔法 / 科技 / 修炼体系</Label>
                  <Textarea
                    rows={3}
                    placeholder="例如：以灵根为基础的五行修真体系，每境界分九层……"
                    value={worldDetails.powerSystem}
                    onChange={(e) => handleChangeDetail("powerSystem", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>社会结构与势力分布</Label>
                  <Textarea
                    rows={3}
                    placeholder="朝廷、宗门、家族、黑帮、跨国财团、幕后组织……"
                    value={worldDetails.factions}
                    onChange={(e) => handleChangeDetail("factions", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>历史重大事件</Label>
                  <Textarea
                    rows={3}
                    placeholder="例如：百年前的神魔大战导致大陆四分五裂……"
                    value={worldDetails.historyEvents}
                    onChange={(e) => handleChangeDetail("historyEvents", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>重要地点</Label>
                  <Textarea
                    rows={3}
                    placeholder="主城、学院、秘境、禁区、遗迹、神殿等关键地点。"
                    value={worldDetails.importantLocations}
                    onChange={(e) => handleChangeDetail("importantLocations", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>文化习俗与禁忌</Label>
                  <Textarea
                    rows={3}
                    placeholder="节日、礼仪、禁忌话题、宗教信仰、婚姻制度……"
                    value={worldDetails.cultureAndTaboos}
                    onChange={(e) => handleChangeDetail("cultureAndTaboos", e.target.value)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    );
  }
);

WorldSettings.displayName = "WorldSettings";
