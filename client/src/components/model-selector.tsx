import * as React from "react";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PROVIDER_LABELS, type Provider } from "@shared/models";
import type { DefaultModels, SelectedModels } from "@shared/schema";

interface ModelSelectorProps {
  storyId?: number;
  sessionProvider?: string;
  sessionModel?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
}

interface ModelWithProvider {
  id: string;
  name: string;
  provider: Provider;
  displayName: string;
}

const PROVIDERS: Provider[] = ["gemini", "chatgpt", "claude", "grok"];

export function ModelSelector({ 
  storyId, 
  sessionProvider = "", 
  sessionModel = "",
  onProviderChange,
  onModelChange
}: ModelSelectorProps) {
  const [selectedValue, setSelectedValue] = useState("");
  const [availableModels, setAvailableModels] = useState<ModelWithProvider[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch user's default models
  const { data: defaultModelsData } = useQuery<{ models: DefaultModels }>({
    queryKey: ["/api/auth/default-models"],
  });

  // Fetch admin's selected models (models available for selection)
  const { data: selectedModelsData } = useQuery<{ models: SelectedModels }>({
    queryKey: ["/api/auth/selected-models"],
  });

  // Set initial selected value from session
  useEffect(() => {
    if (sessionProvider && sessionModel) {
      setSelectedValue(`${sessionProvider}:${sessionModel}`);
    }
  }, [sessionProvider, sessionModel]);

  // Load all selected models when selectedModelsData is available
  useEffect(() => {
    if (selectedModelsData?.models) {
      loadAllSelectedModels();
    }
  }, [selectedModelsData]);

  // Set default model when models load and no session model exists
  useEffect(() => {
    if (!sessionProvider && !sessionModel && availableModels.length > 0 && defaultModelsData?.models) {
      // Try to find user's default model
      for (const provider of PROVIDERS) {
        const defaultModel = defaultModelsData.models[provider];
        if (defaultModel) {
          const found = availableModels.find(m => m.provider === provider && m.id === defaultModel);
          if (found) {
            const value = `${provider}:${defaultModel}`;
            setSelectedValue(value);
            onProviderChange?.(provider);
            onModelChange?.(defaultModel);
            return;
          }
        }
      }
      // If no default found, select first available model
      if (availableModels.length > 0) {
        const first = availableModels[0];
        const value = `${first.provider}:${first.id}`;
        setSelectedValue(value);
        onProviderChange?.(first.provider);
        onModelChange?.(first.id);
      }
    }
  }, [availableModels, defaultModelsData, sessionProvider, sessionModel]);

  const loadAllSelectedModels = async () => {
    if (!selectedModelsData?.models) return;

    setLoadingModels(true);
    const allModels: ModelWithProvider[] = [];

    try {
      // Load models for each provider that has selected models
      for (const provider of PROVIDERS) {
        const selectedModelIds = selectedModelsData.models[provider];
        if (!selectedModelIds || selectedModelIds.length === 0) {
          continue;
        }

        try {
          const response = await fetch(`/api/ai/models/${provider}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({}),
          });
          
          if (response.ok) {
            const data = await response.json();
            const providerModels = data.models || [];
            
            // Filter to only include selected models
            const filtered = providerModels
              .filter((m: any) => selectedModelIds.includes(m.id))
              .map((m: any) => ({
                id: m.id,
                name: m.name,
                provider,
                displayName: `${PROVIDER_LABELS[provider]} - ${m.name}`
              }));
            
            allModels.push(...filtered);
          } else {
            console.warn(`Failed to load models for ${provider}`);
          }
        } catch (error) {
          console.error(`Failed to load models for ${provider}:`, error);
        }
      }

      setAvailableModels(allModels);
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleModelChange = (value: string) => {
    setSelectedValue(value);
    const [provider, modelId] = value.split(":");
    onProviderChange?.(provider);
    onModelChange?.(modelId);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <Label className="text-sm font-semibold">모델 선택</Label>
        </div>
        {loadingModels ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>모델 로딩 중...</span>
          </div>
        ) : availableModels.length > 0 ? (
          <RadioGroup value={selectedValue} onValueChange={handleModelChange}>
            {availableModels.map((m) => {
              const value = `${m.provider}:${m.id}`;
              return (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem 
                    value={value} 
                    id={`model-${value}`}
                    data-testid={`radio-model-${m.provider}-${m.id}`}
                  />
                  <Label 
                    htmlFor={`model-${value}`}
                    className="font-normal cursor-pointer text-sm"
                  >
                    {m.displayName}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground">사용 가능한 모델이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
