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
