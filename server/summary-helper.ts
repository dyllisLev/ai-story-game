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
  
  const MAX_PLOT_POINTS = 30;
  
  // 분기점이 한도 초과 시, 오래된 것들을 요약에 통합
  let archivedPointsSummary = "";
  let activePoints = existingPoints;
  
  if (existingPoints.length > MAX_PLOT_POINTS) {
    const archivedPoints = existingPoints.slice(0, existingPoints.length - MAX_PLOT_POINTS);
    activePoints = existingPoints.slice(-MAX_PLOT_POINTS);
    archivedPointsSummary = `\n[과거 주요 사건: ${archivedPoints.join(", ")}]`;
  }
  
  const promptParts = [];
  
  promptParts.push(`당신은 인터랙티브 스토리를 간결하게 요약하는 AI입니다.`);
  promptParts.push(`다음 규칙을 반드시 따르세요:`);
  promptParts.push(`1. **요약은 500자 이내로 짧고 간결하게** 작성하세요.`);
  promptParts.push(`2. **시간순으로 정리**하되, 핵심 사건만 포함하세요.`);
  promptParts.push(`3. 각 사건 앞에 시간 표기 (예: [초반], [10턴 경], [20턴 경], [최근])를 붙이세요.`);
  promptParts.push(`4. 중요한 선택/결정/사건만 간략히 나열하세요.`);
  promptParts.push(`5. 불필요한 설명이나 장황한 묘사는 제거하세요.\n`);
  
  if (existingSummary || archivedPointsSummary) {
    promptParts.push(`[기존 요약]`);
    if (existingSummary) promptParts.push(existingSummary);
    if (archivedPointsSummary) promptParts.push(archivedPointsSummary);
    promptParts.push(``);
  }
  
  if (activePoints.length > 0) {
    promptParts.push(`[현재 핵심 분기점 - 유지]`);
    activePoints.forEach((point, i) => {
      promptParts.push(`${i + 1}. ${point}`);
    });
    promptParts.push(``);
  }
  
  promptParts.push(`[최근 AI 응답 ${messages.length}개]`);
  promptParts.push(aiMessages);
  promptParts.push(``);
  promptParts.push(`다음 JSON 형식으로만 응답하세요:`);
  promptParts.push(`{`);
  promptParts.push(`  "summary": "[초반] 첫 사건. [10턴경] 두번째 사건. [최근] 최신 사건. (500자 이내, 핵심만)",`);
  promptParts.push(`  "keyPlotPoints": ["간결한 분기점 설명 (최대 ${MAX_PLOT_POINTS}개)"]`);
  promptParts.push(`}`);
  promptParts.push(``);
  promptParts.push(`중요 규칙:`);
  promptParts.push(`- summary: 기존 요약과 최근 내용을 통합하되 500자 이내로 짧게. 시간 표기 필수.`);
  promptParts.push(`- keyPlotPoints: 각 분기점은 한 문장으로 간결하게. 최대 ${MAX_PLOT_POINTS}개.`);
  
  const summaryPrompt = promptParts.join("\n");
  
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
    
    // Parse the JSON response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to parse JSON from response:", generatedText);
      // Fallback: return the raw text as summary with active plot points
      return {
        summary: generatedText.trim().slice(0, 500),
        keyPlotPoints: activePoints
      };
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Merge existing plot points with new ones, removing duplicates
      const allPoints = [...activePoints];
      if (parsed.keyPlotPoints && Array.isArray(parsed.keyPlotPoints)) {
        for (const point of parsed.keyPlotPoints) {
          if (point && !allPoints.some(p => p.includes(point) || point.includes(p))) {
            allPoints.push(point);
          }
        }
      }
      
      // 최대 개수 제한 (최신 것만 유지)
      const finalPoints = allPoints.slice(-MAX_PLOT_POINTS);
      
      return {
        summary: parsed.summary || generatedText.trim().slice(0, 500),
        keyPlotPoints: finalPoints
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        summary: generatedText.trim().slice(0, 500),
        keyPlotPoints: activePoints
      };
    }
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
