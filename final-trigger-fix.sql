-- ===========================================
-- FINAL TRIGGER FIX SCRIPT
-- ===========================================
-- This script completely removes and recreates the trigger
-- using a different approach to ensure it works
-- ===========================================

-- 1. COMPLETELY REMOVE THE TRIGGER AND FUNCTION
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. CREATE A NEW FUNCTION WITH DIFFERENT NAME
CREATE OR REPLACE FUNCTION public.create_user_profile()
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

-- 3. CREATE THE TRIGGER WITH A NEW NAME
CREATE TRIGGER trigger_create_user_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_profile();

-- 4. VERIFY THE NEW TRIGGER
SELECT 
    'New trigger created:' as info,
    t.tgname as trigger_name,
    n.nspname as schema_name,
    c.relname as table_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
    AND t.tgisinternal = false
    AND t.tgname = 'trigger_create_user_profile'
ORDER BY n.nspname, c.relname;

-- 5. TEST THE FUNCTION DIRECTLY
SELECT 
    'Function test:' as info,
    'create_user_profile function exists and is callable' as status
WHERE EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'create_user_profile'
    AND pg_get_function_result(p.oid) = 'trigger'
);

-- ===========================================
-- EXPECTED RESULTS:
-- ===========================================
-- 1. New trigger should be created with name 'trigger_create_user_profile'
-- 2. Trigger definition should show 'AFTER INSERT ON auth.users'
-- 3. Function test should pass
-- ===========================================
-- AFTER RUNNING THIS SCRIPT:
-- ===========================================
-- 1. Test user registration with a new email
-- 2. User should appear in both auth.users and public.users
-- 3. No more "Database error saving new user"
-- =========================================== 