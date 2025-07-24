-- Function to refresh X access token
CREATE OR REPLACE FUNCTION refresh_x_token(
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_social_account social_accounts%ROWTYPE;
  v_token_response jsonb;
  v_new_expires_at timestamptz;
BEGIN
  -- Get social account
  SELECT * INTO v_social_account 
  FROM social_accounts 
  WHERE user_id = p_user_id AND platform = 'x';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No X account found');
  END IF;
  
  IF v_social_account.refresh_token IS NULL THEN
    RETURN jsonb_build_object('error', 'No refresh token available');
  END IF;
  
  -- Call X API to refresh token
  SELECT content INTO v_token_response
  FROM http((
    'POST',
    'https://api.twitter.com/2/oauth2/token',
    ARRAY[
      ('Content-Type', 'application/x-www-form-urlencoded'),
      ('Authorization', 'Basic ' || encode(convert_to(process.env.X_CLIENT_ID || ':' || process.env.X_CLIENT_SECRET, 'UTF8'), 'base64'))
    ],
    'application/x-www-form-urlencoded',
    'grant_type=refresh_token&refresh_token=' || v_social_account.refresh_token
  ));
  
  IF v_token_response->>'status' != '200' THEN
    RETURN jsonb_build_object('error', 'Token refresh failed', 'response', v_token_response);
  END IF;
  
  -- Update tokens in database
  v_new_expires_at := now() + (v_token_response->>'expires_in')::int * interval '1 second';
  
  UPDATE social_accounts 
  SET 
    access_token = v_token_response->>'access_token',
    refresh_token = COALESCE(v_token_response->>'refresh_token', refresh_token),
    expires_at = v_new_expires_at,
    updated_at = now()
  WHERE user_id = p_user_id AND platform = 'x';
  
  RETURN jsonb_build_object(
    'success', true,
    'access_token', v_token_response->>'access_token',
    'expires_at', v_new_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify X follow
CREATE OR REPLACE FUNCTION verify_x_follow(
  p_user_id uuid,
  p_target_user_id text
)
RETURNS jsonb AS $$
DECLARE
  v_social_account social_accounts%ROWTYPE;
  v_api_response jsonb;
  v_cache_key text;
BEGIN
  -- Get social account
  SELECT * INTO v_social_account 
  FROM social_accounts 
  WHERE user_id = p_user_id AND platform = 'x';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No X account found');
  END IF;
  
  -- Check cache first
  v_cache_key := p_user_id::text || '_follow_' || p_target_user_id;
  SELECT cache_value INTO v_api_response 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_api_response IS NOT NULL THEN
    RETURN jsonb_build_object('verified', v_api_response->>'verified', 'cached', true);
  END IF;
  
  -- Check if token needs refresh
  IF v_social_account.expires_at <= now() THEN
    PERFORM refresh_x_token(p_user_id);
    SELECT * INTO v_social_account 
    FROM social_accounts 
    WHERE user_id = p_user_id AND platform = 'x';
  END IF;
  
  -- Call X API to check following status
  SELECT content INTO v_api_response
  FROM http((
    'GET',
    'https://api.twitter.com/2/users/' || v_social_account.account_id || '/following/' || p_target_user_id,
    ARRAY[('Authorization', 'Bearer ' || v_social_account.access_token)],
    NULL,
    NULL
  ));
  
  -- Cache result for 5 minutes
  INSERT INTO social_verification_cache (cache_key, cache_value, expires_at)
  VALUES (
    v_cache_key,
    jsonb_build_object(
      'verified', v_api_response->>'status' = '200',
      'response', v_api_response
    ),
    now() + interval '5 minutes'
  ) ON CONFLICT (cache_key) DO UPDATE SET
    cache_value = EXCLUDED.cache_value,
    expires_at = EXCLUDED.expires_at;
  
  RETURN jsonb_build_object(
    'verified', v_api_response->>'status' = '200',
    'response', v_api_response
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify X like
CREATE OR REPLACE FUNCTION verify_x_like(
  p_user_id uuid,
  p_tweet_id text
)
RETURNS jsonb AS $$
DECLARE
  v_social_account social_accounts%ROWTYPE;
  v_api_response jsonb;
  v_liked_tweets jsonb;
  v_cache_key text;
  v_verified boolean := false;
BEGIN
  -- Get social account
  SELECT * INTO v_social_account 
  FROM social_accounts 
  WHERE user_id = p_user_id AND platform = 'x';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No X account found');
  END IF;
  
  -- Check cache first
  v_cache_key := p_user_id::text || '_like_' || p_tweet_id;
  SELECT cache_value INTO v_api_response 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_api_response IS NOT NULL THEN
    RETURN jsonb_build_object('verified', v_api_response->>'verified', 'cached', true);
  END IF;
  
  -- Check if token needs refresh
  IF v_social_account.expires_at <= now() THEN
    PERFORM refresh_x_token(p_user_id);
    SELECT * INTO v_social_account 
    FROM social_accounts 
    WHERE user_id = p_user_id AND platform = 'x';
  END IF;
  
  -- Call X API to get liked tweets
  SELECT content INTO v_api_response
  FROM http((
    'GET',
    'https://api.twitter.com/2/users/' || v_social_account.account_id || '/liked_tweets',
    ARRAY[('Authorization', 'Bearer ' || v_social_account.access_token)],
    NULL,
    NULL
  ));
  
  -- Check if tweet is in liked tweets
  IF v_api_response->>'status' = '200' THEN
    v_liked_tweets := v_api_response->'data';
    IF v_liked_tweets IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_liked_tweets) AS tweet
        WHERE tweet->>'id' = p_tweet_id
      ) INTO v_verified;
    END IF;
  END IF;
  
  -- Cache result for 5 minutes
  INSERT INTO social_verification_cache (cache_key, cache_value, expires_at)
  VALUES (
    v_cache_key,
    jsonb_build_object(
      'verified', v_verified,
      'response', v_api_response
    ),
    now() + interval '5 minutes'
  ) ON CONFLICT (cache_key) DO UPDATE SET
    cache_value = EXCLUDED.cache_value,
    expires_at = EXCLUDED.expires_at;
  
  RETURN jsonb_build_object(
    'verified', v_verified,
    'response', v_api_response
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main verification worker function
CREATE OR REPLACE FUNCTION process_verifications()
RETURNS void AS $$
DECLARE
  v_verification task_verifications%ROWTYPE;
  v_task tasks%ROWTYPE;
  v_social_account social_accounts%ROWTYPE;
  v_result jsonb;
  v_verified boolean := false;
BEGIN
  -- Process pending verifications
  FOR v_verification IN 
    SELECT tv.* 
    FROM task_verifications tv
    JOIN tasks t ON tv.task_id = t.id
    WHERE tv.status = 'pending' 
      AND tv.attempts < 5 
      AND tv.last_attempt < now() - interval '5 minutes'
    ORDER BY tv.last_attempt ASC
    LIMIT 10
  LOOP
    -- Get task and social account
    SELECT * INTO v_task FROM tasks WHERE id = v_verification.task_id;
    SELECT * INTO v_social_account 
    FROM social_accounts 
    WHERE user_id = v_verification.user_id AND platform = 'x';
    
    IF v_social_account IS NULL THEN
      -- No social account, mark as failed
      UPDATE task_verifications 
      SET 
        status = 'failed',
        attempts = attempts + 1,
        last_attempt = now(),
        result = jsonb_build_object('error', 'No X account linked')
      WHERE id = v_verification.id;
      CONTINUE;
    END IF;
    
    -- Perform verification based on task type
    CASE v_task.social_action
      WHEN 'follow' THEN
        SELECT * INTO v_result 
        FROM verify_x_follow(v_verification.user_id, v_task.verification_params->>'target_user_id');
        v_verified := v_result->>'verified' = 'true';
        
      WHEN 'like' THEN
        SELECT * INTO v_result 
        FROM verify_x_like(v_verification.user_id, v_task.verification_params->>'tweet_id');
        v_verified := v_result->>'verified' = 'true';
        
      ELSE
        v_result := jsonb_build_object('error', 'Unsupported social action');
        v_verified := false;
    END CASE;
    
    -- Update verification status
    UPDATE task_verifications 
    SET 
      status = CASE WHEN v_verified THEN 'verified' ELSE 'pending' END,
      attempts = attempts + 1,
      last_attempt = now(),
      result = v_result
    WHERE id = v_verification.id;
    
    -- If verified, award XP (implement your XP logic here)
    IF v_verified THEN
      -- TODO: Implement XP awarding logic
      RAISE NOTICE 'Task verified for user %: %', v_verification.user_id, v_task.title;
    END IF;
    
  END LOOP;
  
  -- Clean up expired cache and OAuth states
  PERFORM cleanup_expired_cache();
  PERFORM cleanup_expired_oauth_states();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION refresh_x_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_x_follow(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_x_like(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION process_verifications() TO authenticated; 