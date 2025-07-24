-- =====================================================
-- COMPREHENSIVE DATABASE BACKUP
-- Generated: 2025-07-24T00:40:58.590Z
-- This file contains complete database structure AND data
-- =====================================================

-- PART 1: DATABASE STRUCTURE
-- =====================================================

-- Complete Database Backup Generated on 2025-07-24T00:39:37.477Z
-- This file contains all tables, policies, and functions from migration files

-- =====================================================
-- DATABASE STRUCTURE BACKUP
-- =====================================================

-- =====================================================
-- FROM: 01-create-tables.sql
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('participant', 'creator', 'admin');
CREATE TYPE quest_status AS ENUM ('draft', 'active', 'completed', 'paused');
CREATE TYPE task_type AS ENUM ('social', 'download', 'form', 'visit', 'learn');
CREATE TYPE social_action AS ENUM ('follow', 'join', 'like', 'retweet', 'subscribe');
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'verified', 'rejected');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'participant',
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    rank INTEGER,
    completed_quests INTEGER DEFAULT 0,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quest categories table
CREATE TABLE quest_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests table
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES quest_categories(id),
    image_url TEXT,
    total_xp INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    status quest_status DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    trending BOOLEAN DEFAULT FALSE,
    time_limit_days INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    requirements JSONB DEFAULT '{}',
    rewards JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    task_type task_type NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    required BOOLEAN DEFAULT TRUE,
    
    -- Social task fields
    social_action social_action,
    social_platform TEXT, -- 'twitter', 'telegram', 'discord', 'youtube', etc.
    social_url TEXT,
    social_username TEXT,
    social_post_id TEXT,
    
    -- Download task fields
    download_url TEXT,
    download_title TEXT,
    download_description TEXT,
    
    -- Form task fields
    form_url TEXT,
    form_title TEXT,
    form_description TEXT,
    
    -- Visit page task fields
    visit_url TEXT,
    visit_title TEXT,
    visit_description TEXT,
    visit_duration_seconds INTEGER,
    
    -- Learn task fields
    learn_content TEXT, -- Rich text content
    learn_questions JSONB, -- Array of questions with answers
    learn_passing_score INTEGER DEFAULT 80,
    
    -- Verification settings
    auto_verify BOOLEAN DEFAULT FALSE,
    verification_method TEXT,
    verification_params JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User quest progress table
CREATE TABLE user_quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    status quest_status DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_xp_earned INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    current_task_id UUID REFERENCES tasks(id),
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, quest_id)
);

-- User task submissions table
CREATE TABLE user_task_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    status task_status DEFAULT 'pending',
    submission_data JSONB DEFAULT '{}',
    verification_data JSONB DEFAULT '{}',
    xp_earned INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verifier_notes TEXT,
    
    UNIQUE(user_id, task_id)
);

-- User badges table
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    badge_icon TEXT,
    badge_rarity TEXT DEFAULT 'common',
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quest_id UUID REFERENCES quests(id),
    metadata JSONB DEFAULT '{}'
);

-- Leaderboards table
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    score INTEGER NOT NULL,
    completion_time INTERVAL,
    leaderboard_type TEXT DEFAULT 'global', -- 'global', 'quest', 'weekly', 'monthly'
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, quest_id, leaderboard_type, period_start)
);

-- Social verification cache table (for API rate limiting)
CREATE TABLE social_verification_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL, -- post_id, user_id, etc.
    verified BOOLEAN DEFAULT FALSE,
    verification_data JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, platform, action, target_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_total_xp ON users(total_xp DESC);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_featured ON quests(featured);
CREATE INDEX idx_quests_creator_id ON quests(creator_id);
CREATE INDEX idx_tasks_quest_id ON tasks(quest_id);
CREATE INDEX idx_tasks_order_index ON tasks(quest_id, order_index);
CREATE INDEX idx_user_quest_progress_user_id ON user_quest_progress(user_id);
CREATE INDEX idx_user_quest_progress_quest_id ON user_quest_progress(quest_id);
CREATE INDEX idx_user_task_submissions_user_id ON user_task_submissions(user_id);
CREATE INDEX idx_user_task_submissions_task_id ON user_task_submissions(task_id);
CREATE INDEX idx_leaderboards_rank ON leaderboards(leaderboard_type, rank);
CREATE INDEX idx_social_verification_cache_lookup ON social_verification_cache(user_id, platform, action, target_id);


