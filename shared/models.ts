export interface ModelInfo {
  id: string;
  name: string;
}

export type Provider = "gemini" | "chatgpt" | "claude" | "grok";

export interface SelectedModels {
  gemini: string[];
  chatgpt: string[];
  claude: string[];
  grok: string[];
}

export const MODEL_CATALOG: Record<Provider, ModelInfo[]> = {
  gemini: [
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro Preview" },
    { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash Preview" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B" },
  ],
  chatgpt: [
    { id: "gpt-5.2-pro", name: "GPT-5.2 Pro" },
    { id: "gpt-5.2", name: "GPT-5.2" },
    { id: "gpt-5", name: "GPT-5" },
    { id: "gpt-4.1", name: "GPT-4.1" },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "o1", name: "o1" },
    { id: "o1-mini", name: "o1 Mini" },
    { id: "o1-pro", name: "o1 Pro" },
    { id: "o3", name: "o3" },
    { id: "o3-mini", name: "o3 Mini" },
    { id: "o4-mini", name: "o4 Mini" },
  ],
  claude: [
    { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5" },
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-1-20250805", name: "Claude Opus 4.1" },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  ],
  grok: [
    { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast (Non-Reasoning)" },
    { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast (Non-Reasoning)" },
    { id: "grok-3", name: "Grok 3" },
    { id: "grok-3-fast", name: "Grok 3 Fast" },
    { id: "grok-3-mini", name: "Grok 3 Mini" },
    { id: "grok-3-mini-fast", name: "Grok 3 Mini Fast" },
    { id: "grok-2", name: "Grok 2" },
    { id: "grok-2-mini", name: "Grok 2 Mini" },
    { id: "grok-beta", name: "Grok Beta" },
  ],
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Google Gemini",
  chatgpt: "OpenAI ChatGPT",
  claude: "Anthropic Claude",
  grok: "xAI Grok",
};
