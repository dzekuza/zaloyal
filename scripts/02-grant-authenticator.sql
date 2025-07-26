-- 02-grant-authenticator.sql
-- Grant permissions to the authenticator role for Supabase triggers and sync logic

GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.users TO authenticator;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.profiles TO authenticator;
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE public.project_members TO authenticator;
-- Add more tables as needed for your triggers/functions

-- End of authenticator grants 