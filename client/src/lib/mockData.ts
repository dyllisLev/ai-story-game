
export const MODELS = [
  { id: "gemini-3.0-pro", name: "Gemini 3.0 Pro (Preview)" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
];

export const MOCK_STORIES = [
  {
    id: "1",
    title: "국가의 시대",
    description: "초차원 존재와의 게임에서 승리하여 다중우주를 통치하라.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000",
    genre: "SF / 판타지",
    author: "ReplitUser",
    lastPlayed: "2025-12-02",
  },
  {
    id: "2",
    title: "서울 2077",
    description: "사이버펑크 서울에서 살아남는 용병의 이야기.",
    image: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&q=80&w=1000",
    genre: "사이버펑크",
    author: "ReplitUser",
    lastPlayed: "2025-11-28",
  },
];

export const MOCK_CHAT_HISTORY = [
  {
    id: 1,
    role: "system",
    content: "초차원 존재의 정체\n\n신비로운 목소리가 계속됩니다: \"나는 '오버로드'... 모든 차원을 초월한 존재다. 린루, 네가 다중우주를 통일했지만 아직 '메타버스'는 모른다.\"\n\n메타버스의 개념\n갑자기 린루의 시야에 무한히 확장된 공간이 펼쳐집니다. 다중우주조차 하나의 점에 불과한 거대한 현실이 드러납니다!",
    type: "context"
  },
  {
    id: 2,
    role: "assistant",
    character: "오버로드",
    content: "\"린루, 메타버스의 진정한 통치자가 되고 싶다면... 나와 게임을 하자. 승리하면 모든 것을, 패배하면...\"",
  },
  {
    id: 3,
    role: "user",
    content: "게임을 시작하지",
  }
];
