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
  Trash2,
  Save,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "@/components/model-selector";
import ReactMarkdown from 'react-markdown';
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// Parse and style special AI response tags
function parseAIResponse(content: string) {
  const parts: Array<{ type: 'narration' | 'dialogue' | 'summary' | 'text', content: string, character?: string }> = [];
  
  // Split by tags
  const narrationRegex = /<Narration>([\s\S]*?)<\/Narration>/gi;
  const dialogueRegex = /<CharacterDialogue>([\s\S]*?)<\/CharacterDialogue>/gi;
  const summaryRegex = /<Summary>([\s\S]*?)<\/Summary>/gi;
  
  let lastIndex = 0;
  const matches: Array<{ type: string, start: number, end: number, content: string, character?: string }> = [];
  
  // Find all matches
  let match;
  while ((match = narrationRegex.exec(content)) !== null) {
    matches.push({ type: 'narration', start: match.index, end: narrationRegex.lastIndex, content: match[1].trim() });
  }
  
  while ((match = dialogueRegex.exec(content)) !== null) {
    const dialogueContent = match[1].trim();
    // Extract character name if present (format: "CharacterName | dialogue")
    const charMatch = dialogueContent.match(/^([^|]+)\s*\|\s*([\s\S]+)$/);
    if (charMatch) {
      matches.push({ 
        type: 'dialogue', 
        start: match.index, 
        end: dialogueRegex.lastIndex, 
        content: charMatch[2].trim(),
        character: charMatch[1].trim()
      });
    } else {
      matches.push({ type: 'dialogue', start: match.index, end: dialogueRegex.lastIndex, content: dialogueContent });
    }
  }
  
  while ((match = summaryRegex.exec(content)) !== null) {
    matches.push({ type: 'summary', start: match.index, end: summaryRegex.lastIndex, content: match[1].trim() });
  }
  
  // Sort by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build parts array
  matches.forEach((m, i) => {
    // Add text before this match
    if (m.start > lastIndex) {
      const textBefore = content.substring(lastIndex, m.start).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    parts.push({ 
      type: m.type as any, 
      content: m.content,
      character: m.character
    });
    lastIndex = m.end;
  });
  
  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining) {
      parts.push({ type: 'text', content: remaining });
    }
  }
  
  // If no special tags found, return the whole content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  return parts;
}

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

