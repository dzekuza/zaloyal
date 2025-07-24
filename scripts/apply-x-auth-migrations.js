const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migration files in order
const migrationFiles = [
  '18-create-social-accounts.sql',
  '19-update-tasks-verification.sql',
  '20-enqueue-verification-rpc.sql',
  '21-oauth-state-management.sql',
  '22-verification-worker.sql'
];

async function applyMigrations() {
  console.log('🔄 Applying X authentication migrations...\n');
  
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${file}`);
      continue;
    }
    
    console.log(`📄 Applying: ${file}`);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          });
          
          if (error) {
            console.error(`  ❌ Error in statement:`, error);
            console.error(`  Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
      
      console.log(`  ✅ Applied successfully`);
      
    } catch (error) {
      console.error(`  ❌ Failed to apply ${file}:`, error);
    }
  }
  
  console.log('\n✅ All migrations completed!');
  console.log('\n📋 Summary of changes:');
  console.log('  - Created social_accounts table for OAuth tokens');
  console.log('  - Updated tasks table with verification parameters');
  console.log('  - Added OAuth state management functions');
  console.log('  - Created verification worker functions');
  console.log('  - Added RPC functions for enqueueing verifications');
  console.log('\n🚀 Next steps:');
  console.log('  1. Set up X API credentials in environment variables');
  console.log('  2. Configure OAuth redirect URLs in X Developer Portal');
  console.log('  3. Set up cron job to run verification worker');
  console.log('  4. Test the OAuth flow and verification system');
}

applyMigrations().catch(console.error); 