-- Simple Auth Fix - Only work with public schema

-- Create public.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  email text,
  username text,
  avatar_url text,
  role text DEFAULT 'participant',
  total_xp integer DEFAULT 0,
  level integer DEFAULT 1,
  completed_quests integer DEFAULT 0,
  bio text,
  social_links jsonb DEFAULT '{}',
  x_id text,
  x_username text,
  x_avatar_url text,
  discord_id text,
  discord_username text,
  discord_avatar_url text,
  telegram_id text,
  telegram_username text,
  telegram_avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create updated_at trigger for users table
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_users_updated_at ON public.users;
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  email text,
  username text,
  avatar_url text,
  role text,
  total_xp integer,
  level integer,
  completed_quests integer,
  bio text,
  social_links jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.username,
    u.avatar_url,
    u.role,
    u.total_xp,
    u.level,
    u.completed_quests,
    u.bio,
    u.social_links,
    u.created_at,
    u.updated_at
  FROM public.users u
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_profile TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username); 