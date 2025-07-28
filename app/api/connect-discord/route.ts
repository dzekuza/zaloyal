import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-discord/callback';
  const DISCORD_SCOPE = 'identify email';

  // Check if credentials are available
  if (!DISCORD_CLIENT_ID) {
    console.error('[Discord OAuth] Missing DISCORD_CLIENT_ID');
    return NextResponse.json({ 
      error: 'Discord API credentials not configured. Please set NEXT_PUBLIC_DISCORD_CLIENT_ID in environment variables.' 
    }, { status: 500 });
  }

  const supabase = await createServerClient(request);
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store OAuth state directly in database
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        platform: 'discord',
        state: state,
        code_verifier: null, // Discord doesn't use PKCE
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return NextResponse.json({ 
        error: 'Failed to initialize OAuth flow' 
      }, { status: 500 });
    }

    // Build Discord authorization URL
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=${encodeURIComponent(DISCORD_SCOPE)}&state=${state}`;

    return NextResponse.json({ 
      authUrl: authUrl,
      state: state 
    });

  } catch (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during OAuth initialization' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-discord/callback';
  const DISCORD_SCOPE = 'identify email';

  // Check if credentials are available
  if (!DISCORD_CLIENT_ID) {
    return NextResponse.json({ 
      error: 'Discord API credentials not configured' 
    }, { status: 500 });
  }

  const supabase = await createServerClient(request);
  
  try {
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Store OAuth state directly in database
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: user.id,
        platform: 'discord',
        state: state,
        code_verifier: null, // Discord doesn't use PKCE
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return NextResponse.json({ 
        error: 'Failed to initialize OAuth flow' 
      }, { status: 500 });
    }

    // Build Discord authorization URL
    const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=${encodeURIComponent(DISCORD_SCOPE)}&state=${state}`;

    // Return the authorization URL for client-side redirect
    return NextResponse.json({ 
      authUrl: authUrl,
      state: state 
    });

  } catch (error) {
    console.error('Discord OAuth error:', error);
    return NextResponse.json({ 
      error: 'Internal server error during OAuth initialization' 
    }, { status: 500 });
  }
} 