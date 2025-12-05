import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertStorySchema, insertSessionSchema, insertMessageSchema, loginSchema, registerSchema, updateProfileSchema, changePasswordSchema, updateApiKeysSchema, updateConversationProfilesSchema, type SafeUser, type ConversationProfile } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import MemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const SessionStore = MemoryStore(session);

function excludePassword(user: any): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function getUserApiKeyForProvider(userId: number | undefined, provider: string): Promise<string | null> {
  if (userId) {
    const apiKeys = await storage.getUserApiKeys(userId);
    if (apiKeys) {
      const keyField = `apiKey${provider.charAt(0).toUpperCase() + provider.slice(1)}` as keyof typeof apiKeys;
      if (apiKeys[keyField]) {
        return apiKeys[keyField] as string;
      }
    }
  }
  const globalSetting = await storage.getSetting(`apiKey_${provider}`);
  return globalSetting?.value || null;
}

async function getUserModelForProvider(userId: number | undefined, provider: string): Promise<string> {
  const defaultModels: Record<string, string> = {
    gemini: "gemini-2.0-flash",
    chatgpt: "gpt-4o",
    claude: "claude-3-5-sonnet-20241022",
    grok: "grok-beta"
  };
  
  if (userId) {
    const apiKeys = await storage.getUserApiKeys(userId);
    if (apiKeys) {
      const modelField = `aiModel${provider.charAt(0).toUpperCase() + provider.slice(1)}` as keyof typeof apiKeys;
      if (apiKeys[modelField]) {
        return apiKeys[modelField] as string;
      }
    }
  }
  const globalSetting = await storage.getSetting(`aiModel_${provider}`);
  return globalSetting?.value || defaultModels[provider] || "";
}

