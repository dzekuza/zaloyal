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
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = wallet_address OR auth.uid()::text = id::text);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid()::text = wallet_address OR auth.uid()::text = id::text);

-- Quest categories policies (public read)
CREATE POLICY "Anyone can view quest categories" ON quest_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON quest_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE wallet_address = auth.uid()::text AND role = 'admin')
);

-- Quests policies
CREATE POLICY "Anyone can view active quests" ON quests FOR SELECT USING (
    status = 'active' OR 
    creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);
CREATE POLICY "Creators can manage own quests" ON quests FOR ALL USING (
    creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);
CREATE POLICY "Creators can insert quests" ON quests FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);

-- Tasks policies
CREATE POLICY "Anyone can view tasks for active quests" ON tasks FOR SELECT USING (
    quest_id IN (SELECT id FROM quests WHERE status = 'active') OR
    quest_id IN (SELECT id FROM quests WHERE creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text))
);
CREATE POLICY "Quest creators can manage tasks" ON tasks FOR ALL USING (
    quest_id IN (SELECT id FROM quests WHERE creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text))
);

-- User quest progress policies
CREATE POLICY "Users can view own progress" ON user_quest_progress FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);
CREATE POLICY "Users can manage own progress" ON user_quest_progress FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);

-- User task submissions policies
CREATE POLICY "Users can view own submissions" ON user_task_submissions FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text) OR
    quest_id IN (SELECT id FROM quests WHERE creator_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text))
);
CREATE POLICY "Users can manage own submissions" ON user_task_submissions FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);

-- User badges policies
CREATE POLICY "Anyone can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Leaderboards policies
CREATE POLICY "Anyone can view leaderboards" ON leaderboards FOR SELECT USING (true);
CREATE POLICY "System can manage leaderboards" ON leaderboards FOR ALL USING (true);

-- Social verification cache policies
CREATE POLICY "Users can view own verification cache" ON social_verification_cache FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);
CREATE POLICY "Users can manage own verification cache" ON social_verification_cache FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE wallet_address = auth.uid()::text)
);
