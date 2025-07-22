-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_twitter_identity(UUID);
DROP FUNCTION IF EXISTS update_user_twitter_profile(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS clear_user_twitter_profile(UUID);
DROP FUNCTION IF EXISTS sync_twitter_identity(UUID);

-- Function to get Twitter identity for a user
CREATE OR REPLACE FUNCTION get_twitter_identity(user_id UUID)
RETURNS TABLE(
  id TEXT,
  user_name TEXT,
  avatar_url TEXT,
  profile_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id::TEXT,
    i.identity_data->>'user_name' as user_name,
    i.identity_data->>'avatar_url' as avatar_url,
    CASE 
      WHEN i.identity_data->>'user_name' IS NOT NULL 
      THEN 'https://x.com/' || (i.identity_data->>'user_name')
      ELSE NULL
    END as profile_url
  FROM auth.identities i
  WHERE i.user_id = get_twitter_identity.user_id
    AND i.provider = 'twitter';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile with Twitter data
CREATE OR REPLACE FUNCTION update_user_twitter_profile(
  user_id UUID,
  twitter_id TEXT,
  twitter_username TEXT,
  twitter_avatar_url TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    x_id = update_user_twitter_profile.twitter_id,
    x_username = update_user_twitter_profile.twitter_username,
    x_avatar_url = update_user_twitter_profile.twitter_avatar_url,
    updated_at = NOW()
  WHERE id = update_user_twitter_profile.user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear Twitter profile data
CREATE OR REPLACE FUNCTION clear_user_twitter_profile(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    x_id = NULL,
    x_username = NULL,
    x_avatar_url = NULL,
    updated_at = NOW()
  WHERE id = clear_user_twitter_profile.user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync Twitter identity with user profile
CREATE OR REPLACE FUNCTION sync_twitter_identity(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  twitter_identity RECORD;
BEGIN
  -- Get Twitter identity from auth.identities
  SELECT 
    i.id,
    i.identity_data->>'user_name' as user_name,
    i.identity_data->>'avatar_url' as avatar_url
  INTO twitter_identity
  FROM auth.identities i
  WHERE i.user_id = sync_twitter_identity.user_id
    AND i.provider = 'twitter'
  LIMIT 1;
  
  -- If Twitter identity exists, update user profile
  IF FOUND THEN
    UPDATE users 
    SET 
      x_id = twitter_identity.id,
      x_username = twitter_identity.user_name,
      x_avatar_url = twitter_identity.avatar_url,
      updated_at = NOW()
    WHERE id = sync_twitter_identity.user_id;
    
    RETURN TRUE;
  ELSE
    -- Clear Twitter data if no identity found
    UPDATE users 
    SET 
      x_id = NULL,
      x_username = NULL,
      x_avatar_url = NULL,
      updated_at = NOW()
    WHERE id = sync_twitter_identity.user_id;
    
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_twitter_identity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_twitter_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_user_twitter_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_twitter_identity(UUID) TO authenticated; 