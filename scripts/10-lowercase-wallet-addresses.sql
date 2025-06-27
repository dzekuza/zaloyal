-- Migration: Lowercase all wallet addresses in the users table
UPDATE users SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL; 