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