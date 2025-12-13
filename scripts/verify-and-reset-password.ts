import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://supa.nuc.hmini.me';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAndResetPassword() {
  const username = '이지혜';
  const testPassword = '123456';
  
  console.log('=== 이지혜 계정 암호 검증 및 재설정 ===\n');
  
  // 1. 현재 사용자 정보 조회
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, username, email, password')
    .eq('username', username)
    .single();
  
  if (fetchError || !user) {
    console.error('❌ 사용자를 찾을 수 없습니다:', fetchError);
    return;
  }
  
  console.log(`✓ 사용자 확인: ID ${user.id}, username: ${user.username}`);
  console.log(`✓ 현재 저장된 해시: ${user.password?.substring(0, 20)}...`);
  
  // 2. 현재 암호로 검증 시도
  console.log(`\n[검증 1] 현재 암호로 "${testPassword}" 검증 시도...`);
  try {
    const isValid = await bcrypt.compare(testPassword, user.password || '');
    console.log(`결과: ${isValid ? '✅ 일치' : '❌ 불일치'}`);
  } catch (err) {
    console.log(`결과: ❌ 검증 중 오류 - ${err}`);
  }
  
  // 3. 새로운 해시 생성
  console.log(`\n[재설정] 새로운 암호 해시 생성 중...`);
  const newHash = await bcrypt.hash(testPassword, 10);
  console.log(`✓ 새 해시 생성됨: ${newHash.substring(0, 20)}...`);
  
  // 4. 새 해시가 올바른지 즉시 검증
  console.log(`\n[검증 2] 새 해시로 "${testPassword}" 검증 시도...`);
  const newHashValid = await bcrypt.compare(testPassword, newHash);
  console.log(`결과: ${newHashValid ? '✅ 일치' : '❌ 불일치'}`);
  
  if (!newHashValid) {
    console.error('❌ 새 해시 생성에 문제가 있습니다. 중단합니다.');
    return;
  }
  
  // 5. 데이터베이스 업데이트
  console.log(`\n[업데이트] 데이터베이스에 새 해시 저장 중...`);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: newHash })
    .eq('id', user.id);
  
  if (updateError) {
    console.error('❌ 암호 업데이트 실패:', updateError);
    return;
  }
  
  console.log('✅ 암호가 데이터베이스에 저장되었습니다.');
  
  // 6. 업데이트 후 재조회하여 확인
  console.log(`\n[검증 3] 업데이트 후 데이터베이스에서 재조회...`);
  const { data: updatedUser, error: refetchError } = await supabase
    .from('users')
    .select('id, username, password')
    .eq('username', username)
    .single();
  
  if (refetchError || !updatedUser) {
    console.error('❌ 재조회 실패:', refetchError);
    return;
  }
  
  console.log(`✓ 업데이트된 해시: ${updatedUser.password?.substring(0, 20)}...`);
  
  // 7. 최종 검증
  console.log(`\n[검증 4] 업데이트된 해시로 "${testPassword}" 최종 검증...`);
  const finalValid = await bcrypt.compare(testPassword, updatedUser.password || '');
  console.log(`결과: ${finalValid ? '✅ 일치' : '❌ 불일치'}`);
  
  if (finalValid) {
    console.log('\n🎉 암호가 성공적으로 재설정되었습니다!');
    console.log(`📌 사용자명: ${username}`);
    console.log(`📌 암호: ${testPassword}`);
  } else {
    console.log('\n⚠️ 암호가 저장되었지만 검증에 실패했습니다. 로그인 로직을 확인해야 합니다.');
  }
}

verifyAndResetPassword().catch(console.error);
