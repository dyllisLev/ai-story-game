import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supa.nuc.hmini.me';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
  const username = '이지혜';
  const newPassword = '123456';
  
  console.log(`이지혜 계정의 암호를 재설정합니다...`);
  
  // 현재 사용자 확인
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, username, email')
    .eq('username', username)
    .single();
  
  if (fetchError || !user) {
    console.error('사용자를 찾을 수 없습니다:', fetchError);
    return;
  }
  
  console.log(`사용자 확인: ID ${user.id}, username: ${user.username}`);
  
  // 암호 해싱
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // 암호 업데이트
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('암호 업데이트 실패:', updateError);
    return;
  }
  
  console.log(`✅ 암호가 성공적으로 재설정되었습니다: ${newPassword}`);
}

resetPassword().catch(console.error);
