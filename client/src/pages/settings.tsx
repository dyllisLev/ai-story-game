import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2, MessageSquare, Sparkles, BookOpen, Info, Cpu, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MODEL_CATALOG, PROVIDER_LABELS, type Provider, type SelectedModels } from "@shared/models";

interface ModelInfo {
  id: string;
  name: string;
}

export default function Settings() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [commonPrompt, setCommonPrompt] = useState("");
  const [storyGeneratePrompt, setStoryGeneratePrompt] = useState("");
  const [prologueGeneratePrompt, setPrologueGeneratePrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    loadSettings();
    loadSelectedModels();
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
          setCommonPrompt(setting.value);
        } else if (setting.key === "storyGeneratePrompt") {
          setStoryGeneratePrompt(setting.value);
        } else if (setting.key === "prologueGeneratePrompt") {
          setPrologueGeneratePrompt(setting.value);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsData = [
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
        body: JSON.stringify({ useAdminKey: true })
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
      await fetch("/api/auth/selected-models", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: selectedModels }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save selected models:", error);
    } finally {
      setSavingModels(false);
    }
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
        <div className="mb-6">
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                AI API 키 설정은 <Link href="/account"><span className="text-primary hover:underline font-medium cursor-pointer">계정 관리</span></Link> 페이지에서 할 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
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
                    대화창에서 AI가 응답할 때 사용되는 시스템 프롬프트입니다.
                  </p>
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
                  className="min-h-[280px] font-mono text-sm"
                  data-testid="textarea-system-prompt"
                />
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
                  <div><code className="bg-background px-1.5 py-0.5 rounded text-primary">{"{conversationProfile}"}</code> 대화 프로필</div>
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

          <TabsContent value="models" className="space-y-4 animate-in fade-in-50 duration-300">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold mb-1">AI 모델 관리</h2>
                    <p className="text-sm text-muted-foreground">
                      계정 페이지에서 사용할 모델을 선택하세요.
                    </p>
                  </div>
                  <Button 
                    onClick={handleSaveModels}
                    disabled={savingModels}
                    className="gap-2"
                    data-testid="button-save-models"
                  >
                    {savingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    저장
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(["gemini", "chatgpt", "claude", "grok"] as const).map((provider) => {
              const models = availableModels[provider].length > 0 ? availableModels[provider] : MODEL_CATALOG[provider];
              return (
              <Card key={provider}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{PROVIDER_LABELS[provider]}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchModelsForProvider(provider)}
                      disabled={loadingModels[provider]}
                      className="gap-2"
                      data-testid={`button-fetch-${provider}`}
                    >
                      {loadingModels[provider] ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      모델 조회
                    </Button>
                  </div>

                  <div className="space-y-2">
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
