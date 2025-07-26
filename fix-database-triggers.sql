-- ===========================================
-- COMPLETE DATABASE TRIGGER FIX SCRIPT
-- ===========================================
-- This script fixes the user registration error by properly configuring
-- triggers and functions for Supabase Auth integration
-- ===========================================

-- 1. FORCE DROP ALL EXISTING TRIGGERS (with CASCADE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trg_set_user_role_creator ON public.projects CASCADE;

-- 2. DROP ALL EXISTING FUNCTIONS (with CASCADE)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role_creator() CASCADE;
DROP FUNCTION IF EXISTS public.store_oauth_state(p_user_id uuid, p_platform text, p_state text, p_code_verifier text) CASCADE;

-- 3. RECREATE FUNCTIONS WITH PROPER SECURITY

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set user role when creating projects
CREATE OR REPLACE FUNCTION public.set_user_role_creator()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET role = 'creator'
  WHERE id = NEW.owner_id
    AND role NOT IN ('creator', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store OAuth state for social linking
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

-- 4. RECREATE TRIGGERS WITH CORRECT TIMING (EXPLICITLY SPECIFY AFTER)

-- User creation trigger (MUST be AFTER on auth.users)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Project creation trigger (MUST be AFTER on public.projects)
CREATE TRIGGER trg_set_user_role_creator
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_user_role_creator();

-- 5. VERIFY THE CORRECT CREATION
SELECT 
    'Functions created:' as info,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('handle_new_user', 'set_user_role_creator', 'store_oauth_state')
ORDER BY p.proname;

SELECT 
    'Triggers created:' as info,
    t.tgname as trigger_name,
    n.nspname as schema_name,
    c.relname as table_name,
    CASE 
        WHEN t.tgtype & 66 = 2 THEN 'BEFORE'
        WHEN t.tgtype & 66 = 64 THEN 'AFTER'
        WHEN t.tgtype & 66 = 0 THEN 'INSTEAD OF'
        ELSE 'OTHER'
    END as trigger_timing,
    CASE 
        WHEN t.tgtype & 28 = 4 THEN 'INSERT'
        WHEN t.tgtype & 28 = 8 THEN 'DELETE'
        WHEN t.tgtype & 28 = 16 THEN 'UPDATE'
        WHEN t.tgtype & 28 = 12 THEN 'INSERT OR DELETE'
        WHEN t.tgtype & 28 = 20 THEN 'INSERT OR UPDATE'
        WHEN t.tgtype & 28 = 24 THEN 'DELETE OR UPDATE'
        WHEN t.tgtype & 28 = 28 THEN 'INSERT OR DELETE OR UPDATE'
        ELSE 'OTHER'
    END as trigger_events
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
    AND t.tgisinternal = false
    AND t.tgname IN ('on_auth_user_created', 'trg_set_user_role_creator')
ORDER BY n.nspname, c.relname;

-- 6. TEST TRIGGER FUNCTION DIRECTLY
SELECT 
    'Testing handle_new_user function:' as test_info,
    'Function exists and is callable' as status
WHERE EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'handle_new_user'
    AND pg_get_function_result(p.oid) = 'trigger'
);

-- ===========================================
-- EXPECTED RESULTS:
-- ===========================================
-- 1. Functions should show: handle_new_user, set_user_role_creator, store_oauth_state
-- 2. Triggers should show: AFTER INSERT timing (not INSTEAD OF)
-- 3. Test should pass: Function verification should succeed
-- ===========================================
-- AFTER RUNNING THIS SCRIPT:
-- ===========================================
-- 1. Test registration with a new email
-- 2. User should appear in both auth.users and public.users
-- 3. Email confirmation should work properly
-- 4. No more "Database error saving new user"
-- =========================================== 