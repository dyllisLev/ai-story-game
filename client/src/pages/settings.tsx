import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [commonPrompt, setCommonPrompt] = useState("");
  const [storyGeneratePrompt, setStoryGeneratePrompt] = useState("");
  const [prologueGeneratePrompt, setPrologueGeneratePrompt] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    loadSettings();
  }, []);

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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
              <p className="text-muted-foreground text-sm">시스템 프롬프트 관리</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="space-y-8">
          <div className="bg-muted/50 border border-muted/80 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 AI API 키 설정은 <Link href="/account"><span className="text-primary hover:underline font-medium cursor-pointer">계정 관리</span></Link> 페이지에서 할 수 있습니다.
            </p>
          </div>

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
