# Social Accounts Table Migration - Complete Cleanup

## Problem
The `social_accounts` table was being used for both wallet connections and social media accounts, causing conflicts when:
1. Wallet connections filled `account_id`, `username`, `access_token` fields
2. X (Twitter) connections tried to fill the same fields
3. This led to data conflicts and missing information

Additionally, social media fields were duplicated across multiple tables:
- `users` table had `x_username`, `x_id`, `discord_id`, etc.
- `projects` table had `x_username`, `x_id`, etc.
- `social_accounts` table had the same information

## Solution
1. **Added platform-specific fields to `social_accounts` table**
2. **Removed duplicate social media fields from `users` and `projects` tables**
3. **Centralized all social account data in `social_accounts` table**
4. **Updated authentication to use email instead of wallet address for X and Discord**

### New Fields Added to `social_accounts`:
- **Wallet-specific fields:**
  - `wallet_address` - The actual wallet address
  - `wallet_network` - Blockchain network (solana, ethereum, etc.)

- **X (Twitter) specific fields:**
  - `x_account_id` - X account ID
  - `x_username` - X username
  - `x_access_token` - X OAuth access token
  - `x_access_token_secret` - X OAuth access token secret

- **Discord specific fields:**
  - `discord_account_id` - Discord account ID
  - `discord_username` - Discord username
  - `discord_access_token` - Discord OAuth access token
  - `discord_refresh_token` - Discord OAuth refresh token

- **Telegram specific fields:**
  - `telegram_account_id` - Telegram account ID
  - `telegram_username` - Telegram username
  - `telegram_access_token` - Telegram OAuth access token
  - `telegram_refresh_token` - Telegram OAuth refresh token

### Fields Removed:
- **From `users` table:**
  - `wallet_address`, `discord_id`, `discord_username`, `discord_avatar_url`
  - `telegram_id`, `telegram_username`, `telegram_avatar_url`
  - `twitter_username`, `twitter_id`, `twitter_avatar_url`
  - `x_username`, `x_id`, `x_avatar_url`

- **From `projects` table:**
  - `x_username`, `x_id`, `x_avatar_url`
  - `discord_account_id`, `discord_username`, `discord_access_token`, `discord_refresh_token`
  - `telegram_account_id`, `telegram_username`, `telegram_access_token`, `telegram_refresh_token`

### Authentication Changes:
1. **X Authentication**: Now uses email for user identification instead of wallet address
2. **Discord Authentication**: Now uses email for user identification instead of wallet address
3. **Wallet Authentication**: Still uses wallet address but stores it in `social_accounts` table
4. **Database Functions**: Updated to work with the new schema

### Updated Functions:
- `link_wallet_to_user()` - Links wallet to user via social_accounts table
- `unlink_wallet_from_user()` - Removes wallet from social_accounts table
- `get_user_social_account()` - Gets social account info for a user
- `get_user_by_wallet_address()` - Gets user by wallet address (backward compatibility)
- `get_user_by_email()` - Gets user by email (for X and Discord auth)
- `increment_user_xp()` - Updated to use email instead of wallet address

### API Changes:
- `/api/link-wallet` - Updated to use database function
- `/api/users/upsert` - Updated to work with new schema
- `/api/connect-x/callback` - Updated to use email authentication
- `/api/connect-discord/callback` - Updated to use email authentication
- `/api/verify/discord-join` - Updated to use email for XP updates

### Benefits:
1. **No more data conflicts** between wallet and social media connections
2. **Centralized social account management** in one table
3. **Cleaner database schema** with no duplicate fields
4. **Better authentication flow** using email for social platforms
5. **Backward compatibility** maintained for existing wallet connections

### Migration Status:
✅ **COMPLETED** - All changes have been applied to the database and codebase 