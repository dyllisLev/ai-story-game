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
  
  promptParts.push(`당신은 인터랙티브 스토리의 타임라인을 작성하는 AI입니다.`);
  promptParts.push(`다음 규칙을 반드시 따르세요:`);
  promptParts.push(`1. **형식**: [시간] 사건 요약 한 줄`);
  promptParts.push(`2. **시간 표기**: [1턴], [5턴], [12턴] 등 턴 번호 사용`);
  promptParts.push(`3. **각 사건은 한 줄로**: 간결하게 핵심만 표현 (20-30자 내외)`);
  promptParts.push(`4. **기존 타임라인에 추가**: 기존 내용은 그대로 유지하고 새로운 사건만 추가`);
  promptParts.push(`5. **중요한 사건만**: 의미 있는 선택, 결정, 전개만 포함\n`);
  
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
  promptParts.push(`  "summary": "기존 타임라인\\n[새로운턴] 새 사건\\n[다음턴] 다음 사건",`);
  promptParts.push(`  "keyPlotPoints": ["간결한 분기점 (최대 ${MAX_PLOT_POINTS}개)"]`);
  promptParts.push(`}`);
  promptParts.push(``);
  promptParts.push(`예시:`);
  promptParts.push(`"summary": "[1턴] 무림에 도착\\n[3턴] 소매치기 추적\\n[7턴] 하오문 분타 발견\\n[12턴] 만월루에서 조설연과 만남"`);
  promptParts.push(``);
  promptParts.push(`중요:`);
  promptParts.push(`- 기존 타임라인을 그대로 유지하고 새로운 사건만 추가`);
  promptParts.push(`- 각 줄은 [턴수] 사건 형식으로 20-30자 이내`);
  promptParts.push(`- 타임라인은 길이 제한 없이 계속 쌓임`);
  
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
        summary: generatedText.trim(),
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
        summary: parsed.summary || generatedText.trim(),
        keyPlotPoints: finalPoints
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return {
        summary: generatedText.trim(),
        keyPlotPoints: activePoints
      };
    }
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw error;
  }
}
