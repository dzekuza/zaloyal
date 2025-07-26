-- 33-check-all-tables.sql
-- Check all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check all columns named user_id in any table
SELECT 
    table_schema,
    table_name,
    column_name,
    is_nullable,
    data_type,
    column_default
FROM information_schema.columns 
WHERE column_name = 'user_id'
ORDER BY table_schema, table_name;

-- Check the exact structure of the users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if there are any views named 'users'
SELECT 
    table_schema,
    table_name,
    table_type,
    view_definition
FROM information_schema.views 
WHERE table_name = 'users'
AND table_schema = 'public'; 