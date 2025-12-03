// Export database schema and sample data (excluding API keys)
import Database from 'better-sqlite3';
import * as fs from 'fs';

const db = new Database('app.db');

// Get schema
const tables = db.prepare(`
  SELECT sql FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

let schema = '-- Database Schema\n\n';
tables.forEach((table: any) => {
  schema += table.sql + ';\n\n';
});

// Get sample data (excluding API keys from settings)
schema += '-- Sample Data\n\n';

// Export stories without sensitive data
const stories = db.prepare('SELECT * FROM stories LIMIT 1').all();
if (stories.length > 0) {
  schema += '-- Sample Story\n';
  stories.forEach((story: any) => {
    const values = [
      story.id,
      `'${story.title?.replace(/'/g, "''") || ''}'`,
      `'${story.description?.replace(/'/g, "''") || ''}'`,
      `'${story.image || ''}'`,
      `'${story.genre || ''}'`,
      `'${story.author || ''}'`,
      `'${story.story_settings?.replace(/'/g, "''") || ''}'`,
      `'${story.prologue?.replace(/'/g, "''") || ''}'`,
      `'${story.prompt_template?.replace(/'/g, "''") || ''}'`,
      `'${story.example_user_input?.replace(/'/g, "''") || ''}'`,
      `'${story.example_ai_response?.replace(/'/g, "''") || ''}'`,
      `'${story.starting_situation?.replace(/'/g, "''") || ''}'`,
      `'${story.created_at || ''}'`,
      `'${story.updated_at || ''}'`
    ];
    schema += `INSERT INTO stories VALUES (${values.join(', ')});\n`;
  });
  schema += '\n';
}

// Export default settings WITHOUT API keys
schema += '-- Default Settings (API keys excluded for security)\n';
const defaultSettings = [
  { key: 'commonPrompt', value: '' },
  { key: 'storyGeneratePrompt', value: '' },
  { key: 'prologueGeneratePrompt', value: '' },
  { key: 'aiModel_chatgpt', value: 'gpt-4o' },
  { key: 'aiModel_grok', value: 'grok-beta' },
  { key: 'aiModel_claude', value: 'claude-3-5-sonnet-20241022' },
  { key: 'aiModel_gemini', value: 'gemini-3-pro-preview' }
];

defaultSettings.forEach((setting, index) => {
  schema += `INSERT INTO settings (id, key, value) VALUES (${index + 1}, '${setting.key}', '${setting.value}');\n`;
});

schema += '\n-- Note: API keys (apiKey_chatgpt, apiKey_grok, apiKey_claude, apiKey_gemini) should be set through the application settings page.\n';

fs.writeFileSync('database-schema.sql', schema);
console.log('✅ Database schema exported to database-schema.sql (API keys excluded)');
