import { supabase } from "./supabase";
import {
  dbUserToUser, userToDbUserInsert,
  dbStoryToStory, storyToDbStoryInsert,
  dbSessionToSession, sessionToDbSessionInsert,
  dbMessageToMessage, messageToDbMessageInsert,
  dbSettingToSetting, settingToDbSettingInsert
} from "./supabase-mappers";
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
  incrementAIMessageCount(sessionId: number): Promise<number>;
  getRecentAIMessages(sessionId: number, limit: number): Promise<Message[]>;
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
  validatePassword(inputPassword: string, storedHash: string): boolean;
  hashPassword(password: string): string;
}

export class Storage implements IStorage {
  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbSettingToSetting(data) : undefined;
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
      return dbSettingToSetting(data);
    }
    
    const { data, error } = await supabase
      .from('settings')
      .insert(settingToDbSettingInsert(setting))
      .select()
      .single();
    
    if (error) throw error;
    return dbSettingToSetting(data);
  }

  async getAllSettings(): Promise<Setting[]> {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    
    if (error) throw error;
    return (data || []).map(dbSettingToSetting);
  }

  // Stories
  async getStory(id: number): Promise<Story | undefined> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbStoryToStory(data) : undefined;
  }

  async getAllStories(): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbStoryToStory);
  }

  async createStory(story: InsertStory): Promise<Story> {
    const { data, error } = await supabase
      .from('stories')
      .insert(storyToDbStoryInsert(story))
      .select()
      .single();
    
    if (error) throw error;
    return dbStoryToStory(data);
  }

  async updateStory(id: number, story: Partial<InsertStory>): Promise<Story> {
    const dbUpdate = story.storySettings !== undefined || story.promptTemplate !== undefined || 
                     story.exampleUserInput !== undefined || story.exampleAiResponse !== undefined ||
                     story.startingSituation !== undefined
      ? {
          ...(story.title && { title: story.title }),
          ...(story.description !== undefined && { description: story.description }),
          ...(story.image !== undefined && { image: story.image }),
          ...(story.genre !== undefined && { genre: story.genre }),
          ...(story.author !== undefined && { author: story.author }),
          ...(story.storySettings !== undefined && { story_settings: story.storySettings }),
          ...(story.prologue !== undefined && { prologue: story.prologue }),
          ...(story.promptTemplate !== undefined && { prompt_template: story.promptTemplate }),
          ...(story.exampleUserInput !== undefined && { example_user_input: story.exampleUserInput }),
          ...(story.exampleAiResponse !== undefined && { example_ai_response: story.exampleAiResponse }),
          ...(story.startingSituation !== undefined && { starting_situation: story.startingSituation }),
          updated_at: new Date().toISOString()
        }
      : {
          ...(story.title && { title: story.title }),
          ...(story.description !== undefined && { description: story.description }),
          ...(story.image !== undefined && { image: story.image }),
          ...(story.genre !== undefined && { genre: story.genre }),
          ...(story.author !== undefined && { author: story.author }),
          updated_at: new Date().toISOString()
        };

    const { data, error } = await supabase
      .from('stories')
      .update(dbUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return dbStoryToStory(data);
  }

  async deleteStory(id: number): Promise<void> {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Sessions
  async getSession(id: number): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbSessionToSession(data) : undefined;
  }

  async getSessionsByStory(storyId: number, userId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbSessionToSession);
  }

  async getUserSessions(userId: number): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbSessionToSession);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionToDbSessionInsert(session))
      .select()
      .single();
    
    if (error) throw error;
    return dbSessionToSession(data);
  }

  async updateSession(id: number, session: Partial<InsertSession>): Promise<Session> {
    const dbUpdate = {
      ...(session.title && { title: session.title }),
      ...(session.conversationProfile !== undefined && { conversation_profile: session.conversationProfile }),
      ...(session.userNote !== undefined && { user_note: session.userNote }),
      ...(session.summaryMemory !== undefined && { summary_memory: session.summaryMemory }),
      ...(session.keyPlotPoints !== undefined && { key_plot_points: session.keyPlotPoints }),
      ...(session.sessionModel !== undefined && { session_model: session.sessionModel }),
      ...(session.sessionProvider !== undefined && { session_provider: session.sessionProvider }),
      ...(session.aiMessageCount !== undefined && { ai_message_count: session.aiMessageCount }),
      ...(session.lastSummaryTurn !== undefined && { last_summary_turn: session.lastSummaryTurn }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('sessions')
      .update(dbUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return dbSessionToSession(data);
  }

  async deleteSession(id: number): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbMessageToMessage(data) : undefined;
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(dbMessageToMessage);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageToDbMessageInsert(message))
      .select()
      .single();
    
    if (error) throw error;
    return dbMessageToMessage(data);
  }

  async incrementAIMessageCount(sessionId: number): Promise<number> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error("Session not found");
    
    const newCount = (session.aiMessageCount || 0) + 1;
    
    const { data, error } = await supabase
      .from('sessions')
      .update({ 
        ai_message_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) throw error;
    return newCount;
  }

  async getRecentAIMessages(sessionId: number, limit: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []).reverse().map(dbMessageToMessage);
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

  // Users
  async getUserById(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbUserToUser(data) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbUserToUser(data) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data ? dbUserToUser(data) : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(userToDbUserInsert(user))
      .select()
      .single();
    
    if (error) throw error;
    return dbUserToUser(data);
  }

  async updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    const dbUpdate = {
      ...(updates.username && { username: updates.username }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.password && { password: updates.password }),
      ...(updates.displayName !== undefined && { display_name: updates.displayName }),
      ...(updates.profileImage !== undefined && { profile_image: updates.profileImage }),
      ...(updates.role !== undefined && { role: updates.role }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdate)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return dbUserToUser(data);
  }

  async updateUserApiKeys(userId: number, apiKeys: Partial<UserApiKeys>): Promise<User> {
    const dbUpdate = {
      ...(apiKeys.apiKeyChatgpt !== undefined && { api_key_chatgpt: apiKeys.apiKeyChatgpt }),
      ...(apiKeys.apiKeyGrok !== undefined && { api_key_grok: apiKeys.apiKeyGrok }),
      ...(apiKeys.apiKeyClaude !== undefined && { api_key_claude: apiKeys.apiKeyClaude }),
      ...(apiKeys.apiKeyGemini !== undefined && { api_key_gemini: apiKeys.apiKeyGemini }),
      ...(apiKeys.aiModelChatgpt !== undefined && { ai_model_chatgpt: apiKeys.aiModelChatgpt }),
      ...(apiKeys.aiModelGrok !== undefined && { ai_model_grok: apiKeys.aiModelGrok }),
      ...(apiKeys.aiModelClaude !== undefined && { ai_model_claude: apiKeys.aiModelClaude }),
      ...(apiKeys.aiModelGemini !== undefined && { ai_model_gemini: apiKeys.aiModelGemini }),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdate)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return dbUserToUser(data);
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
    return dbUserToUser(data);
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

  hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  validatePassword(inputPassword: string, storedHash: string): boolean {
    return this.hashPassword(inputPassword) === storedHash;
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const storage = new Storage();
