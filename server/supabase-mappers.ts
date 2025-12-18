// Mapping helpers to convert between camelCase (app layer) and snake_case (database layer)

import type { Database } from './supabase-types';
import type { 
  User, InsertUser,
  Story, InsertStory,
  Session, InsertSession,
  Message, InsertMessage,
  Setting, InsertSetting,
  Group, InsertGroup,
  UserGroup, InsertUserGroup,
  StoryGroup, InsertStoryGroup,
  ApiLog, InsertApiLog
} from '@shared/schema';

type DbUser = Database['public']['Tables']['users']['Row'];
type DbUserInsert = Database['public']['Tables']['users']['Insert'];
type DbStory = Database['public']['Tables']['stories']['Row'];
type DbStoryInsert = Database['public']['Tables']['stories']['Insert'];
type DbSession = Database['public']['Tables']['sessions']['Row'];
type DbSessionInsert = Database['public']['Tables']['sessions']['Insert'];
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DbMessageInsert = Database['public']['Tables']['messages']['Insert'];
type DbGroup = Database['public']['Tables']['groups']['Row'];
type DbGroupInsert = Database['public']['Tables']['groups']['Insert'];
type DbUserGroup = Database['public']['Tables']['user_groups']['Row'];
type DbUserGroupInsert = Database['public']['Tables']['user_groups']['Insert'];
type DbStoryGroup = Database['public']['Tables']['story_groups']['Row'];
type DbStoryGroupInsert = Database['public']['Tables']['story_groups']['Insert'];
type DbApiLog = Database['public']['Tables']['api_logs']['Row'];
type DbApiLogInsert = Database['public']['Tables']['api_logs']['Insert'];

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
    selectedModels: (dbUser as any).selected_models,
    defaultModel: (dbUser as any).default_model,
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
    selected_models: (user as any).selectedModels,
  } as DbUserInsert;
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
    createdBy: dbStory.created_by,
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
    created_by: story.createdBy,
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
    fontSize: dbSession.font_size || 13,
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
  
  // Only include optional fields if explicitly provided
  if (session.fontSize !== undefined) {
    dbSession.font_size = session.fontSize;
  }
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

// Group mappers
export function dbGroupToGroup(dbGroup: DbGroup): Group {
  return {
    id: dbGroup.id,
    name: dbGroup.name,
    type: dbGroup.type,
    description: dbGroup.description,
    createdAt: dbGroup.created_at ? new Date(dbGroup.created_at) : null,
    updatedAt: dbGroup.updated_at ? new Date(dbGroup.updated_at) : null,
  };
}

export function groupToDbGroupInsert(group: InsertGroup): DbGroupInsert {
  return {
    name: group.name,
    type: group.type,
    description: group.description,
  };
}

// UserGroup mappers
export function dbUserGroupToUserGroup(dbUserGroup: DbUserGroup): UserGroup {
  return {
    id: dbUserGroup.id,
    userId: dbUserGroup.user_id,
    groupId: dbUserGroup.group_id,
    createdAt: dbUserGroup.created_at ? new Date(dbUserGroup.created_at) : null,
  };
}

export function userGroupToDbUserGroupInsert(userGroup: InsertUserGroup): DbUserGroupInsert {
  return {
    user_id: userGroup.userId,
    group_id: userGroup.groupId,
  };
}

// StoryGroup mappers
export function dbStoryGroupToStoryGroup(dbStoryGroup: DbStoryGroup): StoryGroup {
  return {
    id: dbStoryGroup.id,
    storyId: dbStoryGroup.story_id,
    groupId: dbStoryGroup.group_id,
    permission: dbStoryGroup.permission,
    createdAt: dbStoryGroup.created_at ? new Date(dbStoryGroup.created_at) : null,
  };
}

export function storyGroupToDbStoryGroupInsert(storyGroup: InsertStoryGroup): DbStoryGroupInsert {
  return {
    story_id: storyGroup.storyId,
    group_id: storyGroup.groupId,
    permission: storyGroup.permission,
  };
}

// ApiLog mappers
export function dbApiLogToApiLog(dbApiLog: DbApiLog): ApiLog {
  return {
    id: dbApiLog.id,
    type: dbApiLog.type,
    provider: dbApiLog.provider,
    model: dbApiLog.model,
    inputPrompt: dbApiLog.input_prompt,
    outputResponse: dbApiLog.output_response,
    errorMessage: dbApiLog.error_message,
    errorStack: dbApiLog.error_stack,
    userId: dbApiLog.user_id,
    sessionId: dbApiLog.session_id,
    responseTime: dbApiLog.response_time,
    createdAt: dbApiLog.created_at ? new Date(dbApiLog.created_at) : null,
  };
}

export function apiLogToDbApiLogInsert(apiLog: InsertApiLog): DbApiLogInsert {
  return {
    type: apiLog.type,
    provider: apiLog.provider,
    model: apiLog.model,
    input_prompt: apiLog.inputPrompt,
    output_response: apiLog.outputResponse,
    error_message: apiLog.errorMessage,
    error_stack: apiLog.errorStack,
    user_id: apiLog.userId,
    session_id: apiLog.sessionId,
    response_time: apiLog.responseTime,
  };
}
