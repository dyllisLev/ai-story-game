import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStorySchema, insertSessionSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== IMAGE UPLOAD API ====================

  app.use("/uploads", (await import("express")).default.static(uploadDir));

  app.post("/api/upload", upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // ==================== SETTINGS API ====================
  
  app.get("/api/settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      res.json(allSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value required" });
      }

      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.post("/api/settings/batch", async (req, res) => {
    try {
      const { settings: settingsData } = req.body;
      
      if (!Array.isArray(settingsData)) {
        return res.status(400).json({ error: "Settings array required" });
      }

      const results = [];
      for (const { key, value } of settingsData) {
        if (key && value !== undefined) {
          const setting = await storage.setSetting(key, value);
          results.push(setting);
        }
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // ==================== STORIES API ====================

  app.get("/api/stories", async (req, res) => {
    try {
      const allStories = await storage.getAllStories();
      res.json(allStories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  app.get("/api/stories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }
      
      const story = await storage.getStory(id);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch story" });
    }
  });

  app.post("/api/stories", async (req, res) => {
    try {
      const parsed = insertStorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid story data", details: parsed.error });
      }

      const story = await storage.createStory(parsed.data);
      res.status(201).json(story);
    } catch (error) {
      res.status(500).json({ error: "Failed to create story" });
    }
  });

  app.put("/api/stories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const story = await storage.updateStory(id, req.body);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.json(story);
    } catch (error) {
      res.status(500).json({ error: "Failed to update story" });
    }
  });

  app.delete("/api/stories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const deleted = await storage.deleteStory(id);
      if (!deleted) {
        return res.status(404).json({ error: "Story not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete story" });
    }
  });

  // ==================== SESSIONS API ====================

  app.get("/api/stories/:storyId/sessions", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const sessions = await storage.getSessionsByStory(storyId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/stories/:storyId/sessions", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const parsed = insertSessionSchema.safeParse({
        ...req.body,
        storyId
      });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid session data", details: parsed.error });
      }

      const session = await storage.createSession(parsed.data);
      
      // Automatically add prologue as first message if it exists
      if (story.prologue) {
        await storage.createMessage({
          sessionId: session.id,
          role: "assistant",
          content: story.prologue,
          character: "Narrator"
        });
      }
      
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session", details: error.message });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.updateSession(id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const deleted = await storage.deleteSession(id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // ==================== AI MODELS API ====================

  app.post("/api/ai/models", async (req, res) => {
    try {
      const { provider, apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      let models: { id: string; name: string }[] = [];

      if (provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        models = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => ({
            id: m.name.replace("models/", ""),
            name: m.displayName || m.name.replace("models/", "")
          }));
      } else if (provider === "chatgpt") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        const gptModels = (data.data || [])
          .filter((m: any) => m.id.includes("gpt"))
          .map((m: any) => ({ id: m.id, name: m.id }))
          .sort((a: any, b: any) => b.id.localeCompare(a.id));
        models = gptModels.slice(0, 10);
      } else if (provider === "claude") {
        // Anthropic doesn't have a models list API, return hardcoded list
        models = [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
        ];
        // Verify API key works
        const testResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }]
          })
        });
        if (!testResponse.ok) {
          const errData = await testResponse.json();
          return res.status(400).json({ error: errData.error?.message || "Invalid API key" });
        }
      } else if (provider === "grok") {
        // xAI doesn't have a models list API, return hardcoded list
        models = [
          { id: "grok-beta", name: "Grok Beta" },
          { id: "grok-2-1212", name: "Grok 2" },
        ];
        // Verify API key works
        const testResponse = await fetch("https://api.x.ai/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
        if (testResponse.ok) {
          const data = await testResponse.json();
          if (data.data) {
            models = data.data.map((m: any) => ({ id: m.id, name: m.id }));
          }
        }
      } else {
        return res.status(400).json({ error: "Unsupported provider" });
      }

      res.json({ models });
    } catch (error: any) {
      console.error("Failed to fetch models:", error);
      res.status(500).json({ error: error.message || "Failed to fetch models" });
    }
  });

  // ==================== AI GENERATE API ====================

  app.post("/api/ai/generate-story-settings", async (req, res) => {
    try {
      const { title, description, genre, promptTemplate, storySettings, provider: requestedProvider } = req.body;
      
      // Try to find an available provider with API key
      const providers = ["gemini", "chatgpt", "claude", "grok"];
      let selectedProvider = requestedProvider;
      let apiKey = "";
      
      if (requestedProvider && requestedProvider !== "auto") {
        // Use requested provider
        const apiKeySetting = await storage.getSetting(`apiKey_${requestedProvider}`);
        if (!apiKeySetting || !apiKeySetting.value) {
          return res.status(400).json({ error: `API key for ${requestedProvider} not configured. Please set it in settings.` });
        }
        apiKey = apiKeySetting.value;
        selectedProvider = requestedProvider;
      } else {
        // Auto-select: find first provider with API key
        for (const p of providers) {
          const apiKeySetting = await storage.getSetting(`apiKey_${p}`);
          if (apiKeySetting && apiKeySetting.value) {
            apiKey = apiKeySetting.value;
            selectedProvider = p;
            break;
          }
        }
        
        if (!apiKey) {
          return res.status(400).json({ error: "No AI API key configured. Please set at least one API key in settings." });
        }
      }
      
      // Get custom prompt template
      const customPromptSetting = await storage.getSetting("storyGeneratePrompt");
      
      // Build prompt with placeholders
      let prompt = customPromptSetting?.value || `다음 정보를 바탕으로 상세한 스토리 설정을 작성해주세요.

제목: {title}
한 줄 소개: {description}
장르: {genre}
프롬프트 템플릿: {promptTemplate}

기존 설정:
{storySettings}

위 정보를 바탕으로 세계관, 주요 등장인물(외모, 성격, 말투 포함), 배경 설정 등을 포함한 상세한 스토리 설정을 한국어로 작성해주세요. 창의적이고 몰입감 있는 설정을 만들어주세요.`;

      // Replace placeholders
      prompt = prompt
        .replace(/\{title\}/g, title || "")
        .replace(/\{description\}/g, description || "")
        .replace(/\{genre\}/g, genre || "")
        .replace(/\{promptTemplate\}/g, promptTemplate || "")
        .replace(/\{storySettings\}/g, storySettings || "");

      let generatedText = "";

      // Get selected model for this provider
      const modelSetting = await storage.getSetting(`aiModel_${selectedProvider}`);
      const defaultModels: Record<string, string> = {
        gemini: "gemini-2.0-flash",
        chatgpt: "gpt-4o",
        claude: "claude-3-5-sonnet-20241022",
        grok: "grok-beta"
      };
      const selectedModel = modelSetting?.value || defaultModels[selectedProvider] || "";

      if (selectedProvider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
            })
          }
        );
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (selectedProvider === "chatgpt") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      } else if (selectedProvider === "claude") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.content?.[0]?.text || "";
      } else if (selectedProvider === "grok") {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      } else {
        return res.status(400).json({ error: "Unsupported AI provider" });
      }

      res.json({ generatedText });
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate story settings" });
    }
  });

  app.post("/api/ai/generate-prologue", async (req, res) => {
    try {
      const { title, description, genre, storySettings, provider: requestedProvider } = req.body;
      
      // Try to find an available provider with API key
      const providers = ["gemini", "chatgpt", "claude", "grok"];
      let selectedProvider = requestedProvider;
      let apiKey = "";
      
      if (requestedProvider && requestedProvider !== "auto") {
        const apiKeySetting = await storage.getSetting(`apiKey_${requestedProvider}`);
        if (!apiKeySetting || !apiKeySetting.value) {
          return res.status(400).json({ error: `API key for ${requestedProvider} not configured.` });
        }
        apiKey = apiKeySetting.value;
        selectedProvider = requestedProvider;
      } else {
        for (const p of providers) {
          const apiKeySetting = await storage.getSetting(`apiKey_${p}`);
          if (apiKeySetting && apiKeySetting.value) {
            apiKey = apiKeySetting.value;
            selectedProvider = p;
            break;
          }
        }
        
        if (!apiKey) {
          return res.status(400).json({ error: "No AI API key configured." });
        }
      }
      
      // Get custom prompt template
      const customPromptSetting = await storage.getSetting("prologueGeneratePrompt");
      
      let prompt = customPromptSetting?.value || `다음 정보를 바탕으로 프롤로그와 시작 상황을 작성해주세요.

제목: {title}
한 줄 소개: {description}
장르: {genre}
스토리 설정: {storySettings}

반드시 다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "prologue": "스토리의 시작을 알리는 몰입감 있고 생생한 프롤로그를 한국어로 작성. 200자 이상.",
  "startingSituation": "사용자의 역할, 등장인물과의 관계, 현재 상황을 한국어로 상세히 설명. 100자 이상."
}`;

      prompt = prompt
        .replace(/\{title\}/g, title || "")
        .replace(/\{description\}/g, description || "")
        .replace(/\{genre\}/g, genre || "")
        .replace(/\{storySettings\}/g, storySettings || "");

      // Get selected model
      const modelSetting = await storage.getSetting(`aiModel_${selectedProvider}`);
      const defaultModels: Record<string, string> = {
        gemini: "gemini-2.0-flash",
        chatgpt: "gpt-4o",
        claude: "claude-3-5-sonnet-20241022",
        grok: "grok-beta"
      };
      const selectedModel = modelSetting?.value || defaultModels[selectedProvider] || "";

      let generatedText = "";

      if (selectedProvider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
            })
          }
        );
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (selectedProvider === "chatgpt") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      } else if (selectedProvider === "claude") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.content?.[0]?.text || "";
      } else if (selectedProvider === "grok") {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      }

      // Parse JSON from response
      try {
        // Extract JSON from the response (handle markdown code blocks)
        let jsonStr = generatedText;
        const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        
        const parsed = JSON.parse(jsonStr);
        res.json({ 
          prologue: parsed.prologue || "",
          startingSituation: parsed.startingSituation || ""
        });
      } catch (parseError) {
        // If JSON parsing fails, try to extract content another way
        res.json({ 
          prologue: generatedText,
          startingSituation: ""
        });
      }
    } catch (error: any) {
      console.error("AI prologue generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate prologue" });
    }
  });

  // ==================== AI CHAT API ====================

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { sessionId, userMessage } = req.body;
      
      // Get session data
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Get story data
      const story = await storage.getStory(session.storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      // Get conversation history
      const messages = await storage.getMessagesBySession(sessionId);
      
      // Format recent messages (최대 20개, 오래된 순서부터)
      const recentMessages = messages.slice(-20).map(msg => {
        const role = msg.role === 'user' ? '사용자' : 'AI';
        return `${role}: ${msg.content}`;
      }).join('\n\n');
      
      // Use session-specific provider/model if set, otherwise use global settings
      const providers = ["gemini", "chatgpt", "claude", "grok"];
      let selectedProvider = session.sessionProvider || "";
      let selectedModel = session.sessionModel || "";
      let apiKey = "";
      
      if (selectedProvider) {
        // Use session-specific provider
        const apiKeySetting = await storage.getSetting(`apiKey_${selectedProvider}`);
        if (!apiKeySetting || !apiKeySetting.value) {
          return res.status(400).json({ error: `API key for ${selectedProvider} not configured.` });
        }
        apiKey = apiKeySetting.value;
      } else {
        // Auto-select: find first provider with API key
        for (const p of providers) {
          const apiKeySetting = await storage.getSetting(`apiKey_${p}`);
          if (apiKeySetting && apiKeySetting.value) {
            apiKey = apiKeySetting.value;
            selectedProvider = p;
            break;
          }
        }
        
        if (!apiKey) {
          return res.status(400).json({ error: "No AI API key configured." });
        }
      }
      
      // Get default model if not specified in session
      if (!selectedModel) {
        const modelSetting = await storage.getSetting(`aiModel_${selectedProvider}`);
        const defaultModels: Record<string, string> = {
          gemini: "gemini-2.0-flash",
          chatgpt: "gpt-4o",
          claude: "claude-3-5-sonnet-20241022",
          grok: "grok-beta"
        };
        selectedModel = modelSetting?.value || defaultModels[selectedProvider] || "";
      }
      
      // Build system prompt from AI persona settings (commonPrompt) with variable substitution
      const commonPromptSetting = await storage.getSetting("commonPrompt");
      let systemPrompt = commonPromptSetting?.value || `당신은 스토리텔링 AI입니다.

## 스토리 기본 정보
제목: {title}
장르: {genre}
소개: {description}

## 스토리 설정
{storySettings}

## 시작 상황
{startingSituation}

## 전개 예시
사용자: {exampleUserInput}
AI: {exampleAiResponse}

## 대화 프로필
{conversationProfile}

## 유저 노트
{userNote}

## 요약 메모리
{summaryMemory}

## 최근 대화 기록
{recentMessages}

당신은 위 스토리 세계관의 등장인물로서 사용자와 상호작용합니다. 최근 대화 기록을 참고하여 맥락에 맞는 생생하고 몰입감 있는 서술과 대화를 제공하세요. 한국어로 응답하세요.`;

      // Replace all variables with actual values
      systemPrompt = systemPrompt
        .replace(/\{title\}/g, story.title || "")
        .replace(/\{description\}/g, story.description || "")
        .replace(/\{genre\}/g, story.genre || "")
        .replace(/\{storySettings\}/g, story.storySettings || "")
        .replace(/\{startingSituation\}/g, story.startingSituation || "")
        .replace(/\{promptTemplate\}/g, story.promptTemplate || "")
        .replace(/\{exampleUserInput\}/g, story.exampleUserInput || "")
        .replace(/\{exampleAiResponse\}/g, story.exampleAiResponse || "")
        .replace(/\{conversationProfile\}/g, session.conversationProfile || "")
        .replace(/\{userNote\}/g, session.userNote || "")
        .replace(/\{summaryMemory\}/g, session.summaryMemory || "")
        .replace(/\{userMessage\}/g, userMessage || "")
        .replace(/\{recentMessages\}/g, recentMessages || "");

      let generatedText = "";

      // Build conversation history for API
      const conversationHistory = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));
      conversationHistory.push({ role: "user", content: userMessage });

      if (selectedProvider === "gemini") {
        const geminiContents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "알겠습니다. 해당 스토리 세계관에 맞게 응답하겠습니다." }] },
          ...conversationHistory.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }))
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: { temperature: 0.9, maxOutputTokens: 2048 }
            })
          }
        );
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (selectedProvider === "chatgpt") {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory
            ],
            temperature: 0.9,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      } else if (selectedProvider === "claude") {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 2048,
            system: systemPrompt,
            messages: conversationHistory
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.content?.[0]?.text || "";
      } else if (selectedProvider === "grok") {
        const response = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory
            ],
            temperature: 0.9,
            max_tokens: 2048
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      }

      res.json({ response: generatedText, provider: selectedProvider, model: selectedModel });
    } catch (error: any) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });

  // ==================== MESSAGES API ====================

  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const msgs = await storage.getMessagesBySession(sessionId);
      res.json(msgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const messageData = { ...req.body, sessionId };
      const parsed = insertMessageSchema.safeParse(messageData);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid message data", details: parsed.error });
      }

      const message = await storage.createMessage(parsed.data);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.delete("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      await storage.deleteMessagesBySession(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete messages" });
    }
  });

  return httpServer;
}
