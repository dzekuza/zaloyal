-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    verified BOOLEAN DEFAULT FALSE,
    featured BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[],
    category TEXT,
    founded_date DATE,
    team_size INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT projects_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create project members table (for teams)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
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
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT applications_name_not_empty CHECK (length(trim(project_name)) > 0),
    CONSTRAINT applications_description_not_empty CHECK (length(trim(project_description)) > 0)
);

-- Add project_id column to existing quests table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'quests' AND column_name = 'project_id') THEN
        ALTER TABLE quests ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_verified ON projects(verified);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

CREATE INDEX IF NOT EXISTS idx_project_applications_user_id ON project_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_project_applications_status ON project_applications(status);
CREATE INDEX IF NOT EXISTS idx_project_applications_created_at ON project_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quests_project_id ON quests(project_id);

-- Enable RLS on new tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view approved projects" ON projects;
DROP POLICY IF EXISTS "Project owners can manage their projects" ON projects;
DROP POLICY IF EXISTS "Project members can view their memberships" ON project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Users can view own applications" ON project_applications;
DROP POLICY IF EXISTS "Users can create applications" ON project_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON project_applications;

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

CREATE POLICY "Project owners can insert projects" ON projects FOR INSERT WITH CHECK (
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

CREATE POLICY "Project owners can manage members" ON project_members FOR ALL USING (
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

CREATE POLICY "Admins can manage applications" ON project_applications FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE (wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        OR email = COALESCE(auth.jwt() ->> 'email', auth.email()))
        AND role = 'admin'
    )
);

-- Update existing quest policies to work with projects
DROP POLICY IF EXISTS "Anyone can view active project quests" ON quests;
DROP POLICY IF EXISTS "Project owners can manage project quests" ON quests;

-- Only update quest policies if the project_id column was successfully added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'quests' AND column_name = 'project_id') THEN
        
        -- Create new quest policies that work with projects
        CREATE POLICY "Anyone can view active project quests" ON quests FOR SELECT USING (
            status = 'active' AND (
                project_id IS NULL OR  -- Allow old quests without project_id
                project_id IN (SELECT id FROM projects WHERE status = 'approved')
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

        CREATE POLICY "Project owners can insert project quests" ON quests FOR INSERT WITH CHECK (
            project_id IN (
                SELECT id FROM projects 
                WHERE owner_id IN (
                    SELECT id FROM users 
                    WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
                    OR email = COALESCE(auth.jwt() ->> 'email', auth.email())
                )
            )
        );
    END IF;
END $$;

-- Create function to update project stats
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total_quests count
    UPDATE projects SET 
        total_quests = (
            SELECT COUNT(*) FROM quests 
            WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update project stats
DROP TRIGGER IF EXISTS update_project_stats_trigger ON quests;
CREATE TRIGGER update_project_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON quests
    FOR EACH ROW
    WHEN (NEW.project_id IS NOT NULL OR OLD.project_id IS NOT NULL)
    EXECUTE FUNCTION update_project_stats();

-- Create function to automatically add project owner as member
CREATE OR REPLACE FUNCTION add_project_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_members (project_id, user_id, role, permissions)
    VALUES (NEW.id, NEW.owner_id, 'owner', ARRAY['view', 'edit', 'create_quests', 'manage_members'])
    ON CONFLICT (project_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add project owner as member
DROP TRIGGER IF EXISTS add_project_owner_as_member_trigger ON projects;
CREATE TRIGGER add_project_owner_as_member_trigger
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION add_project_owner_as_member();

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample projects for testing (optional)
INSERT INTO projects (owner_id, name, description, status, verified, category, tags, website_url, twitter_url)
SELECT 
    u.id,
    'Sample DeFi Project',
    'A decentralized finance project focused on yield farming and liquidity provision.',
    'approved',
    true,
    'DeFi',
    ARRAY['defi', 'yield-farming', 'liquidity'],
    'https://example-defi.com',
    'https://twitter.com/example_defi'
FROM users u
WHERE u.role = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO projects (owner_id, name, description, status, verified, category, tags, website_url, discord_url)
SELECT 
    u.id,
    'NFT Marketplace',
    'A community-driven NFT marketplace with unique creator tools.',
    'approved',
    true,
    'NFT',
    ARRAY['nft', 'marketplace', 'creators'],
    'https://example-nft.com',
    'https://discord.gg/example-nft'
FROM users u
WHERE u.role = 'creator'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_applications TO authenticated;
GRANT USAGE ON SEQUENCE projects_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_members_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE project_applications_id_seq TO authenticated;

-- Create view for project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.verified,
    p.category,
    COUNT(DISTINCT q.id) as quest_count,
    COUNT(DISTINCT qp.user_id) as participant_count,
    COALESCE(SUM(q.xp_reward), 0) as total_xp_available,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN quests q ON p.id = q.project_id
LEFT JOIN quest_participants qp ON q.id = qp.quest_id
GROUP BY p.id, p.name, p.status, p.verified, p.category, p.created_at, p.updated_at;

GRANT SELECT ON project_stats TO authenticated;

COMMENT ON TABLE projects IS 'Projects that can create and manage quests';
COMMENT ON TABLE project_members IS 'Team members and their roles within projects';
COMMENT ON TABLE project_applications IS 'Applications to become a project owner';
COMMENT ON VIEW project_stats IS 'Aggregated statistics for each project';
