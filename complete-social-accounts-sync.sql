-- Complete Social Accounts Sync Setup
-- This script ensures all social account data is synced between auth.identities and public.social_accounts

-- 1. Create a unified function to handle all social account syncing
CREATE OR REPLACE FUNCTION sync_social_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle Twitter identities
    IF NEW.provider = 'twitter' THEN
        INSERT INTO public.social_accounts (
            user_id,
            platform,
            account_id,
            username,
            display_name,
            access_token,
            created_at,
            updated_at
        )
        VALUES (
            NEW.user_id,
            'twitter',
            NEW.identity_data->>'sub',
            NEW.identity_data->>'user_name',
            NEW.identity_data->>'full_name',
            NEW.identity_data->>'sub',
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET
            account_id = EXCLUDED.account_id,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            access_token = EXCLUDED.access_token,
            updated_at = NOW();
    END IF;

    -- Handle Discord identities
    IF NEW.provider = 'discord' THEN
        INSERT INTO public.social_accounts (
            user_id,
            platform,
            account_id,
            username,
            display_name,
            access_token,
            created_at,
            updated_at
        )
        VALUES (
            NEW.user_id,
            'discord',
            NEW.identity_data->>'sub',
            NEW.identity_data->>'preferred_username',
            NEW.identity_data->>'full_name',
            NEW.identity_data->>'sub',
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET
            account_id = EXCLUDED.account_id,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            access_token = EXCLUDED.access_token,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_social_accounts ON auth.identities;

CREATE TRIGGER trigger_sync_social_accounts
    AFTER INSERT OR UPDATE ON auth.identities
    FOR EACH ROW
    EXECUTE FUNCTION sync_social_accounts();

-- 3. Sync existing Twitter data for our test user
INSERT INTO public.social_accounts (
    user_id,
    platform,
    account_id,
    username,
    display_name,
    access_token,
    created_at,
    updated_at
)
SELECT 
    user_id,
    'twitter' as platform,
    identity_data->>'sub' as account_id,
    identity_data->>'user_name' as username,
    identity_data->>'full_name' as display_name,
    identity_data->>'sub' as access_token,
    created_at,
    updated_at
FROM auth.identities 
WHERE user_id = '3b71bf72-694b-4445-9e83-fcc66cfc69ee' 
AND provider = 'twitter'
ON CONFLICT (user_id, platform) 
DO UPDATE SET
    account_id = EXCLUDED.account_id,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    access_token = EXCLUDED.access_token,
    updated_at = NOW();

-- 4. Verify the sync worked
SELECT 
    'Current social_accounts for user:' as info,
    user_id,
    platform,
    account_id,
    username,
    display_name
FROM public.social_accounts 
WHERE user_id = '3b71bf72-694b-4445-9e83-fcc66cfc69ee'
ORDER BY platform; 