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
    // Test if Discord provider is available and configured
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${supabaseUrl}/auth/v1/callback`,
        scopes: 'identify email'
      }
    });

    if (error) {
      return NextResponse.json({
        configured: false,
        error: error.message,
        code: error.status,
        details: error,
        solution: 'Enable and configure Discord provider in Supabase Dashboard → Authentication → Providers'
      });
    }

    // Parse the OAuth URL to check for issues
    const oauthUrl = new URL(data.url);
    const hasDuplicateRedirect = oauthUrl.searchParams.has('redirect_to') && oauthUrl.searchParams.has('redirect_uri');
    const hasDuplicateScopes = oauthUrl.searchParams.get('scope')?.includes('identify+identify') || false;

    return NextResponse.json({
      configured: true,
      oauthUrl: data.url,
      issues: {
        duplicateRedirect: hasDuplicateRedirect,
        duplicateScopes: hasDuplicateScopes,
        cleanUrl: !hasDuplicateRedirect && !hasDuplicateScopes
      },
      parsedUrl: {
        provider: oauthUrl.searchParams.get('provider'),
        redirectTo: oauthUrl.searchParams.get('redirect_to'),
        redirectUri: oauthUrl.searchParams.get('redirect_uri'),
        scopes: oauthUrl.searchParams.get('scope')
      }
    });

  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: 'Failed to check Discord configuration',
      details: error
    });
  }
} 