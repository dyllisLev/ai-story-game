import type { Session, Message } from "../shared/schema";
import { promises as fs } from "fs";
import path from "path";

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

async function saveSummaryLog(logData: {
  timestamp: string;
  provider: string;
  model: string;
  messageCount: number;
  existingSummaryLength: number;
  prompt: string;
  response: string;
  responseLength: number;
}) {
  try {
    const logDir = "/tmp/logs/summary_prompts";
    await fs.mkdir(logDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `summary_${timestamp}.log`;
    const filepath = path.join(logDir, filename);
    
    const logContent = `
================================================================================
SUMMARY GENERATION LOG
================================================================================
Timestamp: ${logData.timestamp}
Provider: ${logData.provider}
Model: ${logData.model}
Message Count: ${logData.messageCount}
Existing Summary Length: ${logData.existingSummaryLength} characters
Response Length: ${logData.responseLength} characters

================================================================================
REQUEST PROMPT (FULL)
================================================================================

${logData.prompt}

================================================================================
RESPONSE (FULL)
================================================================================

${logData.response}

================================================================================
END OF LOG
================================================================================
`;
    
    await fs.writeFile(filepath, logContent, "utf-8");
    console.log(`[SUMMARY-LOG] Saved to ${filepath}`);
  } catch (error) {
    console.error("[SUMMARY-LOG] Failed to save log:", error);
  }
}

export async function generateSummary(request: SummaryRequest): Promise<SummaryResult> {
  const { messages, existingSummary, provider, model, apiKey, summaryPromptTemplate } = request;
  const startTime = new Date().toISOString();
  
  if (!apiKey) {
    throw new Error("API key is required for summary generation");
  }
  
  const aiMessages = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join("\n\n");
  
  if (!summaryPromptTemplate) {
    throw new Error("Summary prompt template is required but not configured in settings");
  }
  
  const summaryPrompt = summaryPromptTemplate
    .replace(/{existingSummary}/g, existingSummary || "")
    .replace(/{messageCount}/g, messages.length.toString())
    .replace(/{aiMessages}/g, aiMessages);
  
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
    
    // Save full prompt and response to log file for debugging
    await saveSummaryLog({
      timestamp: startTime,
      provider,
      model,
      messageCount: messages.length,
      existingSummaryLength: existingSummary?.length || 0,
      prompt: summaryPrompt,
      response: generatedText,
      responseLength: generatedText.length
    });
    
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
