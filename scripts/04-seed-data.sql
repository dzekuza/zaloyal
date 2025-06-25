-- Insert quest categories
INSERT INTO quest_categories (id, name, description, icon, color) VALUES
    (uuid_generate_v4(), 'DeFi', 'Decentralized Finance protocols and applications', '💰', '#3B82F6'),
    (uuid_generate_v4(), 'NFT', 'Non-Fungible Tokens and digital collectibles', '🎨', '#8B5CF6'),
    (uuid_generate_v4(), 'Gaming', 'Web3 gaming and GameFi applications', '🎮', '#10B981'),
    (uuid_generate_v4(), 'Social', 'Social media and community engagement', '👥', '#F59E0B'),
    (uuid_generate_v4(), 'Education', 'Learning and educational content', '📚', '#EF4444'),
    (uuid_generate_v4(), 'Trading', 'Trading and investment strategies', '📈', '#06B6D4'),
    (uuid_generate_v4(), 'Staking', 'Staking and yield farming', '🌾', '#84CC16'),
    (uuid_generate_v4(), 'Governance', 'DAO governance and voting', '🗳️', '#EC4899');

-- Insert sample users (these will be created when users connect wallets)
INSERT INTO users (id, wallet_address, username, total_xp, level, completed_quests, role) VALUES
    (uuid_generate_v4(), '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', 'DeFiKing', 25750, 28, 45, 'creator'),
    (uuid_generate_v4(), '0x8ba1f109551bD432803012645Hac136c0532925a', 'CryptoNinja', 23200, 26, 41, 'participant'),
    (uuid_generate_v4(), '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 'Web3Explorer', 21800, 24, 38, 'creator');

-- Insert sample quests
WITH defi_category AS (SELECT id FROM quest_categories WHERE name = 'DeFi' LIMIT 1),
     nft_category AS (SELECT id FROM quest_categories WHERE name = 'NFT' LIMIT 1),
     gaming_category AS (SELECT id FROM quest_categories WHERE name = 'Gaming' LIMIT 1),
     creator1 AS (SELECT id FROM users WHERE username = 'DeFiKing' LIMIT 1),
     creator2 AS (SELECT id FROM users WHERE username = 'Web3Explorer' LIMIT 1)

INSERT INTO quests (id, title, description, creator_id, category_id, total_xp, status, featured, trending, time_limit_days) VALUES
    (
        uuid_generate_v4(),
        'DeFi Master Challenge',
        'Complete various DeFi tasks and earn rewards while learning about decentralized finance protocols.',
        (SELECT id FROM creator1),
        (SELECT id FROM defi_category),
        2500,
        'active',
        true,
        true,
        30
    ),
    (
        uuid_generate_v4(),
        'NFT Collection Quest',
        'Discover, collect, and trade NFTs while completing social media challenges.',
        (SELECT id FROM creator2),
        (SELECT id FROM nft_category),
        1800,
        'active',
        false,
        true,
        45
    ),
    (
        uuid_generate_v4(),
        'Gaming Guild Onboarding',
        'Join our gaming community and complete challenges to unlock exclusive rewards.',
        (SELECT id FROM creator1),
        (SELECT id FROM gaming_category),
        3200,
        'active',
        true,
        false,
        60
    );
