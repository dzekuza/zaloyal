-- Fix the auth user creation trigger
-- This migration moves the trigger from public.users to auth.users where it belongs

-- Drop the incorrect trigger
DROP TRIGGER IF EXISTS "on_auth_user_created" ON "public"."users";

-- Create the correct trigger on auth.users
CREATE OR REPLACE TRIGGER "on_auth_user_created" 
    AFTER INSERT ON "auth"."users" 
    FOR EACH ROW 
    EXECUTE FUNCTION "public"."handle_new_user"();

-- Also ensure the handle_new_user function creates a user in the public.users table
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    id, 
    email,
    username,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

  -- Insert into public.profiles table
  INSERT INTO public.profiles (
    id, 
    email,
    username,
    total_xp,
    level,
    completed_quests,
    role
  ) VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
    0,
    1,
    0,
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    updated_at = NOW();

  RETURN NEW;
END;
$$; 