const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySocialAccountsPolicies() {
  console.log('🔧 Social accounts RLS policies SQL:');
  console.log('⚠️  Please run the following SQL in Supabase SQL Editor:\n');
  
  const policies = [
    "-- Enable RLS on social_accounts table",
    "ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;",
    "",
    "-- Drop existing policies if they exist",
    "DROP POLICY IF EXISTS \"Users can view their own social accounts\" ON social_accounts;",
    "DROP POLICY IF EXISTS \"Users can insert their own social accounts\" ON social_accounts;",
    "DROP POLICY IF EXISTS \"Users can update their own social accounts\" ON social_accounts;",
    "DROP POLICY IF EXISTS \"Users can delete their own social accounts\" ON social_accounts;",
    "",
    "-- Create new policies",
    "CREATE POLICY \"Users can view their own social accounts\" ON social_accounts FOR SELECT USING (auth.uid() = user_id);",
    "CREATE POLICY \"Users can insert their own social accounts\" ON social_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);",
    "CREATE POLICY \"Users can update their own social accounts\" ON social_accounts FOR UPDATE USING (auth.uid() = user_id);",
    "CREATE POLICY \"Users can delete their own social accounts\" ON social_accounts FOR DELETE USING (auth.uid() = user_id);",
    "",
    "-- Add unique constraint to prevent duplicate social accounts per user per platform",
    "ALTER TABLE social_accounts ADD CONSTRAINT IF NOT EXISTS social_accounts_user_platform_unique UNIQUE (user_id, platform);",
    "",
    "-- Add indexes for better performance",
    "CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);",
    "CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform ON social_accounts(user_id, platform);"
  ];

  console.log(policies.join('\n'));
  console.log('\n🎉 Copy and paste the above SQL into your Supabase SQL Editor to apply the policies!');
}

applySocialAccountsPolicies().catch(console.error); 