-- =====================================================
-- FROM: 02-create-policies-fixed.sql
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view quest categories" ON quest_categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON quest_categories;
DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
DROP POLICY IF EXISTS "Creators can manage own quests" ON quests;
DROP POLICY IF EXISTS "Creators can insert quests" ON quests;
DROP POLICY IF EXISTS "Anyone can view tasks for active quests" ON tasks;
DROP POLICY IF EXISTS "Quest creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own progress" ON user_quest_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON user_quest_progress;
DROP POLICY IF EXISTS "Users can view own submissions" ON user_task_submissions;
DROP POLICY IF EXISTS "Users can manage own submissions" ON user_task_submissions;
DROP POLICY IF EXISTS "Anyone can view badges" ON user_badges;
DROP POLICY IF EXISTS "System can insert badges" ON user_badges;
DROP POLICY IF EXISTS "Anyone can view leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "System can manage leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Users can view own verification cache" ON social_verification_cache;
DROP POLICY IF EXISTS "Users can manage own verification cache" ON social_verification_cache;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_verification_cache ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (
    wallet_address = auth.jwt() ->> 'wallet_address' OR 
    id = (auth.jwt() ->> 'sub')::uuid
);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (
    wallet_address = auth.jwt() ->> 'wallet_address'
);

-- Quest categories policies (public read)
CREATE POLICY "Anyone can view quest categories" ON quest_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON quest_categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address' 
        AND role = 'admin'
    )
);

-- Quests policies
CREATE POLICY "Anyone can view active quests" ON quests FOR SELECT USING (
    status = 'active' OR 
    creator_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);
CREATE POLICY "Creators can manage own quests" ON quests FOR ALL USING (
    creator_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);
CREATE POLICY "Creators can insert quests" ON quests FOR INSERT WITH CHECK (
    creator_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);

-- Tasks policies
CREATE POLICY "Anyone can view tasks for active quests" ON tasks FOR SELECT USING (
    quest_id IN (SELECT id FROM quests WHERE status = 'active') OR
    quest_id IN (
        SELECT id FROM quests 
        WHERE creator_id = (
            SELECT id FROM users 
            WHERE wallet_address = auth.jwt() ->> 'wallet_address'
        )
    )
);
CREATE POLICY "Quest creators can manage tasks" ON tasks FOR ALL USING (
    quest_id IN (
        SELECT id FROM quests 
        WHERE creator_id = (
            SELECT id FROM users 
            WHERE wallet_address = auth.jwt() ->> 'wallet_address'
        )
    )
);

-- User quest progress policies
CREATE POLICY "Users can view own progress" ON user_quest_progress FOR SELECT USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);
CREATE POLICY "Users can manage own progress" ON user_quest_progress FOR ALL USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);

-- User task submissions policies
CREATE POLICY "Users can view own submissions" ON user_task_submissions FOR SELECT USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    ) OR
    quest_id IN (
        SELECT id FROM quests 
        WHERE creator_id = (
            SELECT id FROM users 
            WHERE wallet_address = auth.jwt() ->> 'wallet_address'
        )
    )
);
CREATE POLICY "Users can manage own submissions" ON user_task_submissions FOR ALL USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);

-- User badges policies
CREATE POLICY "Anyone can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Leaderboards policies
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "System can manage leaderboards" ON leaderboards FOR ALL USING (true);

-- Social verification cache policies
CREATE POLICY "Users can view own verification cache" ON social_verification_cache FOR SELECT USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);
CREATE POLICY "Users can manage own verification cache" ON social_verification_cache FOR ALL USING (
    user_id = (
        SELECT id FROM users 
        WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
);


-- =====================================================
-- FROM: 03-create-storage-bucket.sql
-- =====================================================

-- Create storage bucket for quest images, user avatars, and other assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'quest-assets',
    'quest-assets',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']
);

-- Create storage policies
CREATE POLICY "Anyone can view quest assets" ON storage.objects FOR SELECT USING (bucket_id = 'quest-assets');

CREATE POLICY "Authenticated users can upload quest assets" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'quest-assets' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (
    bucket_id = 'quest-assets' AND 
    auth.uid()::text = owner
);

CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (
    bucket_id = 'quest-assets' AND 
    auth.uid()::text = owner
);


-- =====================================================
-- FROM: 04-seed-data.sql
-- =====================================================

-- Insert quest categories
INSERT INTO quest_categories (id, name, description, icon, color) VALUES
    (uuid_generate_v4(), 'DeFi', 'Decentralized Finance protocols and applications', '💰', '#3B82F6'),
    (uuid_generate_v4(), 'NFT', 'Non-Fungible Tokens and digital collectibles', '🎨', '#8B5CF6'),
    (uuid_generate_v4(), 'Gaming', 'Web3 gaming and GameFi applications', '🎮', '#10B981'),
    (uuid_generate_v4(), 'Social', 'Social media and community engagement', '👥', '#F59E0B'),
    (uuid_generate_v4(), 'Education', 'Learning and educational content', '📚', '#EF4444'),
    (uuid_generate_v4(), 'Trading', 'Trading and investment strategies', '📈', '#06B6D4'),
    (uuid_generate_v4(), 'Staking', 'Staking and yield farming', '🌾', '#84CC16'),
    (uuid_generate_v4(), 'Governance', 'DAO governance and voting', '🗳️', '#EC4899');

