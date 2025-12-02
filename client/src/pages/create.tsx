import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, 
  Wand2, 
  User, 
  BookOpen, 
  PlayCircle, 
  Settings2, 
  Image as ImageIcon, 
  Book, 
  Flag,
  Plus
} from "lucide-react";

export default function CreateStory() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("profile");

  const handleRegister = () => {
    setLocation("/play/new");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between bg-background sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="hover:bg-muted -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">스토리 만들기</h1>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          민감한 스토리의 경우 제작 시 성인 인증이 필요해요.
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-[57px] z-10">
        <div className="container mx-auto px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="h-12 w-full justify-start bg-transparent p-0">
                <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  프로필 <span className="text-red-500 ml-1">*</span>
                </TabsTrigger>
                <TabsTrigger value="story" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  스토리 설정 <span className="text-red-500 ml-1">*</span>
                </TabsTrigger>
                <TabsTrigger value="start" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent">
                  시작 설정 <span className="text-red-500 ml-1">*</span>
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 h-full bg-transparent border-b-2 border-transparent text-primary font-bold ml-auto">
                  등록 <span className="text-red-500 ml-1">*</span>
                </TabsTrigger>
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-muted/30 p-6">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          
          {/* Content based on active tab - Simplified for Mockup */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> 프로필 설정
                </h2>
                <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5">
                  <Wand2 className="w-4 h-4 mr-2" /> 랜덤 생성
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>이미지 <span className="text-red-500">*</span></Label>
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/50">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <div className="flex flex-col justify-end gap-2">
                        <Button variant="outline" size="sm">업로드</Button>
                        <Button variant="outline" size="sm"><Wand2 className="w-3 h-3 mr-2" /> 생성</Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>이름 <span className="text-red-500">*</span></Label>
                    <Input placeholder="스토리의 이름을 입력해 주세요" className="bg-background" />
                    <p className="text-xs text-muted-foreground text-right">0/12</p>
                  </div>

                  <div className="space-y-2">
                    <Label>한 줄 소개 <span className="text-red-500">*</span></Label>
                    <Input placeholder="어떤 스토리인지 설명할 수 있는 간단한 소개를 입력해 주세요" className="bg-background" />
                    <p className="text-xs text-muted-foreground text-right">0/30</p>
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
                <Button variant="outline" size="sm" className="text-primary border-primary/20 hover:bg-primary/5">
                  <Wand2 className="w-4 h-4 mr-2" /> 자동 생성
                </Button>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>프롬프트 템플릿 <span className="text-red-500">*</span></Label>
                    <select className="w-full p-2 rounded-md border bg-background text-sm">
                      <option>✨ 기본 프롬프트</option>
                      <option>🗡️ 판타지 모험</option>
                      <option>💞 로맨스</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>스토리 설정 및 정보 <span className="text-red-500">*</span></Label>
                    <Textarea 
                      className="min-h-[300px] font-mono text-sm bg-background leading-relaxed" 
                      placeholder="세계관, 설정, 등장인물 외모, 성격, 말투 등 스토리의 더 자세한 정보를 입력해 주세요"
                      defaultValue={`이름: 메이븐 윌리엄스
역사: 메이븐은 작은 마을에서 태어나 자랐으며...

외모, 정체성: 메이븐은 중간 키에 날씬한 체격을 가지고 있으며...

목표, 동기: 메이븐의 가장 큰 목표는...

싫어하는 것/좋아하는 것: 불공정함과 위선을 싫어하며...`}
                    />
                    <p className="text-xs text-muted-foreground text-right">772/3000</p>
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
                            <Input className="bg-background h-8 text-sm" placeholder="입력 예시..." defaultValue="메이븐, 오늘 하루 어땠어?" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">AI (메이븐)</Label>
                            <Textarea className="bg-background min-h-[60px] text-sm" defaultValue={`*메이븐이 미소를 지으며 대답한다.* "오늘은 정말 특별한 하루였어. {{user}}와 함께 시간을 보낼 수 있어서 기뻤어."`} />
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
              
              <div className="flex gap-2 mb-4">
                <Button variant="default" size="sm" className="rounded-full px-4">기본 설정</Button>
                <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground">+ 설정 추가</Button>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                     <div className="flex justify-between">
                       <Label>프롤로그 <span className="text-red-500">*</span></Label>
                       <Button variant="ghost" size="sm" className="h-6 text-xs text-primary"><Wand2 className="w-3 h-3 mr-1" /> 자동 생성</Button>
                     </div>
                     <Textarea 
                        className="min-h-[150px] bg-background leading-relaxed"
                        defaultValue={`*메이븐은 작은 카페의 테라스에 앉아, 따뜻한 커피를 한 모금 마신다...*

"안녕하세요, {{user}}! 드디어 만났군요..."`}
                     />
                  </div>

                  <div className="space-y-2">
                    <Label>시작설정 이름 <span className="text-red-500">*</span></Label>
                    <Input defaultValue="기본 설정" className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>시작 상황</Label>
                    <Textarea placeholder="사용자의 역할, 등장인물과의 관계, 이야기가 시작되는 세계관 등" className="bg-background min-h-[100px]" />
                  </div>
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
                  <p className="text-muted-foreground mb-8">등록된 스토리는 '내 작품'에서 언제든지 수정할 수 있습니다.</p>
                  <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-white" onClick={handleRegister}>
                    등록하고 플레이하기
                  </Button>
                </Card>
             </div>
          )}

        </div>
      </div>

      {/* Footer Navigation for Form */}
      {activeTab !== "register" && (
        <div className="border-t bg-background p-4 sticky bottom-0 z-20">
           <div className="container mx-auto max-w-3xl flex justify-between">
              <Button variant="secondary" onClick={() => setActiveTab("profile")}>
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
