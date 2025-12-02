import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Menu, 
  Send, 
  MoreHorizontal, 
  Settings, 
  Users, 
  BookOpen, 
  Keyboard, 
  Volume2,
  Image as ImageIcon,
  History,
  ChevronRight,
  Share2,
  CornerDownLeft,
  Paperclip
} from "lucide-react";
import { ModelSelector } from "@/components/model-selector";
import { MOCK_CHAT_HISTORY, MOCK_STORIES } from "@/lib/mockData";
import ReactMarkdown from 'react-markdown';

export default function PlayStory() {
  const [match, params] = useRoute("/play/:id");
  const storyId = params?.id;
  const story = MOCK_STORIES.find(s => s.id === storyId) || MOCK_STORIES[0];
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [messages, setMessages] = useState(MOCK_CHAT_HISTORY);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      role: "user",
      content: inputValue,
    };
    
    setMessages([...messages, newMessage]);
    setInputValue("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        role: "assistant",
        character: "AI",
        content: "*잠시 침묵하던 AI가 당신을 바라보며 입을 엽니다.* \"흥미로운 제안이군요. 하지만 그 대가는 준비되어 있습니까?\""
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - Episodes & Chat Rooms */}
      {sidebarOpen && (
        <div className="w-[280px] border-r bg-sidebar flex flex-col flex-shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg truncate">{story.title}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="flex gap-4 px-4 py-2 border-b text-sm font-medium text-muted-foreground">
               <span className="text-foreground border-b-2 border-primary pb-2">에피소드</span>
             </div>
             
             <ScrollArea className="flex-1">
               <div className="p-2 space-y-1">
                  <div className="flex items-center gap-3 p-3 bg-sidebar-accent rounded-lg cursor-pointer">
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                        <img src={story.image} className="w-full h-full object-cover" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                           <span className="font-medium text-sm truncate">국가의 시대</span>
                           <span className="text-[10px] text-muted-foreground">방금</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">삼태창: 인구수 847개...</p>
                     </div>
                  </div>
                  
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 hover:bg-sidebar-accent/50 rounded-lg cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                           CH.{i}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-baseline">
                              <span className="font-medium text-sm truncate">무림영웅전 {i}</span>
                              <span className="text-[10px] text-muted-foreground">어제</span>
                           </div>
                           <p className="text-xs text-muted-foreground truncate">천하제일검이 되기 위해...</p>
                        </div>
                     </div>
                  ))}
               </div>
             </ScrollArea>
          </div>
          
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 relative">
         {/* Header */}
         <header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur z-10">
            <div className="flex items-center gap-3">
               {!sidebarOpen && (
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                     <Menu className="w-4 h-4" />
                  </Button>
               )}
               <span className="font-semibold text-sm">{story.title} &gt;</span>
            </div>
            
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(!rightSidebarOpen)}>
                  <MoreHorizontal className="w-5 h-5" />
               </Button>
            </div>
         </header>


         {/* Chat Messages */}
         <ScrollArea className="flex-1 px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-8">
               {messages.map((msg, index) => {
                  if (msg.type === "context") {
                     return (
                        <div key={msg.id} className="space-y-4">
                           <div className="bg-muted/20 rounded-lg p-6 border border-muted/50 text-sm space-y-4">
                               <h3 className="font-bold text-base border-b pb-2 mb-2">초차원 존재의 정체</h3>
                               <div className="leading-relaxed text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                               </div>
                           </div>
                           {/* Separator */}
                           {index < messages.length - 1 && (
                             <div className="w-full h-px bg-border/50 mt-8" />
                           )}
                        </div>
                     )
                  }

                  if (msg.role === "assistant") {
                     return (
                        <div key={msg.id} className="group">
                            <div className="flex gap-4">
                               <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 overflow-hidden border">
                                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.id}`} alt="AI" className="w-full h-full" />
                               </div>
                               <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                     <span className="font-bold text-sm">{msg.character}</span>
                                     <span className="text-[10px] text-muted-foreground border px-1 rounded">AI</span>
                                  </div>
                                  <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                                     <ReactMarkdown>{msg.content}</ReactMarkdown>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" className="h-6 w-6"><Volume2 className="w-3 h-3" /></Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6"><Share2 className="w-3 h-3" /></Button>
                                  </div>
                               </div>
                            </div>
                            {/* Separator */}
                            {index < messages.length - 1 && (
                                <div className="w-full h-px bg-border/50 mt-8" />
                            )}
                        </div>
                     )
                  }

                  return (
                     <div key={msg.id} className="group">
                        <div className="flex flex-col items-end gap-2">
                            <div className="max-w-[90%] text-sm prose prose-sm max-w-none dark:prose-invert text-right">
                               <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"><Settings className="w-3 h-3" /></Button>
                            </div>
                        </div>
                        {/* Separator */}
                        {index < messages.length - 1 && (
                            <div className="w-full h-px bg-border/50 mt-8" />
                        )}
                     </div>
                  )
               })}
            </div>
         </ScrollArea>

         {/* Input Area */}
         <div className="p-4 bg-background border-t">
            <div className="max-w-3xl mx-auto relative">
               <div className="absolute left-3 top-3 flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                     <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                     <ImageIcon className="w-4 h-4" />
                  </Button>
               </div>
               <Textarea 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                     }
                  }}
                  placeholder="게임을 시작하지" 
                  className="min-h-[50px] pl-24 pr-12 py-3 rounded-3xl border-muted-foreground/20 focus:ring-primary/20 focus:border-primary resize-none shadow-sm"
               />
               <Button 
                  size="icon" 
                  className="absolute right-2 top-2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleSendMessage}
               >
                  <CornerDownLeft className="w-4 h-4" />
               </Button>
            </div>
            <div className="text-center mt-2 text-[10px] text-muted-foreground">
               AI는 부정확한 정보를 제공할 수 있습니다.
            </div>
         </div>
      </div>

      {/* Right Sidebar - Settings */}
      {rightSidebarOpen && (
         <div className="w-[300px] bg-background border-l flex flex-col flex-shrink-0 animate-in slide-in-from-right-10 duration-300">
            <div className="p-4 border-b font-medium text-sm flex items-center justify-between">
               채팅방 설정
               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightSidebarOpen(false)}>
                  <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground">모델 설정</label>
                     <ModelSelector />
                  </div>

                  <Separator />

                  {/* Menu Items */}
                  <div className="space-y-1">
                     <Button variant="ghost" className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted">
                        <BookOpen className="w-4 h-4 text-muted-foreground" /> 플레이 가이드
                     </Button>
                     <Button variant="ghost" className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted">
                        <Users className="w-4 h-4 text-muted-foreground" /> 대화 프로필
                     </Button>
                     <Button variant="ghost" className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted">
                        <BookOpen className="w-4 h-4 text-muted-foreground" /> 유저 노트
                     </Button>
                     <Button variant="ghost" className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted">
                        <History className="w-4 h-4 text-muted-foreground" /> 요약 메모리 <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded ml-auto">N</span>
                     </Button>
                  </div>


                  <Separator />

                  <div className="bg-muted/30 p-4 rounded-xl border">
                     <h4 className="text-xs font-bold text-muted-foreground mb-3">시작 설정</h4>
                     <div className="flex justify-between items-center bg-background p-3 rounded-lg border shadow-sm cursor-pointer hover:border-primary/50 transition-colors">
                        <span className="text-sm font-medium">기본 설정</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                     </div>
                  </div>
               </div>
            </ScrollArea>
         </div>
      )}
    </div>
  );
}
