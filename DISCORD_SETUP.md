# Discord OAuth Configuration Guide

## Overview
This guide covers the complete setup for Discord OAuth authentication using Supabase's native Discord provider.

## Prerequisites
- Discord Developer Account
- Supabase Project
- Environment Variables Configuration

## Step 1: Discord Application Setup

### 1.1 Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application (e.g., "ZaLoyal")
4. Save the application

### 1.2 Configure OAuth2 Settings
1. Go to "OAuth2" → "General" in your Discord application
2. Copy the **Client ID** and **Client Secret**
3. Add redirect URI: `https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback`
4. For local development: `http://localhost:3000/auth/callback`

### 1.3 Configure Scopes
Ensure your Discord application has the following scopes:
- `identify` - Access user's Discord ID and username
- `connections` - Access user's connected accounts
- `guilds.join` - Add user to servers
- `guilds.channels.read` - Read server channels
- `email` - Access user's email
- `guilds.members.read` - Read server member information
- `gdm.join` - Join group DMs

## Step 2: Supabase Configuration

### 2.1 Enable Discord Provider
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable Discord provider
4. Enter your Discord Client ID and Client Secret
5. Set the redirect URL to: `https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback`

### 2.2 Environment Variables
Add these to your `.env.local`:

```env
# Discord OAuth
NEXT_PUBLIC_DISCORD_CLIENT_ID=1397282925849874492
DISCORD_CLIENT_SECRET=your_discord_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ghbaaexxytbvmbimmrkj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Database Setup

### 3.1 Required Tables
The following tables should be created:
- `oauth_states` - For OAuth state management
- `social_accounts` - For storing Discord connections

### 3.2 RLS Policies
Ensure proper Row Level Security policies are in place:
- Users can only access their own OAuth states
- Service role can manage all OAuth states
- Anonymous users can verify OAuth states

## Step 4: Implementation

### 4.1 Discord Auth Button
Use the updated `DiscordVerifyButton` component:
```tsx
import { DiscordVerifyButton } from '@/components/discord-verify-button';

<DiscordVerifyButton>
  Connect Discord Account
</DiscordVerifyButton>
```

### 4.2 Auth Callback
The auth callback is handled at `/auth/callback` and will:
1. Process the Discord OAuth response
2. Create/update user session
3. Redirect to dashboard on success

## Step 5: Testing

### 5.1 Local Development
1. Start your development server: `npm run dev`
2. Navigate to a page with Discord auth
3. Click "Connect Discord"
4. Complete Discord OAuth flow
5. Verify redirect to dashboard

### 5.2 Production
1. Update Discord redirect URIs for production domain
2. Update environment variables for production
3. Test OAuth flow in production environment

## Troubleshooting

### Common Issues
1. **Invalid redirect URI**: Ensure Discord redirect URI matches exactly
2. **Missing scopes**: Verify all required scopes are configured
3. **RLS policy errors**: Check that proper policies are in place
4. **Session not created**: Verify Supabase auth is properly configured

### Debug Steps
1. Check browser console for OAuth errors
2. Verify environment variables are loaded
3. Check Supabase logs for auth errors
4. Verify Discord application settings

## Security Considerations

1. **Client Secret**: Never expose in client-side code
2. **State Management**: Use secure state tokens for OAuth
3. **Token Storage**: Store tokens securely in database
4. **Scope Limitation**: Only request necessary scopes
5. **Error Handling**: Implement proper error handling for auth failures 