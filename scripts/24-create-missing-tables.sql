-- Create missing tables and components for X authentication system

-- Create oauth_states table
CREATE TABLE IF NOT EXISTS oauth_states (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text NOT NULL,
  state        text NOT NULL,
  code_verifier text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS on oauth_states
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for oauth_states
CREATE POLICY "Users can view their own oauth states" ON oauth_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own oauth states" ON oauth_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own oauth states" ON oauth_states
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for oauth_states
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Create RPC functions for OAuth state management
CREATE OR REPLACE FUNCTION store_oauth_state(
  p_user_id uuid,
  p_state text,
  p_code_verifier text,
  p_platform text DEFAULT 'x'
)
RETURNS void AS $$
BEGIN
  INSERT INTO oauth_states (user_id, state, code_verifier, platform)
  VALUES (p_user_id, p_state, p_code_verifier, p_platform);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_oauth_state(
  p_user_id uuid,
  p_state text,
  p_platform text DEFAULT 'x'
)
RETURNS TABLE (
  state text,
  code_verifier text,
  created_at timestamptz,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT os.state, os.code_verifier, os.created_at, os.expires_at
  FROM oauth_states os
  WHERE os.user_id = p_user_id 
    AND os.state = p_state 
    AND os.platform = p_platform
    AND os.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_oauth_state(
  p_user_id uuid,
  p_state text,
  p_platform text DEFAULT 'x'
)
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states 
  WHERE user_id = p_user_id 
    AND state = p_state 
    AND platform = p_platform;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION store_oauth_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_oauth_state TO authenticated;
GRANT EXECUTE ON FUNCTION clear_oauth_state TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_oauth_states TO authenticated; 