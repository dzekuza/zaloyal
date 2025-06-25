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
