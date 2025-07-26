-- ===========================================
-- X OAUTH STATE MANAGEMENT SETUP
-- ===========================================
-- This script ensures proper OAuth state management for X/Twitter linking
-- ===========================================

-- 1. Create oauth_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.oauth_states (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    platform TEXT NOT NULL,
    state TEXT NOT NULL,
    code_verifier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
    UNIQUE(user_id, platform, state)
);

-- 2. Create or replace the store_oauth_state function
CREATE OR REPLACE FUNCTION public.store_oauth_state(
  p_user_id uuid, 
  p_platform text, 
  p_state text, 
  p_code_verifier text
)
RETURNS void AS $$
BEGIN
  INSERT INTO oauth_states (user_id, platform, state, code_verifier)
  VALUES (p_user_id, p_platform, p_state, p_code_verifier)
  ON CONFLICT (user_id, platform, state) DO UPDATE
   SET code_verifier = EXCLUDED.code_verifier,
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RLS policies for oauth_states table
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own OAuth states
CREATE POLICY "Users can insert their own OAuth states" ON public.oauth_states
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own OAuth states
CREATE POLICY "Users can select their own OAuth states" ON public.oauth_states
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to update their own OAuth states
CREATE POLICY "Users can update their own OAuth states" ON public.oauth_states
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own OAuth states
CREATE POLICY "Users can delete their own OAuth states" ON public.oauth_states
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Verify the setup
SELECT 
    'OAuth states table created:' as info,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'oauth_states';

SELECT 
    'store_oauth_state function created:' as info,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
    AND p.proname = 'store_oauth_state';

-- ===========================================
-- EXPECTED RESULTS:
-- ===========================================
-- 1. oauth_states table should be created
-- 2. store_oauth_state function should exist
-- 3. RLS policies should be created
-- =========================================== 