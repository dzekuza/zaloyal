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
