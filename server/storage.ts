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
  type InsertUser, type User, type SafeUser, type UserApiKeys, type ConversationProfile,
  type InsertGroup, type Group,
  type InsertUserGroup, type UserGroup,
  type InsertStoryGroup, type StoryGroup
} from "@shared/schema";
import crypto from "crypto";

export interface IStorage {
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  getAllSettings(): Promise<Setting[]>;
  
  getStory(id: number): Promise<Story | undefined>;
  getAllStories(): Promise<Story[]>;
  getStoriesForUser(userId: number): Promise<Story[]>;
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
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User>;
  updateUserApiKeys(userId: number, apiKeys: Partial<UserApiKeys>): Promise<User>;
  getUserApiKeys(userId: number): Promise<UserApiKeys | null>;
  updateUserConversationProfiles(userId: number, profiles: ConversationProfile[]): Promise<User>;
  getUserConversationProfiles(userId: number): Promise<ConversationProfile[]>;
  validatePassword(inputPassword: string, storedHash: string): boolean;
  hashPassword(password: string): string;
  deleteUser(userId: number): Promise<boolean>;
  deleteMessagesBySession(sessionId: number): Promise<void>;
  
  // Groups
  getGroup(id: number): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group>;
  deleteGroup(id: number): Promise<void>;
  
  // User Groups
  getUserGroups(userId: number): Promise<Group[]>;
  addUserToGroup(userId: number, groupId: number): Promise<UserGroup>;
  removeUserFromGroup(userId: number, groupId: number): Promise<void>;
  isUserInGroup(userId: number, groupId: number): Promise<boolean>;
  isUserAdmin(userId: number): Promise<boolean>;
  
  // Story Groups
  getStoryGroups(storyId: number): Promise<Array<Group & { permission: string }>>;
  addStoryGroup(storyId: number, groupId: number, permission: string): Promise<StoryGroup>;
  removeStoryGroup(storyId: number, groupId: number): Promise<void>;
  updateStoryGroupPermission(storyId: number, groupId: number, permission: string): Promise<StoryGroup>;
  checkStoryAccess(userId: number, storyId: number, requiredPermission?: 'read' | 'write'): Promise<boolean>;
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

  async getStoriesForUser(userId: number): Promise<Story[]> {
    // Check if user is admin
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      // Admins can see all stories
      return this.getAllStories();
    }

    // Get stories created by the user
    const { data: createdStories, error: createdError } = await supabase
      .from('stories')
      .select('*')
      .eq('created_by', userId);
    
    if (createdError) throw createdError;
    const createdStoryIds = new Set((createdStories || []).map((s: any) => s.id));

    // Get user's groups
    const userGroups = await this.getUserGroups(userId);
    const userGroupIds = userGroups.map(g => g.id);

    let groupStoryIds: number[] = [];
    if (userGroupIds.length > 0) {
      // Get stories that have at least one group the user belongs to
      const { data, error } = await supabase
        .from('story_groups')
        .select('story_id')
        .in('group_id', userGroupIds);

      if (error) throw error;
      groupStoryIds = (data || []).map((sg: any) => sg.story_id);
    }

    // Combine created stories and group stories (remove duplicates)
    const allStoryIds = [...new Set([...createdStoryIds, ...groupStoryIds])];

    if (allStoryIds.length === 0) {
      return [];
    }

    // Fetch the actual stories
    const { data: storiesData, error: storiesError } = await supabase
      .from('stories')
      .select('*')
      .in('id', allStoryIds)
      .order('created_at', { ascending: false });

    if (storiesError) throw storiesError;
    return (storiesData || []).map(dbStoryToStory);
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

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(dbUserToUser);
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

  async deleteUser(userId: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  }

  async deleteMessagesBySession(sessionId: number): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('session_id', sessionId);
    
    if (error) throw error;
  }

  // Groups
  async getGroup(id: number): Promise<Group | undefined> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as Group | undefined;
  }

  async getAllGroups(): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []) as Group[];
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .insert(group)
      .select()
      .single();
    
    if (error) throw error;
    return data as Group;
  }

  async updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update({ ...group, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Group;
  }

  async deleteGroup(id: number): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // User Groups
  async getUserGroups(userId: number): Promise<Group[]> {
    const { data, error } = await supabase
      .from('user_groups')
      .select('group_id, groups(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((ug: any) => ug.groups as Group);
  }

  async addUserToGroup(userId: number, groupId: number): Promise<UserGroup> {
    const { data, error } = await supabase
      .from('user_groups')
      .insert({ user_id: userId, group_id: groupId })
      .select()
      .single();
    
    if (error) throw error;
    return data as UserGroup;
  }

  async removeUserFromGroup(userId: number, groupId: number): Promise<void> {
    const { error } = await supabase
      .from('user_groups')
      .delete()
      .eq('user_id', userId)
      .eq('group_id', groupId);
    
    if (error) throw error;
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_groups')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  async isUserAdmin(userId: number): Promise<boolean> {
    const groups = await this.getUserGroups(userId);
    return groups.some(g => g.type === 'admin');
  }

  // Story Groups
  async getStoryGroups(storyId: number): Promise<Array<Group & { permission: string }>> {
    const { data, error } = await supabase
      .from('story_groups')
      .select('permission, groups(*)')
      .eq('story_id', storyId);
    
    if (error) throw error;
    return (data || []).map((sg: any) => ({
      ...sg.groups,
      permission: sg.permission
    }));
  }

  async addStoryGroup(storyId: number, groupId: number, permission: string): Promise<StoryGroup> {
    const { data, error } = await supabase
      .from('story_groups')
      .insert({ story_id: storyId, group_id: groupId, permission })
      .select()
      .single();
    
    if (error) throw error;
    return data as StoryGroup;
  }

  async removeStoryGroup(storyId: number, groupId: number): Promise<void> {
    const { error } = await supabase
      .from('story_groups')
      .delete()
      .eq('story_id', storyId)
      .eq('group_id', groupId);
    
    if (error) throw error;
  }

  async updateStoryGroupPermission(storyId: number, groupId: number, permission: string): Promise<StoryGroup> {
    const { data, error } = await supabase
      .from('story_groups')
      .update({ permission })
      .eq('story_id', storyId)
      .eq('group_id', groupId)
      .select()
      .single();
    
    if (error) throw error;
    return data as StoryGroup;
  }

  async checkStoryAccess(userId: number, storyId: number, requiredPermission: 'read' | 'write' = 'read'): Promise<boolean> {
    // Check if user is the story creator
    const story = await this.getStory(storyId);
    if (story?.createdBy === userId) {
      return true; // Creator always has full access
    }

    // Check if user is admin
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) return true;

    // Write permission is only for creator and admin
    if (requiredPermission === 'write') {
      return false;
    }

    // For read permission, check group access
    const userGroups = await this.getUserGroups(userId);
    const userGroupIds = userGroups.map(g => g.id);

    if (userGroupIds.length === 0) return false;

    // Get story groups
    const storyGroups = await this.getStoryGroups(storyId);

    // Check if any of user's groups have read access
    for (const sg of storyGroups) {
      if (userGroupIds.includes(sg.id)) {
        // Both 'read' and 'write' group permissions grant read access
        if (sg.permission === 'read' || sg.permission === 'write') {
          return true;
        }
      }
    }

    return false;
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const storage = new Storage();