-- Insert sample users (these will be created when users connect wallets)
INSERT INTO users (id, wallet_address, username, total_xp, level, completed_quests, role) VALUES
    (uuid_generate_v4(), '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', 'DeFiKing', 25750, 28, 45, 'creator'),
    (uuid_generate_v4(), '0x8ba1f109551bD432803012645Hac136c0532925a', 'CryptoNinja', 23200, 26, 41, 'participant'),
    (uuid_generate_v4(), '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'Web3Explorer', 21800, 24, 38, 'creator');

-- Insert sample quests
WITH defi_category AS (SELECT id FROM quest_categories WHERE name = 'DeFi' LIMIT 1),
     nft_category AS (SELECT id FROM quest_categories WHERE name = 'NFT' LIMIT 1),
     gaming_category AS (SELECT id FROM quest_categories WHERE name = 'Gaming' LIMIT 1),
     creator1 AS (SELECT id FROM users WHERE username = 'DeFiKing' LIMIT 1),
     creator2 AS (SELECT id FROM users WHERE username = 'Web3Explorer' LIMIT 1)

INSERT INTO quests (id, title, description, creator_id, category_id, total_xp, status, featured, trending, time_limit_days) VALUES
    (
        uuid_generate_v4(),
        'DeFi Master Challenge',
        'Complete various DeFi tasks and earn rewards while learning about decentralized finance protocols.',
        (SELECT id FROM creator1),
        (SELECT id FROM defi_category),
        2500,
        'active',
        true,
        true,
        30
    ),
    (
        uuid_generate_v4(),
        'NFT Collection Quest',
        'Discover, collect, and trade NFTs while completing social media challenges.',
        (SELECT id FROM creator2),
        (SELECT id FROM nft_category),
        1800,
        'active',
        false,
        true,
        45
    ),
    (
        uuid_generate_v4(),
        'Gaming Guild Onboarding',
        'Join our gaming community and complete challenges to unlock exclusive rewards.',
        (SELECT id FROM creator1),
        (SELECT id FROM gaming_category),
        3200,
        'active',
        true,
        false,
        60
    );


-- =====================================================
-- FROM: 05-create-functions.sql
-- =====================================================

-- Function to increment user XP and update level
CREATE OR REPLACE FUNCTION increment_user_xp(user_wallet TEXT, xp_amount INTEGER)
RETURNS void AS $$
DECLARE
    current_xp INTEGER;
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    -- Get current XP
    SELECT total_xp INTO current_xp 
    FROM users 
    WHERE wallet_address = user_wallet;
    
    -- Calculate new XP and level
    new_xp := current_xp + xp_amount;
    new_level := FLOOR(new_xp / 1000) + 1; -- 1000 XP per level
    
    -- Update user
    UPDATE users 
    SET 
        total_xp = new_xp,
        level = new_level,
        updated_at = NOW()
    WHERE wallet_address = user_wallet;
    
    -- Update quest progress if applicable
    -- This could be expanded to update quest completion status
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user rankings
CREATE OR REPLACE FUNCTION update_user_rankings()
RETURNS void AS $$
BEGIN
    WITH ranked_users AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY total_xp DESC, created_at ASC) as new_rank
        FROM users
        WHERE total_xp > 0
    )
    UPDATE users 
    SET rank = ranked_users.new_rank
    FROM ranked_users
    WHERE users.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;

-- Function to check quest completion
CREATE OR REPLACE FUNCTION check_quest_completion(user_wallet TEXT, quest_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    user_uuid UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_uuid FROM users WHERE wallet_address = user_wallet;
    
    -- Count total required tasks
    SELECT COUNT(*) INTO total_tasks 
    FROM tasks 
    WHERE quest_id = quest_uuid AND required = true;
    
    -- Count completed tasks
    SELECT COUNT(*) INTO completed_tasks
    FROM user_task_submissions uts
    JOIN tasks t ON uts.task_id = t.id
    WHERE uts.user_id = user_uuid 
    AND t.quest_id = quest_uuid 
    AND t.required = true
    AND uts.status = 'verified';
    
    RETURN completed_tasks >= total_tasks;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- FROM: 06-fix-storage-bucket.sql
-- =====================================================

-- Fix storage bucket creation and policies
DO $$
BEGIN
    -- Check if bucket exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'quest-assets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'quest-assets',
            'quest-assets',
            true,
            10485760, -- 10MB limit
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']
        );
    END IF;
END $$;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view quest assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload quest assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view quest assets" ON storage.objects FOR SELECT USING (bucket_id = 'quest-assets');

CREATE POLICY "Authenticated users can upload quest assets" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'quest-assets'
);

CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (
    bucket_id = 'quest-assets'
);

CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (
    bucket_id = 'quest-assets'
);


-- =====================================================
-- FROM: 07-update-existing-data.sql
-- =====================================================

