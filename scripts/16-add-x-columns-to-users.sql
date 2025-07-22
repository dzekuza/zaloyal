-- Migration: Add X (Twitter) columns to users table with correct naming
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_avatar_url TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_x_id ON users(x_id);
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username); 