import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  profileImage: text("profile_image"),
  role: text("role").default("user"),
  apiKeyChatgpt: text("api_key_chatgpt"),
  apiKeyGrok: text("api_key_grok"),
  apiKeyClaude: text("api_key_claude"),
  apiKeyGemini: text("api_key_gemini"),
  aiModelChatgpt: text("ai_model_chatgpt").default("gpt-4o"),
  aiModelGrok: text("ai_model_grok").default("grok-beta"),
  aiModelClaude: text("ai_model_claude").default("claude-3-5-sonnet-20241022"),
  aiModelGemini: text("ai_model_gemini").default("gemini-2.0-flash"),
  conversationProfiles: text("conversation_profiles"), // JSON array of {id, name, content}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // 'user' or 'admin'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  genre: text("genre"),
  author: text("author"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  storySettings: text("story_settings"),
  prologue: text("prologue"),
  promptTemplate: text("prompt_template"),
  exampleUserInput: text("example_user_input"),
  exampleAiResponse: text("example_ai_response"),
  startingSituation: text("starting_situation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storyGroups = pgTable("story_groups", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // 'read' or 'write'
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  conversationProfile: text("conversation_profile"),
  userNote: text("user_note"),
  summaryMemory: text("summary_memory"),
  keyPlotPoints: text("key_plot_points"),
  sessionModel: text("session_model"),
  sessionProvider: text("session_provider"),
  aiMessageCount: integer("ai_message_count").default(0).notNull(),
  lastSummaryTurn: integer("last_summary_turn").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  character: text("character"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다"),
  email: z.string().email("유효한 이메일을 입력하세요").optional().or(z.literal("")),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email("유효한 이메일을 입력하세요").optional().or(z.literal("")),
  profileImage: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요"),
  newPassword: z.string().min(6, "새 비밀번호는 6자 이상이어야 합니다"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "새 비밀번호가 일치하지 않습니다",
  path: ["confirmNewPassword"],
});

export const updateApiKeysSchema = z.object({
  apiKeyChatgpt: z.string().optional(),
  apiKeyGrok: z.string().optional(),
  apiKeyClaude: z.string().optional(),
  apiKeyGemini: z.string().optional(),
  aiModelChatgpt: z.string().optional(),
  aiModelGrok: z.string().optional(),
  aiModelClaude: z.string().optional(),
  aiModelGemini: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "password"> & { isAdmin?: boolean };
export type UserApiKeys = {
  apiKeyChatgpt: string | null;
  apiKeyGrok: string | null;
  apiKeyClaude: string | null;
  apiKeyGemini: string | null;
  aiModelChatgpt: string | null;
  aiModelGrok: string | null;
  aiModelClaude: string | null;
  aiModelGemini: string | null;
};

export interface ConversationProfile {
  id: string;
  name: string;
  content: string;
}

export const conversationProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "프로필 이름을 입력하세요"),
  content: z.string(),
});

export const updateConversationProfilesSchema = z.object({
  profiles: z.array(conversationProfileSchema),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserGroupSchema = createInsertSchema(userGroups).omit({
  id: true,
  createdAt: true,
});

export const insertStoryGroupSchema = createInsertSchema(storyGroups).omit({
  id: true,
  createdAt: true,
});

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;

export type InsertStoryGroup = z.infer<typeof insertStoryGroupSchema>;
export type StoryGroup = typeof storyGroups.$inferSelect;
