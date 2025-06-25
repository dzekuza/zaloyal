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
