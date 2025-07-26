-- 30-verify-users-schema.sql
-- Verify the current users table schema
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Test insert to verify schema is correct
INSERT INTO public.users (id, username, email, role, total_xp, level, completed_quests)
VALUES (
    gen_random_uuid(),
    'test_user',
    'test@example.com',
    'participant',
    0,
    1,
    0
) ON CONFLICT (id) DO NOTHING;

-- Clean up test data
DELETE FROM public.users WHERE email = 'test@example.com'; 