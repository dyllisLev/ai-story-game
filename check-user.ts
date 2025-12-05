import "dotenv/config";
import { supabase } from "./server/supabase";

async function checkUser() {
  console.log("Checking dyllislev user...\n");
  
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, created_at")
    .eq("username", "dyllislev")
    .single();
  
  if (error) {
    console.error("Error:", error.message);
    console.log("\nFetching all users...\n");
    
    const { data: allUsers, error: allError } = await supabase
      .from("users")
      .select("id, username, email")
      .order("id", { ascending: true });
    
    if (allError) {
      console.error("Error fetching all users:", allError.message);
    } else {
      console.log("All users in database:");
      console.table(allUsers);
    }
  } else {
    console.log("User found:");
    console.table([data]);
  }
}

checkUser();
