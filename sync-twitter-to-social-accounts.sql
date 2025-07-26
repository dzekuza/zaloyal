-- Sync Twitter identity data from auth.identities to public.social_accounts
-- This ensures we have complete data for task verification

-- First, let's see what Twitter data we have in auth.identities
SELECT 
    user_id,
    provider,
    identity_data->>'user_name' as twitter_username,
    identity_data->>'full_name' as twitter_display_name,
    identity_data->>'avatar_url' as twitter_avatar_url,
    identity_data->>'sub' as twitter_provider_id
FROM auth.identities 
WHERE user_id = '3b71bf72-694b-4445-9e83-fcc66cfc69ee' 
AND provider = 'twitter';

-- Now insert/upsert this data into social_accounts
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
    identity_data->>'sub' as access_token, -- Using provider_id as access_token for now
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

-- Verify the data was inserted correctly
SELECT * FROM public.social_accounts 
WHERE user_id = '3b71bf72-694b-4445-9e83-fcc66cfc69ee' 
AND platform = 'twitter'; 