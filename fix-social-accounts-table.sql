-- ===========================================
-- FIX SOCIAL_ACCOUNTS TABLE FOR OAUTH 1.0A
-- ===========================================
-- This script adds missing columns needed for OAuth 1.0a support
-- ===========================================

-- Add missing columns for OAuth 1.0a support
ALTER TABLE public.social_accounts 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS access_token_secret TEXT;

-- Update the table structure to support both OAuth 1.0a and OAuth 2.0
-- OAuth 1.0a uses access_token_secret, OAuth 2.0 uses refresh_token

-- Verify the updated structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'social_accounts'
ORDER BY ordinal_position;

-- ===========================================
-- EXPECTED RESULTS:
-- ===========================================
-- The table should now have:
-- - display_name (TEXT)
-- - access_token_secret (TEXT)
-- - All existing columns
-- =========================================== 