-- 31-debug-user-id-issue.sql
-- Debug: Check all tables and views with user_id column
SELECT 
    table_schema,
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE column_name = 'user_id'
ORDER BY table_schema, table_name;

-- Check if there are any views named 'users'
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'users'
ORDER BY table_schema, table_name;

-- Force drop user_id from any table that has it
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_schema, table_name 
        FROM information_schema.columns 
        WHERE column_name = 'user_id' 
        AND table_schema = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS user_id CASCADE', r.table_schema, r.table_name);
        RAISE NOTICE 'Dropped user_id from %.%', r.table_schema, r.table_name;
    END LOOP;
END $$; 