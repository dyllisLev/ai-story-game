import Database from 'better-sqlite3';
import * as fs from 'fs';

const SOURCE_DB = 'app.db';
const EXAMPLE_DB = 'app.example.db';

console.log('📦 Creating example database...\n');

if (!fs.existsSync(SOURCE_DB)) {
  console.error('❌ Error: app.db not found!');
  console.error('   Please create a database with sample data first.');
  process.exit(1);
}

// Copy source database to example
fs.copyFileSync(SOURCE_DB, EXAMPLE_DB);
console.log('✅ Copied app.db to app.example.db');

// Clear API keys from settings
const db = new Database(EXAMPLE_DB);

const apiKeys = [
  'openai_api_key',
  'anthropic_api_key', 
  'google_api_key',
  'xai_api_key'
];

apiKeys.forEach(key => {
  const result = db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('', key);
  if (result.changes > 0) {
    console.log(`🔑 Cleared ${key}`);
  }
});

// Get statistics
const stats = {
  settings: db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number },
  stories: db.prepare('SELECT COUNT(*) as count FROM stories').get() as { count: number },
  sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number },
  messages: db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }
};

db.close();

console.log('\n📊 Example database statistics:');
console.log(`   Settings: ${stats.settings.count}`);
console.log(`   Stories: ${stats.stories.count}`);
console.log(`   Sessions: ${stats.sessions.count}`);
console.log(`   Messages: ${stats.messages.count}`);

console.log('\n✅ app.example.db created successfully!');
console.log('\n📝 Usage on new server:');
console.log('   git clone https://github.com/dyllisLev/ai-story-game.git');
console.log('   cd ai-story-game');
console.log('   cp app.example.db app.db');
console.log('   npm run dev');