-- Update existing quest categories if they exist, otherwise insert new ones
INSERT INTO quest_categories (id, name, description, icon, color) VALUES
    (gen_random_uuid(), 'DeFi', 'Decentralized Finance protocols and applications', '💰', '#3B82F6'),
    (gen_random_uuid(), 'NFT', 'Non-Fungible Tokens and digital collectibles', '🎨', '#8B5CF6'),
    (gen_random_uuid(), 'Gaming', 'Web3 gaming and GameFi applications', '🎮', '#10B981'),
    (gen_random_uuid(), 'Social', 'Social media and community engagement', '👥', '#F59E0B'),
    (gen_random_uuid(), 'Education', 'Learning and educational content', '📚', '#EF4444'),
    (gen_random_uuid(), 'Trading', 'Trading and investment strategies', '📈', '#06B6D4'),
    (gen_random_uuid(), 'Staking', 'Staking and yield farming', '🌾', '#84CC16'),
    (gen_random_uuid(), 'Governance', 'DAO governance and voting', '🗳️', '#EC4899')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color;

-- Insert sample users only if they don't exist
INSERT INTO users (id, wallet_address, username, total_xp, level, completed_quests, role) 
SELECT * FROM (VALUES
    (gen_random_uuid(), '0x742d35cc6634c0532925a3b8d4c0532925a3b8d4', 'DeFiKing', 25750, 28, 45, 'creator'::user_role),
    (gen_random_uuid(), '0x8ba1f109551bd432803012645hac136c0532925a', 'CryptoNinja', 23200, 26, 41, 'participant'::user_role),
    (gen_random_uuid(), '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', 'Web3Explorer', 21800, 24, 38, 'creator'::user_role)
) AS new_users(id, wallet_address, username, total_xp, level, completed_quests, role)
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE wallet_address = new_users.wallet_address
);

-- Insert sample quests only if categories and users exist
DO $$
DECLARE
    defi_category_id UUID;
    nft_category_id UUID;
    gaming_category_id UUID;
    creator1_id UUID;
    creator2_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO defi_category_id FROM quest_categories WHERE name = 'DeFi' LIMIT 1;
    SELECT id INTO nft_category_id FROM quest_categories WHERE name = 'NFT' LIMIT 1;
    SELECT id INTO gaming_category_id FROM quest_categories WHERE name = 'Gaming' LIMIT 1;
    
    -- Get creator IDs
    SELECT id INTO creator1_id FROM users WHERE username = 'DeFiKing' LIMIT 1;
    SELECT id INTO creator2_id FROM users WHERE username = 'Web3Explorer' LIMIT 1;
    
    -- Insert quests if categories and creators exist
    IF defi_category_id IS NOT NULL AND creator1_id IS NOT NULL THEN
        INSERT INTO quests (id, title, description, creator_id, category_id, total_xp, status, featured, trending, time_limit_days)
        SELECT gen_random_uuid(), 'DeFi Master Challenge', 'Complete various DeFi tasks and earn rewards while learning about decentralized finance protocols.', creator1_id, defi_category_id, 2500, 'active', true, true, 30
        WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'DeFi Master Challenge');
    END IF;
    
    IF nft_category_id IS NOT NULL AND creator2_id IS NOT NULL THEN
        INSERT INTO quests (id, title, description, creator_id, category_id, total_xp, status, featured, trending, time_limit_days)
        SELECT gen_random_uuid(), 'NFT Collection Quest', 'Discover, collect, and trade NFTs while completing social media challenges.', creator2_id, nft_category_id, 1800, 'active', false, true, 45
        WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'NFT Collection Quest');
    END IF;
    
    IF gaming_category_id IS NOT NULL AND creator1_id IS NOT NULL THEN
        INSERT INTO quests (id, title, description, creator_id, category_id, total_xp, status, featured, trending, time_limit_days)
        SELECT gen_random_uuid(), 'Gaming Guild Onboarding', 'Join our gaming community and complete challenges to unlock exclusive rewards.', creator1_id, gaming_category_id, 3200, 'active', true, false, 60
        WHERE NOT EXISTS (SELECT 1 FROM quests WHERE title = 'Gaming Guild Onboarding');
    END IF;
END $$;


-- =====================================================
-- FROM: 08-fix-rls-policies.sql
-- =====================================================

-- Fix RLS policies to work with anonymous authentication
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view quest categories" ON quest_categories;
DROP POLICY IF EXISTS "Only admins can manage categories" ON quest_categories;
DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
DROP POLICY IF EXISTS "Creators can manage own quests" ON quests;
DROP POLICY IF EXISTS "Creators can insert quests" ON quests;
DROP POLICY IF EXISTS "Anyone can view tasks for active quests" ON tasks;
DROP POLICY IF EXISTS "Quest creators can manage tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own progress" ON user_quest_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON user_quest_progress;
DROP POLICY IF EXISTS "Users can view own submissions" ON user_task_submissions;
DROP POLICY IF EXISTS "Users can manage own submissions" ON user_task_submissions;
DROP POLICY IF EXISTS "Anyone can view badges" ON user_badges;
DROP POLICY IF EXISTS "System can insert badges" ON user_badges;
DROP POLICY IF EXISTS "Anyone can view leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "System can manage leaderboards" ON leaderboards;
DROP POLICY IF EXISTS "Users can view own verification cache" ON social_verification_cache;
DROP POLICY IF EXISTS "Users can manage own verification cache" ON social_verification_cache;

