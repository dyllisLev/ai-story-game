import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStorySchema, insertMessageSchema } from "@shared/schema";
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

  // ==================== MESSAGES API ====================

  app.get("/api/stories/:storyId/messages", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const msgs = await storage.getMessagesByStory(storyId);
      res.json(msgs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/stories/:storyId/messages", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const messageData = { ...req.body, storyId };
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

  app.delete("/api/stories/:storyId/messages", async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      await storage.deleteMessagesByStory(storyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete messages" });
    }
  });

  return httpServer;
}
