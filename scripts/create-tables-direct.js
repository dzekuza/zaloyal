const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesDirect() {
  console.log('🔄 Creating X authentication tables directly...\n');
  
  try {
    // 1. Create social_accounts table
    console.log('📄 Creating social_accounts table...');
    const { error: socialAccountsError } = await supabase
      .from('social_accounts')
      .select('id')
      .limit(1);
    
    if (socialAccountsError && socialAccountsError.code === 'PGRST116') {
      // Table doesn't exist, create it via SQL
      console.log('  Creating social_accounts table via SQL...');
      // We'll need to use the SQL editor in Supabase dashboard for this
      console.log('  ⚠️  Please run the following SQL in Supabase SQL Editor:');
      console.log(`
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
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
        CREATE INDEX IF NOT EXISTS idx_social_accounts_expires_at ON social_accounts(expires_at);
        
        -- Add RLS policies
        ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own social accounts" ON social_accounts
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert own social accounts" ON social_accounts
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own social accounts" ON social_accounts
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own social accounts" ON social_accounts
          FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log('  ✅ social_accounts table already exists');
    }
    
    // 2. Add columns to tasks table
    console.log('📄 Checking tasks table for verification columns...');
    const { data: tasksColumns, error: tasksColumnsError } = await supabase
      .from('tasks')
      .select('verification_method, verification_params')
      .limit(1);
    
    if (tasksColumnsError && tasksColumnsError.message.includes('column "verification_method" does not exist')) {
      console.log('  ⚠️  Please run the following SQL in Supabase SQL Editor:');
      console.log(`
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'poll_x_api';
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_params jsonb DEFAULT '{}';
        CREATE INDEX IF NOT EXISTS idx_tasks_verification_method ON tasks(verification_method);
      `);
    } else {
      console.log('  ✅ Tasks table already has verification columns');
    }
    
    // 3. Create oauth_states table
    console.log('📄 Creating oauth_states table...');
    const { error: oauthStatesError } = await supabase
      .from('oauth_states')
      .select('id')
      .limit(1);
    
    if (oauthStatesError && oauthStatesError.code === 'PGRST116') {
      console.log('  ⚠️  Please run the following SQL in Supabase SQL Editor:');
      console.log(`
        CREATE TABLE IF NOT EXISTS oauth_states (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform     text NOT NULL,
          state        text NOT NULL,
          code_verifier text NOT NULL,
          created_at   timestamptz DEFAULT now(),
          expires_at   timestamptz DEFAULT (now() + interval '10 minutes')
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON oauth_states(user_id, platform);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
        
        -- Add RLS
        ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage own OAuth states" ON oauth_states
          FOR ALL USING (auth.uid() = user_id);
      `);
    } else {
      console.log('  ✅ oauth_states table already exists');
    }
    
    // 4. Create social_verification_cache table
    console.log('📄 Creating social_verification_cache table...');
    const { error: cacheError } = await supabase
      .from('social_verification_cache')
      .select('id')
      .limit(1);
    
    if (cacheError && cacheError.code === 'PGRST116') {
      console.log('  ⚠️  Please run the following SQL in Supabase SQL Editor:');
      console.log(`
        CREATE TABLE IF NOT EXISTS social_verification_cache (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          cache_key    text NOT NULL UNIQUE,
          cache_value  jsonb NOT NULL,
          expires_at   timestamptz NOT NULL,
          created_at   timestamptz DEFAULT now()
        );
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_social_verification_cache_key ON social_verification_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_social_verification_cache_expires ON social_verification_cache(expires_at);
        
        -- Add RLS
        ALTER TABLE social_verification_cache ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Authenticated users can access verification cache" ON social_verification_cache
          FOR ALL USING (auth.role() = 'authenticated');
      `);
    } else {
      console.log('  ✅ social_verification_cache table already exists');
    }
    
    console.log('\n✅ Table creation instructions completed!');
    console.log('\n📋 Next steps:');
    console.log('  1. Run the SQL statements above in Supabase SQL Editor');
    console.log('  2. Create the RPC functions (see X_AUTH_SETUP.md)');
    console.log('  3. Set up X API credentials in environment variables');
    console.log('  4. Test the OAuth flow');
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

createTablesDirect().catch(console.error); 