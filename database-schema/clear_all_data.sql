-- SQL Script to Clear All User Data
-- Run this in Supabase SQL Editor to clear all users and social accounts

-- First, let's see what we have
SELECT 
    'Current Data Summary' as info,
    COUNT(*) as users_count,
    (SELECT COUNT(*) FROM social_accounts) as social_accounts_count
FROM users;

-- Clear all social accounts first (due to foreign key constraints)
DELETE FROM social_accounts;

-- Clear all users
DELETE FROM users;

-- Verify the data is cleared
SELECT 
    'After Clearing' as info,
    COUNT(*) as users_count,
    (SELECT COUNT(*) FROM social_accounts) as social_accounts_count
FROM users;

-- Optional: Reset sequences if needed
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE social_accounts_id_seq RESTART WITH 1;

-- Success message
SELECT 'All user data has been cleared successfully!' as message; 