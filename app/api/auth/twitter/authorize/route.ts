import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { generateOAuthState } from '@/lib/oauth-utils';

export async function GET(request: NextRequest) {
  try {
    // Pass the cookies function directly
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Twitter authorize error: User not authenticated', userError);
      return NextResponse.json(
        { error: 'User not authenticated', details: userError?.message },
        { status: 401 }
      );
    }

    // Use only the correct env keys for X API
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    if (!twitterApiKey || !twitterApiSecret) {
      console.error('Twitter authorize error: Missing Twitter API credentials');
      return NextResponse.json(
        { error: 'Twitter API not configured. Please set TWITTER_API_KEY and TWITTER_API_SECRET environment variables.' },
        { status: 500 }
      );
    }

    // Build the callback URL robustly
    let callbackUrl = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI;
    if (!callbackUrl) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        console.error('Twitter authorize error: NEXT_PUBLIC_APP_URL is not set');
        return NextResponse.json(
          { error: 'NEXT_PUBLIC_APP_URL is not set in environment variables.' },
          { status: 500 }
        );
      }
      callbackUrl = `${appUrl.replace(/\/$/, '')}/api/auth/twitter/callback`;
    }

    // Generate unique state parameters to prevent token reuse
    const oauthState = generateOAuthState();
    
    // Add state and timestamp to callback URL to ensure uniqueness
    const callbackUrlWithState = `${callbackUrl}?state=${oauthState.state}&timestamp=${oauthState.timestamp}`;

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

    // Generate request token with unique parameters
    const request_data = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: {
        oauth_callback: callbackUrlWithState,
        // Add additional parameters to ensure uniqueness
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: oauthState.nonce,
      },
    };

    const headers = oauth.toHeader(oauth.authorize(request_data));

    try {
      console.log('Initiating Twitter OAuth with callback URL:', callbackUrlWithState);
      console.log('OAuth state:', oauthState);
      
      const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(request_data.data).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Twitter OAuth request token error:', response.status, response.statusText);
        console.error('Error response:', errorText);
        console.error('Request URL:', request_data.url);
        console.error('Callback URL:', callbackUrlWithState);
        return NextResponse.json(
          {
            error: 'Failed to initiate X authentication. Please try again.',
            details: {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText
            }
          },
          { status: 500 }
        );
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);
      const oauthToken = params.get('oauth_token');
      const oauthTokenSecret = params.get('oauth_token_secret');

      if (!oauthToken || !oauthTokenSecret) {
        console.error('Invalid OAuth response:', responseText);
        return NextResponse.json(
          { error: 'Invalid response from X. Please try again.' },
          { status: 500 }
        );
      }

      // Create authorization URL with state parameter
      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&state=${oauthState.state}`;

      console.log('Twitter OAuth initiated successfully. Auth URL:', authUrl);

      return NextResponse.json({
        success: true,
        message: 'X authorization initiated',
        authUrl: authUrl,
        oauthToken: oauthToken,
        oauthTokenSecret: oauthTokenSecret,
        state: oauthState.state,
      });
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to X. Please try again.', details: error instanceof Error ? error.stack : error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Twitter authorize error (outer catch):', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.stack : error },
      { status: 500 }
    );
  }
} 