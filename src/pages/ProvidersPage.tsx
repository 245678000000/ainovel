import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PROVIDER_TYPES, type ModelProvider, type ProviderType } from "@/lib/provider-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Zap, FlaskConical } from "lucide-react";

export default function ProvidersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModelProvider | null>(null);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    provider_type: "openai",
    api_key: "",
    api_base_url: "",
    default_model: "",
    enabled: true,
    config_json: { temperature: 0.7, top_p: 0.9, max_tokens: 4096 },
  });

  const selectedType = PROVIDER_TYPES.find((p) => p.value === form.provider_type);

  useEffect(() => {
    if (user) fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    const { data } = await supabase
      .from("model_providers")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setProviders(data as unknown as ModelProvider[]);
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    const t = PROVIDER_TYPES[0];
    setForm({
      name: t.label,
      provider_type: t.value,
      api_key: "",
      api_base_url: t.defaultUrl,
      default_model: t.models[0] || "",
      enabled: true,
      config_json: { temperature: 0.7, top_p: 0.9, max_tokens: 4096 },
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const openEdit = (p: ModelProvider) => {
    setEditing(p);
    setForm({
      name: p.name,
      provider_type: p.provider_type,
      api_key: p.api_key,
      api_base_url: p.api_base_url,
      default_model: p.default_model,
      enabled: p.enabled,
      config_json: p.config_json || { temperature: 0.7, top_p: 0.9, max_tokens: 4096 },
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const onTypeChange = (val: string) => {
    const t = PROVIDER_TYPES.find((p) => p.value === val)!;
    setForm((f) => ({
      ...f,
      provider_type: val,
      name: f.name === (PROVIDER_TYPES.find((p) => p.value === f.provider_type)?.label || "") ? t.label : f.name,
      api_base_url: t.defaultUrl,
      default_model: t.models[0] || "",
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    const payload = { ...form, user_id: user.id };

    if (editing) {
      const { error } = await supabase.from("model_providers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "保存失败", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("model_providers").insert(payload);
      if (error) { toast({ title: "添加失败", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "保存成功" });
    setDialogOpen(false);
    fetchProviders();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("model_providers").delete().eq("id", id);
    toast({ title: "已删除" });
    fetchProviders();
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    // Clear all defaults first
    await supabase.from("model_providers").update({ is_default: false }).eq("user_id", user.id);
    await supabase.from("model_providers").update({ is_default: true }).eq("id", id);
    fetchProviders();
    toast({ title: "已设为默认" });
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const url = `${form.api_base_url}/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (form.api_key) headers["Authorization"] = `Bearer ${form.api_key}`;
      
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: form.default_model,
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
        }),
      });
      if (res.ok) {
        toast({ title: "✅ 连接成功", description: "API 服务可用" });
      } else {
        const t = await res.text();
        toast({ title: "❌ 连接失败", description: `状态码 ${res.status}: ${t.slice(0, 100)}`, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "❌ 连接失败", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const previewUrl = form.api_base_url ? `${form.api_base_url}/chat/completions` : "";

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">模型提供商管理</h1>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          添加提供商
        </Button>
      </div>

      {/* Provider Cards */}
      {loading ? (
        <p className="text-muted-foreground text-sm">加载中...</p>
      ) : providers.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">还未添加任何提供商</p>
            <p className="text-xs text-muted-foreground mt-1">点击右上角按钮添加你的第一个 AI 模型提供商</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => {
            const typeInfo = PROVIDER_TYPES.find((t) => t.value === p.provider_type);
            return (
              <Card key={p.id} className="glass group hover:border-primary/30 transition-colors">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl shrink-0">
                    {typeInfo?.icon || "🔧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.is_default && (
                        <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3" /> 默认
                        </span>
                      )}
                      {!p.enabled && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">已禁用</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {typeInfo?.label} · {p.default_model || "未选模型"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!p.is_default && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDefault(p.id)} title="设为默认">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "编辑提供商" : "添加提供商"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Provider Type */}
            <div className="space-y-1.5">
              <Label>提供商类型</Label>
              <Select value={form.provider_type} onValueChange={onTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">{t.icon} {t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>提供商名称</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="例如 OpenAI" />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label className="font-semibold">API 密钥</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={form.api_key}
                    onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="outline" onClick={handleTest} disabled={testing} className="shrink-0 gap-1.5">
                  <FlaskConical className="h-4 w-4" />
                  {testing ? "测试中..." : "检测"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">多个密钥使用逗号分隔</p>
            </div>

            {/* API Base URL */}
            <div className="space-y-1.5">
              <Label className="font-semibold">API 地址</Label>
              <Input
                value={form.api_base_url}
                onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))}
                placeholder="https://api.example.com/v1"
              />
              {previewUrl && <p className="text-xs text-muted-foreground">预览：{previewUrl}</p>}
            </div>

            {/* Model Select */}
            <div className="space-y-1.5">
              <Label className="font-semibold">默认模型</Label>
              {selectedType && selectedType.models.length > 0 ? (
                <Select value={form.default_model} onValueChange={(v) => setForm((f) => ({ ...f, default_model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {selectedType.models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={form.default_model}
                  onChange={(e) => setForm((f) => ({ ...f, default_model: e.target.value }))}
                  placeholder="输入模型名称"
                />
              )}
            </div>

            {/* Generation Parameters */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h4 className="text-sm font-medium text-muted-foreground">生成参数</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">温度 (Temperature)</Label>
                  <span className="text-xs text-muted-foreground font-mono">{form.config_json.temperature}</span>
                </div>
                <Slider
                  value={[form.config_json.temperature]}
                  min={0} max={2} step={0.1}
                  onValueChange={([v]) => setForm((f) => ({ ...f, config_json: { ...f.config_json, temperature: v } }))}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Top P</Label>
                  <span className="text-xs text-muted-foreground font-mono">{form.config_json.top_p}</span>
                </div>
                <Slider
                  value={[form.config_json.top_p]}
                  min={0} max={1} step={0.05}
                  onValueChange={([v]) => setForm((f) => ({ ...f, config_json: { ...f.config_json, top_p: v } }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">最大生成长度 (Max Tokens)</Label>
                <Input
                  type="number"
                  value={form.config_json.max_tokens}
                  onChange={(e) => setForm((f) => ({ ...f, config_json: { ...f.config_json, max_tokens: parseInt(e.target.value) || 4096 } }))}
                />
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center justify-between">
              <Label>启用此提供商</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
            </div>

            <Button onClick={handleSave} className="w-full">保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
