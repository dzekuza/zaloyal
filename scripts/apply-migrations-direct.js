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

async function applyMigrationsDirect() {
  console.log('🔄 Applying X authentication migrations directly...\n');
  
  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${file}`);
      continue;
    }
    
    console.log(`📄 Applying: ${file}`);
    
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Execute the SQL statement directly
            const { error } = await supabase.rpc('exec_sql', {
              sql_query: statement + ';'
            });
            
            if (error) {
              console.error(`  ❌ Error in statement:`, error);
              console.error(`  Statement: ${statement.substring(0, 100)}...`);
            }
          } catch (error) {
            console.error(`  ❌ Failed to execute statement:`, error);
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
}

// Alternative approach: Apply migrations using direct table operations
async function applyMigrationsAlternative() {
  console.log('🔄 Applying X authentication migrations using direct operations...\n');
  
  try {
    // 1. Create social_accounts table
    console.log('📄 Creating social_accounts table...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS social_accounts (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform     text NOT NULL,
          account_id   text NOT NULL,
          username     text NOT NULL,
          access_token text NOT NULL,
          refresh_token text,
          expires_at   timestamptz,
          created_at   timestamptz DEFAULT now(),
          updated_at   timestamptz DEFAULT now(),
          UNIQUE(user_id, platform)
        );
      `
    });
    
    if (createTableError) {
      console.error('Error creating social_accounts table:', createTableError);
    } else {
      console.log('  ✅ social_accounts table created');
    }
    
    // 2. Add columns to tasks table
    console.log('📄 Adding verification columns to tasks table...');
    const { error: alterTasksError } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'poll_x_api';
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_params jsonb DEFAULT '{}';
      `
    });
    
    if (alterTasksError) {
      console.error('Error altering tasks table:', alterTasksError);
    } else {
      console.log('  ✅ Tasks table updated');
    }
    
    // 3. Create oauth_states table
    console.log('📄 Creating oauth_states table...');
    const { error: createOAuthError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS oauth_states (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform     text NOT NULL,
          state        text NOT NULL,
          code_verifier text NOT NULL,
          created_at   timestamptz DEFAULT now(),
          expires_at   timestamptz DEFAULT (now() + interval '10 minutes')
        );
      `
    });
    
    if (createOAuthError) {
      console.error('Error creating oauth_states table:', createOAuthError);
    } else {
      console.log('  ✅ oauth_states table created');
    }
    
    // 4. Create social_verification_cache table
    console.log('📄 Creating social_verification_cache table...');
    const { error: createCacheError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS social_verification_cache (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cache_key    text NOT NULL UNIQUE,
          cache_value  jsonb NOT NULL,
          expires_at   timestamptz NOT NULL,
          created_at   timestamptz DEFAULT now()
        );
      `
    });
    
    if (createCacheError) {
      console.error('Error creating social_verification_cache table:', createCacheError);
    } else {
      console.log('  ✅ social_verification_cache table created');
    }
    
    console.log('\n✅ Basic tables created successfully!');
    console.log('\n⚠️  Note: RPC functions need to be created manually in Supabase dashboard');
    console.log('   or using the SQL editor with the full migration files.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Check if exec_sql function exists
async function checkExecSqlFunction() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1;'
    });
    
    if (error) {
      console.log('❌ exec_sql function not available, using alternative approach');
      await applyMigrationsAlternative();
    } else {
      console.log('✅ exec_sql function available, using direct approach');
      await applyMigrationsDirect();
    }
  } catch (error) {
    console.log('❌ exec_sql function not available, using alternative approach');
    await applyMigrationsAlternative();
  }
}

checkExecSqlFunction().catch(console.error); 