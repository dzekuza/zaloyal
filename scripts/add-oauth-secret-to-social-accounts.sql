-- Add access_token_secret field to social_accounts table for OAuth 1.0a support
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS access_token_secret text;

-- Add index for access_token_secret
CREATE INDEX IF NOT EXISTS idx_social_accounts_access_token_secret ON social_accounts(access_token_secret);

-- Update existing records to have empty access_token_secret if null
UPDATE social_accounts 
SET access_token_secret = '' 
WHERE access_token_secret IS NULL;

-- Add comment to document the field
COMMENT ON COLUMN social_accounts.access_token_secret IS 'OAuth 1.0a access token secret (required for Twitter API v1.1)'; 