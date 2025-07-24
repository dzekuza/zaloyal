-- Create social_accounts table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS social_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text NOT NULL,              -- e.g. 'x', 'discord', 'telegram'
  account_id   text NOT NULL,              -- the platform user ID
  username     text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  
  -- Ensure one account per user per platform
  UNIQUE(user_id, platform)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_expires_at ON social_accounts(expires_at);

-- Add RLS policies
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own social accounts
CREATE POLICY "Users can view own social accounts" ON social_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own social accounts
CREATE POLICY "Users can insert own social accounts" ON social_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own social accounts
CREATE POLICY "Users can update own social accounts" ON social_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own social accounts
CREATE POLICY "Users can delete own social accounts" ON social_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_social_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_accounts_updated_at(); 