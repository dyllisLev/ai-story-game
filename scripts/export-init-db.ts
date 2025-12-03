// Export complete database initialization SQL (excluding API keys)
import Database from 'better-sqlite3';
import * as fs from 'fs';

const db = new Database('app.db');

let sql = `-- AI Story Game - Database Initialization
-- This file contains all default settings and sample data (API keys excluded)
-- Run this after setting up the application to initialize the database

`;

// 1. Create tables schema
console.log('📋 Extracting table schemas...');
const tables = db.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

sql += '-- ======================\n';
sql += '-- TABLE SCHEMAS\n';
sql += '-- ======================\n\n';

tables.forEach((table: any) => {
  sql += table.sql + ';\n\n';
});

// 2. Export ALL settings (API keys will be empty)
console.log('⚙️  Exporting settings...');
const settings = db.prepare('SELECT * FROM settings ORDER BY id').all();

sql += '-- ======================\n';
sql += '-- SETTINGS\n';
sql += '-- ======================\n\n';

settings.forEach((setting: any) => {
  const key = setting.key;
  let value = setting.value || '';
  
  // Clear API keys
  if (key.startsWith('apiKey_')) {
    value = '';
    sql += `-- ${key}: Please set your API key in the application settings\n`;
  }
  
  // Escape single quotes
  value = value.replace(/'/g, "''");
  
  sql += `INSERT INTO settings (key, value) VALUES ('${key}', '${value}');\n`;
});

sql += '\n';

// 3. Export sample stories
console.log('📚 Exporting sample stories...');
const stories = db.prepare('SELECT * FROM stories').all();

if (stories.length > 0) {
  sql += '-- ======================\n';
  sql += '-- SAMPLE STORIES\n';
  sql += '-- ======================\n\n';
  
  stories.forEach((story: any) => {
    const fields = [
      'title', 'description', 'image', 'genre', 'author',
      'story_settings', 'prologue', 'prompt_template',
      'example_user_input', 'example_ai_response', 'starting_situation',
      'conversation_profile', 'user_note', 'summary_memory',
      'session_model', 'session_provider'
    ];
    
    const values = fields.map(field => {
      const val = story[field] || '';
      return `'${val.toString().replace(/'/g, "''")}'`;
    });
    
    sql += `INSERT INTO stories (${fields.join(', ')}) VALUES (${values.join(', ')});\n`;
  });
  
  sql += '\n';
}

// 4. Add usage instructions
sql += `-- ======================
-- USAGE INSTRUCTIONS
-- ======================
--
-- 1. This file will be automatically used to initialize the database on first run
-- 2. Set your API keys in the Settings page:
--    - OpenAI API Key (for ChatGPT)
--    - Anthropic API Key (for Claude)
--    - Google AI API Key (for Gemini)
--    - xAI API Key (for Grok)
-- 3. Start creating and playing stories!
--
-- Note: Sessions and messages will be created as you play stories
`;

fs.writeFileSync('init-db.sql', sql);

console.log('\n✅ Database initialization SQL exported to: init-db.sql');
console.log(`📊 Exported:`);
console.log(`   - ${tables.length} tables`);
console.log(`   - ${settings.length} settings (API keys cleared)`);
console.log(`   - ${stories.length} sample stories`);
console.log('\n🔑 Remember to set API keys after setup!');
