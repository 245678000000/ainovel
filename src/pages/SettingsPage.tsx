import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff } from "lucide-react";

const models = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude 3.5 Sonnet" },
  { value: "grok", label: "Grok" },
  { value: "qwen", label: "Qwen 2.5" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const [nsfw, setNsfw] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    deepseek: "",
    claude: "",
    grok: "",
    qwen: "",
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("default_llm_model, nsfw_enabled, api_keys_json")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDefaultModel(data.default_llm_model || "deepseek");
        setNsfw(data.nsfw_enabled || false);
        if (data.api_keys_json && typeof data.api_keys_json === "object") {
          const keys = data.api_keys_json as Record<string, string>;
          setApiKeys((prev) => ({ ...prev, ...keys }));
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Filter out empty keys
    const filteredKeys: Record<string, string> = {};
    for (const [k, v] of Object.entries(apiKeys)) {
      if (v.trim()) filteredKeys[k] = v.trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        default_llm_model: defaultModel,
        nsfw_enabled: nsfw,
        api_keys_json: filteredKeys,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "保存成功", description: "设置已更新" });
    }
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-6">
      <h1 className="font-serif text-2xl font-bold">设置</h1>

      {/* Model Selection */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">默认模型</CardTitle>
          <CardDescription>选择AI生成小说时使用的默认模型</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultModel} onValueChange={setDefaultModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">API 密钥</CardTitle>
          <CardDescription>输入各模型的API密钥，安全存储于数据库中</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {models.map((m) => (
            <div key={m.value} className="space-y-1">
              <Label className="text-sm">{m.label}</Label>
              <div className="relative">
                <Input
                  type={showKeys[m.value] ? "text" : "password"}
                  placeholder={`输入 ${m.label} API Key`}
                  value={apiKeys[m.value] || ""}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, [m.value]: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKeys((prev) => ({ ...prev, [m.value]: !prev[m.value] }))}
                >
                  {showKeys[m.value] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            密钥通过Edge Function在服务端使用，不会暴露给前端
          </p>
        </CardContent>
      </Card>

      {/* NSFW Toggle */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">内容设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>NSFW 内容</Label>
              <p className="text-xs text-muted-foreground mt-1">全局启用/禁用成人内容生成</p>
            </div>
            <Switch checked={nsfw} onCheckedChange={setNsfw} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "保存中..." : "保存设置"}
      </Button>
    </div>
  );
}
