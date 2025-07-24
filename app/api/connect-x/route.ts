import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const X_CLIENT_ID = process.env.X_CLIENT_ID;
  const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
  const X_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-x/callback';

  // Check if credentials are available
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
    return NextResponse.json({ 
      error: 'X API credentials not configured. Please set X_CLIENT_ID and X_CLIENT_SECRET in environment variables.' 
    }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate PKCE parameters
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(32).toString('base64url');

    // Store PKCE parameters in session
    const { error: sessionError } = await supabase.rpc('store_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_code_verifier: codeVerifier,
      p_platform: 'x'
    });

    if (sessionError) {
      console.error('Error storing OAuth state:', sessionError);
      return NextResponse.json({ error: 'Failed to initialize OAuth flow' }, { status: 500 });
    }

    // Build authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', X_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', X_REDIRECT_URI);
    authUrl.searchParams.set('scope', 'tweet.read users.read follows.read like.read offline.access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect the user to X for authentication
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('OAuth initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize OAuth flow' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const X_CLIENT_ID = process.env.X_CLIENT_ID;
  const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
  const X_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-x/callback';

  // Check if credentials are available
  if (!X_CLIENT_ID || !X_CLIENT_SECRET) {
    return NextResponse.json({ 
      error: 'X API credentials not configured. Please set X_CLIENT_ID and X_CLIENT_SECRET in environment variables.' 
    }, { status: 500 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    const { code, state } = await request.json();

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 });
    }

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Retrieve stored PKCE parameters
    const { data: oauthState, error: stateError } = await supabase.rpc('get_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_platform: 'x'
    });

    if (stateError || !oauthState) {
      return NextResponse.json({ error: 'Invalid or expired OAuth state' }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: X_REDIRECT_URI,
        code_verifier: oauthState.code_verifier
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.json({ error: 'Failed to exchange code for tokens' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();

    // Get user info from X
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to get user info from X' }, { status: 400 });
    }

    const userData = await userResponse.json();
    const xUser = userData.data;

    // Store social account
    const { error: insertError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: user.id,
        platform: 'x',
        account_id: xUser.id,
        username: xUser.username,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000)
      }, {
        onConflict: 'user_id,platform'
      });

    if (insertError) {
      console.error('Error storing social account:', insertError);
      return NextResponse.json({ error: 'Failed to store account information' }, { status: 500 });
    }

    // Clean up OAuth state
    await supabase.rpc('clear_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_platform: 'x'
    });

    return NextResponse.json({ 
      success: true,
      message: 'X account linked successfully',
      user: {
        id: xUser.id,
        username: xUser.username,
        name: xUser.name
      }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ error: 'Failed to complete OAuth flow' }, { status: 500 });
  }
} 