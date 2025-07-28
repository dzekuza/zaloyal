# Discord OAuth Setup for Supabase

## Current Issue: "invalid_client" Error

The error `"oauth2: \"invalid_client\""` indicates that the Discord provider in Supabase is not properly configured with the correct Client ID and Client Secret.

## Step-by-Step Fix

### 1. Discord Developer Portal Configuration ✅

**Status**: Already configured correctly
- **Client ID**: `1397282925849874492`
- **Redirect URIs**: 
  - `https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback`
  - `http://localhost:3000/auth/callback/supabase`

### 2. Supabase Dashboard Configuration ❌

**This is the missing piece!** You need to configure the Discord provider in Supabase:

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Select your project** (`ghbaaexxytbvmbimmrkj`)
3. **Navigate to Authentication → Providers**
4. **Find Discord and click "Enable"**
5. **Configure with these exact values:**

```
Client ID: 1397282925849874492
Client Secret: Va_p4JhYxl_iATDVvrkZfZRVWrD7Lidi
Redirect URL: https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback
```

6. **Save the configuration**

### 3. Environment Variables ✅

**Status**: Already configured
```env
NEXT_PUBLIC_DISCORD_CLIENT_ID=1397282925849874492
DISCORD_CLIENT_SECRET=Va_p4JhYxl_iATDVvrkZfZRVWrD7Lidi
NEXT_PUBLIC_SUPABASE_URL=https://ghbaaexxytbvmbimmrkj.supabase.co
```

### 4. Current Configuration Status

✅ **Discord Developer Portal**: Correctly configured
✅ **Environment Variables**: All set
✅ **OAuth URL Generation**: Working (clean URL with basic scopes)
❌ **Supabase Discord Provider**: **NOT CONFIGURED** (This is the issue!)

### 5. Testing After Configuration

Once you configure the Discord provider in Supabase Dashboard:

1. **Test OAuth URL generation**:
   ```bash
   curl -s "http://localhost:3000/api/verify-discord-provider" | jq '.configured'
   ```

2. **Test Discord OAuth flow**:
   - Navigate to `/profile` page
   - Click "Connect" next to Discord
   - Complete Discord authorization
   - Verify account appears as linked

### 6. Expected OAuth URL

After configuration, the OAuth URL should look like:
```
https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/authorize?provider=discord&redirect_to=https%3A%2F%2Fghbaaexxytbvmbimmrkj.supabase.co%2Fauth%2Fv1%2Fcallback&scopes=identify%20email
```

### 7. Troubleshooting

**If you still get "invalid_client" error after configuring Supabase:**

1. **Double-check the Client Secret** in Supabase Dashboard
2. **Ensure the Client ID matches** exactly: `1397282925849874492`
3. **Verify the Redirect URL** is exactly: `https://ghbaaexxytbvmbimmrkj.supabase.co/auth/v1/callback`
4. **Wait 1-2 minutes** for Supabase to propagate the configuration
5. **Clear browser cache** and try again

### 8. Next Steps

1. **Configure Discord provider in Supabase Dashboard** (Critical!)
2. **Test the OAuth flow**
3. **Verify account linking works**
4. **Test task verification using Discord API**

## Summary

The issue is that the Discord provider is **not enabled/configured in Supabase Dashboard**. Once you add the Client ID and Client Secret in the Supabase Authentication → Providers section, the "invalid_client" error should be resolved. 