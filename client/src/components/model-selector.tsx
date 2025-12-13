import * as React from "react";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PROVIDER_LABELS, type Provider } from "@shared/models";
import type { DefaultModels } from "@shared/schema";

interface ModelSelectorProps {
  storyId?: number;
  sessionProvider?: string;
  sessionModel?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
}

const PROVIDERS: Provider[] = ["gemini", "chatgpt", "claude", "grok"];

export function ModelSelector({ 
  storyId, 
  sessionProvider = "", 
  sessionModel = "",
  onProviderChange,
  onModelChange
}: ModelSelectorProps) {
  const [provider, setProvider] = useState(sessionProvider || "auto");
  const [model, setModel] = useState(sessionModel || "");
  const [models, setModels] = useState<{id: string, name: string}[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch user's default models
  const { data: defaultModelsData } = useQuery<{ models: DefaultModels }>({
    queryKey: ["/api/auth/default-models"],
  });

  useEffect(() => {
    setProvider(sessionProvider || "auto");
    setModel(sessionModel || "");
  }, [sessionProvider, sessionModel]);

  useEffect(() => {
    if (provider && provider !== "auto") {
      loadModels(provider);
    } else {
      setModels([]);
      setModel("");
    }
  }, [provider]);

  // Set default model when models load and no session model exists
  useEffect(() => {
    if (!sessionModel && models.length > 0 && provider !== "auto" && defaultModelsData?.models) {
      const defaultModel = defaultModelsData.models[provider as Provider];
      if (defaultModel && models.some((m: any) => m.id === defaultModel)) {
        setModel(defaultModel);
        onModelChange?.(defaultModel);
      } else if (!model) {
        setModel(models[0].id);
        onModelChange?.(models[0].id);
      }
    }
  }, [models, defaultModelsData, provider, sessionModel]);

  const loadModels = async (providerName: string) => {
    setLoadingModels(true);
    try {
      const response = await fetch(`/api/ai/models/${providerName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      
      if (response.ok) {
        const data = await response.json();
        const fetchedModels = data.models || [];
        setModels(fetchedModels);
        
      } else {
        const error = await response.json();
        console.warn(`Failed to load models for ${providerName}:`, error.error);
        setModels([]);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setModel("");
    onProviderChange?.(newProvider === "auto" ? "" : newProvider);
    onModelChange?.("");
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    onModelChange?.(newModel);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">AI 제공자</Label>
        </div>
        <RadioGroup value={provider} onValueChange={handleProviderChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="auto" id="provider-auto" data-testid="radio-provider-auto" />
            <Label htmlFor="provider-auto" className="font-normal cursor-pointer text-sm">
              자동 선택
            </Label>
          </div>
          {PROVIDERS.map((p) => (
            <div key={p} className="flex items-center space-x-2">
              <RadioGroupItem value={p} id={`provider-${p}`} data-testid={`radio-provider-${p}`} />
              <Label htmlFor={`provider-${p}`} className="font-normal cursor-pointer text-sm">
                {PROVIDER_LABELS[p]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      {provider && provider !== "auto" && (
        <div className="space-y-3 pl-1">
          <Label className="text-sm font-semibold">모델 선택</Label>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>모델 로딩 중...</span>
            </div>
          ) : models.length > 0 ? (
            <RadioGroup value={model} onValueChange={handleModelChange}>
              {models.map((m) => (
                <div key={m.id} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={m.id} 
                    id={`model-${provider}-${m.id}`}
                    data-testid={`radio-model-${provider}-${m.id}`}
                  />
                  <Label 
                    htmlFor={`model-${provider}-${m.id}`}
                    className="font-normal cursor-pointer text-sm"
                  >
                    {m.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <p className="text-sm text-muted-foreground">사용 가능한 모델이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}
