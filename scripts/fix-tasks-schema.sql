-- Fix tasks table schema by adding missing columns for task creation

-- Add missing columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'social';

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_platform text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_action text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_url text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_username text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS social_post_id text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Add learn task fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS learn_content text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS learn_questions jsonb;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS learn_passing_score integer DEFAULT 80;

-- Add download task fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS download_url text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS download_title text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS download_description text;

-- Add form task fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS form_url text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS form_title text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS form_description text;

-- Add visit task fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS visit_url text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS visit_title text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS visit_description text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS visit_duration_seconds integer;

-- Add verification fields
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS auto_verify boolean DEFAULT false;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS verification_method text;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS verification_params jsonb DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_social_platform ON tasks(social_platform);
CREATE INDEX IF NOT EXISTS idx_tasks_social_action ON tasks(social_action);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON tasks(order_index);

-- Add comments for documentation
COMMENT ON COLUMN tasks.task_type IS 'Type of task: social, download, form, visit, learn';
COMMENT ON COLUMN tasks.social_platform IS 'Social platform: twitter, telegram, discord, etc.';
COMMENT ON COLUMN tasks.social_action IS 'Social action: follow, join, like, retweet, subscribe';
COMMENT ON COLUMN tasks.social_url IS 'URL for social media action';
COMMENT ON COLUMN tasks.social_username IS 'Username for social media action';
COMMENT ON COLUMN tasks.social_post_id IS 'ID of social media post';
COMMENT ON COLUMN tasks.order_index IS 'Order of task within quest';
COMMENT ON COLUMN tasks.learn_content IS 'Rich text content for learn tasks';
COMMENT ON COLUMN tasks.learn_questions IS 'JSON array of questions with answers';
COMMENT ON COLUMN tasks.learn_passing_score IS 'Minimum score to pass learn task';
COMMENT ON COLUMN tasks.auto_verify IS 'Whether task should be auto-verified';
COMMENT ON COLUMN tasks.verification_method IS 'Method for verifying task completion';
COMMENT ON COLUMN tasks.verification_params IS 'Parameters for verification method';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position; 