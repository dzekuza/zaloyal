-- Create OAuth state management table
CREATE TABLE IF NOT EXISTS oauth_states (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text NOT NULL,
  state        text NOT NULL,
  code_verifier text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz DEFAULT (now() + interval '10 minutes')
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON oauth_states(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Add RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OAuth states
CREATE POLICY "Users can manage own OAuth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);

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