import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      error: 'Missing Supabase configuration'
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({
        error: 'User not authenticated'
      }, { status: 401 });
    }

    // Check if user already has a Discord account linked
    const { data: existingAccounts } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'discord');

    if (existingAccounts && existingAccounts.length > 0) {
      return NextResponse.json({
        error: 'Discord account already linked'
      }, { status: 400 });
    }

    // Generate OAuth URL for Discord linking with state parameter
    const state = btoa(JSON.stringify({
      action: 'link',
      userId: session.user.id,
      timestamp: Date.now()
    }));

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${supabaseUrl}/auth/v1/callback`,
        scopes: 'identify email',
        queryParams: {
          prompt: 'consent',
          access_type: 'offline',
          state: state
        }
      }
    });

    if (error) {
      return NextResponse.json({
        error: 'Failed to generate Discord OAuth URL',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oauthUrl: data.url,
      state: state
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 