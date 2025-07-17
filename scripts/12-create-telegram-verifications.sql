-- Create telegram_verifications table
CREATE TABLE IF NOT EXISTS telegram_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_username TEXT,
  channel_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_verifications_user_id ON telegram_verifications(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_verifications_verified ON telegram_verifications(verified);

-- Enable RLS
ALTER TABLE telegram_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own telegram verifications" ON telegram_verifications
  FOR SELECT USING (
    telegram_user_id IN (
      SELECT telegram_user_id FROM users WHERE wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

CREATE POLICY "Service role can manage all telegram verifications" ON telegram_verifications
  FOR ALL USING (auth.role() = 'service_role'); 