-- Create more permissive policies for anonymous users
-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (
    wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (
    wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
);

-- Quest categories policies (public read)
CREATE POLICY "Anyone can view quest categories" ON quest_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON quest_categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        AND role = 'admin'
    )
);

-- Quests policies
CREATE POLICY "Anyone can view active quests" ON quests FOR SELECT USING (true);
CREATE POLICY "Creators can manage own quests" ON quests FOR ALL USING (
    creator_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);
CREATE POLICY "Creators can insert quests" ON quests FOR INSERT WITH CHECK (
    creator_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);

-- Tasks policies
CREATE POLICY "Anyone can view tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Quest creators can manage tasks" ON tasks FOR ALL USING (
    quest_id IN (
        SELECT id FROM quests 
        WHERE creator_id IN (
            SELECT id FROM users 
            WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        )
    )
);

-- User quest progress policies
CREATE POLICY "Users can view own progress" ON user_quest_progress FOR SELECT USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);
CREATE POLICY "Users can manage own progress" ON user_quest_progress FOR ALL USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);

-- User task submissions policies
CREATE POLICY "Users can view relevant submissions" ON user_task_submissions FOR SELECT USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    ) OR
    quest_id IN (
        SELECT id FROM quests 
        WHERE creator_id IN (
            SELECT id FROM users 
            WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
        )
    )
);
CREATE POLICY "Users can manage own submissions" ON user_task_submissions FOR ALL USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);

-- User badges policies
CREATE POLICY "Anyone can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Leaderboards policies
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "System can manage leaderboards" ON leaderboards FOR ALL USING (true);

-- Social verification cache policies
CREATE POLICY "Users can view own verification cache" ON social_verification_cache FOR SELECT USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);
CREATE POLICY "Users can manage own verification cache" ON social_verification_cache FOR ALL USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = COALESCE(auth.jwt() ->> 'wallet_address', current_setting('app.current_user_wallet', true))
    )
);


-- =====================================================
-- FROM: 09-add-projects-and-auth.sql
-- =====================================================

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


-- =====================================================
-- FROM: 10-lowercase-wallet-addresses.sql
-- =====================================================

-- Migration: Lowercase all wallet addresses in the users table
UPDATE users SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL; 

-- =====================================================
-- FROM: 11-add-twitter-to-users.sql
-- =====================================================

-- Migration: Add X (Twitter) columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_avatar_url TEXT; 

-- =====================================================
-- FROM: 11-add-missing-task-fields.sql
-- =====================================================

-- Add missing columns for social/Twitter tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_tweet text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tweet_actions text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tweet_words text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS space_password text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS show_after_end boolean; 

-- =====================================================
-- FROM: 12-create-telegram-verifications.sql
-- =====================================================

