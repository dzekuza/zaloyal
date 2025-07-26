-- ===========================================
-- FOCUSED TRIGGER FIX SCRIPT
-- ===========================================
-- This script fixes only the trigger timing issues
-- The functions are already working correctly
-- ===========================================

-- 1. DROP ONLY THE TRIGGERS (keep functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_set_user_role_creator ON public.projects;

-- 2. RECREATE TRIGGERS WITH CORRECT TIMING

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

-- 3. VERIFY THE TRIGGERS WERE CREATED CORRECTLY
SELECT 
    'Triggers fixed:' as info,
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

-- 4. EXPECTED RESULT:
-- Both triggers should show "AFTER" timing, not "INSTEAD OF"
-- =========================================== 