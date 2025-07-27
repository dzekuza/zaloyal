-- Create user record for existing authenticated user
-- This migration manually creates the user record for the existing authenticated user

-- Insert the existing user into public.users table
INSERT INTO public.users (
    id, 
    user_id,
    email,
    username,
    avatar_url,
    created_at,
    updated_at
) VALUES (
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0', 
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0',
    'dzekuza@gmail.com',
    'user_acdda35a',
    'https://pbs.twimg.com/profile_images/378800000690178267/ad9e42cd908d5cfe568a9e63ce2169f3_normal.jpeg',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

-- Insert into public.profiles table
INSERT INTO public.profiles (
    id, 
    user_id,
    email,
    username,
    total_xp,
    level,
    completed_quests,
    role
) VALUES (
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0', 
    'acdda35a-8c18-4c6d-ab21-464e0a5dbfe0',
    'dzekuza@gmail.com',
    'user_acdda35a',
    0,
    1,
    0,
    'user'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    updated_at = NOW(); 