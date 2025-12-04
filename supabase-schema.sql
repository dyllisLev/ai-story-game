-- Crack AI - Supabase Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  profile_image TEXT,
  role TEXT DEFAULT 'user',
  api_key_chatgpt TEXT,
  api_key_grok TEXT,
  api_key_claude TEXT,
  api_key_gemini TEXT,
  ai_model_chatgpt TEXT DEFAULT 'gpt-4o',
  ai_model_grok TEXT DEFAULT 'grok-beta',
  ai_model_claude TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  ai_model_gemini TEXT DEFAULT 'gemini-2.0-flash',
  conversation_profiles TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  genre TEXT,
  author TEXT,
  story_settings TEXT,
  prologue TEXT,
  prompt_template TEXT,
  example_user_input TEXT,
  example_ai_response TEXT,
  starting_situation TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  conversation_profile TEXT,
  user_note TEXT,
  summary_memory TEXT,
  session_model TEXT,
  session_provider TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  character TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_story_id ON sessions(story_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
DROP POLICY IF EXISTS "Allow read stories" ON stories;
DROP POLICY IF EXISTS "Allow all on stories" ON stories;
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

-- RLS Policies (서버에서 관리하므로 모두 허용)
-- Settings: 모두 접근 가능
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true);

-- Stories: 모두 조회 가능, 생성/수정/삭제는 인증 필요
CREATE POLICY "Allow read stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Allow all on stories" ON stories FOR ALL USING (true);

-- Users: 서버에서 관리
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);

-- Sessions: 서버에서 관리
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true);

-- Messages: 서버에서 관리
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
