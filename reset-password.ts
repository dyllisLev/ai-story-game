import "dotenv/config";
import { supabase } from "./server/supabase";
import bcrypt from "bcryptjs";

async function resetPassword(username: string, newPassword: string) {
  console.log(`Resetting password for ${username}...`);
  
  // 비밀번호 해시 생성
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Supabase에서 업데이트
  const { data, error } = await supabase
    .from("users")
    .update({ password: hashedPassword })
    .eq("username", username)
    .select();
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("✓ Password reset successful!");
    console.log(`Username: ${username}`);
    console.log(`New password: ${newPassword}`);
  }
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: npx tsx reset-password.ts <username> <new-password>");
  console.log("Example: npx tsx reset-password.ts dyllislev mypassword123");
  process.exit(1);
}

resetPassword(args[0], args[1]);
