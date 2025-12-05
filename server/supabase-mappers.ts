// Mapping helpers to convert between camelCase (app layer) and snake_case (database layer)

import type { Database } from './supabase-types';
import type { 
  User, InsertUser,
  Story, InsertStory,
  Session, InsertSession,
  Message, InsertMessage,
  Setting, InsertSetting
} from '@shared/schema';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];
type DbStory = Database['public']['Tables']['stories']['Row'];
type DbStoryInsert = Database['public']['Tables']['stories']['Insert'];
type DbSession = Database['public']['Tables']['sessions']['Row'];
type DbSessionInsert = Database['public']['Tables']['sessions']['Insert'];
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DbMessageInsert = Database['public']['Tables']['messages']['Insert'];

// User mappers
export function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    password: dbUser.password,
    displayName: dbUser.display_name,
    profileImage: dbUser.profile_image,
    role: dbUser.role,
    apiKeyChatgpt: dbUser.api_key_chatgpt,
    apiKeyGrok: dbUser.api_key_grok,
    apiKeyClaude: dbUser.api_key_claude,
    apiKeyGemini: dbUser.api_key_gemini,
    aiModelChatgpt: dbUser.ai_model_chatgpt,
    aiModelGrok: dbUser.ai_model_grok,
    aiModelClaude: dbUser.ai_model_claude,
    aiModelGemini: dbUser.ai_model_gemini,
    conversationProfiles: dbUser.conversation_profiles,
    createdAt: dbUser.created_at ? new Date(dbUser.created_at) : null,
    updatedAt: dbUser.updated_at ? new Date(dbUser.updated_at) : null,
  };
}

export function userToDbUserInsert(user: InsertUser): DbUserInsert {
  return {
    username: user.username,
    email: user.email,
    password: user.password,
    display_name: user.displayName,
    profile_image: user.profileImage,
    role: user.role,
    api_key_chatgpt: user.apiKeyChatgpt,
    api_key_grok: user.apiKeyGrok,
    api_key_claude: user.apiKeyClaude,
    api_key_gemini: user.apiKeyGemini,
    ai_model_chatgpt: user.aiModelChatgpt,
    ai_model_grok: user.aiModelGrok,
    ai_model_claude: user.aiModelClaude,
    ai_model_gemini: user.aiModelGemini,
    conversation_profiles: user.conversationProfiles,
  };
}

// Story mappers
export function dbStoryToStory(dbStory: DbStory): Story {
  return {
    id: dbStory.id,
    title: dbStory.title,
    description: dbStory.description,
    image: dbStory.image,
    genre: dbStory.genre,
    author: dbStory.author,
    storySettings: dbStory.story_settings,
    prologue: dbStory.prologue,
    promptTemplate: dbStory.prompt_template,
    exampleUserInput: dbStory.example_user_input,
    exampleAiResponse: dbStory.example_ai_response,
    startingSituation: dbStory.starting_situation,
    createdAt: dbStory.created_at ? new Date(dbStory.created_at) : null,
    updatedAt: dbStory.updated_at ? new Date(dbStory.updated_at) : null,
  };
}

export function storyToDbStoryInsert(story: InsertStory): DbStoryInsert {
  return {
    title: story.title,
    description: story.description,
    image: story.image,
    genre: story.genre,
    author: story.author,
    story_settings: story.storySettings,
    prologue: story.prologue,
    prompt_template: story.promptTemplate,
    example_user_input: story.exampleUserInput,
    example_ai_response: story.exampleAiResponse,
    starting_situation: story.startingSituation,
  };
}

// Session mappers
export function dbSessionToSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    storyId: dbSession.story_id,
    userId: dbSession.user_id,
    title: dbSession.title,
    conversationProfile: dbSession.conversation_profile,
    userNote: dbSession.user_note,
    summaryMemory: dbSession.summary_memory,
    keyPlotPoints: dbSession.key_plot_points,
    sessionModel: dbSession.session_model,
    sessionProvider: dbSession.session_provider,
    aiMessageCount: dbSession.ai_message_count || 0,
    lastSummaryTurn: dbSession.last_summary_turn || 0,
    createdAt: dbSession.created_at ? new Date(dbSession.created_at) : null,
    updatedAt: dbSession.updated_at ? new Date(dbSession.updated_at) : null,
  };
}

export function sessionToDbSessionInsert(session: InsertSession): DbSessionInsert {
  const dbSession: any = {
    story_id: session.storyId,
    user_id: session.userId,
    title: session.title,
    conversation_profile: session.conversationProfile,
    user_note: session.userNote,
    summary_memory: session.summaryMemory,
    key_plot_points: session.keyPlotPoints,
    session_model: session.sessionModel,
    session_provider: session.sessionProvider,
  };
  
  // Only include count fields if explicitly provided
  if (session.aiMessageCount !== undefined) {
    dbSession.ai_message_count = session.aiMessageCount;
  }
  if (session.lastSummaryTurn !== undefined) {
    dbSession.last_summary_turn = session.lastSummaryTurn;
  }
  
  return dbSession;
}

// Message mappers
export function dbMessageToMessage(dbMessage: DbMessage): Message {
  return {
    id: dbMessage.id,
    sessionId: dbMessage.session_id,
    role: dbMessage.role,
    content: dbMessage.content,
    character: dbMessage.character,
    createdAt: dbMessage.created_at ? new Date(dbMessage.created_at) : null,
  };
}

export function messageToDbMessageInsert(message: InsertMessage): DbMessageInsert {
  return {
    session_id: message.sessionId,
    role: message.role,
    content: message.content,
    character: message.character,
  };
}

// Setting mappers (no conversion needed, but keep for consistency)
export function dbSettingToSetting(dbSetting: Database['public']['Tables']['settings']['Row']): Setting {
  return dbSetting;
}

export function settingToDbSettingInsert(setting: InsertSetting): Database['public']['Tables']['settings']['Insert'] {
  return setting;
}
