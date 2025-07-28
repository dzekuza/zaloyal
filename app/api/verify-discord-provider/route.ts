import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      error: 'Missing Supabase configuration',
      configured: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
      }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test if Discord provider is available
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${supabaseUrl}/auth/v1/callback`,
        scopes: 'identify email'
      }
    });

    if (error) {
      return NextResponse.json({
        error: 'Discord provider not configured',
        message: error.message,
        code: error.status,
        details: error,
        solution: 'Enable Discord provider in Supabase Dashboard → Authentication → Providers'
      });
    }

    // Parse the OAuth URL to check configuration
    const oauthUrl = new URL(data.url);
    const provider = oauthUrl.searchParams.get('provider');
    const redirectTo = oauthUrl.searchParams.get('redirect_to');
    const scopes = oauthUrl.searchParams.get('scopes');

    return NextResponse.json({
      success: true,
      provider: 'discord',
      configured: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        provider: provider === 'discord',
        redirectTo: redirectTo === `${supabaseUrl}/auth/v1/callback`,
        scopes: scopes === 'identify email'
      },
      oauthUrl: data.url,
      parsedUrl: {
        provider,
        redirectTo,
        scopes
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to verify Discord provider',
      details: error
    });
  }
} 