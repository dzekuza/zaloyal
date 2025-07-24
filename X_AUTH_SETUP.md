# X (Twitter) Authentication & Task Verification System

This document outlines the complete implementation of OAuth 2.0 PKCE flow for X (Twitter) authentication and automatic task verification.

## 🏗️ Architecture Overview

### 1. OAuth 2.0 PKCE Flow
- **Client**: Initiates OAuth flow via `/api/connect-x`
- **X API**: Handles authorization and returns access tokens
- **Database**: Stores tokens securely in `social_accounts` table
- **Verification**: Polling worker checks task completion via X API

### 2. Database Schema

#### `social_accounts` Table
```sql
CREATE TABLE social_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text NOT NULL,              -- 'x'
  account_id   text NOT NULL,              -- X user ID
  username     text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);
```

#### `oauth_states` Table
```sql
CREATE TABLE oauth_states (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform     text NOT NULL,
  state        text NOT NULL,
  code_verifier text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  expires_at   timestamptz DEFAULT (now() + interval '10 minutes')
);
```

#### `social_verification_cache` Table
```sql
CREATE TABLE social_verification_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key    text NOT NULL UNIQUE,
  cache_value  jsonb NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now()
);
```

### 3. Updated Tasks Table
```sql
ALTER TABLE tasks ADD COLUMN verification_method text DEFAULT 'poll_x_api';
ALTER TABLE tasks ADD COLUMN verification_params jsonb DEFAULT '{}';
```

## 🔧 Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# X API Credentials
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. X Developer Portal Configuration

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new app or use existing one
3. Configure OAuth 2.0 settings:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URLs**: `http://localhost:3000/api/connect-x/callback`
   - **Website URL**: `http://localhost:3000`

### 3. Apply Database Migrations

Run the migration script:

```bash
node scripts/apply-x-auth-migrations.js
```

### 4. Set Up Verification Worker

#### Option A: Cron Job (Recommended)
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * cd /path/to/your/project && node scripts/verification-worker.js
```

#### Option B: Supabase Edge Function
Create a scheduled Edge Function that calls `process_verifications()` every 5 minutes.

### 5. Test the Implementation

1. **Test OAuth Flow**:
   ```bash
   # Start your development server
   pnpm dev
   
   # Go to /profile and click "Connect X"
   ```

2. **Test Verification**:
   ```bash
   # Run verification worker manually
   node scripts/verification-worker.js
   ```

## 📱 Client-Side Usage

### 1. Using the X Auth Hook

```tsx
import { useXAuth } from '@/hooks/use-x-auth';

function MyComponent() {
  const { 
    account, 
    connectX, 
    disconnectX, 
    enqueueVerification 
  } = useXAuth();

  return (
    <div>
      {account ? (
        <div>
          <p>Connected to X as @{account.username}</p>
          <button onClick={disconnectX}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectX}>Connect X</button>
      )}
    </div>
  );
}
```

### 2. Using the Task Verification Component

```tsx
import { TaskVerification } from '@/components/task-verification';

