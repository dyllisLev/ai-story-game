import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";

interface ApiKeys {
  chatgpt: string;
  grok: string;
  claude: string;
  gemini: string;
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
  const [commonPrompt, setCommonPrompt] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedApiKeys: ApiKeys = {
      chatgpt: localStorage.getItem("apiKey_chatgpt") || "",
      grok: localStorage.getItem("apiKey_grok") || "",
      claude: localStorage.getItem("apiKey_claude") || "",
      gemini: localStorage.getItem("apiKey_gemini") || "",
    };
    const savedPrompt = localStorage.getItem("commonPrompt") || "";
    setApiKeys(savedApiKeys);
    setCommonPrompt(savedPrompt);
  }, []);

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: value,
    }));
  };

  const handleSave = () => {
    Object.entries(apiKeys).forEach(([provider, key]) => {
      localStorage.setItem(`apiKey_${provider}`, key);
    });
    localStorage.setItem("commonPrompt", commonPrompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
              {AI_PROVIDERS.map((provider) => (
                <div key={provider.id} className={`p-4 rounded-lg border ${provider.color}`}>
                  <label className="text-sm font-medium mb-2 block">{provider.name}</label>
                  <Input
                    type="password"
                    placeholder={`${provider.name} API Key`}
                    value={apiKeys[provider.id as keyof ApiKeys]}
                    onChange={(e) =>
                      handleApiKeyChange(provider.id as keyof ApiKeys, e.target.value)
                    }
                    className="font-mono text-sm bg-white"
                    data-testid={`input-api-key-${provider.id}`}
                  />
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              💡 API 키는 로컬 스토리지에만 저장되며, 서버로 전송되지 않습니다.
            </p>
          </div>

          <Separator />

          {/* Common Prompt Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">기본 공통 프롬프트</h2>
              <p className="text-sm text-muted-foreground">모든 스토리에 적용될 기본 프롬프트를 설정하세요.</p>
            </div>
            <Textarea
              placeholder="기본 프롬프트를 입력하세요. 예: 당신은 판타지 세계의 모험가입니다..."
              value={commonPrompt}
              onChange={(e) => setCommonPrompt(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 여기에 입력한 내용이 스토리 플레이 시 AI에 자동으로 전달됩니다.
            </p>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex gap-3 justify-end pt-4">
            <Link href="/">
              <Button variant="outline">취소</Button>
            </Link>
            <Button 
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white gap-2"
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4" />
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
