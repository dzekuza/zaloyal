import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Check if credentials are available
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?error=credentials_not_configured', request.url));
  }

  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');
  const denied = searchParams.get('denied');

  console.log('[X OAuth Callback] Received params:', {
    oauthToken: oauthToken ? oauthToken.substring(0, 10) + '...' : 'null',
    oauthVerifier: oauthVerifier ? oauthVerifier.substring(0, 10) + '...' : 'null',
    denied
  });

  if (denied) {
    console.error('OAuth denied by user');
    return NextResponse.redirect(new URL('/profile?error=oauth_denied', request.url));
  }

  if (!oauthToken || !oauthVerifier) {
    console.error('Missing OAuth parameters');
    return NextResponse.redirect(new URL('/profile?error=missing_params', request.url));
  }

  try {
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(new URL('/profile?error=not_authenticated', request.url));
    }

    // Step 1: Exchange request token for access token
    const oauth = new OAuth({
      consumer: {
        key: process.env.X_CLIENT_ID!,
        secret: process.env.X_CLIENT_SECRET!
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
    const accessTokenData = {
      url: accessTokenUrl,
      method: 'POST',
      data: {
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      }
    };

    const authHeader = oauth.toHeader(oauth.authorize(accessTokenData));

    const tokenResponse = await fetch(accessTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[X OAuth Callback] Access token error:', errorText);
      return NextResponse.redirect(new URL('/profile?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret || !userId || !screenName) {
      console.error('[X OAuth Callback] Missing token data:', tokenData);
      return NextResponse.redirect(new URL('/profile?error=invalid_token_response', request.url));
    }

    // Step 2: Get user details from X API
    const userResponse = await fetch(`https://api.twitter.com/2/users/me`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });

    let xUserData = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      xUserData = userData.data;
    }

    // Step 3: Store the OAuth tokens in social_accounts table
    const { error: insertError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: user.id,
        platform: 'x',
        platform_user_id: userId,
        platform_username: screenName,
        access_token: accessToken,
        access_token_secret: accessTokenSecret,
        refresh_token: null, // X doesn't use refresh tokens
        token_expires_at: null,
        profile_data: xUserData || {
          id: userId,
          username: screenName,
          name: screenName
        },
        verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      });

    if (insertError) {
      console.error('[X OAuth Callback] Error storing tokens:', insertError);
      return NextResponse.redirect(new URL('/profile?error=token_storage_failed', request.url));
    }

    // Step 4: Update user profile with X information
    const { error: profileError } = await supabase
      .from('users')
      .update({
        x_username: screenName,
        x_id: userId,
        x_avatar_url: xUserData?.profile_image_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[X OAuth Callback] Error updating profile:', profileError);
      // Don't fail the whole flow for profile update errors
    }

    console.log('[X OAuth Callback] Successfully connected X account:', {
      userId: user.id,
      xUsername: screenName,
      xUserId: userId
    });

    // Redirect back to profile with success message
    return NextResponse.redirect(new URL('/profile?success=x_connected', request.url));

  } catch (error) {
    console.error('[X OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL('/profile?error=oauth_callback_failed', request.url));
  }
} 