interface Session {
  id: number;
  storyId: number;
  title: string;
  conversationProfile?: string | null;
  userNote?: string | null;
  summaryMemory?: string | null;
  sessionModel?: string | null;
  sessionProvider?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Message {
  id: number;
  sessionId: number;
  role: string;
  content: string;
  character?: string | null;
  createdAt?: string | null;
}

export default function PlayStory() {
  const [match, params] = useRoute("/play/:sessionId");
  const [location, setLocation] = useLocation();
  const sessionId = params?.sessionId ? parseInt(params.sessionId) : null;
  
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(!isMobile);
  const [session, setSession] = useState<Session | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const [streamingContent, setStreamingContent] = useState<string>("");
  
  // Session settings
  const [conversationProfile, setConversationProfile] = useState("");
  const [userNote, setUserNote] = useState("");
  const [summaryMemory, setSummaryMemory] = useState("");
  const [sessionProvider, setSessionProvider] = useState("");
  const [sessionModel, setSessionModel] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        
        // Load session settings
        setConversationProfile(sessionData.conversationProfile || "");
        setUserNote(sessionData.userNote || "");
        setSummaryMemory(sessionData.summaryMemory || "");
        setSessionProvider(sessionData.sessionProvider || "");
        setSessionModel(sessionData.sessionModel || "");
        
        // Load story
        const storyResponse = await fetch(`/api/stories/${sessionData.storyId}`);
        if (storyResponse.ok) {
          const storyData = await storyResponse.json();
          setStory(storyData);
          
          // Load sessions for this story
          const sessionsResponse = await fetch(`/api/stories/${sessionData.storyId}/sessions`);
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            // Sort sessions by createdAt descending (newest first)
            const sortedSessions = sessionsData.sort((a: Session, b: Session) => {
              return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });
            setSessions(sortedSessions);
          }
        }
      } else {
        setLocation("/");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setLocation("/");
    } finally {
      setLoading(false);
    }
  }, [sessionId, setLocation]);

  const saveSessionSettings = async (field: string, value: string) => {
    if (!sessionId) return;
    setIsSavingSettings(true);
    try {
      const updateData: Record<string, string> = { [field]: value };
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      console.error("Failed to save session settings:", error);
    } finally {
      setIsSavingSettings(false);
      setEditingField(null);
    }
  };

  const loadMessages = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const saveMessage = async (role: string, content: string, character?: string) => {
    if (!sessionId) return null;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
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
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session) {
      loadMessages();
    }
  }, [session, loadMessages]);


  // Render AI response with special styling
  const renderAIContent = (content: string) => {
    // First convert HTML entities to actual characters
    let processedContent = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Then try to parse JSON if the content looks like JSON
    try {
      // Remove only the outer markdown code blocks (```json at start and ``` at end)
      let cleanedText = processedContent;
      
      // Remove opening ```json
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '');
      }
      
      // Remove closing ``` only at the very end
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.replace(/\n?```$/, '');
      }
      
      cleanedText = cleanedText.trim();
      
      // Try to parse as JSON
      if (cleanedText.startsWith('{') && cleanedText.includes('nextStory')) {
        // Try to fix incomplete JSON by adding missing closing quotes and braces
        if (!cleanedText.endsWith('}')) {
          const quoteCount = (cleanedText.match(/"/g) || []).length;
          if (quoteCount % 2 === 1) {
            cleanedText += '"';
          }
          if (!cleanedText.includes('"aiAnswer"')) {
            cleanedText += ',\n  "aiAnswer": ""';
          }
          cleanedText += '\n}';
        }
        
        const parsed = JSON.parse(cleanedText);
        
        if (parsed.nextStory) {
          // Unescape the content
          processedContent = parsed.nextStory
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'");
        }
      }
    } catch (parseError) {
      // If parsing fails, use the processed content with HTML entities converted
    }
    
    const parts = parseAIResponse(processedContent);
    
    const markdownComponents = {
      code({ node, inline, className, children, ...props }: any) {
        if (inline) {
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          );
        }
        return (
          <pre className="my-6 rounded-lg border bg-muted/50 p-3 font-mono text-sm overflow-x-auto max-w-full">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        );
      },
      p({ children, node, ...props }: any) {
        // Check if children contains a code block (code element that will become pre)
        // If so, render as div to avoid HTML nesting violation
        const hasCodeBlock = node?.children?.some((child: any) => 
          child.type === 'element' && child.tagName === 'code'
        );
        
        if (hasCodeBlock) {
          return (
            <div className="mb-4 break-words" style={{ width: '100%', maxWidth: '100%' }} {...props}>
              {children}
            </div>
          );
        }
        
        return (
          <p className="mb-4 leading-relaxed break-words" style={{ width: '100%', maxWidth: '100%' }} {...props}>
            {children}
          </p>
        );
      },
    };

    return parts.map((part, index) => {
      switch (part.type) {
        case 'narration':
          return (
            <div key={index} className="mb-6">
              <div className="prose prose-sm dark:prose-invert w-full max-w-full">
                <ReactMarkdown components={markdownComponents}>
                  {part.content}
                </ReactMarkdown>
              </div>
            </div>
          );
          
        case 'dialogue':
          // Split dialogue content by lines and render each separately
          const dialogueLines = part.content.split('\n').filter(line => line.trim());
          return (
            <div key={index} className="mb-6 space-y-3">
              {dialogueLines.map((line, lineIndex) => {
                // Check if line has character name format: "Character | dialogue"
                const characterMatch = line.match(/^(.+?)\s*\|\s*"?(.+?)"?$/);
                if (characterMatch) {
                  const [, character, dialogue] = characterMatch;
                  return (
                    <p key={lineIndex} className="pl-4 leading-relaxed max-w-full break-words">
                      <span className="font-bold">{character.trim()}</span>
                      <span className="text-muted-foreground"> | </span>
                      <span className="font-semibold">"{dialogue.trim()}"</span>
                    </p>
                  );
                }
                // If no character format, just render the dialogue
                return (
                  <p key={lineIndex} className="pl-4 font-semibold leading-relaxed max-w-full break-words">
                    "{line.trim()}"
                  </p>
                );
              })}
            </div>
          );
          
        case 'summary':
          return (
            <div key={index} className="my-6 p-4 bg-muted/30 border-l-2 border-muted-foreground/30 rounded-r">
              <div className="text-xs font-medium text-muted-foreground mb-2">상태 정보</div>
              <pre className="text-xs font-mono text-muted-foreground/80 whitespace-pre-wrap">
                {part.content}
              </pre>
            </div>
          );
          
        case 'text':
        default:
          return (
            <div key={index} className="mb-6">
              <div className="prose prose-sm dark:prose-invert w-full max-w-full">
                <ReactMarkdown components={markdownComponents}>
                  {part.content}
                </ReactMarkdown>
              </div>
            </div>
          );
      }
    });
  };

  const handleSendMessage = async (retryMessage?: string) => {
    const userInput = retryMessage || inputValue;
    if (!userInput.trim() || isGenerating) return;
    
    if (!retryMessage) {
      setInputValue("");
    }
    
    // Clear previous error and streaming content
    setLastError(null);
    setLastUserMessage(userInput);
    setStreamingContent("");
    
    // Save and display user message (only if not retrying)
    if (!retryMessage) {
      const userMsg = await saveMessage("user", userInput);
      if (userMsg) {
        setMessages(prev => [...prev, userMsg]);
      }
    }
    
    // Call AI Streaming API
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          userMessage: userInput,
          storyId: story?.id
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setLastError(data.error || "AI 응답을 생성할 수 없습니다. 설정에서 API 키를 확인해주세요.");
        setIsGenerating(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setLastError("스트리밍을 시작할 수 없습니다.");
        setIsGenerating(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                
                if (data.error) {
                  setLastError(data.error);
                  setIsGenerating(false);
                  return;
                }
                
                if (data.text) {
                  fullText += data.text;
                  setStreamingContent(fullText);
                }
                
                if (data.done) {
                  // Use fullText from server or accumulated content
                  const textToSave = data.fullText || fullText;
                  
                  if (textToSave) {
                    // Parse JSON response if needed
                    let finalResponse = textToSave;
                    try {
                      let cleanedText = textToSave.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                      if (cleanedText.startsWith('{') && cleanedText.includes('nextStrory')) {
                        const nextStroryMatch = cleanedText.match(/"nextStrory"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (nextStroryMatch && nextStroryMatch[1]) {
                          finalResponse = nextStroryMatch[1]
                            .replace(/\\n/g, '\n')
                            .replace(/\\"/g, '"')
                            .replace(/\\'/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');
                        } else {
                          const parsed = JSON.parse(cleanedText);
                          if (parsed.nextStrory) {
                            finalResponse = parsed.nextStrory
                              .replace(/\\n/g, '\n')
                              .replace(/\\"/g, '"')
                              .replace(/\\'/g, "'")
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>');
                          }
                        }
                      }
                    } catch (parseError) {
                      // Use raw text if parsing fails
                    }
                    
                    // Save the final message
                    const aiMsg = await saveMessage("assistant", finalResponse, "AI");
                    if (aiMsg) {
                      setMessages(prev => [...prev, aiMsg]);
                    }
                    setLastError(null);
                  }
                  
                  // Always clear streaming content when done
                  setStreamingContent("");
                  setIsGenerating(false);
                  return;
                }
              } catch (parseErr) {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      setLastError("AI 서버에 연결할 수 없습니다.");
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
    }
  };

  const handleRetry = () => {
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage);
    }
  };

  if (loading && !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !story) {
    return (
      <div className="flex h-screen items-center justify-center bg-background flex-col gap-4">
        <p className="text-muted-foreground">세션을 찾을 수 없습니다.</p>
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

      {(!isMobile || sidebarOpen) && (
        <div className={cn(
          "bg-sidebar flex flex-col flex-shrink-0 border-r transition-all duration-300 ease-in-out",
          isMobile ? "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[380px] h-full shadow-xl animate-in slide-in-from-left duration-200" : "w-[280px]"
        )}>
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <h2 className="font-bold text-lg line-clamp-2">{story.title}</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="flex-shrink-0">
              <Menu className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="flex gap-4 px-4 py-2 border-b text-sm font-medium text-muted-foreground">
               <span className="text-foreground border-b-2 border-primary pb-2">세션 목록</span>
             </div>
             
             <ScrollArea className="flex-1">
               <div className="p-2 space-y-1">
                  {sessions.map((s) => (
                    <div key={s.id} className={cn(
                      "flex items-start gap-2 p-2.5 rounded-lg transition-colors group",
                      s.id === session.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                    )}>
                      <Link href={`/play/${s.id}`} className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                          <span>{s.title.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-2 leading-snug mb-0.5">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(s.createdAt || '').toLocaleDateString('ko-KR')}</p>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex-shrink-0"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm("정말로 이 세션을 삭제하시겠습니까?")) {
                            try {
                              await fetch(`/api/sessions/${s.id}`, { method: "DELETE" });
                              // Reload sessions
                              const sessionsResponse = await fetch(`/api/stories/${story.id}/sessions`);
                              if (sessionsResponse.ok) {
                                const sessionsData = await sessionsResponse.json();
                                // Sort sessions by createdAt descending (newest first)
                                const sortedSessions = sessionsData.sort((a: Session, b: Session) => {
                                  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                                });
                                setSessions(sortedSessions);
                                if (s.id === session.id) {
                                  setLocation("/");
                                }
                              }
                            } catch (error) {
                              console.error("Failed to delete session:", error);
                            }
                          }
                        }}
                        data-testid={`button-delete-session-${s.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

         <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-3xl mx-auto space-y-8 px-4 py-6">
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
                                  <div className="text-sm leading-loose max-w-full break-words">
                                     {renderAIContent(msg.content)}
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
                            <div className="max-w-[90%] bg-primary/10 rounded-lg p-3 text-sm whitespace-pre-wrap break-words">
                               {msg.content}
                            </div>
                        </div>
                        {index < messages.length - 1 && (
                            <div className="w-full h-px bg-border/50 mt-8" />
                        )}
                     </div>
                  )
                 })
               )}
               
               {/* Streaming AI Response */}
               {isGenerating && streamingContent && (
                 <div className="group">
                   <div className="flex gap-4">
                     <div className="flex-1 space-y-2">
                       <div className="text-sm leading-loose max-w-full break-words">
                         {renderAIContent(streamingContent)}
                         <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1 align-middle" />
                       </div>
                     </div>
                   </div>
                 </div>
               )}
               
               {/* Loading indicator when streaming hasn't started yet */}
               {isGenerating && !streamingContent && (
                 <div className="flex items-center gap-3 text-muted-foreground">
                   <Loader2 className="w-5 h-5 animate-spin" />
                   <span className="text-sm">AI가 응답을 생성하고 있습니다...</span>
                 </div>
               )}
               
               {/* Error Message with Retry Button */}
               {lastError && (
                 <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                   <div className="flex items-start gap-3">
                     <div className="flex-1">
                       <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                         시스템 오류
                       </p>
                       <p className="text-sm text-red-700 dark:text-red-300">
                         {lastError}
                       </p>
                     </div>
                     <Button
                       onClick={handleRetry}
                       disabled={isGenerating}
                       size="sm"
                       variant="outline"
                       className="border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                       data-testid="button-retry-message"
                     >
                       {isGenerating ? (
                         <Loader2 className="w-4 h-4 animate-spin mr-1" />
                       ) : null}
                       재시도
                     </Button>
                   </div>
                 </div>
               )}
            </div>
         </div>

         <div className="p-4 bg-background border-t">
            <div className="max-w-3xl mx-auto relative">
               <Textarea 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                     // 한글 조합 중이면 엔터 무시
                     if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        handleSendMessage();
                     }
                  }}
                  placeholder={isGenerating ? "AI가 응답 중..." : "메시지를 입력하세요..."} 
                  disabled={isGenerating}
                  className="min-h-[50px] pl-4 pr-12 py-3 rounded-3xl border-muted-foreground/20 focus:ring-primary/20 focus:border-primary resize-none shadow-sm"
               />
               <Button 
                  size="icon" 
                  className="absolute right-2 top-2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => handleSendMessage()}
                  disabled={isGenerating}
               >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CornerDownLeft className="w-4 h-4" />
                  )}
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

      {(!isMobile || rightSidebarOpen) && (
         <div className={cn(
            "bg-background border-l flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
            isMobile ? "fixed inset-y-0 right-0 z-50 w-full max-w-[320px] h-full shadow-xl animate-in slide-in-from-right duration-200" : "w-[300px]"
         )}>
            <div className="p-4 border-b font-medium text-sm flex items-center justify-between">
               채팅방 설정
               <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setRightSidebarOpen(false)}>
                  <ChevronRight className="w-4 h-4" />
               </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground">모델 설정</label>
                     <ModelSelector 
                       sessionProvider={sessionProvider}
                       sessionModel={sessionModel}
                       onProviderChange={(provider) => {
                         setSessionProvider(provider);
                         saveSessionSettings("sessionProvider", provider);
                       }}
                       onModelChange={(model) => {
                         setSessionModel(model);
                         saveSessionSettings("sessionModel", model);
                       }}
                     />
                  </div>

                  <Separator />

                  <div className="space-y-1">
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted"
                       onClick={() => setEditingField("conversationProfile")}
                     >
                        <Users className="w-4 h-4 text-muted-foreground" /> 대화 프로필
                        {conversationProfile && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded ml-auto">설정됨</span>}
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted"
                       onClick={() => setEditingField("userNote")}
                     >
                        <BookOpen className="w-4 h-4 text-muted-foreground" /> 유저 노트
                        {userNote && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded ml-auto">설정됨</span>}
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="w-full justify-start gap-3 font-normal h-10 hover:bg-muted"
                       onClick={() => setEditingField("summaryMemory")}
                     >
                        <History className="w-4 h-4 text-muted-foreground" /> 요약 메모리
                        {summaryMemory && <span className="text-[10px] bg-green-100 text-green-600 px-1 rounded ml-auto">설정됨</span>}
                     </Button>
                  </div>
               </div>
            </ScrollArea>
         </div>
      )}

      {/* Session Settings Edit Dialog */}
      <Dialog open={editingField !== null} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingField === "conversationProfile" && "대화 프로필 편집"}
              {editingField === "userNote" && "유저 노트 편집"}
              {editingField === "summaryMemory" && "요약 메모리 편집"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              className="min-h-[200px]"
              placeholder={
                editingField === "conversationProfile" ? "캐릭터 정보, 관계 설정 등을 입력하세요..." :
                editingField === "userNote" ? "사용자에 대한 메모를 입력하세요..." :
                "대화 요약 및 중요 정보를 입력하세요..."
              }
              value={
                editingField === "conversationProfile" ? conversationProfile :
                editingField === "userNote" ? userNote :
                summaryMemory
              }
              onChange={(e) => {
                if (editingField === "conversationProfile") setConversationProfile(e.target.value);
                else if (editingField === "userNote") setUserNote(e.target.value);
                else setSummaryMemory(e.target.value);
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingField(null)}>
                <X className="w-4 h-4 mr-2" /> 취소
              </Button>
              <Button 
                onClick={() => {
                  if (editingField === "conversationProfile") saveSessionSettings("conversationProfile", conversationProfile);
                  else if (editingField === "userNote") saveSessionSettings("userNote", userNote);
                  else if (editingField === "summaryMemory") saveSessionSettings("summaryMemory", summaryMemory);
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
