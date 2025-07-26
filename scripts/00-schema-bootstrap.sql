-- 00-schema-bootstrap.sql
-- Bootstrap schema for Web3 Quest Platform (users, projects, quests, etc.)

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    wallet_address text UNIQUE,
    username text UNIQUE NOT NULL,
    email text UNIQUE NOT NULL,
    avatar_url text,
    role text DEFAULT 'participant',
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    rank integer,
    completed_quests integer DEFAULT 0,
    bio text,
    social_links jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    username text NOT NULL,
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    completed_quests integer DEFAULT 0,
    role text DEFAULT 'participant',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    website_url text,
    logo_url text,
    cover_image_url text,
    contract_address text,
    blockchain_network text,
    discord_url text,
    telegram_url text,
    github_url text,
    medium_url text,
    total_quests integer DEFAULT 0,
    total_participants integer DEFAULT 0,
    total_xp_distributed integer DEFAULT 0,
    status text DEFAULT 'pending',
    verified boolean DEFAULT false,
    featured boolean DEFAULT false,
    tags text[],
    category text,
    founded_date date,
    team_size integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- PROJECT MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.project_members (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    role text DEFAULT 'member',
    permissions text[] DEFAULT ARRAY['view'],
    joined_at timestamp with time zone DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- QUESTS TABLE
CREATE TABLE IF NOT EXISTS public.quests (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    total_xp integer DEFAULT 0,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    xp_reward integer DEFAULT 0,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- SOCIAL ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.social_accounts (
    id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    platform text NOT NULL,
    account_id text NOT NULL,
    username text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, platform)
);

-- TRIGGERS AND FUNCTIONS

-- A. Profile Creation on User Signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
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
    COALESCE(NEW.username, 'user_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8)),
    0,
    1,
    0,
    'participant'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- B. Project Owner Auto-Add as Member
CREATE OR REPLACE FUNCTION add_project_owner_as_member()
RETURNS trigger AS $$
BEGIN
    IF NEW.id IS NOT NULL AND NEW.owner_id IS NOT NULL THEN
        INSERT INTO project_members (
            project_id,
            user_id,
            role,
            permissions,
            joined_at
        )
        VALUES (
            NEW.id,
            NEW.owner_id,
            'owner',
            ARRAY['view', 'edit', 'create_quests', 'manage_members'],
            NOW()
        )
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_add_project_owner_as_member ON projects;
CREATE TRIGGER trg_add_project_owner_as_member
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION add_project_owner_as_member();

-- C. User Role Upgrade to 'Creator'
CREATE OR REPLACE FUNCTION set_user_role_creator()
RETURNS trigger AS $$
BEGIN
  UPDATE users
  SET role = 'creator'
  WHERE id = NEW.owner_id
    AND role NOT IN ('creator', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_user_role_creator ON projects;
CREATE TRIGGER trg_set_user_role_creator
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION set_user_role_creator();

-- End of schema bootstrap 