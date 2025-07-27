-- Create social account record for existing X-authenticated user
-- This migration manually creates the social account record for the existing user who authenticated with X

-- Insert the existing user's X social account
INSERT INTO public.social_accounts (
    user_id,
    platform,
    account_id,
    username,
    access_token,
    refresh_token,
    expires_at,
    created_at,
    updated_at
) VALUES (
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0',
    'x',
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0', -- Using user ID as account_id for now
    'user_acdda35a',
    '', -- Empty for now, will be updated via API calls
    null,
    null,
    NOW(),
    NOW()
)
ON CONFLICT (user_id, platform) DO UPDATE SET
    username = EXCLUDED.username,
    updated_at = NOW(); 