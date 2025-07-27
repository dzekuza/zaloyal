-- Migration: Clear all data from users and social_accounts tables
-- This allows for fresh registration and testing

-- WARNING: This script performs irreversible data deletion
-- Use with extreme caution in production environments
-- Consider backing up data before running these functions

-- Create function to clear all user data with transaction protection
CREATE OR REPLACE FUNCTION public.clear_all_user_data()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_users_deleted integer;
    v_social_accounts_deleted integer;
    v_result json;
BEGIN
    -- Start transaction for atomicity
    BEGIN
        -- Delete all social accounts first (due to foreign key constraints)
        DELETE FROM social_accounts;
        GET DIAGNOSTICS v_social_accounts_deleted = ROW_COUNT;
        
        -- Delete all users
        DELETE FROM users;
        GET DIAGNOSTICS v_users_deleted = ROW_COUNT;
        
        -- Return result
        v_result := json_build_object(
            'users_deleted', v_users_deleted,
            'social_accounts_deleted', v_social_accounts_deleted,
            'message', 'All user data cleared successfully'
        );
        
        RETURN v_result;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback on any error
            RAISE EXCEPTION 'Failed to clear user data: %', SQLERRM;
    END;
END;
$function$;

-- Create function to clear specific user data by email
CREATE OR REPLACE FUNCTION public.clear_user_data_by_email(p_email text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_social_accounts_deleted integer;
    v_users_deleted integer;
    v_result json;
BEGIN
    -- Get user ID by email
    SELECT id INTO v_user_id
    FROM users
    WHERE email = p_email
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'error', 'User not found',
            'email', p_email
        );
    END IF;
    
    -- Delete social accounts for this user
    DELETE FROM social_accounts WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_social_accounts_deleted = ROW_COUNT;
    
    -- Delete the user
    DELETE FROM users WHERE id = v_user_id;
    GET DIAGNOSTICS v_users_deleted = ROW_COUNT;
    
    -- Return result
    v_result := json_build_object(
        'user_id', v_user_id,
        'email', p_email,
        'users_deleted', v_users_deleted,
        'social_accounts_deleted', v_social_accounts_deleted,
        'message', 'User data cleared successfully'
    );
    
    RETURN v_result;
END;
$function$;

-- Create function to clear specific user data by wallet address
CREATE OR REPLACE FUNCTION public.clear_user_data_by_wallet(p_wallet_address text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_social_accounts_deleted integer;
    v_users_deleted integer;
    v_result json;
BEGIN
    -- Get user ID by wallet address
    SELECT sa.user_id INTO v_user_id
    FROM social_accounts sa
    WHERE sa.platform = 'solana' 
    AND sa.wallet_address = p_wallet_address
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'error', 'User not found',
            'wallet_address', p_wallet_address
        );
    END IF;
    
    -- Delete social accounts for this user
    DELETE FROM social_accounts WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_social_accounts_deleted = ROW_COUNT;
    
    -- Delete the user
    DELETE FROM users WHERE id = v_user_id;
    GET DIAGNOSTICS v_users_deleted = ROW_COUNT;
    
    -- Return result
    v_result := json_build_object(
        'user_id', v_user_id,
        'wallet_address', p_wallet_address,
        'users_deleted', v_users_deleted,
        'social_accounts_deleted', v_social_accounts_deleted,
        'message', 'User data cleared successfully'
    );
    
    RETURN v_result;
END;
$function$;

-- Create function to list all current users (for verification)
CREATE OR REPLACE FUNCTION public.list_all_users()
 RETURNS TABLE(
    user_id uuid,
    email text,
    username text,
    wallet_addresses text[],
    social_accounts_count bigint
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.username,
        array_agg(sa.wallet_address) FILTER (WHERE sa.wallet_address IS NOT NULL) as wallet_addresses,
        COUNT(sa.id)::bigint as social_accounts_count
    FROM users u
    LEFT JOIN social_accounts sa ON u.id = sa.user_id
    GROUP BY u.id, u.email, u.username
    ORDER BY u.created_at DESC;
END;
$function$;

-- Create function to get data summary before clearing
CREATE OR REPLACE FUNCTION public.get_data_summary()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_users_count integer;
    v_social_accounts_count integer;
    v_result json;
BEGIN
    -- Count users
    SELECT COUNT(*) INTO v_users_count FROM users;
    
    -- Count social accounts
    SELECT COUNT(*) INTO v_social_accounts_count FROM social_accounts;
    
    -- Return summary
    v_result := json_build_object(
        'users_count', v_users_count,
        'social_accounts_count', v_social_accounts_count,
        'message', 'Data summary retrieved successfully'
    );
    
    RETURN v_result;
END;
$function$;

-- Create function to update user and link wallet atomically
CREATE OR REPLACE FUNCTION public.update_user_and_link_wallet(
    p_user_id uuid,
    p_user_data jsonb,
    p_wallet_address text
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_data json;
    v_wallet_linked boolean;
BEGIN
    -- Start transaction
    BEGIN
        -- Update user profile if data provided
        IF p_user_data IS NOT NULL AND jsonb_typeof(p_user_data) = 'object' THEN
            UPDATE users 
            SET 
                username = COALESCE(p_user_data->>'username', username),
                email = COALESCE(p_user_data->>'email', email),
                avatar_url = COALESCE(p_user_data->>'avatar_url', avatar_url),
                bio = COALESCE(p_user_data->>'bio', bio),
                updated_at = NOW()
            WHERE id = p_user_id;
        END IF;
        
        -- Link wallet to user
        INSERT INTO social_accounts (
            user_id, 
            platform, 
            wallet_address, 
            created_at, 
            updated_at
        ) VALUES (
            p_user_id, 
            'solana', 
            p_wallet_address, 
            NOW(), 
            NOW()
        )
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET 
            wallet_address = EXCLUDED.wallet_address,
            updated_at = NOW();
        
        -- Get updated user data
        SELECT to_json(u.*) INTO v_user_data
        FROM users u
        WHERE u.id = p_user_id;
        
        RETURN v_user_data;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback on any error
            RAISE EXCEPTION 'Failed to update user and link wallet: %', SQLERRM;
    END;
END;
$function$; 