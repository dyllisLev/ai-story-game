// SQLite to Supabase migration script
import Database from "better-sqlite3";
import { supabase } from "./server/supabase";

async function migrateSQLiteToSupabase() {
  console.log("🚀 Starting migration from SQLite to Supabase...\n");

  // Open SQLite database
  const sqliteDb = new Database("app.db");
  
  try {
    // Migrate Users
    console.log("📦 Migrating users...");
    const users = sqliteDb.prepare("SELECT * FROM users").all();
    const userIdMap = new Map<number, number>(); // old id -> new id
    
    for (const user of users as any[]) {
      const { data, error } = await supabase
        .from('users')
        .insert({
          username: user.username,
          email: user.email,
          password: user.password,
          display_name: user.display_name,
          profile_image: user.profile_image,
          role: user.role,
          api_key_chatgpt: user.api_key_chatgpt,
          api_key_grok: user.api_key_grok,
          api_key_claude: user.api_key_claude,
          api_key_gemini: user.api_key_gemini,
          ai_model_chatgpt: user.ai_model_chatgpt,
          ai_model_grok: user.ai_model_grok,
          ai_model_claude: user.ai_model_claude,
          ai_model_gemini: user.ai_model_gemini,
          conversation_profiles: user.conversation_profiles,
          created_at: user.created_at,
          updated_at: user.updated_at
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error migrating user ${user.username}:`, error.message);
      } else {
        userIdMap.set(user.id, data.id);
        console.log(`✓ Migrated user: ${user.username} (${user.id} -> ${data.id})`);
      }
    }

    // Migrate Settings
    console.log("\n📦 Migrating settings...");
    const settings = sqliteDb.prepare("SELECT * FROM settings").all();
    for (const setting of settings as any[]) {
      const { data, error } = await supabase
        .from('settings')
        .insert({
          key: setting.key,
          value: setting.value
        })
        .select();
      
      if (error) {
        console.error(`❌ Error migrating setting ${setting.key}:`, error.message);
      } else {
        console.log(`✓ Migrated setting: ${setting.key}`);
      }
    }

    // Migrate Stories
    console.log("\n📦 Migrating stories...");
    const stories = sqliteDb.prepare("SELECT * FROM stories").all();
    const storyIdMap = new Map<number, number>(); // old id -> new id
    
    for (const story of stories as any[]) {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          title: story.title,
          description: story.description,
          image: story.image,
          genre: story.genre,
          author: story.author,
          story_settings: story.story_settings,
          prologue: story.prologue,
          prompt_template: story.prompt_template,
          example_user_input: story.example_user_input,
          example_ai_response: story.example_ai_response,
          starting_situation: story.starting_situation,
          created_at: story.created_at,
          updated_at: story.updated_at
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error migrating story ${story.title}:`, error.message);
      } else {
        storyIdMap.set(story.id, data.id);
        console.log(`✓ Migrated story: ${story.title} (${story.id} -> ${data.id})`);
      }
    }

    // Migrate Sessions
    console.log("\n📦 Migrating sessions...");
    const sessions = sqliteDb.prepare("SELECT * FROM sessions").all();
    const sessionIdMap = new Map<number, number>(); // old id -> new id
    
    for (const session of sessions as any[]) {
      const newStoryId = storyIdMap.get(session.story_id);
      if (!newStoryId) {
        console.warn(`⚠️  Skipping session ${session.id}: story ${session.story_id} not found`);
        continue;
      }

      const newUserId = userIdMap.get(session.user_id);
      if (!newUserId) {
        console.warn(`⚠️  Skipping session ${session.id}: user ${session.user_id} not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          story_id: newStoryId,
          user_id: newUserId,
          title: session.title,
          conversation_profile: session.conversation_profile,
          user_note: session.user_note,
          summary_memory: session.summary_memory,
          session_model: session.session_model,
          session_provider: session.session_provider,
          created_at: session.created_at,
          updated_at: session.updated_at
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error migrating session ${session.id}:`, error.message);
      } else {
        sessionIdMap.set(session.id, data.id);
        console.log(`✓ Migrated session: ${session.title} (${session.id} -> ${data.id}, user ${session.user_id} -> ${newUserId})`);
      }
    }

    // Migrate Messages
    console.log("\n📦 Migrating messages...");
    const messages = sqliteDb.prepare("SELECT * FROM messages").all();
    
    for (const message of messages as any[]) {
      const newSessionId = sessionIdMap.get(message.session_id);
      if (!newSessionId) {
        console.warn(`⚠️  Skipping message ${message.id}: session ${message.session_id} not found`);
        continue;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          session_id: newSessionId,
          role: message.role,
          content: message.content,
          character: message.character,
          created_at: message.created_at
        })
        .select();
      
      if (error) {
        console.error(`❌ Error migrating message ${message.id}:`, error.message);
      } else {
        console.log(`✓ Migrated message ${message.id}`);
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Users: ${users.length}`);
    console.log(`   Settings: ${settings.length}`);
    console.log(`   Stories: ${stories.length}`);
    console.log(`   Sessions: ${sessions.length}`);
    console.log(`   Messages: ${messages.length}`);

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
  } finally {
    sqliteDb.close();
  }
}

// Run migration
migrateSQLiteToSupabase().then(() => {
  console.log("\n🎉 Migration script finished");
  process.exit(0);
}).catch((error) => {
  console.error("\n💥 Migration script error:", error);
  process.exit(1);
});
