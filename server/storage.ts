import { sql, eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { settings, stories, sessions, messages, users } from "@shared/schema";
import { 
  type InsertSetting, type Setting,
  type InsertStory, type Story,
  type InsertSession, type Session,
  type InsertMessage, type Message,
  type InsertUser, type User, type SafeUser, type UserApiKeys, type ConversationProfile
} from "@shared/schema";
import crypto from "crypto";

let db: ReturnType<typeof drizzle>;
let pool: Pool;

function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool);
    
    console.log("✓ Connected to Supabase PostgreSQL database");
  }
  return db;
}

export interface IStorage {
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
  
  getStory(id: number): Promise<Story | undefined>;
  getAllStories(): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story>;
  deleteStory(id: number): Promise<void>;
  
  getSession(id: number): Promise<Session | undefined>;
  getSessionsByStory(storyId: number, userId: number): Promise<Session[]>;
  getUserSessions(userId: number): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBySession(sessionId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  deleteAllSessionMessages(sessionId: number): Promise<void>;
  
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User>;
  updateUserApiKeys(userId: number, apiKeys: Partial<UserApiKeys>): Promise<User>;
  getUserApiKeys(userId: number): Promise<UserApiKeys | null>;
  updateUserConversationProfiles(userId: number, profiles: ConversationProfile[]): Promise<User>;
  getUserConversationProfiles(userId: number): Promise<ConversationProfile[]>;
}

export class Storage implements IStorage {
  async getSetting(key: string): Promise<Setting | undefined> {
    const db = getDb();
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0];
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const db = getDb();
    const existing = await this.getSetting(setting.key);
    
    if (existing) {
      const updated = await db
        .update(settings)
        .set({ value: setting.value })
        .where(eq(settings.key, setting.key))
        .returning();
      return updated[0];
    }
    
    const inserted = await db.insert(settings).values(setting).returning();
    return inserted[0];
  }

  async getAllSettings(): Promise<Setting[]> {
    const db = getDb();
    return db.select().from(settings);
  }

  async getStory(id: number): Promise<Story | undefined> {
    const db = getDb();
    const result = await db.select().from(stories).where(eq(stories.id, id)).limit(1);
    return result[0];
  }

  async getAllStories(): Promise<Story[]> {
    const db = getDb();
    return db.select().from(stories).orderBy(sql`${stories.createdAt} DESC`);
  }

  async createStory(story: InsertStory): Promise<Story> {
    const db = getDb();
    const inserted = await db.insert(stories).values(story).returning();
    return inserted[0];
  }

  async updateStory(id: number, story: Partial<InsertStory>): Promise<Story> {
    const db = getDb();
    const updated = await db
      .update(stories)
      .set({ ...story, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return updated[0];
  }

  async deleteStory(id: number): Promise<void> {
    const db = getDb();
    await db.delete(stories).where(eq(stories.id, id));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const db = getDb();
    const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return result[0];
  }

  async getSessionsByStory(storyId: number, userId: number): Promise<Session[]> {
    const db = getDb();
    return db
      .select()
      .from(sessions)
      .where(and(eq(sessions.storyId, storyId), eq(sessions.userId, userId)))
      .orderBy(sql`${sessions.updatedAt} DESC`);
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    const db = getDb();
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sql`${sessions.updatedAt} DESC`);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const db = getDb();
    const inserted = await db.insert(sessions).values(session).returning();
    return inserted[0];
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> {
    const db = getDb();
    const updated = await db
      .update(sessions)
      .set({ ...session, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return updated[0];
  }

  async deleteSession(id: number): Promise<void> {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const db = getDb();
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    const db = getDb();
    return db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(sql`${messages.createdAt} ASC`);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const db = getDb();
    const inserted = await db.insert(messages).values(message).returning();
    return inserted[0];
  }

  async deleteMessage(id: number): Promise<void> {
    const db = getDb();
    await db.delete(messages).where(eq(messages.id, id));
  }

  async deleteAllSessionMessages(sessionId: number): Promise<void> {
    const db = getDb();
    await db.delete(messages).where(eq(messages.sessionId, sessionId));
  }

  async getUserById(id: number): Promise<User | undefined> {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDb();
    const inserted = await db.insert(users).values(user).returning();
    return inserted[0];
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const db = getDb();
    const updated = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated[0];
  }

  async updateUserApiKeys(userId: number, apiKeys: Partial<UserApiKeys>): Promise<User> {
    const db = getDb();
    const updated = await db
      .update(users)
      .set({ ...apiKeys, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated[0];
  }

  async getUserApiKeys(userId: number): Promise<UserApiKeys | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    
    return {
      apiKeyChatgpt: user.apiKeyChatgpt,
      apiKeyGrok: user.apiKeyGrok,
      apiKeyClaude: user.apiKeyClaude,
      apiKeyGemini: user.apiKeyGemini,
      aiModelChatgpt: user.aiModelChatgpt,
      aiModelGrok: user.aiModelGrok,
      aiModelClaude: user.aiModelClaude,
      aiModelGemini: user.aiModelGemini,
    };
  }

  async updateUserConversationProfiles(userId: number, profiles: ConversationProfile[]): Promise<User> {
    const db = getDb();
    const updated = await db
      .update(users)
      .set({ 
        conversationProfiles: JSON.stringify(profiles),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updated[0];
  }

  async getUserConversationProfiles(userId: number): Promise<ConversationProfile[]> {
    const user = await this.getUserById(userId);
    if (!user || !user.conversationProfiles) return [];
    
    try {
      return JSON.parse(user.conversationProfiles);
    } catch {
      return [];
    }
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const storage = new Storage();
