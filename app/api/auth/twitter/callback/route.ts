import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { validateOAuthState } from '@/lib/oauth-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
    }

    // Get OAuth parameters from URL
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');
    const state = searchParams.get('state');
    const timestamp = searchParams.get('timestamp');

    console.log('Twitter callback received:', {
      oauthToken: oauthToken ? 'present' : 'missing',
      oauthVerifier: oauthVerifier ? 'present' : 'missing',
      denied: denied || 'none',
      state: state || 'none',
      timestamp: timestamp || 'none'
    });

    if (denied) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=access_denied`);
    }

    if (!oauthToken || !oauthVerifier) {
      console.error('Missing OAuth parameters:', { oauthToken, oauthVerifier });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_oauth_response`);
    }

    // Validate OAuth state if provided
    if (state) {
      const isValidState = await validateOAuthState(supabase, user.id, state, 'twitter');
      if (!isValidState) {
        console.error('Invalid OAuth state');
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_state`);
      }
    }

    // Exchange request token for access token
    const oauth = new OAuth({
      consumer: {
        key: process.env.TWITTER_API_KEY!,
        secret: process.env.TWITTER_API_SECRET!
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
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
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret || !userId || !screenName) {
      console.error('Invalid token response:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_token_response`);
    }

    // Get user details from Twitter API
    const userResponse = await fetch(`https://api.twitter.com/2/users/me`, {
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
      }
    });

    let twitterUserData = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      twitterUserData = userData.data;
    }

    // Store the OAuth tokens in social_accounts table
    const { error: insertError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: user.id,
        platform: 'twitter',
        platform_user_id: userId,
        platform_username: screenName,
        access_token: accessToken,
        access_token_secret: accessTokenSecret,
        refresh_token: null, // Twitter doesn't use refresh tokens
        token_expires_at: null,
        profile_data: twitterUserData || {
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
      console.error('Error storing tokens:', insertError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=token_storage_failed`);
    }

    // Update user profile with Twitter information
    const { error: profileError } = await supabase
      .from('users')
      .update({
        twitter_username: screenName,
        twitter_id: userId,
        twitter_avatar_url: twitterUserData?.profile_image_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the whole flow for profile update errors
    }

    console.log('Successfully connected Twitter account:', {
      userId: user.id,
      twitterUsername: screenName,
      twitterUserId: userId
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?success=twitter_connected`);

  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=oauth_callback_failed`);
  }
} 