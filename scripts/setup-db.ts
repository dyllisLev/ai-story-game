// Initialize database from init-db.sql
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = 'app.db';
const INIT_SQL_PATH = 'init-db.sql';

console.log('🗄️  Database Setup\n');

// Check if database already exists
const dbExists = fs.existsSync(DB_PATH);

if (dbExists) {
  console.log('⚠️  Database already exists at:', DB_PATH);
  console.log('   Skipping initialization to preserve existing data.');
  console.log('   To reset the database, delete app.db and run this script again.\n');
  process.exit(0);
}

// Check if init SQL file exists
if (!fs.existsSync(INIT_SQL_PATH)) {
  console.error('❌ Error: init-db.sql not found!');
  console.error('   This file should be included in the repository.');
  process.exit(1);
}

console.log('📋 Reading initialization SQL...');
const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf-8');

console.log('🔨 Creating new database...');
const db = new Database(DB_PATH);

console.log('⚡ Executing initialization SQL...');
// Split by semicolons and execute each statement
const statements = initSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

let successCount = 0;
statements.forEach((statement) => {
  try {
    db.exec(statement);
    successCount++;
  } catch (error: any) {
    // Skip comments and empty statements
    if (!statement.startsWith('--')) {
      console.warn('⚠️  Warning:', error.message);
    }
  }
});

db.close();

console.log(`\n✅ Database initialized successfully!`);
console.log(`   Location: ${path.resolve(DB_PATH)}`);
console.log(`   Executed: ${successCount} SQL statements\n`);
console.log('📝 Next steps:');
console.log('   1. Start the application: npm run dev');
console.log('   2. Open Settings page');
console.log('   3. Enter your API keys:');
console.log('      - OpenAI API Key (for ChatGPT)');
console.log('      - Anthropic API Key (for Claude)');
console.log('      - Google AI API Key (for Gemini)');
console.log('      - xAI API Key (for Grok)');
console.log('   4. Start creating stories!\n');
