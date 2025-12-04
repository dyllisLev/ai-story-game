import { sql, eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { settings, stories, sessions, messages, users } from "@shared/schema";
import { 
  type InsertSetting, type Setting,
  type InsertStory, type Story,
  type InsertSession, type Session,
  type InsertMessage, type Message,
  type InsertUser, type User, type SafeUser, type UserApiKeys
} from "@shared/schema";
import crypto from "crypto";

let db: ReturnType<typeof drizzle>;
let sqliteDb: Database.Database;

function getDb() {
  if (!db) {
    sqliteDb = new Database("app.db");
    sqliteDb.pragma("journal_mode = WAL");
    db = drizzle(sqliteDb);
    
    // Create tables if not exist
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        genre TEXT,
        author TEXT,
        story_settings TEXT,
        prologue TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        conversation_profile TEXT,
        user_note TEXT,
        summary_memory TEXT,
        session_model TEXT,
        session_provider TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        character TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        profile_image TEXT,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Migration: Add new columns to stories if they don't exist
    const storyColumnsToAdd = [
      'story_settings TEXT',
      'prologue TEXT',
      'prompt_template TEXT',
      'example_user_input TEXT',
      'example_ai_response TEXT',
      'starting_situation TEXT'
    ];
    for (const col of storyColumnsToAdd) {
      try {
        sqliteDb.exec(`ALTER TABLE stories ADD COLUMN ${col};`);
      } catch (e) { /* column already exists */ }
    }
    
    // Migration: Add API key columns to users if they don't exist
    const userColumnsToAdd = [
      'api_key_chatgpt TEXT',
      'api_key_grok TEXT',
      'api_key_claude TEXT',
      'api_key_gemini TEXT',
      "ai_model_chatgpt TEXT DEFAULT 'gpt-4o'",
      "ai_model_grok TEXT DEFAULT 'grok-beta'",
      "ai_model_claude TEXT DEFAULT 'claude-3-5-sonnet-20241022'",
      "ai_model_gemini TEXT DEFAULT 'gemini-2.0-flash'"
    ];
    for (const col of userColumnsToAdd) {
      try {
        sqliteDb.exec(`ALTER TABLE users ADD COLUMN ${col};`);
      } catch (e) { /* column already exists */ }
    }
    
    // Migration: Convert messages from story_id to session_id
    try {
      const tableInfo = sqliteDb.prepare(`PRAGMA table_info(messages)`).all() as any[];
      const hasSessionId = tableInfo.some((col: any) => col.name === 'session_id');
      const hasStoryId = tableInfo.some((col: any) => col.name === 'story_id');
      
      if (!hasSessionId && hasStoryId) {
        console.log("⚠️  Migrating messages from story-based to session-based system...");
        
        // Get all existing messages with story_id
        const existingMessages = sqliteDb.prepare(`SELECT * FROM messages`).all();
        console.log(`Found ${existingMessages.length} existing messages to migrate`);
        
        // Create a backup of old messages
        sqliteDb.exec(`
          CREATE TABLE IF NOT EXISTS messages_backup_pre_session (
            id INTEGER,
            story_id INTEGER,
            role TEXT,
            content TEXT,
            character TEXT,
            created_at TEXT
          );
        `);
        sqliteDb.exec(`INSERT INTO messages_backup_pre_session SELECT * FROM messages;`);
        console.log("✓ Created backup table: messages_backup_pre_session");
        
        // Create migration sessions for each story that has messages
        const storyIds = [...new Set(existingMessages.map((m: any) => m.story_id))];
        const storyToSessionMap = new Map<number, number>();
        
        for (const storyId of storyIds) {
          // Create a migration session for this story
          const result = sqliteDb.prepare(`
            INSERT INTO sessions (story_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `).run(storyId, `[Migrated] Story ${storyId} Messages`, 
                 new Date().toISOString(), 
                 new Date().toISOString());
          storyToSessionMap.set(storyId, result.lastInsertRowid as number);
        }
        console.log(`✓ Created ${storyToSessionMap.size} migration sessions`);
        
        // Drop and recreate messages table with new schema
        sqliteDb.exec(`DROP TABLE messages;`);
        sqliteDb.exec(`
          CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            character TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
          );
        `);
        
        // Migrate messages to new sessions
        for (const msg of existingMessages) {
          const sessionId = storyToSessionMap.get(msg.story_id);
          if (sessionId) {
            sqliteDb.prepare(`
              INSERT INTO messages (session_id, role, content, character, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(sessionId, msg.role, msg.content, msg.character, msg.created_at);
          }
        }
        console.log(`✓ Migrated ${existingMessages.length} messages to session-based system`);
        console.log("✓ Migration complete! Old messages preserved in messages_backup_pre_session");
      }
    } catch (e) {
      console.error("❌ Migration error:", e);
      throw e; // Re-throw to prevent server from starting with broken database
    }
  }
  return db;
}

export interface IStorage {
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  setSetting(key: string, value: string): Promise<Setting>;
  
  // Stories
  getStory(id: number): Promise<Story | undefined>;
  getAllStories(): Promise<Story[]>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<boolean>;
  
  // Sessions
  getSession(id: number): Promise<Session | undefined>;
  getSessionsByStory(storyId: number): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBySession(sessionId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesBySession(sessionId: number): Promise<boolean>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserApiKeys(id: number, apiKeys: Partial<UserApiKeys>): Promise<User | undefined>;
  getUserApiKeys(id: number): Promise<UserApiKeys | undefined>;
  deleteUser(id: number): Promise<boolean>;
  validatePassword(plainPassword: string, hashedPassword: string): boolean;
  hashPassword(password: string): string;
}

export class SqliteStorage implements IStorage {
  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)
      .all();
    return result[0];
  }

  async getAllSettings(): Promise<Setting[]> {
    const db = getDb();
    return db.select().from(settings).all();
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const db = getDb();
    const existing = await this.getSetting(key);
    
    if (existing) {
      const result = db
        .update(settings)
        .set({ value })
        .where(eq(settings.key, key))
        .returning()
        .all();
      return result[0];
    }
    
    const result = db
      .insert(settings)
      .values({ key, value })
      .returning()
      .all();
    return result[0];
  }

  // Stories
  async getStory(id: number): Promise<Story | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(stories)
      .where(eq(stories.id, id))
      .limit(1)
      .all();
    return result[0];
  }

  async getAllStories(): Promise<Story[]> {
    // Ensure database is initialized
    getDb();
    
    // Get all stories with their most recent session update time
    const result = sqliteDb.prepare(`
      SELECT 
        s.*,
        COALESCE(MAX(sess.updated_at), s.created_at) as last_played_at
      FROM stories s
      LEFT JOIN sessions sess ON s.id = sess.story_id
      GROUP BY s.id
      ORDER BY last_played_at DESC
    `).all();
    
    return result as Story[];
  }

  async createStory(story: InsertStory): Promise<Story> {
    const db = getDb();
    const result = db
      .insert(stories)
      .values(story)
      .returning()
      .all();
    return result[0];
  }

  async updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined> {
    const db = getDb();
    const result = db
      .update(stories)
      .set({ ...story, updatedAt: new Date().toISOString() })
      .where(eq(stories.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteStory(id: number): Promise<boolean> {
    const db = getDb();
    const result = db
      .delete(stories)
      .where(eq(stories.id, id))
      .returning()
      .all();
    return result.length > 0;
  }

  // Sessions
  async getSession(id: number): Promise<Session | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)
      .all();
    return result[0];
  }

  async getSessionsByStory(storyId: number): Promise<Session[]> {
    const db = getDb();
    return db
      .select()
      .from(sessions)
      .where(eq(sessions.storyId, storyId))
      .all();
  }

  async createSession(session: InsertSession): Promise<Session> {
    const db = getDb();
    const result = db
      .insert(sessions)
      .values(session)
      .returning()
      .all();
    return result[0];
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined> {
    const db = getDb();
    const result = db
      .update(sessions)
      .set({ ...session, updatedAt: new Date().toISOString() })
      .where(eq(sessions.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteSession(id: number): Promise<boolean> {
    const db = getDb();
    const result = db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning()
      .all();
    return result.length > 0;
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1)
      .all();
    return result[0];
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    const db = getDb();
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .all();
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const db = getDb();
    const result = db
      .insert(messages)
      .values(message)
      .returning()
      .all();
    return result[0];
  }

  async deleteMessagesBySession(sessionId: number): Promise<boolean> {
    const db = getDb();
    db
      .delete(messages)
      .where(eq(messages.sessionId, sessionId))
      .run();
    return true;
  }

  // Users
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
  }

  validatePassword(plainPassword: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(":");
    const verifyHash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 64, "sha512").toString("hex");
    return hash === verifyHash;
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
      .all();
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .all();
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    const result = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .all();
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDb();
    const hashedPassword = this.hashPassword(user.password);
    const result = db
      .insert(users)
      .values({ ...user, password: hashedPassword })
      .returning()
      .all();
    return result[0];
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const db = getDb();
    const updateData: any = { ...user, updatedAt: new Date().toISOString() };
    
    if (user.password) {
      updateData.password = this.hashPassword(user.password);
    }
    
    const result = db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning()
      .all();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const db = getDb();
    const result = db
      .delete(users)
      .where(eq(users.id, id))
      .returning()
      .all();
    return result.length > 0;
  }

  async updateUserApiKeys(id: number, apiKeys: Partial<UserApiKeys>): Promise<User | undefined> {
    const db = getDb();
    const updateData: any = { updatedAt: new Date().toISOString() };
    
    if (apiKeys.apiKeyChatgpt !== undefined) updateData.apiKeyChatgpt = apiKeys.apiKeyChatgpt;
    if (apiKeys.apiKeyGrok !== undefined) updateData.apiKeyGrok = apiKeys.apiKeyGrok;
    if (apiKeys.apiKeyClaude !== undefined) updateData.apiKeyClaude = apiKeys.apiKeyClaude;
    if (apiKeys.apiKeyGemini !== undefined) updateData.apiKeyGemini = apiKeys.apiKeyGemini;
    if (apiKeys.aiModelChatgpt !== undefined) updateData.aiModelChatgpt = apiKeys.aiModelChatgpt;
    if (apiKeys.aiModelGrok !== undefined) updateData.aiModelGrok = apiKeys.aiModelGrok;
    if (apiKeys.aiModelClaude !== undefined) updateData.aiModelClaude = apiKeys.aiModelClaude;
    if (apiKeys.aiModelGemini !== undefined) updateData.aiModelGemini = apiKeys.aiModelGemini;
    
    const result = db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning()
      .all();
    return result[0];
  }

  async getUserApiKeys(id: number): Promise<UserApiKeys | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
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
}

export const storage = new SqliteStorage();
