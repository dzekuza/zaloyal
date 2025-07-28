import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      error: 'Missing Supabase configuration'
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // This is the exact same call that the browser makes
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
        scopes: 'identify email'
      }
    });

    if (error) {
      return NextResponse.json({
        error: error.message,
        code: error.status,
        details: error
      });
    }

    // Parse the URL to see what's actually being generated
    const oauthUrl = new URL(data.url);
    
    return NextResponse.json({
      success: true,
      oauthUrl: data.url,
      parsedUrl: {
        hostname: oauthUrl.hostname,
        pathname: oauthUrl.pathname,
        searchParams: Object.fromEntries(oauthUrl.searchParams.entries())
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasClientId: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate OAuth URL',
      details: error
    });
  }
} 