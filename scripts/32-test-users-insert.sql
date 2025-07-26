-- 32-test-users-insert.sql
-- Test insert with the exact same structure as the API
INSERT INTO public.users (
    id,
    wallet_address,
    username,
    email,
    avatar_url,
    role,
    total_xp,
    level,
    rank,
    completed_quests,
    bio,
    social_links,
    created_at,
    updated_at
) VALUES (
    'e3bebf22-b40c-4880-bac8-97ae2bf9b7a6',
    '5C2p48AXD135mUKxrRxfN23bf68NnfGwx2NGkyvFsAZz',
    '5C2p48AX',
    '5C2p48AXD135mUKxrRxfN23bf68NnfGwx2NGkyvFsAZz@wallet.zaloyal',
    null,
    'participant',
    0,
    1,
    null,
    0,
    null,
    '{}',
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET
    wallet_address = EXCLUDED.wallet_address,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = now();

-- Clean up test data
DELETE FROM public.users WHERE id = 'e3bebf22-b40c-4880-bac8-97ae2bf9b7a6'; 