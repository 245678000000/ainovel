import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, BookOpen, Zap, Feather } from "lucide-react";

const genres = [
  "玄幻", "仙侠", "都市", "言情", "科幻", "系统文", "后宫", "无限流", "悬疑", "历史",
];

const styles = [
  "爽文", "虐文", "细腻", "幽默", "热血", "暗黑", "轻松",
];

export default function Index() {
  const navigate = useNavigate();
  const [genre, setGenre] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [style, setStyle] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const handleQuickStart = () => {
    const params = new URLSearchParams();
    if (genre) params.set("genre", genre);
    if (protagonist) params.set("protagonist", protagonist);
    if (style) params.set("style", style);
    if (synopsis) params.set("synopsis", synopsis);
    navigate(`/generate?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] md:min-h-screen gradient-hero">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 pb-8 md:pt-24">
        <div className="mb-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm text-primary">
          <Sparkles className="h-4 w-4" />
          <span>多模型支持 · 百万字生成 · 流式创作</span>
        </div>
        <h1 className="text-gradient text-center font-serif text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
          用AI瞬间写出
          <br />
          百万字小说
        </h1>
        <p className="mt-6 max-w-2xl text-center text-lg text-muted-foreground md:text-xl">
          支持 Grok、Claude、DeepSeek、Qwen 等多种大语言模型，
          一键生成玄幻、仙侠、都市、言情等各类长篇小说
        </p>
      </section>

      {/* Quick Start Card */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <Card className="glass glow-purple">
          <CardContent className="p-6 md:p-8">
            <h2 className="mb-6 font-serif text-xl font-bold text-foreground">快速开始创作</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>小说类型</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>主角名字</Label>
                <Input
                  placeholder="如：叶凡、陈长生..."
                  value={protagonist}
                  onChange={(e) => setProtagonist(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>写作风格</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择风格" />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>一句话简介</Label>
                <Input
                  placeholder="用一句话描述你的故事..."
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleQuickStart}
              size="lg"
              className="mt-6 w-full text-base font-semibold"
            >
              <PenIcon className="mr-2 h-5 w-5" />
              立即开始创作
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "极速生成", desc: "流式输出，实时预览，一键生成数万字章节" },
            { icon: BookOpen, title: "多类型支持", desc: "玄幻、仙侠、都市、言情、科幻等十余种类型" },
            { icon: Feather, title: "精细控制", desc: "人物卡、世界观、大纲、风格、温度全方位定制" },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="glass border-border/30">
              <CardContent className="p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1 font-serif font-bold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function PenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}
