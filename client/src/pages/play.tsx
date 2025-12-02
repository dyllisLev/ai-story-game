import { useState, useEffect, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Menu, 
  MoreHorizontal, 
  Settings, 
  Users, 
  BookOpen, 
  Volume2,
  History,
  ChevronRight,
  Share2,
  CornerDownLeft,
  Home,
  Loader2,
  Trash2
} from "lucide-react";
import { ModelSelector } from "@/components/model-selector";
import ReactMarkdown from 'react-markdown';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Story {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  genre: string | null;
  author: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  prologue?: string | null;
  storySettings?: string | null;
  promptTemplate?: string | null;
  exampleUserInput?: string | null;
  exampleAiResponse?: string | null;
  startingSituation?: string | null;
}

interface Message {
  id: number;
  storyId: number;
  role: string;
  content: string;
  character?: string | null;
  createdAt?: string | null;
}

export default function PlayStory() {
  const [match, params] = useRoute("/play/:id");
  const [location, setLocation] = useLocation();
  const storyId = params?.id ? parseInt(params.id) : null;
  
  // Check for new=true query parameter
  const isNewSession = new URLSearchParams(window.location.search).get('new') === 'true';
  
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(!isMobile);
  const [story, setStory] = useState<Story | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [storyLoading, setStoryLoading] = useState(true);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [newSessionProcessed, setNewSessionProcessed] = useState(false);

  const loadStory = useCallback(async () => {
    if (!storyId) {
      setStoryLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/stories/${storyId}`);
      if (response.ok) {
        const data = await response.json();
        setStory(data);
      } else {
        setLocation("/");
      }
    } catch (error) {
      console.error("Failed to load story:", error);
      setLocation("/");
    } finally {
      setStoryLoading(false);
    }
  }, [storyId, setLocation]);

  const loadAllStories = useCallback(async () => {
    try {
      const response = await fetch("/api/stories");
      if (response.ok) {
        setAllStories(await response.json());
      }
    } catch (error) {
      console.error("Failed to load stories:", error);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!storyId) return;
    try {
      const response = await fetch(`/api/stories/${storyId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  const saveMessage = async (role: string, content: string, character?: string) => {
    if (!storyId) return null;
    try {
      const response = await fetch(`/api/stories/${storyId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content, character }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Failed to save message:", error);
    }
    return null;
  };

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setRightSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setRightSidebarOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    loadStory();
    loadAllStories();
  }, [loadStory, loadAllStories]);

  useEffect(() => {
    if (story) {
      loadMessages();
    }
  }, [story, loadMessages]);

  // Handle new session - clear messages and add prologue
  useEffect(() => {
    const processNewSession = async () => {
      if (!isNewSession || !story || !storyId || newSessionProcessed) return;
      
      setNewSessionProcessed(true);
      
      // Clear existing messages for this story
      try {
        await fetch(`/api/stories/${storyId}/messages`, {
          method: "DELETE"
        });
        
        // Add prologue as first message if available
        if (story.prologue) {
          const prologueMsg = await saveMessage("assistant", story.prologue, "Narrator");
          if (prologueMsg) {
            setMessages([prologueMsg]);
          } else {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
        
        // Remove the new=true from URL without reload
        window.history.replaceState({}, '', `/play/${storyId}`);
      } catch (error) {
        console.error("Failed to start new session:", error);
      }
    };
    
    processNewSession();
  }, [isNewSession, story, storyId, newSessionProcessed]);

  const formatContent = (content: string) => {
    let processed = content
      .replace(/^\[\/\/\]: #.*?\n/g, '')
      .replace(/^\[.*?\]\n?/g, '');

    processed = processed.replace(/^(.+?) \| "(.*?)"$/gm, '> **$1**\n\n> "$2"');

    return processed.split('\n\n').map(part => part.replace(/\n/g, '  \n')).join('\n\n');
  };

  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      if (inline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary" {...props}>
            {children}
          </code>
        );
      }
      return (
        <div className="relative my-4 rounded-lg border bg-muted/50 p-4 font-mono text-sm overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      );
    },
    blockquote({ node, children, ...props }: any) {
      return (
        <div className="border-l-2 border-primary px-4 py-2 my-4 bg-muted/30 rounded-r-md break-words" {...props}>
          {children}
        </div>
      );
    },
    em({ node, children, ...props }: any) {
      return (
        <span className="text-muted-foreground not-italic" {...props}>
          {children}
        </span>
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = await saveMessage("user", inputValue);
    if (userMsg) {
      setMessages(prev => [...prev, userMsg]);
    }
    setInputValue("");
    
    setTimeout(async () => {
      const aiContent = "*잠시 침묵하던 AI가 당신을 바라보며 입을 엽니다.* \"흥미로운 제안이군요. 하지만 그 대가는 준비되어 있습니까?\"";
      const aiMsg = await saveMessage("assistant", aiContent, "AI");
      if (aiMsg) {
        setMessages(prev => [...prev, aiMsg]);
      }
    }, 1000);
  };

  if (storyLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="text-muted-foreground">스토리를 찾을 수 없습니다.</p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebarOpen && (
        <div className={cn(
          "bg-sidebar flex flex-col flex-shrink-0 border-r transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 z-50 w-[280px] h-full shadow-xl animate-in slide-in-from-left duration-200" : "w-[280px]"
        )}>
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg truncate">{story.title}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="flex gap-4 px-4 py-2 border-b text-sm font-medium text-muted-foreground">
               <span className="text-foreground border-b-2 border-primary pb-2">스토리 목록</span>
             </div>
             
             <ScrollArea className="flex-1">
               <div className="p-2 space-y-1">
                  {allStories.map((s) => (
                    <div key={s.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
                      s.id === story.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}>
                      <Link href={`/play/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden flex-shrink-0">
                          {s.image ? (
                            <img src={s.image} className="w-full h-full object-cover" />
                          ) : (
                            <span>{s.title.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="font-medium text-sm truncate">{s.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.genre || "일반"}</p>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity flex-shrink-0"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm("정말로 이 스토리를 삭제하시겠습니까?")) {
                            try {
                              await fetch(`/api/stories/${s.id}`, { method: "DELETE" });
                              loadAllStories();
                              if (s.id === story.id) {
                                setLocation("/");
                              }
                            } catch (error) {
                              console.error("Failed to delete story:", error);
                            }
                          }
                        }}
                        data-testid={`button-delete-story-${s.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
               </div>
             </ScrollArea>
          </div>
          
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 relative">
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
               <Link href="/">
                  <Button variant="ghost" size="icon" title="홈으로 돌아가기" data-testid="button-home">
                     <Home className="w-5 h-5" />
                  </Button>
               </Link>
               <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(!rightSidebarOpen)}>
                  <MoreHorizontal className="w-5 h-5" />
               </Button>
            </div>
         </header>

         <ScrollArea className="flex-1 h-full">
            <div className="max-w-3xl mx-auto space-y-8 px-4 py-6 w-full">
               {loading ? (
                 <div className="flex items-center justify-center py-12">
                   <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                 </div>
               ) : messages.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">
                   <p>아직 대화가 없습니다. 메시지를 입력하여 스토리를 시작하세요!</p>
                 </div>
               ) : (
                 messages.map((msg, index) => {
                  if (msg.role === "assistant") {
                     return (
                        <div key={msg.id} className="group">
                            <div className="flex gap-4">
                               <div className="flex-1 space-y-2">
                                  <div className="text-sm leading-loose prose prose-sm max-w-none dark:prose-invert prose-p:mb-4 break-words">
                                     <ReactMarkdown components={markdownComponents}>{formatContent(msg.content)}</ReactMarkdown>
                                  </div>
                                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Button variant="ghost" size="icon" className="h-6 w-6"><Volume2 className="w-3 h-3" /></Button>
                                     <Button variant="ghost" size="icon" className="h-6 w-6"><Share2 className="w-3 h-3" /></Button>
                                  </div>
                               </div>
                            </div>
                            {index < messages.length - 1 && (
                                <div className="w-full h-px bg-border/50 mt-8" />
                            )}
                        </div>
                     )
                  }

                  return (
                     <div key={msg.id} className="group">
                        <div className="flex flex-col items-start gap-2">
                            <div className="max-w-[90%] text-sm leading-loose prose prose-sm max-w-none dark:prose-invert text-left prose-p:mb-4 break-words">
                               <ReactMarkdown components={markdownComponents}>{formatContent(msg.content)}</ReactMarkdown>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground"><Settings className="w-3 h-3" /></Button>
                            </div>
                        </div>
                        {index < messages.length - 1 && (
                            <div className="w-full h-px bg-border/50 mt-8" />
                        )}
                     </div>
                  )
                 })
               )}
            </div>
         </ScrollArea>

         <div className="p-4 bg-background border-t">
            <div className="max-w-3xl mx-auto relative">
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
                  className="min-h-[50px] pl-4 pr-12 py-3 rounded-3xl border-muted-foreground/20 focus:ring-primary/20 focus:border-primary resize-none shadow-sm"
               />
               <Button 
                  size="icon" 
                  className="absolute right-2 top-2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white"
                  onClick={handleSendMessage}
               >
                  <CornerDownLeft className="w-4 h-4" />
               </Button>
            </div>
         </div>
      </div>

      {isMobile && rightSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setRightSidebarOpen(false)}
        />
      )}

      {rightSidebarOpen && (
         <div className={cn(
            "bg-background border-l flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
            isMobile ? "fixed inset-y-0 right-0 z-50 w-[300px] h-full shadow-xl animate-in slide-in-from-right duration-200" : "w-[300px]"
         )}>
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
               </div>
            </ScrollArea>
         </div>
      )}
    </div>
  );
}
