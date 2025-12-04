import { supabase } from "./supabase";
import { 
  type InsertSetting, type Setting,
  type InsertStory, type Story,
  type InsertSession, type Session,
  type InsertMessage, type Message,
  type InsertUser, type User, type SafeUser, type UserApiKeys, type ConversationProfile
} from "@shared/schema";
import crypto from "crypto";

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
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.key);
    
    if (existing) {
      const { data, error } = await supabase
        .from('settings')
        .update({ value: setting.value })
        .eq('key', setting.key)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
    
    const { data, error } = await supabase
      .from('settings')
      .insert(setting)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getAllSettings(): Promise<Setting[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getStory(id: number): Promise<Story | undefined> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getAllStories(): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createStory(story: InsertStory): Promise<Story> {
    const { data, error } = await supabase
      .from('stories')
      .insert(story)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateStory(id: number, story: Partial<InsertStory>): Promise<Story> {
    const { data, error } = await supabase
      .from('stories')
      .update({ ...story, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteStory(id: number): Promise<void> {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getSessionsByStory(storyId: number, userId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createSession(session: InsertSession): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update({ ...session, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteSession(id: number): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteMessage(id: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async deleteAllSessionMessages(sessionId: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) throw error;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error} = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUserApiKeys(userId: number, apiKeys: Partial<UserApiKeys>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...apiKeys, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
    const { data, error } = await supabase
      .from('users')
      .update({ 
        conversation_profiles: JSON.stringify(profiles),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
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
