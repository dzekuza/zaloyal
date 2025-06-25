-- Add email authentication support
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'wallet'; -- 'wallet', 'email'
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- Smart contract info
    contract_address TEXT,
    blockchain_network TEXT, -- 'ethereum', 'polygon', 'bsc', etc.
    
    -- Social media links
    twitter_url TEXT,
    discord_url TEXT,
    telegram_url TEXT,
    github_url TEXT,
    medium_url TEXT,
    
    -- Project stats
    total_quests INTEGER DEFAULT 0,
    total_participants INTEGER DEFAULT 0,
    total_xp_distributed INTEGER DEFAULT 0,
    
    -- Status and verification
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[],
    category TEXT,
    founded_date DATE,
    team_size INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update quests table to reference projects instead of individual creators
ALTER TABLE quests ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create project members table (for teams)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    permissions TEXT[] DEFAULT ARRAY['view'], -- 'view', 'edit', 'create_quests', 'manage_members'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(project_id, user_id)
);

-- Create project applications table
CREATE TABLE IF NOT EXISTS project_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    project_description TEXT NOT NULL,
    website_url TEXT,
    contract_address TEXT,
    blockchain_network TEXT,
    twitter_url TEXT,
    discord_url TEXT,
    telegram_url TEXT,
    additional_info TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_verified ON projects(verified);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_user_id ON project_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);
CREATE INDEX IF NOT EXISTS idx_quests_project_id ON quests(project_id);

-- Update user role enum to include project roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'project_admin';

-- Create RLS policies for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Anyone can view approved projects" ON projects FOR SELECT USING (
    status = 'approved' OR 
    owner_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
    )
);

CREATE POLICY "Project owners can manage their projects" ON projects FOR ALL USING (
    owner_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
    )
);

-- Project members policies
CREATE POLICY "Project members can view their memberships" ON project_members FOR SELECT USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
    ) OR
    project_id IN (
        SELECT id FROM projects 
        WHERE owner_id IN (
            SELECT id FROM users 
            WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
            OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
        )
    )
);

-- Project applications policies
CREATE POLICY "Users can view own applications" ON project_applications FOR SELECT USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
    )
);

CREATE POLICY "Users can create applications" ON project_applications FOR INSERT WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
    )
);

-- Update quests policies to work with projects
DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
DROP POLICY IF EXISTS "Creators can manage own quests" ON quests;
DROP POLICY IF EXISTS "Creators can insert quests" ON quests;

CREATE POLICY "Anyone can view active project quests" ON quests FOR SELECT USING (
    status = 'active' AND project_id IN (SELECT id FROM projects WHERE status = 'approved')
    OR project_id IN (
        SELECT id FROM projects 
        WHERE owner_id IN (
            SELECT id FROM users 
            WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
            OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
        )
    )
);

CREATE POLICY "Project owners can manage project quests" ON quests FOR ALL USING (
    project_id IN (
        SELECT id FROM projects 
        WHERE owner_id IN (
            SELECT id FROM users 
            WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
            OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
        )
    )
);
