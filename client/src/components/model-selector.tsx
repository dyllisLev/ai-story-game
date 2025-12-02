import * as React from "react";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";

interface ModelSelectorProps {
  storyId?: number;
  sessionProvider?: string;
  sessionModel?: string;
  onProviderChange?: (provider: string) => void;
  onModelChange?: (model: string) => void;
}

const PROVIDERS = [
  { id: "gemini", name: "Gemini" },
  { id: "chatgpt", name: "ChatGPT" },
  { id: "claude", name: "Claude" },
  { id: "grok", name: "Grok" },
];

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

  useEffect(() => {
    setProvider(sessionProvider || "auto");
    setModel(sessionModel || "");
  }, [sessionProvider, sessionModel]);

  useEffect(() => {
    if (provider && provider !== "auto") {
      loadModels(provider);
    } else {
      setModels([]);
    }
  }, [provider]);

  const loadModels = async (providerName: string) => {
    setLoadingModels(true);
    try {
      // First, get the API key from settings
      const settingsResponse = await fetch("/api/settings");
      if (!settingsResponse.ok) {
        console.error("Failed to load settings");
        setModels([]);
        return;
      }
      
      const settings = await settingsResponse.json();
      const apiKeySetting = settings.find((s: any) => s.key === `apiKey_${providerName}`);
      const apiKey = apiKeySetting?.value || "";
      
      if (!apiKey) {
        console.warn(`No API key found for ${providerName}`);
        setModels([]);
        return;
      }
      
      // Fetch models using the API key
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerName, apiKey }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      } else {
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="AI 제공자 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">자동 선택</SelectItem>
            {PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {provider && provider !== "auto" && (
        <Select value={model} onValueChange={handleModelChange} disabled={loadingModels}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder={loadingModels ? "모델 로딩 중..." : "모델 선택"} />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
