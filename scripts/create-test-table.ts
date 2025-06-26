import { supabaseAdmin } from "../lib/supabase-admin"

async function createTestTable() {
  // Supabase JS does not support DDL directly, so we use the SQL RPC function
  const { error } = await supabaseAdmin.rpc('execute_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS test_table (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text
      );
    `
  })
  if (error) {
    console.error("Error creating table:", error)
  } else {
    console.log("Table 'test_table' created or already exists.")
  }
}

createTestTable() 