
-- Create model_providers table
CREATE TABLE public.model_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  api_key TEXT DEFAULT '',
  api_base_url TEXT DEFAULT '',
  default_model TEXT DEFAULT '',
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  config_json JSONB DEFAULT '{"temperature": 0.7, "top_p": 0.9, "max_tokens": 4096}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own providers" ON public.model_providers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own providers" ON public.model_providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own providers" ON public.model_providers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own providers" ON public.model_providers FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_model_providers_updated_at
  BEFORE UPDATE ON public.model_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
