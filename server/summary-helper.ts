import type { Session, Message } from "../shared/schema";

interface SummaryRequest {
  messages: Message[];
  existingSummary: string | null;
  provider: string;
  model: string;
  apiKey: string;
}

export async function generateSummary(request: SummaryRequest): Promise<string> {
  const { messages, existingSummary, provider, model, apiKey } = request;
  
  if (!apiKey) {
    throw new Error("API key is required for summary generation");
  }
  
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
    let generatedText = "";
    
    if (provider === "gemini") {
      const isThinkingOnlyModel = model.includes("gemini-3-pro") || model.includes("gemini-2.5-pro");
      const generationConfig: Record<string, any> = { 
        temperature: 0.7, 
        maxOutputTokens: 1024
      };
      
      if (!isThinkingOnlyModel) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: summaryPrompt }] }
            ],
            generationConfig
          })
        }
      );
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message}`);
      }
      
      const candidate = data.candidates?.[0];
      if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error(`Gemini API returned empty content`);
      }
      
      generatedText = candidate.content.parts.map((p: any) => p.text).join("");
    } else {
      throw new Error(`Provider ${provider} not supported for summary generation yet`);
    }
    
    return generatedText.trim();
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
