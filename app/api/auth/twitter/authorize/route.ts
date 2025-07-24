import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
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
    console.log('DEBUG: OAuth headers:', requestTokenHeaders);

    try {
      console.log('Requesting OAuth token from Twitter...');
      
      const response = await fetch(requestTokenData.url, {
        method: requestTokenData.method,
        headers: {
          ...requestTokenHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestTokenData.data).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Request token failed:', response.status, errorText);
        console.error('Request URL:', requestTokenData.url);
        console.error('Request headers:', requestTokenHeaders);
        console.error('Request body:', new URLSearchParams(requestTokenData.data).toString());
        return NextResponse.json(
          { error: `Failed to get request token from Twitter: ${response.status} - ${errorText}` },
          { status: 500 }
        );
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');

      if (!oauthToken) {
        console.error('No oauth_token in response:', responseText);
        return NextResponse.json(
          { error: 'Invalid response from Twitter' },
          { status: 500 }
        );
      }

      console.log('OAuth request token obtained successfully');

      // Redirect to Twitter authorization URL
      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
      
      return NextResponse.json({
        success: true,
        authUrl: authUrl,
        message: 'Redirect to Twitter for authorization'
      });

    } catch (error) {
      console.error('OAuth request token error:', error);
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Twitter authorize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
