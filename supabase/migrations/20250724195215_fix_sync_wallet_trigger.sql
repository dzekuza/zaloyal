-- Migration: Fix sync_wallet_address trigger to not update users table
-- The trigger is trying to update wallet_address column in users table which no longer exists

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_sync_wallet_address ON social_accounts;

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.sync_wallet_address();

-- Create a new function that doesn't update users table
CREATE OR REPLACE FUNCTION public.sync_wallet_address()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- This function is now a no-op since wallet addresses are stored in social_accounts table
    -- No need to sync with users table anymore
    RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate the trigger with the fixed function
CREATE TRIGGER trigger_sync_wallet_address 
    AFTER INSERT OR DELETE OR UPDATE ON public.social_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION sync_wallet_address();

-- Note: link_wallet_to_user and unlink_wallet_from_user functions are already defined
-- in complete_social_accounts_migration.sql, so we don't redefine them here
-- to avoid conflicts and maintain consistency 