import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if we have Twitter API credentials
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    
    if (!twitterApiKey || !twitterApiSecret) {
      return NextResponse.json(
        { error: 'Twitter API not configured. Please set TWITTER_API_KEY and TWITTER_API_SECRET environment variables.' },
        { status: 500 }
      );
    }

    // Create OAuth 1.0a instance
    const oauth = new OAuth({
      consumer: {
        key: twitterApiKey,
        secret: twitterApiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      },
    });

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();

    // Request token data
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;
    console.log('DEBUG: Callback URL:', callbackUrl);
    
    const requestTokenData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: {
        oauth_callback: callbackUrl,
      },
    };

    const requestTokenHeaders = oauth.toHeader(oauth.authorize(requestTokenData));

    const tokenResponse = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': requestTokenHeaders['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        oauth_callback: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Twitter OAuth error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get request token from Twitter' },
        { status: 500 }
      );
    }

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('Invalid token response:', tokenData);
      return NextResponse.json(
        { error: 'Invalid response from Twitter OAuth' },
        { status: 500 }
      );
    }

    // Store OAuth state
    const { error: stateError } = await supabase.rpc('store_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_code_verifier: oauthTokenSecret,
      p_platform: 'twitter'
    });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Build authorization URL
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&state=${state}&timestamp=${timestamp}`;

    return NextResponse.json({
      authUrl,
      state,
      oauthToken,
      oauthTokenSecret
    });

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OAuth initialization' },
      { status: 500 }
    );
  }
} 
