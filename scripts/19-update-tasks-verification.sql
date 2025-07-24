-- Update tasks table to add verification method and parameters
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_method text DEFAULT 'poll_x_api';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_params jsonb DEFAULT '{}';

-- Add index for verification method
CREATE INDEX IF NOT EXISTS idx_tasks_verification_method ON tasks(verification_method);

-- Update existing tasks to use proper verification parameters
UPDATE tasks 
SET verification_params = jsonb_build_object(
  'target_user_id', social_url,
  'tweet_id', CASE 
    WHEN social_action = 'like' THEN social_url
    WHEN social_action = 'retweet' THEN social_url
    ELSE NULL
  END
)
WHERE verification_params = '{}' AND social_url IS NOT NULL;

-- Create verification cache table for rate limiting
CREATE TABLE IF NOT EXISTS social_verification_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    text NOT NULL UNIQUE,
  cache_value  jsonb NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Add indexes for cache
CREATE INDEX IF NOT EXISTS idx_social_verification_cache_key ON social_verification_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_social_verification_cache_expires ON social_verification_cache(expires_at);

-- Add RLS to cache table
ALTER TABLE social_verification_cache ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can access cache
CREATE POLICY "Authenticated users can access verification cache" ON social_verification_cache
  FOR ALL USING (auth.role() = 'authenticated');

-- Clean up expired cache entries function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM social_verification_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql; 