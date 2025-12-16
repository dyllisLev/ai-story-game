import type { Session, Message } from "../shared/schema";

interface SummaryRequest {
  messages: Message[];
  existingSummary: string | null;
  provider: string;
  model: string;
  apiKey: string;
  summaryPromptTemplate?: string;
}

interface SummaryResult {
  summary: string;
  keyPlotPoints: string[];
}

export async function generateSummary(request: SummaryRequest): Promise<SummaryResult> {
  const { messages, existingSummary, provider, model, apiKey, summaryPromptTemplate } = request;
  
  if (!apiKey) {
    throw new Error("API key is required for summary generation");
  }
  
  const aiMessages = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join("\n\n");
  
  let summaryPrompt: string;
  
  if (summaryPromptTemplate) {
    summaryPrompt = summaryPromptTemplate
      .replace(/{existingSummary}/g, existingSummary || "")
      .replace(/{messageCount}/g, messages.length.toString())
      .replace(/{aiMessages}/g, aiMessages);
  } else {
    const promptParts = [];
    
    promptParts.push(`당신은 인터랙티브 스토리의 타임라인을 작성하는 AI입니다.`);
    promptParts.push(`다음 규칙을 반드시 따르세요:`);
    promptParts.push(`1. **형식**: [시간] 사건 요약 한 줄`);
    promptParts.push(`2. **시간 표기**: [1턴], [5턴], [12턴] 등 턴 번호 사용`);
    promptParts.push(`3. **각 사건은 한 줄로**: 간결하게 핵심만 표현 (20-30자 내외)`);
    promptParts.push(`4. **기존 타임라인에 추가**: 기존 내용은 그대로 유지하고 새로운 사건만 추가`);
    promptParts.push(`5. **중요한 사건만**: 의미 있는 선택, 결정, 전개만 포함\n`);
    
    if (existingSummary) {
      promptParts.push(`[기존 요약]`);
      promptParts.push(existingSummary);
      promptParts.push(``);
    }
    
    promptParts.push(`[최근 AI 응답 ${messages.length}개]`);
    promptParts.push(aiMessages);
    promptParts.push(``);
    promptParts.push(`위 내용을 바탕으로 타임라인을 작성하세요.`);
    promptParts.push(`예시: [1턴] 무림에 도착\\n[3턴] 소매치기 추적\\n[7턴] 하오문 분타 발견\\n[12턴] 만월루에서 조설연과 만남`);
    promptParts.push(``);
    promptParts.push(`중요:`);
    promptParts.push(`- 기존 타임라인을 그대로 유지하고 새로운 사건만 추가`);
    promptParts.push(`- 각 줄은 [턴수] 사건 형식으로 20-30자 이내`);
    promptParts.push(`- 타임라인은 길이 제한 없이 계속 쌓임`);
    
    summaryPrompt = promptParts.join("\n");
  }
  
  try {
    let generatedText = "";
    
    if (provider === "gemini") {
      // Apply thinking config based on model version
      const isGemini3Model = model.includes("gemini-3");
      const isGemini25Model = model.includes("gemini-2.5");
      const generationConfig: Record<string, any> = { 
        temperature: isGemini3Model ? 1.0 : 0.5,
        maxOutputTokens: 2048
      };
      
      if (isGemini3Model) {
        generationConfig.thinkingConfig = { thinkingLevel: "low" };
      } else if (isGemini25Model) {
        generationConfig.thinkingConfig = { thinkingBudget: 1024 };
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
    
    // Return the raw response as summary
    return {
      summary: generatedText.trim(),
      keyPlotPoints: []
    };
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
