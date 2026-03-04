#!/bin/bash
# 1. Add import for useModelProviders
sed -i '/import { useToast } from "@/hooks\/use-toast";/a import { useModelProviders } from "@/hooks\/useModelProviders";' src/pages/Generate.tsx

# 2. Remove old state declarations and hook definitions
sed -i '/const \[providers, setProviders\] = useState/,/  }, \[user, loadSettings\]);/d' src/pages/Generate.tsx

# 3. Add useModelProviders hook to Generate component
sed -i '/const \[generationMode, setGenerationMode\] = useState("");/a \ \ const { providers, defaultModel } = useModelProviders();' src/pages/Generate.tsx