-- Create telegram_verifications table
CREATE TABLE IF NOT EXISTS telegram_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_username TEXT,
  channel_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_verifications_user_id ON telegram_verifications(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_verifications_verified ON telegram_verifications(verified);

-- Enable RLS
ALTER TABLE telegram_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own telegram verifications" ON telegram_verifications
  FOR SELECT USING (
    telegram_user_id IN (
      SELECT telegram_user_id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

CREATE POLICY "Service role can manage all telegram verifications" ON telegram_verifications
  FOR ALL USING (auth.role() = 'service_role'); 

-- =====================================================
-- FROM: 12-fix-project-ownership.sql
-- =====================================================

-- Fix project ownership to match quest creators
-- This script updates project ownership to match the quest creator

UPDATE projects 
SET owner_id = quests.creator_id
FROM quests 
WHERE projects.id = quests.project_id 
AND quests.project_id IS NOT NULL;

-- Verify the fix
SELECT 
  q.id as quest_id,
  q.title as quest_title,
  q.creator_id as quest_creator,
  p.id as project_id,
  p.name as project_name,
  p.owner_id as project_owner
FROM quests q
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.project_id IS NOT NULL; 

-- =====================================================
-- FROM: 13-add-response-management-columns.sql
-- =====================================================

-- Add missing columns to user_task_submissions table for response management
ALTER TABLE user_task_submissions 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS social_username TEXT,
ADD COLUMN IF NOT EXISTS social_post_url TEXT,
ADD COLUMN IF NOT EXISTS quiz_answers JSONB,
ADD COLUMN IF NOT EXISTS manual_verification_note TEXT,
ADD COLUMN IF NOT EXISTS xp_removed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS xp_removal_reason TEXT,
ADD COLUMN IF NOT EXISTS xp_removed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_quest_verified 
ON user_task_submissions(quest_id, verified);

-- Create index for XP removal tracking
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_xp_removed 
ON user_task_submissions(xp_removed);

-- Update existing records to set verified = true where status = 'verified'
UPDATE user_task_submissions 
SET verified = true 
WHERE status = 'verified';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_task_submissions_updated_at 
    BEFORE UPDATE ON user_task_submissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 

-- =====================================================
-- FROM: 14-create-task-verifications.sql
-- =====================================================

-- 14-create-task-verifications.sql

create table if not exists task_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_id uuid not null,
  quest_id uuid,
  type text not null,
  status text not null default 'pending', -- pending, success, failed
  attempts int not null default 0,
  last_attempt timestamptz,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_task_verifications_user_task on task_verifications (user_id, task_id); 

-- Enable RLS
alter table task_verifications enable row level security;

-- Policy: Allow users to insert their own verification attempts
create policy "Allow insert for own user_id" on task_verifications
  for insert using (auth.uid() = user_id);

-- Policy: Allow users to select their own verification records
create policy "Allow select for own user_id" on task_verifications
  for select using (auth.uid() = user_id);

-- Policy: Allow admins to update status (example: role = 'admin')
create policy "Allow admin update" on task_verifications
  for update using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));

-- Block all other access by default 

-- =====================================================
-- FROM: 15-twitter-identity-functions.sql
-- =====================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_twitter_identity(UUID);
DROP FUNCTION IF EXISTS update_user_twitter_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS clear_user_twitter_profile(UUID);
DROP FUNCTION IF EXISTS sync_twitter_identity(UUID);

-- Function to get Twitter identity for a user
CREATE OR REPLACE FUNCTION get_twitter_identity(user_id UUID)
RETURNS TABLE(
  id TEXT,
  user_name TEXT,
  avatar_url TEXT,
  profile_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.x_id,
    u.x_username as user_name,
    u.x_avatar_url as avatar_url,
    CASE 
      WHEN u.x_username IS NOT NULL 
      THEN 'https://x.com/' || u.x_username
      ELSE NULL
    END as profile_url
  FROM users u
  WHERE u.id = get_twitter_identity.user_id
    AND u.x_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile with Twitter data
CREATE OR REPLACE FUNCTION update_user_twitter_profile(
  user_id UUID,
  twitter_id TEXT,
  twitter_username TEXT,
  twitter_avatar_url TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    x_id = update_user_twitter_profile.twitter_id,
    x_username = update_user_twitter_profile.twitter_username,
    x_avatar_url = update_user_twitter_profile.twitter_avatar_url,
    updated_at = NOW()
  WHERE id = update_user_twitter_profile.user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear Twitter profile data
CREATE OR REPLACE FUNCTION clear_user_twitter_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    x_id = NULL,
    x_username = NULL,
    x_avatar_url = NULL,
    updated_at = NOW()
  WHERE id = clear_user_twitter_profile.user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync Twitter identity with user profile
CREATE OR REPLACE FUNCTION sync_twitter_identity(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  twitter_identity RECORD;
BEGIN
  -- Get Twitter identity from auth.identities
  SELECT 
    i.id,
    i.identity_data->>'user_name' as user_name,
    i.identity_data->>'avatar_url' as avatar_url
  INTO twitter_identity
  FROM auth.identities i
  WHERE i.user_id = sync_twitter_identity.user_id
    AND i.provider = 'twitter'
  LIMIT 1;
  
  -- If Twitter identity exists, update user profile
  IF FOUND THEN
    UPDATE users 
    SET 
      x_id = twitter_identity.id,
      x_username = twitter_identity.user_name,
      x_avatar_url = twitter_identity.avatar_url,
      updated_at = NOW()
    WHERE id = sync_twitter_identity.user_id;
    
    RETURN TRUE;
  ELSE
    -- Clear Twitter data if no identity found
    UPDATE users 
    SET 
      x_id = NULL,
      x_username = NULL,
      x_avatar_url = NULL,
      updated_at = NOW()
    WHERE id = sync_twitter_identity.user_id;
    
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_twitter_identity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_twitter_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_twitter_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_twitter_identity(UUID) TO authenticated; 

-- =====================================================
-- FROM: 16-add-x-columns-to-users.sql
-- =====================================================

-- Migration: Add X (Twitter) columns to users table with correct naming
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_avatar_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_x_id ON users(x_id);
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username); 

-- =====================================================
-- FROM: 17-add-twitter-url-to-projects.sql
-- =====================================================

-- Add twitter_url column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add index for twitter_url column
CREATE INDEX IF NOT EXISTS idx_projects_twitter_url ON public.projects USING btree (twitter_url) TABLESPACE pg_default; 

-- =====================================================
-- BACKUP SUMMARY
-- =====================================================
-- Generated: 2025-07-24T00:39:37.574Z
-- Tables: 13
-- Policies: 57
-- Functions: 8
-- Migration Files: 19
-- =====================================================


-- =====================================================
-- PART 2: CURRENT DATA
-- =====================================================

-- Data Backup - 2025-07-24T00:40:11.398Z
-- This file contains INSERT statements for all current data

-- Table: users (4 rows)
INSERT INTO "users" ("id", "wallet_address", "username", "email", "avatar_url", "role", "total_xp", "level", "rank", "completed_quests", "bio", "social_links", "created_at", "updated_at", "discord_id", "discord_username", "discord_avatar_url", "x_id", "x_username", "x_avatar_url", "telegram_id", "telegram_username", "telegram_avatar_url") VALUES ('96b34094-9bb7-4cfd-a78d-0d9e5c96b608', NULL, NULL, 'dzekuza@gmail.com', NULL, 'participant', 0, 1, NULL, 0, NULL, '{}', '2025-07-22T20:58:36.705839+00:00', '2025-07-24T00:01:19.542406+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "wallet_address", "username", "email", "avatar_url", "role", "total_xp", "level", "rank", "completed_quests", "bio", "social_links", "created_at", "updated_at", "discord_id", "discord_username", "discord_avatar_url", "x_id", "x_username", "x_avatar_url", "telegram_id", "telegram_username", "telegram_avatar_url") VALUES ('fbf63d01-4b1f-4837-8dde-cdd4e078e2a3', 'homytbfxxhpubgmms4sxashn4wxtupovfc2jtgpcrlnw', 'arva', 'arvacrypto@proton.me', '', 'participant', 0, 1, NULL, 0, '', '{}', '2025-07-03T15:59:52.926033+00:00', '2025-07-03T15:59:52.926033+00:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "wallet_address", "username", "email", "avatar_url", "role", "total_xp", "level", "rank", "completed_quests", "bio", "social_links", "created_at", "updated_at", "discord_id", "discord_username", "discord_avatar_url", "x_id", "x_username", "x_avatar_url", "telegram_id", "telegram_username", "telegram_avatar_url") VALUES ('1a268a35-af47-47a6-8c0b-a14ccce077aa', 'agfxgyvgzrpn5drfufutwnfvwn2wtrasydyo1znx9tgg', NULL, '3dgenesisai@gmail.com', NULL, 'participant', 0, 1, NULL, 0, NULL, '{}', '2025-07-16T18:41:03.276108+00:00', '2025-07-16T18:41:03.276108+00:00', NULL, NULL, NULL, NULL, '3dgenesisapp', NULL, NULL, NULL, NULL);
INSERT INTO "users" ("id", "wallet_address", "username", "email", "avatar_url", "role", "total_xp", "level", "rank", "completed_quests", "bio", "social_links", "created_at", "updated_at", "discord_id", "discord_username", "discord_avatar_url", "x_id", "x_username", "x_avatar_url", "telegram_id", "telegram_username", "telegram_avatar_url") VALUES ('e89bff69-126e-4653-aef3-0b35d9ccdb84', '5c2p48axd135mukxrrxfn23bf68nnfgwx2ngkyvfsazz', 'Best', 'richcase1975@gmail.com', '', 'creator', 0, 1, NULL, 0, '', '{}', '2025-07-22T15:55:58.963573+00:00', '2025-07-23T21:33:51.010729+00:00', NULL, NULL, NULL, '847136095343185923', 'RysardGvozdovic', 'https://pbs.twimg.com/profile_images/1770402356368187392/Pldh7Dnf_400x400.jpg', NULL, NULL, NULL);

-- Table: projects (2 rows)
INSERT INTO "projects" ("id", "owner_id", "name", "description", "website_url", "logo_url", "cover_image_url", "contract_address", "blockchain_network", "discord_url", "telegram_url", "github_url", "medium_url", "total_quests", "total_participants", "total_xp_distributed", "status", "verified", "featured", "tags", "category", "founded_date", "team_size", "created_at", "updated_at", "owner_discord_id", "owner_discord_username", "owner_discord_avatar_url", "twitter_url") VALUES ('d74b1606-6420-4075-9fc1-57a691d638bd', 'fbf63d01-4b1f-4837-8dde-cdd4e078e2a3', 'Bilyv LFG', 'Bilyver', 'https://blv.co', '', '', 'Ey59PH7Z4BFU4HjyKnyMdWt5GGN76KazTAwQihoUXRnk', 'polygon', '', '', '', '', 0, 0, 0, 'approved', false, false, NULL, 'Education', NULL, NULL, '2025-07-03T16:07:08.851554+00:00', '2025-07-03T16:12:49.031405+00:00', NULL, NULL, NULL, NULL);
INSERT INTO "projects" ("id", "owner_id", "name", "description", "website_url", "logo_url", "cover_image_url", "contract_address", "blockchain_network", "discord_url", "telegram_url", "github_url", "medium_url", "total_quests", "total_participants", "total_xp_distributed", "status", "verified", "featured", "tags", "category", "founded_date", "team_size", "created_at", "updated_at", "owner_discord_id", "owner_discord_username", "owner_discord_avatar_url", "twitter_url") VALUES ('9ce2ed50-a243-4900-b897-138df569a816', 'e89bff69-126e-4653-aef3-0b35d9ccdb84', 'My own project', 'Welcome', 'gvozdovic.com', 'https://vihyvzsohwvspoptztjt.supabase.co/storage/v1/object/public/publicprofile/quest-images/1753200080392-g9k0lr94hs7.jpg', 'https://vihyvzsohwvspoptztjt.supabase.co/storage/v1/object/public/publicprofile/quest-images/1753200083745-8zwod2cy2jr.webp', '2VNVoy64hpirKhVgEgbjUjGtqpTPqESocrfZfx2gRFCb', 'solana', NULL, NULL, NULL, NULL, 1, 0, 0, 'approved', false, false, NULL, 'NFT', NULL, NULL, '2025-07-22T16:01:26.032973+00:00', '2025-07-22T17:49:39.540969+00:00', NULL, NULL, NULL, NULL);

-- Table: quests (1 rows)
INSERT INTO "quests" ("id", "title", "description", "creator_id", "category_id", "image_url", "total_xp", "participant_count", "status", "featured", "trending", "time_limit_days", "start_date", "end_date", "requirements", "rewards", "metadata", "created_at", "updated_at", "project_id") VALUES ('10b7943b-91ce-4846-b4a1-283d9daf3015', 'New test', 'hhi', 'e89bff69-126e-4653-aef3-0b35d9ccdb84', NULL, 'https://vihyvzsohwvspoptztjt.supabase.co/storage/v1/object/public/publicprofile/quest-images/temp-7haq7ejg1ra.jpg', 1110, 0, 'active', false, false, NULL, NULL, NULL, '{}', '{}', '{}', '2025-07-22T17:49:39.540969+00:00', '2025-07-22T17:49:39.540969+00:00', '9ce2ed50-a243-4900-b897-138df569a816');

-- Table: tasks (3 rows)
INSERT INTO "tasks" ("id", "quest_id", "title", "description", "task_type", "xp_reward", "order_index", "required", "social_action", "social_platform", "social_url", "social_username", "social_post_id", "download_url", "download_title", "download_description", "form_url", "form_title", "form_description", "visit_url", "visit_title", "visit_description", "visit_duration_seconds", "learn_content", "learn_questions", "learn_passing_score", "auto_verify", "verification_method", "verification_params", "created_at", "updated_at", "default_tweet", "tweet_actions", "tweet_words", "space_password", "show_after_end") VALUES ('d7b58d51-ee53-431f-b269-38206ce1206c', '10b7943b-91ce-4846-b4a1-283d9daf3015', '', '', 'social', 100, 0, true, 'follow', 'twitter', 'https://x.com/RysardGvozdovic', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80, false, NULL, '{}', '2025-07-22T18:12:26.527882+00:00', '2025-07-22T18:12:26.527882+00:00', NULL, NULL, NULL, NULL, NULL);
INSERT INTO "tasks" ("id", "quest_id", "title", "description", "task_type", "xp_reward", "order_index", "required", "social_action", "social_platform", "social_url", "social_username", "social_post_id", "download_url", "download_title", "download_description", "form_url", "form_title", "form_description", "visit_url", "visit_title", "visit_description", "visit_duration_seconds", "learn_content", "learn_questions", "learn_passing_score", "auto_verify", "verification_method", "verification_params", "created_at", "updated_at", "default_tweet", "tweet_actions", "tweet_words", "space_password", "show_after_end") VALUES ('a047682d-9899-4b4c-b143-3c6b312e5243', '10b7943b-91ce-4846-b4a1-283d9daf3015', '', '', 'learn', 100, 0, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'd vc', '{"answers":["xcsc","cs","cscs","qdd"],"question":"vdd ","description":"d vc","multiSelect":false,"correctAnswers":[2]}', 80, false, NULL, '{}', '2025-07-22T22:15:09.822805+00:00', '2025-07-22T22:15:09.822805+00:00', NULL, NULL, NULL, NULL, NULL);
INSERT INTO "tasks" ("id", "quest_id", "title", "description", "task_type", "xp_reward", "order_index", "required", "social_action", "social_platform", "social_url", "social_username", "social_post_id", "download_url", "download_title", "download_description", "form_url", "form_title", "form_description", "visit_url", "visit_title", "visit_description", "visit_duration_seconds", "learn_content", "learn_questions", "learn_passing_score", "auto_verify", "verification_method", "verification_params", "created_at", "updated_at", "default_tweet", "tweet_actions", "tweet_words", "space_password", "show_after_end") VALUES ('6a8ee021-e184-4664-87d2-c21e5eaef53a', '10b7943b-91ce-4846-b4a1-283d9daf3015', '', '', 'social', 100, 0, true, 'like', 'twitter', 'https://x.com/RysardGvozdovic/status/1862218987725083005', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 80, false, NULL, '{}', '2025-07-23T23:19:12.052804+00:00', '2025-07-23T23:19:12.052804+00:00', NULL, NULL, NULL, NULL, NULL);

-- Table: user_task_submissions (No data)

-- Table: user_quest_progress (No data)

-- Table: user_badges (No data)

-- Table: telegram_verifications (No data)

-- Table: discord_verifications (ERROR: relation "public.discord_verifications" does not exist)
-- No data extracted due to error

-- Table: twitter_verifications (ERROR: relation "public.twitter_verifications" does not exist)
-- No data extracted due to error



-- =====================================================
-- BACKUP COMPLETE
-- =====================================================
-- To restore this database:
-- 1. Create a new Supabase project
-- 2. Run this entire SQL file
-- 3. Configure environment variables
-- =====================================================
