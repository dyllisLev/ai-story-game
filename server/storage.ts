import { sql, eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { settings, stories, sessions, messages } from "@shared/schema";
import { 
  type InsertSetting, type Setting,
  type InsertStory, type Story,
  type InsertSession, type Session,
  type InsertMessage, type Message
} from "@shared/schema";

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
    
    // Migration: Add session_id to messages and remove old story_id
    try {
      // Check if session_id column exists
      const tableInfo = sqliteDb.prepare(`PRAGMA table_info(messages)`).all() as any[];
      const hasSessionId = tableInfo.some(col => col.name === 'session_id');
      const hasStoryId = tableInfo.some(col => col.name === 'story_id');
      
      if (!hasSessionId && hasStoryId) {
        // Drop old messages table and recreate with new schema
        sqliteDb.exec(`DROP TABLE IF EXISTS messages;`);
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
      }
    } catch (e) {
      console.error("Migration error:", e);
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
    const db = getDb();
    return db.select().from(stories).all();
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
}

export const storage = new SqliteStorage();
