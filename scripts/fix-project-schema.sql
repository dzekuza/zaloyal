-- Fix projects table schema to ensure all required columns exist
-- This script adds missing columns that are needed for project creation

-- Add twitter_url column to projects table if it doesn't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add other social media URL columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS discord_url TEXT,
ADD COLUMN IF NOT EXISTS telegram_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS medium_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add smart contract related columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS contract_address TEXT,
ADD COLUMN IF NOT EXISTS blockchain_network TEXT;

-- Add project stats columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_quests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_participants INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_xp_distributed INTEGER DEFAULT 0;

-- Add project metadata columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS founded_date DATE,
ADD COLUMN IF NOT EXISTS team_size INTEGER;

-- Add project status columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add X (Twitter) identity columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS x_username TEXT,
ADD COLUMN IF NOT EXISTS x_id TEXT,
ADD COLUMN IF NOT EXISTS x_avatar_url TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_twitter_url ON projects(twitter_url);
CREATE INDEX IF NOT EXISTS idx_projects_discord_url ON projects(discord_url);
CREATE INDEX IF NOT EXISTS idx_projects_telegram_url ON projects(telegram_url);
CREATE INDEX IF NOT EXISTS idx_projects_github_url ON projects(github_url);
CREATE INDEX IF NOT EXISTS idx_projects_medium_url ON projects(medium_url);
CREATE INDEX IF NOT EXISTS idx_projects_website_url ON projects(website_url);
CREATE INDEX IF NOT EXISTS idx_projects_contract_address ON projects(contract_address);
CREATE INDEX IF NOT EXISTS idx_projects_blockchain_network ON projects(blockchain_network);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_verified ON projects(verified);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured);
CREATE INDEX IF NOT EXISTS idx_projects_x_username ON projects(x_username);

-- Add comments to document the columns
COMMENT ON COLUMN projects.twitter_url IS 'Project Twitter URL';
COMMENT ON COLUMN projects.discord_url IS 'Project Discord invite URL';
COMMENT ON COLUMN projects.telegram_url IS 'Project Telegram group URL';
COMMENT ON COLUMN projects.github_url IS 'Project GitHub repository URL';
COMMENT ON COLUMN projects.medium_url IS 'Project Medium blog URL';
COMMENT ON COLUMN projects.website_url IS 'Project official website URL';
COMMENT ON COLUMN projects.contract_address IS 'Project smart contract address';
COMMENT ON COLUMN projects.blockchain_network IS 'Blockchain network (ethereum, polygon, bsc, etc.)';
COMMENT ON COLUMN projects.x_username IS 'Project owner linked Twitter username';
COMMENT ON COLUMN projects.x_id IS 'Project owner linked Twitter user ID';
COMMENT ON COLUMN projects.x_avatar_url IS 'Project owner linked Twitter avatar URL';

-- Verify the schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position; 