import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { settings } from "@shared/schema";
import { type InsertSetting, type Setting } from "@shared/schema";

let db: ReturnType<typeof drizzle>;

function getDb() {
  if (!db) {
    const sqlite = new Database("app.db");
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite);
  }
  return db;
}

export interface IStorage {
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting>;
}

export class SqliteStorage implements IStorage {
  async getSetting(key: string): Promise<Setting | undefined> {
    const db = getDb();
    const result = await db
      .select()
      .from(settings)
      .where(sql`${settings.key} = ${key}`)
      .limit(1);
    return result[0];
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const db = getDb();
    const existing = await this.getSetting(key);
    
    if (existing) {
      const result = await db
        .update(settings)
        .set({ value })
        .where(sql`${settings.key} = ${key}`)
        .returning();
      return result[0];
    }
    
    const result = await db
      .insert(settings)
      .values({ key, value })
      .returning();
    return result[0];
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    return this.setSetting(key, value);
  }
}

export const storage = new SqliteStorage();
