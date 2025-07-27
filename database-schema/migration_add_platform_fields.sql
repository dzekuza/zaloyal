-- Migration: Add platform-specific fields to social_accounts table
-- This separates wallet connections from social media accounts

-- Add platform-specific fields
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS wallet_network text,
ADD COLUMN IF NOT EXISTS x_account_id text,
ADD COLUMN IF NOT EXISTS x_username text,
ADD COLUMN IF NOT EXISTS x_access_token text,
ADD COLUMN IF NOT EXISTS x_access_token_secret text,
ADD COLUMN IF NOT EXISTS discord_account_id text,
ADD COLUMN IF NOT EXISTS discord_username text,
ADD COLUMN IF NOT EXISTS discord_access_token text,
ADD COLUMN IF NOT EXISTS discord_refresh_token text,
ADD COLUMN IF NOT EXISTS telegram_account_id text,
ADD COLUMN IF NOT EXISTS telegram_username text,
ADD COLUMN IF NOT EXISTS telegram_access_token text,
ADD COLUMN IF NOT EXISTS telegram_refresh_token text;

-- Add comments for clarity
COMMENT ON COLUMN social_accounts.wallet_address IS 'Wallet address for wallet connections';
COMMENT ON COLUMN social_accounts.wallet_network IS 'Blockchain network (ethereum, polygon, etc.)';
COMMENT ON COLUMN social_accounts.x_account_id IS 'X (Twitter) account ID';
COMMENT ON COLUMN social_accounts.x_username IS 'X (Twitter) username';
COMMENT ON COLUMN social_accounts.x_access_token IS 'X (Twitter) OAuth access token';
COMMENT ON COLUMN social_accounts.x_access_token_secret IS 'X (Twitter) OAuth access token secret';
COMMENT ON COLUMN social_accounts.discord_account_id IS 'Discord account ID';
COMMENT ON COLUMN social_accounts.discord_username IS 'Discord username';
COMMENT ON COLUMN social_accounts.discord_access_token IS 'Discord OAuth access token';
COMMENT ON COLUMN social_accounts.discord_refresh_token IS 'Discord OAuth refresh token';
COMMENT ON COLUMN social_accounts.telegram_account_id IS 'Telegram account ID';
COMMENT ON COLUMN social_accounts.telegram_username IS 'Telegram username';
COMMENT ON COLUMN social_accounts.telegram_access_token IS 'Telegram OAuth access token';
COMMENT ON COLUMN social_accounts.telegram_refresh_token IS 'Telegram OAuth refresh token';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_wallet_address ON social_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_social_accounts_x_account_id ON social_accounts(x_account_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_discord_account_id ON social_accounts(discord_account_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_telegram_account_id ON social_accounts(telegram_account_id); 