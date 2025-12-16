import { useState, useRef, useEffect, useCallback } from "react";

export interface Group {
  id: number;
  name: string;
  type: string;
  description: string | null;
}

export interface GroupPermission {
  groupId: number;
  permission: 'read' | 'write';
}

export interface StoryFormState {
  title: string;
  description: string;
  genre: string;
  storySettings: string;
  prologue: string;
  promptTemplate: string;
  exampleUserInput: string;
  exampleAiResponse: string;
  startingSituation: string;
  image: string | null;
}

export interface UseStoryFormOptions {
  initialState?: Partial<StoryFormState>;
}

export function useStoryForm(options: UseStoryFormOptions = {}) {
  const { initialState = {} } = options;

  const [title, setTitle] = useState(initialState.title ?? "");
  const [description, setDescription] = useState(initialState.description ?? "");
  const [genre, setGenre] = useState(initialState.genre ?? "판타지");
  const [storySettings, setStorySettings] = useState(initialState.storySettings ?? "");
  const [prologue, setPrologue] = useState(initialState.prologue ?? "");
  const [promptTemplate, setPromptTemplate] = useState(initialState.promptTemplate ?? "기본 프롬프트");
  const [exampleUserInput, setExampleUserInput] = useState(initialState.exampleUserInput ?? "");
  const [exampleAiResponse, setExampleAiResponse] = useState(initialState.exampleAiResponse ?? "");
  const [startingSituation, setStartingSituation] = useState(initialState.startingSituation ?? "");
  const [image, setImage] = useState<string | null>(initialState.image ?? null);

  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrologue, setIsGeneratingPrologue] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupPermission[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }, []);

  const toggleGroupSelection = useCallback((groupId: number) => {
    setSelectedGroups(prev => {
      const exists = prev.find(g => g.groupId === groupId);
      if (exists) {
        return prev.filter(g => g.groupId !== groupId);
      } else {
        return [...prev, { groupId, permission: 'read' }];
      }
    });
  }, []);

  const updateGroupPermission = useCallback((groupId: number, permission: 'read' | 'write') => {
    setSelectedGroups(prev => 
      prev.map(g => g.groupId === groupId ? { ...g, permission } : g)
    );
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const handleGenerateStorySettings = useCallback(async () => {
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
  }, [title, description, genre, promptTemplate, storySettings]);

  const handleGeneratePrologue = useCallback(async () => {
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
  }, [title, description, genre, storySettings]);

  const setFormState = useCallback((state: Partial<StoryFormState>) => {
    if (state.title !== undefined) setTitle(state.title);
    if (state.description !== undefined) setDescription(state.description);
    if (state.genre !== undefined) setGenre(state.genre);
    if (state.storySettings !== undefined) setStorySettings(state.storySettings);
    if (state.prologue !== undefined) setPrologue(state.prologue);
    if (state.promptTemplate !== undefined) setPromptTemplate(state.promptTemplate);
    if (state.exampleUserInput !== undefined) setExampleUserInput(state.exampleUserInput);
    if (state.exampleAiResponse !== undefined) setExampleAiResponse(state.exampleAiResponse);
    if (state.startingSituation !== undefined) setStartingSituation(state.startingSituation);
    if (state.image !== undefined) setImage(state.image);
  }, []);

  const getFormData = useCallback(() => ({
    title: title.trim(),
    description: description.trim(),
    genre,
    storySettings: storySettings.trim(),
    prologue: prologue.trim(),
    promptTemplate,
    exampleUserInput: exampleUserInput.trim(),
    exampleAiResponse: exampleAiResponse.trim(),
    startingSituation: startingSituation.trim(),
    image,
  }), [title, description, genre, storySettings, prologue, promptTemplate, exampleUserInput, exampleAiResponse, startingSituation, image]);

  return {
    title, setTitle,
    description, setDescription,
    genre, setGenre,
    storySettings, setStorySettings,
    prologue, setPrologue,
    promptTemplate, setPromptTemplate,
    exampleUserInput, setExampleUserInput,
    exampleAiResponse, setExampleAiResponse,
    startingSituation, setStartingSituation,
    image, setImage,
    isUploading,
    isGenerating,
    isGeneratingPrologue,
    groups,
    selectedGroups,
    setSelectedGroups,
    fileInputRef,
    loadGroups,
    toggleGroupSelection,
    updateGroupPermission,
    handleImageUpload,
    handleGenerateStorySettings,
    handleGeneratePrologue,
    setFormState,
    getFormData,
  };
}
