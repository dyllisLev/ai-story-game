import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, 
  Wand2, 
  User, 
  BookOpen, 
  PlayCircle, 
  Image as ImageIcon, 
  Book,
  Plus,
  Loader2,
  Upload,
  Shield
} from "lucide-react";

interface Group {
  id: number;
  name: string;
  type: string;
  description: string | null;
}

interface GroupPermission {
  groupId: number;
  permission: 'read' | 'write';
}

export default function CreateStory() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("판타지");
  const [storySettings, setStorySettings] = useState("");
  const [prologue, setPrologue] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("기본 프롬프트");
  const [exampleUserInput, setExampleUserInput] = useState("");
  const [exampleAiResponse, setExampleAiResponse] = useState("");
  const [startingSituation, setStartingSituation] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrologue, setIsGeneratingPrologue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupPermission[]>([]);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const toggleGroupSelection = (groupId: number) => {
    const exists = selectedGroups.find(g => g.groupId === groupId);
    if (exists) {
      setSelectedGroups(selectedGroups.filter(g => g.groupId !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, { groupId, permission: 'read' }]);
    }
  };

  const updateGroupPermission = (groupId: number, permission: 'read' | 'write') => {
    setSelectedGroups(selectedGroups.map(g => 
      g.groupId === groupId ? { ...g, permission } : g
    ));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        setImage(url);
      } else {
        alert("이미지 업로드에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateStorySettings = async () => {
    if (!title.trim()) {
      alert("먼저 프로필 탭에서 제목을 입력해주세요.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-story-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          genre: genre,
          promptTemplate: promptTemplate,
          storySettings: storySettings.trim(),
          provider: "auto"
        }),
      });

      const data = await response.json();
      if (response.ok && data.generatedText) {
        setStorySettings(prev => prev ? prev + "\n\n" + data.generatedText : data.generatedText);
      } else {
        alert(data.error || "스토리 설정 생성에 실패했습니다. 설정에서 API 키를 확인해주세요.");
      }
    } catch (error) {
      console.error("Failed to generate story settings:", error);
      alert("스토리 설정 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePrologue = async () => {
    if (!title.trim()) {
      alert("먼저 프로필 탭에서 제목을 입력해주세요.");
      return;
    }

    setIsGeneratingPrologue(true);
    try {
      const response = await fetch("/api/ai/generate-prologue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          genre: genre,
          storySettings: storySettings.trim(),
          provider: "auto"
        }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.prologue) {
          setPrologue(data.prologue);
        }
        if (data.startingSituation) {
          setStartingSituation(data.startingSituation);
        }
      } else {
        alert(data.error || "프롤로그 생성에 실패했습니다. 설정에서 API 키를 확인해주세요.");
      }
    } catch (error) {
      console.error("Failed to generate prologue:", error);
      alert("프롤로그 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingPrologue(false);
    }
  };

  const handleRegister = async () => {
    if (!title.trim()) {
      alert("스토리 이름을 입력해주세요.");
      setActiveTab("profile");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || "새로운 스토리",
          genre: genre,
          author: "User",
          image: image || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000",
          storySettings: storySettings.trim(),
          prologue: prologue.trim(),
          promptTemplate: promptTemplate,
          exampleUserInput: exampleUserInput.trim(),
          exampleAiResponse: exampleAiResponse.trim(),
          startingSituation: startingSituation.trim(),
        }),
      });

      if (response.ok) {
        const newStory = await response.json();
        
        if (prologue.trim()) {
          await fetch(`/api/stories/${newStory.id}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "assistant",
              content: prologue.trim(),
              character: "Narrator",
            }),
          });
        }

        for (const group of selectedGroups) {
          try {
            await fetch(`/api/stories/${newStory.id}/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId: group.groupId,
                permission: group.permission,
              }),
            });
          } catch (error) {
            console.error("Failed to add group permission:", error);
          }
        }

        setLocation(`/play/${newStory.id}`);
      } else {
        alert("스토리 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to create story:", error);
      alert("스토리 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-muted -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">스토리 만들기</h1>
        </div>
      </header>

      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-[57px] z-10">
        <div className="container mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="h-12 w-full justify-start bg-transparent p-0">
                <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  프로필 <span className="text-red-500 ml-1">*</span>
                </TabsTrigger>
                <TabsTrigger value="story" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  스토리 설정
                </TabsTrigger>
                <TabsTrigger value="start" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  시작 설정
                </TabsTrigger>
                <TabsTrigger value="permissions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  권한 설정
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent text-primary font-bold ml-auto">
                  등록
                </TabsTrigger>
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 p-6">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> 프로필 설정
                </h2>
              </div>
              
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>이미지</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                      data-testid="input-image-upload"
                    />
                    <div className="flex gap-4">
                      <div 
                        className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/50 overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: 'pointer' }}
                      >
                        {image ? (
                          <img src={image} alt="Story" className="w-full h-full object-cover" />
                        ) : isUploading ? (
                          <Loader2 className="w-8 h-8 text-muted-foreground/50 animate-spin" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-image"
                        >
                          {isUploading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Upload className="w-3 h-3 mr-2" />}
                          업로드
                        </Button>
                        <Button variant="outline" size="sm"><Wand2 className="w-3 h-3 mr-2" /> 생성</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>이름 <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="스토리의 이름을 입력해 주세요" 
                      className="bg-background"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      data-testid="input-story-title"
                    />
                    <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
                  </div>

                  <div className="space-y-2">
                    <Label>한 줄 소개</Label>
                    <Input 
                      placeholder="어떤 스토리인지 설명할 수 있는 간단한 소개를 입력해 주세요" 
                      className="bg-background"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      data-testid="input-story-description"
                    />
                    <p className="text-xs text-muted-foreground text-right">{description.length}/100</p>
                  </div>

                  <div className="space-y-2">
                    <Label>장르</Label>
                    <select 
                      className="w-full p-2 rounded-md border bg-background text-sm"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      data-testid="select-story-genre"
                    >
                      <option value="판타지">판타지</option>
                      <option value="로맨스">로맨스</option>
                      <option value="사이버펑크">사이버펑크</option>
                      <option value="호러">호러</option>
                      <option value="일상">일상</option>
                      <option value="모험">모험</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "story" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> 스토리 설정
                </h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-primary border-primary/20 hover:bg-primary/5"
                  onClick={handleGenerateStorySettings}
                  disabled={isGenerating}
                  data-testid="button-auto-generate-story"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 생성 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" /> 자동 생성
                    </>
                  )}
                </Button>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>프롬프트 템플릿</Label>
                    <select 
                      className="w-full p-2 rounded-md border bg-background text-sm"
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      data-testid="select-prompt-template"
                    >
                      <option value="기본 프롬프트">기본 프롬프트</option>
                      <option value="판타지 모험">판타지 모험</option>
                      <option value="로맨스">로맨스</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>스토리 설정 및 정보</Label>
                    <Textarea 
                      className="min-h-[300px] font-mono text-sm bg-background leading-relaxed" 
                      placeholder="세계관, 설정, 등장인물 외모, 성격, 말투 등 스토리의 더 자세한 정보를 입력해 주세요"
                      value={storySettings}
                      onChange={(e) => setStorySettings(e.target.value)}
                      data-testid="textarea-story-settings"
                    />
                    <p className="text-xs text-muted-foreground text-right">{storySettings.length}/3000</p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-4">
                 <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">고급 설정</h3>
                 <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label>전개 예시</Label>
                        <Button variant="ghost" size="sm" className="h-8"><Plus className="w-3 h-3 mr-1" /> 예시 추가</Button>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-lg border border-dashed space-y-3">
                         <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">사용자</Label>
                            <Input 
                              className="bg-background h-8 text-sm" 
                              placeholder="입력 예시..." 
                              value={exampleUserInput}
                              onChange={(e) => setExampleUserInput(e.target.value)}
                              data-testid="input-example-user"
                            />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">AI</Label>
                            <Textarea 
                              className="bg-background min-h-[60px] text-sm" 
                              placeholder="AI 응답 예시..." 
                              value={exampleAiResponse}
                              onChange={(e) => setExampleAiResponse(e.target.value)}
                              data-testid="textarea-example-ai"
                            />
                         </div>
                      </div>
                    </CardContent>
                 </Card>
              </div>
            </div>
          )}

          {activeTab === "start" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-primary" /> 시작 설정
                </h2>
              </div>
              
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                     <div className="flex justify-between">
                       <Label>프롤로그 & 시작 상황</Label>
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-6 text-xs text-primary"
                         onClick={handleGeneratePrologue}
                         disabled={isGeneratingPrologue}
                         data-testid="button-auto-generate-prologue"
                       >
                         {isGeneratingPrologue ? (
                           <>
                             <Loader2 className="w-3 h-3 mr-1 animate-spin" /> 생성 중...
                           </>
                         ) : (
                           <>
                             <Wand2 className="w-3 h-3 mr-1" /> 자동 생성
                           </>
                         )}
                       </Button>
                     </div>
                     <Label className="text-xs text-muted-foreground">프롤로그</Label>
                     <Textarea 
                        className="min-h-[150px] bg-background leading-relaxed"
                        placeholder="스토리가 시작될 때 AI가 먼저 보여줄 프롤로그를 작성해주세요..."
                        value={prologue}
                        onChange={(e) => setPrologue(e.target.value)}
                        data-testid="textarea-prologue"
                     />
                     <p className="text-xs text-muted-foreground text-right">{prologue.length}/2000</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">시작 상황</Label>
                    <Textarea 
                      placeholder="사용자의 역할, 등장인물과의 관계, 이야기가 시작되는 세계관 등" 
                      className="bg-background min-h-[100px]"
                      value={startingSituation}
                      onChange={(e) => setStartingSituation(e.target.value)}
                      data-testid="textarea-starting-situation"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> 권한 설정
                </h2>
              </div>
              
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label>이 스토리에 접근할 수 있는 그룹을 선택하세요</Label>
                    <p className="text-xs text-muted-foreground">
                      선택된 그룹에 속한 사용자만 이 스토리를 볼 수 있습니다. 그룹이 선택되지 않으면 아무도 접근할 수 없습니다.
                    </p>
                  </div>

                  {groups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      등록된 그룹이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((group) => {
                        const selected = selectedGroups.find(g => g.groupId === group.id);
                        return (
                          <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg bg-background" data-testid={`group-item-${group.id}`}>
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={!!selected}
                                onCheckedChange={() => toggleGroupSelection(group.id)}
                                data-testid={`checkbox-group-${group.id}`}
                              />
                              <div>
                                <p className="font-medium">{group.name}</p>
                                {group.description && (
                                  <p className="text-xs text-muted-foreground">{group.description}</p>
                                )}
                              </div>
                            </div>
                            {selected && (
                              <select
                                value={selected.permission}
                                onChange={(e) => updateGroupPermission(group.id, e.target.value as 'read' | 'write')}
                                className="text-sm p-1.5 rounded border bg-background"
                                data-testid={`select-permission-${group.id}`}
                              >
                                <option value="read">읽기 전용</option>
                                <option value="write">읽기/쓰기</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "register" && (
             <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
                <Card className="w-full max-w-md text-center p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Book className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">스토리를 등록하시겠습니까?</h2>
                  <p className="text-muted-foreground mb-4">등록된 스토리는 홈 화면에서 확인할 수 있습니다.</p>
                  
                  {title && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                      <p className="text-sm"><strong>제목:</strong> {title}</p>
                      {description && <p className="text-sm text-muted-foreground"><strong>소개:</strong> {description}</p>}
                      <p className="text-sm text-muted-foreground"><strong>장르:</strong> {genre}</p>
                    </div>
                  )}
                  
                  <Button 
                    size="lg" 
                    className="w-full bg-primary hover:bg-primary/90 text-white" 
                    onClick={handleRegister}
                    disabled={isSubmitting || !title.trim()}
                    data-testid="button-register-story"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      "등록하고 플레이하기"
                    )}
                  </Button>
                  
                  {!title.trim() && (
                    <p className="text-sm text-red-500 mt-4">스토리 이름을 입력해주세요.</p>
                  )}
                </Card>
             </div>
          )}

        </div>
      </div>

      {activeTab !== "register" && (
        <div className="border-t bg-background p-4 sticky bottom-0 z-20">
           <div className="container mx-auto max-w-3xl flex justify-between">
              <Button variant="secondary" onClick={() => {
                const tabs = ["profile", "story", "start", "register"];
                const currIdx = tabs.indexOf(activeTab);
                if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
              }}>
                <ChevronLeft className="w-4 h-4 mr-2" /> 이전
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => {
                  const tabs = ["profile", "story", "start", "register"];
                  const currIdx = tabs.indexOf(activeTab);
                  if (currIdx < tabs.length - 1) setActiveTab(tabs[currIdx + 1]);
              }}>
                다음 <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
           </div>
        </div>
      )}
    </div>
  );
}
