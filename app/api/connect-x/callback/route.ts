import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Check if credentials are available
  if (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?error=credentials_not_configured', request.url));
  }

  const supabase = createRouteHandlerClient({ cookies });
  const searchParams = request.nextUrl.searchParams;
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/profile?error=oauth_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/profile?error=missing_params', request.url));
  }

  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(new URL('/profile?error=not_authenticated', request.url));
    }

    // Retrieve stored PKCE parameters
    const { data: oauthState, error: stateError } = await supabase.rpc('get_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_platform: 'x'
    });

    if (stateError || !oauthState) {
      return NextResponse.redirect(new URL('/profile?error=invalid_state', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connect-x/callback`,
        code_verifier: oauthState.code_verifier
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(new URL('/profile?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();

    // Get user info from X
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(new URL('/profile?error=user_info_failed', request.url));
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
      return NextResponse.redirect(new URL('/profile?error=storage_failed', request.url));
    }

    // Clean up OAuth state
    await supabase.rpc('clear_oauth_state', {
      p_user_id: user.id,
      p_state: state,
      p_platform: 'x'
    });

    // Redirect to profile with success
    return NextResponse.redirect(new URL('/profile?success=x_linked', request.url));

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/profile?error=callback_failed', request.url));
  }
} 