async function findAvailableProvider(userId: number | undefined): Promise<{ provider: string; apiKey: string } | null> {
  const providers = ["gemini", "chatgpt", "claude", "grok"];
  for (const p of providers) {
    const apiKey = await getUserApiKeyForProvider(userId, p);
    if (apiKey) {
      return { provider: p, apiKey };
    }
  }
  return null;
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ error: "로그인이 필요합니다" });
  }
}

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
  
  // ==================== SESSION SETUP ====================
  // Trust proxy for Replit's reverse proxy environment
  app.set("trust proxy", 1);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "ai-story-game-secret-key-2024",
    store: new SessionStore({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    }
  }));

  // ==================== AUTH API ====================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { username, email, password, displayName } = parsed.data;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "이미 사용 중인 사용자명입니다" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
        }
      }

      const user = await storage.createUser({
        username,
        email: email || null,
        password,
        displayName: displayName || username,
      });

      req.session.userId = user.id;
      res.status(201).json(excludePassword(user));
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: "회원가입에 실패했습니다" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { username, password } = parsed.data;

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "사용자명 또는 비밀번호가 올바르지 않습니다" });
      }

      const isValid = storage.validatePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "사용자명 또는 비밀번호가 올바르지 않습니다" });
      }

      req.session.userId = user.id;
      res.json(excludePassword(user));
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "로그인에 실패했습니다" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "로그아웃에 실패했습니다" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "로그아웃되었습니다" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "사용자를 찾을 수 없습니다" });
      }

      res.json(excludePassword(user));
    } catch (error) {
      res.status(500).json({ error: "사용자 정보를 가져오는데 실패했습니다" });
    }
  });

  app.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { displayName, email, profileImage } = parsed.data;
      const userId = req.session.userId!;

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ error: "이미 사용 중인 이메일입니다" });
        }
      }

      const user = await storage.updateUser(userId, {
        displayName,
        email: email || null,
        profileImage,
      });

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      res.json(excludePassword(user));
    } catch (error) {
      res.status(500).json({ error: "프로필 업데이트에 실패했습니다" });
    }
  });

  app.put("/api/auth/password", isAuthenticated, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const { currentPassword, newPassword } = parsed.data;
      const userId = req.session.userId!;

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const isValid = storage.validatePassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다" });
      }

      await storage.updateUser(userId, { password: newPassword });
      res.json({ message: "비밀번호가 변경되었습니다" });
    } catch (error) {
      res.status(500).json({ error: "비밀번호 변경에 실패했습니다" });
    }
  });

  app.delete("/api/auth/account", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      req.session.destroy(() => {});
      res.clearCookie("connect.sid");
      res.json({ message: "계정이 삭제되었습니다" });
    } catch (error) {
      res.status(500).json({ error: "계정 삭제에 실패했습니다" });
    }
  });

  // ==================== USER API KEYS API ====================

  app.get("/api/auth/api-keys", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const apiKeys = await storage.getUserApiKeys(userId);
      
      if (!apiKeys) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ error: "API 키를 가져오는데 실패했습니다" });
    }
  });

  app.put("/api/auth/api-keys", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateApiKeysSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const userId = req.session.userId!;
      const user = await storage.updateUserApiKeys(userId, parsed.data);
      
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const apiKeys = await storage.getUserApiKeys(userId);
      res.json(apiKeys);
    } catch (error) {
      res.status(500).json({ error: "API 키 업데이트에 실패했습니다" });
    }
  });

  // Conversation Profiles API
  app.get("/api/auth/conversation-profiles", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profiles = await storage.getUserConversationProfiles(userId);
      res.json({ profiles });
    } catch (error) {
      res.status(500).json({ error: "대화 프로필을 가져오는데 실패했습니다" });
    }
  });

  app.put("/api/auth/conversation-profiles", isAuthenticated, async (req, res) => {
    try {
      const parsed = updateConversationProfilesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const userId = req.session.userId!;
      await storage.updateUserConversationProfiles(userId, parsed.data.profiles);
      
      const profiles = await storage.getUserConversationProfiles(userId);
      res.json({ profiles });
    } catch (error) {
      res.status(500).json({ error: "대화 프로필 업데이트에 실패했습니다" });
    }
  });

  app.post("/api/ai/models/:provider", isAuthenticated, async (req, res) => {
    try {
      const { provider } = req.params;
      const { apiKey: providedApiKey } = req.body;
      const userId = req.session.userId!;
      
      const validProviders = ["gemini", "chatgpt", "claude", "grok"];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: "지원하지 않는 제공자입니다" });
      }
      
      let apiKey = providedApiKey;
      if (!apiKey) {
        apiKey = await getUserApiKeyForProvider(userId, provider);
      }
      
      if (!apiKey) {
        return res.status(400).json({ error: "API 키를 먼저 입력해주세요" });
      }

      let models: { id: string; name: string }[] = [];

      if (provider === "gemini") {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );
        const data = await response.json();
        
        if (data.error) {
          return res.status(400).json({ error: "Gemini API 키가 유효하지 않습니다" });
        }

        models = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => ({
            id: m.name.replace("models/", ""),
            name: m.displayName || m.name.replace("models/", "")
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
      } else if (provider === "chatgpt") {
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
        const data = await response.json();
        
        if (data.error) {
          return res.status(400).json({ error: "OpenAI API 키가 유효하지 않습니다" });
        }

        models = (data.data || [])
          .filter((m: any) => m.id.startsWith("gpt-") && !m.id.includes("instruct"))
          .map((m: any) => ({
            id: m.id,
            name: m.id.toUpperCase().replace(/-/g, " ").replace(/GPT /g, "GPT-")
          }))
          .sort((a: any, b: any) => {
            const order = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4"];
            const aIndex = order.findIndex(o => a.id.startsWith(o));
            const bIndex = order.findIndex(o => b.id.startsWith(o));
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.name.localeCompare(b.name);
          });
      } else if (provider === "claude") {
        models = [
          { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
          { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
          { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
          { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
        ];
      } else if (provider === "grok") {
        const response = await fetch("https://api.x.ai/v1/models", {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          models = (data.data || []).map((m: any) => ({
            id: m.id,
            name: m.id.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          }));
        } else {
          models = [
            { id: "grok-beta", name: "Grok Beta" },
            { id: "grok-2-1212", name: "Grok 2" },
          ];
        }
      } else {
        return res.status(400).json({ error: "지원하지 않는 제공자입니다" });
      }

      res.json({ models });
    } catch (error: any) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "모델 목록을 가져오는데 실패했습니다" });
    }
  });

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

      const setting = await storage.setSetting({ key, value });
      res.json(setting);
    } catch (error) {
      console.error("Failed to save setting:", error);
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
          const setting = await storage.setSetting({ key, value });
          results.push(setting);
        }
      }
      res.json(results);
    } catch (error) {
      console.error("Failed to save settings:", error);
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

  app.get("/api/stories/:storyId/sessions", isAuthenticated, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const userId = req.session.userId!;
      const sessions = await storage.getSessionsByStory(storyId, userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.post("/api/stories/:storyId/sessions", isAuthenticated, async (req, res) => {
    try {
      const storyId = parseInt(req.params.storyId);
      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid story ID" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const userId = req.session.userId!;

      // Get default provider and model from settings
      const providerSetting = await storage.getSetting("aiProvider");
      const defaultProvider = providerSetting?.value || "gemini";
      
      const defaultModels: Record<string, string> = {
        gemini: "gemini-2.0-flash",
        chatgpt: "gpt-4o",
        claude: "claude-3-5-sonnet-20241022",
        grok: "grok-beta"
      };
      
      const modelSetting = await storage.getSetting(`aiModel_${defaultProvider}`);
      const defaultModel = modelSetting?.value || defaultModels[defaultProvider] || "";

      const parsed = insertSessionSchema.safeParse({
        ...req.body,
        storyId,
        userId,
        sessionProvider: req.body.sessionProvider || defaultProvider,
        sessionModel: req.body.sessionModel || defaultModel
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

  app.get("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const session = await storage.getSession(id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Verify user owns this session
      if (session.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.put("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const existingSession = await storage.getSession(id);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Verify user owns this session
      if (existingSession.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Prevent changing userId, storyId, and other immutable fields
      const { userId, storyId, createdAt, ...updateData } = req.body;
      
      const session = await storage.updateSession(id, updateData);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const existingSession = await storage.getSession(id);
      if (!existingSession) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Verify user owns this session
      if (existingSession.userId !== req.session.userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const deleted = await storage.deleteSession(id);
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
      const userId = req.session?.userId;
      
      let selectedProvider = requestedProvider;
      let apiKey = "";
      
      if (requestedProvider && requestedProvider !== "auto") {
        apiKey = await getUserApiKeyForProvider(userId, requestedProvider) || "";
        if (!apiKey) {
          return res.status(400).json({ error: `${requestedProvider} API 키가 설정되지 않았습니다. 계정 관리에서 API 키를 설정해주세요.` });
        }
        selectedProvider = requestedProvider;
      } else {
        const available = await findAvailableProvider(userId);
        if (!available) {
          return res.status(400).json({ error: "설정된 AI API 키가 없습니다. 계정 관리에서 API 키를 설정해주세요." });
        }
        selectedProvider = available.provider;
        apiKey = available.apiKey;
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
      const selectedModel = await getUserModelForProvider(userId, selectedProvider);

      if (selectedProvider === "gemini") {
        // Apply thinking config based on model version
        const isGemini3Model = selectedModel.includes("gemini-3");
        const isGemini25Model = selectedModel.includes("gemini-2.5");
        const generationConfig: Record<string, any> = { 
          temperature: 0.8, 
          maxOutputTokens: 8192
        };
        if (isGemini3Model) {
          generationConfig.thinkingConfig = { thinkingLevel: "low" };
        } else if (isGemini25Model) {
          generationConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig
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
            max_tokens: 8192
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
            max_tokens: 8192,
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
            max_tokens: 8192
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
      const userId = req.session?.userId;
      
      let selectedProvider = requestedProvider;
      let apiKey = "";
      
      if (requestedProvider && requestedProvider !== "auto") {
        apiKey = await getUserApiKeyForProvider(userId, requestedProvider) || "";
        if (!apiKey) {
          return res.status(400).json({ error: `${requestedProvider} API 키가 설정되지 않았습니다.` });
        }
        selectedProvider = requestedProvider;
      } else {
        const available = await findAvailableProvider(userId);
        if (!available) {
          return res.status(400).json({ error: "설정된 AI API 키가 없습니다." });
        }
        selectedProvider = available.provider;
        apiKey = available.apiKey;
      }
      
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

      const selectedModel = await getUserModelForProvider(userId, selectedProvider);

      let generatedText = "";

      if (selectedProvider === "gemini") {
        // Apply thinking config based on model version
        const isGemini3Model = selectedModel.includes("gemini-3");
        const isGemini25Model = selectedModel.includes("gemini-2.5");
        const generationConfig: Record<string, any> = { 
          temperature: 0.8, 
          maxOutputTokens: 8192
        };
        if (isGemini3Model) {
          generationConfig.thinkingConfig = { thinkingLevel: "low" };
        } else if (isGemini25Model) {
          generationConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig
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
            max_tokens: 8192
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
            max_tokens: 8192,
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
            max_tokens: 8192
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
      const userId = req.session?.userId;
      
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const story = await storage.getStory(session.storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const messages = await storage.getMessagesBySession(sessionId);
      
      const recentMessages = messages.slice(-20).map(msg => {
        const role = msg.role === 'user' ? '사용자' : 'AI';
        return `${role}: ${msg.content}`;
      }).join('\n\n');
      
      let selectedProvider = session.sessionProvider || "";
      let selectedModel = session.sessionModel || "";
      let apiKey = "";
      
      if (selectedProvider) {
        apiKey = await getUserApiKeyForProvider(userId, selectedProvider) || "";
        if (!apiKey) {
          return res.status(400).json({ error: `${selectedProvider} API 키가 설정되지 않았습니다. 계정 관리에서 API 키를 설정해주세요.` });
        }
      } else {
        const available = await findAvailableProvider(userId);
        if (!available) {
          return res.status(400).json({ error: "설정된 AI API 키가 없습니다. 계정 관리에서 API 키를 설정해주세요." });
        }
        selectedProvider = available.provider;
        apiKey = available.apiKey;
      }
      
      if (!selectedModel) {
        selectedModel = await getUserModelForProvider(userId, selectedProvider);
      }
      
      // Build system prompt from AI persona settings (commonPrompt) with variable substitution
      const commonPromptSetting = await storage.getSetting("commonPrompt");
      let systemPrompt = commonPromptSetting?.value || `당신은 경험 많은 판타지 소설가입니다.
유저가 입력한 "유저 메시지"를 바탕으로 현재세계관과 설정, 현재 이야기 흐름에 맞춰 다음 이야기를 만들어주세요.

길이는 최소 1000자 이상 출력해야합니다.

## 스토리 정보
제목: {title}
장르: {genre}
소개: {description}

## 세계관 설정
{storySettings}

## 시작 상황
{startingSituation}

## 대화 프로필
{conversationProfile}

## 유저 노트
{userNote}

## 요약 메모리
{summaryMemory}

## 최근 대화 기록
{recentMessages}

## 유저 메시지
{userMessage}

생생하고 몰입감 있는 서술과 대화를 제공하세요. 한국어로 응답하세요.

-------
output:

{
  "nextStrory": "여기에 다음이야기 내용을 작성하세요."
}

nextStrory 구성:
- 배경설명: <Narration>내용</Narration>
- 캐릭터대화: <CharacterDialogue>캐릭터명 | "대사"</CharacterDialogue>

추가 설명이나 AI 서술 없이 정확히 JSON 구조로, 오직 'nextStrory' 항목만 포함해 주세요.

출력예시:
{
  "nextStrory": "<Narration>\\n록시는 가슴을 쫙 펴고 당당하게 외쳤다.\\n</Narration>\\n<CharacterDialogue>\\n리나 | \\"잠깐, 록시. 그렇게 단순한 문제가 아니야.\\"\\n</CharacterDialogue>\\n<Narration>\\n록시는 리나를 바라보며 고개를 갸우뚱한다.\\n</Narration>\\n<CharacterDialogue>\\n록시 | \\"무슨문제?\\"\\n</CharacterDialogue>"
}`;

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

      // Log the prompt for debugging
      console.log("\n========== AI 채팅 프롬프트 ==========");
      console.log("Provider:", selectedProvider);
      console.log("Model:", selectedModel);
      console.log("\n----- 시스템 프롬프트 -----");
      console.log(systemPrompt);
      console.log("\n----- 사용자 메시지 -----");
      console.log(userMessage);
      console.log("=====================================\n");

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

        // Apply thinking config based on model version
        const isGemini3Model = selectedModel.includes("gemini-3");
        const isGemini25Model = selectedModel.includes("gemini-2.5");
        const generationConfig: Record<string, any> = { 
          temperature: 0.9, 
          maxOutputTokens: 65536
        };
        
        if (isGemini3Model) {
          generationConfig.thinkingConfig = { thinkingLevel: "low" };
        } else if (isGemini25Model) {
          generationConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig
            })
          }
        );
        const data = await response.json();
        console.log("Gemini API Response:", JSON.stringify(data, null, 2));
        
        if (data.error) {
          console.error("Gemini API Error:", data.error);
          return res.status(400).json({ error: data.error.message });
        }
        if (!response.ok) {
          console.error("Gemini API HTTP Error:", response.status, data);
          return res.status(400).json({ error: `Gemini API error: ${response.status}` });
        }
        
        // Check if content is empty
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          const finishReason = candidate?.finishReason || "UNKNOWN";
          console.error("Gemini API returned empty content. Finish reason:", finishReason);
          
          if (finishReason === "MAX_TOKENS") {
            return res.status(400).json({ 
              error: "AI 응답이 너무 길어서 생성되지 못했습니다. 모델을 변경하거나 프롬프트를 단순화해주세요." 
            });
          }
          
          return res.status(400).json({ 
            error: `AI가 응답을 생성하지 못했습니다 (이유: ${finishReason}). 다른 모델을 시도해보세요.` 
          });
        }
        
        generatedText = candidate.content.parts[0]?.text || "";
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
            max_tokens: 8192
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
            max_tokens: 8192,
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
            max_tokens: 8192
          })
        });
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        generatedText = data.choices?.[0]?.message?.content || "";
      }

      // Try to parse JSON response if it looks like JSON
      let finalResponse = generatedText;
      try {
        // Remove markdown code blocks if present
        let cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Try to parse as JSON
        if (cleanedText.startsWith('{') && cleanedText.includes('nextStrory')) {
          // Extract only the nextStrory field value using regex
          // This is more robust than trying to fix the entire JSON
          const nextStroryMatch = cleanedText.match(/"nextStrory"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          
          if (nextStroryMatch && nextStroryMatch[1]) {
            // Extract the nextStrory value and unescape it
            finalResponse = nextStroryMatch[1]
              .replace(/\\n/g, '\n')  // Convert \n to actual newlines
              .replace(/\\"/g, '"')   // Convert \" to "
              .replace(/\\'/g, "'")   // Convert \' to '
              .replace(/&lt;/g, '<')  // Convert &lt; to <
              .replace(/&gt;/g, '>'); // Convert &gt; to >
            console.log("Extracted nextStrory field using regex");
          } else {
            // Fallback: Try to parse the entire JSON
            const parsed = JSON.parse(cleanedText);
            if (parsed.nextStrory) {
              finalResponse = parsed.nextStrory
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
              console.log("Parsed JSON response successfully");
            }
          }
        }
      } catch (parseError) {
        // If parsing fails, use the original text
        console.log("Response is not JSON, using raw text:", parseError);
      }

      res.json({ response: finalResponse, provider: selectedProvider, model: selectedModel });
    } catch (error: any) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });

  // ==================== AI CHAT STREAMING API ====================

  app.post("/api/ai/chat/stream", async (req, res) => {
    try {
      const { sessionId, userMessage, storyId } = req.body;
      const userId = req.session?.userId;

      if (!sessionId || !userMessage || !storyId) {
        return res.status(400).json({ error: "sessionId, userMessage, and storyId are required" });
      }

      const story = await storage.getStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Story not found" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      let selectedProvider = session.sessionProvider || "";
      let selectedModel = session.sessionModel || "";
      let apiKey = "";

      if (selectedProvider) {
        apiKey = await getUserApiKeyForProvider(userId, selectedProvider) || "";
        if (!apiKey) {
          return res.status(400).json({ error: `${selectedProvider} API 키가 설정되지 않았습니다. 계정 관리에서 API 키를 설정해주세요.` });
        }
      } else {
        const available = await findAvailableProvider(userId);
        if (!available) {
          return res.status(400).json({ error: "설정된 AI API 키가 없습니다. 계정 관리에서 API 키를 설정해주세요." });
        }
        selectedProvider = available.provider;
        apiKey = available.apiKey;
      }

      if (!selectedModel) {
        selectedModel = await getUserModelForProvider(userId, selectedProvider);
      }

      // Get messages for context
      const messages = await storage.getMessagesBySession(sessionId);

      // Get common prompt template
      const commonPromptSetting = await storage.getSetting("commonPrompt");
      let systemPrompt = commonPromptSetting?.value || `당신은 경험 많은 스토리텔러입니다. 다음 스토리를 이어서 작성해주세요.`;

      // Build recent messages string (최대 20개)
      const recentMessages = messages.slice(-20).map(m => 
        `${m.role === 'user' ? '유저' : 'AI'}: ${m.content}`
      ).join('\n\n');

      // Replace all variables
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

      // Build conversation history (최대 20개로 제한하여 토큰 절약)
      const recentMessagesForApi = messages.slice(-20);
      const conversationHistory = recentMessagesForApi.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }));
      conversationHistory.push({ role: "user", content: userMessage });

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      console.log("\n╔════════════════════════════════════════════════════════════");
      console.log("║ 📤 AI 요청 시작");
      console.log("╠════════════════════════════════════════════════════════════");
      console.log("║ Provider:", selectedProvider);
      console.log("║ Model:", selectedModel);
      console.log("║ Session ID:", sessionId);
      console.log("║ 대화 기록 개수:", conversationHistory.length, "개 (최근 20개)");
      console.log("╠════════════════════════════════════════════════════════════");
      console.log("║ 💬 사용자 메시지:");
      console.log("║", userMessage.replace(/\n/g, "\n║ "));
      console.log("╠════════════════════════════════════════════════════════════");
      console.log("║ 📋 시스템 프롬프트 전문:");
      console.log("║", systemPrompt.replace(/\n/g, "\n║ "));
      console.log("╠════════════════════════════════════════════════════════════");
      console.log("║ 📚 대화 기록 (최근", conversationHistory.length - 1, "개):");
      conversationHistory.slice(0, -1).forEach((msg, idx) => {
        console.log("║ ---", idx + 1, "---");
        console.log("║ Role:", msg.role);
        console.log("║", msg.content.substring(0, 150).replace(/\n/g, "\n║ ") + (msg.content.length > 150 ? "..." : ""));
      });
      console.log("╚════════════════════════════════════════════════════════════\n");

      if (selectedProvider === "gemini") {
        const geminiContents = [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "알겠습니다. 해당 스토리 세계관에 맞게 응답하겠습니다." }] },
          ...conversationHistory.map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }]
          }))
        ];

        const isGemini3Model = selectedModel.includes("gemini-3");
        const isGemini25Model = selectedModel.includes("gemini-2.5");
        const generationConfig: Record<string, any> = { 
          temperature: 0.9, 
          maxOutputTokens: 65536
        };
        
        // Apply thinking config based on model version
        if (isGemini3Model) {
          // Gemini 3 uses thinkingLevel: "low" or "high"
          generationConfig.thinkingConfig = { thinkingLevel: "low" };
        } else if (isGemini25Model) {
          // Gemini 2.5 uses thinkingBudget: 0 (disabled), 1024 (low), 8192 (high), -1 (dynamic)
          generationConfig.thinkingConfig = { thinkingBudget: 1024 };
        }

        // Use streaming endpoint
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Gemini Stream Error:", errorData);
          res.write(`data: ${JSON.stringify({ error: errorData.error?.message || "Streaming failed" })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          res.write(`data: ${JSON.stringify({ error: "Failed to get stream reader" })}\n\n`);
          res.end();
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const data = JSON.parse(jsonStr);
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (text) {
                      fullText += text;
                      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                    }
                  } catch (parseErr) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
        }

        // Send final message with full text
        res.write(`data: ${JSON.stringify({ text: "", done: true, fullText })}\n\n`);
        res.end();

        console.log("\n╔════════════════════════════════════════════════════════════");
        console.log("║ ✅ AI 응답 완료 (Gemini)");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 응답 길이:", fullText.length, "자");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 📝 AI 응답 전문:");
        console.log("║", fullText.replace(/\n/g, "\n║ "));
        console.log("╚════════════════════════════════════════════════════════════\n");

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
            max_tokens: 8192,
            stream: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          res.write(`data: ${JSON.stringify({ error: errorData.error?.message || "Streaming failed" })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          res.write(`data: ${JSON.stringify({ error: "Failed to get stream reader" })}\n\n`);
          res.end();
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const data = JSON.parse(jsonStr);
                    const text = data.choices?.[0]?.delta?.content || "";
                    if (text) {
                      fullText += text;
                      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                    }
                  } catch (parseErr) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
        }

        res.write(`data: ${JSON.stringify({ text: "", done: true, fullText })}\n\n`);
        res.end();

        console.log("\n╔════════════════════════════════════════════════════════════");
        console.log("║ ✅ AI 응답 완료 (ChatGPT)");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 응답 길이:", fullText.length, "자");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 📝 AI 응답 전문:");
        console.log("║", fullText.replace(/\n/g, "\n║ "));
        console.log("╚════════════════════════════════════════════════════════════\n");

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
            max_tokens: 8192,
            system: systemPrompt,
            messages: conversationHistory,
            stream: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          res.write(`data: ${JSON.stringify({ error: errorData.error?.message || "Streaming failed" })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          res.write(`data: ${JSON.stringify({ error: "Failed to get stream reader" })}\n\n`);
          res.end();
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  try {
                    const data = JSON.parse(jsonStr);
                    if (data.type === 'content_block_delta' && data.delta?.text) {
                      const text = data.delta.text;
                      fullText += text;
                      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                    }
                  } catch (parseErr) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
        }

        res.write(`data: ${JSON.stringify({ text: "", done: true, fullText })}\n\n`);
        res.end();

        console.log("\n╔════════════════════════════════════════════════════════════");
        console.log("║ ✅ AI 응답 완료 (Claude)");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 응답 길이:", fullText.length, "자");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 📝 AI 응답 전문:");
        console.log("║", fullText.replace(/\n/g, "\n║ "));
        console.log("╚════════════════════════════════════════════════════════════\n");

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
            max_tokens: 8192,
            stream: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          res.write(`data: ${JSON.stringify({ error: errorData.error?.message || "Streaming failed" })}\n\n`);
          res.end();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          res.write(`data: ${JSON.stringify({ error: "Failed to get stream reader" })}\n\n`);
          res.end();
          return;
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const data = JSON.parse(jsonStr);
                    const text = data.choices?.[0]?.delta?.content || "";
                    if (text) {
                      fullText += text;
                      res.write(`data: ${JSON.stringify({ text, done: false })}\n\n`);
                    }
                  } catch (parseErr) {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }
        } catch (streamErr) {
          console.error("Stream reading error:", streamErr);
        }

        res.write(`data: ${JSON.stringify({ text: "", done: true, fullText })}\n\n`);
        res.end();

        console.log("\n╔════════════════════════════════════════════════════════════");
        console.log("║ ✅ AI 응답 완료 (Grok)");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 응답 길이:", fullText.length, "자");
        console.log("╠════════════════════════════════════════════════════════════");
        console.log("║ 📝 AI 응답 전문:");
        console.log("║", fullText.replace(/\n/g, "\n║ "));
        console.log("╚════════════════════════════════════════════════════════════\n");

      } else {
        // Fallback for unknown providers
        res.write(`data: ${JSON.stringify({ error: "지원하지 않는 AI 프로바이더입니다." })}\n\n`);
        res.end();
      }

    } catch (error: any) {
      console.error("AI streaming error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Streaming failed" })}\n\n`);
      res.end();
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
      console.log(`[MESSAGE-SAVE] Received message for session ${sessionId}, role: ${req.body.role}`);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const messageData = { ...req.body, sessionId };
      const parsed = insertMessageSchema.safeParse(messageData);
      if (!parsed.success) {
        console.error(`[MESSAGE-SAVE] Parse error:`, parsed.error);
        return res.status(400).json({ error: "Invalid message data", details: parsed.error });
      }

      const message = await storage.createMessage(parsed.data);
      console.log(`[MESSAGE-SAVE] Message created with id ${message.id}, role: ${message.role}`);
      
      // Auto-summary logic runs in background (don't block response)
      if (message.role === "assistant") {
        console.log(`[AUTO-SUMMARY] Starting background task for session ${sessionId}`);
        (async () => {
          try {
            const newCount = await storage.incrementAIMessageCount(sessionId);
            console.log(`[AUTO-SUMMARY] AI message count incremented to ${newCount} for session ${sessionId}`);
            
            if (newCount > 0 && newCount % 20 === 0) {
              console.log(`[AUTO-SUMMARY] Triggering summary generation at turn ${newCount}`);
              const session = await storage.getSession(sessionId);
              if (!session) throw new Error("Session not found");
              
              const recentMessages = await storage.getRecentAIMessages(sessionId, 20);
              console.log(`[AUTO-SUMMARY] Got ${recentMessages.length} recent messages`);
              
              const summaryProvider = session.sessionProvider || "gemini";
              const summaryModel = session.sessionModel || "gemini-2.0-flash";
              console.log(`[AUTO-SUMMARY] Using provider: ${summaryProvider}, model: ${summaryModel}`);
              
              const apiKey = await getUserApiKeyForProvider(session.userId, summaryProvider);
              
              if (!apiKey) {
                console.error(`[AUTO-SUMMARY] No API key found for provider ${summaryProvider}, skipping`);
                return;
              }
              
              console.log(`[AUTO-SUMMARY] Calling generateSummary...`);
              const { generateSummary } = await import("./summary-helper");
              const result = await generateSummary({
                messages: recentMessages,
                existingSummary: session.summaryMemory,
                existingPlotPoints: session.keyPlotPoints,
                provider: summaryProvider,
                model: summaryModel,
                apiKey
              });
              
              console.log(`[AUTO-SUMMARY] Generated summary length: ${result.summary.length}, plot points: ${result.keyPlotPoints.length}`);
              console.log(`[AUTO-SUMMARY] Plot points: ${JSON.stringify(result.keyPlotPoints)}`);
              
              await storage.updateSession(sessionId, {
                summaryMemory: result.summary,
                keyPlotPoints: JSON.stringify(result.keyPlotPoints),
                lastSummaryTurn: newCount
              });
              
              console.log(`[AUTO-SUMMARY] Successfully saved to database for session ${sessionId}`);
            }
          } catch (summaryError: any) {
            console.error("[AUTO-SUMMARY] Failed:", summaryError?.message || summaryError);
            console.error("[AUTO-SUMMARY] Stack:", summaryError?.stack);
          }
        })();
      }
      
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

  // ==================== HEALTH CHECK ====================
  
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
