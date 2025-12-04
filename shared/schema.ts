import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  image: text("image"),
  genre: text("genre"),
  author: text("author"),
  storySettings: text("story_settings"),
  prologue: text("prologue"),
  promptTemplate: text("prompt_template"),
  exampleUserInput: text("example_user_input"),
  exampleAiResponse: text("example_ai_response"),
  startingSituation: text("starting_situation"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  conversationProfile: text("conversation_profile"),
  userNote: text("user_note"),
  summaryMemory: text("summary_memory"),
  sessionModel: text("session_model"),
  sessionProvider: text("session_provider"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  character: text("character"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
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
export type SafeUser = Omit<User, "password">;
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
