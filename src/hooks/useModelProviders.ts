import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ProviderConfig {
  provider_type: string;
  api_key: string | null;
  is_default: boolean | null;
  name: string;
  default_model: string | null;
  enabled: boolean | null;
  api_base_url: string | null;
}

export function useModelProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [defaultModel, setDefaultModel] = useState("deepseek");
  const [isLoading, setIsLoading] = useState(true);

  const loadProviders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [{ data: profile }, { data: providerData }] = await Promise.all([
        supabase.from("profiles").select("default_llm_model").eq("user_id", user.id).single(),
        supabase.from("model_providers").select("provider_type, api_key, is_default, name, default_model, enabled, api_base_url").eq("user_id", user.id),
      ]);

      if (providerData) {
        setProviders(providerData);
      }

      if (profile) {
        let model = profile.default_llm_model;
        if (!model && providerData && providerData.length > 0) {
          const def = providerData.find((p) => p.is_default && p.enabled !== false);
          const first = providerData.find((p) => p.enabled !== false);
          model = (def || first)?.provider_type || null;
        }
        setDefaultModel(model || "deepseek");
      }
    } catch (error) {
      console.error("Error loading model providers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProviders();

    const onSettingsChanged = () => loadProviders();
    window.addEventListener("model-settings-changed", onSettingsChanged);

    const onVisible = () => {
      if (document.visibilityState === "visible") loadProviders();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("model-settings-changed", onSettingsChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadProviders]);

  return { providers, defaultModel, isLoading, reloadProviders: loadProviders };
}
