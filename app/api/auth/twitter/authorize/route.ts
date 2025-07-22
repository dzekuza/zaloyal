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

    // Generate request token
    const request_data = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: {
        oauth_callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`,
      },
    };

    const headers = oauth.toHeader(oauth.authorize(request_data));

    try {
      const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
          ...headers,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(request_data.data).toString(),
      });

      if (!response.ok) {
        console.error('Twitter OAuth request token error:', response.status, response.statusText);
        return NextResponse.json(
          { error: 'Failed to initiate X authentication. Please try again.' },
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

      // Store the oauth_token_secret temporarily (you might want to use a session or temporary storage)
      // For now, we'll pass it back to the client to store temporarily
      
      // Create authorization URL
      const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;

      return NextResponse.json({
        success: true,
        message: 'X authorization initiated',
        authUrl: authUrl,
        oauthToken: oauthToken,
        oauthTokenSecret: oauthTokenSecret,
      });

    } catch (error) {
      console.error('Twitter OAuth error:', error);
      return NextResponse.json(
        { error: 'Failed to connect to X. Please try again.' },
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