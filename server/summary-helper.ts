import type { Session, Message } from "../shared/schema";

interface SummaryRequest {
  messages: Message[];
  existingSummary: string | null;
  existingPlotPoints: string | null;
  provider: string;
  model: string;
  apiKey: string;
}

interface SummaryResult {
  summary: string;
  keyPlotPoints: string[];
}

export async function generateSummary(request: SummaryRequest): Promise<SummaryResult> {
  const { messages, existingSummary, existingPlotPoints, provider, model, apiKey } = request;
  
  if (!apiKey) {
    throw new Error("API key is required for summary generation");
  }
  
  const aiMessages = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join("\n\n");
  
  let existingPoints: string[] = [];
  if (existingPlotPoints) {
    try {
      existingPoints = JSON.parse(existingPlotPoints);
    } catch (e) {
      existingPoints = [];
    }
  }
  
  const promptParts = [];
  
  promptParts.push(`당신은 인터랙티브 스토리의 대화 내용을 분석하는 AI입니다.`);
  promptParts.push(`다음 규칙을 따라주세요:`);
  promptParts.push(`1. 최근 대화의 요약을 1000자 이내로 작성하세요.`);
  promptParts.push(`2. 중요한 분기점(선택, 결정, 사건)을 별도로 추출하세요.`);
  promptParts.push(`3. 기존 분기점은 절대 삭제하지 말고 유지하세요.`);
  promptParts.push(`4. 새로운 중요 분기점만 추가하세요.\n`);
  
  if (existingSummary) {
    promptParts.push(`[기존 요약]\n${existingSummary}\n`);
  }
  
  if (existingPoints.length > 0) {
    promptParts.push(`[기존 핵심 분기점 - 반드시 유지]`);
    existingPoints.forEach((point, i) => {
      promptParts.push(`${i + 1}. ${point}`);
    });
    promptParts.push(``);
  }
  
  promptParts.push(`[최근 AI 응답 ${messages.length}개]`);
  promptParts.push(aiMessages);
  promptParts.push(``);
  promptParts.push(`다음 JSON 형식으로만 응답하세요:`);
  promptParts.push(`{`);
  promptParts.push(`  "summary": "최근 대화 요약 (1000자 이내, 기존 요약과 합쳐서 전체 맥락 유지)",`);
  promptParts.push(`  "keyPlotPoints": ["기존 분기점 유지", "새로운 중요 분기점 추가"]`);
  promptParts.push(`}`);
  promptParts.push(``);
  promptParts.push(`중요: keyPlotPoints에는 스토리의 중요한 결정, 선택, 전환점만 포함하세요. 기존 분기점은 모두 유지하고 새 분기점만 추가하세요.`);
  
  const summaryPrompt = promptParts.join("\n");
  
  try {
    let generatedText = "";
    
    if (provider === "gemini") {
      const isThinkingOnlyModel = model.includes("gemini-3-pro") || model.includes("gemini-2.5-pro");
      const generationConfig: Record<string, any> = { 
        temperature: 0.5, 
        maxOutputTokens: 2048
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
    
    // Parse the JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse JSON from response:", generatedText);
      // Fallback: return the raw text as summary with existing plot points
      return {
        summary: generatedText.trim().slice(0, 1000),
        keyPlotPoints: existingPoints
      };
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Merge existing plot points with new ones, removing duplicates
      const allPoints = [...existingPoints];
      if (parsed.keyPlotPoints && Array.isArray(parsed.keyPlotPoints)) {
        for (const point of parsed.keyPlotPoints) {
          if (point && !allPoints.some(p => p.includes(point) || point.includes(p))) {
            allPoints.push(point);
          }
        }
      }
      
      return {
        summary: parsed.summary || generatedText.trim().slice(0, 1000),
        keyPlotPoints: allPoints
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        summary: generatedText.trim().slice(0, 1000),
        keyPlotPoints: existingPoints
      };
    }
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
