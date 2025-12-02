import { sql, eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { settings, stories, messages } from "@shared/schema";
import { 
  type InsertSetting, type Setting,
  type InsertStory, type Story,
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        character TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      );
    `);
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
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByStory(storyId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessagesByStory(storyId: number): Promise<boolean>;
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
    await this.deleteMessagesByStory(id);
    const result = db
      .delete(stories)
      .where(eq(stories.id, id))
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

  async getMessagesByStory(storyId: number): Promise<Message[]> {
    const db = getDb();
    return db
      .select()
      .from(messages)
      .where(eq(messages.storyId, storyId))
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

  async deleteMessagesByStory(storyId: number): Promise<boolean> {
    const db = getDb();
    db
      .delete(messages)
      .where(eq(messages.storyId, storyId))
      .run();
    return true;
  }
}

export const storage = new SqliteStorage();
