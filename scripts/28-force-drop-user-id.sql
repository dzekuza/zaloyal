-- 28-force-drop-user-id.sql
-- Force drop the user_id column from users table with all constraints
DO $$
BEGIN
    -- Drop the column if it exists, with CASCADE to remove any dependencies
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.users DROP COLUMN user_id CASCADE;
    END IF;
END $$; 