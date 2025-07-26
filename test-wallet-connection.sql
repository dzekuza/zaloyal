-- ===========================================
-- TEST WALLET CONNECTION SETUP
-- ===========================================
-- This script tests the wallet connection functionality
-- ===========================================

-- 1. Check if social_accounts table has correct structure
SELECT 
    'social_accounts structure:' as info,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'social_accounts';

-- 2. Check RLS policies
SELECT 
    'RLS policies:' as info,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'social_accounts';

-- 3. Check unique constraints
SELECT 
    'Unique constraints:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'social_accounts'
    AND indexdef LIKE '%UNIQUE%';

-- 4. Test insert with dummy data (will be cleaned up)
INSERT INTO social_accounts (user_id, platform, account_id, username, access_token, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test',
    'test_wallet_address',
    'test_user',
    'test_token',
    NOW()
)
ON CONFLICT (user_id, platform) DO NOTHING;

-- 5. Verify insert worked
SELECT 
    'Test insert:' as info,
    COUNT(*) as test_records
FROM social_accounts 
WHERE platform = 'test';

-- 6. Clean up test data
DELETE FROM social_accounts WHERE platform = 'test';

-- 7. Verify cleanup
SELECT 
    'Cleanup verification:' as info,
    COUNT(*) as remaining_test_records
FROM social_accounts 
WHERE platform = 'test';

-- ===========================================
-- EXPECTED RESULTS:
-- ===========================================
-- 1. social_accounts should have the correct columns
-- 2. RLS policies should be in place
-- 3. Unique constraint on (user_id, platform) should exist
-- 4. Test insert should work
-- 5. Test records should be created
-- 6. Cleanup should work
-- 7. No remaining test records
-- =========================================== 