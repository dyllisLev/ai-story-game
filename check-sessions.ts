import { supabase } from "./server/supabase";
import Database from "better-sqlite3";

async function checkSessions() {
  const db = new Database("app.db");
  
  console.log('SQLite session 33 details:');
  const session33 = db.prepare('SELECT * FROM sessions WHERE id = 33').get();
  console.log(JSON.stringify(session33, null, 2));
  
  console.log('\nSQLite messages for session 33:');
  const messages33 = db.prepare('SELECT * FROM messages WHERE session_id = 33').all();
  console.log(JSON.stringify(messages33, null, 2));
  
  db.close();
  
  console.log('\n\nSupabase session 7 (mapped from SQLite 33):');
  const { data: session7, error: s7Error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', 7)
    .single();
  console.log(JSON.stringify(session7, null, 2));
  console.log('Error:', s7Error);
  
  console.log('\nSupabase messages for session 7:');
  const { data: messages7, error: m7Error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', 7);
  console.log('Count:', messages7?.length || 0);
  console.log('Error:', m7Error);
}

checkSessions();
