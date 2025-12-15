import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PROVIDER_LABELS, MODEL_CATALOG, type Provider } from "@shared/models";
import type { DefaultModel, SelectedModels } from "@shared/schema";

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

  // Fetch user's default model
  const { data: defaultModelData } = useQuery<{ model: DefaultModel | null }>({
    queryKey: ["/api/auth/default-models"],
  });

  // Fetch admin's selected models (models available for selection)
  const { data: selectedModelsData } = useQuery<{ models: SelectedModels }>({
    queryKey: ["/api/auth/selected-models"],
  });

  // Build available models from MODEL_CATALOG and selected models
  const availableModels = useMemo(() => {
    if (!selectedModelsData?.models) return [];

    const models: ModelWithProvider[] = [];

    for (const provider of PROVIDERS) {
      const selectedModelIds = selectedModelsData.models[provider];
      if (!selectedModelIds || selectedModelIds.length === 0) {
        continue;
      }

      // Get model metadata from MODEL_CATALOG
      const providerModels = MODEL_CATALOG[provider];
      
      for (const modelId of selectedModelIds) {
        const modelInfo = providerModels.find(m => m.id === modelId);
        if (modelInfo) {
          models.push({
            id: modelInfo.id,
            name: modelInfo.name,
            provider,
            displayName: `${PROVIDER_LABELS[provider]} - ${modelInfo.name}`
          });
        } else {
          // Model not in catalog - include it anyway with ID as name
          console.warn(`Model ${modelId} not found in MODEL_CATALOG for provider ${provider}`);
          models.push({
            id: modelId,
            name: modelId,
            provider,
            displayName: `${PROVIDER_LABELS[provider]} - ${modelId}`
          });
        }
      }
    }

    return models;
  }, [selectedModelsData]);

  // Set initial selected value from session
  useEffect(() => {
    if (sessionProvider && sessionModel) {
      setSelectedValue(`${sessionProvider}:${sessionModel}`);
    }
  }, [sessionProvider, sessionModel]);

  // Set default model when models load and no session model exists
  useEffect(() => {
    if (!sessionProvider && !sessionModel && availableModels.length > 0 && defaultModelData?.model) {
      // Find user's default model from available models
      const defaultModel = availableModels.find(model => 
        defaultModelData.model?.provider === model.provider && 
        defaultModelData.model?.modelId === model.id
      );

      if (defaultModel) {
        // Found user's default model
        const value = `${defaultModel.provider}:${defaultModel.id}`;
        setSelectedValue(value);
        onProviderChange?.(defaultModel.provider);
        onModelChange?.(defaultModel.id);
      } else if (availableModels.length > 0) {
        // No default found, select first available model
        const first = availableModels[0];
        const value = `${first.provider}:${first.id}`;
        setSelectedValue(value);
        onProviderChange?.(first.provider);
        onModelChange?.(first.id);
      }
    }
  }, [availableModels, defaultModelData, sessionProvider, sessionModel, onProviderChange, onModelChange]);

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
        {availableModels.length > 0 ? (
          <Select value={selectedValue} onValueChange={handleModelChange}>
            <SelectTrigger data-testid="select-model-trigger">
              <SelectValue placeholder="모델을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => {
                const value = `${m.provider}:${m.id}`;
                return (
                  <SelectItem 
                    key={value} 
                    value={value}
                    data-testid={`select-model-${m.provider}-${m.id}`}
                  >
                    {m.displayName}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">사용 가능한 모델이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
