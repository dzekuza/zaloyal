-- 26-drop-user-id-from-users.sql
ALTER TABLE public.users DROP COLUMN IF EXISTS user_id; 