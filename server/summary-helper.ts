import type { Session, Message } from "../shared/schema";

interface SummaryRequest {
  messages: Message[];
  existingSummary: string | null;
  provider: string;
  model: string;
  apiKeys: {
    chatgpt?: string;
    grok?: string;
    claude?: string;
    gemini?: string;
  };
}

export async function generateSummary(request: SummaryRequest): Promise<string> {
  const { messages, existingSummary, provider, model, apiKeys } = request;
  
  const aiMessages = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join("\n\n");
  
  const promptParts = [];
  
  if (existingSummary) {
    promptParts.push(`기존 요약:\n${existingSummary}\n`);
  }
  
  promptParts.push(`최근 AI 응답 (${messages.length}개):\n${aiMessages}`);
  promptParts.push(`\n위 내용을 간결하게 요약해주세요. 중요한 사건, 캐릭터 변화, 핵심 정보만 포함하세요. 500자 이내로 작성하세요.`);
  
  const summaryPrompt = promptParts.join("\n");
  
  try {
    const response = await fetch(`${process.env.REPL_HOME || ''}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider,
        model,
        messages: [
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        apiKeys
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Summary API request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response || data.content || "";
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
