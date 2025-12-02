import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface ApiKeys {
  chatgpt: string;
  grok: string;
  claude: string;
  gemini: string;
}

interface AiModels {
  chatgpt: string;
  grok: string;
  claude: string;
  gemini: string;
}

interface ModelOption {
  id: string;
  name: string;
}

interface AvailableModels {
  chatgpt: ModelOption[];
  grok: ModelOption[];
  claude: ModelOption[];
  gemini: ModelOption[];
}

interface LoadingModels {
  chatgpt: boolean;
  grok: boolean;
  claude: boolean;
  gemini: boolean;
}

const AI_PROVIDERS = [
  { id: "chatgpt", name: "ChatGPT", color: "bg-green-50 border-green-200" },
  { id: "grok", name: "Grok", color: "bg-blue-50 border-blue-200" },
  { id: "claude", name: "Claude", color: "bg-orange-50 border-orange-200" },
  { id: "gemini", name: "Gemini", color: "bg-purple-50 border-purple-200" },
];

export default function Settings() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    chatgpt: "",
    grok: "",
    claude: "",
    gemini: "",
  });
  const [aiModels, setAiModels] = useState<AiModels>({
    chatgpt: "gpt-4o",
    grok: "grok-beta",
    claude: "claude-3-5-sonnet-20241022",
    gemini: "gemini-2.0-flash",
  });
  const [availableModels, setAvailableModels] = useState<AvailableModels>({
    chatgpt: [],
    grok: [],
    claude: [],
    gemini: [],
  });
  const [loadingModels, setLoadingModels] = useState<LoadingModels>({
    chatgpt: false,
    grok: false,
    claude: false,
    gemini: false,
  });
  const [commonPrompt, setCommonPrompt] = useState("");
  const [storyGeneratePrompt, setStoryGeneratePrompt] = useState("");
  const [prologueGeneratePrompt, setPrologueGeneratePrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const settings = await response.json();
      
      const loadedKeys: ApiKeys = {
        chatgpt: "",
        grok: "",
        claude: "",
        gemini: "",
      };
      let loadedPrompt = "";
      
      for (const setting of settings) {
        if (setting.key.startsWith("apiKey_")) {
          const provider = setting.key.replace("apiKey_", "") as keyof ApiKeys;
          if (provider in loadedKeys) {
            loadedKeys[provider] = setting.value;
          }
        } else if (setting.key === "commonPrompt") {
          loadedPrompt = setting.value;
        } else if (setting.key === "storyGeneratePrompt") {
          setStoryGeneratePrompt(setting.value);
        } else if (setting.key === "prologueGeneratePrompt") {
          setPrologueGeneratePrompt(setting.value);
        } else if (setting.key.startsWith("aiModel_")) {
          const provider = setting.key.replace("aiModel_", "") as keyof AiModels;
          setAiModels(prev => ({
            ...prev,
            [provider]: setting.value
          }));
        }
      }
      
      setApiKeys(loadedKeys);
      setCommonPrompt(loadedPrompt);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const handleModelChange = (provider: keyof AiModels, value: string) => {
    setAiModels((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const fetchModels = async (provider: keyof ApiKeys, apiKey: string) => {
    if (!apiKey.trim()) {
      setAvailableModels(prev => ({ ...prev, [provider]: [] }));
      return;
    }

    setLoadingModels(prev => ({ ...prev, [provider]: true }));
    try {
      const response = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await response.json();
      if (response.ok && data.models) {
        setAvailableModels(prev => ({ ...prev, [provider]: data.models }));
        // Select first model if current selection is not in the list
        if (data.models.length > 0 && !data.models.find((m: ModelOption) => m.id === aiModels[provider])) {
          setAiModels(prev => ({ ...prev, [provider]: data.models[0].id }));
        }
      } else {
        setAvailableModels(prev => ({ ...prev, [provider]: [] }));
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${provider}:`, error);
      setAvailableModels(prev => ({ ...prev, [provider]: [] }));
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = [
        ...Object.entries(apiKeys).map(([provider, key]) => ({
          key: `apiKey_${provider}`,
          value: key,
        })),
        ...Object.entries(aiModels).map(([provider, model]) => ({
          key: `aiModel_${provider}`,
          value: model,
        })),
        { key: "commonPrompt", value: commonPrompt },
        { key: "storyGeneratePrompt", value: storyGeneratePrompt },
        { key: "prologueGeneratePrompt", value: prologueGeneratePrompt },
      ];

      await fetch("/api/settings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsData }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">설정</h1>
              <p className="text-muted-foreground text-sm">AI 설정 및 공통 프롬프트 관리</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="space-y-8">
          {/* API Key Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">AI API 키 설정</h2>
              <p className="text-sm text-muted-foreground">각 AI 서비스의 API 키를 입력하세요. (선택사항)</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AI_PROVIDERS.map((provider) => {
                const providerId = provider.id as keyof ApiKeys;
                const hasApiKey = apiKeys[providerId].trim().length > 0;
                const models = availableModels[providerId];
                const isLoadingModels = loadingModels[providerId];
                
                return (
                  <div key={provider.id} className={`p-4 rounded-lg border ${provider.color}`}>
                    <label className="text-sm font-medium mb-2 block">{provider.name}</label>
                    <Input
                      type="password"
                      placeholder={`${provider.name} API Key`}
                      value={apiKeys[providerId]}
                      onChange={(e) => handleApiKeyChange(providerId, e.target.value)}
                      className="font-mono text-sm bg-white mb-2"
                      data-testid={`input-api-key-${provider.id}`}
                    />
                    
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs text-muted-foreground">모델 선택</label>
                      {hasApiKey && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchModels(providerId, apiKeys[providerId])}
                          disabled={isLoadingModels}
                          className="h-5 text-xs px-2"
                          data-testid={`button-fetch-models-${provider.id}`}
                        >
                          {isLoadingModels ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "모델 조회"
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {!hasApiKey ? (
                      <div className="w-full p-2 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                        API 키를 입력하세요
                      </div>
                    ) : isLoadingModels ? (
                      <div className="w-full p-2 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                        모델 조회 중...
                      </div>
                    ) : models.length === 0 ? (
                      <div className="w-full p-2 rounded-md border bg-white text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{aiModels[providerId]}</span>
                          <span className="text-xs text-muted-foreground">(저장됨)</span>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={aiModels[providerId]}
                        onChange={(e) => handleModelChange(providerId, e.target.value)}
                        className="w-full p-2 rounded-md border bg-white text-sm"
                        data-testid={`select-model-${provider.id}`}
                      >
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-xs text-muted-foreground">
              🔒 API 키는 서버의 SQLite 데이터베이스에 안전하게 저장됩니다.
            </p>
          </div>

          <Separator />

          {/* System Prompt Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">AI 페르소나 설정 (채팅용 시스템 프롬프트)</h2>
              <p className="text-sm text-muted-foreground">대화창에서 사용자와 AI가 대화할 때 사용되는 시스템 프롬프트입니다. 변수를 사용하여 동적으로 정보를 포함할 수 있습니다.</p>
            </div>
            <Textarea
              placeholder={`예:
당신은 경험 많은 판타지 소설가입니다.

## 스토리 정보
제목: {title}
장르: {genre}
소개: {description}

## 세계관 설정
{storySettings}

## 현재 상황
{startingSituation}

## 대화 프로필
{conversationProfile}

## 유저 노트
{userNote}

## 최근 대화 기록
{recentMessages}

위 정보를 바탕으로 사용자의 다음 메시지에 생생하고 몰입감 있는 서술과 대화를 제공하세요. 한국어로 응답하세요.`}
              value={commonPrompt}
              onChange={(e) => setCommonPrompt(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              data-testid="textarea-system-prompt"
            />
            <div className="bg-muted/40 border border-muted/80 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">📝 사용 가능한 변수:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div><code className="bg-muted px-1 rounded">{"{title}"}</code> - 스토리 제목</div>
                <div><code className="bg-muted px-1 rounded">{"{description}"}</code> - 한 줄 소개</div>
                <div><code className="bg-muted px-1 rounded">{"{genre}"}</code> - 장르</div>
                <div><code className="bg-muted px-1 rounded">{"{storySettings}"}</code> - 스토리 설정</div>
                <div><code className="bg-muted px-1 rounded">{"{startingSituation}"}</code> - 시작 상황</div>
                <div><code className="bg-muted px-1 rounded">{"{promptTemplate}"}</code> - 프롬프트 템플릿</div>
                <div><code className="bg-muted px-1 rounded">{"{exampleUserInput}"}</code> - 예시 유저 입력</div>
                <div><code className="bg-muted px-1 rounded">{"{exampleAiResponse}"}</code> - 예시 AI 응답</div>
                <div><code className="bg-muted px-1 rounded">{"{conversationProfile}"}</code> - 대화 프로필 (세션)</div>
                <div><code className="bg-muted px-1 rounded">{"{userNote}"}</code> - 유저 노트 (세션)</div>
                <div><code className="bg-muted px-1 rounded">{"{summaryMemory}"}</code> - 요약 메모리 (세션)</div>
                <div><code className="bg-muted px-1 rounded">{"{recentMessages}"}</code> - 최근 대화 목록 (최대 20개)</div>
                <div><code className="bg-muted px-1 rounded">{"{userMessage}"}</code> - 현재 유저 메시지</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">💡 이 프롬프트는 대화창에서 AI와 채팅할 때마다 사용됩니다. 스토리와 세션 정보가 자동으로 주입됩니다.</p>
              <p className="text-xs text-muted-foreground">⚡ <code className="bg-muted px-1 rounded">{"{recentMessages}"}</code>는 오래된 순서부터 최대 20개의 대화를 포함하여 AI가 맥락을 파악할 수 있게 합니다.</p>
            </div>
          </div>

          <Separator />

          {/* Story Generate Prompt Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">스토리 자동 생성 프롬프트</h2>
              <p className="text-sm text-muted-foreground">스토리 설정 및 정보를 자동으로 생성할 때 사용되는 프롬프트입니다.</p>
            </div>
            <Textarea
              placeholder={`예: 다음 정보를 바탕으로 상세한 스토리 설정을 작성해주세요.

제목: {title}
한 줄 소개: {description}
장르: {genre}
프롬프트 템플릿: {promptTemplate}

기존 설정:
{storySettings}

위 정보를 바탕으로 세계관, 주요 등장인물, 배경 설정 등을 포함한 상세한 스토리 설정을 한국어로 작성해주세요.`}
              value={storyGeneratePrompt}
              onChange={(e) => setStoryGeneratePrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              data-testid="textarea-story-generate-prompt"
            />
            <div className="bg-muted/40 border border-muted/80 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">📝 사용 가능한 변수:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><code className="bg-muted px-1 rounded">{"{title}"}</code> - 스토리 제목</li>
                <li><code className="bg-muted px-1 rounded">{"{description}"}</code> - 한 줄 소개</li>
                <li><code className="bg-muted px-1 rounded">{"{genre}"}</code> - 장르</li>
                <li><code className="bg-muted px-1 rounded">{"{promptTemplate}"}</code> - 프롬프트 템플릿</li>
                <li><code className="bg-muted px-1 rounded">{"{storySettings}"}</code> - 기존 스토리 설정</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Prologue Generate Prompt Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">프롤로그/시작 상황 자동 생성 프롬프트</h2>
              <p className="text-sm text-muted-foreground">프롤로그와 시작 상황을 자동으로 생성할 때 사용되는 프롬프트입니다.</p>
            </div>
            <Textarea
              placeholder={`예: 다음 정보를 바탕으로 프롤로그와 시작 상황을 작성해주세요.

제목: {title}
한 줄 소개: {description}
장르: {genre}
스토리 설정: {storySettings}

다음 형식으로 JSON을 반환해주세요:
{
  "prologue": "스토리의 시작을 알리는 몰입감 있는 프롤로그...",
  "startingSituation": "사용자의 역할, 등장인물과의 관계, 현재 상황..."
}`}
              value={prologueGeneratePrompt}
              onChange={(e) => setPrologueGeneratePrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              data-testid="textarea-prologue-generate-prompt"
            />
            <div className="bg-muted/40 border border-muted/80 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">📝 사용 가능한 변수:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><code className="bg-muted px-1 rounded">{"{title}"}</code> - 스토리 제목</li>
                <li><code className="bg-muted px-1 rounded">{"{description}"}</code> - 한 줄 소개</li>
                <li><code className="bg-muted px-1 rounded">{"{genre}"}</code> - 장르</li>
                <li><code className="bg-muted px-1 rounded">{"{storySettings}"}</code> - 스토리 설정</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">⚠️ 반드시 JSON 형식으로 prologue와 startingSituation을 반환하도록 작성하세요.</p>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex gap-3 justify-end pt-4">
            <Link href="/">
              <Button variant="outline">취소</Button>
            </Link>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-white gap-2"
              data-testid="button-save-settings"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장
            </Button>
          </div>

          {/* Save Confirmation */}
          {saved && (
            <div className="fixed bottom-4 right-4 bg-green-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom">
              <span>✓ 설정이 저장되었습니다.</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
