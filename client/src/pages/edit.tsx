import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useRoute } from "wouter";
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
import { useStoryForm, type GroupPermission } from "@/hooks/use-story-form";

interface Story {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  genre: string | null;
  author: string | null;
  storySettings: string | null;
  prologue: string | null;
  promptTemplate: string | null;
  exampleUserInput: string | null;
  exampleAiResponse: string | null;
  startingSituation: string | null;
}

export default function EditStory() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const storyId = params?.id ? parseInt(params.id) : null;
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    title, setTitle,
    description, setDescription,
    genre, setGenre,
    storySettings, setStorySettings,
    prologue, setPrologue,
    promptTemplate, setPromptTemplate,
    exampleUserInput, setExampleUserInput,
    exampleAiResponse, setExampleAiResponse,
    startingSituation, setStartingSituation,
    image,
    isUploading,
    isGenerating,
    isGeneratingPrologue,
    groups,
    selectedGroups,
    setSelectedGroups,
    fileInputRef,
    loadGroups,
    toggleGroupSelection,
    handleImageUpload,
    handleGenerateStorySettings,
    handleGeneratePrologue,
    setFormState,
    getFormData,
  } = useStoryForm();

  const loadStoryGroups = useCallback(async () => {
    if (!storyId) return;
    try {
      const response = await fetch(`/api/stories/${storyId}/groups`);
      if (response.ok) {
        const data = await response.json();
        const permissions: GroupPermission[] = data.map((g: any) => ({
          groupId: g.id,
          permission: g.permission
        }));
        setSelectedGroups(permissions);
      }
    } catch (error) {
      console.error("Failed to load story groups:", error);
    }
  }, [storyId, setSelectedGroups]);

  const loadStory = useCallback(async () => {
    if (!storyId) return;
    try {
      const response = await fetch(`/api/stories/${storyId}`);
      if (response.ok) {
        const story: Story = await response.json();
        setFormState({
          title: story.title,
          description: story.description || "",
          genre: story.genre || "판타지",
          storySettings: story.storySettings || "",
          prologue: story.prologue || "",
          promptTemplate: story.promptTemplate || "기본 프롬프트",
          exampleUserInput: story.exampleUserInput || "",
          exampleAiResponse: story.exampleAiResponse || "",
          startingSituation: story.startingSituation || "",
          image: story.image,
        });
      } else {
        setLocation("/");
      }
    } catch (error) {
      console.error("Failed to load story:", error);
      setLocation("/");
    } finally {
      setLoading(false);
    }
  }, [storyId, setFormState, setLocation]);

  useEffect(() => {
    if (storyId) {
      loadStory();
      loadGroups();
      loadStoryGroups();
    }
  }, [storyId, loadStory, loadGroups, loadStoryGroups]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert("스토리 이름을 입력해주세요.");
      setActiveTab("profile");
      return;
    }

    setIsSaving(true);
    try {
      const formData = getFormData();
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          description: formData.description || "스토리",
        }),
      });

      if (response.ok) {
        const currentGroups = await fetch(`/api/stories/${storyId}/groups`).then(r => r.json());
        const currentGroupIds = currentGroups.map((g: any) => g.id);
        
        for (const group of selectedGroups) {
          const existing = currentGroups.find((g: any) => g.id === group.groupId);
          if (existing) {
            if (existing.permission !== group.permission) {
              await fetch(`/api/stories/${storyId}/groups/${group.groupId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ permission: group.permission }),
              });
            }
          } else {
            await fetch(`/api/stories/${storyId}/groups`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId: group.groupId,
                permission: group.permission,
              }),
            });
          }
        }
        
        const selectedGroupIds = selectedGroups.map(g => g.groupId);
        for (const groupId of currentGroupIds) {
          if (!selectedGroupIds.includes(groupId)) {
            await fetch(`/api/stories/${storyId}/groups/${groupId}`, {
              method: "DELETE",
            });
          }
        }

        setLocation(`/play/${storyId}`);
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save story:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-muted -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">스토리 수정</h1>
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
                <TabsTrigger value="save" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent text-primary font-bold ml-auto">
                  저장
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
                      선택된 그룹에 속한 사용자는 이 스토리를 플레이할 수 있습니다. 스토리 수정은 작성자와 관리자만 가능합니다.
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
                              <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">
                                플레이 가능
                              </span>
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

          {activeTab === "save" && (
             <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
                <Card className="w-full max-w-md text-center p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Book className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">변경사항을 저장하시겠습니까?</h2>
                  <p className="text-muted-foreground mb-4">저장 후 플레이 화면으로 이동합니다.</p>
                  
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
                    onClick={handleSave}
                    disabled={isSaving || !title.trim()}
                    data-testid="button-save-story"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "저장하고 플레이하기"
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

      {activeTab !== "save" && (
        <div className="border-t bg-background p-4 sticky bottom-0 z-20">
           <div className="container mx-auto max-w-3xl flex justify-between">
              <Button variant="secondary" onClick={() => {
                const tabs = ["profile", "story", "start", "permissions", "save"];
                const currIdx = tabs.indexOf(activeTab);
                if (currIdx > 0) setActiveTab(tabs[currIdx - 1]);
              }}>
                <ChevronLeft className="w-4 h-4 mr-2" /> 이전
              </Button>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => {
                  const tabs = ["profile", "story", "start", "permissions", "save"];
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
