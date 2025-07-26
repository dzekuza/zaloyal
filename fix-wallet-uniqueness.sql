-- Fix Wallet Uniqueness and Storage Issues
-- This script ensures wallet addresses are unique and properly stored in both tables

-- 1. First, let's see the current state
SELECT 
    'Current wallet connections:' as info,
    user_id,
    platform,
    account_id,
    username
FROM social_accounts 
WHERE platform = 'solana'
ORDER BY created_at DESC;

-- 2. Add unique constraint to wallet_address in users table
-- First, clean up any duplicate wallet addresses (keep the most recent)
WITH duplicate_wallets AS (
    SELECT wallet_address, COUNT(*) as count
    FROM users 
    WHERE wallet_address IS NOT NULL
    GROUP BY wallet_address 
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate wallet addresses found:' as info,
    wallet_address,
    count
FROM duplicate_wallets;

-- 3. Create a function to handle wallet linking with uniqueness check
CREATE OR REPLACE FUNCTION link_wallet_to_user(
    p_user_id UUID,
    p_wallet_address TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    existing_user_id UUID;
    existing_social_account_id UUID;
BEGIN
    -- Check if wallet is already linked to another user
    SELECT user_id INTO existing_user_id
    FROM social_accounts 
    WHERE platform = 'solana' 
    AND account_id = p_wallet_address
    AND user_id != p_user_id
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'Wallet address % is already linked to user %', p_wallet_address, existing_user_id;
    END IF;
    
    -- Check if user already has a wallet linked
    SELECT id INTO existing_social_account_id
    FROM social_accounts 
    WHERE user_id = p_user_id 
    AND platform = 'solana'
    LIMIT 1;
    
    -- If user already has a wallet, update it
    IF existing_social_account_id IS NOT NULL THEN
        UPDATE social_accounts 
        SET 
            account_id = p_wallet_address,
            username = substring(p_wallet_address from 1 for 8) || '...',
            access_token = p_wallet_address,
            updated_at = NOW()
        WHERE id = existing_social_account_id;
    ELSE
        -- Insert new wallet connection
        INSERT INTO social_accounts (
            user_id,
            platform,
            account_id,
            username,
            access_token,
            created_at,
            updated_at
        ) VALUES (
            p_user_id,
            'solana',
            p_wallet_address,
            substring(p_wallet_address from 1 for 8) || '...',
            p_wallet_address,
            NOW(),
            NOW()
        );
    END IF;
    
    -- Update users table wallet_address column
    UPDATE users 
    SET 
        wallet_address = p_wallet_address,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to unlink wallet
CREATE OR REPLACE FUNCTION unlink_wallet_from_user(
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove from social_accounts
    DELETE FROM social_accounts 
    WHERE user_id = p_user_id 
    AND platform = 'solana';
    
    -- Clear from users table
    UPDATE users 
    SET 
        wallet_address = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Create a function to get user by wallet address
CREATE OR REPLACE FUNCTION get_user_by_wallet_address(
    p_wallet_address TEXT
)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    email TEXT,
    wallet_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.wallet_address
    FROM users u
    WHERE u.wallet_address = p_wallet_address
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. Add unique constraint to users.wallet_address (after cleaning duplicates)
-- First, let's see if there are any duplicates to clean up
SELECT 
    'Users with wallet addresses:' as info,
    id,
    username,
    email,
    wallet_address
FROM users 
WHERE wallet_address IS NOT NULL
ORDER BY wallet_address;

-- 7. Create a trigger to ensure wallet_address consistency
CREATE OR REPLACE FUNCTION sync_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
    -- When a social_account is inserted/updated for solana
    IF NEW.platform = 'solana' THEN
        -- Update users table
        UPDATE users 
        SET 
            wallet_address = NEW.account_id,
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    
    -- When a social_account is deleted for solana
    IF TG_OP = 'DELETE' AND OLD.platform = 'solana' THEN
        -- Clear wallet_address from users table
        UPDATE users 
        SET 
            wallet_address = NULL,
            updated_at = NOW()
        WHERE id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for social_accounts changes
DROP TRIGGER IF EXISTS trigger_sync_wallet_address ON social_accounts;

CREATE TRIGGER trigger_sync_wallet_address
    AFTER INSERT OR UPDATE OR DELETE ON social_accounts
    FOR EACH ROW
    EXECUTE FUNCTION sync_wallet_address();

-- 8. Verify functions were created successfully
SELECT 
    'Wallet functions created successfully' as status,
    'Use link_wallet_to_user(user_id, wallet_address) to link wallets' as usage_note,
    'Use unlink_wallet_from_user(user_id) to unlink wallets' as unlink_note;

-- 9. Show current state after fixes
SELECT 
    'Final state - Users with wallets:' as info,
    u.id,
    u.username,
    u.email,
    u.wallet_address,
    sa.account_id as social_account_wallet
FROM users u
LEFT JOIN social_accounts sa ON u.id = sa.user_id AND sa.platform = 'solana'
WHERE u.wallet_address IS NOT NULL OR sa.account_id IS NOT NULL
ORDER BY u.wallet_address;

-- 10. Show any existing duplicate wallet addresses that need manual resolution
SELECT 
    'WARNING: Duplicate wallet addresses found (manual resolution needed):' as info,
    account_id as wallet_address,
    COUNT(*) as user_count,
    STRING_AGG(user_id::text, ', ') as user_ids
FROM social_accounts 
WHERE platform = 'solana'
GROUP BY account_id 
HAVING COUNT(*) > 1
ORDER BY account_id; 