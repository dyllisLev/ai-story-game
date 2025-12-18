import type { Session, Message } from "../shared/schema";
import { promises as fs } from "fs";
import path from "path";
import { storage } from "./storage";

interface SummaryRequest {
  messages: Message[];
  existingSummary: string | null;
  provider: string;
  model: string;
  apiKey: string;
  summaryPromptTemplate?: string;
  userId?: number;
  sessionId?: number;
}

interface SummaryResult {
  summary: string; // Full summary (existing + new)
  newSummary: string; // Only the newly generated part
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
  const { messages, existingSummary, provider, model, apiKey, summaryPromptTemplate, userId, sessionId } = request;
  const startTimeMs = Date.now();
  const startTime = new Date().toISOString();
  
  if (!apiKey) {
    const error = new Error("API key is required for summary generation");
    await storage.createApiLog({
      type: 'summary',
      provider,
      model,
      inputPrompt: 'API key missing',
      errorMessage: error.message,
      userId,
      sessionId,
      responseTime: Date.now() - startTimeMs,
    }).catch(logErr => console.error('[API-LOG] Failed to save error log:', logErr));
    throw error;
  }
  
  const aiMessages = messages
    .filter(m => m.role === "assistant")
    .map(m => m.content)
    .join("\n\n");
  
  if (!summaryPromptTemplate) {
    const error = new Error("Summary prompt template is required but not configured in settings");
    await storage.createApiLog({
      type: 'summary',
      provider,
      model,
      inputPrompt: 'Prompt template missing',
      errorMessage: error.message,
      userId,
      sessionId,
      responseTime: Date.now() - startTimeMs,
    }).catch(logErr => console.error('[API-LOG] Failed to save error log:', logErr));
    throw error;
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
    } else if (provider === "chatgpt") {
      // OpenAI ChatGPT API
      const requestBody: any = {
        model: model,
        messages: [
          { role: "user", content: summaryPrompt }
        ]
      };
      
      // Reasoning models (o1, o3, o4) don't support temperature and reasoning_effort
      const isReasoningModel = model.includes("o1") || model.includes("o3") || model.includes("o4");
      
      // GPT-5 and newer models use temperature: 1 (default only)
      const isGPT5OrNewer = model.includes("gpt-5");
      
      if (!isReasoningModel) {
        // GPT-5+ only supports temperature: 1
        // Older models support 0-2 range
        requestBody.temperature = isGPT5OrNewer ? 1 : 0.5;
      }
      
      // Add reasoning_effort for GPT-5 models (for speed optimization)
      if (isGPT5OrNewer && !isReasoningModel) {
        // "low" = faster response, suitable for summarization tasks
        requestBody.reasoning_effort = "low";
      }
      
      // Use max_completion_tokens for newer models (GPT-4.5, GPT-5, reasoning models)
      // Optimized token limits for faster response times
      if (model.includes("gpt-5")) {
        // GPT-5/GPT-5-mini: 5000 tokens for summaries (optimized for speed)
        requestBody.max_completion_tokens = 5000;
      } else if (isReasoningModel) {
        // o1/o3/o4: Higher limit for complex reasoning tasks
        requestBody.max_completion_tokens = 10000;
      } else if (model.includes("gpt-4.5")) {
        requestBody.max_completion_tokens = 4096;
      } else {
        requestBody.max_tokens = 2048;
      }
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      console.log('[CHATGPT-API] Full response:', JSON.stringify(data, null, 2));
      
      if (data.error) {
        throw new Error(`ChatGPT API Error: ${data.error.message}`);
      }
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error("ChatGPT API returned empty response");
      }
      
      const messageContent = data.choices[0].message?.content;
      
      if (!messageContent) {
        console.error('[CHATGPT-API] Empty content in response:', data.choices[0]);
        throw new Error("ChatGPT API returned null or empty content");
      }
      
      generatedText = messageContent;
    } else if (provider === "claude") {
      // Anthropic Claude API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2048,
          temperature: 0.5,
          messages: [
            { role: "user", content: summaryPrompt }
          ]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Claude API Error: ${data.error.message}`);
      }
      
      if (!data.content || data.content.length === 0) {
        throw new Error("Claude API returned empty response");
      }
      
      generatedText = data.content[0].text;
    } else if (provider === "grok") {
      // xAI Grok API (OpenAI-compatible)
      const requestBody: any = {
        model: model,
        messages: [
          { role: "user", content: summaryPrompt }
        ],
        temperature: 0.5
      };
      
      // Use max_completion_tokens for newer Grok models
      if (model.includes("grok-4") || model.includes("grok-3")) {
        requestBody.max_completion_tokens = 2048;
      } else {
        requestBody.max_tokens = 2048;
      }
      
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Grok API Error: ${data.error.message}`);
      }
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error("Grok API returned empty response");
      }
      
      generatedText = data.choices[0].message.content;
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
    
    // Save to API logs database (success)
    const responseTime = Date.now() - startTimeMs;
    
    // Ensure we have valid generated text
    if (!generatedText || generatedText.trim().length === 0) {
      console.error('[SUMMARY] Generated text is empty!');
      throw new Error('AI generated empty response');
    }
    
    console.log(`[API-LOG] Saving success log - output length: ${generatedText.length}`);
    
    await storage.createApiLog({
      type: 'summary',
      provider,
      model,
      inputPrompt: summaryPrompt,
      outputResponse: generatedText,
      userId,
      sessionId,
      responseTime,
    }).catch(logErr => console.error('[API-LOG] Failed to save success log:', logErr));
    
    // New summary is what AI generated (only new content)
    const newSummary = generatedText.trim();
    
    // Full summary is existing + new (append mode)
    let fullSummary: string;
    if (existingSummary && existingSummary.trim().length > 0) {
      // Append new summary to existing one
      fullSummary = existingSummary.trim() + "\n" + newSummary;
    } else {
      // First summary - no existing summary
      fullSummary = newSummary;
    }
    
    console.log(`[SUMMARY] Existing summary length: ${existingSummary?.length || 0}, New summary length: ${newSummary.length}, Full summary length: ${fullSummary.length}`);
    
    return {
      summary: fullSummary,
      newSummary: newSummary,
      keyPlotPoints: []
    };
  } catch (error: any) {
    console.error("Failed to generate summary:", error);
    
    // Save to API logs database (error)
    const responseTime = Date.now() - startTimeMs;
    await storage.createApiLog({
      type: 'summary',
      provider,
      model,
      inputPrompt: summaryPrompt,
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      userId,
      sessionId,
      responseTime,
    }).catch(logErr => console.error('[API-LOG] Failed to save error log:', logErr));
    
    throw error;
  }
}
