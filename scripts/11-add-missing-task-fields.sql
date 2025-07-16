-- Add missing columns for social/Twitter tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS default_tweet text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tweet_actions text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tweet_words text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS space_password text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS show_after_end boolean; 