function QuestPage() {
  const task = {
    id: 'task-id',
    title: 'Follow our project',
    description: 'Follow our X account to earn XP',
    social_action: 'follow',
    social_url: 'https://x.com/yourproject',
    verification_params: { target_user_id: '123456789' },
    xp_reward: 100
  };

  return (
    <TaskVerification 
      task={task}
      onVerificationComplete={(taskId, verified) => {
        console.log(`Task ${taskId} ${verified ? 'verified' : 'failed'}`);
      }}
    />
  );
}
```

## 🔄 Verification Flow

### 1. User Action Flow
1. User clicks "Connect X" → OAuth flow starts
2. User authorizes on X → Redirects back to app
3. Tokens stored in `social_accounts` table
4. User sees "Connected to X" status

### 2. Task Verification Flow
1. User completes task (follows, likes, etc.)
2. User clicks "Verify" → Calls `enqueue_verification()`
3. Verification queued in `task_verifications` table
4. Worker polls X API every 5 minutes
5. Status updated to "verified" or "failed"
6. User sees real-time status updates

### 3. API Endpoints

#### `/api/connect-x` (GET)
- Initializes OAuth flow
- Returns authorization URL

#### `/api/connect-x` (POST)
- Handles token exchange
- Stores tokens in database

#### `/api/connect-x/callback` (GET)
- OAuth callback handler
- Processes authorization code

### 4. RPC Functions

#### `enqueue_verification(task_id)`
- Checks if user has X account
- Creates verification record
- Returns verification status

#### `get_verification_status(task_id)`
- Returns current verification status
- Includes attempts and last attempt time

#### `process_verifications()`
- Worker function for processing pending verifications
- Calls X API to check task completion
- Updates verification status

## 🔒 Security Features

### 1. Token Security
- Access tokens encrypted at rest
- Refresh tokens for long-term access
- Automatic token refresh on expiry

### 2. Rate Limiting
- Caching system to minimize API calls
- Exponential backoff on failures
- 5-minute cache TTL for verification results

### 3. OAuth Security
- PKCE flow prevents authorization code interception
- State parameter prevents CSRF attacks
- Secure token storage in database

## 🚨 Error Handling

### 1. Token Refresh
- Automatic refresh on 401 responses
- Fallback to re-authentication on refresh failure

### 2. Rate Limiting
- Respect X API rate limits
- Cache responses to minimize API calls
- Exponential backoff on rate limit errors

### 3. User Feedback
- Clear error messages for common issues
- Toast notifications for status updates
- Loading states during verification

## 📊 Monitoring & Debugging

### 1. Logs
- OAuth flow logs in browser console
- Verification worker logs in server console
- Database query logs for debugging

### 2. Database Queries
```sql
-- Check connected X accounts
SELECT * FROM social_accounts WHERE platform = 'x';

-- Check pending verifications
SELECT * FROM task_verifications WHERE status = 'pending';

-- Check verification cache
SELECT * FROM social_verification_cache WHERE expires_at > now();
```

### 3. Testing
```bash
# Test OAuth flow
curl -X GET http://localhost:3000/api/connect-x

# Test verification worker
node scripts/verification-worker.js

# Check database state
node scripts/check-schema.js
```

## 🔄 Migration from Old System

If you're migrating from the old username-based system:

1. **Backup existing data**:
   ```bash
   node scripts/create-complete-backup.js
   ```

2. **Apply new migrations**:
   ```bash
   node scripts/apply-x-auth-migrations.js
   ```

3. **Update existing tasks**:
   ```sql
   UPDATE tasks 
   SET verification_params = jsonb_build_object('target_user_id', social_url)
   WHERE social_action = 'follow' AND verification_params = '{}';
   ```

4. **Test the new system**:
   - Link X account via OAuth
   - Create test tasks
   - Verify task completion

## 🎯 Best Practices

### 1. Development
- Use environment variables for all secrets
- Test OAuth flow in development first
- Monitor API rate limits during testing

### 2. Production
- Set up proper cron jobs for verification worker
- Monitor verification success rates
- Implement proper error alerting

### 3. User Experience
- Clear loading states during OAuth
- Helpful error messages for common issues
- Real-time status updates for verifications

## 🚀 Deployment Checklist

- [ ] Set up X API credentials
- [ ] Configure OAuth redirect URLs
- [ ] Apply database migrations
- [ ] Set up verification worker cron job
- [ ] Test OAuth flow end-to-end
- [ ] Test task verification system
- [ ] Monitor API rate limits
- [ ] Set up error monitoring

## 📞 Support

For issues with this implementation:

1. Check the browser console for OAuth errors
2. Check server logs for API errors
3. Verify database migrations applied correctly
4. Test with a fresh X account connection
5. Monitor X API rate limits and quotas

---

**Note**: This implementation uses X API v2 with OAuth 2.0 PKCE flow for secure authentication and automatic task verification. 