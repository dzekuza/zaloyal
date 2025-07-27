-- Complete Migration: Update social_accounts table to separate wallet and social media accounts
-- This migration adds platform-specific fields and updates wallet linking functions

-- Step 1: Add platform-specific fields to social_accounts table
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

-- Step 2: Add comments for clarity
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

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_wallet_address ON social_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_social_accounts_x_account_id ON social_accounts(x_account_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_discord_account_id ON social_accounts(discord_account_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_telegram_account_id ON social_accounts(telegram_account_id);

-- Step 4: Update wallet linking function
DROP FUNCTION IF EXISTS public.link_wallet_to_user(uuid, text);

CREATE OR REPLACE FUNCTION public.link_wallet_to_user(p_user_id uuid, p_wallet_address text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    existing_user_id UUID;
    existing_social_account_id UUID;
BEGIN
    -- Check if wallet is already linked to another user
    SELECT user_id INTO existing_user_id
    FROM social_accounts 
    WHERE platform = 'solana' 
    AND wallet_address = p_wallet_address
    AND user_id != p_user_id
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Wallet address % is already linked to user %', p_wallet_address, existing_user_id;
    END IF;
    
    -- Check if user already has a wallet linked
    SELECT id INTO existing_social_account_id
    FROM social_accounts 
    WHERE user_id = p_user_id 
    AND platform = 'solana'
    LIMIT 1;
    
    -- If user already has a wallet, update it
    IF existing_social_account_id IS NOT NULL THEN
        UPDATE social_accounts 
        SET 
            wallet_address = p_wallet_address,
            wallet_network = 'solana',
            account_id = p_wallet_address, -- Legacy field for backward compatibility
            username = substring(p_wallet_address from 1 for 8) || '...', -- Legacy field
            access_token = p_wallet_address, -- Legacy field
            updated_at = NOW()
        WHERE id = existing_social_account_id;
    ELSE
        -- Insert new wallet connection
        INSERT INTO social_accounts (
            user_id,
            platform,
            wallet_address,
            wallet_network,
            account_id, -- Legacy field for backward compatibility
            username, -- Legacy field
            access_token, -- Legacy field
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            'solana',
            p_wallet_address,
            'solana',
            p_wallet_address,
            substring(p_wallet_address from 1 for 8) || '...',
            p_wallet_address,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Update users table wallet_address column
    UPDATE users 
    SET 
        wallet_address = p_wallet_address,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$function$;

-- Step 5: Update wallet unlinking function
DROP FUNCTION IF EXISTS public.unlink_wallet_from_user(uuid);

CREATE OR REPLACE FUNCTION public.unlink_wallet_from_user(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Remove wallet from social_accounts
    DELETE FROM social_accounts 
    WHERE user_id = p_user_id 
    AND platform = 'solana';
    
    -- Clear wallet_address from users table
    UPDATE users 
    SET 
        wallet_address = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$function$;

-- Step 6: Migrate existing data (optional - for existing installations)
-- This will populate the new fields with existing data
UPDATE social_accounts 
SET 
    wallet_address = account_id,
    wallet_network = 'solana'
WHERE platform = 'solana' 
AND wallet_address IS NULL;

UPDATE social_accounts 
SET 
    x_account_id = account_id,
    x_username = username,
    x_access_token = access_token,
    x_access_token_secret = access_token_secret
WHERE platform = 'twitter' 
AND x_account_id IS NULL;

-- Note: Discord and Telegram migrations would be added when those platforms are implemented 