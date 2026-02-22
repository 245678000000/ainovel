
-- Profiles table for user settings
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  default_llm_model TEXT DEFAULT 'deepseek',
  nsfw_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Novels table
CREATE TABLE public.novels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  genre TEXT[] DEFAULT '{}',
  outline TEXT,
  settings_json JSONB DEFAULT '{}',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chapters table
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Characters table
CREATE TABLE public.characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  card_json JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Novels policies
CREATE POLICY "Users can view own novels" ON public.novels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own novels" ON public.novels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own novels" ON public.novels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own novels" ON public.novels FOR DELETE USING (auth.uid() = user_id);

-- Chapters policies (via novel ownership)
CREATE POLICY "Users can view own chapters" ON public.chapters FOR SELECT USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = chapters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can create own chapters" ON public.chapters FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = chapters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can update own chapters" ON public.chapters FOR UPDATE USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = chapters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can delete own chapters" ON public.chapters FOR DELETE USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = chapters.novel_id AND novels.user_id = auth.uid()));

-- Characters policies (via novel ownership)
CREATE POLICY "Users can view own characters" ON public.characters FOR SELECT USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = characters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can create own characters" ON public.characters FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = characters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can update own characters" ON public.characters FOR UPDATE USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = characters.novel_id AND novels.user_id = auth.uid()));
CREATE POLICY "Users can delete own characters" ON public.characters FOR DELETE USING (EXISTS (SELECT 1 FROM public.novels WHERE novels.id = characters.novel_id AND novels.user_id = auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_novels_updated_at BEFORE UPDATE ON public.novels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
