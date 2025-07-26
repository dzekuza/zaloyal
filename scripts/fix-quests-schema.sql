-- Fix quests table schema by adding missing columns
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS time_limit_days integer DEFAULT NULL;

-- Add other potentially missing columns
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT NULL;

ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quests_project_id ON quests(project_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_is_featured ON quests(is_featured);

-- Add comments for documentation
COMMENT ON COLUMN quests.time_limit_days IS 'Number of days to complete the quest (NULL = no limit)';
COMMENT ON COLUMN quests.max_participants IS 'Maximum number of participants allowed (NULL = unlimited)';
COMMENT ON COLUMN quests.is_featured IS 'Whether this quest is featured/promoted';
COMMENT ON COLUMN quests.status IS 'Quest status: active, paused, completed, etc.'; 