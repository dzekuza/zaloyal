# Twitter OAuth Setup Guide

## **The Problem**
You're getting "Error creating identity" because the Twitter app is not properly configured for Supabase Auth.

## **Step 1: Check Your Twitter App Configuration**

### **In Twitter Developer Portal (https://developer.twitter.com/en/portal/dashboard):**

1. **Go to your app settings**
2. **Check "App permissions"** - Should be set to "Read and Write"
3. **Check "Authentication settings"** - Should have these callback URLs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback/supabase
   ```

### **Common Issues:**
- ❌ **Missing callback URLs** - Supabase needs specific callback URLs
- ❌ **Wrong app permissions** - Should be "Read and Write" not "Read only"
- ❌ **App not approved** - Your app might need approval for OAuth

## **Step 2: Verify Environment Variables**

Run this command to check your environment:
```bash
./scripts/check-env.sh
```

## **Step 3: Test Configuration**

1. **Visit**: `http://localhost:3000/test-oauth`
2. **Check browser console** for specific error messages
3. **Try linking X account** from profile page

## **Step 4: Debug Steps**

### **If still getting "Error creating identity":**

1. **Check Twitter App Status**:
   - Go to Twitter Developer Portal
   - Make sure your app is "Active" (not in development mode)
   - Check if you need to apply for elevated access

2. **Verify Callback URLs**:
   - The callback URLs must be **exact matches**
   - No trailing slashes
   - Include both localhost and your Supabase URL

3. **Check API Keys**:
   - Make sure you're using the **API Key** and **API Secret** (not Bearer Token)
   - These should match your environment variables

4. **Test with a fresh browser session**:
   - Clear browser cache and cookies
   - Try in incognito/private mode

## **Step 5: Alternative Configuration**

If the above doesn't work, try this alternative approach:

### **Option A: Use Twitter API v2 OAuth 2.0**
1. In your Twitter app settings, enable "OAuth 2.0"
2. Add these callback URLs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback/supabase
   ```

### **Option B: Check Supabase Dashboard**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Twitter** and click **Enable**
4. Enter your Twitter API Key and Secret manually

## **Step 6: Final Verification**

After making changes:
1. **Restart your development server**: `./scripts/restart-dev.sh`
2. **Test OAuth flow**: Try linking X account again
3. **Check console logs**: Look for any remaining errors

## **Common Error Messages and Solutions**

| Error | Solution |
|-------|----------|
| "Error creating identity" | Check Twitter app callback URLs |
| "Invalid client" | Verify API Key and Secret in environment variables |
| "Callback URL mismatch" | Add exact callback URLs to Twitter app |
| "App not approved" | Apply for elevated access in Twitter Developer Portal |

## **Need Help?**

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your Twitter app has the correct permissions
3. Make sure your environment variables are loaded correctly
4. Try the OAuth test page: `http://localhost:3000/test-oauth` 