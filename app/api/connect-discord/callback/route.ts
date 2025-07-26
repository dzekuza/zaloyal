import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Check if credentials are available
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?error=credentials_not_configured', request.url));
  }

  const supabase = createServerClient();
  const searchParams = request.nextUrl.searchParams;
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('[Discord OAuth Callback] Received params:', {
    code: code ? code.substring(0, 10) + '...' : 'null',
    state: state ? state.substring(0, 10) + '...' : 'null',
    error
  });

  if (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.redirect(new URL('/profile?error=oauth_error', request.url));
  }

  if (!code || !state) {
    console.error('Missing OAuth parameters');
    return NextResponse.redirect(new URL('/profile?error=missing_params', request.url));
  }

  try {
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(new URL('/profile?error=not_authenticated', request.url));
    }

    // Verify OAuth state
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', user.id)
      .eq('state', state)
      .eq('platform', 'discord')
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state:', stateError);
      return NextResponse.redirect(new URL('/profile?error=invalid_state', request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/connect-discord/callback'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Discord OAuth Callback] Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/profile?error=token_exchange_failed', request.url));
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      console.error('[Discord OAuth Callback] No access token received');
      return NextResponse.redirect(new URL('/profile?error=no_access_token', request.url));
    }

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('[Discord OAuth Callback] Failed to get user info');
      return NextResponse.redirect(new URL('/profile?error=user_info_failed', request.url));
    }

    const userData = await userResponse.json();
    console.log('[Discord OAuth Callback] Got user data:', {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator
    });

    // Store social account
    const { error: insertError } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: user.id,
        platform: 'discord',
        platform_user_id: userData.id,
        platform_username: userData.username,
        access_token: access_token,
        refresh_token: refresh_token,
        token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        profile_data: userData,
        verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform'
      });

    if (insertError) {
      console.error('[Discord OAuth Callback] Error storing social account:', insertError);
      return NextResponse.redirect(new URL('/profile?error=storage_failed', request.url));
    }

    // Update user profile with Discord information
    const { error: profileError } = await supabase
      .from('users')
      .update({
        discord_id: userData.id,
        discord_username: userData.username,
        discord_avatar_url: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('[Discord OAuth Callback] Error updating profile:', profileError);
      // Don't fail the whole flow for profile update errors
    }

    // Clean up OAuth state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'discord')
      .eq('state', state);

    console.log('[Discord OAuth Callback] Successfully connected Discord account');
    return NextResponse.redirect(new URL('/profile?success=discord_connected', request.url));

  } catch (error) {
    console.error('[Discord OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL('/profile?error=oauth_callback_failed', request.url));
  }
} 