import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Save,
  Loader2,
  Image as ImageIcon
} from "lucide-react";

interface Story {
  id: number;
  title: string;
  description: string | null;
  image: string | null;
  genre: string | null;
  author: string | null;
}

export default function EditStory() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const storyId = params?.id ? parseInt(params.id) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("판타지");
  const [image, setImage] = useState("");

  useEffect(() => {
    if (storyId) {
      loadStory();
    }
  }, [storyId]);

  const loadStory = async () => {
    try {
      const response = await fetch(`/api/stories/${storyId}`);
      if (response.ok) {
        const story: Story = await response.json();
        setTitle(story.title);
        setDescription(story.description || "");
        setGenre(story.genre || "판타지");
        setImage(story.image || "");
      } else {
        setLocation("/");
      }
    } catch (error) {
      console.error("Failed to load story:", error);
      setLocation("/");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("스토리 이름을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          genre,
          image: image || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000",
        }),
      });

      if (response.ok) {
        setLocation("/");
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save story:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
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
        <Button 
          onClick={handleSave} 
          disabled={saving || !title.trim()}
          className="bg-primary hover:bg-primary/90 text-white gap-2"
          data-testid="button-save-story"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          저장
        </Button>
      </header>

      <div className="flex-1 bg-muted/30 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>커버 이미지</Label>
                <div className="flex gap-4">
                  <div className="w-32 h-20 bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
                    {image ? (
                      <img src={image} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input 
                      placeholder="이미지 URL을 입력하세요" 
                      className="bg-background"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      data-testid="input-story-image"
                    />
                    <p className="text-xs text-muted-foreground mt-1">외부 이미지 URL을 입력해주세요</p>
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
      </div>
    </div>
  );
}
