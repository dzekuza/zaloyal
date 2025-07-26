-- Create a function to automatically sync Discord identity data to social_accounts
-- This will be triggered when a user links their Discord account

CREATE OR REPLACE FUNCTION sync_discord_to_social_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process Discord identities
    IF NEW.provider = 'discord' THEN
        -- Insert or update the social_accounts record
        INSERT INTO public.social_accounts (
            user_id,
            platform,
            account_id,
            username,
            display_name,
            access_token,
            created_at,
            updated_at
        )
        VALUES (
            NEW.user_id,
            'discord',
            NEW.identity_data->>'sub',
            NEW.identity_data->>'preferred_username',
            NEW.identity_data->>'full_name',
            NEW.identity_data->>'sub', -- Using provider_id as access_token
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (user_id, platform) 
        DO UPDATE SET
            account_id = EXCLUDED.account_id,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            access_token = EXCLUDED.access_token,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically sync Discord data
DROP TRIGGER IF EXISTS trigger_sync_discord_to_social_accounts ON auth.identities;

CREATE TRIGGER trigger_sync_discord_to_social_accounts
    AFTER INSERT OR UPDATE ON auth.identities
    FOR EACH ROW
    EXECUTE FUNCTION sync_discord_to_social_accounts(); 