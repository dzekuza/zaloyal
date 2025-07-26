-- 27-drop-user-id-column-users.sql
-- Drop the user_id column from users table as it's redundant with id
ALTER TABLE public.users DROP COLUMN IF EXISTS user_id; 