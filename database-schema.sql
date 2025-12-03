-- Database Schema

CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            character TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
          );

CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        conversation_profile TEXT,
        user_note TEXT,
        summary_memory TEXT,
        session_model TEXT,
        session_provider TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      );

CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );

CREATE TABLE stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        genre TEXT,
        author TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      , story_settings TEXT, prologue TEXT, prompt_template TEXT, example_user_input TEXT, example_ai_response TEXT, starting_situation TEXT, conversation_profile TEXT, user_note TEXT, summary_memory TEXT, session_model TEXT, session_provider TEXT);

-- Sample Data

-- Sample Story
INSERT INTO stories VALUES (8, '아스토니아', '새로운 스토리', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000', '판타지', 'User', '{"World":{"Loc":"Arcadia(Modern+Magic)","MC":"God_Awakened(Secret)","Conflict":"Daily_Life vs Chaos","System":"Absolute_Power"},"Chars":{"So-yul":"Friend(Love)","Ella":"Agent(Watcher)","Seraphim":"Cult(Fanatic)","Su-ah":"Senior(Ret_Legend)","Lilith":"Invader(Noble)"},"Rel_Rule":"Conflict(Bureau/Cult)"}

#Rules
- MC hides power in daily routine but dominates enemies instantly.
- Describe creative manifestations of godhood.
- Heroines react vividly to MC''s duality.', '', '기본 프롬프트', '', '', '', '2025-12-02 23:49:11', '2025-12-02 23:49:11');

-- Default Settings (API keys excluded for security)
INSERT INTO settings (id, key, value) VALUES (1, 'commonPrompt', '');
INSERT INTO settings (id, key, value) VALUES (2, 'storyGeneratePrompt', '');
INSERT INTO settings (id, key, value) VALUES (3, 'prologueGeneratePrompt', '');
INSERT INTO settings (id, key, value) VALUES (4, 'aiModel_chatgpt', 'gpt-4o');
INSERT INTO settings (id, key, value) VALUES (5, 'aiModel_grok', 'grok-beta');
INSERT INTO settings (id, key, value) VALUES (6, 'aiModel_claude', 'claude-3-5-sonnet-20241022');
INSERT INTO settings (id, key, value) VALUES (7, 'aiModel_gemini', 'gemini-3-pro-preview');

-- Note: API keys (apiKey_chatgpt, apiKey_grok, apiKey_claude, apiKey_gemini) should be set through the application settings page.
