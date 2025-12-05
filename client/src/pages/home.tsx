import { useState, useEffect } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Play, Edit, Settings as SettingsIcon, Loader2, Trash2, User } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Story {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  genre: string | null;
  author: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (isAuthenticated) {
      loadStories();
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/auth" />;
  }

  const loadStories = async () => {
    try {
      const response = await fetch("/api/stories");
      if (response.ok) {
        const data = await response.json();
        setStories(data);
      }
    } catch (error) {
      console.error("Failed to load stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "방금";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  const createNewSession = async (storyId: number, title: string) => {
    try {
      // Create a new session (prologue is automatically added by the server)
      const sessionResponse = await fetch(`/api/stories/${storyId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `${title} - ${new Date().toLocaleString('ko-KR')}` }),
      });
      
      if (sessionResponse.ok) {
        const session = await sessionResponse.json();
        setLocation(`/play/${session.id}`);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("세션 생성에 실패했습니다.");
    }
  };

  const continuePlay = async (story: Story) => {
    try {
      // Get sessions for this story
      const response = await fetch(`/api/stories/${story.id}/sessions`);
      if (response.ok) {
        const sessions = await response.json();
        if (sessions.length > 0) {
          // Navigate to the most recent session
          const latestSession = sessions[sessions.length - 1];
          setLocation(`/play/${latestSession.id}`);
        } else {
          // No sessions exist, create a new one
          await createNewSession(story.id, story.title);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      alert("세션 로드에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 max-w-5xl flex items-center justify-end gap-2">
          <Link href="/create">
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" data-testid="button-create-story">
              <Plus className="w-4 h-4" />
              새 스토리 만들기
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-settings">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImage || undefined} alt={user?.displayName || user?.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium">
                {user?.displayName || user?.username}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/account")} data-testid="menu-account">
                <User className="w-4 h-4 mr-2" />
                계정 관리
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600" data-testid="menu-logout">
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-1">나의 스토리</h2>
          <p className="text-muted-foreground text-sm">최근 플레이한 스토리를 이어서 즐겨보세요.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>아직 스토리가 없습니다. 새 스토리를 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div key={story.id} className="group relative bg-card rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 overflow-hidden">
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img 
                    src={story.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400"} 
                    alt={story.title} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs font-medium px-2 py-1 bg-muted rounded-full text-muted-foreground">
                      {story.genre || "일반"}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/edit/${story.id}`}>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-primary hover:border-primary" title="수정" data-testid={`button-edit-${story.id}`}>
                          <Edit className="w-5 h-5" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500 hover:border-red-500" 
                        title="삭제"
                        data-testid={`button-delete-${story.id}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (confirm("정말로 이 스토리를 삭제하시겠습니까?")) {
                            try {
                              await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
                              loadStories();
                            } catch (error) {
                              console.error("Failed to delete story:", error);
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{story.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{story.description}</p>
                  <div className="flex gap-2 mb-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => createNewSession(story.id, story.title)}
                      data-testid={`button-new-session-${story.id}`}
                    >
                      <Plus className="w-3 h-3" /> 새로 시작
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 gap-2"
                      onClick={() => continuePlay(story)}
                      data-testid={`button-continue-${story.id}`}
                    >
                      <Play className="w-3 h-3" /> 이어하기
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-dashed">
                    <span>최근 플레이: {formatDate(story.updatedAt)}</span>
                    <span>by {story.author || "Unknown"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
