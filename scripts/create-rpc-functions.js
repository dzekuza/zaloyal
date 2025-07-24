const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createRPCFunctions() {
  console.log('🔄 Creating RPC functions for X authentication...\n');
  
  console.log('⚠️  Please run the following SQL in Supabase SQL Editor to create the RPC functions:\n');
  
  console.log('-- 1. OAuth State Management Functions');
  console.log(`
-- Function to store OAuth state
CREATE OR REPLACE FUNCTION store_oauth_state(
  p_user_id uuid,
  p_state text,
  p_code_verifier text,
  p_platform text
)
RETURNS void AS $$
BEGIN
  -- Clean up old states for this user and platform
  DELETE FROM oauth_states 
  WHERE user_id = p_user_id AND platform = p_platform;
  
  -- Insert new state
  INSERT INTO oauth_states (user_id, platform, state, code_verifier)
  VALUES (p_user_id, p_platform, p_state, p_code_verifier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get OAuth state
CREATE OR REPLACE FUNCTION get_oauth_state(
  p_user_id uuid,
  p_state text,
  p_platform text
)
RETURNS jsonb AS $$
DECLARE
  v_state oauth_states%ROWTYPE;
BEGIN
  SELECT * INTO v_state 
  FROM oauth_states 
  WHERE user_id = p_user_id 
    AND state = p_state 
    AND platform = p_platform
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'state', v_state.state,
    'code_verifier', v_state.code_verifier,
    'platform', v_state.platform,
    'created_at', v_state.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear OAuth state
CREATE OR REPLACE FUNCTION clear_oauth_state(
  p_user_id uuid,
  p_state text,
  p_platform text
)
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states 
  WHERE user_id = p_user_id 
    AND state = p_state 
    AND platform = p_platform;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_oauth_state(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_oauth_state(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_oauth_state(uuid, text, text) TO authenticated;
  `);
  
  console.log('\n-- 2. Verification Functions');
  console.log(`
-- Function to clean up expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM social_verification_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- RPC function to enqueue a verification
CREATE OR REPLACE FUNCTION enqueue_verification(
  p_task_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_existing_verification task_verifications%ROWTYPE;
  v_social_account social_accounts%ROWTYPE;
  v_cache_key text;
  v_cached_result jsonb;
  v_result jsonb;
BEGIN
  -- Get the task
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Task not found');
  END IF;

  -- Check if user has social account for this platform
  SELECT * INTO v_social_account 
  FROM social_accounts 
  WHERE user_id = p_user_id AND platform = 'x';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'No X account linked. Please link your X account first.',
      'status', 'no_account'
    );
  END IF;

  -- Check if verification already exists
  SELECT * INTO v_existing_verification 
  FROM task_verifications 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF FOUND THEN
    -- Return existing verification status
    RETURN jsonb_build_object(
      'verification_id', v_existing_verification.id,
      'status', v_existing_verification.status,
      'result', v_existing_verification.result,
      'attempts', v_existing_verification.attempts,
      'last_attempt', v_existing_verification.last_attempt
    );
  END IF;

  -- Check cache first
  v_cache_key := p_user_id::text || '_' || p_task_id::text || '_' || v_task.social_action;
  SELECT cache_value INTO v_cached_result 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_cached_result IS NOT NULL THEN
    -- Return cached result
    RETURN jsonb_build_object(
      'status', 'cached',
      'result', v_cached_result,
      'cached', true
    );
  END IF;

  -- Create new verification
  INSERT INTO task_verifications (
    task_id, 
    user_id, 
    status, 
    attempts, 
    last_attempt,
    result
  ) VALUES (
    p_task_id, 
    p_user_id, 
    'pending', 
    0, 
    now(),
    jsonb_build_object('enqueued_at', now())
  ) RETURNING * INTO v_existing_verification;

  RETURN jsonb_build_object(
    'verification_id', v_existing_verification.id,
    'status', 'pending',
    'message', 'Verification enqueued successfully',
    'enqueued_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get verification status
CREATE OR REPLACE FUNCTION get_verification_status(
  p_task_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb AS $$
DECLARE
  v_verification task_verifications%ROWTYPE;
BEGIN
  SELECT * INTO v_verification 
  FROM task_verifications 
  WHERE task_id = p_task_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No verification found for this task');
  END IF;

  RETURN jsonb_build_object(
    'verification_id', v_verification.id,
    'status', v_verification.status,
    'result', v_verification.result,
    'attempts', v_verification.attempts,
    'last_attempt', v_verification.last_attempt,
    'created_at', v_verification.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION enqueue_verification(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_status(uuid, uuid) TO authenticated;
  `);
  
  console.log('\n-- 3. X API Verification Functions (Simplified)');
  console.log(`
-- Simplified verification functions that work without http extension
CREATE OR REPLACE FUNCTION verify_x_follow_simple(
  p_user_id uuid,
  p_target_user_id text
)
RETURNS jsonb AS $$
DECLARE
  v_social_account social_accounts%ROWTYPE;
  v_cache_key text;
  v_cached_result jsonb;
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
  SELECT cache_value INTO v_cached_result 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_cached_result IS NOT NULL THEN
    RETURN jsonb_build_object('verified', v_cached_result->>'verified', 'cached', true);
  END IF;
  
  -- For now, return a placeholder response
  -- In production, this would call the X API
  RETURN jsonb_build_object(
    'verified', false,
    'message', 'X API verification requires http extension. Please implement manually.',
    'user_id', p_user_id,
    'target_user_id', p_target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_x_like_simple(
  p_user_id uuid,
  p_tweet_id text
)
RETURNS jsonb AS $$
DECLARE
  v_social_account social_accounts%ROWTYPE;
  v_cache_key text;
  v_cached_result jsonb;
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
  SELECT cache_value INTO v_cached_result 
  FROM social_verification_cache 
  WHERE cache_key = v_cache_key AND expires_at > now();
  
  IF v_cached_result IS NOT NULL THEN
    RETURN jsonb_build_object('verified', v_cached_result->>'verified', 'cached', true);
  END IF;
  
  -- For now, return a placeholder response
  -- In production, this would call the X API
  RETURN jsonb_build_object(
    'verified', false,
    'message', 'X API verification requires http extension. Please implement manually.',
    'user_id', p_user_id,
    'tweet_id', p_tweet_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_x_follow_simple(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_x_like_simple(uuid, text) TO authenticated;
  `);
  
  console.log('\n✅ RPC function creation instructions completed!');
  console.log('\n📋 Next steps:');
  console.log('  1. Run the SQL statements above in Supabase SQL Editor');
  console.log('  2. Set up X API credentials in environment variables');
  console.log('  3. Test the OAuth flow');
  console.log('  4. For full X API integration, enable the http extension in Supabase');
}

createRPCFunctions().catch(console.error); 