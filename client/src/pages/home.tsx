import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { MOCK_STORIES } from "@/lib/mockData";
import { Plus, Play, MoreHorizontal, Settings as SettingsIcon } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with Settings */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 max-w-5xl flex items-center justify-end">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" data-testid="button-settings">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-1">나의 스토리</h2>
            <p className="text-muted-foreground text-sm">최근 플레이한 스토리를 이어서 즐겨보세요.</p>
          </div>
          <Link href="/create">
            <Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" />
              새 스토리 만들기
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_STORIES.map((story) => (
            <div key={story.id} className="group relative bg-card rounded-xl border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 overflow-hidden">
              <div className="aspect-[16/9] overflow-hidden relative">
                <img 
                  src={story.image} 
                  alt={story.title} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4">
                  <div className="flex gap-2">
                    <Link href={`/play/${story.id}?new=true`}>
                      <Button size="sm" variant="secondary" className="gap-2">
                        <Plus className="w-3 h-3" /> 새로 시작
                      </Button>
                    </Link>
                    <Link href={`/play/${story.id}`}>
                      <Button size="sm" className="bg-white text-black hover:bg-white/90 gap-2">
                        <Play className="w-3 h-3" /> 이어서 플레이
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs font-medium px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    {story.genre}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{story.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{story.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-dashed">
                  <span>최근 플레이: {story.lastPlayed}</span>
                  <span>by {story.author}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
