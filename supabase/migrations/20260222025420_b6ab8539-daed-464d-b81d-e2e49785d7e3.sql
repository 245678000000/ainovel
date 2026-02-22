
-- Add api_keys_json column to profiles for storing encrypted API keys per model
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_keys_json JSONB DEFAULT '{}';
