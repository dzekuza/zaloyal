-- Add RLS policies for social_accounts table
-- This script adds the missing Row Level Security policies for the social_accounts table

-- Enable RLS on social_accounts table
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own social accounts
CREATE POLICY "Users can view their own social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own social accounts
CREATE POLICY "Users can insert their own social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own social accounts
CREATE POLICY "Users can update their own social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own social accounts
CREATE POLICY "Users can delete their own social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate social accounts per user per platform
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_user_platform_unique 
  UNIQUE (user_id, platform);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_platform ON social_accounts(user_id, platform); 