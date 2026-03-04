import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ALL_NOVEL_GENRES, NovelSettings } from "../types";

interface BasicInfoSectionProps {
  settings: NovelSettings;
  handleChangeWorld: (field: keyof NovelSettings, value: string) => void;
  handleToggleGenre: (g: string) => void;
}

export function BasicInfoSection({ settings, handleChangeWorld, handleToggleGenre }: BasicInfoSectionProps) {
  return (
    <Card className="glass border-primary/20 bg-primary/5 shadow-md">
      <CardHeader className="pb-3 border-b border-border/50 bg-background/50 rounded-t-xl">
        <CardTitle className="text-base text-primary flex items-center gap-2">
          <span>01.</span>基础信息
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">作品名</Label>
          <Input
            placeholder="例如：剑来 / 诡秘之主"
            value={settings.title}
            onChange={(e) => handleChangeWorld("title", e.target.value)}
            className="border-primary/20 focus-visible:ring-primary/30"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-semibold">小说类型 (可多选)</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_NOVEL_GENRES.map((g) => {
              const active = settings.genres.includes(g as string);
              return (
                <Badge
                  key={g}
                  variant={active ? "default" : "outline"}
                  className={`cursor-pointer transition-all ${
                    active ? "hover:bg-primary/90" : "hover:bg-primary/10 hover:text-primary border-primary/20"
                  }`}
                  onClick={() => handleToggleGenre(g)}
                >
                  {g}
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">一句话简介 / 核心卖点</Label>
          <Textarea
            placeholder="例如：穿越到一个被诡异污染的修仙世界，只要作死就能变强..."
            value={settings.logline}
            onChange={(e) => handleChangeWorld("logline", e.target.value)}
            className="min-h-[80px] resize-y border-primary/20 focus-visible:ring-primary/30"
          />
        </div>
      </CardContent>
    </Card>
  );
}
