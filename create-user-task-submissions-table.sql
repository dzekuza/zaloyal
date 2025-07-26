-- Create user_task_submissions table for storing task responses
-- This table is critical for tracking user progress and XP

-- First, create the task_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'completed', 'verified', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the user_task_submissions table
CREATE TABLE IF NOT EXISTS user_task_submissions (
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
    
    -- Additional fields for response management
    verified BOOLEAN DEFAULT false,
    social_username TEXT,
    social_post_url TEXT,
    quiz_answers JSONB,
    manual_verification_note TEXT,
    xp_removed BOOLEAN DEFAULT false,
    xp_removal_reason TEXT,
    xp_removed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one submission per user per task
    UNIQUE(user_id, task_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_user_id 
ON user_task_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_task_id 
ON user_task_submissions(task_id);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_quest_id 
ON user_task_submissions(quest_id);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_status 
ON user_task_submissions(status);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_verified 
ON user_task_submissions(verified);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_submitted_at 
ON user_task_submissions(submitted_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_task_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_task_submissions_updated_at
    BEFORE UPDATE ON user_task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_task_submissions_updated_at();

-- Create RLS policies for user_task_submissions
-- Users can view their own submissions
CREATE POLICY "Users can view their own submissions" ON user_task_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own submissions
CREATE POLICY "Users can create their own submissions" ON user_task_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own submissions (for status changes)
CREATE POLICY "Users can update their own submissions" ON user_task_submissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE user_task_submissions ENABLE ROW LEVEL SECURITY;

-- Verify the table was created
SELECT 
    'user_task_submissions table created successfully' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_name = 'user_task_submissions' 
AND table_schema = 'public'; 