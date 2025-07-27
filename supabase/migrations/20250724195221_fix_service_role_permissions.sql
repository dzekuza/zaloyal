-- Fix service role permissions for OAuth authentication
-- This migration adds the missing service_role policies for social_accounts and users tables

-- ============================================================================
-- SOCIAL_ACCOUNTS TABLE - Add service role policy
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can manage social accounts" ON public.social_accounts;

-- Add service role policy for social_accounts (for Supabase Auth during OAuth)
CREATE POLICY "Service role can manage social accounts" ON public.social_accounts
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- USERS TABLE - Add service role policy  
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- Add service role policy for users (for Supabase Auth during OAuth)
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- ENSURE RLS IS ENABLED
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; 