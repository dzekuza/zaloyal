-- Fix users table access for authenticated users
-- This migration adds a simple policy to allow users to read their own profile

-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Allow public insert for signup" ON public.users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- Create simple, working policies
-- 1. Service role can do everything (for OAuth)
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Public can insert for signup
CREATE POLICY "Allow public insert for signup" ON public.users
    FOR INSERT TO public
    WITH CHECK (true);

-- 3. Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users
    FOR SELECT TO public
    USING (auth.uid() = id);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; 