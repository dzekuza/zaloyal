import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

export async function GET(request: NextRequest) {
  const X_CLIENT_ID = process.env.X_CLIENT_ID;
  const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
  const X_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-x/callback';

  // Debug log
  console.log('[X OAuth] GET handler X_REDIRECT_URI:', X_REDIRECT_URI);

  // Check if credentials are available
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
    console.error('[X OAuth] Missing credentials:', { 
      X_CLIENT_ID: X_CLIENT_ID ? 'SET' : 'MISSING',
      X_CLIENT_SECRET: X_CLIENT_SECRET ? 'SET' : 'MISSING',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
    });
    return NextResponse.json({ 
      error: 'X API credentials not configured. Please set X_CLIENT_ID and X_CLIENT_SECRET in environment variables.' 
    }, { status: 500 });
  }

  const supabase = await createServerClient();
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Step 1: Get request token using OAuth 1.0a
    const oauth = new OAuth({
      consumer: {
        key: X_CLIENT_ID,
        secret: X_CLIENT_SECRET
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const requestData = {
      url: requestTokenUrl,
      method: 'POST',
      data: {
        oauth_callback: X_REDIRECT_URI
      }
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const tokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        oauth_callback: X_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[X OAuth] Request token error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to get request token from X API' 
      }, { status: 500 });
    }

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('[X OAuth] Missing token data:', tokenData);
      return NextResponse.json({ 
        error: 'Invalid response from X API' 
      }, { status: 500 });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();

    // Store OAuth state in database
    let sessionError;
    try {
      ({ error: sessionError } = await supabase.rpc('store_oauth_state', {
        p_user_id: user.id,
        p_state: state,
        p_code_verifier: '', // X doesn't use PKCE
        p_platform: 'x'
      }));
    } catch (err) {
      sessionError = err;
    }

    if (sessionError) {
      console.error('Error storing OAuth state:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to initialize OAuth flow' 
      }, { status: 500 });
    }

    // Build X authorization URL
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&state=${state}&timestamp=${timestamp}`;

    // Return the authorization URL for client-side redirect
    return NextResponse.json({ 
      authUrl: authUrl,
      state: state,
      oauthToken: oauthToken,
      oauthTokenSecret: oauthTokenSecret
    });

  } catch (error) {
    console.error('[X OAuth] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during OAuth initialization' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const X_CLIENT_ID = process.env.X_CLIENT_ID;
  const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
  const X_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-x/callback';

  // Debug log
  console.log('[X OAuth] POST handler X_REDIRECT_URI:', X_REDIRECT_URI);

  // Check if credentials are available
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
    return NextResponse.json({ 
      error: 'X API credentials not configured' 
    }, { status: 500 });
  }

  const supabase = await createServerClient();
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Step 1: Get request token using OAuth 1.0a
    const oauth = new OAuth({
      consumer: {
        key: X_CLIENT_ID,
        secret: X_CLIENT_SECRET
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    const requestData = {
      url: requestTokenUrl,
      method: 'POST',
      data: {
        oauth_callback: X_REDIRECT_URI
      }
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const tokenResponse = await fetch(requestTokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader['Authorization'],
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        oauth_callback: X_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[X OAuth] Request token error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to get request token from X API' 
      }, { status: 500 });
    }

    const tokenData = await tokenResponse.text();
    const params = new URLSearchParams(tokenData);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken || !oauthTokenSecret) {
      console.error('[X OAuth] Missing token data:', tokenData);
      return NextResponse.json({ 
        error: 'Invalid response from X API' 
      }, { status: 500 });
    }

    // Generate state parameter for security
    const state = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now().toString();

    // Store OAuth state in database
    let sessionError;
    try {
      ({ error: sessionError } = await supabase.rpc('store_oauth_state', {
        p_user_id: user.id,
        p_state: state,
        p_code_verifier: '', // X doesn't use PKCE
        p_platform: 'x'
      }));
    } catch (err) {
      sessionError = err;
    }

    if (sessionError) {
      console.error('Error storing OAuth state:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to initialize OAuth flow' 
      }, { status: 500 });
    }

    // Build X authorization URL
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}&state=${state}&timestamp=${timestamp}`;

    // Return the authorization URL for client-side redirect
    return NextResponse.json({ 
      authUrl: authUrl,
      state: state,
      oauthToken: oauthToken,
      oauthTokenSecret: oauthTokenSecret
    });

  } catch (error) {
    console.error('[X OAuth] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during OAuth initialization' 
    }, { status: 500 });
  }
} 