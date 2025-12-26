import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, MessageSquare, Sparkles, BookOpen, Info, Cpu, RefreshCw, Key, Eye, EyeOff, History, Pencil, Image } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { MODEL_CATALOG, PROVIDER_LABELS, type Provider, type SelectedModels } from "@shared/models";

interface ModelInfo {
  id: string;
  name: string;
}

export default function Settings() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Utility to convert escaped newlines to actual newlines
  const normalizeNewlines = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.replace(/\\n/g, "\n");
  };
  
  const [commonPrompt, setCommonPrompt] = useState("");
  const [storyGeneratePrompt, setStoryGeneratePrompt] = useState("");
  const [prologueGeneratePrompt, setPrologueGeneratePrompt] = useState("");
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [summaryProvider, setSummaryProvider] = useState("gemini");
  const [summaryModel, setSummaryModel] = useState("gemini-2.0-flash-exp");
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState("");
  const [imageGenerationProvider, setImageGenerationProvider] = useState("gemini");
  const [imageGenerationModel, setImageGenerationModel] = useState("gemini-2.5-flash-image");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [promptEditorTab, setPromptEditorTab] = useState<"edit" | "preview">("edit");
  
  const [selectedModels, setSelectedModels] = useState<SelectedModels>({
    gemini: [],
    chatgpt: [],
    claude: [],
    grok: []
  });
  const [availableModels, setAvailableModels] = useState<Record<Provider, { id: string; name: string }[]>>({
    gemini: [],
    chatgpt: [],
    claude: [],
    grok: []
  });
  const [loadingModels, setLoadingModels] = useState<Record<Provider, boolean>>({
    gemini: false,
    chatgpt: false,
    claude: false,
    grok: false
  });
  const [savingModels, setSavingModels] = useState(false);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: "",
    chatgpt: "",
    claude: "",
    grok: ""
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [savingApiKeys, setSavingApiKeys] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    loadSettings();
    loadSelectedModels();
    loadApiKeys();
  }, []);

  // 모델 탭 진입 시 자동으로 모든 제공업체 모델 조회
  useEffect(() => {
    if (activeTab === "models") {
      const providers: Provider[] = ["gemini", "chatgpt", "claude", "grok"];
      providers.forEach(provider => {
        if (availableModels[provider].length === 0) {
          fetchModelsForProvider(provider);
        }
      });
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const settings = await response.json();
      
      for (const setting of settings) {
        if (setting.key === "commonPrompt") {
          setCommonPrompt(normalizeNewlines(setting.value));
        } else if (setting.key === "storyGeneratePrompt") {
          setStoryGeneratePrompt(normalizeNewlines(setting.value));
        } else if (setting.key === "prologueGeneratePrompt") {
          setPrologueGeneratePrompt(normalizeNewlines(setting.value));
        } else if (setting.key === "summaryPrompt") {
          setSummaryPrompt(normalizeNewlines(setting.value));
        } else if (setting.key === "summaryProvider") {
          setSummaryProvider(setting.value);
        } else if (setting.key === "summaryModel") {
          setSummaryModel(setting.value);
        } else if (setting.key === "imageGenerationPrompt") {
          setImageGenerationPrompt(normalizeNewlines(setting.value));
        } else if (setting.key === "imageGenerationProvider") {
          setImageGenerationProvider(setting.value);
        } else if (setting.key === "imageGenerationModel") {
          setImageGenerationModel(setting.value);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const response = await fetch("/api/settings");
      const settings = await response.json();
      
      const newApiKeys: Record<string, string> = {
        gemini: "",
        chatgpt: "",
        claude: "",
        grok: ""
      };
      
      for (const setting of settings) {
        if (setting.key.startsWith("apiKey_")) {
          const provider = setting.key.replace("apiKey_", "");
          newApiKeys[provider] = setting.value || "";
        }
      }
      
      setApiKeys(newApiKeys);
    } catch (error) {
      console.error("Failed to load API keys:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = [
        { key: "commonPrompt", value: commonPrompt },
        { key: "storyGeneratePrompt", value: storyGeneratePrompt },
        { key: "prologueGeneratePrompt", value: prologueGeneratePrompt },
        { key: "summaryPrompt", value: summaryPrompt },
        { key: "summaryProvider", value: summaryProvider },
        { key: "summaryModel", value: summaryModel },
        { key: "imageGenerationPrompt", value: imageGenerationPrompt },
        { key: "imageGenerationProvider", value: imageGenerationProvider },
        { key: "imageGenerationModel", value: imageGenerationModel },
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

  const loadSelectedModels = async () => {
    try {
      const response = await fetch("/api/auth/selected-models");
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          setSelectedModels(data.models);
        }
      }
    } catch (error) {
      console.error("Failed to load selected models:", error);
    }
  };

  const fetchModelsForProvider = async (provider: Provider) => {
    setLoadingModels(prev => ({ ...prev, [provider]: true }));
    try {
      const response = await fetch(`/api/ai/models/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(prev => ({ ...prev, [provider]: data.models || [] }));
      } else {
        const error = await response.json();
        console.error(`Failed to fetch ${provider} models:`, error.error);
      }
    } catch (error) {
      console.error(`Failed to fetch ${provider} models:`, error);
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  const toggleModelSelection = (provider: keyof SelectedModels, modelId: string) => {
    setSelectedModels(prev => {
      const current = prev[provider];
      if (current.includes(modelId)) {
        return { ...prev, [provider]: current.filter(m => m !== modelId) };
      } else {
        return { ...prev, [provider]: [...current, modelId] };
      }
    });
  };

  const handleSaveModels = async () => {
    setSavingModels(true);
    try {
      console.log("[DEBUG] 저장할 모델:", JSON.stringify(selectedModels, null, 2));
      
      const response = await fetch("/api/auth/selected-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: selectedModels }),
      });
      
      console.log("[DEBUG] 응답 상태:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[DEBUG] 저장 실패:", errorData);
        alert(`모델 저장 실패: ${errorData.error || '알 수 없는 오류'}`);
        return;
      }
      
      const result = await response.json();
      console.log("[DEBUG] 저장 성공:", result);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("[DEBUG] 모델 저장 중 에러:", error);
      alert(`모델 저장 중 오류가 발생했습니다: ${error}`);
    } finally {
      setSavingModels(false);
    }
  };

  const handleSaveApiKey = async (provider: string) => {
    setSavingApiKeys(true);
    try {
      const settingsData = [
        { key: `apiKey_${provider}`, value: apiKeys[provider] || "" },
      ];

      await fetch("/api/settings/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsData }),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save API key:", error);
      alert("API 키 저장에 실패했습니다.");
    } finally {
      setSavingApiKeys(false);
    }
  };

  const toggleShowApiKey = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">설정</h1>
              <p className="text-muted-foreground text-sm">시스템 프롬프트 관리</p>
            </div>
          </div>
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
      </header>

      <main className="container mx-auto px-6 py-6 max-w-3xl flex-1">

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="chat" className="gap-2" data-testid="tab-chat">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">채팅 프롬프트</span>
              <span className="sm:hidden">채팅</span>
            </TabsTrigger>
            <TabsTrigger value="story" className="gap-2" data-testid="tab-story">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">스토리 생성</span>
              <span className="sm:hidden">스토리</span>
            </TabsTrigger>
            <TabsTrigger value="prologue" className="gap-2" data-testid="tab-prologue">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">프롤로그 생성</span>
              <span className="sm:hidden">프롤로그</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2" data-testid="tab-summary">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">요약 생성</span>
              <span className="sm:hidden">요약</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2" data-testid="tab-image">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">이미지 생성</span>
              <span className="sm:hidden">이미지</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2" data-testid="tab-models">
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">모델 관리</span>
              <span className="sm:hidden">모델</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">AI 페르소나 설정</h2>
                  <p className="text-sm text-muted-foreground">
                    대화창에서 AI가 응답할 때 사용되는 시스템 프롬프트입니다. 마크다운 형식을 지원합니다.
                  </p>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex border-b bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setPromptEditorTab("edit")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        promptEditorTab === "edit"
                          ? "bg-background text-foreground border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid="tab-prompt-edit"
                    >
                      <Pencil className="w-4 h-4" />
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromptEditorTab("preview")}
                      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                        promptEditorTab === "preview"
                          ? "bg-background text-foreground border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid="tab-prompt-preview"
                    >
                      <Eye className="w-4 h-4" />
                      미리보기
                    </button>
                  </div>
                  
                  {promptEditorTab === "edit" ? (
                    <Textarea
                      placeholder={`예:
# AI 역할 정의

당신은 경험 많은 소설가입니다.

## 역할
- 주어진 세계관과 설정을 바탕으로 스토리를 전개합니다
- 사용자의 선택에 따라 생생하게 이야기를 발전시킵니다

## 입력 정보
- **제목**: {title}
- **장르**: {genre}
- **설명**: {description}`}
                      value={commonPrompt}
                      onChange={(e) => setCommonPrompt(e.target.value)}
                      className="min-h-[280px] md:min-h-[400px] lg:min-h-[500px] font-mono text-sm border-0 rounded-none focus-visible:ring-0 resize-y"
                      data-testid="textarea-system-prompt"
                    />
                  ) : (
                    <div 
                      className="min-h-[280px] md:min-h-[400px] lg:min-h-[500px] p-4 overflow-auto bg-background prose prose-sm dark:prose-invert max-w-none"
                      data-testid="preview-system-prompt"
                    >
                      {commonPrompt ? (
                        <ReactMarkdown>{commonPrompt}</ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic">프롬프트를 입력하면 미리보기가 표시됩니다.</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">사용 가능한 변수</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{title}"}</code> 스토리 제목</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{description}"}</code> 한 줄 소개</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{genre}"}</code> 장르</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{storySettings}"}</code> 스토리 설정</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{startingSituation}"}</code> 시작 상황</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{promptTemplate}"}</code> 프롬프트 템플릿</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{exampleUserInput}"}</code> 예시 유저 입력</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{exampleAiResponse}"}</code> 예시 AI 응답</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{conversationProfile}"}</code> 대화 프로필 내용</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{conversationProfileName}"}</code> 대화 프로필 이름</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{userNote}"}</code> 유저 노트</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{summaryMemory}"}</code> 요약 메모리</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{recentMessages}"}</code> 최근 대화 (최대 20개)</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{userMessage}"}</code> 현재 유저 메시지</div>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-muted">
                  이 프롬프트는 대화창에서 AI와 채팅할 때마다 사용됩니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="story" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">스토리 자동 생성 프롬프트</h2>
                  <p className="text-sm text-muted-foreground">
                    스토리 설정 및 세계관을 자동으로 생성할 때 사용됩니다.
                  </p>
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
                  className="min-h-[240px] font-mono text-sm"
                  data-testid="textarea-story-generate-prompt"
                />
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">사용 가능한 변수</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{title}"}</code> 스토리 제목</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{description}"}</code> 한 줄 소개</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{genre}"}</code> 장르</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{promptTemplate}"}</code> 프롬프트 템플릿</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{storySettings}"}</code> 기존 스토리 설정</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prologue" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">프롤로그/시작 상황 생성 프롬프트</h2>
                  <p className="text-sm text-muted-foreground">
                    프롤로그와 시작 상황을 자동으로 생성할 때 사용됩니다.
                  </p>
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
                  className="min-h-[240px] font-mono text-sm"
                  data-testid="textarea-prologue-generate-prompt"
                />
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">사용 가능한 변수</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{title}"}</code> 스토리 제목</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{description}"}</code> 한 줄 소개</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{genre}"}</code> 장르</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{storySettings}"}</code> 스토리 설정</div>
                </div>
                <div className="pt-2 border-t border-muted">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    반드시 JSON 형식으로 <code className="bg-background px-1 rounded">prologue</code>와 <code className="bg-background px-1 rounded">startingSituation</code>을 반환하도록 작성하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">요약 생성 설정</h2>
                  <p className="text-sm text-muted-foreground">
                    대화 내용을 요약할 때 사용되는 모델과 프롬프트를 설정합니다.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-muted space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-semibold">요약 생성 모델</Label>
                    </div>
                    {(() => {
                      // Get available providers (providers with selected models)
                      const availableProviders = (["gemini", "chatgpt", "claude", "grok"] as const).filter(
                        p => selectedModels[p] && selectedModels[p].length > 0
                      );
                      
                      // Get models for current provider
                      const currentProviderModels = summaryProvider && selectedModels[summaryProvider as Provider]
                        ? selectedModels[summaryProvider as Provider].map(modelId => {
                            const modelInfo = MODEL_CATALOG[summaryProvider as Provider]?.find(m => m.id === modelId);
                            return modelInfo || { id: modelId, name: modelId };
                          })
                        : [];
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="summary-provider" className="text-xs text-muted-foreground">AI 제공업체</Label>
                              <select
                                id="summary-provider"
                                value={summaryProvider}
                                onChange={(e) => {
                                  setSummaryProvider(e.target.value);
                                  // Reset to first available model for new provider
                                  const newProviderModels = selectedModels[e.target.value as Provider] || [];
                                  if (newProviderModels.length > 0) {
                                    setSummaryModel(newProviderModels[0]);
                                  }
                                }}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                data-testid="select-summary-provider"
                              >
                                {availableProviders.length === 0 && (
                                  <option value="">모델을 먼저 설정하세요</option>
                                )}
                                {availableProviders.map(p => (
                                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="summary-model" className="text-xs text-muted-foreground">모델</Label>
                              <select
                                id="summary-model"
                                value={summaryModel}
                                onChange={(e) => setSummaryModel(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                data-testid="select-summary-model"
                                disabled={currentProviderModels.length === 0}
                              >
                                {currentProviderModels.length === 0 && (
                                  <option value="">사용 가능한 모델 없음</option>
                                )}
                                {currentProviderModels.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {currentProviderModels.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              선택한 모델: <span className="font-medium text-foreground">{PROVIDER_LABELS[summaryProvider as Provider]} - {currentProviderModels.find(m => m.id === summaryModel)?.name || summaryModel}</span>
                            </p>
                          )}
                          {availableProviders.length === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              "모델" 탭에서 사용할 모델을 먼저 선택하세요.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="pt-4 border-t border-muted">
                  <Label className="text-sm font-semibold mb-2 block">요약 생성 프롬프트</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    대화 내용을 요약할 때 사용되는 프롬프트입니다.
                  </p>
                <Textarea
                  placeholder={`예: 당신은 인터랙티브 스토리의 타임라인을 작성하는 AI입니다.
다음 규칙을 반드시 따르세요:
1. **형식**: [시간] 사건 요약 한 줄
2. **시간 표기**: [1턴], [5턴], [12턴] 등 턴 번호 사용
3. **각 사건은 한 줄로**: 간결하게 핵심만 표현 (20-30자 내외)

[기존 요약]
{existingSummary}

[현재 핵심 분기점 - 유지]
{existingPlotPoints}

[최근 AI 응답 {messageCount}개]
{aiMessages}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "기존 타임라인\\n[새로운턴] 새 사건\\n[다음턴] 다음 사건",
  "keyPlotPoints": ["간결한 분기점 (최대 30개)"]
}`}
                  value={summaryPrompt}
                  onChange={(e) => setSummaryPrompt(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  data-testid="textarea-summary-prompt"
                />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">사용 가능한 변수</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{existingSummary}"}</code> 기존 타임라인 요약</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{aiMessages}"}</code> 최근 AI 응답 내용</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">이미지 생성 설정</h2>
                  <p className="text-sm text-muted-foreground">
                    메시지 내용을 기반으로 이미지를 생성할 때 사용되는 모델을 설정합니다.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-muted space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-primary" />
                      <Label className="text-sm font-semibold">이미지 생성 모델</Label>
                    </div>
                    {(() => {
                      // Get available providers (providers with selected models)
                      const availableProviders = (["gemini", "chatgpt", "claude", "grok"] as const).filter(
                        p => selectedModels[p] && selectedModels[p].length > 0
                      );
                      
                      // Get models for current provider
                      const currentProviderModels = imageGenerationProvider && selectedModels[imageGenerationProvider as Provider]
                        ? selectedModels[imageGenerationProvider as Provider].map(modelId => {
                            const modelInfo = MODEL_CATALOG[imageGenerationProvider as Provider]?.find(m => m.id === modelId);
                            return modelInfo || { id: modelId, name: modelId };
                          })
                        : [];
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="image-provider" className="text-xs text-muted-foreground">AI 제공업체</Label>
                              <select
                                id="image-provider"
                                value={imageGenerationProvider}
                                onChange={(e) => {
                                  setImageGenerationProvider(e.target.value);
                                  // Reset to first available model for new provider
                                  const newProviderModels = selectedModels[e.target.value as Provider] || [];
                                  if (newProviderModels.length > 0) {
                                    setImageGenerationModel(newProviderModels[0]);
                                  }
                                }}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                data-testid="select-image-provider"
                              >
                                {availableProviders.length === 0 && (
                                  <option value="">모델을 먼저 설정하세요</option>
                                )}
                                {availableProviders.map(p => (
                                  <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="image-model" className="text-xs text-muted-foreground">모델</Label>
                              <select
                                id="image-model"
                                value={imageGenerationModel}
                                onChange={(e) => setImageGenerationModel(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                data-testid="select-image-model"
                                disabled={currentProviderModels.length === 0}
                              >
                                {currentProviderModels.length === 0 && (
                                  <option value="">사용 가능한 모델 없음</option>
                                )}
                                {currentProviderModels.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {currentProviderModels.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              선택한 모델: <span className="font-medium text-foreground">{PROVIDER_LABELS[imageGenerationProvider as Provider]} - {currentProviderModels.find(m => m.id === imageGenerationModel)?.name || imageGenerationModel}</span>
                            </p>
                          )}
                          {availableProviders.length === 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              "모델" 탭에서 사용할 모델을 먼저 선택하세요.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="pt-4 border-t border-muted">
                  <Label className="text-sm font-semibold mb-2 block">이미지 생성 프롬프트</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    메시지 내용을 이미지로 생성할 때 사용되는 프롬프트 템플릿입니다. 비워두면 메시지 내용을 그대로 사용합니다.
                  </p>
                <Textarea
                  placeholder={`예: 다음 내용을 바탕으로 고품질의 이미지를 생성해주세요:

{messageContent}

스타일: 사실적이고 생생한 묘사
품질: 4K, 고해상도
분위기: {genre}에 어울리는 분위기`}
                  value={imageGenerationPrompt}
                  onChange={(e) => setImageGenerationPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-image-generation-prompt"
                />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">사용 가능한 변수</p>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{messageContent}"}</code> 클릭한 메시지의 내용</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{genre}"}</code> 스토리 장르</div>
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{title}"}</code> 스토리 제목</div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 pt-2 border-t border-muted">
                  <strong>권장:</strong> Gemini의 <code className="bg-background px-1.5 py-0.5 rounded">gemini-2.5-flash-image</code> (Nano Banana Pro) 모델을 이미지 생성에 사용하세요.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">AI 모델 관리</h2>
                    <p className="text-sm text-muted-foreground">
                      API 키를 설정하고 사용할 모델을 선택하세요.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveModels}
                    disabled={savingModels}
                    className="gap-2"
                    data-testid="button-save-models"
                  >
                    {savingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    모델 저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(["gemini", "chatgpt", "claude", "grok"] as const).map((provider) => {
              const label = PROVIDER_LABELS[provider];
              const models = availableModels[provider].length > 0 ? availableModels[provider] : MODEL_CATALOG[provider];
              
              return (
              <Card key={provider}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">{label}</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`apikey-${provider}`}>API 키</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`apikey-${provider}`}
                          data-testid={`input-apikey-${provider}`}
                          type={showApiKeys[provider] ? "text" : "password"}
                          placeholder={`${label} API 키 입력`}
                          value={apiKeys[provider] || ""}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => toggleShowApiKey(provider)}
                          data-testid={`button-toggle-apikey-${provider}`}
                        >
                          {showApiKeys[provider] ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSaveApiKey(provider)}
                        disabled={savingApiKeys}
                        data-testid={`button-save-apikey-${provider}`}
                        className="gap-2 shrink-0"
                      >
                        {savingApiKeys ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        저장
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-muted space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">선택 가능한 모델</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchModelsForProvider(provider)}
                        disabled={loadingModels[provider]}
                        className="gap-2 h-7"
                        data-testid={`button-fetch-${provider}`}
                      >
                        {loadingModels[provider] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        새로고침
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {models.map((model) => (
                        <div 
                          key={model.id} 
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`model-${provider}-${model.id}`}
                            checked={selectedModels[provider].includes(model.id)}
                            onCheckedChange={() => toggleModelSelection(provider, model.id)}
                            data-testid={`checkbox-${provider}-${model.id}`}
                          />
                          <label 
                            htmlFor={`model-${provider}-${model.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="font-medium text-sm">{model.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({model.id})</span>
                          </label>
                        </div>
                      ))}
                    </div>

                    {selectedModels[provider].length > 0 && (
                      <div className="pt-2 border-t border-muted">
                        <p className="text-xs text-muted-foreground">
                          선택된 모델: {selectedModels[provider].join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </TabsContent>
        </Tabs>
      </main>

      {saved && (
        <div className="fixed bottom-4 right-4 bg-green-500/90 text-white px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-bottom shadow-lg">
          <span>설정이 저장되었습니다.</span>
        </div>
      )}
    </div>
  );
}
