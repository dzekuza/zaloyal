-- Fix missing schema elements identified in analysis

-- 1. Add missing columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'social';

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_action text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_url text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_post_id text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_social_action ON tasks(social_action);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON tasks(order_index);

-- Add comments for documentation
COMMENT ON COLUMN tasks.task_type IS 'Type of task: social, download, form, visit, learn';
COMMENT ON COLUMN tasks.social_action IS 'Social action: follow, join, like, retweet, subscribe';
COMMENT ON COLUMN tasks.social_url IS 'URL for social media action';
COMMENT ON COLUMN tasks.social_post_id IS 'ID of social media post';
COMMENT ON COLUMN tasks.order_index IS 'Order of task within quest';

-- 2. Add missing columns to users table for social media fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_id text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_username text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS discord_avatar_url text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_username text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_avatar_url text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_username text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_id text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_avatar_url text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS x_username text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS x_id text;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS x_avatar_url text;

-- Add indexes for social media fields
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_twitter_id ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_x_id ON users(x_id);

-- Add comments for documentation
COMMENT ON COLUMN users.discord_id IS 'Discord user ID';
COMMENT ON COLUMN users.discord_username IS 'Discord username';
COMMENT ON COLUMN users.discord_avatar_url IS 'Discord avatar URL';
COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID';
COMMENT ON COLUMN users.telegram_username IS 'Telegram username';
COMMENT ON COLUMN users.telegram_avatar_url IS 'Telegram avatar URL';
COMMENT ON COLUMN users.twitter_username IS 'Twitter/X username';
COMMENT ON COLUMN users.twitter_id IS 'Twitter/X user ID';
COMMENT ON COLUMN users.twitter_avatar_url IS 'Twitter/X avatar URL';
COMMENT ON COLUMN users.x_username IS 'X (Twitter) username';
COMMENT ON COLUMN users.x_id IS 'X (Twitter) user ID';
COMMENT ON COLUMN users.x_avatar_url IS 'X (Twitter) avatar URL';

-- 3. Add missing columns to social_accounts table
ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS platform_user_id text;

ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS platform_username text;

ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS profile_data jsonb;

ALTER TABLE social_accounts 
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform_user_id ON social_accounts(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform_username ON social_accounts(platform_username);
CREATE INDEX IF NOT EXISTS idx_social_accounts_verified ON social_accounts(verified);

-- Add comments for documentation
COMMENT ON COLUMN social_accounts.platform_user_id IS 'Platform-specific user ID';
COMMENT ON COLUMN social_accounts.platform_username IS 'Platform-specific username';
COMMENT ON COLUMN social_accounts.profile_data IS 'JSON profile data from platform';
COMMENT ON COLUMN social_accounts.verified IS 'Whether the account is verified';

-- 4. Create quest_categories table
CREATE TABLE IF NOT EXISTS quest_categories (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    description text,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add indexes for quest_categories
CREATE INDEX IF NOT EXISTS idx_quest_categories_name ON quest_categories(name);

-- Add comments for documentation
COMMENT ON TABLE quest_categories IS 'Categories for organizing quests';
COMMENT ON COLUMN quest_categories.name IS 'Category name';
COMMENT ON COLUMN quest_categories.description IS 'Category description';
COMMENT ON COLUMN quest_categories.icon IS 'Icon identifier';
COMMENT ON COLUMN quest_categories.color IS 'Color hex code';

-- 5. Add missing columns to user_task_submissions table
ALTER TABLE user_task_submissions 
ADD COLUMN IF NOT EXISTS task_id uuid;

ALTER TABLE user_task_submissions 
ADD COLUMN IF NOT EXISTS xp_awarded integer DEFAULT 0;

-- Add foreign key constraint for task_id (without IF NOT EXISTS)
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_task_submissions_task_id' 
        AND table_name = 'user_task_submissions'
    ) THEN
        -- Add the constraint only if it doesn't exist
        ALTER TABLE user_task_submissions 
        ADD CONSTRAINT fk_user_task_submissions_task_id 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_task_id ON user_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_xp_awarded ON user_task_submissions(xp_awarded);

-- Add comments for documentation
COMMENT ON COLUMN user_task_submissions.task_id IS 'Reference to the specific task';
COMMENT ON COLUMN user_task_submissions.xp_awarded IS 'XP awarded for this submission';

-- 6. Update existing data to populate new columns where possible
-- This will be done in a separate script to avoid data loss 