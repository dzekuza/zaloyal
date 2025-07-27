-- Migration: Remove social media fields from users and projects tables
-- All social account data should be stored in social_accounts table

-- Remove social media related columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS wallet_address,
DROP COLUMN IF EXISTS discord_id,
DROP COLUMN IF EXISTS discord_username,
DROP COLUMN IF EXISTS discord_avatar_url,
DROP COLUMN IF EXISTS telegram_id,
DROP COLUMN IF EXISTS telegram_username,
DROP COLUMN IF EXISTS telegram_avatar_url,
DROP COLUMN IF EXISTS twitter_username,
DROP COLUMN IF EXISTS twitter_id,
DROP COLUMN IF EXISTS twitter_avatar_url,
DROP COLUMN IF EXISTS x_username,
DROP COLUMN IF EXISTS x_id,
DROP COLUMN IF EXISTS x_avatar_url;

-- Remove social media related columns from projects table
ALTER TABLE projects 
DROP COLUMN IF EXISTS x_username,
DROP COLUMN IF EXISTS x_id,
DROP COLUMN IF EXISTS x_avatar_url,
DROP COLUMN IF EXISTS discord_account_id,
DROP COLUMN IF EXISTS discord_username,
DROP COLUMN IF EXISTS discord_access_token,
DROP COLUMN IF EXISTS discord_refresh_token,
DROP COLUMN IF EXISTS telegram_account_id,
DROP COLUMN IF EXISTS telegram_username,
DROP COLUMN IF EXISTS telegram_access_token,
DROP COLUMN IF EXISTS telegram_refresh_token;

-- Update wallet linking function to not update users table
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
    
    RETURN TRUE;
END;
$function$;

-- Update wallet unlinking function to not update users table
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
    
    RETURN TRUE;
END;
$function$; 