# Supabase Twitter OAuth Setup Guide

## Current Issue
The error `Error+creating+identity` indicates that Twitter OAuth is not properly configured in Supabase.

## Prerequisites

1. **Supabase Project**: You need a Supabase project with authentication enabled
2. **Twitter Developer Account**: You need a Twitter Developer account with an app

## Step 1: Configure Twitter App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use an existing one
3. In your app settings, add the following callback URLs:
   - `https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback/supabase` (for development)

## Step 2: Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Twitter** and click **Enable**
4. Enter your Twitter API credentials:
   - **API Key**: Your Twitter app's API key
   - **API Secret**: Your Twitter app's API secret
5. Save the configuration

## Step 3: Configure Redirect URLs in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add these redirect URLs:
   - `http://localhost:3000/auth/callback/supabase`
   - `https://your-domain.com/auth/callback/supabase` (for production)

## Step 4: Environment Variables

Add these to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twitter (for API calls)
X_CLIENT_ID=your_twitter_api_key
X_CLIENT_SECRET=your_twitter_api_secret
```

## Step 5: Test the Setup

1. Visit `/test-oauth` in your app to test the OAuth configuration
2. Try connecting with X from the profile page
3. Check the console for any errors

## Troubleshooting

### Common Issues:

1. **"Error creating identity"**: Twitter OAuth not enabled in Supabase Auth settings
2. **"Provider not enabled"**: Make sure Twitter is enabled in Supabase Auth settings
3. **"Invalid callback URL"**: Check that your callback URLs match exactly
4. **"User not authenticated"**: The session cookies might not be passing properly

### Debug Steps:

1. **Test OAuth Configuration**: Visit `/test-oauth` to check if Twitter OAuth is working
2. Check Supabase logs in the dashboard
3. Check browser console for errors
4. Verify environment variables are set correctly
5. Test with the `/test-auth` page

### Specific Error: "Error creating identity"

This error occurs when:
- Twitter OAuth is not enabled in Supabase
- Twitter API credentials are incorrect
- Callback URLs are not configured properly

**Solution:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Twitter provider
3. Add correct API credentials
4. Add callback URLs: `http://localhost:3000/auth/callback`

## Current Implementation

The app now uses Supabase's native Twitter OAuth flow:

1. **Frontend**: Calls `/api/auth/twitter/authorize`
2. **API**: Uses `supabase.auth.signInWithOAuth()`
3. **Callback**: Handled by `/auth/callback`
4. **Storage**: Social account data stored in `social_accounts` table

This replaces the custom OAuth implementation and should be more reliable.

## Quick Test

Visit `/test-oauth` to quickly test if Twitter OAuth is properly configured in your Supabase project. 