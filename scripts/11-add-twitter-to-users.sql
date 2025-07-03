-- Migration: Add X (Twitter) columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_avatar_url TEXT; 